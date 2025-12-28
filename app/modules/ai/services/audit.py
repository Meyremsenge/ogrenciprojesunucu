"""
AI Service - Audit Integration.

AI işlemleri için audit log entegrasyonu.
"""

from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

from app.modules.ai.core.interfaces import AIRequest, AIResponse, AIFeature


class AIAuditAction(str, Enum):
    """AI modülü audit action'ları."""
    AI_REQUEST = "ai.request"
    AI_RESPONSE = "ai.response"
    AI_ERROR = "ai.error"
    AI_QUOTA_CHECK = "ai.quota_check"
    AI_QUOTA_EXCEEDED = "ai.quota_exceeded"
    AI_RATE_LIMIT = "ai.rate_limit"
    AI_ABUSE_DETECTED = "ai.abuse_detected"
    AI_CONTENT_FILTERED = "ai.content_filtered"
    AI_PROVIDER_SWITCH = "ai.provider_switch"
    AI_CONFIG_CHANGE = "ai.config_change"


class AIAuditLogger:
    """
    AI modülü için audit logger.
    
    Mevcut audit sistemini kullanarak AI işlemlerini loglar.
    """
    
    def __init__(self):
        self._audit_service = None
    
    @property
    def audit_service(self):
        """Lazy load audit service."""
        if self._audit_service is None:
            try:
                from app.core.audit import AuditService
                self._audit_service = AuditService()
            except ImportError:
                self._audit_service = None
        return self._audit_service
    
    def log_request(
        self,
        user_id: int,
        request: AIRequest,
        ip_address: Optional[str] = None
    ) -> None:
        """
        AI isteğini logla.
        
        Args:
            user_id: Kullanıcı ID
            request: AI isteği
            ip_address: IP adresi
        """
        self._log(
            action=AIAuditAction.AI_REQUEST,
            user_id=user_id,
            data={
                'feature': request.feature.value,
                'prompt_length': len(request.prompt),
                'context_keys': list(request.context.keys()),
                'request_id': request.request_id
            },
            ip_address=ip_address
        )
    
    def log_response(
        self,
        user_id: int,
        response: AIResponse,
        ip_address: Optional[str] = None
    ) -> None:
        """
        AI yanıtını logla.
        
        Args:
            user_id: Kullanıcı ID
            response: AI yanıtı
            ip_address: IP adresi
        """
        self._log(
            action=AIAuditAction.AI_RESPONSE,
            user_id=user_id,
            data={
                'feature': response.feature.value,
                'tokens_used': response.tokens_used,
                'model': response.model,
                'provider': response.provider,
                'processing_time_ms': response.processing_time_ms,
                'is_cached': response.is_cached,
                'is_mock': response.is_mock,
                'request_id': response.request_id
            },
            ip_address=ip_address
        )
    
    def log_error(
        self,
        user_id: int,
        feature: AIFeature,
        error: str,
        error_type: str,
        ip_address: Optional[str] = None
    ) -> None:
        """
        AI hatasını logla.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            error: Hata mesajı
            error_type: Hata tipi
            ip_address: IP adresi
        """
        self._log(
            action=AIAuditAction.AI_ERROR,
            user_id=user_id,
            data={
                'feature': feature.value,
                'error': error,
                'error_type': error_type
            },
            ip_address=ip_address
        )
    
    def log_quota_exceeded(
        self,
        user_id: int,
        feature: AIFeature,
        quota_type: str,
        limit: int,
        used: int,
        ip_address: Optional[str] = None
    ) -> None:
        """
        Kota aşımını logla.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            quota_type: Kota tipi (daily/monthly)
            limit: Limit
            used: Kullanılan
            ip_address: IP adresi
        """
        self._log(
            action=AIAuditAction.AI_QUOTA_EXCEEDED,
            user_id=user_id,
            data={
                'feature': feature.value,
                'quota_type': quota_type,
                'limit': limit,
                'used': used
            },
            ip_address=ip_address
        )
    
    def log_rate_limit(
        self,
        user_id: int,
        feature: AIFeature,
        wait_seconds: int,
        ip_address: Optional[str] = None
    ) -> None:
        """
        Rate limit'i logla.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            wait_seconds: Bekleme süresi
            ip_address: IP adresi
        """
        self._log(
            action=AIAuditAction.AI_RATE_LIMIT,
            user_id=user_id,
            data={
                'feature': feature.value,
                'wait_seconds': wait_seconds
            },
            ip_address=ip_address
        )
    
    def log_abuse_detected(
        self,
        user_id: int,
        violation_type: str,
        details: Dict[str, Any],
        ip_address: Optional[str] = None
    ) -> None:
        """
        Abuse tespitini logla.
        
        Args:
            user_id: Kullanıcı ID
            violation_type: İhlal tipi
            details: Detaylar
            ip_address: IP adresi
        """
        self._log(
            action=AIAuditAction.AI_ABUSE_DETECTED,
            user_id=user_id,
            data={
                'violation_type': violation_type,
                'details': details
            },
            ip_address=ip_address
        )
    
    def log_content_filtered(
        self,
        user_id: int,
        feature: AIFeature,
        filter_type: str,
        ip_address: Optional[str] = None
    ) -> None:
        """
        İçerik filtrelemeyi logla.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            filter_type: Filtre tipi
            ip_address: IP adresi
        """
        self._log(
            action=AIAuditAction.AI_CONTENT_FILTERED,
            user_id=user_id,
            data={
                'feature': feature.value,
                'filter_type': filter_type
            },
            ip_address=ip_address
        )
    
    def log_provider_switch(
        self,
        user_id: Optional[int],
        from_provider: str,
        to_provider: str,
        reason: str,
        ip_address: Optional[str] = None
    ) -> None:
        """
        Provider değişikliğini logla.
        
        Args:
            user_id: Kullanıcı ID (sistem için None)
            from_provider: Eski provider
            to_provider: Yeni provider
            reason: Değişiklik sebebi
            ip_address: IP adresi
        """
        self._log(
            action=AIAuditAction.AI_PROVIDER_SWITCH,
            user_id=user_id,
            data={
                'from_provider': from_provider,
                'to_provider': to_provider,
                'reason': reason
            },
            ip_address=ip_address
        )
    
    def _log(
        self,
        action: AIAuditAction,
        user_id: Optional[int],
        data: Dict[str, Any],
        ip_address: Optional[str] = None
    ) -> None:
        """
        Audit log kaydı oluştur.
        
        Args:
            action: Audit action
            user_id: Kullanıcı ID
            data: Log verileri
            ip_address: IP adresi
        """
        try:
            # Mevcut audit service kullanılabiliyorsa kullan
            if self.audit_service:
                self.audit_service.log(
                    action=action.value,
                    entity_type='AI',
                    entity_name=data.get('feature', 'ai_operation'),
                    description=str(data),
                    extra_data=data,
                    user_id=user_id
                )
            else:
                # Fallback: Basit logging
                import logging
                logger = logging.getLogger('ai.audit')
                logger.info(
                    f"[{action.value}] user_id={user_id} data={data} ip={ip_address}"
                )
        except Exception as e:
            # Audit log hatası ana işlemi engellememeli
            import logging
            logging.getLogger('ai.audit').warning(f"Audit log error: {e}")


# Singleton instance
ai_audit_logger = AIAuditLogger()
