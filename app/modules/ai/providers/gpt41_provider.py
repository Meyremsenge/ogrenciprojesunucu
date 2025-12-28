"""
GPT-4.1 AI Provider Implementation.

Production-ready OpenAI GPT-4.1 entegrasyonu.
Circuit breaker, fallback, retry, rate limiting ve kapsamlı hata yönetimi içerir.

ÖZELLİKLER:
===========
- GPT-4.1 model desteği (gpt-4.1, gpt-4.1-mini, gpt-4.1-nano)
- Circuit breaker pattern (hata durumunda otomatik devre kesme)
- Exponential backoff retry mekanizması
- Fallback to mock provider
- Detaylı token counting (tiktoken)
- Rate limit uyumlu
- Kapsamlı hata yönetimi
- Audit logging entegrasyonu

KULLANIM:
=========
    from app.modules.ai.providers import get_ai_provider
    
    # Config'den otomatik seçim (AI_PROVIDER=gpt41)
    provider = get_ai_provider()
    
    # Manuel kullanım
    from app.modules.ai.providers.gpt41_provider import GPT41Provider
    provider = GPT41Provider({'api_key': 'sk-...'})
"""

import time
import logging
import threading
from typing import Dict, Any, Optional, Generator, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps

from .abstraction import (
    BaseAIProvider,
    AICompletionRequest,
    AICompletionResponse,
    AIMessage,
    ProviderHealthStatus,
    ProviderStatus,
    AIFeatureType,
    AIProviderConnectionError,
    AIProviderRateLimitError,
    AIProviderAuthError,
    AIProviderQuotaError,
    AIContentFilterError,
    AIProviderException,
    register_provider
)

logger = logging.getLogger(__name__)


# =============================================================================
# CIRCUIT BREAKER
# =============================================================================

class CircuitState(str, Enum):
    """Circuit breaker durumları."""
    CLOSED = "closed"      # Normal çalışma
    OPEN = "open"          # Devre açık, istekler reddediliyor
    HALF_OPEN = "half_open"  # Test modu, bir istek deneniyor


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker konfigürasyonu."""
    failure_threshold: int = 5      # Bu kadar hatadan sonra devre açılır
    success_threshold: int = 2      # Half-open'dan kapatmak için gereken başarı
    timeout_seconds: int = 60       # Devre açık kalma süresi
    half_open_max_calls: int = 1    # Half-open'da izin verilen çağrı sayısı


class CircuitBreaker:
    """
    Circuit Breaker Pattern Implementation.
    
    API'ye sürekli hata veren isteklerin tekrarlanmasını engeller.
    Sistem kaynaklarını korur ve API kotasını boşa harcamaz.
    """
    
    def __init__(self, config: CircuitBreakerConfig = None):
        self.config = config or CircuitBreakerConfig()
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[datetime] = None
        self._half_open_calls = 0
        self._lock = threading.RLock()
    
    @property
    def state(self) -> CircuitState:
        """Mevcut durum (timeout kontrolü ile)."""
        with self._lock:
            if self._state == CircuitState.OPEN:
                # Timeout geçti mi kontrol et
                if self._last_failure_time:
                    elapsed = (datetime.utcnow() - self._last_failure_time).total_seconds()
                    if elapsed >= self.config.timeout_seconds:
                        self._state = CircuitState.HALF_OPEN
                        self._half_open_calls = 0
                        logger.info("Circuit breaker: OPEN -> HALF_OPEN (timeout)")
            return self._state
    
    def can_execute(self) -> bool:
        """İstek yapılabilir mi?"""
        state = self.state
        
        if state == CircuitState.CLOSED:
            return True
        elif state == CircuitState.OPEN:
            return False
        else:  # HALF_OPEN
            with self._lock:
                if self._half_open_calls < self.config.half_open_max_calls:
                    self._half_open_calls += 1
                    return True
                return False
    
    def record_success(self) -> None:
        """Başarılı istek kaydı."""
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.config.success_threshold:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0
                    logger.info("Circuit breaker: HALF_OPEN -> CLOSED (success)")
            elif self._state == CircuitState.CLOSED:
                # Başarıda failure count sıfırlanabilir (opsiyonel)
                self._failure_count = max(0, self._failure_count - 1)
    
    def record_failure(self) -> None:
        """Başarısız istek kaydı."""
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = datetime.utcnow()
            
            if self._state == CircuitState.HALF_OPEN:
                # Half-open'da bir hata direkt OPEN'a döndürür
                self._state = CircuitState.OPEN
                self._success_count = 0
                logger.warning("Circuit breaker: HALF_OPEN -> OPEN (failure)")
            elif self._state == CircuitState.CLOSED:
                if self._failure_count >= self.config.failure_threshold:
                    self._state = CircuitState.OPEN
                    logger.warning(
                        f"Circuit breaker: CLOSED -> OPEN "
                        f"(failures: {self._failure_count})"
                    )
    
    def reset(self) -> None:
        """Circuit breaker'ı sıfırla."""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._half_open_calls = 0
            self._last_failure_time = None
    
    def get_stats(self) -> Dict[str, Any]:
        """İstatistikleri al."""
        with self._lock:
            return {
                'state': self._state.value,
                'failure_count': self._failure_count,
                'success_count': self._success_count,
                'last_failure': self._last_failure_time.isoformat() if self._last_failure_time else None,
                'config': {
                    'failure_threshold': self.config.failure_threshold,
                    'success_threshold': self.config.success_threshold,
                    'timeout_seconds': self.config.timeout_seconds
                }
            }


