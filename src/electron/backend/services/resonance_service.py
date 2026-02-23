from backend.services.connection_manager import manager
from backend.services import monitoring_service
from backend.services.device_data_service import DeviceDataService 
import threading
import time
import os
import csv
from typing import Optional, Dict, Any, List

# --- Matplotlib for live plotting ---
import matplotlib.pyplot as plt

# --- Constants for current conversion (ADC to Amps) ---
# Adjust based on your hardware specifications
CURRENT_ADC_TO_A = 0.001  # Example: 1 ADC unit = 0.001 A

# --- Software sweep state ---
_sweep_state: Dict[str, Any] = {
    "running": False,
    "status_code": 0,
    "status_text": "not obtained",
    "progress": {"current_frequency": None, "index": 0, "total": 0},
    "results": [],
    "best_overall": None,
    "best_phase": None,
    "best_current": None,
    "error": None,
    "plot_open": False,
}

# Track the last active mode
_last_mode: str = "firmware"  # "firmware" or "software"

# Global variable to track plot figure
_plot_figure = None


# -------------------------------------------------------------------------
# Frequency range configuration (firmware)
# -------------------------------------------------------------------------
def get_frequency_range_start():
    start_hi = manager.read("holding", 20, 9)
    start_lo = manager.read("holding", 20, 10)

    if start_hi is None or start_lo is None:
        raise ValueError("Failed to read frequency range start registers")

    start_hz = (start_hi << 16) | start_lo
    return {"success": True, "frequency_range_start": start_hz}


def set_frequency_range_start(start_hz: int):
    if start_hz < 0:
        raise ValueError("Start frequency must be non-negative")

    start_freq_hi = (start_hz >> 16) & 0xFFFF
    start_freq_lo = start_hz & 0xFFFF

    manager.write("holding", 20, 9, start_freq_hi)
    manager.write("holding", 20, 10, start_freq_lo)
    return {"success": True, "frequency_range_start": start_hz}


def get_frequency_range_end():
    end_hi = manager.read("holding", 20, 11)
    end_lo = manager.read("holding", 20, 12)

    if end_hi is None or end_lo is None:
        raise ValueError("Failed to read frequency range end registers")

    end_hz = (end_hi << 16) | end_lo
    return {"success": True, "frequency_range_end": end_hz}


def set_frequency_range_end(end_hz: int):
    if end_hz <= 0:
        raise ValueError("End frequency must be positive")

    end_freq_hi = (end_hz >> 16) & 0xFFFF
    end_freq_lo = end_hz & 0xFFFF

    manager.write("holding", 20, 11, end_freq_hi)
    manager.write("holding", 20, 12, end_freq_lo)
    return {"success": True, "frequency_range_end": end_hz}


def get_frequency_step():
    step_hz = manager.read("holding", 20, 8)
    if step_hz is None:
        raise ValueError("Failed to read frequency step register")
    return {"success": True, "frequency_step": step_hz}


def set_frequency_step(step_hz: int):
    if step_hz <= 0:
        raise ValueError("Step must be positive")
    manager.write("holding", 20, 8, step_hz)
    return {"success": True, "frequency_step": step_hz}


def start_resonance_measurement(slave: int = 20):
    """Initiate resonance frequency measurement (firmware mode)."""
    global _last_mode
    _last_mode = "firmware"

    manager.write("coil", slave, 5, 1)
    print("Resonance measurement started (firmware mode).", flush=True)
    return {"success": True, "message": "Resonance measurement started"}


# -------------------------------------------------------------------------
# Helper functions
# -------------------------------------------------------------------------
def _convert_firmware_current(adc_value: Optional[int]) -> Optional[float]:
    """Convert ADC value to current in Amps."""
    if adc_value is None:
        return None
    return adc_value * CURRENT_ADC_TO_A


def _ns_to_deg(phase_ns: Optional[float], frequency_hz: Optional[float]) -> Optional[float]:
    """Convert phase in nanoseconds to degrees."""
    if phase_ns is None or frequency_hz is None:
        return None

    phase_s = phase_ns * 1e-9
    phase_deg = (phase_s * frequency_hz * 360) % 360
    if phase_deg > 180:
        phase_deg -= 360
    return round(phase_deg, 2)


