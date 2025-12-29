"""
Authorization & Permission System.

RBAC (Role-Based Access Control) ve Permission-based access control.
Kurumsal seviyede yetkilendirme altyapısı.

Kullanım:
    from app.core.permissions import (
        require_role, require_permission, require_owner_or_role,
        Permission, check_permission
    )
    
    # Route seviyesinde
    @require_role('admin', 'super_admin')
    def admin_only():
        ...
    
    @require_permission('courses:publish')
    def publish_course():
        ...
    
    @require_owner_or_role('admin', owner_field='user_id')
    def update_profile():
        ...
"""

from enum import Enum
from functools import wraps
from typing import List, Optional, Callable, Any, Union

from flask import g, request, has_request_context
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt

from app.core.exceptions import AuthenticationError, AuthorizationError


class RoleLevel(int, Enum):
    """Rol hiyerarşi seviyeleri."""
    GUEST = 0
    STUDENT = 1
    TEACHER = 2
    ADMIN = 3
    SUPER_ADMIN = 4


class Permission(str, Enum):
    """
    Sistem genelinde tanımlı permission'lar.
    
    Format: {resource}:{action}
    
    Kaynak Tipleri:
        - users: Kullanıcı yönetimi
        - courses: Kurs yönetimi
        - contents: İçerik yönetimi
        - exams: Sınav yönetimi
        - evaluations: Değerlendirme
        - live_classes: Canlı dersler
        - reports: Raporlama
        - system: Sistem yönetimi
    
    Aksiyon Tipleri:
        - create: Oluşturma
        - read: Görüntüleme
        - update: Güncelleme
        - delete: Silme
        - manage: Tüm yetkiler
        - publish: Yayınlama
        - grade: Puanlama
        - export: Dışa aktarma
    """
    
    # User Permissions
    USERS_CREATE = 'users:create'
    USERS_READ = 'users:read'
    USERS_UPDATE = 'users:update'
    USERS_DELETE = 'users:delete'
    USERS_MANAGE = 'users:manage'
    USERS_ACTIVATE = 'users:activate'
    USERS_ASSIGN_ROLE = 'users:assign_role'
    
    # Course Permissions
    COURSES_CREATE = 'courses:create'
    COURSES_READ = 'courses:read'
    COURSES_UPDATE = 'courses:update'
    COURSES_DELETE = 'courses:delete'
    COURSES_MANAGE = 'courses:manage'
    COURSES_PUBLISH = 'courses:publish'
    COURSES_ARCHIVE = 'courses:archive'
    COURSES_ENROLL = 'courses:enroll'
    
    # Content Permissions
    CONTENTS_CREATE = 'contents:create'
    CONTENTS_READ = 'contents:read'
    CONTENTS_UPDATE = 'contents:update'
    CONTENTS_DELETE = 'contents:delete'
    CONTENTS_MANAGE = 'contents:manage'
    CONTENTS_UPLOAD = 'contents:upload'
    
    # Exam Permissions
    EXAMS_CREATE = 'exams:create'
    EXAMS_READ = 'exams:read'
    EXAMS_UPDATE = 'exams:update'
    EXAMS_DELETE = 'exams:delete'
    EXAMS_MANAGE = 'exams:manage'
    EXAMS_TAKE = 'exams:take'
    EXAMS_GRADE = 'exams:grade'
    EXAMS_VIEW_RESULTS = 'exams:view_results'
    
    # Evaluation Permissions
    EVALUATIONS_CREATE = 'evaluations:create'
    EVALUATIONS_READ = 'evaluations:read'
    EVALUATIONS_UPDATE = 'evaluations:update'
    EVALUATIONS_GRADE = 'evaluations:grade'
    EVALUATIONS_MANAGE = 'evaluations:manage'
    
    # Live Class Permissions
    LIVE_CLASSES_CREATE = 'live_classes:create'
    LIVE_CLASSES_READ = 'live_classes:read'
    LIVE_CLASSES_UPDATE = 'live_classes:update'
    LIVE_CLASSES_DELETE = 'live_classes:delete'
    LIVE_CLASSES_MANAGE = 'live_classes:manage'
    LIVE_CLASSES_HOST = 'live_classes:host'
    LIVE_CLASSES_JOIN = 'live_classes:join'
    
    # Report Permissions
    REPORTS_VIEW = 'reports:view'
    REPORTS_EXPORT = 'reports:export'
    REPORTS_MANAGE = 'reports:manage'
    
    # System Permissions
    SYSTEM_ADMIN = 'system:admin'
    SYSTEM_AUDIT = 'system:audit'
    SYSTEM_CONFIG = 'system:config'
    SYSTEM_MAINTENANCE = 'system:maintenance'
    
    # =========================================================================
    # AI PERMISSIONS - AI modülü yetkileri
    # =========================================================================
    
    # Temel AI kullanımı
    AI_USE = 'ai:use'                    # AI chat kullanabilme
    AI_HINT = 'ai:hint'                  # Soru ipucu alma
    AI_EXPLAIN = 'ai:explain'            # Konu açıklaması alma
    AI_STUDY_PLAN = 'ai:study_plan'      # Çalışma planı oluşturma
    
    # Gelişmiş AI özellikleri
    AI_EVALUATE = 'ai:evaluate'          # Cevap değerlendirme
    AI_GENERATE = 'ai:generate'          # Soru üretimi
    AI_ENHANCE = 'ai:enhance'            # İçerik zenginleştirme
    AI_ANALYZE = 'ai:analyze'            # Performans analizi
    
    # AI Yönetimi
    AI_MANAGE = 'ai:manage'              # AI ayarlarını yönetme
    AI_QUOTA_VIEW = 'ai:quota_view'      # Kota görüntüleme
    AI_QUOTA_MANAGE = 'ai:quota_manage'  # Kota yönetimi
    AI_LOGS_VIEW = 'ai:logs_view'        # AI loglarını görme
    AI_PROMPTS_MANAGE = 'ai:prompts_manage'  # Prompt template yönetimi
    AI_BYPASS_LIMIT = 'ai:bypass_limit'  # Rate limit bypass


