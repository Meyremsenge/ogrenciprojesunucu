"""
Authorization Guards Module.

Yetkilendirme zaaflarını önlemek için araçlar.
Senior Software Reviewer perspektifinden hazırlanmıştır.

Kapsanan Alanlar:
    - RBAC güçlendirme
    - Resource ownership kontrolü
    - Horizontal/Vertical privilege escalation
    - IDOR (Insecure Direct Object Reference) koruması
    - Permission inheritance
"""

import logging
from typing import Any, Callable, Dict, List, Optional, Set, TypeVar
from functools import wraps
from enum import Enum

from flask import g, request

logger = logging.getLogger(__name__)

F = TypeVar('F', bound=Callable[..., Any])


# =============================================================================
# 1. ROLE HIERARCHY
# =============================================================================

class RoleLevel(Enum):
    """
    Rol seviyeleri - hiyerarşik yapı.
    
    Yüksek seviye roller alt seviye izinlere sahiptir.
    """
    GUEST = 0
    STUDENT = 10
    TEACHER = 20
    ADMIN = 30
    SUPER_ADMIN = 40


ROLE_HIERARCHY = {
    'guest': RoleLevel.GUEST,
    'student': RoleLevel.STUDENT,
    'teacher': RoleLevel.TEACHER,
    'admin': RoleLevel.ADMIN,
    'super_admin': RoleLevel.SUPER_ADMIN,
}


def get_role_level(role: str) -> RoleLevel:
    """Rol seviyesini döndürür."""
    return ROLE_HIERARCHY.get(role.lower(), RoleLevel.GUEST)


def has_role_level(user_role: str, required_role: str) -> bool:
    """
    Kullanıcının gerekli rol seviyesine sahip olup olmadığını kontrol eder.
    
    RİSK: Yanlış rol karşılaştırması privilege escalation'a yol açar.
    """
    user_level = get_role_level(user_role)
    required_level = get_role_level(required_role)
    return user_level.value >= required_level.value


# =============================================================================
# 2. PERMISSION MATRIX
# =============================================================================

class Permission:
    """Permission string yapısı: resource:action"""
    
    # Resource tipleri
    USERS = 'users'
    COURSES = 'courses'
    EXAMS = 'exams'
    QUESTIONS = 'questions'
    CONTENTS = 'contents'
    EVALUATIONS = 'evaluations'
    ANALYTICS = 'analytics'
    SYSTEM = 'system'
    
    # Action tipleri
    CREATE = 'create'
    READ = 'read'
    UPDATE = 'update'
    DELETE = 'delete'
    LIST = 'list'
    MANAGE = 'manage'
    EXPORT = 'export'
    IMPORT = 'import'
    
    @classmethod
    def make(cls, resource: str, action: str) -> str:
        """Permission string oluşturur."""
        return f'{resource}:{action}'


# Rol bazlı izin matrisi
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    'guest': set(),
    
    'student': {
        Permission.make(Permission.COURSES, Permission.READ),
        Permission.make(Permission.COURSES, Permission.LIST),
        Permission.make(Permission.CONTENTS, Permission.READ),
        Permission.make(Permission.EXAMS, Permission.READ),
        Permission.make(Permission.EVALUATIONS, Permission.READ),
    },
    
    'teacher': {
        # Student permissions
        Permission.make(Permission.COURSES, Permission.READ),
        Permission.make(Permission.COURSES, Permission.LIST),
        Permission.make(Permission.CONTENTS, Permission.READ),
        Permission.make(Permission.EXAMS, Permission.READ),
        Permission.make(Permission.EVALUATIONS, Permission.READ),
        # Teacher-specific
        Permission.make(Permission.COURSES, Permission.CREATE),
        Permission.make(Permission.COURSES, Permission.UPDATE),
        Permission.make(Permission.CONTENTS, Permission.CREATE),
        Permission.make(Permission.CONTENTS, Permission.UPDATE),
        Permission.make(Permission.CONTENTS, Permission.DELETE),
        Permission.make(Permission.EXAMS, Permission.CREATE),
        Permission.make(Permission.EXAMS, Permission.UPDATE),
        Permission.make(Permission.QUESTIONS, Permission.CREATE),
        Permission.make(Permission.QUESTIONS, Permission.UPDATE),
        Permission.make(Permission.QUESTIONS, Permission.DELETE),
        Permission.make(Permission.EVALUATIONS, Permission.CREATE),
        Permission.make(Permission.EVALUATIONS, Permission.UPDATE),
        Permission.make(Permission.ANALYTICS, Permission.READ),
    },
    
    'admin': {
        # All teacher permissions + admin
        Permission.make(Permission.USERS, Permission.LIST),
        Permission.make(Permission.USERS, Permission.READ),
        Permission.make(Permission.USERS, Permission.CREATE),
        Permission.make(Permission.USERS, Permission.UPDATE),
        Permission.make(Permission.COURSES, Permission.MANAGE),
        Permission.make(Permission.EXAMS, Permission.MANAGE),
        Permission.make(Permission.CONTENTS, Permission.MANAGE),
        Permission.make(Permission.ANALYTICS, Permission.EXPORT),
    },
    
    'super_admin': {
        # Tüm izinler
        Permission.make(Permission.USERS, Permission.MANAGE),
        Permission.make(Permission.SYSTEM, Permission.MANAGE),
    }
}


