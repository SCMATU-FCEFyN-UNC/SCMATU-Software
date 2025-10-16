from .hello import hello_bp
from .connection import serial_bp
from .control import control_bp
from .monitoring import monitoring_bp
from .resonance import resonance_bp

def register_routes(app):
    app.register_blueprint(hello_bp)
    app.register_blueprint(serial_bp)
    app.register_blueprint(control_bp)
    app.register_blueprint(monitoring_bp)
    app.register_blueprint(resonance_bp)