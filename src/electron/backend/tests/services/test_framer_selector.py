import pytest
import sys
import types

from backend.services.framer_selector import get_framer


# ---------------- WINDOWS < 10 ----------------

def test_get_framer_windows_7(monkeypatch):
    monkeypatch.setattr("platform.system", lambda: "Windows")
    monkeypatch.setattr("platform.release", lambda: "7")

    # Create fake pymodbus.framer module
    fake_framer_module = types.ModuleType("pymodbus.framer")
    fake_class = object()
    fake_framer_module.ModbusRtuFramer = fake_class

    monkeypatch.setitem(sys.modules, "pymodbus.framer", fake_framer_module)

    framer = get_framer()
    assert framer == fake_class


# ---------------- WINDOWS >= 10 ----------------

def test_get_framer_windows_10(monkeypatch):
    monkeypatch.setattr("platform.system", lambda: "Windows")
    monkeypatch.setattr("platform.release", lambda: "10")

    fake_pymodbus = types.ModuleType("pymodbus")

    class FakeFramerType:
        RTU = "RTU_FAKE"

    fake_pymodbus.FramerType = FakeFramerType

    monkeypatch.setitem(sys.modules, "pymodbus", fake_pymodbus)

    framer = get_framer()
    assert framer == "RTU_FAKE"


# ---------------- LINUX ----------------

def test_get_framer_linux(monkeypatch):
    monkeypatch.setattr("platform.system", lambda: "Linux")

    fake_pymodbus = types.ModuleType("pymodbus")

    class FakeFramerType:
        RTU = "RTU_LINUX"

    fake_pymodbus.FramerType = FakeFramerType

    monkeypatch.setitem(sys.modules, "pymodbus", fake_pymodbus)

    framer = get_framer()
    assert framer == "RTU_LINUX"


# ---------------- IMPORT ERROR ----------------

def test_get_framer_import_error(monkeypatch):
    monkeypatch.setattr("platform.system", lambda: "Windows")
    monkeypatch.setattr("platform.release", lambda: "10")

    # Remove pymodbus completely
    monkeypatch.setitem(sys.modules, "pymodbus", None)

    framer = get_framer()
    assert framer is None