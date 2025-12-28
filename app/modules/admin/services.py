"""
Admin Module - Services.

Admin ve Super Admin iş mantığı.
"""

from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from functools import wraps

from flask import request, g
from sqlalchemy import or_, func, desc

from app.extensions import db
from app.common.base_service import BaseService
from app.core.exceptions import (
    NotFoundError, ValidationError, AuthorizationError, ConflictError
)
from app.core.pagination import PaginationResult, paginate_query

from app.modules.admin.models import (
    SystemSetting, SettingCategory, SettingType,
    AdminActionLog, AdminActionType,
    ContentApprovalQueue, SystemAnnouncement, AnnouncementType
)
from app.models.user import User, Role
from app.models.package import Package, UserPackage, SubscriptionStatus, PaymentStatus


def log_admin_action(action_type: str):
    """Admin işlem log decorator'ı."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)
                
                # Başarılı işlem logu
                AdminActionService.log_action(
                    action_type=action_type,
                    success=True,
                    **kwargs
                )
                
                return result
            except Exception as e:
                # Başarısız işlem logu
                AdminActionService.log_action(
                    action_type=action_type,
                    success=False,
                    error_message=str(e),
                    **kwargs
                )
                raise
        return wrapper
    return decorator


# =============================================================================
# User Management Service
# =============================================================================

class AdminUserService:
    """
    Admin kullanıcı yönetimi servisi.
    
    Kullanıcı CRUD, rol atama, aktivasyon işlemleri.
    """
    
    @classmethod
    def get_users(
        cls,
        page: int = 1,
        per_page: int = 20,
        role: str = None,
        is_active: bool = None,
        is_verified: bool = None,
        search: str = None,
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> PaginationResult:
        """
        Filtrelenmiş kullanıcı listesi.
        """
        query = User.query.filter_by(is_deleted=False)
        
        # Filtreler
        if role:
            role_obj = Role.query.filter_by(name=role).first()
            if role_obj:
                query = query.filter(User.role_id == role_obj.id)
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        if is_verified is not None:
            query = query.filter(User.is_verified == is_verified)
        
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
        sort_column = getattr(User, sort_by, User.created_at)
        if sort_order == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_user_details(cls, user_id: int) -> Dict[str, Any]:
        """
        Kullanıcının detaylı bilgilerini döner.
        """
        user = User.query.get(user_id)
        if not user or user.is_deleted:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        # Paket bilgileri
        active_packages = UserPackage.query.filter_by(
            user_id=user_id,
            subscription_status=SubscriptionStatus.ACTIVE.value
        ).all()
        
        # İstatistikler
        stats = {
            'total_courses_enrolled': user.enrollments.count() if hasattr(user, 'enrollments') else 0,
            'total_exams_taken': user.exam_results.count() if hasattr(user, 'exam_results') else 0,
            'active_packages': len(active_packages),
        }
        
        return {
            'user': user.to_dict(include_sensitive=True),
            'packages': [up.to_dict() for up in active_packages],
            'stats': stats,
            'is_locked': user.is_locked,
            'failed_login_attempts': user.failed_login_attempts or 0,
            'locked_until': user.locked_until.isoformat() if user.locked_until else None,
        }
    
    @classmethod
    def create_user(cls, data: Dict[str, Any], admin_id: int) -> User:
        """
        Admin tarafından kullanıcı oluşturma.
        """
        email = data.get('email', '').lower()
        
        # E-posta kontrolü
        if User.query.filter_by(email=email).first():
            raise ConflictError('Bu e-posta adresi zaten kayıtlı')
        
        # Rol kontrolü
        role_name = data.pop('role', 'student')
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            raise ValidationError(f'Geçersiz rol: {role_name}')
        
        # Super admin sadece super admin oluşturabilir
        admin = User.query.get(admin_id)
        if role_name == 'super_admin' and not admin.is_super_admin:
            raise AuthorizationError('Super admin oluşturma yetkiniz yok')
        
        # Şifreyi hashle
        password = data.pop('password', None)
        print(f"[DEBUG] Password received: {repr(password)}")  # DEBUG
        print(f"[DEBUG] Data keys: {list(data.keys())}")  # DEBUG
        from app.core.security import hash_password
        password_hash = hash_password(password) if password else hash_password('Temp123!')
        print(f"[DEBUG] Using password: {'provided' if password else 'Temp123!'}")  # DEBUG
        
        # Kullanıcı oluştur
        user = User(
            email=email,
            password_hash=password_hash,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            phone=data.get('phone'),
            role=role,
            is_active=data.get('is_active', True),
            is_verified=data.get('is_verified', False),
            force_password_change=data.get('force_password_change', True)
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Log
        AdminActionService.log_action(
            action_type=AdminActionType.USER_CREATE.value,
            admin_id=admin_id,
            target_type='user',
            target_id=user.id,
            target_name=user.full_name,
            description=f'Kullanıcı oluşturuldu: {user.email}',
            new_values={'email': user.email, 'role': role_name}
        )
        
        return user
    
    @classmethod
    def update_user(cls, user_id: int, data: Dict[str, Any], admin_id: int) -> User:
        """
        Admin tarafından kullanıcı güncelleme.
        """
        user = User.query.get(user_id)
        if not user or user.is_deleted:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        old_values = {
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role.name if user.role else None,
            'is_active': user.is_active,
        }
        
        # E-posta değişiyorsa
        if 'email' in data and data['email'].lower() != user.email:
            new_email = data['email'].lower()
            if User.query.filter_by(email=new_email).first():
                raise ConflictError('Bu e-posta adresi zaten kayıtlı')
            user.email = new_email
        
        # Rol değişiyorsa
        if 'role' in data:
            role_name = data.pop('role')
            admin = User.query.get(admin_id)
            
            # Super admin koruması
            if user.is_super_admin and not admin.is_super_admin:
                raise AuthorizationError('Super admin rolünü değiştirme yetkiniz yok')
            if role_name == 'super_admin' and not admin.is_super_admin:
                raise AuthorizationError('Super admin atama yetkiniz yok')
            
            role = Role.query.filter_by(name=role_name).first()
            if role:
                user.role = role
        
        # Diğer alanları güncelle
        allowed_fields = ['first_name', 'last_name', 'phone', 'is_active', 'is_verified']
        for field in allowed_fields:
            if field in data:
                setattr(user, field, data[field])
        
        db.session.commit()
        
        # Log
        AdminActionService.log_action(
            action_type=AdminActionType.USER_UPDATE.value,
            admin_id=admin_id,
            target_type='user',
            target_id=user.id,
            target_name=user.full_name,
            old_values=old_values,
            new_values={k: getattr(user, k) if hasattr(user, k) else data.get(k) for k in data.keys()}
        )
        
        return user
    
    @classmethod
    def delete_user(cls, user_id: int, admin_id: int, hard_delete: bool = False) -> bool:
        """
        Kullanıcı silme (soft delete varsayılan).
        """
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        # Super admin koruması
        admin = User.query.get(admin_id)
        if user.is_super_admin and not admin.is_super_admin:
            raise AuthorizationError('Super admin silme yetkiniz yok')
        
        # Kendini silme koruması
        if user_id == admin_id:
            raise ValidationError('Kendinizi silemezsiniz')
        
        if hard_delete:
            db.session.delete(user)
        else:
            user.is_deleted = True
            user.is_active = False
        
        db.session.commit()
        
        # Log
        AdminActionService.log_action(
            action_type=AdminActionType.USER_DELETE.value,
            admin_id=admin_id,
            target_type='user',
            target_id=user_id,
            target_name=user.full_name,
            description=f'Kullanıcı {"kalıcı olarak " if hard_delete else ""}silindi'
        )
        
        return True
    
    @classmethod
    def change_user_role(cls, user_id: int, new_role: str, admin_id: int) -> User:
        """
        Kullanıcı rolünü değiştirir.
        """
        user = User.query.get(user_id)
        if not user or user.is_deleted:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        admin = User.query.get(admin_id)
        old_role = user.role.name if user.role else None
        
        # Yetki kontrolleri
        if user.is_super_admin and not admin.is_super_admin:
            raise AuthorizationError('Super admin rolünü değiştirme yetkiniz yok')
        if new_role == 'super_admin' and not admin.is_super_admin:
            raise AuthorizationError('Super admin atama yetkiniz yok')
        
        role = Role.query.filter_by(name=new_role).first()
        if not role:
            raise ValidationError(f'Geçersiz rol: {new_role}')
        
        user.role = role
        db.session.commit()
        
        # Log
        AdminActionService.log_action(
            action_type=AdminActionType.USER_ROLE_CHANGE.value,
            admin_id=admin_id,
            target_type='user',
            target_id=user.id,
            target_name=user.full_name,
            old_values={'role': old_role},
            new_values={'role': new_role},
            description=f'Rol değiştirildi: {old_role} -> {new_role}'
        )
        
        return user
    
    @classmethod
    def activate_user(cls, user_id: int, admin_id: int, activate: bool = True) -> User:
        """
        Kullanıcıyı aktifleştirir veya deaktifleştirir.
        """
        user = User.query.get(user_id)
        if not user or user.is_deleted:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        user.is_active = activate
        db.session.commit()
        
        action = AdminActionType.USER_ACTIVATE if activate else AdminActionType.USER_DEACTIVATE
        
        AdminActionService.log_action(
            action_type=action.value,
            admin_id=admin_id,
            target_type='user',
            target_id=user.id,
            target_name=user.full_name,
            description=f'Kullanıcı {"aktifleştirildi" if activate else "deaktifleştirildi"}'
        )
        
        return user
    
    @classmethod
    def reset_password(cls, user_id: int, admin_id: int, new_password: str = None) -> str:
        """
        Kullanıcı şifresini sıfırlar.
        
        Returns:
            Yeni şifre (geçici)
        """
        user = User.query.get(user_id)
        if not user or user.is_deleted:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        # Geçici şifre oluştur
        if not new_password:
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            new_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        
        user.set_password(new_password, force_change=True)
        db.session.commit()
        
        AdminActionService.log_action(
            action_type=AdminActionType.USER_PASSWORD_RESET.value,
            admin_id=admin_id,
            target_type='user',
            target_id=user.id,
            target_name=user.full_name,
            description='Şifre sıfırlandı'
        )
        
        return new_password
    
    @classmethod
    def unlock_user(cls, user_id: int, admin_id: int) -> User:
        """
        Kilitli kullanıcı hesabını açar.
        """
        user = User.query.get(user_id)
        if not user or user.is_deleted:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        user.unlock_account()
        
        AdminActionService.log_action(
            action_type=AdminActionType.USER_UNLOCK.value,
            admin_id=admin_id,
            target_type='user',
            target_id=user.id,
            target_name=user.full_name,
            description='Hesap kilidi açıldı'
        )
        
        return user
    
    @classmethod
    def bulk_action(
        cls,
        user_ids: List[int],
        action: str,
        admin_id: int,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Toplu kullanıcı işlemi.
        
        Args:
            user_ids: Kullanıcı ID listesi
            action: activate, deactivate, delete, change_role
            admin_id: Admin ID
            **kwargs: Ek parametreler (role için new_role gibi)
        
        Returns:
            İşlem sonucu
        """
        success = []
        failed = []
        
        for user_id in user_ids:
            try:
                if action == 'activate':
                    cls.activate_user(user_id, admin_id, activate=True)
                elif action == 'deactivate':
                    cls.activate_user(user_id, admin_id, activate=False)
                elif action == 'delete':
                    cls.delete_user(user_id, admin_id)
                elif action == 'change_role':
                    cls.change_user_role(user_id, kwargs.get('new_role'), admin_id)
                
                success.append(user_id)
            except Exception as e:
                failed.append({'user_id': user_id, 'error': str(e)})
        
        return {
            'success_count': len(success),
            'failed_count': len(failed),
            'success_ids': success,
            'failed': failed
        }


