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

def set_sample_count(sample_count: int):
    if sample_count <= 0:
        raise ValueError("Sample count must be positive")
    manager.write("holding", 20, 5, sample_count)
    return {"success": True, "samples": sample_count}
