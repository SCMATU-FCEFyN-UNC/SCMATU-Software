import asyncio
import threading
import inspect
import serial.tools.list_ports
from pymodbus.client import AsyncModbusSerialClient
from pymodbus import pymodbus_apply_logging_config
from backend.services.framer_selector import get_framer
from backend.services.modbus_functions import *

class ConnectionManager:
    def __init__(self):
        self.client = None
        self.connected_port = None

        # Background event loop running forever
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def _run_loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    # ------------------------
    # Serial port listing
    # ------------------------
    @staticmethod
    def list_ports():
        """Return available COM ports."""
        ports = serial.tools.list_ports.comports()
        return [{"device": p.device, "description": p.description} for p in ports]

    # ------------------------
    # Connection management
    # ------------------------
    async def _connect(
        self,
        port: str,
        baudrate: int = 9600,
        bytesize: int = 8,
        parity: str = "N",
        stopbits: int = 1,
        timeout: float = 1.0,
    ):
        pymodbus_apply_logging_config("WARNING")
        framer = get_framer()
        if framer is None:
            print("[X] No valid framer available.")
            return False

        self.client = AsyncModbusSerialClient(
            port=port,
            baudrate=baudrate,
            bytesize=bytesize,
            parity=parity,
            stopbits=stopbits,
            timeout=timeout,
            framer=framer,
        )

        await self.client.connect()
        if not self.client.connected:
            self.client = None
            return False

        self.connected_port = port
        print(f"[OK] Connected on {port}")
        return True

    def connect(self, **params) -> bool:
        """Sync wrapper for async connect()."""
        print("Connecting with params:", params)
        fut = asyncio.run_coroutine_threadsafe(self._connect(**params), self.loop)

        if fut.result() is False:
            print("[X] Connection failed.")
            return False
        else:
            print("[OK] Connection successful.")
            return True

    async def _disconnect(self):
        if self.client:
            try:
                close_method = getattr(self.client, "close", None)
                if close_method:
                    if inspect.iscoroutinefunction(close_method):
                        await close_method()
                    else:
                        close_method()
            except Exception as e:
                print(f"Error closing client: {e}")

        self.client = None
        self.connected_port = None
        print("[OK] Disconnected")

    def disconnect(self):
        print("Disconnecting...")
        fut = asyncio.run_coroutine_threadsafe(self._disconnect(), self.loop)
        return fut.result()

    # ------------------------
    # Generic Modbus operations
    # ------------------------
    async def _read(self, op: str, slave: int, address: int, count: int = 1):
        if not self.client or not self.client.connected:
            raise RuntimeError("No active Modbus connection")

        if op == "holding":
            if count == 1:
                return await read_holding_register(self.client, slave, address)
            else:
                # implement batch later if needed
                raise NotImplementedError("Multiple holding register read not implemented")
        elif op == "input":
            return await read_input_register(self.client, slave, address)
        else:
            raise ValueError(f"Unsupported read op: {op}")

    def read(self, op: str, slave: int, address: int, count: int = 1):
        fut = asyncio.run_coroutine_threadsafe(
            self._read(op, slave, address, count), self.loop
        )
        return fut.result()

    async def _write(self, op: str, slave: int, address: int, value):
        if not self.client or not self.client.connected:
            raise RuntimeError("No active Modbus connection")

        if op == "coil":
            return await write_coil(self.client, slave, address, value)
        elif op == "holding":
            return await write_holding_register(self.client, slave, address, value) 
        else:
            raise ValueError(f"Unsupported write op: {op}")

    def write(self, op: str, slave: int, address: int, value):
        fut = asyncio.run_coroutine_threadsafe(
            self._write(op, slave, address, value), self.loop
        )
        return fut.result()

    # ------------------------
    # Status
    # ------------------------
    def get_status(self):
        print("Getting connection status...")
        return {
            "connected": bool(self.client and self.client.connected),
            "port": self.connected_port,
        }

# ✅ Singleton instance for the whole app
manager = ConnectionManager()
