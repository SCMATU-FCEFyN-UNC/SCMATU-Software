import os
import sys
from flask import Flask
from flask_cors import CORS
from waitress import serve
from backend.routes import register_routes


def create_app():
    """Factory function to create and configure the Flask app."""
    app = Flask(__name__)
    CORS(app, origins=["http://localhost:5123", "null", "file://", "app://-"]) 
    register_routes(app)  # Attach all route blueprints
    return app


# This is the WSGI entry point
app = create_app()

if __name__ == "__main__":
    print(f"Flask Python PID: {os.getpid()}", flush=True)

    # Use CLI argument for port (dynamic port provided by main.ts)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000

    print(f"Starting server on http://127.0.0.1:{port}", flush=True)

    serve(app, host="127.0.0.1", port=port)