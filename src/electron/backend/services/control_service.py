# services/control_service.py
from backend.services.connection_manager import manager

def set_frequency(frequency_hz: int):
    """
    Write a 32-bit frequency value (Hz) to holding registers 2 (hi) + 3 (lo).
    """
    if frequency_hz < 0:
        raise ValueError("Frequency must be a positive integer")
    
    freq_hi = (frequency_hz >> 16) & 0xFFFF
    freq_lo = frequency_hz & 0xFFFF

    manager.write("holding", 20, 2, freq_hi)
    manager.write("holding", 20, 3, freq_lo)
    manager.write("coil", 20, 4, 1)

    return {"success": True, "frequency": frequency_hz}

def get_frequency() -> int:
    """
    Read a 32-bit frequency value (Hz) from holding registers 2 (hi) + 3 (lo).
    """    
    hi = manager.read("holding", 20, 2)
    lo = manager.read("holding", 20, 3)

    if hi is None or lo is None:
        raise ValueError("Failed to read frequency registers")

    frequency_hz = (hi << 16) | lo
    return frequency_hz

def set_power_level(power_percent: int):
    if not (0 <= power_percent <= 100):
        raise ValueError("Power level must be 0–100")
    manager.write("holding", 20, 4, power_percent)
    return {"success": True, "power_percent": power_percent}

def set_transducer(enabled: bool):
    """
    Enable or disable the transducer using coil 0.
    enabled=True  -> write 1 to coil 0
    enabled=False -> write 0 to coil 0
    """
    val = 1 if enabled else 0
    manager.write("coil", 20, 0, val)
    return {"success": True, "enabled": bool(enabled)}

def get_transducer() -> bool:
    """
    Read the transducer enabled state from coil 0.
    Returns True if enabled, False if disabled.
    """
    state = manager.read("coil", 20, 0)
    if state is None:
        raise ValueError("Failed to read transducer coil state")
    return bool(state)

def set_on_time(on_time_ms: int):
    """
    Set the transducer on time (ms) in holding register 5.
    """
    if on_time_ms < 0:
        raise ValueError("On time must be non-negative")
    manager.write("holding", 20, 5, on_time_ms)
    return {"success": True, "on_time": on_time_ms}

def get_on_time() -> int:
    """
    Read the transducer on time (ms) from holding register 5.
    """
    val = manager.read("holding", 20, 5)
    if val is None:
        raise ValueError("Failed to read on_time register")
    return val

def set_off_time(off_time_ms: int):
    """
    Set the transducer off time (ms) in holding register 6.
    """
    if off_time_ms < 0:
        raise ValueError("Off time must be non-negative")
    manager.write("holding", 20, 6, off_time_ms)
    return {"success": True, "off_time": off_time_ms}

def get_off_time() -> int:
    """
    Read the transducer off time (ms) from holding register 6.
    """
    val = manager.read("holding", 20, 6)
    if val is None:
        raise ValueError("Failed to read off_time register")
    return val
