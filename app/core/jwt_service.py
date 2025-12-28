"""
JWT Authentication Service.

Enterprise-grade JWT token yönetimi.
Access/Refresh token stratejisi, token blacklist ve güvenlik önlemleri.

Security Features:
    - Access Token: Kısa ömürlü (15-60 dk), API erişimi için
    - Refresh Token: Uzun ömürlü (7-30 gün), token yenileme için
    - Token Blacklist: Redis-backed, logout ve revoke için
    - Token Rotation: Refresh token kullanıldığında yenilenir
    - Device Tracking: Oturum takibi ve cihaz yönetimi
    - Rate Limiting: Brute-force koruması

Kullanım:
    from app.core.jwt_service import JWTService
    
    # Token oluşturma
    tokens = JWTService.create_tokens(user)
    
    # Token yenileme
    new_tokens = JWTService.refresh_tokens(refresh_token, user)
    
    # Token iptal
    JWTService.revoke_token(jti)
    JWTService.revoke_all_user_tokens(user_id)
"""

import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

from flask import current_app, request, g, has_request_context
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_jwt,
    get_jwt_identity,
)

logger = logging.getLogger(__name__)


class TokenType(str, Enum):
    """Token tipleri."""
    ACCESS = 'access'
    REFRESH = 'refresh'


@dataclass
class TokenPayload:
    """JWT payload veri yapısı."""
    user_id: int
    role: str
    permissions: List[str]
    email: str
    token_type: TokenType
    jti: str
    iat: datetime
    exp: datetime
    device_id: Optional[str] = None
    ip_address: Optional[str] = None


@dataclass
class TokenPair:
    """Access ve Refresh token çifti."""
    access_token: str
    refresh_token: str
    access_token_expires: datetime
    refresh_token_expires: datetime
    token_type: str = 'Bearer'
    
    def to_dict(self) -> Dict[str, Any]:
        """Token bilgilerini dictionary'e çevirir."""
        return {
            'access_token': self.access_token,
            'refresh_token': self.refresh_token,
            'token_type': self.token_type,
            'expires_in': int((self.access_token_expires - datetime.utcnow()).total_seconds()),
            'refresh_expires_in': int((self.refresh_token_expires - datetime.utcnow()).total_seconds()),
        }


