"""
Contents Module - AI Öneri Modeli.

AI tarafından üretilen içerik önerileri için veritabanı modeli.
Admin onayı olmadan kalıcı içerik oluşturulmaz.

WORKFLOW:
=========
1. Öğretmen AI'dan öneri ister
2. AI öneri üretir, 'PENDING' durumunda kaydedilir
3. Admin öneriyi inceler
4. Admin onaylarsa -> İçeriğe uygulanır
5. Admin reddederse -> Öneri arşivlenir
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import enum

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum, Index, JSON
from sqlalchemy.orm import relationship

from app.extensions import db
from app.common.base_model import BaseModel
from app.modules.contents.models import ContentCategory


class SuggestionStatus(enum.Enum):
    """AI öneri durumu."""
    PENDING = 'pending'           # Onay bekliyor
    APPROVED = 'approved'         # Onaylandı
    REJECTED = 'rejected'         # Reddedildi
    APPLIED = 'applied'           # İçeriğe uygulandı
    EXPIRED = 'expired'           # Süresi doldu (30 gün)


class SuggestionType(enum.Enum):
    """AI öneri tipi."""
    EXAMPLES = 'examples'         # Ek örnekler
    QUIZ = 'quiz'                 # Quiz soruları
    SUMMARY = 'summary'           # Özet
    SIMPLIFIED = 'simplified'     # Sadeleştirilmiş versiyon
    ENHANCEMENT = 'enhancement'   # Genel iyileştirme


class ContentAISuggestion(BaseModel):
    """
    AI içerik önerisi modeli.
    
    AI'nın ürettiği öneriler burada saklanır.
    Admin onayı olmadan içeriğe UYGULANMAZ.
    
    Indexes:
        - content_category, content_id: İçerik bazlı sorgulama
        - status: Bekleyen önerileri listeleme
        - suggested_by_id: Kullanıcı bazlı sorgulama
    """
    
    __tablename__ = 'content_ai_suggestions'
    
    # İçerik referansı
    content_category = Column(Enum(ContentCategory), nullable=False, index=True)
    content_id = Column(Integer, nullable=False, index=True)
    
    # Öneri bilgileri
    suggestion_type = Column(Enum(SuggestionType), nullable=False)
    suggested_content = Column(Text, nullable=False)  # AI'nın ürettiği içerik
    
    # Durum
    status = Column(Enum(SuggestionStatus), default=SuggestionStatus.PENDING, nullable=False, index=True)
    
    # Öneriyi isteyen
    suggested_by_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    suggested_by = relationship('User', foreign_keys=[suggested_by_id], backref='ai_suggestions')
    
    # Onaylayan/Reddeden
    reviewed_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    reviewed_by = relationship('User', foreign_keys=[reviewed_by_id])
    reviewed_at = Column(DateTime, nullable=True)
    
    # İnceleme notları
    review_notes = Column(Text, nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    
    # Uygulama bilgileri
    applied_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    applied_by = relationship('User', foreign_keys=[applied_by_id])
    applied_at = Column(DateTime, nullable=True)
    
    # AI bilgileri
    ai_model_used = Column(String(50), nullable=True)
    ai_tokens_used = Column(Integer, default=0)
    ai_prompt_used = Column(Text, nullable=True)  # Debug için
    
    # Versiyon referansı (uygulandıysa)
    applied_version_id = Column(Integer, nullable=True)
    
    # Son geçerlilik tarihi
    expires_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index('ix_ai_suggestions_content', 'content_category', 'content_id'),
        Index('ix_ai_suggestions_status_date', 'status', 'created_at'),
    )
    
    def __repr__(self):
        return f'<ContentAISuggestion {self.suggestion_type.value} for {self.content_category.value}:{self.content_id}>'
    
    def approve(self, reviewer_id: int, notes: str = None):
        """
        Öneriyi onayla.
        
        NOT: Bu method sadece durumu değiştirir.
        İçeriğe uygulama ayrı bir işlemdir.
        """
        if self.status != SuggestionStatus.PENDING:
            raise ValueError('Sadece bekleyen öneriler onaylanabilir')
        
        self.status = SuggestionStatus.APPROVED
        self.reviewed_by_id = reviewer_id
        self.reviewed_at = datetime.utcnow()
        self.review_notes = notes
    
    def reject(self, reviewer_id: int, reason: str = None, notes: str = None):
        """Öneriyi reddet."""
        if self.status != SuggestionStatus.PENDING:
            raise ValueError('Sadece bekleyen öneriler reddedilebilir')
        
        self.status = SuggestionStatus.REJECTED
        self.reviewed_by_id = reviewer_id
        self.reviewed_at = datetime.utcnow()
        self.rejection_reason = reason
        self.review_notes = notes
    
    def mark_applied(self, applied_by_id: int, version_id: int = None):
        """Öneriyi içeriğe uygulandı olarak işaretle."""
        if self.status != SuggestionStatus.APPROVED:
            raise ValueError('Sadece onaylanmış öneriler uygulanabilir')
        
        self.status = SuggestionStatus.APPLIED
        self.applied_by_id = applied_by_id
        self.applied_at = datetime.utcnow()
        self.applied_version_id = version_id
    
    def to_dict(self, include_content: bool = True) -> Dict[str, Any]:
        """Dictionary'e dönüştür."""
        data = {
            'id': self.id,
            'content_category': self.content_category.value if self.content_category else None,
            'content_id': self.content_id,
            'suggestion_type': self.suggestion_type.value if self.suggestion_type else None,
            'status': self.status.value if self.status else None,
            'suggested_by_id': self.suggested_by_id,
            'suggested_by_name': self.suggested_by.full_name if self.suggested_by else None,
            'reviewed_by_name': self.reviewed_by.full_name if self.reviewed_by else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'review_notes': self.review_notes,
            'rejection_reason': self.rejection_reason,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'ai_model_used': self.ai_model_used,
            'ai_tokens_used': self.ai_tokens_used,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }
        
        if include_content:
            data['suggested_content'] = self.suggested_content
        
        return data


