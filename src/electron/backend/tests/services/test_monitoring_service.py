import pytest
from unittest.mock import patch
from backend.services import monitoring_service

class TestMonitoringService:
    """Test suite for monitoring_service.py"""

    def test_get_phase_success(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read, \
             patch("backend.services.monitoring_service.get_period") as mock_period:
            
            # Mock the sequence of reads: first ready check returns 1, then phase_ns
            mock_read.side_effect = [1, 4500]
            mock_period.return_value = 0.02  # 50Hz period
            
            result = monitoring_service.get_phase(20)
            
            # Calculate expected values
            expected_seconds = 4500 * 1e-9
            expected_degrees = (expected_seconds / 0.02) * 360.0
            
            assert result["seconds"] == expected_seconds
            assert result["degrees"] == expected_degrees

    def test_get_phase_waits_until_ready(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
            patch("backend.services.monitoring_service.manager.read") as mock_read, \
            patch("backend.services.monitoring_service.get_period") as mock_period:
            
            # Mock: first ready check returns 0, then 0, then 1 (within timeout), then phase_ns
            mock_read.side_effect = [0, 0, 1, 4500]
            mock_period.return_value = 0.02
            
            result = monitoring_service.get_phase(20)
            
            expected_seconds = 4500 * 1e-9
            expected_degrees = (expected_seconds / 0.02) * 360.0
            
            assert result["seconds"] == expected_seconds
            assert result["degrees"] == expected_degrees
            assert mock_read.call_count == 4

    def test_get_phase_timeout(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
            patch("backend.services.monitoring_service.manager.read") as mock_read:
            
            # Mock all read calls to return 0 (not ready) to trigger timeout
            mock_read.return_value = 0
            with pytest.raises(ValueError, match="Phase measurement timeout - device not ready"):
                monitoring_service.get_phase(20)

    def test_get_phase_read_failure(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
            patch("backend.services.monitoring_service.manager.read") as mock_read:
            
            # Mock ready check passes but phase_ns read returns None
            mock_read.side_effect = [1, None]
            with pytest.raises(ValueError, match="Failed to read phase register"):
                monitoring_service.get_phase(20)

    def test_get_phase_signed_conversion_positive(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read, \
             patch("backend.services.monitoring_service.get_period") as mock_period:
            
            mock_read.side_effect = [1, 10000]  # phase_ns < 32768
            mock_period.return_value = 0.02
            
            result = monitoring_service.get_phase(20)
            
            expected_seconds = 10000 * 1e-9
            expected_degrees = (expected_seconds / 0.02) * 360.0
            
            assert result["seconds"] == expected_seconds
            assert result["degrees"] == expected_degrees

    def test_get_phase_signed_conversion_negative(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read, \
             patch("backend.services.monitoring_service.get_period") as mock_period:
            
            mock_read.side_effect = [1, 40000]  # phase_ns >= 32768
            mock_period.return_value = 0.02
            
            result = monitoring_service.get_phase(20)
            
            # Should be negative after conversion
            expected_seconds = (40000 - 65536) * 1e-9
            expected_degrees = (expected_seconds / 0.02) * 360.0
            
            assert result["seconds"] == expected_seconds
            assert result["degrees"] == expected_degrees

    def test_get_phase_zero_period(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read, \
             patch("backend.services.monitoring_service.get_period") as mock_period:
            
            mock_read.side_effect = [1, 4500]
            mock_period.return_value = 0  # Zero period
            
            result = monitoring_service.get_phase(20)
            
            expected_seconds = 4500 * 1e-9
            # Degrees should be 0 when period is 0
            assert result["seconds"] == expected_seconds
            assert result["degrees"] == 0

    def test_get_voltage_success(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            mock_read.side_effect = [2048, 10000]  # voltage_adc, v_gain
            result = monitoring_service.get_voltage(20)
            
            # Verify calculations
            v_gain = 10000 / 10000.0  # v_gain / 10000.0
            atenuated_voltage = (2048 / 4095.0) * 4.485
            expected_voltage = atenuated_voltage / v_gain
            assert result == expected_voltage
            assert monitoring_service._last_voltage == expected_voltage

    def test_get_voltage_adc_read_failure(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            mock_read.side_effect = [None, 10000]  # voltage_adc fails
            with pytest.raises(ValueError, match="Failed to read voltage ADC register"):
                monitoring_service.get_voltage(20)

    def test_get_voltage_gain_read_failure(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            mock_read.side_effect = [2048, None]  # v_gain fails
            with pytest.raises(ValueError, match="Invalid voltage gain read"):
                monitoring_service.get_voltage(20)

    def test_get_voltage_zero_gain(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            mock_read.side_effect = [2048, 0]  # v_gain is zero
            with pytest.raises(ValueError, match="Invalid voltage gain read"):
                monitoring_service.get_voltage(20)

    def test_get_current_success(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            # current_adc, c_gain, r_shunt
            mock_read.side_effect = [2048, 500, 1010]  
            result = monitoring_service.get_current(20)
            
            # Verify calculations
            r_shunt = 1010 / 100.0  # r_shunt / 100.0
            c_gain = 500 / 1000.0   # c_gain / 1000.0
            amplified_vr = (2048 / 4095.0) * 4.485
            vr_voltage = amplified_vr / c_gain
            expected_current = vr_voltage / r_shunt
            assert result == expected_current
            assert monitoring_service._last_current == expected_current

    def test_get_current_adc_read_failure(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            mock_read.side_effect = [None, 500, 1010]  # current_adc fails
            with pytest.raises(ValueError, match="Failed to read current ADC register"):
                monitoring_service.get_current(20)

    def test_get_current_gain_read_failure(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            mock_read.side_effect = [2048, None, 1010]  # c_gain fails
            with pytest.raises(ValueError, match="Invalid current gain read"):
                monitoring_service.get_current(20)

    def test_get_current_zero_gain(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            mock_read.side_effect = [2048, 0, 1010]  # c_gain is zero
            with pytest.raises(ValueError, match="Invalid current gain read"):
                monitoring_service.get_current(20)

    def test_get_current_shunt_read_failure(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            mock_read.side_effect = [2048, 500, None]  # r_shunt fails
            with pytest.raises(ValueError, match="Invalid shunt resistor value read"):
                monitoring_service.get_current(20)

    def test_get_current_zero_shunt(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            mock_read.side_effect = [2048, 500, 0]  # r_shunt is zero
            with pytest.raises(ValueError, match="Invalid shunt resistor value read"):
                monitoring_service.get_current(20)

    def test_get_power_with_cached_values(self):
        # Set cached values
        monitoring_service._last_voltage = 220.0
        monitoring_service._last_current = 5.0
        
        result = monitoring_service.get_power(20)
        assert result == 1100.0  # 220 * 5

    def test_get_power_without_cached_voltage(self):
        monitoring_service._last_voltage = None
        monitoring_service._last_current = 5.0
        
        with patch("backend.services.monitoring_service.get_voltage", return_value=220.0) as mock_voltage:
            result = monitoring_service.get_power(20)
            
            assert result == 1100.0
            mock_voltage.assert_called_once_with(20)

    def test_get_power_without_cached_current(self):
        monitoring_service._last_voltage = 220.0
        monitoring_service._last_current = None
        
        with patch("backend.services.monitoring_service.get_current", return_value=5.0) as mock_current:
            result = monitoring_service.get_power(20)
            
            assert result == 1100.0
            mock_current.assert_called_once_with(20)

    def test_get_power_without_any_cached_values(self):
        monitoring_service._last_voltage = None
        monitoring_service._last_current = None
        
        with patch("backend.services.monitoring_service.get_voltage", return_value=220.0) as mock_voltage:
            with patch("backend.services.monitoring_service.get_current", return_value=5.0) as mock_current:
                result = monitoring_service.get_power(20)
                
                assert result == 1100.0
                mock_voltage.assert_called_once_with(20)
                mock_current.assert_called_once_with(20)

    def test_get_period_success(self):
        with patch("backend.services.monitoring_service.get_frequency", return_value=50.0):
            result = monitoring_service.get_period(20)
            assert result == 0.02  # 1/50

    def test_get_period_zero_frequency(self):
        with patch("backend.services.monitoring_service.get_frequency", return_value=0):
            with pytest.raises(ValueError, match="Invalid frequency for period calculation"):
                monitoring_service.get_period(20)

    def test_get_period_negative_frequency(self):
        with patch("backend.services.monitoring_service.get_frequency", return_value=-10):
            with pytest.raises(ValueError, match="Invalid frequency for period calculation"):
                monitoring_service.get_period(20)

    def test_get_resonance_frequency_success(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            # First read status, then if status==1, read hi/lo
            mock_read.side_effect = [1, 0x0001, 0x86A0]  # status=1, then hi, then lo
            result = monitoring_service.get_resonance_frequency(20)
            
            assert result == {
                "resonance_frequency": 100000,  # 0x186A0 in decimal
                "status_code": 1,
                "status_text": "obtained successfully"
            }

    def test_get_resonance_frequency_different_status_codes(self):
        status_test_cases = [
            (0, "not obtained"),
            (2, "failed to obtain"),
            (3, "unknown (3)")  # unknown status
        ]
        
        for status_code, expected_text in status_test_cases:
            with patch("backend.services.monitoring_service.manager.write") as mock_write, \
                 patch("backend.services.monitoring_service.manager.read") as mock_read:
                mock_read.return_value = status_code  # Only status will be read
                result = monitoring_service.get_resonance_frequency(20)
                
                assert result == {
                    "resonance_frequency": -1,  # Invalid/not obtained
                    "status_code": status_code,
                    "status_text": expected_text
                }

    def test_get_resonance_frequency_hi_read_failure(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            # Provide values for all three reads: status, hi, lo
            mock_read.side_effect = [1, None, 0x86A0]  # status=1, hi fails, lo won't be reached
            with pytest.raises(ValueError, match="Failed to read resonance frequency registers"):
                monitoring_service.get_resonance_frequency(20)

    def test_get_resonance_frequency_status_read_failure(self):
        with patch("backend.services.monitoring_service.manager.write") as mock_write, \
             patch("backend.services.monitoring_service.manager.read") as mock_read:
            mock_read.return_value = None  # status read fails
            with pytest.raises(ValueError, match="Failed to read resonance frequency status register"):
                monitoring_service.get_resonance_frequency(20)

    def setup_method(self):
        """Reset global variables before each test"""
        monitoring_service._last_voltage = None
        monitoring_service._last_current = None