def get_role_permissions(role: str) -> Set[str]:
    """
    Rolün tüm izinlerini döndürür (inheritance dahil).
    """
    role_lower = role.lower()
    permissions = set()
    
    # Rol hiyerarşisine göre izinleri topla
    for r, level in ROLE_HIERARCHY.items():
        if level.value <= get_role_level(role_lower).value:
            permissions.update(ROLE_PERMISSIONS.get(r, set()))
    
    return permissions


def has_permission(user_role: str, required_permission: str) -> bool:
    """
    Kullanıcının gerekli izne sahip olup olmadığını kontrol eder.
    """
    permissions = get_role_permissions(user_role)
    
    # Direkt izin kontrolü
    if required_permission in permissions:
        return True
    
    # MANAGE izni tüm alt izinleri kapsar
    resource = required_permission.split(':')[0]
    manage_perm = Permission.make(resource, Permission.MANAGE)
    if manage_perm in permissions:
        return True
    
    return False


# =============================================================================
# 3. IDOR (Insecure Direct Object Reference) KORUMALARI
# =============================================================================

class IDORGuard:
    """
    IDOR saldırılarını önler.
    
    RİSK: Kullanıcıların ID tahmin ederek başkalarının
          verilerine erişmesi.
    
    ÖNLEM:
        - Resource ownership kontrolü
        - UUID kullanımı
        - Access control her endpoint'te
    """
    
    @staticmethod
    def check_ownership(
        resource: Any,
        user_id: int,
        owner_field: str = 'user_id'
    ) -> bool:
        """
        Kullanıcının resource'un sahibi olup olmadığını kontrol eder.
        """
        if not resource:
            return False
        
        owner_id = getattr(resource, owner_field, None)
        return owner_id == user_id
    
    @staticmethod
    def check_ownership_or_role(
        resource: Any,
        user_id: int,
        user_role: str,
        allowed_roles: List[str],
        owner_field: str = 'user_id'
    ) -> bool:
        """
        Kullanıcının sahibi olup olmadığını veya gerekli role sahip
        olup olmadığını kontrol eder.
        """
        # Rol kontrolü
        if user_role in allowed_roles:
            return True
        
        # Ownership kontrolü
        return IDORGuard.check_ownership(resource, user_id, owner_field)
    
    @staticmethod
    def filter_by_ownership(query, user_id: int, owner_field: str = 'user_id'):
        """
        Query'yi ownership'e göre filtreler.
        
        Bu fonksiyon SQLAlchemy query'leri için kullanılır.
        """
        # Bu method model-specific olmalı, burada genel pattern
        return query.filter_by(**{owner_field: user_id})


