"""
Users Module - Schemas.

Kullanıcı serialization şemaları.
"""

from marshmallow import fields, validates, ValidationError, validate

from app.common.base_schema import BaseSchema, RequestSchema, Email, Password, PhoneNumber
from app.common.validators import validate_phone_tr


class UserSchema(BaseSchema):
    """Kullanıcı response şeması."""
    
    id = fields.Integer(dump_only=True)
    email = fields.Email(dump_only=True)
    first_name = fields.String(dump_only=True)
    last_name = fields.String(dump_only=True)
    full_name = fields.String(dump_only=True)
    phone = fields.String(dump_only=True)
    role = fields.String(dump_only=True)
    is_active = fields.Boolean(dump_only=True)
    is_verified = fields.Boolean(dump_only=True)
    is_locked = fields.Boolean(dump_only=True)
    force_password_change = fields.Boolean(dump_only=True)
    avatar_url = fields.String(dump_only=True)
    bio = fields.String(dump_only=True)
    last_login_at = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class UserCreateSchema(RequestSchema):
    """Kullanıcı oluşturma request şeması."""
    
    email = Email(required=True)
    password = Password(required=True)
    first_name = fields.String(required=True, validate=lambda x: len(x) >= 2)
    last_name = fields.String(required=True, validate=lambda x: len(x) >= 2)
    phone = fields.String(required=False, allow_none=True)
    role = fields.String(required=False, load_default='student')
    is_active = fields.Boolean(required=False, load_default=True)
    
    @validates('role')
    def validate_role(self, value):
        """Rol değerini doğrular."""
        allowed_roles = ['student', 'teacher', 'admin', 'super_admin']
        if value not in allowed_roles:
            raise ValidationError(f'Geçersiz rol. İzin verilen: {", ".join(allowed_roles)}')


class AdminUserCreateSchema(RequestSchema):
    """Admin tarafından kullanıcı oluşturma şeması."""
    
    email = Email(required=True)
    password = fields.String(required=False, allow_none=True)  # Opsiyonel, yoksa otomatik oluşturulur
    first_name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    last_name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    phone = fields.String(required=False, allow_none=True)
    role = fields.String(required=False, load_default='student')
    is_active = fields.Boolean(required=False, load_default=True)
    is_verified = fields.Boolean(required=False, load_default=False)
    send_email = fields.Boolean(required=False, load_default=True)  # Hoşgeldin e-postası
    
    @validates('role')
    def validate_role(self, value):
        """Rol değerini doğrular."""
        allowed_roles = ['student', 'teacher', 'admin', 'super_admin']
        if value not in allowed_roles:
            raise ValidationError(f'Geçersiz rol. İzin verilen: {", ".join(allowed_roles)}')


class BulkUserCreateSchema(RequestSchema):
    """Toplu kullanıcı oluşturma şeması."""
    
    users = fields.List(
        fields.Nested(AdminUserCreateSchema),
        required=True,
        validate=validate.Length(min=1, max=100)
    )


class UserUpdateSchema(RequestSchema):
    """Kullanıcı güncelleme request şeması."""
    
    email = Email(required=False)
    password = Password(required=False)
    first_name = fields.String(required=False, validate=lambda x: len(x) >= 2)
    last_name = fields.String(required=False, validate=lambda x: len(x) >= 2)
    phone = fields.String(required=False, allow_none=True)
    role = fields.String(required=False)
    is_active = fields.Boolean(required=False)
    is_verified = fields.Boolean(required=False)
    
    @validates('role')
    def validate_role(self, value):
        """Rol değerini doğrular."""
        allowed_roles = ['student', 'teacher', 'admin', 'super_admin']
        if value and value not in allowed_roles:
            raise ValidationError(f'Geçersiz rol. İzin verilen: {", ".join(allowed_roles)}')


class ProfileUpdateSchema(RequestSchema):
    """Profil güncelleme request şeması."""
    
    first_name = fields.String(required=False, validate=lambda x: len(x) >= 2)
    last_name = fields.String(required=False, validate=lambda x: len(x) >= 2)
    phone = fields.String(required=False, allow_none=True)
    bio = fields.String(required=False, allow_none=True, validate=lambda x: len(x) <= 500)
    avatar_url = fields.URL(required=False, allow_none=True)


