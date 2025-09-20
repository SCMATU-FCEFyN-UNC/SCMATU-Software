import asyncio
import serial.tools.list_ports
from pymodbus.client import AsyncModbusSerialClient
import inspect
from pymodbus import pymodbus_apply_logging_config
from backend.services.framer_selector import get_framer

client = None  # Global reference to Modbus client
connected_port = None

def list_ports():
    """
    Return a list of available COM ports as dicts:
    [{"device": "COM3", "description": "USB Serial Device"}, ...]
    """
    ports = serial.tools.list_ports.comports()
    return [{"device": p.device, "description": p.description} for p in ports]

async def connect(
    port: str, 
    baudrate: int = 9600, 
    bytesize: int = 8,
    parity: str = "N", 
    stopbits: int = 1, 
    timeout: float = 1.0
):
    """
    Connect to a COM port and store client globally.
    Returns True if connection succeeds.
    """
    global client, connected_port
    pymodbus_apply_logging_config("WARNING")

    framer = get_framer()
    if framer is None:
        print("❌ No valid framer available.")
        return False

    client = AsyncModbusSerialClient(
        port=port,
        framer=framer,
        baudrate=baudrate,
        bytesize=bytesize,
        parity=parity,
        stopbits=stopbits,
        timeout=timeout,
    )

    await client.connect()
    if client.connected:
        connected_port = port
        return True
    client = None
    return False

async def disconnect():
    """
    Close the current Modbus connection (if any).
    Supports both async and sync client.close() implementations.
    """
    global client, connected_port
    if client:
        try:
            close_method = getattr(client, "close", None)
            if close_method:
                if inspect.iscoroutinefunction(close_method):
                    await close_method()
                else:
                    close_method()
        except Exception as e:
            print(f"Error while closing client: {e}")
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
