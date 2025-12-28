"""
AI Module - Schemas.

Request/Response serialization şemaları.
"""

from marshmallow import fields, validates, ValidationError, validate

from app.common.base_schema import BaseSchema, RequestSchema


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class HintRequestSchema(RequestSchema):
    """Soru ipucu isteği şeması."""
    
    question_id = fields.Integer(required=False, allow_none=True)
    question_text = fields.String(required=True, validate=validate.Length(min=10, max=2000))
    subject = fields.String(required=False, validate=validate.Length(max=100))
    hint_level = fields.Integer(required=False, load_default=1, validate=validate.Range(min=1, max=3))
    
    @validates('hint_level')
    def validate_hint_level(self, value):
        if value not in [1, 2, 3]:
            raise ValidationError('İpucu seviyesi 1, 2 veya 3 olmalıdır.')


class TopicExplanationRequestSchema(RequestSchema):
    """Konu açıklaması isteği şeması."""
    
    topic = fields.String(required=True, validate=validate.Length(min=2, max=200))
    subject = fields.String(required=False, validate=validate.Length(max=100))
    difficulty = fields.String(
        required=False, 
        load_default='medium',
        validate=validate.OneOf(['basic', 'medium', 'advanced'])
    )
    learning_style = fields.String(
        required=False,
        validate=validate.OneOf(['visual', 'auditory', 'reading', 'kinesthetic'])
    )
    context = fields.String(required=False, validate=validate.Length(max=500))


class StudyPlanRequestSchema(RequestSchema):
    """Çalışma planı isteği şeması."""
    
    target_date = fields.Date(required=False)
    target_exam = fields.String(required=False, validate=validate.Length(max=100))
    daily_hours = fields.Float(required=False, load_default=2.0, validate=validate.Range(min=0.5, max=8))
    weak_topics = fields.List(fields.String(), required=False)
    preferred_times = fields.List(
        fields.String(validate=validate.OneOf(['morning', 'afternoon', 'evening', 'night'])),
        required=False
    )
    include_breaks = fields.Boolean(required=False, load_default=True)


class AnswerEvaluationRequestSchema(RequestSchema):
    """Cevap değerlendirme isteği şeması."""
    
    question_id = fields.Integer(required=False)
    question_text = fields.String(required=True, validate=validate.Length(min=10, max=2000))
    student_answer = fields.String(required=True, validate=validate.Length(min=1, max=5000))
    expected_answer = fields.String(required=False, validate=validate.Length(max=5000))
    max_score = fields.Float(required=False, load_default=10.0, validate=validate.Range(min=1, max=100))
    rubric = fields.Dict(required=False)
    subject = fields.String(required=False, validate=validate.Length(max=100))


class PerformanceAnalysisRequestSchema(RequestSchema):
    """Performans analizi isteği şeması."""
    
    student_id = fields.Integer(required=False)  # Öğretmen/Admin için
    period_days = fields.Integer(required=False, load_default=30, validate=validate.Range(min=7, max=365))
    include_recommendations = fields.Boolean(required=False, load_default=True)
    include_predictions = fields.Boolean(required=False, load_default=True)


class QuestionGenerationRequestSchema(RequestSchema):
    """Soru oluşturma isteği şeması."""
    
    topic = fields.String(required=True, validate=validate.Length(min=2, max=200))
    subject = fields.String(required=False, validate=validate.Length(max=100))
    difficulty = fields.String(
        required=False,
        load_default='medium',
        validate=validate.OneOf(['easy', 'medium', 'hard'])
    )
    question_type = fields.String(
        required=False,
        load_default='multiple_choice',
        validate=validate.OneOf(['multiple_choice', 'true_false', 'open_ended', 'fill_blank'])
    )
    count = fields.Integer(required=False, load_default=5, validate=validate.Range(min=1, max=20))
    include_answers = fields.Boolean(required=False, load_default=True)


