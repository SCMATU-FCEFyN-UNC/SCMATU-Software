from backend.services.connection_manager import manager
from backend.services import monitoring_service
import threading
import time
from typing import Optional, Dict, Any, List

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
}

# Track the last active mode
_last_mode: str = "firmware"  # "firmware" or "software"

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
        raise ValueError("Failed to read frequency range start registers")

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
    """Initiate resonance frequency measurement."""
    global _last_mode
    _last_mode = "firmware"
    print(f"Setting mode to firmware for measurement", flush=True)
    
    manager.write("coil", slave, 5, 1)
    print("Resonance measurement started (firmware mode).", flush=True)
    return {"success": True, "message": "Resonance measurement started"}

# --- Helper functions ---
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

# --- Software sweep functions ---
def _compute_picks(results: List[Dict[str, Any]]) -> Dict[str, Optional[Dict[str, Any]]]:
    if not results:
        return {"best_overall": None, "best_phase": None, "best_current": None}

    valid_results = [r for r in results if r.get("phase_ns") is not None and r.get("current_a") is not None]
    if not valid_results:
        return {"best_overall": None, "best_phase": None, "best_current": None}

    best_phase = min(valid_results, key=lambda r: abs(r["phase_ns"]))
    best_current = max(valid_results, key=lambda r: r["current_a"])
    
    max_current = best_current["current_a"]
    candidates = [r for r in valid_results if r["current_a"] == max_current]
    combined = min(candidates, key=lambda r: abs(r["phase_ns"]))

    return {
        "best_overall": combined,
        "best_phase": best_phase,
        "best_current": best_current,
    }

def _sweep_worker(start_hz: int, end_hz: int, step_hz: int, stabilize_s: float, slave: int = 20):
    try:
        _sweep_state["running"] = True
        _sweep_state["status_code"] = 3
        _sweep_state["status_text"] = "measurement in progress"
        _sweep_state["results"] = []
        freqs = list(range(start_hz, end_hz + 1, step_hz))
        _sweep_state["progress"]["total"] = len(freqs)
        _sweep_state["progress"]["index"] = 0

        for idx, freq in enumerate(freqs):
            _sweep_state["progress"]["index"] = idx + 1
            _sweep_state["progress"]["current_frequency"] = freq

            try:
                from backend.services import control_service
                control_service.set_frequency(freq)
            except Exception as e:
                _sweep_state["results"].append({
                    "frequency": freq,
                    "phase_ns": None,
                    "phase_deg": None,
                    "current_a": None,
                    "error": f"set_frequency failed: {e}"
                })
                time.sleep(stabilize_s)
                continue

            time.sleep(stabilize_s)

            try:
                phase_res = monitoring_service.get_phase(slave)
                phase_seconds = phase_res.get("seconds", None)
                phase_ns = None if phase_seconds is None else phase_seconds * 1e9
                phase_deg = phase_res.get("degrees", None)
            except Exception as e:
                phase_ns = None
                phase_deg = None

            try:
                current_a = monitoring_service.get_current(slave)
            except Exception as e:
                current_a = None

            _sweep_state["results"].append({
                "frequency": freq,
                "phase_ns": phase_ns,
                "phase_deg": phase_deg,
                "current_a": current_a,
                "error": None
            })

        valid_results = [r for r in _sweep_state["results"] if r["phase_ns"] is not None and r["current_a"] is not None]
        if valid_results:
            picks = _compute_picks(valid_results)
            _sweep_state["best_overall"] = picks["best_overall"]
            _sweep_state["best_phase"] = picks["best_phase"]
            _sweep_state["best_current"] = picks["best_current"]
            _sweep_state["status_code"] = 1
            _sweep_state["status_text"] = "obtained successfully"
            
            # NEW: Update firmware with external result
            if _sweep_state["best_overall"] and _sweep_state["best_overall"].get("frequency"):
                best_freq = _sweep_state["best_overall"]["frequency"]
                print(f"Software sweep completed. Best overall frequency: {best_freq} Hz", flush=True)
                
                # Update firmware with the external result
                success = _update_firmware_with_external_result(best_freq, slave)
                if success:
                    print("Successfully updated firmware with external resonance frequency", flush=True)
                else:
                    print("Failed to update firmware with external result", flush=True)
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

def start_software_sweep(start_hz: int, end_hz: int, step_hz: int, stabilize_s: float = 0.15, slave: int = 20):
    """Start a software-based sweep in a background thread."""
    global _last_mode
    
    if _sweep_state["running"]:
        raise ValueError("Software measurement already in progress")

    if step_hz <= 0:
        raise ValueError("Step must be positive")
    if end_hz < start_hz:
        raise ValueError("End must be >= start")

    _last_mode = "software"
    print(f"Setting mode to software for measurement", flush=True)
    
    _sweep_state["running"] = True
    _sweep_state["status_code"] = 3
    _sweep_state["status_text"] = "measurement in progress"
    _sweep_state["progress"] = {"current_frequency": None, "index": 0, "total": 0}
    _sweep_state["results"] = []
    _sweep_state["best_overall"] = None
    _sweep_state["best_phase"] = None
    _sweep_state["best_current"] = None
    _sweep_state["error"] = None

    thread = threading.Thread(target=_sweep_worker, args=(start_hz, end_hz, step_hz, stabilize_s, slave), daemon=True)
    thread.start()
    return {"success": True, "message": "Software sweep started"}

