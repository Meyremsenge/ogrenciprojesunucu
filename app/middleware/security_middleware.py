"""
Anti-Pattern Prevention Middleware.

Tüm güvenlik kontrollerini bir araya getiren middleware.
Uygulama başlatılırken ve request'ler sırasında çalışır.
"""

import logging
from typing import Dict, Any
from functools import wraps
from datetime import datetime

from flask import Flask, request, g, jsonify, Response
from werkzeug.exceptions import HTTPException

from app.core.security_checks import (
    SecretKeyValidator,
    SQLInjectionGuard,
    XSSGuard,
    BruteForceProtection,
    InputValidator,
    SecurityAuditLogger,
    SensitiveDataMasker,
    security_health_check
)
from app.core.performance_guards import (
    QueryMonitor,
    MemoryGuard,
    CacheHelper,
    performance_health_check
)
from app.core.authorization_guards import (
    get_role_permissions,
    has_permission,
    AuthorizationAudit,
    authorization_health_check
)
from app.core.database_guards import (
    database_health_check
)

logger = logging.getLogger(__name__)


# =============================================================================
# SECURITY MIDDLEWARE
# =============================================================================

def register_security_middleware(app: Flask) -> None:
    """
    Güvenlik middleware'lerini Flask uygulamasına ekler.
    """
    
    @app.before_request
    def security_checks():
        """Her request öncesi güvenlik kontrolleri."""
        
        # 1. Query monitoring başlat
        QueryMonitor.start_request()
        
        # 2. Rate limiting / Brute force check (login endpoint için)
        if request.endpoint and 'login' in request.endpoint:
            identifier = request.remote_addr
            is_locked, remaining = BruteForceProtection.is_locked(identifier)
            if is_locked:
                SecurityAuditLogger.log_security_event(
                    'BRUTE_FORCE_BLOCKED',
                    'HIGH',
                    f'Request blocked due to too many attempts',
                    {'ip': identifier, 'remaining_seconds': remaining}
                )
                return jsonify({
                    'error': 'TOO_MANY_ATTEMPTS',
                    'message': f'Çok fazla deneme yaptınız. {remaining} saniye bekleyin.',
                    'retry_after': remaining
                }), 429
        
        # 3. SQL Injection kontrolü (GET parametreleri)
        for key, value in request.args.items():
            if SQLInjectionGuard.check_for_injection(str(value)):
                SecurityAuditLogger.log_security_event(
                    'SQL_INJECTION_ATTEMPT',
                    'CRITICAL',
                    f'Potential SQL injection in parameter: {key}',
                    {'parameter': key, 'value': str(value)[:100]}
                )
                return jsonify({
                    'error': 'INVALID_INPUT',
                    'message': 'Geçersiz karakter içeren parametre tespit edildi.'
                }), 400
        
        # 4. XSS kontrolü (GET parametreleri)
        for key, value in request.args.items():
            if XSSGuard.check_for_xss(str(value)):
                SecurityAuditLogger.log_security_event(
                    'XSS_ATTEMPT',
                    'HIGH',
                    f'Potential XSS in parameter: {key}',
                    {'parameter': key}
                )
                return jsonify({
                    'error': 'INVALID_INPUT',
                    'message': 'Geçersiz karakter içeren parametre tespit edildi.'
                }), 400
        
        # 5. Request boyutu kontrolü
        content_length = request.content_length or 0
        max_size = app.config.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)  # 16MB default
        if content_length > max_size:
            return jsonify({
                'error': 'PAYLOAD_TOO_LARGE',
                'message': 'İstek boyutu çok büyük.'
            }), 413
    
    @app.after_request
    def add_security_headers(response: Response) -> Response:
        """Response'a güvenlik header'ları ekler."""
        
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # CSP (Content Security Policy)
        if not response.headers.get('Content-Security-Policy'):
            response.headers['Content-Security-Policy'] = XSSGuard.get_csp_header()
        
        # HSTS (production'da)
        if app.config.get('ENV') == 'production':
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Query stats (development'ta)
        if app.config.get('DEBUG'):
            stats = QueryMonitor.end_request()
            response.headers['X-Query-Count'] = str(stats['total_queries'])
            response.headers['X-Query-Time-Ms'] = str(round(stats['total_query_time_ms'], 2))
        
        return response
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Tüm exception'ları yakalar ve güvenli şekilde döner."""
        
        # HTTP exception
        if isinstance(e, HTTPException):
            return jsonify({
                'error': e.name.upper().replace(' ', '_'),
                'message': e.description
            }), e.code
        
        # Application exception
        if hasattr(e, 'to_dict'):
            return jsonify(e.to_dict()), getattr(e, 'status_code', 500)
        
        # Unexpected exception - detayları loglama
        logger.exception('Unhandled exception occurred')
        SecurityAuditLogger.log_security_event(
            'UNHANDLED_EXCEPTION',
            'HIGH',
            str(e)[:200],
            {'type': type(e).__name__}
        )
        
        # Production'da detay gösterme
        if app.config.get('ENV') == 'production':
            return jsonify({
                'error': 'INTERNAL_ERROR',
                'message': 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
            }), 500
        else:
            return jsonify({
                'error': 'INTERNAL_ERROR',
                'message': str(e),
                'type': type(e).__name__
            }), 500


# =============================================================================
# STARTUP CHECKS
# =============================================================================

def run_startup_checks(app: Flask) -> Dict[str, Any]:
    """
    Uygulama başlangıcında güvenlik kontrollerini çalıştırır.
    """
    results = {
        'timestamp': datetime.utcnow().isoformat(),
        'checks': {}
    }
    
    # 1. Security check
    with app.app_context():
        security_result = security_health_check()
        results['checks']['security'] = security_result
        
        if security_result['status'] == 'FAIL':
            for issue in security_result.get('critical_issues', []):
                logger.critical(f"SECURITY_CHECK_FAILED: {issue}")
    
    # 2. Authorization check
    auth_result = authorization_health_check()
    results['checks']['authorization'] = auth_result
    
    # 3. Performance check
    perf_result = performance_health_check()
    results['checks']['performance'] = perf_result
    
    # Overall status
    all_passed = all(
        check.get('status') == 'PASS'
        for check in results['checks'].values()
    )
    results['overall_status'] = 'PASS' if all_passed else 'FAIL'
    
    return results


# =============================================================================
# HEALTH CHECK ENDPOINTS
# =============================================================================

def register_health_endpoints(app: Flask) -> None:
    """
    Health check endpoint'lerini kayıt eder.
    """
    
    @app.route('/health')
    def health():
        """Basit health check."""
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    @app.route('/health/detailed')
    def health_detailed():
        """Detaylı health check (admin only)."""
        # TODO: Admin authentication ekle
        
        from app.extensions import db
        
        results = {
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {}
        }
        
        # Security check
        results['checks']['security'] = security_health_check()
        
        # Authorization check
        results['checks']['authorization'] = authorization_health_check()
        
        # Performance check
        results['checks']['performance'] = performance_health_check()
        
        # Database check
        try:
            results['checks']['database'] = database_health_check(db)
        except Exception as e:
            results['checks']['database'] = {
                'status': 'FAIL',
                'error': str(e)
            }
        
        # Overall status
        all_passed = all(
            check.get('status') == 'PASS'
            for check in results['checks'].values()
        )
        results['overall_status'] = 'PASS' if all_passed else 'FAIL'
        
        status_code = 200 if all_passed else 503
        return jsonify(results), status_code


# =============================================================================
# REQUEST LOGGING DECORATOR
# =============================================================================

def log_request(include_body: bool = False, mask_sensitive: bool = True):
    """
    Request'leri loglayan decorator.
    
    Args:
        include_body: Request body'yi logla
        mask_sensitive: Hassas verileri maskele
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            log_data = {
                'method': request.method,
                'path': request.path,
                'ip': request.remote_addr,
                'user_agent': request.headers.get('User-Agent', '')[:100],
            }
            
            if include_body and request.is_json:
                body = request.get_json(silent=True) or {}
                if mask_sensitive:
                    body = SensitiveDataMasker.mask_dict(body)
                log_data['body'] = body
            
            logger.info(f'REQUEST: {request.method} {request.path}', extra=log_data)
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    'register_security_middleware',
    'run_startup_checks',
    'register_health_endpoints',
    'log_request',
]
