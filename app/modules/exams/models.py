"""
Exams Module - Models.

Sınav, soru ve cevap modelleri.
"""

from datetime import datetime
from typing import List, Optional
import enum
import json

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, Enum, JSON
from sqlalchemy.orm import relationship

from app.extensions import db
from app.common.base_model import BaseModel, SoftDeleteMixin


class ExamType(enum.Enum):
    """Sınav tipi."""
    QUIZ = 'quiz'  # Kısa sınav
    MIDTERM = 'midterm'  # Ara sınav
    FINAL = 'final'  # Final
    PRACTICE = 'practice'  # Alıştırma
    HOMEWORK = 'homework'  # Ödev


class ExamStatus(enum.Enum):
    """Sınav durumu."""
    DRAFT = 'draft'
    PUBLISHED = 'published'
    CLOSED = 'closed'
    ARCHIVED = 'archived'


class Exam(BaseModel, SoftDeleteMixin):
    """
    Sınav modeli.
    
    Kurslar için sınavlar.
    """
    
    __tablename__ = 'exams'
    __table_args__ = {'extend_existing': True}
    
    # Temel bilgiler
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)  # Sınav talimatları
    
    # Tip ve durum
    exam_type = Column(
        Enum(ExamType),
        default=ExamType.QUIZ,
        nullable=False
    )
    status = Column(
        Enum(ExamStatus),
        default=ExamStatus.DRAFT,
        nullable=False,
        index=True
    )
    
    # İlişkiler
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    course = relationship('Course', backref='exams')
    topic = relationship('Topic', backref='exams')
    creator = relationship('User', backref='created_exams', foreign_keys=[created_by])
    
    # Sınav ayarları
    duration_minutes = Column(Integer, default=60)  # Süre (dakika)
    pass_score = Column(Float, default=50.0)  # Geçme notu (%)
    max_attempts = Column(Integer, default=1)  # Maksimum deneme
    shuffle_questions = Column(Boolean, default=True)
    shuffle_answers = Column(Boolean, default=True)
    show_answers_after = Column(Boolean, default=True)  # Bitince cevapları göster
    
    # Zamanlama
    available_from = Column(DateTime, nullable=True)
    available_until = Column(DateTime, nullable=True)
    
    # İstatistikler
    total_questions = Column(Integer, default=0)
    total_points = Column(Float, default=0.0)
    average_score = Column(Float, default=0.0)
    attempt_count = Column(Integer, default=0)
    
    # İlişkiler
    questions = relationship('Question', back_populates='exam', order_by='Question.order')
    attempts = relationship('ExamAttempt', back_populates='exam')
    
    def __repr__(self):
        return f'<Exam {self.title[:30]}>'
    
    @property
    def is_available(self) -> bool:
        """Sınav şu an erişilebilir mi?"""
        now = datetime.utcnow()
        
        if self.status != ExamStatus.PUBLISHED:
            return False
        
        if self.available_from and now < self.available_from:
            return False
        
        if self.available_until and now > self.available_until:
            return False
        
        return True
    
    def to_dict(self, exclude: List[str] = None) -> dict:
        data = super().to_dict(exclude=exclude)
        data['exam_type'] = self.exam_type.value if self.exam_type else None
        data['status'] = self.status.value if self.status else None
        data['is_available'] = self.is_available
        return data


class QuestionType(enum.Enum):
    """Soru tipi."""
    SINGLE_CHOICE = 'single_choice'  # Tek seçim
    MULTIPLE_CHOICE = 'multiple_choice'  # Çoklu seçim
    TRUE_FALSE = 'true_false'  # Doğru/Yanlış
    SHORT_ANSWER = 'short_answer'  # Kısa cevap
    ESSAY = 'essay'  # Uzun cevap
    FILL_BLANK = 'fill_blank'  # Boşluk doldurma


class Question(BaseModel):
    """
    Soru modeli.
    
    Sınav soruları.
    """
    
    __tablename__ = 'questions'
    __table_args__ = {'extend_existing': True}
    
    # Soru içeriği
    question_text = Column(Text, nullable=False)
    question_type = Column(
        Enum(QuestionType),
        default=QuestionType.SINGLE_CHOICE,
        nullable=False
    )
    
    # Medya
    image_url = Column(String(500), nullable=True)
    explanation = Column(Text, nullable=True)  # Cevap açıklaması
    
    # Puanlama
    points = Column(Float, default=1.0)
    order = Column(Integer, default=0)
    
    # İlişkiler
    exam_id = Column(Integer, ForeignKey('exams.id'), nullable=False, index=True)
    exam = relationship('Exam', back_populates='questions')
    
    # Cevaplar
    answers = relationship('Answer', back_populates='question', cascade='all, delete-orphan')
    
    # QuestionAttempt ilişkisi (app/models/question.py'den)
    attempts = relationship('QuestionAttempt', back_populates='question', lazy='dynamic')
    
    # Doğru cevap (short_answer, fill_blank için)
    correct_answer_text = Column(Text, nullable=True)
    
    def __repr__(self):
        return f'<Question {self.id} - {self.question_text[:30]}>'
    
    def to_dict(self, include_correct: bool = False, exclude: List[str] = None) -> dict:
        data = super().to_dict(exclude=exclude)
        data['question_type'] = self.question_type.value if self.question_type else None
        data['answers'] = [a.to_dict(include_correct=include_correct) for a in self.answers]
        
        if not include_correct:
            data.pop('correct_answer_text', None)
            data.pop('explanation', None)
        
        return data


