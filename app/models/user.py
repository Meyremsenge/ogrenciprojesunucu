"""
User, Role, and Permission models.
"""

from datetime import datetime
from app.extensions import db, bcrypt


class RolePermission(db.Model):
    """Association table for Role and Permission many-to-many relationship."""
    
    __tablename__ = 'role_permissions'
    
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
    permission_id = db.Column(db.Integer, db.ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Permission(db.Model):
    """Permission model for granular access control."""
    
    __tablename__ = 'permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    resource = db.Column(db.String(50), nullable=False)  # e.g., 'courses', 'users', 'exams'
    action = db.Column(db.String(50), nullable=False)    # e.g., 'create', 'read', 'update', 'delete'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    roles = db.relationship('Role', secondary='role_permissions', back_populates='permissions')
    
    def __repr__(self):
        return f'<Permission {self.name}>'
    
    @property
    def full_name(self):
        """Return full permission name (resource:action)."""
        return f'{self.resource}:{self.action}'


class Role(db.Model):
    """Role model for user roles."""
    
    __tablename__ = 'roles'
    
    # Role constants
    SUPER_ADMIN = 'super_admin'
    ADMIN = 'admin'
    TEACHER = 'teacher'
    STUDENT = 'student'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    is_system = db.Column(db.Boolean, default=False)  # System roles can't be deleted
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = db.relationship('User', back_populates='role', lazy='dynamic')
    permissions = db.relationship('Permission', secondary='role_permissions', back_populates='roles')
    
    def __repr__(self):
        return f'<Role {self.name}>'
    
    def has_permission(self, permission_name):
        """Check if role has a specific permission."""
        return any(p.name == permission_name for p in self.permissions)
    
    def add_permission(self, permission):
        """Add permission to role."""
        if permission not in self.permissions:
            self.permissions.append(permission)
    
    def remove_permission(self, permission):
        """Remove permission from role."""
        if permission in self.permissions:
            self.permissions.remove(permission)
    
    @classmethod
    def get_hierarchy(cls):
        """Get role hierarchy (higher number = more privileges)."""
        return {
            cls.STUDENT: 1,
            cls.TEACHER: 2,
            cls.ADMIN: 3,
            cls.SUPER_ADMIN: 4
        }


class User(db.Model):
    """User model for all user types."""
    
    __tablename__ = 'users'
    __table_args__ = (
        db.Index('idx_users_role_active', 'role_id', 'is_active'),
        db.Index('idx_users_created', 'created_at'),
        db.Index('idx_users_last_login', 'last_login_at'),
        db.Index('idx_users_verified_active', 'is_verified', 'is_active'),
        db.Index('idx_users_organization', 'organization_id'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    avatar_url = db.Column(db.String(500))
    
    # Organization (Multi-tenant)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True, index=True)
    
    # Status flags
    is_active = db.Column(db.Boolean, default=True, index=True)
    is_verified = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False, index=True)  # Soft delete flag
    
    # Password management
    force_password_change = db.Column(db.Boolean, default=False)  # İlk girişte şifre değiştirme
    password_changed_at = db.Column(db.DateTime)  # Son şifre değiştirme zamanı
    failed_login_attempts = db.Column(db.Integer, default=0)  # Başarısız giriş denemeleri
    locked_until = db.Column(db.DateTime)  # Hesap kilitleme süresi
    
    # Password reset
    password_reset_token = db.Column(db.String(64), nullable=True, index=True)
    password_reset_expires = db.Column(db.DateTime, nullable=True)
    
    # Email verification
    verification_token = db.Column(db.String(64), nullable=True, index=True)
    
    # Role
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False, index=True)
    
    # Timestamps
    last_login_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    role = db.relationship('Role', back_populates='users')
    organization = db.relationship('Organization', back_populates='users')
    
    # Teacher relationships
    courses_teaching = db.relationship('Course', back_populates='teacher', lazy='dynamic',
                                        foreign_keys='Course.teacher_id')
    evaluations_given = db.relationship('Evaluation', back_populates='teacher', lazy='dynamic',
                                          foreign_keys='Evaluation.teacher_id')
    
    # Student relationships
    enrollments = db.relationship('Enrollment', back_populates='student', lazy='dynamic')
    video_progress = db.relationship('VideoProgress', back_populates='user', lazy='dynamic')
    question_attempts = db.relationship('QuestionAttempt', back_populates='user', lazy='dynamic',
                                        foreign_keys='QuestionAttempt.user_id')
    # exam_attempts is defined via backref in ExamAttempt model
    evaluations_received = db.relationship('Evaluation', back_populates='student', lazy='dynamic',
                                            foreign_keys='Evaluation.student_id')
    student_progress = db.relationship('StudentProgress', back_populates='user', lazy='dynamic')
    
    # Package/Subscription relationships
    packages = db.relationship('UserPackage', back_populates='user', lazy='dynamic',
                               cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.email}>'
    
    @property
    def full_name(self):
        """Return user's full name."""
        return f'{self.first_name} {self.last_name}'
    
    @property
    def password(self):
        """Prevent password from being read."""
        raise AttributeError('Password is not a readable attribute')
    
    @password.setter
    def password(self, password):
        """Hash password on setting."""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """Verify password."""
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def has_role(self, role_name):
        """Check if user has a specific role."""
        return self.role.name == role_name
    
    def has_any_role(self, *role_names):
        """Check if user has any of the specified roles."""
        return self.role.name in role_names
    
    def has_permission(self, permission_name):
        """Check if user has a specific permission through their role."""
        return self.role.has_permission(permission_name)
    
    def is_at_least(self, role_name):
        """Check if user's role is at least as privileged as the specified role."""
        hierarchy = Role.get_hierarchy()
        user_level = hierarchy.get(self.role.name, 0)
        required_level = hierarchy.get(role_name, 0)
        return user_level >= required_level
    
    @property
    def is_super_admin(self):
        """Check if user is super admin."""
        return self.role.name == Role.SUPER_ADMIN
    
    @property
    def is_admin(self):
        """Check if user is admin or super admin."""
        return self.role.name in [Role.ADMIN, Role.SUPER_ADMIN]
    
    @property
    def is_teacher(self):
        """Check if user is teacher (or higher)."""
        return self.is_at_least(Role.TEACHER)
    
    @property
    def is_student(self):
        """Check if user is student."""
        return self.role.name == Role.STUDENT
    
    # =========================================================================
    # PASSWORD & ACCOUNT LOCK METHODS
    # =========================================================================
    
    @property
    def is_locked(self):
        """Check if account is locked."""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False
    
    @property
    def requires_password_change(self):
        """Check if user must change password."""
        return self.force_password_change
    
    def set_password(self, password: str, force_change: bool = False):
        """
        Set new password with optional force change flag.
        
        Args:
            password: New password
            force_change: Whether to require password change on next login
        """
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        self.password_changed_at = datetime.utcnow()
        self.force_password_change = force_change
        self.failed_login_attempts = 0
        self.locked_until = None
    
    def change_password(self, old_password: str, new_password: str) -> bool:
        """
        Change password after verifying old password.
        
        Args:
            old_password: Current password
            new_password: New password
            
        Returns:
            bool: True if successful
        """
        if not self.check_password(old_password):
            return False
        
        self.set_password(new_password, force_change=False)
        return True
    
    def record_failed_login(self, max_attempts: int = 5, lockout_minutes: int = 30):
        """
        Record a failed login attempt.
        
        Args:
            max_attempts: Max attempts before lockout
            lockout_minutes: Lockout duration in minutes
        """
        from datetime import timedelta
        
        self.failed_login_attempts = (self.failed_login_attempts or 0) + 1
        
        if self.failed_login_attempts >= max_attempts:
            self.locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
        
        db.session.commit()
    
    def record_successful_login(self):
        """Record a successful login, resetting failed attempts."""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login_at = datetime.utcnow()
        db.session.commit()
    
    def unlock_account(self):
        """Unlock user account."""
        self.locked_until = None
        self.failed_login_attempts = 0
        db.session.commit()
    
    def clear_force_password_change(self):
        """Clear the force password change flag."""
        self.force_password_change = False
        self.password_changed_at = datetime.utcnow()
        db.session.commit()

    # =========================================================================
    # AI ACCESS PROPERTIES
    # =========================================================================
    
    @property
    def can_use_ai(self) -> bool:
        """
        Check if user can use AI features.
        
        AI erişimi için gerekli koşullar:
        1. Aktif kullanıcı olmalı
        2. Doğrulanmış olmalı
        3. AI kotası aşılmamış olmalı
        4. AI erişim izni olmalı
        """
        if not self.is_active or not self.is_verified:
            return False
        
        # Kota kontrolü
        if hasattr(self, 'ai_quota') and self.ai_quota:
            if self.ai_quota.is_blocked:
                return False
        
        return True
    
    @property
    def ai_access_level(self) -> str:
        """
        Get user's AI access level.
        
        Returns:
            'none', 'basic', 'standard', 'advanced', 'full', 'unlimited'
        """
        from app.modules.ai.security.authorization import AIAccessChecker
        level = AIAccessChecker.get_user_ai_access_level(self.role.name)
        return level.value
    
    @property
    def ai_daily_limit(self) -> int:
        """Get user's daily AI message limit."""
        from app.modules.ai.security.authorization import AIAccessChecker
        return AIAccessChecker.get_daily_limit(self.role.name)
    
    @property
    def ai_monthly_limit(self) -> int:
        """Get user's monthly AI message limit."""
        from app.modules.ai.security.authorization import AIAccessChecker
        return AIAccessChecker.get_monthly_limit(self.role.name)
    
    def get_ai_quota_status(self) -> dict:
        """
        Get user's AI quota status.
        
        Returns:
            Dict with quota information
        """
        from app.modules.ai.security.authorization import AIAccessChecker
        return AIAccessChecker.check_quota(self.id, self.role.name)
    
    def get_ai_access_summary(self) -> dict:
        """
        Get user's complete AI access summary.
        
        Returns:
            Dict with all AI access information
        """
        from app.modules.ai.security.authorization import get_ai_access_summary
        return get_ai_access_summary(self.id, self.role.name)
    
    def has_ai_permission(self, permission: str) -> bool:
        """
        Check if user has specific AI permission.
        
        Args:
            permission: AI permission name (e.g., 'ai:hint', 'ai:generate')
        
        Returns:
            bool
        """
        return self.has_permission(permission)
    
    # =========================================================================
    # STANDARD METHODS
    # =========================================================================
    
    def update_last_login(self):
        """Update last login timestamp."""
        self.last_login_at = datetime.utcnow()
        db.session.commit()
    
    def get_permissions(self):
        """Get all permission names from user's role."""
        if self.role and self.role.permissions:
            return [p.name for p in self.role.permissions]
        return []
    
    def to_dict(self, include_sensitive=False, include_ai=False):
        """Convert user to dictionary."""
        data = {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'phone': self.phone,
            'avatar_url': self.avatar_url,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'role': self.role.name if self.role else 'student',
            'permissions': self.get_permissions(),
            'organization_id': self.organization_id,
            'organization': self.organization.name if self.organization else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_sensitive:
            data['last_login_at'] = self.last_login_at.isoformat() if self.last_login_at else None
        
        if include_ai:
            data['ai_access'] = {
                'can_use': self.can_use_ai,
                'access_level': self.ai_access_level,
                'daily_limit': self.ai_daily_limit,
                'monthly_limit': self.ai_monthly_limit,
            }
        
        return data
