"""Add packages, user_packages and audit_logs tables with indexes

Revision ID: add_packages_audit
Revises: add_ai_tables
Create Date: 2025-01-09 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_packages_audit'
down_revision = 'add_ai_tables'
branch_labels = None
depends_on = None


def upgrade():
    """
    Creates packages, user_packages, and audit_logs tables.
    Also adds missing indexes to existing tables.
    """
    
    # =========================================================================
    # PACKAGES TABLE
    # =========================================================================
    op.create_table('packages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('short_description', sa.String(length=255), nullable=True),
        sa.Column('package_type', sa.String(length=20), nullable=False, server_default='monthly'),
        sa.Column('duration_days', sa.Integer(), nullable=True, server_default='30'),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('discount_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=True, server_default='TRY'),
        sa.Column('features', sa.JSON(), nullable=True),
        sa.Column('max_courses', sa.Integer(), nullable=True),
        sa.Column('max_downloads', sa.Integer(), nullable=True),
        sa.Column('max_live_sessions', sa.Integer(), nullable=True),
        sa.Column('ai_questions_per_day', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('ai_questions_per_month', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('course_ids', sa.JSON(), nullable=True),
        sa.Column('category_ids', sa.JSON(), nullable=True),
        sa.Column('all_courses_access', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='active'),
        sa.Column('is_published', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_featured', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_subscribers', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_revenue', sa.Numeric(precision=15, scale=2), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
        sa.CheckConstraint('price >= 0', name='ck_packages_price_positive'),
        sa.CheckConstraint('discount_price IS NULL OR discount_price >= 0', 
                          name='ck_packages_discount_positive'),
    )
    
    # Packages indexes
    op.create_index('idx_packages_slug', 'packages', ['slug'], unique=True)
    op.create_index('idx_packages_status', 'packages', ['status'])
    op.create_index('idx_packages_type', 'packages', ['package_type'])
    op.create_index('idx_packages_active_published', 'packages', ['status', 'is_published'])
    
    # =========================================================================
    # USER_PACKAGES TABLE
    # =========================================================================
    op.create_table('user_packages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('package_id', sa.Integer(), nullable=False),
        sa.Column('starts_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('subscription_status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('payment_status', sa.String(length=20), nullable=True, server_default='pending'),
        sa.Column('payment_method', sa.String(length=50), nullable=True),
        sa.Column('payment_reference', sa.String(length=100), nullable=True),
        sa.Column('transaction_id', sa.String(length=100), nullable=True),
        sa.Column('amount_paid', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=True, server_default='TRY'),
        sa.Column('discount_code', sa.String(length=50), nullable=True),
        sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=True, server_default='0'),
        sa.Column('auto_renew', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('renewal_reminder_sent', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['package_id'], ['packages.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    
    # User packages indexes
    op.create_index('idx_user_packages_user', 'user_packages', ['user_id'])
    op.create_index('idx_user_packages_package', 'user_packages', ['package_id'])
    op.create_index('idx_user_packages_status', 'user_packages', ['subscription_status'])
    op.create_index('idx_user_packages_expires', 'user_packages', ['expires_at'])
    op.create_index('idx_user_packages_user_status', 'user_packages', ['user_id', 'subscription_status'])
    op.create_index('idx_user_packages_active_expires', 'user_packages', ['subscription_status', 'expires_at'])
    op.create_index('idx_user_packages_transaction', 'user_packages', ['transaction_id'])
    
    # Unique constraint for subscription
    op.create_unique_constraint('uq_user_package_subscription', 'user_packages', 
                                ['user_id', 'package_id', 'starts_at'])
    
    # =========================================================================
    # AUDIT_LOGS TABLE
    # =========================================================================
    op.create_table('audit_logs',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('user_email', sa.String(length=255), nullable=True),
        sa.Column('user_role', sa.String(length=50), nullable=True),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('action_category', sa.String(length=50), nullable=True),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('resource_name', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=True, server_default='info'),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('changed_fields', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.Column('request_path', sa.String(length=500), nullable=True),
        sa.Column('request_id', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Audit logs indexes for fast queries
    op.create_index('idx_audit_logs_user', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('idx_audit_logs_resource', 'audit_logs', ['resource_type', 'resource_id'])
    op.create_index('idx_audit_logs_created', 'audit_logs', ['created_at'])
    op.create_index('idx_audit_logs_severity', 'audit_logs', ['severity'])
    op.create_index('idx_audit_logs_session', 'audit_logs', ['session_id'])
    op.create_index('idx_audit_logs_user_action', 'audit_logs', ['user_id', 'action'])
    op.create_index('idx_audit_logs_user_created', 'audit_logs', ['user_id', 'created_at'])
    op.create_index('idx_audit_logs_resource_action', 'audit_logs', ['resource_type', 'action'])
    op.create_index('idx_audit_logs_created_severity', 'audit_logs', ['created_at', 'severity'])
    
    # =========================================================================
    # ADDITIONAL INDEXES FOR EXISTING TABLES
    # =========================================================================
    
    # Users table additional indexes
    op.create_index('idx_users_role_active', 'users', ['role_id', 'is_active'])
    op.create_index('idx_users_created', 'users', ['created_at'])
    op.create_index('idx_users_last_login', 'users', ['last_login_at'])
    op.create_index('idx_users_verified_active', 'users', ['is_verified', 'is_active'])
    op.create_index('idx_users_role_id', 'users', ['role_id'])
    
    # Enrollments table indexes (if not exist)
    try:
        op.create_index('idx_enrollments_user', 'enrollments', ['student_id'])
        op.create_index('idx_enrollments_course', 'enrollments', ['course_id'])
        op.create_index('idx_enrollments_status', 'enrollments', ['status'])
        op.create_index('idx_enrollments_user_course', 'enrollments', ['student_id', 'course_id'])
    except:
        pass  # Index might already exist
    
    # Videos table indexes
    try:
        op.create_index('idx_videos_topic', 'videos', ['topic_id'])
        op.create_index('idx_videos_published', 'videos', ['is_published'])
        op.create_index('idx_videos_topic_order', 'videos', ['topic_id', 'order_index'])
    except:
        pass
    
    # Exams table indexes
    try:
        op.create_index('idx_exams_topic', 'exams', ['topic_id'])
        op.create_index('idx_exams_status', 'exams', ['status'])
        op.create_index('idx_exams_published', 'exams', ['is_published'])
        op.create_index('idx_exams_available', 'exams', ['available_from', 'available_until'])
    except:
        pass
    
    # Exam results table indexes
    try:
        op.create_index('idx_exam_results_user', 'exam_results', ['user_id'])
        op.create_index('idx_exam_results_exam', 'exam_results', ['exam_id'])
        op.create_index('idx_exam_results_status', 'exam_results', ['status'])
        op.create_index('idx_exam_results_user_exam', 'exam_results', ['user_id', 'exam_id'])
    except:
        pass
    
    # Questions table indexes
    try:
        op.create_index('idx_questions_topic', 'questions', ['topic_id'])
        op.create_index('idx_questions_type', 'questions', ['question_type'])
        op.create_index('idx_questions_difficulty', 'questions', ['difficulty'])
        op.create_index('idx_questions_published', 'questions', ['is_published'])
    except:
        pass
    
    # Live sessions table indexes
    try:
        op.create_index('idx_live_sessions_course', 'live_sessions', ['course_id'])
        op.create_index('idx_live_sessions_host', 'live_sessions', ['host_id'])
        op.create_index('idx_live_sessions_status', 'live_sessions', ['status'])
        op.create_index('idx_live_sessions_scheduled', 'live_sessions', ['scheduled_start'])
        op.create_index('idx_live_sessions_course_status', 'live_sessions', ['course_id', 'status'])
    except:
        pass
    
    # Evaluations table indexes
    try:
        op.create_index('idx_evaluations_student', 'evaluations', ['student_id'])
        op.create_index('idx_evaluations_teacher', 'evaluations', ['teacher_id'])
        op.create_index('idx_evaluations_course', 'evaluations', ['course_id'])
        op.create_index('idx_evaluations_date', 'evaluations', ['evaluation_date'])
    except:
        pass
    
    # Courses table indexes
    try:
        op.create_index('idx_courses_teacher', 'courses', ['teacher_id'])
        op.create_index('idx_courses_category', 'courses', ['category_id'])
        op.create_index('idx_courses_status', 'courses', ['status'])
        op.create_index('idx_courses_published', 'courses', ['is_published'])
        op.create_index('idx_courses_slug', 'courses', ['slug'])
    except:
        pass


def downgrade():
    """
    Drops packages, user_packages, and audit_logs tables.
    Also removes added indexes from existing tables.
    """
    
    # Drop indexes from existing tables (ignore if not exist)
    indexes_to_drop = [
        ('users', 'idx_users_role_active'),
        ('users', 'idx_users_created'),
        ('users', 'idx_users_last_login'),
        ('users', 'idx_users_verified_active'),
        ('users', 'idx_users_role_id'),
        ('enrollments', 'idx_enrollments_user'),
        ('enrollments', 'idx_enrollments_course'),
        ('enrollments', 'idx_enrollments_status'),
        ('enrollments', 'idx_enrollments_user_course'),
        ('videos', 'idx_videos_topic'),
        ('videos', 'idx_videos_published'),
        ('videos', 'idx_videos_topic_order'),
        ('exams', 'idx_exams_topic'),
        ('exams', 'idx_exams_status'),
        ('exams', 'idx_exams_published'),
        ('exams', 'idx_exams_available'),
        ('exam_results', 'idx_exam_results_user'),
        ('exam_results', 'idx_exam_results_exam'),
        ('exam_results', 'idx_exam_results_status'),
        ('exam_results', 'idx_exam_results_user_exam'),
        ('questions', 'idx_questions_topic'),
        ('questions', 'idx_questions_type'),
        ('questions', 'idx_questions_difficulty'),
        ('questions', 'idx_questions_published'),
        ('live_sessions', 'idx_live_sessions_course'),
        ('live_sessions', 'idx_live_sessions_host'),
        ('live_sessions', 'idx_live_sessions_status'),
        ('live_sessions', 'idx_live_sessions_scheduled'),
        ('live_sessions', 'idx_live_sessions_course_status'),
        ('evaluations', 'idx_evaluations_student'),
        ('evaluations', 'idx_evaluations_teacher'),
        ('evaluations', 'idx_evaluations_course'),
        ('evaluations', 'idx_evaluations_date'),
        ('courses', 'idx_courses_teacher'),
        ('courses', 'idx_courses_category'),
        ('courses', 'idx_courses_status'),
        ('courses', 'idx_courses_published'),
        ('courses', 'idx_courses_slug'),
    ]
    
    for table, index in indexes_to_drop:
        try:
            op.drop_index(index, table_name=table)
        except:
            pass
    
    # Drop audit_logs table and its indexes
    op.drop_index('idx_audit_logs_created_severity', table_name='audit_logs')
    op.drop_index('idx_audit_logs_resource_action', table_name='audit_logs')
    op.drop_index('idx_audit_logs_user_created', table_name='audit_logs')
    op.drop_index('idx_audit_logs_user_action', table_name='audit_logs')
    op.drop_index('idx_audit_logs_session', table_name='audit_logs')
    op.drop_index('idx_audit_logs_severity', table_name='audit_logs')
    op.drop_index('idx_audit_logs_created', table_name='audit_logs')
    op.drop_index('idx_audit_logs_resource', table_name='audit_logs')
    op.drop_index('idx_audit_logs_action', table_name='audit_logs')
    op.drop_index('idx_audit_logs_user', table_name='audit_logs')
    op.drop_table('audit_logs')
    
    # Drop user_packages table and its indexes
    op.drop_constraint('uq_user_package_subscription', 'user_packages', type_='unique')
    op.drop_index('idx_user_packages_transaction', table_name='user_packages')
    op.drop_index('idx_user_packages_active_expires', table_name='user_packages')
    op.drop_index('idx_user_packages_user_status', table_name='user_packages')
    op.drop_index('idx_user_packages_expires', table_name='user_packages')
    op.drop_index('idx_user_packages_status', table_name='user_packages')
    op.drop_index('idx_user_packages_package', table_name='user_packages')
    op.drop_index('idx_user_packages_user', table_name='user_packages')
    op.drop_table('user_packages')
    
    # Drop packages table and its indexes
    op.drop_index('idx_packages_active_published', table_name='packages')
    op.drop_index('idx_packages_type', table_name='packages')
    op.drop_index('idx_packages_status', table_name='packages')
    op.drop_index('idx_packages_slug', table_name='packages')
    op.drop_table('packages')
