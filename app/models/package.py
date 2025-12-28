"""
Package and UserPackage models for subscription management.
"""

from datetime import datetime, timedelta
from enum import Enum
from decimal import Decimal
from app.extensions import db


class PackageStatus(Enum):
    """Package status enum."""
    ACTIVE = 'active'
    INACTIVE = 'inactive'
    ARCHIVED = 'archived'


class PackageType(Enum):
    """Package type enum."""
    MONTHLY = 'monthly'
    QUARTERLY = 'quarterly'
    YEARLY = 'yearly'
    LIFETIME = 'lifetime'


class PaymentStatus(Enum):
    """Payment status enum."""
    PENDING = 'pending'
    COMPLETED = 'completed'
    FAILED = 'failed'
    REFUNDED = 'refunded'
    CANCELLED = 'cancelled'


class Package(db.Model):
    """
    Package model for subscription plans.
    
    Represents different subscription tiers that users can purchase
    to access courses and features.
    """
    
    __tablename__ = 'packages'
    __table_args__ = (
        db.Index('idx_packages_status', 'status'),
        db.Index('idx_packages_type', 'package_type'),
        db.Index('idx_packages_active_published', 'status', 'is_published'),
        db.CheckConstraint('price >= 0', name='ck_packages_price_positive'),
        db.CheckConstraint('discount_price IS NULL OR discount_price >= 0', 
                          name='ck_packages_discount_positive'),
        db.CheckConstraint('duration_days > 0 OR package_type = \'lifetime\'',
                          name='ck_packages_duration_valid'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic info
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    short_description = db.Column(db.String(255))
    
    # Package type and duration
    package_type = db.Column(
        db.String(20), 
        default=PackageType.MONTHLY.value, 
        nullable=False
    )
    duration_days = db.Column(db.Integer, default=30)  # 0 for lifetime
    
    # Pricing
    price = db.Column(db.Numeric(10, 2), nullable=False)
    discount_price = db.Column(db.Numeric(10, 2))  # Sale price if applicable
    currency = db.Column(db.String(3), default='TRY')
    
    # Features (JSON for flexibility)
    features = db.Column(db.JSON, default=list)  # ["Unlimited courses", "24/7 support"]
    
    # Limits
    max_courses = db.Column(db.Integer)  # NULL = unlimited
    max_downloads = db.Column(db.Integer)
    max_live_sessions = db.Column(db.Integer)
    
    # AI access limits
    ai_questions_per_day = db.Column(db.Integer, default=0)
    ai_questions_per_month = db.Column(db.Integer, default=0)
    
    # Course access
    course_ids = db.Column(db.JSON, default=list)  # Specific course IDs if limited
    category_ids = db.Column(db.JSON, default=list)  # Specific category IDs if limited
    all_courses_access = db.Column(db.Boolean, default=False)
    
    # Status and visibility
    status = db.Column(db.String(20), default=PackageStatus.ACTIVE.value)
    is_published = db.Column(db.Boolean, default=False)
    is_featured = db.Column(db.Boolean, default=False)
    
    # Ordering
    display_order = db.Column(db.Integer, default=0)
    
    # Statistics
    total_subscribers = db.Column(db.Integer, default=0)
    total_revenue = db.Column(db.Numeric(15, 2), default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    user_packages = db.relationship(
        'UserPackage', 
        back_populates='package', 
        lazy='dynamic',
        cascade='all, delete-orphan'
    )
    creator = db.relationship('User', foreign_keys=[created_by])
    updater = db.relationship('User', foreign_keys=[updated_by])
    
    def __repr__(self):
        return f'<Package {self.name}>'
    
    @property
    def current_price(self):
        """Get current active price (discount if available)."""
        if self.discount_price and self.discount_price > 0:
            return self.discount_price
        return self.price
    
    @property
    def discount_percentage(self):
        """Calculate discount percentage if applicable."""
        if not self.discount_price or self.discount_price <= 0:
            return 0
        if not self.price or self.price <= 0:
            return 0
        discount = ((self.price - self.discount_price) / self.price) * 100
        return round(discount, 1)
    
    @property
    def is_lifetime(self):
        """Check if package is lifetime access."""
        return self.package_type == PackageType.LIFETIME.value
    
    @property
    def active_subscribers_count(self):
        """Get count of active subscribers."""
        from app.models.package import UserPackage, SubscriptionStatus
        return self.user_packages.filter(
            UserPackage.subscription_status == SubscriptionStatus.ACTIVE.value
        ).count()
    
    def has_course_access(self, course_id):
        """Check if package includes access to specific course."""
        if self.all_courses_access:
            return True
        if self.course_ids and course_id in self.course_ids:
            return True
        return False
    
    def has_category_access(self, category_id):
        """Check if package includes access to specific category."""
        if self.all_courses_access:
            return True
        if self.category_ids and category_id in self.category_ids:
            return True
        return False
    
    def to_dict(self, include_stats=False):
        """Convert package to dictionary."""
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'short_description': self.short_description,
            'package_type': self.package_type,
            'duration_days': self.duration_days,
            'price': float(self.price) if self.price else 0,
            'discount_price': float(self.discount_price) if self.discount_price else None,
            'current_price': float(self.current_price) if self.current_price else 0,
            'discount_percentage': self.discount_percentage,
            'currency': self.currency,
            'features': self.features or [],
            'max_courses': self.max_courses,
            'max_downloads': self.max_downloads,
            'max_live_sessions': self.max_live_sessions,
            'ai_questions_per_day': self.ai_questions_per_day,
            'ai_questions_per_month': self.ai_questions_per_month,
            'all_courses_access': self.all_courses_access,
            'is_lifetime': self.is_lifetime,
            'is_published': self.is_published,
            'is_featured': self.is_featured,
            'display_order': self.display_order,
        }
        
        if include_stats:
            data['total_subscribers'] = self.total_subscribers
            data['active_subscribers'] = self.active_subscribers_count
            data['total_revenue'] = float(self.total_revenue) if self.total_revenue else 0
        
        return data


class SubscriptionStatus(Enum):
    """User subscription status enum."""
    ACTIVE = 'active'
    EXPIRED = 'expired'
    CANCELLED = 'cancelled'
    SUSPENDED = 'suspended'
    PENDING = 'pending'


class UserPackage(db.Model):
    """
    UserPackage model for user subscriptions.
    
    Tracks which packages users have purchased and their subscription status.
    """
    
    __tablename__ = 'user_packages'
    __table_args__ = (
        db.Index('idx_user_packages_user', 'user_id'),
        db.Index('idx_user_packages_package', 'package_id'),
        db.Index('idx_user_packages_status', 'subscription_status'),
        db.Index('idx_user_packages_expires', 'expires_at'),
        db.Index('idx_user_packages_user_status', 'user_id', 'subscription_status'),
        db.Index('idx_user_packages_active_expires', 'subscription_status', 'expires_at'),
        db.UniqueConstraint('user_id', 'package_id', 'starts_at', 
                           name='uq_user_package_subscription'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    package_id = db.Column(db.Integer, db.ForeignKey('packages.id', ondelete='RESTRICT'), nullable=False)
    
    # Subscription period
    starts_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)  # NULL for lifetime
    
    # Status
    subscription_status = db.Column(
        db.String(20), 
        default=SubscriptionStatus.PENDING.value,
        nullable=False
    )
    
    # Payment info
    payment_status = db.Column(db.String(20), default=PaymentStatus.PENDING.value)
    payment_method = db.Column(db.String(50))  # credit_card, bank_transfer, etc.
    payment_reference = db.Column(db.String(100))  # External payment reference
    transaction_id = db.Column(db.String(100), index=True)
    
    # Amount paid (stored for historical records)
    amount_paid = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='TRY')
    
    # Discount/promo
    discount_code = db.Column(db.String(50))
    discount_amount = db.Column(db.Numeric(10, 2), default=0)
    
    # Auto-renewal
    auto_renew = db.Column(db.Boolean, default=False)
    renewal_reminder_sent = db.Column(db.Boolean, default=False)
    
    # Cancellation
    cancelled_at = db.Column(db.DateTime)
    cancellation_reason = db.Column(db.Text)
    
    # Access tracking
    last_accessed_at = db.Column(db.DateTime)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='packages')
    package = db.relationship('Package', back_populates='user_packages')
    
    def __repr__(self):
        return f'<UserPackage User:{self.user_id} Package:{self.package_id}>'
    
    @property
    def is_active(self):
        """Check if subscription is currently active."""
        if self.subscription_status != SubscriptionStatus.ACTIVE.value:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True
    
    @property
    def is_expired(self):
        """Check if subscription has expired."""
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return True
        return self.subscription_status == SubscriptionStatus.EXPIRED.value
    
    @property
    def days_remaining(self):
        """Get days remaining in subscription."""
        if not self.expires_at:
            return None  # Lifetime
        if datetime.utcnow() > self.expires_at:
            return 0
        delta = self.expires_at - datetime.utcnow()
        return delta.days
    
    @property
    def is_expiring_soon(self):
        """Check if subscription expires within 7 days."""
        remaining = self.days_remaining
        if remaining is None:
            return False
        return 0 < remaining <= 7
    
    def activate(self):
        """Activate the subscription."""
        self.subscription_status = SubscriptionStatus.ACTIVE.value
        self.payment_status = PaymentStatus.COMPLETED.value
        if not self.starts_at:
            self.starts_at = datetime.utcnow()
        if self.package and self.package.duration_days > 0:
            self.expires_at = self.starts_at + timedelta(days=self.package.duration_days)
        db.session.commit()
    
    def expire(self):
        """Mark subscription as expired."""
        self.subscription_status = SubscriptionStatus.EXPIRED.value
        db.session.commit()
    
    def cancel(self, reason=None):
        """Cancel the subscription."""
        self.subscription_status = SubscriptionStatus.CANCELLED.value
        self.cancelled_at = datetime.utcnow()
        self.cancellation_reason = reason
        self.auto_renew = False
        db.session.commit()
    
    def suspend(self):
        """Suspend the subscription."""
        self.subscription_status = SubscriptionStatus.SUSPENDED.value
        db.session.commit()
    
    def renew(self, duration_days=None):
        """
        Renew the subscription.
        
        Args:
            duration_days: Optional custom duration, otherwise uses package duration
        """
        if duration_days is None:
            duration_days = self.package.duration_days if self.package else 30
        
        # If expired, start from now; otherwise extend from expires_at
        if self.expires_at and self.expires_at > datetime.utcnow():
            self.expires_at = self.expires_at + timedelta(days=duration_days)
        else:
            self.starts_at = datetime.utcnow()
            self.expires_at = self.starts_at + timedelta(days=duration_days)
        
        self.subscription_status = SubscriptionStatus.ACTIVE.value
        self.renewal_reminder_sent = False
        db.session.commit()
    
    def update_access_time(self):
        """Update last accessed timestamp."""
        self.last_accessed_at = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self, include_package=True):
        """Convert user package to dictionary."""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'package_id': self.package_id,
            'starts_at': self.starts_at.isoformat() if self.starts_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'subscription_status': self.subscription_status,
            'payment_status': self.payment_status,
            'amount_paid': float(self.amount_paid) if self.amount_paid else 0,
            'currency': self.currency,
            'is_active': self.is_active,
            'is_expired': self.is_expired,
            'days_remaining': self.days_remaining,
            'is_expiring_soon': self.is_expiring_soon,
            'auto_renew': self.auto_renew,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        
        if include_package and self.package:
            data['package'] = self.package.to_dict()
        
        return data


