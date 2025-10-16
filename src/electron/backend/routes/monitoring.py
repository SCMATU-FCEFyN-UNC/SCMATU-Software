# endpoints/monitoring.py
from flask import Blueprint, jsonify
from backend.services.monitoring_service import (
    get_phase, get_voltage, get_current,
    get_power, get_period, get_resonance_frequency
)

monitoring_bp = Blueprint("monitoring", __name__)

@monitoring_bp.route("/monitoring", methods=["GET"])
def get_all_monitoring():
    """Return all monitoring values in one call."""
    try:
        data = {
            "phase": get_phase(),
            "voltage": get_voltage(),
            "current": get_current(),
            "power": get_power(),
            "period": get_period(),
            "resonance": get_resonance_frequency(),
        }
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@monitoring_bp.route("/monitoring/<string:metric>", methods=["GET"])
def get_single_monitoring(metric: str):
    """Return one specific monitoring value."""
    try:
        mapping = {
            "phase": get_phase,
            "voltage": get_voltage,
            "current": get_current,
            "power": get_power,
            "period": get_period,
            "resonance": get_resonance_frequency,
        }

        if metric not in mapping:
            return jsonify({"success": False, "error": f"Unsupported metric: {metric}"}), 400

        value = mapping[metric]()
        return jsonify({"success": True, metric: value}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500