# test_device_data_service.py
import pytest
from unittest.mock import Mock, patch
from backend.services.device_data_service import DeviceDataService


class TestDeviceDataService:
    """Test cases for DeviceDataService class."""
    
    def setup_method(self):
        """Setup before each test method."""
        self.mock_manager = Mock()
        self.manager_patcher = patch('backend.services.device_data_service.manager', self.mock_manager)
        self.manager_patcher.start()
    
    def teardown_method(self):
        """Cleanup after each test method."""
        self.manager_patcher.stop()
    
    def test_read_serial_number_success(self):
        """Test reading serial number successfully."""
        # Arrange
        expected_serial = "12345"
        self.mock_manager.read.return_value = expected_serial
        
        # Act
        result = DeviceDataService.read_serial_number()
        
        # Assert
        assert result == expected_serial
        self.mock_manager.read.assert_called_once_with("input", 20, 1)
    
    def test_read_serial_number_failure(self):
        """Test reading serial number when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Failed to read serial number"):
            DeviceDataService.read_serial_number()
    
    def test_set_samples_amount_valid(self):
        """Test setting valid samples amount."""
        # Arrange
        samples = 100
        self.mock_manager.write.return_value = None
        
        # Act
        result = DeviceDataService.set_samples_amount(samples)
        
        # Assert
        assert result == {"success": True, "samples": samples}
        self.mock_manager.write.assert_called_once_with("holding", 20, 7, samples)
    
    def test_set_samples_amount_invalid(self):
        """Test setting invalid samples amount."""
        # Test zero
        with pytest.raises(ValueError, match="Samples amount must be a positive integer"):
            DeviceDataService.set_samples_amount(0)
        
        # Test negative
        with pytest.raises(ValueError, match="Samples amount must be a positive integer"):
            DeviceDataService.set_samples_amount(-10)
    
    def test_set_adc_samples_amount_valid(self):
        """Test setting valid ADC samples amount."""
        # Arrange
        adc_samples = 50
        self.mock_manager.write.return_value = None
        
        # Act
        result = DeviceDataService.set_adc_samples_amount(adc_samples)
        
        # Assert
        assert result == {"success": True, "adc_samples": adc_samples}
        self.mock_manager.write.assert_called_once_with("holding", 20, 16, adc_samples)
    
    def test_set_adc_samples_amount_invalid(self):
        """Test setting invalid ADC samples amount."""
        with pytest.raises(ValueError, match="ADC samples amount must be a positive integer"):
            DeviceDataService.set_adc_samples_amount(0)
    
    def test_set_shunt_res_value_valid(self):
        """Test setting valid shunt resistor value."""
        # Arrange
        shunt_res = 10.5
        self.mock_manager.write.return_value = None
        
        # Act
        result = DeviceDataService.set_shunt_res_value(shunt_res)
        
        # Assert
        assert result == {"success": True, "shunt_res": shunt_res}
        # Note: int(round(10.5)) = 10 (bankers rounding)
        self.mock_manager.write.assert_called_once_with("holding", 20, 15, 10)
    
    def test_set_shunt_res_value_rounding(self):
        """Test rounding behavior for shunt resistor value."""
        # Test different rounding scenarios
        test_cases = [
            (10.4, 10),  # 10.4 rounds down to 10
            (10.5, 10),  # 10.5 rounds to nearest even: 10
            (10.6, 11),  # 10.6 rounds up to 11
            (11.5, 12),  # 11.5 rounds to nearest even: 12
        ]
        
        for input_value, expected_rounded in test_cases:
            self.mock_manager.write.reset_mock()
            DeviceDataService.set_shunt_res_value(input_value)
            self.mock_manager.write.assert_called_with("holding", 20, 15, expected_rounded)
    
    def test_set_shunt_res_value_invalid(self):
        """Test setting invalid shunt resistor value."""
        with pytest.raises(ValueError, match="Shunt resistor value must be non-negative"):
            DeviceDataService.set_shunt_res_value(-1.0)
    
    def test_set_voltage_adecuator_gain(self):
        """Test setting voltage adecuator gain."""
        # Arrange
        gain = 2.5
        self.mock_manager.write.return_value = None
        
        # Act
        result = DeviceDataService.set_voltage_adecuator_gain(gain)
        
        # Assert
        assert result == {"success": True, "voltage_gain": gain}
        # Note: int(round(2.5)) = 2 (bankers rounding)
        self.mock_manager.write.assert_called_once_with("holding", 20, 13, 2)
    
    def test_set_voltage_adecuator_gain_invalid(self):
        """Test setting invalid voltage gain."""
        with pytest.raises(ValueError, match="Voltage adecuator gain must be non-negative"):
            DeviceDataService.set_voltage_adecuator_gain(-1.0)
    
    def test_set_current_adecuator_gain(self):
        """Test setting current adecuator gain."""
        # Arrange
        gain = 3.2
        self.mock_manager.write.return_value = None
        
        # Act
        result = DeviceDataService.set_current_adecuator_gain(gain)
        
        # Assert
        assert result == {"success": True, "current_gain": gain}
        # Note: int(round(3.2)) = 3
        self.mock_manager.write.assert_called_once_with("holding", 20, 14, 3)
    
    def test_set_current_adecuator_gain_invalid(self):
        """Test setting invalid current gain."""
        with pytest.raises(ValueError, match="Current adecuator gain must be non-negative"):
            DeviceDataService.set_current_adecuator_gain(-1.0)
    
    def test_set_phase_curr_max_distance(self):
        """Test setting phase current max distance."""
        # Arrange
        distance = 15.7
        self.mock_manager.write.return_value = None
        
        # Act
        result = DeviceDataService.set_phase_curr_max_distance(distance)
        
        # Assert
        assert result == {"success": True, "max_distance": distance}
        # Note: int(round(15.7)) = 16
        self.mock_manager.write.assert_called_once_with("holding", 20, 17, 16)
    
    def test_set_phase_curr_max_distance_invalid(self):
        """Test setting invalid phase current max distance."""
        with pytest.raises(ValueError, match="Max distance must be non-negative"):
            DeviceDataService.set_phase_curr_max_distance(-1.0)
    
    def test_set_auto_freq_sweep_width(self):
        """Test setting auto frequency sweep width."""
        # Arrange
        width = 20.3
        self.mock_manager.write.return_value = None
        
        # Act
        result = DeviceDataService.set_auto_freq_sweep_width(width)
        
        # Assert
        assert result == {"success": True, "sweep_width": width}
        # Note: int(round(20.3)) = 20
        self.mock_manager.write.assert_called_once_with("holding", 20, 18, 20)
    
    def test_set_auto_freq_sweep_width_invalid(self):
        """Test setting invalid auto frequency sweep width."""
        with pytest.raises(ValueError, match="Frequency sweep width must be non-negative"):
            DeviceDataService.set_auto_freq_sweep_width(-1.0)
    
    def test_set_closed_loop_control_enable(self):
        """Test enabling/disabling closed loop control."""
        # Test enable
        self.mock_manager.write.return_value = None
        result = DeviceDataService.set_closed_loop_control_enable(True)
        assert result == {"success": True, "closed_loop_enabled": True}
        self.mock_manager.write.assert_called_with("holding", 20, 19, 1)
        
        # Test disable
        self.mock_manager.write.reset_mock()
        result = DeviceDataService.set_closed_loop_control_enable(False)
        assert result == {"success": True, "closed_loop_enabled": False}
        self.mock_manager.write.assert_called_with("holding", 20, 19, 0)
    
    def test_set_closed_loop_control_period_valid(self):
        """Test setting valid closed loop control period."""
        # Arrange
        period = 100
        self.mock_manager.write.return_value = None
        
        # Act
        result = DeviceDataService.set_closed_loop_control_period(period)
        
        # Assert
        assert result == {"success": True, "control_period": period}
        self.mock_manager.write.assert_called_once_with("holding", 20, 20, period)
    
    def test_set_closed_loop_control_period_invalid(self):
        """Test setting invalid closed loop control period."""
        with pytest.raises(ValueError, match="Control period must be a positive integer"):
            DeviceDataService.set_closed_loop_control_period(0)
        
        with pytest.raises(ValueError, match="Control period must be a positive integer"):
            DeviceDataService.set_closed_loop_control_period(-5)
    
    def test_set_serial_number_password(self):
        """Test setting serial number password."""
        # Arrange
        password = 1234
        self.mock_manager.write.return_value = None
        
        # Act
        result = DeviceDataService.set_serial_number_password(password)
        
        # Assert
        assert result == {"success": True, "password_written": True}
        self.mock_manager.write.assert_called_once_with("holding", 20, 24, password)
    
    def test_set_serial_number_password_none(self):
        """Test setting None password."""
        with pytest.raises(ValueError, match="Password required"):
            DeviceDataService.set_serial_number_password(None)
    
    def test_write_serial_number_valid(self):
        """Test writing valid serial number."""
        # Arrange
        serial_number = "123456789"
        self.mock_manager.write.return_value = None
        
        # Act
        result = DeviceDataService.write_serial_number(serial_number)
        
        # Assert
        assert result == {"success": True, "serial_number": 123456789}
        self.mock_manager.write.assert_called_once_with("holding", 20, 23, 123456789)
    
    def test_write_serial_number_invalid(self):
        """Test writing invalid serial number."""
        with pytest.raises(ValueError, match="Serial number must be numeric"):
            DeviceDataService.write_serial_number("ABC123")
    
    def test_get_serial_number_write_status_success(self):
        """Test getting serial number write status successfully."""
        # Arrange
        expected_status = 1
        self.mock_manager.read.return_value = expected_status
        
        # Act
        result = DeviceDataService.get_serial_number_write_status()
        
        # Assert
        assert result == expected_status
        self.mock_manager.read.assert_called_once_with("holding", 20, 25)
    
    def test_get_serial_number_write_status_failure(self):
        """Test getting serial number write status when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="Failed to read serial number write status"):
            DeviceDataService.get_serial_number_write_status()
    
    # --- Test getter methods ---
    
    def test_get_samples_amount(self):
        """Test getting samples amount."""
        # Arrange
        expected_value = 100
        self.mock_manager.read.return_value = expected_value
        
        # Act
        result = DeviceDataService.get_samples_amount()
        
        # Assert
        assert result == expected_value
        self.mock_manager.read.assert_called_once_with("holding", 20, 8)
    
    def test_get_samples_amount_failure(self):
        """Test getting samples amount when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=r"Failed to read samples amount \(HR8\)"):
            DeviceDataService.get_samples_amount()
    
    def test_get_adc_samples_amount(self):
        """Test getting ADC samples amount."""
        # Arrange
        expected_value = 50
        self.mock_manager.read.return_value = expected_value
        
        # Act
        result = DeviceDataService.get_adc_samples_amount()
        
        # Assert
        assert result == expected_value
        self.mock_manager.read.assert_called_once_with("holding", 20, 16)
    
    def test_get_adc_samples_amount_failure(self):
        """Test getting ADC samples amount when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=r"Failed to read ADC samples amount \(HR16\)"):
            DeviceDataService.get_adc_samples_amount()
    
    def test_get_shunt_res_value(self):
        """Test getting shunt resistor value."""
        # Arrange
        expected_value = 10.5
        self.mock_manager.read.return_value = expected_value
        
        # Act
        result = DeviceDataService.get_shunt_res_value()
        
        # Assert
        assert result == expected_value
        self.mock_manager.read.assert_called_once_with("holding", 20, 15)
    
    def test_get_shunt_res_value_failure(self):
        """Test getting shunt resistor value when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=r"Failed to read shunt resistor value \(HR15\)"):
            DeviceDataService.get_shunt_res_value()
    
    def test_get_voltage_adecuator_gain(self):
        """Test getting voltage adecuator gain."""
        # Arrange
        expected_value = 2.5
        self.mock_manager.read.return_value = expected_value
        
        # Act
        result = DeviceDataService.get_voltage_adecuator_gain()
        
        # Assert
        assert result == expected_value
        self.mock_manager.read.assert_called_once_with("holding", 20, 13)
    
    def test_get_voltage_adecuator_gain_failure(self):
        """Test getting voltage adecuator gain when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=r"Failed to read voltage adecuator gain \(HR13\)"):
            DeviceDataService.get_voltage_adecuator_gain()
    
    def test_get_current_adecuator_gain(self):
        """Test getting current adecuator gain."""
        # Arrange
        expected_value = 3.2
        self.mock_manager.read.return_value = expected_value
        
        # Act
        result = DeviceDataService.get_current_adecuator_gain()
        
        # Assert
        assert result == expected_value
        self.mock_manager.read.assert_called_once_with("holding", 20, 14)
    
    def test_get_current_adecuator_gain_failure(self):
        """Test getting current adecuator gain when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=r"Failed to read current adecuator gain \(HR14\)"):
            DeviceDataService.get_current_adecuator_gain()
    
    def test_get_phase_curr_max_distance(self):
        """Test getting phase current max distance."""
        # Arrange
        expected_value = 15.7
        self.mock_manager.read.return_value = expected_value
        
        # Act
        result = DeviceDataService.get_phase_curr_max_distance()
        
        # Assert
        assert result == expected_value
        self.mock_manager.read.assert_called_once_with("holding", 20, 17)
    
    def test_get_phase_curr_max_distance_failure(self):
        """Test getting phase current max distance when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=r"Failed to read phase-current max distance \(HR18\)"):
            DeviceDataService.get_phase_curr_max_distance()
    
    def test_get_auto_freq_sweep_width(self):
        """Test getting auto frequency sweep width."""
        # Arrange
        expected_value = 20.3
        self.mock_manager.read.return_value = expected_value
        
        # Act
        result = DeviceDataService.get_auto_freq_sweep_width()
        
        # Assert
        assert result == expected_value
        self.mock_manager.read.assert_called_once_with("holding", 20, 18)
    
    def test_get_auto_freq_sweep_width_failure(self):
        """Test getting auto frequency sweep width when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=r"Failed to read auto frequency sweep width \(HR18\)"):
            DeviceDataService.get_auto_freq_sweep_width()
    
    def test_get_closed_loop_control_enable(self):
        """Test getting closed loop control enable state."""
        # Test enabled
        self.mock_manager.read.return_value = 1
        result = DeviceDataService.get_closed_loop_control_enable()
        assert result is True
        self.mock_manager.read.assert_called_with("holding", 20, 19)
        
        # Test disabled
        self.mock_manager.read.reset_mock()
        self.mock_manager.read.return_value = 0
        result = DeviceDataService.get_closed_loop_control_enable()
        assert result is False
        self.mock_manager.read.assert_called_with("holding", 20, 19)
    
    def test_get_closed_loop_control_enable_failure(self):
        """Test getting closed loop control enable when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=r"Failed to read closed loop control enable \(HR19\)"):
            DeviceDataService.get_closed_loop_control_enable()
    
    def test_get_closed_loop_control_period(self):
        """Test getting closed loop control period."""
        # Arrange
        expected_value = 100
        self.mock_manager.read.return_value = expected_value
        
        # Act
        result = DeviceDataService.get_closed_loop_control_period()
        
        # Assert
        assert result == expected_value
        self.mock_manager.read.assert_called_once_with("holding", 20, 20)
    
    def test_get_closed_loop_control_period_failure(self):
        """Test getting closed loop control period when None is returned."""
        # Arrange
        self.mock_manager.read.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match=r"Failed to read closed loop control period \(HR20\)"):
            DeviceDataService.get_closed_loop_control_period()