"""
Seed data for initial database population.
"""

from app.extensions import db
from app.models.user import User, Role, Permission


def seed_roles():
    """Seed default roles."""
    roles_data = [
        {'name': Role.SUPER_ADMIN, 'description': 'Super Administrator with full access', 'is_system': True},
        {'name': Role.ADMIN, 'description': 'Administrator with management access', 'is_system': True},
        {'name': Role.TEACHER, 'description': 'Teacher who can create and manage content', 'is_system': True},
        {'name': Role.STUDENT, 'description': 'Student who can access courses and content', 'is_system': True},
    ]
    
    for role_data in roles_data:
        role = Role.query.filter_by(name=role_data['name']).first()
        if not role:
            role = Role(**role_data)
            db.session.add(role)
            print(f"Created role: {role_data['name']}")
    
    db.session.commit()


def seed_permissions():
    """Seed default permissions."""
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
    print("Permissions seeded")


def assign_role_permissions():
    """Assign default permissions to roles."""
    # Super Admin gets all permissions
    super_admin = Role.query.filter_by(name=Role.SUPER_ADMIN).first()
    if super_admin:
        all_permissions = Permission.query.all()
        super_admin.permissions = all_permissions
    
    # Admin permissions
    admin = Role.query.filter_by(name=Role.ADMIN).first()
    if admin:
        admin_permissions = Permission.query.filter(
            ~Permission.name.in_(['users:manage', 'reports:manage'])
        ).all()
        admin.permissions = admin_permissions
    
    # Teacher permissions
    teacher = Role.query.filter_by(name=Role.TEACHER).first()
    if teacher:
        teacher_resources = ['courses', 'topics', 'videos', 'questions', 'exams', 'evaluations']
        teacher_permissions = Permission.query.filter(
            Permission.resource.in_(teacher_resources)
        ).all()
        teacher.permissions = teacher_permissions
    
    # Student permissions (read-only for most)
    student = Role.query.filter_by(name=Role.STUDENT).first()
    if student:
        student_permissions = Permission.query.filter(
            Permission.action == 'read',
            Permission.resource.in_(['courses', 'topics', 'videos', 'questions', 'exams'])
        ).all()
        student.permissions = student_permissions
    
    db.session.commit()
    print("Role permissions assigned")


def seed_demo_users():
    """Seed demo users for testing."""
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
                print(f"Created demo user: {user_data['email']}")
    
    db.session.commit()
    print("Demo users seeded")


def seed_categories():
    """Seed default course categories."""
    from app.models.course import Category
    
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
            print(f"Created category: {cat_data['name']}")
    
    db.session.commit()


def seed_database():
    """Run all seeders."""
    print("Starting database seeding...")
    
    seed_roles()
    seed_permissions()
    assign_role_permissions()
    seed_categories()
    seed_demo_users()
    
    print("Database seeding completed!")


if __name__ == '__main__':
    from app import create_app
    
    app = create_app()
    with app.app_context():
        seed_database()
