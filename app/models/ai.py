"""
AI Models - AI modülü veritabanı modelleri.

AI kullanım logları, kota yönetimi ve konfigürasyon için modeller.
"""

from datetime import datetime, date
from typing import Dict, Any, Optional
from app.extensions import db


class AIUsageLog(db.Model):
    """AI kullanım logları."""
    
    __tablename__ = 'ai_usage_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    feature = db.Column(db.String(50), nullable=False, index=True)
    tokens_used = db.Column(db.Integer, nullable=False, default=0)
    request_data = db.Column(db.JSON, nullable=True)
    response_summary = db.Column(db.String(500), nullable=True)
    processing_time_ms = db.Column(db.Integer, nullable=True)
    is_mock = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('ai_usage_logs', lazy='dynamic'))
    
    def __repr__(self):
        return f'<AIUsageLog {self.id} - {self.feature}>'
    
    def to_dict(self) -> Dict[str, Any]:
        """Model'i dictionary'e çevir."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'feature': self.feature,
            'tokens_used': self.tokens_used,
            'response_summary': self.response_summary,
            'processing_time_ms': self.processing_time_ms,
            'is_mock': self.is_mock,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AIQuota(db.Model):
    """AI kota yönetimi."""
    
    __tablename__ = 'ai_quotas'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    
    # Token kullanımı
    daily_tokens_used = db.Column(db.Integer, default=0)
    monthly_tokens_used = db.Column(db.Integer, default=0)
    
    # İstek sayısı
    daily_requests_count = db.Column(db.Integer, default=0)
    monthly_requests_count = db.Column(db.Integer, default=0)
    
    # Son istek zamanı
    last_request_at = db.Column(db.DateTime, nullable=True)
    
    # Reset tarihleri
    daily_reset_at = db.Column(db.Date, default=date.today)
    monthly_reset_at = db.Column(db.Date, default=lambda: date.today().replace(day=1))
    
    # Engelleme durumu
    is_blocked = db.Column(db.Boolean, default=False)
    blocked_until = db.Column(db.DateTime, nullable=True)
    block_reason = db.Column(db.String(255), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('ai_quota', uselist=False))
    
    def __repr__(self):
        return f'<AIQuota user_id={self.user_id}>'
    
    def check_and_reset_daily(self) -> None:
        """Günlük kotayı kontrol et ve gerekirse sıfırla."""
        today = date.today()
        if self.daily_reset_at < today:
            self.daily_tokens_used = 0
            self.daily_requests_count = 0
            self.daily_reset_at = today
    
    def check_and_reset_monthly(self) -> None:
        """Aylık kotayı kontrol et ve gerekirse sıfırla."""
        today = date.today()
        first_of_month = today.replace(day=1)
        if self.monthly_reset_at < first_of_month:
            self.monthly_tokens_used = 0
            self.monthly_requests_count = 0
            self.monthly_reset_at = first_of_month
    
    def is_quota_exceeded(self, role_limits: Dict[str, int]) -> tuple[bool, Optional[str]]:
        """
        Kota aşılmış mı kontrol et.
        
        Args:
            role_limits: Rol bazlı limitler
            
        Returns:
            (aşılmış_mı, sebep)
        """
        # Önce reset kontrolü
        self.check_and_reset_daily()
        self.check_and_reset_monthly()
        
        # Sınırsız kota kontrolü (-1)
        if role_limits.get('daily_tokens', 0) == -1:
            return False, None
        
        # Günlük token kontrolü
        if self.daily_tokens_used >= role_limits.get('daily_tokens', 0):
            return True, 'daily_tokens'
        
        # Aylık token kontrolü
        if self.monthly_tokens_used >= role_limits.get('monthly_tokens', 0):
            return True, 'monthly_tokens'
        
        # Günlük istek kontrolü
        if self.daily_requests_count >= role_limits.get('daily_requests', 0):
            return True, 'daily_requests'
        
        # Aylık istek kontrolü
        if self.monthly_requests_count >= role_limits.get('monthly_requests', 0):
            return True, 'monthly_requests'
        
        return False, None
    
    def consume_quota(self, tokens: int) -> None:
        """
        Kota tüket.
        
        Args:
            tokens: Tüketilen token sayısı
        """
        self.daily_tokens_used += tokens
        self.monthly_tokens_used += tokens
        self.daily_requests_count += 1
        self.monthly_requests_count += 1
        self.last_request_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Model'i dictionary'e çevir."""
        return {
            'user_id': self.user_id,
            'daily_tokens_used': self.daily_tokens_used,
            'monthly_tokens_used': self.monthly_tokens_used,
            'daily_requests_count': self.daily_requests_count,
            'monthly_requests_count': self.monthly_requests_count,
            'last_request_at': self.last_request_at.isoformat() if self.last_request_at else None,
            'daily_reset_at': self.daily_reset_at.isoformat() if self.daily_reset_at else None,
            'monthly_reset_at': self.monthly_reset_at.isoformat() if self.monthly_reset_at else None,
            'is_blocked': self.is_blocked,
            'blocked_until': self.blocked_until.isoformat() if self.blocked_until else None,
            'block_reason': self.block_reason
        }


