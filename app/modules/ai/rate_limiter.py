"""
AI Rate Limiter.

AI API çağrıları için özelleştirilmiş rate limiting.
Token bazlı, kullanıcı bazlı ve global limitleri yönetir.

ÖZELLİKLER:
===========
- RPM (Requests per minute) limiting
- TPM (Tokens per minute) limiting
- Daily request limiting
- User-based quotas
- Cost-based limiting
- Graceful degradation

KULLANIM:
=========
    from app.modules.ai.rate_limiter import ai_rate_limiter
    
    # İstek öncesi kontrol
    can_proceed, reason = ai_rate_limiter.check_limit(user_id, estimated_tokens=500)
    if not can_proceed:
        return error_response(reason, 429)
    
    # İstek sonrası kayıt
    ai_rate_limiter.record_usage(user_id, tokens_used=450, cost_usd=0.001)
"""

import time
import threading
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict
from enum import Enum

logger = logging.getLogger(__name__)


# =============================================================================
# CONSTANTS
# =============================================================================

class LimitType(str, Enum):
    """Limit türleri."""
    RPM = "requests_per_minute"
    TPM = "tokens_per_minute"
    RPD = "requests_per_day"
    COST_DAILY = "cost_per_day"
    COST_REQUEST = "cost_per_request"


@dataclass
class RateLimitConfig:
    """Rate limit konfigürasyonu."""
    # Request limits
    rpm_limit: int = 60              # Requests per minute (global)
    rpm_per_user: int = 10           # Requests per minute (per user)
    rpd_limit: int = 10000           # Requests per day (global)
    rpd_per_user: int = 100          # Requests per day (per user)
    
    # Token limits
    tpm_limit: int = 100000          # Tokens per minute (global)
    tpm_per_user: int = 10000        # Tokens per minute (per user)
    tpd_limit: int = 1000000         # Tokens per day (global)
    
    # Cost limits (USD)
    max_cost_per_request: float = 0.10
    max_cost_per_user_daily: float = 1.0
    max_cost_daily: float = 100.0
    
    # Burst handling
    burst_multiplier: float = 1.5    # Kısa süreli burst izni
    burst_window: int = 10           # Burst penceresi (saniye)
    
    # Degradation
    soft_limit_percent: float = 0.8  # %80'de uyarı
    hard_limit_percent: float = 1.0  # %100'de engel


@dataclass
class UsageRecord:
    """Kullanım kaydı."""
    request_count: int = 0
    token_count: int = 0
    cost_usd: float = 0.0
    first_request_at: Optional[datetime] = None
    last_request_at: Optional[datetime] = None
    
    def reset(self):
        """Kaydı sıfırla."""
        self.request_count = 0
        self.token_count = 0
        self.cost_usd = 0.0
        self.first_request_at = None
        self.last_request_at = None


@dataclass
class LimitCheckResult:
    """Limit kontrol sonucu."""
    allowed: bool
    limit_type: Optional[LimitType] = None
    current_usage: int = 0
    limit_value: int = 0
    retry_after_seconds: int = 0
    message: str = ""
    is_warning: bool = False  # Soft limit aşıldı


# =============================================================================
# SLIDING WINDOW COUNTER
# =============================================================================

