"""
Exams Module - Schemas.

Sınav serialization şemaları.
"""

from marshmallow import fields, validates, ValidationError, post_load

from app.common.base_schema import BaseSchema, RequestSchema


class ExamSchema(BaseSchema):
    """Sınav response şeması."""
    
    id = fields.Integer(dump_only=True)
    title = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    instructions = fields.String(dump_only=True)
    exam_type = fields.String(dump_only=True)
    status = fields.String(dump_only=True)
    course_id = fields.Integer(dump_only=True)
    topic_id = fields.Integer(dump_only=True)
    duration_minutes = fields.Integer(dump_only=True)
    pass_score = fields.Float(dump_only=True)
    max_attempts = fields.Integer(dump_only=True)
    total_questions = fields.Integer(dump_only=True)
    total_points = fields.Float(dump_only=True)
    average_score = fields.Float(dump_only=True)
    is_available = fields.Boolean(dump_only=True)
    available_from = fields.DateTime(dump_only=True)
    available_until = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class ExamCreateSchema(RequestSchema):
    """Sınav oluşturma request şeması."""
    
    title = fields.String(required=True, validate=lambda x: len(x) >= 3)
    description = fields.String(required=False, allow_none=True)
    instructions = fields.String(required=False, allow_none=True)
    course_id = fields.Integer(required=False, allow_none=True)
    topic_id = fields.Integer(required=False, allow_none=True)
    exam_type = fields.String(required=False, load_default='quiz')
    grade_level = fields.String(required=False, allow_none=True)  # Kademe/sınıf seviyesi
    duration_minutes = fields.Integer(required=False, load_default=60)
    pass_score = fields.Float(required=False, load_default=50.0)
    max_attempts = fields.Integer(required=False, load_default=1)
    shuffle_questions = fields.Boolean(required=False, load_default=True)
    shuffle_answers = fields.Boolean(required=False, load_default=True)
    show_answers_after = fields.Boolean(required=False, load_default=True)
    available_from = fields.DateTime(required=False, allow_none=True)
    available_until = fields.DateTime(required=False, allow_none=True)
    
    @validates('exam_type')
    def validate_exam_type(self, value, **kwargs):
        allowed = ['quiz', 'midterm', 'final', 'practice', 'homework']
        if value and value not in allowed:
            raise ValidationError(f'Geçersiz sınav tipi. İzin verilen: {", ".join(allowed)}')
    
    @validates('grade_level')
    def validate_grade_level(self, value, **kwargs):
        allowed = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'mezun', 'tyt', 'ayt']
        if value and value not in allowed:
            raise ValidationError(f'Geçersiz kademe/sınıf. İzin verilen: {", ".join(allowed)}')
    
    @validates('pass_score')
    def validate_pass_score(self, value, **kwargs):
        if value is not None and (value < 0 or value > 100):
            raise ValidationError('Geçme notu 0-100 arasında olmalı')


class AnswerCreateSchema(BaseSchema):
    """Cevap oluşturma şeması."""
    
    answer_text = fields.String(required=True)
    is_correct = fields.Boolean(required=False, load_default=False)


class QuestionCreateSchema(RequestSchema):
    """Soru oluşturma request şeması."""
    
    question_text = fields.String(required=True, validate=lambda x: len(x) >= 5)
    question_type = fields.String(required=False, load_default='single_choice')
    image_url = fields.URL(required=False, allow_none=True)
    explanation = fields.String(required=False, allow_none=True)
    points = fields.Float(required=False, load_default=1.0)
    correct_answer_text = fields.String(required=False, allow_none=True)
    answers = fields.List(fields.Nested(AnswerCreateSchema), required=False, load_default=[])
    
    @validates('question_type')
    def validate_question_type(self, value, **kwargs):
        allowed = ['single_choice', 'multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank']
        if value and value not in allowed:
            raise ValidationError(f'Geçersiz soru tipi. İzin verilen: {", ".join(allowed)}')
    
    @post_load
    def validate_answers(self, data, **kwargs):
        qtype = data.get('question_type', 'single_choice')
        answers = data.get('answers', [])
        
        if qtype in ['single_choice', 'multiple_choice', 'true_false']:
            if not answers:
                raise ValidationError('Bu soru tipi için cevap seçenekleri gerekli')
            
            correct_count = sum(1 for a in answers if a.get('is_correct'))
            
            if qtype == 'single_choice' and correct_count != 1:
                raise ValidationError('Tek seçimli soruda tam bir doğru cevap olmalı')
            
            if qtype == 'true_false' and len(answers) != 2:
                raise ValidationError('Doğru/Yanlış sorusunda 2 seçenek olmalı')
        
        return data


class AttemptAnswerSchema(RequestSchema):
    """Cevap gönderme request şeması."""
    
    question_id = fields.Integer(required=True)
    selected_answer_ids = fields.List(fields.Integer(), required=False, allow_none=True)
    answer_text = fields.String(required=False, allow_none=True)


class AttemptResultSchema(BaseSchema):
    """Sınav sonucu response şeması."""
    
    attempt_id = fields.Integer(dump_only=True)
    score = fields.Float(dump_only=True)
    max_score = fields.Float(dump_only=True)
    percentage = fields.Float(dump_only=True)
    passed = fields.Boolean(dump_only=True)
    status = fields.String(dump_only=True)
