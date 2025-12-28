"""
AI Production Configuration.

Bu modül AI sisteminin production ortamındaki konfigürasyonunu yönetir.

DevOps Best Practices:
=====================
1. 12-Factor App uyumlu (env variables)
2. Circuit breaker pattern
3. Retry with exponential backoff
4. Timeout management
5. Cost monitoring & budgeting
6. Feature flags for gradual rollout
7. Kill switch for emergency
"""

import os
from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass, field
from functools import lru_cache


class AIProvider(str, Enum):
    """Desteklenen AI sağlayıcıları."""
    MOCK = 'mock'
    OPENAI = 'openai'
    AZURE_OPENAI = 'azure_openai'
    ANTHROPIC = 'anthropic'


class RolloutStage(str, Enum):
    """AI rollout aşamaları."""
    DISABLED = 'disabled'           # AI tamamen kapalı
    INTERNAL_ONLY = 'internal_only' # Sadece admin/staff
    CANARY = 'canary'               # %5 kullanıcı
    BETA = 'beta'                   # %25 kullanıcı
    GRADUAL = 'gradual'             # %50 kullanıcı
    GENERAL = 'general'             # %100 kullanıcı (production)


class CircuitState(str, Enum):
    """Circuit breaker durumları."""
    CLOSED = 'closed'               # Normal çalışma
    OPEN = 'open'                   # Devre açık (fail fast)
    HALF_OPEN = 'half_open'         # Test aşaması


@dataclass
class TimeoutConfig:
    """Timeout konfigürasyonu."""
    # Bağlantı timeout'ları
    connect_timeout: float = 5.0        # Bağlantı kurma (saniye)
    read_timeout: float = 30.0          # Yanıt okuma (saniye)
    total_timeout: float = 60.0         # Toplam istek süresi
    
    # Streaming timeout'lar
    stream_timeout: float = 120.0       # Stream için toplam süre
    chunk_timeout: float = 10.0         # Her chunk için max süre
    
    @classmethod
    def from_env(cls) -> 'TimeoutConfig':
        return cls(
            connect_timeout=float(os.getenv('AI_CONNECT_TIMEOUT', '5.0')),
            read_timeout=float(os.getenv('AI_READ_TIMEOUT', '30.0')),
            total_timeout=float(os.getenv('AI_TOTAL_TIMEOUT', '60.0')),
            stream_timeout=float(os.getenv('AI_STREAM_TIMEOUT', '120.0')),
            chunk_timeout=float(os.getenv('AI_CHUNK_TIMEOUT', '10.0'))
        )