class JWTService:
    """
    JWT Authentication Service.
    
    Token oluşturma, doğrulama, yenileme ve iptal işlemleri.
    """
    
    # =========================================================================
    # TOKEN CREATION
    # =========================================================================
    
    @classmethod
    def create_tokens(
        cls,
        user,
        device_id: str = None,
        remember_me: bool = False
    ) -> TokenPair:
        """
        Access ve Refresh token çifti oluşturur.
        
        Args:
            user: User model instance
            device_id: Cihaz tanımlayıcı (opsiyonel)
            remember_me: Uzun süreli oturum (30 gün vs 7 gün)
        
        Returns:
            TokenPair: Access ve refresh token'lar
        """
        # Kullanıcı bilgilerini al
        role = user.role.name if hasattr(user, 'role') and user.role else 'student'
        permissions = user.get_permissions() if hasattr(user, 'get_permissions') else []
        
        # Additional claims
        additional_claims = {
            'role': role,
            'permissions': permissions,
            'email': user.email,
            'token_version': cls._get_token_version(user.id),
        }
        
        # Device ve IP bilgisi ekle
        if device_id:
            additional_claims['device_id'] = device_id
        
        if has_request_context():
            additional_claims['ip'] = cls._get_client_ip()
        
        # Token süreleri
        access_expires = cls._get_access_token_expires()
        refresh_expires = cls._get_refresh_token_expires(remember_me)
        
        # Token'ları oluştur
        access_token = create_access_token(
            identity=user.id,
            additional_claims=additional_claims,
            expires_delta=access_expires
        )
        
        refresh_claims = {
            'token_type': 'refresh',
            'token_version': additional_claims['token_version']
        }
        if device_id:
            refresh_claims['device_id'] = device_id
        
        refresh_token = create_refresh_token(
            identity=user.id,
            additional_claims=refresh_claims,
            expires_delta=refresh_expires
        )
        
        # Token çiftini döndür
        now = datetime.utcnow()
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            access_token_expires=now + access_expires,
            refresh_token_expires=now + refresh_expires
        )
    
    @classmethod
    def refresh_tokens(cls, user, old_jti: str = None) -> TokenPair:
        """
        Token'ları yeniler (Token Rotation).
        
        Security: Eski refresh token'ı blacklist'e ekler.
        
        Args:
            user: User model instance
            old_jti: Eski refresh token JTI (iptal için)
        
        Returns:
            TokenPair: Yeni token çifti
        """
        # Eski token'ı iptal et (token rotation)
        if old_jti:
            cls.revoke_token(old_jti, reason='token_rotation')
        
        # Yeni token'ları oluştur
        return cls.create_tokens(user)
    
    # =========================================================================
    # TOKEN VALIDATION
    # =========================================================================
    
    @classmethod
    def validate_token(cls, token: str) -> Tuple[bool, Optional[TokenPayload], Optional[str]]:
        """
        Token'ı doğrular.
        
        Args:
            token: JWT token string
        
        Returns:
            Tuple of (is_valid, payload, error_message)
        """
        try:
            decoded = decode_token(token)
            jti = decoded.get('jti')
            
            # Blacklist kontrolü
            if cls.is_token_revoked(jti):
                return False, None, 'Token has been revoked'
            
            # Token version kontrolü
            user_id = decoded.get('sub')
            token_version = decoded.get('token_version', 0)
            current_version = cls._get_token_version(user_id)
            
            if token_version < current_version:
                return False, None, 'Token version is outdated'
            
            # Payload oluştur
            payload = TokenPayload(
                user_id=user_id,
                role=decoded.get('role', 'student'),
                permissions=decoded.get('permissions', []),
                email=decoded.get('email', ''),
                token_type=TokenType(decoded.get('type', 'access')),
                jti=jti,
                iat=datetime.fromtimestamp(decoded.get('iat', 0)),
                exp=datetime.fromtimestamp(decoded.get('exp', 0)),
                device_id=decoded.get('device_id'),
                ip_address=decoded.get('ip')
            )
            
            return True, payload, None
            
        except Exception as e:
            logger.warning(f'Token validation failed: {e}')
            return False, None, str(e)
    
    @classmethod
    def get_current_user_claims(cls) -> Dict[str, Any]:
        """
        Mevcut request'ten JWT claims'leri alır.
        
        Returns:
            JWT claims dictionary
        """
        try:
            return get_jwt()
        except Exception:
            return {}
    
    @classmethod
    def get_current_user_id(cls) -> Optional[int]:
        """Mevcut kullanıcı ID'sini alır."""
        try:
            return get_jwt_identity()
        except Exception:
            return None
    
    @classmethod
    def get_current_user_role(cls) -> Optional[str]:
        """Mevcut kullanıcının rolünü alır."""
        claims = cls.get_current_user_claims()
        return claims.get('role')
    
    @classmethod
    def get_current_user_permissions(cls) -> List[str]:
        """Mevcut kullanıcının permission'larını alır."""
        claims = cls.get_current_user_claims()
        return claims.get('permissions', [])
    
    # =========================================================================
    # TOKEN REVOCATION (BLACKLIST)
    # =========================================================================
    
    @classmethod
    def revoke_token(cls, jti: str, reason: str = 'logout') -> bool:
        """
        Token'ı iptal eder (blacklist'e ekler).
        
        Args:
            jti: JWT ID
            reason: İptal nedeni
        
        Returns:
            Başarılı mı?
        """
        from app.core.token_blacklist import TokenBlacklistService
        
        return TokenBlacklistService.add(jti, reason=reason)
    
    @classmethod
    def revoke_all_user_tokens(cls, user_id: int, reason: str = 'security') -> bool:
        """
        Kullanıcının tüm token'larını iptal eder.
        
        Token version'ı artırarak tüm mevcut token'ları geçersiz kılar.
        
        Args:
            user_id: Kullanıcı ID
            reason: İptal nedeni
        
        Returns:
            Başarılı mı?
        """
        from app.core.token_blacklist import TokenBlacklistService
        
        # Token version'ı artır
        cls._increment_token_version(user_id)
        
        # Audit log
        logger.info(f'All tokens revoked for user {user_id}: {reason}')
        
        return True
    
    @classmethod
    def is_token_revoked(cls, jti: str) -> bool:
        """
        Token blacklist'te mi kontrol eder.
        
        Args:
            jti: JWT ID
        
        Returns:
            True eğer token iptal edilmişse
        """
        from app.core.token_blacklist import TokenBlacklistService
        
        return TokenBlacklistService.is_revoked(jti)
    
    # =========================================================================
    # SESSION MANAGEMENT
    # =========================================================================
    
    @classmethod
    def get_user_sessions(cls, user_id: int) -> List[Dict[str, Any]]:
        """
        Kullanıcının aktif oturumlarını listeler.
        
        Args:
            user_id: Kullanıcı ID
        
        Returns:
            Aktif oturum listesi
        """
        from app.core.token_blacklist import TokenBlacklistService
        
        return TokenBlacklistService.get_user_sessions(user_id)
    
    @classmethod
    def revoke_session(cls, user_id: int, session_id: str) -> bool:
        """
        Belirli bir oturumu sonlandırır.
        
        Args:
            user_id: Kullanıcı ID
            session_id: Oturum ID
        
        Returns:
            Başarılı mı?
        """
        from app.core.token_blacklist import TokenBlacklistService
        
        return TokenBlacklistService.revoke_session(user_id, session_id)
    
    # =========================================================================
    # PRIVATE METHODS
    # =========================================================================
    
    @classmethod
    def _get_access_token_expires(cls) -> timedelta:
        """Access token süresini döner."""
        try:
            seconds = current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 3600)
            if isinstance(seconds, timedelta):
                return seconds
            return timedelta(seconds=int(seconds))
        except Exception:
            return timedelta(hours=1)
    
    @classmethod
    def _get_refresh_token_expires(cls, remember_me: bool = False) -> timedelta:
        """Refresh token süresini döner."""
        try:
            if remember_me:
                # Beni hatırla: 30 gün
                return timedelta(days=30)
            
            seconds = current_app.config.get('JWT_REFRESH_TOKEN_EXPIRES', 604800)
            if isinstance(seconds, timedelta):
                return seconds
            return timedelta(seconds=int(seconds))
        except Exception:
            return timedelta(days=7)
    
    @classmethod
    def _get_token_version(cls, user_id: int) -> int:
        """
        Kullanıcının token version'ını Redis'ten alır.
        
        Token version, tüm token'ları invalidate etmek için kullanılır.
        """
        from app.core.token_blacklist import TokenBlacklistService
        
        return TokenBlacklistService.get_token_version(user_id)
    
    @classmethod
    def _increment_token_version(cls, user_id: int) -> int:
        """
        Kullanıcının token version'ını artırır.
        
        Bu işlem tüm mevcut token'ları geçersiz kılar.
        """
        from app.core.token_blacklist import TokenBlacklistService
        
        return TokenBlacklistService.increment_token_version(user_id)
    
    @classmethod
    def _get_client_ip(cls) -> str:
        """İstemci IP adresini alır."""
        if not has_request_context():
            return ''
        
        # Proxy arkasındaysa X-Forwarded-For header'ını kontrol et
        forwarded = request.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0].strip()
        
        return request.remote_addr or ''
    
    @classmethod
    def _generate_device_id(cls) -> str:
        """Benzersiz cihaz ID'si oluşturur."""
        if not has_request_context():
            return str(uuid.uuid4())
        
        # User-Agent + IP hash'i
        user_agent = request.headers.get('User-Agent', '')
        ip = cls._get_client_ip()
        
        data = f'{user_agent}:{ip}'
        return hashlib.sha256(data.encode()).hexdigest()[:16]


# =========================================================================
# SECURITY HELPERS
# =========================================================================

def get_token_from_request() -> Optional[str]:
    """
    Request'ten JWT token'ı çıkarır.
    
    Header ve Cookie'den kontrol eder.
    """
    # Authorization header
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    
    # Cookie (SPA için)
    access_token_cookie = request.cookies.get('access_token_cookie')
    if access_token_cookie:
        return access_token_cookie
    
    return None


def extract_jti_from_token(token: str) -> Optional[str]:
    """Token'dan JTI çıkarır."""
    try:
        decoded = decode_token(token)
        return decoded.get('jti')
    except Exception:
        return None
