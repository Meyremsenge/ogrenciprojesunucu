"""
Evaluations Module - Services.

Değerlendirme iş mantığı.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from app.extensions import db
from app.common.base_service import BaseService
from app.core.exceptions import NotFoundError, ValidationError, ConflictError
from app.core.pagination import PaginationResult, paginate_query
from app.modules.evaluations.models import (
    Assignment, AssignmentSubmission, CoachingNote, PerformanceReview,
    AssignmentStatus, SubmissionStatus
)


class AssignmentService(BaseService[Assignment]):
    """Ödev servisi."""
    
    model = Assignment
    
    @classmethod
    def query(cls):
        """Sadece silinmemiş ödevleri döner."""
        return Assignment.query.filter_by(is_deleted=False)
    
    @classmethod
    def get_paginated(
        cls,
        page: int = 1,
        per_page: int = 20,
        course_id: int = None,
        status: str = None
    ) -> PaginationResult:
        """Filtrelenmiş ödev listesi."""
        query = cls.query()
        
        if course_id:
            query = query.filter(Assignment.course_id == course_id)
        
        if status:
            query = query.filter(Assignment.status == status)
        else:
            query = query.filter(Assignment.status == AssignmentStatus.PUBLISHED)
        
        query = query.order_by(Assignment.due_date.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def create(cls, data: Dict[str, Any]) -> Assignment:
        """Yeni ödev oluşturur."""
        assignment = Assignment(**data)
        db.session.add(assignment)
        db.session.commit()
        return assignment
    
    @classmethod
    def publish(cls, assignment_id: int) -> Assignment:
        """Ödevi yayınlar."""
        assignment = cls.get_or_404(assignment_id)
        assignment.status = AssignmentStatus.PUBLISHED
        db.session.commit()
        return assignment


class SubmissionService(BaseService[AssignmentSubmission]):
    """Gönderim servisi."""
    
    model = AssignmentSubmission
    
    @classmethod
    def submit(
        cls,
        assignment_id: int,
        user_id: int,
        data: Dict[str, Any]
    ) -> AssignmentSubmission:
        """Ödev gönderir."""
        assignment = Assignment.query.get(assignment_id)
        if not assignment:
            raise NotFoundError('Ödev', assignment_id)
        
        if not assignment.is_available:
            raise ValidationError('Bu ödev şu an erişilebilir değil')
        
        # Mevcut gönderim kontrol
        existing = AssignmentSubmission.query.filter_by(
            assignment_id=assignment_id,
            user_id=user_id
        ).first()
        
        if existing:
            if existing.status == SubmissionStatus.GRADED:
                raise ConflictError('Bu ödev zaten değerlendirilmiş')
            # Güncelle
            existing.submission_text = data.get('submission_text')
            existing.file_url = data.get('file_url')
            existing.file_name = data.get('file_name')
            existing.submitted_at = datetime.utcnow()
            existing.is_late = assignment.is_overdue
            existing.revision_count += 1
            db.session.commit()
            return existing
        
        # Yeni gönderim
        submission = AssignmentSubmission(
            assignment_id=assignment_id,
            user_id=user_id,
            submission_text=data.get('submission_text'),
            file_url=data.get('file_url'),
            file_name=data.get('file_name'),
            is_late=assignment.is_overdue
        )
        
        db.session.add(submission)
        
        # İstatistik güncelle
        assignment.submission_count += 1
        
        db.session.commit()
        return submission
    
    @classmethod
    def get_by_assignment(
        cls,
        assignment_id: int,
        status: str = None,
        page: int = 1,
        per_page: int = 20
    ) -> PaginationResult:
        """Ödevin gönderimlerini döner."""
        query = AssignmentSubmission.query.filter_by(assignment_id=assignment_id)
        
        if status:
            query = query.filter(AssignmentSubmission.status == status)
        
        query = query.order_by(AssignmentSubmission.submitted_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_by_user(
        cls,
        user_id: int,
        page: int = 1,
        per_page: int = 20
    ) -> PaginationResult:
        """Kullanıcının gönderimlerini döner."""
        query = AssignmentSubmission.query.filter_by(user_id=user_id).order_by(
            AssignmentSubmission.submitted_at.desc()
        )
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def grade(
        cls,
        submission_id: int,
        score: float,
        feedback: str,
        grader_id: int
    ) -> AssignmentSubmission:
        """Gönderimi değerlendirir."""
        submission = cls.get_or_404(submission_id)
        
        submission.score = score
        submission.feedback = feedback
        submission.graded_by = grader_id
        submission.graded_at = datetime.utcnow()
        submission.status = SubmissionStatus.GRADED
        
        # Ortalama güncelle
        cls._update_assignment_average(submission.assignment_id)
        
        db.session.commit()
        return submission
    
    @classmethod
    def _update_assignment_average(cls, assignment_id: int):
        """Ödev ortalamasını günceller."""
        result = db.session.query(
            db.func.avg(AssignmentSubmission.score)
        ).filter(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.status == SubmissionStatus.GRADED
        ).scalar()
        
        assignment = Assignment.query.get(assignment_id)
        if assignment:
            assignment.average_score = result or 0


class CoachingNoteService(BaseService[CoachingNote]):
    """Koçluk notu servisi."""
    
    model = CoachingNote
    
    @classmethod
    def query(cls):
        """Sadece silinmemiş notları döner."""
        return CoachingNote.query.filter_by(is_deleted=False)
    
    @classmethod
    def get_paginated(
        cls,
        page: int = 1,
        per_page: int = 20,
        student_id: int = None,
        coach_id: int = None
    ) -> PaginationResult:
        """Filtrelenmiş not listesi."""
        query = cls.query()
        
        if student_id:
            query = query.filter(CoachingNote.student_id == student_id)
        
        if coach_id:
            query = query.filter(CoachingNote.coach_id == coach_id)
        
        query = query.order_by(CoachingNote.created_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def create(cls, data: Dict[str, Any]) -> CoachingNote:
        """Yeni not oluşturur."""
        note = CoachingNote(**data)
        db.session.add(note)
        db.session.commit()
        return note
    
    @classmethod
    def get_visible_to_student(cls, student_id: int) -> List[CoachingNote]:
        """Öğrenciye görünür notları döner."""
        return cls.query().filter(
            CoachingNote.student_id == student_id,
            CoachingNote.is_visible_to_student == True
        ).order_by(CoachingNote.created_at.desc()).all()


class PerformanceReviewService(BaseService[PerformanceReview]):
    """Performans değerlendirme servisi."""
    
    model = PerformanceReview
    
    @classmethod
    def get_paginated(
        cls,
        page: int = 1,
        per_page: int = 20,
        student_id: int = None,
        course_id: int = None
    ) -> PaginationResult:
        """Filtrelenmiş değerlendirme listesi."""
        query = PerformanceReview.query
        
        if student_id:
            query = query.filter(PerformanceReview.student_id == student_id)
        
        if course_id:
            query = query.filter(PerformanceReview.course_id == course_id)
        
        query = query.order_by(PerformanceReview.period_end.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def create(cls, data: Dict[str, Any]) -> PerformanceReview:
        """Yeni değerlendirme oluşturur."""
        review = PerformanceReview(**data)
        db.session.add(review)
        db.session.commit()
        return review
    
    @classmethod
    def publish(cls, review_id: int) -> PerformanceReview:
        """Değerlendirmeyi yayınlar."""
        review = cls.get_or_404(review_id)
        review.publish()
        db.session.commit()
        return review
    
    @classmethod
    def get_published_for_student(cls, student_id: int) -> List[PerformanceReview]:
        """Öğrencinin yayınlanmış değerlendirmelerini döner."""
        return PerformanceReview.query.filter(
            PerformanceReview.student_id == student_id,
            PerformanceReview.is_published == True
        ).order_by(PerformanceReview.period_end.desc()).all()
