"""
AI Provider Abstraction Layer.

Bu dosya, AI sağlayıcılarını tamamen soyutlayan kurumsal mimariyi tanımlar.

TASARIM PRENSİPLERİ:
====================
1. Interface Segregation: Tüm provider'lar aynı interface'i uygular
2. Dependency Inversion: Üst modüller concrete class'lara değil, abstraction'a bağlıdır
3. Strategy Pattern: Runtime'da provider değiştirilebilir
4. Factory Pattern: Provider oluşturma merkezi factory'den yapılır
5. Open/Closed: Yeni provider eklemek mevcut kodu değiştirmez

KULLANIM:
=========
    from app.modules.ai.providers import get_ai_provider
    
    # Config'den otomatik seçim
    provider = get_ai_provider()
    
    # Veya manuel seçim
    from app.modules.ai.providers import MockAIProvider
    provider = MockAIProvider()

PROVIDER EKLENMESİ:
==================
1. BaseAIProvider'ı miras al
2. Tüm abstract metodları implement et
3. PROVIDER_REGISTRY'ye kaydet
4. Config'e yeni provider ayarlarını ekle
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List, Generator, Type
import time
import hashlib
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS & DATA CLASSES
# =============================================================================

class AIFeatureType(str, Enum):
    """AI özellikleri."""
    QUESTION_HINT = "question_hint"
    TOPIC_EXPLANATION = "topic_explanation"
    STUDY_PLAN = "study_plan"
    ANSWER_EVALUATION = "answer_evaluation"
    PERFORMANCE_ANALYSIS = "performance_analysis"
    QUESTION_GENERATION = "question_generation"
    CONTENT_ENHANCEMENT = "content_enhancement"
    MOTIVATION_MESSAGE = "motivation_message"


class ProviderStatus(str, Enum):
    """Provider durumları."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


@dataclass
class AIMessage:
    """AI mesaj yapısı."""
    role: str  # 'system', 'user', 'assistant'
    content: str


@dataclass
class AICompletionRequest:
    """AI completion isteği."""
    messages: List[AIMessage]
    feature: AIFeatureType
    user_id: int
    max_tokens: int = 1000
    temperature: float = 0.7
    request_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def system_prompt(self) -> Optional[str]:
        """System prompt'u al."""
        for msg in self.messages:
            if msg.role == 'system':
                return msg.content
        return None
    
    @property
    def user_prompt(self) -> Optional[str]:
        """User prompt'u al."""
        for msg in self.messages:
            if msg.role == 'user':
                return msg.content
        return None


@dataclass
class AICompletionResponse:
    """AI completion yanıtı."""
    content: str
    tokens_used: int
    model: str
    provider: str
    finish_reason: str = "stop"
    request_id: Optional[str] = None
    latency_ms: int = 0
    cached: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'content': self.content,
            'tokens_used': self.tokens_used,
            'model': self.model,
            'provider': self.provider,
            'finish_reason': self.finish_reason,
            'request_id': self.request_id,
            'latency_ms': self.latency_ms,
            'cached': self.cached,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat()
        }


@dataclass
class ProviderHealthStatus:
    """Provider sağlık durumu."""
    status: ProviderStatus
    provider: str
    latency_ms: Optional[int] = None
    error: Optional[str] = None
    last_check: datetime = field(default_factory=datetime.utcnow)
    details: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# EXCEPTIONS
# =============================================================================

class AIProviderException(Exception):
    """AI Provider base exception."""
    
    def __init__(self, message: str, provider: str = None, retryable: bool = False):
        self.message = message
        self.provider = provider
        self.retryable = retryable
        super().__init__(message)


class AIProviderConnectionError(AIProviderException):
    """Provider bağlantı hatası."""
    
    def __init__(self, provider: str, message: str = "Provider'a bağlanılamadı"):
        super().__init__(message, provider, retryable=True)


class AIProviderRateLimitError(AIProviderException):
    """Provider rate limit hatası."""
    
    def __init__(self, provider: str, retry_after: int = None):
        self.retry_after = retry_after
        message = f"Rate limit aşıldı. {retry_after}s sonra tekrar deneyin." if retry_after else "Rate limit aşıldı."
        super().__init__(message, provider, retryable=True)


class AIProviderAuthError(AIProviderException):
    """Provider authentication hatası."""
    
    def __init__(self, provider: str):
        super().__init__("API key geçersiz veya eksik", provider, retryable=False)


class AIProviderQuotaError(AIProviderException):
    """Provider kota hatası."""
    
    def __init__(self, provider: str):
        super().__init__("API kotası doldu", provider, retryable=False)


class AIContentFilterError(AIProviderException):
    """İçerik filtreleme hatası."""
    
    def __init__(self, provider: str, filter_type: str = None):
        self.filter_type = filter_type
        super().__init__("İçerik güvenlik filtresi tarafından engellendi", provider, retryable=False)


# =============================================================================
# ABSTRACT BASE CLASS - AIProvider Interface
# =============================================================================

