"""
Evaluations Module - Değerlendirme modülü.

Bu modül şunları içerir:
- Performans değerlendirme
- Ödev yönetimi
- Koçluk notları
"""

from flask import Blueprint

evaluations_bp = Blueprint('evaluations', __name__)

from app.modules.evaluations import routes  # noqa: E402, F401
from app.modules.evaluations.models import Assignment, AssignmentSubmission, CoachingNote, PerformanceReview

__all__ = ['evaluations_bp', 'Assignment', 'AssignmentSubmission', 'CoachingNote', 'PerformanceReview']
