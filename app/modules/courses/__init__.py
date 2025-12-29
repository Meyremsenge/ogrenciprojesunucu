"""
Courses Module - Kurs yönetimi modülü.

Bu modül şunları içerir:
- Kurs CRUD
- Konu yönetimi
- Kayıt (enrollment) işlemleri
"""

from flask import Blueprint

courses_bp = Blueprint('courses', __name__)

from app.modules.courses import routes  # noqa: E402, F401
from app.modules.courses.models import Course, Topic, Enrollment

__all__ = ['courses_bp', 'Course', 'Topic', 'Enrollment']