def _compute_picks(results: List[Dict[str, Any]]) -> Dict[str, Optional[Dict[str, Any]]]:
    """Determine best overall / phase / current points.
    
    Logic:
    1. Find best_phase (min phase_ns among all valid)
    2. Find best_current (max current_a among all valid)
    3. Filter to frequencies within +/- max_dist Hz from best_phase
    4. Among filtered, find max current
    5. Among those with max current, find min phase -> this is best_overall
    """
    max_dist = DeviceDataService.get_phase_curr_max_distance()
    print(f"Computing picks with max distance: {max_dist} Hz", flush=True)
    
    if not results:
        return {"best_overall": None, "best_phase": None, "best_current": None}

    valid = [r for r in results if r["phase_ns"] is not None and r["current_a"] is not None]
    if not valid:
        return {"best_overall": None, "best_phase": None, "best_current": None}

    # Step 1: Find best phase (min phase_ns among all valid)
    best_phase = min(valid, key=lambda r: abs(r["phase_ns"]))
    
    # Step 2: Find best current (max current_a among all valid)
    best_current = max(valid, key=lambda r: r["current_a"])

    # Step 3: Filter to frequencies within +/- max_dist Hz from best_phase frequency
    best_phase_freq = best_phase["frequency"]
    freq_filtered = [r for r in valid if abs(r["frequency"] - best_phase_freq) <= max_dist]
    
    # If no results within the distance, fall back to all valid results
    if not freq_filtered:
        freq_filtered = valid
    
    # Step 4 & 5: Find max current in filtered group, then filter to those with max current
    max_current_filtered = max(freq_filtered, key=lambda r: r["current_a"])["current_a"]
    candidates = [r for r in freq_filtered if r["current_a"] == max_current_filtered]
    
    # Step 6: Choose the one with min phase among candidates
    best_overall = min(candidates, key=lambda r: abs(r["phase_ns"]))

    return {
        "best_overall": best_overall,
        "best_phase": best_phase,
        "best_current": best_current,
    }


# -------------------------------------------------------------------------
# Live plotting helpers
# -------------------------------------------------------------------------
def _init_live_plots(show_plot: bool = True):
    """Initialize matplotlib live plots."""
    global _plot_figure
    
    if show_plot:
        plt.ion()
    else:
        plt.ioff()

    fig, (ax_phase, ax_current) = plt.subplots(2, 1, sharex=True)
    fig.set_size_inches(10, 8)
    
    phase_line, = ax_phase.plot([], [], marker="o", linestyle="-", color="blue", label="Phase")
    current_line, = ax_current.plot([], [], marker="o", linestyle="-", color="red", label="Current")
    
    ax_phase.set_ylabel("Phase (deg)")
    ax_current.set_ylabel("Current (A)")
    ax_current.set_xlabel("Frequency (Hz)")
    
    ax_phase.set_title("Resonance Sweep - Live Plot")
    ax_phase.grid(True)
    ax_current.grid(True)
    
    ax_phase.legend()
    ax_current.legend()
    
    plt.tight_layout()
    
    _plot_figure = fig
    return fig, ax_phase, ax_current, phase_line, current_line


def _save_plot_to_file(folder_path: Optional[str], filename_prefix: str = "resonance_plot"):
    """Save the current plot to an image file."""
    global _plot_figure
    
    if _plot_figure is None:
        return None
    
    if folder_path and os.path.exists(folder_path) and os.path.isdir(folder_path):
        timestamp = int(time.time())
        filename = f"{filename_prefix}_{timestamp}.png"
        filepath = os.path.join(folder_path, filename)
        
        try:
            _plot_figure.savefig(filepath, dpi=300, bbox_inches='tight')
            print(f"Plot saved to: {filepath}", flush=True)
            return filepath
        except Exception as e:
            print(f"Error saving plot: {e}", flush=True)
            return None
    
    return None