@dataclass
class RetryConfig:
    """Retry konfigürasyonu - Exponential Backoff."""
    max_retries: int = 3
    initial_delay: float = 1.0          # İlk bekleme (saniye)
    max_delay: float = 30.0             # Maksimum bekleme
    exponential_base: float = 2.0       # Üstel çarpan
    jitter: bool = True                 # Rastgele varyasyon
    
    # Retry edilecek HTTP kodları
    retry_status_codes: List[int] = field(default_factory=lambda: [429, 500, 502, 503, 504])
    
    # Retry EDİLMEYECEK hatalar
    non_retryable_errors: List[str] = field(default_factory=lambda: [
        'invalid_api_key',
        'insufficient_quota', 
        'content_policy_violation',
        'context_length_exceeded'
    ])
    
    @classmethod
    def from_env(cls) -> 'RetryConfig':
        return cls(
            max_retries=int(os.getenv('AI_MAX_RETRIES', '3')),
            initial_delay=float(os.getenv('AI_RETRY_INITIAL_DELAY', '1.0')),
            max_delay=float(os.getenv('AI_RETRY_MAX_DELAY', '30.0')),
            exponential_base=float(os.getenv('AI_RETRY_EXPONENTIAL_BASE', '2.0'))
        )
    
    def get_delay(self, attempt: int) -> float:
        """Exponential backoff ile bekleme süresini hesapla."""
        import random
        
        delay = self.initial_delay * (self.exponential_base ** attempt)
        delay = min(delay, self.max_delay)
        
        if self.jitter:
            # ±25% jitter ekle
            jitter_range = delay * 0.25
            delay += random.uniform(-jitter_range, jitter_range)
        
        return max(0, delay)


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker konfigürasyonu."""
    failure_threshold: int = 5          # Kaç hatadan sonra devre açılsın
    success_threshold: int = 3          # Kaç başarıdan sonra devre kapansın
    timeout: float = 60.0               # Devre açık kalma süresi (saniye)
    half_open_max_calls: int = 3        # Half-open'da max deneme
    
    @classmethod
    def from_env(cls) -> 'CircuitBreakerConfig':
        return cls(
            failure_threshold=int(os.getenv('AI_CB_FAILURE_THRESHOLD', '5')),
            success_threshold=int(os.getenv('AI_CB_SUCCESS_THRESHOLD', '3')),
            timeout=float(os.getenv('AI_CB_TIMEOUT', '60.0'))
        )


@dataclass
class RateLimitConfig:
    """Rate limiting konfigürasyonu."""
    # Global limitler
    requests_per_minute: int = 100
    requests_per_hour: int = 1000
    tokens_per_minute: int = 40000
    tokens_per_day: int = 1000000
    
    # Kullanıcı bazlı limitler
    user_requests_per_minute: int = 10
    user_requests_per_hour: int = 100
    user_tokens_per_day: int = 50000
    
    # Burst limit
    burst_limit: int = 20               # Ani yük için max
    burst_window: int = 10              # Burst penceresi (saniye)
    
    @classmethod
    def from_env(cls) -> 'RateLimitConfig':
        return cls(
            requests_per_minute=int(os.getenv('AI_RPM', '100')),
            requests_per_hour=int(os.getenv('AI_RPH', '1000')),
            tokens_per_minute=int(os.getenv('AI_TPM', '40000')),
            tokens_per_day=int(os.getenv('AI_TPD', '1000000')),
            user_requests_per_minute=int(os.getenv('AI_USER_RPM', '10')),
            user_requests_per_hour=int(os.getenv('AI_USER_RPH', '100')),
            user_tokens_per_day=int(os.getenv('AI_USER_TPD', '50000'))
        )


@dataclass
class CostConfig:
    """Maliyet izleme konfigürasyonu."""
    # Bütçe limitleri
    daily_budget_usd: float = 50.0
    monthly_budget_usd: float = 1000.0
    alert_threshold_percent: float = 80.0  # %80'de uyarı
    hard_limit_threshold_percent: float = 100.0  # %100'de durdur
    
    # Model fiyatları (USD per 1K tokens)
    model_prices: Dict[str, Dict[str, float]] = field(default_factory=lambda: {
        'gpt-4o': {'input': 0.0025, 'output': 0.01},
        'gpt-4o-mini': {'input': 0.00015, 'output': 0.0006},
        'gpt-4-turbo': {'input': 0.01, 'output': 0.03},
        'gpt-3.5-turbo': {'input': 0.0005, 'output': 0.0015},
        'claude-3-opus': {'input': 0.015, 'output': 0.075},
        'claude-3-sonnet': {'input': 0.003, 'output': 0.015},
        'claude-3-haiku': {'input': 0.00025, 'output': 0.00125},
    })
    
    @classmethod
    def from_env(cls) -> 'CostConfig':
        return cls(
            daily_budget_usd=float(os.getenv('AI_DAILY_BUDGET_USD', '50.0')),
            monthly_budget_usd=float(os.getenv('AI_MONTHLY_BUDGET_USD', '1000.0')),
            alert_threshold_percent=float(os.getenv('AI_ALERT_THRESHOLD', '80.0'))
        )
    
    def calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Token kullanımından maliyet hesapla."""
        prices = self.model_prices.get(model, {'input': 0.001, 'output': 0.002})
        
        input_cost = (input_tokens / 1000) * prices['input']
        output_cost = (output_tokens / 1000) * prices['output']
        
        return round(input_cost + output_cost, 6)


