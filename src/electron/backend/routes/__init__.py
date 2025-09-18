from .hello import hello_bp

def register_routes(app):
    app.register_blueprint(hello_bp)