class AIConfiguration(db.Model):
    """AI sistem konfigürasyonu (dinamik ayarlar)."""
    
    __tablename__ = 'ai_configurations'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.JSON, nullable=False)
    description = db.Column(db.Text, nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<AIConfiguration {self.key}>'
    
    @classmethod
    def get_value(cls, key: str, default: Any = None) -> Any:
        """Konfigürasyon değerini al."""
        config = cls.query.filter_by(key=key).first()
        if config:
            return config.value
        return default
    
    @classmethod
    def set_value(cls, key: str, value: Any, description: str = None, user_id: int = None) -> 'AIConfiguration':
        """Konfigürasyon değerini ayarla veya güncelle."""
        config = cls.query.filter_by(key=key).first()
        if config:
            config.value = value
            if description:
                config.description = description
            config.updated_by = user_id
        else:
            config = cls(
                key=key,
                value=value,
                description=description,
                updated_by=user_id
            )
            db.session.add(config)
        return config
    
    def to_dict(self) -> Dict[str, Any]:
        """Model'i dictionary'e çevir."""
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class AIViolation(db.Model):
    """AI kullanım ihlalleri."""
    
    __tablename__ = 'ai_violations'
    
    # İhlal türleri
    TYPE_RATE_LIMIT = 'rate_limit'
    TYPE_QUOTA_ABUSE = 'quota_abuse'
    TYPE_CONTENT_VIOLATION = 'content_violation'
    TYPE_PROMPT_INJECTION = 'prompt_injection'
    TYPE_BOT_BEHAVIOR = 'bot_behavior'
    
    # Ciddiyet seviyeleri
    SEVERITY_WARNING = 1
    SEVERITY_MINOR = 2
    SEVERITY_MAJOR = 3
    SEVERITY_CRITICAL = 4
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    violation_type = db.Column(db.String(50), nullable=False, index=True)
    severity = db.Column(db.Integer, nullable=False, default=1)
    details = db.Column(db.JSON, nullable=True)
    resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('ai_violations', lazy='dynamic'))
    
    def __repr__(self):
        return f'<AIViolation {self.id} - {self.violation_type}>'
    
    def to_dict(self) -> Dict[str, Any]:
        """Model'i dictionary'e çevir."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'violation_type': self.violation_type,
            'severity': self.severity,
            'details': self.details,
            'resolved': self.resolved,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def get_user_violation_count(cls, user_id: int, days: int = 1) -> int:
        """Belirli gün sayısındaki ihlal sayısını al."""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)
        return cls.query.filter(
            cls.user_id == user_id,
            cls.created_at >= cutoff
        ).count()
