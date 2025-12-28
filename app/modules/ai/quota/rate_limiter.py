"""
AI Quota - Redis-based Rate Limiter.

Sliding window rate limiting implementasyonu.
"""

import time
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

from app.modules.ai.core.interfaces import RateLimiterInterface, AIFeature
from app.modules.ai.core.constants import QUOTA_LIMITS


class RedisRateLimiter(RateLimiterInterface):
    """
    Redis tabanlı rate limiter.
    
    Sliding window algoritması ile rate limiting uygular.
    - Cooldown süreleri
    - Feature bazlı limitler
    - Dakika/saat bazlı limitler
    """
    
    def __init__(self, redis_client=None):
        """
        Args:
            redis_client: Redis client instance. None ise in-memory fallback kullanılır.
        """
        self._redis = redis_client
        self._memory_store: Dict[str, list] = {}
    
    @property
    def is_redis_available(self) -> bool:
        """Redis bağlantısı var mı."""
        if self._redis is None:
            return False
        try:
            self._redis.ping()
            return True
        except Exception:
            return False
    
    def is_allowed(
        self,
        user_id: int,
        feature: AIFeature,
        role: str = 'student'
    ) -> Tuple[bool, Optional[int]]:
        """
        İstek izinli mi kontrol et.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            role: Kullanıcı rolü
            
        Returns:
            (izinli_mi, kalan_bekleme_süresi_saniye)
        """
        limits = QUOTA_LIMITS.get(role, QUOTA_LIMITS['student'])
        cooldown = limits.get('cooldown_seconds', 30)
        
        # Cooldown = 0 ise rate limit yok
        if cooldown <= 0:
            return True, None
        
        # Son istek zamanını kontrol et
        key = f"rate:last:{user_id}:{feature.value}"
        last_request = self._get_timestamp(key)
        
        if last_request:
            elapsed = time.time() - last_request
            if elapsed < cooldown:
                wait_time = int(cooldown - elapsed) + 1
                return False, wait_time
        
        # Dakikalık limit kontrolü (30 istek/dakika)
        minute_key = f"rate:minute:{user_id}"
        minute_count = self._get_sliding_window_count(minute_key, 60)
        if minute_count >= 30:
            return False, 60 - self._get_oldest_request_age(minute_key, 60)
        
        return True, None
    
    def record_request(
        self,
        user_id: int,
        feature: AIFeature
    ) -> None:
        """
        İsteği kaydet.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
        """
        now = time.time()
        
        # Son istek zamanını güncelle
        key = f"rate:last:{user_id}:{feature.value}"
        self._set_timestamp(key, now, ttl=300)  # 5 dakika TTL
        
        # Dakikalık pencereye ekle
        minute_key = f"rate:minute:{user_id}"
        self._add_to_sliding_window(minute_key, now, window_size=60)
        
        # Saatlik pencereye ekle
        hour_key = f"rate:hour:{user_id}"
        self._add_to_sliding_window(hour_key, now, window_size=3600)
    
    def get_rate_status(self, user_id: int, role: str = 'student') -> Dict[str, Any]:
        """
        Rate limit durumunu al.
        
        Args:
            user_id: Kullanıcı ID
            role: Kullanıcı rolü
            
        Returns:
            Rate limit bilgileri
        """
        limits = QUOTA_LIMITS.get(role, QUOTA_LIMITS['student'])
        cooldown = limits.get('cooldown_seconds', 30)
        
        minute_key = f"rate:minute:{user_id}"
        hour_key = f"rate:hour:{user_id}"
        
        minute_count = self._get_sliding_window_count(minute_key, 60)
        hour_count = self._get_sliding_window_count(hour_key, 3600)
        
        return {
            'user_id': user_id,
            'role': role,
            'cooldown_seconds': cooldown,
            'requests': {
                'last_minute': minute_count,
                'last_hour': hour_count
            },
            'limits': {
                'per_minute': 30,
                'per_hour': 200
            }
        }
    
    # Private methods
    def _get_timestamp(self, key: str) -> Optional[float]:
        """Timestamp al."""
        if self.is_redis_available:
            try:
                value = self._redis.get(key)
                return float(value) if value else None
            except Exception:
                pass
        
        data = self._memory_store.get(key)
        if data and isinstance(data, dict):
            if time.time() < data.get('expires', 0):
                return data.get('timestamp')
        return None
    
    def _set_timestamp(self, key: str, timestamp: float, ttl: int = 300) -> None:
        """Timestamp set et."""
        if self.is_redis_available:
            try:
                self._redis.setex(key, ttl, str(timestamp))
                return
            except Exception:
                pass
        
        self._memory_store[key] = {
            'timestamp': timestamp,
            'expires': time.time() + ttl
        }
    
    def _get_sliding_window_count(self, key: str, window_size: int) -> int:
        """Sliding window içindeki istek sayısı."""
        now = time.time()
        cutoff = now - window_size
        
        if self.is_redis_available:
            try:
                # ZREMRANGEBYSCORE ile eski kayıtları temizle
                self._redis.zremrangebyscore(key, '-inf', cutoff)
                # ZCARD ile sayı al
                return self._redis.zcard(key)
            except Exception:
                pass
        
        # Memory fallback
        requests = self._memory_store.get(key, [])
        if isinstance(requests, list):
            valid_requests = [r for r in requests if r > cutoff]
            self._memory_store[key] = valid_requests
            return len(valid_requests)
        
        return 0
    
    def _add_to_sliding_window(self, key: str, timestamp: float, window_size: int) -> None:
        """Sliding window'a istek ekle."""
        if self.is_redis_available:
            try:
                pipe = self._redis.pipeline()
                # Yeni istek ekle
                pipe.zadd(key, {str(timestamp): timestamp})
                # Eski kayıtları temizle
                pipe.zremrangebyscore(key, '-inf', timestamp - window_size)
                # TTL ayarla
                pipe.expire(key, window_size * 2)
                pipe.execute()
                return
            except Exception:
                pass
        
        # Memory fallback
        if key not in self._memory_store or not isinstance(self._memory_store[key], list):
            self._memory_store[key] = []
        
        self._memory_store[key].append(timestamp)
        
        # Eski kayıtları temizle
        cutoff = timestamp - window_size
        self._memory_store[key] = [r for r in self._memory_store[key] if r > cutoff]
    
    def _get_oldest_request_age(self, key: str, window_size: int) -> int:
        """En eski isteğin yaşını al."""
        now = time.time()
        cutoff = now - window_size
        
        if self.is_redis_available:
            try:
                oldest = self._redis.zrange(key, 0, 0, withscores=True)
                if oldest:
                    return int(now - oldest[0][1])
            except Exception:
                pass
        
        requests = self._memory_store.get(key, [])
        if isinstance(requests, list) and requests:
            valid_requests = [r for r in requests if r > cutoff]
            if valid_requests:
                return int(now - min(valid_requests))
        
        return 0
