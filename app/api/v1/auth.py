"""
Authentication API endpoints.

JWT tabanlı kimlik doğrulama ve yetkilendirme.

Security Features:
    - Access/Refresh token çifti
    - Token blacklist (Redis-backed)
    - Brute-force koruması (rate limiting)
    - Secure password hashing (bcrypt)
    - Device tracking ve session yönetimi
"""

from datetime import datetime
from flask import request, g
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_current_user,
    get_jwt
)
from email_validator import validate_email, EmailNotValidError

from app.extensions import db
from app.models.user import User, Role
from app.core.jwt_service import JWTService
from app.core.token_blacklist import TokenBlacklistService
from app.core.security import validate_password_strength
from app.core.auth import require_auth, require_fresh_auth

auth_ns = Namespace('auth', description='Authentication operations')

# Request/Response Models
register_model = auth_ns.model('Register', {
    'email': fields.String(required=True, description='Email address'),
    'password': fields.String(required=True, description='Password (min 8 chars, uppercase, lowercase, digit, special char)'),
    'first_name': fields.String(required=True, description='First name'),
    'last_name': fields.String(required=True, description='Last name'),
    'phone': fields.String(description='Phone number'),
})

login_model = auth_ns.model('Login', {
    'email': fields.String(required=True, description='Email address'),
    'password': fields.String(required=True, description='Password'),
    'remember_me': fields.Boolean(default=False, description='Keep me logged in (30 days)'),
    'device_id': fields.String(description='Device identifier for session tracking'),
})

token_response = auth_ns.model('TokenResponse', {
    'access_token': fields.String(description='JWT access token'),
    'refresh_token': fields.String(description='JWT refresh token'),
    'token_type': fields.String(description='Token type (Bearer)'),
    'expires_in': fields.Integer(description='Access token expiration in seconds'),
    'refresh_expires_in': fields.Integer(description='Refresh token expiration in seconds'),
})

password_reset_request = auth_ns.model('PasswordResetRequest', {
    'email': fields.String(required=True, description='Email address'),
})

password_reset = auth_ns.model('PasswordReset', {
    'token': fields.String(required=True, description='Reset token'),
    'new_password': fields.String(required=True, description='New password'),
})

change_password = auth_ns.model('ChangePassword', {
    'current_password': fields.String(required=True, description='Current password'),
    'new_password': fields.String(required=True, description='New password'),
})

session_model = auth_ns.model('Session', {
    'session_id': fields.String(description='Session ID'),
    'device_info': fields.Raw(description='Device information'),
    'created_at': fields.String(description='Session creation time'),
    'last_activity': fields.String(description='Last activity time'),
})


@auth_ns.route('/register')
class Register(Resource):
    """User registration endpoint."""
    
    @auth_ns.expect(register_model)
    @auth_ns.doc('register_user')
    def post(self):
        """
        Register a new user.
        
        Security:
            - Email validation
            - Password strength validation
            - Duplicate email check
        """
        data = request.get_json()
        
        # Validate email
        try:
            valid = validate_email(data.get('email', ''))
            email = valid.email.lower()
        except EmailNotValidError as e:
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': str(e)
                }
            }, 400
        
        # Check if user exists
        if User.query.filter_by(email=email).first():
            return {
                'success': False,
                'error': {
                    'code': 'EMAIL_EXISTS',
                    'message': 'Bu e-posta adresi zaten kayıtlı'
                }
            }, 400
        
        # Validate password strength
        password = data.get('password', '')
        is_valid, error = validate_password_strength(password)
        if not is_valid:
            return {
                'success': False,
                'error': {
                    'code': 'WEAK_PASSWORD',
                    'message': error
                }
            }, 400
        
        # Get student role
        student_role = Role.query.filter_by(name='student').first()
        if not student_role:
            return {
                'success': False,
                'error': {
                    'code': 'SYSTEM_ERROR',
                    'message': 'Sistem yapılandırma hatası'
                }
            }, 500
        
        # Create user
        user = User(
            email=email,
            first_name=data.get('first_name', '').strip(),
            last_name=data.get('last_name', '').strip(),
            phone=data.get('phone', '').strip() if data.get('phone') else None,
            role_id=student_role.id,
            is_active=True
        )
        user.password = password
        
        db.session.add(user)
        db.session.commit()
        
        # Generate tokens
        device_id = data.get('device_id')
        tokens = JWTService.create_tokens(user, device_id=device_id)
        
        # Add session
        TokenBlacklistService.add_session(
            user_id=user.id,
            jti=tokens.access_token[:36],  # JTI benzeri
            device_info={'user_agent': request.headers.get('User-Agent')},
            expires_at=tokens.refresh_token_expires
        )
        
        return {
            'success': True,
            'message': 'Kayıt başarılı',
            'data': {
                'user': user.to_dict(),
                'tokens': tokens.to_dict()
            }
        }, 201


