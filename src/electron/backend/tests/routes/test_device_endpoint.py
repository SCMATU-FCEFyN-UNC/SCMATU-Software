# test_device_endpoints.py
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from flask import Flask
from backend.routes.device_routes import device_bp
from backend.services.device_data_service import DeviceDataService


@pytest.fixture
def app():
    """Create a Flask app for testing."""
    app = Flask(__name__)
    app.config['TESTING'] = True
    
    # Register the blueprint directly (correct import path)
    app.register_blueprint(device_bp)
    
    return app


@pytest.fixture
def client(app):
    """Create a test client for the Flask app."""
    return app.test_client()


class TestDeviceEndpoints:
    """Test cases for device endpoints."""
    
    def test_get_serial_number_success(self, client):
        """Test GET /serial_number successfully."""
        # Arrange
        expected_serial = "12345"
        
        # Act
        with patch.object(DeviceDataService, 'read_serial_number', return_value=expected_serial):
            response = client.get('/serial_number')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['serial_number'] == expected_serial
    
    def test_get_serial_number_failure(self, client):
        """Test GET /serial_number when service raises exception."""
        # Arrange
        with patch.object(DeviceDataService, 'read_serial_number', side_effect=ValueError("Connection failed")):
            # Act
            response = client.get('/serial_number')
        
        # Assert
        assert response.status_code == 500
        data = response.get_json()
        assert data['success'] is False
        assert "Connection failed" in data['error']
    
    def test_set_samples_amount_success(self, client):
        """Test POST /samples successfully."""
        # Arrange
        samples = 100
        expected_result = {"success": True, "samples": samples}
        
        # Act
        with patch.object(DeviceDataService, 'set_samples_amount', return_value=expected_result) as mock_method:
            response = client.post(
                '/samples',
                json={"samples": samples}
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(samples)
    
    def test_set_samples_amount_invalid(self, client):
        """Test POST /samples with invalid data."""
        # Arrange
        with patch.object(DeviceDataService, 'set_samples_amount', side_effect=ValueError("Invalid samples")):
            # Act
            response = client.post(
                '/samples',
                json={"samples": -1}
            )
        
        # Assert
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert "Invalid samples" in data['error']
    
    def test_set_samples_amount_missing_data(self, client):
        """Test POST /samples with missing samples field."""
        # Arrange - mock the service to return success even with default value 0
        expected_result = {"success": True, "samples": 0}
        
        # Act
        with patch.object(DeviceDataService, 'set_samples_amount', return_value=expected_result) as mock_method:
            response = client.post('/samples', json={})
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(0)  # Should be called with default value 0
    
    def test_set_adc_samples_amount(self, client):
        """Test POST /adc_samples."""
        # Arrange
        adc_samples = 50
        expected_result = {"success": True, "adc_samples": adc_samples}
        
        # Act
        with patch.object(DeviceDataService, 'set_adc_samples_amount', return_value=expected_result) as mock_method:
            response = client.post(
                '/adc_samples',
                json={"adc_samples": adc_samples}
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(adc_samples)
    
    def test_set_shunt_res_value(self, client):
        """Test POST /shunt_res."""
        # Arrange
        shunt_res = 10.5
        expected_result = {"success": True, "shunt_res": shunt_res}
        
        # Act
        with patch.object(DeviceDataService, 'set_shunt_res_value', return_value=expected_result) as mock_method:
            response = client.post(
                '/shunt_res',
                json={"shunt_res": shunt_res}
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(shunt_res)
    
    def test_set_voltage_gain(self, client):
        """Test POST /voltage_gain."""
        # Arrange
        gain = 2.5
        expected_result = {"success": True, "voltage_gain": gain}
        
        # Act
        with patch.object(DeviceDataService, 'set_voltage_adecuator_gain', return_value=expected_result) as mock_method:
            response = client.post(
                '/voltage_gain',
                json={"gain": gain}
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(gain)
    
    def test_set_current_gain(self, client):
        """Test POST /current_gain."""
        # Arrange
        gain = 3.2
        expected_result = {"success": True, "current_gain": gain}
        
        # Act
        with patch.object(DeviceDataService, 'set_current_adecuator_gain', return_value=expected_result) as mock_method:
            response = client.post(
                '/current_gain',
                json={"gain": gain}
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(gain)
    
    def test_set_phase_curr_max_distance(self, client):
        """Test POST /phase_curr_max_distance."""
        # Arrange
        distance = 15.7
        expected_result = {"success": True, "max_distance": distance}
        
        # Act
        with patch.object(DeviceDataService, 'set_phase_curr_max_distance', return_value=expected_result) as mock_method:
            response = client.post(
                '/phase_curr_max_distance',
                json={"distance": distance}
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(distance)
    
    def test_set_auto_freq_sweep_width(self, client):
        """Test POST /auto_freq_sweep_width."""
        # Arrange
        width = 20.3
        expected_result = {"success": True, "sweep_width": width}
        
        # Act
        with patch.object(DeviceDataService, 'set_auto_freq_sweep_width', return_value=expected_result) as mock_method:
            response = client.post(
                '/auto_freq_sweep_width',
                json={"width": width}
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(width)
    
    def test_set_closed_loop_control_enable(self, client):
        """Test POST /closed_loop_control."""
        # Test enable
        expected_result = {"success": True, "closed_loop_enabled": True}
        
        with patch.object(DeviceDataService, 'set_closed_loop_control_enable', return_value=expected_result) as mock_method:
            response = client.post(
                '/closed_loop_control',
                json={"enabled": True}
            )
            
            assert response.status_code == 200
            data = response.get_json()
            assert data == expected_result
            mock_method.assert_called_once_with(True)
        
        # Test missing enabled field
        response = client.post(
            '/closed_loop_control',
            json={}
        )
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert "Missing 'enabled' field" in data['error']
    
    def test_set_closed_loop_control_period(self, client):
        """Test POST /closed_loop_control_period."""
        # Arrange
        period = 100
        expected_result = {"success": True, "control_period": period}
        
        # Act
        with patch.object(DeviceDataService, 'set_closed_loop_control_period', return_value=expected_result) as mock_method:
            response = client.post(
                '/closed_loop_control_period',
                json={"period": period}
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(period)
    
    def test_write_serial_number(self, client):
        """Test POST /serial_number (write)."""
        # Arrange
        serial_number = "123456789"
        expected_result = {"success": True, "serial_number": 123456789}
        
        # Act
        with patch.object(DeviceDataService, 'write_serial_number', return_value=expected_result) as mock_method:
            response = client.post(
                '/serial_number',
                json={"serial_number": serial_number}
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(serial_number)
    
    def test_write_serial_number_password(self, client):
        """Test POST /serial_number_password."""
        # Arrange
        password = 1234
        expected_result = {"success": True, "password_written": True}
        
        # Act
        with patch.object(DeviceDataService, 'set_serial_number_password', return_value=expected_result) as mock_method:
            response = client.post(
                '/serial_number_password',
                json={"password": password}
            )
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data == expected_result
        mock_method.assert_called_once_with(password)
    
    def test_write_serial_number_password_invalid(self, client):
        """Test POST /serial_number_password with invalid password."""
        # Act
        response = client.post(
            '/serial_number_password',
            json={"password": "not_a_number"}
        )
        
        # Assert
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert "Invalid password" in data['error']
    
    def test_get_serial_number_write_status(self, client):
        """Test GET /serial_number_status."""
        # Arrange
        expected_status = 1
        
        # Act
        with patch.object(DeviceDataService, 'get_serial_number_write_status', return_value=expected_status):
            response = client.get('/serial_number_status')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['status'] == expected_status
    
    # --- Test GET endpoints for getters ---
    
    def test_get_samples_amount_endpoint(self, client):
        """Test GET /samples."""
        # Arrange
        expected_value = 100
        
        # Act
        with patch.object(DeviceDataService, 'get_samples_amount', return_value=expected_value):
            response = client.get('/samples')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['samples'] == expected_value
    
    def test_get_samples_amount_endpoint_service_exception(self, client):
        """Test GET /samples when service raises exception."""
        # Arrange
        with patch.object(DeviceDataService, 'get_samples_amount', side_effect=ValueError("Test error")):
            # Act
            response = client.get('/samples')
        
        # Assert
        assert response.status_code == 500
        data = response.get_json()
        assert data['success'] is False
        assert "error" in data
    
    def test_get_adc_samples_amount_endpoint(self, client):
        """Test GET /adc_samples."""
        # Arrange
        expected_value = 50
        
        # Act
        with patch.object(DeviceDataService, 'get_adc_samples_amount', return_value=expected_value):
            response = client.get('/adc_samples')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['adc_samples'] == expected_value
    
    def test_get_shunt_res_value_endpoint(self, client):
        """Test GET /shunt_res."""
        # Arrange
        expected_value = 10.5
        
        # Act
        with patch.object(DeviceDataService, 'get_shunt_res_value', return_value=expected_value):
            response = client.get('/shunt_res')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['shunt_res'] == expected_value
    
    def test_get_voltage_gain_endpoint(self, client):
        """Test GET /voltage_gain."""
        # Arrange
        expected_value = 2.5
        
        # Act
        with patch.object(DeviceDataService, 'get_voltage_adecuator_gain', return_value=expected_value):
            response = client.get('/voltage_gain')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['voltage_gain'] == expected_value
    
    def test_get_current_gain_endpoint(self, client):
        """Test GET /current_gain."""
        # Arrange
        expected_value = 3.2
        
        # Act
        with patch.object(DeviceDataService, 'get_current_adecuator_gain', return_value=expected_value):
            response = client.get('/current_gain')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['current_gain'] == expected_value
    
    def test_get_phase_curr_max_distance_endpoint(self, client):
        """Test GET /phase_curr_max_distance."""
        # Arrange
        expected_value = 15.7
        
        # Act
        with patch.object(DeviceDataService, 'get_phase_curr_max_distance', return_value=expected_value):
            response = client.get('/phase_curr_max_distance')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['max_distance'] == expected_value
    
    def test_get_auto_freq_sweep_width_endpoint(self, client):
        """Test GET /auto_freq_sweep_width."""
        # Arrange
        expected_value = 20.3
        
        # Act
        with patch.object(DeviceDataService, 'get_auto_freq_sweep_width', return_value=expected_value):
            response = client.get('/auto_freq_sweep_width')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['sweep_width'] == expected_value
    
    def test_get_closed_loop_control_enable_endpoint(self, client):
        """Test GET /closed_loop_control."""
        # Arrange
        expected_value = True
        
        # Act
        with patch.object(DeviceDataService, 'get_closed_loop_control_enable', return_value=expected_value):
            response = client.get('/closed_loop_control')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['closed_loop_enabled'] is expected_value
    
    def test_get_closed_loop_control_period_endpoint(self, client):
        """Test GET /closed_loop_control_period."""
        # Arrange
        expected_value = 100
        
        # Act
        with patch.object(DeviceDataService, 'get_closed_loop_control_period', return_value=expected_value):
            response = client.get('/closed_loop_control_period')
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['control_period'] == expected_value