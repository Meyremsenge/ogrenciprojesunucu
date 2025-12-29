"""
Security Configuration Module.

Flask uygulaması için güvenlik ayarları.
CORS, güvenlik başlıkları, rate limiting ve güvenlik middleware'leri.

DevOps Best Practices:
    - Defense in depth
    - OWASP güvenlik standartları
    - Secure by default
"""

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Callable, Dict, List, Optional
from functools import wraps

from flask import Flask, request, g, Response
import hashlib
import hmac
import time


@dataclass
class SecurityConfig:
    """
    Güvenlik yapılandırması.
    
    CORS, CSRF, güvenlik başlıkları ve rate limiting ayarları.
    """
    
    # ========================================
    # CORS Configuration
    # ========================================
    cors_enabled: bool = True
    cors_origins: List[str] = field(default_factory=lambda: ["http://localhost:3000"])
    cors_methods: List[str] = field(default_factory=lambda: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
    cors_allowed_headers: List[str] = field(default_factory=lambda: [
        "Content-Type", "Authorization", "X-Requested-With",
        "X-CSRF-Token", "X-Request-ID", "Accept", "Accept-Language"
    ])
    cors_expose_headers: List[str] = field(default_factory=lambda: [
        "X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining",
        "X-RateLimit-Reset", "X-Total-Count", "Link"
    ])
    cors_supports_credentials: bool = True
    cors_max_age: int = 86400  # 24 saat
    
    # ========================================
    # CSRF Configuration
    # ========================================
    csrf_enabled: bool = True
    csrf_time_limit: int = 3600  # 1 saat
    csrf_header_name: str = "X-CSRF-Token"
    csrf_cookie_name: str = "csrf_token"
    csrf_cookie_secure: bool = False  # Production'da True
    csrf_exempt_methods: List[str] = field(default_factory=lambda: ["GET", "HEAD", "OPTIONS", "TRACE"])
    csrf_exempt_endpoints: List[str] = field(default_factory=lambda: [
        "/api/v1/auth/login",
        "/api/v1/auth/register", 
        "/api/v1/auth/refresh",
        "/api/v1/webhooks/",  # Webhook'lar için
    ])
    
    # ========================================
    # Security Headers
    # ========================================
    security_headers_enabled: bool = True
    
    # Content Security Policy
    csp_enabled: bool = True
    csp_policy: Dict[str, str] = field(default_factory=lambda: {
        "default-src": "'self'",
        "script-src": "'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data: https:",
        "font-src": "'self'",
        "connect-src": "'self'",
        "frame-ancestors": "'none'",
        "form-action": "'self'",
        "base-uri": "'self'",
        "object-src": "'none'",
    })
    csp_report_only: bool = False
    csp_report_uri: Optional[str] = None
    
    # HTTP Strict Transport Security
    hsts_enabled: bool = False  # Production'da True
    hsts_max_age: int = 31536000  # 1 yıl
    hsts_include_subdomains: bool = True
    hsts_preload: bool = False
    
    # Other Security Headers
    x_content_type_options: bool = True  # nosniff
    x_frame_options: str = "DENY"
    x_xss_protection: bool = True
    referrer_policy: str = "strict-origin-when-cross-origin"
    permissions_policy: str = "geolocation=(), microphone=(), camera=()"
    
    # ========================================
    # Rate Limiting Configuration
    # ========================================
    rate_limit_enabled: bool = True
    rate_limit_storage: str = "redis://localhost:6379/3"
    
    # Varsayılan limitler
    rate_limit_default: str = "200/minute"
    rate_limit_login: str = "5/minute"  # Brute-force koruması
    rate_limit_register: str = "3/hour"
    rate_limit_password_reset: str = "3/hour"
    rate_limit_api: str = "1000/hour"
    rate_limit_upload: str = "10/minute"
    
    # ========================================
    # IP Filtering
    # ========================================
    ip_whitelist_enabled: bool = False
    ip_whitelist: List[str] = field(default_factory=list)
    ip_blacklist_enabled: bool = False
    ip_blacklist: List[str] = field(default_factory=list)
    
    # ========================================
    # Request Validation
    # ========================================
    max_content_length: int = 16 * 1024 * 1024  # 16MB
    max_json_depth: int = 10
    max_array_length: int = 1000
    allowed_content_types: List[str] = field(default_factory=lambda: [
        "application/json",
        "application/x-www-form-urlencoded",
        "multipart/form-data",
    ])
    
    def get_csp_string(self) -> str:
        """CSP policy'yi string olarak döner."""
        parts = []
        for directive, value in self.csp_policy.items():
            parts.append(f"{directive} {value}")
        
        policy = "; ".join(parts)
        
        if self.csp_report_uri:
            policy += f"; report-uri {self.csp_report_uri}"
        
        return policy
    
    def get_hsts_string(self) -> str:
        """HSTS header değerini döner."""
        value = f"max-age={self.hsts_max_age}"
        if self.hsts_include_subdomains:
            value += "; includeSubDomains"
        if self.hsts_preload:
            value += "; preload"
        return value


class SecurityMiddleware:
    """
    Flask güvenlik middleware'i.
    
    Güvenlik başlıkları, CORS ve request validasyonu sağlar.
    """
    
    def __init__(self, app: Flask = None, config: SecurityConfig = None):
        self.config = config or SecurityConfig()
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app: Flask):
        """Flask uygulamasına middleware'i ekle."""
        app.before_request(self._before_request)
        app.after_request(self._after_request)
        
        # Security config'i app'e ekle
        app.security_config = self.config
    
    def _before_request(self):
        """Request öncesi güvenlik kontrolleri."""
        # Request ID oluştur
        g.request_id = request.headers.get('X-Request-ID') or self._generate_request_id()
        g.request_start_time = time.time()
        
        # IP kontrolü
        if self.config.ip_blacklist_enabled:
            if request.remote_addr in self.config.ip_blacklist:
                return self._forbidden_response("IP address is blocked")
        
        if self.config.ip_whitelist_enabled:
            if request.remote_addr not in self.config.ip_whitelist:
                return self._forbidden_response("IP address not allowed")
        
        # Content-Type kontrolü
        if request.method in ['POST', 'PUT', 'PATCH']:
            content_type = request.content_type or ''
            if content_type.split(';')[0] not in self.config.allowed_content_types:
                if content_type and 'multipart/form-data' not in content_type:
                    return self._bad_request_response(f"Unsupported Content-Type: {content_type}")
    
    def _after_request(self, response: Response) -> Response:
        """Response'a güvenlik başlıkları ekle."""
        
        # Request ID
        if hasattr(g, 'request_id'):
            response.headers['X-Request-ID'] = g.request_id
        
        # Response time
        if hasattr(g, 'request_start_time'):
            elapsed = time.time() - g.request_start_time
            response.headers['X-Response-Time'] = f"{elapsed:.3f}s"
        
        if not self.config.security_headers_enabled:
            return response
        
        # Content Security Policy
        if self.config.csp_enabled:
            header_name = "Content-Security-Policy-Report-Only" if self.config.csp_report_only else "Content-Security-Policy"
            response.headers[header_name] = self.config.get_csp_string()
        
        # HSTS
        if self.config.hsts_enabled:
            response.headers['Strict-Transport-Security'] = self.config.get_hsts_string()
        
        # X-Content-Type-Options
        if self.config.x_content_type_options:
            response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # X-Frame-Options
        if self.config.x_frame_options:
            response.headers['X-Frame-Options'] = self.config.x_frame_options
        
        # X-XSS-Protection
        if self.config.x_xss_protection:
            response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer-Policy
        if self.config.referrer_policy:
            response.headers['Referrer-Policy'] = self.config.referrer_policy
        
        # Permissions-Policy
        if self.config.permissions_policy:
            response.headers['Permissions-Policy'] = self.config.permissions_policy
        
        # Cache kontrolü (güvenlik için)
        if 'Cache-Control' not in response.headers:
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
            response.headers['Pragma'] = 'no-cache'
        
        return response
    
    def _generate_request_id(self) -> str:
        """Unique request ID oluştur."""
        import uuid
        return str(uuid.uuid4())
    
    def _forbidden_response(self, message: str) -> Response:
        """403 response döner."""
        from flask import jsonify
        response = jsonify({
            'success': False,
            'error': {
                'code': 'FORBIDDEN',
                'message': message
            }
        })
        response.status_code = 403
        return response
    
    def _bad_request_response(self, message: str) -> Response:
        """400 response döner."""
        from flask import jsonify
        response = jsonify({
            'success': False,
            'error': {
                'code': 'BAD_REQUEST',
                'message': message
            }
        })
        response.status_code = 400
        return response


