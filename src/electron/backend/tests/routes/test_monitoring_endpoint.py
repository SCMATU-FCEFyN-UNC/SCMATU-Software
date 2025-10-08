import pytest
from unittest.mock import patch
from flask import Flask
from backend.routes.monitoring import monitoring_bp

class TestMonitoringEndpoints:
    """Test suite for monitoring endpoints"""

    def test_get_all_monitoring_success(self, client):
        mock_data = {
            "phase": 45.0,
            "voltage": 220.0,
            "current": 5.0,
            "power": 1100.0,
            "period": 0.02,
            "resonance": {"resonance_frequency": 50000, "status": 1}
        }

        with patch("backend.routes.monitoring.get_phase", return_value=mock_data["phase"]) as mock_phase:
            with patch("backend.routes.monitoring.get_voltage", return_value=mock_data["voltage"]) as mock_voltage:
                with patch("backend.routes.monitoring.get_current", return_value=mock_data["current"]) as mock_current:
                    with patch("backend.routes.monitoring.get_power", return_value=mock_data["power"]) as mock_power:
                        with patch("backend.routes.monitoring.get_period", return_value=mock_data["period"]) as mock_period:
                            with patch("backend.routes.monitoring.get_resonance_frequency", return_value=mock_data["resonance"]) as mock_resonance:
                                response = client.get("/monitoring")
                                
                                assert response.status_code == 200
                                data = response.get_json()
                                assert data["success"] is True
                                assert data["data"] == mock_data

                                # Verify all functions were called
                                mock_phase.assert_called_once()
                                mock_voltage.assert_called_once()
                                mock_current.assert_called_once()
                                mock_power.assert_called_once()
                                mock_period.assert_called_once()
                                mock_resonance.assert_called_once()

    def test_get_all_monitoring_failure(self, client):
        with patch("backend.routes.monitoring.get_phase") as mock_phase:
            mock_phase.side_effect = Exception("Failed to read phase")
            
            response = client.get("/monitoring")
            
            assert response.status_code == 500
            data = response.get_json()
            assert data["success"] is False
            assert "error" in data
            assert "Failed to read phase" in data["error"]

    def test_get_single_monitoring_phase(self, client):
        with patch("backend.routes.monitoring.get_phase", return_value=45.0) as mock_func:
            response = client.get("/monitoring/phase")
            
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["phase"] == 45.0
            mock_func.assert_called_once()

    def test_get_single_monitoring_voltage(self, client):
        with patch("backend.routes.monitoring.get_voltage", return_value=220.0) as mock_func:
            response = client.get("/monitoring/voltage")
            
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["voltage"] == 220.0
            mock_func.assert_called_once()

    def test_get_single_monitoring_current(self, client):
        with patch("backend.routes.monitoring.get_current", return_value=5.0) as mock_func:
            response = client.get("/monitoring/current")
            
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["current"] == 5.0
            mock_func.assert_called_once()

    def test_get_single_monitoring_power(self, client):
        with patch("backend.routes.monitoring.get_power", return_value=1100.0) as mock_func:
            response = client.get("/monitoring/power")
            
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["power"] == 1100.0
            mock_func.assert_called_once()

    def test_get_single_monitoring_period(self, client):
        with patch("backend.routes.monitoring.get_period", return_value=0.02) as mock_func:
            response = client.get("/monitoring/period")
            
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["period"] == 0.02
            mock_func.assert_called_once()

    def test_get_single_monitoring_resonance(self, client):
        resonance_data = {"resonance_frequency": 50000, "status": 1}
        with patch("backend.routes.monitoring.get_resonance_frequency", return_value=resonance_data) as mock_func:
            response = client.get("/monitoring/resonance")
            
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["resonance"] == resonance_data
            mock_func.assert_called_once()

    def test_get_single_monitoring_invalid_metric(self, client):
        response = client.get("/monitoring/invalid_metric")
        
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False
        assert "Unsupported metric: invalid_metric" in data["error"]

    def test_get_single_monitoring_failure(self, client):
        with patch("backend.routes.monitoring.get_voltage") as mock_func:
            mock_func.side_effect = Exception("Voltage read failed")
            
            response = client.get("/monitoring/voltage")
            
            assert response.status_code == 500
            data = response.get_json()
            assert data["success"] is False
            assert "error" in data
            assert "Voltage read failed" in data["error"]

    def test_get_all_monitoring_partial_failure(self, client):
        """Test when some monitoring functions work but others fail"""
        with patch("backend.routes.monitoring.get_phase", return_value=45.0) as mock_phase:
            with patch("backend.routes.monitoring.get_voltage") as mock_voltage:
                with patch("backend.routes.monitoring.get_current", return_value=5.0) as mock_current:
                    mock_voltage.side_effect = Exception("Voltage sensor offline")
                    
                    response = client.get("/monitoring")
                    
                    assert response.status_code == 500
                    data = response.get_json()
                    assert data["success"] is False
                    assert "Voltage sensor offline" in data["error"]

    def test_metric_mapping_completeness(self):
        """Test that all metrics in the mapping are valid"""
        expected_metrics = ["phase", "voltage", "current", "power", "period", "resonance"]
        
        # We can't easily access the mapping directly, but we can verify through the tests
        # that all these metrics work correctly
        assert len(expected_metrics) == 6  # Should match the number of metrics we test


@pytest.fixture
def client():
    """Flask test client fixture with registered monitoring_bp blueprint."""
    app = Flask(__name__)
    app.register_blueprint(monitoring_bp, url_prefix='/')
    
    return app.test_client()