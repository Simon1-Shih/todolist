import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / 'backend' / 'instance'

load_dotenv(BASE_DIR / '.env.development.local')
load_dotenv(BASE_DIR / '.env.local')


def get_database_uri():
    database_url = (
        os.environ.get('DATABASE_URL')
        or os.environ.get('POSTGRES_URL')
        or os.environ.get('DATABASE_URI')
    )
    if database_url:
        if database_url.startswith('postgres://'):
            return database_url.replace('postgres://', 'postgresql+psycopg://', 1)
        if database_url.startswith('postgresql://'):
            return database_url.replace('postgresql://', 'postgresql+psycopg://', 1)
        return database_url

    db_path = INSTANCE_DIR / 'focusflow.db'
    return f'sqlite:///{db_path}'


def get_engine_options(database_uri):
    options = {
        'pool_pre_ping': True,
    }

    # SQLite 只用於本機開發；硬塞 QueuePool 參數可能破壞它的預設連線池。
    if database_uri.startswith('sqlite:'):
        return options

    parsed = urlparse(database_uri)
    if parsed.scheme.startswith('postgresql'):
        return {
            **options,
            # Vercel 會開出多個短生命週期的 Function instance。
            # 每個 instance 的 pool 必須小，否則 Neon/Postgres 連線數會被瞬間打爆。
            'pool_size': int(os.environ.get('DB_POOL_SIZE', '1')),
            'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', '2')),
            'pool_timeout': int(os.environ.get('DB_POOL_TIMEOUT', '10')),
            'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', '300')),
        }

    return options


def get_cors_origins():
    configured_origins = os.environ.get('CORS_ORIGINS')
    if configured_origins:
        return [origin.strip().rstrip('/') for origin in configured_origins.split(',') if origin.strip()]

    frontend_base_url = os.environ.get('FRONTEND_BASE_URL')
    app_base_url = os.environ.get('APP_BASE_URL')
    origins = []
    for origin in (frontend_base_url, app_base_url):
        if origin:
            origins.append(origin.rstrip('/'))
    return origins


DATABASE_URI = get_database_uri()


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    APP_BASE_URL = os.environ.get('APP_BASE_URL')
    FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL')
    CORS_ORIGINS = get_cors_origins()
    ACCESS_COOKIE_NAME = os.environ.get('ACCESS_COOKIE_NAME', 'access_token')
    CSRF_COOKIE_NAME = os.environ.get('CSRF_COOKIE_NAME', 'csrf_token')
    ACCESS_TOKEN_EXPIRES_SECONDS = int(os.environ.get('ACCESS_TOKEN_EXPIRES_SECONDS', '86400'))
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_CONFIG') == 'production'
    SQLALCHEMY_DATABASE_URI = DATABASE_URI
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = get_engine_options(DATABASE_URI)
    BOOTSTRAP_DB_ON_STARTUP = False


class DevelopmentConfig(Config):
    DEBUG = True
    SECRET_KEY = Config.SECRET_KEY or 'dev-only-change-me'
    CORS_ORIGINS = sorted(set(Config.CORS_ORIGINS + ['http://localhost:3000']))
    BOOTSTRAP_DB_ON_STARTUP = True


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True


config = {
    'default': DevelopmentConfig,
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}
