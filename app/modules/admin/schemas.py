"""
Admin Module - Schemas.

Marshmallow validasyon şemaları.
"""

from marshmallow import Schema, fields, validate, validates, ValidationError, post_load


# =============================================================================
# User Management Schemas
# =============================================================================

class UserCreateSchema(Schema):
    """Kullanıcı oluşturma şeması."""
    
    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.Str(
        required=False,
        validate=validate.Length(min=8, max=128),
        load_only=True
    )
    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    phone = fields.Str(validate=validate.Length(max=20))
    role = fields.Str(
        validate=validate.OneOf(['student', 'teacher', 'admin', 'super_admin']),
        load_default='student'
    )
    is_active = fields.Bool(load_default=True)
    is_verified = fields.Bool(load_default=False)
    force_password_change = fields.Bool(load_default=True)


class UserUpdateSchema(Schema):
    """Kullanıcı güncelleme şeması."""
    
    email = fields.Email(validate=validate.Length(max=255))
    first_name = fields.Str(validate=validate.Length(min=1, max=100))
    last_name = fields.Str(validate=validate.Length(min=1, max=100))
    phone = fields.Str(validate=validate.Length(max=20))
    role = fields.Str(validate=validate.OneOf(['student', 'teacher', 'admin', 'super_admin']))
    is_active = fields.Bool()
    is_verified = fields.Bool()


class RoleChangeSchema(Schema):
    """Rol değiştirme şeması."""
    
    role = fields.Str(
        required=True,
        validate=validate.OneOf(['student', 'teacher', 'admin', 'super_admin'])
    )


class PasswordResetSchema(Schema):
    """Şifre sıfırlama şeması."""
    
    new_password = fields.Str(validate=validate.Length(min=8, max=128))


class UserBulkActionSchema(Schema):
    """Toplu kullanıcı işlemi şeması."""
    
    user_ids = fields.List(
        fields.Int(),
        required=True,
        validate=validate.Length(min=1, max=100)
    )
    action = fields.Str(
        required=True,
        validate=validate.OneOf(['activate', 'deactivate', 'delete', 'change_role'])
    )
    new_role = fields.Str(
        validate=validate.OneOf(['student', 'teacher', 'admin', 'super_admin'])
    )
    
    @validates('new_role')
    def validate_new_role(self, value):
        """change_role action'ı için new_role zorunlu."""
        pass  # Post-load'da kontrol edilecek
    
    @post_load
    def validate_action_params(self, data, **kwargs):
        if data['action'] == 'change_role' and not data.get('new_role'):
            raise ValidationError('change_role için new_role gereklidir', 'new_role')
        return data


# =============================================================================
# Content Approval Schemas
# =============================================================================

class ContentApprovalSchema(Schema):
    """İçerik onaylama şeması."""
    
    notes = fields.Str(validate=validate.Length(max=1000))


class ContentRejectSchema(Schema):
    """İçerik reddetme şeması."""
    
    reason = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100)
    )
    details = fields.Str(validate=validate.Length(max=2000))


class ContentSubmitSchema(Schema):
    """İçerik onaya gönderme şeması."""
    
    content_type = fields.Str(
        required=True,
        validate=validate.OneOf(['video', 'document', 'course'])
    )
    content_id = fields.Int(required=True)
    priority = fields.Int(validate=validate.Range(min=0, max=2), load_default=0)


# =============================================================================
# Package Management Schemas
# =============================================================================

class PackageCreateSchema(Schema):
    """Paket oluşturma şeması."""
    
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    slug = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str()
    short_description = fields.Str(validate=validate.Length(max=255))
    
    package_type = fields.Str(
        validate=validate.OneOf(['monthly', 'quarterly', 'yearly', 'lifetime']),
        load_default='monthly'
    )
    duration_days = fields.Int(validate=validate.Range(min=0), load_default=30)
    
    price = fields.Decimal(required=True, places=2, validate=validate.Range(min=0))
    discount_price = fields.Decimal(places=2, validate=validate.Range(min=0))
    currency = fields.Str(validate=validate.Length(max=3), load_default='TRY')
    
    features = fields.List(fields.Str(), load_default=[])
    
    max_courses = fields.Int(validate=validate.Range(min=0))
    max_downloads = fields.Int(validate=validate.Range(min=0))
    max_live_sessions = fields.Int(validate=validate.Range(min=0))
    ai_questions_per_day = fields.Int(validate=validate.Range(min=0), load_default=0)
    ai_questions_per_month = fields.Int(validate=validate.Range(min=0), load_default=0)
    
    course_ids = fields.List(fields.Int(), load_default=[])
    category_ids = fields.List(fields.Int(), load_default=[])
    all_courses_access = fields.Bool(load_default=False)
    
    is_published = fields.Bool(load_default=False)
    is_featured = fields.Bool(load_default=False)
    display_order = fields.Int(load_default=0)


