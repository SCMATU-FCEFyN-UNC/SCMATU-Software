# services/monitoring_service.py
from backend.services.connection_manager import manager
from backend.services.control_service import get_frequency
import time

# Constants
VREF = 4.485      # Reference voltage

# Cache for latest values
_last_voltage = None
_last_current = None

def get_phase(slave: int = 20) -> float:
    """Read phase difference in degrees (dummy implementation)."""
    
    manager.write("coil", 20, 3, 1)

    time.sleep(0.2)

    ready = manager.read("input", slave, 3)
    
    # Add timeout counter to prevent infinite loop
    max_attempts = 50
    attempts = 0
    
    while ready != 1 and attempts < max_attempts:
        time.sleep(0.1)
        ready = manager.read("input", slave, 3)
        attempts += 1

    # Check if we timed out
    if attempts >= max_attempts:
        raise ValueError("Phase measurement timeout - device not ready")

    phase_ns = manager.read("input", slave, 2)  

    # interpret as signed 16-bit
    if phase_ns >= 32768:
        phase_ns -= 65536

    if phase_ns is None:
        raise ValueError("Failed to read phase register")
    
    phase_s = phase_ns * 1e-9
    period = get_period()
    phase_deg = (phase_s / period) * 360.0 if period > 0 else 0

    return {"seconds": phase_s, "degrees": phase_deg}

def get_voltage(slave: int = 20) -> float:
    """Read peak voltage (V) from ADC and calibration gain."""
    global _last_voltage

    manager.write("coil", 20, 2, 1)
    
    voltage_adc = manager.read("input", slave, 4)   # ADC steps
    if voltage_adc is None:
        raise ValueError("Failed to read voltage ADC register")

    v_gain = manager.read("holding", slave, 12)      # calibration gain
    if v_gain is None or v_gain == 0:
        raise ValueError("Invalid voltage gain read")

    v_gain = v_gain / 10000.0
    atenuated_voltage = (voltage_adc / 4095.0) * VREF
    voltage = atenuated_voltage / v_gain

    _last_voltage = voltage
    return voltage

def get_current(slave: int = 20) -> float:
    """Read peak current (A) from ADC and calibration gain."""
    global _last_current

    manager.write("coil", 20, 2, 1)

    current_adc = manager.read("input", slave, 5)   # ADC steps
    if current_adc is None:
        raise ValueError("Failed to read current ADC register")

    c_gain = manager.read("holding", slave, 13)      # calibration gain
    if c_gain is None or c_gain == 0:
        raise ValueError("Invalid current gain read")

    r_shunt = manager.read("holding", slave, 14)  # shunt resistor value
    if r_shunt is None or r_shunt == 0:
        raise ValueError("Invalid shunt resistor value read")
    
    r_shunt = r_shunt / 100.0
    c_gain = c_gain / 1000.0
    
    amplified_vr = (current_adc / 4095.0) * VREF
    vr_voltage = amplified_vr / c_gain
    current = vr_voltage / r_shunt

    _last_current = current
    return current

def get_power(slave: int = 20) -> float:
    """Calculate power (VA) from latest voltage and current."""
    global _last_voltage, _last_current

    if _last_voltage is None:
        _last_voltage = get_voltage(slave)
    if _last_current is None:
        _last_current = get_current(slave)

    return _last_voltage * _last_current

def get_period(slave: int = 20) -> float:
    """Calculate period (s) from the current frequency (Hz)."""
    freq = get_frequency()
    if freq <= 0:
        raise ValueError("Invalid frequency for period calculation")
    return 1.0 / freq

def get_resonance_frequency(slave: int = 20):
    """
    Triggers resonance frequency measurement by writing coil 5,
    waits 3 seconds, then reads resonance frequency and its status.
    Uses three registers: hi (5), lo (6), status (7).
    Status codes:
        0 -> "not obtained"
        1 -> "obtained successfully"
        2 -> "failed to obtain"
    """
    # Trigger resonance frequency measurement
    manager.write("coil", slave, 5, 1)

    # Wait 3 seconds for measurement to complete
    time.sleep(3)

    # Read frequency high, low, and status registers
    hi = manager.read("input", slave, 6)
    lo = manager.read("input", slave, 7)
    status = manager.read("input", slave, 8)

    if hi is None or lo is None or status is None:
        raise ValueError("Failed to read resonance frequency registers")

    # Combine hi and lo into a single 32-bit frequency
    freq = (hi << 16) | lo

    # Translate status code
    status_texts = {
        0: "not obtained",
        1: "obtained successfully",
        2: "failed to obtain"
    }
    status_text = status_texts.get(status, f"unknown ({status})")

    return {
        "resonance_frequency": freq,
        "status_code": status,
        "status_text": status_text
    }