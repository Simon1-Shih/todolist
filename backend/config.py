import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'focusflow-secret-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI', 'sqlite:///E:/focusflow/backend/instance/focusflow.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'default': DevelopmentConfig,
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}
