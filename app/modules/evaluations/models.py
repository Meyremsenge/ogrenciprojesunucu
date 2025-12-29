"""
Evaluations Module - Models.

Ödev, değerlendirme ve koçluk modelleri.
"""

from datetime import datetime
from typing import List
import enum

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, Enum, JSON
from sqlalchemy.orm import relationship

from app.extensions import db
from app.common.base_model import BaseModel, SoftDeleteMixin


class AssignmentStatus(enum.Enum):
    """Ödev durumu."""
    DRAFT = 'draft'
    PUBLISHED = 'published'
    CLOSED = 'closed'


class Assignment(BaseModel, SoftDeleteMixin):
    """
    Ödev modeli.
    
    Kurslar için ödevler.
    """
    
    __tablename__ = 'assignments'
    __table_args__ = {'extend_existing': True}
    
    # Temel bilgiler
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    
    # İlişkiler
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    course = relationship('Course', backref='assignments')
    topic = relationship('Topic', backref='assignments')
    creator = relationship('User', backref='created_assignments', foreign_keys=[created_by])
    
    # Durum
    status = Column(
        Enum(AssignmentStatus),
        default=AssignmentStatus.DRAFT,
        nullable=False,
        index=True
    )
    
    # Zamanlama
    due_date = Column(DateTime, nullable=True, index=True)
    available_from = Column(DateTime, nullable=True)
    
    # Puanlama
    max_score = Column(Float, default=100.0)
    pass_score = Column(Float, default=50.0)
    
    # Ayarlar
    allow_late_submission = Column(Boolean, default=False)
    late_penalty_percent = Column(Float, default=10.0)  # Geç gönderimde %
    max_file_size_mb = Column(Integer, default=10)
    allowed_file_types = Column(String(255), default='pdf,doc,docx')
    
    # İstatistikler
    submission_count = Column(Integer, default=0)
    average_score = Column(Float, default=0.0)
    
    # İlişkiler
    submissions = relationship('AssignmentSubmission', back_populates='assignment')
    
    def __repr__(self):
        return f'<Assignment {self.title[:30]}>'
    
    @property
    def is_overdue(self) -> bool:
        """Süre dolmuş mu?"""
        if not self.due_date:
            return False
        return datetime.utcnow() > self.due_date
    
    @property
    def is_available(self) -> bool:
        """Ödev erişilebilir mi?"""
        if self.status != AssignmentStatus.PUBLISHED:
            return False
        
        now = datetime.utcnow()
        if self.available_from and now < self.available_from:
            return False
        
        return True
    
    def to_dict(self, exclude: List[str] = None) -> dict:
        data = super().to_dict(exclude=exclude)
        data['status'] = self.status.value if self.status else None
        data['is_overdue'] = self.is_overdue
        data['is_available'] = self.is_available
        return data


class SubmissionStatus(enum.Enum):
    """Gönderim durumu."""
    SUBMITTED = 'submitted'
    GRADING = 'grading'
    GRADED = 'graded'
    RETURNED = 'returned'  # Revizyon için geri gönderildi


class AssignmentSubmission(BaseModel):
    """
    Ödev gönderimi modeli.
    """
    
    __tablename__ = 'assignment_submissions'
    
    # İlişkiler
    assignment_id = Column(Integer, ForeignKey('assignments.id'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    assignment = relationship('Assignment', back_populates='submissions')
    user = relationship('User', backref='assignment_submissions', foreign_keys=[user_id])
    
    # Gönderim
    submission_text = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    
    # Durum
    status = Column(
        Enum(SubmissionStatus),
        default=SubmissionStatus.SUBMITTED,
        nullable=False,
        index=True
    )
    is_late = Column(Boolean, default=False)
    
    # Zamanlama
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Değerlendirme
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_at = Column(DateTime, nullable=True)
    graded_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    grader = relationship('User', foreign_keys=[graded_by])
    
    # Revizyon
    revision_count = Column(Integer, default=0)
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('assignment_id', 'user_id', name='unique_assignment_user'),
        {'extend_existing': True}
    )
    
    def __repr__(self):
        return f'<AssignmentSubmission assignment={self.assignment_id} user={self.user_id}>'
    
    @property
    def final_score(self) -> float:
        """Geç ceza uygulanmış son puan."""
        if not self.score:
            return 0.0
        
        if self.is_late and self.assignment:
            penalty = self.assignment.late_penalty_percent / 100
            return self.score * (1 - penalty)
        
        return self.score
    
    def to_dict(self, exclude: List[str] = None) -> dict:
        data = super().to_dict(exclude=exclude)
        data['status'] = self.status.value if self.status else None
        data['final_score'] = self.final_score
        return data


class CoachingNote(BaseModel, SoftDeleteMixin):
    """
    Koçluk notu modeli.
    
    Öğretmenin öğrenci için tuttuğu notlar.
    """
    
    __tablename__ = 'coaching_notes'
    __table_args__ = {'extend_existing': True}
    
    # İlişkiler
    student_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    coach_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=True, index=True)
    
    student = relationship('User', foreign_keys=[student_id], backref='received_coaching_notes')
    coach = relationship('User', foreign_keys=[coach_id], backref='given_coaching_notes')
    course = relationship('Course', backref='coaching_notes')
    
    # Not içeriği
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    note_type = Column(String(50), default='general')  # general, warning, praise, goal
    
    # Görünürlük
    is_visible_to_student = Column(Boolean, default=False)
    
    # Takip
    follow_up_date = Column(DateTime, nullable=True)
    is_follow_up_completed = Column(Boolean, default=False)
    
    def __repr__(self):
        return f'<CoachingNote student={self.student_id} coach={self.coach_id}>'


class PerformanceReview(BaseModel):
    """
    Performans değerlendirme modeli.
    
    Dönemsel öğrenci performans özeti.
    """
    
    __tablename__ = 'performance_reviews'
    __table_args__ = {'extend_existing': True}
    
    # İlişkiler
    student_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=True, index=True)
    
    student = relationship('User', foreign_keys=[student_id], backref='performance_reviews')
    reviewer = relationship('User', foreign_keys=[reviewer_id], backref='given_reviews')
    course = relationship('Course', backref='performance_reviews')
    
    # Dönem
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Metrikler
    overall_score = Column(Float, nullable=True)  # 0-100
    attendance_rate = Column(Float, nullable=True)  # %
    assignment_completion_rate = Column(Float, nullable=True)  # %
    exam_average = Column(Float, nullable=True)
    
    # Değerlendirme alanları (1-5 skalası)
    engagement_score = Column(Integer, nullable=True)
    participation_score = Column(Integer, nullable=True)
    improvement_score = Column(Integer, nullable=True)
    
    # Yorum
    strengths = Column(Text, nullable=True)
    areas_for_improvement = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    
    # Öğrenci görünürlüğü
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f'<PerformanceReview student={self.student_id}>'
    
    def publish(self):
        """Değerlendirmeyi yayınla."""
        self.is_published = True
        self.published_at = datetime.utcnow()
