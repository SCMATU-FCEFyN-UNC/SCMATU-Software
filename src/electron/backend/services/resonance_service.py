from backend.services.connection_manager import manager

def get_frequency_range_start():
    
    start_hi = manager.read("holding", 20, 10)
    start_lo = manager.read("holding", 20, 11)

    if start_hi is None or start_lo is None:
        raise ValueError("Failed to read frequency range start registers")

    start_hz = (start_hi << 16) | start_lo
    
    return {"success": True, "frequency_range_start": start_hz}

def set_frequency_range_start(start_hz: int):
    if start_hz < 0:
        raise ValueError("Start frequency must be non-negative")
    
    start_freq_hi = (start_hz >> 16) & 0xFFFF
    start_freq_lo = start_hz & 0xFFFF

    manager.write("holding", 20, 10, start_freq_hi)
    manager.write("holding", 20, 11, start_freq_lo)
    return {"success": True, "frequency_range_start": start_hz}

def get_frequency_range_end():
    end_hi = manager.read("holding", 20, 12)
    end_lo = manager.read("holding", 20, 13)

    if end_hi is None or end_lo is None:
        raise ValueError("Failed to read frequency range start registers")

    end_hz = (end_hi << 16) | end_lo

    return {"success": True, "frequency_range_end": end_hz}

def set_frequency_range_end(end_hz: int):
    if end_hz <= 0:
        raise ValueError("End frequency must be positive")
    
    end_freq_hi = (end_hz >> 16) & 0xFFFF
    end_freq_lo = end_hz & 0xFFFF

    manager.write("holding", 20, 12, end_freq_hi)
    manager.write("holding", 20, 13, end_freq_lo)
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
    print("Resonance measurement started.", flush=True)
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
    status = manager.read("input", slave, 9)

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