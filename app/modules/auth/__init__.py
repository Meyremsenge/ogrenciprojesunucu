"""
Auth Module - Kimlik doğrulama modülü.

Bu modül şunları içerir:
- Login / Logout
- Register
- Token yenileme
- Şifre sıfırlama
- E-posta doğrulama
"""

from flask import Blueprint

auth_bp = Blueprint('auth', __name__)

from app.modules.auth import routes  # noqa: E402, F401

__all__ = ['auth_bp']
