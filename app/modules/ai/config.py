"""
AI Provider Configuration.

AI modülü için merkezi konfigürasyon yönetimi.
Ortam değişkenleri, güvenlik ve provider seçimi.

KULLANIM:
=========
    from app.modules.ai.config import get_ai_config, AIProviderType
    
    config = get_ai_config()
    provider_type = config.provider_type
    api_key = config.get_api_key()  # Güvenli şekilde

ENVIRONMENT VARIABLES:
======================
    # Provider seçimi
    AI_PROVIDER=mock|openai|gpt41|azure
    
    # OpenAI/GPT-4.1
    OPENAI_API_KEY=sk-...
    OPENAI_MODEL=gpt-4o-mini
    OPENAI_MAX_TOKENS=1000
    OPENAI_TEMPERATURE=0.7
    
    # Rate limiting
    AI_RATE_LIMIT_RPM=60
    AI_RATE_LIMIT_TPM=100000
    
    # Fallback
    AI_ENABLE_FALLBACK=true
    AI_FALLBACK_PROVIDER=mock
"""

import os
import logging
from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from functools import lru_cache

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS
# =============================================================================

class AIProviderType(str, Enum):
    """Desteklenen AI provider'lar."""
    MOCK = "mock"
    OPENAI = "openai"
    GPT41 = "gpt41"
    AZURE = "azure"
    ANTHROPIC = "anthropic"


class AIEnvironment(str, Enum):
    """AI ortam modları."""
    DEVELOPMENT = "development"    # Mock kullanır
    STAGING = "staging"            # GPT-4o-mini ile test
    PRODUCTION = "production"      # GPT-4.1 veya GPT-4o


# =============================================================================
# CONFIGURATION DATACLASS
# =============================================================================