# =============================================================================
# Content Approval Service
# =============================================================================

class ContentApprovalService:
    """
    İçerik onay servisi.
    
    İçerik onaylama, reddetme, kuyruk yönetimi.
    """
    
    @classmethod
    def get_pending_queue(
        cls,
        page: int = 1,
        per_page: int = 20,
        content_type: str = None,
        priority: int = None,
        assigned_to_id: int = None
    ) -> PaginationResult:
        """
        Onay bekleyen içerik kuyruğunu döner.
        """
        query = ContentApprovalQueue.query.filter_by(status='pending')
        
        if content_type:
            query = query.filter(ContentApprovalQueue.content_type == content_type)
        
        if priority is not None:
            query = query.filter(ContentApprovalQueue.priority == priority)
        
        if assigned_to_id:
            query = query.filter(ContentApprovalQueue.assigned_to_id == assigned_to_id)
        
        query = query.order_by(
            desc(ContentApprovalQueue.priority),
            ContentApprovalQueue.created_at
        )
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_queue_stats(cls) -> Dict[str, Any]:
        """
        Onay kuyruğu istatistikleri.
        """
        pending = ContentApprovalQueue.query.filter_by(status='pending').count()
        in_review = ContentApprovalQueue.query.filter_by(status='in_review').count()
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        approved_today = ContentApprovalQueue.query.filter(
            ContentApprovalQueue.status == 'approved',
            ContentApprovalQueue.reviewed_at >= today
        ).count()
        rejected_today = ContentApprovalQueue.query.filter(
            ContentApprovalQueue.status == 'rejected',
            ContentApprovalQueue.reviewed_at >= today
        ).count()
        
        # Ortalama inceleme süresi
        avg_time = db.session.query(
            func.avg(ContentApprovalQueue.review_time_minutes)
        ).filter(
            ContentApprovalQueue.review_time_minutes.isnot(None)
        ).scalar() or 0
        
        return {
            'pending': pending,
            'in_review': in_review,
            'approved_today': approved_today,
            'rejected_today': rejected_today,
            'average_review_time_minutes': round(avg_time, 1),
            'total_in_queue': pending + in_review
        }
    
    @classmethod
    def assign_to_admin(
        cls,
        queue_id: int,
        admin_id: int,
        assigner_id: int
    ) -> ContentApprovalQueue:
        """
        İçeriği bir admine atar.
        """
        item = ContentApprovalQueue.query.get(queue_id)
        if not item:
            raise NotFoundError('Kuyruk öğesi bulunamadı')
        
        item.assigned_to_id = admin_id
        item.assigned_at = datetime.utcnow()
        item.status = 'in_review'
        
        db.session.commit()
        
        return item
    
    @classmethod
    def approve_content(
        cls,
        queue_id: int,
        admin_id: int,
        notes: str = None
    ) -> ContentApprovalQueue:
        """
        İçeriği onaylar.
        """
        item = ContentApprovalQueue.query.get(queue_id)
        if not item:
            raise NotFoundError('Kuyruk öğesi bulunamadı')
        
        # İçeriği güncelle
        content = cls._get_content(item.content_type, item.content_id)
        if content and hasattr(content, 'approve'):
            content.approve(admin_id)
        
        # Kuyruk öğesini güncelle
        item.status = 'approved'
        item.reviewed_by_id = admin_id
        item.reviewed_at = datetime.utcnow()
        item.reviewer_notes = notes
        
        # İnceleme süresini hesapla
        if item.assigned_at:
            delta = datetime.utcnow() - item.assigned_at
            item.review_time_minutes = int(delta.total_seconds() / 60)
        
        db.session.commit()
        
        # Log
        AdminActionService.log_action(
            action_type=AdminActionType.CONTENT_APPROVE.value,
            admin_id=admin_id,
            target_type=item.content_type,
            target_id=item.content_id,
            target_name=item.content_title,
            description='İçerik onaylandı'
        )
        
        return item
    
    @classmethod
    def reject_content(
        cls,
        queue_id: int,
        admin_id: int,
        reason: str,
        details: str = None
    ) -> ContentApprovalQueue:
        """
        İçeriği reddeder.
        """
        item = ContentApprovalQueue.query.get(queue_id)
        if not item:
            raise NotFoundError('Kuyruk öğesi bulunamadı')
        
        # İçeriği güncelle
        content = cls._get_content(item.content_type, item.content_id)
        if content and hasattr(content, 'reject'):
            content.reject(admin_id, reason, details)
        
        # Kuyruk öğesini güncelle
        item.status = 'rejected'
        item.reviewed_by_id = admin_id
        item.reviewed_at = datetime.utcnow()
        item.rejection_reason = reason
        item.rejection_details = details
        item.revision_count += 1
        
        if item.assigned_at:
            delta = datetime.utcnow() - item.assigned_at
            item.review_time_minutes = int(delta.total_seconds() / 60)
        
        db.session.commit()
        
        # Log
        AdminActionService.log_action(
            action_type=AdminActionType.CONTENT_REJECT.value,
            admin_id=admin_id,
            target_type=item.content_type,
            target_id=item.content_id,
            target_name=item.content_title,
            description=f'İçerik reddedildi: {reason}'
        )
        
        return item
    
    @classmethod
    def _get_content(cls, content_type: str, content_id: int):
        """İçerik tipine göre içeriği döner."""
        if content_type == 'video':
            from app.modules.contents.models import Video
            return Video.query.get(content_id)
        elif content_type == 'document':
            from app.modules.contents.models import Document
            return Document.query.get(content_id)
        elif content_type == 'course':
            from app.models.course import Course
            return Course.query.get(content_id)
        return None
    
    @classmethod
    def submit_for_approval(
        cls,
        content_type: str,
        content_id: int,
        content_title: str,
        submitted_by_id: int,
        priority: int = 0
    ) -> ContentApprovalQueue:
        """
        İçeriği onaya gönderir.
        """
        # Zaten kuyrukta mı kontrol et
        existing = ContentApprovalQueue.query.filter_by(
            content_type=content_type,
            content_id=content_id,
            status='pending'
        ).first()
        
        if existing:
            raise ConflictError('Bu içerik zaten onay bekliyor')
        
        item = ContentApprovalQueue(
            content_type=content_type,
            content_id=content_id,
            content_title=content_title,
            submitted_by_id=submitted_by_id,
            priority=priority
        )
        
        db.session.add(item)
        db.session.commit()
        
        return item


