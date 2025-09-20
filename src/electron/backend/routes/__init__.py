from .hello import hello_bp
from .connection import serial_bp

def register_routes(app):
    app.register_blueprint(hello_bp)
    app.register_blueprint(serial_bp)