"""
Test configuration and fixtures.
"""

import pytest
from app import create_app
from app.extensions import db
from app.models.user import User, Role, Permission
from app.utils.seed_data import seed_roles, seed_permissions


@pytest.fixture(scope='session')
def app():
    """Create application for testing."""
    app = create_app('testing')
    
    with app.app_context():
        db.create_all()
        seed_roles()
        seed_permissions()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create CLI test runner."""
    return app.test_cli_runner()


@pytest.fixture
def db_session(app):
    """Create database session for testing."""
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        
        yield db.session
        
        transaction.rollback()
        connection.close()


@pytest.fixture
def student_user(app, db_session):
    """Create a test student user."""
    with app.app_context():
        role = Role.query.filter_by(name=Role.STUDENT).first()
        user = User(
            email='student@test.com',
            first_name='Test',
            last_name='Student',
            role_id=role.id,
            is_active=True,
            is_verified=True
        )
        user.password = 'password123'
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def teacher_user(app, db_session):
    """Create a test teacher user."""
    with app.app_context():
        role = Role.query.filter_by(name=Role.TEACHER).first()
        user = User(
            email='teacher@test.com',
            first_name='Test',
            last_name='Teacher',
            role_id=role.id,
            is_active=True,
            is_verified=True
        )
        user.password = 'password123'
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def admin_user(app, db_session):
    """Create a test admin user."""
    with app.app_context():
        role = Role.query.filter_by(name=Role.ADMIN).first()
        user = User(
            email='admin@test.com',
            first_name='Test',
            last_name='Admin',
            role_id=role.id,
            is_active=True,
            is_verified=True
        )
        user.password = 'password123'
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def super_admin_user(app, db_session):
    """Create a test super admin user."""
    with app.app_context():
        role = Role.query.filter_by(name=Role.SUPER_ADMIN).first()
        user = User(
            email='superadmin@test.com',
            first_name='Test',
            last_name='SuperAdmin',
            role_id=role.id,
            is_active=True,
            is_verified=True
        )
        user.password = 'password123'
        db.session.add(user)
        db.session.commit()
        return user


@pytest.fixture
def auth_headers(client, student_user):
    """Get authentication headers for student user."""
    response = client.post('/api/v1/auth/login', json={
        'email': 'student@test.com',
        'password': 'password123'
    })
    token = response.json['data']['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def teacher_auth_headers(client, teacher_user):
    """Get authentication headers for teacher user."""
    response = client.post('/api/v1/auth/login', json={
        'email': 'teacher@test.com',
        'password': 'password123'
    })
    token = response.json['data']['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def admin_auth_headers(client, admin_user):
    """Get authentication headers for admin user."""
    response = client.post('/api/v1/auth/login', json={
        'email': 'admin@test.com',
        'password': 'password123'
    })
    token = response.json['data']['access_token']
    return {'Authorization': f'Bearer {token}'}
