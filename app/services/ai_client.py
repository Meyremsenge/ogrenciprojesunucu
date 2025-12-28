"""
AI Production Client - Timeout, Retry ve Circuit Breaker ile.

Bu modül production-ready AI API client'ı sağlar:
- Exponential backoff ile retry
- Circuit breaker pattern
- Timeout yönetimi
- Cost tracking
- Error handling
"""

import time
import random
import logging
import threading
from typing import Dict, Any, Optional, Callable, Generator
from datetime import datetime, timedelta
from functools import wraps
from dataclasses import dataclass, field
from enum import Enum

import httpx
from flask import current_app

from config.ai_production import (
    AIProductionConfig,
    TimeoutConfig,
    RetryConfig,
    CircuitBreakerConfig,
    CircuitState,
    AIProvider,
    get_ai_production_config
)


logger = logging.getLogger(__name__)


# =============================================================================
# CIRCUIT BREAKER
# =============================================================================

class CircuitBreaker:
    """
    Circuit Breaker Pattern implementasyonu.
    
    Durumlar:
    - CLOSED: Normal çalışma
    - OPEN: Devre açık, fail-fast
    - HALF_OPEN: Test aşaması
    """
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[datetime] = None
        self._half_open_calls = 0
        self._lock = threading.Lock()
    
    @property
    def state(self) -> CircuitState:
        with self._lock:
            if self._state == CircuitState.OPEN:
                # Timeout geçti mi kontrol et
                if self._last_failure_time:
                    elapsed = (datetime.utcnow() - self._last_failure_time).total_seconds()
                    if elapsed >= self.config.timeout:
                        self._state = CircuitState.HALF_OPEN
                        self._half_open_calls = 0
                        logger.info("Circuit breaker: OPEN -> HALF_OPEN")
            return self._state
    
    def record_success(self):
        """Başarılı çağrı kaydet."""
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.config.success_threshold:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0
                    logger.info("Circuit breaker: HALF_OPEN -> CLOSED")
            elif self._state == CircuitState.CLOSED:
                # Reset failure count on success
                self._failure_count = max(0, self._failure_count - 1)
    
    def record_failure(self):
        """Başarısız çağrı kaydet."""
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = datetime.utcnow()
            
            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                logger.warning("Circuit breaker: HALF_OPEN -> OPEN (failure during test)")
            elif self._state == CircuitState.CLOSED:
                if self._failure_count >= self.config.failure_threshold:
                    self._state = CircuitState.OPEN
                    logger.warning(f"Circuit breaker: CLOSED -> OPEN (failures: {self._failure_count})")
    
    def can_execute(self) -> bool:
        """İstek yapılabilir mi?"""
        state = self.state
        
        if state == CircuitState.CLOSED:
            return True
        elif state == CircuitState.OPEN:
            return False
        elif state == CircuitState.HALF_OPEN:
            with self._lock:
                if self._half_open_calls < self.config.half_open_max_calls:
                    self._half_open_calls += 1
                    return True
                return False
        
        return False
    
    def reset(self):
        """Circuit breaker'ı sıfırla."""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._half_open_calls = 0
            self._last_failure_time = None
            logger.info("Circuit breaker: RESET")


# =============================================================================
# RETRY DECORATOR
# =============================================================================

