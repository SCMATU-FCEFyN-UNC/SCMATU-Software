from flask import Blueprint, request, jsonify
from backend.services.resonance_service import (
    get_frequency_range_start,
    set_frequency_range_start,
    get_frequency_range_end,
    set_frequency_range_end,
    get_frequency_step,
    set_frequency_step,
    start_resonance_measurement,
    start_software_sweep,
    get_resonance_status,
)
import csv
import os
import time
from datetime import datetime

resonance_bp = Blueprint("resonance", __name__, url_prefix="/resonance")


@resonance_bp.route("/frequency/start", methods=["GET"])
def read_frequency_range_start():
    """Return the starting frequency for resonance measurement."""
    try:
        result = get_frequency_range_start()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@resonance_bp.route("/frequency/start", methods=["POST"])
def write_frequency_range_start():
    """Set the starting frequency for resonance measurement."""
    try:
        data = request.get_json()
        start_hz = int(data.get("frequency_range_start", -1))
        result = set_frequency_range_start(start_hz)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@resonance_bp.route("/frequency/end", methods=["GET"])
def read_frequency_range_end():
    """Return the ending frequency for resonance measurement."""
    try:
        result = get_frequency_range_end()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@resonance_bp.route("/frequency/end", methods=["POST"])
def write_frequency_range_end():
    """Set the ending frequency for resonance measurement."""
    try:
        data = request.get_json()
        end_hz = int(data.get("frequency_range_end", -1))
        result = set_frequency_range_end(end_hz)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@resonance_bp.route("/frequency/step", methods=["GET"])
def read_frequency_step():
    """Return the frequency step value."""
    try:
        result = get_frequency_step()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@resonance_bp.route("/frequency/step", methods=["POST"])
def write_frequency_step():
    """Set the frequency step value."""
    try:
        data = request.get_json()
        step_hz = int(data.get("frequency_step", -1))
        result = set_frequency_step(step_hz)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@resonance_bp.route("/start", methods=["POST"])
def start_resonance_measurement_endpoint():
    """Trigger resonance frequency measurement asynchronously.
    
    The endpoint accepts optional JSON:
      { "mode": "firmware" }          # default: firmware-based
      { "mode": "software",
        "frequency_range_start": 20000,
        "frequency_range_end": 140000,
        "frequency_step": 10,
        "stabilize_s": 0.15,
        "save_results": false,        # optional: whether to save CSV
        "save_folder_path": null,     # optional: folder path for CSV
        "live_plot": true,            # optional: show live plot (default: true)
        "save_plot": false            # optional: save plot as PNG (default: false)
      }
    """
    try:
        data = request.get_json(silent=True) or {}
        mode = data.get("mode", "firmware")

        if mode == "software":
            # gather params with sensible defaults
            start_hz = int(data.get("frequency_range_start", 20000))
            end_hz = int(data.get("frequency_range_end", 140000))
            step_hz = int(data.get("frequency_step", 10))
            stabilize_s = float(data.get("stabilize_s", 0.15))
            save_results = data.get("save_results", False)
            save_folder_path = data.get("save_folder_path")
            live_plot = data.get("live_plot", True)  # Default to showing plot
            save_plot = data.get("save_plot", False)  # Default to not saving plot
            
            print(f"Starting software sweep: {start_hz}-{end_hz} Hz, step {step_hz}", flush=True)
            if save_results and save_folder_path:
                print(f"Results will be saved to: {save_folder_path}", flush=True)
            if live_plot:
                print("Live plot will be displayed", flush=True)
            if save_plot and save_folder_path:
                print(f"Plot will be saved to: {save_folder_path}", flush=True)
            
            res = start_software_sweep(
                start_hz, end_hz, step_hz, stabilize_s, slave=20,
                save_results=save_results, save_folder_path=save_folder_path,
                live_plot=live_plot, save_plot=save_plot
            )
            return jsonify(res), 200
        else:
            # firmware default behavior
            print("Starting firmware resonance measurement...", flush=True)
            result = start_resonance_measurement(slave=20)
            print(f"Firmware measurement initiated, result = {result}", flush=True)
            return jsonify(result), 200

    except Exception as e:
        print(f"Error starting measurement: {str(e)}", flush=True)
        return jsonify({"success": False, "error": str(e)}), 500

    
@resonance_bp.route("/status", methods=["GET"])
def get_resonance_status_endpoint():
    """Return the current resonance measurement status."""
    try:
        result = get_resonance_status(slave=20)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@resonance_bp.route("/save-results", methods=["POST"])
