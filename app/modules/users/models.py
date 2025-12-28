"""
Users Module - Models.

Kullanıcı, rol ve yetki modelleri.
Ana modelleri re-export eder ve ek modeller tanımlar.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.extensions import db
from app.common.base_model import BaseModel

# Ana modelleri import et ve re-export et (çift tanımlama önleme)
from app.models.user import User, Role, Permission, RolePermission


class TokenBlacklist(db.Model):
    """
    Blacklist'e alınmış JWT token'ları.
    
    Logout işlemlerinde kullanılır.
    """
    
    __tablename__ = 'token_blacklist'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    jti = Column(String(36), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f'<TokenBlacklist {self.jti[:8]}...>'


class Notification(BaseModel):
    """
    Bildirim modeli.
    
    Uygulama içi bildirimler.
    """
    
    __tablename__ = 'notifications'
    __table_args__ = {'extend_existing': True}
    
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    user = relationship('User', backref='notifications')
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default='info')
    action_url = Column(String(500), nullable=True)
    data = Column(Text, nullable=True)  # JSON string
    
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f'<Notification {self.id} user={self.user_id}>'
    
    def to_dict(self, exclude: List[str] = None) -> dict:
        """Bildirimi dictionary'e çevirir."""
        import json
        
        data = super().to_dict(exclude=exclude)
        
        if self.data:
            try:
                data['data'] = json.loads(self.data)
            except:
                data['data'] = {}
        
        return data
