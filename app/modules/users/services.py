"""
Users Module - Services.

Kullanıcı yönetimi iş mantığı.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import secrets
import string

from sqlalchemy import or_

from app.extensions import db
from app.common.base_service import BaseService
from app.core.exceptions import ConflictError, ValidationError, AuthorizationError, NotFoundError
from app.core.security import hash_password
from app.core.pagination import PaginationResult, paginate_query
from app.modules.users.models import User, Role, Permission


def generate_temp_password(length: int = 12) -> str:
    """
    Güvenli geçici şifre oluşturur.
    
    Args:
        length: Şifre uzunluğu
        
    Returns:
        Rastgele şifre
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class UserService(BaseService[User]):
    """Kullanıcı servisi."""
    
    model = User
    
    @classmethod
    def query(cls):
        """Sadece aktif (silinmemiş) kullanıcıları döner."""
        return User.query.filter_by(is_deleted=False)
    
    @classmethod
    def get_paginated(
        cls,
        page: int = 1,
        per_page: int = 20,
        role: str = None,
        is_active: bool = None,
        search: str = None
    ) -> PaginationResult:
        """
        Filtrelenmiş ve sayfalanmış kullanıcı listesi.
        
        Args:
            page: Sayfa numarası
            per_page: Sayfa başına öğe
            role: Rol filtresi
            is_active: Aktiflik filtresi
            search: Arama metni (isim, email)
        
        Returns:
            PaginationResult
        """
        query = cls.query()
        
        # Rol filtresi
        if role:
            role_obj = Role.query.filter_by(name=role).first()
            if role_obj:
                query = query.filter(User.role_id == role_obj.id)
        
        # Aktiflik filtresi
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        # Arama
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        # Sıralama
        query = query.order_by(User.created_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def create_user(cls, data: Dict[str, Any]) -> User:
        """
        Yeni kullanıcı oluşturur.
        
        Args:
            data: Kullanıcı verileri
        
        Returns:
            User instance
        
        Raises:
            ConflictError: E-posta zaten kayıtlı
        """
        # E-posta kontrolü
        email = data.get('email', '').lower()
        if User.query.filter_by(email=email).first():
            raise ConflictError('Bu e-posta adresi zaten kayıtlı')
        
        # Rol kontrolü
        role_name = data.pop('role', 'student')
        role = Role.query.filter_by(name=role_name).first()
        
        # Şifreyi hashle
        password = data.pop('password', None)
        if password:
            data['password_hash'] = hash_password(password)
        
        # Kullanıcı oluştur
        user = User(
            email=email,
            role=role,
            **{k: v for k, v in data.items() if k != 'email'}
        )
        
        db.session.add(user)
        db.session.commit()
        
        return user
    
    @classmethod
    def update_user(cls, user_id: int, data: Dict[str, Any]) -> User:
        """
        Kullanıcıyı günceller.
        
        Args:
            user_id: Kullanıcı ID
            data: Güncellenecek veriler
        
        Returns:
            User instance
        """
        user = cls.get_or_404(user_id)
        
        # E-posta değişiyorsa kontrol et
        if 'email' in data and data['email'].lower() != user.email:
            if User.query.filter_by(email=data['email'].lower()).first():
                raise ConflictError('Bu e-posta adresi zaten kayıtlı')
            data['email'] = data['email'].lower()
        
        # Rol değişiyorsa
        if 'role' in data:
            role_name = data.pop('role')
            role = Role.query.filter_by(name=role_name).first()
            if role:
                user.role = role
        
        # Şifre değişiyorsa
        if 'password' in data:
            data['password_hash'] = hash_password(data.pop('password'))
        
        # Diğer alanları güncelle
        for key, value in data.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        db.session.commit()
        
        return user
    
    @classmethod
    def update_profile(cls, user_id: int, data: Dict[str, Any]) -> User:
        """
        Kullanıcının kendi profilini günceller.
        
        Rol ve aktiflik gibi hassas alanlar güncellenemez.
        
        Args:
            user_id: Kullanıcı ID
            data: Güncellenecek veriler
        
        Returns:
            User instance
        """
        user = cls.get_or_404(user_id)
        
        # İzin verilen alanlar
        allowed_fields = ['first_name', 'last_name', 'phone', 'bio', 'avatar_url']
        
        for key, value in data.items():
            if key in allowed_fields and hasattr(user, key):
                setattr(user, key, value)
        
        db.session.commit()
        
        return user
    
    @classmethod
    def activate_user(cls, user_id: int) -> User:
        """Kullanıcıyı aktif eder."""
        user = cls.get_or_404(user_id)
        user.is_active = True
        db.session.commit()
        return user
    
    @classmethod
    def deactivate_user(cls, user_id: int) -> User:
        """Kullanıcıyı deaktif eder."""
        user = cls.get_or_404(user_id)
        user.is_active = False
        db.session.commit()
        return user
    
    # =========================================================================
    # ADMIN USER CREATION
    # =========================================================================
    
    @classmethod
    def admin_create_user(
        cls,
        data: Dict[str, Any],
        created_by: int,
        send_email: bool = True
    ) -> tuple:
        """
        Admin tarafından kullanıcı oluşturur.
        
        İlk girişte şifre değiştirmeyi zorunlu kılar.
        
        Args:
            data: Kullanıcı verileri
            created_by: Oluşturan admin ID
            send_email: E-posta gönderilsin mi
            
        Returns:
            tuple: (User, temp_password)
        """
        # E-posta kontrolü
        email = data.get('email', '').lower()
        if User.query.filter_by(email=email).first():
            raise ConflictError('Bu e-posta adresi zaten kayıtlı')
        
        # Rol kontrolü
        role_name = data.pop('role', 'student')
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            raise ValidationError(f'{role_name} rolü bulunamadı')
        
        # Geçici şifre oluştur veya verilen şifreyi kullan
        temp_password = data.pop('password', None) or generate_temp_password()
        
        # Kullanıcı oluştur
        user = User(
            email=email,
            first_name=data.get('first_name', '').strip(),
            last_name=data.get('last_name', '').strip(),
            phone=data.get('phone'),
            role=role,
            is_active=data.get('is_active', True),
            is_verified=data.get('is_verified', False),
            force_password_change=True,  # İlk girişte şifre değiştirme zorunlu
        )
        
        # Şifreyi ayarla
        user.set_password(temp_password, force_change=True)
        
        db.session.add(user)
        db.session.commit()
        
        # Audit log
        from app.models.audit import AuditLogger, AuditAction
        AuditLogger.log_create(
            user_id=created_by,
            user_email=None,
            resource_type='user',
            resource_id=user.id,
            resource_name=user.email,
            new_values={'email': user.email, 'role': role_name}
        )
        
        # E-posta gönder (opsiyonel)
        if send_email:
            try:
                from app.services.email_service import EmailService
                EmailService.send_welcome_email(
                    to_email=user.email,
                    first_name=user.first_name,
                    temp_password=temp_password
                )
            except Exception as e:
                # E-posta hatası kullanıcı oluşturmayı engellemez
                pass
        
        return user, temp_password
    
    @classmethod
    def bulk_create_users(
        cls,
        users_data: List[Dict[str, Any]],
        created_by: int
    ) -> tuple:
        """
        Toplu kullanıcı oluşturur.
        
        Args:
            users_data: Kullanıcı verilerinin listesi
            created_by: Oluşturan admin ID
            
        Returns:
            tuple: (created_users, errors)
        """
        created_users = []
        errors = []
        
        for idx, data in enumerate(users_data):
            try:
                user, temp_password = cls.admin_create_user(
                    data=data,
                    created_by=created_by,
                    send_email=True
                )
                created_users.append({
                    'user': user.to_dict(),
                    'temp_password': temp_password
                })
            except Exception as e:
                errors.append({
                    'index': idx,
                    'email': data.get('email', 'unknown'),
                    'error': str(e)
                })
        
        return created_users, errors
    
    # =========================================================================
    # PASSWORD MANAGEMENT
    # =========================================================================
    
    @classmethod
    def change_password(
        cls,
        user_id: int,
        old_password: str,
        new_password: str
    ) -> User:
        """
        Kullanıcı kendi şifresini değiştirir.
        
        Args:
            user_id: Kullanıcı ID
            old_password: Mevcut şifre
            new_password: Yeni şifre
            
        Returns:
            User
        """
        user = cls.get_or_404(user_id)
        
        if not user.check_password(old_password):
            raise ValidationError('Mevcut şifre yanlış')
        
        # Yeni şifre eski şifreyle aynı olmamalı
        if old_password == new_password:
            raise ValidationError('Yeni şifre mevcut şifreden farklı olmalıdır')
        
        user.set_password(new_password, force_change=False)
        db.session.commit()
        
        # Audit log
        from app.models.audit import AuditLogger, AuditAction
        AuditLogger.log(
            action=AuditAction.PASSWORD_CHANGE.value,
            user_id=user_id,
            user_email=user.email,
            resource_type='user',
            resource_id=user_id,
            description='User changed password'
        )
        
        return user
    
    @classmethod
    def force_change_password(
        cls,
        user_id: int,
        new_password: str
    ) -> User:
        """
        İlk giriş sonrası zorunlu şifre değişikliği.
        
        force_password_change flag'ini de temizler.
        
        Args:
            user_id: Kullanıcı ID
            new_password: Yeni şifre
            
        Returns:
            User
        """
        user = cls.get_or_404(user_id)
        
        if not user.force_password_change:
            raise ValidationError('Şifre değişikliği gerekli değil')
        
        user.set_password(new_password, force_change=False)
        db.session.commit()
        
        # Audit log
        from app.models.audit import AuditLogger, AuditAction
        AuditLogger.log(
            action=AuditAction.PASSWORD_CHANGE.value,
            user_id=user_id,
            user_email=user.email,
            resource_type='user',
            resource_id=user_id,
            description='User completed forced password change'
        )
        
        return user
    
    @classmethod
    def admin_reset_password(
        cls,
        user_id: int,
        admin_id: int
    ) -> tuple:
        """
        Admin tarafından şifre sıfırlama.
        
        Geçici şifre oluşturur ve force_password_change aktif eder.
        
        Args:
            user_id: Şifre sıfırlanacak kullanıcı
            admin_id: İşlemi yapan admin
            
        Returns:
            tuple: (User, temp_password)
        """
        user = cls.get_or_404(user_id)
        temp_password = generate_temp_password()
        
        user.set_password(temp_password, force_change=True)
        db.session.commit()
        
        # Audit log
        from app.models.audit import AuditLogger, AuditAction
        AuditLogger.log(
            action=AuditAction.PASSWORD_RESET.value,
            user_id=admin_id,
            resource_type='user',
            resource_id=user_id,
            resource_name=user.email,
            description=f'Admin reset password for user {user.email}'
        )
        
        # E-posta gönder
        try:
            from app.services.email_service import EmailService
            EmailService.send_password_reset_email(
                to_email=user.email,
                first_name=user.first_name,
                temp_password=temp_password
            )
        except:
            pass
        
        return user, temp_password
    
    # =========================================================================
    # ACCOUNT LOCK MANAGEMENT
    # =========================================================================
    
    @classmethod
    def unlock_user_account(cls, user_id: int, admin_id: int) -> User:
        """
        Kilitli hesabı açar.
        
        Args:
            user_id: Kullanıcı ID
            admin_id: İşlemi yapan admin
            
        Returns:
            User
        """
        user = cls.get_or_404(user_id)
        user.unlock_account()
        
        # Audit log
        from app.models.audit import AuditLogger
        AuditLogger.log(
            action='user_unlock',
            user_id=admin_id,
            resource_type='user',
            resource_id=user_id,
            resource_name=user.email,
            description=f'Admin unlocked user account {user.email}'
        )
        
        return user
    
    @classmethod
    def get_locked_users(cls) -> List[User]:
        """Kilitli hesapları döner."""
        return cls.query().filter(
            User.locked_until.isnot(None),
            User.locked_until > datetime.utcnow()
        ).all()
    
    @classmethod
    def get_by_email(cls, email: str) -> Optional[User]:
        """E-posta ile kullanıcı bulur."""
        return User.query.filter_by(email=email.lower()).first()
    
    @classmethod
    def get_users_by_role(cls, role_name: str) -> List[User]:
        """Belirli roldeki kullanıcıları döner."""
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            return []
        return cls.query().filter_by(role_id=role.id).all()
    
    @classmethod
    def count_by_role(cls) -> Dict[str, int]:
        """Rol bazında kullanıcı sayısını döner."""
        from sqlalchemy import func
        
        result = db.session.query(
            Role.name,
            func.count(User.id)
        ).join(User).filter(
            User.is_deleted == False
        ).group_by(Role.name).all()
        
        return {role: count for role, count in result}


class RoleService(BaseService[Role]):
    """Rol servisi."""
    
    model = Role
    
    @classmethod
    def get_by_name(cls, name: str) -> Optional[Role]:
        """İsimle rol bulur."""
        return Role.query.filter_by(name=name).first()
    
    @classmethod
    def get_all_roles(cls) -> List[Role]:
        """Tüm rolleri döner."""
        return Role.query.order_by(Role.id).all()
    
    @classmethod
    def create_role(cls, name: str, description: str = None, is_system: bool = False) -> Role:
        """
        Yeni rol oluşturur.
        
        Args:
            name: Rol adı
            description: Açıklama
            is_system: Sistem rolü mü (silinemez)
            
        Returns:
            Role
        """
        if cls.get_by_name(name):
            raise ConflictError(f'{name} rolü zaten mevcut')
        
        role = Role(name=name, description=description, is_system=is_system)
        db.session.add(role)
        db.session.commit()
        return role
    
    @classmethod
    def update_role(cls, role_id: int, data: Dict[str, Any]) -> Role:
        """
        Rol günceller.
        
        Args:
            role_id: Rol ID
            data: Güncellenecek veriler
            
        Returns:
            Role
        """
        role = cls.get_or_404(role_id)
        
        # Sistem rolleri düzenlenemez
        if role.is_system and 'name' in data:
            raise AuthorizationError('Sistem rolleri yeniden adlandırılamaz')
        
        if 'description' in data:
            role.description = data['description']
        
        if 'name' in data and data['name'] != role.name:
            if cls.get_by_name(data['name']):
                raise ConflictError(f'{data["name"]} rolü zaten mevcut')
            role.name = data['name']
        
        db.session.commit()
        return role
    
    @classmethod
    def delete_role(cls, role_id: int) -> bool:
        """
        Rol siler.
        
        Args:
            role_id: Rol ID
            
        Returns:
            bool
        """
        role = cls.get_or_404(role_id)
        
        if role.is_system:
            raise AuthorizationError('Sistem rolleri silinemez')
        
        # Kullanıcısı olan roller silinemez
        if role.users.count() > 0:
            raise ValidationError(f'{role.name} rolüne atanmış kullanıcılar var')
        
        db.session.delete(role)
        db.session.commit()
        return True
    
    @classmethod
    def assign_permission(cls, role_name: str, permission_name: str) -> Role:
        """Role yetki ekler."""
        role = cls.get_by_name(role_name)
        if not role:
            raise ValidationError(f'{role_name} rolü bulunamadı')
        
        permission = Permission.query.filter_by(name=permission_name).first()
        if not permission:
            raise ValidationError(f'{permission_name} yetkisi bulunamadı')
        
        if permission not in role.permissions:
            role.permissions.append(permission)
            db.session.commit()
        
        return role
    
    @classmethod
    def remove_permission(cls, role_name: str, permission_name: str) -> Role:
        """Rolden yetki kaldırır."""
        role = cls.get_by_name(role_name)
        if not role:
            raise ValidationError(f'{role_name} rolü bulunamadı')
        
        permission = Permission.query.filter_by(name=permission_name).first()
        if not permission:
            raise ValidationError(f'{permission_name} yetkisi bulunamadı')
        
        if permission in role.permissions:
            role.permissions.remove(permission)
            db.session.commit()
        
        return role
    
    @classmethod
    def get_role_permissions(cls, role_name: str) -> List[str]:
        """Rolün yetkilerini döner."""
        role = cls.get_by_name(role_name)
        if not role:
            return []
        return [p.name for p in role.permissions]
    
    @classmethod
    def get_users_count_by_role(cls) -> Dict[str, int]:
        """Rol bazında kullanıcı sayısını döner."""
        from sqlalchemy import func
        
        result = db.session.query(
            Role.name,
            func.count(User.id)
        ).outerjoin(User).filter(
            or_(User.is_deleted == False, User.id.is_(None))
        ).group_by(Role.name).all()
        
        return {role: count for role, count in result}


class PermissionService(BaseService[Permission]):
    """Yetki servisi."""
    
    model = Permission
    
    @classmethod
    def get_all_permissions(cls) -> List[Permission]:
        """Tüm yetkileri döner."""
        return Permission.query.order_by(Permission.resource, Permission.action).all()
    
    @classmethod
    def get_by_name(cls, name: str) -> Optional[Permission]:
        """İsimle yetki bulur."""
        return Permission.query.filter_by(name=name).first()
    
    @classmethod
    def create_permission(
        cls,
        name: str,
        resource: str,
        action: str,
        description: str = None
    ) -> Permission:
        """
        Yeni yetki oluşturur.
        
        Args:
            name: Yetki adı (örn: courses:create)
            resource: Kaynak tipi (örn: courses)
            action: İşlem tipi (örn: create)
            description: Açıklama
            
        Returns:
            Permission
        """
        if cls.get_by_name(name):
            raise ConflictError(f'{name} yetkisi zaten mevcut')
        
        permission = Permission(
            name=name,
            resource=resource,
            action=action,
            description=description
        )
        db.session.add(permission)
        db.session.commit()
        return permission
    
    @classmethod
    def get_permissions_by_resource(cls, resource: str) -> List[Permission]:
        """Kaynak tipine göre yetkileri döner."""
        return Permission.query.filter_by(resource=resource).all()
    
    @classmethod
    def delete_permission(cls, permission_id: int) -> bool:
        """Yetki siler."""
        permission = cls.get_or_404(permission_id)
        
        # Rollere atanmış yetkileri kontrol et
        if permission.roles:
            raise ValidationError(f'Bu yetki {len(permission.roles)} role atanmış')
        
        db.session.delete(permission)
        db.session.commit()
        return True