# -------------------------------------------------------------------------
# Software sweep worker
# -------------------------------------------------------------------------
def _sweep_worker(
    start_hz: int,
    end_hz: int,
    step_hz: int,
    stabilize_s: float,
    slave: int,
    save_results: bool,
    save_folder_path: Optional[str],
    live_plot: bool = True,  # New parameter
    save_plot: bool = False,  # New parameter
):
    csv_file = None
    csv_writer = None
    global _plot_figure

    try:
        _sweep_state["running"] = True
        _sweep_state["status_code"] = 3
        _sweep_state["status_text"] = "measurement in progress"
        _sweep_state["results"] = []

        freqs = list(range(start_hz, end_hz + 1, step_hz))
        _sweep_state["progress"]["total"] = len(freqs)
        _sweep_state["progress"]["index"] = 0

        # Initialize CSV for incremental writing (optional)
        if save_results and save_folder_path:
            filename = f"resonance_sweep_live_{int(time.time())}.csv"
            filepath = os.path.join(save_folder_path, filename)

            csv_file = open(filepath, "w", newline="")
            csv_writer = csv.DictWriter(
                csv_file,
                fieldnames=["frequency", "phase_ns", "phase_deg", "current_a", "error"],
            )
            csv_writer.writeheader()

        # Initialize live plots if requested
        fig = None
        ax_phase = None
        ax_current = None
        phase_line = None
        current_line = None
        plot_freqs = []
        plot_phases = []
        plot_currents = []
        
        if live_plot:
            fig, ax_phase, ax_current, phase_line, current_line = _init_live_plots(show_plot=True)

        for idx, freq in enumerate(freqs):
            _sweep_state["progress"]["index"] = idx + 1
            _sweep_state["progress"]["current_frequency"] = freq

            from backend.services import control_service
            control_service.set_frequency(freq)
            time.sleep(stabilize_s)

            try:
                phase_res = monitoring_service.get_phase(slave)
                phase_seconds = phase_res.get("seconds")
                phase_ns = None if phase_seconds is None else phase_seconds * 1e9
                phase_deg = phase_res.get("degrees")
            except Exception:
                phase_ns = None
                phase_deg = None

            try:
                current_a = monitoring_service.get_current(slave)
            except Exception:
                current_a = None

            result = {
                "frequency": freq,
                "phase_ns": phase_ns,
                "phase_deg": phase_deg,
                "current_a": current_a,
                "error": None,
            }

            _sweep_state["results"].append(result)

            # Incremental CSV write
            if csv_writer:
                csv_writer.writerow(result)
                csv_file.flush()

            # Live plot update
            if live_plot:
                if phase_deg is not None:
                    plot_freqs.append(freq)
                    plot_phases.append(phase_deg)
                    phase_line.set_data(plot_freqs, plot_phases)
                    ax_phase.relim()
                    ax_phase.autoscale_view()

                if current_a is not None:
                    if not plot_freqs:  # If phase data wasn't available but current is
                        plot_freqs.append(freq)
                    plot_currents.append(current_a)
                    current_line.set_data(plot_freqs, plot_currents)
                    ax_current.relim()
                    ax_current.autoscale_view()

                plt.pause(0.01)

        # Compute final picks
        picks = _compute_picks(_sweep_state["results"])
        _sweep_state.update(picks)

        if picks["best_overall"]:
            _sweep_state["status_code"] = 1
            _sweep_state["status_text"] = "obtained successfully"

            # Update firmware with external result
            best_freq = picks["best_overall"]["frequency"]
            _update_firmware_with_external_result(best_freq, slave)
            
            # Save plot if requested
            if save_plot and save_folder_path and live_plot:
                plot_filepath = _save_plot_to_file(save_folder_path)
                if plot_filepath:
                    _sweep_state["plot_filepath"] = plot_filepath
        else:
            _sweep_state["status_code"] = 2
            _sweep_state["status_text"] = "failed to obtain"

    except Exception as e:
        _sweep_state["status_code"] = 2
        _sweep_state["status_text"] = "failed to obtain"
        _sweep_state["error"] = str(e)

    finally:
        _sweep_state["running"] = False
        _sweep_state["progress"]["current_frequency"] = None

        if csv_file:
            csv_file.close()

        # Don't turn off interactive mode if we're showing the plot
        # Let the plot window stay open
        if live_plot and fig is not None:
            # Add a final title with completion status
            if _sweep_state["status_code"] == 1:
                completion_text = "✓ Measurement Complete"
                if picks and picks["best_overall"]:
                    completion_text += f"\nBest Frequency: {picks['best_overall']['frequency']} Hz"
            else:
                completion_text = "✗ Measurement Failed"
            
            fig.suptitle(completion_text, fontsize=12)
            plt.tight_layout()
            
            # Show a message that the plot window will stay open
            print("Plot window is open. Close it manually when done.", flush=True)
            
            # Only block if in interactive mode
            if plt.isinteractive():
                # Switch to blocking mode to keep window open
                plt.ioff()
                plt.show(block=True)
            else:
                plt.show()

        _sweep_state["plot_open"] = False


