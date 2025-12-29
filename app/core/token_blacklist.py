"""
Token Blacklist Service.

Redis-backed token blacklist yönetimi.
Logout, token revocation ve session yönetimi.

Security Features:
    - Token JTI'ları Redis'te saklanır
    - TTL ile otomatik temizlik
    - Token version ile toplu invalidation
    - Session tracking

Redis Key Patterns:
    - token:blacklist:{jti} - Blacklist'teki token
    - token:version:{user_id} - Kullanıcının token version'ı
    - token:sessions:{user_id} - Kullanıcının aktif oturumları
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from flask import current_app

logger = logging.getLogger(__name__)


class TokenBlacklistService:
    """
    Redis-backed token blacklist servisi.
    
    Token'ları blacklist'e ekler ve kontrol eder.
    """
    
    # Redis key prefixes
    BLACKLIST_PREFIX = 'token:blacklist:'
    VERSION_PREFIX = 'token:version:'
    SESSION_PREFIX = 'token:sessions:'
    
    # Default TTL (7 gün - en uzun token süresinden uzun olmalı)
    DEFAULT_TTL = 60 * 60 * 24 * 7
    
    # Redis availability cache (class-level)
    _redis_available = None  # None = not checked, True/False = checked
    _redis_check_time = None
    _REDIS_CHECK_INTERVAL = 60  # Saniyede bir yeniden kontrol et
    
    # =========================================================================
    # BLACKLIST OPERATIONS
    # =========================================================================
    
    @classmethod
    def add(
        cls,
        jti: str,
        expires_at: datetime = None,
        reason: str = 'logout',
        user_id: int = None
    ) -> bool:
        """
        Token'ı blacklist'e ekler.
        
        Args:
            jti: JWT ID
            expires_at: Token'ın expire tarihi (TTL için)
            reason: Blacklist nedeni
            user_id: Kullanıcı ID (opsiyonel, audit için)
        
        Returns:
            Başarılı mı?
        """
        redis = cls._get_redis()
        if not redis:
            # Fallback: Database'e kaydet
            return cls._add_to_database(jti, expires_at, reason)
        
        try:
            key = f'{cls.BLACKLIST_PREFIX}{jti}'
            
            # TTL hesapla
            if expires_at:
                ttl = int((expires_at - datetime.utcnow()).total_seconds())
                ttl = max(ttl, 60)  # Minimum 1 dakika
            else:
                ttl = cls.DEFAULT_TTL
            
            # Metadata
            data = {
                'jti': jti,
                'reason': reason,
                'revoked_at': datetime.utcnow().isoformat(),
                'user_id': user_id
            }
            
            redis.setex(key, ttl, json.dumps(data))
            
            logger.info(f'Token blacklisted: {jti[:8]}... reason={reason}')
            return True
            
        except Exception as e:
            logger.error(f'Failed to blacklist token: {e}')
            return cls._add_to_database(jti, expires_at, reason)
    
    @classmethod
    def is_revoked(cls, jti: str) -> bool:
        """
        Token blacklist'te mi kontrol eder.
        
        Args:
            jti: JWT ID
        
        Returns:
            True eğer token blacklist'teyse
        """
        redis = cls._get_redis()
        
        if redis:
            try:
                key = f'{cls.BLACKLIST_PREFIX}{jti}'
                return redis.exists(key) > 0
            except Exception as e:
                logger.error(f'Redis blacklist check failed: {e}')
        
        # Fallback: Database'den kontrol et
        return cls._check_database(jti)
    
    @classmethod
    def remove(cls, jti: str) -> bool:
        """
        Token'ı blacklist'ten kaldırır (nadiren kullanılır).
        
        Args:
            jti: JWT ID
        
        Returns:
            Başarılı mı?
        """
        redis = cls._get_redis()
        if not redis:
            return False
        
        try:
            key = f'{cls.BLACKLIST_PREFIX}{jti}'
            redis.delete(key)
            return True
        except Exception as e:
            logger.error(f'Failed to remove from blacklist: {e}')
            return False
    
    # =========================================================================
    # TOKEN VERSION (Mass Invalidation)
    # =========================================================================
    
    @classmethod
    def get_token_version(cls, user_id: int) -> int:
        """
        Kullanıcının token version'ını alır.
        
        Args:
            user_id: Kullanıcı ID
        
        Returns:
            Token version numarası
        """
        redis = cls._get_redis()
        if not redis:
            return 0
        
        try:
            key = f'{cls.VERSION_PREFIX}{user_id}'
            version = redis.get(key)
            return int(version) if version else 0
        except Exception as e:
            logger.error(f'Failed to get token version: {e}')
            return 0
    
    @classmethod
    def increment_token_version(cls, user_id: int) -> int:
        """
        Kullanıcının token version'ını artırır.
        
        Bu işlem kullanıcının TÜM token'larını geçersiz kılar.
        
        Args:
            user_id: Kullanıcı ID
        
        Returns:
            Yeni version numarası
        """
        redis = cls._get_redis()
        if not redis:
            return 1
        
        try:
            key = f'{cls.VERSION_PREFIX}{user_id}'
            new_version = redis.incr(key)
            
            # TTL ayarla (uzun süreli)
            redis.expire(key, 60 * 60 * 24 * 365)  # 1 yıl
            
            logger.info(f'Token version incremented for user {user_id}: {new_version}')
            return new_version
            
        except Exception as e:
            logger.error(f'Failed to increment token version: {e}')
            return 1
    
    # =========================================================================
    # SESSION MANAGEMENT
    # =========================================================================
    
    @classmethod
    def add_session(
        cls,
        user_id: int,
        jti: str,
        device_info: Dict[str, Any] = None,
        expires_at: datetime = None
    ) -> bool:
        """
        Kullanıcı oturumunu kaydeder.
        
        Args:
            user_id: Kullanıcı ID
            jti: JWT ID (session ID olarak kullanılır)
            device_info: Cihaz bilgileri
            expires_at: Oturum bitiş tarihi
        
        Returns:
            Başarılı mı?
        """
        redis = cls._get_redis()
        if not redis:
            return False
        
        try:
            key = f'{cls.SESSION_PREFIX}{user_id}'
            
            session_data = {
                'jti': jti,
                'created_at': datetime.utcnow().isoformat(),
                'device_info': device_info or {},
                'last_activity': datetime.utcnow().isoformat()
            }
            
            # Hash olarak sakla
            redis.hset(key, jti, json.dumps(session_data))
            
            # TTL ayarla
            if expires_at:
                ttl = int((expires_at - datetime.utcnow()).total_seconds())
                redis.expire(key, max(ttl, 60))
            
            return True
            
        except Exception as e:
            logger.error(f'Failed to add session: {e}')
            return False
    
    @classmethod
    def get_user_sessions(cls, user_id: int) -> List[Dict[str, Any]]:
        """
        Kullanıcının aktif oturumlarını listeler.
        
        Args:
            user_id: Kullanıcı ID
        
        Returns:
            Oturum listesi
        """
        redis = cls._get_redis()
        if not redis:
            return []
        
        try:
            key = f'{cls.SESSION_PREFIX}{user_id}'
            sessions = redis.hgetall(key)
            
            result = []
            for jti, data in sessions.items():
                try:
                    session = json.loads(data)
                    session['session_id'] = jti.decode() if isinstance(jti, bytes) else jti
                    result.append(session)
                except Exception:
                    continue
            
            return result
            
        except Exception as e:
            logger.error(f'Failed to get user sessions: {e}')
            return []
    
    @classmethod
    def revoke_session(cls, user_id: int, session_id: str) -> bool:
        """
        Belirli bir oturumu sonlandırır.
        
        Args:
            user_id: Kullanıcı ID
            session_id: Oturum ID (JTI)
        
        Returns:
            Başarılı mı?
        """
        redis = cls._get_redis()
        if not redis:
            return False
        
        try:
            # Session'dan kaldır
            session_key = f'{cls.SESSION_PREFIX}{user_id}'
            redis.hdel(session_key, session_id)
            
            # Blacklist'e ekle
            cls.add(session_id, reason='session_revoked', user_id=user_id)
            
            return True
            
        except Exception as e:
            logger.error(f'Failed to revoke session: {e}')
            return False
    
    @classmethod
    def revoke_all_sessions(cls, user_id: int, except_jti: str = None) -> int:
        """
        Kullanıcının tüm oturumlarını sonlandırır.
        
        Args:
            user_id: Kullanıcı ID
            except_jti: Bu oturum hariç (mevcut oturum)
        
        Returns:
            Sonlandırılan oturum sayısı
        """
        sessions = cls.get_user_sessions(user_id)
        count = 0
        
        for session in sessions:
            jti = session.get('session_id') or session.get('jti')
            if jti and jti != except_jti:
                cls.revoke_session(user_id, jti)
                count += 1
        
        # Token version'ı da artır
        cls.increment_token_version(user_id)
        
        logger.info(f'Revoked {count} sessions for user {user_id}')
        return count
    
    @classmethod
    def update_session_activity(cls, user_id: int, jti: str) -> bool:
        """
        Oturum son aktivite zamanını günceller.
        
        Args:
            user_id: Kullanıcı ID
            jti: JWT ID
        
        Returns:
            Başarılı mı?
        """
        redis = cls._get_redis()
        if not redis:
            return False
        
        try:
            key = f'{cls.SESSION_PREFIX}{user_id}'
            session_data = redis.hget(key, jti)
            
            if session_data:
                data = json.loads(session_data)
                data['last_activity'] = datetime.utcnow().isoformat()
                redis.hset(key, jti, json.dumps(data))
            
            return True
            
        except Exception as e:
            logger.error(f'Failed to update session activity: {e}')
            return False
    
    # =========================================================================
    # CLEANUP
    # =========================================================================
    
    @classmethod
    def cleanup_expired_tokens(cls) -> int:
        """
        Süresi dolmuş token'ları temizler.
        
        Redis TTL ile otomatik temizlik yapar, bu method
        database fallback için kullanılır.
        
        Returns:
            Temizlenen token sayısı
        """
        from app.modules.users.models import TokenBlacklist
        from app.extensions import db
        
        try:
            cutoff = datetime.utcnow()
            deleted = TokenBlacklist.query.filter(
                TokenBlacklist.expires_at < cutoff
            ).delete()
            
            db.session.commit()
            
            logger.info(f'Cleaned up {deleted} expired tokens from database')
            return deleted
            
        except Exception as e:
            logger.error(f'Failed to cleanup expired tokens: {e}')
            db.session.rollback()
            return 0
    
    # =========================================================================
    # PRIVATE METHODS
    # =========================================================================
    
    @classmethod
    def _get_redis(cls):
        """Redis client'ı döner. Redis yoksa veya devre dışıysa hızlıca None döner."""
        import time
        
        # Config'den Redis'in etkin olup olmadığını kontrol et
        if not current_app.config.get('REDIS_ENABLED', True):
            return None  # Redis devre dışı - hızlı return
        
        # Redis availability cache kontrolü - her istekte bağlantı denemesi yapmamak için
        current_time = time.time()
        if cls._redis_available is False:
            # Redis daha önce denendi ve yoktu, belirli bir süre geçtiyse tekrar dene
            if cls._redis_check_time and (current_time - cls._redis_check_time) < cls._REDIS_CHECK_INTERVAL:
                return None  # Hızlı return - Redis yok
        
        try:
            from app.extensions import cache
            
            # Flask-Caching Redis backend
            if hasattr(cache, 'cache') and hasattr(cache.cache, '_read_client'):
                client = cache.cache._read_client
                if client:
                    cls._redis_available = True
                    cls._redis_check_time = current_time
                    return client
            
            # Alternatif: Redis bağlantısı
            redis_url = current_app.config.get('REDIS_URL')
            if redis_url:
                import redis
                # Çok kısa timeout ile bağlan - Redis yoksa hızlıca fallback yap
                client = redis.from_url(
                    redis_url, 
                    decode_responses=True,
                    socket_connect_timeout=0.1,  # 100ms timeout
                    socket_timeout=0.2,  # 200ms timeout
                    retry_on_timeout=False  # Timeout'ta retry yapma
                )
                # Bağlantıyı test et
                client.ping()
                cls._redis_available = True
                cls._redis_check_time = current_time
                return client
            
            cls._redis_available = False
            cls._redis_check_time = current_time
            return None
            
        except Exception as e:
            logger.debug(f'Redis not available: {e}')
            cls._redis_available = False
            cls._redis_check_time = current_time
            return None
            return None
    
    @classmethod
    def _add_to_database(cls, jti: str, expires_at: datetime = None, reason: str = 'logout') -> bool:
        """Database'e blacklist kaydı ekler (Redis fallback)."""
        from app.modules.users.models import TokenBlacklist
        from app.extensions import db
        
        try:
            token_block = TokenBlacklist(
                jti=jti,
                expires_at=expires_at or (datetime.utcnow() + timedelta(days=7))
            )
            db.session.add(token_block)
            db.session.commit()
            return True
            
        except Exception as e:
            logger.error(f'Failed to add to database blacklist: {e}')
            db.session.rollback()
            return False
    
    @classmethod
    def _check_database(cls, jti: str) -> bool:
        """Database'den blacklist kontrolü yapar (Redis fallback)."""
        from app.modules.users.models import TokenBlacklist
        
        try:
            exists = TokenBlacklist.query.filter_by(jti=jti).first() is not None
            return exists
        except Exception as e:
            logger.error(f'Failed to check database blacklist: {e}')
            return False


# =========================================================================
# JWT CALLBACK FUNCTIONS (Flask-JWT-Extended)
# =========================================================================

def check_if_token_revoked(jwt_header, jwt_payload) -> bool:
    """
    Flask-JWT-Extended callback.
    
    Token'ın blacklist'te olup olmadığını kontrol eder.
    """
    jti = jwt_payload.get('jti')
    if not jti:
        return True
    
    # Blacklist kontrolü
    if TokenBlacklistService.is_revoked(jti):
        return True
    
    # Token version kontrolü
    user_id = jwt_payload.get('sub')
    token_version = jwt_payload.get('token_version', 0)
    
    if user_id:
        current_version = TokenBlacklistService.get_token_version(user_id)
        if token_version < current_version:
            return True
    
    return False
