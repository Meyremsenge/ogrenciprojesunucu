"""Add foreign key indexes for performance.

Revision ID: add_fk_indexes
Revises: 
Create Date: 2024-12-27

This migration adds indexes to foreign key columns that are frequently
queried but don't have indexes. This will significantly improve query
performance for JOINs and lookups.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_fk_indexes'
down_revision = None  # Update this to chain with your latest migration
branch_labels = None
depends_on = None


def upgrade():
    """Add indexes to frequently queried foreign key columns."""
    
    # ============================================
    # ENROLLMENTS - Most critical table
    # ============================================
    op.create_index(
        'ix_enrollments_user_id',
        'enrollments',
        ['user_id'],
        unique=False
    )
    op.create_index(
        'ix_enrollments_course_id',
        'enrollments',
        ['course_id'],
        unique=False
    )
    # Composite index for user's course list
    op.create_index(
        'ix_enrollments_user_status',
        'enrollments',
        ['user_id', 'status'],
        unique=False
    )
    
    # ============================================
    # EXAM_ATTEMPTS - High query volume
    # ============================================
    op.create_index(
        'ix_exam_attempts_user_id',
        'exam_attempts',
        ['user_id'],
        unique=False
    )
    op.create_index(
        'ix_exam_attempts_exam_id',
        'exam_attempts',
        ['exam_id'],
        unique=False
    )
    # Composite for checking existing attempts
    op.create_index(
        'ix_exam_attempts_user_exam',
        'exam_attempts',
        ['user_id', 'exam_id'],
        unique=False
    )
    
    # ============================================
    # VIDEO_PROGRESS - Progress queries
    # ============================================
    op.create_index(
        'ix_video_progress_user_id',
        'video_progress',
        ['user_id'],
        unique=False
    )
    op.create_index(
        'ix_video_progress_video_id',
        'video_progress',
        ['video_id'],
        unique=False
    )
    # Composite for user's video progress
    op.create_index(
        'ix_video_progress_user_video',
        'video_progress',
        ['user_id', 'video_id'],
        unique=True
    )
    
    # ============================================
    # STUDENT_PROGRESS - Course progress
    # ============================================
    op.create_index(
        'ix_student_progress_user_id',
        'student_progress',
        ['user_id'],
        unique=False
    )
    op.create_index(
        'ix_student_progress_course_id',
        'student_progress',
        ['course_id'],
        unique=False
    )
    op.create_index(
        'ix_student_progress_user_course',
        'student_progress',
        ['user_id', 'course_id'],
        unique=True
    )
    
    # ============================================
    # LIVE_SESSION_ATTENDEES
    # ============================================
    op.create_index(
        'ix_live_session_attendees_session_id',
        'live_session_attendees',
        ['session_id'],
        unique=False
    )
    op.create_index(
        'ix_live_session_attendees_user_id',
        'live_session_attendees',
        ['user_id'],
        unique=False
    )
    
    # ============================================
    # TOPICS - Course structure
    # ============================================
    op.create_index(
        'ix_topics_course_id',
        'topics',
        ['course_id'],
        unique=False
    )
    op.create_index(
        'ix_topics_course_order',
        'topics',
        ['course_id', 'order_index'],
        unique=False
    )
    
    # ============================================
    # VIDEOS - Content delivery
    # ============================================
    op.create_index(
        'ix_videos_topic_id',
        'videos',
        ['topic_id'],
        unique=False
    )
    op.create_index(
        'ix_videos_uploader_id',
        'videos',
        ['uploader_id'],
        unique=False
    )
    
    # ============================================
    # QUESTIONS - Exam content
    # ============================================
    op.create_index(
        'ix_questions_exam_id',
        'questions',
        ['exam_id'],
        unique=False
    )
    op.create_index(
        'ix_questions_topic_id',
        'questions',
        ['topic_id'],
        unique=False
    )
    
    # ============================================
    # USER_ANSWERS - Exam grading
    # ============================================
    op.create_index(
        'ix_user_answers_attempt_id',
        'user_answers',
        ['attempt_id'],
        unique=False
    )
    op.create_index(
        'ix_user_answers_question_id',
        'user_answers',
        ['question_id'],
        unique=False
    )
    
    # ============================================
    # COURSES - Filtering
    # ============================================
    op.create_index(
        'ix_courses_teacher_id',
        'courses',
        ['teacher_id'],
        unique=False
    )
    op.create_index(
        'ix_courses_category_id',
        'courses',
        ['category_id'],
        unique=False
    )
    # Status filtering
    op.create_index(
        'ix_courses_status_published',
        'courses',
        ['is_published', 'is_deleted'],
        unique=False
    )
    
    # ============================================
    # EVALUATIONS - Teacher assignments
    # ============================================
    op.create_index(
        'ix_evaluations_course_id',
        'evaluations',
        ['course_id'],
        unique=False
    )
    op.create_index(
        'ix_evaluations_creator_id',
        'evaluations',
        ['creator_id'],
        unique=False
    )


def downgrade():
    """Remove all added indexes."""
    
    # Drop all indexes in reverse order
    indexes_to_drop = [
        ('evaluations', 'ix_evaluations_creator_id'),
        ('evaluations', 'ix_evaluations_course_id'),
        ('courses', 'ix_courses_status_published'),
        ('courses', 'ix_courses_category_id'),
        ('courses', 'ix_courses_teacher_id'),
        ('user_answers', 'ix_user_answers_question_id'),
        ('user_answers', 'ix_user_answers_attempt_id'),
        ('questions', 'ix_questions_topic_id'),
        ('questions', 'ix_questions_exam_id'),
        ('videos', 'ix_videos_uploader_id'),
        ('videos', 'ix_videos_topic_id'),
        ('topics', 'ix_topics_course_order'),
        ('topics', 'ix_topics_course_id'),
        ('live_session_attendees', 'ix_live_session_attendees_user_id'),
        ('live_session_attendees', 'ix_live_session_attendees_session_id'),
        ('student_progress', 'ix_student_progress_user_course'),
        ('student_progress', 'ix_student_progress_course_id'),
        ('student_progress', 'ix_student_progress_user_id'),
        ('video_progress', 'ix_video_progress_user_video'),
        ('video_progress', 'ix_video_progress_video_id'),
        ('video_progress', 'ix_video_progress_user_id'),
        ('exam_attempts', 'ix_exam_attempts_user_exam'),
        ('exam_attempts', 'ix_exam_attempts_exam_id'),
        ('exam_attempts', 'ix_exam_attempts_user_id'),
        ('enrollments', 'ix_enrollments_user_status'),
        ('enrollments', 'ix_enrollments_course_id'),
        ('enrollments', 'ix_enrollments_user_id'),
    ]
    
    for table, index in indexes_to_drop:
        try:
            op.drop_index(index, table_name=table)
        except Exception:
            pass  # Index might not exist