def init_cors(app: Flask, config: SecurityConfig = None):
    """
    CORS'u Flask-CORS ile yapılandır.
    
    Args:
        app: Flask uygulaması
        config: SecurityConfig instance
    """
    from flask_cors import CORS
    
    if config is None:
        config = SecurityConfig()
    
    if not config.cors_enabled:
        return
    
    CORS(
        app,
        origins=config.cors_origins,
        methods=config.cors_methods,
        allow_headers=config.cors_allowed_headers,
        expose_headers=config.cors_expose_headers,
        supports_credentials=config.cors_supports_credentials,
        max_age=config.cors_max_age,
    )


def init_rate_limiting(app: Flask, config: SecurityConfig = None):
    """
    Rate limiting'i Flask-Limiter ile yapılandır.
    
    Args:
        app: Flask uygulaması
        config: SecurityConfig instance
    """
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    
    if config is None:
        config = SecurityConfig()
    
    if not config.rate_limit_enabled:
        return None
    
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=[config.rate_limit_default],
        storage_uri=config.rate_limit_storage,
        headers_enabled=True,
    )
    
    return limiter


# ========================================
# SECURITY DECORATORS
# ========================================

def require_https(f: Callable) -> Callable:
    """HTTPS zorunlu kıl."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not request.is_secure and not request.headers.get('X-Forwarded-Proto') == 'https':
            return {
                'success': False,
                'error': {
                    'code': 'HTTPS_REQUIRED',
                    'message': 'HTTPS connection required'
                }
            }, 403
        return f(*args, **kwargs)
    return decorated


def require_api_key(key_header: str = 'X-API-Key', validate_func: Callable = None):
    """
    API key doğrulama decorator'ı.
    
    Args:
        key_header: API key header adı
        validate_func: Key doğrulama fonksiyonu
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            api_key = request.headers.get(key_header)
            
            if not api_key:
                return {
                    'success': False,
                    'error': {
                        'code': 'API_KEY_MISSING',
                        'message': f'{key_header} header is required'
                    }
                }, 401
            
            if validate_func and not validate_func(api_key):
                return {
                    'success': False,
                    'error': {
                        'code': 'API_KEY_INVALID',
                        'message': 'Invalid API key'
                    }
                }, 401
            
            g.api_key = api_key
            return f(*args, **kwargs)
        return decorated
    return decorator


