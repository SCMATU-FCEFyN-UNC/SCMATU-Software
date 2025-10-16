import pytest
from unittest.mock import patch
from backend.services import control_service

class TestControlService:
    def test_set_frequency_valid(self):
        with patch("backend.services.control_service.manager.write") as mock_write:
            result = control_service.set_frequency(60000)
            assert result["success"]
            assert result["frequency"] == 60000
            assert mock_write.call_count == 3  # hi + lo + coil write
            
            # Verify the correct values were written
            calls = mock_write.call_args_list
            assert calls[0][0] == ("holding", 20, 2, 0)  # hi part for 60000
            assert calls[1][0] == ("holding", 20, 3, 60000)  # lo part for 60000
            assert calls[2][0] == ("coil", 20, 4, 1)  # trigger write

    def test_set_frequency_invalid_negative(self):
        with pytest.raises(ValueError, match="Frequency must be a positive integer"):
            control_service.set_frequency(-1)

    def test_get_frequency_valid(self):
        with patch("backend.services.control_service.manager.read", side_effect=[0x0001, 0x86A0]):
            result = control_service.get_frequency()
            assert result == (0x0001 << 16 | 0x86A0)  # Should be 100000

    def test_get_frequency_read_failure(self):
        with patch("backend.services.control_service.manager.read", side_effect=[None, 0x86A0]):
            with pytest.raises(ValueError, match="Failed to read frequency registers"):
                control_service.get_frequency()

    def test_set_power_level_valid(self):
        with patch("backend.services.control_service.manager.write") as mock_write:
            result = control_service.set_power_level(75)
            assert result["success"]
            assert result["power_percent"] == 75
            mock_write.assert_called_once_with("holding", 20, 4, 75)

    def test_set_power_level_invalid_low(self):
        with pytest.raises(ValueError, match="Power level must be 0–100"):
            control_service.set_power_level(-1)

    def test_set_power_level_invalid_high(self):
        with pytest.raises(ValueError, match="Power level must be 0–100"):
            control_service.set_power_level(101)

    def test_set_sample_count_valid(self):
        with patch("backend.services.control_service.manager.write") as mock_write:
            result = control_service.set_sample_count(32)
            assert result["success"]
            assert result["samples"] == 32
            mock_write.assert_called_once_with("holding", 20, 5, 32)

    def test_set_sample_count_invalid(self):
        with pytest.raises(ValueError, match="Sample count must be positive"):
            control_service.set_sample_count(0)