# =============================================================================
# RETRY MECHANISM
# =============================================================================

@dataclass
class RetryConfig:
    """Retry konfigürasyonu."""
    max_retries: int = 3
    base_delay: float = 1.0         # İlk bekleme süresi (saniye)
    max_delay: float = 60.0         # Maksimum bekleme süresi
    exponential_base: float = 2.0   # Exponential artış katsayısı
    jitter: bool = True             # Rastgele gecikme ekle


def retry_with_backoff(config: RetryConfig = None):
    """
    Exponential backoff retry decorator.
    
    Rate limit ve geçici hatalar için otomatik tekrar dener.
    """
    cfg = config or RetryConfig()
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(cfg.max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except AIProviderException as e:
                    last_exception = e
                    
                    # Retry edilemez hatalar
                    if not e.retryable:
                        raise
                    
                    # Son deneme
                    if attempt == cfg.max_retries:
                        raise
                    
                    # Bekleme süresi hesapla
                    delay = min(
                        cfg.base_delay * (cfg.exponential_base ** attempt),
                        cfg.max_delay
                    )
                    
                    # Rate limit hatası için özel handling
                    if isinstance(e, AIProviderRateLimitError) and e.retry_after:
                        delay = max(delay, e.retry_after)
                    
                    # Jitter ekle
                    if cfg.jitter:
                        import random
                        delay = delay * (0.5 + random.random())
                    
                    logger.warning(
                        f"Retry attempt {attempt + 1}/{cfg.max_retries} "
                        f"after {delay:.2f}s delay. Error: {e}"
                    )
                    
                    time.sleep(delay)
            
            raise last_exception
        return wrapper
    return decorator


# =============================================================================
# GPT-4.1 MODELS
# =============================================================================

class GPT41Model(str, Enum):
    """GPT-4.1 model variants."""
    GPT_4_1 = "gpt-4.1"              # En güçlü
    GPT_4_1_MINI = "gpt-4.1-mini"    # Dengeli
    GPT_4_1_NANO = "gpt-4.1-nano"    # En hızlı/ucuz
    
    # Fallback modeller (gerçek OpenAI modelleri)
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_4_TURBO = "gpt-4-turbo"


# Model fiyatlandırma (USD per 1M tokens)
MODEL_PRICING = {
    "gpt-4.1": {"input": 2.00, "output": 8.00},
    "gpt-4.1-mini": {"input": 0.40, "output": 1.60},
    "gpt-4.1-nano": {"input": 0.10, "output": 0.40},
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00},
}

# Model context window limits
MODEL_CONTEXT_LIMITS = {
    "gpt-4.1": 1000000,       # 1M tokens
    "gpt-4.1-mini": 1000000,
    "gpt-4.1-nano": 1000000,
    "gpt-4o": 128000,
    "gpt-4o-mini": 128000,
    "gpt-4-turbo": 128000,
}


# =============================================================================
# GPT-4.1 PROVIDER
# =============================================================================

