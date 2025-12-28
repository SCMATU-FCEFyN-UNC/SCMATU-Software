from backend.services.connection_manager import manager

class DeviceDataService:
    @staticmethod
    def read_serial_number() -> str:
        """
        Read the serial number from input register 1.
        """
        serial_number = manager.read("input", 20, 1)
        if serial_number is None:
            raise ValueError("Failed to read serial number")
        return serial_number

    @staticmethod
    def set_samples_amount(samples: int):
        """
        Set the number of samples for each phase measurement in holding register 7.
        """
        if samples < 1:
            raise ValueError("Samples amount must be a positive integer")
        manager.write("holding", 20, 7, int(samples))
        return {"success": True, "samples": samples}

    @staticmethod
    def set_adc_samples_amount(adc_samples: int):
        """
        Set the ADC samples amount in holding register 16.
        """
        if adc_samples < 1:
            raise ValueError("ADC samples amount must be a positive integer")
        manager.write("holding", 20, 16, int(adc_samples))
        return {"success": True, "adc_samples": adc_samples}

    @staticmethod
    def set_shunt_res_value(shunt_res: float):
        """
        Set the shunt resistor value in holding register 15.
        """
        if shunt_res < 0:
            raise ValueError("Shunt resistor value must be non-negative")
        # convert to int before writing (apply scaling here if needed)
        manager.write("holding", 20, 15, int(round(shunt_res)))
        return {"success": True, "shunt_res": shunt_res}

    @staticmethod
    def set_voltage_adecuator_gain(gain: float):
        """
        Set the voltage adecuator gain in holding register 13.
        """
        if gain < 0:
            raise ValueError("Voltage adecuator gain must be non-negative")
        manager.write("holding", 20, 13, int(round(gain)))
        return {"success": True, "voltage_gain": gain}

    @staticmethod
    def set_current_adecuator_gain(gain: float):
        """
        Set the current adecuator gain in holding register 14.
        """
        if gain < 0:
            raise ValueError("Current adecuator gain must be non-negative")
        manager.write("holding", 20, 14, int(round(gain)))
        return {"success": True, "current_gain": gain}

    @staticmethod
    def set_phase_curr_max_distance(distance: float):
        """
        Set the maximum distance between the best current frequency and the best phase frequency in holding register 18
    7.
        """
        if distance < 0:
            raise ValueError("Max distance must be non-negative")
        manager.write("holding", 20, 17, int(round(distance)))
        return {"success": True, "max_distance": distance}

    @staticmethod
    def set_auto_freq_sweep_width(width: float):
        """
        Set the auto frequency sweep width in holding register 18.
        """
        if width < 0:
            raise ValueError("Frequency sweep width must be non-negative")
        manager.write("holding", 20, 18, int(round(width)))
        return {"success": True, "sweep_width": width}

    @staticmethod
    def set_closed_loop_control_enable(enabled: bool):
        """
        Enable or disable closed loop control in holding register 19.
        """
        val = 1 if enabled else 0
        manager.write("holding", 20, 19, int(val))
        return {"success": True, "closed_loop_enabled": enabled}

    @staticmethod
    def set_closed_loop_control_period(period: int):
        """
        Set the closed loop control period in holding register 20.
        """
        if period <= 0:
            raise ValueError("Control period must be a positive integer")
        manager.write("holding", 20, 20, int(period))
        return {"success": True, "control_period": period}

    @staticmethod
    def set_serial_number_password(password: int):
        """
        Write the password to holding register 22 (HR22).
        """
        if password is None:
            raise ValueError("Password required")
        manager.write("holding", 20, 24, int(password))
        return {"success": True, "password_written": True}

    @staticmethod
    def write_serial_number(serial_number: str):
        """
        Write the serial number to holding register 21.
        Expects a numeric string (validation done on frontend).
        """
        # Convert to int (frontend already validated it's numeric and 1-20 chars)
        try:
            serial_int = int(serial_number)
        except ValueError:
            raise ValueError("Serial number must be numeric")
        
        manager.write("holding", 20, 23, serial_int)
        
        return {"success": True, "serial_number": serial_int}

    @staticmethod
    def get_serial_number_write_status() -> int:
        """
        Get the status of the last serial number write attempt from holding register 23.
        """
        status = manager.read("holding", 20, 25)
        if status is None:
            raise ValueError("Failed to read serial number write status")
        return int(status)

    # --- Added getters for registers that previously only had setters ---

    @staticmethod
    def get_samples_amount() -> int:
        """Read samples amount from holding register 7."""
        val = manager.read("holding", 20, 8)
        if val is None:
            raise ValueError("Failed to read samples amount (HR8)")
        return int(val)

    @staticmethod
    def get_adc_samples_amount() -> int:
        """Read ADC samples amount from holding register 16."""
        val = manager.read("holding", 20, 16)
        if val is None:
            raise ValueError("Failed to read ADC samples amount (HR16)")
        return int(val)

    @staticmethod
    def get_shunt_res_value() -> float:
        """Read shunt resistor value from holding register 15."""
        val = manager.read("holding", 20, 15)
        if val is None:
            raise ValueError("Failed to read shunt resistor value (HR15)")
        return float(val)

    @staticmethod
    def get_voltage_adecuator_gain() -> float:
        """Read voltage adecuator gain from holding register 13."""
        val = manager.read("holding", 20, 13)
        if val is None:
            raise ValueError("Failed to read voltage adecuator gain (HR13)")
        return float(val)

    @staticmethod
    def get_current_adecuator_gain() -> float:
        """Read current adecuator gain from holding register 14."""
        val = manager.read("holding", 20, 14)
        if val is None:
            raise ValueError("Failed to read current adecuator gain (HR14)")
        return float(val)

    @staticmethod
    def get_phase_curr_max_distance() -> float:
        """Read phase-current max distance from holding register 17."""
        val = manager.read("holding", 20, 17)
        if val is None:
            raise ValueError("Failed to read phase-current max distance (HR18)")
        return float(val)

    @staticmethod
    def get_auto_freq_sweep_width() -> float:
        """Read auto frequency sweep width from holding register 18."""
        val = manager.read("holding", 20, 18)
        if val is None:
            raise ValueError("Failed to read auto frequency sweep width (HR18)")
        return float(val)

    @staticmethod
    def get_closed_loop_control_enable() -> bool:
        """Read closed loop control enable state from holding register 19."""
        val = manager.read("holding", 20, 19)
        if val is None:
            raise ValueError("Failed to read closed loop control enable (HR19)")
        return bool(int(val))

    @staticmethod
    def get_closed_loop_control_period() -> int:
        """Read closed loop control period from holding register 20."""
        val = manager.read("holding", 20, 20)
        if val is None:
            raise ValueError("Failed to read closed loop control period (HR20)")
        return int(val)