@dataclass
class AIConfig:
    """
    AI modülü konfigürasyonu.
    
    Tüm AI ayarlarını tek noktadan yönetir.
    Sensitive değerler (API key) property olarak expose edilir.
    """
    
    # Provider seçimi
    provider_type: AIProviderType = AIProviderType.MOCK
    environment: AIEnvironment = AIEnvironment.DEVELOPMENT
    
    # Model ayarları
    model: str = "gpt-4o-mini"
    max_tokens: int = 1000
    temperature: float = 0.7
    timeout: int = 30
    max_retries: int = 3
    
    # Rate limiting
    rate_limit_rpm: int = 60          # Requests per minute
    rate_limit_tpm: int = 100000      # Tokens per minute
    rate_limit_rpd: int = 10000       # Requests per day
    
    # Circuit breaker
    circuit_failure_threshold: int = 5
    circuit_success_threshold: int = 2
    circuit_timeout: int = 60
    
    # Retry
    retry_base_delay: float = 1.0
    retry_max_delay: float = 60.0
    retry_jitter: bool = True
    
    # Fallback
    enable_fallback: bool = True
    fallback_provider: AIProviderType = AIProviderType.MOCK
    
    # Cost controls
    max_cost_per_request: float = 0.10   # USD
    max_cost_per_user_daily: float = 1.0  # USD
    max_cost_monthly: float = 100.0       # USD
    
    # Security
    enable_content_filter: bool = True
    enable_audit_logging: bool = True
    mask_api_key_in_logs: bool = True
    
    # Internal - API key ayrı tutulur
    _api_key: Optional[str] = field(default=None, repr=False)
    _org_id: Optional[str] = field(default=None, repr=False)
    
    # =========================================================================
    # API KEY MANAGEMENT (Secure)
    # =========================================================================
    
    def get_api_key(self) -> Optional[str]:
        """
        API key'i güvenli şekilde al.
        
        Key hiçbir zaman log'lara yazılmaz.
        """
        return self._api_key
    
    def set_api_key(self, key: str) -> None:
        """API key'i set et."""
        if key and self._validate_api_key(key):
            self._api_key = key
        else:
            logger.warning("Invalid API key format provided")
    
    def get_masked_api_key(self) -> str:
        """Maskelenmiş API key (logging için)."""
        if not self._api_key:
            return "[NOT_SET]"
        
        if len(self._api_key) < 10:
            return "[INVALID]"
        
        return f"{self._api_key[:7]}...{self._api_key[-4:]}"
    
    def has_valid_api_key(self) -> bool:
        """Geçerli API key var mı?"""
        return self._api_key is not None and self._validate_api_key(self._api_key)
    
    def _validate_api_key(self, key: str) -> bool:
        """API key formatını doğrula."""
        if not key or len(key) < 20:
            return False
        
        # OpenAI key formatları
        valid_prefixes = ['sk-', 'sk-proj-']
        return any(key.startswith(prefix) for prefix in valid_prefixes)
    
    # =========================================================================
    # PROVIDER CONFIG
    # =========================================================================
    
    def get_provider_config(self) -> Dict[str, Any]:
        """Provider için config dictionary döner."""
        base_config = {
            'model': self.model,
            'max_tokens': self.max_tokens,
            'temperature': self.temperature,
            'timeout': self.timeout,
            'max_retries': self.max_retries,
            'enable_fallback': self.enable_fallback,
            'circuit_failure_threshold': self.circuit_failure_threshold,
            'circuit_success_threshold': self.circuit_success_threshold,
            'circuit_timeout': self.circuit_timeout,
            'retry_base_delay': self.retry_base_delay,
            'retry_max_delay': self.retry_max_delay,
        }
        
        # API key sadece production provider'lar için eklenir
        if self.provider_type in [AIProviderType.OPENAI, AIProviderType.GPT41, AIProviderType.AZURE]:
            base_config['api_key'] = self._api_key
        
        return base_config
    
    def get_mock_config(self) -> Dict[str, Any]:
        """Mock provider için config."""
        return {
            'delay_min': 0.3 if self.environment == AIEnvironment.DEVELOPMENT else 0.1,
            'delay_max': 1.0 if self.environment == AIEnvironment.DEVELOPMENT else 0.5,
            'simulate_errors': False,
        }
    
    # =========================================================================
    # ENVIRONMENT DETECTION
    # =========================================================================
    
    def is_production(self) -> bool:
        """Production ortamında mı?"""
        return self.environment == AIEnvironment.PRODUCTION
    
    def is_using_paid_api(self) -> bool:
        """Ücretli API kullanılıyor mu?"""
        return self.provider_type in [
            AIProviderType.OPENAI,
            AIProviderType.GPT41,
            AIProviderType.AZURE,
            AIProviderType.ANTHROPIC
        ]
    
    def should_use_fallback(self) -> bool:
        """Fallback kullanılmalı mı?"""
        return self.enable_fallback and not self.has_valid_api_key()
    
    # =========================================================================
    # VALIDATION
    # =========================================================================
    
    def validate(self) -> tuple[bool, list[str]]:
        """
        Config doğrulaması yap.
        
        Returns:
            (is_valid, error_messages)
        """
        errors = []
        
        # Production için API key zorunlu
        if self.is_production() and self.is_using_paid_api():
            if not self.has_valid_api_key():
                errors.append("Production ortamında geçerli API key zorunludur")
        
        # Rate limit kontrolleri
        if self.rate_limit_rpm < 1:
            errors.append("rate_limit_rpm en az 1 olmalı")
        
        if self.max_tokens < 100:
            errors.append("max_tokens en az 100 olmalı")
        
        if not 0 <= self.temperature <= 2:
            errors.append("temperature 0-2 arasında olmalı")
        
        return len(errors) == 0, errors
    
    # =========================================================================
    # SERIALIZATION
    # =========================================================================
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Dictionary'e çevir."""
        data = {
            'provider_type': self.provider_type.value,
            'environment': self.environment.value,
            'model': self.model,
            'max_tokens': self.max_tokens,
            'temperature': self.temperature,
            'timeout': self.timeout,
            'max_retries': self.max_retries,
            'rate_limit_rpm': self.rate_limit_rpm,
            'rate_limit_tpm': self.rate_limit_tpm,
            'enable_fallback': self.enable_fallback,
            'fallback_provider': self.fallback_provider.value,
            'is_production': self.is_production(),
            'is_using_paid_api': self.is_using_paid_api(),
            'has_valid_api_key': self.has_valid_api_key(),
        }
        
        if include_sensitive:
            data['api_key'] = self._api_key
        else:
            data['api_key_masked'] = self.get_masked_api_key()
        
        return data


# =============================================================================
# FACTORY FUNCTIONS
# =============================================================================

