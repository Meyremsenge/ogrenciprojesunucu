"""
Redis Configuration Module.

Redis bağlantı ve önbellek yapılandırması.
Cache, session ve Celery broker yönetimi.

DevOps Best Practices:
    - Connection pooling
    - Cluster desteği
    - Sentinel desteği
    - Health checks
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union
from datetime import timedelta

logger = logging.getLogger(__name__)


@dataclass
class RedisConfig:
    """
    Redis bağlantı yapılandırması.
    
    Standalone, Sentinel ve Cluster modları desteklenir.
    """
    
    # ========================================
    # Connection Mode
    # ========================================
    mode: str = "standalone"  # standalone, sentinel, cluster
    
    # ========================================
    # Standalone Mode
    # ========================================
    url: str = "redis://localhost:6379/0"
    host: str = "localhost"
    port: int = 6379
    password: Optional[str] = None
    db: int = 0
    
    # ========================================
    # Sentinel Mode
    # ========================================
    sentinel_hosts: List[str] = field(default_factory=lambda: ["localhost:26379"])
    sentinel_master: str = "mymaster"
    sentinel_password: Optional[str] = None
    
    # ========================================
    # Cluster Mode
    # ========================================
    cluster_nodes: List[str] = field(default_factory=lambda: ["localhost:7000"])
    
    # ========================================
    # SSL Configuration
    # ========================================
    ssl_enabled: bool = False
    ssl_ca_cert: Optional[str] = None
    ssl_cert_file: Optional[str] = None
    ssl_key_file: Optional[str] = None
    ssl_verify: bool = True
    
    # ========================================
    # Connection Pool
    # ========================================
    max_connections: int = 10
    socket_timeout: float = 5.0
    socket_connect_timeout: float = 5.0
    socket_keepalive: bool = True
    retry_on_timeout: bool = True
    health_check_interval: int = 30
    
    # ========================================
    # Cache Settings
    # ========================================
    cache_prefix: str = "sks:"
    default_ttl: int = 300  # 5 dakika
    max_ttl: int = 86400  # 24 saat
    
    # ========================================
    # Database Assignments
    # ========================================
    cache_db: int = 0
    session_db: int = 1
    celery_broker_db: int = 2
    celery_result_db: int = 3
    rate_limit_db: int = 4
    
    @property
    def connection_string(self) -> str:
        """Redis URL oluştur."""
        if self.url and "://" in self.url:
            return self.url
        
        auth = f":{self.password}@" if self.password else ""
        return f"redis://{auth}{self.host}:{self.port}/{self.db}"
    
    def get_url_for_db(self, db: int) -> str:
        """Belirli db için URL oluştur."""
        base = self.connection_string.rsplit('/', 1)[0]
        return f"{base}/{db}"
    
    @property
    def cache_url(self) -> str:
        return self.get_url_for_db(self.cache_db)
    
    @property
    def session_url(self) -> str:
        return self.get_url_for_db(self.session_db)
    
    @property
    def celery_broker_url(self) -> str:
        return self.get_url_for_db(self.celery_broker_db)
    
    @property
    def celery_result_url(self) -> str:
        return self.get_url_for_db(self.celery_result_db)
    
    @property
    def rate_limit_url(self) -> str:
        return self.get_url_for_db(self.rate_limit_db)


class RedisManager:
    """
    Redis bağlantı yöneticisi.
    
    Connection pooling ve health check yönetimi.
    """
    
    def __init__(self, config: RedisConfig = None):
        self.config = config or RedisConfig()
        self._client = None
        self._pool = None
    
    def init_app(self, app=None):
        """Flask uygulamasına entegre et."""
        if app:
            self.config.url = app.config.get('REDIS_URL', self.config.url)
            self.config.host = app.config.get('REDIS_HOST', self.config.host)
            self.config.port = app.config.get('REDIS_PORT', self.config.port)
            self.config.password = app.config.get('REDIS_PASSWORD', self.config.password)
            self.config.db = app.config.get('REDIS_DB', self.config.db)
        
        self._create_client()
    
    def _create_client(self):
        """Redis client oluştur."""
        import redis
        
        if self.config.mode == "standalone":
            self._pool = redis.ConnectionPool(
                host=self.config.host,
                port=self.config.port,
                db=self.config.db,
                password=self.config.password,
                max_connections=self.config.max_connections,
                socket_timeout=self.config.socket_timeout,
                socket_connect_timeout=self.config.socket_connect_timeout,
                socket_keepalive=self.config.socket_keepalive,
                retry_on_timeout=self.config.retry_on_timeout,
                health_check_interval=self.config.health_check_interval,
                decode_responses=True,
            )
            self._client = redis.Redis(connection_pool=self._pool)
        
        elif self.config.mode == "sentinel":
            from redis.sentinel import Sentinel
            
            sentinels = []
            for host_port in self.config.sentinel_hosts:
                host, port = host_port.split(':')
                sentinels.append((host, int(port)))
            
            sentinel = Sentinel(
                sentinels,
                sentinel_kwargs={'password': self.config.sentinel_password}
            )
            self._client = sentinel.master_for(
                self.config.sentinel_master,
                socket_timeout=self.config.socket_timeout,
                password=self.config.password,
                decode_responses=True,
            )
        
        elif self.config.mode == "cluster":
            from redis.cluster import RedisCluster
            
            startup_nodes = []
            for node in self.config.cluster_nodes:
                host, port = node.split(':')
                startup_nodes.append({'host': host, 'port': int(port)})
            
            self._client = RedisCluster(
                startup_nodes=startup_nodes,
                password=self.config.password,
                decode_responses=True,
            )
        
        logger.info(f"Redis client created (mode: {self.config.mode})")
    
    @property
    def client(self):
        """Redis client döner."""
        if not self._client:
            self._create_client()
        return self._client
    
    def health_check(self) -> Dict[str, Any]:
        """Redis sağlık kontrolü."""
        try:
            self.client.ping()
            info = self.client.info()
            
            return {
                'status': 'healthy',
                'mode': self.config.mode,
                'version': info.get('redis_version'),
                'connected_clients': info.get('connected_clients'),
                'used_memory_human': info.get('used_memory_human'),
                'uptime_in_days': info.get('uptime_in_days'),
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    def close(self):
        """Bağlantıyı kapat."""
        if self._client:
            self._client.close()
            self._client = None
        if self._pool:
            self._pool.disconnect()
            self._pool = None
        logger.info("Redis connection closed")


class CacheService:
    """
    Redis önbellek servisi.
    
    Tip-güvenli cache işlemleri.
    """
    
    def __init__(self, redis_manager: RedisManager = None, config: RedisConfig = None):
        self.redis = redis_manager or RedisManager(config)
        self.config = config or RedisConfig()
        self.prefix = self.config.cache_prefix
    
    def _make_key(self, key: str) -> str:
        """Cache key oluştur."""
        return f"{self.prefix}{key}"
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Cache'den değer al.
        
        Args:
            key: Cache key
            default: Varsayılan değer
        
        Returns:
            Cached value veya default
        """
        try:
            value = self.redis.client.get(self._make_key(key))
            if value is None:
                return default
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value or default
    
    def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Union[int, timedelta] = None,
        nx: bool = False,
        xx: bool = False
    ) -> bool:
        """
        Cache'e değer yaz.
        
        Args:
            key: Cache key
            value: Değer
            ttl: Time-to-live (saniye veya timedelta)
            nx: Sadece key yoksa yaz
            xx: Sadece key varsa yaz
        
        Returns:
            Başarılı mı?
        """
        if ttl is None:
            ttl = self.config.default_ttl
        elif isinstance(ttl, timedelta):
            ttl = int(ttl.total_seconds())
        
        # TTL limitini uygula
        ttl = min(ttl, self.config.max_ttl)
        
        try:
            serialized = json.dumps(value, default=str)
            return self.redis.client.set(
                self._make_key(key),
                serialized,
                ex=ttl,
                nx=nx,
                xx=xx
            )
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Cache'den sil."""
        return bool(self.redis.client.delete(self._make_key(key)))
    
    def exists(self, key: str) -> bool:
        """Key var mı kontrol et."""
        return bool(self.redis.client.exists(self._make_key(key)))
    
    def ttl(self, key: str) -> int:
        """Key'in kalan TTL'ini döner."""
        return self.redis.client.ttl(self._make_key(key))
    
    def incr(self, key: str, amount: int = 1) -> int:
        """Sayacı artır."""
        return self.redis.client.incr(self._make_key(key), amount)
    
    def decr(self, key: str, amount: int = 1) -> int:
        """Sayacı azalt."""
        return self.redis.client.decr(self._make_key(key), amount)
    
    def delete_pattern(self, pattern: str) -> int:
        """Pattern'e uyan tüm key'leri sil."""
        full_pattern = self._make_key(pattern)
        keys = self.redis.client.keys(full_pattern)
        if keys:
            return self.redis.client.delete(*keys)
        return 0
    
    def flush_all(self) -> bool:
        """Tüm cache'i temizle (DİKKAT!)."""
        pattern = self._make_key("*")
        keys = self.redis.client.keys(pattern)
        if keys:
            self.redis.client.delete(*keys)
        logger.warning(f"Cache flushed: {len(keys)} keys deleted")
        return True
    
    def get_or_set(
        self, 
        key: str, 
        factory_func, 
        ttl: Union[int, timedelta] = None
    ) -> Any:
        """
        Cache'den al veya factory ile oluştur.
        
        Args:
            key: Cache key
            factory_func: Değer oluşturacak callable
            ttl: Time-to-live
        
        Returns:
            Cached veya yeni oluşturulan değer
        """
        value = self.get(key)
        if value is not None:
            return value
        
        value = factory_func()
        self.set(key, value, ttl)
        return value
    
    def mget(self, keys: List[str]) -> Dict[str, Any]:
        """Birden fazla key'i al."""
        full_keys = [self._make_key(k) for k in keys]
        values = self.redis.client.mget(full_keys)
        
        result = {}
        for key, value in zip(keys, values):
            if value is not None:
                try:
                    result[key] = json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    result[key] = value
        
        return result
    
    def mset(self, mapping: Dict[str, Any], ttl: int = None) -> bool:
        """Birden fazla key'e yaz."""
        if ttl is None:
            ttl = self.config.default_ttl
        
        pipe = self.redis.client.pipeline()
        for key, value in mapping.items():
            serialized = json.dumps(value, default=str)
            pipe.setex(self._make_key(key), ttl, serialized)
        
        pipe.execute()
        return True


