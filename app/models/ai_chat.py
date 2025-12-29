"""
AI Chat Models

AI sohbet oturumları ve mesajları için veritabanı modelleri.
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any
import hashlib
import json

from app.extensions import db


class ChatSessionStatus(Enum):
    """Sohbet oturumu durumları."""
    ACTIVE = 'active'
    COMPLETED = 'completed'
    EXPIRED = 'expired'
    ANONYMIZED = 'anonymized'
    DELETED = 'deleted'


class MessageRole(Enum):
    """Mesaj rolleri."""
    USER = 'user'
    ASSISTANT = 'assistant'
    SYSTEM = 'system'


class AIChatSession(db.Model):
    """AI sohbet oturumu modeli."""
    
    __tablename__ = 'ai_chat_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    
    # Kullanıcı ilişkisi
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Oturum bilgileri
    title = db.Column(db.String(200))
    context_type = db.Column(db.String(50))  # course, exam, general, etc.
    context_id = db.Column(db.Integer)  # İlgili kurs/sınav ID
    
    # Durum
    status = db.Column(db.String(20), default=ChatSessionStatus.ACTIVE.value)
    
    # AI model bilgisi
    model_name = db.Column(db.String(50))
    model_version = db.Column(db.String(20))
    
    # İstatistikler
    message_count = db.Column(db.Integer, default=0)
    total_tokens_used = db.Column(db.Integer, default=0)
    
    # Anonimleştirme
    is_anonymized = db.Column(db.Boolean, default=False)
    anonymized_at = db.Column(db.DateTime)
    is_deleted = db.Column(db.Boolean, default=False)
    
    # Zaman damgaları
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_activity_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    
    # İlişkiler
    user = db.relationship('User', backref=db.backref('ai_chat_sessions', lazy='dynamic'))
    messages = db.relationship('AIChatMessage', backref='session', lazy='dynamic', cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.session_id:
            self.session_id = self._generate_session_id()
        if not self.expires_at:
            # Varsayılan: 30 gün sonra sona erer
            self.expires_at = datetime.utcnow() + timedelta(days=30)
    
    def _generate_session_id(self) -> str:
        """Benzersiz oturum ID'si oluştur."""
        data = f"{datetime.utcnow().isoformat()}{self.user_id or 'anon'}"
        return hashlib.sha256(data.encode()).hexdigest()[:64]
    
    def add_message(self, role: str, content: str, tokens: int = 0, extra_data: Dict = None) -> 'AIChatMessage':
        """Oturuma mesaj ekle."""
        message = AIChatMessage(
            session_id=self.id,
            role=role,
            content=content,
            tokens_used=tokens,
            extra_data=json.dumps(extra_data) if extra_data else None
        )
        db.session.add(message)
        
        self.message_count += 1
        self.total_tokens_used += tokens
        self.last_activity_at = datetime.utcnow()
        
        db.session.commit()
        return message
    
    def complete(self):
        """Oturumu tamamla."""
        self.status = ChatSessionStatus.COMPLETED.value
        db.session.commit()
    
    def anonymize(self):
        """Oturumu anonimleştir."""
        self.user_id = None
        self.is_anonymized = True
        self.anonymized_at = datetime.utcnow()
        self.status = ChatSessionStatus.ANONYMIZED.value
        
        # Mesajları anonimleştir
        for message in self.messages:
            message.anonymize()
        
        db.session.commit()
    
    def to_dict(self, include_messages: bool = False) -> Dict[str, Any]:
        """Dictionary'e dönüştür."""
        data = {
            'id': self.id,
            'session_id': self.session_id,
            'title': self.title,
            'context_type': self.context_type,
            'context_id': self.context_id,
            'status': self.status,
            'model_name': self.model_name,
            'message_count': self.message_count,
            'total_tokens_used': self.total_tokens_used,
            'is_anonymized': self.is_anonymized,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_activity_at': self.last_activity_at.isoformat() if self.last_activity_at else None,
        }
        
        if include_messages:
            data['messages'] = [m.to_dict() for m in self.messages.order_by(AIChatMessage.created_at)]
        
        return data


