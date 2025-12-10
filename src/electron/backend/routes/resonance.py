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
        "stabilize_s": 0.15
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
            
            print(f"Starting software sweep: {start_hz}-{end_hz} Hz, step {step_hz}", flush=True)
            res = start_software_sweep(start_hz, end_hz, step_hz, stabilize_s, slave=20)
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