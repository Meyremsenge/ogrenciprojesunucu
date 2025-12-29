"""
Redis Cache utilities and decorators.
Provides caching layer for high-performance data access.
"""

import json
import functools
import hashlib
from datetime import timedelta
from typing import Any, Callable, Optional, Union

from flask import current_app, request
import redis

from app.utils.helpers import JSONEncoder


class CacheManager:
    """
    Redis cache manager for application-wide caching.
    Supports Cache-Aside pattern with TTL.
    """
    
    def __init__(self, redis_client: redis.Redis = None):
        self._client = redis_client
        self.default_ttl = 300  # 5 minutes
        self.prefix = 'sc:'  # student coaching prefix
    
    @property
    def client(self) -> redis.Redis:
        """Lazy initialization of Redis client."""
        if self._client is None:
            redis_url = current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
            self._client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=1.0,
                retry_on_timeout=False
            )
        return self._client
    
    def _make_key(self, key: str) -> str:
        """Generate prefixed cache key."""
        return f"{self.prefix}{key}"
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            cached_key = self._make_key(key)
            data = self.client.get(cached_key)
            if data:
                return json.loads(data)
            return None
        except (redis.RedisError, json.JSONDecodeError) as e:
            current_app.logger.warning(f"Cache get error: {e}")
            return None
    
    def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None
    ) -> bool:
        """Set value in cache with TTL."""
        try:
            cached_key = self._make_key(key)
            ttl = ttl or self.default_ttl
            serialized = json.dumps(value, cls=JSONEncoder)
            return self.client.setex(cached_key, ttl, serialized)
        except (redis.RedisError, TypeError) as e:
            current_app.logger.warning(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from cache."""
        try:
            cached_key = self._make_key(key)
            return bool(self.client.delete(cached_key))
        except redis.RedisError as e:
            current_app.logger.warning(f"Cache delete error: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        try:
            full_pattern = self._make_key(pattern)
            keys = self.client.keys(full_pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except redis.RedisError as e:
            current_app.logger.warning(f"Cache delete pattern error: {e}")
            return 0
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            cached_key = self._make_key(key)
            return bool(self.client.exists(cached_key))
        except redis.RedisError:
            return False
    
    def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment a counter in cache."""
        try:
            cached_key = self._make_key(key)
            return self.client.incr(cached_key, amount)
        except redis.RedisError:
            return None
    
    def expire(self, key: str, ttl: int) -> bool:
        """Set expiration on existing key."""
        try:
            cached_key = self._make_key(key)
            return self.client.expire(cached_key, ttl)
        except redis.RedisError:
            return False


# Global cache instance
cache_manager = CacheManager()


def cached(
    ttl: int = 300,
    key_prefix: str = None,
    key_builder: Callable = None,
    unless: Callable = None
):
    """
    Cache decorator for functions/methods.
    
    Args:
        ttl: Time to live in seconds (default: 5 minutes)
        key_prefix: Static prefix for cache key
        key_builder: Custom function to build cache key
        unless: Function that returns True to skip caching
    
    Usage:
        @cached(ttl=60, key_prefix='course_list')
        def get_courses(page=1):
            return Course.query.paginate(page=page)
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Check if caching should be skipped
            if unless and unless():
                return func(*args, **kwargs)
            
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                prefix = key_prefix or func.__name__
                # Create unique key from args
                key_parts = [prefix]
                key_parts.extend(str(arg) for arg in args[1:])  # Skip self
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = ':'.join(key_parts)
            
            # Try to get from cache
            cached_value = cache_manager.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


def cache_response(
    ttl: int = 300,
    key_prefix: str = None,
    vary_on_user: bool = False,
    vary_on_query: bool = True
):
    """
    Cache decorator specifically for Flask route responses.
    
    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache key
        vary_on_user: Include user ID in cache key
        vary_on_query: Include query params in cache key
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
            
            # Build cache key
            parts = [key_prefix or func.__name__]
            parts.append(request.path)
            
            if vary_on_query and request.query_string:
                query_hash = hashlib.md5(request.query_string).hexdigest()[:8]
                parts.append(query_hash)
            
            if vary_on_user:
                try:
                    verify_jwt_in_request(optional=True)
                    user_id = get_jwt_identity()
                    if user_id:
                        parts.append(f"u{user_id}")
                except:
                    pass
            
            cache_key = ':'.join(parts)
            
            # Check cache
            cached_response = cache_manager.get(cache_key)
            if cached_response is not None:
                return cached_response
            
            # Get fresh response
            response = func(*args, **kwargs)
            
            # Cache successful responses only
            if isinstance(response, tuple):
                data, status_code = response[0], response[1] if len(response) > 1 else 200
            else:
                data, status_code = response, 200
            
            if 200 <= status_code < 300:
                cache_manager.set(cache_key, data, ttl)
            
            return response
        return wrapper
    return decorator


def invalidate_cache(*patterns: str):
    """
    Decorator to invalidate cache patterns after function execution.
    
    Usage:
        @invalidate_cache('courses:*', 'user:123:enrollments')
        def enroll_user(user_id, course_id):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            
            # Invalidate cache patterns
            for pattern in patterns:
                cache_manager.delete_pattern(pattern)
            
            return result
        return wrapper
    return decorator


class CacheKeys:
    """
    Centralized cache key definitions.
    Prevents typos and provides documentation.
    """
    
    # User related
    USER_PROFILE = "user:{user_id}:profile"
    USER_ENROLLMENTS = "user:{user_id}:enrollments"
    USER_PROGRESS = "user:{user_id}:progress"
    
    # Course related
    COURSE_DETAIL = "course:{course_id}:detail"
    COURSE_VIDEOS = "course:{course_id}:videos"
    COURSE_LIST = "courses:list:page:{page}"
    COURSE_CATEGORIES = "courses:categories"
    
    # Video related
    VIDEO_DETAIL = "video:{video_id}:detail"
    VIDEO_METADATA = "video:{video_id}:metadata"
    
    # Exam related
    EXAM_DETAIL = "exam:{exam_id}:detail"
    EXAM_QUESTIONS = "exam:{exam_id}:questions"
    
    # Session related
    LIVE_SESSIONS = "live_sessions:upcoming"
    
    @classmethod
    def format(cls, key_template: str, **kwargs) -> str:
        """Format cache key with values."""
        return key_template.format(**kwargs)
