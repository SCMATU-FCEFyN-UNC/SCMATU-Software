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


@control_bp.route("/transducer", methods=["POST"])
def set_transducer_endpoint():
    """Enable or disable the transducer (coil 0)."""
    data = request.get_json() or {}
    enabled = data.get("enabled")
    if enabled is None:
        return jsonify({"success": False, "error": "Missing 'enabled' field"}), 400

    try:
        result = control_service.set_transducer(bool(enabled))
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to set transducer: {str(e)}"}), 500


@control_bp.route("/transducer", methods=["GET"])
def get_transducer_endpoint():
    """Get transducer enabled state (coil 0)."""
    try:
        enabled = control_service.get_transducer()
        return jsonify({"success": True, "enabled": bool(enabled)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@control_bp.route("/on_time", methods=["POST"])
def set_on_time_endpoint():
    """Set transducer on time (ms) in holding register 5."""
    data = request.get_json() or {}
    on_time_ms = data.get("on_time_ms")
    if on_time_ms is None:
        return jsonify({"success": False, "error": "Missing 'on_time_ms' field"}), 400

    try:
        result = control_service.set_on_time(int(on_time_ms))
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to set on_time: {str(e)}"}), 500


@control_bp.route("/on_time", methods=["GET"])
def get_on_time_endpoint():
    """Get transducer on time (ms) from holding register 5."""
    try:
        on_time = control_service.get_on_time()
        return jsonify({"success": True, "on_time_ms": on_time}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@control_bp.route("/off_time", methods=["POST"])
def set_off_time_endpoint():
    """Set transducer off time (ms) in holding register 6."""
    data = request.get_json() or {}
    off_time_ms = data.get("off_time_ms")
    if off_time_ms is None:
        return jsonify({"success": False, "error": "Missing 'off_time_ms' field"}), 400

    try:
        result = control_service.set_off_time(int(off_time_ms))
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to set off_time: {str(e)}"}), 500


@control_bp.route("/off_time", methods=["GET"])
def get_off_time_endpoint():
    """Get transducer off time (ms) from holding register 6."""
    try:
        off_time = control_service.get_off_time()
        return jsonify({"success": True, "off_time_ms": off_time}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
