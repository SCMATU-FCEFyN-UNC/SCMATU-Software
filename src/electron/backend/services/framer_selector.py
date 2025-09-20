import platform

def get_framer():
    """Select the appropriate Modbus Framer based on the OS."""
    os_name = platform.system()
    try:
        if os_name == "Windows":
            version_major = int(platform.release())
            if version_major < 10:  # Windows 7
                from pymodbus.framer import ModbusRtuFramer
                return ModbusRtuFramer
            else:  # Windows 10 and later
                from pymodbus import FramerType
                return FramerType.RTU
        else:
            from pymodbus import FramerType
            return FramerType.RTU
    except ImportError as e:
        print(f"Error importing required module: {e}")
        return None
