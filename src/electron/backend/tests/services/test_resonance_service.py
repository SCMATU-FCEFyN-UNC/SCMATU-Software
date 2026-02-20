import pytest
from unittest.mock import patch, MagicMock, call
from backend.services import resonance_service


class TestResonanceService:

    def test_get_frequency_range_start_success(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            # hi=0x0001, lo=0x86A0 -> combined 0x000186A0 == 100000
            mock_read.side_effect = [0x0001, 0x86A0]
            result = resonance_service.get_frequency_range_start()
            assert result["success"] is True
            assert result["frequency_range_start"] == 100000
            mock_read.assert_any_call("holding", 20, 9)
            mock_read.assert_any_call("holding", 20, 10)

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
            assert mock_write.call_count == 2

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
            mock_read.assert_any_call("holding", 20, 11)
            mock_read.assert_any_call("holding", 20, 12)

    def test_get_frequency_range_end_read_failure(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            mock_read.return_value = None
            with pytest.raises(ValueError, match="Failed to read frequency range end registers"):
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
            assert mock_write.call_count == 2

    def test_set_frequency_range_end_invalid(self):
        with pytest.raises(ValueError, match="End frequency must be positive"):
            resonance_service.set_frequency_range_end(0)

    def test_get_frequency_step_success(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            mock_read.return_value = 250
            result = resonance_service.get_frequency_step()
            assert result["success"] is True
            assert result["frequency_step"] == 250
            mock_read.assert_called_once_with("holding", 20, 8)

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

    def test_get_resonance_status_firmware_status_codes(self):
        """Test firmware mode status codes 0-3."""
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            # Reset _last_mode to firmware
            resonance_service._last_mode = "firmware"
            
            # Test status 0
            mock_read.return_value = 0
            r0 = resonance_service.get_resonance_status()
            assert r0["status_code"] == 0
            assert r0["status_text"] == "not obtained"

            # Test status 1
            mock_read.return_value = 1
            r1 = resonance_service.get_resonance_status()
            assert r1["status_code"] == 1
            assert r1["status_text"] == "obtained successfully"

            # Test status 2
            mock_read.return_value = 2
            r2 = resonance_service.get_resonance_status()
            assert r2["status_code"] == 2
            assert r2["status_text"] == "failed to obtain"

            # Test status 3
            mock_read.return_value = 3
            r3 = resonance_service.get_resonance_status()
            assert r3["status_code"] == 3
            assert r3["status_text"] == "measurement in progress"

    def test_get_resonance_status_firmware_status_4_frequency_only(self):
        """Test firmware mode status code 4 (software measurement - frequency only)."""
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            resonance_service._last_mode = "firmware"
            
            # Mock status code 4 first, then frequency registers
            mock_read.side_effect = [
                4,                          # status code
                0x0001,                      # overall_hi
                0x86A0                       # overall_lo
            ]
            
            result = resonance_service.get_resonance_status()
            
            assert result["status_code"] == 4
            assert result["status_text"] == "software measurement (frequency only)"
            assert result["best_overall"] is not None
            assert result["best_overall"]["frequency"] == 100000
            assert result["best_overall"]["phase_ns"] is None
            assert result["best_overall"]["phase_deg"] is None
            assert result["best_overall"]["current"] is None
            assert result["best_overall"]["current_a"] is None

    def test_get_resonance_status_firmware_status_1_full_data_valid(self):
        """Test firmware mode status 1 with valid phase/current data."""
        # Use a single patch for manager.read
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            resonance_service._last_mode = "firmware"
            
            # Count exactly how many reads are performed:
            # 1. status code (reg 9)
            # 2. overall_hi (reg 10)
            # 3. overall_lo (reg 11)
            # 4. overall_phase_raw (reg 12)
            # 5. overall_current_raw (reg 13)
            # 6. phase_hi (reg 14)
            # 7. phase_lo (reg 15)
            # 8. phase_phase_raw (reg 16)
            # 9. phase_current_raw (reg 17)
            # 10. current_hi (reg 18)
            # 11. current_lo (reg 19)
            # 12. current_phase_raw (reg 20)
            # 13. current_current_raw (reg 21)
            # Then for each current calculation (3 times), it reads:
            #    c_gain_raw (reg 14) - once per current calculation
            #    r_shunt_raw (reg 15) - once per current calculation
            # That's 3 * 2 = 6 more reads
            # Total: 13 + 6 = 19 reads
            
            mock_read.side_effect = [
                # First 13 reads: status and all register data
                1,                          # status code (reg 9)
                0x0001,                      # overall_hi (reg 10)
                0x86A0,                      # overall_lo (reg 11)
                100,                         # overall_phase_raw (reg 12)
                200,                         # overall_current_raw (reg 13)
                0x0001,                      # phase_hi (reg 14)
                0x86A1,                      # phase_lo (reg 15)
                50,                          # phase_phase_raw (reg 16)
                250,                         # phase_current_raw (reg 17)
                0x0001,                      # current_hi (reg 18)
                0x86A2,                      # current_lo (reg 19)
                -50,                         # current_phase_raw (reg 20)
                300,                         # current_current_raw (reg 21)
                
                # Calibration reads for overall current calculation (2 reads)
                1500,                        # c_gain_raw (reg 14) for overall
                1000,                        # r_shunt_raw (reg 15) for overall
                
                # Calibration reads for phase current calculation (2 reads)
                1500,                        # c_gain_raw (reg 14) for phase
                1000,                        # r_shunt_raw (reg 15) for phase
                
                # Calibration reads for current calculation (2 reads)
                1500,                        # c_gain_raw (reg 14) for current
                1000,                        # r_shunt_raw (reg 15) for current
            ]
            
            result = resonance_service.get_resonance_status()
            
            assert result["status_code"] == 1
            assert result["status_text"] == "obtained successfully"
            
            # Check best_overall exists
            assert result["best_overall"] is not None
            assert result["best_overall"]["frequency"] == 100000
            
            # Check best_phase exists
            assert result["best_phase"] is not None
            assert result["best_phase"]["frequency"] == 100001  # 0x86A1 = 34465, (1<<16)|34465 = 100001
            
            # Check best_current exists
            assert result["best_current"] is not None
            assert result["best_current"]["frequency"] == 100002
            
            # Verify the number of reads
            assert mock_read.call_count == 19

    def test_get_resonance_status_firmware_status_1_with_invalid_data_downgrade(self):
        """Test firmware mode status 1 but with invalid data downgrades to status 4."""
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            resonance_service._last_mode = "firmware"
            
            # Mock reads - overall_current_raw = 5000 (invalid, >4095)
            mock_read.side_effect = [
                1,                          # status code
                0x0001, 0x86A0, 100, 5000,   # overall: hi, lo, phase_raw, current_raw (invalid)
                0x0001, 0x86A1, 50, 250,    # phase data
                0x0001, 0x86A2, -50, 300,   # current data
            ]
            
            result = resonance_service.get_resonance_status()
            
            # Should downgrade to status 4
            assert result["status_code"] == 4
            assert result["status_text"] == "software measurement (frequency only)"
            assert result["best_overall"] is not None
            assert result["best_overall"]["frequency"] == 100000
            assert result["best_overall"]["phase_ns"] is None
            assert result["best_phase"] is None  # Should not include phase/current data

    def test_get_resonance_status_unknown(self):
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            resonance_service._last_mode = "firmware"
            mock_read.return_value = 99
            result = resonance_service.get_resonance_status()
            assert result["status_code"] == 99
            assert result["status_text"] == "unknown (99)"

    def test_get_resonance_status_software_mode(self):
        """Test get_resonance_status in software mode returns sweep state."""
        # Set up sweep state with some data
        resonance_service._last_mode = "software"
        resonance_service._sweep_state.update({
            "running": False,
            "status_code": 1,
            "status_text": "obtained successfully",
            "progress": {"current_frequency": 100000, "index": 10, "total": 20},
            "results": [{"frequency": 100000, "phase_ns": 100, "current_a": 0.5}],
            "best_overall": {"frequency": 100000, "phase_ns": 100, "current_a": 0.5},
            "best_phase": None,
            "best_current": None,
            "error": None,
            "plot_filepath": "/path/to/plot.png",
            "plot_open": True,
        })
        
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            result = resonance_service.get_resonance_status()
            
            # In software mode, the result should contain all sweep state fields
            assert result["status_code"] == 1
            assert result["status_text"] == "obtained successfully"
            assert result["progress"]["current_frequency"] == 100000
            assert len(result["results"]) == 1
            assert result["best_overall"]["frequency"] == 100000
            assert result["plot_filepath"] == "/path/to/plot.png"
            assert result["plot_open"] is True
            mock_read.assert_not_called()  # Should not read from manager in software mode

    def test_get_resonance_status_software_mode_running(self):
        """Test get_resonance_status when software sweep is running."""
        resonance_service._last_mode = "software"
        resonance_service._sweep_state.update({
            "running": True,
            "status_code": 3,
            "status_text": "measurement in progress",
            "progress": {"current_frequency": 150000, "index": 5, "total": 10},
            "results": [],
            "best_overall": None,
            "best_phase": None,
            "best_current": None,
            "error": None,
            "plot_open": True,
        })
        
        with patch("backend.services.resonance_service.manager.read") as mock_read:
            result = resonance_service.get_resonance_status()
            
            # Note: get_resonance_status doesn't include a 'running' key in the result
            # It includes the sweep state directly
            assert result["status_code"] == 3
            assert result["status_text"] == "measurement in progress"
            assert result["progress"]["current_frequency"] == 150000
            mock_read.assert_not_called()

    def test_start_software_sweep_success(self):
        with patch("backend.services.resonance_service._sweep_worker") as mock_worker:
            resonance_service._sweep_state["running"] = False
            
            result = resonance_service.start_software_sweep(
                start_hz=100000,
                end_hz=200000,
                step_hz=1000,
                stabilize_s=0.2,
                slave=20,
                save_results=True,
                save_folder_path="/tmp",
                live_plot=True,
                save_plot=True
            )
            
            assert result["success"] is True
            assert result["message"] == "Software sweep started"
            assert resonance_service._last_mode == "software"
            assert resonance_service._sweep_state["plot_open"] is True
            mock_worker.assert_called_once()

    def test_start_software_sweep_already_running(self):
        resonance_service._sweep_state["running"] = True
        
        with pytest.raises(ValueError, match="Software measurement already in progress"):
            resonance_service.start_software_sweep(
                start_hz=100000,
                end_hz=200000,
                step_hz=1000
            )

    def test_compute_picks_empty_results(self):
        result = resonance_service._compute_picks([])
        assert result["best_overall"] is None
        assert result["best_phase"] is None
        assert result["best_current"] is None

    def test_compute_picks_with_valid_data(self):
        results = [
            {"frequency": 100000, "phase_ns": 50, "current_a": 0.5},
            {"frequency": 110000, "phase_ns": -20, "current_a": 0.8},
            {"frequency": 120000, "phase_ns": 10, "current_a": 1.2},
            {"frequency": 130000, "phase_ns": 5, "current_a": 1.2},
        ]
        
        picks = resonance_service._compute_picks(results)
        
        # best_phase should be the one with phase_ns closest to 0 (absolute value)
        # |50|, | -20|, |10|, |5| -> 5 is closest, so frequency 130000
        assert picks["best_phase"]["frequency"] == 130000  # phase_ns=5 (closest to 0)
        
        # best_current should be the one with highest current_a
        assert picks["best_current"]["frequency"] == 120000  # current_a=1.2
        
        # best_overall should be the one with highest current, and among those with same current,
        # the one with phase_ns closest to 0
        assert picks["best_overall"]["frequency"] == 130000  # same current as 120000 but better phase

    def test_ns_to_deg_conversion(self):
        # Phase_ns = 1ms (1,000,000 ns), frequency = 1000Hz
        # One period at 1000Hz = 1,000,000 ns
        # So 1ms phase = 360 degrees
        # But looking at the implementation in resonance_service.py, _ns_to_deg is defined differently:
        # def _ns_to_deg(phase_ns: Optional[float], frequency_hz: Optional[float]) -> Optional[float]:
        #     if phase_ns is None or frequency_hz is None:
        #         return None
        #     phase_s = phase_ns * 1e-9
        #     phase_deg = (phase_s * frequency_hz * 360) % 360
        #     if phase_deg > 180:
        #         phase_deg -= 360
        #     return round(phase_deg, 2)
        
        # Let's test the actual implementation
        phase_deg = resonance_service._ns_to_deg(1_000_000, 1000)
        # phase_s = 0.001, 0.001 * 1000 * 360 = 360, 360 % 360 = 0
        assert phase_deg == 0.0  # Because modulo 360
        
        # Test with half period
        phase_deg = resonance_service._ns_to_deg(500_000, 1000)
        # 0.0005 * 1000 * 360 = 180, 180 % 360 = 180, >180? No, so 180
        assert phase_deg == 180.0
        
        # Test with quarter period
        phase_deg = resonance_service._ns_to_deg(250_000, 1000)
        # 0.00025 * 1000 * 360 = 90
        assert phase_deg == 90.0
        
        # Test with 1.5 periods (should wrap)
        phase_deg = resonance_service._ns_to_deg(1_500_000, 1000)
        # 0.0015 * 1000 * 360 = 540, 540 % 360 = 180
        assert phase_deg == 180.0
        
        # Test with None values
        assert resonance_service._ns_to_deg(None, 1000) is None
        assert resonance_service._ns_to_deg(1000, None) is None

    def test_convert_firmware_current(self):
        with patch("backend.services.resonance_service.CURRENT_ADC_TO_A", 0.001):
            assert resonance_service._convert_firmware_current(1000) == 1.0
            assert resonance_service._convert_firmware_current(None) is None

    def test_is_valid_phase_ns(self):
        assert resonance_service._is_valid_phase_ns(1000) is True
        assert resonance_service._is_valid_phase_ns(1e9 - 1) is True
        assert resonance_service._is_valid_phase_ns(1e9) is False  # >= 1e9 is invalid
        assert resonance_service._is_valid_phase_ns(-1000) is True  # Negative can be valid
        assert resonance_service._is_valid_phase_ns(-1e9) is False
        assert resonance_service._is_valid_phase_ns(None) is False

    def test_is_valid_current_adc(self):
        assert resonance_service._is_valid_current_adc(0) is True
        assert resonance_service._is_valid_current_adc(2048) is True
        assert resonance_service._is_valid_current_adc(4095) is True
        assert resonance_service._is_valid_current_adc(4096) is False
        assert resonance_service._is_valid_current_adc(-1) is False
        assert resonance_service._is_valid_current_adc(None) is False

    def test_update_firmware_with_external_result_success(self):
        with patch("backend.services.resonance_service.manager.write") as mock_write:
            result = resonance_service._update_firmware_with_external_result(100000, 20)
            
            assert result is True
            mock_write.assert_any_call("holding", 20, 21, 1)   # hi
            mock_write.assert_any_call("holding", 20, 22, 0x86A0)  # lo
            mock_write.assert_any_call("coil", 20, 6, 1)      # trigger
            assert mock_write.call_count == 3

    def test_update_firmware_with_external_result_failure(self):
        with patch("backend.services.resonance_service.manager.write") as mock_write:
            mock_write.side_effect = Exception("Write failed")
            result = resonance_service._update_firmware_with_external_result(100000, 20)
            assert result is False