def load_ai_config_from_env() -> AIConfig:
    """
    Environment variables'dan AI config yükle.
    
    Production-safe: API key env'den alınır, loglara yazılmaz.
    """
    # Provider type
    provider_str = os.getenv('AI_PROVIDER', 'mock').lower()
    try:
        provider_type = AIProviderType(provider_str)
    except ValueError:
        logger.warning(f"Invalid AI_PROVIDER: {provider_str}, using mock")
        provider_type = AIProviderType.MOCK
    
    # Environment
    flask_env = os.getenv('FLASK_ENV', 'development').lower()
    try:
        environment = AIEnvironment(flask_env)
    except ValueError:
        environment = AIEnvironment.DEVELOPMENT
    
    # Model
    model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    
    # Fallback provider
    fallback_str = os.getenv('AI_FALLBACK_PROVIDER', 'mock').lower()
    try:
        fallback_provider = AIProviderType(fallback_str)
    except ValueError:
        fallback_provider = AIProviderType.MOCK
    
    config = AIConfig(
        provider_type=provider_type,
        environment=environment,
        model=model,
        max_tokens=int(os.getenv('OPENAI_MAX_TOKENS', '1000')),
        temperature=float(os.getenv('OPENAI_TEMPERATURE', '0.7')),
        timeout=int(os.getenv('OPENAI_TIMEOUT', '30')),
        max_retries=int(os.getenv('OPENAI_MAX_RETRIES', '3')),
        rate_limit_rpm=int(os.getenv('AI_RATE_LIMIT_RPM', '60')),
        rate_limit_tpm=int(os.getenv('AI_RATE_LIMIT_TPM', '100000')),
        rate_limit_rpd=int(os.getenv('AI_RATE_LIMIT_RPD', '10000')),
        circuit_failure_threshold=int(os.getenv('AI_CIRCUIT_FAILURE_THRESHOLD', '5')),
        circuit_success_threshold=int(os.getenv('AI_CIRCUIT_SUCCESS_THRESHOLD', '2')),
        circuit_timeout=int(os.getenv('AI_CIRCUIT_TIMEOUT', '60')),
        enable_fallback=os.getenv('AI_ENABLE_FALLBACK', 'true').lower() == 'true',
        fallback_provider=fallback_provider,
        max_cost_per_request=float(os.getenv('AI_MAX_COST_PER_REQUEST', '0.10')),
        max_cost_per_user_daily=float(os.getenv('AI_MAX_COST_PER_USER_DAILY', '1.0')),
        max_cost_monthly=float(os.getenv('AI_MAX_COST_MONTHLY', '100.0')),
        enable_content_filter=os.getenv('AI_ENABLE_CONTENT_FILTER', 'true').lower() == 'true',
        enable_audit_logging=os.getenv('AI_ENABLE_AUDIT_LOGGING', 'true').lower() == 'true',
    )
    
    # API Key - Environment'dan güvenli şekilde al
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        config.set_api_key(api_key)
        logger.info(f"AI Config loaded: provider={provider_type.value}, key={config.get_masked_api_key()}")
    else:
        logger.info(f"AI Config loaded: provider={provider_type.value}, no API key")
    
    return config


@lru_cache()
def get_ai_config() -> AIConfig:
    """
    Cached AI config instance.
    
    Singleton pattern - uygulama boyunca tek instance.
    """
    return load_ai_config_from_env()


def get_ai_config_for_flask(app) -> AIConfig:
    """
    Flask app config'den AI config al.
    
    Flask context içinde kullanılır.
    """
    config = AIConfig(
        provider_type=AIProviderType(app.config.get('AI_PROVIDER', 'mock')),
        model=app.config.get('OPENAI_MODEL', 'gpt-4o-mini'),
        max_tokens=app.config.get('OPENAI_MAX_TOKENS', 1000),
        temperature=app.config.get('OPENAI_TEMPERATURE', 0.7),
        timeout=app.config.get('OPENAI_TIMEOUT', 30),
        max_retries=app.config.get('OPENAI_MAX_RETRIES', 3),
        rate_limit_rpm=app.config.get('AI_RATE_LIMIT_RPM', 60),
        enable_fallback=app.config.get('AI_ENABLE_FALLBACK', True),
    )
    
    api_key = app.config.get('OPENAI_API_KEY')
    if api_key:
        config.set_api_key(api_key)
    
    return config


