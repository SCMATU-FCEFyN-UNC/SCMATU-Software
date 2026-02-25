from flask import Blueprint, jsonify
import tkinter as tk
from tkinter import filedialog

folders_bp = Blueprint("folders", __name__)


@folders_bp.route('/select-folder', methods=['GET'])
def select_folder_endpoint():
    """Flask route to trigger folder selection using tkinter directly.

    Using a separate process caused the frozen executable to receive
    multiprocessing-specific argv flags (e.g. "--multiprocessing-fork"),
    which were being mis-parsed by the packaged `app` and crashed startup.
    Calling tkinter directly avoids spawning a new process and prevents
    those multiprocessing args from reaching the frozen exe.
    """
    try:
        root = tk.Tk()
        root.withdraw()  # Hide the main window
        root.attributes('-topmost', 1)  # Keep dialog on top
        folder_path = filedialog.askdirectory(title="Select folder for saving resonance sweep results")
        root.destroy()

        if folder_path:
            return jsonify({
                "status": "success",
                "folder": folder_path,
                "message": "Folder selected successfully",
            })
        else:
            return jsonify({"status": "error", "message": "No folder selected"})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Exception: {e}"})