# =============================================================================
# Package Management Service
# =============================================================================

class PackageManagementService:
    """
    Paket yönetimi servisi.
    
    Paket CRUD ve kullanıcı atama işlemleri.
    """
    
    @classmethod
    def get_packages(
        cls,
        page: int = 1,
        per_page: int = 20,
        status: str = None,
        package_type: str = None,
        include_stats: bool = False
    ) -> PaginationResult:
        """
        Paket listesi.
        """
        query = Package.query
        
        if status:
            query = query.filter(Package.status == status)
        
        if package_type:
            query = query.filter(Package.package_type == package_type)
        
        query = query.order_by(Package.display_order, Package.created_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_package_details(cls, package_id: int) -> Dict[str, Any]:
        """
        Paket detayları ve istatistikleri.
        """
        package = Package.query.get(package_id)
        if not package:
            raise NotFoundError('Paket bulunamadı')
        
        # Abonelik istatistikleri
        active_count = UserPackage.query.filter_by(
            package_id=package_id,
            subscription_status=SubscriptionStatus.ACTIVE.value
        ).count()
        
        expired_count = UserPackage.query.filter_by(
            package_id=package_id,
            subscription_status=SubscriptionStatus.EXPIRED.value
        ).count()
        
        total_revenue = db.session.query(
            func.sum(UserPackage.amount_paid)
        ).filter(
            UserPackage.package_id == package_id,
            UserPackage.payment_status == PaymentStatus.COMPLETED.value
        ).scalar() or 0
        
        return {
            'package': package.to_dict(include_stats=True),
            'stats': {
                'active_subscriptions': active_count,
                'expired_subscriptions': expired_count,
                'total_revenue': float(total_revenue),
                'conversion_rate': 0  # TODO: Hesapla
            }
        }
    
    @classmethod
    def create_package(cls, data: Dict[str, Any], admin_id: int) -> Package:
        """
        Yeni paket oluşturur.
        """
        # Slug kontrolü
        slug = data.get('slug')
        if Package.query.filter_by(slug=slug).first():
            raise ConflictError('Bu slug zaten kullanılıyor')
        
        package = Package(
            name=data['name'],
            slug=slug,
            description=data.get('description'),
            short_description=data.get('short_description'),
            package_type=data.get('package_type', 'monthly'),
            duration_days=data.get('duration_days', 30),
            price=data['price'],
            discount_price=data.get('discount_price'),
            currency=data.get('currency', 'TRY'),
            features=data.get('features', []),
            max_courses=data.get('max_courses'),
            max_downloads=data.get('max_downloads'),
            max_live_sessions=data.get('max_live_sessions'),
            ai_questions_per_day=data.get('ai_questions_per_day', 0),
            ai_questions_per_month=data.get('ai_questions_per_month', 0),
            course_ids=data.get('course_ids', []),
            category_ids=data.get('category_ids', []),
            all_courses_access=data.get('all_courses_access', False),
            is_published=data.get('is_published', False),
            is_featured=data.get('is_featured', False),
            display_order=data.get('display_order', 0),
            created_by=admin_id
        )
        
        db.session.add(package)
        db.session.commit()
        
        AdminActionService.log_action(
            action_type=AdminActionType.PACKAGE_CREATE.value,
            admin_id=admin_id,
            target_type='package',
            target_id=package.id,
            target_name=package.name,
            description='Paket oluşturuldu'
        )
        
        return package
    
    @classmethod
    def update_package(cls, package_id: int, data: Dict[str, Any], admin_id: int) -> Package:
        """
        Paket günceller.
        """
        package = Package.query.get(package_id)
        if not package:
            raise NotFoundError('Paket bulunamadı')
        
        old_values = package.to_dict()
        
        # Slug değişiyorsa kontrol et
        if 'slug' in data and data['slug'] != package.slug:
            if Package.query.filter_by(slug=data['slug']).first():
                raise ConflictError('Bu slug zaten kullanılıyor')
        
        # Güncellenebilir alanlar
        updatable_fields = [
            'name', 'slug', 'description', 'short_description', 'package_type',
            'duration_days', 'price', 'discount_price', 'currency', 'features',
            'max_courses', 'max_downloads', 'max_live_sessions',
            'ai_questions_per_day', 'ai_questions_per_month',
            'course_ids', 'category_ids', 'all_courses_access',
            'status', 'is_published', 'is_featured', 'display_order'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(package, field, data[field])
        
        package.updated_by = admin_id
        db.session.commit()
        
        AdminActionService.log_action(
            action_type=AdminActionType.PACKAGE_UPDATE.value,
            admin_id=admin_id,
            target_type='package',
            target_id=package.id,
            target_name=package.name,
            old_values=old_values,
            new_values=package.to_dict()
        )
        
        return package
    
    @classmethod
    def delete_package(cls, package_id: int, admin_id: int) -> bool:
        """
        Paket siler.
        """
        package = Package.query.get(package_id)
        if not package:
            raise NotFoundError('Paket bulunamadı')
        
        # Aktif abonelikleri kontrol et
        active_subs = UserPackage.query.filter_by(
            package_id=package_id,
            subscription_status=SubscriptionStatus.ACTIVE.value
        ).count()
        
        if active_subs > 0:
            raise ValidationError(f'Bu paketin {active_subs} aktif abonesi var. Önce arşivleyin.')
        
        package_name = package.name
        db.session.delete(package)
        db.session.commit()
        
        AdminActionService.log_action(
            action_type=AdminActionType.PACKAGE_DELETE.value,
            admin_id=admin_id,
            target_type='package',
            target_id=package_id,
            target_name=package_name,
            description='Paket silindi'
        )
        
        return True
    
    @classmethod
    def assign_package_to_user(
        cls,
        package_id: int,
        user_id: int,
        admin_id: int,
        duration_days: int = None,
        amount: float = 0,
        notes: str = None
    ) -> UserPackage:
        """
        Kullanıcıya paket atar.
        """
        package = Package.query.get(package_id)
        if not package:
            raise NotFoundError('Paket bulunamadı')
        
        user = User.query.get(user_id)
        if not user or user.is_deleted:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        # Aktif aynı paket var mı kontrol et
        existing = UserPackage.query.filter_by(
            user_id=user_id,
            package_id=package_id,
            subscription_status=SubscriptionStatus.ACTIVE.value
        ).first()
        
        if existing:
            raise ConflictError('Kullanıcının bu pakete zaten aktif aboneliği var')
        
        # Süre hesapla
        if duration_days is None:
            duration_days = package.duration_days or 30
        
        starts_at = datetime.utcnow()
        expires_at = None if package.is_lifetime else starts_at + timedelta(days=duration_days)
        
        user_package = UserPackage(
            user_id=user_id,
            package_id=package_id,
            starts_at=starts_at,
            expires_at=expires_at,
            subscription_status=SubscriptionStatus.ACTIVE.value,
            payment_status=PaymentStatus.COMPLETED.value,
            payment_method='admin_assignment',
            amount_paid=amount,
            currency=package.currency
        )
        
        db.session.add(user_package)
        
        # Paket istatistiklerini güncelle
        package.total_subscribers = (package.total_subscribers or 0) + 1
        
        db.session.commit()
        
        AdminActionService.log_action(
            action_type=AdminActionType.PACKAGE_ASSIGN.value,
            admin_id=admin_id,
            target_type='user_package',
            target_id=user_package.id,
            target_name=f'{user.full_name} - {package.name}',
            description=f'Paket atandı: {package.name}',
            new_values={
                'user_id': user_id,
                'package_id': package_id,
                'duration_days': duration_days,
                'notes': notes
            }
        )
        
        return user_package
    
    @classmethod
    def revoke_package(
        cls,
        user_package_id: int,
        admin_id: int,
        reason: str = None
    ) -> UserPackage:
        """
        Kullanıcının paket erişimini iptal eder.
        """
        user_package = UserPackage.query.get(user_package_id)
        if not user_package:
            raise NotFoundError('Abonelik bulunamadı')
        
        old_status = user_package.subscription_status
        user_package.subscription_status = SubscriptionStatus.CANCELLED.value
        user_package.cancelled_at = datetime.utcnow()
        user_package.cancellation_reason = reason or 'Admin tarafından iptal edildi'
        
        db.session.commit()
        
        AdminActionService.log_action(
            action_type=AdminActionType.PACKAGE_REVOKE.value,
            admin_id=admin_id,
            target_type='user_package',
            target_id=user_package_id,
            description=f'Paket erişimi iptal edildi: {reason}',
            old_values={'status': old_status},
            new_values={'status': SubscriptionStatus.CANCELLED.value}
        )
        
        return user_package


# =============================================================================
# System Settings Service
# =============================================================================

class SystemSettingsService:
    """
    Sistem ayarları servisi.
    
    Ayarları okuma, yazma ve yönetme.
    """
    
    # Varsayılan ayarlar
    DEFAULT_SETTINGS = {
        # Genel
        'site_name': {'value': 'Öğrenci Sistemi', 'type': 'string', 'label': 'Site Adı', 'category': 'general'},
        'site_description': {'value': 'Online Eğitim Platformu', 'type': 'string', 'label': 'Site Açıklaması', 'category': 'general'},
        'maintenance_mode': {'value': 'false', 'type': 'boolean', 'label': 'Bakım Modu', 'category': 'general'},
        'allow_registration': {'value': 'true', 'type': 'boolean', 'label': 'Kayıt İzni', 'category': 'general'},
        
        # Güvenlik
        'max_login_attempts': {'value': '5', 'type': 'integer', 'label': 'Maks. Giriş Denemesi', 'category': 'security'},
        'lockout_duration_minutes': {'value': '30', 'type': 'integer', 'label': 'Kilitleme Süresi (dk)', 'category': 'security'},
        'password_min_length': {'value': '8', 'type': 'integer', 'label': 'Min. Şifre Uzunluğu', 'category': 'security'},
        'session_timeout_minutes': {'value': '60', 'type': 'integer', 'label': 'Oturum Zaman Aşımı (dk)', 'category': 'security'},
        
        # E-posta
        'email_from_name': {'value': 'Öğrenci Sistemi', 'type': 'string', 'label': 'Gönderen Adı', 'category': 'email'},
        'email_from_address': {'value': 'noreply@example.com', 'type': 'string', 'label': 'Gönderen E-posta', 'category': 'email'},
        
        # İçerik
        'require_content_approval': {'value': 'true', 'type': 'boolean', 'label': 'İçerik Onayı Gerekli', 'category': 'content'},
        'max_video_size_mb': {'value': '500', 'type': 'integer', 'label': 'Maks. Video Boyutu (MB)', 'category': 'content'},
        'max_document_size_mb': {'value': '50', 'type': 'integer', 'label': 'Maks. Döküman Boyutu (MB)', 'category': 'content'},
        
        # AI
        'ai_enabled': {'value': 'true', 'type': 'boolean', 'label': 'AI Aktif', 'category': 'ai'},
        'ai_default_model': {'value': 'gpt-4', 'type': 'string', 'label': 'Varsayılan AI Modeli', 'category': 'ai'},
        
        # Limitler
        'default_daily_ai_limit': {'value': '50', 'type': 'integer', 'label': 'Günlük AI Limiti', 'category': 'limits'},
        'default_monthly_ai_limit': {'value': '1000', 'type': 'integer', 'label': 'Aylık AI Limiti', 'category': 'limits'},
    }
    
    @classmethod
    def get_all_settings(cls, category: str = None, include_secrets: bool = False) -> List[Dict[str, Any]]:
        """
        Tüm ayarları döner.
        """
        query = SystemSetting.query
        
        if category:
            query = query.filter(SystemSetting.category == category)
        
        if not include_secrets:
            query = query.filter(SystemSetting.setting_type != SettingType.SECRET.value)
        
        settings = query.order_by(SystemSetting.category, SystemSetting.display_order).all()
        
        return [s.to_dict() for s in settings]
    
    @classmethod
    def get_setting(cls, key: str) -> Any:
        """
        Tek bir ayarın değerini döner.
        """
        setting = SystemSetting.query.filter_by(key=key).first()
        
        if setting:
            return setting.get_typed_value()
        
        # Varsayılan değer
        if key in cls.DEFAULT_SETTINGS:
            default = cls.DEFAULT_SETTINGS[key]
            return cls._convert_default(default['value'], default['type'])
        
        return None
    
    @classmethod
    def _convert_default(cls, value: str, value_type: str) -> Any:
        """Varsayılan değeri uygun tipe dönüştürür."""
        if value_type == 'boolean':
            return value.lower() == 'true'
        elif value_type == 'integer':
            return int(value)
        elif value_type == 'float':
            return float(value)
        return value
    
    @classmethod
    def set_setting(cls, key: str, value: Any, admin_id: int) -> SystemSetting:
        """
        Ayar değerini günceller.
        """
        setting = SystemSetting.query.filter_by(key=key).first()
        
        if not setting:
            # Yeni ayar oluştur
            if key not in cls.DEFAULT_SETTINGS:
                raise ValidationError(f'Bilinmeyen ayar: {key}')
            
            default = cls.DEFAULT_SETTINGS[key]
            setting = SystemSetting(
                key=key,
                category=default['category'],
                setting_type=default['type'],
                label=default['label'],
                default_value=default['value']
            )
            db.session.add(setting)
        
        # Düzenlenebilir mi kontrol et
        if not setting.is_editable:
            raise AuthorizationError('Bu ayar düzenlenemez')
        
        # Validasyon
        is_valid, error = setting.validate_value(value)
        if not is_valid:
            raise ValidationError(error)
        
        old_value = setting.get_typed_value()
        setting.set_typed_value(value)
        setting.updated_by_id = admin_id
        
        db.session.commit()
        
        # Log
        AdminActionService.log_action(
            action_type=AdminActionType.SETTING_UPDATE.value,
            admin_id=admin_id,
            target_type='setting',
            target_id=setting.id,
            target_name=key,
            old_values={'value': old_value},
            new_values={'value': value},
            description=f'Ayar güncellendi: {key}'
        )
        
        return setting
    
    @classmethod
    def bulk_update(cls, settings: Dict[str, Any], admin_id: int) -> List[SystemSetting]:
        """
        Birden fazla ayarı günceller.
        """
        updated = []
        
        for key, value in settings.items():
            try:
                setting = cls.set_setting(key, value, admin_id)
                updated.append(setting)
            except Exception as e:
                # Hata olursa devam et ama logla
                pass
        
        return updated
    
    @classmethod
    def initialize_defaults(cls):
        """
        Varsayılan ayarları veritabanına yükler.
        """
        for key, default in cls.DEFAULT_SETTINGS.items():
            existing = SystemSetting.query.filter_by(key=key).first()
            if not existing:
                setting = SystemSetting(
                    key=key,
                    value=default['value'],
                    default_value=default['value'],
                    category=default['category'],
                    setting_type=default['type'],
                    label=default['label'],
                    is_public=default.get('is_public', False),
                    is_editable=default.get('is_editable', True)
                )
                db.session.add(setting)
        
        db.session.commit()
    
    @classmethod
    def get_settings_by_category(cls) -> Dict[str, List[Dict[str, Any]]]:
        """
        Kategorilere göre gruplu ayarlar.
        """
        settings = cls.get_all_settings()
        
        grouped = {}
        for setting in settings:
            category = setting['category']
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(setting)
        
        return grouped


# =============================================================================
# Admin Action Log Service
# =============================================================================

class AdminActionService:
    """
    Admin işlem log servisi.
    """
    
    @classmethod
    def log_action(
        cls,
        action_type: str,
        admin_id: int = None,
        target_type: str = None,
        target_id: int = None,
        target_name: str = None,
        description: str = None,
        old_values: Dict = None,
        new_values: Dict = None,
        success: bool = True,
        error_message: str = None,
        **kwargs
    ) -> AdminActionLog:
        """
        Admin işlem logu oluşturur.
        """
        from flask import request, has_request_context
        
        # Admin ID'yi al
        if admin_id is None:
            from flask_jwt_extended import get_jwt_identity
            try:
                admin_id = get_jwt_identity()
            except:
                pass
        
        # İstek bilgilerini al
        ip_address = None
        user_agent = None
        
        if has_request_context():
            ip_address = request.remote_addr
            user_agent = request.user_agent.string if request.user_agent else None
        
        log = AdminActionLog(
            admin_id=admin_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            target_name=target_name,
            description=description,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message
        )
        
        db.session.add(log)
        db.session.commit()
        
        return log
    
    @classmethod
    def get_logs(
        cls,
        page: int = 1,
        per_page: int = 50,
        admin_id: int = None,
        action_type: str = None,
        target_type: str = None,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> PaginationResult:
        """
        Admin işlem loglarını döner.
        """
        query = AdminActionLog.query
        
        if admin_id:
            query = query.filter(AdminActionLog.admin_id == admin_id)
        
        if action_type:
            query = query.filter(AdminActionLog.action_type == action_type)
        
        if target_type:
            query = query.filter(AdminActionLog.target_type == target_type)
        
        if start_date:
            query = query.filter(AdminActionLog.created_at >= start_date)
        
        if end_date:
            query = query.filter(AdminActionLog.created_at <= end_date)
        
        query = query.order_by(desc(AdminActionLog.created_at))
        
        return paginate_query(query, page, per_page)


# =============================================================================
# Announcement Service
# =============================================================================

class AnnouncementService:
    """
    Duyuru servisi.
    """
    
    @classmethod
    def get_announcements(
        cls,
        page: int = 1,
        per_page: int = 20,
        active_only: bool = True
    ) -> PaginationResult:
        """
        Duyuru listesi.
        """
        query = SystemAnnouncement.query
        
        if active_only:
            now = datetime.utcnow()
            query = query.filter(
                SystemAnnouncement.is_active == True,
                or_(SystemAnnouncement.starts_at.is_(None), SystemAnnouncement.starts_at <= now),
                or_(SystemAnnouncement.ends_at.is_(None), SystemAnnouncement.ends_at >= now)
            )
        
        query = query.order_by(desc(SystemAnnouncement.created_at))
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_user_announcements(cls, user) -> List[SystemAnnouncement]:
        """
        Kullanıcıya görünür duyuruları döner.
        """
        all_announcements = SystemAnnouncement.query.filter(
            SystemAnnouncement.is_active == True
        ).all()
        
        return [a for a in all_announcements if a.is_visible_to_user(user)]
    
    @classmethod
    def create_announcement(cls, data: Dict[str, Any], admin_id: int) -> SystemAnnouncement:
        """
        Yeni duyuru oluşturur.
        """
        announcement = SystemAnnouncement(
            title=data['title'],
            content=data['content'],
            announcement_type=data.get('announcement_type', AnnouncementType.INFO.value),
            starts_at=data.get('starts_at'),
            ends_at=data.get('ends_at'),
            target_roles=data.get('target_roles', []),
            target_user_ids=data.get('target_user_ids', []),
            is_active=data.get('is_active', True),
            is_dismissible=data.get('is_dismissible', True),
            show_on_dashboard=data.get('show_on_dashboard', True),
            show_on_login=data.get('show_on_login', False),
            created_by_id=admin_id
        )
        
        db.session.add(announcement)
        db.session.commit()
        
        return announcement
    
    @classmethod
    def update_announcement(cls, announcement_id: int, data: Dict[str, Any]) -> SystemAnnouncement:
        """
        Duyuru günceller.
        """
        announcement = SystemAnnouncement.query.get(announcement_id)
        if not announcement:
            raise NotFoundError('Duyuru bulunamadı')
        
        updatable_fields = [
            'title', 'content', 'announcement_type', 'starts_at', 'ends_at',
            'target_roles', 'target_user_ids', 'is_active', 'is_dismissible',
            'show_on_dashboard', 'show_on_login'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(announcement, field, data[field])
        
        db.session.commit()
        
        return announcement
    
    @classmethod
    def delete_announcement(cls, announcement_id: int) -> bool:
        """
        Duyuru siler.
        """
        announcement = SystemAnnouncement.query.get(announcement_id)
        if not announcement:
            raise NotFoundError('Duyuru bulunamadı')
        
        db.session.delete(announcement)
        db.session.commit()
        
        return True
    
    @classmethod
    def record_view(cls, announcement_id: int):
        """
        Duyuru görüntüleme sayısını artırır.
        """
        announcement = SystemAnnouncement.query.get(announcement_id)
        if announcement:
            announcement.view_count = (announcement.view_count or 0) + 1
            db.session.commit()
    
    @classmethod
    def record_dismiss(cls, announcement_id: int):
        """
        Duyuru kapatma sayısını artırır.
        """
        announcement = SystemAnnouncement.query.get(announcement_id)
        if announcement:
            announcement.dismiss_count = (announcement.dismiss_count or 0) + 1
            db.session.commit()


# =============================================================================
# Dashboard Stats Service
# =============================================================================

class AdminDashboardService:
    """
    Admin dashboard istatistikleri servisi.
    """
    
    @classmethod
    def get_overview_stats(cls) -> Dict[str, Any]:
        """
        Genel istatistikler.
        """
        from app.models.course import Course, Enrollment
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Kullanıcı istatistikleri
        total_users = User.query.filter_by(is_deleted=False).count()
        active_users = User.query.filter_by(is_deleted=False, is_active=True).count()
        new_users_today = User.query.filter(
            User.is_deleted == False,
            User.created_at >= today
        ).count()
        new_users_week = User.query.filter(
            User.is_deleted == False,
            User.created_at >= week_ago
        ).count()
        
        # Kurs istatistikleri
        total_courses = Course.query.count()
        published_courses = Course.query.filter_by(is_published=True).count()
        
        # Enrollment istatistikleri
        total_enrollments = Enrollment.query.count()
        new_enrollments_week = Enrollment.query.filter(
            Enrollment.created_at >= week_ago
        ).count()
        
        # Paket istatistikleri
        active_subscriptions = UserPackage.query.filter_by(
            subscription_status=SubscriptionStatus.ACTIVE.value
        ).count()
        
        # Gelir (son 30 gün)
        revenue_month = db.session.query(
            func.sum(UserPackage.amount_paid)
        ).filter(
            UserPackage.payment_status == PaymentStatus.COMPLETED.value,
            UserPackage.created_at >= month_ago
        ).scalar() or 0
        
        return {
            'users': {
                'total': total_users,
                'active': active_users,
                'new_today': new_users_today,
                'new_week': new_users_week,
            },
            'courses': {
                'total': total_courses,
                'published': published_courses,
            },
            'enrollments': {
                'total': total_enrollments,
                'new_week': new_enrollments_week,
            },
            'subscriptions': {
                'active': active_subscriptions,
            },
            'revenue': {
                'last_30_days': float(revenue_month),
            }
        }
    
    @classmethod
    def get_user_growth_chart(cls, days: int = 30) -> List[Dict[str, Any]]:
        """
        Kullanıcı büyüme grafiği verileri.
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        results = db.session.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        ).filter(
            User.created_at >= start_date,
            User.is_deleted == False
        ).group_by(
            func.date(User.created_at)
        ).order_by('date').all()
        
        return [{'date': str(r.date), 'count': r.count} for r in results]
    
    @classmethod
    def get_revenue_chart(cls, days: int = 30) -> List[Dict[str, Any]]:
        """
        Gelir grafiği verileri.
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        results = db.session.query(
            func.date(UserPackage.created_at).label('date'),
            func.sum(UserPackage.amount_paid).label('amount')
        ).filter(
            UserPackage.created_at >= start_date,
            UserPackage.payment_status == PaymentStatus.COMPLETED.value
        ).group_by(
            func.date(UserPackage.created_at)
        ).order_by('date').all()
        
        return [{'date': str(r.date), 'amount': float(r.amount or 0)} for r in results]
    
    @classmethod
    def get_recent_activities(cls, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Son admin aktiviteleri.
        """
        logs = AdminActionLog.query.order_by(
            desc(AdminActionLog.created_at)
        ).limit(limit).all()
        
        return [log.to_dict() for log in logs]
