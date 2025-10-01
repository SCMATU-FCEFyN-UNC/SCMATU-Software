# endpoints/control.py
from flask import Blueprint, request, jsonify
from backend.services import control_service

control_bp = Blueprint("control", __name__)

@control_bp.route("/frequency", methods=["POST"])
def set_frequency_endpoint():
    """Set frequency (Hz) using holding registers 2 and 3."""
    data = request.get_json() or {}
    frequency_hz = int(data.get("frequency_hz", 0))

    try:
        result = control_service.set_frequency(frequency_hz)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to set frequency: {str(e)}"}), 500


@control_bp.route("/frequency", methods=["GET"])
def get_frequency_endpoint():
    """Read current frequency (Hz) from holding registers 2 and 3."""
    try:
        freq = control_service.get_frequency()
        return jsonify({"success": True, "frequency": freq}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@control_bp.route("/power", methods=["POST"])
def set_power_level_endpoint():
    """Set power level (%) using holding register 4."""
    data = request.get_json() or {}
    power_percent = int(data.get("power_percent", -1))

    try:
        result = control_service.set_power_level(power_percent)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400


@control_bp.route("/samples", methods=["POST"])
def set_sample_count_endpoint():
    """Set number of samples used for phase measurement."""
    data = request.get_json() or {}
    count = int(data.get("sample_count", 0))

    try:
        result = control_service.set_sample_count(count)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400


@control_bp.route("/frequency-step", methods=["POST"])
def set_frequency_step_endpoint():
    """Set frequency step (Hz) used for resonance search."""
    data = request.get_json() or {}
    step = int(data.get("step_hz", 0))

    try:
        result = control_service.set_frequency_step(step)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
