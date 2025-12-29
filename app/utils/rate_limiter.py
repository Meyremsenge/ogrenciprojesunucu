"""
Rate limiting middleware for API protection.
Implements Token Bucket algorithm with Redis backend.
"""

import time
from functools import wraps
from typing import Callable, Optional, Tuple
from collections import defaultdict
import threading

from flask import request, g, current_app
import redis
from redis import ConnectionPool

from app.utils.helpers import get_client_ip


# Global connection pool for Redis (singleton pattern)
_redis_pool: Optional[ConnectionPool] = None
_pool_lock = threading.Lock()


def get_redis_pool() -> ConnectionPool:
    """Get or create shared Redis connection pool."""
    global _redis_pool
    
    if _redis_pool is None:
        with _pool_lock:
            if _redis_pool is None:
                try:
                    redis_url = current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
                    max_connections = current_app.config.get('REDIS_MAX_CONNECTIONS', 50)
                    
                    _redis_pool = ConnectionPool.from_url(
                        redis_url,
                        max_connections=max_connections,
                        socket_timeout=1.0,
                        socket_connect_timeout=0.5,
                        retry_on_timeout=True,
                        decode_responses=True
                    )
                    current_app.logger.info(f'Redis connection pool created with max {max_connections} connections')
                except Exception as e:
                    current_app.logger.error(f'Failed to create Redis connection pool: {e}')
                    return None
    
    return _redis_pool


class InMemoryRateLimiter:
    """
    In-memory fallback rate limiter when Redis is unavailable.
    Uses sliding window algorithm.
    """
    
    def __init__(self):
        self._requests: defaultdict = defaultdict(list)
        self._lock = threading.Lock()
    
    def is_allowed(self, key: str, limit: int, period: int) -> Tuple[bool, dict]:
        """Check if request is allowed using in-memory storage."""
        now = time.time()
        
        with self._lock:
            # Clean old entries
            self._requests[key] = [
                ts for ts in self._requests[key]
                if ts > now - period
            ]
            
            current_count = len(self._requests[key])
            
            if current_count < limit:
                self._requests[key].append(now)
                remaining = limit - current_count - 1
                allowed = True
            else:
                remaining = 0
                allowed = False
            
            return allowed, {
                'limit': limit,
                'remaining': remaining,
                'reset': int(now + period),
                'retry_after': period if not allowed else None
            }
    
    def cleanup(self, max_age: int = 3600):
        """Remove old entries to prevent memory bloat."""
        now = time.time()
        with self._lock:
            keys_to_remove = []
            for key, timestamps in self._requests.items():
                self._requests[key] = [ts for ts in timestamps if ts > now - max_age]
                if not self._requests[key]:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self._requests[key]


# Global in-memory fallback
_memory_limiter = InMemoryRateLimiter()


