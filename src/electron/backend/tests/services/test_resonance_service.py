import pytest
from unittest.mock import patch
from backend.services import resonance_service

class TestResonanceService:

    def test_get_frequency_range_start_success(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            # hi=0x0001, lo=0x86A0 -> combined 0x000186A0 == 100000
            mock_read.side_effect = [0x0001, 0x86A0]
            result = resonance_service.get_frequency_range_start()
            assert result["success"] is True
            assert result["frequency_range_start"] == 100000

    def test_get_frequency_range_start_read_failure(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            mock_read.return_value = None
            with pytest.raises(ValueError, match="Failed to read frequency range start registers"):
                resonance_service.get_frequency_range_start()

    def test_set_frequency_range_start_success(self):
        with patch("backend.services.resonance_service.manager.write") as mock_write:
            res = resonance_service.set_frequency_range_start(100000)
            assert res["success"] is True
            assert res["frequency_range_start"] == 100000
            # Expect hi = 1, lo = 0x86A0
            mock_write.assert_any_call("holding", 20, 9, 1)
            mock_write.assert_any_call("holding", 20, 10, 0x86A0)

    def test_set_frequency_range_start_negative(self):
        with pytest.raises(ValueError, match="Start frequency must be non-negative"):
            resonance_service.set_frequency_range_start(-1)

    def test_get_frequency_range_end_success(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            # hi=0x0001, lo=0x86A0 -> 100000
            mock_read.side_effect = [0x0001, 0x86A0]
            result = resonance_service.get_frequency_range_end()
            assert result["success"] is True
            assert result["frequency_range_end"] == 100000

    def test_get_frequency_range_end_read_failure(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            mock_read.return_value = None
            # Note: function raises same message as start (per current implementation)
            with pytest.raises(ValueError, match="Failed to read frequency range start registers"):
                resonance_service.get_frequency_range_end()

    def test_set_frequency_range_end_success(self):
        with patch("backend.services.resonance_service.manager.write") as mock_write:
            res = resonance_service.set_frequency_range_end(200000)
            assert res["success"] is True
            assert res["frequency_range_end"] == 200000
            hi = (200000 >> 16) & 0xFFFF
            lo = 200000 & 0xFFFF
            mock_write.assert_any_call("holding", 20, 11, hi)
            mock_write.assert_any_call("holding", 20, 12, lo)

    def test_set_frequency_range_end_invalid(self):
        with pytest.raises(ValueError, match="End frequency must be positive"):
            resonance_service.set_frequency_range_end(0)

    def test_get_frequency_step_success(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            mock_read.return_value = 250
            result = resonance_service.get_frequency_step()
            assert result["success"] is True
            assert result["frequency_step"] == 250

    def test_get_frequency_step_read_failure(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            mock_read.return_value = None
            with pytest.raises(ValueError, match="Failed to read frequency step register"):
                resonance_service.get_frequency_step()

    def test_set_frequency_step_success(self):
        with patch("backend.services.resonance_service.manager.write") as mock_write:
            res = resonance_service.set_frequency_step(50)
            assert res["success"] is True
            assert res["frequency_step"] == 50
            mock_write.assert_called_once_with("holding", 20, 8, 50)

    def test_set_frequency_step_invalid(self):
        with pytest.raises(ValueError, match="Step must be positive"):
            resonance_service.set_frequency_step(0)

    def test_start_resonance_measurement_calls_write(self):
        with patch("backend.services.resonance_service.manager.write") as mock_write:
            res = resonance_service.start_resonance_measurement()
            assert res["success"] is True
            assert "Resonance measurement started" in res["message"]
            mock_write.assert_called_once_with("coil", 20, 5, 1)

    def test_get_resonance_status_success_codes(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            # status 0
            mock_read.return_value = 0
            r0 = resonance_service.get_resonance_status()
            assert r0["status_code"] == 0
            assert r0["status_text"] == "not obtained"

            # status 1
            mock_read.return_value = 1
            r1 = resonance_service.get_resonance_status()
            assert r1["status_code"] == 1
            assert r1["status_text"] == "obtained successfully"

            # status 2
            mock_read.return_value = 2
            r2 = resonance_service.get_resonance_status()
            assert r2["status_code"] == 2
            assert r2["status_text"] == "failed to obtain"

            # status 3
            mock_read.return_value = 3
            r3 = resonance_service.get_resonance_status()
            assert r3["status_code"] == 3
            assert r3["status_text"] == "measurement in progress"

    def test_get_resonance_status_unknown(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            mock_read.return_value = 99
            res = resonance_service.get_resonance_status()
            assert res["status_code"] == 99
            assert res["status_text"] == "unknown (99)"

    def test_get_resonance_status_read_failure(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            mock_read.return_value = None
            with pytest.raises(ValueError, match="Failed to read resonance frequency status register"):
                resonance_service.get_resonance_status()