import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock, MagicMock
import serial.tools.list_ports

# Import the module to patch its globals
from backend.services import connection_manager


class TestConnectionManager:
    """Test suite for connection_manager.py"""

    def setup_method(self):
        """Reset global state before each test"""
        connection_manager.client = None
        connection_manager.connected_port = None

    def test_list_ports(self, monkeypatch):
        """Test listing available COM ports"""
        # Mock the serial ports
        mock_ports = [
            Mock(device="COM3", description="USB Serial Device"),
            Mock(device="COM4", description="Arduino Uno")
        ]
        monkeypatch.setattr(serial.tools.list_ports, "comports", lambda: mock_ports)
        
        result = connection_manager.list_ports()
        
        expected = [
            {"device": "COM3", "description": "USB Serial Device"},
            {"device": "COM4", "description": "Arduino Uno"}
        ]
        assert result == expected

    @pytest.mark.asyncio
    async def test_connect_success(self):
        """Test successful connection with parameters"""
        mock_client = AsyncMock()
        mock_client.connect = AsyncMock()
        mock_client.connected = True

        with patch("backend.services.connection_manager.AsyncModbusSerialClient", return_value=mock_client):
            result = await connection_manager.connect(
                port="COM5", baudrate=19200, parity="E", stopbits=2, bytesize=7, timeout=2
            )
            assert result is True
            assert connection_manager.client == mock_client
            assert connection_manager.connected_port == "COM5"

    @pytest.mark.asyncio
    async def test_connect_failure(self):
        """Test failed connection"""
        mock_client = AsyncMock()
        mock_client.connect = AsyncMock()
        mock_client.connected = False

        with patch("backend.services.connection_manager.AsyncModbusSerialClient", return_value=mock_client):
            result = await connection_manager.connect(port="COMX")
            assert result is False
            assert connection_manager.client is None
            assert connection_manager.connected_port is None

    @pytest.mark.asyncio
    async def test_disconnect_with_connection(self):
        """Test disconnect when connected"""
        mock_client = AsyncMock()
        mock_client.close = AsyncMock()
        mock_client.connected = True

        connection_manager.client = mock_client
        connection_manager.connected_port = "COM3"

        await connection_manager.disconnect()

        mock_client.close.assert_awaited_once()
        assert connection_manager.client is None
        assert connection_manager.connected_port is None

    @pytest.mark.asyncio
    async def test_disconnect_without_connection(self):
        """Test disconnect when not connected"""
        connection_manager.client = None
        connection_manager.connected_port = None

        await connection_manager.disconnect()

        assert connection_manager.client is None
        assert connection_manager.connected_port is None

    def test_get_client_success(self):
        """Test getting client when connected"""
        mock_client = Mock()
        mock_client.connected = True

        connection_manager.client = mock_client

        result = connection_manager.get_client()
        assert result == mock_client

    def test_get_client_failure(self):
        """Test getting client when not connected"""
        connection_manager.client = None

        with pytest.raises(RuntimeError, match="No active Modbus connection"):
            connection_manager.get_client()

    def test_get_status_connected(self):
        """Test status when connected"""
        connection_manager.client = AsyncMock()
        connection_manager.client.connected = True
        connection_manager.connected_port = "COM3"

        status = connection_manager.get_status()
        assert status["connected"] is True
        assert status["port"] == "COM3"

    def test_get_status_disconnected(self):
        """Test status when disconnected"""
        connection_manager.client = None
        connection_manager.connected_port = None

        result = connection_manager.get_status()

        expected = {"connected": False, "port": None}
        assert result == expected