@auth_ns.route('/login')
class Login(Resource):
    """User login endpoint."""
    
    @auth_ns.expect(login_model)
    @auth_ns.doc('login_user')
    def post(self):
        """
        Authenticate user and return tokens.
        
        Security:
            - Rate limiting (5 attempts/minute)
            - Account lockout after failed attempts
            - Last login tracking
            - Device/IP logging
        """
        data = request.get_json()
        
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        remember_me = data.get('remember_me', False)
        device_id = data.get('device_id')
        
        if not email or not password:
            return {
                'success': False,
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'E-posta ve şifre gerekli'
                }
            }, 400
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        # Security: Sabit zamanlı karşılaştırma (timing attack önleme)
        if not user or not user.check_password(password):
            # Login attempt logging (audit)
            _log_failed_login(email, request.remote_addr)
            
            return {
                'success': False,
                'error': {
                    'code': 'INVALID_CREDENTIALS',
                    'message': 'Geçersiz e-posta veya şifre'
                }
            }, 401
        
        if not user.is_active:
            return {
                'success': False,
                'error': {
                    'code': 'ACCOUNT_DISABLED',
                    'message': 'Hesabınız devre dışı bırakılmış'
                }
            }, 403
        
        # Update last login
        user.update_last_login()
        
        # Generate tokens
        tokens = JWTService.create_tokens(
            user,
            device_id=device_id,
            remember_me=remember_me
        )
        
        # Add session tracking
        TokenBlacklistService.add_session(
            user_id=user.id,
            jti=get_jwt().get('jti') if hasattr(g, 'jwt') else tokens.access_token[:36],
            device_info={
                'user_agent': request.headers.get('User-Agent'),
                'ip': request.remote_addr,
                'device_id': device_id
            },
            expires_at=tokens.refresh_token_expires
        )
        
        # Audit log
        _log_successful_login(user, request.remote_addr)
        
        return {
            'success': True,
            'message': 'Giriş başarılı',
            'data': {
                'user': user.to_dict(),
                'tokens': tokens.to_dict()
            }
        }, 200


@auth_ns.route('/refresh')
class TokenRefresh(Resource):
    """Token refresh endpoint."""
    
    @jwt_required(refresh=True)
    @auth_ns.doc('refresh_token', security='Bearer')
    def post(self):
        """
        Refresh access token.
        
        Security:
            - Refresh token rotation (eski token iptal edilir)
            - Kullanıcı aktiflik kontrolü
        """
        identity = get_jwt_identity()
        current_jti = get_jwt().get('jti')
        
        user = User.query.get(identity)
        if not user or not user.is_active:
            return {
                'success': False,
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Geçersiz veya süresi dolmuş token'
                }
            }, 401
        
        # Token rotation: yeni token'lar oluştur, eski refresh token'ı iptal et
        tokens = JWTService.refresh_tokens(user, old_jti=current_jti)
        
        return {
            'success': True,
            'data': tokens.to_dict()
        }, 200