class BaseAIProvider(ABC):
    """
    AI Provider Abstract Base Class.
    
    TÜM AI provider'ları bu sınıfı miras almalı ve abstract metodları
    implement etmelidir. Bu sayede:
    
    1. Kodun hiçbir yerinde doğrudan GPT/OpenAI çağrısı olmaz
    2. Provider değişikliği uygulama kodunu etkilemez
    3. Test ortamında ücretli API'ye ihtiyaç duyulmaz
    4. Yeni provider eklemek kolaydır
    
    Kullanım:
        class MyProvider(BaseAIProvider):
            @property
            def name(self) -> str:
                return "my_provider"
            
            def complete(self, request: AICompletionRequest) -> AICompletionResponse:
                # Implementation
                pass
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Provider'ı başlat.
        
        Args:
            config: Provider-specific konfigürasyon
        """
        self._config = config or {}
        self._initialized = False
        self._stats = {
            'request_count': 0,
            'total_tokens': 0,
            'error_count': 0,
            'last_request_at': None,
            'last_error_at': None,
            'last_error': None
        }
        
        # Initialize provider
        try:
            self._initialize()
            self._initialized = True
            logger.info(f"AI Provider '{self.name}' initialized successfully")
        except Exception as e:
            logger.error(f"AI Provider '{self.name}' initialization failed: {e}")
            self._stats['last_error'] = str(e)
            self._stats['last_error_at'] = datetime.utcnow()
    
    # =========================================================================
    # ABSTRACT PROPERTIES - Alt sınıflarda ZORUNLU implement edilmeli
    # =========================================================================
    
    @property
    @abstractmethod
    def name(self) -> str:
        """
        Provider adı.
        
        Unique identifier olarak kullanılır.
        Örnek: 'mock', 'openai', 'azure', 'anthropic'
        """
        pass
    
    @property
    @abstractmethod
    def display_name(self) -> str:
        """
        Provider görünen adı.
        
        UI ve loglarda gösterilir.
        Örnek: 'Mock AI Provider', 'OpenAI GPT-4'
        """
        pass
    
    @property
    @abstractmethod
    def is_production_ready(self) -> bool:
        """
        Production ortamında kullanılabilir mi.
        
        Mock provider için False, gerçek API'ler için True.
        """
        pass
    
    # =========================================================================
    # ABSTRACT METHODS - Alt sınıflarda ZORUNLU implement edilmeli
    # =========================================================================
    
    @abstractmethod
    def _initialize(self) -> None:
        """
        Provider'ı initialize et.
        
        API key validasyonu, client oluşturma vb.
        Exception fırlatabilir.
        """
        pass
    
    @abstractmethod
    def complete(self, request: AICompletionRequest) -> AICompletionResponse:
        """
        Senkron completion isteği.
        
        Args:
            request: AI completion isteği
            
        Returns:
            AICompletionResponse
            
        Raises:
            AIProviderException: Provider hatalarında
        """
        pass
    
    @abstractmethod
    def health_check(self) -> ProviderHealthStatus:
        """
        Provider sağlık kontrolü.
        
        Returns:
            ProviderHealthStatus
        """
        pass
    
    # =========================================================================
    # OPTIONAL ABSTRACT METHODS - İsteğe bağlı override
    # =========================================================================
    
    def stream(self, request: AICompletionRequest) -> Generator[str, None, None]:
        """
        Streaming completion isteği.
        
        Varsayılan: Streaming desteklenmiyor, normal complete çağrılır.
        
        Args:
            request: AI completion isteği
            
        Yields:
            str: Yanıt chunk'ları
        """
        response = self.complete(request)
        yield response.content
    
    def count_tokens(self, text: str) -> int:
        """
        Token sayısını hesapla.
        
        Varsayılan: Yaklaşık hesaplama (4 karakter = 1 token)
        
        Args:
            text: Metin
            
        Returns:
            Tahmini token sayısı
        """
        return len(text) // 4 + 1
    
    # =========================================================================
    # CONCRETE METHODS - Tüm provider'larda aynı
    # =========================================================================
    
    @property
    def is_available(self) -> bool:
        """Provider kullanılabilir mi."""
        if not self._initialized:
            return False
        try:
            health = self.health_check()
            return health.status != ProviderStatus.UNAVAILABLE
        except Exception:
            return False
    
    @property
    def stats(self) -> Dict[str, Any]:
        """Provider istatistikleri."""
        return {
            'provider': self.name,
            'display_name': self.display_name,
            'is_production_ready': self.is_production_ready,
            'is_available': self.is_available,
            **self._stats
        }
    
    def _record_request(self, tokens: int) -> None:
        """İstek istatistiklerini kaydet."""
        self._stats['request_count'] += 1
        self._stats['total_tokens'] += tokens
        self._stats['last_request_at'] = datetime.utcnow()
    
    def _record_error(self, error: Exception) -> None:
        """Hata istatistiklerini kaydet."""
        self._stats['error_count'] += 1
        self._stats['last_error'] = str(error)
        self._stats['last_error_at'] = datetime.utcnow()
    
    def _generate_cache_key(self, request: AICompletionRequest) -> str:
        """Cache key oluştur."""
        content = f"{self.name}:{request.feature.value}:{request.user_prompt}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]
    
    def __repr__(self) -> str:
        status = "available" if self.is_available else "unavailable"
        return f"<{self.__class__.__name__} name='{self.name}' status='{status}'>"


