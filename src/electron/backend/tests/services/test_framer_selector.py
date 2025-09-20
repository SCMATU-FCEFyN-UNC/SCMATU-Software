import pytest
import sys

# Import the function under test
from backend.services.framer_selector import get_framer


def test_get_framer_windows_7(monkeypatch):
    """Should return ModbusRtuFramer for Windows < 10."""
    monkeypatch.setattr("platform.system", lambda: "Windows")
    monkeypatch.setattr("platform.release", lambda: "7")

    # Patch pymodbus.framer.ModbusRtuFramer to avoid import errors if not installed
    sys.modules["pymodbus.framer"] = __import__("types")  # dummy
    from types import SimpleNamespace
    dummy_framer = SimpleNamespace()
    sys.modules["pymodbus.framer"].ModbusRtuFramer = dummy_framer

    framer = get_framer()
    assert framer == dummy_framer


def test_get_framer_windows_10(monkeypatch):
    """Should return FramerType.RTU for Windows >= 10."""
    monkeypatch.setattr("platform.system", lambda: "Windows")
    monkeypatch.setattr("platform.release", lambda: "10")

    from pymodbus import FramerType
    framer = get_framer()
    assert framer == FramerType.RTU


def test_get_framer_linux(monkeypatch):
    """Should return FramerType.RTU for Linux."""
    monkeypatch.setattr("platform.system", lambda: "Linux")

    from pymodbus import FramerType
    framer = get_framer()
    assert framer == FramerType.RTU


def test_get_framer_import_error(monkeypatch):
    """Should handle ImportError gracefully and return None."""
    monkeypatch.setattr("platform.system", lambda: "Windows")
    monkeypatch.setattr("platform.release", lambda: "10")

    import builtins
    original_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name.startswith("pymodbus"):
            raise ImportError("Simulated import error")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    try:
        from backend.services.framer_selector import get_framer
        assert get_framer() is None
    finally:
        builtins.__import__ = original_import
