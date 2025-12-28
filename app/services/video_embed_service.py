"""
YouTube Video Embed Service.

Gizli YouTube videolarının güvenli embed edilmesi için servis.
Token-based access, referer kontrolü ve izlenme takibi.
"""

import hashlib
import hmac
import secrets
import time
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from functools import wraps

from flask import current_app, request, g
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from app.extensions import db
from app.services.cache_service import CacheService


class VideoEmbedSecurity:
    """
    Video embed güvenlik servisi.
    
    Gizli YouTube videoların güvenli embed edilmesi için:
    - Signed URL'ler
    - Token-based access
    - Referer kontrolü
    - IP bazlı rate limiting
    - Kullanıcı doğrulama
    """
    
    # Token geçerlilik süresi (saniye)
    TOKEN_TTL = 3600  # 1 saat
    
    # Embed URL geçerlilik süresi
    EMBED_URL_TTL = 7200  # 2 saat
    
    # Allowed domains for referer check
    ALLOWED_DOMAINS = [
        'localhost',
        '127.0.0.1',
    ]
    
    @classmethod
    def _get_secret_key(cls) -> str:
        """Güvenlik anahtarını döner."""
        return current_app.config.get('SECRET_KEY', 'dev-secret-key')
    
    @classmethod
    def _get_serializer(cls) -> URLSafeTimedSerializer:
        """URL-safe serializer döner."""
        return URLSafeTimedSerializer(cls._get_secret_key())
    
    @classmethod
    def generate_embed_token(
        cls,
        video_id: int,
        user_id: int,
        youtube_video_id: str,
        extra_data: Dict = None
    ) -> str:
        """
        Video embed için güvenli token oluşturur.
        
        Args:
            video_id: Veritabanı video ID
            user_id: Kullanıcı ID
            youtube_video_id: YouTube video ID
            extra_data: Ek veriler
            
        Returns:
            Signed token string
        """
        payload = {
            'vid': video_id,
            'uid': user_id,
            'ytid': youtube_video_id,
            'ts': int(time.time()),
            'nonce': secrets.token_hex(8),
        }
        
        if extra_data:
            payload['extra'] = extra_data
        
        serializer = cls._get_serializer()
        return serializer.dumps(payload, salt='video-embed')
    
    @classmethod
    def verify_embed_token(
        cls,
        token: str,
        max_age: int = None
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Embed token'ı doğrular.
        
        Returns:
            Tuple of (payload, error_message)
        """
        max_age = max_age or cls.TOKEN_TTL
        
        try:
            serializer = cls._get_serializer()
            payload = serializer.loads(token, salt='video-embed', max_age=max_age)
            return payload, None
            
        except SignatureExpired:
            return None, 'Token süresi dolmuş'
        except BadSignature:
            return None, 'Geçersiz token'
        except Exception as e:
            return None, f'Token doğrulama hatası: {str(e)}'
    
    @classmethod
    def generate_signed_embed_url(
        cls,
        youtube_video_id: str,
        video_id: int,
        user_id: int,
        autoplay: bool = False,
        start_time: int = 0
    ) -> str:
        """
        İmzalı embed URL oluşturur.
        
        Bu URL sadece belirli bir süre geçerlidir ve
        token ile korunur.
        """
        token = cls.generate_embed_token(
            video_id=video_id,
            user_id=user_id,
            youtube_video_id=youtube_video_id,
            extra_data={
                'autoplay': autoplay,
                'start': start_time
            }
        )
        
        base_url = current_app.config.get('API_BASE_URL', '')
        return f'{base_url}/api/v1/videos/embed/{token}'
    
    @classmethod
    def generate_secure_youtube_embed_url(
        cls,
        youtube_video_id: str,
        autoplay: bool = False,
        start_time: int = 0,
        controls: bool = True,
        modestbranding: bool = True
    ) -> str:
        """
        Güvenli YouTube embed URL'si oluşturur.
        
        privacy-enhanced mode kullanır (youtube-nocookie.com)
        """
        # Privacy-enhanced mode için nocookie domain
        base_url = f'https://www.youtube-nocookie.com/embed/{youtube_video_id}'
        
        params = [
            'rel=0',              # İlgili videolar gösterme
            'modestbranding=1',   # Minimal YouTube branding
            'enablejsapi=1',      # JavaScript API (izleme için)
            'origin=' + current_app.config.get('FRONTEND_URL', 'http://localhost:5173'),
        ]
        
        if autoplay:
            params.append('autoplay=1')
            params.append('mute=1')  # Autoplay için mute gerekli
        
        if start_time > 0:
            params.append(f'start={start_time}')
        
        if not controls:
            params.append('controls=0')
        
        return f'{base_url}?{"&".join(params)}'
    
    @classmethod
    def verify_referer(cls, referer: str = None) -> bool:
        """
        Referer header'ı doğrular.
        
        Sadece izin verilen domain'lerden gelen istekleri kabul eder.
        """
        referer = referer or request.headers.get('Referer', '')
        
        if not referer:
            return False
        
        # Production'da allowed domains'i config'den al
        allowed = cls.ALLOWED_DOMAINS + current_app.config.get('ALLOWED_EMBED_DOMAINS', [])
        
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        
        return any(domain in parsed.netloc for domain in allowed)
    
    @classmethod
    def check_user_video_access(
        cls,
        user_id: int,
        video_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Kullanıcının videoya erişim yetkisini kontrol eder.
        
        Returns:
            Tuple of (has_access, error_message)
        """
        from app.modules.contents.models import Video, ContentStatus
        from app.modules.courses.models import Enrollment
        
        video = Video.query.get(video_id)
        
        if not video:
            return False, 'Video bulunamadı'
        
        if video.is_deleted:
            return False, 'Video silinmiş'
        
        # Yayında değilse sadece sahip veya admin görebilir
        if video.content_status != ContentStatus.PUBLISHED:
            from app.models.user import User
            user = User.query.get(user_id)
            
            if not user:
                return False, 'Kullanıcı bulunamadı'
            
            if video.uploaded_by != user_id and user.role not in ['admin', 'super_admin']:
                return False, 'Bu video henüz yayında değil'
        
        # Free preview ise herkes izleyebilir
        if video.is_free_preview:
            return True, None
        
        # Kursa kayıtlı mı kontrol et
        if video.topic and video.topic.course:
            enrollment = Enrollment.query.filter_by(
                user_id=user_id,
                course_id=video.topic.course.id
            ).first()
            
            if not enrollment:
                # Kullanıcının aktif paketi var mı kontrol et
                from app.models.package import UserPackage
                active_package = UserPackage.query.filter(
                    UserPackage.user_id == user_id,
                    UserPackage.is_active == True,
                    UserPackage.expires_at > datetime.utcnow()
                ).first()
                
                if not active_package:
                    return False, 'Bu videoyu izlemek için kursa kayıt olmalısınız'
        
        return True, None


class VideoEmbedTokenMiddleware:
    """
    Video embed istekleri için middleware.
    
    Token doğrulama, rate limiting ve logging.
    """
    
    @staticmethod
    def require_valid_token(f):
        """Token doğrulama decorator'ı."""
        @wraps(f)
        def decorated(*args, **kwargs):
            token = kwargs.get('token') or request.args.get('token')
            
            if not token:
                from app.core.responses import error_response
                return error_response('Token gerekli', status_code=401)
            
            payload, error = VideoEmbedSecurity.verify_embed_token(token)
            
            if error:
                from app.core.responses import error_response
                return error_response(error, status_code=401)
            
            # Payload'ı request context'e ekle
            g.embed_payload = payload
            g.video_id = payload.get('vid')
            g.user_id = payload.get('uid')
            g.youtube_video_id = payload.get('ytid')
            
            return f(*args, **kwargs)
        
        return decorated


def require_video_access(f):
    """
    Video erişim kontrolü decorator'ı.
    
    Kullanıcının videoya erişim yetkisini kontrol eder.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask_jwt_extended import get_jwt_identity
        from app.core.responses import error_response
        
        user_id = get_jwt_identity()
        video_id = kwargs.get('video_id') or request.view_args.get('video_id')
        
        if not video_id:
            return error_response('Video ID gerekli', status_code=400)
        
        has_access, error = VideoEmbedSecurity.check_user_video_access(user_id, video_id)
        
        if not has_access:
            return error_response(error, status_code=403)
        
        return f(*args, **kwargs)
    
    return decorated