@dataclass
class FeatureFlagConfig:
    """Feature flag konfigürasyonu."""
    # Rollout aşaması
    rollout_stage: RolloutStage = RolloutStage.DISABLED
    rollout_percentage: int = 0  # 0-100
    
    # Feature bazlı kontrol
    enabled_features: List[str] = field(default_factory=lambda: [
        'question_hint',
        'topic_explanation',
        'study_plan',
        'performance_analysis'
    ])
    
    disabled_features: List[str] = field(default_factory=list)
    
    # Beta kullanıcılar
    beta_user_ids: List[int] = field(default_factory=list)
    
    # Whitelist/Blacklist
    whitelisted_roles: List[str] = field(default_factory=lambda: ['admin', 'super_admin'])
    blacklisted_user_ids: List[int] = field(default_factory=list)
    
    @classmethod
    def from_env(cls) -> 'FeatureFlagConfig':
        stage = os.getenv('AI_ROLLOUT_STAGE', 'disabled')
        return cls(
            rollout_stage=RolloutStage(stage) if stage in [s.value for s in RolloutStage] else RolloutStage.DISABLED,
            rollout_percentage=int(os.getenv('AI_ROLLOUT_PERCENTAGE', '0')),
            enabled_features=os.getenv('AI_ENABLED_FEATURES', 'question_hint,topic_explanation').split(','),
            disabled_features=os.getenv('AI_DISABLED_FEATURES', '').split(',') if os.getenv('AI_DISABLED_FEATURES') else []
        )
    
    def is_user_eligible(self, user_id: int, user_role: str) -> bool:
        """Kullanıcının AI'ya erişim hakkı var mı?"""
        import hashlib
        
        # Blacklist kontrolü
        if user_id in self.blacklisted_user_ids:
            return False
        
        # Whitelist kontrolü (admin her zaman erişir)
        if user_role in self.whitelisted_roles:
            return True
        
        # Beta kullanıcı kontrolü
        if user_id in self.beta_user_ids:
            return True
        
        # Rollout aşamasına göre karar
        if self.rollout_stage == RolloutStage.DISABLED:
            return False
        elif self.rollout_stage == RolloutStage.INTERNAL_ONLY:
            return user_role in ['admin', 'super_admin', 'staff']
        elif self.rollout_stage == RolloutStage.GENERAL:
            return True
        else:
            # Yüzdelik rollout - user_id'nin hash'ine göre karar
            hash_value = int(hashlib.md5(str(user_id).encode()).hexdigest(), 16)
            user_bucket = hash_value % 100
            return user_bucket < self.rollout_percentage


