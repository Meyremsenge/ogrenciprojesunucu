"""
AI Quota - Redis-based Quota Manager.

Token ve istek kotası yönetimi.
"""

import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple

from app.modules.ai.core.interfaces import QuotaManagerInterface, AIFeature
from app.modules.ai.core.constants import QUOTA_LIMITS, TOKEN_COSTS, REDIS_KEYS
from app.modules.ai.core.exceptions import AIQuotaExceededError


class RedisQuotaManager(QuotaManagerInterface):
    """
    Redis tabanlı kota yöneticisi.
    
    Kullanıcı kotalarını Redis üzerinde yönetir.
    - Günlük/aylık token limitleri
    - Günlük/aylık istek limitleri
    - İstek başına token limiti
    """
    
    def __init__(self, redis_client=None):
        """
        Args:
            redis_client: Redis client instance. None ise in-memory fallback kullanılır.
        """
        self._redis = redis_client
        self._memory_store: Dict[str, Any] = {}  # Fallback için in-memory store
    
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
    
    def check_quota(
        self,
        user_id: int,
        feature: AIFeature,
        tokens: int,
        role: str = 'student'
    ) -> Tuple[bool, Optional[str]]:
        """
        Kota kontrolü yap.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            tokens: Talep edilen token sayısı
            role: Kullanıcı rolü
            
        Returns:
            (izin_var_mı, hata_mesajı)
        """
        limits = QUOTA_LIMITS.get(role, QUOTA_LIMITS['student'])
        
        # Unlimited kota kontrolü
        if limits.get('daily_tokens', 0) == -1:
            return True, None
        
        # Feature erişim kontrolü
        allowed_features = limits.get('features', [])
        if allowed_features != '*' and feature.value not in allowed_features:
            return False, f"Bu özellik ({feature.value}) rolünüz için kullanılamaz"
        
        # Token başına limit kontrolü
        max_per_request = limits.get('max_tokens_per_request', 200)
        if max_per_request > 0 and tokens > max_per_request:
            return False, f"Tek istekte maksimum {max_per_request} token kullanabilirsiniz"
        
        # Günlük token limiti
        daily_used = self._get_daily_tokens(user_id)
        daily_limit = limits.get('daily_tokens', 1000)
        if daily_limit > 0 and daily_used + tokens > daily_limit:
            remaining = daily_limit - daily_used
            return False, f"Günlük token limitiniz doldu. Kalan: {remaining}"
        
        # Aylık token limiti
        monthly_used = self._get_monthly_tokens(user_id)
        monthly_limit = limits.get('monthly_tokens', 20000)
        if monthly_limit > 0 and monthly_used + tokens > monthly_limit:
            remaining = monthly_limit - monthly_used
            return False, f"Aylık token limitiniz doldu. Kalan: {remaining}"
        
        # Günlük istek limiti
        daily_requests = self._get_daily_requests(user_id)
        daily_request_limit = limits.get('daily_requests', 20)
        if daily_request_limit > 0 and daily_requests >= daily_request_limit:
            return False, f"Günlük istek limitiniz doldu ({daily_request_limit})"
        
        return True, None
    
    def consume_quota(
        self,
        user_id: int,
        feature: AIFeature,
        tokens: int
    ) -> None:
        """
        Kota tüket.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            tokens: Tüketilen token sayısı
        """
        today = datetime.utcnow().strftime('%Y-%m-%d')
        month = datetime.utcnow().strftime('%Y-%m')
        
        # Günlük token
        daily_key = f"quota:daily:{user_id}:{today}"
        self._increment(daily_key, tokens, ttl=86400)  # 24 saat
        
        # Aylık token
        monthly_key = f"quota:monthly:{user_id}:{month}"
        self._increment(monthly_key, tokens, ttl=2678400)  # 31 gün
        
        # Günlük istek sayısı
        request_key = f"quota:requests:{user_id}:{today}"
        self._increment(request_key, 1, ttl=86400)
    
    def get_quota_status(self, user_id: int, role: str = 'student') -> Dict[str, Any]:
        """
        Kota durumunu al.
        
        Args:
            user_id: Kullanıcı ID
            role: Kullanıcı rolü
            
        Returns:
            Kota bilgileri
        """
        limits = QUOTA_LIMITS.get(role, QUOTA_LIMITS['student'])
        
        daily_tokens_used = self._get_daily_tokens(user_id)
        monthly_tokens_used = self._get_monthly_tokens(user_id)
        daily_requests = self._get_daily_requests(user_id)
        
        daily_limit = limits.get('daily_tokens', 1000)
        monthly_limit = limits.get('monthly_tokens', 20000)
        daily_request_limit = limits.get('daily_requests', 20)
        
        # Reset zamanlarını hesapla
        now = datetime.utcnow()
        daily_reset = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        monthly_reset = (now.replace(day=1) + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        return {
            'user_id': user_id,
            'role': role,
            'tokens': {
                'daily': {
                    'used': daily_tokens_used,
                    'limit': daily_limit if daily_limit > 0 else 'unlimited',
                    'remaining': max(0, daily_limit - daily_tokens_used) if daily_limit > 0 else 'unlimited',
                    'reset_at': daily_reset.isoformat()
                },
                'monthly': {
                    'used': monthly_tokens_used,
                    'limit': monthly_limit if monthly_limit > 0 else 'unlimited',
                    'remaining': max(0, monthly_limit - monthly_tokens_used) if monthly_limit > 0 else 'unlimited',
                    'reset_at': monthly_reset.isoformat()
                }
            },
            'requests': {
                'daily': {
                    'used': daily_requests,
                    'limit': daily_request_limit if daily_request_limit > 0 else 'unlimited',
                    'remaining': max(0, daily_request_limit - daily_requests) if daily_request_limit > 0 else 'unlimited',
                    'reset_at': daily_reset.isoformat()
                }
            },
            'features': limits.get('features', []),
            'max_tokens_per_request': limits.get('max_tokens_per_request', 200)
        }
    
    def reset_quota(self, user_id: int, quota_type: str = 'all') -> bool:
        """
        Kullanıcı kotasını sıfırla (admin için).
        
        Args:
            user_id: Kullanıcı ID
            quota_type: 'daily', 'monthly', veya 'all'
            
        Returns:
            Başarılı mı
        """
        today = datetime.utcnow().strftime('%Y-%m-%d')
        month = datetime.utcnow().strftime('%Y-%m')
        
        keys_to_delete = []
        
        if quota_type in ['daily', 'all']:
            keys_to_delete.append(f"quota:daily:{user_id}:{today}")
            keys_to_delete.append(f"quota:requests:{user_id}:{today}")
        
        if quota_type in ['monthly', 'all']:
            keys_to_delete.append(f"quota:monthly:{user_id}:{month}")
        
        for key in keys_to_delete:
            self._delete(key)
        
        return True
    
    # Private methods
    def _get_daily_tokens(self, user_id: int) -> int:
        """Günlük kullanılan token sayısı."""
        today = datetime.utcnow().strftime('%Y-%m-%d')
        key = f"quota:daily:{user_id}:{today}"
        return self._get(key, 0)
    
    def _get_monthly_tokens(self, user_id: int) -> int:
        """Aylık kullanılan token sayısı."""
        month = datetime.utcnow().strftime('%Y-%m')
        key = f"quota:monthly:{user_id}:{month}"
        return self._get(key, 0)
    
    def _get_daily_requests(self, user_id: int) -> int:
        """Günlük istek sayısı."""
        today = datetime.utcnow().strftime('%Y-%m-%d')
        key = f"quota:requests:{user_id}:{today}"
        return self._get(key, 0)
    
    def _get(self, key: str, default: int = 0) -> int:
        """Redis/Memory'den değer al."""
        if self.is_redis_available:
            try:
                value = self._redis.get(key)
                return int(value) if value else default
            except Exception:
                pass
        
        return self._memory_store.get(key, {}).get('value', default)
    
    def _increment(self, key: str, amount: int, ttl: int = 86400) -> int:
        """Değeri artır."""
        if self.is_redis_available:
            try:
                pipe = self._redis.pipeline()
                pipe.incrby(key, amount)
                pipe.expire(key, ttl)
                result = pipe.execute()
                return result[0]
            except Exception:
                pass
        
        # Memory fallback
        if key not in self._memory_store:
            self._memory_store[key] = {'value': 0, 'expires': time.time() + ttl}
        
        # Expire kontrolü
        if time.time() > self._memory_store[key].get('expires', 0):
            self._memory_store[key] = {'value': 0, 'expires': time.time() + ttl}
        
        self._memory_store[key]['value'] += amount
        return self._memory_store[key]['value']
    
    def _delete(self, key: str) -> None:
        """Key sil."""
        if self.is_redis_available:
            try:
                self._redis.delete(key)
                return
            except Exception:
                pass
        
        self._memory_store.pop(key, None)
