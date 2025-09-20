import pytest
from unittest.mock import Mock, patch, AsyncMock
from flask import jsonify

from backend.routes.connection import serial_bp
from backend.services.connection_manager import list_ports, connect, disconnect, get_status


class TestConnectionRoutes:
    """Test suite for connection.py routes"""

    def test_get_ports(self, client):
        """Test GET /ports endpoint"""
        mock_ports = [
            {"device": "COM3", "description": "USB Serial Device"},
            {"device": "COM4", "description": "Arduino Uno"}
        ]
        
        with patch('backend.routes.connection.list_ports', return_value=mock_ports):
            response = client.get('/ports')
            
            assert response.status_code == 200
            assert response.json == {"ports": mock_ports}

    def test_connect_port_success(self, client):
        """Test POST /connect successful connection"""
        test_data = {"port": "COM3"}
        
        with patch('backend.routes.connection.asyncio.run', return_value=True):
            response = client.post('/connect', json=test_data)
            
            assert response.status_code == 200
            assert response.json == {"success": True}

    def test_connect_port_failure(self, client):
        """Test POST /connect failed connection"""
        test_data = {"port": "COM3"}
        
        with patch('backend.routes.connection.asyncio.run', return_value=False):
            response = client.post('/connect', json=test_data)
            
            assert response.status_code == 500
            assert response.json == {"success": False}

    def test_connect_port_missing_data(self, client):
        """Test POST /connect with missing port"""
        # Test missing port in JSON
        response = client.post('/connect', json={})
        assert response.status_code == 400
        assert response.json == {"error": "Missing 'port'"}
        
        # Test empty JSON
        
    def test_disconnect_port(self, client):
        """Test POST /disconnect endpoint"""
        with patch('backend.routes.connection.asyncio.run') as mock_run:
            response = client.post('/disconnect')
            
            assert response.status_code == 200
            assert response.json == {"success": True}
            mock_run.assert_called_once()

    def test_connection_status(self, client):
        """Test GET /status endpoint"""
        mock_status = {"connected": True, "port": "COM3"}
        
        with patch('backend.routes.connection.connection_manager.get_status', return_value=mock_status):
            response = client.get('/status')
            
            assert response.status_code == 200
            assert response.json == mock_status


@pytest.fixture
def client():
    """Create a test client for the Flask app"""
    from flask import Flask
    app = Flask(__name__)
    app.register_blueprint(serial_bp, url_prefix='/')
    
    with app.test_client() as client:
        yield client