def start_software_sweep(
    start_hz: int,
    end_hz: int,
    step_hz: int,
    stabilize_s: float = 0.15,
    slave: int = 20,
    save_results: bool = False,
    save_folder_path: Optional[str] = None,
    live_plot: bool = True,  # New parameter
    save_plot: bool = False,  # New parameter
):
    """Start a software-based sweep in a background thread."""
    global _last_mode

    if _sweep_state["running"]:
        raise ValueError("Software measurement already in progress")

    _last_mode = "software"

    _sweep_state["plot_open"] = live_plot

    thread = threading.Thread(
        target=_sweep_worker,
        args=(
            start_hz,
            end_hz,
            step_hz,
            stabilize_s,
            slave,
            save_results,
            save_folder_path,
            live_plot,  # Pass new parameter
            save_plot,  # Pass new parameter
        ),
        daemon=True,
    )
    thread.start()

    return {"success": True, "message": "Software sweep started"}

def _is_valid_phase_ns(phase_ns):
    """Check if phase value looks valid (not garbage)."""
    if phase_ns is None:
        return False
    # Phase should be within reasonable range (less than 1 second in ns)
    return abs(phase_ns) < 1e9

def _is_valid_current_adc(current_adc):
    """Check if current ADC value looks valid."""
    if current_adc is None:
        return False
    # ADC should be in range 0-4095
    return 0 <= current_adc <= 4095


