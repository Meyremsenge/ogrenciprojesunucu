"""
Live Classes Module - Canlı ders modülü.

Bu modül şunları içerir:
- Canlı ders oturumları
- Katılım takibi
- Oturum yönetimi
"""

from flask import Blueprint

live_classes_bp = Blueprint('live_classes', __name__)

from app.modules.live_classes import routes  # noqa: E402, F401
from app.modules.live_classes.models import LiveSession, SessionAttendance

__all__ = ['live_classes_bp', 'LiveSession', 'SessionAttendance']
