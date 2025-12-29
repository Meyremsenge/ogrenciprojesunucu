"""
AI Providers - Base Provider.

Tüm AI provider'larının temel sınıfı.
"""

import time
import hashlib
from abc import ABC, abstractmethod
from typing import Generator, Optional, Dict, Any
from datetime import datetime

from app.modules.ai.core.interfaces import (
    AIProviderInterface,
    AIRequest,
    AIResponse,
    ProviderHealth,
    AIFeature
)
from app.modules.ai.core.constants import PROVIDER_DEFAULTS


class BaseProvider(AIProviderInterface, ABC):
    """
    AI Provider temel sınıfı.
    
    Tüm provider'lar bu sınıfı miras alır.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self._config = config or {}
        self._is_initialized = False
        self._last_error: Optional[Exception] = None
        self._request_count = 0
        self._total_tokens = 0
        self._last_request_time: Optional[datetime] = None
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider adı."""
        pass
    
    @property
    def is_available(self) -> bool:
        """Provider kullanılabilir mi."""
        try:
            health = self.health_check()
            return health.is_healthy
        except Exception:
            return False
    
    @property
    def is_initialized(self) -> bool:
        """Provider initialize edildi mi."""
        return self._is_initialized
    
    @property
    def config(self) -> Dict[str, Any]:
        """Provider konfigürasyonu."""
        default_config = PROVIDER_DEFAULTS.get(self.name, {})
        return {**default_config, **self._config}
    
    @property
    def stats(self) -> Dict[str, Any]:
        """Provider istatistikleri."""
        return {
            'provider': self.name,
            'request_count': self._request_count,
            'total_tokens': self._total_tokens,
            'last_request': self._last_request_time.isoformat() if self._last_request_time else None,
            'last_error': str(self._last_error) if self._last_error else None
        }
    
    def initialize(self) -> bool:
        """Provider'ı initialize et."""
        try:
            self._do_initialize()
            self._is_initialized = True
            return True
        except Exception as e:
            self._last_error = e
            return False
    
    @abstractmethod
    def _do_initialize(self) -> None:
        """Alt sınıflarda implement edilecek initialization logic."""
        pass
    
    @abstractmethod
    def complete(self, request: AIRequest) -> AIResponse:
        """Senkron AI completion."""
        pass
    
    @abstractmethod
    def stream(self, request: AIRequest) -> Generator[str, None, None]:
        """Streaming AI completion."""
        pass
    
    def count_tokens(self, text: str) -> int:
        """
        Token sayısını hesapla.
        
        Varsayılan: Yaklaşık hesaplama (4 karakter = 1 token)
        """
        return len(text) // 4 + 1
    
    def health_check(self) -> ProviderHealth:
        """Provider sağlık kontrolü."""
        start_time = time.time()
        
        try:
            is_healthy = self._do_health_check()
            latency = int((time.time() - start_time) * 1000)
            
            return ProviderHealth(
                provider=self.name,
                is_healthy=is_healthy,
                latency_ms=latency
            )
        except Exception as e:
            return ProviderHealth(
                provider=self.name,
                is_healthy=False,
                error_message=str(e)
            )
    
    @abstractmethod
    def _do_health_check(self) -> bool:
        """Alt sınıflarda implement edilecek health check logic."""
        pass
    
    def _create_response(
        self,
        content: str,
        request: AIRequest,
        tokens_used: int,
        model: str,
        metadata: Optional[Dict[str, Any]] = None,
        processing_time_ms: int = 0,
        is_cached: bool = False,
        is_mock: bool = False
    ) -> AIResponse:
        """Standart response oluştur."""
        self._request_count += 1
        self._total_tokens += tokens_used
        self._last_request_time = datetime.utcnow()
        
        return AIResponse(
            content=content,
            tokens_used=tokens_used,
            model=model,
            provider=self.name,
            feature=request.feature,
            request_id=request.request_id,
            metadata=metadata or {},
            processing_time_ms=processing_time_ms,
            is_cached=is_cached,
            is_mock=is_mock
        )
    
    def _generate_cache_key(self, request: AIRequest) -> str:
        """Cache key oluştur."""
        content = f"{request.feature.value}:{request.prompt}:{request.user_id}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]
