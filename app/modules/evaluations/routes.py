"""
Evaluations Module - Routes.

Değerlendirme endpoint'leri.
"""

from flask import request, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.modules.evaluations import evaluations_bp
from app.modules.evaluations.services import (
    AssignmentService,
    SubmissionService,
    CoachingNoteService,
    PerformanceReviewService
)
from app.modules.evaluations.schemas import (
    AssignmentSchema,
    AssignmentCreateSchema,
    SubmissionCreateSchema,
    CoachingNoteSchema,
    CoachingNoteCreateSchema,
    PerformanceReviewSchema,
    PerformanceReviewCreateSchema
)
from app.core.responses import success_response, created_response, no_content_response, paginated_response
from app.core.decorators import require_role, validate_json, handle_exceptions
from app.core.pagination import PaginationParams


# =============================================================================
# Assignment Routes
# =============================================================================

@evaluations_bp.route('/assignments', methods=['GET'])
@jwt_required()
@handle_exceptions
def list_assignments():
    """Ödev listesi."""
    params = PaginationParams.from_request()
    course_id = request.args.get('course_id', type=int)
    
    result = AssignmentService.get_paginated(
        page=params.page,
        per_page=params.per_page,
        course_id=course_id
    )
    
    return paginated_response(
        items=[a.to_dict() for a in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@evaluations_bp.route('/assignments/<int:assignment_id>', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_assignment(assignment_id: int):
    """Ödev detayı."""
    assignment = AssignmentService.get_or_404(assignment_id)
    return success_response(data={'assignment': assignment.to_dict()})


@evaluations_bp.route('/assignments', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(AssignmentCreateSchema)
def create_assignment():
    """Yeni ödev oluştur."""
    user_id = get_jwt_identity()
    data = g.validated_data
    data['created_by'] = user_id
    
    assignment = AssignmentService.create(data)
    
    return created_response(
        data={'assignment': assignment.to_dict()},
        message='Ödev başarıyla oluşturuldu'
    )


@evaluations_bp.route('/assignments/<int:assignment_id>', methods=['PUT'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def update_assignment(assignment_id: int):
    """Ödev güncelle."""
    data = request.get_json()
    assignment = AssignmentService.update(assignment_id, data)
    
    return success_response(
        data={'assignment': assignment.to_dict()},
        message='Ödev güncellendi'
    )


@evaluations_bp.route('/assignments/<int:assignment_id>/publish', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def publish_assignment(assignment_id: int):
    """Ödevi yayınla."""
    assignment = AssignmentService.publish(assignment_id)
    
    return success_response(
        data={'assignment': assignment.to_dict()},
        message='Ödev yayınlandı'
    )


# =============================================================================
# Submission Routes
# =============================================================================

@evaluations_bp.route('/assignments/<int:assignment_id>/submit', methods=['POST'])
@jwt_required()
@handle_exceptions
@validate_json(SubmissionCreateSchema)
def submit_assignment(assignment_id: int):
    """Ödev gönder."""
    user_id = get_jwt_identity()
    data = g.validated_data
    
    submission = SubmissionService.submit(
        assignment_id=assignment_id,
        user_id=user_id,
        data=data
    )
    
    return created_response(
        data={'submission': submission.to_dict()},
        message='Ödev başarıyla gönderildi'
    )


@evaluations_bp.route('/assignments/<int:assignment_id>/submissions', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def list_submissions(assignment_id: int):
    """Ödev gönderimlerini listele (öğretmen)."""
    params = PaginationParams.from_request()
    status = request.args.get('status')
    
    result = SubmissionService.get_by_assignment(
        assignment_id,
        status=status,
        page=params.page,
        per_page=params.per_page
    )
    
    return paginated_response(
        items=[s.to_dict() for s in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@evaluations_bp.route('/submissions/<int:submission_id>/grade', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def grade_submission(submission_id: int):
    """Gönderimi değerlendir."""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    submission = SubmissionService.grade(
        submission_id=submission_id,
        score=data.get('score'),
        feedback=data.get('feedback'),
        grader_id=user_id
    )
    
    return success_response(
        data={'submission': submission.to_dict()},
        message='Değerlendirme kaydedildi'
    )


@evaluations_bp.route('/my-submissions', methods=['GET'])
@jwt_required()
@handle_exceptions
def my_submissions():
    """Gönderimlerim."""
    user_id = get_jwt_identity()
    params = PaginationParams.from_request()
    
    result = SubmissionService.get_by_user(
        user_id,
        page=params.page,
        per_page=params.per_page
    )
    
    return paginated_response(
        items=[s.to_dict() for s in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


# =============================================================================
# Coaching Note Routes
# =============================================================================

@evaluations_bp.route('/coaching-notes', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def list_coaching_notes():
    """Koçluk notları listesi."""
    params = PaginationParams.from_request()
    student_id = request.args.get('student_id', type=int)
    
    result = CoachingNoteService.get_paginated(
        page=params.page,
        per_page=params.per_page,
        student_id=student_id
    )
    
    return paginated_response(
        items=[n.to_dict() for n in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@evaluations_bp.route('/coaching-notes', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(CoachingNoteCreateSchema)
def create_coaching_note():
    """Koçluk notu oluştur."""
    user_id = get_jwt_identity()
    data = g.validated_data
    data['coach_id'] = user_id
    
    note = CoachingNoteService.create(data)
    
    return created_response(
        data={'coaching_note': note.to_dict()},
        message='Not oluşturuldu'
    )


@evaluations_bp.route('/my-coaching-notes', methods=['GET'])
@jwt_required()
@handle_exceptions
def my_coaching_notes():
    """Bana yazılan koçluk notları (öğrenci)."""
    user_id = get_jwt_identity()
    
    notes = CoachingNoteService.get_visible_to_student(user_id)
    
    return success_response(
        data={'coaching_notes': [n.to_dict() for n in notes]}
    )


# =============================================================================
# Performance Review Routes
# =============================================================================

@evaluations_bp.route('/performance-reviews', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def list_performance_reviews():
    """Performans değerlendirmeleri listesi."""
    params = PaginationParams.from_request()
    student_id = request.args.get('student_id', type=int)
    course_id = request.args.get('course_id', type=int)
    
    result = PerformanceReviewService.get_paginated(
        page=params.page,
        per_page=params.per_page,
        student_id=student_id,
        course_id=course_id
    )
    
    return paginated_response(
        items=[r.to_dict() for r in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@evaluations_bp.route('/performance-reviews', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(PerformanceReviewCreateSchema)
def create_performance_review():
    """Performans değerlendirmesi oluştur."""
    user_id = get_jwt_identity()
    data = g.validated_data
    data['reviewer_id'] = user_id
    
    review = PerformanceReviewService.create(data)
    
    return created_response(
        data={'performance_review': review.to_dict()},
        message='Değerlendirme oluşturuldu'
    )


@evaluations_bp.route('/performance-reviews/<int:review_id>/publish', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def publish_performance_review(review_id: int):
    """Performans değerlendirmesini yayınla."""
    review = PerformanceReviewService.publish(review_id)
    
    return success_response(
        data={'performance_review': review.to_dict()},
        message='Değerlendirme öğrenciye görünür hale getirildi'
    )


@evaluations_bp.route('/my-performance-reviews', methods=['GET'])
@jwt_required()
@handle_exceptions
def my_performance_reviews():
    """Benim performans değerlendirmelerim (öğrenci)."""
    user_id = get_jwt_identity()
    
    reviews = PerformanceReviewService.get_published_for_student(user_id)
    
    return success_response(
        data={'performance_reviews': [r.to_dict() for r in reviews]}
    )
