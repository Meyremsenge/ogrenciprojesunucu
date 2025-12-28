"""
Performance Guards Module.

Performans sorunlarını ve anti-pattern'leri önlemek için araçlar.
Senior Software Reviewer perspektifinden hazırlanmıştır.

Kapsanan Alanlar:
    - N+1 Query problemi
    - Memory leak'ler
    - Slow query detection
    - Connection pool yönetimi
    - Cache stratejileri
"""

import time
import logging
import functools
from typing import Any, Callable, Dict, List, Optional, TypeVar
from datetime import datetime, timedelta
from contextlib import contextmanager
from collections import defaultdict
import threading

from flask import g, request, current_app
from sqlalchemy import event
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

F = TypeVar('F', bound=Callable[..., Any])


# =============================================================================
# 1. QUERY PERFORMANCE MONITORING
# =============================================================================

class QueryMonitor:
    """
    SQL sorgularını izler ve performans sorunlarını tespit eder.
    
    RİSK: N+1 query problemi, yavaş sorgular ve aşırı sorgu sayısı
          uygulamayı yavaşlatır ve veritabanını zorlar.
    
    ÖNLEM:
        - Query sayısını sınırla
        - Slow query'leri logla
        - N+1 pattern'i tespit et
    """
    
    # Varsayılan eşikler
    SLOW_QUERY_THRESHOLD_MS = 100  # 100ms üzeri yavaş
    MAX_QUERIES_PER_REQUEST = 50   # Request başına max sorgu
    N_PLUS_ONE_THRESHOLD = 5       # Aynı sorgudan max tekrar
    
    # Thread-local storage
    _local = threading.local()
    
    @classmethod
    def _get_queries(cls) -> List[Dict]:
        """Mevcut request'in sorgularını döndürür."""
        if not hasattr(cls._local, 'queries'):
            cls._local.queries = []
        return cls._local.queries
    
    @classmethod
    def _get_query_counts(cls) -> Dict[str, int]:
        """Sorgu tekrar sayılarını döndürür."""
        if not hasattr(cls._local, 'query_counts'):
            cls._local.query_counts = defaultdict(int)
        return cls._local.query_counts
    
    @classmethod
    def start_request(cls) -> None:
        """Yeni request için sayaçları sıfırla."""
        cls._local.queries = []
        cls._local.query_counts = defaultdict(int)
        cls._local.start_time = time.time()
    
    @classmethod
    def record_query(cls, statement: str, parameters: Any, duration_ms: float) -> None:
        """Sorguyu kaydeder."""
        queries = cls._get_queries()
        query_counts = cls._get_query_counts()
        
        # Sorgu hash'i (parametresiz)
        query_hash = str(statement)[:200]
        query_counts[query_hash] += 1
        
        query_info = {
            'statement': str(statement)[:500],
            'duration_ms': duration_ms,
            'timestamp': datetime.utcnow().isoformat()
        }
        queries.append(query_info)
        
        # Slow query kontrolü
        if duration_ms > cls.SLOW_QUERY_THRESHOLD_MS:
            logger.warning(
                f'SLOW_QUERY: {duration_ms:.2f}ms - {str(statement)[:100]}...'
            )
        
        # N+1 kontrolü
        if query_counts[query_hash] >= cls.N_PLUS_ONE_THRESHOLD:
            logger.warning(
                f'N+1_QUERY_DETECTED: Same query executed {query_counts[query_hash]} times - '
                f'{query_hash[:100]}...'
            )
    
    @classmethod
    def end_request(cls) -> Dict[str, Any]:
        """Request sonunda istatistikleri döndürür."""
        queries = cls._get_queries()
        query_counts = cls._get_query_counts()
        
        total_time = time.time() - getattr(cls._local, 'start_time', time.time())
        total_query_time = sum(q['duration_ms'] for q in queries)
        
        stats = {
            'total_queries': len(queries),
            'total_query_time_ms': total_query_time,
            'request_time_ms': total_time * 1000,
            'query_time_percent': (total_query_time / (total_time * 1000) * 100) if total_time > 0 else 0,
            'slow_queries': len([q for q in queries if q['duration_ms'] > cls.SLOW_QUERY_THRESHOLD_MS]),
            'potential_n_plus_one': [
                {'query': k[:100], 'count': v} 
                for k, v in query_counts.items() 
                if v >= cls.N_PLUS_ONE_THRESHOLD
            ]
        }
        
        # Çok fazla sorgu uyarısı
        if len(queries) > cls.MAX_QUERIES_PER_REQUEST:
            logger.warning(
                f'TOO_MANY_QUERIES: {len(queries)} queries in single request '
                f'(threshold: {cls.MAX_QUERIES_PER_REQUEST})'
            )
        
        return stats


def setup_query_monitoring(engine: Engine) -> None:
    """SQLAlchemy engine'e query monitoring ekler."""
    
    @event.listens_for(engine, 'before_cursor_execute')
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        context._query_start_time = time.time()
    
    @event.listens_for(engine, 'after_cursor_execute')
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        duration_ms = (time.time() - context._query_start_time) * 1000
        QueryMonitor.record_query(statement, parameters, duration_ms)


