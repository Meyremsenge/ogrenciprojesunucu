"""
Question and Answer models.

All question models are imported from app.modules.exams.models to avoid duplicate definitions.
"""

import enum

# Import models from modules/exams/models to avoid duplicate model definitions
from app.modules.exams.models import (
    Question,
    Answer,
    QuestionType,
)


# Difficulty and BloomLevel enums - defined here as they may not exist in exams/models
class Difficulty(enum.Enum):
    """Question difficulty levels."""
    EASY = 'easy'
    MEDIUM = 'medium'
    HARD = 'hard'
    EXPERT = 'expert'

# DifficultyLevel alias for backward compatibility
DifficultyLevel = Difficulty


class BloomLevel(enum.Enum):
    """Bloom's taxonomy levels."""
    REMEMBER = 'remember'
    UNDERSTAND = 'understand'
    APPLY = 'apply'
    ANALYZE = 'analyze'
    EVALUATE = 'evaluate'
    CREATE = 'create'

# QuestionAttempt might be in a different location - check if it exists
try:
    from app.modules.exams.models import QuestionAttempt
except ImportError:
    # If not in exams, it might be defined locally or elsewhere
    from datetime import datetime
    from app.extensions import db
    
    class QuestionAttempt(db.Model):
        """Question attempt tracking."""
        
        __tablename__ = 'question_attempts'
        __table_args__ = {'extend_existing': True}
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
        question_id = db.Column(db.Integer, db.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False)
        
        # Attempt details
        selected_answer_ids = db.Column(db.JSON)
        text_answer = db.Column(db.Text)
        answer_data = db.Column(db.JSON)
        
        # Result
        is_correct = db.Column(db.Boolean, nullable=False)
        points_earned = db.Column(db.Float, default=0)
        max_points = db.Column(db.Float, default=0)
        
        # Feedback
        feedback = db.Column(db.Text)
        grading_details = db.Column(db.JSON)
        
        # Time tracking
        time_spent_seconds = db.Column(db.Integer)
        
        # Hint usage
        hint_used = db.Column(db.Boolean, default=False)
        
        # Context
        context_type = db.Column(db.String(20), default='practice')
        context_id = db.Column(db.Integer)
        
        # Manual grading
        graded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
        graded_at = db.Column(db.DateTime)
        
        # Timestamps
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Relationships
        user = db.relationship('User', back_populates='question_attempts', foreign_keys=[user_id])
        question = db.relationship('Question', back_populates='attempts')
        grader = db.relationship('User', foreign_keys=[graded_by])

# Re-export for backward compatibility
__all__ = [
    'Question',
    'Answer',
    'QuestionType',
    'Difficulty',
    'DifficultyLevel',
    'BloomLevel',
    'QuestionAttempt',
]
