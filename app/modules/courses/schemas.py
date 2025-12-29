"""
Courses Module - Schemas.

Kurs serialization şemaları.
"""

from marshmallow import fields, validates, ValidationError

from app.common.base_schema import BaseSchema, RequestSchema, Slug


class CourseSchema(BaseSchema):
    """Kurs response şeması."""
    
    id = fields.Integer(dump_only=True)
    title = fields.String(dump_only=True)
    slug = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    short_description = fields.String(dump_only=True)
    thumbnail_url = fields.URL(dump_only=True)
    category = fields.String(dump_only=True)
    status = fields.String(dump_only=True)
    level = fields.String(dump_only=True)
    teacher_id = fields.Integer(dump_only=True)
    teacher_name = fields.String(dump_only=True)
    total_duration = fields.Integer(dump_only=True)
    total_lessons = fields.Integer(dump_only=True)
    enrollment_count = fields.Integer(dump_only=True)
    average_rating = fields.Float(dump_only=True)
    is_published = fields.Boolean(dump_only=True)
    published_at = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class CourseCreateSchema(RequestSchema):
    """Kurs oluşturma request şeması."""
    
    title = fields.String(required=True, validate=lambda x: len(x) >= 3)
    description = fields.String(required=False, allow_none=True)
    short_description = fields.String(required=False, allow_none=True, validate=lambda x: len(x) <= 500)
    thumbnail_url = fields.URL(required=False, allow_none=True)
    category = fields.String(required=False, allow_none=True)
    level = fields.String(required=False, load_default='beginner')
    tags = fields.String(required=False, allow_none=True)
    
    @validates('level')
    def validate_level(self, value):
        allowed = ['beginner', 'intermediate', 'advanced']
        if value and value not in allowed:
            raise ValidationError(f'Geçersiz seviye. İzin verilen: {", ".join(allowed)}')


class CourseUpdateSchema(RequestSchema):
    """Kurs güncelleme request şeması."""
    
    title = fields.String(required=False, validate=lambda x: len(x) >= 3)
    description = fields.String(required=False, allow_none=True)
    short_description = fields.String(required=False, allow_none=True)
    thumbnail_url = fields.URL(required=False, allow_none=True)
    category = fields.String(required=False, allow_none=True)
    level = fields.String(required=False)
    tags = fields.String(required=False, allow_none=True)


class TopicSchema(BaseSchema):
    """Konu response şeması."""
    
    id = fields.Integer(dump_only=True)
    title = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    order = fields.Integer(dump_only=True)
    course_id = fields.Integer(dump_only=True)
    is_free = fields.Boolean(dump_only=True)
    is_published = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class TopicCreateSchema(RequestSchema):
    """Konu oluşturma request şeması."""
    
    title = fields.String(required=True, validate=lambda x: len(x) >= 2)
    description = fields.String(required=False, allow_none=True)
    is_free = fields.Boolean(required=False, load_default=False)


class EnrollmentSchema(BaseSchema):
    """Kayıt response şeması."""
    
    id = fields.Integer(dump_only=True)
    user_id = fields.Integer(dump_only=True)
    course_id = fields.Integer(dump_only=True)
    status = fields.String(dump_only=True)
    progress_percentage = fields.Float(dump_only=True)
    completed_lessons = fields.Integer(dump_only=True)
    last_accessed_at = fields.DateTime(dump_only=True)
    completed_at = fields.DateTime(dump_only=True)
    certificate_issued = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
