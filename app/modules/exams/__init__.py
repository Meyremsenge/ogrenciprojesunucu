"""
Exams Module - Sınav yönetimi modülü.

Bu modül şunları içerir:
- Sınav CRUD
- Soru yönetimi
- Sınav girişleri
- Otomatik değerlendirme
"""

from flask import Blueprint

exams_bp = Blueprint('exams', __name__)

from app.modules.exams import routes  # noqa: E402, F401
from app.modules.exams.models import Exam, Question, Answer, ExamAttempt, AttemptAnswer

__all__ = ['exams_bp', 'Exam', 'Question', 'Answer', 'ExamAttempt', 'AttemptAnswer']