@register_provider('gpt41')
class GPT41Provider(BaseAIProvider):
    """
    Production-Ready GPT-4.1 AI Provider.
    
    OpenAI GPT-4.1 API entegrasyonu ile kurumsal düzeyde güvenilirlik sağlar.
    
    Features:
    - Circuit breaker: Hata durumunda otomatik devre kesme
    - Retry with backoff: Geçici hatalar için tekrar deneme
    - Fallback: Mock provider'a düşme
    - Cost tracking: Token ve maliyet takibi
    - Comprehensive logging: Detaylı audit trail
    """
    
    # =========================================================================
    # ABSTRACT PROPERTY IMPLEMENTATIONS
    # =========================================================================
    
    @property
    def name(self) -> str:
        return "gpt41"
    
    @property
    def display_name(self) -> str:
        return f"OpenAI {self._model}"
    
    @property
    def is_production_ready(self) -> bool:
        return self._client is not None
    
    # =========================================================================
    # INITIALIZATION
    # =========================================================================
    
    def _initialize(self) -> None:
        """Provider'ı initialize et."""
        # Config değerlerini al
        self._api_key = self._config.get('api_key')
        self._model = self._config.get('model', 'gpt-4o-mini')  # gpt-4.1 mevcut değilse fallback
        self._max_tokens = self._config.get('max_tokens', 1000)
        self._temperature = self._config.get('temperature', 0.7)
        self._timeout = self._config.get('timeout', 30)
        self._max_retries = self._config.get('max_retries', 3)
        self._enable_fallback = self._config.get('enable_fallback', True)
        
        # Circuit breaker
        cb_config = CircuitBreakerConfig(
            failure_threshold=self._config.get('circuit_failure_threshold', 5),
            success_threshold=self._config.get('circuit_success_threshold', 2),
            timeout_seconds=self._config.get('circuit_timeout', 60)
        )
        self._circuit_breaker = CircuitBreaker(cb_config)
        
        # Retry config
        self._retry_config = RetryConfig(
            max_retries=self._max_retries,
            base_delay=self._config.get('retry_base_delay', 1.0),
            max_delay=self._config.get('retry_max_delay', 60.0)
        )
        
        # Cost tracking
        self._total_cost = 0.0
        self._cost_lock = threading.Lock()
        
        # OpenAI client
        self._client = None
        self._fallback_provider = None
        
        # API key kontrolü
        if not self._api_key:
            logger.warning(
                "GPT-4.1 API key not configured. "
                "Provider will use fallback if enabled."
            )
            self._setup_fallback()
            return
        
        # API key format kontrolü
        if not self._validate_api_key(self._api_key):
            logger.error("Invalid OpenAI API key format")
            self._setup_fallback()
            return
        
        try:
            # OpenAI SDK'yı lazy import et
            from openai import OpenAI
            
            self._client = OpenAI(
                api_key=self._api_key,
                timeout=self._timeout,
                max_retries=0  # Kendi retry mekanizmamızı kullanıyoruz
            )
            
            logger.info(f"GPT-4.1 provider initialized with model: {self._model}")
            
        except ImportError:
            logger.error("OpenAI SDK not installed. Run: pip install openai>=1.0.0")
            self._setup_fallback()
        except Exception as e:
            logger.error(f"GPT-4.1 client initialization failed: {e}")
            self._setup_fallback()
    
    def _validate_api_key(self, api_key: str) -> bool:
        """API key formatını doğrula."""
        if not api_key:
            return False
        
        # OpenAI key formatları
        valid_prefixes = ['sk-', 'sk-proj-']
        return any(api_key.startswith(prefix) for prefix in valid_prefixes)
    
    def _setup_fallback(self) -> None:
        """Fallback provider'ı kur."""
        if not self._enable_fallback:
            return
        
        try:
            from .mock import MockAIProvider
            self._fallback_provider = MockAIProvider()
            logger.info("Fallback to MockAIProvider enabled")
        except Exception as e:
            logger.error(f"Failed to setup fallback provider: {e}")
    
    # =========================================================================
    # COMPLETION
    # =========================================================================
    
    def complete(self, request: AICompletionRequest) -> AICompletionResponse:
        """GPT-4.1 completion isteği."""
        # Circuit breaker kontrolü
        if not self._circuit_breaker.can_execute():
            logger.warning("Circuit breaker OPEN - using fallback")
            return self._fallback_complete(request)
        
        # Client kontrolü
        if not self._client:
            return self._fallback_complete(request)
        
        try:
            response = self._execute_with_retry(request)
            self._circuit_breaker.record_success()
            return response
        except AIProviderException as e:
            self._circuit_breaker.record_failure()
            
            # Fallback dene
            if self._enable_fallback and self._fallback_provider:
                logger.warning(f"GPT-4.1 failed, using fallback: {e}")
                return self._fallback_complete(request)
            
            raise
    
    @retry_with_backoff()
    def _execute_with_retry(self, request: AICompletionRequest) -> AICompletionResponse:
        """Retry mekanizması ile completion."""
        start_time = time.time()
        
        try:
            # Mesajları OpenAI formatına çevir
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]
            
            # API çağrısı
            response = self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                max_tokens=request.max_tokens or self._max_tokens,
                temperature=request.temperature or self._temperature,
            )
            
            # Yanıtı parse et
            choice = response.choices[0]
            content = choice.message.content
            finish_reason = choice.finish_reason
            
            # Token kullanımı
            usage = response.usage
            tokens_used = usage.total_tokens if usage else self.count_tokens(content)
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else tokens_used
            
            # Maliyet hesapla
            cost = self._calculate_cost(prompt_tokens, completion_tokens)
            
            # İstatistik güncelle
            self._record_request(tokens_used)
            self._record_cost(cost)
            
            # Latency hesapla
            latency_ms = int((time.time() - start_time) * 1000)
            
            return AICompletionResponse(
                content=content,
                tokens_used=tokens_used,
                model=self._model,
                provider=self.name,
                finish_reason=finish_reason,
                request_id=request.request_id or response.id,
                latency_ms=latency_ms,
                cached=False,
                metadata={
                    'prompt_tokens': prompt_tokens,
                    'completion_tokens': completion_tokens,
                    'feature': request.feature.value,
                    'cost_usd': cost,
                    'circuit_state': self._circuit_breaker.state.value
                }
            )
            
        except Exception as e:
            self._record_error(e)
            raise self._map_exception(e)
    
    def _fallback_complete(self, request: AICompletionRequest) -> AICompletionResponse:
        """Fallback provider ile completion."""
        if not self._fallback_provider:
            raise AIProviderException(
                "No fallback provider available",
                self.name,
                retryable=False
            )
        
        response = self._fallback_provider.complete(request)
        
        # Metadata'ya fallback bilgisi ekle
        response.metadata['fallback'] = True
        response.metadata['original_provider'] = self.name
        response.metadata['circuit_state'] = self._circuit_breaker.state.value
        
        return response
    
    # =========================================================================
    # STREAMING
    # =========================================================================
    
    def stream(self, request: AICompletionRequest) -> Generator[str, None, None]:
        """GPT-4.1 streaming completion."""
        # Circuit breaker kontrolü
        if not self._circuit_breaker.can_execute() or not self._client:
            # Fallback streaming
            if self._fallback_provider:
                yield from self._fallback_provider.stream(request)
                return
            raise AIProviderException(
                "Provider unavailable and no fallback",
                self.name,
                retryable=False
            )
        
        try:
            # Mesajları OpenAI formatına çevir
            messages = [
                {"role": msg.role, "content": msg.content}
                for msg in request.messages
            ]
            
            # Streaming API çağrısı
            stream = self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                max_tokens=request.max_tokens or self._max_tokens,
                temperature=request.temperature or self._temperature,
                stream=True
            )
            
            total_content = ""
            
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    total_content += content
                    yield content
            
            # İstatistik güncelle
            tokens = self.count_tokens(total_content)
            self._record_request(tokens)
            self._circuit_breaker.record_success()
            
        except Exception as e:
            self._circuit_breaker.record_failure()
            self._record_error(e)
            raise self._map_exception(e)
    
    # =========================================================================
    # HEALTH CHECK
    # =========================================================================
    
    def health_check(self) -> ProviderHealthStatus:
        """Provider sağlık kontrolü."""
        # Circuit breaker durumu
        cb_state = self._circuit_breaker.state
        
        if not self._client:
            status = ProviderStatus.UNAVAILABLE
            error = "API key not configured"
            
            if self._fallback_provider:
                status = ProviderStatus.DEGRADED
                error = "Using fallback provider (Mock)"
            
            return ProviderHealthStatus(
                status=status,
                provider=self.name,
                error=error,
                details={
                    'circuit_breaker': self._circuit_breaker.get_stats(),
                    'fallback_available': self._fallback_provider is not None
                }
            )
        
        # Circuit breaker açıksa test yapma
        if cb_state == CircuitState.OPEN:
            return ProviderHealthStatus(
                status=ProviderStatus.UNAVAILABLE,
                provider=self.name,
                error="Circuit breaker OPEN",
                details={
                    'circuit_breaker': self._circuit_breaker.get_stats()
                }
            )
        
        start_time = time.time()
        
        try:
            # Minimal test çağrısı
            response = self._client.chat.completions.create(
                model=self._model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            return ProviderHealthStatus(
                status=ProviderStatus.HEALTHY,
                provider=self.name,
                latency_ms=latency_ms,
                details={
                    'model': self._model,
                    'response_id': response.id,
                    'circuit_breaker': self._circuit_breaker.get_stats(),
                    'total_cost_usd': self._total_cost
                }
            )
            
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            
            return ProviderHealthStatus(
                status=ProviderStatus.DEGRADED if self._fallback_provider else ProviderStatus.UNAVAILABLE,
                provider=self.name,
                latency_ms=latency_ms,
                error=str(e),
                details={
                    'circuit_breaker': self._circuit_breaker.get_stats(),
                    'fallback_available': self._fallback_provider is not None
                }
            )
    
    # =========================================================================
    # TOKEN COUNTING
    # =========================================================================
    
    def count_tokens(self, text: str) -> int:
        """Token sayısını hesapla (tiktoken ile)."""
        try:
            import tiktoken
            
            # Model için encoder al
            try:
                encoding = tiktoken.encoding_for_model(self._model)
            except KeyError:
                # GPT-4.1 veya bilinmeyen model için varsayılan encoding
                encoding = tiktoken.get_encoding("cl100k_base")
            
            return len(encoding.encode(text))
            
        except ImportError:
            # tiktoken yoksa yaklaşık hesapla
            return len(text) // 4 + 1
    
    # =========================================================================
    # COST TRACKING
    # =========================================================================
    
    def _calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """Token maliyetini hesapla."""
        pricing = MODEL_PRICING.get(self._model, MODEL_PRICING.get("gpt-4o-mini"))
        
        input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
        output_cost = (completion_tokens / 1_000_000) * pricing["output"]
        
        return input_cost + output_cost
    
    def _record_cost(self, cost: float) -> None:
        """Maliyeti kaydet."""
        with self._cost_lock:
            self._total_cost += cost
    
    def get_cost_summary(self) -> Dict[str, Any]:
        """Maliyet özetini al."""
        with self._cost_lock:
            return {
                'total_cost_usd': round(self._total_cost, 6),
                'model': self._model,
                'pricing': MODEL_PRICING.get(self._model),
                'request_count': self._stats.get('request_count', 0),
                'total_tokens': self._stats.get('total_tokens', 0)
            }
    
    # =========================================================================
    # ERROR MAPPING
    # =========================================================================
    
    def _map_exception(self, error: Exception) -> AIProviderException:
        """OpenAI hatalarını provider hatalarına map et."""
        error_str = str(error).lower()
        
        # Rate limit hatası
        if 'rate limit' in error_str or 'rate_limit' in error_str or '429' in error_str:
            retry_after = None
            if hasattr(error, 'response') and error.response:
                retry_after = error.response.headers.get('Retry-After')
                if retry_after:
                    retry_after = int(retry_after)
            return AIProviderRateLimitError(self.name, retry_after)
        
        # Authentication hatası
        if 'api key' in error_str or 'authentication' in error_str or 'unauthorized' in error_str or '401' in error_str:
            return AIProviderAuthError(self.name)
        
        # Kota hatası
        if 'quota' in error_str or 'billing' in error_str or 'insufficient' in error_str:
            return AIProviderQuotaError(self.name)
        
        # İçerik filtresi hatası
        if 'content filter' in error_str or 'content_filter' in error_str or 'policy' in error_str:
            return AIContentFilterError(self.name, "openai_content_filter")
        
        # Model bulunamadı
        if 'model' in error_str and ('not found' in error_str or 'does not exist' in error_str):
            return AIProviderException(
                f"Model '{self._model}' not found. Check model availability.",
                self.name,
                retryable=False
            )
        
        # Bağlantı hatası
        if 'connection' in error_str or 'timeout' in error_str or 'network' in error_str:
            return AIProviderConnectionError(self.name, str(error))
        
        # Genel hata
        return AIProviderException(str(error), self.name, retryable=True)
    
    # =========================================================================
    # UTILITY METHODS
    # =========================================================================
    
    def reset_circuit_breaker(self) -> None:
        """Circuit breaker'ı manuel sıfırla."""
        self._circuit_breaker.reset()
        logger.info("Circuit breaker manually reset")
    
    def get_stats(self) -> Dict[str, Any]:
        """Detaylı istatistikleri al."""
        base_stats = super().get_stats() if hasattr(super(), 'get_stats') else {}
        
        return {
            **base_stats,
            **self._stats,
            'provider': self.name,
            'model': self._model,
            'circuit_breaker': self._circuit_breaker.get_stats(),
            'cost': self.get_cost_summary(),
            'fallback_available': self._fallback_provider is not None,
            'is_production_ready': self.is_production_ready
        }
