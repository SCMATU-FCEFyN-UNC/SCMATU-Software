from .connection_routes import serial_bp
from .control_routes import control_bp
from .monitoring_routes import monitoring_bp
from .resonance_routes import resonance_bp
from .device_routes import device_bp
from .folders_routes import folders_bp

def register_routes(app):
    app.register_blueprint(serial_bp)
    app.register_blueprint(control_bp)
    app.register_blueprint(monitoring_bp)
    app.register_blueprint(resonance_bp)
    app.register_blueprint(device_bp)
    app.register_blueprint(folders_bp)