class PasswordChangeSchema(RequestSchema):
    """Şifre değiştirme şeması."""
    
    old_password = fields.String(required=True)
    new_password = Password(required=True)
    
    @validates('new_password')
    def validate_new_password(self, value):
        """Yeni şifre kurallarını doğrular."""
        if len(value) < 8:
            raise ValidationError('Şifre en az 8 karakter olmalıdır')
        if not any(c.isupper() for c in value):
            raise ValidationError('Şifre en az bir büyük harf içermelidir')
        if not any(c.islower() for c in value):
            raise ValidationError('Şifre en az bir küçük harf içermelidir')
        if not any(c.isdigit() for c in value):
            raise ValidationError('Şifre en az bir rakam içermelidir')


class ForcePasswordChangeSchema(RequestSchema):
    """Zorunlu şifre değiştirme şeması (ilk giriş)."""
    
    new_password = Password(required=True)
    
    @validates('new_password')
    def validate_new_password(self, value):
        """Yeni şifre kurallarını doğrular."""
        if len(value) < 8:
            raise ValidationError('Şifre en az 8 karakter olmalıdır')
        if not any(c.isupper() for c in value):
            raise ValidationError('Şifre en az bir büyük harf içermelidir')
        if not any(c.islower() for c in value):
            raise ValidationError('Şifre en az bir küçük harf içermelidir')
        if not any(c.isdigit() for c in value):
            raise ValidationError('Şifre en az bir rakam içermelidir')


class UserListSchema(BaseSchema):
    """Kullanıcı listesi response şeması."""
    
    users = fields.Nested(UserSchema, many=True)
    page = fields.Integer()
    per_page = fields.Integer()
    total = fields.Integer()
    total_pages = fields.Integer()


class RoleSchema(BaseSchema):
    """Rol response şeması."""
    
    id = fields.Integer(dump_only=True)
    name = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    is_system = fields.Boolean(dump_only=True)
    permissions = fields.List(fields.String(), dump_only=True)
    user_count = fields.Integer(dump_only=True)


class RoleCreateSchema(RequestSchema):
    """Rol oluşturma şeması."""
    
    name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=50)
    )
    description = fields.String(
        required=False,
        allow_none=True,
        validate=validate.Length(max=500)
    )
    
    @validates('name')
    def validate_name(self, value):
        """Rol adı formatını doğrular."""
        import re
        if not re.match(r'^[a-z_]+$', value):
            raise ValidationError('Rol adı sadece küçük harf ve alt çizgi içerebilir')


class RoleUpdateSchema(RequestSchema):
    """Rol güncelleme şeması."""
    
    name = fields.String(
        required=False,
        validate=validate.Length(min=2, max=50)
    )
    description = fields.String(
        required=False,
        allow_none=True,
        validate=validate.Length(max=500)
    )
    
    @validates('name')
    def validate_name(self, value):
        """Rol adı formatını doğrular."""
        import re
        if value and not re.match(r'^[a-z_]+$', value):
            raise ValidationError('Rol adı sadece küçük harf ve alt çizgi içerebilir')


class PermissionSchema(BaseSchema):
    """Yetki response şeması."""
    
    id = fields.Integer(dump_only=True)
    name = fields.String(dump_only=True)
    resource = fields.String(dump_only=True)
    action = fields.String(dump_only=True)
    description = fields.String(dump_only=True)


class PermissionCreateSchema(RequestSchema):
    """Yetki oluşturma şeması."""
    
    name = fields.String(
        required=True,
        validate=validate.Regexp(
            r'^[a-z_]+:[a-z_]+$',
            error='Yetki adı "resource:action" formatında olmalı (örn: courses:create)'
        )
    )
    resource = fields.String(
        required=True,
        validate=validate.Length(min=2, max=50)
    )
    action = fields.String(
        required=True,
        validate=validate.OneOf(['create', 'read', 'update', 'delete', 'manage', 'export', 'import'])
    )
    description = fields.String(
        required=False,
        allow_none=True,
        validate=validate.Length(max=500)
    )
