"""
Flask extensions initialization.
All extensions are initialized here to avoid circular imports.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_marshmallow import Marshmallow
from flask_caching import Cache

# Database
db = SQLAlchemy()

# Database migrations
migrate = Migrate()

# JWT Authentication
jwt = JWTManager()

# Password hashing
bcrypt = Bcrypt()

# CORS
cors = CORS()

# Serialization
ma = Marshmallow()

# Caching
cache = Cache()

# Redis cache alias for health checks
redis_cache = cache


def _get_allowed_origins(app):
    """
    Get CORS allowed origins from configuration.
    
    Supports:
        - ALLOWED_ORIGINS env var (comma-separated)
        - FRONTEND_URL fallback
        - Development defaults
    """
    import os
    
    # Check for explicit ALLOWED_ORIGINS
    allowed_origins_str = os.environ.get('ALLOWED_ORIGINS', '')
    if allowed_origins_str:
        return [origin.strip() for origin in allowed_origins_str.split(',') if origin.strip()]
    
    # Check config list
    config_origins = app.config.get('ALLOWED_ORIGINS', [])
    if config_origins and isinstance(config_origins, list):
        return config_origins
    
    # Fallback to FRONTEND_URL
    frontend_url = app.config.get('FRONTEND_URL')
    if frontend_url:
        return [frontend_url]
    
    # Development defaults - accept all localhost ports
    if app.config.get('FLASK_ENV') == 'development' or app.config.get('DEBUG'):
        # Wildcard pattern for localhost
        return ['*']  # Allow all origins in development
    
    # Production with no config - this is a problem
    app.logger.warning('CORS: No allowed origins configured for production!')
    return []


def init_extensions(app):
    """Initialize all Flask extensions."""
    
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    # CORS - Get allowed origins from environment
    allowed_origins = _get_allowed_origins(app)
    cors.init_app(app, resources={
        r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Request-ID"],
            "expose_headers": ["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
            "supports_credentials": True
        }
    })
    ma.init_app(app)
    
    # Configure cache
    cache_config = {
        'CACHE_TYPE': 'redis',
        'CACHE_REDIS_URL': app.config.get('REDIS_URL', 'redis://localhost:6379/0'),
        'CACHE_DEFAULT_TIMEOUT': 300
    }
    cache.init_app(app, config=cache_config)
    
    # JWT callbacks
    _setup_jwt_callbacks(app)
    
    app.logger.info('Extensions initialized successfully')


def _setup_jwt_callbacks(app):
    """
    Setup JWT callbacks for token handling.
    
    Security Features:
        - Token blacklist kontrolü (Redis + DB)
        - Token version kontrolü (mass invalidation)
        - Kullanıcı aktiflik kontrolü
        - Detaylı hata mesajları
    """
    
    @jwt.user_identity_loader
    def user_identity_lookup(user):
        """
        Return user ID for JWT identity.
        
        User object veya ID kabul eder.
        Flask-JWT-Extended string identity bekler.
        """
        if hasattr(user, 'id'):
            return str(user.id)
        return str(user)
    
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        """
        Load user from JWT identity.
        
        Token'dan kullanıcıyı yükler, aktiflik kontrolü yapar.
        """
        from app.models.user import User
        
        identity = jwt_data.get("sub")
        if not identity:
            return None
        
        # Identity string olarak gelir, int'e çevir
        try:
            user_id = int(identity)
        except (ValueError, TypeError):
            return None
        
        user = User.query.filter_by(id=user_id).first()
        
        # Aktiflik kontrolü
        if user and not user.is_active:
            app.logger.warning(f'Inactive user attempted access: {identity}')
            return None
        
        return user
    
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        """
        Check if token is in blocklist.
        
        Redis-backed blacklist + token version kontrolü.
        """
        from app.core.token_blacklist import check_if_token_revoked
        
        return check_if_token_revoked(jwt_header, jwt_payload)
    
    @jwt.additional_claims_loader
    def add_claims_to_access_token(identity):
        """
        JWT'ye ek claims ekler.
        
        Role ve permissions token'a gömülür.
        """
        from app.models.user import User
        
        # Identity string olarak gelir
        try:
            user_id = int(identity)
        except (ValueError, TypeError):
            return {}
        
        user = User.query.get(user_id)
        if not user:
            return {}
        
        return {
            'role': user.role.name if user.role else 'student',
            'email': user.email,
            'permissions': user.get_permissions() if hasattr(user, 'get_permissions') else [],
            'token_version': _get_user_token_version(user_id)
        }
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Handle expired token."""
        return {
            'success': False,
            'error': {
                'code': 'TOKEN_EXPIRED',
                'message': 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
                'details': {
                    'expired_at': jwt_payload.get('exp')
                }
            }
        }, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Handle invalid token."""
        app.logger.warning(f'Invalid token: {error}')
        return {
            'success': False,
            'error': {
                'code': 'INVALID_TOKEN',
                'message': 'Geçersiz kimlik doğrulama token\'ı.'
            }
        }, 401
    
    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        """Handle missing token."""
        return {
            'success': False,
            'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Bu işlem için giriş yapmanız gerekiyor.',
                'details': {
                    'hint': 'Authorization header ile Bearer token gönderin.'
                }
            }
        }, 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        """Handle revoked token."""
        jti = jwt_payload.get('jti', 'unknown')
        app.logger.warning(f'Revoked token used: {jti[:8]}...')
        return {
            'success': False,
            'error': {
                'code': 'TOKEN_REVOKED',
                'message': 'Bu oturum sonlandırılmış. Lütfen tekrar giriş yapın.'
            }
        }, 401
    
    @jwt.needs_fresh_token_loader
    def needs_fresh_token_callback(jwt_header, jwt_payload):
        """Handle stale token for fresh-required endpoints."""
        return {
            'success': False,
            'error': {
                'code': 'FRESH_TOKEN_REQUIRED',
                'message': 'Bu işlem için yeni bir oturum açmanız gerekiyor.',
                'details': {
                    'hint': 'Güvenlik nedeniyle tekrar giriş yapın.'
                }
            }
        }, 401
    
    @jwt.token_verification_failed_loader
    def token_verification_failed_callback(jwt_header, jwt_payload):
        """Handle token verification failure."""
        app.logger.error(f'Token verification failed: {jwt_payload}')
        return {
            'success': False,
            'error': {
                'code': 'TOKEN_VERIFICATION_FAILED',
                'message': 'Token doğrulama başarısız.'
            }
        }, 401


def _get_user_token_version(user_id: int) -> int:
    """Get user's token version from Redis."""
    try:
        from app.core.token_blacklist import TokenBlacklistService
        return TokenBlacklistService.get_token_version(user_id)
    except Exception:
        return 0
