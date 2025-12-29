"""
Contents Module - Models.

Video, doküman ve ilerleme modelleri.
Admin onayı, versiyonlama ve soft delete desteği.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
import enum
import json

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, Enum, Index, JSON
from sqlalchemy.orm import relationship

from app.extensions import db
from app.common.base_model import BaseModel, SoftDeleteMixin


# =============================================================================
# Content Status & Approval Enums
# =============================================================================

class ContentStatus(enum.Enum):
    """
    İçerik durumu - Admin onay workflow'u için.
    
    Akış: DRAFT -> PENDING_REVIEW -> APPROVED/REJECTED
          APPROVED -> PUBLISHED
          Herhangi biri -> ARCHIVED
    """
    DRAFT = 'draft'                    # Taslak - sadece sahibi görebilir
    PENDING_REVIEW = 'pending_review'  # Onay bekliyor
    APPROVED = 'approved'              # Onaylandı - yayınlanabilir
    REJECTED = 'rejected'              # Reddedildi
    PUBLISHED = 'published'            # Yayında
    ARCHIVED = 'archived'              # Arşivlendi


class ContentCategory(enum.Enum):
    """İçerik kategorisi."""
    VIDEO = 'video'
    DOCUMENT = 'document'
    QUIZ = 'quiz'
    LIVE_SESSION = 'live_session'
    ASSIGNMENT = 'assignment'


class RejectionReason(enum.Enum):
    """Ret nedeni kategorileri."""
    INAPPROPRIATE_CONTENT = 'inappropriate_content'
    LOW_QUALITY = 'low_quality'
    DUPLICATE = 'duplicate'
    COPYRIGHT_VIOLATION = 'copyright_violation'
    INCOMPLETE = 'incomplete'
    TECHNICAL_ISSUE = 'technical_issue'
    OTHER = 'other'


class VideoStatus(enum.Enum):
    """Video teknik durumu."""
    PROCESSING = 'processing'
    READY = 'ready'
    ERROR = 'error'


class VideoProvider(enum.Enum):
    """Video sağlayıcı."""
    YOUTUBE = 'youtube'
    VIMEO = 'vimeo'
    LOCAL = 'local'
    BUNNY = 'bunny'


# =============================================================================
# Content Version Model
# =============================================================================

class ContentVersion(BaseModel):
    """
    İçerik versiyon modeli.
    
    Her içerik değişikliği yeni bir versiyon oluşturur.
    İçerik geçmişi takibi, geri alma ve karşılaştırma için.
    """
    
    __tablename__ = 'content_versions'
    
    # İçerik referansı (polymorphic)
    content_category = Column(Enum(ContentCategory), nullable=False, index=True)
    content_id = Column(Integer, nullable=False, index=True)
    
    # Versiyon bilgisi
    version_number = Column(Integer, nullable=False, default=1)
    version_label = Column(String(100), nullable=True)  # "v1.0", "Major Update" vs.
    
    # Değişiklik bilgileri
    changed_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    changed_by = relationship('User', foreign_keys=[changed_by_id])
    change_summary = Column(String(500), nullable=True)
    
    # Önceki versiyon referansı
    previous_version_id = Column(Integer, ForeignKey('content_versions.id'), nullable=True)
    previous_version = relationship('ContentVersion', remote_side='ContentVersion.id',
                                    foreign_keys=[previous_version_id])
    
    # Snapshot - içeriğin o anki tam hali (JSON)
    content_snapshot = Column(JSON, nullable=False)
    
    # Diff - önceki versiyondan farklar (JSON)
    changes_diff = Column(JSON, nullable=True)
    
    # Flags
    is_current = Column(Boolean, default=True, index=True)
    is_published_version = Column(Boolean, default=False)
    
    # Restore bilgisi
    restored_from_version_id = Column(Integer, ForeignKey('content_versions.id'), nullable=True)
    
    __table_args__ = (
        Index('ix_content_versions_content', 'content_category', 'content_id'),
        Index('ix_content_versions_current', 'content_category', 'content_id', 'is_current'),
        db.UniqueConstraint('content_category', 'content_id', 'version_number', 
                           name='uq_content_version_number'),
    )
    
    def __repr__(self):
        return f'<ContentVersion {self.content_category.value}:{self.content_id} v{self.version_number}>'
    
    def to_dict(self, exclude: List[str] = None) -> dict:
        """Versiyon bilgilerini dictionary olarak döner."""
        exclude = exclude or []
        data = super().to_dict(exclude=exclude)
        data['content_category'] = self.content_category.value if self.content_category else None
        data['changed_by_name'] = self.changed_by.full_name if self.changed_by else None
        return data


# =============================================================================
# Content Approval Model
# =============================================================================

class ContentApproval(BaseModel):
    """
    İçerik onay kaydı modeli.
    
    Her onay/red işlemi için audit trail.
    """
    
    __tablename__ = 'content_approvals'
    
    # İçerik referansı
    content_category = Column(Enum(ContentCategory), nullable=False, index=True)
    content_id = Column(Integer, nullable=False, index=True)
    
    # Önceki ve yeni durum
    previous_status = Column(Enum(ContentStatus), nullable=False)
    new_status = Column(Enum(ContentStatus), nullable=False)
    
    # Onaylayan/Reddeden
    reviewed_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    reviewed_by = relationship('User', foreign_keys=[reviewed_by_id])
    reviewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Ret bilgileri
    rejection_reason = Column(Enum(RejectionReason), nullable=True)
    rejection_details = Column(Text, nullable=True)
    
    # Onay notları
    reviewer_notes = Column(Text, nullable=True)
    
    # Versiyon referansı
    version_id = Column(Integer, ForeignKey('content_versions.id'), nullable=True)
    version = relationship('ContentVersion')
    
    __table_args__ = (
        Index('ix_content_approvals_content', 'content_category', 'content_id'),
        Index('ix_content_approvals_reviewed_at', 'reviewed_at'),
    )
    
    def __repr__(self):
        return f'<ContentApproval {self.content_category.value}:{self.content_id} {self.new_status.value}>'
    
    def to_dict(self, exclude: List[str] = None) -> dict:
        data = super().to_dict(exclude=exclude)
        data['content_category'] = self.content_category.value if self.content_category else None
        data['previous_status'] = self.previous_status.value if self.previous_status else None
        data['new_status'] = self.new_status.value if self.new_status else None
        data['rejection_reason'] = self.rejection_reason.value if self.rejection_reason else None
        data['reviewed_by_name'] = self.reviewed_by.full_name if self.reviewed_by else None
        return data


class Video(BaseModel, SoftDeleteMixin):
    """
    Video içerik modeli.
    
    Ders videoları - admin onayı ve versiyonlama destekli.
    """
    
    __tablename__ = 'videos'
    __table_args__ = (
        Index('ix_videos_topic_order', 'topic_id', 'order'),
        Index('ix_videos_status_content', 'content_status', 'is_deleted'),
        Index('ix_videos_uploaded_by', 'uploaded_by'),
        {'extend_existing': True}
    )
    
    # Temel bilgiler
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, default=0, nullable=False)
    
    # Video bilgileri
    provider = Column(
        Enum(VideoProvider),
        default=VideoProvider.YOUTUBE,
        nullable=False
    )
    video_id = Column(String(255), nullable=True)  # YouTube/Vimeo ID
    video_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    duration = Column(Integer, default=0)  # Saniye
    
    # Teknik durum
    status = Column(
        Enum(VideoStatus),
        default=VideoStatus.READY,
        nullable=False
    )
    
    # Content status - admin onay workflow
    content_status = Column(
        Enum(ContentStatus),
        default=ContentStatus.DRAFT,
        nullable=False,
        index=True
    )
    
    # İlişkiler
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    topic = relationship('Topic', back_populates='videos')
    uploader = relationship('User', backref='uploaded_videos', foreign_keys=[uploaded_by])
    
    # Progress relationship - added for backward compatibility with app/models/content.py
    progress = relationship('VideoProgress', back_populates='video', lazy='dynamic',
                            cascade='all, delete-orphan')
    
    # Ayarlar
    is_free_preview = Column(Boolean, default=False)
    is_downloadable = Column(Boolean, default=False)
    
    # İstatistikler
    view_count = Column(Integer, default=0)
    
    # Versiyonlama
    current_version = Column(Integer, default=1)
    
    # Onay bilgileri
    submitted_for_review_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    published_at = Column(DateTime, nullable=True)
    
    # Meta
    tags = Column(JSON, default=list)
    extra_data = Column(JSON, default=dict)
    
    def __repr__(self):
        return f'<Video {self.title[:30]}>'
    
    @property
    def duration_formatted(self) -> str:
        """Süreyi HH:MM:SS formatında döner."""
        hours, remainder = divmod(self.duration, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if hours > 0:
            return f'{hours:02d}:{minutes:02d}:{seconds:02d}'
        return f'{minutes:02d}:{seconds:02d}'
    
    @property
    def embed_url(self) -> str:
        """Embed URL döner."""
        if self.provider == VideoProvider.YOUTUBE:
            return f'https://www.youtube.com/embed/{self.video_id}'
        elif self.provider == VideoProvider.VIMEO:
            return f'https://player.vimeo.com/video/{self.video_id}'
        return self.video_url
    
    @property
    def is_visible(self) -> bool:
        """İçerik görünür mü?"""
        return (
            not self.is_deleted and 
            self.content_status == ContentStatus.PUBLISHED and
            self.status == VideoStatus.READY
        )
    
    def can_edit(self, user_id: int, is_admin: bool = False) -> bool:
        """Kullanıcı düzenleyebilir mi?"""
        if is_admin:
            return True
        if self.uploaded_by != user_id:
            return False
        # Yayında olan içerik düzenlenemez (yeni versiyon oluşturulmalı)
        return self.content_status not in [ContentStatus.PUBLISHED, ContentStatus.PENDING_REVIEW]
    
    def submit_for_review(self):
        """İçeriği onaya gönder."""
        if self.content_status not in [ContentStatus.DRAFT, ContentStatus.REJECTED]:
            raise ValueError('Sadece taslak veya reddedilen içerikler onaya gönderilebilir')
        self.content_status = ContentStatus.PENDING_REVIEW
        self.submitted_for_review_at = datetime.utcnow()
    
    def approve(self, approved_by: int):
        """İçeriği onayla."""
        if self.content_status != ContentStatus.PENDING_REVIEW:
            raise ValueError('Sadece onay bekleyen içerikler onaylanabilir')
        self.content_status = ContentStatus.APPROVED
        self.approved_at = datetime.utcnow()
        self.approved_by_id = approved_by
    
    def reject(self):
        """İçeriği reddet."""
        if self.content_status != ContentStatus.PENDING_REVIEW:
            raise ValueError('Sadece onay bekleyen içerikler reddedilebilir')
        self.content_status = ContentStatus.REJECTED
    
    def publish(self):
        """İçeriği yayınla."""
        if self.content_status != ContentStatus.APPROVED:
            raise ValueError('Sadece onaylanmış içerikler yayınlanabilir')
        self.content_status = ContentStatus.PUBLISHED
        self.published_at = datetime.utcnow()
    
    def archive(self):
        """İçeriği arşivle."""
        self.content_status = ContentStatus.ARCHIVED
    
    def get_snapshot(self) -> Dict[str, Any]:
        """Versiyon için snapshot oluştur."""
        return {
            'title': self.title,
            'description': self.description,
            'order': self.order,
            'provider': self.provider.value if self.provider else None,
            'video_id': self.video_id,
            'video_url': self.video_url,
            'thumbnail_url': self.thumbnail_url,
            'duration': self.duration,
            'is_free_preview': self.is_free_preview,
            'is_downloadable': self.is_downloadable,
            'tags': self.tags,
            'extra_data': self.extra_data,
        }
    
    def to_dict(self, exclude: List[str] = None, include_approval: bool = False) -> dict:
        exclude = exclude or []
        data = super().to_dict(exclude=exclude)
        data['provider'] = self.provider.value if self.provider else None
        data['status'] = self.status.value if self.status else None
        data['content_status'] = self.content_status.value if self.content_status else None
        data['duration_formatted'] = self.duration_formatted
        data['embed_url'] = self.embed_url
        data['is_visible'] = self.is_visible
        data['current_version'] = self.current_version
        
        if include_approval:
            data['approved_at'] = self.approved_at.isoformat() if self.approved_at else None
            data['published_at'] = self.published_at.isoformat() if self.published_at else None
        
        return data


class DocumentType(enum.Enum):
    """Doküman tipi."""
    PDF = 'pdf'
    DOC = 'doc'
    SLIDE = 'slide'
    SPREADSHEET = 'spreadsheet'
    OTHER = 'other'


class Document(BaseModel, SoftDeleteMixin):
    """
    Doküman modeli.
    
    Ders materyalleri - admin onayı ve versiyonlama destekli.
    """
    
    __tablename__ = 'documents'
    __table_args__ = (
        Index('ix_documents_topic_order', 'topic_id', 'order'),
        Index('ix_documents_status_content', 'content_status', 'is_deleted'),
        Index('ix_documents_uploaded_by', 'uploaded_by'),
        {'extend_existing': True}
    )
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Dosya bilgileri
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)  # Bytes
    file_type = Column(
        Enum(DocumentType),
        default=DocumentType.PDF,
        nullable=False
    )
    mime_type = Column(String(100), nullable=True)
    
    # İlişkiler
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    topic = relationship('Topic', backref='documents')
    uploader = relationship('User', backref='uploaded_documents', foreign_keys=[uploaded_by])
    
    # Ayarlar
    is_downloadable = Column(Boolean, default=True)
    order = Column(Integer, default=0)
    
    # İstatistikler
    download_count = Column(Integer, default=0)
    
    # Content status - admin onay workflow
    content_status = Column(
        Enum(ContentStatus),
        default=ContentStatus.DRAFT,
        nullable=False,
        index=True
    )
    
    # Versiyonlama
    current_version = Column(Integer, default=1)
    
    # Onay bilgileri
    submitted_for_review_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    published_at = Column(DateTime, nullable=True)
    
    # Meta
    tags = Column(JSON, default=list)
    extra_data = Column(JSON, default=dict)
    
    def __repr__(self):
        return f'<Document {self.title[:30]}>'
    
    @property
    def file_size_formatted(self) -> str:
        """Dosya boyutunu formatlı döner."""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f'{size:.1f} {unit}'
            size /= 1024
        return f'{size:.1f} TB'
    
    @property
    def is_visible(self) -> bool:
        """İçerik görünür mü?"""
        return (
            not self.is_deleted and 
            self.content_status == ContentStatus.PUBLISHED
        )
    
    def can_edit(self, user_id: int, is_admin: bool = False) -> bool:
        """Kullanıcı düzenleyebilir mi?"""
        if is_admin:
            return True
        if self.uploaded_by != user_id:
            return False
        return self.content_status not in [ContentStatus.PUBLISHED, ContentStatus.PENDING_REVIEW]
    
    def submit_for_review(self):
        """İçeriği onaya gönder."""
        if self.content_status not in [ContentStatus.DRAFT, ContentStatus.REJECTED]:
            raise ValueError('Sadece taslak veya reddedilen içerikler onaya gönderilebilir')
        self.content_status = ContentStatus.PENDING_REVIEW
        self.submitted_for_review_at = datetime.utcnow()
    
    def approve(self, approved_by: int):
        """İçeriği onayla."""
        if self.content_status != ContentStatus.PENDING_REVIEW:
            raise ValueError('Sadece onay bekleyen içerikler onaylanabilir')
        self.content_status = ContentStatus.APPROVED
        self.approved_at = datetime.utcnow()
        self.approved_by_id = approved_by
    
    def reject(self):
        """İçeriği reddet."""
        if self.content_status != ContentStatus.PENDING_REVIEW:
            raise ValueError('Sadece onay bekleyen içerikler reddedilebilir')
        self.content_status = ContentStatus.REJECTED
    
    def publish(self):
        """İçeriği yayınla."""
        if self.content_status != ContentStatus.APPROVED:
            raise ValueError('Sadece onaylanmış içerikler yayınlanabilir')
        self.content_status = ContentStatus.PUBLISHED
        self.published_at = datetime.utcnow()
    
    def archive(self):
        """İçeriği arşivle."""
        self.content_status = ContentStatus.ARCHIVED
    
    def get_snapshot(self) -> Dict[str, Any]:
        """Versiyon için snapshot oluştur."""
        return {
            'title': self.title,
            'description': self.description,
            'file_url': self.file_url,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'file_type': self.file_type.value if self.file_type else None,
            'mime_type': self.mime_type,
            'is_downloadable': self.is_downloadable,
            'order': self.order,
            'tags': self.tags,
            'extra_data': self.extra_data,
        }
    
    def to_dict(self, exclude: List[str] = None, include_approval: bool = False) -> dict:
        exclude = exclude or []
        data = super().to_dict(exclude=exclude)
        data['file_type'] = self.file_type.value if self.file_type else None
        data['file_size_formatted'] = self.file_size_formatted
        data['content_status'] = self.content_status.value if self.content_status else None
        data['is_visible'] = self.is_visible
        data['current_version'] = self.current_version
        
        if include_approval:
            data['approved_at'] = self.approved_at.isoformat() if self.approved_at else None
            data['published_at'] = self.published_at.isoformat() if self.published_at else None
        
        return data


class ContentType(enum.Enum):
    """İçerik tipi."""
    VIDEO = 'video'
    DOCUMENT = 'document'
    QUIZ = 'quiz'


class ContentProgress(BaseModel):
    """
    İçerik ilerleme modeli.
    
    Kullanıcının içerik tüketim takibi.
    """
    
    __tablename__ = 'content_progress'
    __table_args__ = {'extend_existing': True}
    
    # İlişkiler
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    content_type = Column(Enum(ContentType), nullable=False)
    content_id = Column(Integer, nullable=False, index=True)
    
    user = relationship('User', backref='content_progress')
    
    # İlerleme
    progress_percentage = Column(Float, default=0.0)
    last_position = Column(Integer, default=0)  # Video için saniye
    
    # Tamamlanma
    is_completed = Column(Boolean, default=False, index=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Erişim
    first_accessed_at = Column(DateTime, default=datetime.utcnow)
    last_accessed_at = Column(DateTime, default=datetime.utcnow)
    access_count = Column(Integer, default=1)
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint(
            'user_id', 'content_type', 'content_id',
            name='unique_user_content_progress'
        ),
    )
    
    def __repr__(self):
        return f'<ContentProgress user={self.user_id} content={self.content_type.value}:{self.content_id}>'
    
    def mark_completed(self):
        """İçeriği tamamlandı olarak işaretle."""
        self.is_completed = True
        self.completed_at = datetime.utcnow()
        self.progress_percentage = 100.0
    
    def update_access(self):
        """Erişim bilgilerini güncelle."""
        self.last_accessed_at = datetime.utcnow()
        self.access_count += 1
    
    def to_dict(self, exclude: List[str] = None) -> dict:
        data = super().to_dict(exclude=exclude)
        data['content_type'] = self.content_type.value if self.content_type else None
        return data