# --- Unified get_resonance_status ---
def get_resonance_status(slave: int = 20):
    """
    Unified function to get resonance status for both firmware and software modes.
    Returns software sweep results only if software sweep is active or was the last mode.
    """
    # Check if we should return software results
    should_return_software = False
    
    if _sweep_state["running"]:
        # Software sweep is actively running
        should_return_software = True
    elif _last_mode == "software" and _sweep_state["status_code"] != 0:
        # Last mode was software and we have results
        should_return_software = True
    
    if should_return_software:
        response = {
            "success": True,
            "status_code": _sweep_state["status_code"],
            "status_text": _sweep_state["status_text"],
            "progress": _sweep_state["progress"],
            "results": _sweep_state["results"],
            "error": _sweep_state.get("error"),
        }
        
        if _sweep_state["best_overall"]:
            response["best_overall"] = _sweep_state["best_overall"]
        if _sweep_state["best_phase"]:
            response["best_phase"] = _sweep_state["best_phase"]
        if _sweep_state["best_current"]:
            response["best_current"] = _sweep_state["best_current"]
        
        return response

    # Otherwise, read hardware status for firmware mode
    status = manager.read("input", slave, 9)

    if status is None:
        raise ValueError("Failed to read resonance frequency status register")

    status_texts = {
        0: "not obtained",
        1: "obtained successfully",
        2: "failed to obtain",
        3: "measurement in progress",
    }

    status_text = status_texts.get(status, f"unknown ({status})")

    response = {
        "success": True,
        "status_code": status,
        "status_text": status_text,
        "best_overall": None,
        "best_phase": None,
        "best_current": None,
    }

    # Read detailed results if measurement succeeded
    if status == 1:
        # Best Overall Frequency
        best_overall_hi = manager.read("input", slave, 10)
        best_overall_lo = manager.read("input", slave, 11)
        best_overall_phase_ns = manager.read("input", slave, 12)
        best_overall_current_adc = manager.read("input", slave, 13)

        if all(val is not None for val in [best_overall_hi, best_overall_lo, best_overall_phase_ns, best_overall_current_adc]):
            freq_overall = (best_overall_hi << 16) | best_overall_lo
            current_overall = _convert_firmware_current(best_overall_current_adc)
            phase_deg_overall = _ns_to_deg(float(best_overall_phase_ns), freq_overall)
            
            response["best_overall"] = {
                "frequency": freq_overall,
                "phase_ns": float(best_overall_phase_ns),
                "phase_deg": phase_deg_overall,
                "current": current_overall,
            }

        # Best Phase Frequency
        best_phase_hi = manager.read("input", slave, 14)
        best_phase_lo = manager.read("input", slave, 15)
        best_phase_phase_ns = manager.read("input", slave, 16)
        best_phase_current_adc = manager.read("input", slave, 17)

        if all(val is not None for val in [best_phase_hi, best_phase_lo, best_phase_phase_ns, best_phase_current_adc]):
            freq_phase = (best_phase_hi << 16) | best_phase_lo
            current_phase = _convert_firmware_current(best_phase_current_adc)
            phase_deg_phase = _ns_to_deg(float(best_phase_phase_ns), freq_phase)
            
            response["best_phase"] = {
                "frequency": freq_phase,
                "phase_ns": float(best_phase_phase_ns),
                "phase_deg": phase_deg_phase,
                "current": current_phase,
            }

        # Best Current Frequency
        best_current_hi = manager.read("input", slave, 18)
        best_current_lo = manager.read("input", slave, 19)
        best_current_phase_ns = manager.read("input", slave, 20)
        best_current_current_adc = manager.read("input", slave, 21)

        if all(val is not None for val in [best_current_hi, best_current_lo, best_current_phase_ns, best_current_current_adc]):
            freq_current = (best_current_hi << 16) | best_current_lo
            current_current = _convert_firmware_current(best_current_current_adc)
            phase_deg_current = _ns_to_deg(float(best_current_phase_ns), freq_current)
            
            response["best_current"] = {
                "frequency": freq_current,
                "phase_ns": float(best_current_phase_ns),
                "phase_deg": phase_deg_current,
                "current": current_current,
            }

    return response

def _update_firmware_with_external_result(best_overall_freq: int, slave: int = 20):
    """
    Write the externally obtained resonance frequency to firmware registers
    and trigger coil 6 to make firmware update its state.
    """
    try:
        # Split frequency into hi and lo parts
        freq_hi = (best_overall_freq >> 16) & 0xFFFF
        freq_lo = best_overall_freq & 0xFFFF
        
        # Write to holding registers 21 and 22
        manager.write("holding", slave, 21, freq_hi)
        manager.write("holding", slave, 22, freq_lo)
        
        print(f"Written external resonance frequency {best_overall_freq} Hz to registers 21-22", flush=True)
        
        # Trigger coil 6 to make firmware process the external result
        manager.write("coil", slave, 6, 1)
        print("Triggered coil 6 to update firmware state", flush=True)
        
        return True
        
    except Exception as e:
        print(f"Error updating firmware with external result: {e}", flush=True)
        return False