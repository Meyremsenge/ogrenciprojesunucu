"""
Students Module - Öğrenci yönetimi modülü.

Bu modül şunları içerir:
- Öğrenci CRUD
"""

from flask import Blueprint

students_bp = Blueprint("students", __name__)

from app.modules.students import routes  # noqa: E402, F401

__all__ = ["students_bp"]
