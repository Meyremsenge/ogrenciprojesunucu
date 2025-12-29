import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # SQLAlchemy
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 2592000))
    )
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # Redis
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    REDIS_ENABLED = os.getenv('REDIS_ENABLED', 'True').lower() == 'true'
    
    # Celery
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/1')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/2')
    
    # YouTube API
    YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
    YOUTUBE_CLIENT_ID = os.getenv('YOUTUBE_CLIENT_ID')
    YOUTUBE_CLIENT_SECRET = os.getenv('YOUTUBE_CLIENT_SECRET')
    
    # AWS S3
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_S3_BUCKET = os.getenv('AWS_S3_BUCKET')
    AWS_S3_REGION = os.getenv('AWS_S3_REGION', 'eu-central-1')
    
    # Email
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')
    
    # Pagination
    DEFAULT_PAGE_SIZE = int(os.getenv('DEFAULT_PAGE_SIZE', 20))
    MAX_PAGE_SIZE = int(os.getenv('MAX_PAGE_SIZE', 100))
    
    # Rate Limiting
    RATELIMIT_ENABLED = os.getenv('RATELIMIT_ENABLED', 'True').lower() == 'true'
    RATELIMIT_DEFAULT = os.getenv('RATELIMIT_DEFAULT', '200/minute')
    
    # Application
    APP_NAME = os.getenv('APP_NAME', 'Student Coaching Platform')
    APP_URL = os.getenv('APP_URL', 'http://localhost:5000')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    
    # ==========================================================================
    # AI Module Configuration
    # ==========================================================================
    # AI Provider: 'mock' (geliştirme) veya 'openai' (prodüksiyon)
    AI_PROVIDER = os.getenv('AI_PROVIDER', 'mock')
    
    # OpenAI Configuration (GPT entegrasyonu için)
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    OPENAI_MAX_TOKENS = int(os.getenv('OPENAI_MAX_TOKENS', 1000))
    OPENAI_TEMPERATURE = float(os.getenv('OPENAI_TEMPERATURE', 0.7))
    
    # AI Mock Settings
    AI_MOCK_DELAY_MIN = float(os.getenv('AI_MOCK_DELAY_MIN', 0.3))
    AI_MOCK_DELAY_MAX = float(os.getenv('AI_MOCK_DELAY_MAX', 1.0))


class DevelopmentConfig(Config):
    """Development configuration."""
    
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        "sqlite:///data.db"
    )
    # SQL Echo kapalı - performans için (debug gerekirse True yapın)
    SQLALCHEMY_ECHO = os.getenv('SQLALCHEMY_ECHO', 'False').lower() == 'true'
    
    # Development için optimize edilmiş pool ayarları
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_size': 5,
        'max_overflow': 10,
    }
    
    # Request logging - performans için opsiyonel
    REQUEST_LOGGING_ENABLED = os.getenv('REQUEST_LOGGING_ENABLED', 'False').lower() == 'true'
    
    # Redis - development'ta Redis yoksa False yapın (büyük performans artışı)
    REDIS_ENABLED = os.getenv('REDIS_ENABLED', 'False').lower() == 'true'
    
    # Development: Her zaman Mock Provider kullan
    AI_PROVIDER = 'mock'
    AI_MOCK_SIMULATE_ERRORS = False


class TestingConfig(Config):
    """Testing configuration."""
    
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_TEST_URL',
        'sqlite:///data.db'
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=5)
    RATELIMIT_ENABLED = False
    
    # Testing: Mock Provider + hızlı yanıt (delay yok)
    AI_PROVIDER = 'mock'
    AI_MOCK_DELAY_MIN = 0.0
    AI_MOCK_DELAY_MAX = 0.0
    AI_MOCK_SIMULATE_ERRORS = False


class ProductionConfig(Config):
    """Production configuration."""
    
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///instance/data.db"
    
    # Production-specific settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_size': 10,
        'max_overflow': 20,
    }
    
    # Redis - production'da her zaman aktif
    REDIS_ENABLED = os.getenv('REDIS_ENABLED', 'True').lower() == 'true'
    
    # Production: OpenAI Provider (veya env'den)
    AI_PROVIDER = os.getenv('AI_PROVIDER', 'openai')
    
    # OpenAI Production Settings
    OPENAI_TIMEOUT = 60
    OPENAI_MAX_RETRIES = 3


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config():
    """Get configuration based on environment."""
    env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])

