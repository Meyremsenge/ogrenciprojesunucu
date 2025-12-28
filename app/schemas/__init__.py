"""Marshmallow schemas for API serialization."""

from marshmallow import Schema, fields, validate, post_load, validates, ValidationError


class PaginationSchema(Schema):
    """Pagination response schema."""
    page = fields.Integer()
    per_page = fields.Integer()
    total = fields.Integer()
    total_pages = fields.Integer()
    has_next = fields.Boolean()
    has_prev = fields.Boolean()


class UserSchema(Schema):
    """User serialization schema."""
    id = fields.Integer(dump_only=True)
    email = fields.Email(required=True)
    first_name = fields.String(required=True, validate=validate.Length(min=1, max=50))
    last_name = fields.String(required=True, validate=validate.Length(min=1, max=50))
    full_name = fields.String(dump_only=True)
    phone = fields.String(validate=validate.Length(max=20))
    avatar_url = fields.String()
    role = fields.String(dump_only=True, attribute='role.name')
    is_active = fields.Boolean(dump_only=True)
    is_verified = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    last_login = fields.DateTime(dump_only=True)


class UserCreateSchema(Schema):
    """User creation schema."""
    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True, validate=validate.Length(min=8))
    first_name = fields.String(required=True, validate=validate.Length(min=1, max=50))
    last_name = fields.String(required=True, validate=validate.Length(min=1, max=50))
    role = fields.String(validate=validate.OneOf(['student', 'teacher', 'admin']))


class CourseSchema(Schema):
    """Course serialization schema."""
    id = fields.Integer(dump_only=True)
    title = fields.String(required=True, validate=validate.Length(min=3, max=200))
    slug = fields.String(dump_only=True)
    description = fields.String()
    short_description = fields.String(validate=validate.Length(max=500))
    cover_image_url = fields.String()
    price = fields.Decimal(places=2)
    level = fields.String(validate=validate.OneOf(['beginner', 'intermediate', 'advanced']))
    is_published = fields.Boolean()
    teacher = fields.Nested(UserSchema, only=('id', 'full_name', 'avatar_url'))
    category = fields.Nested('CategorySchema', only=('id', 'name', 'slug'))
    topics_count = fields.Integer(dump_only=True)
    videos_count = fields.Integer(dump_only=True)
    enrolled_count = fields.Integer(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class CategorySchema(Schema):
    """Category serialization schema."""
    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)
    slug = fields.String(dump_only=True)
    description = fields.String()
    icon = fields.String()
    courses_count = fields.Integer(dump_only=True)


class TopicSchema(Schema):
    """Topic serialization schema."""
    id = fields.Integer(dump_only=True)
    title = fields.String(required=True)
    description = fields.String()
    order_index = fields.Integer()
    course_id = fields.Integer(required=True)
    videos_count = fields.Integer(dump_only=True)


class VideoSchema(Schema):
    """Video serialization schema."""
    id = fields.Integer(dump_only=True)
    title = fields.String(required=True)
    description = fields.String()
    youtube_id = fields.String(required=True)
    embed_url = fields.String(dump_only=True)
    thumbnail_url = fields.String()
    duration_seconds = fields.Integer()
    duration_formatted = fields.String(dump_only=True)
    order_index = fields.Integer()
    is_preview = fields.Boolean()
    course_id = fields.Integer()
    topic_id = fields.Integer()
    view_count = fields.Integer(dump_only=True)


class VideoProgressSchema(Schema):
    """Video progress serialization schema."""
    video_id = fields.Integer()
    watched_seconds = fields.Integer()
    watch_percentage = fields.Float()
    is_completed = fields.Boolean()
    last_watched_at = fields.DateTime()


class QuestionSchema(Schema):
    """Question serialization schema."""
    id = fields.Integer(dump_only=True)
    question_text = fields.String(required=True)
    question_type = fields.String(validate=validate.OneOf(['multiple_choice', 'true_false', 'open_ended']))
    difficulty = fields.String(validate=validate.OneOf(['easy', 'medium', 'hard']))
    points = fields.Integer()
    explanation = fields.String()
    answers = fields.List(fields.Nested('AnswerSchema'), dump_only=True)
    course_id = fields.Integer()
    topic_id = fields.Integer()


class AnswerSchema(Schema):
    """Answer serialization schema."""
    id = fields.Integer(dump_only=True)
    answer_text = fields.String(required=True)
    is_correct = fields.Boolean()
    order_index = fields.Integer()


class ExamSchema(Schema):
    """Exam serialization schema."""
    id = fields.Integer(dump_only=True)
    title = fields.String(required=True)
    description = fields.String()
    exam_type = fields.String()
    time_limit_minutes = fields.Integer()
    passing_score = fields.Float()
    max_attempts = fields.Integer()
    shuffle_questions = fields.Boolean()
    show_correct_answers = fields.Boolean()
    is_published = fields.Boolean()
    course_id = fields.Integer()
    questions_count = fields.Integer(dump_only=True)
    total_points = fields.Integer(dump_only=True)


class ExamResultSchema(Schema):
    """Exam result serialization schema."""
    id = fields.Integer(dump_only=True)
    exam = fields.Nested(ExamSchema, only=('id', 'title'))
    user = fields.Nested(UserSchema, only=('id', 'full_name'))
    score = fields.Integer()
    max_score = fields.Integer()
    score_percentage = fields.Float()
    passed = fields.Boolean()
    time_taken_seconds = fields.Integer()
    attempt_number = fields.Integer()
    status = fields.String()
    started_at = fields.DateTime()
    submitted_at = fields.DateTime()


class EvaluationSchema(Schema):
    """Evaluation serialization schema."""
    id = fields.Integer(dump_only=True)
    student = fields.Nested(UserSchema, only=('id', 'full_name'))
    teacher = fields.Nested(UserSchema, only=('id', 'full_name'))
    course = fields.Nested(CourseSchema, only=('id', 'title'))
    evaluation_type = fields.String()
    score = fields.Float()
    max_score = fields.Float()
    feedback = fields.String()
    strengths = fields.String()
    areas_to_improve = fields.String()
    created_at = fields.DateTime()


class StudentProgressSchema(Schema):
    """Student progress serialization schema."""
    id = fields.Integer(dump_only=True)
    student = fields.Nested(UserSchema, only=('id', 'full_name'))
    course = fields.Nested(CourseSchema, only=('id', 'title'))
    overall_progress = fields.Float()
    video_completion_rate = fields.Float()
    exam_completion_rate = fields.Float()
    average_exam_score = fields.Float()
    total_watch_time = fields.Integer()
    last_activity = fields.DateTime()