# ============================================================================
# Helper functions for package management
# ============================================================================

def get_user_active_packages(user_id):
    """
    Get all active packages for a user.
    
    Args:
        user_id: User ID
        
    Returns:
        List of active UserPackage objects
    """
    return UserPackage.query.filter(
        UserPackage.user_id == user_id,
        UserPackage.subscription_status == SubscriptionStatus.ACTIVE.value,
        db.or_(
            UserPackage.expires_at.is_(None),
            UserPackage.expires_at > datetime.utcnow()
        )
    ).all()


def check_user_course_access(user_id, course_id):
    """
    Check if user has access to a specific course through any package.
    
    Args:
        user_id: User ID
        course_id: Course ID
        
    Returns:
        bool: True if user has access
    """
    active_packages = get_user_active_packages(user_id)
    
    for up in active_packages:
        if up.package and up.package.has_course_access(course_id):
            return True
    
    return False


def expire_subscriptions():
    """
    Batch expire all subscriptions that have passed their expiry date.
    Called by scheduled task.
    
    Returns:
        int: Number of subscriptions expired
    """
    expired = UserPackage.query.filter(
        UserPackage.subscription_status == SubscriptionStatus.ACTIVE.value,
        UserPackage.expires_at.isnot(None),
        UserPackage.expires_at < datetime.utcnow()
    ).all()
    
    count = 0
    for up in expired:
        up.subscription_status = SubscriptionStatus.EXPIRED.value
        count += 1
    
    if count > 0:
        db.session.commit()
    
    return count


def get_expiring_subscriptions(days=7):
    """
    Get subscriptions expiring within specified days.
    
    Args:
        days: Number of days to look ahead
        
    Returns:
        List of UserPackage objects
    """
    cutoff = datetime.utcnow() + timedelta(days=days)
    
    return UserPackage.query.filter(
        UserPackage.subscription_status == SubscriptionStatus.ACTIVE.value,
        UserPackage.expires_at.isnot(None),
        UserPackage.expires_at <= cutoff,
        UserPackage.expires_at > datetime.utcnow(),
        UserPackage.renewal_reminder_sent == False
    ).all()