# ========================================
# CACHE DECORATORS
# ========================================

def cached(
    key_prefix: str = None,
    ttl: int = 300,
    key_builder: callable = None
):
    """
    Fonksiyon sonucunu cache'le.
    
    Args:
        key_prefix: Cache key öneki
        ttl: Time-to-live (saniye)
        key_builder: Özel key oluşturucu
    
    Example:
        @cached(key_prefix="user", ttl=3600)
        def get_user(user_id):
            return User.query.get(user_id)
    """
    def decorator(func):
        from functools import wraps
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Cache key oluştur
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                prefix = key_prefix or func.__name__
                args_key = ":".join(str(a) for a in args)
                kwargs_key = ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = f"{prefix}:{args_key}:{kwargs_key}".rstrip(":")
            
            # Cache'den al
            cache = get_cache()
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Hesapla ve cache'le
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            return result
        
        # Cache'i invalidate etme yardımcısı
        def invalidate(*args, **kwargs):
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                prefix = key_prefix or func.__name__
                args_key = ":".join(str(a) for a in args)
                kwargs_key = ":".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = f"{prefix}:{args_key}:{kwargs_key}".rstrip(":")
            
            cache = get_cache()
            cache.delete(cache_key)
        
        wrapper.invalidate = invalidate
        return wrapper
    
    return decorator


