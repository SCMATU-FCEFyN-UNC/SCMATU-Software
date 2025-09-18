from flask import Blueprint, jsonify

# Create a Blueprint for this group of routes
hello_bp = Blueprint("hello", __name__)

@hello_bp.route("/hello", methods=["GET"])
def hello():
    """
    Simple endpoint to confirm that the backend is running.
    Returns a JSON response with a message.
    """
    return jsonify({"message": "Hello from Python backend!"}), 200

@hello_bp.route("/", methods=["GET"])
def home():
    """Simple health check endpoint (for testing only)."""
    return "Hello from Waitress!"