from pymodbus import ModbusException
from pymodbus.client import AsyncModbusSerialClient

async def write_holding_register(client: AsyncModbusSerialClient, slave_id: int, register_address: int, value: int) -> None:
    """Writes to a specific holding register of a specific slave."""
    try:
        # Write value to the holding register
        write_response = await client.write_register(register_address, value, slave=slave_id)
        if write_response.isError():
            print(f"Error writing to holding register {register_address} of slave {slave_id}: {write_response}")
        else:
            print(f"Successful write to holding register {register_address} of slave {slave_id}.")
    except ModbusException as exc:
        print(f"ModbusException while writing to holding register: {exc}")

async def read_holding_register(client: AsyncModbusSerialClient, slave_id: int, register_address: int) -> int:
    """Reads a specific holding register of a specific slave."""
    try:
        # Read the holding register
        read_response = await client.read_holding_registers(register_address, count=1, slave=slave_id)
        if read_response.isError():
            print(f"Error reading holding register {register_address} of slave {slave_id}: {read_response}")
        else:
            value = read_response.registers[0]
            print(f"Value of holding register {register_address} of slave {slave_id}: {value}")
            return value  # Returns the read value
    except ModbusException as exc:
        print(f"ModbusException while reading holding register: {exc}")
        return None  # Returns None in case of error

async def write_coil(client: AsyncModbusSerialClient, slave_id: int, coil_address: int, value: bool) -> None:
    """Writes to a specific coil of a specific slave."""
    try:
        # Write value to the coil
        write_response = await client.write_coil(coil_address, value, slave=slave_id)
        if write_response.isError():
            print(f"Error writing to coil {coil_address} of slave {slave_id}: {write_response}")
        else:
            print(f"Successful write to coil {coil_address} of slave {slave_id}.")
    except ModbusException as exc:
        print(f"ModbusException while writing to coil: {exc}")

async def read_input_register(client: AsyncModbusSerialClient, slave_id: int, input_register_address: int) -> int:
    """Reads a specific input register of a specific slave."""
    try:
        # Read the input register
        read_response = await client.read_input_registers(input_register_address, count=1, slave=slave_id)
        if read_response.isError():
            print(f"Error reading input register {input_register_address} of slave {slave_id}: {read_response}")
        else:
            value = read_response.registers[0]
            return value  # Returns the read value
    except ModbusException as exc:
        print(f"ModbusException while reading input register: {exc}")
        print("Closing connection...")
        try:
            client.close()
        except Exception as e:
            print(f"Error closing client: {e}")
        if not client.connected:
            print("Client is not connected, attempting reconnection...")
            await client.connect()
            if client.connected:
                print("Reconnection successful.")
            else:
                print("Could not reconnect. Exiting sensor detection.")
        return None  # Returns None in case of error