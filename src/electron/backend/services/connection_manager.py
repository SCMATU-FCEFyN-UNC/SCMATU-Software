import asyncio
import serial.tools.list_ports
from pymodbus.client import AsyncModbusSerialClient
from pymodbus import FramerType
from pymodbus import pymodbus_apply_logging_config

client = None  # Global reference to Modbus client
connected_port = None

def list_ports():
    """
    Return a list of available COM ports as dicts:
    [{"device": "COM3", "description": "USB Serial Device"}, ...]
    """
    ports = serial.tools.list_ports.comports()
    return [{"device": p.device, "description": p.description} for p in ports]

async def connect(port: str, baudrate: int = 9600):
    """
    Connect to a COM port and store client globally.
    Returns True if connection succeeds.
    """
    global client, connected_port
    pymodbus_apply_logging_config("WARNING")
    client = AsyncModbusSerialClient(
        port=port,
        framer=FramerType.RTU,
        baudrate=baudrate,
        bytesize=8,
        parity="N",
        stopbits=1,
        timeout=1,
    )
    await client.connect()
    if client.connected:
        connected_port = port
        return True
    client = None
    return False

async def disconnect():
    """Close connection if open."""
    global client, connected_port
    if client and client.connected:
        client.close()
    client = None
    connected_port = None

def get_client():
    """
    Return the current client instance.
    Raises RuntimeError if not connected.
    """
    if not client or not client.connected:
        raise RuntimeError("No active Modbus connection")
    return client

def get_status():
    """Return connection status as dict (for API /status)."""
    return {
        "connected": bool(client and client.connected),
        "port": connected_port,
    }
