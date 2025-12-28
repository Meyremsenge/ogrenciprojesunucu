"""
Admin Module - Admin ve Super Admin paneli.

Kullanıcı yönetimi, içerik onayları, paket atamaları ve sistem ayarları.
"""

from flask import Blueprint

admin_bp = Blueprint('admin', __name__, url_prefix='/api/v1/admin')

from app.modules.admin import routes
