from flask import Blueprint, request, jsonify
from backend.services.resonance_service import (
    get_frequency_range_start,
    set_frequency_range_start,
    get_frequency_range_end,
    set_frequency_range_end,
    get_frequency_step,
    set_frequency_step,
    start_resonance_measurement,
    get_resonance_status,
)

resonance_bp = Blueprint("resonance", __name__, url_prefix="/resonance")

current_measurement = {"running": False}

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
    """Trigger resonance frequency measurement asynchronously."""
    if current_measurement["running"]:
        return jsonify({"success": False, "error": "Measurement already in progress"}), 409
    
    try:
        current_measurement["running"] = True
        # Call the service-level function instead of direct manager.write
        result = start_resonance_measurement(slave = 20)
        return jsonify(result), 200

    except Exception as e:
        current_measurement["running"] = False
        return jsonify({"success": False, "error": str(e)}), 500
    
@resonance_bp.route("/status", methods=["GET"])
def get_resonance_status_endpoint():
    """
    Return only the current resonance measurement status.
    The frontend can poll this endpoint periodically to detect when
    the measurement completes or fails.
    """
    try:
        result = get_resonance_status(slave=20)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500