import pytest
from unittest.mock import patch
from backend.services import control_service

class TestControlRoutes:
    def test_set_frequency_success(self, client):
        with patch.object(control_service, "set_frequency", return_value={"success": True, "frequency": 60000}):
            response = client.post("/frequency", json={"frequency_hz": 60000})
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["frequency"] == 60000

    def test_set_frequency_invalid_value(self, client):
        with patch.object(control_service, "set_frequency", side_effect=ValueError("Frequency must be a positive integer")):
            response = client.post("/frequency", json={"frequency_hz": -1})
            assert response.status_code == 400
            data = response.get_json()
            assert data["success"] is False
            assert "error" in data

    def test_set_frequency_missing_data(self, client):
        # When no frequency_hz is provided, it defaults to 0 which is valid
        # but might cause a server error if the hardware doesn't accept 0Hz
        with patch.object(control_service, "set_frequency", return_value={"success": True, "frequency": 0}):
            response = client.post("/frequency", json={})
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["frequency"] == 0

    def test_set_frequency_server_error(self, client):
        with patch.object(control_service, "set_frequency", side_effect=Exception("Connection failed")):
            response = client.post("/frequency", json={"frequency_hz": 60000})
            assert response.status_code == 500
            data = response.get_json()
            assert data["success"] is False
            assert "error" in data

    def test_get_frequency_success(self, client):
        with patch.object(control_service, "get_frequency", return_value=60000):
            response = client.get("/frequency")
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["frequency"] == 60000

    def test_get_frequency_server_error(self, client):
        with patch.object(control_service, "get_frequency", side_effect=Exception("Read failed")):
            response = client.get("/frequency")
            assert response.status_code == 500
            data = response.get_json()
            assert data["success"] is False
            assert "error" in data

    def test_set_power_level_success(self, client):
        with patch.object(control_service, "set_power_level", return_value={"success": True, "power_percent": 75}):
            response = client.post("/power", json={"power_percent": 75})
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["power_percent"] == 75

    def test_set_power_level_invalid(self, client):
        with patch.object(control_service, "set_power_level", side_effect=ValueError("Power level must be 0–100")):
            response = client.post("/power", json={"power_percent": -1})
            assert response.status_code == 400
            data = response.get_json()
            assert data["success"] is False
            assert "error" in data

    def test_set_power_level_missing_data(self, client):
        # When no power_percent is provided, it defaults to -1 which is invalid
        with patch.object(control_service, "set_power_level", side_effect=ValueError("Power level must be 0–100")):
            response = client.post("/power", json={})
            assert response.status_code == 400
            data = response.get_json()
            assert data["success"] is False
            assert "error" in data

    def test_set_samples_success(self, client):
        with patch.object(control_service, "set_sample_count", return_value={"success": True, "samples": 32}):
            response = client.post("/samples", json={"sample_count": 32})
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["samples"] == 32

    def test_set_samples_invalid(self, client):
        with patch.object(control_service, "set_sample_count", side_effect=ValueError("Sample count must be positive")):
            response = client.post("/samples", json={"sample_count": 0})
            assert response.status_code == 400
            data = response.get_json()
            assert data["success"] is False
            assert "error" in data


@pytest.fixture
def client():
    """Flask test client fixture with registered control_bp blueprint."""
    from flask import Flask
    from backend.routes.control import control_bp  # Correct import path
    
    app = Flask(__name__)
    app.register_blueprint(control_bp, url_prefix='/')
    
    with app.test_client() as client:
        yield client