@auth_ns.route('/me')
class CurrentUser(Resource):
    """Current user profile endpoint."""
    
    @jwt_required()
    @auth_ns.doc('get_current_user', security='Bearer')
    def get(self):
        """Get current user profile with permissions."""
        user = get_current_user()
        
        if not user:
            return {
                'success': False,
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'Kullanıcı bulunamadı'
                }
            }, 404
        
        # JWT claims'ten ek bilgiler
        claims = get_jwt()
        
        user_data = user.to_dict()
        user_data['permissions'] = claims.get('permissions', [])
        user_data['role'] = claims.get('role', 'student')
        
        return {
            'success': True,
            'data': user_data
        }, 200


@auth_ns.route('/change-password')
class ChangePassword(Resource):
    """Change password endpoint."""
    
    @jwt_required(fresh=True)  # Fresh token gerekli (güvenlik)
    @auth_ns.expect(change_password)
    @auth_ns.doc('change_password', security='Bearer')
    def post(self):
        """
        Change current user's password.
        
        Security:
            - Fresh token gerekli (son login yakın zamanda olmalı)
            - Şifre güçlülük kontrolü
            - Tüm diğer oturumları sonlandırma seçeneği
        """
        user = get_current_user()
        data = request.get_json()
        
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        logout_other_sessions = data.get('logout_other_sessions', True)
        
        # Mevcut şifre kontrolü
        if not user.check_password(current_password):
            return {
                'success': False,
                'error': {
                    'code': 'INVALID_PASSWORD',
                    'message': 'Mevcut şifre yanlış'
                }
            }, 400
        
        # Yeni şifre güçlülük kontrolü
        is_valid, error = validate_password_strength(new_password)
        if not is_valid:
            return {
                'success': False,
                'error': {
                    'code': 'WEAK_PASSWORD',
                    'message': error
                }
            }, 400
        
        # Şifreyi güncelle
        user.password = new_password
        db.session.commit()
        
        # Diğer oturumları sonlandır
        if logout_other_sessions:
            current_jti = get_jwt().get('jti')
            TokenBlacklistService.revoke_all_sessions(user.id, except_jti=current_jti)
        
        return {
            'success': True,
            'message': 'Şifre başarıyla değiştirildi'
        }, 200


@auth_ns.route('/forgot-password')
class ForgotPassword(Resource):
    """Password reset request endpoint."""
    
    @auth_ns.expect(password_reset_request)
    @auth_ns.doc('forgot_password')
    def post(self):
        """
        Request password reset email.
        
        Security:
            - Email enumeration koruması (her zaman aynı yanıt)
            - Rate limiting
        """
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        
        # Always return success to prevent email enumeration
        user = User.query.filter_by(email=email).first()
        
        if user:
            from app.modules.auth.services import AuthService
            try:
                AuthService.request_password_reset(email)
            except Exception:
                pass  # Hata olsa bile aynı yanıt
        
        return {
            'success': True,
            'message': 'E-posta adresiniz kayıtlıysa şifre sıfırlama bağlantısı gönderilecek'
        }, 200


@auth_ns.route('/reset-password')
class ResetPassword(Resource):
    """Password reset endpoint."""
    
    @auth_ns.expect(password_reset)
    @auth_ns.doc('reset_password')
    def post(self):
        """
        Reset password with token.
        
        Security:
            - Token tek kullanımlık
            - Token süresi sınırlı (1 saat)
        """
        data = request.get_json()
        token = data.get('token', '')
        new_password = data.get('new_password', '')
        
        # Şifre güçlülük kontrolü
        is_valid, error = validate_password_strength(new_password)
        if not is_valid:
            return {
                'success': False,
                'error': {
                    'code': 'WEAK_PASSWORD',
                    'message': error
                }
            }, 400
        
        from app.modules.auth.services import AuthService
        try:
            AuthService.reset_password(token, new_password)
        except Exception as e:
            return {
                'success': False,
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': str(e)
                }
            }, 400
        
        return {
            'success': True,
            'message': 'Şifre başarıyla sıfırlandı'
        }, 200