def save_results_to_csv():
    """Save sweep results to CSV file."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        folder_path = data.get("folder_path")
        results = data.get("results", [])
        
        if not folder_path:
            return jsonify({"success": False, "error": "No folder path provided"}), 400
        
        if not os.path.exists(folder_path):
            return jsonify({"success": False, "error": f"Folder does not exist: {folder_path}"}), 400
        
        if not os.path.isdir(folder_path):
            return jsonify({"success": False, "error": f"Path is not a directory: {folder_path}"}), 400
        
        # Generate filename with auto-incrementing number
        base_filename = "resonance_sweep_results_"
        counter = 1
        while True:
            filename = f"{base_filename}{counter:03d}.csv"
            filepath = os.path.join(folder_path, filename)
            if not os.path.exists(filepath):
                break
            counter += 1
        
        # Prepare CSV data - handle both field naming conventions
        csv_data = []
        for result in results:
            # Get current value from either 'current_a' or 'current' field
            current_value = result.get("current_a", result.get("current", ""))
            
            row = {
                "frequency": result.get("frequency", ""),
                "phase_ns": result.get("phase_ns", ""),
                "phase_deg": result.get("phase_deg", ""),
                "current_a": current_value,  # Store as current_a in CSV
                "error": result.get("error", "")
            }
            csv_data.append(row)
        
        # Write to CSV
        with open(filepath, "w", newline="") as f:
            fieldnames = ["frequency", "phase_ns", "phase_deg", "current_a", "error"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_data)
        
        # Add summary information
        summary_filepath = os.path.join(folder_path, f"{base_filename}{counter:03d}_summary.txt")
        with open(summary_filepath, "w") as f:
            f.write(f"Resonance Sweep Results Summary\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Total measurements: {len(results)}\n\n")
            
            sweep_params = data.get("sweep_params", {})
            if sweep_params:
                f.write("Sweep Parameters:\n")
                f.write(f"  Start Frequency: {sweep_params.get('start', 'N/A')} Hz\n")
                f.write(f"  End Frequency: {sweep_params.get('end', 'N/A')} Hz\n")
                f.write(f"  Step: {sweep_params.get('step', 'N/A')} Hz\n")
                f.write(f"  Stabilization Delay: {sweep_params.get('stabilize_s', 'N/A')} s\n")
                f.write(f"  Live Plot: {'Enabled' if sweep_params.get('live_plot', True) else 'Disabled'}\n")
                f.write(f"  Save Plot: {'Enabled' if sweep_params.get('save_plot', False) else 'Disabled'}\n\n")
            
            # Helper function to get current value handling both field names
            def get_current_value(result):
                if not result:
                    return "N/A"
                # Try 'current_a' first (software mode), then 'current' (firmware mode)
                current = result.get('current_a', result.get('current'))
                if current is None:
                    return "N/A"
                return current
            
            best_overall = data.get("best_overall")
            best_phase = data.get("best_phase")
            best_current = data.get("best_current")
            
            if best_overall:
                f.write("Best Overall Frequency:\n")
                f.write(f"  Frequency: {best_overall.get('frequency', 'N/A')} Hz\n")
                f.write(f"  Phase (ns): {best_overall.get('phase_ns', 'N/A')}\n")
                f.write(f"  Phase (deg): {best_overall.get('phase_deg', 'N/A')}\n")
                f.write(f"  Current: {get_current_value(best_overall)} A\n\n")
            
            if best_phase:
                f.write("Best Phase Frequency:\n")
                f.write(f"  Frequency: {best_phase.get('frequency', 'N/A')} Hz\n")
                f.write(f"  Phase (ns): {best_phase.get('phase_ns', 'N/A')}\n")
                f.write(f"  Phase (deg): {best_phase.get('phase_deg', 'N/A')}\n")
                f.write(f"  Current: {get_current_value(best_phase)} A\n\n")
            
            if best_current:
                f.write("Best Current Frequency:\n")
                f.write(f"  Frequency: {best_current.get('frequency', 'N/A')} Hz\n")
                f.write(f"  Phase (ns): {best_current.get('phase_ns', 'N/A')}\n")
                f.write(f"  Phase (deg): {best_current.get('phase_deg', 'N/A')}\n")
                f.write(f"  Current: {get_current_value(best_current)} A\n")
            
            # Include plot filepath if available
            plot_filepath = data.get("plot_filepath")
            if plot_filepath:
                f.write(f"\nPlot saved to: {plot_filepath}\n")
        
        print(f"Results saved to: {filepath}", flush=True)
        print(f"Summary saved to: {summary_filepath}", flush=True)
        
        return jsonify({
            "success": True,
            "message": "Results saved successfully",
            "filename": filename,
            "filepath": filepath,
            "summary_file": f"{base_filename}{counter:03d}_summary.txt"
        }), 200
        
    except Exception as e:
        print(f"Error saving results: {str(e)}", flush=True)
        return jsonify({"success": False, "error": str(e)}), 500