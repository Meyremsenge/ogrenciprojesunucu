"""
Auth Module - Schemas.

Request/Response serialization şemaları.
"""

from marshmallow import fields, validates, validates_schema, ValidationError

from app.common.base_schema import BaseSchema, RequestSchema, Email, Password


class LoginSchema(RequestSchema):
    """Login request şeması."""
    
    email = Email(required=True)
    password = fields.String(required=True, load_only=True)


class RegisterSchema(RequestSchema):
    """Register request şeması."""
    
    email = Email(required=True)
    password = Password(required=True)
    password_confirm = fields.String(required=True, load_only=True)
    first_name = fields.String(required=True, validate=lambda x: len(x) >= 2)
    last_name = fields.String(required=True, validate=lambda x: len(x) >= 2)
    phone = fields.String(required=False, allow_none=True)
    
    @validates_schema
    def validate_passwords(self, data, **kwargs):
        """Şifrelerin eşleştiğini kontrol eder."""
        if data.get('password') != data.get('password_confirm'):
            raise ValidationError('Şifreler eşleşmiyor', field_name='password_confirm')


class TokenRefreshSchema(RequestSchema):
    """Token refresh request şeması."""
    
    refresh_token = fields.String(required=True)


class PasswordResetRequestSchema(RequestSchema):
    """Şifre sıfırlama isteği şeması."""
    
    email = Email(required=True)


class PasswordResetSchema(RequestSchema):
    """Şifre sıfırlama şeması."""
    
    token = fields.String(required=True)
    password = Password(required=True)
    password_confirm = fields.String(required=True, load_only=True)
    
    @validates_schema
    def validate_passwords(self, data, **kwargs):
        """Şifrelerin eşleştiğini kontrol eder."""
        if data.get('password') != data.get('password_confirm'):
            raise ValidationError('Şifreler eşleşmiyor', field_name='password_confirm')


class ChangePasswordSchema(RequestSchema):
    """Şifre değiştirme şeması."""
    
    current_password = fields.String(required=True, load_only=True)
    new_password = Password(required=True)
    new_password_confirm = fields.String(required=True, load_only=True)
    
    @validates_schema
    def validate_passwords(self, data, **kwargs):
        """Şifrelerin eşleştiğini kontrol eder."""
        if data.get('new_password') != data.get('new_password_confirm'):
            raise ValidationError('Şifreler eşleşmiyor', field_name='new_password_confirm')
        
        if data.get('current_password') == data.get('new_password'):
            raise ValidationError(
                'Yeni şifre mevcut şifreden farklı olmalı',
                field_name='new_password'
            )


class TokenResponseSchema(BaseSchema):
    """Token response şeması."""
    
    access_token = fields.String(required=True)
    refresh_token = fields.String(required=False)
    expires_in = fields.Integer(required=True)
    token_type = fields.String(dump_default='Bearer')


class AuthUserSchema(BaseSchema):
    """Authenticated user response şeması."""
    
    id = fields.Integer(dump_only=True)
    email = fields.Email(dump_only=True)
    first_name = fields.String(dump_only=True)
    last_name = fields.String(dump_only=True)
    full_name = fields.String(dump_only=True)
    role = fields.String(dump_only=True)
    is_active = fields.Boolean(dump_only=True)
    email_verified = fields.Boolean(dump_only=True)
    last_login = fields.DateTime(dump_only=True)
