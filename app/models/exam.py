"""
Exam models.

All exam models are imported from app.modules.exams.models to avoid duplicate definitions.
"""

# Import models from modules/exams/models to avoid duplicate model definitions
from app.modules.exams.models import (
    Exam,
    ExamStatus,
    ExamType,
    ExamOwnerType,
    ExamAttempt,
    AttemptStatus,
    AttemptAnswer,
    Question,
    Answer,
)

# Backward compatibility aliases
ExamQuestion = Question  # Eski isim
ExamAnswer = Answer  # Eski isim
ExamResult = ExamAttempt  # Eski isim
ExamResultStatus = AttemptStatus  # Eski isim

# Re-export for backward compatibility
__all__ = [
    'Exam',
    'ExamStatus',
    'ExamType',
<<<<<<< HEAD
=======
    'ExamOwnerType',
>>>>>>> eski/main
    'ExamAttempt',
    'AttemptStatus',
    'AttemptAnswer',
    'ExamQuestion',
    'ExamAnswer',
    'ExamResult',
    'ExamResultStatus',
    'Question',
    'Answer',
]