# =============================================================================
# PROVIDER REGISTRY & FACTORY
# =============================================================================

# Provider registry - Tüm provider'lar burada kayıtlı
PROVIDER_REGISTRY: Dict[str, Type[BaseAIProvider]] = {}


def register_provider(name: str):
    """
    Provider kayıt decorator'ı.
    
    Kullanım:
        @register_provider('my_provider')
        class MyProvider(BaseAIProvider):
            ...
    """
    def decorator(cls: Type[BaseAIProvider]):
        PROVIDER_REGISTRY[name] = cls
        return cls
    return decorator


def get_ai_provider(
    provider_name: str = None,
    config: Dict[str, Any] = None
) -> BaseAIProvider:
    """
    AI Provider factory fonksiyonu.
    
    Config'den veya parametreden provider seçer ve oluşturur.
    
    Args:
        provider_name: Provider adı (None ise config'den alınır)
        config: Provider config (None ise app config'den alınır)
        
    Returns:
        BaseAIProvider instance
        
    Raises:
        ValueError: Bilinmeyen provider adı
    """
    from flask import current_app
    
    # Provider adını belirle
    if provider_name is None:
        provider_name = current_app.config.get('AI_PROVIDER', 'mock')
    
    # Registry'den provider class'ını al
    if provider_name not in PROVIDER_REGISTRY:
        available = list(PROVIDER_REGISTRY.keys())
        raise ValueError(
            f"Bilinmeyen AI provider: '{provider_name}'. "
            f"Kullanılabilir provider'lar: {available}"
        )
    
    # Config'i hazırla
    if config is None:
        config = _get_provider_config(provider_name)
    
    # Provider instance oluştur ve döndür
    provider_class = PROVIDER_REGISTRY[provider_name]
    return provider_class(config)


def _get_provider_config(provider_name: str) -> Dict[str, Any]:
    """Flask app config'den provider config'i al."""
    from flask import current_app
    
    config = {}
    
    if provider_name == 'openai':
        config = {
            'api_key': current_app.config.get('OPENAI_API_KEY'),
            'model': current_app.config.get('OPENAI_MODEL', 'gpt-4o-mini'),
            'max_tokens': current_app.config.get('OPENAI_MAX_TOKENS', 1000),
            'temperature': current_app.config.get('OPENAI_TEMPERATURE', 0.7),
            'timeout': current_app.config.get('OPENAI_TIMEOUT', 30),
            'max_retries': current_app.config.get('OPENAI_MAX_RETRIES', 3),
        }
    elif provider_name == 'gpt41':
        # GPT-4.1 Provider with full configuration
        config = {
            'api_key': current_app.config.get('OPENAI_API_KEY'),
            'model': current_app.config.get('OPENAI_MODEL', 'gpt-4o-mini'),
            'max_tokens': current_app.config.get('OPENAI_MAX_TOKENS', 1000),
            'temperature': current_app.config.get('OPENAI_TEMPERATURE', 0.7),
            'timeout': current_app.config.get('OPENAI_TIMEOUT', 30),
            'max_retries': current_app.config.get('OPENAI_MAX_RETRIES', 3),
            'enable_fallback': current_app.config.get('AI_ENABLE_FALLBACK', True),
            'circuit_failure_threshold': current_app.config.get('AI_CIRCUIT_FAILURE_THRESHOLD', 5),
            'circuit_success_threshold': current_app.config.get('AI_CIRCUIT_SUCCESS_THRESHOLD', 2),
            'circuit_timeout': current_app.config.get('AI_CIRCUIT_TIMEOUT', 60),
            'retry_base_delay': 1.0,
            'retry_max_delay': 60.0,
        }
    elif provider_name == 'mock':
        config = {
            'delay_min': current_app.config.get('AI_MOCK_DELAY_MIN', 0.3),
            'delay_max': current_app.config.get('AI_MOCK_DELAY_MAX', 1.0),
            'simulate_errors': current_app.config.get('AI_MOCK_SIMULATE_ERRORS', False),
        }
    
    return config


def list_providers() -> List[Dict[str, Any]]:
    """
    Kayıtlı tüm provider'ları listele.
    
    Returns:
        Provider bilgileri listesi
    """
    providers = []
    for name, provider_class in PROVIDER_REGISTRY.items():
        # Geçici instance oluştur (config olmadan)
        try:
            instance = provider_class({})
            providers.append({
                'name': name,
                'display_name': instance.display_name,
                'is_production_ready': instance.is_production_ready,
                'class': provider_class.__name__
            })
        except Exception:
            providers.append({
                'name': name,
                'display_name': name.title(),
                'is_production_ready': False,
                'class': provider_class.__name__
            })
    return providers
