"""
Live Classes Module - Models.

Canlı ders ve katılım modelleri.
Gelişmiş erişim kontrolü, tekrarlayan dersler ve hatırlatma desteği.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import enum
import secrets
import hashlib

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, Enum, JSON
from sqlalchemy.orm import relationship

from app.extensions import db
from app.common.base_model import BaseModel, SoftDeleteMixin


class SessionStatus(enum.Enum):
    """Oturum durumu."""
    DRAFT = 'draft'  # Taslak
    SCHEDULED = 'scheduled'  # Planlandı
    LIVE = 'live'  # Yayında
    ENDED = 'ended'  # Bitti
    CANCELLED = 'cancelled'  # İptal edildi


class SessionPlatform(enum.Enum):
    """Oturum platformu."""
    ZOOM = 'zoom'
    GOOGLE_MEET = 'google_meet'
    MICROSOFT_TEAMS = 'microsoft_teams'
    JITSI = 'jitsi'
    WEBEX = 'webex'
    CUSTOM = 'custom'


class RecurrenceType(enum.Enum):
    """Tekrar tipi."""
    NONE = 'none'
    DAILY = 'daily'
    WEEKLY = 'weekly'
    BIWEEKLY = 'biweekly'
    MONTHLY = 'monthly'


class LiveSession(BaseModel, SoftDeleteMixin):
    """
    Canlı ders oturumu modeli.
    
    Link tabanlı canlı ders oturumları.
    Gelişmiş erişim kontrolü ve tekrarlayan ders desteği.
    """
    
    __tablename__ = 'live_sessions'
    __table_args__ = {'extend_existing': True}
    
    # Temel bilgiler
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # İlişkiler
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=True, index=True)
    host_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    course = relationship('Course', backref='live_sessions')
    topic = relationship('Topic', backref='live_sessions')
    host = relationship('User', backref='hosted_sessions', foreign_keys=[host_id])
    
    # Durum
    status = Column(
        Enum(SessionStatus),
        default=SessionStatus.SCHEDULED,
        nullable=False,
        index=True
    )
    
    # Platform ve link
    platform = Column(
        Enum(SessionPlatform),
        default=SessionPlatform.ZOOM,
        nullable=False
    )
    meeting_url = Column(String(500), nullable=False)
    meeting_id = Column(String(100), nullable=True)
    meeting_password = Column(String(50), nullable=True)
    
    # Giriş token (güvenlik için)
    access_token = Column(String(64), nullable=True, unique=True, index=True)
    
    # Zamanlama
    scheduled_start = Column(DateTime, nullable=False, index=True)
    scheduled_end = Column(DateTime, nullable=False)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=60)
    
    # Tekrarlayan ders ayarları
    recurrence_type = Column(
        Enum(RecurrenceType),
        default=RecurrenceType.NONE,
        nullable=False
    )
    recurrence_end_date = Column(DateTime, nullable=True)
    parent_session_id = Column(Integer, ForeignKey('live_sessions.id'), nullable=True)
    
    # Ayarlar
    max_participants = Column(Integer, default=100)
    is_recording_enabled = Column(Boolean, default=True)
    recording_url = Column(String(500), nullable=True)
    
    # Erişim kontrolü
    require_enrollment = Column(Boolean, default=True)  # Kursa kayıtlı olmalı
    require_registration = Column(Boolean, default=False)  # Derse önceden kayıt gerekli
    early_join_minutes = Column(Integer, default=15)  # Kaç dakika önce katılabilir
    late_join_allowed = Column(Boolean, default=True)  # Geç katılım izni
    late_join_minutes = Column(Integer, default=30)  # Kaç dakika sonrasına kadar
    
    # Hatırlatma
    reminder_sent = Column(Boolean, default=False)
    reminder_24h_sent = Column(Boolean, default=False)
    reminder_1h_sent = Column(Boolean, default=False)
    
    # İstatistikler
    participant_count = Column(Integer, default=0)
    peak_participants = Column(Integer, default=0)  # Maksimum eş zamanlı katılımcı
    
    # Ek bilgiler
    materials = Column(JSON, default=list)  # Ders materyalleri linki
    notes = Column(Text, nullable=True)  # Öğretmen notları
    
    # İlişkiler
    attendances = relationship('SessionAttendance', back_populates='session', cascade='all, delete-orphan')
    child_sessions = relationship('LiveSession', backref=db.backref('parent_session', remote_side='LiveSession.id'))
    
    def __repr__(self):
        return f'<LiveSession {self.title[:30]}>'
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.access_token:
            self.access_token = secrets.token_urlsafe(32)
    
    @property
    def is_upcoming(self) -> bool:
        """Oturum yaklaşıyor mu?"""
        if self.status != SessionStatus.SCHEDULED:
            return False
        return datetime.utcnow() < self.scheduled_start
    
    @property
    def can_join(self) -> bool:
        """Oturuma katılabilir mi?"""
        if self.status == SessionStatus.CANCELLED:
            return False
        if self.status == SessionStatus.ENDED:
            return False
        
        now = datetime.utcnow()
        
        # Erken katılım kontrolü
        early_join = self.scheduled_start - timedelta(minutes=self.early_join_minutes or 15)
        
        if now < early_join:
            return False
        
        # Geç katılım kontrolü
        if self.status == SessionStatus.LIVE:
            if not self.late_join_allowed:
                # Ders başladıktan sonra katılıma izin verilmiyor
                if self.actual_start and now > self.actual_start:
                    return False
            else:
                # Geç katılım süresi aşıldı mı?
                late_limit = self.actual_start + timedelta(minutes=self.late_join_minutes or 30) if self.actual_start else None
                if late_limit and now > late_limit:
                    return False
        
        return True
    
    @property
    def time_until_start(self) -> Optional[timedelta]:
        """Başlamaya kalan süre."""
        if self.status != SessionStatus.SCHEDULED:
            return None
        now = datetime.utcnow()
        if now >= self.scheduled_start:
            return timedelta(0)
        return self.scheduled_start - now
    
    @property
    def is_joinable_now(self) -> bool:
        """Şu an katılınabilir mi?"""
        return self.can_join and self.status in [SessionStatus.SCHEDULED, SessionStatus.LIVE]
    
    @property
    def duration_actual(self) -> Optional[int]:
        """Gerçek süre (dakika)."""
        if self.actual_start and self.actual_end:
            delta = self.actual_end - self.actual_start
            return int(delta.total_seconds() / 60)
        return None
    
    def check_user_access(self, user_id: int) -> Dict[str, Any]:
        """
        Kullanıcının erişim durumunu kontrol et.
        
        Returns:
            {
                'can_access': bool,
                'reason': str,
                'is_host': bool,
                'is_registered': bool,
                'is_enrolled': bool
            }
        """
        from app.modules.courses.models import Enrollment
        
        result = {
            'can_access': False,
            'reason': '',
            'is_host': False,
            'is_registered': False,
            'is_enrolled': False
        }
        
        # Host kontrolü
        if self.host_id == user_id:
            result['can_access'] = True
            result['is_host'] = True
            return result
        
        # Kayıt kontrolü
        attendance = SessionAttendance.query.filter_by(
            session_id=self.id,
            user_id=user_id
        ).first()
        
        if attendance:
            result['is_registered'] = True
        
        # Kursa kayıt kontrolü
        if self.require_enrollment:
            enrollment = Enrollment.query.filter_by(
                course_id=self.course_id,
                user_id=user_id
            ).first()
            
            if enrollment:
                result['is_enrolled'] = True
            else:
                result['reason'] = 'Bu kursa kayıtlı değilsiniz'
                return result
        
        # Derse kayıt kontrolü
        if self.require_registration and not result['is_registered']:
            result['reason'] = 'Bu derse önceden kayıt olmanız gerekiyor'
            return result
        
        # Kapasite kontrolü
        if self.max_participants:
            current = SessionAttendance.query.filter_by(session_id=self.id).count()
            if current >= self.max_participants and not result['is_registered']:
                result['reason'] = 'Ders kapasitesi dolmuş'
                return result
        
        # Zaman kontrolü
        if not self.can_join:
            if self.status == SessionStatus.CANCELLED:
                result['reason'] = 'Bu ders iptal edilmiş'
            elif self.status == SessionStatus.ENDED:
                result['reason'] = 'Bu ders sona ermiş'
            elif datetime.utcnow() < self.scheduled_start - timedelta(minutes=self.early_join_minutes or 15):
                result['reason'] = f'Derse {self.early_join_minutes} dakika önce katılabilirsiniz'
            else:
                result['reason'] = 'Derse katılım süresi dolmuş'
            return result
        
        result['can_access'] = True
        return result
    
    def generate_join_link(self, user_id: int) -> Optional[str]:
        """
        Kullanıcıya özel katılım linki oluştur.
        
        Token bazlı güvenli erişim.
        """
        if not self.can_join:
            return None
        
        # Kullanıcı-oturum bazlı hash oluştur
        token_data = f"{self.id}:{user_id}:{self.access_token}"
        user_token = hashlib.sha256(token_data.encode()).hexdigest()[:16]
        
        # Platform bazlı link
        if self.platform == SessionPlatform.CUSTOM:
            return f"{self.meeting_url}?token={user_token}"
        
        return self.meeting_url
    
    def start_session(self):
        """Oturumu başlat."""
        self.status = SessionStatus.LIVE
        self.actual_start = datetime.utcnow()
    
    def end_session(self):
        """Oturumu bitir."""
        self.status = SessionStatus.ENDED
        self.actual_end = datetime.utcnow()
        
        # Tüm aktif katılımcıları çıkar
        for attendance in self.attendances:
            if attendance.status == AttendanceStatus.JOINED:
                attendance.leave()
    
    def cancel_session(self):
        """Oturumu iptal et."""
        self.status = SessionStatus.CANCELLED
    
    def update_participant_count(self):
        """Katılımcı sayısını güncelle."""
        current_count = SessionAttendance.query.filter_by(
            session_id=self.id,
            status=AttendanceStatus.JOINED
        ).count()
        
        self.participant_count = current_count
        
        if current_count > self.peak_participants:
            self.peak_participants = current_count
    
    def to_dict(self, include_url: bool = False, exclude: List[str] = None) -> dict:
        data = super().to_dict(exclude=exclude)
        data['status'] = self.status.value if self.status else None
        data['platform'] = self.platform.value if self.platform else None
        data['recurrence_type'] = self.recurrence_type.value if self.recurrence_type else None
        data['is_upcoming'] = self.is_upcoming
        data['can_join'] = self.can_join
        data['is_joinable_now'] = self.is_joinable_now
        data['duration_actual'] = self.duration_actual
        data['host_name'] = self.host.full_name if self.host else None
        data['course_name'] = self.course.title if self.course else None
        data['topic_name'] = self.topic.title if self.topic else None
        
        # Kalan süre
        time_until = self.time_until_start
        if time_until:
            data['minutes_until_start'] = int(time_until.total_seconds() / 60)
        else:
            data['minutes_until_start'] = None
        
        # URL'yi sadece katılabileceklere göster
        if not include_url:
            data.pop('meeting_url', None)
            data.pop('meeting_password', None)
            data.pop('access_token', None)
        
        return data


class AttendanceStatus(enum.Enum):
    """Katılım durumu."""
    REGISTERED = 'registered'  # Kayıt oldu
    JOINED = 'joined'  # Katıldı
    LEFT = 'left'  # Ayrıldı
    ABSENT = 'absent'  # Katılmadı


class SessionAttendance(BaseModel):
    """
    Oturum katılım modeli.
    
    Canlı derse katılım takibi.
    """
    
    __tablename__ = 'session_attendances'
    
    # İlişkiler
    session_id = Column(Integer, ForeignKey('live_sessions.id'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    session = relationship('LiveSession', back_populates='attendances')
    user = relationship('User', backref='session_attendances', foreign_keys=[user_id])
    
    # Durum
    status = Column(
        Enum(AttendanceStatus),
        default=AttendanceStatus.REGISTERED,
        nullable=False,
        index=True
    )
    
    # Zamanlama
    registered_at = Column(DateTime, default=datetime.utcnow)
    joined_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)
    
    # İstatistikler
    duration_minutes = Column(Integer, default=0)  # Katılım süresi
    join_count = Column(Integer, default=0)  # Kaç kez giriş yaptı
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('session_id', 'user_id', name='unique_session_user'),
        {'extend_existing': True}
    )
    
    def __repr__(self):
        return f'<SessionAttendance session={self.session_id} user={self.user_id}>'
    
    @property
    def attendance_percentage(self) -> float:
        """Katılım yüzdesi."""
        if not self.session or not self.session.duration_minutes:
            return 0.0
        return min(100.0, (self.duration_minutes / self.session.duration_minutes) * 100)
    
    def join(self):
        """Oturuma katıl."""
        now = datetime.utcnow()
        
        if self.status in [AttendanceStatus.REGISTERED, AttendanceStatus.LEFT]:
            self.joined_at = now
            self.join_count += 1
        
        self.status = AttendanceStatus.JOINED
    
    def leave(self):
        """Oturumdan ayrıl."""
        now = datetime.utcnow()
        
        if self.joined_at:
            # Süreyi hesapla
            delta = now - self.joined_at
            self.duration_minutes += int(delta.total_seconds() / 60)
        
        self.left_at = now
        self.status = AttendanceStatus.LEFT
    
    def to_dict(self, exclude: List[str] = None) -> dict:
        data = super().to_dict(exclude=exclude)
        data['status'] = self.status.value if self.status else None
        data['attendance_percentage'] = self.attendance_percentage
        data['user_name'] = self.user.full_name if self.user else None
        return data
