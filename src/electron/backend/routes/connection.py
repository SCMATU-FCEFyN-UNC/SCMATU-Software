from flask import Blueprint, jsonify, request
from backend.services.connection_manager import list_ports
from backend.services import connection_manager
import asyncio

serial_bp = Blueprint("serial", __name__)

@serial_bp.route("/ports", methods=["GET"])
def get_ports():
    return jsonify({"ports": list_ports()}), 200

@serial_bp.route("/connect", methods=["POST"])
def connect_port():
    data = request.get_json()
    if not data or "port" not in data:
        return jsonify({"error": "Missing 'port'"}), 400

    success = asyncio.run(connection_manager.connect(data["port"]))
    return jsonify({"success": success}), 200 if success else 500

@serial_bp.route("/disconnect", methods=["POST"])
def disconnect_port():
    asyncio.run(connection_manager.disconnect())
    return jsonify({"success": True}), 200

@serial_bp.route("/status", methods=["GET"])
def connection_status():
    return jsonify(connection_manager.get_status()), 200
