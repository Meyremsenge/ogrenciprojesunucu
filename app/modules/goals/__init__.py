"""
Goals Module - Hedef Yönetimi

Öğrenci hedefleri API endpoint'leri.
"""

from flask import Blueprint

goals_bp = Blueprint('goals', __name__, url_prefix='/goals')

from app.modules.goals import routes  # noqa
