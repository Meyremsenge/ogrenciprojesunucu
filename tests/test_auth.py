"""
Tests for authentication API endpoints.
"""

import pytest
from flask import url_for


class TestAuthRegister:
    """Tests for user registration."""
    
    def test_register_success(self, client):
        """Test successful user registration."""
        response = client.post('/api/v1/auth/register', json={
            'email': 'newuser@test.com',
            'password': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User'
        })
        
        assert response.status_code == 201
        assert response.json['success'] is True
        assert 'access_token' in response.json['data']
    
    def test_register_duplicate_email(self, client, student_user):
        """Test registration with existing email."""
        response = client.post('/api/v1/auth/register', json={
            'email': 'student@test.com',
            'password': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User'
        })
        
        assert response.status_code == 400
        assert response.json['success'] is False
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email."""
        response = client.post('/api/v1/auth/register', json={
            'email': 'invalid-email',
            'password': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User'
        })
        
        assert response.status_code == 400
    
    def test_register_weak_password(self, client):
        """Test registration with weak password."""
        response = client.post('/api/v1/auth/register', json={
            'email': 'newuser2@test.com',
            'password': '123',
            'first_name': 'New',
            'last_name': 'User'
        })
        
        assert response.status_code == 400


class TestAuthLogin:
    """Tests for user login."""
    
    def test_login_success(self, client, student_user):
        """Test successful login."""
        response = client.post('/api/v1/auth/login', json={
            'email': 'student@test.com',
            'password': 'password123'
        })
        
        assert response.status_code == 200
        assert response.json['success'] is True
        assert 'access_token' in response.json['data']
        assert 'refresh_token' in response.json['data']
    
    def test_login_wrong_password(self, client, student_user):
        """Test login with wrong password."""
        response = client.post('/api/v1/auth/login', json={
            'email': 'student@test.com',
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 401
        assert response.json['success'] is False
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        response = client.post('/api/v1/auth/login', json={
            'email': 'nonexistent@test.com',
            'password': 'password123'
        })
        
        assert response.status_code == 401
    
    def test_login_inactive_user(self, client, app, db_session):
        """Test login with inactive user."""
        from app.models.user import User, Role
        from app.extensions import db
        
        with app.app_context():
            role = Role.query.filter_by(name=Role.STUDENT).first()
            user = User(
                email='inactive@test.com',
                first_name='Inactive',
                last_name='User',
                role_id=role.id,
                is_active=False
            )
            user.password = 'password123'
            db.session.add(user)
            db.session.commit()
        
        response = client.post('/api/v1/auth/login', json={
            'email': 'inactive@test.com',
            'password': 'password123'
        })
        
        assert response.status_code == 401


class TestAuthRefresh:
    """Tests for token refresh."""
    
    def test_refresh_token_success(self, client, student_user):
        """Test successful token refresh."""
        # First login
        login_response = client.post('/api/v1/auth/login', json={
            'email': 'student@test.com',
            'password': 'password123'
        })
        
        refresh_token = login_response.json['data']['refresh_token']
        
        # Refresh token
        response = client.post('/api/v1/auth/refresh', headers={
            'Authorization': f'Bearer {refresh_token}'
        })
        
        assert response.status_code == 200
        assert 'access_token' in response.json['data']
    
    def test_refresh_with_access_token(self, client, auth_headers):
        """Test refresh with access token (should fail)."""
        response = client.post('/api/v1/auth/refresh', headers=auth_headers)
        
        # Should fail because access token is not refresh token
        assert response.status_code in [401, 422]


class TestAuthLogout:
    """Tests for user logout."""
    
    def test_logout_success(self, client, auth_headers):
        """Test successful logout."""
        response = client.post('/api/v1/auth/logout', headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json['success'] is True
    
    def test_logout_without_token(self, client):
        """Test logout without authentication."""
        response = client.post('/api/v1/auth/logout')
        
        assert response.status_code == 401


class TestAuthMe:
    """Tests for current user info endpoint."""
    
    def test_get_current_user(self, client, auth_headers, student_user):
        """Test getting current user info."""
        response = client.get('/api/v1/auth/me', headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json['data']['email'] == 'student@test.com'
    
    def test_get_current_user_without_auth(self, client):
        """Test getting current user without authentication."""
        response = client.get('/api/v1/auth/me')
        
        assert response.status_code == 401
