import os
import sys
import argparse
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
    # Check if this is a multiprocessing fork (PyInstaller specific)
    if '--multiprocessing-fork' in sys.argv:
        # This is a child process for multiprocessing, don't start the server
        # Just import and let the multiprocessing code run
        from multiprocessing import process
        process.current_process()._inheriting = True
        # Let the multiprocessing module handle this
        sys.exit(0)
    
    print(f"Flask Python PID: {os.getpid()}", flush=True)

    # Parse arguments properly
    parser = argparse.ArgumentParser(description='Start the Flask server')
    parser.add_argument('port', type=int, nargs='?', default=5000, 
                       help='Port to listen on (default: 5000)')
    
    # Parse only the first argument as port, ignore others
    args = parser.parse_args(sys.argv[1:2])  # Only parse the first argument
    
    port = args.port
    print(f"Starting server on http://127.0.0.1:{port}", flush=True)

    serve(app, host="127.0.0.1", port=port)