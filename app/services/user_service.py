"""
User Service.
"""

from typing import Optional, List
from app.extensions import db
from app.models.user import User, Role


class UserService:
    """Service for user management operations."""
    
    def create_user(
        self,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        role_name: str = Role.STUDENT,
        **kwargs
    ) -> User:
        """Create a new user."""
        role = Role.query.filter_by(name=role_name).first()
        
        if not role:
            raise ValueError(f'Role {role_name} not found')
        
        user = User(
            email=email.lower().strip(),
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            role_id=role.id,
            **kwargs
        )
        user.password = password
        
        db.session.add(user)
        db.session.commit()
        
        return user
    
    def create_super_admin(
        self,
        email: str,
        password: str,
        first_name: str,
        last_name: str
    ) -> User:
        """Create a super admin user."""
        return self.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role_name=Role.SUPER_ADMIN,
            is_verified=True
        )
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return User.query.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        return User.query.filter_by(email=email.lower()).first()
    
    def get_users(
        self,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> tuple:
        """Get paginated list of users."""
        query = User.query
        
        if role:
            role_obj = Role.query.filter_by(name=role).first()
            if role_obj:
                query = query.filter(User.role_id == role_obj.id)
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                db.or_(
                    User.email.ilike(search_term),
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term)
                )
            )
        
        query = query.order_by(User.created_at.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return pagination.items, pagination.total, pagination.pages
    
    def update_user(self, user: User, **kwargs) -> User:
        """Update user attributes."""
        for key, value in kwargs.items():
            if hasattr(user, key) and key not in ['id', 'password_hash', 'role_id']:
                setattr(user, key, value)
        
        db.session.commit()
        return user
    
    def change_password(self, user: User, new_password: str) -> User:
        """Change user password."""
        user.password = new_password
        db.session.commit()
        return user
    
    def change_role(self, user: User, new_role_name: str) -> User:
        """Change user role."""
        role = Role.query.filter_by(name=new_role_name).first()
        
        if not role:
            raise ValueError(f'Role {new_role_name} not found')
        
        user.role_id = role.id
        db.session.commit()
        
        return user
    
    def deactivate_user(self, user: User) -> User:
        """Deactivate user (soft delete)."""
        user.is_active = False
        db.session.commit()
        return user
    
    def activate_user(self, user: User) -> User:
        """Activate user."""
        user.is_active = True
        db.session.commit()
        return user
    
    def get_students_by_teacher(self, teacher_id: int) -> List[User]:
        """Get all students enrolled in courses by a teacher."""
        from app.models.course import Course, Enrollment
        
        student_ids = db.session.query(Enrollment.user_id).join(
            Course, Enrollment.course_id == Course.id
        ).filter(
            Course.teacher_id == teacher_id
        ).distinct().all()
        
        student_ids = [id[0] for id in student_ids]
        
        return User.query.filter(User.id.in_(student_ids)).all()
