"""
AI Core Package.

AI modülü çekirdek bileşenleri.
"""

from app.modules.ai.core.interfaces import (
    AIFeature,
    AIRole,
    AIRequest,
    AIResponse,
    ProviderHealth,
    AIProviderInterface,
    PromptTemplateInterface,
    QuotaManagerInterface,
    RateLimiterInterface,
    AbuseDetectorInterface
)

from app.modules.ai.core.exceptions import (
    AIException,
    AIQuotaExceededError,
    AIRateLimitError,
    AIProviderError,
    AIProviderTimeoutError,
    AIContentFilterError,
    AIPromptError,
    AIFeatureDisabledError,
    AIAbuseDetectedError,
    AICircuitBreakerOpenError
)

from app.modules.ai.core.constants import (
    TOKEN_COSTS,
    QUOTA_LIMITS,
    ABUSE_THRESHOLDS,
    AbuseSeverity,
    BANNED_PATTERNS,
    REDIRECT_TOPICS,
    PROVIDER_DEFAULTS,
    CIRCUIT_BREAKER_CONFIG,
    CACHE_CONFIG,
    REDIS_KEYS
)

from app.modules.ai.core.response_wrapper import (
    AIResponseWrapper,
    ResponseWrapperFactory,
    ResponseType,
    ConfidenceLevel,
    create_response
)

from app.modules.ai.core.cost_tracker import (
    CostTracker,
    CostEntry,
    CostAlert,
    AlertLevel,
    cost_tracker
)

__all__ = [
    # Interfaces
    'AIFeature',
    'AIRole',
    'AIRequest',
    'AIResponse',
    'ProviderHealth',
    'AIProviderInterface',
    'PromptTemplateInterface',
    'QuotaManagerInterface',
    'RateLimiterInterface',
    'AbuseDetectorInterface',
    
    # Exceptions
    'AIException',
    'AIQuotaExceededError',
    'AIRateLimitError',
    'AIProviderError',
    'AIProviderTimeoutError',
    'AIContentFilterError',
    'AIPromptError',
    'AIFeatureDisabledError',
    'AIAbuseDetectedError',
    'AICircuitBreakerOpenError',
    
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
    
    # Constants
    'TOKEN_COSTS',
    'QUOTA_LIMITS',
    'ABUSE_THRESHOLDS',
    'AbuseSeverity',
    'BANNED_PATTERNS',
    'REDIRECT_TOPICS',
    'PROVIDER_DEFAULTS',
    'CIRCUIT_BREAKER_CONFIG',
    'CACHE_CONFIG',
    'REDIS_KEYS',
]
