import pytest
from unittest.mock import Mock, patch, AsyncMock
from flask import jsonify
from backend.routes.connection import serial_bp
from backend.services import connection_manager
from backend.services.connection_manager import list_ports, connect, disconnect, get_status

class TestConnectionRoutes:
    """Test suite for backend.routes.connection endpoints."""

    def test_get_ports(self, client):
        """Test GET /ports returns available COM ports."""
        mock_ports = [
            {"device": "COM3", "description": "USB Serial Device"},
            {"device": "COM4", "description": "Arduino Uno"}
        ]
        
        with patch('backend.routes.connection.list_ports', return_value=mock_ports):
            response = client.get('/ports')
            assert response.status_code == 200
            assert response.json == {"ports": mock_ports}

    def test_connect_port_success(self, client):
        """Test POST /connect with minimal data succeeds."""
        test_data = {"port": "COM3", "baudrate": 19200, "parity": "E"}
        
        with patch("backend.routes.connection.connection_manager.connect", new_callable=AsyncMock) as mock_connect:
            mock_connect.return_value = True
            response = client.post("/connect", json=test_data)
            
            assert response.status_code == 200
            assert response.json == {"success": True}
            mock_connect.assert_awaited_once_with(
                port="COM3",
                baudrate=19200,
                parity="E",
                stopbits=1,
                bytesize=8,
                timeout=1,
            )

    #@pytest.mark.asyncio
    def test_connect_port_with_params(self, client, monkeypatch):
        """Test POST /connect with full parameter set."""
        async def mock_connect(**kwargs):
            # Verify that all parameters were passed correctly
            assert kwargs["port"] == "COM5"
            assert kwargs["baudrate"] == 19200
            assert kwargs["bytesize"] == 7
            assert kwargs["parity"] == "E"
            assert kwargs["stopbits"] == 2
            assert kwargs["timeout"] == 2
            return True

        monkeypatch.setattr(connection_manager, "connect", mock_connect)

        response = client.post("/connect", json={
            "port": "COM5",
            "baudrate": 19200,
            "bytesize": 7,
            "parity": "E",
            "stopbits": 2,
            "timeout": 2,
        })
        assert response.status_code == 200
        assert response.json == {"success": True}

    def test_connect_port_failure(self, client):
        """Test POST /connect failed connection returns 500."""
        test_data = {"port": "COM3"}
        
        with patch("backend.routes.connection.connection_manager.connect", new_callable=AsyncMock) as mock_connect:
            mock_connect.return_value = False
            response = client.post("/connect", json=test_data)
            assert response.status_code == 500
            assert response.json == {"success": False}

    def test_connect_port_missing_data(self, client):
        """Test POST /connect with missing 'port' field returns 400."""
        response = client.post('/connect', json={})
        assert response.status_code == 400
        assert response.json == {"error": "Missing 'port'"}

    #def test_disconnect_port(self, client):
    #    """Test POST /disconnect endpoint calls disconnect."""
    #    with patch('backend.routes.connection.asyncio.run') as mock_run:
    #        response = client.post('/disconnect')
    #        assert response.status_code == 200
    #        assert response.json == {"success": True}
    #        mock_run.assert_called_once()

    def test_disconnect_port(self, client, monkeypatch):
        """Test POST /disconnect endpoint."""
        async def mock_disconnect():
            return None

        # Properly patch the async disconnect function
        monkeypatch.setattr(connection_manager, "disconnect", mock_disconnect)

        response = client.post('/disconnect')
        assert response.status_code == 200
        assert response.json == {"success": True}
        
    def test_connection_status(self, client):
        """Test GET /status returns connection status."""
        mock_status = {"connected": True, "port": "COM3"}
        
        with patch('backend.routes.connection.connection_manager.get_status', return_value=mock_status):
            response = client.get('/status')
            assert response.status_code == 200
            assert response.json == mock_status


@pytest.fixture
def client():
    """Flask test client fixture with registered serial_bp blueprint."""
    from flask import Flask
    app = Flask(__name__)
    app.register_blueprint(serial_bp, url_prefix='/')
    
    with app.test_client() as client:
        yield client