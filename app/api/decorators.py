"""
API Decorators for authorization and permissions.
"""

from functools import wraps
from flask import request, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_current_user

from app.models.user import Role


def require_roles(*roles):
    """
    Decorator to require specific roles.
    
    Usage:
        @require_roles(Role.ADMIN, Role.SUPER_ADMIN)
        def admin_only_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user = get_current_user()
            
            if not user:
                return {
                    'success': False,
                    'error': {
                        'code': 'UNAUTHORIZED',
                        'message': 'User not found'
                    }
                }, 401
            
            if not user.is_active:
                return {
                    'success': False,
                    'error': {
                        'code': 'ACCOUNT_DISABLED',
                        'message': 'Your account has been disabled'
                    }
                }, 403
            
            if user.role.name not in roles:
                return {
                    'success': False,
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': 'You do not have permission to access this resource'
                    }
                }, 403
            
            g.current_user = user
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_permission(permission_name):
    """
    Decorator to require specific permission.
    
    Usage:
        @require_permission('courses:create')
        def create_course():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user = get_current_user()
            
            if not user:
                return {
                    'success': False,
                    'error': {
                        'code': 'UNAUTHORIZED',
                        'message': 'User not found'
                    }
                }, 401
            
            if not user.has_permission(permission_name):
                return {
                    'success': False,
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': f'Permission required: {permission_name}'
                    }
                }, 403
            
            g.current_user = user
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_at_least(role_name):
    """
    Decorator to require at least a certain role level.
    
    Usage:
        @require_at_least(Role.TEACHER)
        def teacher_or_higher():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user = get_current_user()
            
            if not user:
                return {
                    'success': False,
                    'error': {
                        'code': 'UNAUTHORIZED',
                        'message': 'User not found'
                    }
                }, 401
            
            if not user.is_active:
                return {
                    'success': False,
                    'error': {
                        'code': 'ACCOUNT_DISABLED',
                        'message': 'Your account has been disabled'
                    }
                }, 403
            
            if not user.is_at_least(role_name):
                return {
                    'success': False,
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': f'Minimum role required: {role_name}'
                    }
                }, 403
            
            g.current_user = user
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def admin_required(f):
    """Shortcut decorator for admin-only endpoints."""
    return require_roles(Role.ADMIN, Role.SUPER_ADMIN)(f)


def super_admin_required(f):
    """Shortcut decorator for super admin-only endpoints."""
    return require_roles(Role.SUPER_ADMIN)(f)


def teacher_required(f):
    """Shortcut decorator for teacher or higher endpoints."""
    return require_at_least(Role.TEACHER)(f)


def get_current_user_from_request():
    """Get current user from request context."""
    return getattr(g, 'current_user', None)
