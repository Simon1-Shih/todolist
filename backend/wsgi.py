import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from flask import Flask
from flask_cors import CORS

from backend.auth import init_auth
from backend.config import config
from backend.migrations import run_startup_migrations
from backend.models import db
from backend.views import api_bp


def create_app(config_name='default'):
    app = Flask(__name__)
    config_class = config[config_name]
    app.config.from_object(config_class)
    if config_name == 'production' and not app.config.get('SECRET_KEY'):
        raise RuntimeError('SECRET_KEY is required in production')

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get('CORS_ORIGINS', [])}},
        supports_credentials=True,
        allow_headers=['Content-Type', 'X-CSRF-Token'],
        methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    )
    init_auth(app)
    db.init_app(app)
    app.register_blueprint(api_bp, url_prefix='/api')

    if app.config.get('BOOTSTRAP_DB_ON_STARTUP'):
        with app.app_context():
            db.create_all()
        run_startup_migrations(app)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