# =============================================================================
# ENVIRONMENT PRESET CONFIGS
# =============================================================================

def get_development_config() -> AIConfig:
    """Development için önceden ayarlanmış config."""
    return AIConfig(
        provider_type=AIProviderType.MOCK,
        environment=AIEnvironment.DEVELOPMENT,
        model="mock-v1",
        enable_fallback=False,  # Mock zaten fallback
        enable_audit_logging=True,
    )


def get_staging_config(api_key: str = None) -> AIConfig:
    """Staging için önceden ayarlanmış config."""
    config = AIConfig(
        provider_type=AIProviderType.GPT41,
        environment=AIEnvironment.STAGING,
        model="gpt-4o-mini",  # Staging'de ekonomik model
        max_tokens=500,       # Sınırlı token
        rate_limit_rpm=30,    # Düşük rate limit
        enable_fallback=True,
        max_cost_per_request=0.05,
        max_cost_per_user_daily=0.50,
    )
    
    if api_key:
        config.set_api_key(api_key)
    
    return config


def get_production_config(api_key: str) -> AIConfig:
    """Production için önceden ayarlanmış config."""
    if not api_key:
        raise ValueError("Production config için API key zorunludur")
    
    config = AIConfig(
        provider_type=AIProviderType.GPT41,
        environment=AIEnvironment.PRODUCTION,
        model="gpt-4o",      # Production'da güçlü model
        max_tokens=1000,
        rate_limit_rpm=60,
        rate_limit_tpm=100000,
        enable_fallback=True,  # Yine de fallback açık
        circuit_failure_threshold=3,  # Daha hassas
        max_cost_per_request=0.10,
        max_cost_per_user_daily=2.0,
        max_cost_monthly=500.0,
    )
    
    config.set_api_key(api_key)
    
    return config


# =============================================================================
# ROLLBACK SUPPORT
# =============================================================================

class AIConfigManager:
    """
    AI Config yönetimi ve rollback desteği.
    
    Production'da config değişikliklerini yönetir.
    """
    
    def __init__(self):
        self._current_config: Optional[AIConfig] = None
        self._previous_config: Optional[AIConfig] = None
        self._config_history: list[AIConfig] = []
        self._max_history = 10
    
    @property
    def current(self) -> AIConfig:
        """Mevcut config."""
        if self._current_config is None:
            self._current_config = load_ai_config_from_env()
        return self._current_config
    
    def switch_config(self, new_config: AIConfig) -> None:
        """
        Yeni config'e geç.
        
        Eski config rollback için saklanır.
        """
        # Validation
        is_valid, errors = new_config.validate()
        if not is_valid:
            raise ValueError(f"Invalid config: {errors}")
        
        # Save current for rollback
        if self._current_config:
            self._previous_config = self._current_config
            self._config_history.append(self._current_config)
            
            # History limit
            if len(self._config_history) > self._max_history:
                self._config_history.pop(0)
        
        self._current_config = new_config
        logger.info(f"AI Config switched to: {new_config.provider_type.value}")
    
    def rollback(self) -> bool:
        """
        Önceki config'e geri dön.
        
        Returns:
            True if rollback successful
        """
        if not self._previous_config:
            logger.warning("No previous config to rollback to")
            return False
        
        self._current_config = self._previous_config
        self._previous_config = None
        
        logger.info(f"AI Config rolled back to: {self._current_config.provider_type.value}")
        return True
    
    def switch_to_mock(self) -> None:
        """Acil durum: Mock provider'a geç."""
        mock_config = get_development_config()
        self.switch_config(mock_config)
        logger.warning("EMERGENCY: Switched to Mock provider")
    
    def switch_to_production(self, api_key: str = None) -> None:
        """Production provider'a geç."""
        key = api_key or self.current.get_api_key()
        if not key:
            raise ValueError("API key required for production")
        
        prod_config = get_production_config(key)
        self.switch_config(prod_config)
    
    def get_status(self) -> Dict[str, Any]:
        """Config durumunu al."""
        return {
            'current': self.current.to_dict(),
            'has_previous': self._previous_config is not None,
            'history_count': len(self._config_history),
            'can_rollback': self._previous_config is not None,
        }


# Global config manager instance
ai_config_manager = AIConfigManager()