class PackageUpdateSchema(Schema):
    """Paket güncelleme şeması."""
    
    name = fields.Str(validate=validate.Length(min=1, max=100))
    slug = fields.Str(validate=validate.Length(min=1, max=100))
    description = fields.Str()
    short_description = fields.Str(validate=validate.Length(max=255))
    
    package_type = fields.Str(
        validate=validate.OneOf(['monthly', 'quarterly', 'yearly', 'lifetime'])
    )
    duration_days = fields.Int(validate=validate.Range(min=0))
    
    price = fields.Decimal(places=2, validate=validate.Range(min=0))
    discount_price = fields.Decimal(places=2, validate=validate.Range(min=0), allow_none=True)
    currency = fields.Str(validate=validate.Length(max=3))
    
    features = fields.List(fields.Str())
    
    max_courses = fields.Int(validate=validate.Range(min=0), allow_none=True)
    max_downloads = fields.Int(validate=validate.Range(min=0), allow_none=True)
    max_live_sessions = fields.Int(validate=validate.Range(min=0), allow_none=True)
    ai_questions_per_day = fields.Int(validate=validate.Range(min=0))
    ai_questions_per_month = fields.Int(validate=validate.Range(min=0))
    
    course_ids = fields.List(fields.Int())
    category_ids = fields.List(fields.Int())
    all_courses_access = fields.Bool()
    
    status = fields.Str(validate=validate.OneOf(['active', 'inactive', 'archived']))
    is_published = fields.Bool()
    is_featured = fields.Bool()
    display_order = fields.Int()


class PackageAssignSchema(Schema):
    """Paket atama şeması."""
    
    package_id = fields.Int(required=True)
    user_id = fields.Int(required=True)
    duration_days = fields.Int(validate=validate.Range(min=1))
    amount = fields.Decimal(places=2, validate=validate.Range(min=0), load_default=0)
    notes = fields.Str(validate=validate.Length(max=500))


# =============================================================================
# System Settings Schemas
# =============================================================================

class SettingUpdateSchema(Schema):
    """Ayar güncelleme şeması."""
    
    value = fields.Raw(required=True)


class SettingBulkUpdateSchema(Schema):
    """Toplu ayar güncelleme şeması."""
    
    settings = fields.Dict(
        keys=fields.Str(),
        values=fields.Raw(),
        required=True
    )


# =============================================================================
# Announcement Schemas
# =============================================================================

class AnnouncementCreateSchema(Schema):
    """Duyuru oluşturma şeması."""
    
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    content = fields.Str(required=True, validate=validate.Length(min=1))
    announcement_type = fields.Str(
        validate=validate.OneOf(['info', 'warning', 'success', 'error']),
        load_default='info'
    )
    
    starts_at = fields.DateTime()
    ends_at = fields.DateTime()
    
    target_roles = fields.List(
        fields.Str(validate=validate.OneOf(['student', 'teacher', 'admin', 'super_admin'])),
        load_default=[]
    )
    target_user_ids = fields.List(fields.Int(), load_default=[])
    
    is_active = fields.Bool(load_default=True)
    is_dismissible = fields.Bool(load_default=True)
    show_on_dashboard = fields.Bool(load_default=True)
    show_on_login = fields.Bool(load_default=False)


class AnnouncementUpdateSchema(Schema):
    """Duyuru güncelleme şeması."""
    
    title = fields.Str(validate=validate.Length(min=1, max=200))
    content = fields.Str(validate=validate.Length(min=1))
    announcement_type = fields.Str(
        validate=validate.OneOf(['info', 'warning', 'success', 'error'])
    )
    
    starts_at = fields.DateTime(allow_none=True)
    ends_at = fields.DateTime(allow_none=True)
    
    target_roles = fields.List(
        fields.Str(validate=validate.OneOf(['student', 'teacher', 'admin', 'super_admin']))
    )
    target_user_ids = fields.List(fields.Int())
    
    is_active = fields.Bool()
    is_dismissible = fields.Bool()
    show_on_dashboard = fields.Bool()
    show_on_login = fields.Bool()