class Answer(BaseModel):
    """
    Cevap seçeneği modeli.
    
    Çoktan seçmeli sorular için.
    """
    
    __tablename__ = 'answers'
    __table_args__ = {'extend_existing': True}
    
    answer_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    
    # İlişkiler
    question_id = Column(Integer, ForeignKey('questions.id'), nullable=False, index=True)
    question = relationship('Question', back_populates='answers')
    
    def __repr__(self):
        return f'<Answer {self.id}>'
    
    def to_dict(self, include_correct: bool = False, exclude: List[str] = None) -> dict:
        data = super().to_dict(exclude=exclude)
        
        if not include_correct:
            data.pop('is_correct', None)
        
        return data


class AttemptStatus(enum.Enum):
    """Sınav girişi durumu."""
    IN_PROGRESS = 'in_progress'
    SUBMITTED = 'submitted'
    GRADED = 'graded'
    TIMED_OUT = 'timed_out'


class ExamAttempt(BaseModel):
    """
    Sınav girişi modeli.
    
    Öğrencinin sınav denemesi.
    """
    
    __tablename__ = 'exam_attempts'
    __table_args__ = {'extend_existing': True}
    
    # İlişkiler
    exam_id = Column(Integer, ForeignKey('exams.id'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    exam = relationship('Exam', back_populates='attempts')
    user = relationship('User', backref='exam_attempts', foreign_keys=[user_id])
    
    # Durum
    status = Column(
        Enum(AttemptStatus),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
        index=True
    )
    
    # Zaman
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    graded_at = Column(DateTime, nullable=True)
    
    # Puanlama
    score = Column(Float, nullable=True)
    max_score = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    passed = Column(Boolean, nullable=True)
    
    # Cevaplar
    attempt_answers = relationship('AttemptAnswer', back_populates='attempt', cascade='all, delete-orphan')
    
    # Soru sırası (karıştırma için)
    question_order = Column(JSON, nullable=True)
    
    def __repr__(self):
        return f'<ExamAttempt user={self.user_id} exam={self.exam_id}>'
    
    @property
    def is_expired(self) -> bool:
        """Süre dolmuş mu?"""
        if not self.exam or not self.exam.duration_minutes:
            return False
        
        from datetime import timedelta
        deadline = self.started_at + timedelta(minutes=self.exam.duration_minutes)
        return datetime.utcnow() > deadline
    
    @property
    def remaining_minutes(self) -> int:
        """Kalan dakika."""
        if not self.exam or not self.exam.duration_minutes:
            return 0
        
        from datetime import timedelta
        deadline = self.started_at + timedelta(minutes=self.exam.duration_minutes)
        remaining = deadline - datetime.utcnow()
        return max(0, int(remaining.total_seconds() / 60))
    
    def to_dict(self, exclude: List[str] = None) -> dict:
        data = super().to_dict(exclude=exclude)
        data['status'] = self.status.value if self.status else None
        data['is_expired'] = self.is_expired
        data['remaining_minutes'] = self.remaining_minutes
        return data


class AttemptAnswer(BaseModel):
    """
    Sınav cevabı modeli.
    
    Öğrencinin verdiği cevap.
    """
    
    __tablename__ = 'attempt_answers'
    __table_args__ = {'extend_existing': True}
    
    # İlişkiler
    attempt_id = Column(Integer, ForeignKey('exam_attempts.id'), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey('questions.id'), nullable=False, index=True)
    
    attempt = relationship('ExamAttempt', back_populates='attempt_answers')
    question = relationship('Question')
    
    # Cevap
    selected_answer_ids = Column(JSON, nullable=True)  # Seçilen cevap ID'leri
    answer_text = Column(Text, nullable=True)  # Metin cevap
    
    # Puanlama
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Float, default=0.0)
    
    # Öğretmen değerlendirmesi
    grader_comment = Column(Text, nullable=True)
    graded_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    grader = relationship('User', foreign_keys=[graded_by])
    
    def __repr__(self):
        return f'<AttemptAnswer attempt={self.attempt_id} question={self.question_id}>'
