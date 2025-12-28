"""
Cache Service - Önbellekleme servisi.

Bu servis uygulama önbellekleme işlemlerini yönetir.
"""

from typing import Any, Optional, Callable
from functools import wraps
import json
import hashlib
import logging

logger = logging.getLogger(__name__)


class CacheService:
    """
    Önbellekleme servisi.
    
    Redis veya in-memory önbellekleme sağlar.
    """
    
    _instance = None
    _redis = None
    _local_cache = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def init_redis(cls, redis_client):
        """Redis istemcisini başlatır."""
        cls._redis = redis_client
    
    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """
        Önbellekten değer alır.
        
        Args:
            key: Önbellek anahtarı
            
        Returns:
            Önbellekteki değer veya None
        """
        try:
            if cls._redis:
                value = cls._redis.get(key)
                if value:
                    return json.loads(value)
            else:
                return cls._local_cache.get(key)
        except Exception as e:
            logger.error(f'Cache get error: {str(e)}')
        
        return None
    
    @classmethod
    def set(
        cls,
        key: str,
        value: Any,
        ttl: int = 300,
        tags: list = None
    ) -> bool:
        """
        Önbelleğe değer yazar.
        
        Args:
            key: Önbellek anahtarı
            value: Değer
            ttl: Yaşam süresi (saniye)
            tags: İlişkili etiketler
            
        Returns:
            bool: Başarılı mı
        """
        try:
            serialized = json.dumps(value)
            
            if cls._redis:
                cls._redis.setex(key, ttl, serialized)
                
                # Tag'leri kaydet
                if tags:
                    for tag in tags:
                        cls._redis.sadd(f'cache_tag:{tag}', key)
            else:
                cls._local_cache[key] = value
            
            return True
            
        except Exception as e:
            logger.error(f'Cache set error: {str(e)}')
            return False
    
    @classmethod
    def delete(cls, key: str) -> bool:
        """Önbellekten siler."""
        try:
            if cls._redis:
                cls._redis.delete(key)
            else:
                cls._local_cache.pop(key, None)
            return True
        except Exception as e:
            logger.error(f'Cache delete error: {str(e)}')
            return False
    
    @classmethod
    def delete_pattern(cls, pattern: str) -> int:
        """Pattern'e uyan anahtarları siler."""
        try:
            if cls._redis:
                keys = cls._redis.keys(pattern)
                if keys:
                    return cls._redis.delete(*keys)
            else:
                count = 0
                import fnmatch
                for key in list(cls._local_cache.keys()):
                    if fnmatch.fnmatch(key, pattern):
                        del cls._local_cache[key]
                        count += 1
                return count
        except Exception as e:
            logger.error(f'Cache delete pattern error: {str(e)}')
        return 0
    
    @classmethod
    def delete_by_tag(cls, tag: str) -> int:
        """Tag'e göre siler."""
        try:
            if cls._redis:
                tag_key = f'cache_tag:{tag}'
                keys = cls._redis.smembers(tag_key)
                if keys:
                    cls._redis.delete(*keys)
                    cls._redis.delete(tag_key)
                    return len(keys)
        except Exception as e:
            logger.error(f'Cache delete by tag error: {str(e)}')
        return 0
    
    @classmethod
    def exists(cls, key: str) -> bool:
        """Anahtarın var olup olmadığını kontrol eder."""
        try:
            if cls._redis:
                return bool(cls._redis.exists(key))
            else:
                return key in cls._local_cache
        except:
            return False
    
    @classmethod
    def clear(cls) -> bool:
        """Tüm önbelleği temizler."""
        try:
            if cls._redis:
                cls._redis.flushdb()
            else:
                cls._local_cache.clear()
            return True
        except Exception as e:
            logger.error(f'Cache clear error: {str(e)}')
            return False
    
    @classmethod
    def get_or_set(
        cls,
        key: str,
        factory: Callable[[], Any],
        ttl: int = 300
    ) -> Any:
        """
        Önbellekte varsa döner, yoksa factory'den alıp kaydeder.
        
        Args:
            key: Önbellek anahtarı
            factory: Değer üretecek fonksiyon
            ttl: Yaşam süresi
        """
        value = cls.get(key)
        
        if value is None:
            value = factory()
            cls.set(key, value, ttl)
        
        return value
    
    @classmethod
    def make_key(cls, *args, **kwargs) -> str:
        """Argümanlardan benzersiz anahtar üretir."""
        key_data = json.dumps({'args': args, 'kwargs': kwargs}, sort_keys=True)
        return hashlib.md5(key_data.encode()).hexdigest()


def cached(ttl: int = 300, key_prefix: str = None, tags: list = None):
    """
    Fonksiyon sonucunu önbelleğe alan dekoratör.
    
    Usage:
        @cached(ttl=600, key_prefix='user')
        def get_user(user_id):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Anahtar oluştur
            prefix = key_prefix or func.__name__
            key = f'{prefix}:{CacheService.make_key(*args, **kwargs)}'
            
            # Önbellekten dene
            result = CacheService.get(key)
            if result is not None:
                return result
            
            # Fonksiyonu çağır
            result = func(*args, **kwargs)
            
            # Önbelleğe kaydet
            CacheService.set(key, result, ttl, tags)
            
            return result
        
        # Önbellek temizleme yardımcısı
        wrapper.cache_clear = lambda: CacheService.delete_pattern(
            f'{key_prefix or func.__name__}:*'
        )
        
        return wrapper
    return decorator


# =============================================================================
# Özel Cache Anahtarları
# =============================================================================

class CacheKeys:
    """Standart önbellek anahtar şablonları."""
    
    # Kullanıcı
    USER = 'user:{user_id}'
    USER_PERMISSIONS = 'user:{user_id}:permissions'
    
    # Kurs
    COURSE = 'course:{course_id}'
    COURSE_LIST = 'courses:list:{page}:{per_page}'
    COURSE_TOPICS = 'course:{course_id}:topics'
    
    # İstatistikler
    COURSE_STATS = 'course:{course_id}:stats'
    USER_PROGRESS = 'user:{user_id}:course:{course_id}:progress'
    
    @classmethod
    def format(cls, template: str, **kwargs) -> str:
        """Şablondan anahtar üretir."""
        return template.format(**kwargs)