class AIChatMessage(db.Model):
    """AI sohbet mesajı modeli."""
    
    __tablename__ = 'ai_chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('ai_chat_sessions.id'), nullable=False)
    
    # Mesaj içeriği
    role = db.Column(db.String(20), nullable=False)  # user, assistant, system
    content = db.Column(db.Text, nullable=False)
    
    # Token kullanımı
    tokens_used = db.Column(db.Integer, default=0)
    
    # Ek bilgiler
    extra_data = db.Column(db.Text)  # JSON formatında ek bilgiler
    
    # Feedback
    feedback_rating = db.Column(db.Integer)  # 1-5
    feedback_text = db.Column(db.Text)
    
    # Anonimleştirme
    is_anonymized = db.Column(db.Boolean, default=False)
    original_content_hash = db.Column(db.String(64))  # Anonimleştirme öncesi hash
    
    # Zaman damgası
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def anonymize(self):
        """Mesajı anonimleştir."""
        if not self.is_anonymized:
            # Orijinal içeriğin hash'ini sakla
            self.original_content_hash = hashlib.sha256(self.content.encode()).hexdigest()
            
            # Kullanıcı mesajlarındaki kişisel bilgileri temizle
            if self.role == MessageRole.USER.value:
                self.content = "[Anonimleştirilmiş kullanıcı mesajı]"
            
            self.is_anonymized = True
    
    def set_feedback(self, rating: int, text: str = None):
        """Feedback ekle."""
        self.feedback_rating = min(5, max(1, rating))
        self.feedback_text = text
        db.session.commit()
    
    def to_dict(self) -> Dict[str, Any]:
        """Dictionary'e dönüştür."""
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'tokens_used': self.tokens_used,
            'feedback_rating': self.feedback_rating,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AIDataRetentionLog(db.Model):
    """AI veri saklama log modeli."""
    
    __tablename__ = 'ai_data_retention_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # İşlem bilgileri
    action = db.Column(db.String(50), nullable=False)  # anonymize, delete, archive
    target_type = db.Column(db.String(50), nullable=False)  # session, message
    target_count = db.Column(db.Integer, default=0)
    
    # Detaylar
    details = db.Column(db.Text)  # JSON formatında detaylar
    
    # İşlemi yapan
    performed_by = db.Column(db.String(50))  # system, admin_id, etc.
    
    # Zaman
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @classmethod
    def log_anonymization(cls, table: str, count: int, legal_basis: str = None):
        """Anonimleştirme logla."""
        log = cls(
            action='anonymize',
            target_type=table,
            target_count=count,
            details=json.dumps({'legal_basis': legal_basis}) if legal_basis else None,
            performed_by='system'
        )
        db.session.add(log)
        db.session.commit()
        return log
    
    @classmethod
    def log_deletion(cls, table: str, count: int, reason: str = None):
        """Silme işlemini logla."""
        log = cls(
            action='delete',
            target_type=table,
            target_count=count,
            details=json.dumps({'reason': reason}) if reason else None,
            performed_by='system'
        )
        db.session.add(log)
        db.session.commit()
        return log
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'action': self.action,
            'target_type': self.target_type,
            'target_count': self.target_count,
            'details': json.loads(self.details) if self.details else None,
            'performed_by': self.performed_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# Utility Functions
# =============================================================================

def anonymize_old_sessions(retention_days: int = 90) -> int:
    """
    Belirli günden eski oturumları anonimleştir.
    
    Args:
        retention_days: Kaç günden eski oturumlar anonimleştirilecek
        
    Returns:
        Anonimleştirilen oturum sayısı
    """
    cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
    
    sessions = AIChatSession.query.filter(
        AIChatSession.last_activity_at < cutoff_date,
        AIChatSession.is_anonymized == False,
        AIChatSession.status != ChatSessionStatus.DELETED.value
    ).all()
    
    count = 0
    for session in sessions:
        session.anonymize()
        count += 1
    
    if count > 0:
        # Log kaydet
        log = AIDataRetentionLog(
            action='anonymize',
            target_type='session',
            target_count=count,
            details=json.dumps({'cutoff_days': retention_days, 'cutoff_date': cutoff_date.isoformat()}),
            performed_by='system'
        )
        db.session.add(log)
        db.session.commit()
    
    return count


def delete_anonymized_sessions(days_after_anonymization: int = 180) -> int:
    """
    Anonimleştirmeden belirli gün sonra oturumları sil.
    
    Args:
        days_after_anonymization: Anonimleştirmeden kaç gün sonra silinecek
        
    Returns:
        Silinen oturum sayısı
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days_after_anonymization)
    
    sessions = AIChatSession.query.filter(
        AIChatSession.anonymized_at < cutoff_date,
        AIChatSession.is_anonymized == True,
        AIChatSession.status != ChatSessionStatus.DELETED.value
    ).all()
    
    count = len(sessions)
    
    for session in sessions:
        session.status = ChatSessionStatus.DELETED.value
        # Mesajları sil
        AIChatMessage.query.filter_by(session_id=session.id).delete()
    
    if count > 0:
        log = AIDataRetentionLog(
            action='delete',
            target_type='session',
            target_count=count,
            details=json.dumps({'cutoff_days': days_after_anonymization}),
            performed_by='system'
        )
        db.session.add(log)
        db.session.commit()
    
    return count


def get_user_chat_history(user_id: int, limit: int = 20) -> List[AIChatSession]:
    """
    Kullanıcının sohbet geçmişini getir.
    
    Args:
        user_id: Kullanıcı ID
        limit: Maksimum oturum sayısı
        
    Returns:
        Oturum listesi
    """
    return AIChatSession.query.filter(
        AIChatSession.user_id == user_id,
        AIChatSession.status != ChatSessionStatus.DELETED.value
    ).order_by(
        AIChatSession.last_activity_at.desc()
    ).limit(limit).all()


def create_chat_session(
    user_id: int,
    context_type: str = 'general',
    context_id: int = None,
    model_name: str = None
) -> AIChatSession:
    """
    Yeni sohbet oturumu oluştur.
    
    Args:
        user_id: Kullanıcı ID
        context_type: Bağlam tipi (course, exam, general)
        context_id: Bağlam ID
        model_name: AI model adı
        
    Returns:
        Yeni oturum
    """
    session = AIChatSession(
        user_id=user_id,
        context_type=context_type,
        context_id=context_id,
        model_name=model_name or 'gpt-4'
    )
    db.session.add(session)
    db.session.commit()
    return session
