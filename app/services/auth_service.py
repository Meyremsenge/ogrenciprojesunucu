"""
Authentication Service.
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
import secrets

from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token

from app.extensions import db
from app.models.user import User, Role


class AuthService:
    """Service for authentication operations."""
    
    def __init__(self):
        self.reset_token_expiry = timedelta(hours=24)
    
    def authenticate(self, email: str, password: str) -> Tuple[Optional[User], Optional[str]]:
        """
        Authenticate user with email and password.
        
        Returns:
            Tuple of (user, error_message)
        """
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user:
            return None, 'Invalid email or password'
        
        if not user.check_password(password):
            return None, 'Invalid email or password'
        
        if not user.is_active:
            return None, 'Account is disabled'
        
        return user, None
    
    def generate_tokens(self, user: User) -> dict:
        """Generate access and refresh tokens for user."""
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer'
        }
    
    def generate_password_reset_token(self, user: User) -> str:
        """Generate a password reset token."""
        token = secrets.token_urlsafe(32)
        
        # Store token hash in cache or database
        # For simplicity, we'll store it in a user field
        # In production, use Redis or a separate table
        
        return token
    
    def verify_password_reset_token(self, token: str) -> Optional[User]:
        """Verify password reset token and return user."""
        # In production, verify against stored token hash
        # This is a placeholder implementation
        return None
    
    def reset_password(self, token: str, new_password: str) -> bool:
        """Reset password using token."""
        user = self.verify_password_reset_token(token)
        
        if not user:
            return False
        
        user.password = new_password
        db.session.commit()
        
        return True
    
    def send_password_reset_email(self, user: User) -> bool:
        """Send password reset email."""
        token = self.generate_password_reset_token(user)
        
        reset_url = f"{current_app.config.get('FRONTEND_URL')}/reset-password?token={token}"
        
        # TODO: Send email using email service
        # email_service.send_email(
        #     to=user.email,
        #     subject='Password Reset Request',
        #     template='password_reset',
        #     context={'reset_url': reset_url, 'user': user}
        # )
        
        return True
    
    def send_verification_email(self, user: User) -> bool:
        """Send email verification."""
        token = secrets.token_urlsafe(32)
        
        verify_url = f"{current_app.config.get('FRONTEND_URL')}/verify-email?token={token}"
        
        # TODO: Send email using email service
        
        return True
    
    def verify_email(self, token: str) -> bool:
        """Verify email with token."""
        # In production, verify against stored token
        # This is a placeholder implementation
        return False