class RateLimiter:
    """
    Token Bucket rate limiter with Redis backend.
    Supports per-IP and per-user rate limiting.
    Falls back to in-memory limiter when Redis is unavailable.
    """
    
    def __init__(self, redis_client: redis.Redis = None):
        self._client = redis_client
        self.prefix = 'ratelimit:'
        self._redis_healthy = True
        self._last_health_check = 0
        self._health_check_interval = 30  # seconds
    
    @property
    def client(self) -> Optional[redis.Redis]:
        """Get Redis client from connection pool."""
        if self._client is not None:
            return self._client
        
        pool = get_redis_pool()
        if pool is None:
            return None
        
        try:
            self._client = redis.Redis(connection_pool=pool)
            return self._client
        except Exception as e:
            current_app.logger.error(f"Failed to get Redis client: {e}")
            return None
    
    def _check_redis_health(self) -> bool:
        """Check if Redis is healthy (with caching)."""
        now = time.time()
        
        if now - self._last_health_check < self._health_check_interval:
            return self._redis_healthy
        
        self._last_health_check = now
        
        try:
            client = self.client
            if client:
                client.ping()
                self._redis_healthy = True
            else:
                self._redis_healthy = False
        except redis.RedisError:
            self._redis_healthy = False
        
        return self._redis_healthy
    
    def _get_key(self, identifier: str, limit_type: str) -> str:
        """Generate rate limit key."""
        return f"{self.prefix}{limit_type}:{identifier}"
    
    def is_allowed(
        self,
        identifier: str,
        limit: int,
        period: int,
        limit_type: str = 'ip'
    ) -> Tuple[bool, dict]:
        """
        Check if request is allowed based on rate limit.
        
        Args:
            identifier: Unique identifier (IP or user ID)
            limit: Maximum requests allowed in period
            period: Time period in seconds
            limit_type: Type of limit ('ip' or 'user')
        
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        key = self._get_key(identifier, limit_type)
        now = time.time()
        
        # Check Redis health first
        if not self._check_redis_health():
            # Use in-memory fallback
            current_app.logger.warning("Redis unavailable, using in-memory rate limiter")
            return _memory_limiter.is_allowed(key, limit, period)
        
        try:
            client = self.client
            if client is None:
                return _memory_limiter.is_allowed(key, limit, period)
            
            pipe = client.pipeline()
            
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, now - period)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(now): now})
            
            # Set expiry on the key
            pipe.expire(key, period)
            
            results = pipe.execute()
            current_count = results[1]
            
            remaining = max(0, limit - current_count - 1)
            reset_time = int(now + period)
            
            info = {
                'limit': limit,
                'remaining': remaining,
                'reset': reset_time,
                'retry_after': period if current_count >= limit else None
            }
            
            return current_count < limit, info
            
        except redis.RedisError as e:
            current_app.logger.error(f"Rate limiter Redis error: {e}")
            self._redis_healthy = False
            # Use in-memory fallback instead of fail-open
            return _memory_limiter.is_allowed(key, limit, period)
    
    def get_usage(self, identifier: str, limit_type: str = 'ip') -> int:
        """Get current usage count for identifier."""
        key = self._get_key(identifier, limit_type)
        now = time.time()
        
        try:
            # Count requests in last minute
            return self.client.zcount(key, now - 60, now)
        except redis.RedisError:
            return 0


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(
    limit: int = 100,
    period: int = 60,
    by: str = 'ip',
    scope: str = None,
    error_message: str = None
):
    """
    Rate limiting decorator for Flask routes.
    
    Args:
        limit: Maximum requests allowed
        period: Time period in seconds (default: 60 = 1 minute)
        by: Rate limit by 'ip' or 'user'
        scope: Custom scope for grouping endpoints
        error_message: Custom error message
    
    Usage:
        @app.route('/api/login')
        @rate_limit(limit=5, period=60, by='ip')  # 5 attempts per minute
        def login():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Check if rate limiting is enabled
            if not current_app.config.get('RATELIMIT_ENABLED', True):
                return func(*args, **kwargs)
            
            # Determine identifier
            if by == 'user':
                from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
                try:
                    verify_jwt_in_request(optional=True)
                    identifier = get_jwt_identity()
                    if not identifier:
                        identifier = get_client_ip(request)
                except:
                    identifier = get_client_ip(request)
            else:
                identifier = get_client_ip(request)
            
            # Add scope to identifier if provided
            limit_scope = scope or func.__name__
            full_identifier = f"{identifier}:{limit_scope}"
            
            # Check rate limit
            allowed, info = rate_limiter.is_allowed(
                full_identifier, limit, period, by
            )
            
            # Add rate limit headers to response
            g.rate_limit_info = info
            
            if not allowed:
                message = error_message or 'Rate limit exceeded. Please try again later.'
                return {
                    'success': False,
                    'error': {
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'message': message,
                        'retry_after': info['retry_after']
                    }
                }, 429
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def add_rate_limit_headers(response):
    """
    Add rate limit headers to response.
    Call this in after_request handler.
    """
    if hasattr(g, 'rate_limit_info'):
        info = g.rate_limit_info
        response.headers['X-RateLimit-Limit'] = str(info['limit'])
        response.headers['X-RateLimit-Remaining'] = str(info['remaining'])
        response.headers['X-RateLimit-Reset'] = str(info['reset'])
    return response


class RateLimitPresets:
    """
    Pre-configured rate limits for common endpoints.
    """
    
    # Authentication - strict limits
    LOGIN = {'limit': 5, 'period': 60, 'by': 'ip'}  # 5 per minute
    REGISTER = {'limit': 3, 'period': 300, 'by': 'ip'}  # 3 per 5 minutes
    PASSWORD_RESET = {'limit': 3, 'period': 3600, 'by': 'ip'}  # 3 per hour
    
    # API endpoints - standard limits
    API_READ = {'limit': 100, 'period': 60, 'by': 'user'}  # 100 per minute
    API_WRITE = {'limit': 30, 'period': 60, 'by': 'user'}  # 30 per minute
    
    # Heavy operations
    EXPORT = {'limit': 5, 'period': 300, 'by': 'user'}  # 5 per 5 minutes
    UPLOAD = {'limit': 10, 'period': 60, 'by': 'user'}  # 10 per minute
    
    # Search/listing
    SEARCH = {'limit': 30, 'period': 60, 'by': 'user'}  # 30 per minute
