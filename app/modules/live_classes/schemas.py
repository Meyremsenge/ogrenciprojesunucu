"""
Live Classes Module - Schemas.

Canlı ders serialization şemaları.
"""

from marshmallow import fields, validates, ValidationError

from app.common.base_schema import BaseSchema, RequestSchema


class LiveSessionSchema(BaseSchema):
    """Canlı ders response şeması."""
    
    id = fields.Integer(dump_only=True)
    title = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    course_id = fields.Integer(dump_only=True)
    topic_id = fields.Integer(dump_only=True)
    host_id = fields.Integer(dump_only=True)
    host_name = fields.String(dump_only=True)
    status = fields.String(dump_only=True)
    platform = fields.String(dump_only=True)
    meeting_url = fields.String(dump_only=True)
    meeting_password = fields.String(dump_only=True)
    scheduled_start = fields.DateTime(dump_only=True)
    scheduled_end = fields.DateTime(dump_only=True)
    actual_start = fields.DateTime(dump_only=True)
    actual_end = fields.DateTime(dump_only=True)
    duration_minutes = fields.Integer(dump_only=True)
    duration_actual = fields.Integer(dump_only=True)
    max_participants = fields.Integer(dump_only=True)
    participant_count = fields.Integer(dump_only=True)
    is_recording_enabled = fields.Boolean(dump_only=True)
    recording_url = fields.String(dump_only=True)
    is_upcoming = fields.Boolean(dump_only=True)
    can_join = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class LiveSessionCreateSchema(RequestSchema):
    """Canlı ders oluşturma request şeması."""
    
    title = fields.String(required=True, validate=lambda x: len(x) >= 3)
    description = fields.String(required=False, allow_none=True)
    course_id = fields.Integer(required=True)
    topic_id = fields.Integer(required=False, allow_none=True)
    platform = fields.String(required=False, load_default='zoom')
    meeting_url = fields.URL(required=True)
    meeting_id = fields.String(required=False, allow_none=True)
    meeting_password = fields.String(required=False, allow_none=True)
    scheduled_start = fields.DateTime(required=True)
    duration_minutes = fields.Integer(required=False, load_default=60)
    max_participants = fields.Integer(required=False, load_default=100)
    is_recording_enabled = fields.Boolean(required=False, load_default=True)
    
    @validates('platform')
    def validate_platform(self, value):
        allowed = ['zoom', 'google_meet', 'jitsi', 'custom']
        if value and value not in allowed:
            raise ValidationError(f'Geçersiz platform. İzin verilen: {", ".join(allowed)}')
    
    @validates('duration_minutes')
    def validate_duration(self, value):
        if value < 15 or value > 480:
            raise ValidationError('Süre 15-480 dakika arasında olmalı')


class LiveSessionUpdateSchema(RequestSchema):
    """Canlı ders güncelleme request şeması."""
    
    title = fields.String(required=False, validate=lambda x: len(x) >= 3)
    description = fields.String(required=False, allow_none=True)
    meeting_url = fields.URL(required=False)
    meeting_id = fields.String(required=False, allow_none=True)
    meeting_password = fields.String(required=False, allow_none=True)
    scheduled_start = fields.DateTime(required=False)
    duration_minutes = fields.Integer(required=False)
    max_participants = fields.Integer(required=False)
    recording_url = fields.URL(required=False, allow_none=True)


class AttendanceSchema(BaseSchema):
    """Katılım response şeması."""
    
    id = fields.Integer(dump_only=True)
    session_id = fields.Integer(dump_only=True)
    user_id = fields.Integer(dump_only=True)
    user_name = fields.String(dump_only=True)
    status = fields.String(dump_only=True)
    registered_at = fields.DateTime(dump_only=True)
    joined_at = fields.DateTime(dump_only=True)
    left_at = fields.DateTime(dump_only=True)
    duration_minutes = fields.Integer(dump_only=True)
    attendance_percentage = fields.Float(dump_only=True)
    join_count = fields.Integer(dump_only=True)
