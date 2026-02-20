from flask import Blueprint, jsonify
import os
import tkinter as tk
from tkinter import filedialog
from multiprocessing import Process, Queue
import time

folders_bp = Blueprint("folders", __name__)

def select_folder(queue, title="Select folder"):
    """Function to select a folder using tkinter"""
    try:
        root = tk.Tk()
        root.withdraw()  # Hide the main window
        root.attributes('-topmost', 1)  # Set the window to always stay on top
        folder_path = filedialog.askdirectory(title=title)
        queue.put(folder_path if folder_path else None)
    except Exception as e:
        queue.put(None)

def run_file_dialog(title="Select folder"):
    """Run the file dialog in a separate process and return the result"""
    queue = Queue()
    process = Process(target=select_folder, args=(queue, title))
    process.start()
    process.join(timeout=30)  # Timeout after 30 seconds
    
    if process.is_alive():
        process.terminate()
        process.join()
        return None
    
    try:
        folder_path = queue.get_nowait()
        return folder_path
    except:
        return None

@folders_bp.route('/select-folder', methods=['GET'])
def select_folder_endpoint():
    """Flask route to trigger folder selection"""
    folder_path = run_file_dialog("Select folder for saving resonance sweep results")
    if folder_path:
        return jsonify({
            "status": "success", 
            "folder": folder_path,
            "message": "Folder selected successfully"
        })
    else:
        return jsonify({
            "status": "error", 
            "message": "No folder selected or selection timed out"
        })