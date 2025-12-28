"""
API v1 Blueprint initialization.

Bu dosya iki yaklaşımı destekler:
1. Flask-RESTX namespaces (eski yapı)
2. Modüler Blueprint yapısı (yeni yapı)
"""

from flask import Blueprint
from flask_restx import Api

api_v1_bp = Blueprint('api_v1', __name__)

# Initialize Flask-RESTX API
api = Api(
    api_v1_bp,
    version='1.0',
    title='Student Coaching API',
    description='Öğrenci Koçluk Platformu API Dökümantasyonu',
    doc='/docs',
    authorizations={
        'Bearer': {
            'type': 'apiKey',
            'in': 'header',
            'name': 'Authorization',
            'description': 'JWT token: Bearer <token>'
        }
    },
    security='Bearer'
)

# =============================================================================
# Flask-RESTX Namespaces (eski yapı - geriye dönük uyumluluk)
# =============================================================================
try:
    from app.api.v1.auth import auth_ns
    from app.api.v1.users import users_ns
    from app.api.v1.courses import courses_ns
    from app.api.v1.videos import videos_ns
    from app.api.v1.questions import questions_ns
    from app.api.v1.exams import exams_ns
    from app.api.v1.evaluations import evaluations_ns
    from app.api.v1.live_sessions import ns as live_sessions_ns

    # Add namespaces to API
    api.add_namespace(auth_ns, path='/auth')
    api.add_namespace(users_ns, path='/users')
    api.add_namespace(courses_ns, path='/courses')
    api.add_namespace(videos_ns, path='/videos')
    api.add_namespace(questions_ns, path='/questions')
    api.add_namespace(exams_ns, path='/exams')
    api.add_namespace(evaluations_ns, path='/evaluations')
    api.add_namespace(live_sessions_ns, path='/live-sessions')
except ImportError:
    pass  # Yeni modül yapısı kullanılıyor

# =============================================================================
# Modüler Blueprint Yapısı (yeni yapı)
# =============================================================================
def register_module_blueprints(app):
    """
    Yeni modüler yapıdaki blueprint'leri kaydeder.
    
    Bu fonksiyon app/__init__.py'den çağrılır.
    
    NOT: Model çakışmalarını önlemek için eski modüller geçici olarak devre dışı.
    Flask-RESTX namespace'leri kullanılıyor.
    AI modülü yeni Blueprint sistemiyle çalışıyor.
    """
    # AI modülünü kaydet (yeni modül - Blueprint yapısı)
    from app.modules.ai import ai_bp
    app.register_blueprint(ai_bp, url_prefix='/api/v1/ai')
    
    # Admin modülünü kaydet
    from app.modules.admin import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/api/v1/admin')
    
    # Logs modülünü kaydet
    from app.modules.logs import logs_bp
    app.register_blueprint(logs_bp, url_prefix='/api/v1/logs')
    
    # Organizations modülünü kaydet (Multi-tenant kurum yönetimi)
    from app.modules.organizations import organizations_bp
    app.register_blueprint(organizations_bp)  # URL prefix routes.py'de tanımlı
    
    # Video AI modülünü kaydet (YouTube embed + AI danışman)
    # Lazy import ile circular import önlenir
    from app.modules.contents.routes_video_ai import video_ai_bp
    app.register_blueprint(video_ai_bp, url_prefix='/api/v1')
    
    # Exams modülünü kaydet (deterministik değerlendirme - AI kullanmaz)
    from app.modules.exams import exams_bp
    app.register_blueprint(exams_bp, url_prefix='/api/v1/exams')
    
    # Live Classes modülünü kaydet (Ders SONRASI AI - canlı derste AI YOK)
    from app.modules.live_classes import live_classes_bp
    app.register_blueprint(live_classes_bp, url_prefix='/api/v1/live-classes')
    
    app.logger.info('AI module blueprint registered at /api/v1/ai')
    app.logger.info('Admin module blueprint registered at /api/v1/admin')
    app.logger.info('Logs module blueprint registered at /api/v1/logs')
    app.logger.info('Organizations module blueprint registered at /api/v1/organizations')
    app.logger.info('Video AI module blueprint registered at /api/v1')
    app.logger.info('Exams module blueprint registered at /api/v1/exams (NO AI)')
    app.logger.info('Live Classes module registered at /api/v1/live-classes (POST-SESSION AI ONLY)')
