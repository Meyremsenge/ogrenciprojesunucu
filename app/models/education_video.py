"""
Education Video Model
YouTube tabanlı eğitim videoları - Super Admin ve Öğretmen videoları
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
import enum
import re

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum, Index, JSON
from sqlalchemy.orm import relationship

from app.extensions import db
from app.common.base_model import BaseModel


# =============================================================================
# Enums
# =============================================================================

class GradeLevel(enum.Enum):
    """Sınıf seviyeleri."""
    # İlkokul
    GRADE_1 = 'grade_1'      # 1. Sınıf
    GRADE_2 = 'grade_2'      # 2. Sınıf
    GRADE_3 = 'grade_3'      # 3. Sınıf
    GRADE_4 = 'grade_4'      # 4. Sınıf
    
    # Ortaokul
    GRADE_5 = 'grade_5'      # 5. Sınıf
    GRADE_6 = 'grade_6'      # 6. Sınıf
    GRADE_7 = 'grade_7'      # 7. Sınıf
    GRADE_8 = 'grade_8'      # 8. Sınıf
    
    # Lise
    GRADE_9 = 'grade_9'      # 9. Sınıf
    GRADE_10 = 'grade_10'    # 10. Sınıf
    GRADE_11 = 'grade_11'    # 11. Sınıf
    GRADE_12 = 'grade_12'    # 12. Sınıf
    
    # Mezun
    GRADUATE = 'graduate'     # Mezun


class EducationLevel(enum.Enum):
    """Eğitim kademesi."""
    PRIMARY = 'primary'       # İlkokul (1-4)
    MIDDLE = 'middle'         # Ortaokul (5-8)
    HIGH = 'high'             # Lise (9-12)
    GRADUATE = 'graduate'     # Mezun


class Subject(enum.Enum):
    """Ders/Konu kategorileri."""
    TURKISH = 'turkish'                 # Türkçe
    MATHEMATICS = 'mathematics'         # Matematik
    SCIENCE = 'science'                 # Fen Bilimleri
    SOCIAL_STUDIES = 'social_studies'   # Sosyal Bilgiler
    ENGLISH = 'english'                 # İngilizce
    PHYSICS = 'physics'                 # Fizik
    CHEMISTRY = 'chemistry'             # Kimya
    BIOLOGY = 'biology'                 # Biyoloji
    HISTORY = 'history'                 # Tarih
    GEOGRAPHY = 'geography'             # Coğrafya
    PHILOSOPHY = 'philosophy'           # Felsefe
    RELIGIOUS_CULTURE = 'religious_culture'  # Din Kültürü
    LITERATURE = 'literature'           # Edebiyat
    GEOMETRY = 'geometry'               # Geometri
    OTHER = 'other'                     # Diğer


class VideoOwnerType(enum.Enum):
    """Video sahibi tipi."""
    SYSTEM = 'system'       # Super Admin tarafından eklenen sistem videoları
    TEACHER = 'teacher'     # Öğretmen tarafından eklenen videolar


# =============================================================================
# Helper Functions
# =============================================================================

def extract_youtube_id(url: str) -> Optional[str]:
    """YouTube URL'den video ID'sini çıkarır."""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/v\/([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_grade_display(grade: GradeLevel) -> str:
    """Sınıf seviyesini görüntüleme formatına çevirir."""
    grade_names = {
        GradeLevel.GRADE_1: '1. Sınıf',
        GradeLevel.GRADE_2: '2. Sınıf',
        GradeLevel.GRADE_3: '3. Sınıf',
        GradeLevel.GRADE_4: '4. Sınıf',
        GradeLevel.GRADE_5: '5. Sınıf',
        GradeLevel.GRADE_6: '6. Sınıf',
        GradeLevel.GRADE_7: '7. Sınıf',
        GradeLevel.GRADE_8: '8. Sınıf',
        GradeLevel.GRADE_9: '9. Sınıf',
        GradeLevel.GRADE_10: '10. Sınıf',
        GradeLevel.GRADE_11: '11. Sınıf',
        GradeLevel.GRADE_12: '12. Sınıf',
        GradeLevel.GRADUATE: 'Mezun',
    }
    return grade_names.get(grade, str(grade.value))


def get_education_level(grade: GradeLevel) -> EducationLevel:
    """Sınıf seviyesine göre eğitim kademesini döner."""
    if grade in [GradeLevel.GRADE_1, GradeLevel.GRADE_2, GradeLevel.GRADE_3, GradeLevel.GRADE_4]:
        return EducationLevel.PRIMARY
    elif grade in [GradeLevel.GRADE_5, GradeLevel.GRADE_6, GradeLevel.GRADE_7, GradeLevel.GRADE_8]:
        return EducationLevel.MIDDLE
    elif grade in [GradeLevel.GRADE_9, GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12]:
        return EducationLevel.HIGH
    else:
        return EducationLevel.GRADUATE


# =============================================================================
# Education Video Model
# =============================================================================

class EducationVideo(BaseModel):
    """
    Eğitim Video Modeli
    
    YouTube tabanlı eğitim videoları.
    Super Admin (sistem) ve Öğretmen videoları için ortak model.
    """
    
    __tablename__ = 'education_videos'
    __table_args__ = (
        Index('ix_edu_videos_grade_subject', 'grade_level', 'subject'),
        Index('ix_edu_videos_owner', 'owner_type', 'created_by'),
        Index('ix_edu_videos_active', 'is_active', 'is_deleted'),
        Index('ix_edu_videos_organization', 'organization_id'),
    )
    
    # Temel Bilgiler
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # YouTube Bilgileri
    youtube_url = Column(String(500), nullable=False)
    youtube_id = Column(String(20), nullable=False)  # 11 karakter YouTube ID
    thumbnail_url = Column(String(500), nullable=True)
    duration_seconds = Column(Integer, default=0)  # Video süresi (saniye)
    
    # Kategori Bilgileri
    grade_level = Column(Enum(GradeLevel), nullable=False, index=True)
    education_level = Column(Enum(EducationLevel), nullable=False, index=True)
    subject = Column(Enum(Subject), nullable=False, index=True)
    
    # Alt kategori (opsiyonel - daha detaylı konular için)
    topic = Column(String(255), nullable=True)  # Örn: "Üçgenler", "Osmanlı Devleti"
    
    # Sahiplik Bilgileri
    owner_type = Column(Enum(VideoOwnerType), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Kurum bilgisi (öğretmen videoları için)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=True, index=True)
    
    # Durum
    is_active = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    # Sıralama
    sort_order = Column(Integer, default=0)
    
    # İstatistikler
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    
    # Meta bilgiler
    tags = Column(JSON, default=list)  # ["trigonometri", "yks", "tyt"]
    extra_data = Column(JSON, default=dict)
    
    # Timestamps
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    creator = relationship('User', backref='education_videos', foreign_keys=[created_by])
    organization = relationship('Organization', backref='education_videos')
    watch_history = relationship('VideoWatchHistory', back_populates='video', lazy='dynamic',
                                  cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<EducationVideo {self.id}: {self.title[:30]}>'
    
    @property
    def embed_url(self) -> str:
        """YouTube embed URL döner."""
        return f'https://www.youtube.com/embed/{self.youtube_id}?rel=0&modestbranding=1'
    
    @property
    def watch_url(self) -> str:
        """YouTube watch URL döner."""
        return f'https://www.youtube.com/watch?v={self.youtube_id}'
    
    @property
    def duration_formatted(self) -> str:
        """Süreyi MM:SS veya HH:MM:SS formatında döner."""
        if not self.duration_seconds:
            return '00:00'
        
        hours, remainder = divmod(self.duration_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if hours > 0:
            return f'{hours:02d}:{minutes:02d}:{seconds:02d}'
        return f'{minutes:02d}:{seconds:02d}'
    
    @property
    def grade_display(self) -> str:
        """Sınıf seviyesini görüntüleme formatında döner."""
        return get_grade_display(self.grade_level)
    
    @property
    def is_system_video(self) -> bool:
        """Sistem videosu mu?"""
        return self.owner_type == VideoOwnerType.SYSTEM
    
    @property
    def is_teacher_video(self) -> bool:
        """Öğretmen videosu mu?"""
        return self.owner_type == VideoOwnerType.TEACHER
    
    def can_edit(self, user_id: int, user_role: str) -> bool:
        """
        Kullanıcı bu videoyu düzenleyebilir mi?
        
        - Super Admin: Sadece sistem videolarını düzenleyebilir
        - Öğretmen: Sadece kendi videolarını düzenleyebilir
        """
        if user_role == 'super_admin':
            return self.owner_type == VideoOwnerType.SYSTEM
        elif user_role == 'teacher':
            return self.owner_type == VideoOwnerType.TEACHER and self.created_by == user_id
        return False
    
    def can_delete(self, user_id: int, user_role: str) -> bool:
        """Silme yetkisi kontrolü."""
        return self.can_edit(user_id, user_role)
    
    def increment_view(self):
        """Görüntülenme sayısını artır."""
        self.view_count = (self.view_count or 0) + 1
    
    def to_dict(self, include_stats: bool = False) -> Dict[str, Any]:
        """Video bilgilerini dictionary olarak döner."""
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'youtube_url': self.youtube_url,
            'youtube_id': self.youtube_id,
            'thumbnail_url': self.thumbnail_url or f'https://img.youtube.com/vi/{self.youtube_id}/hqdefault.jpg',
            'embed_url': self.embed_url,
            'duration_seconds': self.duration_seconds,
            'duration_formatted': self.duration_formatted,
            'grade_level': self.grade_level.value if self.grade_level else None,
            'grade_display': self.grade_display,
            'education_level': self.education_level.value if self.education_level else None,
            'subject': self.subject.value if self.subject else None,
            'topic': self.topic,
            'owner_type': self.owner_type.value if self.owner_type else None,
            'is_system_video': self.is_system_video,
            'created_by': self.created_by,
            'creator_name': self.creator.full_name if self.creator else None,
            'organization_id': self.organization_id,
            'is_active': self.is_active,
            'sort_order': self.sort_order,
            'tags': self.tags or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'published_at': self.published_at.isoformat() if self.published_at else None,
        }
        
        if include_stats:
            data['view_count'] = self.view_count or 0
            data['like_count'] = self.like_count or 0
        
        return data
    
    @classmethod
    def create_from_youtube(
        cls,
        youtube_url: str,
        title: str,
        grade_level: GradeLevel,
        subject: Subject,
        created_by: int,
        owner_type: VideoOwnerType,
        description: str = None,
        topic: str = None,
        organization_id: int = None,
        duration_seconds: int = 0,
        tags: List[str] = None
    ) -> 'EducationVideo':
        """
        YouTube URL'den yeni video oluşturur.
        """
        youtube_id = extract_youtube_id(youtube_url)
        if not youtube_id:
            raise ValueError('Geçersiz YouTube URL')
        
        video = cls(
            title=title,
            description=description,
            youtube_url=youtube_url,
            youtube_id=youtube_id,
            thumbnail_url=f'https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg',
            duration_seconds=duration_seconds,
            grade_level=grade_level,
            education_level=get_education_level(grade_level),
            subject=subject,
            topic=topic,
            owner_type=owner_type,
            created_by=created_by,
            organization_id=organization_id,
            is_active=True,
            published_at=datetime.utcnow(),
            tags=tags or []
        )
        
        return video


# =============================================================================
# Video Watch History Model
# =============================================================================

class VideoWatchHistory(BaseModel):
    """
    Video izleme geçmişi.
    
    Kullanıcıların hangi videoları ne kadar izlediğini takip eder.
    """
    
    __tablename__ = 'video_watch_history'
    __table_args__ = (
        Index('ix_watch_history_user_video', 'user_id', 'video_id'),
        Index('ix_watch_history_user', 'user_id', 'last_watched_at'),
    )
    
    # İlişkiler
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    video_id = Column(Integer, ForeignKey('education_videos.id', ondelete='CASCADE'), nullable=False)
    
    # İzleme bilgileri
    watched_seconds = Column(Integer, default=0)  # Toplam izlenen süre
    last_position = Column(Integer, default=0)     # Son izleme pozisyonu
    watch_count = Column(Integer, default=1)       # Kaç kez izlendi
    
    # Tamamlama
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    first_watched_at = Column(DateTime, default=datetime.utcnow)
    last_watched_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User', backref='video_watch_history')
    video = relationship('EducationVideo', back_populates='watch_history')
    
    def __repr__(self):
        return f'<VideoWatchHistory User:{self.user_id} Video:{self.video_id}>'
    
    def update_progress(self, watched_seconds: int, position: int = None):
        """İzleme ilerlemesini güncelle."""
        self.watched_seconds = max(self.watched_seconds or 0, watched_seconds)
        self.watch_count = (self.watch_count or 0) + 1
        self.last_watched_at = datetime.utcnow()
        
        if position is not None:
            self.last_position = position
        
        # %90 izlenirse tamamlandı say
        if self.video and self.video.duration_seconds:
            if self.watched_seconds >= self.video.duration_seconds * 0.9:
                self.mark_completed()
    
    def mark_completed(self):
        """Videoyu tamamlandı olarak işaretle."""
        if not self.is_completed:
            self.is_completed = True
            self.completed_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'video_id': self.video_id,
            'watched_seconds': self.watched_seconds,
            'last_position': self.last_position,
            'watch_count': self.watch_count,
            'is_completed': self.is_completed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'first_watched_at': self.first_watched_at.isoformat() if self.first_watched_at else None,
            'last_watched_at': self.last_watched_at.isoformat() if self.last_watched_at else None,
        }


# =============================================================================
# Helper Constants
# =============================================================================

GRADE_LABELS = {
    GradeLevel.GRADE_1: '1. Sınıf',
    GradeLevel.GRADE_2: '2. Sınıf',
    GradeLevel.GRADE_3: '3. Sınıf',
    GradeLevel.GRADE_4: '4. Sınıf',
    GradeLevel.GRADE_5: '5. Sınıf',
    GradeLevel.GRADE_6: '6. Sınıf',
    GradeLevel.GRADE_7: '7. Sınıf',
    GradeLevel.GRADE_8: '8. Sınıf',
    GradeLevel.GRADE_9: '9. Sınıf',
    GradeLevel.GRADE_10: '10. Sınıf',
    GradeLevel.GRADE_11: '11. Sınıf',
    GradeLevel.GRADE_12: '12. Sınıf',
    GradeLevel.GRADUATE: 'Mezun',
}

EDUCATION_LEVEL_LABELS = {
    EducationLevel.PRIMARY: 'İlkokul',
    EducationLevel.MIDDLE: 'Ortaokul',
    EducationLevel.HIGH: 'Lise',
    EducationLevel.GRADUATE: 'Mezun',
}

SUBJECT_LABELS = {
    Subject.TURKISH: 'Türkçe',
    Subject.MATHEMATICS: 'Matematik',
    Subject.SCIENCE: 'Fen Bilimleri',
    Subject.SOCIAL_STUDIES: 'Sosyal Bilgiler',
    Subject.ENGLISH: 'İngilizce',
    Subject.PHYSICS: 'Fizik',
    Subject.CHEMISTRY: 'Kimya',
    Subject.BIOLOGY: 'Biyoloji',
    Subject.HISTORY: 'Tarih',
    Subject.GEOGRAPHY: 'Coğrafya',
    Subject.PHILOSOPHY: 'Felsefe',
    Subject.RELIGIOUS_CULTURE: 'Din Kültürü',
    Subject.LITERATURE: 'Edebiyat',
    Subject.GEOMETRY: 'Geometri',
    Subject.OTHER: 'Diğer',
}
