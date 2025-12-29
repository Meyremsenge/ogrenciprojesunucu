"""
Users Module - Kullanıcı yönetimi modülü.

Bu modül şunları içerir:
- Kullanıcı CRUD
- Rol ve yetki yönetimi
- Profil işlemleri
"""

from flask import Blueprint

users_bp = Blueprint('users', __name__)

from app.modules.users import routes  # noqa: E402, F401
from app.modules.users.models import User, Role, Permission, TokenBlacklist, Notification

__all__ = ['users_bp', 'User', 'Role', 'Permission', 'TokenBlacklist', 'Notification']