@dataclass
class AIProductionConfig:
    """
    AI Production ana konfigürasyonu.
    
    Tüm alt konfigürasyonları birleştirir.
    """
    # Provider
    provider: AIProvider = AIProvider.MOCK
    model: str = 'gpt-4o-mini'
    api_key: Optional[str] = None
    api_base_url: Optional[str] = None
    organization_id: Optional[str] = None
    
    # Alt konfigürasyonlar
    timeout: TimeoutConfig = field(default_factory=TimeoutConfig)
    retry: RetryConfig = field(default_factory=RetryConfig)
    circuit_breaker: CircuitBreakerConfig = field(default_factory=CircuitBreakerConfig)
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    cost: CostConfig = field(default_factory=CostConfig)
    feature_flags: FeatureFlagConfig = field(default_factory=FeatureFlagConfig)
    
    # Model ayarları
    max_tokens: int = 1000
    temperature: float = 0.7
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    
    # Güvenlik
    content_filter_enabled: bool = True
    prompt_injection_detection: bool = True
    pii_detection: bool = True
    
    # Logging
    log_requests: bool = True
    log_responses: bool = False  # GDPR/KVKK: Yanıtları loglama
    log_tokens: bool = True
    log_costs: bool = True
    
    @classmethod
    def from_env(cls) -> 'AIProductionConfig':
        """Environment variables'dan konfigürasyon oluştur."""
        provider_str = os.getenv('AI_PROVIDER', 'mock')
        
        return cls(
            provider=AIProvider(provider_str) if provider_str in [p.value for p in AIProvider] else AIProvider.MOCK,
            model=os.getenv('AI_MODEL', 'gpt-4o-mini'),
            api_key=os.getenv('OPENAI_API_KEY'),
            api_base_url=os.getenv('OPENAI_API_BASE'),
            organization_id=os.getenv('OPENAI_ORGANIZATION'),
            
            timeout=TimeoutConfig.from_env(),
            retry=RetryConfig.from_env(),
            circuit_breaker=CircuitBreakerConfig.from_env(),
            rate_limit=RateLimitConfig.from_env(),
            cost=CostConfig.from_env(),
            feature_flags=FeatureFlagConfig.from_env(),
            
            max_tokens=int(os.getenv('AI_MAX_TOKENS', '1000')),
            temperature=float(os.getenv('AI_TEMPERATURE', '0.7')),
            
            content_filter_enabled=os.getenv('AI_CONTENT_FILTER', 'true').lower() == 'true',
            prompt_injection_detection=os.getenv('AI_PROMPT_INJECTION_DETECTION', 'true').lower() == 'true',
            
            log_requests=os.getenv('AI_LOG_REQUESTS', 'true').lower() == 'true',
            log_responses=os.getenv('AI_LOG_RESPONSES', 'false').lower() == 'true',
            log_tokens=os.getenv('AI_LOG_TOKENS', 'true').lower() == 'true',
            log_costs=os.getenv('AI_LOG_COSTS', 'true').lower() == 'true'
        )
    
    def is_mock_mode(self) -> bool:
        """Mock mod aktif mi?"""
        return self.provider == AIProvider.MOCK
    
    def is_production_ready(self) -> bool:
        """Production'a hazır mı?"""
        if self.is_mock_mode():
            return False
        
        if not self.api_key:
            return False
        
        if self.feature_flags.rollout_stage == RolloutStage.DISABLED:
            return False
        
        return True
    
    def get_env_template(self) -> str:
        """Örnek .env dosyası içeriği."""
        return """
# =============================================================================
# AI PRODUCTION CONFIGURATION
# =============================================================================

# Provider: mock, openai, azure_openai, anthropic
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini

# API Keys
OPENAI_API_KEY=sk-your-api-key-here
# OPENAI_ORGANIZATION=org-xxx (optional)
# OPENAI_API_BASE=https://api.openai.com/v1 (optional)

# =============================================================================
# TIMEOUT SETTINGS (seconds)
# =============================================================================
AI_CONNECT_TIMEOUT=5.0
AI_READ_TIMEOUT=30.0
AI_TOTAL_TIMEOUT=60.0
AI_STREAM_TIMEOUT=120.0

# =============================================================================
# RETRY SETTINGS
# =============================================================================
AI_MAX_RETRIES=3
AI_RETRY_INITIAL_DELAY=1.0
AI_RETRY_MAX_DELAY=30.0

# =============================================================================
# CIRCUIT BREAKER
# =============================================================================
AI_CB_FAILURE_THRESHOLD=5
AI_CB_SUCCESS_THRESHOLD=3
AI_CB_TIMEOUT=60.0

# =============================================================================
# RATE LIMITING
# =============================================================================
AI_RPM=100                    # Requests per minute (global)
AI_RPH=1000                   # Requests per hour (global)
AI_TPM=40000                  # Tokens per minute
AI_TPD=1000000                # Tokens per day
AI_USER_RPM=10                # User requests per minute
AI_USER_RPH=100               # User requests per hour
AI_USER_TPD=50000             # User tokens per day

# =============================================================================
# COST MANAGEMENT
# =============================================================================
AI_DAILY_BUDGET_USD=50.0
AI_MONTHLY_BUDGET_USD=1000.0
AI_ALERT_THRESHOLD=80         # Alert at 80% budget

# =============================================================================
# FEATURE FLAGS / ROLLOUT
# =============================================================================
# disabled, internal_only, canary, beta, gradual, general
AI_ROLLOUT_STAGE=internal_only
AI_ROLLOUT_PERCENTAGE=0       # 0-100 for gradual rollout
AI_ENABLED_FEATURES=question_hint,topic_explanation,study_plan
AI_DISABLED_FEATURES=

# =============================================================================
# MODEL SETTINGS
# =============================================================================
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7

# =============================================================================
# SECURITY
# =============================================================================
AI_CONTENT_FILTER=true
AI_PROMPT_INJECTION_DETECTION=true

# =============================================================================
# LOGGING (GDPR/KVKK)
# =============================================================================
AI_LOG_REQUESTS=true
AI_LOG_RESPONSES=false        # Don't log responses (GDPR)
AI_LOG_TOKENS=true
AI_LOG_COSTS=true
"""


@lru_cache()
def get_ai_production_config() -> AIProductionConfig:
    """Singleton AI production konfigürasyonu."""
    return AIProductionConfig.from_env()


def reload_ai_config():
    """Konfigürasyonu yeniden yükle (runtime değişiklik için)."""
    get_ai_production_config.cache_clear()
    return get_ai_production_config()