# -------------------------------------------------------------------------
# Unified status endpoint
# -------------------------------------------------------------------------
def get_resonance_status(slave: int = 20):
    """Return resonance status for firmware or software mode."""
    if _sweep_state["running"] or _last_mode == "software":
        # For software mode, return state data
        result = {
            "success": True,
            "status_code": _sweep_state["status_code"],
            "status_text": _sweep_state["status_text"],
            "progress": _sweep_state["progress"],
            "results": _sweep_state["results"],
            "best_overall": _sweep_state["best_overall"],
            "best_phase": _sweep_state["best_phase"],
            "best_current": _sweep_state["best_current"],
            "error": _sweep_state["error"],
            "plot_filepath": _sweep_state.get("plot_filepath"),
            "plot_open": _sweep_state.get("plot_open", False),
        }
        return result

    # For firmware mode, read and validate the resonance data
    status = manager.read("input", slave, 9)
    
    # Update status texts to include code 4
    status_texts = {
        0: "not obtained",
        1: "obtained successfully",
        2: "failed to obtain",
        3: "measurement in progress",
        4: "software measurement (frequency only)",
    }
    status_text = status_texts.get(status, f"unknown ({status})")
    
    result = {
        "success": True,
        "status_code": status,
        "status_text": status_text,
        "best_overall": None,
        "best_phase": None,
        "best_current": None,
    }
    
    # Handle status code 4 specially - software wrote only frequency
    if status == 4:
        # Read just the overall frequency registers
        overall_hi = manager.read("input", slave, 10)
        overall_lo = manager.read("input", slave, 11)
        
        if overall_hi is not None and overall_lo is not None:
            overall_freq = (overall_hi << 16) | overall_lo
            
            result["best_overall"] = {
                "frequency": overall_freq,
                "phase_ns": None,
                "phase_deg": None,
                "current": None,
                "current_a": None,
            }
        return result
    
    # Only process full data if firmware status says measurement succeeded (status 1)
    if status == 1:
        # ... [keep the existing code for status 1 processing] ...
        # Read all registers first
        overall_hi = manager.read("input", slave, 10)
        overall_lo = manager.read("input", slave, 11)
        overall_phase_raw = manager.read("input", slave, 12)
        overall_current_raw = manager.read("input", slave, 13)
        
        phase_hi = manager.read("input", slave, 14)
        phase_lo = manager.read("input", slave, 15)
        phase_phase_raw = manager.read("input", slave, 16)
        phase_current_raw = manager.read("input", slave, 17)
        
        current_hi = manager.read("input", slave, 18)
        current_lo = manager.read("input", slave, 19)
        current_phase_raw = manager.read("input", slave, 20)
        current_current_raw = manager.read("input", slave, 21)
        
        # Check if we have at least the overall frequency
        has_overall_freq = (overall_hi is not None and overall_lo is not None)
        
        if has_overall_freq:
            overall_freq = (overall_hi << 16) | overall_lo
            
            # Validate phase and current data
            overall_phase_valid = _is_valid_phase_ns(overall_phase_raw)
            overall_current_valid = _is_valid_current_adc(overall_current_raw)
            
            # If phase/current look invalid, downgrade the status
            if not (overall_phase_valid and overall_current_valid):
                result["status_code"] = 4  # Change to software measurement status
                result["status_text"] = "software measurement (frequency only)"
                
                # Return the frequency but with null phase/current
                result["best_overall"] = {
                    "frequency": overall_freq,
                    "phase_ns": None,
                    "phase_deg": None,
                    "current": None,
                    "current_a": None,
                }
                return result
            
            # Otherwise, we have valid firmware data - process it
            VREF = 4.485
            
            def decode_signed_phase(phase_raw):
                if phase_raw is None:
                    return None
                if phase_raw >= 32768:
                    phase_raw -= 65536
                return float(phase_raw)
            
            def ns_to_deg(phase_ns, frequency_hz):
                if phase_ns is None or frequency_hz is None or frequency_hz <= 0:
                    return None
                period_ns = 1e9 / frequency_hz
                phase_deg = (phase_ns / period_ns) * 360.0
                return phase_deg
            
            def adc_to_current(adc_value, slave_id=slave):
                if adc_value is None:
                    return None
                
                # Read calibration values
                c_gain_raw = manager.read("holding", slave_id, 14)
                r_shunt_raw = manager.read("holding", slave_id, 15)
                
                if c_gain_raw is None or r_shunt_raw is None:
                    return None
                
                c_gain = c_gain_raw / 1000.0
                r_shunt = r_shunt_raw / 100.0
                
                if c_gain == 0 or r_shunt == 0:
                    return None
                
                amplified_vr = (adc_value / 4095.0) * VREF
                vr_voltage = amplified_vr / c_gain
                current_a = vr_voltage / r_shunt
                
                return current_a

            # Process Best Overall Frequency
            if not any(val is None for val in [overall_hi, overall_lo, overall_phase_raw, overall_current_raw]):
                overall_freq = (overall_hi << 16) | overall_lo
                phase_ns = decode_signed_phase(overall_phase_raw)
                phase_deg = ns_to_deg(phase_ns, overall_freq)
                current_a = adc_to_current(overall_current_raw)
                
                result["best_overall"] = {
                    "frequency": overall_freq,
                    "phase_ns": phase_ns,
                    "phase_deg": phase_deg,
                    "current": current_a,
                    "current_a": current_a,
                }

            # Process Best Phase Frequency
            if not any(val is None for val in [phase_hi, phase_lo, phase_phase_raw, phase_current_raw]):
                phase_freq = (phase_hi << 16) | phase_lo
                phase_ns = decode_signed_phase(phase_phase_raw)
                phase_deg = ns_to_deg(phase_ns, phase_freq)
                current_a = adc_to_current(phase_current_raw)
                
                result["best_phase"] = {
                    "frequency": phase_freq,
                    "phase_ns": phase_ns,
                    "phase_deg": phase_deg,
                    "current": current_a,
                    "current_a": current_a,
                }

            # Process Best Current Frequency
            if not any(val is None for val in [current_hi, current_lo, current_phase_raw, current_current_raw]):
                current_freq = (current_hi << 16) | current_lo
                phase_ns = decode_signed_phase(current_phase_raw)
                phase_deg = ns_to_deg(phase_ns, current_freq)
                current_a = adc_to_current(current_current_raw)
                
                result["best_current"] = {
                    "frequency": current_freq,
                    "phase_ns": phase_ns,
                    "phase_deg": phase_deg,
                    "current": current_a,
                    "current_a": current_a,
                }
    
    return result

def _update_firmware_with_external_result(best_overall_freq: int, slave: int = 20):
    """Write externally obtained resonance frequency to firmware."""
    try:
        freq_hi = (best_overall_freq >> 16) & 0xFFFF
        freq_lo = best_overall_freq & 0xFFFF

        manager.write("holding", slave, 21, freq_hi)
        manager.write("holding", slave, 22, freq_lo)
        manager.write("coil", slave, 6, 1)

        return True
    except Exception:
        return False