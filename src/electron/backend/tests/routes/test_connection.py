import pytest
from unittest.mock import Mock, patch, MagicMock
from flask import Flask
from backend.routes.connection import serial_bp
from backend.services.connection_manager import manager

class TestConnectionRoutes:
    """Test suite for backend.routes.connection endpoints."""

    def test_get_ports(self, client):
        """Test GET /ports returns available COM ports."""
        mock_ports = [
            {"device": "COM3", "description": "USB Serial Device"},
            {"device": "COM4", "description": "Arduino Uno"}
        ]
        
        with patch.object(manager, 'list_ports', return_value=mock_ports):
            response = client.get('/ports')
            assert response.status_code == 200
            assert response.json == {"ports": mock_ports}

    def test_connect_port_success(self, client):
        """Test POST /connect with minimal data succeeds."""
        test_data = {"port": "COM3", "baudrate": 19200, "parity": "E"}
        
        with patch.object(manager, 'connect', return_value=True) as mock_connect:
            response = client.post("/connect", json=test_data)
            
            assert response.status_code == 200
            assert response.json == {"success": True}
            mock_connect.assert_called_once_with(
                port="COM3",
                baudrate=19200,
                parity="E",
                stopbits=1,
                bytesize=8,
                timeout=1.0,
            )

    def test_connect_port_with_params(self, client):
        """Test POST /connect with full parameter set."""
        test_data = {
            "port": "COM5",
            "baudrate": 19200,
            "bytesize": 7,
            "parity": "E",
            "stopbits": 2,
            "timeout": 2.0,
        }
        
        with patch.object(manager, 'connect', return_value=True) as mock_connect:
            response = client.post("/connect", json=test_data)
            assert response.status_code == 200
            assert response.json == {"success": True}
            mock_connect.assert_called_once_with(**test_data)

    def test_connect_port_failure(self, client):
        """Test POST /connect failed connection returns 500."""
        test_data = {"port": "COM3"}
        
        with patch.object(manager, 'connect', return_value=False) as mock_connect:
            response = client.post("/connect", json=test_data)
            assert response.status_code == 500
            assert response.json == {"success": False}

    def test_connect_port_missing_data(self, client):
        """Test POST /connect with missing 'port' field returns 400."""
        response = client.post('/connect', json={})
        assert response.status_code == 400
        assert response.json == {"error": "Missing 'port'"}

    def test_disconnect_port(self, client):
        """Test POST /disconnect endpoint."""
        with patch.object(manager, 'disconnect') as mock_disconnect:
            response = client.post('/disconnect')
            assert response.status_code == 200
            assert response.json == {"success": True}
            mock_disconnect.assert_called_once()

    def test_connection_status(self, client):
        """Test GET /status returns connection status."""
        mock_status = {"connected": True, "port": "COM3"}
        
        with patch.object(manager, 'get_status', return_value=mock_status):
            response = client.get('/status')
            assert response.status_code == 200
            assert response.json == mock_status

    def test_connection_status_disconnected(self, client):
        """Test GET /status returns disconnected status."""
        mock_status = {"connected": False, "port": None}
        
        with patch.object(manager, 'get_status', return_value=mock_status):
            response = client.get('/status')
            assert response.status_code == 200
            assert response.json == mock_status

    def test_connect_port_default_values(self, client):
        """Test POST /connect uses default values when not provided."""
        test_data = {"port": "COM3"}  # Only required field
        
        expected_params = {
            "port": "COM3",
            "baudrate": 9600,
            "bytesize": 8,
            "parity": "N",
            "stopbits": 1,
            "timeout": 1.0,
        }
        
        with patch.object(manager, 'connect', return_value=True) as mock_connect:
            response = client.post("/connect", json=test_data)
            assert response.status_code == 200
            assert response.json == {"success": True}
            mock_connect.assert_called_once_with(**expected_params)


@pytest.fixture
def client():
    """Flask test client fixture with registered serial_bp blueprint."""
    app = Flask(__name__)
    app.register_blueprint(serial_bp, url_prefix='/')
    
    with app.test_client() as client:
        yield client