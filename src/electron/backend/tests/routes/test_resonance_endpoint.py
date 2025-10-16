from unittest.mock import patch, Mock
import pytest
from flask import Flask
from backend.routes.resonance import resonance_bp, current_measurement

@pytest.fixture
def client():
    """Create a test client with the resonance blueprint registered."""
    app = Flask(__name__)
    app.register_blueprint(resonance_bp)
    return app.test_client()

class TestResonanceRoutes:
    def test_read_frequency_range_start_success(self, client):
        with patch("backend.routes.resonance.get_frequency_range_start") as mock_get:
            mock_get.return_value = {"success": True, "frequency_range_start": 50000}
            response = client.get("/resonance/frequency/start")
            assert response.status_code == 200
            assert response.json == {"success": True, "frequency_range_start": 50000}

    def test_write_frequency_range_start_success(self, client):
        with patch("backend.routes.resonance.set_frequency_range_start") as mock_set:
            mock_set.return_value = {"success": True, "frequency_range_start": 50000}
            response = client.post("/resonance/frequency/start", 
                                 json={"frequency_range_start": 50000})
            assert response.status_code == 200
            assert response.json == {"success": True, "frequency_range_start": 50000}
            mock_set.assert_called_once_with(50000)

    def test_read_frequency_range_end_success(self, client):
        with patch("backend.routes.resonance.get_frequency_range_end") as mock_get:
            mock_get.return_value = {"success": True, "frequency_range_end": 100000}
            response = client.get("/resonance/frequency/end")
            assert response.status_code == 200
            assert response.json == {"success": True, "frequency_range_end": 100000}

    def test_write_frequency_range_end_success(self, client):
        with patch("backend.routes.resonance.set_frequency_range_end") as mock_set:
            mock_set.return_value = {"success": True, "frequency_range_end": 100000}
            response = client.post("/resonance/frequency/end", 
                                 json={"frequency_range_end": 100000})
            assert response.status_code == 200
            assert response.json == {"success": True, "frequency_range_end": 100000}
            mock_set.assert_called_once_with(100000)

    def test_read_frequency_step_success(self, client):
        with patch("backend.routes.resonance.get_frequency_step") as mock_get:
            mock_get.return_value = {"success": True, "frequency_step": 1000}
            response = client.get("/resonance/frequency/step")
            assert response.status_code == 200
            assert response.json == {"success": True, "frequency_step": 1000}

    def test_write_frequency_step_success(self, client):
        with patch("backend.routes.resonance.set_frequency_step") as mock_set:
            mock_set.return_value = {"success": True, "frequency_step": 1000}
            response = client.post("/resonance/frequency/step", 
                                 json={"frequency_step": 1000})
            assert response.status_code == 200
            assert response.json == {"success": True, "frequency_step": 1000}
            mock_set.assert_called_once_with(1000)

    def test_start_resonance_measurement_success(self, client):
        with patch("backend.routes.resonance.start_resonance_measurement") as mock_start:
            mock_start.return_value = {"success": True}
            response = client.post("/resonance/start")
            assert response.status_code == 200
            assert response.json == {"success": True}
            mock_start.assert_called_once_with(slave=20)

    def test_start_resonance_measurement_already_running(self, client):
        current_measurement["running"] = True
        response = client.post("/resonance/start")
        assert response.status_code == 409
        assert response.json == {
            "success": False, 
            "error": "Measurement already in progress"
        }
        # Reset the state after test
        current_measurement["running"] = False

    def test_get_resonance_status_success(self, client):
        with patch("backend.routes.resonance.get_resonance_status") as mock_status:
            mock_status.return_value = {
                "success": True,
                "status_code": 1,
                "status_text": "obtained successfully"
            }
            response = client.get("/resonance/status")
            assert response.status_code == 200
            assert response.json == {
                "success": True,
                "status_code": 1,
                "status_text": "obtained successfully"
            }
            mock_status.assert_called_once_with(slave=20)

    def test_error_handling(self, client):
        """Test error handling for all endpoints."""
        endpoints = [
            ("GET", "/resonance/frequency/start", "get_frequency_range_start"),
            ("POST", "/resonance/frequency/start", "set_frequency_range_start"),
            ("GET", "/resonance/frequency/end", "get_frequency_range_end"),
            ("POST", "/resonance/frequency/end", "set_frequency_range_end"),
            ("GET", "/resonance/frequency/step", "get_frequency_step"),
            ("POST", "/resonance/frequency/step", "set_frequency_step"),
            ("POST", "/resonance/start", "start_resonance_measurement"),
            ("GET", "/resonance/status", "get_resonance_status")
        ]
        
        for method, endpoint, function_name in endpoints:
            # Reset running state before each test
            current_measurement["running"] = False
            
            with patch(f"backend.routes.resonance.{function_name}", 
                    side_effect=Exception("Test error")):
                if method == "GET":
                    response = client.get(endpoint)
                else:
                    response = client.post(endpoint, json={})
                    
                assert response.status_code == 500
                assert response.json == {
                    "success": False,
                    "error": "Test error"
                }