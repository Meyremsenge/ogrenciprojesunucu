"""
AI Authorization Module

AI özelliklerine erişim kontrolü ve yetkilendirme.
"""

from enum import Enum
from typing import Optional, Dict, Any, List
from functools import wraps
from flask import g, request
from flask_jwt_extended import get_jwt_identity

from app.models.user import User


class AIFeature(Enum):
    """AI özellikleri."""
    CHAT = 'chat'
    COACH = 'coach'
    ASSISTANT = 'assistant'
    CONTENT_GENERATION = 'content_generation'
    QUESTION_GENERATION = 'question_generation'
    FEEDBACK = 'feedback'
    ANALYTICS = 'analytics'
    SUMMARY = 'summary'


class AIAccessLevel(Enum):
    """AI erişim seviyeleri."""
    NONE = 0
    BASIC = 1
    STANDARD = 2
    PREMIUM = 3
    UNLIMITED = 4


# Rol bazlı varsayılan erişim seviyeleri
ROLE_ACCESS_LEVELS: Dict[str, AIAccessLevel] = {
    'student': AIAccessLevel.BASIC,
    'teacher': AIAccessLevel.STANDARD,
    'admin': AIAccessLevel.PREMIUM,
    'super_admin': AIAccessLevel.UNLIMITED,
}

# Özellik bazlı minimum erişim seviyeleri
FEATURE_MIN_LEVELS: Dict[AIFeature, AIAccessLevel] = {
    AIFeature.CHAT: AIAccessLevel.BASIC,
    AIFeature.COACH: AIAccessLevel.BASIC,
    AIFeature.ASSISTANT: AIAccessLevel.BASIC,
    AIFeature.CONTENT_GENERATION: AIAccessLevel.STANDARD,
    AIFeature.QUESTION_GENERATION: AIAccessLevel.STANDARD,
    AIFeature.FEEDBACK: AIAccessLevel.BASIC,
    AIFeature.ANALYTICS: AIAccessLevel.STANDARD,
    AIFeature.SUMMARY: AIAccessLevel.BASIC,
}


class AIAccessChecker:
    """AI erişim kontrolü sınıfı."""
    
    def __init__(self, user: Optional[User] = None):
        """
        Args:
            user: Kontrol edilecek kullanıcı
        """
        self.user = user
        self._access_level: Optional[AIAccessLevel] = None
    
    @property
    def access_level(self) -> AIAccessLevel:
        """Kullanıcının AI erişim seviyesini döndür."""
        if self._access_level is None:
            self._access_level = self._calculate_access_level()
        return self._access_level
    
    def _calculate_access_level(self) -> AIAccessLevel:
        """Kullanıcının erişim seviyesini hesapla."""
        if not self.user:
            return AIAccessLevel.NONE
        
        # Kullanıcının rolüne göre temel seviye
        role = getattr(self.user, 'role', 'student')
        base_level = ROLE_ACCESS_LEVELS.get(role, AIAccessLevel.BASIC)
        
        # Aktif paket kontrolü (varsa)
        if hasattr(self.user, 'active_packages'):
            packages = self.user.active_packages
            for package in packages:
                if hasattr(package, 'ai_access_level'):
                    pkg_level = AIAccessLevel(package.ai_access_level)
                    if pkg_level.value > base_level.value:
                        base_level = pkg_level
        
        return base_level
    
    def can_access(self, feature: AIFeature) -> bool:
        """
        Kullanıcının belirli bir AI özelliğine erişip erişemeyeceğini kontrol et.
        
        Args:
            feature: Kontrol edilecek AI özelliği
            
        Returns:
            bool: Erişim izni varsa True
        """
        if not self.user:
            return False
        
        # Kullanıcı aktif mi?
        if not getattr(self.user, 'is_active', True):
            return False
        
        # Minimum seviye kontrolü
        min_level = FEATURE_MIN_LEVELS.get(feature, AIAccessLevel.BASIC)
        return self.access_level.value >= min_level.value
    
    def can_use_chat(self) -> bool:
        """Chat özelliğine erişim kontrolü."""
        return self.can_access(AIFeature.CHAT)
    
    def can_use_coach(self) -> bool:
        """AI koç özelliğine erişim kontrolü."""
        return self.can_access(AIFeature.COACH)
    
    def can_generate_content(self) -> bool:
        """İçerik üretme özelliğine erişim kontrolü."""
        return self.can_access(AIFeature.CONTENT_GENERATION)
    
    def can_generate_questions(self) -> bool:
        """Soru üretme özelliğine erişim kontrolü."""
        return self.can_access(AIFeature.QUESTION_GENERATION)
    
    def get_available_features(self) -> List[str]:
        """Kullanıcının erişebildiği özelliklerin listesi."""
        available = []
        for feature in AIFeature:
            if self.can_access(feature):
                available.append(feature.value)
        return available
    
    def get_access_summary(self) -> Dict[str, Any]:
        """Kullanıcının AI erişim özetini döndür."""
        return {
            'access_level': self.access_level.name,
            'access_level_value': self.access_level.value,
            'available_features': self.get_available_features(),
            'can_chat': self.can_use_chat(),
            'can_use_coach': self.can_use_coach(),
            'can_generate_content': self.can_generate_content(),
            'can_generate_questions': self.can_generate_questions(),
        }


def get_ai_access_checker(user: Optional[User] = None) -> AIAccessChecker:
    """
    AI erişim kontrolcüsü oluştur.
    
    Args:
        user: Kullanıcı (None ise g.current_user kullanılır)
        
    Returns:
        AIAccessChecker instance
    """
    if user is None:
        user = getattr(g, 'current_user', None)
    return AIAccessChecker(user)


def get_ai_access_summary(user: Optional[User] = None) -> Dict[str, Any]:
    """
    Kullanıcının AI erişim özetini döndür.
    
    Args:
        user: Kullanıcı
        
    Returns:
        Erişim özeti dictionary
    """
    checker = get_ai_access_checker(user)
    return checker.get_access_summary()


def require_ai_access(feature: AIFeature):
    """
    AI özelliğine erişim gerektiren decorator.
    
    Args:
        feature: Gerekli AI özelliği
        
    Usage:
        @require_ai_access(AIFeature.CHAT)
        def chat_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from app.core.exceptions import AuthorizationError
            
            user = getattr(g, 'current_user', None)
            if not user:
                # JWT'den kullanıcı al
                user_id = get_jwt_identity()
                if user_id:
                    user = User.query.get(user_id)
            
            checker = AIAccessChecker(user)
            
            if not checker.can_access(feature):
                raise AuthorizationError(
                    f"Bu AI özelliğine ({feature.value}) erişim yetkiniz yok. "
                    f"Mevcut erişim seviyeniz: {checker.access_level.name}"
                )
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# Kısa yol dekoratörler
def require_ai_chat(f):
    """Chat özelliği için erişim kontrolü."""
    return require_ai_access(AIFeature.CHAT)(f)


def require_ai_coach(f):
    """Koç özelliği için erişim kontrolü."""
    return require_ai_access(AIFeature.COACH)(f)


def require_ai_content_generation(f):
    """İçerik üretme için erişim kontrolü."""
    return require_ai_access(AIFeature.CONTENT_GENERATION)(f)


def require_ai_question_generation(f):
    """Soru üretme için erişim kontrolü."""
    return require_ai_access(AIFeature.QUESTION_GENERATION)(f)
