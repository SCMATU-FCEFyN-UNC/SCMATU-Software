import pytest
from unittest.mock import Mock, patch, AsyncMock
import serial.tools.list_ports
from backend.services.connection_manager import manager


class TestConnectionManager:
    """Test suite for the ConnectionManager singleton."""

    def setup_method(self):
        """Reset state before each test."""
        manager.client = None
        manager.connected_port = None

    def test_list_ports(self, monkeypatch):
        """list_ports() should return formatted device list."""
        mock_ports = [
            Mock(device="COM3", description="USB Serial Device"),
            Mock(device="COM4", description="Arduino Uno"),
        ]
        monkeypatch.setattr(serial.tools.list_ports, "comports", lambda: mock_ports)

        result = manager.list_ports()
        expected = [
            {"device": "COM3", "description": "USB Serial Device"},
            {"device": "COM4", "description": "Arduino Uno"},
        ]
        assert result == expected

    def test_connect_success(self):
        """connect() should succeed if AsyncModbusSerialClient connects."""
        mock_client = AsyncMock()
        mock_client.connect = AsyncMock()
        mock_client.connected = True

        with patch("backend.services.connection_manager.AsyncModbusSerialClient", return_value=mock_client):
            ok = manager.connect(port="COM5", baudrate=19200)
            assert ok is True
            assert manager.client == mock_client
            assert manager.connected_port == "COM5"

    def test_connect_failure(self):
        """connect() should fail if client.connected is False."""
        mock_client = AsyncMock()
        mock_client.connect = AsyncMock()
        mock_client.connected = False

        with patch("backend.services.connection_manager.AsyncModbusSerialClient", return_value=mock_client):
            ok = manager.connect(port="COMX")
            assert ok is False
            assert manager.client is None
            assert manager.connected_port is None

    def test_disconnect_with_connection(self):
        """disconnect() should call client.close if client exists."""
        mock_client = AsyncMock()
        mock_client.connected = True
        mock_client.close = AsyncMock()

        manager.client = mock_client
        manager.connected_port = "COM3"

        manager.disconnect()
        # close() is async, but our wrapper calls it inside thread loop
        mock_client.close.assert_called()
        assert manager.client is None
        assert manager.connected_port is None

    def test_disconnect_without_connection(self):
        """disconnect() should do nothing if no client exists."""
        manager.client = None
        manager.connected_port = None

        manager.disconnect()
        assert manager.client is None
        assert manager.connected_port is None

    def test_read_holding_register(self):
        """read() should call modbus_functions.read_holding_register."""
        with patch("backend.services.connection_manager.read_holding_register", return_value=123) as mock_read:
            manager.client = Mock()
            manager.client.connected = True
            result = manager.read("holding", 20, 1)
            assert result == 123
            mock_read.assert_called_once_with(manager.client, 20, 1)

    def test_write_holding_register(self):
        """write() should call modbus_functions.write_holding_register."""
        with patch("backend.services.connection_manager.write_holding_register", return_value=True) as mock_write:
            manager.client = Mock()
            manager.client.connected = True
            result = manager.write("holding", 20, 2, 456)
            assert result is True
            mock_write.assert_called_once_with(manager.client, 20, 2, 456)

    def test_get_status_connected(self):
        """get_status() should reflect connection state."""
        manager.client = Mock()
        manager.client.connected = True
        manager.connected_port = "COM7"

        status = manager.get_status()
        assert status == {"connected": True, "port": "COM7"}

    def test_get_status_disconnected(self):
        """get_status() should return disconnected if no client."""
        manager.client = None
        manager.connected_port = None

        status = manager.get_status()
        assert status == {"connected": False, "port": None}
