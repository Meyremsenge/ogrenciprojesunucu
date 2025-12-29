"""
AI Core - Exceptions.

AI modülüne özel exception tanımlamaları.
"""

from typing import Optional, Dict, Any
from app.core.exceptions import AppException


class AIException(AppException):
    """AI modülü base exception."""
    status_code = 500
    code = 'AI_ERROR'
    
    def __init__(
        self,
        message: str = 'AI işlemi sırasında bir hata oluştu',
        code: str = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message=message, code=code, details=details)


class AIQuotaExceededError(AIException):
    """Kota aşıldı hatası."""
    status_code = 429
    code = 'AI_QUOTA_EXCEEDED'
    
    def __init__(
        self,
        message: str = 'AI kullanım kotanızı aştınız',
        quota_type: str = None,
        reset_at: str = None
    ):
        details = {}
        if quota_type:
            details['quota_type'] = quota_type
        if reset_at:
            details['reset_at'] = reset_at
        super().__init__(message=message, details=details if details else None)


class AIRateLimitError(AIException):
    """Rate limit hatası."""
    status_code = 429
    code = 'AI_RATE_LIMIT'
    
    def __init__(
        self,
        message: str = 'Çok fazla AI isteği gönderildi',
        retry_after: int = None
    ):
        details = {'retry_after': retry_after} if retry_after else None
        super().__init__(message=message, details=details)


class AIProviderError(AIException):
    """AI provider hatası."""
    status_code = 503
    code = 'AI_PROVIDER_ERROR'
    
    def __init__(
        self,
        message: str = 'AI sağlayıcısına erişilemiyor',
        provider: str = None
    ):
        details = {'provider': provider} if provider else None
        super().__init__(message=message, details=details)


class AIProviderTimeoutError(AIProviderError):
    """AI provider timeout hatası."""
    code = 'AI_PROVIDER_TIMEOUT'
    
    def __init__(self, provider: str = None, timeout_seconds: int = None):
        message = f'AI sağlayıcısı {timeout_seconds} saniye içinde yanıt vermedi' if timeout_seconds else 'AI sağlayıcısı zaman aşımına uğradı'
        super().__init__(message=message, provider=provider)


class AIContentFilterError(AIException):
    """İçerik filtreleme hatası."""
    status_code = 400
    code = 'AI_CONTENT_FILTERED'
    
    def __init__(
        self,
        message: str = 'İçerik güvenlik filtresine takıldı',
        filter_type: str = None
    ):
        details = {'filter_type': filter_type} if filter_type else None
        super().__init__(message=message, details=details)


class AIPromptError(AIException):
    """Prompt hatası."""
    status_code = 400
    code = 'AI_PROMPT_ERROR'
    
    def __init__(
        self,
        message: str = 'Prompt işlenirken hata oluştu',
        prompt_name: str = None
    ):
        details = {'prompt_name': prompt_name} if prompt_name else None
        super().__init__(message=message, details=details)


class AIFeatureDisabledError(AIException):
    """Özellik devre dışı hatası."""
    status_code = 403
    code = 'AI_FEATURE_DISABLED'
    
    def __init__(
        self,
        message: str = 'Bu AI özelliği şu anda devre dışı',
        feature: str = None
    ):
        details = {'feature': feature} if feature else None
        super().__init__(message=message, details=details)


class AIAbuseDetectedError(AIException):
    """Abuse tespit hatası."""
    status_code = 403
    code = 'AI_ABUSE_DETECTED'
    
    def __init__(
        self,
        message: str = 'Kötüye kullanım tespit edildi',
        violation_type: str = None,
        blocked_until: str = None
    ):
        details = {}
        if violation_type:
            details['violation_type'] = violation_type
        if blocked_until:
            details['blocked_until'] = blocked_until
        super().__init__(message=message, details=details if details else None)


class AICircuitBreakerOpenError(AIException):
    """Circuit breaker açık hatası."""
    status_code = 503
    code = 'AI_CIRCUIT_BREAKER_OPEN'
    
    def __init__(
        self,
        message: str = 'AI servisi geçici olarak kullanılamıyor',
        retry_after: int = None
    ):
        details = {'retry_after': retry_after} if retry_after else None
        super().__init__(message=message, details=details)
