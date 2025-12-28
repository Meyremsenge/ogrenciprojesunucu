"""Add user password management columns

Revision ID: add_user_password_fields
Revises: add_packages_audit
Create Date: 2025-01-09 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_user_password_fields'
down_revision = 'add_packages_audit'
branch_labels = None
depends_on = None


def upgrade():
    """
    Adds password management and account lock columns to users table.
    
    New columns:
    - is_deleted: Soft delete flag
    - force_password_change: Requires password change on next login
    - password_changed_at: Last password change timestamp
    - failed_login_attempts: Count of failed login attempts
    - locked_until: Account lockout expiry time
    """
    
    # Add new columns to users table
    op.add_column('users', sa.Column('is_deleted', sa.Boolean(), 
                                      nullable=True, server_default='false'))
    op.add_column('users', sa.Column('force_password_change', sa.Boolean(), 
                                      nullable=True, server_default='false'))
    op.add_column('users', sa.Column('password_changed_at', sa.DateTime(), 
                                      nullable=True))
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), 
                                      nullable=True, server_default='0'))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(), 
                                      nullable=True))
    
    # Add index for is_deleted (frequently filtered)
    op.create_index('idx_users_deleted', 'users', ['is_deleted'])
    
    # Add index for locked_until (for finding locked accounts)
    op.create_index('idx_users_locked', 'users', ['locked_until'])
    
    # Add index for force_password_change
    op.create_index('idx_users_force_password', 'users', ['force_password_change'])
    
    # Update existing users to have is_deleted = False
    op.execute("UPDATE users SET is_deleted = false WHERE is_deleted IS NULL")
    op.execute("UPDATE users SET force_password_change = false WHERE force_password_change IS NULL")
    op.execute("UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL")


def downgrade():
    """
    Removes password management columns from users table.
    """
    # Drop indexes
    op.drop_index('idx_users_force_password', table_name='users')
    op.drop_index('idx_users_locked', table_name='users')
    op.drop_index('idx_users_deleted', table_name='users')
    
    # Drop columns
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')
    op.drop_column('users', 'password_changed_at')
    op.drop_column('users', 'force_password_change')
    op.drop_column('users', 'is_deleted')
