"""
AI Providers - Factory.

Provider Factory Pattern implementasyonu.
"""

from typing import Dict, Any, Optional, Type
from enum import Enum

from app.modules.ai.providers.base import BaseProvider
from app.modules.ai.providers.mock_provider import MockProvider
from app.modules.ai.providers.openai_provider import OpenAIProvider
from app.modules.ai.core.exceptions import AIProviderError


class ProviderType(str, Enum):
    """Desteklenen provider türleri."""
    MOCK = "mock"
    OPENAI = "openai"
    AZURE = "azure"  # Gelecekte eklenecek
    ANTHROPIC = "anthropic"  # Gelecekte eklenecek


class ProviderFactory:
    """
    AI Provider Factory.
    
    Provider'ları oluşturan ve yöneten factory sınıfı.
    Singleton pattern ile tek instance kullanılır.
    """
    
    _instance = None
    _providers: Dict[str, BaseProvider] = {}
    _registry: Dict[str, Type[BaseProvider]] = {
        ProviderType.MOCK.value: MockProvider,
        ProviderType.OPENAI.value: OpenAIProvider,
    }
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def register(self, name: str, provider_class: Type[BaseProvider]) -> None:
        """
        Yeni provider tipi kaydet.
        
        Args:
            name: Provider adı
            provider_class: Provider sınıfı
        """
        self._registry[name] = provider_class
    
    def get(self, provider_type: str, config: Optional[Dict[str, Any]] = None) -> BaseProvider:
        """
        Provider instance al veya oluştur.
        
        Args:
            provider_type: Provider tipi
            config: Provider konfigürasyonu
            
        Returns:
            BaseProvider instance
        """
        # Cache'ten al
        cache_key = f"{provider_type}:{hash(str(config))}"
        
        if cache_key in self._providers:
            return self._providers[cache_key]
        
        # Yeni provider oluştur
        if provider_type not in self._registry:
            raise AIProviderError(
                message=f"Bilinmeyen provider tipi: {provider_type}",
                provider=provider_type
            )
        
        provider_class = self._registry[provider_type]
        provider = provider_class(config)
        
        # Initialize et
        if not provider.initialize():
            # Initialize başarısız olsa bile kullanılabilir (mock için)
            pass
        
        # Cache'e ekle
        self._providers[cache_key] = provider
        
        return provider
    
    def get_default(self) -> BaseProvider:
        """Varsayılan provider'ı al (Mock)."""
        return self.get(ProviderType.MOCK.value)
    
    def list_available(self) -> list[str]:
        """Kullanılabilir provider'ları listele."""
        return list(self._registry.keys())
    
    def clear_cache(self) -> None:
        """Provider cache'ini temizle."""
        self._providers.clear()
    
    def health_check_all(self) -> Dict[str, Dict[str, Any]]:
        """Tüm aktif provider'ların sağlık durumunu kontrol et."""
        results = {}
        
        for name, provider in self._providers.items():
            health = provider.health_check()
            results[name] = {
                'is_healthy': health.is_healthy,
                'latency_ms': health.latency_ms,
                'error': health.error_message
            }
        
        return results


# Singleton instance
provider_factory = ProviderFactory()
