from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.extensions import init_extensions
from backend.routes.public_routes import public_bp
from backend.routes.portfolio_routes import portfolio_bp


def create_app(config_class=Config):
    """Creates and configures the Flask application."""
    app = Flask(__name__)

    app.config.from_object(config_class)

    init_extensions(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(public_bp)
    app.register_blueprint(portfolio_bp)

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error"}), 500

    return app
