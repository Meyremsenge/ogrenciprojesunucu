"""
Quick seed script for development.
Run with: python init_db.py
"""

import os
import sys

# Set environment
os.environ['FLASK_ENV'] = 'development'

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import only what we need BEFORE creating app
from app import create_app
from app.extensions import db

# Create app
app = create_app()

with app.app_context():
    # Import models AFTER app context
    from app.models.user import User, Role, Permission
    from app.models.course import Category
    
    print("Creating tables...")
    db.create_all()
    
    # Seed roles
    print("Seeding roles...")
    roles_data = [
        {'name': 'super_admin', 'description': 'Super Administrator with full access', 'is_system': True},
        {'name': 'admin', 'description': 'Administrator with management access', 'is_system': True},
        {'name': 'teacher', 'description': 'Teacher who can create and manage content', 'is_system': True},
        {'name': 'student', 'description': 'Student who can access courses and content', 'is_system': True},
    ]
    
    for role_data in roles_data:
        role = Role.query.filter_by(name=role_data['name']).first()
        if not role:
            role = Role(**role_data)
            db.session.add(role)
            print(f"  Created role: {role_data['name']}")
    
    db.session.commit()
    
    # Seed permissions
    print("Seeding permissions...")
    resources = ['users', 'courses', 'topics', 'videos', 'questions', 'exams', 'evaluations', 'reports']
    actions = ['create', 'read', 'update', 'delete', 'manage']
    
    for resource in resources:
        for action in actions:
            name = f'{resource}:{action}'
            permission = Permission.query.filter_by(name=name).first()
            
            if not permission:
                permission = Permission(
                    name=name,
                    description=f'{action.capitalize()} {resource}',
                    resource=resource,
                    action=action
                )
                db.session.add(permission)
    
    db.session.commit()
    print("  Permissions created")
    
    # Assign permissions to roles
    print("Assigning permissions to roles...")
    
    super_admin = Role.query.filter_by(name='super_admin').first()
    if super_admin:
        all_permissions = Permission.query.all()
        super_admin.permissions = all_permissions
    
    admin = Role.query.filter_by(name='admin').first()
    if admin:
        admin_permissions = Permission.query.filter(
            ~Permission.name.in_(['users:manage', 'reports:manage'])
        ).all()
        admin.permissions = admin_permissions
    
    teacher = Role.query.filter_by(name='teacher').first()
    if teacher:
        teacher_resources = ['courses', 'topics', 'videos', 'questions', 'exams', 'evaluations']
        teacher_permissions = Permission.query.filter(
            Permission.resource.in_(teacher_resources)
        ).all()
        teacher.permissions = teacher_permissions
    
    student = Role.query.filter_by(name='student').first()
    if student:
        student_permissions = Permission.query.filter(
            Permission.action == 'read',
            Permission.resource.in_(['courses', 'topics', 'videos', 'questions', 'exams'])
        ).all()
        student.permissions = student_permissions
    
    db.session.commit()
    print("  Permissions assigned")
    
    # Seed categories
    print("Seeding categories...")
    categories_data = [
        {'name': 'Matematik', 'slug': 'matematik', 'icon': '📐'},
        {'name': 'Fizik', 'slug': 'fizik', 'icon': '⚛️'},
        {'name': 'Kimya', 'slug': 'kimya', 'icon': '🧪'},
        {'name': 'Biyoloji', 'slug': 'biyoloji', 'icon': '🧬'},
        {'name': 'Türkçe', 'slug': 'turkce', 'icon': '📚'},
        {'name': 'İngilizce', 'slug': 'ingilizce', 'icon': '🌍'},
        {'name': 'Tarih', 'slug': 'tarih', 'icon': '🏛️'},
        {'name': 'Coğrafya', 'slug': 'cografya', 'icon': '🗺️'},
        {'name': 'Programlama', 'slug': 'programlama', 'icon': '💻'},
        {'name': 'Diğer', 'slug': 'diger', 'icon': '📖'},
    ]
    
    for idx, cat_data in enumerate(categories_data):
        category = Category.query.filter_by(slug=cat_data['slug']).first()
        if not category:
            category = Category(
                name=cat_data['name'],
                slug=cat_data['slug'],
                icon=cat_data['icon'],
                order_index=idx,
                is_active=True
            )
            db.session.add(category)
            print(f"  Created category: {cat_data['name']}")
    
    db.session.commit()
    
    # Seed demo users
    print("Seeding demo users...")
    demo_users = [
        {
            'email': 'student@demo.com',
            'password': 'Demo123!',
            'first_name': 'Demo',
            'last_name': 'Öğrenci',
            'role_name': 'student',
        },
        {
            'email': 'teacher@demo.com',
            'password': 'Demo123!',
            'first_name': 'Demo',
            'last_name': 'Öğretmen',
            'role_name': 'teacher',
        },
        {
            'email': 'admin@demo.com',
            'password': 'Demo123!',
            'first_name': 'Demo',
            'last_name': 'Admin',
            'role_name': 'admin',
        },
        {
            'email': 'superadmin@demo.com',
            'password': 'Demo123!',
            'first_name': 'Demo',
            'last_name': 'Süper Admin',
            'role_name': 'super_admin',
        },
    ]
    
    for user_data in demo_users:
        existing_user = User.query.filter_by(email=user_data['email']).first()
        if not existing_user:
            role = Role.query.filter_by(name=user_data['role_name']).first()
            if role:
                user = User(
                    email=user_data['email'],
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name'],
                    role_id=role.id,
                    is_active=True,
                    is_verified=True
                )
                user.password = user_data['password']
                db.session.add(user)
                print(f"  Created user: {user_data['email']}")
    
    db.session.commit()
    
    print("\n✅ Database initialization complete!")
    print("\nDemo accounts:")
    print("  student@demo.com / Demo123!")
    print("  teacher@demo.com / Demo123!")
    print("  admin@demo.com / Demo123!")
    print("  superadmin@demo.com / Demo123!")
