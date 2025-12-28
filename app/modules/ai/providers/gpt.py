"""
OpenAI GPT AI Provider Implementation.

Production ortamında kullanılır.
OpenAI API ile gerçek AI çağrıları yapar.

KULLANIM:
=========
    from app.modules.ai.providers import get_ai_provider
    
    provider = get_ai_provider('openai')
    response = provider.complete(request)

GEREKLİ CONFIG:
===============
    OPENAI_API_KEY = "sk-..."
    OPENAI_MODEL = "gpt-4o-mini"  # veya "gpt-4o", "gpt-3.5-turbo"
    OPENAI_MAX_TOKENS = 1000
    OPENAI_TEMPERATURE = 0.7
    OPENAI_TIMEOUT = 30
    OPENAI_MAX_RETRIES = 3

ÖZELLİKLER:
===========
- Retry mekanizması (exponential backoff)
- Streaming desteği
- Token sayımı (tiktoken)
- Rate limit handling
- Detaylı hata yönetimi
"""

import time
import logging
from typing import Dict, Any, Optional, Generator
from datetime import datetime

from .abstraction import (
    BaseAIProvider,
    AICompletionRequest,
    AICompletionResponse,
    ProviderHealthStatus,
    ProviderStatus,
    AIProviderConnectionError,
    AIProviderRateLimitError,
    AIProviderAuthError,
    AIProviderQuotaError,
    AIContentFilterError,
    AIProviderException,
    register_provider
)

logger = logging.getLogger(__name__)


@register_provider('openai')
class GPTAIProvider(BaseAIProvider):
    """
    OpenAI GPT AI Provider.
    
    Production ortamı için tasarlanmıştır.
    OpenAI API kullanarak gerçek AI yanıtları üretir.
    
    Desteklenen Modeller:
    - gpt-4o (en gelişmiş)
    - gpt-4o-mini (hızlı ve ekonomik)
    - gpt-4-turbo
    - gpt-3.5-turbo
    """
    
    # =========================================================================
    # ABSTRACT PROPERTY IMPLEMENTATIONS
    # =========================================================================
    
    @property
    def name(self) -> str:
        return "openai"
    
    @property
    def display_name(self) -> str:
        return f"OpenAI {self._model}"
    
    @property
    def is_production_ready(self) -> bool:
        return True
    
    # =========================================================================
    # INITIALIZATION
    # =========================================================================
    
    def _initialize(self) -> None:
        """OpenAI client'ı initialize et."""
        self._api_key = self._config.get('api_key')
        self._model = self._config.get('model', 'gpt-4o-mini')
        self._max_tokens = self._config.get('max_tokens', 1000)
        self._temperature = self._config.get('temperature', 0.7)
        self._timeout = self._config.get('timeout', 30)
        self._max_retries = self._config.get('max_retries', 3)
        
        # OpenAI client
        self._client = None
        
        # API key kontrolü
        if not self._api_key:
            logger.warning("OpenAI API key not configured. Provider will fail on requests.")
            return
        
        try:
            # OpenAI SDK'yı lazy import et
            from openai import OpenAI
            
            self._client = OpenAI(
                api_key=self._api_key,
                timeout=self._timeout,
                max_retries=self._max_retries
            )
            
            logger.info(f"OpenAI client initialized with model: {self._model}")
            
        except ImportError:
            logger.error("OpenAI SDK not installed. Run: pip install openai")
            raise
        except Exception as e:
            logger.error(f"OpenAI client initialization failed: {e}")
            raise
    
    # =========================================================================
    # COMPLETION
    # =========================================================================
    
    def complete(self, request: AICompletionRequest) -> AICompletionResponse:
        """OpenAI completion isteği."""
        if not self._client:
            raise AIProviderAuthError(self.name)
        
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
            tokens_used = response.usage.total_tokens if response.usage else self.count_tokens(content)
            
            # İstatistik güncelle
            self._record_request(tokens_used)
            
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
                    'prompt_tokens': response.usage.prompt_tokens if response.usage else 0,
                    'completion_tokens': response.usage.completion_tokens if response.usage else 0,
                    'feature': request.feature.value
                }
            )
            
        except Exception as e:
            self._record_error(e)
            raise self._map_exception(e)
    
    # =========================================================================
    # STREAMING
    # =========================================================================
    
    def stream(self, request: AICompletionRequest) -> Generator[str, None, None]:
        """OpenAI streaming completion."""
        if not self._client:
            raise AIProviderAuthError(self.name)
        
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
            
            # İstatistik güncelle (yaklaşık token)
            tokens = self.count_tokens(total_content)
            self._record_request(tokens)
            
        except Exception as e:
            self._record_error(e)
            raise self._map_exception(e)
    
    # =========================================================================
    # HEALTH CHECK
    # =========================================================================
    
    def health_check(self) -> ProviderHealthStatus:
        """OpenAI API sağlık kontrolü."""
        if not self._client:
            return ProviderHealthStatus(
                status=ProviderStatus.UNAVAILABLE,
                provider=self.name,
                error="API key not configured"
            )
        
        start_time = time.time()
        
        try:
            # Basit bir test çağrısı
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
                    'response_id': response.id
                }
            )
            
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Hata türüne göre status belirle
            mapped_error = self._map_exception(e)
            
            if isinstance(mapped_error, AIProviderRateLimitError):
                status = ProviderStatus.DEGRADED
            else:
                status = ProviderStatus.UNAVAILABLE
            
            return ProviderHealthStatus(
                status=status,
                provider=self.name,
                latency_ms=latency_ms,
                error=str(e)
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
                # Bilinmeyen model için varsayılan encoding
                encoding = tiktoken.get_encoding("cl100k_base")
            
            return len(encoding.encode(text))
            
        except ImportError:
            # tiktoken yoksa yaklaşık hesapla
            return len(text) // 4 + 1
    
    # =========================================================================
    # ERROR MAPPING
    # =========================================================================
    
    def _map_exception(self, error: Exception) -> AIProviderException:
        """OpenAI hatalarını provider hatalarına map et."""
        error_str = str(error).lower()
        
        # Rate limit hatası
        if 'rate limit' in error_str or 'rate_limit' in error_str:
            # Retry-After header'ını bulmaya çalış
            retry_after = None
            if hasattr(error, 'response') and error.response:
                retry_after = error.response.headers.get('Retry-After')
                if retry_after:
                    retry_after = int(retry_after)
            return AIProviderRateLimitError(self.name, retry_after)
        
        # Authentication hatası
        if 'api key' in error_str or 'authentication' in error_str or 'unauthorized' in error_str:
            return AIProviderAuthError(self.name)
        
        # Kota hatası
        if 'quota' in error_str or 'billing' in error_str or 'insufficient' in error_str:
            return AIProviderQuotaError(self.name)
        
        # İçerik filtresi hatası
        if 'content filter' in error_str or 'content_filter' in error_str or 'policy' in error_str:
            return AIContentFilterError(self.name, "openai_content_filter")
        
        # Bağlantı hatası
        if 'connection' in error_str or 'timeout' in error_str or 'network' in error_str:
            return AIProviderConnectionError(self.name, str(error))
        
        # Genel hata
        return AIProviderException(str(error), self.name, retryable=True)