# =============================================================================
# 2. MEMORY LEAK DETECTION
# =============================================================================

class MemoryGuard:
    """
    Memory leak'leri tespit eder.
    
    RİSK: Büyüyen listeler, cache'lenmemiş büyük objeler
          memory exhaustion'a yol açar.
    
    ÖNLEM:
        - Object sayılarını izle
        - Büyük response'ları parçala
        - Cache TTL kullan
    """
    
    MAX_LIST_SIZE = 10000
    MAX_RESPONSE_SIZE_MB = 10
    
    @classmethod
    def check_list_size(cls, lst: list, name: str = 'list') -> None:
        """Liste boyutunu kontrol eder."""
        if len(lst) > cls.MAX_LIST_SIZE:
            logger.warning(
                f'LARGE_LIST_WARNING: {name} has {len(lst)} items '
                f'(threshold: {cls.MAX_LIST_SIZE})'
            )
    
    @classmethod
    def check_response_size(cls, data: Any) -> Optional[str]:
        """Response boyutunu kontrol eder."""
        import sys
        size_bytes = sys.getsizeof(data)
        size_mb = size_bytes / (1024 * 1024)
        
        if size_mb > cls.MAX_RESPONSE_SIZE_MB:
            return (
                f'Response too large: {size_mb:.2f}MB '
                f'(threshold: {cls.MAX_RESPONSE_SIZE_MB}MB). '
                f'Consider pagination.'
            )
        return None
    
    @classmethod
    def suggest_pagination(cls, total_count: int, page_size: int = 50) -> Dict[str, Any]:
        """Pagination önerisi yapar."""
        if total_count <= page_size:
            return {'pagination_needed': False}
        
        return {
            'pagination_needed': True,
            'total_count': total_count,
            'suggested_page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        }


# =============================================================================
# 3. CONNECTION POOL MONITORING
# =============================================================================

class ConnectionPoolMonitor:
    """
    Database connection pool'u izler.
    
    RİSK: Connection leak'ler pool tükenmesine ve
          uygulama kilitlenmesine yol açar.
    
    ÖNLEM:
        - Pool durumunu izle
        - Long-running connection'ları tespit et
        - Proper cleanup yap
    """
    
    @staticmethod
    def get_pool_status(engine: Engine) -> Dict[str, Any]:
        """Connection pool durumunu döndürür."""
        pool = engine.pool
        
        return {
            'size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'invalid': pool.invalidatedcount() if hasattr(pool, 'invalidatedcount') else 0
        }
    
    @staticmethod
    def check_pool_health(engine: Engine) -> Dict[str, Any]:
        """Pool sağlığını kontrol eder."""
        status = ConnectionPoolMonitor.get_pool_status(engine)
        
        issues = []
        
        # Tüm connection'lar kullanımda mı?
        if status['checked_in'] == 0 and status['checked_out'] > 0:
            issues.append({
                'type': 'POOL_EXHAUSTED',
                'message': 'All connections in use',
                'severity': 'HIGH'
            })
        
        # Overflow yüksek mi?
        if status['overflow'] > status['size'] // 2:
            issues.append({
                'type': 'HIGH_OVERFLOW',
                'message': f'High overflow: {status["overflow"]}',
                'severity': 'MEDIUM'
            })
        
        return {
            'status': status,
            'healthy': len(issues) == 0,
            'issues': issues
        }


# =============================================================================
# 4. CACHING UTILITIES
# =============================================================================

class CacheHelper:
    """
    Cache stratejileri ve yardımcıları.
    
    RİSK: Eksik veya yanlış cache stratejisi
          performans sorunlarına yol açar.
    
    ÖNLEM:
        - Uygun TTL kullan
        - Cache invalidation stratejisi belirle
        - Cache miss'leri izle
    """
    
    # In-memory cache (production'da Redis kullanılmalı)
    _cache: Dict[str, Dict[str, Any]] = {}
    _stats = {
        'hits': 0,
        'misses': 0
    }
    
    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """Cache'den değer al."""
        if key in cls._cache:
            entry = cls._cache[key]
            if entry['expires_at'] > datetime.utcnow():
                cls._stats['hits'] += 1
                return entry['value']
            else:
                del cls._cache[key]
        
        cls._stats['misses'] += 1
        return None
    
    @classmethod
    def set(cls, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Cache'e değer kaydet."""
        cls._cache[key] = {
            'value': value,
            'expires_at': datetime.utcnow() + timedelta(seconds=ttl_seconds),
            'created_at': datetime.utcnow()
        }
    
    @classmethod
    def delete(cls, key: str) -> None:
        """Cache'den sil."""
        cls._cache.pop(key, None)
    
    @classmethod
    def clear(cls) -> None:
        """Tüm cache'i temizle."""
        cls._cache.clear()
    
    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """Cache istatistiklerini döndür."""
        total = cls._stats['hits'] + cls._stats['misses']
        hit_rate = (cls._stats['hits'] / total * 100) if total > 0 else 0
        
        return {
            'hits': cls._stats['hits'],
            'misses': cls._stats['misses'],
            'hit_rate_percent': round(hit_rate, 2),
            'cache_size': len(cls._cache)
        }
    
    @classmethod
    def cleanup_expired(cls) -> int:
        """Süresi dolmuş cache entry'lerini temizle."""
        now = datetime.utcnow()
        expired_keys = [
            k for k, v in cls._cache.items()
            if v['expires_at'] < now
        ]
        
        for key in expired_keys:
            del cls._cache[key]
        
        return len(expired_keys)


def cached(ttl_seconds: int = 300, key_prefix: str = ''):
    """
    Fonksiyon sonucunu cache'leyen decorator.
    
    Args:
        ttl_seconds: Cache süresi
        key_prefix: Cache key prefix'i
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Cache key oluştur
            cache_key = f'{key_prefix}:{func.__name__}:{str(args)}:{str(kwargs)}'
            
            # Cache'den kontrol et
            cached_value = CacheHelper.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Fonksiyonu çalıştır
            result = func(*args, **kwargs)
            
            # Cache'e kaydet
            CacheHelper.set(cache_key, result, ttl_seconds)
            
            return result
        return wrapper  # type: ignore
    return decorator


# =============================================================================
# 5. TIMING DECORATOR
# =============================================================================

def timed(log_threshold_ms: Optional[float] = None):
    """
    Fonksiyon çalışma süresini ölçen decorator.
    
    Args:
        log_threshold_ms: Bu değeri aşarsa logla
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration_ms = (time.time() - start) * 1000
                
                if log_threshold_ms is None or duration_ms > log_threshold_ms:
                    logger.debug(
                        f'TIMING: {func.__name__} took {duration_ms:.2f}ms'
                    )
        return wrapper  # type: ignore
    return decorator


@contextmanager
def timing_context(name: str, log_threshold_ms: Optional[float] = None):
    """
    Context manager ile süre ölçümü.
    
    Usage:
        with timing_context('database_query', log_threshold_ms=100):
            result = db.execute(query)
    """
    start = time.time()
    try:
        yield
    finally:
        duration_ms = (time.time() - start) * 1000
        if log_threshold_ms is None or duration_ms > log_threshold_ms:
            logger.debug(f'TIMING: {name} took {duration_ms:.2f}ms')


# =============================================================================
# 6. BATCH PROCESSING UTILITIES
# =============================================================================

def batch_process(items: List[Any], batch_size: int = 100):
    """
    Büyük listeleri batch'lere böler.
    
    RİSK: Büyük listelerin tek seferde işlenmesi
          memory ve timeout sorunlarına yol açar.
    
    Usage:
        for batch in batch_process(large_list, batch_size=100):
            process_batch(batch)
    """
    for i in range(0, len(items), batch_size):
        yield items[i:i + batch_size]


def chunked_query(query, chunk_size: int = 1000):
    """
    Büyük sorgu sonuçlarını parçalar halinde işler.
    
    SQLAlchemy query'si için memory-efficient iteration.
    """
    offset = 0
    while True:
        chunk = query.limit(chunk_size).offset(offset).all()
        if not chunk:
            break
        yield from chunk
        offset += chunk_size


# =============================================================================
# 7. PERFORMANCE HEALTH CHECK
# =============================================================================

def performance_health_check() -> Dict[str, Any]:
    """
    Performans durumunu kontrol eder.
    """
    issues = []
    warnings = []
    
    # 1. Cache durumu
    cache_stats = CacheHelper.get_stats()
    if cache_stats['hit_rate_percent'] < 50 and cache_stats['hits'] + cache_stats['misses'] > 100:
        warnings.append({
            'type': 'LOW_CACHE_HIT_RATE',
            'message': f'Cache hit rate is low: {cache_stats["hit_rate_percent"]}%',
            'severity': 'MEDIUM'
        })
    
    # 2. Expired cache temizliği
    expired_count = CacheHelper.cleanup_expired()
    if expired_count > 100:
        warnings.append({
            'type': 'MANY_EXPIRED_CACHE_ENTRIES',
            'message': f'Cleaned up {expired_count} expired cache entries',
            'severity': 'LOW'
        })
    
    return {
        'status': 'FAIL' if issues else 'PASS',
        'cache_stats': cache_stats,
        'issues': issues,
        'warnings': warnings,
        'timestamp': datetime.utcnow().isoformat()
    }


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    'QueryMonitor',
    'setup_query_monitoring',
    'MemoryGuard',
    'ConnectionPoolMonitor',
    'CacheHelper',
    'cached',
    'timed',
    'timing_context',
    'batch_process',
    'chunked_query',
    'performance_health_check',
]
