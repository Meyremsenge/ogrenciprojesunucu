"""Add content AI suggestion and interaction tables

Revision ID: add_content_ai_tables
Revises: add_ai_prompt_tables
Create Date: 2025-01-18

AI destekli içerik yönetimi için tablolar.
Öneri sistemi ve etkileşim logları.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_content_ai_tables'
down_revision = 'add_ai_prompt_tables'
branch_labels = None
depends_on = None


def upgrade():
    """
    Yeni tabloları oluştur.
    
    Tablolar:
    - content_ai_suggestions: AI içerik önerileri (admin onayı gerekir)
    - content_ai_interactions: Öğrenci-AI etkileşim logları
    """
    
    # =============================================
    # content_ai_suggestions - AI İçerik Önerileri
    # =============================================
    op.create_table(
        'content_ai_suggestions',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        
        # İçerik referansı
        sa.Column('content_category', sa.String(50), nullable=False),  # video, document
        sa.Column('content_id', sa.Integer(), nullable=False),
        
        # Öneri bilgileri
        sa.Column('suggestion_type', sa.String(50), nullable=False),  # examples, quiz, summary, etc.
        sa.Column('suggested_content', sa.Text(), nullable=False),
        
        # Durum
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        
        # Öneriyi isteyen
        sa.Column('suggested_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        
        # İnceleme bilgileri
        sa.Column('reviewed_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.String(500), nullable=True),
        
        # Uygulama bilgileri
        sa.Column('applied_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('applied_at', sa.DateTime(), nullable=True),
        sa.Column('applied_version_id', sa.Integer(), nullable=True),
        
        # AI bilgileri
        sa.Column('ai_model_used', sa.String(50), nullable=True),
        sa.Column('ai_tokens_used', sa.Integer(), server_default='0'),
        sa.Column('ai_prompt_used', sa.Text(), nullable=True),
        
        # Son geçerlilik tarihi
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Indexes
    op.create_index('ix_ai_suggestions_content', 'content_ai_suggestions', ['content_category', 'content_id'])
    op.create_index('ix_ai_suggestions_status', 'content_ai_suggestions', ['status'])
    op.create_index('ix_ai_suggestions_suggested_by', 'content_ai_suggestions', ['suggested_by_id'])
    op.create_index('ix_ai_suggestions_status_date', 'content_ai_suggestions', ['status', 'created_at'])
    
    # =============================================
    # content_ai_interactions - Öğrenci-AI Etkileşimleri
    # =============================================
    op.create_table(
        'content_ai_interactions',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        
        # Kullanıcı
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        
        # İçerik referansı
        sa.Column('content_category', sa.String(50), nullable=False),
        sa.Column('content_id', sa.Integer(), nullable=False),
        
        # Etkileşim tipi
        sa.Column('interaction_type', sa.String(50), nullable=False),
        
        # Kullanıcı girdisi
        sa.Column('user_input', sa.Text(), nullable=True),
        
        # AI yanıtı özeti (tam yanıt saklanmaz - KVKK)
        sa.Column('response_summary', sa.String(500), nullable=True),
        
        # Metrikler
        sa.Column('response_time_ms', sa.Integer(), server_default='0'),
        sa.Column('tokens_used', sa.Integer(), server_default='0'),
        
        # Feedback
        sa.Column('was_helpful', sa.Boolean(), nullable=True),
        sa.Column('feedback_rating', sa.Integer(), nullable=True),  # 1-5
        
        # KVKK - Otomatik silme
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    
    # Indexes
    op.create_index('ix_ai_interactions_user', 'content_ai_interactions', ['user_id'])
    op.create_index('ix_ai_interactions_content', 'content_ai_interactions', ['content_category', 'content_id'])
    op.create_index('ix_ai_interactions_user_date', 'content_ai_interactions', ['user_id', 'created_at'])
    op.create_index('ix_ai_interactions_expires', 'content_ai_interactions', ['expires_at'])
    op.create_index('ix_ai_interactions_type', 'content_ai_interactions', ['interaction_type'])


def downgrade():
    """Tabloları kaldır."""
    
    # Indexes
    op.drop_index('ix_ai_interactions_type', table_name='content_ai_interactions')
    op.drop_index('ix_ai_interactions_expires', table_name='content_ai_interactions')
    op.drop_index('ix_ai_interactions_user_date', table_name='content_ai_interactions')
    op.drop_index('ix_ai_interactions_content', table_name='content_ai_interactions')
    op.drop_index('ix_ai_interactions_user', table_name='content_ai_interactions')
    
    op.drop_index('ix_ai_suggestions_status_date', table_name='content_ai_suggestions')
    op.drop_index('ix_ai_suggestions_suggested_by', table_name='content_ai_suggestions')
    op.drop_index('ix_ai_suggestions_status', table_name='content_ai_suggestions')
    op.drop_index('ix_ai_suggestions_content', table_name='content_ai_suggestions')
    
    # Tables
    op.drop_table('content_ai_interactions')
    op.drop_table('content_ai_suggestions')
