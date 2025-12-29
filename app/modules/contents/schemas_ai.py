"""
Contents Module - AI Şemaları.

AI destekli içerik endpoint'leri için request/response şemaları.
"""

from marshmallow import Schema, fields, validate, validates, ValidationError


# =============================================================================
# Request Schemas
# =============================================================================

class ContentAIBaseSchema(Schema):
    """AI içerik istekleri için base schema."""
    content_id = fields.Integer(required=True)
    content_type = fields.String(
        required=True,
        validate=validate.OneOf(['video', 'document'])
    )


class ExplainContentRequestSchema(ContentAIBaseSchema):
    """İçerik açıklama isteği."""
    specific_part = fields.String(
        required=False,
        validate=validate.Length(max=500),
        metadata={'description': 'Belirli bir bölümün açıklanmasını iste'}
    )
    level = fields.String(
        required=False,
        validate=validate.OneOf(['beginner', 'intermediate', 'advanced']),
        load_default='intermediate',
        metadata={'description': 'Açıklama seviyesi'}
    )


class SimplifyContentRequestSchema(ContentAIBaseSchema):
    """İçerik sadeleştirme isteği."""
    target_audience = fields.String(
        required=False,
        validate=validate.OneOf(['elementary', 'middle_school', 'high_school', 'university']),
        load_default='high_school',
        metadata={'description': 'Hedef kitle'}
    )


class SuggestExamplesRequestSchema(ContentAIBaseSchema):
    """Örnek önerme isteği."""
    example_count = fields.Integer(
        required=False,
        validate=validate.Range(min=1, max=10),
        load_default=3,
        metadata={'description': 'İstenen örnek sayısı'}
    )


class ContentQuestionRequestSchema(ContentAIBaseSchema):
    """İçerik hakkında soru sorma."""
    question = fields.String(
        required=True,
        validate=validate.Length(min=5, max=1000),
        metadata={'description': 'Sorulacak soru'}
    )


class SummarizeContentRequestSchema(ContentAIBaseSchema):
    """İçerik özetleme isteği."""
    summary_length = fields.String(
        required=False,
        validate=validate.OneOf(['short', 'medium', 'long']),
        load_default='medium',
        metadata={'description': 'Özet uzunluğu'}
    )


class CreateSuggestionRequestSchema(ContentAIBaseSchema):
    """AI öneri oluşturma isteği (öğretmen/admin için)."""
    enhancement_type = fields.String(
        required=True,
        validate=validate.OneOf(['examples', 'quiz', 'summary', 'simplified']),
        metadata={'description': 'Öneri tipi'}
    )
    details = fields.Dict(
        required=False,
        keys=fields.String(),
        values=fields.Raw(),
        metadata={'description': 'Ek detaylar (örn: question_count)'}
    )


class ReviewSuggestionRequestSchema(Schema):
    """AI öneri inceleme isteği (admin için)."""
    action = fields.String(
        required=True,
        validate=validate.OneOf(['approve', 'reject']),
        metadata={'description': 'Onay veya red'}
    )
    notes = fields.String(
        required=False,
        validate=validate.Length(max=1000),
        metadata={'description': 'İnceleme notları'}
    )
    rejection_reason = fields.String(
        required=False,
        validate=validate.Length(max=500),
        metadata={'description': 'Red nedeni (reject durumunda)'}
    )
    
    @validates('rejection_reason')
    def validate_rejection_reason(self, value):
        """Red durumunda neden zorunlu."""
        # Bu validation schema seviyesinde yapılamaz, route'ta kontrol edilecek
        pass


class ApplySuggestionRequestSchema(Schema):
    """AI öneriyi içeriğe uygulama isteği (admin için)."""
    create_version = fields.Boolean(
        required=False,
        load_default=True,
        metadata={'description': 'Yeni versiyon oluştur'}
    )
    version_notes = fields.String(
        required=False,
        validate=validate.Length(max=500),
        metadata={'description': 'Versiyon notları'}
    )


class ContentAIFeedbackSchema(Schema):
    """AI yanıtı için feedback."""
    was_helpful = fields.Boolean(required=True)
    rating = fields.Integer(
        required=False,
        validate=validate.Range(min=1, max=5)
    )
    comment = fields.String(
        required=False,
        validate=validate.Length(max=500)
    )


# =============================================================================
# Response Schemas
# =============================================================================

class AIContentResponseSchema(Schema):
    """AI içerik yanıtı base schema."""
    content_id = fields.Integer()
    content_type = fields.String()
    is_ai_generated = fields.Boolean(load_default=True)
    disclaimer = fields.String()
    generated_at = fields.String()


class ExplainContentResponseSchema(AIContentResponseSchema):
    """İçerik açıklama yanıtı."""
    explanation = fields.String()
    level = fields.String()


class SimplifyContentResponseSchema(AIContentResponseSchema):
    """İçerik sadeleştirme yanıtı."""
    simplified_explanation = fields.String()
    target_audience = fields.String()


class SuggestExamplesResponseSchema(AIContentResponseSchema):
    """Örnek önerme yanıtı."""
    examples = fields.String()  # Markdown formatında örnekler
    example_count = fields.Integer()


class ContentQuestionResponseSchema(AIContentResponseSchema):
    """Soru cevaplama yanıtı."""
    question = fields.String()
    answer = fields.String()


class SummarizeContentResponseSchema(AIContentResponseSchema):
    """Özet yanıtı."""
    summary = fields.String()
    summary_length = fields.String()


class AISuggestionSchema(Schema):
    """AI öneri schema."""
    id = fields.Integer()
    content_category = fields.String()
    content_id = fields.Integer()
    suggestion_type = fields.String()
    suggested_content = fields.String()
    status = fields.String()
    suggested_by_id = fields.Integer()
    suggested_by_name = fields.String()
    reviewed_by_name = fields.String()
    reviewed_at = fields.String()
    review_notes = fields.String()
    rejection_reason = fields.String()
    applied_at = fields.String()
    ai_model_used = fields.String()
    ai_tokens_used = fields.Integer()
    created_at = fields.String()
    expires_at = fields.String()


class AISuggestionListSchema(Schema):
    """AI öneri listesi schema."""
    items = fields.List(fields.Nested(AISuggestionSchema))
    total = fields.Integer()
    page = fields.Integer()
    per_page = fields.Integer()
    pages = fields.Integer()
