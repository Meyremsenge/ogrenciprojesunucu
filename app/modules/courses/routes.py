"""
Courses Module - Routes.

Kurs yönetimi endpoint'leri.
"""

from flask import request, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.modules.courses import courses_bp
from app.modules.courses.services import CourseService, EnrollmentService
from app.modules.courses.schemas import (
    CourseSchema,
    CourseCreateSchema,
    CourseUpdateSchema,
    TopicSchema,
    TopicCreateSchema,
    EnrollmentSchema
)
from app.core.responses import success_response, created_response, no_content_response, paginated_response
from app.core.decorators import require_role, validate_json, handle_exceptions
from app.core.pagination import PaginationParams


# =============================================================================
# Course Routes
# =============================================================================

@courses_bp.route('', methods=['GET'])
@handle_exceptions
def list_courses():
    """
    Kurs listesi (public).
    
    ---
    tags:
      - Courses
    parameters:
      - name: page
        in: query
        schema:
          type: integer
      - name: category
        in: query
        schema:
          type: string
      - name: level
        in: query
        schema:
          type: string
      - name: search
        in: query
        schema:
          type: string
    responses:
      200:
        description: Kurs listesi
    """
    params = PaginationParams.from_request()
    
    filters = {
        'category': request.args.get('category'),
        'level': request.args.get('level'),
        'search': request.args.get('search'),
        'status': 'published'  # Sadece yayınlanmış kurslar
    }
    
    result = CourseService.get_paginated(
        page=params.page,
        per_page=params.per_page,
        **{k: v for k, v in filters.items() if v is not None}
    )
    
    return paginated_response(
        items=[c.to_dict() for c in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@courses_bp.route('/<int:course_id>', methods=['GET'])
@handle_exceptions
def get_course(course_id: int):
    """
    Kurs detayı.
    
    ---
    tags:
      - Courses
    parameters:
      - name: course_id
        in: path
        required: true
        schema:
          type: integer
    responses:
      200:
        description: Kurs bilgileri
      404:
        description: Kurs bulunamadı
    """
    course = CourseService.get_with_topics(course_id)
    
    return success_response(data={'course': course.to_dict()})


@courses_bp.route('', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(CourseCreateSchema)
def create_course():
    """
    Yeni kurs oluştur.
    
    ---
    tags:
      - Courses
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CourseCreate'
    responses:
      201:
        description: Kurs oluşturuldu
    """
    user_id = get_jwt_identity()
    data = g.validated_data
    data['teacher_id'] = user_id
    
    course = CourseService.create(data)
    
    return created_response(
        data={'course': course.to_dict()},
        message='Kurs başarıyla oluşturuldu'
    )


@courses_bp.route('/<int:course_id>', methods=['PUT'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(CourseUpdateSchema)
def update_course(course_id: int):
    """
    Kurs güncelle.
    
    ---
    tags:
      - Courses
    security:
      - bearerAuth: []
    responses:
      200:
        description: Kurs güncellendi
    """
    user_id = get_jwt_identity()
    data = g.validated_data
    
    course = CourseService.update_course(course_id, data, user_id)
    
    return success_response(
        data={'course': course.to_dict()},
        message='Kurs başarıyla güncellendi'
    )


@courses_bp.route('/<int:course_id>', methods=['DELETE'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def delete_course(course_id: int):
    """Kurs sil (soft delete)."""
    CourseService.soft_delete(course_id)
    
    return no_content_response()


@courses_bp.route('/<int:course_id>/publish', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def publish_course(course_id: int):
    """Kursu yayınla."""
    user_id = get_jwt_identity()
    course = CourseService.publish(course_id, user_id)
    
    return success_response(
        data={'course': course.to_dict()},
        message='Kurs yayınlandı'
    )


# =============================================================================
# Topic Routes
# =============================================================================

@courses_bp.route('/<int:course_id>/topics', methods=['GET'])
@handle_exceptions
def list_topics(course_id: int):
    """Kursun konularını listele."""
    topics = CourseService.get_topics(course_id)
    
    return success_response(
        data={'topics': [t.to_dict() for t in topics]}
    )


@courses_bp.route('/<int:course_id>/topics', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(TopicCreateSchema)
def create_topic(course_id: int):
    """Kursa yeni konu ekle."""
    user_id = get_jwt_identity()
    data = g.validated_data
    
    topic = CourseService.add_topic(course_id, data, user_id)
    
    return created_response(
        data={'topic': topic.to_dict()},
        message='Konu eklendi'
    )


# =============================================================================
# Enrollment Routes
# =============================================================================

@courses_bp.route('/<int:course_id>/enroll', methods=['POST'])
@jwt_required()
@handle_exceptions
def enroll_course(course_id: int):
    """Kursa kayıt ol."""
    user_id = get_jwt_identity()
    
    enrollment = EnrollmentService.enroll(user_id, course_id)
    
    return created_response(
        data={'enrollment': enrollment.to_dict()},
        message='Kursa başarıyla kayıt oldunuz'
    )


@courses_bp.route('/<int:course_id>/unenroll', methods=['POST'])
@jwt_required()
@handle_exceptions
def unenroll_course(course_id: int):
    """Kurs kaydını iptal et."""
    user_id = get_jwt_identity()
    
    EnrollmentService.unenroll(user_id, course_id)
    
    return success_response(message='Kayıt iptal edildi')


@courses_bp.route('/my-courses', methods=['GET'])
@jwt_required()
@handle_exceptions
def my_courses():
    """Kayıtlı olduğum kurslar."""
    user_id = int(get_jwt_identity())
    params = PaginationParams.from_request()
    
    result = EnrollmentService.get_user_enrollments(
        user_id,
        page=params.page,
        per_page=params.per_page
    )
    
    return paginated_response(
        items=[e.to_dict() for e in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )
