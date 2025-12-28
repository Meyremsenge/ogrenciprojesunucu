"""
Live Classes Module - Routes.

Canlı ders endpoint'leri.
"""

from flask import request, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.modules.live_classes import live_classes_bp
from app.modules.live_classes.services import LiveSessionService, AttendanceService
from app.modules.live_classes.schemas import (
    LiveSessionSchema,
    LiveSessionCreateSchema,
    LiveSessionUpdateSchema,
    AttendanceSchema
)
from app.core.responses import success_response, created_response, no_content_response, paginated_response
from app.core.decorators import require_role, validate_json, handle_exceptions
from app.core.pagination import PaginationParams
# Circular import önlemek için lazy import - SessionAttendance modelden değil modülden alınır
from app.modules.live_classes.models import SessionAttendance


# =============================================================================
# Live Session Routes
# =============================================================================

@live_classes_bp.route('', methods=['GET'])
@jwt_required()
@handle_exceptions
def list_sessions():
    """Canlı ders listesi."""
    params = PaginationParams.from_request()
    
    filters = {
        'course_id': request.args.get('course_id', type=int),
        'status': request.args.get('status'),
        'upcoming': request.args.get('upcoming', type=bool)
    }
    
    result = LiveSessionService.get_paginated(
        page=params.page,
        per_page=params.per_page,
        **{k: v for k, v in filters.items() if v is not None}
    )
    
    return paginated_response(
        items=[s.to_dict() for s in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@live_classes_bp.route('/<int:session_id>', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_session(session_id: int):
    """Canlı ders detayı."""
    user_id = get_jwt_identity()
    session = LiveSessionService.get_with_access(session_id, user_id)
    
    return success_response(data={'session': session})


@live_classes_bp.route('', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(LiveSessionCreateSchema)
def create_session():
    """Yeni canlı ders oluştur."""
    user_id = get_jwt_identity()
    data = g.validated_data
    data['host_id'] = user_id
    
    session = LiveSessionService.create(data)
    
    return created_response(
        data={'session': session.to_dict(include_url=True)},
        message='Canlı ders başarıyla oluşturuldu'
    )


@live_classes_bp.route('/<int:session_id>', methods=['PUT'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(LiveSessionUpdateSchema)
def update_session(session_id: int):
    """Canlı ders güncelle."""
    user_id = get_jwt_identity()
    data = g.validated_data
    
    session = LiveSessionService.update_session(session_id, data, user_id)
    
    return success_response(
        data={'session': session.to_dict(include_url=True)},
        message='Canlı ders güncellendi'
    )


@live_classes_bp.route('/<int:session_id>', methods=['DELETE'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def delete_session(session_id: int):
    """Canlı ders sil."""
    user_id = get_jwt_identity()
    LiveSessionService.cancel_session(session_id, user_id)
    
    return success_response(message='Canlı ders iptal edildi')


# =============================================================================
# Session Control Routes
# =============================================================================

@live_classes_bp.route('/<int:session_id>/start', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def start_session(session_id: int):
    """Canlı dersi başlat."""
    user_id = get_jwt_identity()
    session = LiveSessionService.start_session(session_id, user_id)
    
    return success_response(
        data={'session': session.to_dict(include_url=True)},
        message='Canlı ders başladı'
    )


@live_classes_bp.route('/<int:session_id>/end', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def end_session(session_id: int):
    """Canlı dersi bitir."""
    user_id = get_jwt_identity()
    session = LiveSessionService.end_session(session_id, user_id)
    
    return success_response(
        data={'session': session.to_dict()},
        message='Canlı ders sona erdi'
    )


# =============================================================================
# Attendance Routes
# =============================================================================

@live_classes_bp.route('/<int:session_id>/register', methods=['POST'])
@jwt_required()
@handle_exceptions
def register_session(session_id: int):
    """Canlı derse kayıt ol."""
    user_id = get_jwt_identity()
    
    attendance = AttendanceService.register(session_id, user_id)
    
    return created_response(
        data={'attendance': attendance.to_dict()},
        message='Canlı derse kayıt oldunuz'
    )


@live_classes_bp.route('/<int:session_id>/join', methods=['POST'])
@jwt_required()
@handle_exceptions
def join_session(session_id: int):
    """Canlı derse katıl."""
    user_id = get_jwt_identity()
    
    result = AttendanceService.join(session_id, user_id)
    
    return success_response(
        data=result,
        message='Canlı derse katıldınız'
    )


@live_classes_bp.route('/<int:session_id>/leave', methods=['POST'])
@jwt_required()
@handle_exceptions
def leave_session(session_id: int):
    """Canlı dersten ayrıl."""
    user_id = get_jwt_identity()
    
    attendance = AttendanceService.leave(session_id, user_id)
    
    return success_response(
        data={'attendance': attendance.to_dict()},
        message='Canlı dersten ayrıldınız'
    )


@live_classes_bp.route('/<int:session_id>/attendances', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def list_attendances(session_id: int):
    """Oturum katılımcılarını listele."""
    params = PaginationParams.from_request()
    
    result = AttendanceService.get_by_session(
        session_id,
        page=params.page,
        per_page=params.per_page
    )
    
    return paginated_response(
        items=[a.to_dict() for a in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@live_classes_bp.route('/my-sessions', methods=['GET'])
@jwt_required()
@handle_exceptions
def my_sessions():
    """Kayıtlı olduğum canlı dersler."""
    user_id = get_jwt_identity()
    params = PaginationParams.from_request()
    
    result = AttendanceService.get_user_sessions(
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
# Upcoming Sessions
# =============================================================================

@live_classes_bp.route('/upcoming', methods=['GET'])
@jwt_required()
@handle_exceptions
def upcoming_sessions():
    """Yaklaşan canlı dersler."""
    user_id = get_jwt_identity()
    days = request.args.get('days', 7, type=int)
    
    sessions = LiveSessionService.get_upcoming(user_id, days)
    
    return success_response(
        data={'sessions': [s.to_dict() for s in sessions]}
    )


# =============================================================================
# Access Control Routes
# =============================================================================

@live_classes_bp.route('/<int:session_id>/access', methods=['GET'])
@jwt_required()
@handle_exceptions
def check_access(session_id: int):
    """
    Oturuma erişim durumunu kontrol et.
    
    Kullanıcının derse katılıp katılamayacağını döner.
    """
    user_id = get_jwt_identity()
    
    access = LiveSessionService.check_access(session_id, user_id)
    
    return success_response(data={'access': access})


@live_classes_bp.route('/<int:session_id>/join-info', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_join_info(session_id: int):
    """
    Katılım bilgilerini al.
    
    Erişim kontrolü sonrası meeting linkini döner.
    """
    user_id = get_jwt_identity()
    
    join_info = LiveSessionService.get_join_info(session_id, user_id)
    
    return success_response(data=join_info)


# =============================================================================
# Recurring Sessions
# =============================================================================

@live_classes_bp.route('/recurring', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def create_recurring_session():
    """
    Tekrarlayan canlı ders oluştur.
    
    Haftalık, iki haftada bir veya aylık.
    """
    from app.modules.live_classes.models import RecurrenceType
    
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    recurrence = data.pop('recurrence_type', 'weekly')
    recurrence_end = data.pop('recurrence_end_date', None)
    
    try:
        recurrence_type = RecurrenceType(recurrence)
    except ValueError:
        recurrence_type = RecurrenceType.WEEKLY
    
    if recurrence_end:
        from dateutil.parser import parse
        recurrence_end_date = parse(recurrence_end)
    else:
        # Varsayılan: 3 ay
        recurrence_end_date = datetime.utcnow() + timedelta(days=90)
    
    # scheduled_start parse
    if 'scheduled_start' in data and isinstance(data['scheduled_start'], str):
        from dateutil.parser import parse
        data['scheduled_start'] = parse(data['scheduled_start'])
    
    sessions = LiveSessionService.create_recurring(
        data=data,
        recurrence_type=recurrence_type,
        recurrence_end_date=recurrence_end_date,
        user_id=user_id
    )
    
    return created_response(
        data={
            'sessions': [s.to_dict(include_url=True) for s in sessions],
            'count': len(sessions)
        },
        message=f'{len(sessions)} canlı ders oluşturuldu'
    )


@live_classes_bp.route('/<int:session_id>/series', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_session_series(session_id: int):
    """
    Tekrarlayan ders serisini al.
    
    Parent session verilirse tüm child'ları döner.
    """
    session = LiveSessionService.get_or_404(session_id)
    
    if session.parent_session_id:
        # Bu bir child, parent'ı bul
        parent = LiveSessionService.get_or_404(session.parent_session_id)
        siblings = LiveSession.query.filter_by(
            parent_session_id=parent.id,
            is_deleted=False
        ).order_by(LiveSession.scheduled_start).all()
        
        return success_response(data={
            'parent': parent.to_dict(),
            'sessions': [s.to_dict() for s in siblings]
        })
    else:
        # Bu parent
        children = LiveSession.query.filter_by(
            parent_session_id=session.id,
            is_deleted=False
        ).order_by(LiveSession.scheduled_start).all()
        
        return success_response(data={
            'parent': session.to_dict(),
            'sessions': [s.to_dict() for s in children]
        })


# =============================================================================
# Recording Routes
# =============================================================================

@live_classes_bp.route('/<int:session_id>/recording', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def add_recording(session_id: int):
    """Kayıt linki ekle."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    session = LiveSessionService.get_or_404(session_id)
    
    # Yetki kontrolü
    if session.host_id != user_id:
        from flask_jwt_extended import get_jwt
        claims = get_jwt()
        if claims.get('role') not in ['admin', 'super_admin']:
            raise AuthorizationError('Bu işlem için yetkiniz yok')
    
    session.recording_url = data.get('recording_url')
    session.is_recording_enabled = True
    db.session.commit()
    
    return success_response(
        data={'session': session.to_dict(include_url=True)},
        message='Kayıt linki eklendi'
    )


@live_classes_bp.route('/<int:session_id>/recording', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_recording(session_id: int):
    """Kayıt linkini al."""
    user_id = get_jwt_identity()
    
    session = LiveSessionService.get_or_404(session_id)
    
    # Erişim kontrolü
    access = session.check_user_access(user_id)
    if not access['can_access'] and not access['is_host']:
        raise AuthorizationError('Bu kayda erişim yetkiniz yok')
    
    if not session.recording_url:
        return success_response(
            data={'recording_url': None},
            message='Kayıt bulunamadı'
        )
    
    return success_response(data={'recording_url': session.recording_url})


# =============================================================================
# Analytics Routes
# =============================================================================

@live_classes_bp.route('/<int:session_id>/analytics', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def get_session_analytics(session_id: int):
    """Oturum analitikleri."""
    session = LiveSessionService.get_or_404(session_id)
    
    # Katılım istatistikleri
    attendances = SessionAttendance.query.filter_by(session_id=session_id).all()
    
    total_registered = len(attendances)
    # attended field'ını kullanarak katılımı hesapla
    total_joined = sum(1 for a in attendances if a.attended or a.joined_at is not None)
    # %80 ve üzeri katılım süresi olanları tamamlamış say
    session_duration = session.duration_minutes * 60 if hasattr(session, 'duration_minutes') else 3600
    total_completed = sum(1 for a in attendances if a.attendance_duration_seconds and a.attendance_duration_seconds >= session_duration * 0.8)
    
    avg_duration = 0
    if attendances:
        durations = [a.attendance_duration_seconds / 60 for a in attendances if a.attendance_duration_seconds and a.attendance_duration_seconds > 0]
        avg_duration = sum(durations) / len(durations) if durations else 0
    
    return success_response(data={
        'session': session.to_dict(),
        'analytics': {
            'total_registered': total_registered,
            'total_joined': total_joined,
            'total_completed': total_completed,
            'attendance_rate': round(total_joined / total_registered * 100, 1) if total_registered > 0 else 0,
            'completion_rate': round(total_completed / total_registered * 100, 1) if total_registered > 0 else 0,
            'peak_participants': getattr(session, 'peak_participants', total_joined),
            'average_duration_minutes': round(avg_duration, 1),
            'session_duration_minutes': getattr(session, 'duration_actual', None) or session.duration_minutes
        }
    })


# =============================================================================
# Import necessary models - Use module-local imports to avoid circular imports
# =============================================================================

from app.modules.live_classes.models import LiveSession
from datetime import datetime, timedelta
from app.extensions import db
from app.core.exceptions import AuthorizationError


# =============================================================================
# POST-SESSION AI ROUTES
# =============================================================================
# 
# ÖNEMLİ: Bu endpoint'ler SADECE bitmiş dersler için çalışır.
# Canlı ders SIRASINDA AI kullanılmaz.
#
# Teknik gerekçeler için: post_session_ai_service.py başlık yorumlarına bakın.
#
# =============================================================================

@live_classes_bp.route('/<int:session_id>/ai/ask', methods=['POST'])
@jwt_required()
@handle_exceptions
def ai_ask_about_session(session_id: int):
    """
    [POST-SESSION ONLY] Ders hakkında AI'ya soru sor.
    
    Bu endpoint SADECE bitmiş dersler için çalışır.
    Canlı ders sırasında AI chat yapılamaz.
    
    Body:
        question: str - Öğrencinin sorusu
        
    Erişim Kuralları:
        - Ders BİTMİŞ olmalı (status = ENDED)
        - Kullanıcı derse KATILMIŞ olmalı
        - Ders bitişinden 30 gün geçmemiş olmalı
    """
    from app.modules.live_classes.post_session_ai_service import PostSessionAIService
    
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    question = data.get('question', '').strip()
    
    if not question:
        return success_response(
            data=None,
            message='Soru boş olamaz',
            status_code=400
        )
    
    result = PostSessionAIService.ask_about_session(
        user_id=user_id,
        session_id=session_id,
        question=question
    )
    
    return success_response(
        data={'ai_response': result},
        message='Yanıt oluşturuldu'
    )


@live_classes_bp.route('/<int:session_id>/ai/summary', methods=['GET'])
@jwt_required()
@handle_exceptions
def ai_get_session_summary(session_id: int):
    """
    [POST-SESSION ONLY] Ders özeti al.
    
    NOT: Bu özet ders metadata'sından oluşturulur,
    derste gerçekte konuşulanları yansıtmaz.
    """
    from app.modules.live_classes.post_session_ai_service import PostSessionAIService
    
    user_id = get_jwt_identity()
    
    result = PostSessionAIService.get_session_summary(
        user_id=user_id,
        session_id=session_id
    )
    
    return success_response(
        data={'ai_response': result},
        message='Özet oluşturuldu'
    )


@live_classes_bp.route('/<int:session_id>/ai/review', methods=['GET'])
@jwt_required()
@handle_exceptions
def ai_get_review_suggestions(session_id: int):
    """
    [POST-SESSION ONLY] Tekrar önerileri al.
    
    Ders konusuna göre ne çalışılması gerektiğini önerir.
    """
    from app.modules.live_classes.post_session_ai_service import PostSessionAIService
    
    user_id = get_jwt_identity()
    
    result = PostSessionAIService.get_review_suggestions(
        user_id=user_id,
        session_id=session_id
    )
    
    return success_response(
        data={'ai_response': result},
        message='Tekrar önerileri oluşturuldu'
    )


@live_classes_bp.route('/<int:session_id>/ai/notes', methods=['GET'])
@jwt_required()
@handle_exceptions
def ai_generate_study_notes(session_id: int):
    """
    [POST-SESSION ONLY] Çalışma notları oluştur.
    
    Ders konusuna göre çalışma notları önerir.
    """
    from app.modules.live_classes.post_session_ai_service import PostSessionAIService
    
    user_id = get_jwt_identity()
    
    result = PostSessionAIService.generate_study_notes(
        user_id=user_id,
        session_id=session_id
    )
    
    return success_response(
        data={'ai_response': result},
        message='Çalışma notları oluşturuldu'
    )


@live_classes_bp.route('/<int:session_id>/ai/explain', methods=['GET'])
@jwt_required()
@handle_exceptions
def ai_explain_topic(session_id: int):
    """
    [POST-SESSION ONLY] Ders konusunu açıkla.
    
    Query params:
        detail_level: brief | medium | detailed (default: medium)
    """
    from app.modules.live_classes.post_session_ai_service import PostSessionAIService
    
    user_id = get_jwt_identity()
    detail_level = request.args.get('detail_level', 'medium')
    
    result = PostSessionAIService.explain_session_topic(
        user_id=user_id,
        session_id=session_id,
        detail_level=detail_level
    )
    
    return success_response(
        data={'ai_response': result},
        message='Açıklama oluşturuldu'
    )


@live_classes_bp.route('/ai/attended-sessions', methods=['GET'])
@jwt_required()
@handle_exceptions
def ai_get_attended_sessions():
    """
    AI danışman kullanılabilecek (katılmış + bitmiş) dersleri listele.
    
    Query params:
        days: int - Son kaç gün (default: 30)
        limit: int - Maksimum sonuç (default: 10)
    """
    from app.modules.live_classes.post_session_ai_service import PostSessionAIService
    
    user_id = get_jwt_identity()
    days = request.args.get('days', 30, type=int)
    limit = request.args.get('limit', 10, type=int)
    
    sessions = PostSessionAIService.get_attended_sessions(
        user_id=user_id,
        days=days,
        limit=limit
    )
    
    return success_response(
        data={
            'sessions': sessions,
            'count': len(sessions),
            'ai_policy': {
                'available_for': 'ended_sessions_only',
                'participation_required': True,
                'max_days_after_session': 30
            }
        },
        message='AI kullanılabilir dersler listelendi'
    )


@live_classes_bp.route('/<int:session_id>/ai/status', methods=['GET'])
@jwt_required()
@handle_exceptions
def ai_check_availability(session_id: int):
    """
    Bu ders için AI danışman kullanılabilir mi?
    
    Dönen bilgiler:
    - ai_available: bool - AI kullanılabilir mi
    - reason: str - Kullanılamıyorsa neden
    - session_status: str - Ders durumu
    """
    from app.modules.live_classes.models import SessionStatus
    
    user_id = get_jwt_identity()
    
    session = LiveSession.query.filter_by(id=session_id, is_deleted=False).first()
    
    if not session:
        return success_response(
            data={
                'ai_available': False,
                'reason': 'Ders bulunamadı',
                'session_status': None
            }
        )
    
    # Durum kontrolü
    if session.status != SessionStatus.ENDED:
        status_messages = {
            SessionStatus.DRAFT: 'Ders henüz taslak durumunda',
            SessionStatus.SCHEDULED: 'Ders henüz başlamadı',
            SessionStatus.LIVE: 'Ders şu an devam ediyor - AI canlı derste kullanılamaz',
            SessionStatus.CANCELLED: 'Ders iptal edilmiş',
        }
        return success_response(
            data={
                'ai_available': False,
                'reason': status_messages.get(session.status, 'Ders bitmiş değil'),
                'session_status': session.status.value,
                'policy': 'AI danışman yalnızca bitmiş dersler için kullanılabilir'
            }
        )
    
    # Katılım kontrolü
    attendance = SessionAttendance.query.filter_by(
        session_id=session_id,
        user_id=user_id
    ).first()
    
    if not attendance:
        return success_response(
            data={
                'ai_available': False,
                'reason': 'Bu derse kayıtlı değilsiniz',
                'session_status': session.status.value
            }
        )
    
    if attendance.join_count == 0:
        return success_response(
            data={
                'ai_available': False,
                'reason': 'Derse kayıt oldunuz ancak katılmadınız',
                'session_status': session.status.value
            }
        )
    
    # Zaman kontrolü
    if session.actual_end:
        days_since = (datetime.utcnow() - session.actual_end).days
        if days_since > 30:
            return success_response(
                data={
                    'ai_available': False,
                    'reason': f'Ders {days_since} gün önce sona erdi (30 gün limiti)',
                    'session_status': session.status.value
                }
            )
    
    return success_response(
        data={
            'ai_available': True,
            'reason': None,
            'session_status': session.status.value,
            'attendance_percentage': attendance.attendance_percentage,
            'available_features': [
                'ask_question',
                'get_summary',
                'get_review_suggestions',
                'generate_notes',
                'explain_topic'
            ]
        }
    )
