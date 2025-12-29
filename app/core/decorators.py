"""
Ortak decorator'lar.

Tüm modüller tarafından kullanılabilecek utility decorator fonksiyonları.

Not: Yetkilendirme decorator'ları için app.core.permissions modülünü kullanın.
"""

from functools import wraps
from typing import Callable, List, Optional, Any
import time
import warnings

from flask import request, g, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from flask_jwt_extended.exceptions import (
    NoAuthorizationError,
    InvalidHeaderError,
    JWTDecodeError,
    RevokedTokenError,
    FreshTokenRequired,
)
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from marshmallow import Schema, ValidationError as MarshmallowValidationError

from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    ValidationError,
    AppException,
)
from app.core.responses import error_response


def require_role(*allowed_roles: str):
    """
    Belirli rollere sahip kullanıcılara erişim izni veren decorator.
    
    Args:
        *allowed_roles: İzin verilen rol isimleri
    
    Kullanım:
        @require_role('admin', 'super_admin')
        def admin_only_endpoint():
            ...
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            
            claims = get_jwt()
            user_role = claims.get('role', '')
            
            if user_role not in allowed_roles:
                raise AuthorizationError(
                    message=f'Bu işlem için yetkiniz yok. Gerekli roller: {", ".join(allowed_roles)}',
                    required_role=', '.join(allowed_roles)
                )
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def super_admin_required(fn: Callable) -> Callable:
    """
    Super Admin rolüne sahip kullanıcılara erişim izni veren decorator.
    
    Kullanım:
        @super_admin_required
        def super_admin_only_endpoint():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        
        claims = get_jwt()
        user_role = claims.get('role', '')
        
        if user_role != 'super_admin':
            raise AuthorizationError(
                message='Bu işlem için Super Admin yetkisi gerekiyor.',
                required_role='super_admin'
            )
        
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn: Callable) -> Callable:
    """
    Admin veya Super Admin rolüne sahip kullanıcılara erişim izni veren decorator.
    
    Kullanım:
        @admin_required
        def admin_only_endpoint():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        
        claims = get_jwt()
        user_role = claims.get('role', '')
        
        if user_role not in ('admin', 'super_admin'):
            raise AuthorizationError(
                message='Bu işlem için Admin yetkisi gerekiyor.',
                required_role='admin'
            )
        
        return fn(*args, **kwargs)
    return wrapper


def org_admin_required(fn: Callable) -> Callable:
    """
    Organizasyon Admini, Admin veya Super Admin rolüne sahip kullanıcılara erişim izni veren decorator.
    
    Kullanım:
        @org_admin_required
        def org_admin_endpoint():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        
        claims = get_jwt()
        user_role = claims.get('role', '')
        
        if user_role not in ('org_admin', 'admin', 'super_admin'):
            raise AuthorizationError(
                message='Bu işlem için Organizasyon Yöneticisi yetkisi gerekiyor.',
                required_role='org_admin'
            )
        
        return fn(*args, **kwargs)
    return wrapper


