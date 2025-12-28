"""
Authentication Decorators.

Güvenlik odaklı authentication ve authorization decorator'ları.
JWT doğrulama, rol kontrolü ve permission yönetimi.

Security Features:
    - JWT token doğrulama
    - Role-based access control (RBAC)
    - Permission-based access control
    - Owner kontrolü
    - Audit logging entegrasyonu

Kullanım:
    from app.core.auth import (
        require_auth, require_role, require_permission,
        require_owner_or_admin, require_verified_email
    )
    
    @app.route('/admin')
    @require_auth
    @require_role('admin', 'super_admin')
    def admin_dashboard():
        ...
    
    @app.route('/courses/<int:course_id>')
    @require_auth
    @require_permission('courses:update')
    def update_course(course_id):
        ...
"""

from functools import wraps
from typing import Callable, List, Optional, Union, Any
import logging

from flask import g, request, current_app, has_request_context
from flask_jwt_extended import (
    verify_jwt_in_request,
    get_jwt_identity,
    get_jwt,
    get_current_user
)

from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.jwt_service import JWTService
from app.core.permissions import Permission, ROLE_PERMISSIONS, RoleLevel

logger = logging.getLogger(__name__)


# =========================================================================
# AUTHENTICATION DECORATORS
# =========================================================================

def require_auth(f: Callable = None, *, optional: bool = False, fresh: bool = False):
    """
    JWT authentication zorunlu kılar.
    
    Args:
        optional: Token yoksa hata vermez (anonymous erişim)
        fresh: Fresh token gerektirir (hassas işlemler için)
    
    Example:
        @require_auth
        def protected_route():
            user = g.current_user
            ...
        
        @require_auth(fresh=True)
        def change_password():
            # Son login'den kısa süre geçmiş olmalı
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                if fresh:
                    verify_jwt_in_request(fresh=True)
                else:
                    verify_jwt_in_request(optional=optional)
                
                # Kullanıcıyı g'ye ekle
                user = get_current_user()
                if user:
                    g.current_user = user
                    g.current_user_id = user.id
                    g.user_role = get_jwt().get('role', 'student')
                    g.user_permissions = get_jwt().get('permissions', [])
                elif not optional:
                    raise AuthenticationError('Oturum açmanız gerekiyor')
                
            except AuthenticationError:
                raise
            except Exception as e:
                if not optional:
                    logger.warning(f'Authentication failed: {e}')
                    raise AuthenticationError('Geçersiz veya süresi dolmuş token')
            
            return func(*args, **kwargs)
        
        return wrapper
    
    # @require_auth veya @require_auth() kullanımını destekle
    if f is not None:
        return decorator(f)
    return decorator


def require_fresh_auth(f: Callable) -> Callable:
    """
    Fresh (yeni) JWT token zorunlu kılar.
    
    Hassas işlemler için: şifre değiştirme, hesap silme, vb.
    Kullanıcı son birkaç dakika içinde giriş yapmış olmalı.
    """
    return require_auth(f, fresh=True)


def require_verified_email(f: Callable) -> Callable:
    """
    E-posta doğrulaması yapılmış kullanıcı gerektirir.
    
    Example:
        @require_auth
        @require_verified_email
        def create_content():
            # Sadece doğrulanmış kullanıcılar içerik oluşturabilir
            ...
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = getattr(g, 'current_user', None)
        if not user:
            raise AuthenticationError('Oturum açmanız gerekiyor')
        
        if not getattr(user, 'email_verified', False):
            raise AuthorizationError(
                'Bu işlem için e-posta adresinizi doğrulamanız gerekiyor'
            )
        
        return f(*args, **kwargs)
    
    return wrapper