class SlidingWindowCounter:
    """
    Sliding window rate limiter.
    
    Dakikalık pencereler kullanarak rate limiting yapar.
    """
    
    def __init__(self, window_size_seconds: int = 60):
        self.window_size = window_size_seconds
        self._counters: Dict[str, Dict[int, int]] = defaultdict(dict)
        self._lock = threading.RLock()
    
    def _get_window_key(self) -> int:
        """Mevcut zaman penceresi key'i."""
        return int(time.time() // self.window_size)
    
    def increment(self, key: str, amount: int = 1) -> int:
        """Counter'ı artır ve mevcut değeri döndür."""
        with self._lock:
            window = self._get_window_key()
            
            if window not in self._counters[key]:
                # Eski pencereleri temizle
                self._cleanup(key)
                self._counters[key][window] = 0
            
            self._counters[key][window] += amount
            return self.get_count(key)
    
    def get_count(self, key: str) -> int:
        """Mevcut penceredeki toplam sayı."""
        with self._lock:
            current_window = self._get_window_key()
            previous_window = current_window - 1
            
            current_count = self._counters[key].get(current_window, 0)
            previous_count = self._counters[key].get(previous_window, 0)
            
            # Önceki pencerenin kalan kısmını hesapla
            elapsed = time.time() % self.window_size
            weight = 1 - (elapsed / self.window_size)
            
            return current_count + int(previous_count * weight)
    
    def _cleanup(self, key: str) -> None:
        """Eski pencereleri temizle."""
        current_window = self._get_window_key()
        cutoff = current_window - 2  # Son 2 pencereyi tut
        
        windows_to_remove = [
            w for w in self._counters[key].keys()
            if w < cutoff
        ]
        
        for window in windows_to_remove:
            del self._counters[key][window]
    
    def reset(self, key: str) -> None:
        """Belirli key'i sıfırla."""
        with self._lock:
            if key in self._counters:
                self._counters[key].clear()


# =============================================================================
# DAILY COUNTER
# =============================================================================

class DailyCounter:
    """
    Günlük sayaç.
    
    Günlük limitleri takip eder.
    """
    
    def __init__(self):
        self._counters: Dict[str, UsageRecord] = defaultdict(UsageRecord)
        self._lock = threading.RLock()
        self._last_reset_date: Optional[datetime] = None
    
    def _check_and_reset(self) -> None:
        """Gün değiştiyse sıfırla."""
        today = datetime.utcnow().date()
        
        if self._last_reset_date != today:
            with self._lock:
                if self._last_reset_date != today:
                    # Tüm sayaçları sıfırla
                    for record in self._counters.values():
                        record.reset()
                    self._last_reset_date = today
                    logger.info("Daily counters reset")
    
    def record(
        self,
        key: str,
        requests: int = 1,
        tokens: int = 0,
        cost: float = 0.0
    ) -> UsageRecord:
        """Kullanım kaydet."""
        self._check_and_reset()
        
        with self._lock:
            record = self._counters[key]
            now = datetime.utcnow()
            
            if record.first_request_at is None:
                record.first_request_at = now
            
            record.request_count += requests
            record.token_count += tokens
            record.cost_usd += cost
            record.last_request_at = now
            
            return record
    
    def get_usage(self, key: str) -> UsageRecord:
        """Kullanım bilgisini al."""
        self._check_and_reset()
        
        with self._lock:
            return self._counters.get(key, UsageRecord())
    
    def get_all_usage(self) -> Dict[str, UsageRecord]:
        """Tüm kullanım bilgilerini al."""
        self._check_and_reset()
        
        with self._lock:
            return dict(self._counters)


# =============================================================================
# AI RATE LIMITER
# =============================================================================

class AIRateLimiter:
    """
    AI API Rate Limiter.
    
    Tüm AI isteklerinin rate limiting'ini yönetir.
    """
    
    def __init__(self, config: RateLimitConfig = None):
        self.config = config or RateLimitConfig()
        
        # Minute-based counters
        self._rpm_counter = SlidingWindowCounter(window_size_seconds=60)
        self._tpm_counter = SlidingWindowCounter(window_size_seconds=60)
        
        # Daily counters
        self._daily_counter = DailyCounter()
        
        # User-specific tracking
        self._user_warnings: Dict[int, datetime] = {}
        
        self._lock = threading.RLock()
    
    # =========================================================================
    # LIMIT CHECK
    # =========================================================================
    
    def check_limit(
        self,
        user_id: int,
        estimated_tokens: int = 0,
        estimated_cost: float = 0.0
    ) -> Tuple[bool, Optional[str]]:
        """
        Rate limit kontrolü.
        
        Args:
            user_id: Kullanıcı ID
            estimated_tokens: Tahmini token kullanımı
            estimated_cost: Tahmini maliyet
        
        Returns:
            (allowed, error_message)
        """
        result = self.check_all_limits(user_id, estimated_tokens, estimated_cost)
        
        if not result.allowed:
            return False, result.message
        
        if result.is_warning:
            self._record_warning(user_id, result.message)
        
        return True, None
    
    def check_all_limits(
        self,
        user_id: int,
        estimated_tokens: int = 0,
        estimated_cost: float = 0.0
    ) -> LimitCheckResult:
        """Tüm limitleri kontrol et."""
        # Global RPM
        global_rpm = self._rpm_counter.get_count("global")
        if global_rpm >= self.config.rpm_limit:
            return LimitCheckResult(
                allowed=False,
                limit_type=LimitType.RPM,
                current_usage=global_rpm,
                limit_value=self.config.rpm_limit,
                retry_after_seconds=60,
                message="Rate limit aşıldı. Lütfen bir dakika bekleyin."
            )
        
        # User RPM
        user_rpm_key = f"user:{user_id}:rpm"
        user_rpm = self._rpm_counter.get_count(user_rpm_key)
        if user_rpm >= self.config.rpm_per_user:
            return LimitCheckResult(
                allowed=False,
                limit_type=LimitType.RPM,
                current_usage=user_rpm,
                limit_value=self.config.rpm_per_user,
                retry_after_seconds=60,
                message="Çok hızlı istek gönderiyorsunuz. Lütfen bekleyin."
            )
        
        # Global TPM
        if estimated_tokens > 0:
            global_tpm = self._tpm_counter.get_count("global_tokens")
            if global_tpm + estimated_tokens > self.config.tpm_limit:
                return LimitCheckResult(
                    allowed=False,
                    limit_type=LimitType.TPM,
                    current_usage=global_tpm,
                    limit_value=self.config.tpm_limit,
                    retry_after_seconds=60,
                    message="Token limiti aşıldı. Lütfen bekleyin."
                )
        
        # User TPM
        if estimated_tokens > 0:
            user_tpm_key = f"user:{user_id}:tpm"
            user_tpm = self._tpm_counter.get_count(user_tpm_key)
            if user_tpm + estimated_tokens > self.config.tpm_per_user:
                return LimitCheckResult(
                    allowed=False,
                    limit_type=LimitType.TPM,
                    current_usage=user_tpm,
                    limit_value=self.config.tpm_per_user,
                    retry_after_seconds=60,
                    message="Kişisel token limitiniz doldu. Lütfen bekleyin."
                )
        
        # Daily user requests
        user_daily = self._daily_counter.get_usage(f"user:{user_id}")
        if user_daily.request_count >= self.config.rpd_per_user:
            return LimitCheckResult(
                allowed=False,
                limit_type=LimitType.RPD,
                current_usage=user_daily.request_count,
                limit_value=self.config.rpd_per_user,
                retry_after_seconds=self._seconds_until_midnight(),
                message="Günlük istek limitiniz doldu. Yarın tekrar deneyin."
            )
        
        # Daily user cost
        if user_daily.cost_usd >= self.config.max_cost_per_user_daily:
            return LimitCheckResult(
                allowed=False,
                limit_type=LimitType.COST_DAILY,
                current_usage=int(user_daily.cost_usd * 100),
                limit_value=int(self.config.max_cost_per_user_daily * 100),
                retry_after_seconds=self._seconds_until_midnight(),
                message="Günlük kullanım limitiniz doldu."
            )
        
        # Per-request cost check
        if estimated_cost > self.config.max_cost_per_request:
            return LimitCheckResult(
                allowed=False,
                limit_type=LimitType.COST_REQUEST,
                current_usage=int(estimated_cost * 100),
                limit_value=int(self.config.max_cost_per_request * 100),
                message="Bu istek maliyet limitini aşıyor."
            )
        
        # Soft limit warning check
        usage_percent = user_daily.request_count / self.config.rpd_per_user
        if usage_percent >= self.config.soft_limit_percent:
            remaining = self.config.rpd_per_user - user_daily.request_count
            return LimitCheckResult(
                allowed=True,
                is_warning=True,
                current_usage=user_daily.request_count,
                limit_value=self.config.rpd_per_user,
                message=f"Dikkat: Günlük limitinizin %{int(usage_percent*100)}'ını kullandınız. {remaining} istek kaldı."
            )
        
        return LimitCheckResult(allowed=True)
    
    # =========================================================================
    # USAGE RECORDING
    # =========================================================================
    
    def record_usage(
        self,
        user_id: int,
        tokens_used: int = 0,
        cost_usd: float = 0.0
    ) -> None:
        """
        Kullanım kaydı.
        
        Her başarılı AI isteğinden sonra çağrılmalı.
        """
        # Global counters
        self._rpm_counter.increment("global")
        self._tpm_counter.increment("global_tokens", tokens_used)
        
        # User counters
        self._rpm_counter.increment(f"user:{user_id}:rpm")
        self._tpm_counter.increment(f"user:{user_id}:tpm", tokens_used)
        
        # Daily tracking
        self._daily_counter.record(
            f"user:{user_id}",
            requests=1,
            tokens=tokens_used,
            cost=cost_usd
        )
        
        # Global daily
        self._daily_counter.record(
            "global",
            requests=1,
            tokens=tokens_used,
            cost=cost_usd
        )
    
    # =========================================================================
    # STATISTICS
    # =========================================================================
    
    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """Kullanıcı istatistiklerini al."""
        daily = self._daily_counter.get_usage(f"user:{user_id}")
        rpm = self._rpm_counter.get_count(f"user:{user_id}:rpm")
        tpm = self._tpm_counter.get_count(f"user:{user_id}:tpm")
        
        return {
            'user_id': user_id,
            'current_minute': {
                'requests': rpm,
                'tokens': tpm,
                'rpm_limit': self.config.rpm_per_user,
                'tpm_limit': self.config.tpm_per_user,
            },
            'today': {
                'requests': daily.request_count,
                'tokens': daily.token_count,
                'cost_usd': round(daily.cost_usd, 4),
                'rpd_limit': self.config.rpd_per_user,
                'cost_limit': self.config.max_cost_per_user_daily,
                'first_request': daily.first_request_at.isoformat() if daily.first_request_at else None,
                'last_request': daily.last_request_at.isoformat() if daily.last_request_at else None,
            },
            'limits_remaining': {
                'requests_this_minute': max(0, self.config.rpm_per_user - rpm),
                'tokens_this_minute': max(0, self.config.tpm_per_user - tpm),
                'requests_today': max(0, self.config.rpd_per_user - daily.request_count),
                'cost_today': max(0, self.config.max_cost_per_user_daily - daily.cost_usd),
            }
        }
    
    def get_global_stats(self) -> Dict[str, Any]:
        """Global istatistikleri al."""
        global_rpm = self._rpm_counter.get_count("global")
        global_tpm = self._tpm_counter.get_count("global_tokens")
        global_daily = self._daily_counter.get_usage("global")
        
        return {
            'current_minute': {
                'requests': global_rpm,
                'tokens': global_tpm,
                'rpm_limit': self.config.rpm_limit,
                'tpm_limit': self.config.tpm_limit,
            },
            'today': {
                'requests': global_daily.request_count,
                'tokens': global_daily.token_count,
                'cost_usd': round(global_daily.cost_usd, 4),
                'rpd_limit': self.config.rpd_limit,
            },
            'health': {
                'rpm_usage_percent': round((global_rpm / self.config.rpm_limit) * 100, 1),
                'tpm_usage_percent': round((global_tpm / self.config.tpm_limit) * 100, 1),
            }
        }
    
    # =========================================================================
    # UTILITY
    # =========================================================================
    
    def _seconds_until_midnight(self) -> int:
        """Gece yarısına kalan saniye."""
        now = datetime.utcnow()
        midnight = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        return int((midnight - now).total_seconds())
    
    def _record_warning(self, user_id: int, message: str) -> None:
        """Uyarı kaydı."""
        with self._lock:
            # Son 5 dakikada uyarı verilmediyse logla
            last_warning = self._user_warnings.get(user_id)
            now = datetime.utcnow()
            
            if last_warning is None or (now - last_warning).total_seconds() > 300:
                self._user_warnings[user_id] = now
                logger.warning(f"Rate limit warning for user {user_id}: {message}")
    
    def reset_user(self, user_id: int) -> None:
        """Kullanıcı limitlerini sıfırla (admin)."""
        self._rpm_counter.reset(f"user:{user_id}:rpm")
        self._tpm_counter.reset(f"user:{user_id}:tpm")
        logger.info(f"Rate limits reset for user {user_id}")
    
    def update_config(self, new_config: RateLimitConfig) -> None:
        """Config'i güncelle."""
        self.config = new_config
        logger.info("Rate limit config updated")


# =============================================================================
# RATE LIMIT DECORATOR
# =============================================================================

def rate_limit_check(
    feature: str = "default",
    estimated_tokens: int = 500
):
    """
    Rate limit kontrolü decorator'ı.
    
    Usage:
        @rate_limit_check(feature="hint", estimated_tokens=500)
        def get_hint():
            ...
    """
    from functools import wraps
    from flask import g, jsonify
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user_id = getattr(g, 'user_id', 0)
            
            allowed, error = ai_rate_limiter.check_limit(
                user_id=user_id,
                estimated_tokens=estimated_tokens
            )
            
            if not allowed:
                return jsonify({
                    'success': False,
                    'error': error,
                    'error_code': 'RATE_LIMIT_EXCEEDED'
                }), 429
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

# Global rate limiter - Config'den yüklenir
_rate_limiter_instance: Optional[AIRateLimiter] = None


def get_ai_rate_limiter() -> AIRateLimiter:
    """Rate limiter instance al."""
    global _rate_limiter_instance
    
    if _rate_limiter_instance is None:
        # Config'den yükle
        try:
            from app.modules.ai.config import get_ai_config
            config = get_ai_config()
            
            rate_config = RateLimitConfig(
                rpm_limit=config.rate_limit_rpm,
                tpm_limit=config.rate_limit_tpm,
                rpd_limit=config.rate_limit_rpd,
                max_cost_per_request=config.max_cost_per_request,
                max_cost_per_user_daily=config.max_cost_per_user_daily,
            )
            _rate_limiter_instance = AIRateLimiter(rate_config)
        except Exception:
            # Varsayılan config ile oluştur
            _rate_limiter_instance = AIRateLimiter()
    
    return _rate_limiter_instance


# Convenience alias
ai_rate_limiter = get_ai_rate_limiter()