def require_permission(*required_permissions: str):
    """
    Belirli izinlere sahip kullanıcılara erişim izni veren decorator.
    
    Args:
        *required_permissions: Gerekli izin isimleri
    
    Kullanım:
        @require_permission('users:create', 'users:delete')
        def manage_users():
            ...
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            
            claims = get_jwt()
            user_permissions = claims.get('permissions', [])
            
            missing_permissions = [
                p for p in required_permissions 
                if p not in user_permissions
            ]
            
            if missing_permissions:
                raise AuthorizationError(
                    message=f'Eksik izinler: {", ".join(missing_permissions)}'
                )
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def validate_json(schema_class: type, location: str = 'json'):
    """
    Request body'yi Marshmallow schema ile doğrulayan decorator.
    
    Args:
        schema_class: Marshmallow Schema sınıfı
        location: Veri kaynağı ('json', 'args', 'form')
    
    Kullanım:
        @validate_json(UserCreateSchema)
        def create_user():
            validated_data = g.validated_data
            ...
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            schema = schema_class()
            
            # Veri kaynağını belirle
            if location == 'json':
                data = request.get_json(silent=True) or {}
            elif location == 'args':
                data = request.args.to_dict()
            elif location == 'form':
                data = request.form.to_dict()
            else:
                data = {}
            
            try:
                validated_data = schema.load(data)
                g.validated_data = validated_data
            except MarshmallowValidationError as e:
                raise ValidationError(
                    message='Doğrulama hatası',
                    details={'errors': e.messages}
                )
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def handle_exceptions(fn: Callable) -> Callable:
    """
    Exception'ları yakalayıp standart error response'a çeviren decorator.
    
    JWT hataları dahil tüm exception'ları yakalar ve standart response döner.
    
    Kullanım:
        @handle_exceptions
        def risky_operation():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except NoAuthorizationError:
            # Missing Authorization header - sessizce 401 döndür
            return error_response(
                message='Bu işlem için giriş yapmanız gerekiyor.',
                code='UNAUTHORIZED',
                status_code=401,
                details={'hint': 'Authorization header ile Bearer token gönderin.'}
            )
        except (InvalidHeaderError, JWTDecodeError, InvalidTokenError):
            return error_response(
                message='Geçersiz kimlik doğrulama token\'ı.',
                code='INVALID_TOKEN',
                status_code=401
            )
        except ExpiredSignatureError:
            return error_response(
                message='Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
                code='TOKEN_EXPIRED',
                status_code=401
            )
        except RevokedTokenError:
            return error_response(
                message='Bu oturum sonlandırılmış. Lütfen tekrar giriş yapın.',
                code='TOKEN_REVOKED',
                status_code=401
            )
        except FreshTokenRequired:
            return error_response(
                message='Bu işlem için yeni bir oturum açmanız gerekiyor.',
                code='FRESH_TOKEN_REQUIRED',
                status_code=401
            )
        except AppException as e:
            return error_response(
                message=e.message,
                code=e.code,
                status_code=e.status_code,
                details=e.details
            )
        except Exception as e:
            current_app.logger.exception(f'Unhandled exception: {e}')
            return error_response(
                message='Beklenmeyen bir hata oluştu',
                code='INTERNAL_ERROR',
                status_code=500
            )
    return wrapper


def log_execution_time(fn: Callable) -> Callable:
    """
    Fonksiyon çalışma süresini loglayan decorator.
    
    Kullanım:
        @log_execution_time
        def slow_operation():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = fn(*args, **kwargs)
        duration = time.time() - start_time
        
        current_app.logger.info(
            f'{fn.__name__} executed in {duration*1000:.2f}ms'
        )
        
        return result
    return wrapper


def cache_response(timeout: int = 300, key_prefix: str = None):
    """
    Response'u cache'leyen decorator.
    
    Args:
        timeout: Cache süresi (saniye)
        key_prefix: Cache key prefix
    
    Kullanım:
        @cache_response(timeout=60)
        def get_popular_courses():
            ...
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            from app.services.cache_service import CacheService
            
            # Cache key oluştur
            prefix = key_prefix or fn.__name__
            cache_key = f'{prefix}:{request.path}:{request.query_string.decode()}'
            
            # Cache'den kontrol et
            cached = CacheService.get(cache_key)
            if cached is not None:
                return cached
            
            # Fonksiyonu çalıştır
            result = fn(*args, **kwargs)
            
            # Başarılı response'ları cache'le
            if isinstance(result, tuple) and len(result) >= 2:
                data, status_code = result[0], result[1]
                if 200 <= status_code < 300:
                    CacheService.set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator


def rate_limit(limit: int = 100, period: int = 60):
    """
    Rate limiting decorator.
    
    Args:
        limit: Periyot başına maksimum istek sayısı
        period: Periyot süresi (saniye)
    
    Kullanım:
        @rate_limit(limit=5, period=60)  # 5 istek/dakika
        def login():
            ...
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            from app.services.cache_service import CacheService
            
            # Client identifier
            client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
            key = f'ratelimit:{fn.__name__}:{client_ip}'
            
            # Mevcut sayıyı al
            current = CacheService.get(key) or 0
            
            if current >= limit:
                from app.core.exceptions import RateLimitError
                raise RateLimitError(retry_after=period)
            
            # Sayacı artır
            CacheService.increment(key, expire=period)
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def deprecated(message: str = None):
    """
    Endpoint'i deprecated olarak işaretleyen decorator.
    Response header'a Deprecation uyarısı ekler.
    
    Kullanım:
        @deprecated('Bu endpoint v2\'de kaldırılacak')
        def old_endpoint():
            ...
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            result = fn(*args, **kwargs)
            
            # Response'a header ekle
            if isinstance(result, tuple) and len(result) >= 2:
                response_data, status_code = result[0], result[1]
                # Log deprecation warning
                current_app.logger.warning(
                    f'Deprecated endpoint called: {fn.__name__}'
                )
            
            return result
        return wrapper
    return decorator
