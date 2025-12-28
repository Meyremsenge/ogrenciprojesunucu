"""Utilities package."""

from app.utils.exceptions import (
    AppException,
    ValidationError,
    NotFoundError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    RateLimitError,
    ExternalServiceError,
)

from app.utils.helpers import (
    slugify,
    format_duration,
    format_file_size,
    paginate_list,
    safe_json_loads,
    JSONEncoder,
    calculate_percentage,
    truncate_string,
    get_client_ip,
    mask_email,
    generate_random_string,
)

from app.utils.cache import (
    CacheManager,
    cache_manager,
    cached,
    cache_response,
    invalidate_cache,
    CacheKeys,
)

from app.utils.rate_limiter import (
    RateLimiter,
    rate_limiter,
    rate_limit,
    RateLimitPresets,
)

__all__ = [
    # Exceptions
    'AppException',
    'ValidationError',
    'NotFoundError',
    'AuthenticationError',
    'AuthorizationError',
    'ConflictError',
    'RateLimitError',
    'ExternalServiceError',
    
    # Helpers
    'slugify',
    'format_duration',
    'format_file_size',
    'paginate_list',
    'safe_json_loads',
    'JSONEncoder',
    'calculate_percentage',
    'truncate_string',
    'get_client_ip',
    'mask_email',
    'generate_random_string',
    
    # Cache
    'CacheManager',
    'cache_manager',
    'cached',
    'cache_response',
    'invalidate_cache',
    'CacheKeys',
    
    # Rate Limiter
    'RateLimiter',
    'rate_limiter',
    'rate_limit',
    'RateLimitPresets',
]
