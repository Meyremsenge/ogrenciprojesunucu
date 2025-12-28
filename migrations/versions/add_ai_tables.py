"""AI modülü tabloları eklendi

Revision ID: add_ai_tables
Revises: 
Create Date: 2025-12-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_ai_tables'
down_revision = None  # Mevcut son migration'a bağlanmalı
branch_labels = None
depends_on = None


def upgrade():
    # AI Kullanım Logları tablosu
    op.create_table(
        'ai_usage_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('feature', sa.String(length=50), nullable=False),
        sa.Column('tokens_used', sa.Integer(), nullable=False, default=0),
        sa.Column('request_data', sa.JSON(), nullable=True),
        sa.Column('response_summary', sa.String(length=500), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('is_mock', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_usage_logs_user_id'), 'ai_usage_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_ai_usage_logs_feature'), 'ai_usage_logs', ['feature'], unique=False)
    op.create_index(op.f('ix_ai_usage_logs_created_at'), 'ai_usage_logs', ['created_at'], unique=False)
    
    # AI Kotaları tablosu
    op.create_table(
        'ai_quotas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('daily_tokens_used', sa.Integer(), default=0),
        sa.Column('monthly_tokens_used', sa.Integer(), default=0),
        sa.Column('daily_requests_count', sa.Integer(), default=0),
        sa.Column('monthly_requests_count', sa.Integer(), default=0),
        sa.Column('last_request_at', sa.DateTime(), nullable=True),
        sa.Column('daily_reset_at', sa.Date(), nullable=True),
        sa.Column('monthly_reset_at', sa.Date(), nullable=True),
        sa.Column('is_blocked', sa.Boolean(), default=False),
        sa.Column('blocked_until', sa.DateTime(), nullable=True),
        sa.Column('block_reason', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    
    # AI Konfigürasyonları tablosu
    op.create_table(
        'ai_configurations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.JSON(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )
    op.create_index(op.f('ix_ai_configurations_key'), 'ai_configurations', ['key'], unique=True)
    
    # AI İhlalleri tablosu
    op.create_table(
        'ai_violations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('violation_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.Integer(), nullable=False, default=1),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('resolved', sa.Boolean(), default=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resolved_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_violations_user_id'), 'ai_violations', ['user_id'], unique=False)
    op.create_index(op.f('ix_ai_violations_violation_type'), 'ai_violations', ['violation_type'], unique=False)
    op.create_index(op.f('ix_ai_violations_created_at'), 'ai_violations', ['created_at'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_ai_violations_created_at'), table_name='ai_violations')
    op.drop_index(op.f('ix_ai_violations_violation_type'), table_name='ai_violations')
    op.drop_index(op.f('ix_ai_violations_user_id'), table_name='ai_violations')
    op.drop_table('ai_violations')
    
    op.drop_index(op.f('ix_ai_configurations_key'), table_name='ai_configurations')
    op.drop_table('ai_configurations')
    
    op.drop_table('ai_quotas')
    
    op.drop_index(op.f('ix_ai_usage_logs_created_at'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_feature'), table_name='ai_usage_logs')
    op.drop_index(op.f('ix_ai_usage_logs_user_id'), table_name='ai_usage_logs')
    op.drop_table('ai_usage_logs')
