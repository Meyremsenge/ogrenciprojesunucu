"""
Organization (Tenant) Model - Çok Kiracılı Yapı
═══════════════════════════════════════════════════════════════════════════════

Bu model, multi-tenant (çok kiracılı) yapıyı destekler.
Her kurum kendi izole ortamında çalışır:
- Öğretmenler sadece kendi kurumundaki öğrencileri görür
- Kurslar, sınavlar, etkinlikler kurum bazında izole edilir
- Super Admin tüm kurumları yönetebilir

Kullanım:
    organization = Organization(name="ABC Eğitim", slug="abc-egitim")
    user.organization_id = organization.id
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
import secrets
import string

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, event
from sqlalchemy.orm import relationship

from app.extensions import db


class OrganizationStatus:
    """Kurum durumları."""
    ACTIVE = 'active'
    SUSPENDED = 'suspended'
    TRIAL = 'trial'
    EXPIRED = 'expired'


class Organization(db.Model):
    """
    Organization (Kurum/Tenant) modeli.
    
    Her kurum kendi izole ortamında çalışır.
    """
    
    __tablename__ = 'organizations'
    __table_args__ = (
        db.Index('idx_org_slug', 'slug'),
        db.Index('idx_org_status', 'status'),
        db.Index('idx_org_active', 'is_active'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Temel Bilgiler
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)  # URL-friendly identifier
    description = db.Column(db.Text)
    
    # İletişim Bilgileri
    email = db.Column(db.String(255))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    website = db.Column(db.String(255))
    
    # Logo ve Branding
    logo_url = db.Column(db.String(500))
    primary_color = db.Column(db.String(7), default='#3B82F6')  # Hex color
    secondary_color = db.Column(db.String(7), default='#10B981')
    
    # Durum
    status = db.Column(db.String(20), default=OrganizationStatus.TRIAL)
    is_active = db.Column(db.Boolean, default=True)
    
    # Limits (Kotalar)
    max_students = db.Column(db.Integer, default=50)  # Maks öğrenci sayısı
    max_teachers = db.Column(db.Integer, default=10)  # Maks öğretmen sayısı
    max_admins = db.Column(db.Integer, default=2)     # Maks admin sayısı
    max_courses = db.Column(db.Integer, default=20)   # Maks kurs sayısı
    max_storage_gb = db.Column(db.Integer, default=10)  # GB cinsinden depolama
    
    # Kullanım İstatistikleri
    current_students = db.Column(db.Integer, default=0)
    current_teachers = db.Column(db.Integer, default=0)
    current_admins = db.Column(db.Integer, default=0)
    current_courses = db.Column(db.Integer, default=0)
    storage_used_mb = db.Column(db.Integer, default=0)
    
    # Özellikler (Features)
    features = db.Column(db.JSON, default=lambda: {
        'live_classes': True,
        'ai_assistant': True,
        'exams': True,
        'certificates': False,
        'custom_branding': False,
        'api_access': False,
        'analytics': True,
        'video_hosting': True,
    })
    
    # Abonelik Bilgileri
    subscription_plan = db.Column(db.String(50), default='trial')  # trial, basic, pro, enterprise
    subscription_start = db.Column(db.DateTime)
    subscription_end = db.Column(db.DateTime)
    
    # API Erişimi
    api_key = db.Column(db.String(64), unique=True)
    api_secret = db.Column(db.String(128))
    
    # Ayarlar
    settings = db.Column(db.JSON, default=lambda: {
        'timezone': 'Europe/Istanbul',
        'language': 'tr',
        'date_format': 'DD.MM.YYYY',
        'allow_student_registration': False,
        'require_email_verification': True,
        'session_timeout_minutes': 60,
    })
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = db.relationship('User', back_populates='organization', lazy='dynamic')
    invitations = db.relationship('OrganizationInvitation', back_populates='organization', lazy='dynamic')
    
    def __repr__(self):
        return f'<Organization {self.name}>'
    
    def to_dict(self, include_stats: bool = True) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'website': self.website,
            'logo_url': self.logo_url,
            'primary_color': self.primary_color,
            'secondary_color': self.secondary_color,
            'status': self.status,
            'is_active': self.is_active,
            'subscription_plan': self.subscription_plan,
            'subscription_start': self.subscription_start.isoformat() if self.subscription_start else None,
            'subscription_end': self.subscription_end.isoformat() if self.subscription_end else None,
            'features': self.features,
            'settings': self.settings,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        
        if include_stats:
            data['limits'] = {
                'max_students': self.max_students,
                'max_teachers': self.max_teachers,
                'max_admins': self.max_admins,
                'max_courses': self.max_courses,
                'max_storage_gb': self.max_storage_gb,
            }
            data['usage'] = {
                'current_students': self.current_students,
                'current_teachers': self.current_teachers,
                'current_admins': self.current_admins,
                'current_courses': self.current_courses,
                'storage_used_mb': self.storage_used_mb,
            }
        
        return data
    
    def generate_api_credentials(self) -> tuple:
        """Generate new API key and secret."""
        alphabet = string.ascii_letters + string.digits
        self.api_key = 'org_' + ''.join(secrets.choice(alphabet) for _ in range(32))
        self.api_secret = secrets.token_hex(64)
        return self.api_key, self.api_secret
    
    def has_feature(self, feature_name: str) -> bool:
        """Check if organization has a specific feature enabled."""
        return self.features.get(feature_name, False)
    
    def can_add_user(self, role_name: str) -> bool:
        """Check if organization can add more users of given role."""
        if role_name == 'student':
            return self.current_students < self.max_students
        elif role_name == 'teacher':
            return self.current_teachers < self.max_teachers
        elif role_name == 'admin':
            return self.current_admins < self.max_admins
        return False
    
    def increment_user_count(self, role_name: str):
        """Increment user count for role."""
        if role_name == 'student':
            self.current_students += 1
        elif role_name == 'teacher':
            self.current_teachers += 1
        elif role_name == 'admin':
            self.current_admins += 1
    
    def decrement_user_count(self, role_name: str):
        """Decrement user count for role."""
        if role_name == 'student' and self.current_students > 0:
            self.current_students -= 1
        elif role_name == 'teacher' and self.current_teachers > 0:
            self.current_teachers -= 1
        elif role_name == 'admin' and self.current_admins > 0:
            self.current_admins -= 1
    
    def is_subscription_active(self) -> bool:
        """Check if subscription is active."""
        if self.status in [OrganizationStatus.SUSPENDED, OrganizationStatus.EXPIRED]:
            return False
        if self.subscription_end and self.subscription_end < datetime.utcnow():
            return False
        return True
    
    @staticmethod
    def generate_slug(name: str) -> str:
        """Generate URL-friendly slug from name."""
        import re
        # Turkish character mapping
        tr_map = {
            'ı': 'i', 'İ': 'i', 'ğ': 'g', 'Ğ': 'g',
            'ü': 'u', 'Ü': 'u', 'ş': 's', 'Ş': 's',
            'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c'
        }
        slug = name.lower()
        for tr_char, en_char in tr_map.items():
            slug = slug.replace(tr_char, en_char)
        slug = re.sub(r'[^a-z0-9]+', '-', slug)
        slug = slug.strip('-')
        return slug


class OrganizationInvitation(db.Model):
    """
    Kurum davet modeli.
    
    Kullanıcıları kuruma davet etmek için kullanılır.
    """
    
    __tablename__ = 'organization_invitations'
    __table_args__ = (
        db.Index('idx_invitation_token', 'token'),
        db.Index('idx_invitation_email', 'email'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    
    email = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # student, teacher, admin
    token = db.Column(db.String(64), unique=True, nullable=False)
    
    invited_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    is_used = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = db.relationship('Organization', back_populates='invitations')
    invited_by = db.relationship('User', foreign_keys=[invited_by_id])
    
    def __repr__(self):
        return f'<OrganizationInvitation {self.email} -> {self.organization_id}>'
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'email': self.email,
            'role': self.role,
            'is_used': self.is_used,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'invited_by': self.invited_by.full_name if self.invited_by else None,
        }
    
    def is_valid(self) -> bool:
        """Check if invitation is still valid."""
        if self.is_used:
            return False
        if self.expires_at < datetime.utcnow():
            return False
        return True
    
    @staticmethod
    def generate_token() -> str:
        """Generate unique invitation token."""
        return secrets.token_urlsafe(32)


# Helper functions
def get_organization_by_slug(slug: str) -> Optional[Organization]:
    """Get organization by slug."""
    return Organization.query.filter_by(slug=slug, is_active=True).first()


def get_organization_users(org_id: int, role: Optional[str] = None) -> List:
    """Get users for an organization, optionally filtered by role."""
    from app.models.user import User, Role
    
    query = User.query.filter_by(organization_id=org_id, is_deleted=False)
    
    if role:
        query = query.join(Role).filter(Role.name == role)
    
    return query.all()


def create_organization(name: str, email: str, **kwargs) -> Organization:
    """Create a new organization."""
    slug = Organization.generate_slug(name)
    
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while Organization.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    org = Organization(
        name=name,
        slug=slug,
        email=email,
        **kwargs
    )
    
    db.session.add(org)
    db.session.commit()
    
    return org
