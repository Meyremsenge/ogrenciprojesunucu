"""
AI Provider Abstraction Layer - Package Exports.

Bu paket, AI sağlayıcılarını tamamen soyutlayan kurumsal mimariyi içerir.

TEMEL PRENSİPLER:
=================
1. Kodun HİÇBİR yerinde doğrudan GPT/OpenAI çağrısı OLMAZ
2. Tüm AI çağrıları provider abstraction üzerinden yapılır
3. Provider seçimi config üzerinden yapılır
4. Test ortamında ücretli API'ye ihtiyaç duyulmaz

KULLANIM:
=========
    # Config'den otomatik provider seçimi
    from app.modules.ai.providers import get_ai_provider
    
    provider = get_ai_provider()  # Config'e göre mock veya openai
    response = provider.complete(request)
    
    # Manuel provider seçimi
    from app.modules.ai.providers import MockAIProvider, GPTAIProvider
    
    mock = MockAIProvider()  # Development
    gpt = GPTAIProvider({'api_key': 'sk-...'})  # Production

MİMARİ:
=======
    ┌─────────────────────────────────────────────────────────────┐
    │                     Application Layer                        │
    │   (Routes, Services - Provider'a doğrudan erişmez)           │
    └──────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                   get_ai_provider()                          │
    │   Factory function - Config'e göre provider seçer            │
    └──────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                   BaseAIProvider (ABC)                       │
    │   Abstract interface - Tüm provider'lar implement eder       │
    └─────────┬─────────────────────────────────────────┬─────────┘
              │                                         │
              ▼                                         ▼
    ┌─────────────────────┐             ┌─────────────────────┐
    │   MockAIProvider    │             │   GPTAIProvider     │
    │   (Development)     │             │   (Production)      │
    └─────────────────────┘             └─────────────────────┘
"""

# =============================================================================
# NEW ABSTRACTION LAYER (Recommended)
# =============================================================================

from .abstraction import (
    # Abstract Base Class
    BaseAIProvider,
    
    # Data Classes
    AICompletionRequest,
    AICompletionResponse,
    AIMessage,
    ProviderHealthStatus,
    
    # Enums
    AIFeatureType,
    ProviderStatus,
    
    # Exceptions
    AIProviderException,
    AIProviderConnectionError,
    AIProviderRateLimitError,
    AIProviderAuthError,
    AIProviderQuotaError,
    AIContentFilterError,
    
    # Factory
    get_ai_provider,
    list_providers,
    register_provider,
    PROVIDER_REGISTRY,
)

# Concrete Providers - Import edildiğinde otomatik register olurlar
from .mock import MockAIProvider
from .gpt import GPTAIProvider
from .gpt41_provider import GPT41Provider  # NEW: GPT-4.1 Provider

# Circuit Breaker components (from GPT41)
from .gpt41_provider import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitState,
    RetryConfig,
    retry_with_backoff,
    GPT41Model,
    MODEL_PRICING,
    MODEL_CONTEXT_LIMITS,
)

# =============================================================================
# LEGACY SUPPORT (Backward Compatibility)
# =============================================================================

from .base import BaseProvider
from .mock_provider import MockProvider
from .openai_provider import OpenAIProvider
from .factory import (
    ProviderType,
    ProviderFactory,
    provider_factory
)

# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    # NEW ABSTRACTION (Recommended)
    'get_ai_provider',
    'list_providers',
    'register_provider',
    'PROVIDER_REGISTRY',
    'BaseAIProvider',
    'MockAIProvider',
    'GPTAIProvider',
    'GPT41Provider',  # NEW
    'AICompletionRequest',
    'AICompletionResponse',
    'AIMessage',
    'ProviderHealthStatus',
    'AIFeatureType',
    'ProviderStatus',
    'AIProviderException',
    'AIProviderConnectionError',
    'AIProviderRateLimitError',
    'AIProviderAuthError',
    'AIProviderQuotaError',
    'AIContentFilterError',
    
    # Circuit Breaker (NEW)
    'CircuitBreaker',
    'CircuitBreakerConfig',
    'CircuitState',
    'RetryConfig',
    'retry_with_backoff',
    'GPT41Model',
    'MODEL_PRICING',
    'MODEL_CONTEXT_LIMITS',
    
    # LEGACY (Backward Compatibility)
    'BaseProvider',
    'MockProvider',
    'OpenAIProvider',
    'ProviderType',
    'ProviderFactory',
    'provider_factory',
]


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_current_provider_name() -> str:
    """Aktif provider adını döndür."""
    from flask import current_app
    return current_app.config.get('AI_PROVIDER', 'mock')


def is_using_mock() -> bool:
    """Mock provider kullanılıyor mu?"""
    return get_current_provider_name() == 'mock'


def is_using_production_provider() -> bool:
    """Production-ready provider kullanılıyor mu?"""
    try:
        provider = get_ai_provider()
        return provider.is_production_ready
    except Exception:
        return False