def require_active_user(f: Callable) -> Callable:
    """
    Aktif kullanıcı gerektirir.
    
    Devre dışı bırakılmış hesapları engeller.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = getattr(g, 'current_user', None)
        if not user:
            raise AuthenticationError('Oturum açmanız gerekiyor')
        
        if not getattr(user, 'is_active', True):
            raise AuthorizationError('Hesabınız devre dışı bırakılmış')
        
        return f(*args, **kwargs)
    
    return wrapper


# =========================================================================
# ROLE-BASED ACCESS CONTROL (RBAC) DECORATORS
# =========================================================================

def require_role(*allowed_roles: str):
    """
    Belirli rollere sahip kullanıcıları gerektirir.
    
    Args:
        *allowed_roles: İzin verilen roller
    
    Example:
        @require_auth
        @require_role('admin', 'super_admin')
        def admin_only():
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user_role = getattr(g, 'user_role', None)
            
            if not user_role:
                claims = get_jwt()
                user_role = claims.get('role', 'student')
            
            if user_role not in allowed_roles:
                logger.warning(
                    f'Role check failed: user_role={user_role}, '
                    f'required={allowed_roles}'
                )
                raise AuthorizationError(
                    f'Bu işlem için gerekli rol: {", ".join(allowed_roles)}'
                )
            
            return f(*args, **kwargs)
        
        return wrapper
    
    return decorator


def require_role_level(min_level: Union[RoleLevel, int]):
    """
    Minimum rol seviyesi gerektirir.
    
    Rol hiyerarşisi: guest(0) < student(1) < teacher(2) < admin(3) < super_admin(4)
    
    Args:
        min_level: Minimum gerekli rol seviyesi
    
    Example:
        @require_auth
        @require_role_level(RoleLevel.TEACHER)
        def teacher_and_above():
            # teacher, admin, super_admin erişebilir
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user_role = getattr(g, 'user_role', 'student')
            
            # Rol seviyesini belirle
            role_levels = {
                'guest': RoleLevel.GUEST,
                'student': RoleLevel.STUDENT,
                'teacher': RoleLevel.TEACHER,
                'admin': RoleLevel.ADMIN,
                'super_admin': RoleLevel.SUPER_ADMIN
            }
            
            user_level = role_levels.get(user_role, RoleLevel.GUEST)
            required_level = min_level if isinstance(min_level, int) else min_level.value
            
            if user_level < required_level:
                raise AuthorizationError('Bu işlem için yetkiniz yok')
            
            return f(*args, **kwargs)
        
        return wrapper
    
    return decorator


def require_admin(f: Callable) -> Callable:
    """Admin veya super_admin rolü gerektirir."""
    return require_role('admin', 'super_admin')(f)


def require_super_admin(f: Callable) -> Callable:
    """Sadece super_admin rolü gerektirir."""
    return require_role('super_admin')(f)


def require_teacher(f: Callable) -> Callable:
    """Teacher veya üstü rol gerektirir."""
    return require_role('teacher', 'admin', 'super_admin')(f)


# =========================================================================
# PERMISSION-BASED ACCESS CONTROL DECORATORS
# =========================================================================

def require_permission(permission: Union[Permission, str]):
    """
    Belirli bir permission gerektirir.
    
    Args:
        permission: Gerekli permission
    
    Example:
        @require_auth
        @require_permission('courses:publish')
        def publish_course():
            ...
        
        @require_auth
        @require_permission(Permission.USERS_CREATE)
        def create_user():
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            perm_value = permission.value if isinstance(permission, Permission) else permission
            
            if not _has_permission(perm_value):
                logger.warning(f'Permission denied: {perm_value}')
                raise AuthorizationError(f'Bu işlem için yetkiniz yok: {perm_value}')
            
            return f(*args, **kwargs)
        
        return wrapper
    
    return decorator


def require_permissions(*permissions: Union[Permission, str]):
    """
    Birden fazla permission gerektirir (AND mantığı).
    
    Tüm permission'lar mevcut olmalı.
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            for perm in permissions:
                perm_value = perm.value if isinstance(perm, Permission) else perm
                
                if not _has_permission(perm_value):
                    raise AuthorizationError(f'Bu işlem için yetkiniz yok: {perm_value}')
            
            return f(*args, **kwargs)
        
        return wrapper
    
    return decorator


def require_any_permission(*permissions: Union[Permission, str]):
    """
    Herhangi bir permission yeterli (OR mantığı).
    
    Permission'lardan en az biri mevcut olmalı.
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            for perm in permissions:
                perm_value = perm.value if isinstance(perm, Permission) else perm
                
                if _has_permission(perm_value):
                    return f(*args, **kwargs)
            
            perm_list = ', '.join(
                p.value if isinstance(p, Permission) else p for p in permissions
            )
            raise AuthorizationError(
                f'Bu işlem için şu yetkilerden biri gerekli: {perm_list}'
            )
        
        return wrapper
    
    return decorator


