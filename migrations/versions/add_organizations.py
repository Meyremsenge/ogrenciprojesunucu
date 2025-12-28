"""Add organizations multi-tenant support

Revision ID: add_organizations
Revises: add_content_versioning_approval
Create Date: 2025-01-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_organizations'
down_revision = 'add_content_versioning_approval'  # Son migration'a bağla
branch_labels = None
depends_on = None


def upgrade():
    # Organizations tablosu
    op.create_table('organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('primary_color', sa.String(length=7), nullable=True, server_default='#3B82F6'),
        sa.Column('secondary_color', sa.String(length=7), nullable=True, server_default='#10B981'),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='trial'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('max_students', sa.Integer(), nullable=True, server_default='50'),
        sa.Column('max_teachers', sa.Integer(), nullable=True, server_default='10'),
        sa.Column('max_admins', sa.Integer(), nullable=True, server_default='2'),
        sa.Column('max_courses', sa.Integer(), nullable=True, server_default='20'),
        sa.Column('max_storage_gb', sa.Integer(), nullable=True, server_default='10'),
        sa.Column('current_students', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('current_teachers', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('current_admins', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('current_courses', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('storage_used_mb', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('features', sa.JSON(), nullable=True),
        sa.Column('subscription_plan', sa.String(length=50), nullable=True, server_default='trial'),
        sa.Column('subscription_start', sa.DateTime(), nullable=True),
        sa.Column('subscription_end', sa.DateTime(), nullable=True),
        sa.Column('api_key', sa.String(length=64), nullable=True),
        sa.Column('api_secret', sa.String(length=128), nullable=True),
        sa.Column('settings', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
        sa.UniqueConstraint('api_key')
    )
    op.create_index('idx_org_slug', 'organizations', ['slug'], unique=False)
    op.create_index('idx_org_status', 'organizations', ['status'], unique=False)
    op.create_index('idx_org_active', 'organizations', ['is_active'], unique=False)

    # Organization Invitations tablosu
    op.create_table('organization_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False),
        sa.Column('invited_by_id', sa.Integer(), nullable=True),
        sa.Column('is_used', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    op.create_index('idx_invitation_token', 'organization_invitations', ['token'], unique=False)
    op.create_index('idx_invitation_email', 'organization_invitations', ['email'], unique=False)

    # Users tablosuna organization_id ekle
    op.add_column('users', sa.Column('organization_id', sa.Integer(), nullable=True))
    op.create_index('idx_users_organization', 'users', ['organization_id'], unique=False)
    op.create_foreign_key(
        'fk_users_organization_id',
        'users', 'organizations',
        ['organization_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    # Users tablosundan organization_id kaldır
    op.drop_constraint('fk_users_organization_id', 'users', type_='foreignkey')
    op.drop_index('idx_users_organization', table_name='users')
    op.drop_column('users', 'organization_id')
    
    # Organization Invitations tablosunu kaldır
    op.drop_index('idx_invitation_email', table_name='organization_invitations')
    op.drop_index('idx_invitation_token', table_name='organization_invitations')
    op.drop_table('organization_invitations')
    
    # Organizations tablosunu kaldır
    op.drop_index('idx_org_active', table_name='organizations')
    op.drop_index('idx_org_status', table_name='organizations')
    op.drop_index('idx_org_slug', table_name='organizations')
    op.drop_table('organizations')