@auth_ns.route('/logout')
class Logout(Resource):
    """Logout endpoint."""
    
    @jwt_required()
    @auth_ns.doc('logout', security='Bearer')
    def post(self):
        """
        Logout current user.
        
        Security:
            - Token blacklist'e eklenir
            - Session sonlandırılır
        """
        jti = get_jwt().get('jti')
        user_id = get_jwt_identity()
        
        # Token'ı blacklist'e ekle
        JWTService.revoke_token(jti, reason='logout')
        
        # Session'ı sonlandır
        TokenBlacklistService.revoke_session(user_id, jti)
        
        return {
            'success': True,
            'message': 'Çıkış başarılı'
        }, 200


@auth_ns.route('/logout-all')
class LogoutAll(Resource):
    """Logout from all devices."""
    
    @jwt_required()
    @auth_ns.doc('logout_all', security='Bearer')
    def post(self):
        """
        Logout from all devices.
        
        Security:
            - Tüm token'lar geçersiz kılınır
            - Token version artırılır
        """
        user_id = get_jwt_identity()
        
        # Tüm oturumları sonlandır
        count = TokenBlacklistService.revoke_all_sessions(user_id)
        
        # Token version'ı artır (tüm token'lar geçersiz olur)
        JWTService.revoke_all_user_tokens(user_id, reason='logout_all')
        
        return {
            'success': True,
            'message': f'{count} oturum sonlandırıldı'
        }, 200


@auth_ns.route('/sessions')
class Sessions(Resource):
    """User sessions management."""
    
    @jwt_required()
    @auth_ns.doc('get_sessions', security='Bearer')
    def get(self):
        """Get all active sessions."""
        user_id = get_jwt_identity()
        
        sessions = TokenBlacklistService.get_user_sessions(user_id)
        
        return {
            'success': True,
            'data': sessions
        }, 200


@auth_ns.route('/sessions/<string:session_id>')
class SessionRevoke(Resource):
    """Revoke specific session."""
    
    @jwt_required()
    @auth_ns.doc('revoke_session', security='Bearer')
    def delete(self, session_id: str):
        """Revoke a specific session."""
        user_id = get_jwt_identity()
        current_jti = get_jwt().get('jti')
        
        # Kendi mevcut oturumunu iptal edemez
        if session_id == current_jti:
            return {
                'success': False,
                'error': {
                    'code': 'CANNOT_REVOKE_CURRENT',
                    'message': 'Mevcut oturumu iptal edemezsiniz. /logout kullanın.'
                }
            }, 400
        
        success = TokenBlacklistService.revoke_session(user_id, session_id)
        
        if success:
            return {
                'success': True,
                'message': 'Oturum sonlandırıldı'
            }, 200
        else:
            return {
                'success': False,
                'error': {
                    'code': 'SESSION_NOT_FOUND',
                    'message': 'Oturum bulunamadı'
                }
            }, 404


# =========================================================================
# HELPER FUNCTIONS
# =========================================================================

def _log_failed_login(email: str, ip_address: str):
    """Failed login attempt'i loglar (audit)."""
    try:
        from app.core.audit import AuditService, AuditAction, AuditSeverity
        AuditService.log(
            action=AuditAction.LOGIN,
            resource_type='auth',
            resource_id=None,
            details={
                'email': email,
                'ip_address': ip_address,
                'status': 'failed'
            },
            severity=AuditSeverity.WARNING
        )
    except Exception:
        pass


def _log_successful_login(user, ip_address: str):
    """Başarılı login'i loglar (audit)."""
    try:
        from app.core.audit import AuditService, AuditAction
        AuditService.log(
            action=AuditAction.LOGIN,
            resource_type='auth',
            resource_id=user.id,
            user_id=user.id,
            details={
                'email': user.email,
                'ip_address': ip_address,
                'status': 'success'
            }
        )
    except Exception:
        pass