class ContentEnhancementRequestSchema(RequestSchema):
    """İçerik zenginleştirme isteği şeması."""
    
    content = fields.String(required=True, validate=validate.Length(min=50, max=10000))
    content_type = fields.String(
        required=False,
        load_default='lesson',
        validate=validate.OneOf(['lesson', 'summary', 'exercise', 'example'])
    )
    target_level = fields.String(
        required=False,
        validate=validate.OneOf(['basic', 'intermediate', 'advanced'])
    )
    add_examples = fields.Boolean(required=False, load_default=True)
    add_summary = fields.Boolean(required=False, load_default=True)


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class HintResponseSchema(BaseSchema):
    """Soru ipucu yanıt şeması."""
    
    hint_level = fields.Integer()
    hint_text = fields.String()
    next_hint_available = fields.Boolean()
    hints_remaining = fields.Integer()
    related_topics = fields.List(fields.String())
    is_mock = fields.Boolean(attribute='mock')


class TopicExplanationResponseSchema(BaseSchema):
    """Konu açıklaması yanıt şeması."""
    
    topic = fields.String()
    explanation = fields.String()
    examples = fields.List(fields.Dict())
    visual_suggestion = fields.String()
    difficulty_level = fields.String()
    related_topics = fields.List(fields.String())
    is_mock = fields.Boolean(attribute='mock')


class StudyPlanResponseSchema(BaseSchema):
    """Çalışma planı yanıt şeması."""
    
    plan_id = fields.String()
    duration_weeks = fields.Integer()
    weekly_hours = fields.Float()
    schedule = fields.Dict()
    milestones = fields.List(fields.Dict())
    focus_areas = fields.List(fields.String())
    is_mock = fields.Boolean(attribute='mock')


class AnswerEvaluationResponseSchema(BaseSchema):
    """Cevap değerlendirme yanıt şeması."""
    
    suggested_score = fields.Float()
    max_score = fields.Float()
    evaluation = fields.Dict()
    overall_feedback = fields.String()
    improvement_suggestions = fields.List(fields.String())
    confidence_level = fields.Float()
    is_mock = fields.Boolean(attribute='mock')


class PerformanceAnalysisResponseSchema(BaseSchema):
    """Performans analizi yanıt şeması."""
    
    student_id = fields.Integer()
    analysis_period = fields.String()
    strengths = fields.List(fields.String())
    weaknesses = fields.List(fields.String())
    recommendations = fields.List(fields.String())
    predicted_success_rate = fields.Float()
    trend = fields.String()
    detailed_analysis = fields.Dict()
    is_mock = fields.Boolean(attribute='mock')


class QuestionGenerationResponseSchema(BaseSchema):
    """Soru oluşturma yanıt şeması."""
    
    topic = fields.String()
    questions = fields.List(fields.Dict())
    count = fields.Integer()
    difficulty = fields.String()
    is_mock = fields.Boolean(attribute='mock')


class ContentEnhancementResponseSchema(BaseSchema):
    """İçerik zenginleştirme yanıt şeması."""
    
    original_length = fields.Integer()
    enhanced_content = fields.String()
    added_examples = fields.List(fields.Dict())
    summary = fields.String()
    key_points = fields.List(fields.String())
    is_mock = fields.Boolean(attribute='mock')


class QuotaResponseSchema(BaseSchema):
    """Kota durumu yanıt şeması."""
    
    daily_tokens_used = fields.Integer()
    daily_tokens_limit = fields.Integer()
    monthly_tokens_used = fields.Integer()
    monthly_tokens_limit = fields.Integer()
    daily_requests_count = fields.Integer()
    daily_requests_limit = fields.Integer()
    monthly_requests_count = fields.Integer()
    monthly_requests_limit = fields.Integer()
    daily_reset_at = fields.String()
    monthly_reset_at = fields.String()
    is_blocked = fields.Boolean()
    blocked_until = fields.String()


class UsageHistoryItemSchema(BaseSchema):
    """Kullanım geçmişi öğesi şeması."""
    
    id = fields.Integer()
    feature = fields.String()
    tokens_used = fields.Integer()
    response_summary = fields.String()
    processing_time_ms = fields.Integer()
    is_mock = fields.Boolean()
    created_at = fields.DateTime()


class AIFeatureSchema(BaseSchema):
    """AI özellik bilgisi şeması."""
    
    name = fields.String()
    description = fields.String()
    token_cost = fields.Integer()
    available = fields.Boolean()
    cooldown_seconds = fields.Integer()
