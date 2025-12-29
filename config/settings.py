"""
Core Settings Module.

Pydantic tabanlı tip güvenli yapılandırma sistemi.
Tüm ortam değişkenlerini doğrular ve varsayılan değerler sağlar.

DevOps Best Practices:
    - 12-Factor App uyumlu
    - Secrets hiçbir zaman kod içinde saklanmaz
    - Ortam bazlı yapılandırma
    - Tip güvenliği ve doğrulama
"""

import os
import secrets
from datetime import timedelta
from functools import lru_cache
from typing import Any, Dict, List, Optional, Union
from pathlib import Path

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Proje kök dizini
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """
    Ana yapılandırma sınıfı.
    
    Tüm ortam değişkenlerini tek noktadan yönetir.
    Pydantic ile tip güvenliği ve doğrulama sağlar.
    """
    
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore'
    )
    
    # ========================================
    # APPLICATION
    # ========================================
    APP_NAME: str = Field(default="Öğrenci Koçluk Sistemi")
    APP_VERSION: str = Field(default="1.0.0")
    APP_DESCRIPTION: str = Field(default="Kurumsal Öğrenci Koçluk Platformu")
    
    # Environment
    FLASK_ENV: str = Field(default="development")
    FLASK_DEBUG: bool = Field(default=False)
    FLASK_HOST: str = Field(default="127.0.0.1")
    FLASK_PORT: int = Field(default=5000)
    
    # URLs
    APP_URL: str = Field(default="http://localhost:5000")
    FRONTEND_URL: str = Field(default="http://localhost:3000")
    ALLOWED_ORIGINS: List[str] = Field(default=["http://localhost:3000"])
    
    # ========================================
    # SECURITY - Kritik güvenlik ayarları
    # ========================================
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        description="Flask secret key - Production'da mutlaka değiştirin!"
    )
    
    # CSRF Protection
    WTF_CSRF_ENABLED: bool = Field(default=True)
    WTF_CSRF_TIME_LIMIT: int = Field(default=3600)
    
    # Session
    SESSION_COOKIE_SECURE: bool = Field(default=False)  # Production'da True
    SESSION_COOKIE_HTTPONLY: bool = Field(default=True)
    SESSION_COOKIE_SAMESITE: str = Field(default="Lax")
    PERMANENT_SESSION_LIFETIME: int = Field(default=86400)  # 1 gün
    
    # Password Hashing
    BCRYPT_LOG_ROUNDS: int = Field(default=12)  # Production'da 13-14
    
    # Rate Limiting
    RATELIMIT_ENABLED: bool = Field(default=True)
    RATELIMIT_DEFAULT: str = Field(default="200/minute")
    RATELIMIT_STORAGE_URL: str = Field(default="memory://")
    RATELIMIT_HEADERS_ENABLED: bool = Field(default=True)
    
    # Security Headers
    SECURITY_HEADERS_ENABLED: bool = Field(default=True)
    CONTENT_SECURITY_POLICY: str = Field(default="default-src 'self'")
    
    # ========================================
    # JWT AUTHENTICATION
    # ========================================
    JWT_SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        description="JWT signing key - Production'da mutlaka değiştirin!"
    )
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_ACCESS_TOKEN_EXPIRES: int = Field(default=3600)  # 1 saat
    JWT_REFRESH_TOKEN_EXPIRES: int = Field(default=2592000)  # 30 gün
    JWT_TOKEN_LOCATION: List[str] = Field(default=["headers"])
    JWT_HEADER_NAME: str = Field(default="Authorization")
    JWT_HEADER_TYPE: str = Field(default="Bearer")
    JWT_BLACKLIST_ENABLED: bool = Field(default=True)
    JWT_BLACKLIST_TOKEN_CHECKS: List[str] = Field(default=["access", "refresh"])
    
    # ========================================
    # DATABASE - PostgreSQL
    # ========================================
    # Connection String (12-Factor App style)
    DATABASE_URL: str = Field(
<<<<<<< HEAD
        default="sqlite:///data.db"
    )
    DATABASE_TEST_URL: str = Field(
        default="sqlite:///data_test.db"
=======
        default="postgresql://postgres:password@localhost:5432/student_coaching"
    )
    DATABASE_TEST_URL: str = Field(
        default="postgresql://postgres:password@localhost:5432/student_coaching_test"
>>>>>>> eski/main
    )
    
    # Detailed connection (alternatif)
    DB_HOST: str = Field(default="localhost")
    DB_PORT: int = Field(default=5432)
    DB_NAME: str = Field(default="student_coaching")
    DB_USER: str = Field(default="postgres")
    DB_PASSWORD: str = Field(default="password")
    DB_SCHEMA: str = Field(default="public")
    
    # Connection Pool
    DB_POOL_SIZE: int = Field(default=5)
    DB_POOL_MAX_OVERFLOW: int = Field(default=10)
    DB_POOL_TIMEOUT: int = Field(default=30)
    DB_POOL_RECYCLE: int = Field(default=1800)  # 30 dakika
    DB_POOL_PRE_PING: bool = Field(default=True)
    
    # SQLAlchemy
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = Field(default=False)
    SQLALCHEMY_ECHO: bool = Field(default=False)
    SQLALCHEMY_RECORD_QUERIES: bool = Field(default=False)
    
    # ========================================
    # REDIS
    # ========================================
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    REDIS_HOST: str = Field(default="localhost")
    REDIS_PORT: int = Field(default=6379)
    REDIS_PASSWORD: Optional[str] = Field(default=None)
    REDIS_DB: int = Field(default=0)
    REDIS_SSL: bool = Field(default=False)
    
    # Redis Connection Pool
    REDIS_MAX_CONNECTIONS: int = Field(default=10)
    REDIS_SOCKET_TIMEOUT: int = Field(default=5)
    REDIS_SOCKET_CONNECT_TIMEOUT: int = Field(default=5)
    
    # Cache Settings
    CACHE_TYPE: str = Field(default="redis")
    CACHE_DEFAULT_TIMEOUT: int = Field(default=300)
    CACHE_KEY_PREFIX: str = Field(default="sks:")
    
    # ========================================
    # CELERY - Background Tasks
    # ========================================
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/2")
    CELERY_TASK_SERIALIZER: str = Field(default="json")
    CELERY_RESULT_SERIALIZER: str = Field(default="json")
    CELERY_ACCEPT_CONTENT: List[str] = Field(default=["json"])
    CELERY_TIMEZONE: str = Field(default="Europe/Istanbul")
    CELERY_TASK_TRACK_STARTED: bool = Field(default=True)
    CELERY_TASK_TIME_LIMIT: int = Field(default=300)
    
    # ========================================
    # EMAIL
    # ========================================
    MAIL_SERVER: str = Field(default="smtp.gmail.com")
    MAIL_PORT: int = Field(default=587)
    MAIL_USE_TLS: bool = Field(default=True)
    MAIL_USE_SSL: bool = Field(default=False)
    MAIL_USERNAME: Optional[str] = Field(default=None)
    MAIL_PASSWORD: Optional[str] = Field(default=None)
    MAIL_DEFAULT_SENDER: str = Field(default="noreply@studentcoaching.com")
    MAIL_MAX_EMAILS: Optional[int] = Field(default=None)
    MAIL_SUPPRESS_SEND: bool = Field(default=False)
    
    # ========================================
    # FILE STORAGE
    # ========================================
    STORAGE_TYPE: str = Field(default="local")  # local, s3
    UPLOAD_FOLDER: str = Field(default="uploads")
    MAX_CONTENT_LENGTH: int = Field(default=16 * 1024 * 1024)  # 16MB
    ALLOWED_EXTENSIONS: List[str] = Field(
        default=["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png", "gif", "mp4", "webm"]
    )
    
    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = Field(default=None)
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(default=None)
    AWS_S3_BUCKET: Optional[str] = Field(default=None)
    AWS_S3_REGION: str = Field(default="eu-central-1")
    AWS_S3_ENDPOINT_URL: Optional[str] = Field(default=None)  # MinIO için
    
    # ========================================
    # AI / LLM CONFIGURATION
    # ========================================
    # Provider Selection (mock, openai, gpt41, azure)
    AI_PROVIDER: str = Field(default="mock")
    
    # OpenAI / GPT-4.1 API
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API Key - NEVER log this!")
    OPENAI_ORG_ID: Optional[str] = Field(default=None)
    OPENAI_MODEL: str = Field(default="gpt-4o-mini")
    OPENAI_MAX_TOKENS: int = Field(default=1000)
    OPENAI_TEMPERATURE: float = Field(default=0.7)
    OPENAI_TIMEOUT: int = Field(default=30)
    OPENAI_MAX_RETRIES: int = Field(default=3)
    
    # AI Rate Limiting
    AI_RATE_LIMIT_RPM: int = Field(default=60)      # Requests per minute
    AI_RATE_LIMIT_TPM: int = Field(default=100000)  # Tokens per minute
    AI_RATE_LIMIT_RPD: int = Field(default=10000)   # Requests per day
    
    # AI Fallback & Circuit Breaker
    AI_ENABLE_FALLBACK: bool = Field(default=True)
    AI_FALLBACK_PROVIDER: str = Field(default="mock")
    AI_CIRCUIT_FAILURE_THRESHOLD: int = Field(default=5)
    AI_CIRCUIT_SUCCESS_THRESHOLD: int = Field(default=2)
    AI_CIRCUIT_TIMEOUT: int = Field(default=60)
    
    # AI Cost Controls (USD)
    AI_MAX_COST_PER_REQUEST: float = Field(default=0.10)
    AI_MAX_COST_PER_USER_DAILY: float = Field(default=1.0)
    AI_MAX_COST_MONTHLY: float = Field(default=100.0)
    
    # AI Security
    AI_ENABLE_CONTENT_FILTER: bool = Field(default=True)
    AI_ENABLE_AUDIT_LOGGING: bool = Field(default=True)
    
    # AI Mock Provider (Development)
    AI_MOCK_DELAY_MIN: float = Field(default=0.3)
    AI_MOCK_DELAY_MAX: float = Field(default=1.0)
    AI_MOCK_SIMULATE_ERRORS: bool = Field(default=False)
    
    # ========================================
    # EXTERNAL SERVICES
    # ========================================
    # YouTube API
    YOUTUBE_API_KEY: Optional[str] = Field(default=None)
    YOUTUBE_CLIENT_ID: Optional[str] = Field(default=None)
    YOUTUBE_CLIENT_SECRET: Optional[str] = Field(default=None)
    
    # Video Embed Security
    VIDEO_EMBED_SECRET: str = Field(default_factory=lambda: secrets.token_hex(32))
    VIDEO_EMBED_TOKEN_TTL: int = Field(default=3600)  # 1 saat
    ALLOWED_EMBED_DOMAINS: List[str] = Field(default=[
        "localhost",
        "localhost:3000",
        "localhost:5173",
        "127.0.0.1",
        "127.0.0.1:3000",
        "127.0.0.1:5173"
    ])
    
    # Video Analytics
    VIDEO_VIEW_COUNT_SYNC_INTERVAL: int = Field(default=300)  # 5 dakika
    VIDEO_SESSION_TTL: int = Field(default=7200)  # 2 saat
    VIDEO_MIN_WATCH_FOR_VIEW: int = Field(default=5)  # 5 saniye
    
    # Zoom API (Live Classes)
    ZOOM_API_KEY: Optional[str] = Field(default=None)
    ZOOM_API_SECRET: Optional[str] = Field(default=None)
    
    # Google Meet
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None)
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None)
    
    # ========================================
    # MONITORING & LOGGING
    # ========================================
    # Sentry
    SENTRY_DSN: Optional[str] = Field(default=None)
    SENTRY_ENVIRONMENT: Optional[str] = Field(default=None)
    SENTRY_TRACES_SAMPLE_RATE: float = Field(default=0.1)
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    LOG_FILE: Optional[str] = Field(default=None)
    LOG_MAX_BYTES: int = Field(default=10 * 1024 * 1024)  # 10MB
    LOG_BACKUP_COUNT: int = Field(default=5)
    
    # ========================================
    # PAGINATION
    # ========================================
    DEFAULT_PAGE_SIZE: int = Field(default=20)
    MAX_PAGE_SIZE: int = Field(default=100)
    
    # ========================================
    # VALIDATORS
    # ========================================
    
    @field_validator('FLASK_ENV')
    @classmethod
    def validate_flask_env(cls, v: str) -> str:
        allowed = ['development', 'testing', 'staging', 'production']
        if v not in allowed:
            raise ValueError(f"FLASK_ENV must be one of: {allowed}")
        return v
    
    @field_validator('LOG_LEVEL')
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        allowed = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in allowed:
            raise ValueError(f"LOG_LEVEL must be one of: {allowed}")
        return v.upper()
    
    @model_validator(mode='after')
    def validate_production_settings(self) -> 'Settings':
        """Production ortamında güvenlik kontrolü."""
        if self.FLASK_ENV == 'production':
            # Secret key kontrolü
            if self.SECRET_KEY == 'dev-secret-key' or len(self.SECRET_KEY) < 32:
                raise ValueError("Production requires a strong SECRET_KEY (min 32 chars)")
            
            if self.JWT_SECRET_KEY == 'jwt-secret-key' or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError("Production requires a strong JWT_SECRET_KEY (min 32 chars)")
            
            # HTTPS kontrolü
            if not self.SESSION_COOKIE_SECURE:
                import warnings
                warnings.warn("SESSION_COOKIE_SECURE should be True in production")
        
        return self
    
    # ========================================
    # COMPUTED PROPERTIES
    # ========================================
    
    @property
    def sqlalchemy_database_uri(self) -> str:
        """SQLAlchemy için database URI."""
        return self.DATABASE_URL
    
    @property
    def jwt_access_token_expires(self) -> timedelta:
        """JWT access token süresi."""
        return timedelta(seconds=self.JWT_ACCESS_TOKEN_EXPIRES)
    
    @property
    def jwt_refresh_token_expires(self) -> timedelta:
        """JWT refresh token süresi."""
        return timedelta(seconds=self.JWT_REFRESH_TOKEN_EXPIRES)
    
    @property
    def sqlalchemy_engine_options(self) -> Dict[str, Any]:
        """SQLAlchemy engine ayarları."""
        return {
            'pool_pre_ping': self.DB_POOL_PRE_PING,
            'pool_recycle': self.DB_POOL_RECYCLE,
            'pool_size': self.DB_POOL_SIZE,
            'max_overflow': self.DB_POOL_MAX_OVERFLOW,
            'pool_timeout': self.DB_POOL_TIMEOUT,
        }
    
    @property
    def redis_connection_options(self) -> Dict[str, Any]:
        """Redis bağlantı ayarları."""
        options = {
            'host': self.REDIS_HOST,
            'port': self.REDIS_PORT,
            'db': self.REDIS_DB,
            'socket_timeout': self.REDIS_SOCKET_TIMEOUT,
            'socket_connect_timeout': self.REDIS_SOCKET_CONNECT_TIMEOUT,
            'max_connections': self.REDIS_MAX_CONNECTIONS,
        }
        if self.REDIS_PASSWORD:
            options['password'] = self.REDIS_PASSWORD
        if self.REDIS_SSL:
            options['ssl'] = True
        return options
    
    def is_development(self) -> bool:
        return self.FLASK_ENV == 'development'
    
    def is_testing(self) -> bool:
        return self.FLASK_ENV == 'testing'
    
    def is_staging(self) -> bool:
        return self.FLASK_ENV == 'staging'
    
    def is_production(self) -> bool:
        return self.FLASK_ENV == 'production'


