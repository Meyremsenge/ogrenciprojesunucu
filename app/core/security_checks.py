"""
Security Checks Module.

Anti-pattern ve güvenlik risklerini önlemek için kontroller.
Senior Software Reviewer perspektifinden hazırlanmıştır.

Kapsanan Alanlar:
    - Güvenlik açıkları
    - Performans hataları
    - Mimari yanlışlar
    - Veritabanı tasarım hataları
    - Yetkilendirme zaafları
"""

import os
import re
import logging
from typing import Dict, List, Optional, Tuple, Any
from functools import wraps
from datetime import datetime, timedelta

from flask import request, g, current_app

logger = logging.getLogger(__name__)


# =============================================================================
# 1. GÜVENLİK AÇIKLARI - SECRET KEY VE SENSİTİF VERİ KONTROLÜ
# =============================================================================

class SecretKeyValidator:
    """
    Secret key'lerin production'da güvenli olduğunu doğrular.
    
    RİSK: Hardcoded veya zayıf secret key'ler brute-force saldırılarına
          açık kapı bırakır. JWT token'lar çözülebilir.
    
    ÖNLEM: Minimum 32 karakter, rastgele üretilmiş key'ler zorunlu.
    """
    
    WEAK_KEYS = [
        'dev-secret-key',
        'jwt-secret-key',
        'secret',
        'password',
        'changeme',
        'development',
        'test',
    ]
    
    MIN_KEY_LENGTH = 32
    
    @classmethod
    def validate(cls, key: str, key_name: str = 'SECRET_KEY') -> Tuple[bool, Optional[str]]:
        """
        Secret key güvenliğini doğrular.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not key:
            return False, f'{key_name} tanımlanmamış'
        
        if len(key) < cls.MIN_KEY_LENGTH:
            return False, f'{key_name} en az {cls.MIN_KEY_LENGTH} karakter olmalı'
        
        # Zayıf key kontrolü
        key_lower = key.lower()
        for weak in cls.WEAK_KEYS:
            if weak in key_lower:
                return False, f'{key_name} zayıf bir değer içeriyor: {weak}'
        
        # Entropy kontrolü (basit)
        unique_chars = len(set(key))
        if unique_chars < 10:
            return False, f'{key_name} yeterince karmaşık değil'
        
        return True, None
    
    @classmethod
    def check_production_secrets(cls) -> List[Dict[str, str]]:
        """Production ortamında secret'ları kontrol eder."""
        issues = []
        env = os.getenv('FLASK_ENV', 'development')
        
        if env == 'production':
            secrets_to_check = [
                ('SECRET_KEY', os.getenv('SECRET_KEY')),
                ('JWT_SECRET_KEY', os.getenv('JWT_SECRET_KEY')),
            ]
            
            for name, value in secrets_to_check:
                is_valid, error = cls.validate(value or '', name)
                if not is_valid:
                    issues.append({
                        'key': name,
                        'error': error,
                        'severity': 'CRITICAL'
                    })
        
        return issues


# =============================================================================
# 2. SQL INJECTION KORUMALARI
# =============================================================================

class SQLInjectionGuard:
    """
    SQL Injection saldırılarını önler.
    
    RİSK: Raw SQL kullanımı ve string interpolation ile SQL sorguları
          veritabanının ele geçirilmesine yol açabilir.
    
    ÖNLEM: 
        - Parametreli sorgular kullan
        - ORM (SQLAlchemy) kullan
        - Input sanitization yap
    """
    
    # Tehlikeli SQL pattern'leri
    DANGEROUS_PATTERNS = [
        r"(\s|^)(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\s",
        r"--",
        r"/\*.*\*/",
        r";.*(\s|$)",
        r"'.*OR.*'",
        r"\".*OR.*\"",
        r"xp_",
        r"exec(\s|\()",
    ]
    
    @classmethod
    def sanitize_input(cls, value: str) -> str:
        """
        Kullanıcı girdisini SQL injection'a karşı temizler.
        
        NOT: Bu yöntem ORM yerine geçmez, ek güvenlik katmanıdır.
        """
        if not isinstance(value, str):
            return value
        
        # Tehlikeli karakterleri escape et
        dangerous_chars = ["'", '"', ';', '--', '/*', '*/', 'xp_']
        result = value
        for char in dangerous_chars:
            result = result.replace(char, '')
        
        return result
    
    @classmethod
    def check_for_injection(cls, value: str) -> bool:
        """
        SQL injection pattern'i var mı kontrol eder.
        
        Returns:
            True if potential injection detected
        """
        if not isinstance(value, str):
            return False
        
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                logger.warning(f'Potential SQL injection detected: {value[:50]}...')
                return True
        
        return False


