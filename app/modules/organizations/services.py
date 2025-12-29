"""
Organization Service
═══════════════════════════════════════════════════════════════════════════════

Kurum yönetimi için iş mantığı katmanı.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
import secrets

from sqlalchemy import or_, and_, func

from app.extensions import db
from app.models.organization import Organization, OrganizationInvitation, OrganizationStatus
from app.models.user import User, Role
from app.core.exceptions import (
    ValidationError, NotFoundError, ConflictError,
    ForbiddenError, QuotaExceededError
)


class OrganizationService:
    """Kurum yönetimi servisi."""
    
    # =========================================================================
    # CRUD Operations
    # =========================================================================
    
    @staticmethod
    def create(data: Dict[str, Any]) -> Organization:
        """
        Yeni kurum oluştur.
        
        Args:
            data: Kurum verileri (name, email, vb.)
            
        Returns:
            Oluşturulan Organization nesnesi
        """
        name = data.get('name')
        if not name:
            raise ValidationError('Kurum adı zorunludur')
        
        # Generate unique slug
        slug = Organization.generate_slug(name)
        base_slug = slug
        counter = 1
        while Organization.query.filter_by(slug=slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        org = Organization(
            name=name,
            slug=slug,
            description=data.get('description'),
            email=data.get('email'),
            phone=data.get('phone'),
            address=data.get('address'),
            website=data.get('website'),
            logo_url=data.get('logo_url'),
            primary_color=data.get('primary_color', '#3B82F6'),
            secondary_color=data.get('secondary_color', '#10B981'),
            status=data.get('status', OrganizationStatus.TRIAL),
            max_students=data.get('max_students', 50),
            max_teachers=data.get('max_teachers', 10),
            max_admins=data.get('max_admins', 2),
            max_courses=data.get('max_courses', 20),
            max_storage_gb=data.get('max_storage_gb', 10),
            subscription_plan=data.get('subscription_plan', 'trial'),
            features=data.get('features'),
            settings=data.get('settings'),
        )
        
        # Set subscription dates for trial
        if org.status == OrganizationStatus.TRIAL:
            org.subscription_start = datetime.utcnow()
            org.subscription_end = datetime.utcnow() + timedelta(days=30)
        
        db.session.add(org)
        db.session.commit()
        
        return org
    
    @staticmethod
    def get_by_id(org_id: int) -> Organization:
        """ID ile kurum getir."""
        org = Organization.query.get(org_id)
        if not org:
            raise NotFoundError('Kurum bulunamadı')
        return org
    
    @staticmethod
    def get_by_slug(slug: str) -> Organization:
        """Slug ile kurum getir."""
        org = Organization.query.filter_by(slug=slug).first()
        if not org:
            raise NotFoundError('Kurum bulunamadı')
        return org
    
    @staticmethod
    def update(org_id: int, data: Dict[str, Any]) -> Organization:
        """Kurum güncelle."""
        org = OrganizationService.get_by_id(org_id)
        
        updatable_fields = [
            'name', 'description', 'email', 'phone', 'address', 'website',
            'logo_url', 'primary_color', 'secondary_color', 'status',
            'max_students', 'max_teachers', 'max_admins', 'max_courses',
            'max_storage_gb', 'subscription_plan', 'subscription_start',
            'subscription_end', 'features', 'settings', 'is_active'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(org, field, data[field])
        
        org.updated_at = datetime.utcnow()
        db.session.commit()
        
        return org
    
    @staticmethod
    def delete(org_id: int, hard_delete: bool = False) -> bool:
        """
        Kurum sil.
        
        Args:
            org_id: Kurum ID
            hard_delete: True ise veritabanından siler, False ise deaktive eder
        """
        org = OrganizationService.get_by_id(org_id)
        
        if hard_delete:
            # Check for users
            user_count = User.query.filter_by(organization_id=org_id, is_deleted=False).count()
            if user_count > 0:
                raise ConflictError(f'Kuruma ait {user_count} kullanıcı var. Önce kullanıcıları silin veya taşıyın.')
            
            db.session.delete(org)
        else:
            org.is_active = False
            org.status = OrganizationStatus.SUSPENDED
        
        db.session.commit()
        return True
    
    @staticmethod
    def list_all(
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[Organization], int]:
        """
        Tüm kurumları listele.
        
        Returns:
            Tuple of (organizations list, total count)
        """
        query = Organization.query
        
        if status:
            query = query.filter(Organization.status == status)
        
        if is_active is not None:
            query = query.filter(Organization.is_active == is_active)
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    Organization.name.ilike(search_term),
                    Organization.slug.ilike(search_term),
                    Organization.email.ilike(search_term)
                )
            )
        
        total = query.count()
        
        organizations = query.order_by(Organization.created_at.desc())\
                            .offset((page - 1) * per_page)\
                            .limit(per_page)\
                            .all()
        
        return organizations, total
    
    # =========================================================================
    # User Management
    # =========================================================================
    
    @staticmethod
    def add_user_to_organization(
        org_id: int,
        user_id: int,
        validate_quota: bool = True
    ) -> User:
        """
        Kullanıcıyı kuruma ekle.
        
        Args:
            org_id: Kurum ID
            user_id: Kullanıcı ID
            validate_quota: Kota kontrolü yapılsın mı
        """
        org = OrganizationService.get_by_id(org_id)
        user = User.query.get(user_id)
        
        if not user:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        if user.organization_id == org_id:
            raise ConflictError('Kullanıcı zaten bu kurumda')
        
        # Validate quota
        if validate_quota:
            role_name = user.role.name if user.role else 'student'
            if not org.can_add_user(role_name):
                raise QuotaExceededError(f'{role_name} kotası doldu')
        
        # Remove from old organization
        if user.organization_id:
            old_org = Organization.query.get(user.organization_id)
            if old_org:
                role_name = user.role.name if user.role else 'student'
                old_org.decrement_user_count(role_name)
        
        # Add to new organization
        user.organization_id = org_id
        role_name = user.role.name if user.role else 'student'
        org.increment_user_count(role_name)
        
        db.session.commit()
        return user
    
    @staticmethod
    def remove_user_from_organization(user_id: int) -> User:
        """Kullanıcıyı kurumdan çıkar."""
        user = User.query.get(user_id)
        
        if not user:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        if not user.organization_id:
            raise ValidationError('Kullanıcı herhangi bir kuruma ait değil')
        
        org = Organization.query.get(user.organization_id)
        if org:
            role_name = user.role.name if user.role else 'student'
            org.decrement_user_count(role_name)
        
        user.organization_id = None
        db.session.commit()
        
        return user
    
    @staticmethod
    def get_organization_users(
        org_id: int,
        role: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[User], int]:
        """Kurum kullanıcılarını getir."""
        query = User.query.filter_by(organization_id=org_id, is_deleted=False)
        
        if role:
            query = query.join(Role).filter(Role.name == role)
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    User.email.ilike(search_term),
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term)
                )
            )
        
        total = query.count()
        
        users = query.order_by(User.created_at.desc())\
                    .offset((page - 1) * per_page)\
                    .limit(per_page)\
                    .all()
        
        return users, total
    
    @staticmethod
    def create_user_in_organization(
        org_id: int,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        phone: Optional[str] = None,
        role: str = 'student',
        is_active: bool = True,
        is_verified: bool = True
    ) -> User:
        """
        Kurumda yeni kullanıcı oluştur.
        
        Args:
            org_id: Kurum ID
            email: Kullanıcı email
            password: Şifre
            first_name: Ad
            last_name: Soyad
            phone: Telefon
            role: Rol (student, teacher, admin)
            is_active: Aktif mi
            is_verified: Doğrulanmış mı
        """
        org = OrganizationService.get_by_id(org_id)
        
        # Check quota
        if not org.can_add_user(role):
            raise QuotaExceededError(f'{role} kotası doldu')
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=email, is_deleted=False).first()
        if existing_user:
            raise ConflictError('Bu email adresi zaten kullanımda')
        
        # Get role object
        role_obj = Role.query.filter_by(name=role).first()
        if not role_obj:
            raise ValidationError(f'Geçersiz rol: {role}')
        
        # Create user
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role_id=role_obj.id,
            organization_id=org_id,
            is_active=is_active,
            is_verified=is_verified
        )
        user.set_password(password)
        
        # Increment organization user count
        org.increment_user_count(role)
        
        db.session.add(user)
        db.session.commit()
        
        return user
    
    @staticmethod
    def update_user_in_organization(
        org_id: int,
        user_id: int,
        data: Dict[str, Any]
    ) -> User:
        """
        Kurumdaki kullanıcıyı güncelle.
        
        Args:
            org_id: Kurum ID
            user_id: Kullanıcı ID
            data: Güncellenecek veriler
        """
        org = OrganizationService.get_by_id(org_id)
        user = User.query.get(user_id)
        
        if not user:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        if user.organization_id != org_id:
            raise ForbiddenError('Kullanıcı bu kuruma ait değil')
        
        # Get old role for quota update
        old_role = user.role.name if user.role else 'student'
        
        # Update basic fields
        updatable_fields = ['email', 'first_name', 'last_name', 'phone', 'is_active']
        for field in updatable_fields:
            if field in data:
                setattr(user, field, data[field])
        
        # Update role if changed
        if 'role' in data and data['role'] != old_role:
            new_role = data['role']
            
            # Check quota for new role
            if not org.can_add_user(new_role):
                raise QuotaExceededError(f'{new_role} kotası doldu')
            
            # Get role object
            role_obj = Role.query.filter_by(name=new_role).first()
            if not role_obj:
                raise ValidationError(f'Geçersiz rol: {new_role}')
            
            # Update counts
            org.decrement_user_count(old_role)
            org.increment_user_count(new_role)
            
            user.role_id = role_obj.id
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return user
    
    @staticmethod
    def get_organization_stats(org_id: int) -> Dict[str, Any]:
        """Kurum istatistiklerini getir."""
        org = OrganizationService.get_by_id(org_id)
        
        # User counts by role
        user_stats = db.session.query(
            Role.name,
            func.count(User.id)
        ).join(User.role)\
         .filter(User.organization_id == org_id, User.is_deleted == False)\
         .group_by(Role.name)\
         .all()
        
        user_counts = {name: count for name, count in user_stats}
        
        # Active users (logged in last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users = User.query.filter(
            User.organization_id == org_id,
            User.is_deleted == False,
            User.last_login_at >= thirty_days_ago
        ).count()
        
        return {
            'organization': org.to_dict(include_stats=True),
            'users': {
                'total': sum(user_counts.values()),
                'by_role': user_counts,
                'active_last_30_days': active_users,
            },
            'quotas': {
                'students': {
                    'used': org.current_students,
                    'max': org.max_students,
                    'percentage': round((org.current_students / max(org.max_students, 1)) * 100)
                },
                'teachers': {
                    'used': org.current_teachers,
                    'max': org.max_teachers,
                    'percentage': round((org.current_teachers / max(org.max_teachers, 1)) * 100)
                },
                'admins': {
                    'used': org.current_admins,
                    'max': org.max_admins,
                    'percentage': round((org.current_admins / max(org.max_admins, 1)) * 100)
                },
            },
            'subscription': {
                'plan': org.subscription_plan,
                'status': org.status,
                'is_active': org.is_subscription_active(),
                'days_remaining': (org.subscription_end - datetime.utcnow()).days if org.subscription_end else None,
            }
        }
    
    # =========================================================================
    # Invitation Management
    # =========================================================================
    
    @staticmethod
    def create_invitation(
        org_id: int,
        email: str,
        role: str,
        invited_by_id: int,
        expires_days: int = 7
    ) -> OrganizationInvitation:
        """
        Kurum daveti oluştur.
        
        Args:
            org_id: Kurum ID
            email: Davet edilecek email
            role: Atanacak rol (student, teacher, admin)
            invited_by_id: Daveti gönderen kullanıcı ID
            expires_days: Davetin geçerlilik süresi (gün)
        """
        org = OrganizationService.get_by_id(org_id)
        
        # Check quota
        if not org.can_add_user(role):
            raise QuotaExceededError(f'{role} kotası doldu')
        
        # Check if email already exists in organization
        existing_user = User.query.filter_by(
            email=email,
            organization_id=org_id,
            is_deleted=False
        ).first()
        
        if existing_user:
            raise ConflictError('Bu email zaten kurumda kayıtlı')
        
        # Check for pending invitation
        pending = OrganizationInvitation.query.filter_by(
            organization_id=org_id,
            email=email,
            is_used=False
        ).filter(OrganizationInvitation.expires_at > datetime.utcnow()).first()
        
        if pending:
            raise ConflictError('Bu email için bekleyen bir davet var')
        
        invitation = OrganizationInvitation(
            organization_id=org_id,
            email=email,
            role=role,
            token=OrganizationInvitation.generate_token(),
            invited_by_id=invited_by_id,
            expires_at=datetime.utcnow() + timedelta(days=expires_days)
        )
        
        db.session.add(invitation)
        db.session.commit()
        
        return invitation
    
    @staticmethod
    def accept_invitation(token: str, user_id: int) -> Tuple[Organization, User]:
        """
        Daveti kabul et.
        
        Args:
            token: Davet tokeni
            user_id: Kabul eden kullanıcı ID
            
        Returns:
            Tuple of (organization, user)
        """
        invitation = OrganizationInvitation.query.filter_by(token=token).first()
        
        if not invitation:
            raise NotFoundError('Davet bulunamadı')
        
        if not invitation.is_valid():
            raise ValidationError('Davet süresi dolmuş veya kullanılmış')
        
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError('Kullanıcı bulunamadı')
        
        org = Organization.query.get(invitation.organization_id)
        if not org or not org.is_active:
            raise NotFoundError('Kurum aktif değil')
        
        # Assign user to organization
        user.organization_id = invitation.organization_id
        
        # Update role if different
        target_role = Role.query.filter_by(name=invitation.role).first()
        if target_role and user.role_id != target_role.id:
            user.role_id = target_role.id
        
        # Update organization counts
        org.increment_user_count(invitation.role)
        
        # Mark invitation as used
        invitation.is_used = True
        invitation.used_at = datetime.utcnow()
        
        db.session.commit()
        
        return org, user
    
    @staticmethod
    def get_pending_invitations(org_id: int) -> List[OrganizationInvitation]:
        """Bekleyen davetleri getir."""
        return OrganizationInvitation.query.filter(
            OrganizationInvitation.organization_id == org_id,
            OrganizationInvitation.is_used == False,
            OrganizationInvitation.expires_at > datetime.utcnow()
        ).order_by(OrganizationInvitation.created_at.desc()).all()
    
    @staticmethod
    def cancel_invitation(invitation_id: int) -> bool:
        """Daveti iptal et."""
        invitation = OrganizationInvitation.query.get(invitation_id)
        
        if not invitation:
            raise NotFoundError('Davet bulunamadı')
        
        db.session.delete(invitation)
        db.session.commit()
        
        return True
    
    # =========================================================================
    # Subscription Management
    # =========================================================================
    
    @staticmethod
    def update_subscription(
        org_id: int,
        plan: str,
        duration_months: int = 12
    ) -> Organization:
        """
        Abonelik güncelle.
        
        Args:
            org_id: Kurum ID
            plan: Abonelik planı (trial, basic, pro, enterprise)
            duration_months: Süre (ay)
        """
        org = OrganizationService.get_by_id(org_id)
        
        # Plan configurations
        plans = {
            'trial': {'students': 50, 'teachers': 10, 'admins': 2, 'courses': 20, 'storage': 10},
            'basic': {'students': 100, 'teachers': 20, 'admins': 3, 'courses': 50, 'storage': 50},
            'pro': {'students': 500, 'teachers': 50, 'admins': 5, 'courses': 200, 'storage': 200},
            'enterprise': {'students': 9999, 'teachers': 999, 'admins': 99, 'courses': 9999, 'storage': 1000},
        }
        
        if plan not in plans:
            raise ValidationError('Geçersiz plan')
        
        config = plans[plan]
        
        org.subscription_plan = plan
        org.max_students = config['students']
        org.max_teachers = config['teachers']
        org.max_admins = config['admins']
        org.max_courses = config['courses']
        org.max_storage_gb = config['storage']
        
        org.subscription_start = datetime.utcnow()
        org.subscription_end = datetime.utcnow() + timedelta(days=duration_months * 30)
        org.status = OrganizationStatus.ACTIVE
        
        db.session.commit()
        
        return org
    
    @staticmethod
    def check_expiring_subscriptions(days: int = 7) -> List[Organization]:
        """Süresi dolmak üzere olan abonelikleri getir."""
        threshold = datetime.utcnow() + timedelta(days=days)
        
        return Organization.query.filter(
            Organization.is_active == True,
            Organization.subscription_end <= threshold,
            Organization.subscription_end > datetime.utcnow()
        ).all()
    
    @staticmethod
    def expire_organizations() -> int:
        """Süresi dolan abonelikleri expire yap."""
        expired = Organization.query.filter(
            Organization.is_active == True,
            Organization.status != OrganizationStatus.EXPIRED,
            Organization.subscription_end < datetime.utcnow()
        ).all()
        
        count = 0
        for org in expired:
            org.status = OrganizationStatus.EXPIRED
            count += 1
        
        db.session.commit()
        return count
