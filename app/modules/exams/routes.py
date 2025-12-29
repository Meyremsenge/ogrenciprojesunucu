"""
Exams Module - Routes.

Sınav yönetimi endpoint'leri.

⚠️ KRİTİK: BU MODÜLDE AI KULLANILMAZ ⚠️
Tüm değerlendirmeler deterministik kurallar veya öğretmen tarafından yapılır.

Erişim Kuralları:
- Super Admin: Sistem sınavı ekler (owner_type=SYSTEM) → TÜM kurumlarda görünür
- Öğretmen: Kurum sınavı ekler (owner_type=TEACHER) → SADECE kendi kurumunda görünür
"""

from flask import request, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.modules.exams import exams_bp
from app.modules.exams.services import ExamService, QuestionService, AttemptService
from app.modules.exams.models import Exam, ExamOwnerType, ExamStatus, AttemptStatus, QuestionType, GradeLevel, ExamType
from app.modules.exams.schemas import (
    ExamSchema,
    ExamCreateSchema,
    QuestionCreateSchema,
    AttemptAnswerSchema,
    AttemptResultSchema
)
from app.models.user import User
from app.core.responses import success_response, created_response, no_content_response, paginated_response, error_response
from app.core.decorators import require_role, validate_json, handle_exceptions
from app.core.pagination import PaginationParams


# =============================================================================
# Exam CRUD Routes
# =============================================================================

@exams_bp.route('', methods=['GET'])
@jwt_required()
@handle_exceptions
def list_exams():
    """
    Sınav listesi.
    
    Erişim kuralları:
    - Super Admin: Tüm sınavları görür
    - Öğretmen/Öğrenci: Sistem sınavları + kendi kurumunun sınavları
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    user_org_id = user.organization_id if user else None
    
    params = PaginationParams.from_request()
    course_id = request.args.get('course_id', type=int)
    exam_type = request.args.get('exam_type')
    status = request.args.get('status')
    owner_type = request.args.get('owner_type')
    grade_level = request.args.get('grade_level')
    search = request.args.get('search')
    
    # Query başlat
    query = Exam.query.filter(Exam.is_deleted == False)
    
    # Erişim kontrolü - Super Admin değilse kısıtla
    if user_role != 'super_admin':
        query = query.filter(
            db.or_(
                # Sistem sınavları - herkes görebilir
                Exam.owner_type == ExamOwnerType.SYSTEM,
                # Kendi kurumunun öğretmen sınavları
                db.and_(
                    Exam.owner_type == ExamOwnerType.TEACHER,
                    Exam.organization_id == user_org_id
                )
            )
        )
    
    # Filtreler
    if course_id:
        query = query.filter(Exam.course_id == course_id)
    
    if exam_type:
        query = query.filter(Exam.exam_type == exam_type)
    
    if status:
        query = query.filter(Exam.status == status)
    
    if owner_type:
        try:
            query = query.filter(Exam.owner_type == ExamOwnerType(owner_type))
        except ValueError:
            pass
    
    if grade_level:
        try:
            query = query.filter(Exam.grade_level == GradeLevel(grade_level))
        except ValueError:
            pass
    
    if search:
        search_term = f'%{search}%'
        query = query.filter(
            db.or_(
                Exam.title.ilike(search_term),
                Exam.description.ilike(search_term)
            )
        )
    
    # Sıralama
    query = query.order_by(Exam.created_at.desc())
    
    # Sayfalama
    pagination = query.paginate(page=params.page, per_page=params.per_page, error_out=False)
    
    return paginated_response(
        items=[e.to_dict() for e in pagination.items],
        page=params.page,
        per_page=params.per_page,
        total=pagination.total
    )


@exams_bp.route('/<int:exam_id>', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_exam(exam_id: int):
    """
    Sınav detayı.
    
    Erişim kontrolü: Sistem sınavı veya kendi kurumunun sınavı
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    user_org_id = user.organization_id if user else None
    
    exam = Exam.query.filter(
        Exam.id == exam_id,
        Exam.is_deleted == False
    ).first()
    
    if not exam:
        return error_response('Sınav bulunamadı', status_code=404)
    
    # Erişim kontrolü
    if user_role != 'super_admin':
        if exam.owner_type == ExamOwnerType.TEACHER and exam.organization_id != user_org_id:
            return error_response('Bu sınava erişim yetkiniz yok', status_code=403)
    
    # Detaylı bilgi için service kullan
    exam_data = ExamService.get_with_questions(exam_id, current_user_id)
    
    return success_response(data={'exam': exam_data})


