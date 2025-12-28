"""
Tests for user management API endpoints.
"""

import pytest


class TestUserList:
    """Tests for user listing."""
    
    def test_list_users_as_admin(self, client, admin_auth_headers):
        """Test listing users as admin."""
        response = client.get('/api/v1/users/', headers=admin_auth_headers)
        
        assert response.status_code == 200
        assert 'items' in response.json['data']
    
    def test_list_users_as_student(self, client, auth_headers):
        """Test listing users as student (should fail)."""
        response = client.get('/api/v1/users/', headers=auth_headers)
        
        assert response.status_code == 403
    
    def test_list_users_with_role_filter(self, client, admin_auth_headers):
        """Test listing users with role filter."""
        response = client.get('/api/v1/users/?role=student', headers=admin_auth_headers)
        
        assert response.status_code == 200


class TestUserCreate:
    """Tests for user creation by admin."""
    
    def test_create_user_as_admin(self, client, admin_auth_headers):
        """Test creating user as admin."""
        response = client.post('/api/v1/users/', headers=admin_auth_headers, json={
            'email': 'newstudent@test.com',
            'password': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'Student',
            'role': 'student'
        })
        
        assert response.status_code == 201
        assert response.json['data']['email'] == 'newstudent@test.com'
    
    def test_create_user_as_teacher(self, client, teacher_auth_headers):
        """Test creating user as teacher (should fail)."""
        response = client.post('/api/v1/users/', headers=teacher_auth_headers, json={
            'email': 'newstudent2@test.com',
            'password': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'Student',
            'role': 'student'
        })
        
        assert response.status_code == 403


class TestUserDetail:
    """Tests for user detail operations."""
    
    def test_get_user_detail(self, client, admin_auth_headers, student_user):
        """Test getting user detail."""
        response = client.get(f'/api/v1/users/{student_user.id}', headers=admin_auth_headers)
        
        assert response.status_code == 200
        assert response.json['data']['id'] == student_user.id
    
    def test_get_nonexistent_user(self, client, admin_auth_headers):
        """Test getting non-existent user."""
        response = client.get('/api/v1/users/99999', headers=admin_auth_headers)
        
        assert response.status_code == 404
    
    def test_update_user(self, client, admin_auth_headers, student_user):
        """Test updating user."""
        response = client.put(f'/api/v1/users/{student_user.id}', headers=admin_auth_headers, json={
            'first_name': 'Updated'
        })
        
        assert response.status_code == 200
        assert response.json['data']['first_name'] == 'Updated'
    
    def test_delete_user(self, client, admin_auth_headers, app, db_session):
        """Test deleting user (soft delete)."""
        from app.models.user import User, Role
        from app.extensions import db
        
        with app.app_context():
            role = Role.query.filter_by(name=Role.STUDENT).first()
            user = User(
                email='todelete@test.com',
                first_name='To',
                last_name='Delete',
                role_id=role.id
            )
            user.password = 'password123'
            db.session.add(user)
            db.session.commit()
            user_id = user.id
        
        response = client.delete(f'/api/v1/users/{user_id}', headers=admin_auth_headers)
        
        assert response.status_code == 200


class TestUserProfile:
    """Tests for user profile operations."""
    
    def test_get_own_profile(self, client, auth_headers):
        """Test getting own profile."""
        response = client.get('/api/v1/users/profile', headers=auth_headers)
        
        assert response.status_code == 200
    
    def test_update_own_profile(self, client, auth_headers):
        """Test updating own profile."""
        response = client.put('/api/v1/users/profile', headers=auth_headers, json={
            'phone': '+905551234567'
        })
        
        assert response.status_code == 200