class ContentAIInteraction(BaseModel):
    """
    Öğrenci-AI etkileşim logu.
    
    Öğrencilerin içerik hakkında AI'ya sordukları sorular.
    Bu veriler:
    - Kalıcı DEĞİLDİR (90 gün sonra silinir)
    - İçeriği değiştirmez
    - Sadece analiz ve iyileştirme için kullanılır
    """
    
    __tablename__ = 'content_ai_interactions'
    
    # Kullanıcı
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    user = relationship('User', backref=db.backref('ai_content_interactions', lazy='dynamic'))
    
    # İçerik referansı
    content_category = Column(Enum(ContentCategory), nullable=False)
    content_id = Column(Integer, nullable=False, index=True)
    
    # Etkileşim tipi
    interaction_type = Column(String(50), nullable=False)  # explain, simplify, question, etc.
    
    # Kullanıcı girdisi (soru vb.)
    user_input = Column(Text, nullable=True)
    
    # AI yanıtı (özet - tam yanıt saklanmaz)
    response_summary = Column(String(500), nullable=True)
    
    # Metrikler
    response_time_ms = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    
    # Feedback
    was_helpful = Column(Boolean, nullable=True)
    feedback_rating = Column(Integer, nullable=True)  # 1-5
    
    # KVKK - Otomatik silme
    expires_at = Column(DateTime, nullable=True)  # 90 gün sonra
    
    __table_args__ = (
        Index('ix_ai_interactions_content', 'content_category', 'content_id'),
        Index('ix_ai_interactions_user_date', 'user_id', 'created_at'),
        Index('ix_ai_interactions_expires', 'expires_at'),
    )
    
    def __repr__(self):
        return f'<ContentAIInteraction {self.interaction_type} by user:{self.user_id}>'
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'content_category': self.content_category.value if self.content_category else None,
            'content_id': self.content_id,
            'interaction_type': self.interaction_type,
            'was_helpful': self.was_helpful,
            'feedback_rating': self.feedback_rating,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