def with_retry(retry_config: RetryConfig):
    """
    Exponential backoff ile retry decorator.
    
    Usage:
        @with_retry(RetryConfig())
        def call_api():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(retry_config.max_retries + 1):
                try:
                    return func(*args, **kwargs)
                
                except httpx.HTTPStatusError as e:
                    status_code = e.response.status_code
                    
                    # Retry edilmeyecek kodlar
                    if status_code not in retry_config.retry_status_codes:
                        raise
                    
                    last_exception = e
                    
                    if attempt < retry_config.max_retries:
                        delay = retry_config.get_delay(attempt)
                        logger.warning(
                            f"Retry {attempt + 1}/{retry_config.max_retries} "
                            f"after {delay:.2f}s (HTTP {status_code})"
                        )
                        time.sleep(delay)
                
                except httpx.TimeoutException as e:
                    last_exception = e
                    
                    if attempt < retry_config.max_retries:
                        delay = retry_config.get_delay(attempt)
                        logger.warning(
                            f"Retry {attempt + 1}/{retry_config.max_retries} "
                            f"after {delay:.2f}s (Timeout)"
                        )
                        time.sleep(delay)
                
                except Exception as e:
                    # Non-retryable error kontrolü
                    error_type = getattr(e, 'code', None) or str(type(e).__name__)
                    if error_type in retry_config.non_retryable_errors:
                        raise
                    
                    last_exception = e
                    
                    if attempt < retry_config.max_retries:
                        delay = retry_config.get_delay(attempt)
                        logger.warning(
                            f"Retry {attempt + 1}/{retry_config.max_retries} "
                            f"after {delay:.2f}s ({type(e).__name__})"
                        )
                        time.sleep(delay)
            
            # Tüm retry'lar başarısız
            raise last_exception
        
        return wrapper
    return decorator


# =============================================================================
# AI API CLIENT
# =============================================================================

@dataclass
class AIResponse:
    """AI API yanıt modeli."""
    success: bool
    content: Optional[str] = None
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    model: str = ''
    latency_ms: int = 0
    cost_usd: float = 0.0
    error: Optional[str] = None
    error_code: Optional[str] = None
    is_mock: bool = False


class AIProductionClient:
    """
    Production-ready AI API Client.
    
    Features:
    - Timeout management
    - Retry with exponential backoff
    - Circuit breaker
    - Cost tracking
    - Mock fallback
    """
    
    def __init__(self, config: Optional[AIProductionConfig] = None):
        self.config = config or get_ai_production_config()
        self._circuit_breaker = CircuitBreaker(self.config.circuit_breaker)
        self._client: Optional[httpx.Client] = None
        self._async_client: Optional[httpx.AsyncClient] = None
        
        # Cost tracking
        self._daily_cost = 0.0
        self._monthly_cost = 0.0
        self._cost_reset_date = datetime.utcnow().date()
        self._cost_lock = threading.Lock()
    
    def _get_client(self) -> httpx.Client:
        """HTTP client lazy initialization."""
        if self._client is None:
            timeout = httpx.Timeout(
                connect=self.config.timeout.connect_timeout,
                read=self.config.timeout.read_timeout,
                write=10.0,
                pool=5.0
            )
            
            self._client = httpx.Client(
                timeout=timeout,
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
            )
        
        return self._client
    
    def _check_circuit_breaker(self) -> bool:
        """Circuit breaker kontrolü."""
        if not self._circuit_breaker.can_execute():
            logger.warning("Circuit breaker OPEN - request blocked")
            return False
        return True
    
    def _check_budget(self, estimated_cost: float = 0.01) -> bool:
        """Bütçe kontrolü."""
        with self._cost_lock:
            # Gün değişti mi kontrol et
            today = datetime.utcnow().date()
            if today != self._cost_reset_date:
                self._daily_cost = 0.0
                self._cost_reset_date = today
                # Ay başıysa aylık da sıfırla
                if today.day == 1:
                    self._monthly_cost = 0.0
            
            # Günlük limit kontrolü
            if self._daily_cost + estimated_cost > self.config.cost.daily_budget_usd:
                logger.error(f"Daily budget exceeded: ${self._daily_cost:.2f} / ${self.config.cost.daily_budget_usd}")
                return False
            
            # Aylık limit kontrolü
            if self._monthly_cost + estimated_cost > self.config.cost.monthly_budget_usd:
                logger.error(f"Monthly budget exceeded: ${self._monthly_cost:.2f} / ${self.config.cost.monthly_budget_usd}")
                return False
            
            return True
    
    def _track_cost(self, cost: float):
        """Maliyet takibi."""
        with self._cost_lock:
            self._daily_cost += cost
            self._monthly_cost += cost
            
            # Alert kontrolü
            daily_percent = (self._daily_cost / self.config.cost.daily_budget_usd) * 100
            if daily_percent >= self.config.cost.alert_threshold_percent:
                logger.warning(f"Daily budget alert: {daily_percent:.1f}% used (${self._daily_cost:.2f})")
    
    def _call_openai(
        self,
        messages: list,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stream: bool = False
    ) -> AIResponse:
        """OpenAI API çağrısı."""
        start_time = time.time()
        
        headers = {
            'Authorization': f'Bearer {self.config.api_key}',
            'Content-Type': 'application/json'
        }
        
        if self.config.organization_id:
            headers['OpenAI-Organization'] = self.config.organization_id
        
        payload = {
            'model': self.config.model,
            'messages': messages,
            'max_tokens': max_tokens or self.config.max_tokens,
            'temperature': temperature if temperature is not None else self.config.temperature,
            'stream': stream
        }
        
        base_url = self.config.api_base_url or 'https://api.openai.com/v1'
        url = f'{base_url}/chat/completions'
        
        try:
            client = self._get_client()
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            
            # Token ve maliyet hesapla
            usage = data.get('usage', {})
            input_tokens = usage.get('prompt_tokens', 0)
            output_tokens = usage.get('completion_tokens', 0)
            total_tokens = usage.get('total_tokens', 0)
            
            cost = self.config.cost.calculate_cost(
                self.config.model, input_tokens, output_tokens
            )
            
            self._track_cost(cost)
            self._circuit_breaker.record_success()
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            content = data['choices'][0]['message']['content']
            
            return AIResponse(
                success=True,
                content=content,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                model=self.config.model,
                latency_ms=latency_ms,
                cost_usd=cost,
                is_mock=False
            )
        
        except httpx.HTTPStatusError as e:
            self._circuit_breaker.record_failure()
            
            error_body = e.response.json() if e.response.content else {}
            error_message = error_body.get('error', {}).get('message', str(e))
            error_code = error_body.get('error', {}).get('code', f'http_{e.response.status_code}')
            
            logger.error(f"OpenAI API error: {error_code} - {error_message}")
            
            return AIResponse(
                success=False,
                error=error_message,
                error_code=error_code,
                latency_ms=int((time.time() - start_time) * 1000)
            )
        
        except httpx.TimeoutException as e:
            self._circuit_breaker.record_failure()
            logger.error(f"OpenAI API timeout: {e}")
            
            return AIResponse(
                success=False,
                error='Request timeout',
                error_code='timeout',
                latency_ms=int((time.time() - start_time) * 1000)
            )
        
        except Exception as e:
            self._circuit_breaker.record_failure()
            logger.error(f"OpenAI API error: {e}")
            
            return AIResponse(
                success=False,
                error=str(e),
                error_code='unknown_error',
                latency_ms=int((time.time() - start_time) * 1000)
            )
    
    def _call_mock(
        self,
        messages: list,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """Mock AI yanıtı (development/fallback)."""
        import random
        
        start_time = time.time()
        
        # Simüle edilmiş gecikme
        delay = random.uniform(0.3, 1.0)
        time.sleep(delay)
        
        # Mock yanıt
        user_message = messages[-1]['content'] if messages else 'Merhaba'
        
        mock_responses = [
            f"Bu konuda size yardımcı olabilirim. '{user_message[:50]}...' hakkında düşünelim.",
            "Güzel bir soru! Adım adım inceleyelim.",
            "Bu problemi çözmek için önce temel kavramları gözden geçirelim.",
            "Harika bir başlangıç noktası. Şimdi detaylara bakalım."
        ]
        
        content = random.choice(mock_responses)
        
        # Simüle edilmiş token kullanımı
        input_tokens = len(user_message.split()) * 2
        output_tokens = len(content.split()) * 2
        
        return AIResponse(
            success=True,
            content=content,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            model='mock-model',
            latency_ms=int((time.time() - start_time) * 1000),
            cost_usd=0.0,
            is_mock=True
        )
    
    @with_retry(RetryConfig.from_env())
    def chat(
        self,
        messages: list,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        fallback_to_mock: bool = True
    ) -> AIResponse:
        """
        AI chat completion.
        
        Args:
            messages: OpenAI format mesaj listesi
            max_tokens: Maksimum token
            temperature: Model temperature
            fallback_to_mock: Hata durumunda mock'a düş
        """
        # Circuit breaker kontrolü
        if not self._check_circuit_breaker():
            if fallback_to_mock:
                logger.info("Falling back to mock due to circuit breaker")
                return self._call_mock(messages, max_tokens)
            
            return AIResponse(
                success=False,
                error='Service temporarily unavailable (circuit breaker open)',
                error_code='circuit_breaker_open'
            )
        
        # Bütçe kontrolü
        if not self._check_budget():
            if fallback_to_mock:
                logger.info("Falling back to mock due to budget limit")
                return self._call_mock(messages, max_tokens)
            
            return AIResponse(
                success=False,
                error='AI budget limit exceeded',
                error_code='budget_exceeded'
            )
        
        # Provider'a göre çağır
        if self.config.provider == AIProvider.MOCK:
            return self._call_mock(messages, max_tokens)
        
        elif self.config.provider in [AIProvider.OPENAI, AIProvider.AZURE_OPENAI]:
            response = self._call_openai(messages, max_tokens, temperature)
            
            # Başarısız ve fallback aktifse mock'a düş
            if not response.success and fallback_to_mock:
                logger.info(f"Falling back to mock due to API error: {response.error_code}")
                return self._call_mock(messages, max_tokens)
            
            return response
        
        else:
            # Bilinmeyen provider - mock kullan
            logger.warning(f"Unknown provider: {self.config.provider}, using mock")
            return self._call_mock(messages, max_tokens)
    
    def stream_chat(
        self,
        messages: list,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Generator[str, None, None]:
        """
        Streaming chat completion.
        
        Yields:
            Yanıt parçaları (chunks)
        """
        if not self._check_circuit_breaker():
            yield "[Error: Circuit breaker open]"
            return
        
        if not self._check_budget():
            yield "[Error: Budget exceeded]"
            return
        
        if self.config.provider == AIProvider.MOCK:
            # Mock streaming
            response = self._call_mock(messages, max_tokens)
            for word in response.content.split():
                yield word + ' '
                time.sleep(0.05)
            return
        
        # TODO: Real streaming implementation
        # Şimdilik non-streaming fallback
        response = self.chat(messages, max_tokens, temperature, fallback_to_mock=True)
        if response.success:
            yield response.content
        else:
            yield f"[Error: {response.error}]"
    
    def get_status(self) -> Dict[str, Any]:
        """Client durumu."""
        return {
            'provider': self.config.provider.value,
            'model': self.config.model,
            'circuit_breaker_state': self._circuit_breaker.state.value,
            'daily_cost_usd': round(self._daily_cost, 4),
            'monthly_cost_usd': round(self._monthly_cost, 4),
            'daily_budget_usd': self.config.cost.daily_budget_usd,
            'monthly_budget_usd': self.config.cost.monthly_budget_usd,
            'is_mock_mode': self.config.is_mock_mode(),
            'is_production_ready': self.config.is_production_ready()
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Health check - basit bir API testi."""
        if self.config.is_mock_mode():
            return {
                'healthy': True,
                'provider': 'mock',
                'latency_ms': 0
            }
        
        try:
            response = self.chat(
                messages=[{'role': 'user', 'content': 'ping'}],
                max_tokens=5,
                fallback_to_mock=False
            )
            
            return {
                'healthy': response.success,
                'provider': self.config.provider.value,
                'model': self.config.model,
                'latency_ms': response.latency_ms,
                'error': response.error
            }
        
        except Exception as e:
            return {
                'healthy': False,
                'provider': self.config.provider.value,
                'error': str(e)
            }
    
    def close(self):
        """Client'ı kapat."""
        if self._client:
            self._client.close()
            self._client = None


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_client_instance: Optional[AIProductionClient] = None
_client_lock = threading.Lock()


def get_ai_client() -> AIProductionClient:
    """Singleton AI client."""
    global _client_instance
    
    if _client_instance is None:
        with _client_lock:
            if _client_instance is None:
                _client_instance = AIProductionClient()
    
    return _client_instance


def reset_ai_client():
    """AI client'ı sıfırla (test/reload için)."""
    global _client_instance
    
    with _client_lock:
        if _client_instance:
            _client_instance.close()
        _client_instance = None
