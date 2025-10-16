from backend.services.connection_manager import manager

def get_frequency_range_start():
    start_hz = manager.read("holding", 20, 10)
    if start_hz is None:
        raise ValueError("Failed to read frequency range start register")
    return {"success": True, "frequency_range_start": start_hz}

def set_frequency_range_start(start_hz: int):
    if start_hz < 0:
        raise ValueError("Start frequency must be non-negative")
    manager.write("holding", 20, 10, start_hz)
    return {"success": True, "frequency_range_start": start_hz}

def get_frequency_range_end():
    end_hz = manager.read("holding", 20, 11)
    if end_hz is None:
        raise ValueError("Failed to read frequency range end register")
    return {"success": True, "frequency_range_end": end_hz}

def set_frequency_range_end(end_hz: int):
    if end_hz <= 0:
        raise ValueError("End frequency must be positive")
    manager.write("holding", 20, 11, end_hz)
    return {"success": True, "frequency_range_end": end_hz}

def get_frequency_step():
    step_hz = manager.read("holding", 20, 9)
    if step_hz is None:
        raise ValueError("Failed to read frequency step register")
    return {"success": True, "frequency_step": step_hz}

def set_frequency_step(step_hz: int):
    if step_hz <= 0:
        raise ValueError("Step must be positive")
    manager.write("holding", 20, 9, step_hz)
    return {"success": True, "frequency_step": step_hz}

def start_resonance_measurement(slave: int = 20):
    """Initiate resonance frequency measurement."""
    manager.write("coil", slave, 5, 1)
    return {"success": True, "message": "Resonance measurement started"}

def get_resonance_status(slave: int = 20):
    """
    Reads only the resonance frequency measurement status register.
    Status codes:
        0 -> "not obtained"
        1 -> "obtained successfully"
        2 -> "failed to obtain"
        3 -> "measurement in progress"
    """
    status = manager.read("input", slave, 8)

    if status is None:
        raise ValueError("Failed to read resonance frequency status register")

    status_texts = {
        0: "not obtained",
        1: "obtained successfully",
        2: "failed to obtain",
        3: "measurement in progress",
    }

    status_text = status_texts.get(status, f"unknown ({status})")

    return {
        "success": True,
        "status_code": status,
        "status_text": status_text,
    }