# Rol-Permission mapping
ROLE_PERMISSIONS = {
    'student': [
        Permission.COURSES_READ,
        Permission.CONTENTS_READ,
        Permission.EXAMS_TAKE,
        Permission.EXAMS_VIEW_RESULTS,
        Permission.EVALUATIONS_READ,
        Permission.LIVE_CLASSES_READ,
        Permission.LIVE_CLASSES_JOIN,
        # AI - Öğrenci AI özelliklerine erişebilir
        Permission.AI_USE,
        Permission.AI_HINT,
        Permission.AI_EXPLAIN,
        Permission.AI_STUDY_PLAN,
        Permission.AI_QUOTA_VIEW,
    ],
    'teacher': [
        # Student permissions +
        Permission.COURSES_CREATE,
        Permission.COURSES_UPDATE,
        Permission.COURSES_PUBLISH,
        Permission.CONTENTS_CREATE,
        Permission.CONTENTS_UPDATE,
        Permission.CONTENTS_UPLOAD,
        Permission.EXAMS_CREATE,
        Permission.EXAMS_UPDATE,
        Permission.EXAMS_GRADE,
        Permission.EVALUATIONS_CREATE,
        Permission.EVALUATIONS_UPDATE,
        Permission.EVALUATIONS_GRADE,
        Permission.LIVE_CLASSES_CREATE,
        Permission.LIVE_CLASSES_UPDATE,
        Permission.LIVE_CLASSES_HOST,
        Permission.REPORTS_VIEW,
        # AI - Öğretmen gelişmiş AI özellikleri + soru üretimi
        Permission.AI_EVALUATE,
        Permission.AI_GENERATE,
        Permission.AI_ENHANCE,
        Permission.AI_ANALYZE,
        Permission.AI_LOGS_VIEW,
    ],
    'admin': [
        # Teacher permissions +
        Permission.USERS_READ,
        Permission.USERS_UPDATE,
        Permission.USERS_ACTIVATE,
        Permission.COURSES_DELETE,
        Permission.COURSES_MANAGE,
        Permission.CONTENTS_DELETE,
        Permission.CONTENTS_MANAGE,
        Permission.EXAMS_DELETE,
        Permission.EXAMS_MANAGE,
        Permission.EVALUATIONS_MANAGE,
        Permission.LIVE_CLASSES_DELETE,
        Permission.LIVE_CLASSES_MANAGE,
        Permission.REPORTS_EXPORT,
        Permission.SYSTEM_AUDIT,
        # AI - Admin kota ve log yönetimi
        Permission.AI_QUOTA_MANAGE,
        Permission.AI_PROMPTS_MANAGE,
    ],
    'super_admin': [
        # Tüm permissions
        Permission.USERS_MANAGE,
        Permission.USERS_DELETE,
        Permission.USERS_ASSIGN_ROLE,
        Permission.SYSTEM_ADMIN,
        Permission.SYSTEM_CONFIG,
        Permission.SYSTEM_MAINTENANCE,
        Permission.REPORTS_MANAGE,
        # AI - Super Admin tam yetki
        Permission.AI_MANAGE,
        Permission.AI_BYPASS_LIMIT,
    ]
}


