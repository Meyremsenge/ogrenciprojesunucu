"""
Courses Module - Models.

Kurs, konu ve kayıt modelleri.
Ana modelleri re-export eder.
"""

# Ana modelleri import et ve re-export et (çift tanımlama önleme)
from app.models.course import Course, Category, Topic, Enrollment

# Enum'ları burada da tanımla (geriye uyumluluk)
import enum


class CourseStatus(enum.Enum):
    """Kurs durumu."""
    DRAFT = 'draft'
    PUBLISHED = 'published'
    ARCHIVED = 'archived'


class CourseLevel(enum.Enum):
    """Kurs seviyesi."""
    BEGINNER = 'beginner'
    INTERMEDIATE = 'intermediate'
    ADVANCED = 'advanced'


class EnrollmentStatus(enum.Enum):
    """Kayıt durumu."""
    ACTIVE = 'active'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'
    EXPIRED = 'expired'


__all__ = [
    'Course',
    'Category',
    'Topic',
    'Enrollment',
    'CourseStatus',
    'CourseLevel',
    'EnrollmentStatus',
]
