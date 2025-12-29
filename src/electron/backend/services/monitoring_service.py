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
    
    if phase_ns is None:
        raise ValueError("Failed to read phase register")

    # Now safe to compare since we checked for None
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

    # Wait until voltage measurement ready (input register 6 == 1)
    time.sleep(0.2)
    ready = manager.read("input", slave, 6)
    max_attempts = 50
    attempts = 0
    while ready != 1 and attempts < max_attempts:
        time.sleep(0.1)
        ready = manager.read("input", slave, 6)
        attempts += 1

    if attempts >= max_attempts:
        raise ValueError("Voltage measurement timeout - device not ready")

    if ready is None:
        raise ValueError("Failed to read voltage ready register")

    voltage_adc = manager.read("input", slave, 4)   # ADC steps
    if voltage_adc is None:
        raise ValueError("Failed to read voltage ADC register")

    v_gain = manager.read("holding", slave, 13)      # calibration gain
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

    # Wait until current measurement ready (input register 7 == 1)
    time.sleep(0.2)
    ready = manager.read("input", slave, 7)
    max_attempts = 50
    attempts = 0
    while ready != 1 and attempts < max_attempts:
        time.sleep(0.1)
        ready = manager.read("input", slave, 7)
        attempts += 1

    if attempts >= max_attempts:
        raise ValueError("Current measurement timeout - device not ready")

    if ready is None:
        raise ValueError("Failed to read current ready register")

    current_adc = manager.read("input", slave, 5)   # ADC steps
    if current_adc is None:
        raise ValueError("Failed to read current ADC register")

    c_gain = manager.read("holding", slave, 14)      # calibration gain
    if c_gain is None or c_gain == 0:
        raise ValueError("Invalid current gain read")

    r_shunt = manager.read("holding", slave, 15)  # shunt resistor value
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
    
    # Always fetch fresh voltage and current when power is requested
    _last_voltage = get_voltage(slave)
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
    Reads the resonance frequency measurements with their associated metrics.
    
    Returns three frequency measurements:
    1. Best Overall Frequency (registers 10-13)
       - hi: 10, lo: 11, phase: 12, current: 13
    2. Best Phase Frequency (registers 14-17)
       - hi: 14, lo: 15, phase: 16, current: 17
    3. Best Current Frequency (registers 18-21)
       - hi: 18, lo: 19, phase: 20, current: 21

    Status codes:
        0 -> "not obtained"
        1 -> "obtained successfully"
        2 -> "failed to obtain"
        3 -> "measurement in progress"
    """
    # Read the status register first
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

    # Initialize result structure
    result = {
        "status_code": status,
        "status_text": status_text,
        "best_overall": None,
        "best_phase": None,
        "best_current": None,
    }

    # Only read frequency data if measurement succeeded
    if status == 1:
        # Helper function to convert signed phase from register
        def decode_signed_phase(phase_raw):
            if phase_raw is None:
                return None
            if phase_raw >= 32768:
                phase_raw -= 65536
            return float(phase_raw)
        
        # Helper function to convert phase in nanoseconds to degrees
        def ns_to_deg(phase_ns, frequency_hz):
            if phase_ns is None or frequency_hz is None or frequency_hz <= 0:
                return None
            period_ns = 1e9 / frequency_hz
            phase_deg = (phase_ns / period_ns) * 360.0
            return phase_deg
        
        # Helper function to convert ADC current to Amps
        def adc_to_current(adc_value):
            if adc_value is None:
                return None
            
            # Read calibration values
            c_gain_raw = manager.read("holding", slave, 14)
            r_shunt_raw = manager.read("holding", slave, 15)
            
            if c_gain_raw is None or r_shunt_raw is None:
                return None
            
            c_gain = c_gain_raw / 1000.0
            r_shunt = r_shunt_raw / 100.0
            
            if c_gain == 0 or r_shunt == 0:
                return None
            
            amplified_vr = (adc_value / 4095.0) * VREF
            vr_voltage = amplified_vr / c_gain
            current_a = vr_voltage / r_shunt
            
            return current_a

        # Read and process Best Overall Frequency
        best_overall_hi = manager.read("input", slave, 10)
        best_overall_lo = manager.read("input", slave, 11)
        best_overall_phase_raw = manager.read("input", slave, 12)
        best_overall_current_raw = manager.read("input", slave, 13)

        if not any(val is None for val in [best_overall_hi, best_overall_lo, best_overall_phase_raw, best_overall_current_raw]):
            overall_freq = (best_overall_hi << 16) | best_overall_lo
            phase_ns = decode_signed_phase(best_overall_phase_raw)
            phase_deg = ns_to_deg(phase_ns, overall_freq)
            current_a = adc_to_current(best_overall_current_raw)
            
            result["best_overall"] = {
                "frequency": overall_freq,
                "phase_ns": phase_ns,
                "phase_deg": phase_deg,
                "current": current_a,
            }

        # Read and process Best Phase Frequency
        best_phase_hi = manager.read("input", slave, 14)
        best_phase_lo = manager.read("input", slave, 15)
        best_phase_phase_raw = manager.read("input", slave, 16)
        best_phase_current_raw = manager.read("input", slave, 17)

        if not any(val is None for val in [best_phase_hi, best_phase_lo, best_phase_phase_raw, best_phase_current_raw]):
            phase_freq = (best_phase_hi << 16) | best_phase_lo
            phase_ns = decode_signed_phase(best_phase_phase_raw)
            phase_deg = ns_to_deg(phase_ns, phase_freq)
            current_a = adc_to_current(best_phase_current_raw)
            
            result["best_phase"] = {
                "frequency": phase_freq,
                "phase_ns": phase_ns,
                "phase_deg": phase_deg,
                "current": current_a,
            }

        # Read and process Best Current Frequency
        best_current_hi = manager.read("input", slave, 18)
        best_current_lo = manager.read("input", slave, 19)
        best_current_phase_raw = manager.read("input", slave, 20)
        best_current_current_raw = manager.read("input", slave, 21)

        if not any(val is None for val in [best_current_hi, best_current_lo, best_current_phase_raw, best_current_current_raw]):
            current_freq = (best_current_hi << 16) | best_current_lo
            phase_ns = decode_signed_phase(best_current_phase_raw)
            phase_deg = ns_to_deg(phase_ns, current_freq)
            current_a = adc_to_current(best_current_current_raw)
            
            result["best_current"] = {
                "frequency": current_freq,
                "phase_ns": phase_ns,
                "phase_deg": phase_deg,
                "current": current_a,
            }

    return result