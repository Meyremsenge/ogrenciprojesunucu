"""
Evaluations Module - Schemas.

Değerlendirme serialization şemaları.
"""

from marshmallow import fields, validates, ValidationError

from app.common.base_schema import BaseSchema, RequestSchema


class AssignmentSchema(BaseSchema):
    """Ödev response şeması."""
    
    id = fields.Integer(dump_only=True)
    title = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    instructions = fields.String(dump_only=True)
    course_id = fields.Integer(dump_only=True)
    topic_id = fields.Integer(dump_only=True)
    status = fields.String(dump_only=True)
    due_date = fields.DateTime(dump_only=True)
    max_score = fields.Float(dump_only=True)
    pass_score = fields.Float(dump_only=True)
    is_overdue = fields.Boolean(dump_only=True)
    is_available = fields.Boolean(dump_only=True)
    submission_count = fields.Integer(dump_only=True)
    average_score = fields.Float(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class AssignmentCreateSchema(RequestSchema):
    """Ödev oluşturma request şeması."""
    
    title = fields.String(required=True, validate=lambda x: len(x) >= 3)
    description = fields.String(required=False, allow_none=True)
    instructions = fields.String(required=False, allow_none=True)
    course_id = fields.Integer(required=True)
    topic_id = fields.Integer(required=False, allow_none=True)
    due_date = fields.DateTime(required=False, allow_none=True)
    available_from = fields.DateTime(required=False, allow_none=True)
    max_score = fields.Float(required=False, load_default=100.0)
    pass_score = fields.Float(required=False, load_default=50.0)
    allow_late_submission = fields.Boolean(required=False, load_default=False)
    late_penalty_percent = fields.Float(required=False, load_default=10.0)
    max_file_size_mb = fields.Integer(required=False, load_default=10)
    allowed_file_types = fields.String(required=False, load_default='pdf,doc,docx')


class SubmissionSchema(BaseSchema):
    """Gönderim response şeması."""
    
    id = fields.Integer(dump_only=True)
    assignment_id = fields.Integer(dump_only=True)
    user_id = fields.Integer(dump_only=True)
    submission_text = fields.String(dump_only=True)
    file_url = fields.String(dump_only=True)
    file_name = fields.String(dump_only=True)
    status = fields.String(dump_only=True)
    is_late = fields.Boolean(dump_only=True)
    score = fields.Float(dump_only=True)
    final_score = fields.Float(dump_only=True)
    feedback = fields.String(dump_only=True)
    submitted_at = fields.DateTime(dump_only=True)
    graded_at = fields.DateTime(dump_only=True)


class SubmissionCreateSchema(RequestSchema):
    """Gönderim oluşturma request şeması."""
    
    submission_text = fields.String(required=False, allow_none=True)
    file_url = fields.URL(required=False, allow_none=True)
    file_name = fields.String(required=False, allow_none=True)


class CoachingNoteSchema(BaseSchema):
    """Koçluk notu response şeması."""
    
    id = fields.Integer(dump_only=True)
    student_id = fields.Integer(dump_only=True)
    coach_id = fields.Integer(dump_only=True)
    course_id = fields.Integer(dump_only=True)
    title = fields.String(dump_only=True)
    content = fields.String(dump_only=True)
    note_type = fields.String(dump_only=True)
    is_visible_to_student = fields.Boolean(dump_only=True)
    follow_up_date = fields.DateTime(dump_only=True)
    is_follow_up_completed = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class CoachingNoteCreateSchema(RequestSchema):
    """Koçluk notu oluşturma request şeması."""
    
    student_id = fields.Integer(required=True)
    course_id = fields.Integer(required=False, allow_none=True)
    title = fields.String(required=True, validate=lambda x: len(x) >= 3)
    content = fields.String(required=True, validate=lambda x: len(x) >= 10)
    note_type = fields.String(required=False, load_default='general')
    is_visible_to_student = fields.Boolean(required=False, load_default=False)
    follow_up_date = fields.DateTime(required=False, allow_none=True)
    
    @validates('note_type')
    def validate_note_type(self, value):
        allowed = ['general', 'warning', 'praise', 'goal']
        if value and value not in allowed:
            raise ValidationError(f'Geçersiz not tipi. İzin verilen: {", ".join(allowed)}')


class PerformanceReviewSchema(BaseSchema):
    """Performans değerlendirme response şeması."""
    
    id = fields.Integer(dump_only=True)
    student_id = fields.Integer(dump_only=True)
    reviewer_id = fields.Integer(dump_only=True)
    course_id = fields.Integer(dump_only=True)
    period_start = fields.DateTime(dump_only=True)
    period_end = fields.DateTime(dump_only=True)
    overall_score = fields.Float(dump_only=True)
    attendance_rate = fields.Float(dump_only=True)
    assignment_completion_rate = fields.Float(dump_only=True)
    exam_average = fields.Float(dump_only=True)
    engagement_score = fields.Integer(dump_only=True)
    participation_score = fields.Integer(dump_only=True)
    improvement_score = fields.Integer(dump_only=True)
    strengths = fields.String(dump_only=True)
    areas_for_improvement = fields.String(dump_only=True)
    recommendations = fields.String(dump_only=True)
    is_published = fields.Boolean(dump_only=True)
    published_at = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class PerformanceReviewCreateSchema(RequestSchema):
    """Performans değerlendirme oluşturma request şeması."""
    
    student_id = fields.Integer(required=True)
    course_id = fields.Integer(required=False, allow_none=True)
    period_start = fields.DateTime(required=True)
    period_end = fields.DateTime(required=True)
    overall_score = fields.Float(required=False, allow_none=True)
    attendance_rate = fields.Float(required=False, allow_none=True)
    assignment_completion_rate = fields.Float(required=False, allow_none=True)
    exam_average = fields.Float(required=False, allow_none=True)
    engagement_score = fields.Integer(required=False, allow_none=True)
    participation_score = fields.Integer(required=False, allow_none=True)
    improvement_score = fields.Integer(required=False, allow_none=True)
    strengths = fields.String(required=False, allow_none=True)
    areas_for_improvement = fields.String(required=False, allow_none=True)
    recommendations = fields.String(required=False, allow_none=True)
    
    @validates('engagement_score')
    def validate_engagement(self, value):
        if value is not None and (value < 1 or value > 5):
            raise ValidationError('Katılım puanı 1-5 arasında olmalı')
    
    @validates('participation_score')
    def validate_participation(self, value):
        if value is not None and (value < 1 or value > 5):
            raise ValidationError('Katılım puanı 1-5 arasında olmalı')
    
    @validates('improvement_score')
    def validate_improvement(self, value):
        if value is not None and (value < 1 or value > 5):
            raise ValidationError('Gelişim puanı 1-5 arasında olmalı')
