"""
AI Module - API Routes (Enterprise Version).

Kurumsal AI endpoint'leri.
Yeni servis mimarisi ile uyumlu.
"""

from flask import request, g, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.modules.ai import ai_bp
from app.modules.ai.services import ai_service
from app.modules.ai.core import (
    AIFeature,
    AIException,
    AIQuotaExceededError,
    AIRateLimitError,
    AIAbuseDetectedError,
    AIPromptError
)
from app.core.responses import success_response, error_response
from app.core.decorators import validate_json, handle_exceptions, rate_limit
from app.models.user import User


def get_current_user():
    """Mevcut kullanıcıyı al."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)


def handle_ai_errors(func):
    """AI hatalarını yakala ve uygun yanıt döndür."""
    from functools import wraps
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except AIQuotaExceededError as e:
            return error_response(message=str(e), status_code=429)
        except AIRateLimitError as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'retry_after': e.details.get('retry_after') if e.details else None
            }), 429
        except AIAbuseDetectedError as e:
            return error_response(message=str(e), status_code=403)
        except AIPromptError as e:
            return error_response(message=str(e), status_code=400)
        except AIException as e:
            return error_response(message=str(e), status_code=500)
    
    return wrapper


# =============================================================================
# SORU İPUCU
# =============================================================================

@ai_bp.route('/v2/hint', methods=['POST'])
@handle_exceptions
@jwt_required()
@handle_ai_errors
def get_hint_v2():
    """
    Soru için ipucu al (v2).
    """
    data = request.get_json()
    user = get_current_user()
    
    result = ai_service.get_hint(
        user_id=user.id,
        question_text=data.get('question_text', ''),
        difficulty_level=data.get('difficulty_level', 'orta'),
        role=user.role,
        subject=data.get('subject'),
        topic=data.get('topic')
    )
    
    return success_response(
        data=result,
        message='İpucu başarıyla oluşturuldu.'
    )


# =============================================================================
# KONU AÇIKLAMASI
# =============================================================================

@ai_bp.route('/v2/explain', methods=['POST'])
@handle_exceptions
@jwt_required()
@handle_ai_errors
def explain_topic_v2():
    """
    Konu açıklaması al (v2).
    """
    data = request.get_json()
    user = get_current_user()
    
    result = ai_service.explain_topic(
        user_id=user.id,
        topic_name=data.get('topic_name', data.get('topic', '')),
        student_level=data.get('student_level', 'lise'),
        role=user.role,
        subject=data.get('subject'),
        learning_style=data.get('learning_style')
    )
    
    return success_response(
        data=result,
        message='Konu açıklaması başarıyla oluşturuldu.'
    )


# =============================================================================
# ÇALIŞMA PLANI
# =============================================================================

@ai_bp.route('/v2/study-plan', methods=['POST'])
@handle_exceptions
@jwt_required()
@handle_ai_errors
def create_study_plan_v2():
    """
    Kişisel çalışma planı oluştur (v2).
    """
    data = request.get_json()
    user = get_current_user()
    
    result = ai_service.create_study_plan(
        user_id=user.id,
        goal=data.get('goal', ''),
        deadline=data.get('deadline', '30 gün'),
        role=user.role,
        current_level=data.get('current_level'),
        available_hours_per_day=data.get('available_hours_per_day'),
        weak_topics=data.get('weak_topics'),
        strong_topics=data.get('strong_topics')
    )
    
    return success_response(
        data=result,
        message='Çalışma planı başarıyla oluşturuldu.'
    )


# =============================================================================
# CEVAP DEĞERLENDİRME
# =============================================================================

@ai_bp.route('/v2/evaluate-answer', methods=['POST'])
@handle_exceptions
@jwt_required()
@handle_ai_errors
def evaluate_answer_v2():
    """
    Cevap değerlendir (v2) - Sadece öğretmenler.
    """
    data = request.get_json()
    user = get_current_user()
    
    result = ai_service.evaluate_answer(
        user_id=user.id,
        question=data.get('question', ''),
        student_answer=data.get('student_answer', ''),
        role=user.role,
        correct_answer=data.get('correct_answer'),
        grading_criteria=data.get('grading_criteria'),
        max_points=data.get('max_points', 100)
    )
    
    return success_response(
        data=result,
        message='Değerlendirme başarıyla oluşturuldu.'
    )


# =============================================================================
# PERFORMANS ANALİZİ
# =============================================================================

@ai_bp.route('/v2/analyze-performance', methods=['POST'])
@handle_exceptions
@jwt_required()
@handle_ai_errors
def analyze_performance_v2():
    """
    Performans analizi yap (v2).
    """
    data = request.get_json()
    user = get_current_user()
    
    # Student data JSON string olarak gelmeli
    import json
    student_data = data.get('student_data', {})
    if isinstance(student_data, dict):
        student_data = json.dumps(student_data, ensure_ascii=False)
    
    result = ai_service.analyze_performance(
        user_id=user.id,
        student_data=student_data,
        role=user.role,
        time_period=data.get('time_period'),
        subject_filter=data.get('subject_filter')
    )
    
    return success_response(
        data=result,
        message='Performans analizi başarıyla oluşturuldu.'
    )


# =============================================================================
# SORU ÜRETİMİ
# =============================================================================

@ai_bp.route('/v2/generate-questions', methods=['POST'])
@handle_exceptions
@jwt_required()
@handle_ai_errors
def generate_questions_v2():
    """
    Soru üret (v2) - Sadece öğretmenler.
    """
    data = request.get_json()
    user = get_current_user()
    
    result = ai_service.generate_questions(
        user_id=user.id,
        topic=data.get('topic', ''),
        difficulty=data.get('difficulty', 'orta'),
        question_count=data.get('question_count', 5),
        role=user.role,
        question_type=data.get('question_type'),
        subject=data.get('subject'),
        grade_level=data.get('grade_level'),
        include_answers=data.get('include_answers', True)
    )
    
    return success_response(
        data=result,
        message='Sorular başarıyla üretildi.'
    )


# =============================================================================
# İÇERİK ZENGİNLEŞTİRME
# =============================================================================

@ai_bp.route('/v2/enhance-content', methods=['POST'])
@handle_exceptions
@jwt_required()
@handle_ai_errors
def enhance_content_v2():
    """
    İçerik zenginleştir (v2) - Sadece öğretmenler.
    """
    data = request.get_json()
    user = get_current_user()
    
    result = ai_service.enhance_content(
        user_id=user.id,
        content=data.get('content', ''),
        enhancement_type=data.get('enhancement_type', 'detaylandır'),
        role=user.role,
        target_audience=data.get('target_audience'),
        subject=data.get('subject'),
        word_limit=data.get('word_limit')
    )
    
    return success_response(
        data=result,
        message='İçerik başarıyla zenginleştirildi.'
    )


# =============================================================================
# MOTİVASYON MESAJI
# =============================================================================

@ai_bp.route('/v2/motivation', methods=['POST'])
@handle_exceptions
@jwt_required()
@handle_ai_errors
def get_motivation_v2():
    """
    Motivasyon mesajı al (v2).
    """
    data = request.get_json()
    user = get_current_user()
    
    result = ai_service.get_motivation(
        user_id=user.id,
        student_name=data.get('student_name', user.full_name or 'Öğrenci'),
        role=user.role,
        recent_achievement=data.get('recent_achievement'),
        current_challenge=data.get('current_challenge'),
        mood=data.get('mood')
    )
    
    return success_response(
        data=result,
        message='Motivasyon mesajı başarıyla oluşturuldu.'
    )


# =============================================================================
# KOTA VE DURUM
# =============================================================================

@ai_bp.route('/v2/quota', methods=['GET'])
@handle_exceptions
@jwt_required()
def get_quota_v2():
    """
    Kota durumunu al (v2).
    """
    user = get_current_user()
    
    quota_status = ai_service.get_quota_status(user.id, user.role)
    rate_status = ai_service.get_rate_status(user.id, user.role)
    
    return success_response(
        data={
            'quota': quota_status,
            'rate_limit': rate_status
        },
        message='Kota bilgileri alındı.'
    )


@ai_bp.route('/v2/features', methods=['GET'])
@handle_exceptions
@jwt_required()
def get_features_v2():
    """
    Kullanılabilir özellikleri listele (v2).
    """
    user = get_current_user()
    
    features = ai_service.get_available_features(user.role)
    
    return success_response(
        data={
            'role': user.role,
            'features': features
        },
        message='Özellikler listelendi.'
    )


@ai_bp.route('/v2/health', methods=['GET'])
@handle_exceptions
def health_check_v2():
    """
    AI servis sağlık kontrolü (v2).
    """
    health = ai_service.health_check()
    
    status_code = 200 if health['status'] == 'healthy' else 503
    
    return jsonify(health), status_code
