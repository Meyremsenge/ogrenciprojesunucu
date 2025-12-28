"""
Özel exception sınıfları.

Tüm uygulama exception'ları bu modülde tanımlanır.
HTTP status code'ları ve error code'ları ile birlikte döner.
"""

from typing import Optional, Dict, Any


class AppException(Exception):
    """
    Tüm uygulama exception'larının base class'ı.
    
    Attributes:
        message: Kullanıcıya gösterilecek mesaj
        code: Makine tarafından okunabilir hata kodu
        status_code: HTTP status code
        details: Ek hata detayları
    """
    
    status_code: int = 500
    code: str = 'INTERNAL_ERROR'
    
    def __init__(
        self,
        message: str = 'Bir hata oluştu',
        code: str = None,
        status_code: int = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code or self.__class__.code
        self.status_code = status_code or self.__class__.status_code
        self.details = details or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Exception'ı JSON serializable dict'e çevir."""
        result = {
            'code': self.code,
            'message': self.message,
        }
        if self.details:
            result['details'] = self.details
        return result
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(message='{self.message}', code='{self.code}')"


class ValidationError(AppException):
    """
    Veri doğrulama hatası.
    
    Kullanım:
        raise ValidationError('E-posta formatı geçersiz', details={'field': 'email'})
    """
    status_code = 400
    code = 'VALIDATION_ERROR'
    
    def __init__(
        self,
        message: str = 'Doğrulama hatası',
        field: str = None,
        details: Optional[Dict[str, Any]] = None
    ):
        if field:
            details = details or {}
            details['field'] = field
        super().__init__(message=message, details=details)


class NotFoundError(AppException):
    """
    Kaynak bulunamadı hatası.
    
    Kullanım:
        raise NotFoundError('Kullanıcı', user_id)
    """
    status_code = 404
    code = 'NOT_FOUND'
    
    def __init__(
        self,
        resource: str = 'Kaynak',
        resource_id: Any = None,
        message: str = None
    ):
        if message is None:
            if resource_id:
                message = f'{resource} bulunamadı: {resource_id}'
            else:
                message = f'{resource} bulunamadı'
        
        details = {'resource': resource}
        if resource_id:
            details['resource_id'] = str(resource_id)
        
        super().__init__(message=message, details=details)


class AuthenticationError(AppException):
    """
    Kimlik doğrulama hatası.
    
    Kullanım:
        raise AuthenticationError('Geçersiz token')
    """
    status_code = 401
    code = 'AUTHENTICATION_ERROR'
    
    def __init__(self, message: str = 'Kimlik doğrulama gerekli'):
        super().__init__(message=message)


class AuthorizationError(AppException):
    """
    Yetkilendirme hatası.
    
    Kullanım:
        raise AuthorizationError('Bu işlem için yetkiniz yok')
    """
    status_code = 403
    code = 'AUTHORIZATION_ERROR'
    
    def __init__(
        self,
        message: str = 'Bu işlem için yetkiniz yok',
        required_role: str = None
    ):
        details = {}
        if required_role:
            details['required_role'] = required_role
        super().__init__(message=message, details=details if details else None)


class ForbiddenError(AppException):
    """
    Yasaklanmış işlem hatası.
    
    Kullanım:
        raise ForbiddenError('Bu kaynağa erişim izniniz yok')
    """
    status_code = 403
    code = 'FORBIDDEN'
    
    def __init__(
        self,
        message: str = 'Bu işleme erişim izniniz yok',
        resource: str = None
    ):
        details = {'resource': resource} if resource else None
        super().__init__(message=message, details=details)


class ConflictError(AppException):
    """
    Kaynak çakışması hatası.
    
    Kullanım:
        raise ConflictError('Bu e-posta adresi zaten kayıtlı')
    """
    status_code = 409
    code = 'CONFLICT'
    
    def __init__(
        self,
        message: str = 'Kaynak çakışması',
        resource: str = None
    ):
        details = {'resource': resource} if resource else None
        super().__init__(message=message, details=details)


class RateLimitError(AppException):
    """
    Rate limit aşıldı hatası.
    
    Kullanım:
        raise RateLimitError(retry_after=60)
    """
    status_code = 429
    code = 'RATE_LIMIT_EXCEEDED'
    
    def __init__(
        self,
        message: str = 'Çok fazla istek gönderildi',
        retry_after: int = None
    ):
        details = {}
        if retry_after:
            details['retry_after'] = retry_after
        super().__init__(message=message, details=details if details else None)


class QuotaExceededError(AppException):
    """
    Kota aşıldı hatası.
    
    Kullanım:
        raise QuotaExceededError('Öğrenci kotası doldu', quota_type='students')
    """
    status_code = 403
    code = 'QUOTA_EXCEEDED'
    
    def __init__(
        self,
        message: str = 'Kota aşıldı',
        quota_type: str = None,
        limit: int = None,
        current: int = None
    ):
        details = {}
        if quota_type:
            details['quota_type'] = quota_type
        if limit is not None:
            details['limit'] = limit
        if current is not None:
            details['current'] = current
        super().__init__(message=message, details=details if details else None)


class ExternalServiceError(AppException):
    """
    Harici servis hatası.
    
    Kullanım:
        raise ExternalServiceError('YouTube API', 'API yanıt vermedi')
    """
    status_code = 502
    code = 'EXTERNAL_SERVICE_ERROR'
    
    def __init__(
        self,
        service: str,
        message: str = None
    ):
        if message is None:
            message = f'{service} servisinde hata oluştu'
        details = {'service': service}
        super().__init__(message=message, details=details)


class BusinessLogicError(AppException):
    """
    İş mantığı hatası.
    
    Kullanım:
        raise BusinessLogicError('Sınav süresi dolmuş')
    """
    status_code = 422
    code = 'BUSINESS_LOGIC_ERROR'
    
    def __init__(self, message: str = 'İş mantığı hatası'):
        super().__init__(message=message)


class DatabaseError(AppException):
    """
    Veritabanı hatası.
    
    Kullanım:
        raise DatabaseError('Bağlantı kurulamadı')
    """
    status_code = 500
    code = 'DATABASE_ERROR'
    
    def __init__(self, message: str = 'Veritabanı hatası'):
        super().__init__(message=message)
