# test_device_endpoints.py
import pytest
import json
from unittest.mock import Mock, patch
from flask import Flask
from backend.services.device_data_service import DeviceDataService


@pytest.fixture
def app():
    """Create a Flask app for testing."""
    app = Flask(__name__)
    app.config['TESTING'] = True
    
    # Import and register the blueprint
    from backend.routes.device import device_bp
    app.register_blueprint(device_bp)
    
    return app


@pytest.fixture
def client(app):
    """Create a test client for the Flask app."""
    return app.test_client()


class TestDeviceEndpoints:
    """Test cases for device endpoints."""
    
    def setup_method(self):
        """Setup before each test method."""
        self.mock_device_service = Mock(spec=DeviceDataService)
        self.service_patcher = patch('backend.routes.device.DeviceDataService', self.mock_device_service)
        self.service_patcher.start()
    
    def teardown_method(self):
        """Cleanup after each test method."""
        self.service_patcher.stop()
    
    def test_get_serial_number_success(self, client):
        """Test GET /serial_number successfully."""
        # Arrange
        expected_serial = "12345"
        self.mock_device_service.read_serial_number.return_value = expected_serial
        
        # Act
        response = client.get('/serial_number')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['serial_number'] == expected_serial
    
    def test_get_serial_number_failure(self, client):
        """Test GET /serial_number when service raises exception."""
        # Arrange
        self.mock_device_service.read_serial_number.side_effect = ValueError("Connection failed")
        
        # Act
        response = client.get('/serial_number')
        
        # Assert
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False
        assert "Connection failed" in data['error']
    
    def test_set_samples_amount_success(self, client):
        """Test POST /samples successfully."""
        # Arrange
        samples = 100
        expected_result = {"success": True, "samples": samples}
        self.mock_device_service.set_samples_amount.return_value = expected_result
        
        # Act
        response = client.post(
            '/samples',
            data=json.dumps({"samples": samples}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
        self.mock_device_service.set_samples_amount.assert_called_once_with(samples)
    
    def test_set_samples_amount_invalid(self, client):
        """Test POST /samples with invalid data."""
        # Arrange
        self.mock_device_service.set_samples_amount.side_effect = ValueError("Invalid samples")
        
        # Act
        response = client.post(
            '/samples',
            data=json.dumps({"samples": -1}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert "Invalid samples" in data['error']
    
    def test_set_adc_samples_amount(self, client):
        """Test POST /adc_samples."""
        # Arrange
        adc_samples = 50
        expected_result = {"success": True, "adc_samples": adc_samples}
        self.mock_device_service.set_adc_samples_amount.return_value = expected_result
        
        # Act
        response = client.post(
            '/adc_samples',
            data=json.dumps({"adc_samples": adc_samples}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
    
    def test_set_shunt_res_value(self, client):
        """Test POST /shunt_res."""
        # Arrange
        shunt_res = 10.5
        expected_result = {"success": True, "shunt_res": shunt_res}
        self.mock_device_service.set_shunt_res_value.return_value = expected_result
        
        # Act
        response = client.post(
            '/shunt_res',
            data=json.dumps({"shunt_res": shunt_res}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
    
    def test_set_voltage_gain(self, client):
        """Test POST /voltage_gain."""
        # Arrange
        gain = 2.5
        expected_result = {"success": True, "voltage_gain": gain}
        self.mock_device_service.set_voltage_adecuator_gain.return_value = expected_result
        
        # Act
        response = client.post(
            '/voltage_gain',
            data=json.dumps({"gain": gain}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
    
    def test_set_current_gain(self, client):
        """Test POST /current_gain."""
        # Arrange
        gain = 3.2
        expected_result = {"success": True, "current_gain": gain}
        self.mock_device_service.set_current_adecuator_gain.return_value = expected_result
        
        # Act
        response = client.post(
            '/current_gain',
            data=json.dumps({"gain": gain}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
    
    def test_set_phase_curr_max_distance(self, client):
        """Test POST /phase_curr_max_distance."""
        # Arrange
        distance = 15.7
        expected_result = {"success": True, "max_distance": distance}
        self.mock_device_service.set_phase_curr_max_distance.return_value = expected_result
        
        # Act
        response = client.post(
            '/phase_curr_max_distance',
            data=json.dumps({"distance": distance}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
    
    def test_set_auto_freq_sweep_width(self, client):
        """Test POST /auto_freq_sweep_width."""
        # Arrange
        width = 20.3
        expected_result = {"success": True, "sweep_width": width}
        self.mock_device_service.set_auto_freq_sweep_width.return_value = expected_result
        
        # Act
        response = client.post(
            '/auto_freq_sweep_width',
            data=json.dumps({"width": width}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
    
    def test_set_closed_loop_control_enable(self, client):
        """Test POST /closed_loop_control."""
        # Test enable
        expected_result = {"success": True, "closed_loop_enabled": True}
        self.mock_device_service.set_closed_loop_control_enable.return_value = expected_result
        
        response = client.post(
            '/closed_loop_control',
            data=json.dumps({"enabled": True}),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
        
        # Test missing enabled field
        response = client.post(
            '/closed_loop_control',
            data=json.dumps({}),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert "Missing 'enabled' field" in data['error']
    
    def test_set_closed_loop_control_period(self, client):
        """Test POST /closed_loop_control_period."""
        # Arrange
        period = 100
        expected_result = {"success": True, "control_period": period}
        self.mock_device_service.set_closed_loop_control_period.return_value = expected_result
        
        # Act
        response = client.post(
            '/closed_loop_control_period',
            data=json.dumps({"period": period}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
    
    def test_write_serial_number(self, client):
        """Test POST /serial_number."""
        # Arrange
        serial_number = "123456789"
        expected_result = {"success": True, "serial_number": 123456789}
        self.mock_device_service.write_serial_number.return_value = expected_result
        
        # Act
        response = client.post(
            '/serial_number',
            data=json.dumps({"serial_number": serial_number}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
    
    def test_write_serial_number_password(self, client):
        """Test POST /serial_number_password."""
        # Arrange
        password = 1234
        expected_result = {"success": True, "password_written": True}
        self.mock_device_service.set_serial_number_password.return_value = expected_result
        
        # Act
        response = client.post(
            '/serial_number_password',
            data=json.dumps({"password": password}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == expected_result
    
    def test_write_serial_number_password_invalid(self, client):
        """Test POST /serial_number_password with invalid password."""
        # Act
        response = client.post(
            '/serial_number_password',
            data=json.dumps({"password": "not_a_number"}),
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert "Invalid password" in data['error']
    
    def test_get_serial_number_write_status(self, client):
        """Test GET /serial_number_status."""
        # Arrange
        expected_status = 1
        self.mock_device_service.get_serial_number_write_status.return_value = expected_status
        
        # Act
        response = client.get('/serial_number_status')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['status'] == expected_status
    
    # --- Test GET endpoints for getters ---
    
    def test_get_samples_amount_endpoint(self, client):
        """Test GET /samples."""
        # Arrange
        expected_value = 100
        self.mock_device_service.get_samples_amount.return_value = expected_value
        
        # Act
        response = client.get('/samples')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['samples'] == expected_value
    
    def test_get_samples_amount_endpoint_service_exception(self, client):
        """Test GET /samples when service raises exception."""
        # Arrange
        self.mock_device_service.get_samples_amount.side_effect = ValueError("Test error")
        
        # Act
        response = client.get('/samples')
        
        # Assert
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False
        assert "error" in data
    
    def test_get_adc_samples_amount_endpoint(self, client):
        """Test GET /adc_samples."""
        # Arrange
        expected_value = 50
        self.mock_device_service.get_adc_samples_amount.return_value = expected_value
        
        # Act
        response = client.get('/adc_samples')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['adc_samples'] == expected_value
    
    def test_get_shunt_res_value_endpoint(self, client):
        """Test GET /shunt_res."""
        # Arrange
        expected_value = 10.5
        self.mock_device_service.get_shunt_res_value.return_value = expected_value
        
        # Act
        response = client.get('/shunt_res')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['shunt_res'] == expected_value
    
    def test_get_voltage_gain_endpoint(self, client):
        """Test GET /voltage_gain."""
        # Arrange
        expected_value = 2.5
        self.mock_device_service.get_voltage_adecuator_gain.return_value = expected_value
        
        # Act
        response = client.get('/voltage_gain')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['voltage_gain'] == expected_value
    
    def test_get_current_gain_endpoint(self, client):
        """Test GET /current_gain."""
        # Arrange
        expected_value = 3.2
        self.mock_device_service.get_current_adecuator_gain.return_value = expected_value
        
        # Act
        response = client.get('/current_gain')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['current_gain'] == expected_value
    
    def test_get_phase_curr_max_distance_endpoint(self, client):
        """Test GET /phase_curr_max_distance."""
        # Arrange
        expected_value = 15.7
        self.mock_device_service.get_phase_curr_max_distance.return_value = expected_value
        
        # Act
        response = client.get('/phase_curr_max_distance')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['max_distance'] == expected_value
    
    def test_get_auto_freq_sweep_width_endpoint(self, client):
        """Test GET /auto_freq_sweep_width."""
        # Arrange
        expected_value = 20.3
        self.mock_device_service.get_auto_freq_sweep_width.return_value = expected_value
        
        # Act
        response = client.get('/auto_freq_sweep_width')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['sweep_width'] == expected_value
    
    def test_get_closed_loop_control_enable_endpoint(self, client):
        """Test GET /closed_loop_control."""
        # Arrange
        expected_value = True
        self.mock_device_service.get_closed_loop_control_enable.return_value = expected_value
        
        # Act
        response = client.get('/closed_loop_control')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['closed_loop_enabled'] is expected_value
    
    def test_get_closed_loop_control_period_endpoint(self, client):
        """Test GET /closed_loop_control_period."""
        # Arrange
        expected_value = 100
        self.mock_device_service.get_closed_loop_control_period.return_value = expected_value
        
        # Act
        response = client.get('/closed_loop_control_period')
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['control_period'] == expected_value
    
    def test_endpoints_return_json_on_service_exception(self, client):
        """Test that all GET endpoints return JSON even when service raises exceptions."""
        endpoints = [
            '/samples',
            '/adc_samples',
            '/shunt_res',
            '/voltage_gain',
            '/current_gain',
            '/phase_curr_max_distance',
            '/auto_freq_sweep_width',
            '/closed_loop_control',
            '/closed_loop_control_period',
        ]
        
        # Map endpoints to their corresponding service method names
        endpoint_to_method = {
            '/samples': 'get_samples_amount',
            '/adc_samples': 'get_adc_samples_amount',
            '/shunt_res': 'get_shunt_res_value',
            '/voltage_gain': 'get_voltage_adecuator_gain',
            '/current_gain': 'get_current_adecuator_gain',
            '/phase_curr_max_distance': 'get_phase_curr_max_distance',
            '/auto_freq_sweep_width': 'get_auto_freq_sweep_width',
            '/closed_loop_control': 'get_closed_loop_control_enable',
            '/closed_loop_control_period': 'get_closed_loop_control_period',
        }
        
        for endpoint in endpoints:
            # Reset mock
            self.mock_device_service.reset_mock()
            
            # Set up the specific method to raise exception
            method_name = endpoint_to_method[endpoint]
            getattr(self.mock_device_service, method_name).side_effect = Exception("Test exception")
            
            # Make request
            response = client.get(endpoint)
            
            # Assert - should return 500 for generic exceptions
            # (Note: ValueError would return 400, but Exception returns 500)
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False
            assert "error" in data