# ========================================
# ENVIRONMENT-SPECIFIC CONFIGURATIONS
# ========================================

class BaseConfig:
    """Flask uyumlu base configuration."""
    
    def __init__(self, settings: Settings = None):
        self._settings = settings or get_settings()
    
    def __getattr__(self, name: str) -> Any:
        return getattr(self._settings, name)
    
    def to_dict(self) -> Dict[str, Any]:
        """Config'i dictionary'e çevir."""
        return self._settings.model_dump()


class DevelopmentConfig(BaseConfig):
    """Development ortamı yapılandırması."""
    
    DEBUG = True
    SQLALCHEMY_ECHO = True
    TEMPLATES_AUTO_RELOAD = True
    SEND_FILE_MAX_AGE_DEFAULT = 0
    
    # Development için rahat rate limiting
    RATELIMIT_DEFAULT = "1000/minute"


class TestingConfig(BaseConfig):
    """Testing ortamı yapılandırması."""
    
    TESTING = True
    DEBUG = True
    
    # Test için hızlı token süreleri
    JWT_ACCESS_TOKEN_EXPIRES = 5  # 5 saniye
    JWT_REFRESH_TOKEN_EXPIRES = 10  # 10 saniye
    
    # Rate limiting kapalı
    RATELIMIT_ENABLED = False
    
    # Email gönderme kapalı
    MAIL_SUPPRESS_SEND = True
    
    # In-memory cache
    CACHE_TYPE = "simple"
    
    # Bcrypt hızlı (test için)
    BCRYPT_LOG_ROUNDS = 4


