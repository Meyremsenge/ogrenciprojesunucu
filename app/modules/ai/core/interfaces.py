"""
AI Core - Interfaces.

Tüm AI bileşenleri için abstract interface tanımlamaları.
Provider bağımsızlığını sağlayan temel sözleşmeler.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List, Generator
from enum import Enum
from datetime import datetime


class AIFeature(str, Enum):
    """AI özellikleri."""
    QUESTION_HINT = "question_hint"
    TOPIC_EXPLANATION = "topic_explanation"
    STUDY_PLAN = "study_plan"
    ANSWER_EVALUATION = "answer_evaluation"
    PERFORMANCE_ANALYSIS = "performance_analysis"
    QUESTION_GENERATION = "question_generation"
    CONTENT_ENHANCEMENT = "content_enhancement"
    MOTIVATION_MESSAGE = "motivation_message"


class AIRole(str, Enum):
    """AI'ın kullanabileceği roller."""
    TUTOR = "tutor"
    EVALUATOR = "evaluator"
    ANALYST = "analyst"
    CONTENT_CREATOR = "content_creator"
    ASSISTANT = "assistant"


@dataclass
class AIRequest:
    """AI isteği için standart veri yapısı."""
    feature: AIFeature
    prompt: str
    user_id: int
    role: str
    context: Dict[str, Any] = field(default_factory=dict)
    options: Dict[str, Any] = field(default_factory=dict)
    request_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'feature': self.feature.value,
            'prompt': self.prompt[:200] + '...' if len(self.prompt) > 200 else self.prompt,
            'user_id': self.user_id,
            'role': self.role,
            'context': self.context,
            'request_id': self.request_id,
            'created_at': self.created_at.isoformat()
        }


@dataclass
class AIResponse:
    """AI yanıtı için standart veri yapısı."""
    content: str
    tokens_used: int
    model: str
    provider: str
    feature: AIFeature
    request_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    processing_time_ms: int = 0
    is_cached: bool = False
    is_mock: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'content': self.content,
            'tokens_used': self.tokens_used,
            'model': self.model,
            'provider': self.provider,
            'feature': self.feature.value,
            'request_id': self.request_id,
            'metadata': self.metadata,
            'processing_time_ms': self.processing_time_ms,
            'is_cached': self.is_cached,
            'is_mock': self.is_mock,
            'created_at': self.created_at.isoformat()
        }


@dataclass
class ProviderHealth:
    """Provider sağlık durumu."""
    provider: str
    is_healthy: bool
    latency_ms: Optional[int] = None
    error_message: Optional[str] = None
    last_check: datetime = field(default_factory=datetime.utcnow)


class AIProviderInterface(ABC):
    """
    AI Provider için abstract interface.
    
    Tüm AI provider'ları bu interface'i uygulamalıdır.
    Bu sayede provider değişikliği uygulama kodunu etkilemez.
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider adı."""
        pass
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Provider kullanılabilir mi."""
        pass
    
    @abstractmethod
    def complete(self, request: AIRequest) -> AIResponse:
        """
        Senkron AI completion.
        
        Args:
            request: AI isteği
            
        Returns:
            AIResponse
        """
        pass
    
    @abstractmethod
    def stream(self, request: AIRequest) -> Generator[str, None, None]:
        """
        Streaming AI completion.
        
        Args:
            request: AI isteği
            
        Yields:
            str: Response chunks
        """
        pass
    
    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """
        Token sayısını hesapla.
        
        Args:
            text: Metin
            
        Returns:
            Token sayısı
        """
        pass
    
    @abstractmethod
    def health_check(self) -> ProviderHealth:
        """
        Provider sağlık kontrolü.
        
        Returns:
            ProviderHealth
        """
        pass


class PromptTemplateInterface(ABC):
    """Prompt template interface."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Template adı."""
        pass
    
    @property
    @abstractmethod
    def version(self) -> str:
        """Template versiyonu."""
        pass
    
    @abstractmethod
    def render(self, **kwargs) -> str:
        """
        Template'i render et.
        
        Args:
            **kwargs: Template değişkenleri
            
        Returns:
            Rendered prompt
        """
        pass
    
    @abstractmethod
    def validate_input(self, **kwargs) -> bool:
        """
        Input validasyonu.
        
        Args:
            **kwargs: Template değişkenleri
            
        Returns:
            Geçerli mi
        """
        pass


class QuotaManagerInterface(ABC):
    """Kota yönetimi interface."""
    
    @abstractmethod
    def check_quota(self, user_id: int, feature: AIFeature, tokens: int) -> tuple[bool, Optional[str]]:
        """
        Kota kontrolü.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            tokens: Talep edilen token sayısı
            
        Returns:
            (izin_var_mı, hata_mesajı)
        """
        pass
    
    @abstractmethod
    def consume_quota(self, user_id: int, feature: AIFeature, tokens: int) -> None:
        """
        Kota tüket.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            tokens: Tüketilen token sayısı
        """
        pass
    
    @abstractmethod
    def get_quota_status(self, user_id: int) -> Dict[str, Any]:
        """
        Kota durumunu al.
        
        Args:
            user_id: Kullanıcı ID
            
        Returns:
            Kota bilgileri
        """
        pass


class RateLimiterInterface(ABC):
    """Rate limiting interface."""
    
    @abstractmethod
    def is_allowed(self, user_id: int, feature: AIFeature) -> tuple[bool, Optional[int]]:
        """
        İstek izinli mi kontrol et.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            
        Returns:
            (izinli_mi, kalan_bekleme_süresi_saniye)
        """
        pass
    
    @abstractmethod
    def record_request(self, user_id: int, feature: AIFeature) -> None:
        """
        İsteği kaydet.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
        """
        pass


class AbuseDetectorInterface(ABC):
    """Abuse tespit interface."""
    
    @abstractmethod
    def check_abuse(self, user_id: int, request: AIRequest) -> tuple[bool, Optional[str]]:
        """
        Abuse kontrolü.
        
        Args:
            user_id: Kullanıcı ID
            request: AI isteği
            
        Returns:
            (abuse_var_mı, sebep)
        """
        pass
    
    @abstractmethod
    def record_violation(self, user_id: int, violation_type: str, details: Dict[str, Any]) -> None:
        """
        İhlal kaydet.
        
        Args:
            user_id: Kullanıcı ID
            violation_type: İhlal türü
            details: Detaylar
        """
        pass
    
    @abstractmethod
    def is_blocked(self, user_id: int) -> tuple[bool, Optional[datetime]]:
        """
        Kullanıcı engellenmiş mi.
        
        Args:
            user_id: Kullanıcı ID
            
        Returns:
            (engelli_mi, engel_bitiş_zamanı)
        """
        pass
