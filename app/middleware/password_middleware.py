"""
Force Password Change Middleware.

Admin tarafından oluşturulan kullanıcıların ilk girişte
şifre değiştirmesini zorunlu kılar.
"""

from functools import wraps
from flask import request, jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from app.core.responses import error_response


# Şifre değişikliği gerektirmeyen endpoint'ler (whitelist)
PASSWORD_CHANGE_EXEMPT_ENDPOINTS = [
    # Auth işlemleri
    'auth.login',
    'auth.logout',
    'auth.refresh',
    
    # Şifre değiştirme endpoint'leri
    'users.change_password',
    'users.force_change_password',
    
    # Health check
    'health.health_check',
    'health.detailed_health',
    
    # Statik dosyalar
    'static',
]


def check_force_password_change():
    """
    JWT doğrulaması yapılan her istekte force_password_change kontrolü yapar.
    
    Kullanıcı force_password_change=True ise ve exempt endpoint değilse,
    403 hatası döner.
    """
    # JWT gerektiren bir endpoint mi kontrol et
    try:
        verify_jwt_in_request(optional=True)
    except:
        return None
    
    # JWT yoksa devam et
    user_id = get_jwt_identity()
    if not user_id:
        return None
    
    # Exempt endpoint kontrolü
    if request.endpoint in PASSWORD_CHANGE_EXEMPT_ENDPOINTS:
        return None
    
    # Kullanıcıyı getir
    from app.modules.users.models import User
    user = User.query.get(user_id)
    
    if not user:
        return None
    
    # force_password_change kontrolü
    if user.force_password_change:
        return jsonify({
            'success': False,
            'error': {
                'code': 'PASSWORD_CHANGE_REQUIRED',
                'message': 'Devam etmeden önce şifrenizi değiştirmeniz gerekmektedir',
                'details': {
                    'redirect_to': '/password/force-change',
                    'user_id': user.id
                }
            }
        }), 403
    
    # Hesap kilidi kontrolü
    if user.is_locked:
        return jsonify({
            'success': False,
            'error': {
                'code': 'ACCOUNT_LOCKED',
                'message': 'Hesabınız geçici olarak kilitlenmiştir',
                'details': {
                    'locked_until': user.locked_until.isoformat() if user.locked_until else None
                }
            }
        }), 403
    
    return None


def require_password_changed(f):
    """
    Decorator: Şifre değişikliği tamamlanmış olmalı.
    
    Kullanım:
        @app.route('/protected')
        @jwt_required()
        @require_password_changed
        def protected_route():
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        
        if not user_id:
            return f(*args, **kwargs)
        
        from app.modules.users.models import User
        user = User.query.get(user_id)
        
        if user and user.force_password_change:
            return error_response(
                message='Devam etmeden önce şifrenizi değiştirmeniz gerekmektedir',
                code='PASSWORD_CHANGE_REQUIRED',
                status_code=403
            )
        
        return f(*args, **kwargs)
    
    return decorated_function


def exempt_from_password_check(f):
    """
    Decorator: Bu endpoint'i şifre değişikliği kontrolünden muaf tutar.
    
    Kullanım:
        @app.route('/force-change-password')
        @jwt_required()
        @exempt_from_password_check
        def force_change():
            ...
    """
    f._exempt_from_password_check = True
    return f


def register_password_change_middleware(app):
    """
    Flask uygulamasına force password change middleware'ini kaydet.
    
    Args:
        app: Flask application instance
    """
    @app.before_request
    def before_request_password_check():
        """Her istek öncesi şifre değişikliği kontrolü."""
        # Endpoint exempt mi kontrol et
        if hasattr(app.view_functions.get(request.endpoint, None), '_exempt_from_password_check'):
            return None
        
        return check_force_password_change()
    
    app.logger.info('Force password change middleware registered')


# =============================================================================
# PASSWORD POLICY CONFIGURATION
# =============================================================================

class PasswordPolicy:
    """
    Şifre politikası yapılandırması.
    
    Şifre kurallarını merkezi olarak yönetir.
    """
    
    # Minimum şifre uzunluğu
    MIN_LENGTH = 8
    
    # Maksimum şifre uzunluğu
    MAX_LENGTH = 128
    
    # Gereksinimler
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = False
    
    # Özel karakterler
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;':\",./<>?"
    
    # Şifre geçmişi (son N şifre tekrar kullanılamaz)
    PASSWORD_HISTORY = 5
    
    # Şifre süresi (gün, 0 = sınırsız)
    PASSWORD_EXPIRY_DAYS = 90
    
    # Hesap kilitleme
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 30
    
    @classmethod
    def validate(cls, password: str) -> tuple:
        """
        Şifre politikasına uygunluğu doğrular.
        
        Args:
            password: Kontrol edilecek şifre
            
        Returns:
            tuple: (is_valid: bool, errors: list)
        """
        errors = []
        
        # Uzunluk kontrolü
        if len(password) < cls.MIN_LENGTH:
            errors.append(f'Şifre en az {cls.MIN_LENGTH} karakter olmalıdır')
        
        if len(password) > cls.MAX_LENGTH:
            errors.append(f'Şifre en fazla {cls.MAX_LENGTH} karakter olmalıdır')
        
        # Büyük harf kontrolü
        if cls.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append('Şifre en az bir büyük harf içermelidir')
        
        # Küçük harf kontrolü
        if cls.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append('Şifre en az bir küçük harf içermelidir')
        
        # Rakam kontrolü
        if cls.REQUIRE_DIGIT and not any(c.isdigit() for c in password):
            errors.append('Şifre en az bir rakam içermelidir')
        
        # Özel karakter kontrolü
        if cls.REQUIRE_SPECIAL and not any(c in cls.SPECIAL_CHARS for c in password):
            errors.append(f'Şifre en az bir özel karakter içermelidir ({cls.SPECIAL_CHARS})')
        
        return (len(errors) == 0, errors)
    
    @classmethod
    def get_requirements_text(cls) -> str:
        """Şifre gereksinimlerini metin olarak döner."""
        requirements = [f'En az {cls.MIN_LENGTH} karakter']
        
        if cls.REQUIRE_UPPERCASE:
            requirements.append('En az bir büyük harf')
        if cls.REQUIRE_LOWERCASE:
            requirements.append('En az bir küçük harf')
        if cls.REQUIRE_DIGIT:
            requirements.append('En az bir rakam')
        if cls.REQUIRE_SPECIAL:
            requirements.append('En az bir özel karakter')
        
        return ', '.join(requirements)
    
    @classmethod
    def get_requirements_dict(cls) -> dict:
        """Şifre gereksinimlerini dictionary olarak döner."""
        return {
            'min_length': cls.MIN_LENGTH,
            'max_length': cls.MAX_LENGTH,
            'require_uppercase': cls.REQUIRE_UPPERCASE,
            'require_lowercase': cls.REQUIRE_LOWERCASE,
            'require_digit': cls.REQUIRE_DIGIT,
            'require_special': cls.REQUIRE_SPECIAL,
            'special_chars': cls.SPECIAL_CHARS,
            'password_expiry_days': cls.PASSWORD_EXPIRY_DAYS,
            'max_failed_attempts': cls.MAX_FAILED_ATTEMPTS,
            'lockout_duration_minutes': cls.LOCKOUT_DURATION_MINUTES,
        }
