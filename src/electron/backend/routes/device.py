from flask import Blueprint, request, jsonify
from backend.services.device_data_service import DeviceDataService

device_bp = Blueprint("device", __name__)

@device_bp.route("/serial_number", methods=["GET"])
def get_serial_number_endpoint():
    """Read the serial number from input register 1."""
    try:
        serial_number = DeviceDataService.read_serial_number()
        return jsonify({"success": True, "serial_number": serial_number}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@device_bp.route("/samples", methods=["POST"])
def set_samples_amount_endpoint():
    """Set the number of samples for each phase measurement in holding register 8."""
    data = request.get_json() or {}
    samples = int(data.get("samples", 0))

    try:
        result = DeviceDataService.set_samples_amount(samples)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/adc_samples", methods=["POST"])
def set_adc_samples_amount_endpoint():
    """Set the ADC samples amount in holding register 17."""
    data = request.get_json() or {}
    adc_samples = int(data.get("adc_samples", 0))

    try:
        result = DeviceDataService.set_adc_samples_amount(adc_samples)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/shunt_res", methods=["POST"])
def set_shunt_res_value_endpoint():
    """Set the shunt resistor value in holding register 16."""
    data = request.get_json() or {}
    shunt_res = float(data.get("shunt_res", 0))

    try:
        result = DeviceDataService.set_shunt_res_value(shunt_res)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/voltage_gain", methods=["POST"])
def set_voltage_adecuator_gain_endpoint():
    """Set the voltage adecuator gain in holding register 14."""
    data = request.get_json() or {}
    gain = float(data.get("gain", 0))

    try:
        result = DeviceDataService.set_voltage_adecuator_gain(gain)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/current_gain", methods=["POST"])
def set_current_adecuator_gain_endpoint():
    """Set the current adecuator gain in holding register 15."""
    data = request.get_json() or {}
    gain = float(data.get("gain", 0))

    try:
        result = DeviceDataService.set_current_adecuator_gain(gain)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/phase_curr_max_distance", methods=["POST"])
def set_phase_curr_max_distance_endpoint():
    """Set the maximum distance between the best current frequency and the best phase frequency in holding register 18."""
    data = request.get_json() or {}
    distance = float(data.get("distance", 0))

    try:
        result = DeviceDataService.set_phase_curr_max_distance(distance)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/auto_freq_sweep_width", methods=["POST"])
def set_auto_freq_sweep_width_endpoint():
    """Set the auto frequency sweep width in holding register 19."""
    data = request.get_json() or {}
    width = float(data.get("width", 0))

    try:
        result = DeviceDataService.set_auto_freq_sweep_width(width)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/closed_loop_control", methods=["POST"])
def set_closed_loop_control_enable_endpoint():
    """Enable or disable closed loop control in holding register 20."""
    data = request.get_json() or {}
    enabled = data.get("enabled")

    if enabled is None:
        return jsonify({"success": False, "error": "Missing 'enabled' field"}), 400

    try:
        result = DeviceDataService.set_closed_loop_control_enable(bool(enabled))
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/closed_loop_control_period", methods=["POST"])
def set_closed_loop_control_period_endpoint():
    """Set the closed loop control period in holding register 21."""
    data = request.get_json() or {}
    period = int(data.get("period", 0))

    try:
        result = DeviceDataService.set_closed_loop_control_period(period)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/serial_number", methods=["POST"])
def write_serial_number_endpoint():
    """Write the serial number to holding register 22 (HR22)."""
    data = request.get_json() or {}
    serial_number = data.get("serial_number", "")

    try:
        result = DeviceDataService.write_serial_number(serial_number)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/serial_number_password", methods=["POST"])
def write_serial_number_password_endpoint():
    """Write password to holding register 23 (HR23)."""
    data = request.get_json() or {}
    try:
        password = int(data.get("password"))
    except Exception:
        return jsonify({"success": False, "error": "Invalid password (must be integer)"}), 400

    try:
        result = DeviceDataService.set_serial_number_password(password)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400

@device_bp.route("/serial_number_status", methods=["GET"])
def get_serial_number_write_status_endpoint():
    """Get the status of the last serial number write attempt from holding register 24."""
    try:
        status = DeviceDataService.get_serial_number_write_status()
        return jsonify({"success": True, "status": status}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --- Added GET endpoints for getters in DeviceDataService ---

@device_bp.route("/samples", methods=["GET"])
def get_samples_amount_endpoint():
    """Get the number of samples for each phase measurement (HR8)."""
    try:
        val = DeviceDataService.get_samples_amount()
        return jsonify({"success": True, "samples": val}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@device_bp.route("/adc_samples", methods=["GET"])
def get_adc_samples_amount_endpoint():
    """Get ADC samples amount (HR17)."""
    try:
        val = DeviceDataService.get_adc_samples_amount()
        return jsonify({"success": True, "adc_samples": val}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@device_bp.route("/shunt_res", methods=["GET"])
def get_shunt_res_value_endpoint():
    """Get shunt resistor value (HR16)."""
    try:
        val = DeviceDataService.get_shunt_res_value()
        return jsonify({"success": True, "shunt_res": val}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@device_bp.route("/voltage_gain", methods=["GET"])
def get_voltage_adecuator_gain_endpoint():
    """Get voltage adecuator gain (HR14)."""
    try:
        val = DeviceDataService.get_voltage_adecuator_gain()
        return jsonify({"success": True, "voltage_gain": val}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@device_bp.route("/current_gain", methods=["GET"])
def get_current_adecuator_gain_endpoint():
    """Get current adecuator gain (HR15)."""
    try:
        val = DeviceDataService.get_current_adecuator_gain()
        return jsonify({"success": True, "current_gain": val}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@device_bp.route("/phase_curr_max_distance", methods=["GET"])
def get_phase_curr_max_distance_endpoint():
    """Get phase-current max distance (HR18)."""
    try:
        val = DeviceDataService.get_phase_curr_max_distance()
        return jsonify({"success": True, "max_distance": val}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@device_bp.route("/auto_freq_sweep_width", methods=["GET"])
def get_auto_freq_sweep_width_endpoint():
    """Get auto frequency sweep width (HR19)."""
    try:
        val = DeviceDataService.get_auto_freq_sweep_width()
        return jsonify({"success": True, "sweep_width": val}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@device_bp.route("/closed_loop_control", methods=["GET"])
def get_closed_loop_control_enable_endpoint():
    """Get closed loop control enable state (HR20)."""
    try:
        val = DeviceDataService.get_closed_loop_control_enable()
        return jsonify({"success": True, "closed_loop_enabled": bool(val)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@device_bp.route("/closed_loop_control_period", methods=["GET"])
def get_closed_loop_control_period_endpoint():
    """Get closed loop control period (HR21)."""
    try:
        val = DeviceDataService.get_closed_loop_control_period()
        return jsonify({"success": True, "control_period": val}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500