# =========================================================================
# OWNER-BASED ACCESS CONTROL DECORATORS
# =========================================================================

def require_owner_or_role(
    *allowed_roles: str,
    owner_field: str = 'user_id',
    id_param: str = None
):
    """
    Kaynak sahibi veya belirli rolleri gerektirir.
    
    Kullanıcı ya kaynağın sahibi olmalı ya da belirtilen rollerden birine sahip olmalı.
    
    Args:
        *allowed_roles: Erişebilecek roller
        owner_field: Model'deki owner alanı
        id_param: URL'deki resource ID parametresi
    
    Example:
        @require_auth
        @require_owner_or_role('admin', owner_field='user_id')
        def update_profile(user_id):
            # Kendi profilini veya admin başkasını güncelleyebilir
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                raise AuthenticationError('Oturum açmanız gerekiyor')
            
            user_role = getattr(g, 'user_role', 'student')
            
            # Rol kontrolü
            if user_role in allowed_roles:
                return f(*args, **kwargs)
            
            # Owner kontrolü
            resource_id = kwargs.get(id_param) if id_param else None
            
            # Basit owner kontrolü (URL'deki user_id ile)
            if owner_field == 'user_id' and 'user_id' in kwargs:
                if kwargs['user_id'] == user.id:
                    return f(*args, **kwargs)
            
            # resource_id varsa model'den kontrol et
            if resource_id and hasattr(g, 'resource'):
                resource = g.resource
                owner_id = getattr(resource, owner_field, None)
                if owner_id == user.id:
                    return f(*args, **kwargs)
            
            raise AuthorizationError('Bu kaynağa erişim yetkiniz yok')
        
        return wrapper
    
    return decorator


def require_owner(owner_field: str = 'user_id', id_param: str = None):
    """
    Sadece kaynak sahibini gerektirir.
    
    Args:
        owner_field: Model'deki owner alanı
        id_param: URL'deki resource ID parametresi
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                raise AuthenticationError('Oturum açmanız gerekiyor')
            
            # URL'deki user_id kontrolü
            if 'user_id' in kwargs and kwargs['user_id'] == user.id:
                return f(*args, **kwargs)
            
            # g.resource kontrolü
            if hasattr(g, 'resource'):
                owner_id = getattr(g.resource, owner_field, None)
                if owner_id == user.id:
                    return f(*args, **kwargs)
            
            raise AuthorizationError('Sadece kaynak sahibi erişebilir')
        
        return wrapper
    
    return decorator


def require_owner_or_admin(owner_field: str = 'user_id'):
    """Kaynak sahibi veya admin gerektirir."""
    return require_owner_or_role('admin', 'super_admin', owner_field=owner_field)


# =========================================================================
# SPECIAL ACCESS DECORATORS
# =========================================================================

