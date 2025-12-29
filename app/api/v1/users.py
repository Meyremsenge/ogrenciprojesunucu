"""
Users API endpoints.
"""

from flask import request, g
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_current_user

from app.extensions import db
from app.models.user import User, Role
from app.api.decorators import admin_required, super_admin_required

users_ns = Namespace('users', description='User management operations')

# Request/Response Models
user_model = users_ns.model('User', {
    'id': fields.Integer(description='User ID'),
    'email': fields.String(description='Email address'),
    'first_name': fields.String(description='First name'),
    'last_name': fields.String(description='Last name'),
    'full_name': fields.String(description='Full name'),
    'phone': fields.String(description='Phone number'),
    'avatar_url': fields.String(description='Avatar URL'),
    'is_active': fields.Boolean(description='Is active'),
    'is_verified': fields.Boolean(description='Is email verified'),
    'role': fields.String(description='User role'),
    'created_at': fields.String(description='Created at'),
})

user_update_model = users_ns.model('UserUpdate', {
    'first_name': fields.String(description='First name'),
    'last_name': fields.String(description='Last name'),
    'phone': fields.String(description='Phone number'),
    'avatar_url': fields.String(description='Avatar URL'),
})

user_create_model = users_ns.model('UserCreate', {
    'email': fields.String(required=True, description='Email address'),
    'password': fields.String(required=True, description='Password'),
    'first_name': fields.String(required=True, description='First name'),
    'last_name': fields.String(required=True, description='Last name'),
    'phone': fields.String(description='Phone number'),
    'role': fields.String(description='Role name (admin only)'),
})

role_update_model = users_ns.model('RoleUpdate', {
    'role': fields.String(required=True, description='New role name'),
})


@users_ns.route('')
class UserList(Resource):
    """User list and creation endpoints."""
    
    @jwt_required()
    @admin_required
    @users_ns.doc('list_users', security='Bearer')
    @users_ns.param('page', 'Page number', type=int, default=1)
    @users_ns.param('per_page', 'Items per page', type=int, default=20)
    @users_ns.param('role', 'Filter by role')
    @users_ns.param('search', 'Search by name or email')
    @users_ns.param('is_active', 'Filter by active status', type=bool)
    def get(self):
        """Get list of users (Admin only)."""
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        role_filter = request.args.get('role')
        search = request.args.get('search', '').strip()
        is_active = request.args.get('is_active')
        
        query = User.query
        
        # Apply filters
        if role_filter:
            role = Role.query.filter_by(name=role_filter).first()
            if role:
                query = query.filter(User.role_id == role.id)
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                db.or_(
                    User.email.ilike(search_term),
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term)
                )
            )
        
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true' if isinstance(is_active, str) else is_active
            query = query.filter(User.is_active == is_active_bool)
        
        # Order by creation date
        query = query.order_by(User.created_at.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            'success': True,
            'data': [user.to_dict() for user in pagination.items],
            'meta': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'total_pages': pagination.pages
            }
        }, 200
    
    @jwt_required()
    @admin_required
    @users_ns.expect(user_create_model)
    @users_ns.doc('create_user', security='Bearer')
    def post(self):
        """Create a new user (Admin only)."""
        current_user = g.current_user
        data = request.get_json()
        
        email = data.get('email', '').lower().strip()
        
        # Check if email exists
        if User.query.filter_by(email=email).first():
            return {
                'success': False,
                'error': {
                    'code': 'EMAIL_EXISTS',
                    'message': 'Email address is already registered'
                }
            }, 400
        
        # Determine role
        role_name = data.get('role', Role.STUDENT)
        
        # Only super admin can create admins
        if role_name in [Role.ADMIN, Role.SUPER_ADMIN]:
            if not current_user.is_super_admin:
                return {
                    'success': False,
                    'error': {
                        'code': 'FORBIDDEN',
                        'message': 'Only super admin can create admin users'
                    }
                }, 403
        
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            return {
                'success': False,
                'error': {
                    'code': 'INVALID_ROLE',
                    'message': f'Role {role_name} does not exist'
                }
            }, 400
        
        # Create user
        user = User(
            email=email,
            first_name=data.get('first_name', '').strip(),
            last_name=data.get('last_name', '').strip(),
            phone=data.get('phone', '').strip() if data.get('phone') else None,
            role_id=role.id,
            is_verified=True  # Admin-created users are auto-verified
        )
        user.password = data.get('password')
        
        db.session.add(user)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'User created successfully',
            'data': user.to_dict()
        }, 201


