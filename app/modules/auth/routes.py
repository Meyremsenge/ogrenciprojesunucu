"""
Auth Module - API Routes.

Kimlik doğrulama endpoint'leri.
"""

from flask import request, g
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)

from app.modules.auth import auth_bp
from app.modules.auth.services import AuthService
from app.modules.auth.schemas import (
    LoginSchema,
    RegisterSchema,
    TokenRefreshSchema,
    PasswordResetRequestSchema,
    PasswordResetSchema,
    ChangePasswordSchema
)
from app.core.responses import success_response, error_response, created_response
from app.core.decorators import validate_json, handle_exceptions, rate_limit


@auth_bp.route('/register', methods=['POST'])
@handle_exceptions
@rate_limit(limit=5, period=300)  # 5 kayıt / 5 dakika
@validate_json(RegisterSchema)
def register():
    """
    Yeni kullanıcı kaydı.
    
    ---
    tags:
      - Auth
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/RegisterRequest'
    responses:
      201:
        description: Kayıt başarılı
      400:
        description: Validation hatası
      409:
        description: E-posta zaten kayıtlı
    """
    data = g.validated_data
    
    user = AuthService.register(
        email=data['email'],
        password=data['password'],
        first_name=data['first_name'],
        last_name=data['last_name'],
        phone=data.get('phone')
    )
    
    return created_response(
        data={'user': user.to_dict()},
        message='Kayıt başarılı. Lütfen e-posta adresinizi doğrulayın.'
    )


@auth_bp.route('/login', methods=['POST'])
@handle_exceptions
@rate_limit(limit=5, period=60)  # 5 deneme / dakika
@validate_json(LoginSchema)
def login():
    """
    Kullanıcı girişi.
    
    ---
    tags:
      - Auth
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/LoginRequest'
    responses:
      200:
        description: Giriş başarılı
      401:
        description: Geçersiz kimlik bilgileri
    """
    data = g.validated_data
    
    result = AuthService.login(
        email=data['email'],
        password=data['password']
    )
    
    return success_response(
        data={
            'access_token': result['access_token'],
            'refresh_token': result['refresh_token'],
            'user': result['user'].to_dict(),
            'expires_in': result['expires_in']
        },
        message='Giriş başarılı'
    )


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
@handle_exceptions
def logout():
    """
    Kullanıcı çıkışı.
    
    Token'ı blacklist'e ekler.
    
    ---
    tags:
      - Auth
    security:
      - bearerAuth: []
    responses:
      200:
        description: Çıkış başarılı
    """
    jti = get_jwt()['jti']
    AuthService.logout(jti)
    
    return success_response(message='Çıkış başarılı')


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@handle_exceptions
def refresh():
    """
    Access token yenileme.
    
    ---
    tags:
      - Auth
    security:
      - bearerAuth: []
    responses:
      200:
        description: Token yenilendi
    """
    user_id = get_jwt_identity()
    result = AuthService.refresh_token(user_id)
    
    return success_response(
        data={
            'access_token': result['access_token'],
            'expires_in': result['expires_in']
        },
        message='Token yenilendi'
    )


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_current_user():
    """
    Mevcut kullanıcı bilgileri.
    
    ---
    tags:
      - Auth
    security:
      - bearerAuth: []
    responses:
      200:
        description: Kullanıcı bilgileri
    """
    user_id = get_jwt_identity()
    user = AuthService.get_current_user(user_id)
    
    return success_response(data={'user': user.to_dict()})


@auth_bp.route('/password/reset-request', methods=['POST'])
@handle_exceptions
@rate_limit(limit=3, period=3600)  # 3 istek / saat
@validate_json(PasswordResetRequestSchema)
def request_password_reset():
    """
    Şifre sıfırlama isteği.
    
    ---
    tags:
      - Auth
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/PasswordResetRequest'
    responses:
      200:
        description: E-posta gönderildi (her durumda)
    """
    data = g.validated_data
    
    # Her durumda aynı mesaj (güvenlik için)
    AuthService.request_password_reset(data['email'])
    
    return success_response(
        message='Şifre sıfırlama bağlantısı e-posta adresinize gönderildi'
    )


@auth_bp.route('/password/reset', methods=['POST'])
@handle_exceptions
@validate_json(PasswordResetSchema)
def reset_password():
    """
    Şifre sıfırlama.
    
    ---
    tags:
      - Auth
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/PasswordReset'
    responses:
      200:
        description: Şifre değiştirildi
      400:
        description: Geçersiz veya süresi dolmuş token
    """
    data = g.validated_data
    
    AuthService.reset_password(
        token=data['token'],
        new_password=data['password']
    )
    
    return success_response(message='Şifreniz başarıyla değiştirildi')


@auth_bp.route('/password/change', methods=['POST'])
@jwt_required()
@handle_exceptions
@validate_json(ChangePasswordSchema)
def change_password():
    """
    Şifre değiştirme (giriş yapmış kullanıcı için).
    
    ---
    tags:
      - Auth
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ChangePassword'
    responses:
      200:
        description: Şifre değiştirildi
      400:
        description: Mevcut şifre yanlış
    """
    user_id = get_jwt_identity()
    data = g.validated_data
    
    AuthService.change_password(
        user_id=user_id,
        current_password=data['current_password'],
        new_password=data['new_password']
    )
    
    return success_response(message='Şifreniz başarıyla değiştirildi')


@auth_bp.route('/verify-email/<token>', methods=['GET'])
@handle_exceptions
def verify_email(token: str):
    """
    E-posta doğrulama.
    
    ---
    tags:
      - Auth
    parameters:
      - name: token
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: E-posta doğrulandı
      400:
        description: Geçersiz token
    """
    AuthService.verify_email(token)
    
    return success_response(message='E-posta adresiniz başarıyla doğrulandı')


@auth_bp.route('/resend-verification', methods=['POST'])
@jwt_required()
@handle_exceptions
@rate_limit(limit=3, period=3600)  # 3 istek / saat
def resend_verification():
    """
    E-posta doğrulama bağlantısını yeniden gönder.
    
    ---
    tags:
      - Auth
    security:
      - bearerAuth: []
    responses:
      200:
        description: E-posta gönderildi
    """
    user_id = get_jwt_identity()
    AuthService.resend_verification_email(user_id)
    
    return success_response(message='Doğrulama e-postası gönderildi')