@exams_bp.route('', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(ExamCreateSchema)
def create_exam():
    """
    Yeni sınav oluştur.
    
    Super Admin: owner_type=SYSTEM (tüm kurumlarda görünür)
    Öğretmen: owner_type=TEACHER (sadece kendi kurumunda görünür)
    
    Otomatik olarak ilgili sınıf seviyesindeki öğrencilere hedef atar.
    """
    from app.services.goal_service import GoalService
    
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    data = g.validated_data
    data['created_by'] = current_user_id
    
    # Grade level değerini sakla (hedef atama için)
    grade_level_str = data.get('grade_level')
    
    # Grade level dönüşümü
    if 'grade_level' in data and data['grade_level']:
        try:
            data['grade_level'] = GradeLevel(data['grade_level'])
        except ValueError:
            return error_response('Geçersiz kademe/sınıf seviyesi', status_code=400)
    
    # Exam type dönüşümü
    if 'exam_type' in data and data['exam_type']:
        try:
            data['exam_type'] = ExamType(data['exam_type'])
        except ValueError:
            return error_response('Geçersiz sınav tipi', status_code=400)
    
    # Owner type ve organization belirleme
    if user_role == 'super_admin':
        data['owner_type'] = ExamOwnerType.SYSTEM
        data['organization_id'] = None
    else:
        data['owner_type'] = ExamOwnerType.TEACHER
        data['organization_id'] = user.organization_id
    
    exam = ExamService.create(data)
    
    # Quiz yayımlandıysa otomatik hedef ata
    goal_result = None
    if exam.status == ExamStatus.PUBLISHED and grade_level_str:
        goal_result = GoalService.assign_exam_to_students(
            exam_id=exam.id,
            exam_title=exam.title,
            grade_level=grade_level_str,
            organization_id=data.get('organization_id'),
            target_score=exam.pass_score or 60,
            created_by=current_user_id
        )
    
    response_data = {'exam': exam.to_dict()}
    if goal_result:
        response_data['goals_assigned'] = goal_result['assigned_count']
    
    return created_response(
        data=response_data,
        message=f'Sınav başarıyla oluşturuldu' + (f' ve {goal_result["assigned_count"]} öğrenciye hedef atandı' if goal_result else '')
    )


@exams_bp.route('/<int:exam_id>', methods=['PUT'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def update_exam(exam_id: int):
    """
    Sınav güncelle.
    
    Erişim kontrolü: Kendi oluşturduğu veya kurumunun sınavını güncelleyebilir
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    exam = Exam.query.get(exam_id)
    if not exam or exam.is_deleted:
        return error_response('Sınav bulunamadı', status_code=404)
    
    # Erişim kontrolü
    if user_role != 'super_admin':
        if exam.owner_type == ExamOwnerType.SYSTEM:
            return error_response('Sistem sınavlarını sadece Super Admin güncelleyebilir', status_code=403)
        if exam.organization_id != user.organization_id:
            return error_response('Bu sınavı güncelleme yetkiniz yok', status_code=403)
    
    data = request.get_json()
    exam = ExamService.update_exam(exam_id, data, current_user_id)
    
    return success_response(
        data={'exam': exam.to_dict()},
        message='Sınav güncellendi'
    )


@exams_bp.route('/<int:exam_id>', methods=['DELETE'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def delete_exam(exam_id: int):
    """
    Sınav sil.
    
    Erişim kontrolü: Kendi oluşturduğu veya kurumunun sınavını silebilir
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    exam = Exam.query.get(exam_id)
    if not exam or exam.is_deleted:
        return error_response('Sınav bulunamadı', status_code=404)
    
    # Erişim kontrolü
    if user_role != 'super_admin':
        if exam.owner_type == ExamOwnerType.SYSTEM:
            return error_response('Sistem sınavlarını sadece Super Admin silebilir', status_code=403)
        if exam.organization_id != user.organization_id:
            return error_response('Bu sınavı silme yetkiniz yok', status_code=403)
    
    ExamService.soft_delete(exam_id)
    return no_content_response()


@exams_bp.route('/<int:exam_id>/publish', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def publish_exam(exam_id: int):
    """
    Sınavı yayınla.
    
    Yayınlandığında otomatik olarak ilgili sınıf seviyesindeki öğrencilere hedef atar.
    """
    from app.services.goal_service import GoalService
    
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    exam = Exam.query.get(exam_id)
    if not exam or exam.is_deleted:
        return error_response('Sınav bulunamadı', status_code=404)
    
    # Erişim kontrolü
    if user_role != 'super_admin':
        if exam.owner_type == ExamOwnerType.SYSTEM:
            return error_response('Sistem sınavlarını sadece Super Admin yayınlayabilir', status_code=403)
        if exam.organization_id != user.organization_id:
            return error_response('Bu sınavı yayınlama yetkiniz yok', status_code=403)
    
    exam = ExamService.publish(exam_id, current_user_id)
    
    # Yayınlandığında öğrencilere hedef ata
    goal_result = None
    grade_level_str = exam.grade_level.value if exam.grade_level else None
    if grade_level_str:
        goal_result = GoalService.assign_exam_to_students(
            exam_id=exam.id,
            exam_title=exam.title,
            grade_level=grade_level_str,
            organization_id=exam.organization_id,
            target_score=exam.pass_score or 60,
            created_by=current_user_id
        )
    
    response_data = {'exam': exam.to_dict()}
    if goal_result:
        response_data['goals_assigned'] = goal_result['assigned_count']
    
    return success_response(
        data=response_data,
        message=f'Sınav yayınlandı' + (f' ve {goal_result["assigned_count"]} öğrenciye hedef atandı' if goal_result else '')
    )


@exams_bp.route('/<int:exam_id>/unpublish', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def unpublish_exam(exam_id: int):
    """Sınavı yayından kaldır."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    exam = Exam.query.get(exam_id)
    if not exam or exam.is_deleted:
        return error_response('Sınav bulunamadı', status_code=404)
    
    # Erişim kontrolü
    if user_role != 'super_admin':
        if exam.owner_type == ExamOwnerType.SYSTEM:
            return error_response('Sistem sınavlarını sadece Super Admin yayından kaldırabilir', status_code=403)
        if exam.organization_id != user.organization_id:
            return error_response('Bu sınavı yayından kaldırma yetkiniz yok', status_code=403)
    
    # Durumu taslak'a çevir
    exam.status = ExamStatus.DRAFT
    db.session.commit()
    
    return success_response(
        data={'exam': exam.to_dict()},
        message='Sınav yayından kaldırıldı'
    )


@exams_bp.route('/<int:exam_id>/duplicate', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def duplicate_exam(exam_id: int):
    """Sınavı kopyala."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    exam = Exam.query.get(exam_id)
    if not exam or exam.is_deleted:
        return error_response('Sınav bulunamadı', status_code=404)
    
    # Erişim kontrolü - sınavı görebilen kopyalayabilir
    if user_role != 'super_admin':
        if exam.owner_type == ExamOwnerType.TEACHER and exam.organization_id != user.organization_id:
            return error_response('Bu sınavı kopyalama yetkiniz yok', status_code=403)
    
    # Yeni sınav oluştur
    new_exam = Exam(
        title=f"{exam.title} (Kopya)",
        description=exam.description,
        instructions=exam.instructions,
        exam_type=exam.exam_type,
        status=ExamStatus.DRAFT,
        duration_minutes=exam.duration_minutes,
        pass_score=exam.pass_score,
        max_attempts=exam.max_attempts,
        shuffle_questions=exam.shuffle_questions,
        shuffle_answers=exam.shuffle_answers,
        show_answers_after=exam.show_answers_after,
        grade_level=exam.grade_level,
        created_by=current_user_id,
        owner_type=ExamOwnerType.TEACHER if user_role != 'super_admin' else ExamOwnerType.SYSTEM,
        organization_id=user.organization_id if user_role != 'super_admin' else None
    )
    
    db.session.add(new_exam)
    db.session.commit()
    
    return created_response(
        data={'exam': new_exam.to_dict()},
        message='Sınav kopyalandı'
    )


# =============================================================================
# Question Routes
# =============================================================================

@exams_bp.route('/<int:exam_id>/questions', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def list_questions(exam_id: int):
    """Sınav sorularını listele (öğretmen)."""
    questions = QuestionService.get_by_exam(exam_id, include_correct=True)
    
    return success_response(
        data={'questions': [q.to_dict(include_correct=True) for q in questions]}
    )


@exams_bp.route('/<int:exam_id>/questions', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(QuestionCreateSchema)
def create_question(exam_id: int):
    """Sınava soru ekle."""
    data = g.validated_data
    data['exam_id'] = exam_id
    
    question = QuestionService.create(data)
    
    return created_response(
        data={'question': question.to_dict(include_correct=True)},
        message='Soru eklendi'
    )


@exams_bp.route('/questions/<int:question_id>', methods=['PUT'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def update_question(question_id: int):
    """Soru güncelle."""
    data = request.get_json()
    question = QuestionService.update(question_id, data)
    
    return success_response(
        data={'question': question.to_dict(include_correct=True)},
        message='Soru güncellendi'
    )


@exams_bp.route('/questions/<int:question_id>', methods=['DELETE'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def delete_question(question_id: int):
    """Soru sil."""
    QuestionService.delete(question_id)
    return no_content_response()


# =============================================================================
# Attempt Routes (Öğrenci)
# =============================================================================

@exams_bp.route('/<int:exam_id>/start', methods=['POST'])
@jwt_required()
@handle_exceptions
def start_exam(exam_id: int):
    """Sınava başla."""
    user_id = get_jwt_identity()
    
    attempt, questions = AttemptService.start_exam(user_id, exam_id)
    
    return created_response(
        data={
            'attempt': attempt.to_dict(),
            'questions': questions
        },
        message='Sınav başladı'
    )


@exams_bp.route('/attempts/<int:attempt_id>/answer', methods=['POST'])
@jwt_required()
@handle_exceptions
@validate_json(AttemptAnswerSchema)
def submit_answer(attempt_id: int):
    """Cevap gönder."""
    user_id = get_jwt_identity()
    data = g.validated_data
    
    answer = AttemptService.submit_answer(
        attempt_id=attempt_id,
        user_id=user_id,
        question_id=data['question_id'],
        selected_answer_ids=data.get('selected_answer_ids'),
        answer_text=data.get('answer_text')
    )
    
    return success_response(
        data={'answer': answer.to_dict()},
        message='Cevap kaydedildi'
    )


@exams_bp.route('/attempts/<int:attempt_id>/submit', methods=['POST'])
@jwt_required()
@handle_exceptions
def submit_exam(attempt_id: int):
    """Sınavı bitir."""
    user_id = get_jwt_identity()
    
    result = AttemptService.submit_exam(attempt_id, user_id)
    
    return success_response(
        data={'result': result},
        message='Sınav tamamlandı'
    )


@exams_bp.route('/attempts/<int:attempt_id>/result', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_exam_result(attempt_id: int):
    """Sınav sonucunu görüntüle."""
    user_id = get_jwt_identity()
    
    result = AttemptService.get_result(attempt_id, user_id)
    
    return success_response(data={'result': result})


@exams_bp.route('/my-attempts', methods=['GET'])
@jwt_required()
@handle_exceptions
def my_attempts():
    """Sınav girişlerim."""
    user_id = get_jwt_identity()
    params = PaginationParams.from_request()
    
    result = AttemptService.get_user_attempts(
        user_id,
        page=params.page,
        per_page=params.per_page
    )
    
    return paginated_response(
        items=[a.to_dict() for a in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


# =============================================================================
# Grading Routes (Öğretmen)
# =============================================================================

@exams_bp.route('/<int:exam_id>/submissions', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def exam_submissions(exam_id: int):
    """Sınav girişlerini listele (öğretmen)."""
    params = PaginationParams.from_request()
    status = request.args.get('status')
    
    result = AttemptService.get_exam_submissions(
        exam_id,
        status=status,
        page=params.page,
        per_page=params.per_page
    )
    
    return paginated_response(
        items=[a.to_dict() for a in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@exams_bp.route('/attempts/<int:attempt_id>/grade', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def grade_attempt(attempt_id: int):
    """Sınav girişini değerlendir."""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    result = AttemptService.grade_attempt(attempt_id, data.get('grades', []), user_id)
    
    return success_response(
        data={'result': result},
        message='Değerlendirme kaydedildi'
    )


# =============================================================================
# Analytics & Performance Routes
# =============================================================================

@exams_bp.route('/<int:exam_id>/analytics', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def get_exam_analytics(exam_id: int):
    """
    Sınav analitik raporu.
    
    Skor dağılımı, soru başarı oranları, süre analizi vb.
    """
    from app.services.reporting_service import ReportingService
    
    report = ReportingService.generate_exam_analytics(exam_id)
    
    return success_response(data={'analytics': report})


@exams_bp.route('/questions/<int:question_id>/analytics', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def get_question_analytics(question_id: int):
    """Soru analitik raporu."""
    from app.models.question import Question
    
    question = Question.query.get_or_404(question_id)
    
    analytics = {
        'question_id': question.id,
        'question_text': question.question_text[:100],
        'question_type': question.question_type,
        'difficulty': question.difficulty,
        'total_attempts': question.total_attempts,
        'correct_attempts': question.correct_attempts,
        'success_rate': round(question.success_rate, 1),
        'avg_time_seconds': question.avg_time_seconds
    }
    
    return success_response(data={'analytics': analytics})


@exams_bp.route('/my-performance', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_my_performance():
    """
    Kendi performans raporumu görüntüle.
    
    Güçlü/zayıf yönler, trend, öneriler.
    """
    from app.services.performance_analytics_service import PerformanceAnalyticsService
    
    user_id = get_jwt_identity()
    course_id = request.args.get('course_id', type=int)
    days = request.args.get('days', 30, type=int)
    
    report = PerformanceAnalyticsService.get_student_performance(
        user_id=user_id,
        course_id=course_id,
        days=days
    )
    
    # Dataclass'ı dict'e çevir
    from dataclasses import asdict
    report_dict = asdict(report)
    
    # Enum'ları string'e çevir
    report_dict['performance_level'] = report.performance_level.value
    report_dict['trend'] = report.trend.value
    
    for tp in report_dict.get('topic_performances', []):
        tp['performance_level'] = tp['performance_level'].value if hasattr(tp.get('performance_level'), 'value') else tp.get('performance_level')
        tp['trend'] = tp['trend'].value if hasattr(tp.get('trend'), 'value') else tp.get('trend')
    
    return success_response(data={'performance': report_dict})


@exams_bp.route('/my-performance/comparison', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_performance_comparison():
    """Akranlarla karşılaştırma."""
    from app.services.performance_analytics_service import PerformanceAnalyticsService
    
    user_id = get_jwt_identity()
    course_id = request.args.get('course_id', type=int)
    
    if not course_id:
        from app.core.responses import error_response
        return error_response('course_id gerekli', status_code=400)
    
    comparison = PerformanceAnalyticsService.get_comparison_with_peers(
        user_id=user_id,
        course_id=course_id
    )
    
    return success_response(data={'comparison': comparison})


@exams_bp.route('/recommended-questions', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_recommended_questions():
    """
    Önerilen soruları al.
    
    Zayıf yönlere ve zorluk seviyesine göre kişiselleştirilmiş sorular.
    """
    from app.services.performance_analytics_service import PerformanceAnalyticsService
    
    user_id = get_jwt_identity()
    course_id = request.args.get('course_id', type=int)
    limit = request.args.get('limit', 10, type=int)
    
    questions = PerformanceAnalyticsService.get_recommended_questions(
        user_id=user_id,
        course_id=course_id,
        limit=limit
    )
    
    return success_response(data={'questions': questions})


# =============================================================================
# Practice Mode Routes
# =============================================================================

@exams_bp.route('/practice', methods=['POST'])
@jwt_required()
@handle_exceptions
def practice_question():
    """
    Pratik modunda soru çöz ve değerlendir.
    
    Anında geri bildirim ile.
    """
    from app.services.grading_service import GradingService
    from dataclasses import asdict
    
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    question_id = data.get('question_id')
    answer = data.get('answer')
    time_spent = data.get('time_spent_seconds')
    hint_used = data.get('hint_used', False)
    
    if not question_id or answer is None:
        from app.core.responses import error_response
        return error_response('question_id ve answer gerekli', status_code=400)
    
    try:
        result, attempt = GradingService.grade_practice_question(
            user_id=user_id,
            question_id=question_id,
            answer=answer,
            time_spent_seconds=time_spent,
            hint_used=hint_used
        )
        
        return success_response(data={
            'is_correct': result.is_correct,
            'points_earned': result.points_earned,
            'max_points': result.max_points,
            'feedback': result.feedback,
            'details': result.details,
            'attempt_id': attempt.id
        })
    except ValueError as e:
        from app.core.responses import error_response
        return error_response(str(e), status_code=400)


@exams_bp.route('/practice/bulk', methods=['POST'])
@jwt_required()
@handle_exceptions
def practice_bulk_questions():
    """
    Birden fazla soruyu çöz ve değerlendir.
    
    Quiz modu için.
    """
    from app.services.grading_service import GradingService
    
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    answers = data.get('answers', [])
    
    if not answers:
        from app.core.responses import error_response
        return error_response('answers listesi gerekli', status_code=400)
    
    results = []
    total_correct = 0
    total_points = 0
    
    for answer_data in answers:
        try:
            result, attempt = GradingService.grade_practice_question(
                user_id=user_id,
                question_id=answer_data.get('question_id'),
                answer=answer_data.get('answer'),
                time_spent_seconds=answer_data.get('time_spent_seconds'),
                hint_used=answer_data.get('hint_used', False)
            )
            
            results.append({
                'question_id': answer_data.get('question_id'),
                'is_correct': result.is_correct,
                'points_earned': result.points_earned,
                'feedback': result.feedback
            })
            
            if result.is_correct:
                total_correct += 1
            total_points += result.points_earned
            
        except Exception as e:
            results.append({
                'question_id': answer_data.get('question_id'),
                'error': str(e)
            })
    
    return success_response(data={
        'results': results,
        'summary': {
            'total_questions': len(answers),
            'correct_count': total_correct,
            'total_points': total_points,
            'success_rate': round(total_correct / len(answers) * 100, 1) if answers else 0
        }
    })


# =============================================================================
# Manual Grading Routes
# =============================================================================

@exams_bp.route('/pending-grades', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def get_pending_grades():
    """Manuel değerlendirme bekleyen cevapları listele."""
    from app.services.grading_service import GradingService
    
    course_id = request.args.get('course_id', type=int)
    limit = request.args.get('limit', 50, type=int)
    
    pending = GradingService.get_pending_manual_grades(
        course_id=course_id,
        limit=limit
    )
    
    return success_response(data={'pending_grades': pending})


@exams_bp.route('/attempts/<int:attempt_id>/manual-grade', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def manual_grade_question(attempt_id: int):
    """
    Essay sorusunu manuel değerlendir.
    """
    from app.services.grading_service import GradingService
    
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    points = data.get('points')
    feedback = data.get('feedback')
    
    if points is None:
        from app.core.responses import error_response
        return error_response('points gerekli', status_code=400)
    
    attempt = GradingService.manual_grade(
        attempt_id=attempt_id,
        grader_id=user_id,
        points=points,
        feedback=feedback
    )
    
    return success_response(
        data={'attempt': attempt.to_dict(include_feedback=True)},
        message='Değerlendirme kaydedildi'
    )


# =============================================================================
# Reporting Routes
# =============================================================================

@exams_bp.route('/reports/student/<int:student_id>', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def get_student_report(student_id: int):
    """Öğrenci performans raporu."""
    from app.services.reporting_service import ReportingService
    from datetime import datetime, timedelta
    
    course_id = request.args.get('course_id', type=int)
    days = request.args.get('days', 30, type=int)
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    report = ReportingService.generate_student_report(
        student_id=student_id,
        course_id=course_id,
        start_date=start_date,
        end_date=end_date,
        include_details=True
    )
    
    return success_response(data={'report': report})


@exams_bp.route('/reports/course/<int:course_id>', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def get_course_report(course_id: int):
    """Kurs analitik raporu."""
    from app.services.reporting_service import ReportingService
    from datetime import datetime, timedelta
    
    days = request.args.get('days', 30, type=int)
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    report = ReportingService.generate_course_report(
        course_id=course_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return success_response(data={'report': report})


@exams_bp.route('/reports/institution', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_institution_report():
    """Kurum genel görünüm raporu."""
    from app.services.reporting_service import ReportingService
    from datetime import datetime, timedelta
    
    days = request.args.get('days', 30, type=int)
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    report = ReportingService.generate_institution_overview(
        start_date=start_date,
        end_date=end_date
    )
    
    return success_response(data={'report': report})


@exams_bp.route('/reports/export', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def export_report():
    """Raporu export et."""
    from app.services.reporting_service import ReportingService, ReportFormat
    from flask import Response
    
    data = request.get_json() or {}
    report_type = data.get('report_type')
    report_id = data.get('report_id')
    format_str = data.get('format', 'json')
    
    # Format belirle
    try:
        export_format = ReportFormat(format_str)
    except ValueError:
        export_format = ReportFormat.JSON
    
    # Raporu al (örnek olarak student report)
    if report_type == 'student' and report_id:
        report_data = ReportingService.generate_student_report(report_id)
    elif report_type == 'course' and report_id:
        report_data = ReportingService.generate_course_report(report_id)
    elif report_type == 'institution':
        report_data = ReportingService.generate_institution_overview()
    else:
        from app.core.responses import error_response
        return error_response('Geçersiz rapor tipi', status_code=400)
    
    # Export
    content = ReportingService.export_report(report_data, export_format)
    
    # Content type
    content_types = {
        ReportFormat.JSON: 'application/json',
        ReportFormat.CSV: 'text/csv',
        ReportFormat.EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ReportFormat.PDF: 'application/pdf'
    }
    
    return Response(
        content,
        mimetype=content_types.get(export_format, 'application/json'),
        headers={
            'Content-Disposition': f'attachment; filename=report.{format_str}'
        }
    )


# =============================================================================
# Teacher Manual Grading Routes
# AI BU BÖLÜMDE KULLANILMAZ - TÜM DEĞERLENDİRMELER DETERMİNİSTİKTİR
# =============================================================================

@exams_bp.route('/attempts/<int:attempt_id>/pending-essays', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def get_pending_essay_answers(attempt_id: int):
    """
    Değerlendirilmeyi bekleyen essay cevaplarını listele.
    
    NOT: Essay soruları SADECE öğretmen tarafından değerlendirilir.
    AI bu tip soruları değerlendirmez.
    """
    from app.modules.exams.models import AttemptAnswer, QuestionType, ExamAttempt
    
    attempt = ExamAttempt.query.get_or_404(attempt_id)
    
    # Essay cevaplarını getir
    pending_essays = AttemptAnswer.query.join(AttemptAnswer.question).filter(
        AttemptAnswer.attempt_id == attempt_id,
        AttemptAnswer.question.has(question_type=QuestionType.ESSAY),
        AttemptAnswer.graded_by.is_(None)
    ).all()
    
    results = []
    for answer in pending_essays:
        results.append({
            'answer_id': answer.id,
            'question_id': answer.question_id,
            'question_text': answer.question.question_text,
            'answer_text': answer.answer_text,
            'max_points': answer.question.points,
            'student_id': attempt.user_id,
        })
    
    return success_response(
        data={
            'attempt_id': attempt_id,
            'pending_count': len(results),
            'pending_essays': results,
            'grading_note': 'Bu cevaplar SADECE öğretmen tarafından değerlendirilecektir. AI kullanılmaz.'
        }
    )


@exams_bp.route('/attempts/<int:attempt_id>/grade-answer', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def grade_single_answer(attempt_id: int):
    """
    Tek bir cevabı manuel değerlendir.
    
    ⚠️ DİKKAT: Bu endpoint AI KULLANMAZ.
    Tüm değerlendirmeler öğretmen tarafından yapılır.
    
    Request Body:
    {
        "question_id": 123,
        "points": 8.5,
        "is_correct": true,
        "comment": "İyi bir analiz yapılmış"
    }
    """
    from app.modules.exams.grading_service import ManualGrader, GradingAuditLog
    from app.modules.exams.models import AttemptAnswer, ExamAttempt
    
    grader_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        from app.core.responses import error_response
        return error_response('İstek gövdesi gerekli', status_code=400)
    
    question_id = data.get('question_id')
    points = data.get('points', 0)
    is_correct = data.get('is_correct', False)
    comment = data.get('comment', '')
    
    if question_id is None:
        from app.core.responses import error_response
        return error_response('question_id gerekli', status_code=400)
    
    # Cevabı bul
    attempt_answer = AttemptAnswer.query.filter_by(
        attempt_id=attempt_id,
        question_id=question_id
    ).first()
    
    if not attempt_answer:
        from app.core.exceptions import NotFoundError
        raise NotFoundError('AttemptAnswer', f'{attempt_id}-{question_id}')
    
    # Değerlendir
    try:
        ManualGrader.grade_answer(
            attempt_answer=attempt_answer,
            points=float(points),
            is_correct=is_correct,
            comment=comment,
            grader_id=grader_id
        )
        
        # Audit log
        GradingAuditLog.log_manual_grading(attempt_answer, grader_id, points)
        
    except ValueError as e:
        from app.core.responses import error_response
        return error_response(str(e), status_code=400)
    
    return success_response(
        data={
            'answer_id': attempt_answer.id,
            'points_earned': attempt_answer.points_earned,
            'is_correct': attempt_answer.is_correct,
            'graded_by': grader_id,
            'ai_used': False,  # AI KULLANILMADI
        },
        message='Cevap başarıyla değerlendirildi'
    )


@exams_bp.route('/attempts/<int:attempt_id>/finalize-grading', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def finalize_attempt_grading(attempt_id: int):
    """
    Sınav değerlendirmesini tamamla.
    
    Tüm essay soruları değerlendirildikten sonra çağrılır.
    Sınavın final notunu hesaplar.
    
    ⚠️ DİKKAT: Bu endpoint AI KULLANMAZ.
    """
    from app.modules.exams.grading_service import ManualGrader, GradingAuditLog
    from app.modules.exams.models import ExamAttempt
    from app.modules.exams.services import ExamService
    
    grader_id = get_jwt_identity()
    attempt = ExamAttempt.query.get_or_404(attempt_id)
    
    try:
        result = ManualGrader.finalize_grading(attempt, grader_id)
        
        # Sınav istatistiklerini güncelle
        ExamService.update_statistics(attempt.exam_id)
        
    except ValueError as e:
        from app.core.responses import error_response
        return error_response(str(e), status_code=400)
    
    return success_response(
        data={
            **result,
            'ai_used': False,  # AI KULLANILMADI
            'grading_method': 'TEACHER_MANUAL',
        },
        message='Sınav değerlendirmesi tamamlandı'
    )


@exams_bp.route('/grading/pending', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def list_pending_gradings():
    """
    Değerlendirilmeyi bekleyen tüm sınav girişlerini listele.
    
    Essay sorusu içeren ve henüz tamamlanmamış değerlendirmeler.
    """
    from app.modules.exams.models import ExamAttempt, AttemptAnswer, AttemptStatus, QuestionType
    from app.modules.courses.models import Course
    
    user_id = get_jwt_identity()
    course_id = request.args.get('course_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # Essay sorusu olan sınavları bul
    query = ExamAttempt.query.filter(
        ExamAttempt.status == AttemptStatus.SUBMITTED
    )
    
    if course_id:
        query = query.join(ExamAttempt.exam).filter(
            ExamAttempt.exam.has(course_id=course_id)
        )
    
    # Sadece essay içeren sınavlar
    query = query.join(ExamAttempt.exam).filter(
        ExamAttempt.exam.has(
            Exam.questions.any(question_type=QuestionType.ESSAY)
        )
    )
    
    query = query.order_by(ExamAttempt.submitted_at.asc())
    
    from app.core.pagination import paginate_query
    result = paginate_query(query, page, per_page)
    
    items = []
    for attempt in result.items:
        # Bekleyen essay sayısı
        pending_count = AttemptAnswer.query.join(AttemptAnswer.question).filter(
            AttemptAnswer.attempt_id == attempt.id,
            AttemptAnswer.question.has(question_type=QuestionType.ESSAY),
            AttemptAnswer.graded_by.is_(None)
        ).count()
        
        items.append({
            'attempt_id': attempt.id,
            'exam_id': attempt.exam_id,
            'exam_title': attempt.exam.title,
            'student_id': attempt.user_id,
            'student_name': attempt.user.full_name if attempt.user else None,
            'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            'pending_essay_count': pending_count,
            'auto_graded_score': attempt.score,
            'max_score': attempt.max_score,
        })
    
    return paginated_response(
        items=items,
        page=result.page,
        per_page=result.per_page,
        total=result.total,
        message='Değerlendirilmeyi bekleyen sınavlar (AI kullanılmaz)'
    )


@exams_bp.route('/grading/rules', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_grading_rules():
    """
    Değerlendirme kurallarını göster.
    
    Bu endpoint sistemin kullandığı değerlendirme kurallarını döner.
    Tüm kurallar sabit ve deterministiktir.
    """
    from app.modules.exams.grading_service import GradingRules
    
    return success_response(
        data={
            'grading_rules': {
                'decimal_places': GradingRules.DECIMAL_PLACES,
                'partial_credit_enabled': GradingRules.PARTIAL_CREDIT_ENABLED,
                'multiple_choice_partial_credit': GradingRules.MULTIPLE_CHOICE_PARTIAL_CREDIT,
                'text_comparison': {
                    'case_sensitive': GradingRules.TEXT_COMPARISON_CASE_SENSITIVE,
                    'trim_whitespace': GradingRules.TEXT_COMPARISON_TRIM_WHITESPACE,
                    'normalize_unicode': GradingRules.TEXT_COMPARISON_NORMALIZE_UNICODE,
                    'ignore_punctuation': GradingRules.TEXT_COMPARISON_IGNORE_PUNCTUATION,
                },
                'submission_time_tolerance_seconds': GradingRules.SUBMISSION_TIME_TOLERANCE,
            },
            'question_type_grading': {
                'single_choice': 'Doğru cevap seçildi = tam puan',
                'multiple_choice': 'Kısmi puan: her doğru seçim +puan, her yanlış seçim -ceza',
                'true_false': 'Tam eşleşme gerekli',
                'short_answer': 'Normalize edilmiş metin karşılaştırması',
                'fill_blank': 'Normalize edilmiş metin karşılaştırması',
                'essay': 'SADECE öğretmen tarafından manuel değerlendirme',
            },
            'ai_policy': {
                'ai_used': False,
                'reason': 'Hukuki, pedagojik ve güvenlik gerekçeleriyle AI değerlendirme kullanılmaz',
                'alternative': 'Tüm değerlendirmeler deterministik kurallar veya öğretmen tarafından yapılır',
            }
        }
    )