@users_ns.route('/<int:user_id>')
class UserDetail(Resource):
    """Single user operations."""
    
    @jwt_required()
    @users_ns.doc('get_user', security='Bearer')
    def get(self, user_id):
        """Get user by ID."""
        current_user = get_current_user()
        
        # Users can only view their own profile unless admin
        if current_user.id != user_id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only view your own profile'
                }
            }, 403
        
        user = User.query.get(user_id)
        
        if not user:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'User not found'
                }
            }, 404
        
        include_sensitive = current_user.id == user_id or current_user.is_admin
        
        return {
            'success': True,
            'data': user.to_dict(include_sensitive=include_sensitive)
        }, 200
    
    @jwt_required()
    @users_ns.expect(user_update_model)
    @users_ns.doc('update_user', security='Bearer')
    def put(self, user_id):
        """Update user."""
        current_user = get_current_user()
        
        # Users can only update their own profile unless admin
        if current_user.id != user_id and not current_user.is_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'You can only update your own profile'
                }
            }, 403
        
        user = User.query.get(user_id)
        
        if not user:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'User not found'
                }
            }, 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'first_name' in data:
            user.first_name = data['first_name'].strip()
        if 'last_name' in data:
            user.last_name = data['last_name'].strip()
        if 'phone' in data:
            user.phone = data['phone'].strip() if data['phone'] else None
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'User updated successfully',
            'data': user.to_dict()
        }, 200
    
    @jwt_required()
    @admin_required
    @users_ns.doc('delete_user', security='Bearer')
    def delete(self, user_id):
        """Delete user (soft delete - Admin only)."""
        current_user = g.current_user
        
        user = User.query.get(user_id)
        
        if not user:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'User not found'
                }
            }, 404
        
        # Prevent self-deletion
        if user.id == current_user.id:
            return {
                'success': False,
                'error': {
                    'code': 'INVALID_OPERATION',
                    'message': 'You cannot delete your own account'
                }
            }, 400
        
        # Only super admin can delete admins
        if user.is_admin and not current_user.is_super_admin:
            return {
                'success': False,
                'error': {
                    'code': 'FORBIDDEN',
                    'message': 'Only super admin can delete admin users'
                }
            }, 403
        
        # Soft delete
        user.is_active = False
        db.session.commit()
        
        return {
            'success': True,
            'message': 'User deactivated successfully'
        }, 200


@users_ns.route('/<int:user_id>/role')
class UserRole(Resource):
    """User role management."""
    
    @jwt_required()
    @super_admin_required
    @users_ns.expect(role_update_model)
    @users_ns.doc('update_user_role', security='Bearer')
    def put(self, user_id):
        """Update user role (Super Admin only)."""
        user = User.query.get(user_id)
        
        if not user:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'User not found'
                }
            }, 404
        
        data = request.get_json()
        role_name = data.get('role')
        
        role = Role.query.filter_by(name=role_name).first()
        
        if not role:
            return {
                'success': False,
                'error': {
                    'code': 'INVALID_ROLE',
                    'message': f'Role {role_name} does not exist'
                }
            }, 400
        
        user.role_id = role.id
        db.session.commit()
        
        return {
            'success': True,
            'message': f'User role updated to {role_name}',
            'data': user.to_dict()
        }, 200


@users_ns.route('/<int:user_id>/activate')
class UserActivate(Resource):
    """User activation."""
    
    @jwt_required()
    @admin_required
    @users_ns.doc('activate_user', security='Bearer')
    def post(self, user_id):
        """Activate a deactivated user (Admin only)."""
        user = User.query.get(user_id)
        
        if not user:
            return {
                'success': False,
                'error': {
                    'code': 'NOT_FOUND',
                    'message': 'User not found'
                }
            }, 404
        
        user.is_active = True
        db.session.commit()
        
        return {
            'success': True,
            'message': 'User activated successfully',
            'data': user.to_dict()
        }, 200


@users_ns.route('/me')
class CurrentUserProfile(Resource):
    """Current user profile operations."""
    
    @jwt_required()
    @users_ns.doc('get_my_profile', security='Bearer')
    def get(self):
        """Get current user's profile."""
        user = get_current_user()
        
        return {
            'success': True,
            'data': user.to_dict(include_sensitive=True)
        }, 200
    
    @jwt_required()
    @users_ns.expect(user_update_model)
    @users_ns.doc('update_my_profile', security='Bearer')
    def put(self):
        """Update current user's profile."""
        user = get_current_user()
        data = request.get_json()
        
        if 'first_name' in data:
            user.first_name = data['first_name'].strip()
        if 'last_name' in data:
            user.last_name = data['last_name'].strip()
        if 'phone' in data:
            user.phone = data['phone'].strip() if data['phone'] else None
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']
        
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Profile updated successfully',
            'data': user.to_dict(include_sensitive=True)
        }, 200