def require_ownership(owner_field: str = 'user_id', admin_bypass: bool = True):
    """
    Resource ownership kontrolü yapan decorator.
    
    RİSK: Ownership kontrolü olmadan kullanıcılar
          başkalarının verilerine erişebilir.
    
    Args:
        owner_field: Resource'taki owner alanının adı
        admin_bypass: Admin'ler bypass edebilir mi
    """
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # g.resource decorator zincirinde set edilmiş olmalı
            resource = getattr(g, 'resource', None)
            current_user = getattr(g, 'current_user', None)
            user_role = getattr(g, 'user_role', 'guest')
            
            if not current_user:
                from app.core.exceptions import AuthenticationError
                raise AuthenticationError('Oturum açmanız gerekiyor')
            
            # Admin bypass
            if admin_bypass and user_role in ['admin', 'super_admin']:
                return func(*args, **kwargs)
            
            # Ownership kontrolü
            if resource:
                if not IDORGuard.check_ownership(resource, current_user.id, owner_field):
                    from app.core.exceptions import AuthorizationError
                    logger.warning(
                        f'IDOR_ATTEMPT: User {current_user.id} tried to access '
                        f'resource owned by {getattr(resource, owner_field, "unknown")}'
                    )
                    raise AuthorizationError('Bu kaynağa erişim yetkiniz yok')
            
            return func(*args, **kwargs)
        return wrapper  # type: ignore
    return decorator


# =============================================================================
# 4. PRIVILEGE ESCALATION KORUMALARI
# =============================================================================

class PrivilegeGuard:
    """
    Privilege escalation saldırılarını önler.
    
    RİSK:
        - Horizontal: Aynı seviyede başka kullanıcının yetkilerini alma
        - Vertical: Daha yüksek yetki seviyesine çıkma
    
    ÖNLEM:
        - Rol değişikliklerini izle
        - Self-elevation'ı engelle
        - Audit log tut
    """
    
    @staticmethod
    def can_modify_role(
        actor_role: str,
        target_current_role: str,
        target_new_role: str
    ) -> bool:
        """
        Kullanıcının başka bir kullanıcının rolünü değiştirip
        değiştiremeyeceğini kontrol eder.
        """
        actor_level = get_role_level(actor_role)
        current_level = get_role_level(target_current_role)
        new_level = get_role_level(target_new_role)
        
        # Kendi seviyesinden yükseğe çıkaramaz
        if new_level.value >= actor_level.value:
            return False
        
        # Kendi seviyesindeki veya üstündeki birini değiştiremez
        if current_level.value >= actor_level.value:
            return False
        
        return True
    
    @staticmethod
    def can_access_user_data(
        actor_role: str,
        actor_id: int,
        target_role: str,
        target_id: int
    ) -> bool:
        """
        Kullanıcının başka bir kullanıcının verilerine erişip
        erişemeyeceğini kontrol eder.
        """
        # Kendi verilerine her zaman erişebilir
        if actor_id == target_id:
            return True
        
        actor_level = get_role_level(actor_role)
        target_level = get_role_level(target_role)
        
        # Kendi seviyesinden yüksek birine erişemez
        if target_level.value >= actor_level.value:
            return False
        
        return True
    
    @staticmethod
    def check_self_elevation(user_id: int, actor_id: int) -> bool:
        """Self-elevation denemesini kontrol eder."""
        return user_id == actor_id


def prevent_self_elevation(target_id_param: str = 'user_id'):
    """
    Kullanıcının kendi yetkilerini değiştirmesini engelleyen decorator.
    
    RİSK: Kullanıcı kendi rolünü admin yapabilir.
    """
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args, **kwargs):
            current_user = getattr(g, 'current_user', None)
            
            if not current_user:
                return func(*args, **kwargs)
            
            # URL parametresinden veya request body'den target_id al
            target_id = kwargs.get(target_id_param)
            if target_id is None and request.is_json:
                target_id = request.get_json(silent=True).get(target_id_param)
            
            if target_id and int(target_id) == current_user.id:
                # Super admin hariç
                if getattr(g, 'user_role', '') != 'super_admin':
                    from app.core.exceptions import AuthorizationError
                    logger.warning(
                        f'SELF_ELEVATION_ATTEMPT: User {current_user.id} '
                        f'tried to modify their own privileges'
                    )
                    raise AuthorizationError(
                        'Kendi yetki ayarlarınızı değiştiremezsiniz'
                    )
            
            return func(*args, **kwargs)
        return wrapper  # type: ignore
    return decorator


# =============================================================================
# 5. RESOURCE ACCESS CONTROL
# =============================================================================