class StagingConfig(BaseConfig):
    """Staging ortamı yapılandırması."""
    
    DEBUG = False
    TESTING = False
    
    # Production'a yakın ayarlar
    SESSION_COOKIE_SECURE = True
    BCRYPT_LOG_ROUNDS = 12
    
    # Orta seviye rate limiting
    RATELIMIT_DEFAULT = "500/minute"


class ProductionConfig(BaseConfig):
    """Production ortamı yapılandırması."""
    
    DEBUG = False
    TESTING = False
    
    # Güvenlik ayarları maksimum
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Strict"
    
    # Güçlü şifreleme
    BCRYPT_LOG_ROUNDS = 13
    
    # Katı rate limiting
    RATELIMIT_DEFAULT = "100/minute"
    
    # SQLAlchemy production ayarları
    SQLALCHEMY_ECHO = False
    SQLALCHEMY_RECORD_QUERIES = False


# ========================================
# CONFIG FACTORY
# ========================================

CONFIG_MAP = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'staging': StagingConfig,
    'production': ProductionConfig,
}


@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance döner.
    
    Singleton pattern - uygulama boyunca tek instance.
    """
    return Settings()


def get_config(env: str = None) -> BaseConfig:
    """
    Ortama göre config instance döner.
    
    Args:
        env: Ortam adı (None ise FLASK_ENV'den alınır)
    
    Returns:
        Config instance
    """
    if env is None:
        env = os.getenv('FLASK_ENV', 'development')
    
    config_class = CONFIG_MAP.get(env, DevelopmentConfig)
    return config_class()


def configure_app(app, config: BaseConfig = None):
    """
    Flask uygulamasını yapılandırır.
    
    Args:
        app: Flask uygulaması
        config: Config instance (None ise otomatik seçilir)
    """
    if config is None:
        config = get_config()
    
    settings = get_settings()
    
    # Flask config'i ayarla
    app.config['SECRET_KEY'] = settings.SECRET_KEY
    app.config['DEBUG'] = settings.FLASK_DEBUG
    
    # SQLAlchemy
    app.config['SQLALCHEMY_DATABASE_URI'] = settings.sqlalchemy_database_uri
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = settings.SQLALCHEMY_TRACK_MODIFICATIONS
    app.config['SQLALCHEMY_ECHO'] = settings.SQLALCHEMY_ECHO
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = settings.sqlalchemy_engine_options
    
    # JWT
    app.config['JWT_SECRET_KEY'] = settings.JWT_SECRET_KEY
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = settings.jwt_access_token_expires
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = settings.jwt_refresh_token_expires
    app.config['JWT_TOKEN_LOCATION'] = settings.JWT_TOKEN_LOCATION
    app.config['JWT_HEADER_NAME'] = settings.JWT_HEADER_NAME
    app.config['JWT_HEADER_TYPE'] = settings.JWT_HEADER_TYPE
    app.config['JWT_BLACKLIST_ENABLED'] = settings.JWT_BLACKLIST_ENABLED
    app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = settings.JWT_BLACKLIST_TOKEN_CHECKS
    
    # Session & Security
    app.config['SESSION_COOKIE_SECURE'] = settings.SESSION_COOKIE_SECURE
    app.config['SESSION_COOKIE_HTTPONLY'] = settings.SESSION_COOKIE_HTTPONLY
    app.config['SESSION_COOKIE_SAMESITE'] = settings.SESSION_COOKIE_SAMESITE
    app.config['PERMANENT_SESSION_LIFETIME'] = settings.PERMANENT_SESSION_LIFETIME
    
    # Redis & Cache
    app.config['REDIS_URL'] = settings.REDIS_URL
    app.config['CACHE_TYPE'] = settings.CACHE_TYPE
    app.config['CACHE_DEFAULT_TIMEOUT'] = settings.CACHE_DEFAULT_TIMEOUT
    app.config['CACHE_KEY_PREFIX'] = settings.CACHE_KEY_PREFIX
    app.config['CACHE_REDIS_URL'] = settings.REDIS_URL
    
    # Celery
    app.config['CELERY_BROKER_URL'] = settings.CELERY_BROKER_URL
    app.config['CELERY_RESULT_BACKEND'] = settings.CELERY_RESULT_BACKEND
    
    # Email
    app.config['MAIL_SERVER'] = settings.MAIL_SERVER
    app.config['MAIL_PORT'] = settings.MAIL_PORT
    app.config['MAIL_USE_TLS'] = settings.MAIL_USE_TLS
    app.config['MAIL_USE_SSL'] = settings.MAIL_USE_SSL
    app.config['MAIL_USERNAME'] = settings.MAIL_USERNAME
    app.config['MAIL_PASSWORD'] = settings.MAIL_PASSWORD
    app.config['MAIL_DEFAULT_SENDER'] = settings.MAIL_DEFAULT_SENDER
    app.config['MAIL_SUPPRESS_SEND'] = settings.MAIL_SUPPRESS_SEND
    
    # File Upload
    app.config['MAX_CONTENT_LENGTH'] = settings.MAX_CONTENT_LENGTH
    app.config['UPLOAD_FOLDER'] = settings.UPLOAD_FOLDER
    
    # Rate Limiting
    app.config['RATELIMIT_ENABLED'] = settings.RATELIMIT_ENABLED
    app.config['RATELIMIT_DEFAULT'] = settings.RATELIMIT_DEFAULT
    app.config['RATELIMIT_STORAGE_URL'] = settings.RATELIMIT_STORAGE_URL
    app.config['RATELIMIT_HEADERS_ENABLED'] = settings.RATELIMIT_HEADERS_ENABLED
    
    # Application
    app.config['APP_NAME'] = settings.APP_NAME
    app.config['APP_URL'] = settings.APP_URL
    app.config['FRONTEND_URL'] = settings.FRONTEND_URL
    
    # Pagination
    app.config['DEFAULT_PAGE_SIZE'] = settings.DEFAULT_PAGE_SIZE
    app.config['MAX_PAGE_SIZE'] = settings.MAX_PAGE_SIZE
    
    return app
