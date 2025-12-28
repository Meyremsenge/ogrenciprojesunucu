"""
Add content versioning and approval system.

Revision ID: add_content_versioning_approval
Revises: add_user_password_fields
Create Date: 2024-01-15

Bu migration şunları ekler:
- content_versions tablosu (versiyonlama için)
- content_approvals tablosu (onay workflow için)
- videos ve documents tablolarına yeni kolonlar
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers
revision = 'add_content_versioning_approval'
down_revision = 'add_user_password_fields'
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade database."""
    
    # ==========================================================================
    # Enum types oluştur
    # ==========================================================================
    
    # ContentStatus enum
    content_status_enum = postgresql.ENUM(
        'draft', 'pending_review', 'approved', 'rejected', 'published', 'archived',
        name='contentstatus',
        create_type=False
    )
    content_status_enum.create(op.get_bind(), checkfirst=True)
    
    # ContentCategory enum
    content_category_enum = postgresql.ENUM(
        'video', 'document', 'quiz', 'live_session', 'assignment',
        name='contentcategory',
        create_type=False
    )
    content_category_enum.create(op.get_bind(), checkfirst=True)
    
    # RejectionReason enum
    rejection_reason_enum = postgresql.ENUM(
        'inappropriate_content', 'low_quality', 'duplicate', 
        'copyright_violation', 'incomplete', 'technical_issue', 'other',
        name='rejectionreason',
        create_type=False
    )
    rejection_reason_enum.create(op.get_bind(), checkfirst=True)
    
    # ==========================================================================
    # content_versions tablosu oluştur
    # ==========================================================================
    
    op.create_table(
        'content_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('content_category', sa.Enum(
            'video', 'document', 'quiz', 'live_session', 'assignment',
            name='contentcategory'
        ), nullable=False),
        sa.Column('content_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False, default=1),
        sa.Column('version_label', sa.String(100), nullable=True),
        sa.Column('changed_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('change_summary', sa.String(500), nullable=True),
        sa.Column('previous_version_id', sa.Integer(), sa.ForeignKey('content_versions.id'), nullable=True),
        sa.Column('content_snapshot', postgresql.JSONB(), nullable=False),
        sa.Column('changes_diff', postgresql.JSONB(), nullable=True),
        sa.Column('is_current', sa.Boolean(), default=True),
        sa.Column('is_published_version', sa.Boolean(), default=False),
        sa.Column('restored_from_version_id', sa.Integer(), sa.ForeignKey('content_versions.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('content_category', 'content_id', 'version_number', name='uq_content_version_number')
    )
    
    # Content versions indexes
    op.create_index('ix_content_versions_content', 'content_versions', ['content_category', 'content_id'])
    op.create_index('ix_content_versions_current', 'content_versions', ['content_category', 'content_id', 'is_current'])
    op.create_index('ix_content_versions_changed_by', 'content_versions', ['changed_by_id'])
    
    # ==========================================================================
    # content_approvals tablosu oluştur
    # ==========================================================================
    
    op.create_table(
        'content_approvals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('content_category', sa.Enum(
            'video', 'document', 'quiz', 'live_session', 'assignment',
            name='contentcategory'
        ), nullable=False),
        sa.Column('content_id', sa.Integer(), nullable=False),
        sa.Column('previous_status', sa.Enum(
            'draft', 'pending_review', 'approved', 'rejected', 'published', 'archived',
            name='contentstatus'
        ), nullable=False),
        sa.Column('new_status', sa.Enum(
            'draft', 'pending_review', 'approved', 'rejected', 'published', 'archived',
            name='contentstatus'
        ), nullable=False),
        sa.Column('reviewed_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('rejection_reason', sa.Enum(
            'inappropriate_content', 'low_quality', 'duplicate',
            'copyright_violation', 'incomplete', 'technical_issue', 'other',
            name='rejectionreason'
        ), nullable=True),
        sa.Column('rejection_details', sa.Text(), nullable=True),
        sa.Column('reviewer_notes', sa.Text(), nullable=True),
        sa.Column('version_id', sa.Integer(), sa.ForeignKey('content_versions.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Content approvals indexes
    op.create_index('ix_content_approvals_content', 'content_approvals', ['content_category', 'content_id'])
    op.create_index('ix_content_approvals_reviewed_at', 'content_approvals', ['reviewed_at'])
    op.create_index('ix_content_approvals_reviewed_by', 'content_approvals', ['reviewed_by_id'])
    
    # ==========================================================================
    # videos tablosuna yeni kolonlar ekle
    # ==========================================================================
    
    # content_status kolonu
    op.add_column('videos', sa.Column(
        'content_status',
        sa.Enum('draft', 'pending_review', 'approved', 'rejected', 'published', 'archived', name='contentstatus'),
        nullable=True
    ))
    
    # Mevcut kayıtları 'published' olarak ayarla
    op.execute("UPDATE videos SET content_status = 'published' WHERE content_status IS NULL AND is_deleted = false")
    op.execute("UPDATE videos SET content_status = 'archived' WHERE content_status IS NULL AND is_deleted = true")
    
    # nullable=False yap
    op.alter_column('videos', 'content_status', nullable=False)
    
    # Versiyonlama kolonları
    op.add_column('videos', sa.Column('current_version', sa.Integer(), default=1))
    op.execute("UPDATE videos SET current_version = 1 WHERE current_version IS NULL")
    
    # Onay bilgileri
    op.add_column('videos', sa.Column('submitted_for_review_at', sa.DateTime(), nullable=True))
    op.add_column('videos', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('videos', sa.Column('approved_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('videos', sa.Column('published_at', sa.DateTime(), nullable=True))
    
    # Meta kolonları
    op.add_column('videos', sa.Column('tags', postgresql.JSONB(), default=list))
    op.add_column('videos', sa.Column('metadata', postgresql.JSONB(), default=dict))
    
    # Indexes
    op.create_index('ix_videos_content_status', 'videos', ['content_status'])
    op.create_index('ix_videos_topic_order', 'videos', ['topic_id', 'order'])
    op.create_index('ix_videos_status_content', 'videos', ['content_status', 'is_deleted'])
    op.create_index('ix_videos_uploaded_by', 'videos', ['uploaded_by'])
    
    # ==========================================================================
    # documents tablosuna yeni kolonlar ekle
    # ==========================================================================
    
    # content_status kolonu
    op.add_column('documents', sa.Column(
        'content_status',
        sa.Enum('draft', 'pending_review', 'approved', 'rejected', 'published', 'archived', name='contentstatus'),
        nullable=True
    ))
    
    # Mevcut kayıtları güncelle
    op.execute("UPDATE documents SET content_status = 'published' WHERE content_status IS NULL AND is_deleted = false")
    op.execute("UPDATE documents SET content_status = 'archived' WHERE content_status IS NULL AND is_deleted = true")
    
    op.alter_column('documents', 'content_status', nullable=False)
    
    # Versiyonlama kolonları
    op.add_column('documents', sa.Column('current_version', sa.Integer(), default=1))
    op.execute("UPDATE documents SET current_version = 1 WHERE current_version IS NULL")
    
    # Onay bilgileri
    op.add_column('documents', sa.Column('submitted_for_review_at', sa.DateTime(), nullable=True))
    op.add_column('documents', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('documents', sa.Column('approved_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('documents', sa.Column('published_at', sa.DateTime(), nullable=True))
    
    # Meta kolonları
    op.add_column('documents', sa.Column('tags', postgresql.JSONB(), default=list))
    op.add_column('documents', sa.Column('metadata', postgresql.JSONB(), default=dict))
    
    # Indexes
    op.create_index('ix_documents_content_status', 'documents', ['content_status'])
    op.create_index('ix_documents_topic_order', 'documents', ['topic_id', 'order'])
    op.create_index('ix_documents_status_content', 'documents', ['content_status', 'is_deleted'])
    op.create_index('ix_documents_uploaded_by', 'documents', ['uploaded_by'])


def downgrade():
    """Downgrade database."""
    
    # ==========================================================================
    # documents tablosundan kolonları kaldır
    # ==========================================================================
    
    op.drop_index('ix_documents_uploaded_by', 'documents')
    op.drop_index('ix_documents_status_content', 'documents')
    op.drop_index('ix_documents_topic_order', 'documents')
    op.drop_index('ix_documents_content_status', 'documents')
    
    op.drop_column('documents', 'metadata')
    op.drop_column('documents', 'tags')
    op.drop_column('documents', 'published_at')
    op.drop_column('documents', 'approved_by_id')
    op.drop_column('documents', 'approved_at')
    op.drop_column('documents', 'submitted_for_review_at')
    op.drop_column('documents', 'current_version')
    op.drop_column('documents', 'content_status')
    
    # ==========================================================================
    # videos tablosundan kolonları kaldır
    # ==========================================================================
    
    op.drop_index('ix_videos_uploaded_by', 'videos')
    op.drop_index('ix_videos_status_content', 'videos')
    op.drop_index('ix_videos_topic_order', 'videos')
    op.drop_index('ix_videos_content_status', 'videos')
    
    op.drop_column('videos', 'metadata')
    op.drop_column('videos', 'tags')
    op.drop_column('videos', 'published_at')
    op.drop_column('videos', 'approved_by_id')
    op.drop_column('videos', 'approved_at')
    op.drop_column('videos', 'submitted_for_review_at')
    op.drop_column('videos', 'current_version')
    op.drop_column('videos', 'content_status')
    
    # ==========================================================================
    # Tabloları kaldır
    # ==========================================================================
    
    op.drop_index('ix_content_approvals_reviewed_by', 'content_approvals')
    op.drop_index('ix_content_approvals_reviewed_at', 'content_approvals')
    op.drop_index('ix_content_approvals_content', 'content_approvals')
    op.drop_table('content_approvals')
    
    op.drop_index('ix_content_versions_changed_by', 'content_versions')
    op.drop_index('ix_content_versions_current', 'content_versions')
    op.drop_index('ix_content_versions_content', 'content_versions')
    op.drop_table('content_versions')
    
    # ==========================================================================
    # Enum types kaldır
    # ==========================================================================
    
    op.execute("DROP TYPE IF EXISTS rejectionreason")
    op.execute("DROP TYPE IF EXISTS contentcategory")
    op.execute("DROP TYPE IF EXISTS contentstatus")