class ResourceAccessControl:
    """
    Resource bazlı erişim kontrolü.
    
    Farklı resource tipleri için farklı erişim kuralları.
    """
    
    # Resource erişim kuralları
    ACCESS_RULES: Dict[str, Dict[str, Any]] = {
        'course': {
            'public_read': True,  # Herkese açık okuma
            'enrolled_only': ['contents', 'exams'],  # Kayıtlı öğrenciler
            'owner_only': ['delete', 'settings'],  # Sadece owner
        },
        'exam': {
            'public_read': False,
            'enrolled_only': ['take', 'view_results'],
            'owner_only': ['edit', 'delete', 'view_all_results'],
        },
        'user_profile': {
            'public_read': False,
            'self_only': ['edit', 'delete'],
            'admin_only': ['view_private', 'manage'],
        }
    }
    
    @classmethod
    def can_access(
        cls,
        resource_type: str,
        action: str,
        user_id: Optional[int],
        user_role: str,
        resource: Any = None
    ) -> bool:
        """
        Resource'a erişim kontrolü yapar.
        """
        rules = cls.ACCESS_RULES.get(resource_type, {})
        
        # Public read kontrolü
        if action == 'read' and rules.get('public_read', False):
            return True
        
        # Login gerekli
        if user_id is None:
            return False
        
        # Owner kontrolü
        if action in rules.get('owner_only', []):
            if resource:
                owner_id = getattr(resource, 'user_id', None) or getattr(resource, 'owner_id', None)
                if owner_id != user_id:
                    return user_role in ['admin', 'super_admin']
        
        # Admin kontrolü
        if action in rules.get('admin_only', []):
            return user_role in ['admin', 'super_admin']
        
        # Self kontrolü
        if action in rules.get('self_only', []):
            if resource:
                resource_user_id = getattr(resource, 'id', None) or getattr(resource, 'user_id', None)
                return resource_user_id == user_id or user_role in ['admin', 'super_admin']
        
        return True


# =============================================================================
# 6. AUTHORIZATION AUDIT
# =============================================================================

class AuthorizationAudit:
    """
    Yetkilendirme kararlarını loglar.
    """
    
    @staticmethod
    def log_access_decision(
        user_id: Optional[int],
        user_role: str,
        resource_type: str,
        resource_id: Any,
        action: str,
        allowed: bool,
        reason: str = ''
    ) -> None:
        """Erişim kararını loglar."""
        log_data = {
            'user_id': user_id,
            'user_role': user_role,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'action': action,
            'allowed': allowed,
            'reason': reason,
            'ip_address': request.remote_addr if request else None,
        }
        
        if allowed:
            logger.info(f'ACCESS_GRANTED: {resource_type}:{action}', extra=log_data)
        else:
            logger.warning(f'ACCESS_DENIED: {resource_type}:{action}', extra=log_data)


# =============================================================================
# 7. AUTHORIZATION HEALTH CHECK
# =============================================================================

def authorization_health_check() -> Dict[str, Any]:
    """
    Yetkilendirme konfigürasyonunu kontrol eder.
    """
    issues = []
    warnings = []
    
    # 1. Boş permission set kontrolü
    for role, perms in ROLE_PERMISSIONS.items():
        if role != 'guest' and len(perms) == 0:
            warnings.append({
                'type': 'EMPTY_PERMISSIONS',
                'role': role,
                'message': f'{role} role has no permissions defined',
                'severity': 'MEDIUM'
            })
    
    # 2. Super admin'in tüm izinlere sahip olduğunu kontrol et
    super_admin_perms = get_role_permissions('super_admin')
    admin_perms = get_role_permissions('admin')
    
    missing_in_super = admin_perms - super_admin_perms
    if missing_in_super:
        issues.append({
            'type': 'PERMISSION_HIERARCHY_BROKEN',
            'message': f'Super admin missing permissions that admin has: {missing_in_super}',
            'severity': 'HIGH'
        })
    
    return {
        'status': 'FAIL' if issues else 'PASS',
        'roles_count': len(ROLE_HIERARCHY),
        'issues': issues,
        'warnings': warnings,
    }


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    'RoleLevel',
    'ROLE_HIERARCHY',
    'get_role_level',
    'has_role_level',
    'Permission',
    'ROLE_PERMISSIONS',
    'get_role_permissions',
    'has_permission',
    'IDORGuard',
    'require_ownership',
    'PrivilegeGuard',
    'prevent_self_elevation',
    'ResourceAccessControl',
    'AuthorizationAudit',
    'authorization_health_check',
]