def cache_invalidate(pattern: str):
    """
    İşlem sonrası cache'i invalidate et.
    
    Args:
        pattern: Silinecek cache pattern'i
    
    Example:
        @cache_invalidate("user:*")
        def update_user(user_id, data):
            ...
    """
    def decorator(func):
        from functools import wraps
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            
            cache = get_cache()
            cache.delete_pattern(pattern)
            
            return result
        
        return wrapper
    
    return decorator


# ========================================
# RATE LIMITING WITH REDIS
# ========================================

class RateLimiter:
    """
    Redis tabanlı rate limiter.
    
    Sliding window algoritması.
    """
    
    def __init__(self, redis_manager: RedisManager = None, prefix: str = "ratelimit:"):
        self.redis = redis_manager or get_redis()
        self.prefix = prefix
    
    def is_allowed(
        self, 
        key: str, 
        limit: int, 
        window: int
    ) -> tuple[bool, Dict[str, Any]]:
        """
        Rate limit kontrolü.
        
        Args:
            key: Limit key (örn: user_id veya ip)
            limit: Maksimum istek sayısı
            window: Zaman penceresi (saniye)
        
        Returns:
            (allowed, info) tuple
        """
        import time
        
        full_key = f"{self.prefix}{key}"
        now = time.time()
        window_start = now - window
        
        pipe = self.redis.client.pipeline()
        
        # Eski kayıtları temizle
        pipe.zremrangebyscore(full_key, 0, window_start)
        
        # Mevcut sayıyı al
        pipe.zcard(full_key)
        
        # Yeni isteği ekle
        pipe.zadd(full_key, {str(now): now})
        
        # TTL ayarla
        pipe.expire(full_key, window)
        
        results = pipe.execute()
        current_count = results[1]
        
        info = {
            'limit': limit,
            'remaining': max(0, limit - current_count - 1),
            'reset': int(now + window),
            'window': window,
        }
        
        allowed = current_count < limit
        
        return allowed, info
    
    def reset(self, key: str):
        """Rate limit'i sıfırla."""
        full_key = f"{self.prefix}{key}"
        self.redis.client.delete(full_key)


# ========================================
# GLOBAL INSTANCES
# ========================================

_redis_manager: Optional[RedisManager] = None
_cache_service: Optional[CacheService] = None


def get_redis() -> RedisManager:
    """Global Redis manager döner."""
    global _redis_manager
    if _redis_manager is None:
        _redis_manager = RedisManager()
    return _redis_manager


def get_cache() -> CacheService:
    """Global cache service döner."""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService(get_redis())
    return _cache_service


def init_redis(app=None, config: RedisConfig = None) -> RedisManager:
    """
    Redis'i initialize et.
    
    Args:
        app: Flask uygulaması
        config: Redis config
    """
    global _redis_manager, _cache_service
    
    if config:
        _redis_manager = RedisManager(config)
    else:
        _redis_manager = RedisManager()
    
    if app:
        _redis_manager.init_app(app)
    
    _cache_service = CacheService(_redis_manager, config)
    
    return _redis_manager