def get_role_permissions(role_name: str) -> List[Permission]:
    """
    Bir rolün tüm permission'larını döner (hiyerarşik).
    
    Args:
        role_name: Rol adı
    
    Returns:
        Permission listesi
    """
    permissions = set()
    
    # Hiyerarşi sırası
    hierarchy = ['student', 'teacher', 'admin', 'super_admin']
    
    try:
        role_index = hierarchy.index(role_name)
    except ValueError:
        return list(permissions)
    
    # Alt rollerin permission'larını da ekle
    for i in range(role_index + 1):
        role = hierarchy[i]
        if role in ROLE_PERMISSIONS:
            permissions.update(ROLE_PERMISSIONS[role])
    
    return list(permissions)


def get_current_user():
    """
    Mevcut authenticated kullanıcıyı döner.
    
    Returns:
        User instance veya None
    """
    if has_request_context():
        return getattr(g, 'current_user', None)
    return None


def get_current_user_role() -> Optional[str]:
    """Mevcut kullanıcının rolünü döner."""
    user = get_current_user()
    if user:
        return getattr(user, 'role_name', None)
    return None


def get_current_user_id() -> Optional[int]:
    """Mevcut kullanıcının ID'sini döner."""
    user = get_current_user()
    if user:
        return getattr(user, 'id', None)
    return None


def check_role(required_roles: List[str]) -> bool:
    """
    Kullanıcının gerekli rollerden birine sahip olup olmadığını kontrol eder.
    
    Args:
        required_roles: Gereken rol listesi
    
    Returns:
        Yetki var mı?
    """
    current_role = get_current_user_role()
    if not current_role:
        return False
    
    return current_role in required_roles


def check_role_level(minimum_role: str) -> bool:
    """
    Kullanıcının minimum rol seviyesine sahip olup olmadığını kontrol eder.
    
    Args:
        minimum_role: Minimum gereken rol
    
    Returns:
        Yetki var mı?
    """
    current_role = get_current_user_role()
    if not current_role:
        return False
    
    hierarchy = {'student': 1, 'teacher': 2, 'admin': 3, 'super_admin': 4}
    
    current_level = hierarchy.get(current_role, 0)
    required_level = hierarchy.get(minimum_role, 0)
    
    return current_level >= required_level


def check_permission(required_permission: Union[Permission, str]) -> bool:
    """
    Kullanıcının belirli bir permission'a sahip olup olmadığını kontrol eder.
    
    Args:
        required_permission: Gereken permission
    
    Returns:
        Yetki var mı?
    """
    current_role = get_current_user_role()
    if not current_role:
        return False
    
    user_permissions = get_role_permissions(current_role)
    
    # String veya Enum olabilir
    permission_value = required_permission.value if isinstance(required_permission, Permission) else required_permission
    
    # Manage permission'ı varsa alt permission'lar da geçerli
    resource = permission_value.split(':')[0] if ':' in permission_value else permission_value
    manage_permission = f"{resource}:manage"
    
    for perm in user_permissions:
        perm_value = perm.value if isinstance(perm, Permission) else perm
        if perm_value == permission_value or perm_value == manage_permission:
            return True
    
    # Super admin her şeye erişebilir
    if current_role == 'super_admin':
        return True
    
    return False


