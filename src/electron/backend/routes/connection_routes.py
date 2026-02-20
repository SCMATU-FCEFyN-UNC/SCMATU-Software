from flask import Blueprint, jsonify, request
from backend.services.connection_manager import manager  # <-- use singleton manager

serial_bp = Blueprint("serial", __name__)

@serial_bp.route("/ports", methods=["GET"])
def get_ports():
    return jsonify({"ports": manager.list_ports()}), 200

@serial_bp.route("/connect", methods=["POST"])
def connect_port():
    """
    Connect to a serial port using parameters from request JSON.
    Expected JSON keys:
      - port (required)
      - baudrate, bytesize, parity, stopbits, timeout (optional)
    """
    data = request.get_json() or {}
    if "port" not in data:
        return jsonify({"error": "Missing 'port'"}), 400

    params = {
        "port": data["port"],
        "baudrate": data.get("baudrate", 9600),
        "bytesize": data.get("bytesize", 8),
        "parity": data.get("parity", "N"),
        "stopbits": data.get("stopbits", 1),
        "timeout": data.get("timeout", 1.0),
    }

    success = manager.connect(**params)
    return jsonify({"success": success}), 200 if success else 500

@serial_bp.route("/disconnect", methods=["POST"])
def disconnect_port():
    manager.disconnect()
    return jsonify({"success": True}), 200

@serial_bp.route("/status", methods=["GET"])
def connection_status():
    return jsonify(manager.get_status()), 200
