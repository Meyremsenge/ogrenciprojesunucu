"""
Core package - Temel altyapı bileşenleri.

Bu paket tüm modüller tarafından kullanılan çekirdek bileşenleri içerir.
Core bileşenler hiçbir modüle bağımlı olmamalıdır.

Modules:
    - exceptions: Özel exception sınıfları
    - responses: Standart API response formatları
    - decorators: Utility dekoratörler
    - permissions: RBAC yetkilendirme sistemi
    - audit: Audit logging sistemi
    - pagination: Sayfalama utilities
    - security: Güvenlik utilities
    - jwt_service: JWT token yönetimi
    - token_blacklist: Token iptal sistemi
    - auth: Authentication ve authorization decoratorları
"""

from app.core.exceptions import (
    AppException,
    ValidationError,
    NotFoundError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    RateLimitError,
    QuotaExceededError,
    ExternalServiceError,
    BusinessLogicError,
    DatabaseError,
)

from app.core.responses import (
    success_response,
    error_response,
    paginated_response,
    created_response,
    no_content_response,
    validation_error_response,
    cursor_paginated_response,
    # Kısayollar
    ok,
    created,
    bad_request,
    unauthorized,
    forbidden,
    not_found,
    conflict,
    too_many_requests,
    internal_error,
)

from app.core.decorators import (
    validate_json,
    handle_exceptions,
    log_execution_time,
    cache_response,
    rate_limit,
    deprecated,
)

from app.core.permissions import (
    Permission,
    RoleLevel,
    require_auth,
    require_role,
    require_role_level,
    require_permission,
    require_permissions,
    require_any_permission,
    require_owner_or_role,
    require_course_access,
    check_permission,
    check_role,
    check_role_level,
    check_ownership,
    get_current_user,
    get_current_user_id,
    get_current_user_role,
    get_role_permissions,
    ROLE_PERMISSIONS,
)

from app.core.audit import (
    AuditLog,
    AuditAction,
    AuditStatus,
    AuditSeverity,
    AuditService,
    audit_log,
    audit_create,
    audit_update,
    audit_delete,
)

from app.core.jwt_service import (
    JWTService,
    TokenType,
    TokenPayload,
    TokenPair,
)

from app.core.token_blacklist import (
    TokenBlacklistService,
    check_if_token_revoked,
)

from app.core.auth import (
    require_auth as require_jwt_auth,
    require_fresh_auth,
    require_verified_email,
    require_self_or_admin,
    get_current_user as get_jwt_user,
    has_role,
    has_permission,
    is_admin,
    is_owner,
)

# Anti-Pattern Prevention Modules
from app.core.security_checks import (
    SecretKeyValidator,
    SQLInjectionGuard,
    XSSGuard,
    BruteForceProtection,
    InputValidator,
    SecurityAuditLogger,
    SensitiveDataMasker,
    security_health_check,
)

from app.core.performance_guards import (
    QueryMonitor,
    MemoryGuard,
    CacheHelper,
    cached,
    timed,
    batch_process,
    performance_health_check,
)

from app.core.authorization_guards import (
    IDORGuard,
    PrivilegeGuard,
    require_ownership,
    prevent_self_elevation,
    authorization_health_check,
)

from app.core.database_guards import (
    IndexAnalyzer,
    QueryOptimizer,
    SchemaValidator,
    database_health_check,
)

__all__ = [
    # === Exceptions ===
    'AppException',
    'ValidationError',
    'NotFoundError',
    'AuthenticationError',
    'AuthorizationError',
    'ConflictError',
    'RateLimitError',
    'ExternalServiceError',
    'BusinessLogicError',
    'DatabaseError',
    
    # === Responses ===
    'success_response',
    'error_response',
    'paginated_response',
    'created_response',
    'no_content_response',
    'validation_error_response',
    'cursor_paginated_response',
    # Kısayollar
    'ok',
    'created',
    'bad_request',
    'unauthorized',
    'forbidden',
    'not_found',
    'conflict',
    'too_many_requests',
    'internal_error',
    
    # === Decorators ===
    'validate_json',
    'handle_exceptions',
    'log_execution_time',
    'cache_response',
    'rate_limit',
    'deprecated',
    
    # === Permissions ===
    'Permission',
    'RoleLevel',
    'require_auth',
    'require_role',
    'require_role_level',
    'require_permission',
    'require_permissions',
    'require_any_permission',
    'require_owner_or_role',
    'require_course_access',
    'check_permission',
    'check_role',
    'check_role_level',
    'check_ownership',
    'get_current_user',
    'get_current_user_id',
    'get_current_user_role',
    'get_role_permissions',
    'ROLE_PERMISSIONS',
    
    # === Audit ===
    'AuditLog',
    'AuditAction',
    'AuditStatus',
    'AuditSeverity',
    'AuditService',
    'audit_log',
    'audit_create',
    'audit_update',
    'audit_delete',
    
    # === JWT Service ===
    'JWTService',
    'TokenType',
    'TokenPayload',
    'TokenPair',
    
    # === Token Blacklist ===
    'TokenBlacklistService',
    'check_if_token_revoked',
    
    # === Auth Decorators ===
    'require_jwt_auth',
    'require_fresh_auth',
    'require_verified_email',
    'require_self_or_admin',
    'get_jwt_user',
    'has_role',
    'has_permission',
    'is_admin',
    'is_owner',
    
    # === Security Guards (Anti-Pattern Prevention) ===
    'SecretKeyValidator',
    'SQLInjectionGuard',
    'XSSGuard',
    'BruteForceProtection',
    'InputValidator',
    'SecurityAuditLogger',
    'SensitiveDataMasker',
    'security_health_check',
    
    # === Performance Guards ===
    'QueryMonitor',
    'MemoryGuard',
    'CacheHelper',
    'cached',
    'timed',
    'batch_process',
    'performance_health_check',
    
    # === Authorization Guards ===
    'IDORGuard',
    'PrivilegeGuard',
    'require_ownership',
    'prevent_self_elevation',
    'authorization_health_check',
    
    # === Database Guards ===
    'IndexAnalyzer',
    'QueryOptimizer',
    'SchemaValidator',
    'database_health_check',
]
