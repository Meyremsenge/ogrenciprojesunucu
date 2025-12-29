"""
Modules package - Feature modülleri.

Her modül kendi domain'ine ait tüm bileşenleri içerir:
- models.py: SQLAlchemy modelleri
- routes.py: API endpoint'leri
- services.py: İş mantığı
- schemas.py: Request/Response serialization

Modüller birbirine doğrudan bağımlı olmamalıdır.
"""

# Module blueprints
from app.modules.auth import auth_bp
from app.modules.users import users_bp
from app.modules.courses import courses_bp
from app.modules.contents import contents_bp
from app.modules.exams import exams_bp
from app.modules.evaluations import evaluations_bp
from app.modules.live_classes import live_classes_bp
from app.modules.ai import ai_bp
from app.modules.goals import goals_bp

__all__ = [
    'auth_bp',
    'users_bp',
    'courses_bp',
    'contents_bp',
    'exams_bp',
    'evaluations_bp',
    'live_classes_bp',
    'ai_bp',
    'goals_bp',
]