def check_ownership(entity: Any, owner_field: str = 'user_id') -> bool:
    """
    Kullanıcının kaynak sahibi olup olmadığını kontrol eder.
    
    Args:
        entity: Kontrol edilecek kaynak
        owner_field: Sahiplik alanı adı
    
    Returns:
        Sahip mi?
    """
    current_user_id = get_current_user_id()
    if not current_user_id:
        return False
    
    owner_id = getattr(entity, owner_field, None)
    return owner_id == current_user_id


# ===== Dekoratörler =====

def require_auth(f):
    """
    Kimlik doğrulama gerektiren endpoint dekoratörü.
    
    Kullanım:
        @require_auth
        def protected_endpoint():
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception as e:
            raise AuthenticationError('Kimlik doğrulama gerekli')
        
        # g.current_user'ı ayarla
        if not hasattr(g, 'current_user') or g.current_user is None:
            user_id = get_jwt_identity()
            if user_id:
                from app.modules.users.models import User
                g.current_user = User.query.get(user_id)
        
        return f(*args, **kwargs)
    
    return decorated_function


def require_role(*roles: str):
    """
    Belirli roller için yetkilendirme dekoratörü.
    
    Kullanım:
        @require_role('admin', 'super_admin')
        def admin_only():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Önce auth kontrolü
            try:
                verify_jwt_in_request()
            except Exception:
                raise AuthenticationError('Kimlik doğrulama gerekli')
            
            # g.current_user'ı ayarla
            if not hasattr(g, 'current_user') or g.current_user is None:
                user_id = get_jwt_identity()
                if user_id:
                    from app.modules.users.models import User
                    g.current_user = User.query.get(user_id)
            
            # Rol kontrolü
            if not check_role(list(roles)):
                # Audit log
                try:
                    from app.core.audit import AuditService
                    AuditService.log_permission_denied(
                        resource=f.__name__,
                        action='access',
                        required_permission=f"role:{','.join(roles)}"
                    )
                except ImportError:
                    pass
                
                raise AuthorizationError(
                    message='Bu işlem için yetkiniz yok',
                    required_role=', '.join(roles)
                )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_role_level(minimum_role: str):
    """
    Minimum rol seviyesi gerektiren dekoratör.
    
    Kullanım:
        @require_role_level('teacher')  # teacher ve üstü
        def teacher_plus_only():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                raise AuthenticationError('Kimlik doğrulama gerekli')
            
            if not hasattr(g, 'current_user') or g.current_user is None:
                user_id = get_jwt_identity()
                if user_id:
                    from app.modules.users.models import User
                    g.current_user = User.query.get(user_id)
            
            if not check_role_level(minimum_role):
                raise AuthorizationError(
                    message='Bu işlem için yeterli yetkiniz yok',
                    required_role=f'{minimum_role} veya üstü'
                )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_permission(permission: Union[Permission, str]):
    """
    Belirli permission gerektiren dekoratör.
    
    Kullanım:
        @require_permission(Permission.COURSES_PUBLISH)
        def publish_course():
            ...
        
        @require_permission('courses:publish')
        def publish_course():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                raise AuthenticationError('Kimlik doğrulama gerekli')
            
            if not hasattr(g, 'current_user') or g.current_user is None:
                user_id = get_jwt_identity()
                if user_id:
                    from app.modules.users.models import User
                    g.current_user = User.query.get(user_id)
            
            if not check_permission(permission):
                perm_value = permission.value if isinstance(permission, Permission) else permission
                
                # Audit log
                try:
                    from app.core.audit import AuditService
                    AuditService.log_permission_denied(
                        resource=f.__name__,
                        action='execute',
                        required_permission=perm_value
                    )
                except ImportError:
                    pass
                
                raise AuthorizationError(
                    message='Bu işlem için yetkiniz yok',
                    required_role=perm_value
                )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_permissions(*permissions: Union[Permission, str]):
    """
    Birden fazla permission gerektiren dekoratör (AND logic).
    
    Kullanım:
        @require_permissions(Permission.COURSES_READ, Permission.EXAMS_CREATE)
        def create_course_exam():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                raise AuthenticationError('Kimlik doğrulama gerekli')
            
            if not hasattr(g, 'current_user') or g.current_user is None:
                user_id = get_jwt_identity()
                if user_id:
                    from app.modules.users.models import User
                    g.current_user = User.query.get(user_id)
            
            missing_permissions = []
            for permission in permissions:
                if not check_permission(permission):
                    perm_value = permission.value if isinstance(permission, Permission) else permission
                    missing_permissions.append(perm_value)
            
            if missing_permissions:
                raise AuthorizationError(
                    message='Gerekli yetkiler eksik',
                    required_role=', '.join(missing_permissions)
                )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_any_permission(*permissions: Union[Permission, str]):
    """
    Belirtilen permission'lardan en az birine sahip olma kontrolü (OR logic).
    
    Kullanım:
        @require_any_permission(Permission.COURSES_UPDATE, Permission.COURSES_MANAGE)
        def update_or_manage_course():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                raise AuthenticationError('Kimlik doğrulama gerekli')
            
            if not hasattr(g, 'current_user') or g.current_user is None:
                user_id = get_jwt_identity()
                if user_id:
                    from app.modules.users.models import User
                    g.current_user = User.query.get(user_id)
            
            has_any = any(check_permission(perm) for perm in permissions)
            
            if not has_any:
                perm_values = [
                    p.value if isinstance(p, Permission) else p
                    for p in permissions
                ]
                raise AuthorizationError(
                    message='Bu işlem için yetkiniz yok',
                    required_role=f"Gerekli: {' veya '.join(perm_values)}"
                )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_owner_or_role(
    *roles: str,
    owner_field: str = 'user_id',
    get_entity: Callable = None
):
    """
    Kaynak sahibi veya belirli rol gerektiren dekoratör.
    
    Kullanım:
        @require_owner_or_role('admin', owner_field='user_id')
        def update_profile(user_id):
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                raise AuthenticationError('Kimlik doğrulama gerekli')
            
            if not hasattr(g, 'current_user') or g.current_user is None:
                user_id = get_jwt_identity()
                if user_id:
                    from app.modules.users.models import User
                    g.current_user = User.query.get(user_id)
            
            # Rol kontrolü
            if check_role(list(roles)):
                return f(*args, **kwargs)
            
            # Sahiplik kontrolü
            entity = None
            if get_entity:
                entity = get_entity(*args, **kwargs)
            
            if entity and check_ownership(entity, owner_field):
                return f(*args, **kwargs)
            
            # URL parametresinden user_id kontrolü
            entity_id = kwargs.get('user_id') or kwargs.get('id')
            current_user_id = get_current_user_id()
            
            if entity_id and current_user_id and int(entity_id) == current_user_id:
                return f(*args, **kwargs)
            
            raise AuthorizationError('Bu kaynak üzerinde işlem yapmaya yetkiniz yok')
        
        return decorated_function
    return decorator


def require_course_access(role_for_all: str = 'admin'):
    """
    Kurs erişim kontrolü dekoratörü.
    
    Kullanıcının kursa kayıtlı olmasını veya belirli role sahip olmasını kontrol eder.
    
    Kullanım:
        @require_course_access(role_for_all='admin')
        def get_course_content(course_id):
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                raise AuthenticationError('Kimlik doğrulama gerekli')
            
            if not hasattr(g, 'current_user') or g.current_user is None:
                user_id = get_jwt_identity()
                if user_id:
                    from app.modules.users.models import User
                    g.current_user = User.query.get(user_id)
            
            # Admin kontrolü
            if check_role_level(role_for_all):
                return f(*args, **kwargs)
            
            # Kurs erişim kontrolü
            course_id = kwargs.get('course_id') or kwargs.get('id')
            if course_id:
                from app.modules.courses.models import Enrollment, Course
                
                current_user_id = get_current_user_id()
                
                # Kurs sahibi mi?
                course = Course.query.get(course_id)
                if course and course.teacher_id == current_user_id:
                    return f(*args, **kwargs)
                
                # Kayıtlı mı?
                enrollment = Enrollment.query.filter_by(
                    user_id=current_user_id,
                    course_id=course_id,
                    status='active'
                ).first()
                
                if enrollment:
                    return f(*args, **kwargs)
            
            raise AuthorizationError('Bu kursa erişim yetkiniz yok')
        
        return decorated_function
    return decorator