# =============================================================================
# 3. XSS KORUMALARI
# =============================================================================

class XSSGuard:
    """
    Cross-Site Scripting (XSS) saldırılarını önler.
    
    RİSK: Kullanıcı girdilerinin sanitize edilmeden render edilmesi
          JavaScript injection'a ve session hijacking'e yol açar.
    
    ÖNLEM:
        - HTML encode uygula
        - Content-Security-Policy header kullan
        - Input validation yap
    """
    
    DANGEROUS_TAGS = [
        '<script', '</script>', 
        '<iframe', '</iframe>',
        'javascript:', 
        'onerror=', 'onload=', 'onclick=', 'onmouseover=',
        '<svg', '<embed', '<object',
    ]
    
    @classmethod
    def sanitize_html(cls, value: str) -> str:
        """HTML içeriğini XSS'e karşı temizler."""
        if not isinstance(value, str):
            return value
        
        import html
        # HTML encode
        result = html.escape(value)
        return result
    
    @classmethod
    def check_for_xss(cls, value: str) -> bool:
        """XSS pattern'i var mı kontrol eder."""
        if not isinstance(value, str):
            return False
        
        value_lower = value.lower()
        for tag in cls.DANGEROUS_TAGS:
            if tag.lower() in value_lower:
                logger.warning(f'Potential XSS detected: {value[:50]}...')
                return True
        
        return False
    
    @classmethod
    def get_csp_header(cls) -> str:
        """Content-Security-Policy header değerini döndürür."""
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "frame-ancestors 'none'; "
            "form-action 'self';"
        )


# =============================================================================
# 4. RATE LIMITING VE BRUTE-FORCE KORUMASI
# =============================================================================

class BruteForceProtection:
    """
    Brute-force saldırılarını önler.
    
    RİSK: Sınırsız login denemesi şifre kırma saldırılarına izin verir.
    
    ÖNLEM:
        - IP bazlı rate limiting
        - Kullanıcı bazlı rate limiting
        - Progressive delay (artan bekleme süresi)
        - CAPTCHA entegrasyonu
    """
    
    # Varsayılan limitler
    DEFAULT_MAX_ATTEMPTS = 5
    DEFAULT_LOCKOUT_DURATION = 900  # 15 dakika
    
    # In-memory cache (production'da Redis kullanılmalı)
    _attempts_cache: Dict[str, List[datetime]] = {}
    _lockouts: Dict[str, datetime] = {}
    
    @classmethod
    def record_attempt(cls, identifier: str, success: bool = False) -> None:
        """Login denemesini kaydeder."""
        if success:
            # Başarılı login - sayacı sıfırla
            cls._attempts_cache.pop(identifier, None)
            cls._lockouts.pop(identifier, None)
            return
        
        # Başarısız deneme
        now = datetime.utcnow()
        if identifier not in cls._attempts_cache:
            cls._attempts_cache[identifier] = []
        
        cls._attempts_cache[identifier].append(now)
        
        # Eski denemeleri temizle (1 saat öncesini)
        cutoff = now - timedelta(hours=1)
        cls._attempts_cache[identifier] = [
            dt for dt in cls._attempts_cache[identifier]
            if dt > cutoff
        ]
        
        # Limit aşıldı mı kontrol et
        if len(cls._attempts_cache[identifier]) >= cls.DEFAULT_MAX_ATTEMPTS:
            cls._lockouts[identifier] = now + timedelta(seconds=cls.DEFAULT_LOCKOUT_DURATION)
            logger.warning(f'Account locked due to too many attempts: {identifier}')
    
    @classmethod
    def is_locked(cls, identifier: str) -> Tuple[bool, Optional[int]]:
        """
        Hesabın kilitli olup olmadığını kontrol eder.
        
        Returns:
            Tuple of (is_locked, remaining_seconds)
        """
        if identifier not in cls._lockouts:
            return False, None
        
        lockout_until = cls._lockouts[identifier]
        now = datetime.utcnow()
        
        if now >= lockout_until:
            # Kilit süresi doldu
            cls._lockouts.pop(identifier, None)
            return False, None
        
        remaining = int((lockout_until - now).total_seconds())
        return True, remaining
    
    @classmethod
    def get_attempt_count(cls, identifier: str) -> int:
        """Kalan deneme sayısını döndürür."""
        attempts = len(cls._attempts_cache.get(identifier, []))
        return max(0, cls.DEFAULT_MAX_ATTEMPTS - attempts)


