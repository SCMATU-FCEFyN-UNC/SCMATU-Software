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
    """Get resonance frequency data with proper handling for software vs firmware results."""
    from backend.services.resonance_service import get_resonance_status, _sweep_state, _last_mode
    
    # Get data from the unified status function
    status_data = get_resonance_status(slave)
    
    status_code = status_data.get("status_code", 0)
    status_text = status_data.get("status_text", "not obtained")
    
    # Check if we have valid software results (status_code 1 or 4)
    has_valid_software_results = (
        _last_mode == "software" and 
        (status_code == 1 or status_code == 4) and
        status_data.get("best_overall") is not None
    )
    
    # If we have valid software results, use them
    if has_valid_software_results:
        # Convert software results to expected format
        def convert_software_result(sw_result):
            if not sw_result:
                return None
            
            # Handle both field naming conventions
            current_value = sw_result.get("current_a", sw_result.get("current"))
            
            return {
                "frequency": sw_result.get("frequency"),
                "phase_ns": sw_result.get("phase_ns"),
                "phase_deg": sw_result.get("phase_deg"),
                "current": current_value,
            }
        
        result = {
            "status_code": status_code,
            "status_text": status_text,
            "best_overall": convert_software_result(status_data.get("best_overall")),
            "best_phase": convert_software_result(status_data.get("best_phase")),
            "best_current": convert_software_result(status_data.get("best_current")),
        }
        return result
    
    # Otherwise, we're in firmware mode or no software results
    # Read the status register to see if firmware thinks it has results
    firmware_status = manager.read("input", slave, 9)
    
    # Helper to check if a value looks like garbage/default
    def is_valid_phase_ns(phase_ns):
        if phase_ns is None:
            return False
        # Phase should typically be within ±period range
        # 707.7° converted to ns would be unrealistic
        # Check for absurdly large values
        return abs(phase_ns) < 1e9  # Less than 1 second in ns
    
    def is_valid_current_adc(current_adc):
        if current_adc is None:
            return False
        # Current ADC should be 0-4095
        return 0 <= current_adc <= 4095
    
    # Helper to convert ADC current to Amps
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
        
        VREF = 4.485
        amplified_vr = (adc_value / 4095.0) * VREF
        vr_voltage = amplified_vr / c_gain
        current_a = vr_voltage / r_shunt
        
        return current_a
    
    # Handle different firmware status codes
    if firmware_status == 1:  # Firmware measurement completed successfully
        # Read all the registers
        overall_hi = manager.read("input", slave, 10)
        overall_lo = manager.read("input", slave, 11)
        overall_phase_raw = manager.read("input", slave, 12)
        overall_current_raw = manager.read("input", slave, 13)
        
        phase_hi = manager.read("input", slave, 14)
        phase_lo = manager.read("input", slave, 15)
        phase_phase_raw = manager.read("input", slave, 16)
        phase_current_raw = manager.read("input", slave, 17)
        
        current_hi = manager.read("input", slave, 18)
        current_lo = manager.read("input", slave, 19)
        current_phase_raw = manager.read("input", slave, 20)
        current_current_raw = manager.read("input", slave, 21)
        
        # Check if we have the overall frequency at least
        has_overall_freq = (overall_hi is not None and overall_lo is not None)
        
        if has_overall_freq:
            overall_freq = (overall_hi << 16) | overall_lo
            
            # Helper to process one frequency result
            def process_frequency(freq_hi, freq_lo, phase_raw, current_raw):
                if freq_hi is None or freq_lo is None:
                    return None
                    
                freq = (freq_hi << 16) | freq_lo
                
                # Check if phase and current look valid
                phase_ns = None
                phase_deg = None
                current_a = None
                
                if is_valid_phase_ns(phase_raw) and is_valid_current_adc(current_raw):
                    # Convert signed phase
                    if phase_raw >= 32768:
                        phase_raw -= 65536
                    phase_ns = float(phase_raw)
                    
                    # Convert phase to degrees
                    if freq > 0:
                        period_ns = 1e9 / freq
                        phase_deg = (phase_ns / period_ns) * 360.0
                    
                    # Convert current ADC to Amps
                    current_a = adc_to_current(current_raw)
                
                return {
                    "frequency": freq,
                    "phase_ns": phase_ns,
                    "phase_deg": phase_deg,
                    "current": current_a,
                }
            
            # Process all three frequencies
            best_overall = process_frequency(
                overall_hi, overall_lo, overall_phase_raw, overall_current_raw
            )
            best_phase = process_frequency(
                phase_hi, phase_lo, phase_phase_raw, phase_current_raw
            )
            best_current = process_frequency(
                current_hi, current_lo, current_phase_raw, current_current_raw
            )
            
            # If we got at least the overall frequency with valid phase/current, return full results
            if best_overall and best_overall.get("phase_ns") is not None and best_overall.get("current") is not None:
                result = {
                    "status_code": 1,
                    "status_text": "obtained successfully",
                    "best_overall": best_overall,
                    "best_phase": best_phase if best_phase and best_phase.get("phase_ns") is not None else None,
                    "best_current": best_current if best_current and best_current.get("phase_ns") is not None else None,
                }
                return result
            else:
                # We have a frequency but invalid phase/current (software-only result or garbage data)
                # Return null for all results
                result = {
                    "status_code": 0,
                    "status_text": "not obtained",
                    "best_overall": None,
                    "best_phase": None,
                    "best_current": None,
                }
                return result
    
    elif firmware_status == 4:  # Software measurement wrote only frequency
        # Read just the overall frequency registers (10-11)
        overall_hi = manager.read("input", slave, 10)
        overall_lo = manager.read("input", slave, 11)
        
        if overall_hi is not None and overall_lo is not None:
            overall_freq = (overall_hi << 16) | overall_lo
            
            # Return only the frequency with null phase/current
            result = {
                "status_code": 4,
                "status_text": "software measurement (frequency only)",
                "best_overall": {
                    "frequency": overall_freq,
                    "phase_ns": None,
                    "phase_deg": None,
                    "current": None,
                },
                "best_phase": None,
                "best_current": None,
            }
            return result
    
    # Default case: no valid results at all (status 0, 2, 3, or other)
    result = {
        "status_code": 0,
        "status_text": "not obtained",
        "best_overall": None,
        "best_phase": None,
        "best_current": None,
    }
    
    return result