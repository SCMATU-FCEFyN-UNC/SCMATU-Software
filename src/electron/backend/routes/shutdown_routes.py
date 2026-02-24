from flask import Blueprint, request, jsonify
import os
import signal

shutdown_bp = Blueprint("shutdown", __name__)

@shutdown_bp.route('/shutdown', methods=['POST'])
def shutdown():
    # This sends a signal to the process itself to terminate
    #print("[SHUTDOWN] Received shutdown request", flush=True)  
    os.kill(os.getpid(), signal.SIGINT)
    return 'Server shutting down...'