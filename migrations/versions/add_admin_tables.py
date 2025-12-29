"""Add admin module tables

Revision ID: add_admin_tables
Revises: add_user_password_fields
Create Date: 2025-01-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_admin_tables'
down_revision = 'add_user_password_fields'
branch_labels = None
depends_on = None


def upgrade():
    """
    Creates admin module tables:
    - system_settings
    - admin_action_logs
    - content_approval_queue
    - system_announcements
    """
    
    # =========================================================================
    # SYSTEM_SETTINGS TABLE
    # =========================================================================
    op.create_table('system_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('default_value', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False, server_default='general'),
        sa.Column('setting_type', sa.String(length=20), nullable=False, server_default='string'),
        sa.Column('label', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('help_text', sa.String(length=500), nullable=True),
        sa.Column('validation_rules', sa.JSON(), nullable=True),
        sa.Column('allowed_values', sa.JSON(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_editable', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('requires_restart', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )
    
    op.create_index('ix_system_settings_category', 'system_settings', ['category'])
    op.create_index('ix_system_settings_key', 'system_settings', ['key'], unique=True)
    
    # =========================================================================
    # ADMIN_ACTION_LOGS TABLE
    # =========================================================================
    op.create_table('admin_action_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('admin_id', sa.Integer(), nullable=False),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=True),
        sa.Column('target_id', sa.Integer(), nullable=True),
        sa.Column('target_name', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_admin_logs_admin', 'admin_action_logs', ['admin_id'])
    op.create_index('ix_admin_logs_action', 'admin_action_logs', ['action_type'])
    op.create_index('ix_admin_logs_target', 'admin_action_logs', ['target_type', 'target_id'])
    op.create_index('ix_admin_logs_created', 'admin_action_logs', ['created_at'])
    
    # =========================================================================
    # CONTENT_APPROVAL_QUEUE TABLE
    # =========================================================================
    op.create_table('content_approval_queue',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('content_type', sa.String(length=50), nullable=False),
        sa.Column('content_id', sa.Integer(), nullable=False),
        sa.Column('content_title', sa.String(length=255), nullable=False),
        sa.Column('submitted_by_id', sa.Integer(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('priority', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by_id', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('reviewer_notes', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.String(length=100), nullable=True),
        sa.Column('rejection_details', sa.Text(), nullable=True),
        sa.Column('review_time_minutes', sa.Integer(), nullable=True),
        sa.Column('revision_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['submitted_by_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_approval_queue_status', 'content_approval_queue', ['status'])
    op.create_index('ix_approval_queue_content', 'content_approval_queue', ['content_type', 'content_id'])
    op.create_index('ix_approval_queue_priority', 'content_approval_queue', ['priority', 'created_at'])
    op.create_index('ix_approval_queue_assigned', 'content_approval_queue', ['assigned_to_id'])
    
    # =========================================================================
    # SYSTEM_ANNOUNCEMENTS TABLE
    # =========================================================================
    op.create_table('system_announcements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('announcement_type', sa.String(length=20), nullable=True, server_default='info'),
        sa.Column('starts_at', sa.DateTime(), nullable=True),
        sa.Column('ends_at', sa.DateTime(), nullable=True),
        sa.Column('target_roles', sa.JSON(), nullable=True),
        sa.Column('target_user_ids', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('is_dismissible', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('show_on_dashboard', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('show_on_login', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('view_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('dismiss_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_announcements_active', 'system_announcements', 
                    ['is_active', 'starts_at', 'ends_at'])
    op.create_index('ix_announcements_target', 'system_announcements', ['target_roles'])


def downgrade():
    """Remove admin module tables."""
    op.drop_table('system_announcements')
    op.drop_table('content_approval_queue')
    op.drop_table('admin_action_logs')
    op.drop_table('system_settings')
