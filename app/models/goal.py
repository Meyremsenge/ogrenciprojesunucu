"""
Goal Model - Öğrenci Hedefleri

Öğrencilere atanan hedefler (quiz, ders tamamlama, video izleme vs.)
Quiz oluşturulduğunda otomatik olarak ilgili öğrencilere hedef olarak atanır.
"""

import enum
from datetime import datetime
from app.extensions import db
from app.common.base_model import TimestampMixin


class GoalType(enum.Enum):
    """Hedef türleri"""
    QUIZ = 'quiz'           # Quiz tamamlama hedefi
    COURSE = 'course'       # Kurs tamamlama hedefi
    VIDEO = 'video'         # Video izleme hedefi
    LESSON = 'lesson'       # Ders tamamlama hedefi
    CUSTOM = 'custom'       # Özel hedef


class GoalStatus(enum.Enum):
    """Hedef durumları"""
    PENDING = 'pending'         # Henüz başlanmamış
    IN_PROGRESS = 'in_progress' # Devam ediyor
    COMPLETED = 'completed'     # Tamamlandı
    EXPIRED = 'expired'         # Süresi dolmuş
    CANCELLED = 'cancelled'     # İptal edilmiş


class Goal(db.Model, TimestampMixin):
    """
    Öğrenci Hedefi modeli.
    
    Her öğrenci için bireysel hedefler oluşturulur.
    Quiz eklendiğinde ilgili sınıf seviyesindeki tüm öğrencilere hedef atanır.
    """
    __tablename__ = 'goals'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Hedef bilgileri
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    goal_type = db.Column(db.Enum(GoalType), nullable=False, default=GoalType.CUSTOM)
    status = db.Column(db.Enum(GoalStatus), nullable=False, default=GoalStatus.PENDING)
    
    # İlişkilendirme - hangi içerikle ilgili
    target_id = db.Column(db.Integer, index=True)  # exam_id, course_id, video_id vb.
    target_type = db.Column(db.String(50))  # 'exam', 'course', 'video' vb.
    
    # Öğrenci ve organizasyon
    student_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id', ondelete='SET NULL'), index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    
    # Zaman bilgileri
    due_date = db.Column(db.DateTime)  # Son tarih
    completed_at = db.Column(db.DateTime)  # Tamamlanma tarihi
    
    # Hedef metrikleri
    target_score = db.Column(db.Integer, default=60)  # Hedef başarı puanı (%)
    achieved_score = db.Column(db.Integer)  # Elde edilen puan
    progress = db.Column(db.Integer, default=0)  # İlerleme yüzdesi (0-100)
    
    # Sınıf/kademe bilgisi (hangi sınıf için)
    grade_level = db.Column(db.String(20), index=True)  # '1', '2', ... '12', 'mezun', 'tyt', 'ayt'
    
    # İlişkiler
    student = db.relationship('User', foreign_keys=[student_id], backref='goals')
    organization = db.relationship('Organization', backref='goals')
    creator = db.relationship('User', foreign_keys=[created_by])
    
    def __repr__(self):
        return f'<Goal {self.id}: {self.title} - {self.status.value}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'goal_type': self.goal_type.value if self.goal_type else None,
            'status': self.status.value if self.status else None,
            'target_id': self.target_id,
            'target_type': self.target_type,
            'student_id': self.student_id,
            'organization_id': self.organization_id,
            'created_by': self.created_by,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'target_score': self.target_score,
            'achieved_score': self.achieved_score,
            'progress': self.progress,
            'grade_level': self.grade_level,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def mark_completed(self, score: int = None):
        """Hedefi tamamlandı olarak işaretle"""
        self.status = GoalStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.progress = 100
        if score is not None:
            self.achieved_score = score
    
    def mark_in_progress(self, progress: int = 0):
        """Hedefi devam ediyor olarak işaretle"""
        self.status = GoalStatus.IN_PROGRESS
        self.progress = progress
    
    def check_expired(self):
        """Süre kontrolü yap"""
        if self.due_date and datetime.utcnow() > self.due_date and self.status not in [GoalStatus.COMPLETED, GoalStatus.CANCELLED]:
            self.status = GoalStatus.EXPIRED
            return True
        return False


class GoalAssignment(db.Model, TimestampMixin):
    """
    Toplu hedef ataması kaydı.
    
    Bir quiz veya kurs eklendiğinde hangi kriterlere göre hedef atandığını tutar.
    """
    __tablename__ = 'goal_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Kaynak içerik
    source_type = db.Column(db.String(50), nullable=False)  # 'exam', 'course', 'video'
    source_id = db.Column(db.Integer, nullable=False, index=True)
    
    # Atama kriterleri
    grade_level = db.Column(db.String(20))  # Hangi sınıf seviyesi
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id', ondelete='SET NULL'))
    
    # Atama bilgileri
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    assigned_count = db.Column(db.Integer, default=0)  # Kaç öğrenciye atandı
    
    # İlişkiler
    organization = db.relationship('Organization')
    assigner = db.relationship('User', foreign_keys=[assigned_by])
    
    def __repr__(self):
        return f'<GoalAssignment {self.id}: {self.source_type}#{self.source_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'source_type': self.source_type,
            'source_id': self.source_id,
            'grade_level': self.grade_level,
            'organization_id': self.organization_id,
            'assigned_by': self.assigned_by,
            'assigned_count': self.assigned_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