# =============================================================================
# 5. INPUT VALIDATION
# =============================================================================

class InputValidator:
    """
    Kullanıcı girdilerini doğrular.
    
    RİSK: Doğrulanmamış girdiler injection saldırılarına,
          buffer overflow'a ve mantık hatalarına yol açar.
    
    ÖNLEM:
        - Tür kontrolü
        - Uzunluk sınırları
        - Format doğrulama
        - Whitelist yaklaşımı
    """
    
    @staticmethod
    def validate_email(email: str) -> Tuple[bool, Optional[str]]:
        """E-posta formatını doğrular."""
        if not email:
            return False, 'E-posta gerekli'
        
        if len(email) > 254:
            return False, 'E-posta çok uzun'
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return False, 'Geçersiz e-posta formatı'
        
        return True, None
    
    @staticmethod
    def validate_password(password: str) -> Tuple[bool, Optional[str]]:
        """Şifre güvenliğini doğrular."""
        if not password:
            return False, 'Şifre gerekli'
        
        if len(password) < 8:
            return False, 'Şifre en az 8 karakter olmalı'
        
        if len(password) > 128:
            return False, 'Şifre çok uzun'
        
        if not re.search(r'[A-Z]', password):
            return False, 'En az bir büyük harf gerekli'
        
        if not re.search(r'[a-z]', password):
            return False, 'En az bir küçük harf gerekli'
        
        if not re.search(r'\d', password):
            return False, 'En az bir rakam gerekli'
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return False, 'En az bir özel karakter gerekli'
        
        return True, None
    
    @staticmethod
    def validate_string(
        value: str,
        field_name: str,
        min_length: int = 1,
        max_length: int = 1000,
        pattern: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """Genel string validasyonu."""
        if not value:
            return False, f'{field_name} gerekli'
        
        if len(value) < min_length:
            return False, f'{field_name} en az {min_length} karakter olmalı'
        
        if len(value) > max_length:
            return False, f'{field_name} en fazla {max_length} karakter olabilir'
        
        if pattern and not re.match(pattern, value):
            return False, f'{field_name} formatı geçersiz'
        
        return True, None
    
    @staticmethod
    def validate_integer(
        value: Any,
        field_name: str,
        min_value: Optional[int] = None,
        max_value: Optional[int] = None
    ) -> Tuple[bool, Optional[str]]:
        """Integer validasyonu."""
        try:
            int_value = int(value)
        except (TypeError, ValueError):
            return False, f'{field_name} geçerli bir sayı olmalı'
        
        if min_value is not None and int_value < min_value:
            return False, f'{field_name} en az {min_value} olmalı'
        
        if max_value is not None and int_value > max_value:
            return False, f'{field_name} en fazla {max_value} olabilir'
        
        return True, None


# =============================================================================
# 6. AUDIT LOGGING
# =============================================================================

class SecurityAuditLogger:
    """
    Güvenlik olaylarını loglar.
    
    RİSK: Audit log olmadan güvenlik ihlalleri tespit edilemez
          ve forensic analiz yapılamaz.
    
    ÖNLEM:
        - Tüm kritik işlemleri logla
        - Log'ları merkezi sisteme gönder
        - Tamper-proof storage kullan
    """
    
    @staticmethod
    def log_auth_event(
        event_type: str,
        user_id: Optional[int] = None,
        email: Optional[str] = None,
        success: bool = True,
        details: Optional[Dict] = None
    ) -> None:
        """Authentication olayını loglar."""
        log_data = {
            'event_type': event_type,
            'user_id': user_id,
            'email': email,
            'success': success,
            'ip_address': request.remote_addr if request else None,
            'user_agent': request.headers.get('User-Agent') if request else None,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }
        
        if success:
            logger.info(f'AUTH_EVENT: {event_type}', extra=log_data)
        else:
            logger.warning(f'AUTH_EVENT_FAILED: {event_type}', extra=log_data)
    
    @staticmethod
    def log_access_event(
        resource: str,
        action: str,
        user_id: Optional[int] = None,
        allowed: bool = True,
        reason: Optional[str] = None
    ) -> None:
        """Erişim olayını loglar."""
        log_data = {
            'event_type': 'ACCESS',
            'resource': resource,
            'action': action,
            'user_id': user_id,
            'allowed': allowed,
            'reason': reason,
            'ip_address': request.remote_addr if request else None,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if allowed:
            logger.info(f'ACCESS_GRANTED: {resource}:{action}', extra=log_data)
        else:
            logger.warning(f'ACCESS_DENIED: {resource}:{action}', extra=log_data)
    
    @staticmethod
    def log_security_event(
        event_type: str,
        severity: str,
        message: str,
        details: Optional[Dict] = None
    ) -> None:
        """Güvenlik olayını loglar."""
        log_data = {
            'event_type': event_type,
            'severity': severity,
            'message': message,
            'ip_address': request.remote_addr if request else None,
            'user_agent': request.headers.get('User-Agent') if request else None,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }
        
        if severity == 'CRITICAL':
            logger.critical(f'SECURITY_EVENT: {event_type}', extra=log_data)
        elif severity == 'HIGH':
            logger.error(f'SECURITY_EVENT: {event_type}', extra=log_data)
        elif severity == 'MEDIUM':
            logger.warning(f'SECURITY_EVENT: {event_type}', extra=log_data)
        else:
            logger.info(f'SECURITY_EVENT: {event_type}', extra=log_data)


# =============================================================================
# 7. REQUEST VALIDATION DECORATOR
# =============================================================================

def validate_request(
    required_fields: Optional[List[str]] = None,
    max_content_length: int = 1024 * 1024,  # 1MB
    allowed_content_types: Optional[List[str]] = None
):
    """
    Request validasyonu yapan decorator.
    
    RİSK: Büyük payload'lar DoS saldırısına,
          beklenmeyen content type'lar güvenlik açığına yol açar.
    
    Args:
        required_fields: Zorunlu JSON alanları
        max_content_length: Maksimum içerik boyutu
        allowed_content_types: İzin verilen content type'lar
    """
    if allowed_content_types is None:
        allowed_content_types = ['application/json']
    
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Content length kontrolü
            content_length = request.content_length or 0
            if content_length > max_content_length:
                from app.core.exceptions import ValidationError
                raise ValidationError(
                    f'İçerik boyutu çok büyük (max: {max_content_length} bytes)'
                )
            
            # Content type kontrolü
            content_type = request.content_type or ''
            if request.method in ['POST', 'PUT', 'PATCH']:
                if not any(ct in content_type for ct in allowed_content_types):
                    from app.core.exceptions import ValidationError
                    raise ValidationError(
                        f'Geçersiz content type: {content_type}'
                    )
            
            # Required fields kontrolü
            if required_fields and request.is_json:
                data = request.get_json(silent=True) or {}
                missing = [f for f in required_fields if f not in data]
                if missing:
                    from app.core.exceptions import ValidationError
                    raise ValidationError(
                        f'Eksik alanlar: {", ".join(missing)}'
                    )
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


# =============================================================================
# 8. SENSITIVE DATA MASKING
# =============================================================================

class SensitiveDataMasker:
    """
    Hassas verileri maskeler (loglama için).
    
    RİSK: Hassas verilerin loglara yazılması veri sızıntısına yol açar.
    
    ÖNLEM:
        - Şifreleri maskele
        - Kişisel verileri anonim hale getir
        - Token'ları kısalt
    """
    
    SENSITIVE_FIELDS = [
        'password', 'password_hash', 'token', 'access_token',
        'refresh_token', 'secret', 'api_key', 'credit_card',
        'ssn', 'tc_kimlik', 'phone', 'email'
    ]
    
    @classmethod
    def mask_dict(cls, data: Dict, mask_char: str = '*') -> Dict:
        """Dictionary içindeki hassas verileri maskeler."""
        if not isinstance(data, dict):
            return data
        
        result = {}
        for key, value in data.items():
            key_lower = key.lower()
            
            # Hassas alan kontrolü
            is_sensitive = any(sf in key_lower for sf in cls.SENSITIVE_FIELDS)
            
            if is_sensitive and isinstance(value, str):
                if len(value) <= 4:
                    result[key] = mask_char * len(value)
                else:
                    result[key] = value[:2] + mask_char * (len(value) - 4) + value[-2:]
            elif isinstance(value, dict):
                result[key] = cls.mask_dict(value, mask_char)
            elif isinstance(value, list):
                result[key] = [
                    cls.mask_dict(item, mask_char) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                result[key] = value
        
        return result
    
    @classmethod
    def mask_email(cls, email: str) -> str:
        """E-postayı maskeler."""
        if not email or '@' not in email:
            return '***'
        
        parts = email.split('@')
        username = parts[0]
        domain = parts[1]
        
        if len(username) <= 2:
            masked_username = '*' * len(username)
        else:
            masked_username = username[0] + '*' * (len(username) - 2) + username[-1]
        
        return f'{masked_username}@{domain}'


# =============================================================================
# 9. SECURITY HEALTH CHECK
# =============================================================================

def security_health_check() -> Dict[str, Any]:
    """
    Güvenlik durumunu kontrol eder.
    
    Production deployment öncesi çalıştırılmalı.
    """
    issues = []
    warnings = []
    
    # 1. Secret key kontrolü
    secret_issues = SecretKeyValidator.check_production_secrets()
    for issue in secret_issues:
        issues.append(issue)
    
    # 2. Environment kontrolü
    env = os.getenv('FLASK_ENV', 'development')
    if env == 'production':
        # Debug mode kontrolü
        if os.getenv('FLASK_DEBUG', '').lower() == 'true':
            issues.append({
                'key': 'DEBUG_MODE',
                'error': 'Production ortamında DEBUG modu açık',
                'severity': 'CRITICAL'
            })
        
        # HTTPS kontrolü (uygulama seviyesinde yapılamaz ama uyarı verilebilir)
        warnings.append({
            'key': 'HTTPS',
            'message': 'HTTPS zorunlu olmalı - reverse proxy konfigürasyonunu kontrol edin',
            'severity': 'INFO'
        })
    
    # 3. Database URL kontrolü
    db_url = os.getenv('DATABASE_URL', '')
    if 'password' in db_url.lower() and 'localhost' not in db_url:
        warnings.append({
            'key': 'DATABASE_URL',
            'message': 'Veritabanı bağlantı bilgileri environment variable ile sağlanmalı',
            'severity': 'MEDIUM'
        })
    
    return {
        'status': 'FAIL' if issues else 'PASS',
        'environment': env,
        'critical_issues': [i for i in issues if i.get('severity') == 'CRITICAL'],
        'issues': issues,
        'warnings': warnings,
        'timestamp': datetime.utcnow().isoformat()
    }


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    'SecretKeyValidator',
    'SQLInjectionGuard',
    'XSSGuard',
    'BruteForceProtection',
    'InputValidator',
    'SecurityAuditLogger',
    'SensitiveDataMasker',
    'validate_request',
    'security_health_check',
]