def verify_webhook_signature(secret: str, header_name: str = 'X-Webhook-Signature'):
    """
    Webhook signature doğrulama decorator'ı.
    
    Args:
        secret: Webhook secret
        header_name: Signature header adı
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            signature = request.headers.get(header_name)
            
            if not signature:
                return {
                    'success': False,
                    'error': {
                        'code': 'SIGNATURE_MISSING',
                        'message': f'{header_name} header is required'
                    }
                }, 401
            
            # HMAC-SHA256 ile doğrula
            payload = request.get_data()
            expected_signature = hmac.new(
                secret.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, f"sha256={expected_signature}"):
                return {
                    'success': False,
                    'error': {
                        'code': 'SIGNATURE_INVALID',
                        'message': 'Invalid webhook signature'
                    }
                }, 401
            
            return f(*args, **kwargs)
        return decorated
    return decorator


# ========================================
# PRODUCTION SECURITY CHECKLIST
# ========================================

def check_production_security(app: Flask) -> List[Dict[str, Any]]:
    """
    Production güvenlik kontrolü.
    
    Eksik veya yanlış güvenlik ayarlarını tespit eder.
    
    Returns:
        List of security issues
    """
    issues = []
    
    # Secret Key kontrolü
    if app.config.get('SECRET_KEY') in ['dev', 'development', 'dev-secret-key', None]:
        issues.append({
            'severity': 'CRITICAL',
            'category': 'SECRET_KEY',
            'message': 'Weak or default SECRET_KEY detected',
            'recommendation': 'Generate a strong random SECRET_KEY for production'
        })
    
    # Debug mode kontrolü
    if app.config.get('DEBUG', False):
        issues.append({
            'severity': 'CRITICAL',
            'category': 'DEBUG_MODE',
            'message': 'Debug mode is enabled',
            'recommendation': 'Disable DEBUG mode in production'
        })
    
    # Session cookie güvenliği
    if not app.config.get('SESSION_COOKIE_SECURE', False):
        issues.append({
            'severity': 'HIGH',
            'category': 'SESSION_SECURITY',
            'message': 'SESSION_COOKIE_SECURE is not enabled',
            'recommendation': 'Enable SESSION_COOKIE_SECURE for HTTPS'
        })
    
    if not app.config.get('SESSION_COOKIE_HTTPONLY', True):
        issues.append({
            'severity': 'HIGH',
            'category': 'SESSION_SECURITY',
            'message': 'SESSION_COOKIE_HTTPONLY is not enabled',
            'recommendation': 'Enable SESSION_COOKIE_HTTPONLY to prevent XSS'
        })
    
    # JWT kontrolü
    if app.config.get('JWT_SECRET_KEY') in ['jwt-secret', 'jwt-secret-key', None]:
        issues.append({
            'severity': 'CRITICAL',
            'category': 'JWT_SECURITY',
            'message': 'Weak or default JWT_SECRET_KEY detected',
            'recommendation': 'Generate a strong random JWT_SECRET_KEY'
        })
    
    # Database URL kontrolü
    db_url = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if 'password' in db_url.lower() and ':password@' in db_url:
        issues.append({
            'severity': 'MEDIUM',
            'category': 'DATABASE',
            'message': 'Default database password detected',
            'recommendation': 'Use strong unique database password'
        })
    
    # Rate limiting kontrolü
    if not app.config.get('RATELIMIT_ENABLED', False):
        issues.append({
            'severity': 'MEDIUM',
            'category': 'RATE_LIMITING',
            'message': 'Rate limiting is disabled',
            'recommendation': 'Enable rate limiting to prevent abuse'
        })
    
    return issues
