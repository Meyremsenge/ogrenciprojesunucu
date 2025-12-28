"""
Admin Module - Models.

Sistem ayarları ve admin audit log modelleri.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.extensions import db
from app.common.base_model import BaseModel


class SettingCategory(str, Enum):
    """Sistem ayarları kategorileri."""
    GENERAL = 'general'              # Genel ayarlar
    SECURITY = 'security'            # Güvenlik ayarları
    EMAIL = 'email'                  # E-posta ayarları
    PAYMENT = 'payment'              # Ödeme ayarları
    NOTIFICATION = 'notification'    # Bildirim ayarları
    CONTENT = 'content'              # İçerik ayarları
    AI = 'ai'                        # AI ayarları
    LIMITS = 'limits'                # Limit ayarları
    APPEARANCE = 'appearance'        # Görünüm ayarları
    INTEGRATION = 'integration'      # Entegrasyon ayarları


class SettingType(str, Enum):
    """Ayar değer tipleri."""
    STRING = 'string'
    INTEGER = 'integer'
    FLOAT = 'float'
    BOOLEAN = 'boolean'
    JSON = 'json'
    SECRET = 'secret'                # Şifrelenmiş değerler


class SystemSetting(BaseModel):
    """
    Sistem ayarları modeli.
    
    Dinamik sistem konfigürasyonu için key-value store.
    """
    
    __tablename__ = 'system_settings'
    __table_args__ = (
        Index('ix_system_settings_category', 'category'),
        Index('ix_system_settings_key', 'key', unique=True),
    )
    
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    default_value = Column(Text, nullable=True)
    
    category = Column(String(50), default=SettingCategory.GENERAL.value, nullable=False)
    setting_type = Column(String(20), default=SettingType.STRING.value, nullable=False)
    
    label = Column(String(200), nullable=False)          # Görüntülenen isim
    description = Column(Text, nullable=True)            # Açıklama
    help_text = Column(String(500), nullable=True)       # Yardım metni
    
    # Validasyon
    validation_rules = Column(JSON, nullable=True)       # {"min": 1, "max": 100, "regex": "..."}
    allowed_values = Column(JSON, nullable=True)         # Enum için izin verilen değerler
    
    # Görünürlük ve erişim
    is_public = Column(Boolean, default=False)           # API'den okunabilir mi
    is_editable = Column(Boolean, default=True)          # Düzenlenebilir mi
    requires_restart = Column(Boolean, default=False)    # Değişiklik restart gerektirir mi
    
    # Sıralama
    display_order = Column(Integer, default=0)
    
    # Audit
    updated_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    updated_by = relationship('User', foreign_keys=[updated_by_id])
    
    def __repr__(self):
        return f'<SystemSetting {self.key}>'
    
    def get_typed_value(self) -> Any:
        """Ayar değerini doğru tipte döner."""
        if self.value is None:
            return self._convert_value(self.default_value)
        return self._convert_value(self.value)
    
    def _convert_value(self, value: str) -> Any:
        """String değeri uygun tipe dönüştürür."""
        if value is None:
            return None
            
        if self.setting_type == SettingType.BOOLEAN.value:
            return value.lower() in ('true', '1', 'yes', 'on')
        elif self.setting_type == SettingType.INTEGER.value:
            try:
                return int(value)
            except (ValueError, TypeError):
                return 0
        elif self.setting_type == SettingType.FLOAT.value:
            try:
                return float(value)
            except (ValueError, TypeError):
                return 0.0
        elif self.setting_type == SettingType.JSON.value:
            import json
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return {}
        elif self.setting_type == SettingType.SECRET.value:
            # Secret değerler şifreli saklanır, burada çözülür
            return self._decrypt_value(value)
        return value
    
    def set_typed_value(self, value: Any):
        """Değeri string olarak ayarlar."""
        import json
        
        if self.setting_type == SettingType.BOOLEAN.value:
            self.value = 'true' if value else 'false'
        elif self.setting_type in (SettingType.INTEGER.value, SettingType.FLOAT.value):
            self.value = str(value)
        elif self.setting_type == SettingType.JSON.value:
            self.value = json.dumps(value)
        elif self.setting_type == SettingType.SECRET.value:
            self.value = self._encrypt_value(str(value))
        else:
            self.value = str(value)
    
    def _encrypt_value(self, value: str) -> str:
        """Değeri şifreler."""
        from app.core.security import encrypt_value
        return encrypt_value(value)
    
    def _decrypt_value(self, value: str) -> str:
        """Şifreli değeri çözer."""
        from app.core.security import decrypt_value
        return decrypt_value(value)
    
    def validate_value(self, value: Any) -> tuple[bool, Optional[str]]:
        """
        Değerin validasyon kurallarına uygunluğunu kontrol eder.
        
        Returns:
            (is_valid, error_message)
        """
        if not self.validation_rules:
            return True, None
        
        rules = self.validation_rules
        
        # Min/Max kontrolü
        if 'min' in rules and value < rules['min']:
            return False, f"Değer en az {rules['min']} olmalıdır"
        if 'max' in rules and value > rules['max']:
            return False, f"Değer en fazla {rules['max']} olmalıdır"
        
        # Regex kontrolü
        if 'regex' in rules:
            import re
            if not re.match(rules['regex'], str(value)):
                return False, "Değer geçerli formatta değil"
        
        # İzin verilen değerler
        if self.allowed_values and value not in self.allowed_values:
            return False, f"Değer şunlardan biri olmalı: {', '.join(map(str, self.allowed_values))}"
        
        return True, None
    
    def to_dict(self, include_value: bool = True) -> Dict[str, Any]:
        """Ayarı dictionary olarak döner."""
        data = {
            'id': self.id,
            'key': self.key,
            'category': self.category,
            'setting_type': self.setting_type,
            'label': self.label,
            'description': self.description,
            'help_text': self.help_text,
            'is_public': self.is_public,
            'is_editable': self.is_editable,
            'requires_restart': self.requires_restart,
            'display_order': self.display_order,
            'allowed_values': self.allowed_values,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_value:
            # Secret değerler için sadece maskelenmiş değer
            if self.setting_type == SettingType.SECRET.value:
                data['value'] = '********' if self.value else None
            else:
                data['value'] = self.get_typed_value()
            data['default_value'] = self._convert_value(self.default_value)
        
        return data


class AdminActionType(str, Enum):
    """Admin işlem tipleri."""
    # Kullanıcı yönetimi
    USER_CREATE = 'user_create'
    USER_UPDATE = 'user_update'
    USER_DELETE = 'user_delete'
    USER_ACTIVATE = 'user_activate'
    USER_DEACTIVATE = 'user_deactivate'
    USER_ROLE_CHANGE = 'user_role_change'
    USER_PASSWORD_RESET = 'user_password_reset'
    USER_UNLOCK = 'user_unlock'
    
    # İçerik yönetimi
    CONTENT_APPROVE = 'content_approve'
    CONTENT_REJECT = 'content_reject'
    CONTENT_PUBLISH = 'content_publish'
    CONTENT_UNPUBLISH = 'content_unpublish'
    CONTENT_DELETE = 'content_delete'
    
    # Paket yönetimi
    PACKAGE_CREATE = 'package_create'
    PACKAGE_UPDATE = 'package_update'
    PACKAGE_DELETE = 'package_delete'
    PACKAGE_ASSIGN = 'package_assign'
    PACKAGE_REVOKE = 'package_revoke'
    
    # Sistem yönetimi
    SETTING_UPDATE = 'setting_update'
    SYSTEM_MAINTENANCE = 'system_maintenance'
    CACHE_CLEAR = 'cache_clear'
    
    # Güvenlik
    SECURITY_BAN = 'security_ban'
    SECURITY_UNBAN = 'security_unban'


class AdminActionLog(BaseModel):
    """
    Admin işlem log modeli.
    
    Tüm admin/super admin işlemlerinin audit trail'i.
    """
    
    __tablename__ = 'admin_action_logs'
    __table_args__ = (
        Index('ix_admin_logs_admin', 'admin_id'),
        Index('ix_admin_logs_action', 'action_type'),
        Index('ix_admin_logs_target', 'target_type', 'target_id'),
        Index('ix_admin_logs_created', 'created_at'),
    )
    
    admin_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    admin = relationship('User', foreign_keys=[admin_id])
    
    action_type = Column(String(50), nullable=False)
    
    # Hedef kaynak
    target_type = Column(String(50), nullable=True)    # user, course, content, package, setting
    target_id = Column(Integer, nullable=True)
    target_name = Column(String(255), nullable=True)   # Okunabilir isim
    
    # Detaylar
    description = Column(Text, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    
    # İstek bilgileri
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Sonuç
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    def __repr__(self):
        return f'<AdminActionLog {self.action_type} by {self.admin_id}>'
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'admin_id': self.admin_id,
            'admin_name': self.admin.full_name if self.admin else None,
            'action_type': self.action_type,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'target_name': self.target_name,
            'description': self.description,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'ip_address': self.ip_address,
            'success': self.success,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ContentApprovalQueue(BaseModel):
    """
    İçerik onay kuyruğu modeli.
    
    Onay bekleyen içeriklerin takibi.
    """
    
    __tablename__ = 'content_approval_queue'
    __table_args__ = (
        Index('ix_approval_queue_status', 'status'),
        Index('ix_approval_queue_content', 'content_type', 'content_id'),
        Index('ix_approval_queue_priority', 'priority', 'created_at'),
        Index('ix_approval_queue_assigned', 'assigned_to_id'),
    )
    
    content_type = Column(String(50), nullable=False)    # video, document, course
    content_id = Column(Integer, nullable=False)
    content_title = Column(String(255), nullable=False)
    
    # Gönderen
    submitted_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    submitted_by = relationship('User', foreign_keys=[submitted_by_id])
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    # Durum
    status = Column(String(20), default='pending', nullable=False)  # pending, in_review, approved, rejected
    priority = Column(Integer, default=0)  # 0: normal, 1: high, 2: urgent
    
    # Atanan admin
    assigned_to_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    assigned_to = relationship('User', foreign_keys=[assigned_to_id])
    assigned_at = Column(DateTime, nullable=True)
    
    # İnceleme
    reviewed_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    reviewed_by = relationship('User', foreign_keys=[reviewed_by_id])
    reviewed_at = Column(DateTime, nullable=True)
    
    # Sonuç
    reviewer_notes = Column(Text, nullable=True)
    rejection_reason = Column(String(100), nullable=True)
    rejection_details = Column(Text, nullable=True)
    
    # İstatistikler
    review_time_minutes = Column(Integer, nullable=True)  # İnceleme süresi
    revision_count = Column(Integer, default=0)           # Kaç kez revize edildi
    
    def __repr__(self):
        return f'<ContentApprovalQueue {self.content_type}:{self.content_id}>'
    
    @property
    def priority_label(self) -> str:
        """Öncelik etiketi."""
        return {0: 'Normal', 1: 'Yüksek', 2: 'Acil'}.get(self.priority, 'Normal')
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'content_type': self.content_type,
            'content_id': self.content_id,
            'content_title': self.content_title,
            'submitted_by_id': self.submitted_by_id,
            'submitted_by_name': self.submitted_by.full_name if self.submitted_by else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'status': self.status,
            'priority': self.priority,
            'priority_label': self.priority_label,
            'assigned_to_id': self.assigned_to_id,
            'assigned_to_name': self.assigned_to.full_name if self.assigned_to else None,
            'reviewed_by_name': self.reviewed_by.full_name if self.reviewed_by else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewer_notes': self.reviewer_notes,
            'rejection_reason': self.rejection_reason,
            'revision_count': self.revision_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AnnouncementType(str, Enum):
    """Duyuru tipleri."""
    INFO = 'info'
    WARNING = 'warning'
    SUCCESS = 'success'
    ERROR = 'error'


class SystemAnnouncement(BaseModel):
    """
    Sistem duyuruları modeli.
    
    Kullanıcılara gösterilecek sistem duyuruları.
    """
    
    __tablename__ = 'system_announcements'
    __table_args__ = (
        Index('ix_announcements_active', 'is_active', 'starts_at', 'ends_at'),
        Index('ix_announcements_target', 'target_roles'),
    )
    
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    announcement_type = Column(String(20), default=AnnouncementType.INFO.value)
    
    # Zamanlama
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    
    # Hedef kitle
    target_roles = Column(JSON, default=list)  # ['student', 'teacher'] veya [] = herkes
    target_user_ids = Column(JSON, default=list)  # Belirli kullanıcılar
    
    # Görünüm
    is_active = Column(Boolean, default=True)
    is_dismissible = Column(Boolean, default=True)  # Kapatılabilir mi
    show_on_dashboard = Column(Boolean, default=True)
    show_on_login = Column(Boolean, default=False)
    
    # İstatistikler
    view_count = Column(Integer, default=0)
    dismiss_count = Column(Integer, default=0)
    
    # Oluşturan
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_by = relationship('User')
    
    def __repr__(self):
        return f'<SystemAnnouncement {self.title}>'
    
    @property
    def is_currently_active(self) -> bool:
        """Duyurunun şu an aktif olup olmadığını kontrol eder."""
        if not self.is_active:
            return False
        
        now = datetime.utcnow()
        
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        
        return True
    
    def is_visible_to_user(self, user) -> bool:
        """Kullanıcının bu duyuruyu görüp göremeyeceğini kontrol eder."""
        if not self.is_currently_active:
            return False
        
        # Belirli kullanıcılar hedeflenmişse
        if self.target_user_ids and user.id not in self.target_user_ids:
            return False
        
        # Belirli roller hedeflenmişse
        if self.target_roles and user.role.name not in self.target_roles:
            return False
        
        return True
    
    def to_dict(self, include_stats: bool = False) -> Dict[str, Any]:
        data = {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'announcement_type': self.announcement_type,
            'starts_at': self.starts_at.isoformat() if self.starts_at else None,
            'ends_at': self.ends_at.isoformat() if self.ends_at else None,
            'is_active': self.is_active,
            'is_currently_active': self.is_currently_active,
            'is_dismissible': self.is_dismissible,
            'show_on_dashboard': self.show_on_dashboard,
            'show_on_login': self.show_on_login,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        
        if include_stats:
            data['view_count'] = self.view_count
            data['dismiss_count'] = self.dismiss_count
            data['target_roles'] = self.target_roles
        
        return data
