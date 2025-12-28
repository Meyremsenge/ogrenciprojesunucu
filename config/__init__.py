"""
Config Package.

Environment-specific configuration management.

DevOps Best Practices:
    - 12-Factor App yapılandırma ilkeleri
    - Environment-based configuration
    - Secrets management
    - Type-safe settings with Pydantic

Modules:
    - settings: Ana yapılandırma ve ortam sınıfları
    - security: CORS, güvenlik başlıkları, rate limiting
    - database: PostgreSQL bağlantı ve havuz yönetimi
    - redis_config: Redis bağlantı ve önbellek yönetimi
    - secrets: Çoklu kaynak secret yönetimi

Usage:
    from config import get_settings, get_config, configure_app
    
    # Pydantic settings (tip-güvenli)
    settings = get_settings()
    
    # Flask config
    config = get_config('development')
    
    # Flask app configuration
    configure_app(app)
"""

from config.settings import (
    Settings,
    BaseConfig,
    DevelopmentConfig,
    TestingConfig,
    StagingConfig,
    ProductionConfig,
    get_settings,
    get_config,
    configure_app,
    CONFIG_MAP,
    BASE_DIR,
)

from config.security import (
    SecurityConfig,
    SecurityMiddleware,
    init_cors,
    init_rate_limiting,
    require_https,
    require_api_key,
    verify_webhook_signature,
    check_production_security,
)

from config.database import (
    DatabaseConfig,
    DatabaseManager,
    get_db,
    init_db,
    run_migrations,
    create_all_tables,
    drop_all_tables,
    paginate_query,
)

from config.redis_config import (
    RedisConfig,
    RedisManager,
    CacheService,
    RateLimiter,
    get_redis,
    get_cache,
    init_redis,
    cached,
    cache_invalidate,
)

from config.secrets import (
    SecretsConfig,
    SecretsManager,
    get_secrets,
    init_secrets,
    get_secret,
    get_database_url,
    get_redis_url,
    get_secret_key,
    get_jwt_secret_key,
    validate_secrets,
    REQUIRED_SECRETS,
    # Providers
    SecretProvider,
    EnvironmentSecretProvider,
    DotEnvSecretProvider,
    DockerSecretProvider,
    KubernetesSecretProvider,
    VaultSecretProvider,
    AWSSecretsManagerProvider,
)


__all__ = [
    # Settings
    'Settings',
    'BaseConfig',
    'DevelopmentConfig',
    'TestingConfig',
    'StagingConfig',
    'ProductionConfig',
    'get_settings',
    'get_config',
    'configure_app',
    'CONFIG_MAP',
    'BASE_DIR',
    
    # Security
    'SecurityConfig',
    'SecurityMiddleware',
    'init_cors',
    'init_rate_limiting',
    'require_https',
    'require_api_key',
    'verify_webhook_signature',
    'check_production_security',
    
    # Database
    'DatabaseConfig',
    'DatabaseManager',
    'get_db',
    'init_db',
    'run_migrations',
    'create_all_tables',
    'drop_all_tables',
    'paginate_query',
    
    # Redis
    'RedisConfig',
    'RedisManager',
    'CacheService',
    'RateLimiter',
    'get_redis',
    'get_cache',
    'init_redis',
    'cached',
    'cache_invalidate',
    
    # Secrets
    'SecretsConfig',
    'SecretsManager',
    'get_secrets',
    'init_secrets',
    'get_secret',
    'get_database_url',
    'get_redis_url',
    'get_secret_key',
    'get_jwt_secret_key',
    'validate_secrets',
    'REQUIRED_SECRETS',
    'SecretProvider',
    'EnvironmentSecretProvider',
    'DotEnvSecretProvider',
    'DockerSecretProvider',
    'KubernetesSecretProvider',
    'VaultSecretProvider',
    'AWSSecretsManagerProvider',
]
