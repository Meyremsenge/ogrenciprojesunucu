"""
Auth Module - Services.

Kimlik doğrulama iş mantığı.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token

from app.extensions import db
from app.core.exceptions import (
    AuthenticationError,
    ValidationError,
    ConflictError,
    NotFoundError
)
from app.core.security import (
    hash_password,
    verify_password,
    generate_token,
    validate_password_strength
)


class AuthService:
    """Kimlik doğrulama servisi."""
    
    @classmethod
    def register(
        cls,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        phone: str = None
    ):
        """
        Yeni kullanıcı kaydı oluşturur.
        
        Args:
            email: E-posta adresi
            password: Şifre
            first_name: Ad
            last_name: Soyad
            phone: Telefon (opsiyonel)
        
        Returns:
            User instance
        
        Raises:
            ConflictError: E-posta zaten kayıtlı
            ValidationError: Şifre zayıf
        """
        from app.modules.users.models import User
        
        # E-posta kontrolü
        if User.query.filter_by(email=email.lower()).first():
            raise ConflictError('Bu e-posta adresi zaten kayıtlı')
        
        # Şifre güçlülük kontrolü
        is_valid, error = validate_password_strength(password)
        if not is_valid:
            raise ValidationError(error)
        
        # Kullanıcı oluştur
        # Default role (student) al
        from app.models.user import Role
        student_role = Role.query.filter_by(name=Role.STUDENT).first()
        
        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            is_active=True,
            is_verified=False,
            role_id=student_role.id if student_role else 4  # Default to student role
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Doğrulama e-postası gönder (async)
        cls._send_verification_email(user)
        
        return user
    
    @classmethod
    def login(cls, email: str, password: str) -> Dict[str, Any]:
        """
        Kullanıcı girişi yapar.
        
        Args:
            email: E-posta adresi
            password: Şifre
        
        Returns:
            Dict with access_token, refresh_token, user, expires_in
        
        Raises:
            AuthenticationError: Geçersiz kimlik bilgileri
        """
        from app.modules.users.models import User
        
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user or not verify_password(password, user.password_hash):
            raise AuthenticationError('Geçersiz e-posta veya şifre')
        
        if not user.is_active:
            raise AuthenticationError('Hesabınız devre dışı bırakılmış')
        
        # Token oluştur
        access_token = cls._create_access_token(user)
        refresh_token = cls._create_refresh_token(user)
        
        # Son giriş zamanını güncelle
        user.last_login_at = datetime.utcnow()
        db.session.commit()
        
        expires_in = current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', timedelta(hours=1))
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user,
            'expires_in': int(expires_in.total_seconds())
        }
    
    @classmethod
    def logout(cls, jti: str) -> None:
        """
        Kullanıcı çıkışı yapar (token'ı blacklist'e ekler).
        
        Args:
            jti: JWT ID
        """
        from app.modules.users.models import TokenBlacklist
        
        token_block = TokenBlacklist(jti=jti)
        db.session.add(token_block)
        db.session.commit()
    
    @classmethod
    def refresh_token(cls, user_id: int) -> Dict[str, Any]:
        """
        Access token'ı yeniler.
        
        Args:
            user_id: Kullanıcı ID
        
        Returns:
            Dict with access_token and expires_in
        """
        from app.modules.users.models import User
        
        user = User.query.get(user_id)
        if not user or not user.is_active:
            raise AuthenticationError('Geçersiz kullanıcı')
        
        access_token = cls._create_access_token(user)
        expires_in = current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', timedelta(hours=1))
        
        return {
            'access_token': access_token,
            'expires_in': int(expires_in.total_seconds())
        }
    
    @classmethod
    def get_current_user(cls, user_id: int):
        """
        Mevcut kullanıcıyı döner.
        
        Args:
            user_id: Kullanıcı ID
        
        Returns:
            User instance
        """
        from app.modules.users.models import User
        
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError('Kullanıcı', user_id)
        
        return user
    
    @classmethod
    def request_password_reset(cls, email: str) -> None:
        """
        Şifre sıfırlama isteği gönderir.
        
        Args:
            email: E-posta adresi
        """
        from app.modules.users.models import User
        
        user = User.query.filter_by(email=email.lower()).first()
        
        if user:
            # Reset token oluştur
            user.password_reset_token = generate_token(32)
            user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
            db.session.commit()
            
            # E-posta gönder (async)
            cls._send_password_reset_email(user)
    
    @classmethod
    def reset_password(cls, token: str, new_password: str) -> None:
        """
        Şifreyi sıfırlar.
        
        Args:
            token: Reset token
            new_password: Yeni şifre
        
        Raises:
            ValidationError: Geçersiz token veya şifre
        """
        from app.modules.users.models import User
        
        user = User.query.filter_by(password_reset_token=token).first()
        
        if not user or not user.password_reset_expires:
            raise ValidationError('Geçersiz veya süresi dolmuş bağlantı')
        
        if user.password_reset_expires < datetime.utcnow():
            raise ValidationError('Bağlantının süresi dolmuş')
        
        # Şifre güçlülük kontrolü
        is_valid, error = validate_password_strength(new_password)
        if not is_valid:
            raise ValidationError(error)
        
        # Şifreyi güncelle
        user.password_hash = hash_password(new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        db.session.commit()
    
    @classmethod
    def change_password(
        cls,
        user_id: int,
        current_password: str,
        new_password: str
    ) -> None:
        """
        Şifreyi değiştirir.
        
        Args:
            user_id: Kullanıcı ID
            current_password: Mevcut şifre
            new_password: Yeni şifre
        
        Raises:
            ValidationError: Yanlış şifre veya zayıf yeni şifre
        """
        from app.modules.users.models import User
        
        user = User.query.get(user_id)
        
        if not verify_password(current_password, user.password_hash):
            raise ValidationError('Mevcut şifre yanlış')
        
        is_valid, error = validate_password_strength(new_password)
        if not is_valid:
            raise ValidationError(error)
        
        user.password_hash = hash_password(new_password)
        db.session.commit()
    
    @classmethod
    def verify_email(cls, token: str) -> None:
        """
        E-postayı doğrular.
        
        Args:
            token: Doğrulama token'ı
        
        Raises:
            ValidationError: Geçersiz token
        """
        from app.modules.users.models import User
        
        user = User.query.filter_by(verification_token=token).first()
        
        if not user:
            raise ValidationError('Geçersiz doğrulama bağlantısı')
        
        user.email_verified = True
        user.verification_token = None
        db.session.commit()
    
    @classmethod
    def resend_verification_email(cls, user_id: int) -> None:
        """
        Doğrulama e-postasını yeniden gönderir.
        
        Args:
            user_id: Kullanıcı ID
        """
        from app.modules.users.models import User
        
        user = User.query.get(user_id)
        
        if user.email_verified:
            raise ValidationError('E-posta zaten doğrulanmış')
        
        user.verification_token = generate_token(32)
        db.session.commit()
        
        cls._send_verification_email(user)
    
    # =========================================================================
    # Private Methods
    # =========================================================================
    
    @classmethod
    def _create_access_token(cls, user) -> str:
        """Access token oluşturur."""
        additional_claims = {
            'role': user.role.name if user.role else 'student',
            'email': user.email,
            'permissions': user.get_permissions() if hasattr(user, 'get_permissions') else []
        }
        
        return create_access_token(
            identity=user.id,
            additional_claims=additional_claims
        )
    
    @classmethod
    def _create_refresh_token(cls, user) -> str:
        """Refresh token oluşturur."""
        return create_refresh_token(identity=user.id)
    
    @classmethod
    def _send_verification_email(cls, user) -> None:
        """Doğrulama e-postası gönderir (async)."""
        try:
            from app.tasks.email_tasks import send_verification_email
            send_verification_email.delay(user.id, user.verification_token)
        except Exception as e:
            current_app.logger.error(f'Failed to queue verification email: {e}')
    
    @classmethod
    def _send_password_reset_email(cls, user) -> None:
        """Şifre sıfırlama e-postası gönderir (async)."""
        try:
            from app.tasks.email_tasks import send_password_reset_email
            send_password_reset_email.delay(user.id, user.password_reset_token)
        except Exception as e:
            current_app.logger.error(f'Failed to queue password reset email: {e}')
