"""
AI Module - Kurumsal Yapay Zeka Modülü.

Bu modül şunları içerir:
- Soru ipucu verme
- Konu anlatım desteği
- Çalışma planı oluşturma
- Cevap değerlendirme
- Performans analizi
- Soru üretimi
- İçerik zenginleştirme
- Motivasyon mesajları
- Kota ve rate limit yönetimi
- Abuse tespit ve önleme
- Provider bağımsız mimari

AI PROVIDER ABSTRACTION:
========================
    Kodun HİÇBİR yerinde doğrudan GPT/OpenAI çağrısı olmaz!
    Tüm AI çağrıları provider abstraction üzerinden yapılır.
    
    Kullanım:
        from app.modules.ai.providers import get_ai_provider
        
        provider = get_ai_provider()  # Config'e göre mock veya openai
        response = provider.complete(request)
    
    Config ile Provider Seçimi:
        AI_PROVIDER = 'mock'   # Development/Test
        AI_PROVIDER = 'openai' # Production

Mimari:
- core/: Interface, exception ve sabit tanımları
- providers/: AI provider implementasyonları (Mock, OpenAI)
- prompts/: YAML tabanlı prompt template sistemi
- quota/: Redis tabanlı kota, rate limit, abuse detection
- services/: Ana servis facade ve audit integration
"""

from flask import Blueprint

ai_bp = Blueprint('ai', __name__)

# Alt modüller
from app.modules.ai.core import (
    AIFeature,
    AIRole,
    AIRequest,
    AIResponse,
    AIException,
    AIQuotaExceededError,
    AIRateLimitError,
    AIAbuseDetectedError,
    TOKEN_COSTS,
    QUOTA_LIMITS
)

from app.modules.ai.services import ai_service, ai_audit_logger

# NEW: Provider Abstraction Layer (Recommended)
from app.modules.ai.providers import (
    # Factory function - ANA GİRİŞ NOKTASI
    get_ai_provider,
    list_providers,
    
    # Abstract Base Class
    BaseAIProvider,
    
    # Concrete Providers
    MockAIProvider,
    GPTAIProvider,
    GPT41Provider,  # NEW: GPT-4.1 Provider
    
    # Data Classes
    AICompletionRequest,
    AICompletionResponse,
    AIMessage,
    AIFeatureType,
    
    # Exceptions
    AIProviderException,
    
    # Circuit Breaker (NEW)
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitState,
    
    # Convenience Functions
    get_current_provider_name,
    is_using_mock,
    is_using_production_provider,
)

# NEW: AI Configuration
from app.modules.ai.config import (
    AIConfig,
    AIProviderType,
    AIEnvironment,
    get_ai_config,
    ai_config_manager,
    get_development_config,
    get_staging_config,
    get_production_config,
)

# NEW: AI Rate Limiter
from app.modules.ai.rate_limiter import (
    AIRateLimiter,
    RateLimitConfig,
    ai_rate_limiter,
    rate_limit_check,
    get_ai_rate_limiter,
)

# LEGACY: Backward Compatibility
from app.modules.ai.providers import provider_factory, ProviderType, MockProvider

from app.modules.ai.prompts import (
    prompt_manager,
    PromptRegistry,
    prompt_version_manager,
    PromptVersion,
    PromptStatus,
)
from app.modules.ai.quota import RedisQuotaManager, RedisRateLimiter, AbuseDetector

# Security Module
from app.modules.ai.security import (
    ai_security_guard,
    AISecurityGuard,
    SecurityCheckResult,
    ThreatLevel,
    ThreatCategory,
    security_check,
    security_audit_logger,
    SecurityEvent,
    PromptInjectionDetector,
    JailbreakDetector,
    PIIDetector,
    InputSanitizer,
    OutputSanitizer,
)

from app.modules.ai import routes  # noqa: E402, F401
from app.modules.ai import routes_v2  # noqa: E402, F401
from app.modules.ai import routes_v3  # noqa: E402, F401 - Provider Abstraction Demo
from app.modules.ai import routes_prompts  # noqa: E402, F401 - Prompt Management API
from app.modules.ai import routes_streaming  # noqa: E402, F401 - Streaming API

# Middleware
from app.modules.ai.middleware import (
    context_limiter,
    ContextLimiter,
    ContextLimitResult,
    exam_guard,
    ExamGuard,
    ExamContext,
    AIAccessDeniedError,
    exam_guard_required,
)

# Core additions
from app.modules.ai.core import (
    AIResponseWrapper,
    ResponseWrapperFactory,
    ResponseType,
    ConfidenceLevel,
    create_response,
    CostTracker,
    CostEntry,
    CostAlert,
    AlertLevel,
    cost_tracker,
)

__all__ = [
    # Blueprint
    'ai_bp',
    
    # Core
    'AIFeature',
    'AIRole',
    'AIRequest',
    'AIResponse',
    'AIException',
    'AIQuotaExceededError',
    'AIRateLimitError',
    'AIAbuseDetectedError',
    'TOKEN_COSTS',
    'QUOTA_LIMITS',
    
    # Response Wrapper
    'AIResponseWrapper',
    'ResponseWrapperFactory',
    'ResponseType',
    'ConfidenceLevel',
    'create_response',
    
    # Cost Tracker
    'CostTracker',
    'CostEntry',
    'CostAlert',
    'AlertLevel',
    'cost_tracker',
    
    # Middleware
    'context_limiter',
    'ContextLimiter',
    'ContextLimitResult',
    'exam_guard',
    'ExamGuard',
    'ExamContext',
    'AIAccessDeniedError',
    'exam_guard_required',
    
    # Services
    'ai_service',
    'ai_audit_logger',
    
    # NEW: Provider Abstraction (Recommended)
    'get_ai_provider',
    'list_providers',
    'BaseAIProvider',
    'MockAIProvider',
    'GPTAIProvider',
    'GPT41Provider',  # NEW
    'AICompletionRequest',
    'AICompletionResponse',
    'AIMessage',
    'AIFeatureType',
    'AIProviderException',
    'get_current_provider_name',
    'is_using_mock',
    'is_using_production_provider',
    
    # Circuit Breaker (NEW)
    'CircuitBreaker',
    'CircuitBreakerConfig',
    'CircuitState',
    
    # NEW: Configuration
    'AIConfig',
    'AIProviderType',
    'AIEnvironment',
    'get_ai_config',
    'ai_config_manager',
    'get_development_config',
    'get_staging_config',
    'get_production_config',
    
    # NEW: Rate Limiter
    'AIRateLimiter',
    'RateLimitConfig',
    'ai_rate_limiter',
    'rate_limit_check',
    'get_ai_rate_limiter',
    
    # LEGACY: Providers (Backward Compatibility)
    'provider_factory',
    'ProviderType',
    'MockProvider',
    
    # Prompts (Legacy)
    'prompt_manager',
    'PromptRegistry',
    
    # Prompts (Enterprise Versioning)
    'prompt_version_manager',
    'PromptVersion',
    'PromptStatus',
    
    # Quota
    'RedisQuotaManager',
    'RedisRateLimiter',
    'AbuseDetector',
    
    # Security
    'ai_security_guard',
    'AISecurityGuard',
    'SecurityCheckResult',
    'ThreatLevel',
    'ThreatCategory',
    'security_check',
    'security_audit_logger',
    'SecurityEvent',
    'PromptInjectionDetector',
    'JailbreakDetector',
    'PIIDetector',
    'InputSanitizer',
    'OutputSanitizer',
]