def require_self_or_admin(id_param: str = 'user_id'):
    """
    Kendisi veya admin gerektirir.
    
    Kullanıcı profil işlemleri için kullanışlı.
    
    Example:
        @require_auth
        @require_self_or_admin('user_id')
        def get_user(user_id):
            # Kullanıcı kendi profilini veya admin başkasını görebilir
            ...
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                raise AuthenticationError('Oturum açmanız gerekiyor')
            
            target_id = kwargs.get(id_param)
            user_role = getattr(g, 'user_role', 'student')
            
            # Kendisi mi?
            if target_id and int(target_id) == user.id:
                return f(*args, **kwargs)
            
            # Admin mi?
            if user_role in ('admin', 'super_admin'):
                return f(*args, **kwargs)
            
            raise AuthorizationError('Sadece kendi bilgilerinize erişebilirsiniz')
        
        return wrapper
    
    return decorator


def require_course_access(permission_type: str = 'read'):
    """
    Kurs erişim yetkisi gerektirir.
    
    Args:
        permission_type: read, write, manage
    
    Kontroller:
        - Kurs sahibi (teacher)
        - Kayıtlı öğrenci (enrolled)
        - Admin
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                raise AuthenticationError('Oturum açmanız gerekiyor')
            
            course_id = kwargs.get('course_id')
            if not course_id:
                return f(*args, **kwargs)
            
            user_role = getattr(g, 'user_role', 'student')
            
            # Admin her zaman erişebilir
            if user_role in ('admin', 'super_admin'):
                return f(*args, **kwargs)
            
            # Kurs erişim kontrolü
            from app.modules.courses.models import Course, Enrollment
            
            course = Course.query.get(course_id)
            if not course:
                from app.core.exceptions import NotFoundError
                raise NotFoundError('Kurs', course_id)
            
            # Kurs sahibi
            if course.teacher_id == user.id:
                return f(*args, **kwargs)
            
            # Kayıtlı öğrenci (sadece read için)
            if permission_type == 'read':
                enrollment = Enrollment.query.filter_by(
                    course_id=course_id,
                    student_id=user.id,
                    status='active'
                ).first()
                
                if enrollment:
                    return f(*args, **kwargs)
            
            raise AuthorizationError('Bu kursa erişim yetkiniz yok')
        
        return wrapper
    
    return decorator


# =========================================================================
# HELPER FUNCTIONS
# =========================================================================

def _has_permission(permission: str) -> bool:
    """
    Mevcut kullanıcının belirli bir permission'a sahip olup olmadığını kontrol eder.
    """
    # g.user_permissions'tan kontrol
    user_permissions = getattr(g, 'user_permissions', None)
    
    if user_permissions is None:
        # JWT'den al
        try:
            claims = get_jwt()
            user_permissions = claims.get('permissions', [])
        except Exception:
            user_permissions = []
    
    # Permission kontrolü
    if permission in user_permissions:
        return True
    
    # Rol bazlı permission kontrolü
    user_role = getattr(g, 'user_role', None)
    if user_role is None:
        try:
            claims = get_jwt()
            user_role = claims.get('role', 'student')
        except Exception:
            user_role = 'student'
    
    # Super admin her şeye erişebilir
    if user_role == 'super_admin':
        return True
    
    # Rol permission'larını kontrol et
    role_perms = ROLE_PERMISSIONS.get(user_role, [])
    return any(
        (p.value if isinstance(p, Permission) else p) == permission
        for p in role_perms
    )


def get_current_user():
    """
    Mevcut oturum açmış kullanıcıyı döner.
    
    Returns:
        User instance veya None
    """
    if hasattr(g, 'current_user'):
        return g.current_user
    
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        
        if user_id:
            from app.modules.users.models import User
            user = User.query.filter_by(id=user_id, is_active=True).first()
            g.current_user = user
            return user
    except Exception:
        pass
    
    return None


def get_current_user_id() -> Optional[int]:
    """Mevcut kullanıcı ID'sini döner."""
    user = get_current_user()
    return user.id if user else None


def is_authenticated() -> bool:
    """Kullanıcı oturum açmış mı?"""
    return get_current_user() is not None


def has_role(role: str) -> bool:
    """Kullanıcı belirli bir role sahip mi?"""
    user_role = getattr(g, 'user_role', None)
    if user_role:
        return user_role == role
    
    try:
        claims = get_jwt()
        return claims.get('role') == role
    except Exception:
        return False


def has_permission(permission: Union[Permission, str]) -> bool:
    """Kullanıcı belirli bir permission'a sahip mi?"""
    perm_value = permission.value if isinstance(permission, Permission) else permission
    return _has_permission(perm_value)


def is_admin() -> bool:
    """Kullanıcı admin veya super_admin mi?"""
    return has_role('admin') or has_role('super_admin')


def is_owner(resource, owner_field: str = 'user_id') -> bool:
    """Kullanıcı kaynağın sahibi mi?"""
    user = get_current_user()
    if not user:
        return False
    
    owner_id = getattr(resource, owner_field, None)
    return owner_id == user.id
