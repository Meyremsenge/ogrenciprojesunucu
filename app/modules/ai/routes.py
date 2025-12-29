"""
AI Module - API Routes.

Yapay zeka endpoint'leri.
"""

from flask import request, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.modules.ai import ai_bp
from app.modules.ai.services import ai_service
from app.modules.ai.core import AIFeature, AIQuotaExceededError, AIRateLimitError, AIAbuseDetectedError

# Backward compatibility için eski AIService'i import et
# Bu sayede mevcut routes çalışmaya devam eder
from app.modules.ai.services_legacy import AIService

from app.modules.ai.schemas import (
    HintRequestSchema,
    TopicExplanationRequestSchema,
    StudyPlanRequestSchema,
    AnswerEvaluationRequestSchema,
    PerformanceAnalysisRequestSchema,
    QuestionGenerationRequestSchema,
    ContentEnhancementRequestSchema
)
from app.core.responses import success_response, error_response, created_response
from app.core.decorators import validate_json, handle_exceptions, rate_limit
from app.models.user import User


def get_current_user():
    """Mevcut kullanıcıyı al."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)


# =============================================================================
# SORU İPUCU
# =============================================================================

@ai_bp.route('/hint', methods=['POST'])
@handle_exceptions
@jwt_required()
@rate_limit(limit=20, period=60)  # 20 istek / dakika
@validate_json(HintRequestSchema)
def get_hint():
    """
    Soru için ipucu al.
    
    ---
    tags:
      - AI
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - question_text
            properties:
              question_text:
                type: string
                minLength: 10
                maxLength: 2000
              question_id:
                type: integer
              subject:
                type: string
              hint_level:
                type: integer
                minimum: 1
                maximum: 3
                default: 1
    responses:
      200:
        description: İpucu başarıyla döndürüldü
      400:
        description: Geçersiz istek
      403:
        description: Kota aşıldı veya erişim yok
      401:
        description: Kimlik doğrulama gerekli
    """
    data = g.validated_data
    user = get_current_user()
    
    try:
        result = ai_service.get_hint(
            user_id=user.id,
            question_text=data['question_text'],
            difficulty_level=data.get('difficulty_level', 'orta'),
            role=user.role,
            subject=data.get('subject'),
            topic=data.get('topic')
        )
        
        return success_response(
            data=result,
            message='İpucu başarıyla oluşturuldu.'
        )
    except AIQuotaExceededError as e:
        return error_response(message=str(e), status_code=429)
    except AIRateLimitError as e:
        return error_response(message=str(e), status_code=429)
    except AIAbuseDetectedError as e:
        return error_response(message=str(e), status_code=403)


# =============================================================================
# KONU AÇIKLAMASI
# =============================================================================

@ai_bp.route('/explain', methods=['POST'])
@handle_exceptions
@jwt_required()
@rate_limit(limit=15, period=60)
@validate_json(TopicExplanationRequestSchema)
def explain_topic():
    """
    Konu açıklaması al.
    
    ---
    tags:
      - AI
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - topic
            properties:
              topic:
                type: string
                minLength: 2
                maxLength: 200
              subject:
                type: string
              difficulty:
                type: string
                enum: [basic, medium, advanced]
                default: medium
              learning_style:
                type: string
                enum: [visual, auditory, reading, kinesthetic]
              context:
                type: string
    responses:
      200:
        description: Açıklama başarıyla döndürüldü
      400:
        description: Geçersiz istek
      403:
        description: Kota aşıldı veya erişim yok
    """
    data = g.validated_data
    user = get_current_user()
    
    try:
        result = ai_service.explain_topic(
            user_id=user.id,
            topic_name=data['topic'],
            student_level=data.get('difficulty', 'lise'),
            role=user.role,
            learning_style=data.get('learning_style'),
            subject=data.get('subject')
        )
        
        return success_response(
            data=result,
            message='Konu açıklaması başarıyla oluşturuldu.'
        )
    except AIQuotaExceededError as e:
        return error_response(message=str(e), status_code=429)
    except AIRateLimitError as e:
        return error_response(message=str(e), status_code=429)
    except AIAbuseDetectedError as e:
        return error_response(message=str(e), status_code=403)


# =============================================================================
# ÇALIŞMA PLANI
# =============================================================================

@ai_bp.route('/study-plan', methods=['POST'])
@handle_exceptions
@jwt_required()
@rate_limit(limit=5, period=300)  # 5 istek / 5 dakika
@validate_json(StudyPlanRequestSchema)
def create_study_plan():
    """
    Kişisel çalışma planı oluştur.
    
    ---
    tags:
      - AI
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              target_date:
                type: string
                format: date
              target_exam:
                type: string
              daily_hours:
                type: number
                minimum: 0.5
                maximum: 8
                default: 2.0
              weak_topics:
                type: array
                items:
                  type: string
              preferred_times:
                type: array
                items:
                  type: string
                  enum: [morning, afternoon, evening, night]
              include_breaks:
                type: boolean
                default: true
    responses:
      200:
        description: Çalışma planı başarıyla oluşturuldu
      400:
        description: Geçersiz istek
      403:
        description: Kota aşıldı veya erişim yok
    """
    data = g.validated_data
    user = get_current_user()
    
    result = AIService.create_study_plan(
        user=user,
        plan_data=data
    )
    
    return success_response(
        data=result,
        message='Çalışma planı başarıyla oluşturuldu.'
    )


# =============================================================================
# CEVAP DEĞERLENDİRME (Öğretmen+)
# =============================================================================

@ai_bp.route('/evaluate-answer', methods=['POST'])
@handle_exceptions
@jwt_required()
@rate_limit(limit=30, period=60)
@validate_json(AnswerEvaluationRequestSchema)
def evaluate_answer():
    """
    Açık uçlu cevabı değerlendir.
    
    Sadece öğretmen ve üstü roller erişebilir.
    
    ---
    tags:
      - AI
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - question_text
              - student_answer
            properties:
              question_id:
                type: integer
              question_text:
                type: string
                minLength: 10
                maxLength: 2000
              student_answer:
                type: string
                minLength: 1
                maxLength: 5000
              expected_answer:
                type: string
              max_score:
                type: number
                default: 10
              rubric:
                type: object
              subject:
                type: string
    responses:
      200:
        description: Değerlendirme başarıyla tamamlandı
      400:
        description: Geçersiz istek
      403:
        description: Kota aşıldı veya yetkisiz erişim
    """
    data = g.validated_data
    user = get_current_user()
    
    result = AIService.evaluate_answer(
        user=user,
        question_text=data['question_text'],
        student_answer=data['student_answer'],
        expected_answer=data.get('expected_answer'),
        max_score=data.get('max_score', 10.0),
        rubric=data.get('rubric')
    )
    
    return success_response(
        data=result,
        message='Cevap değerlendirmesi tamamlandı.'
    )


# =============================================================================
# PERFORMANS ANALİZİ
# =============================================================================

@ai_bp.route('/analyze-performance', methods=['POST'])
@handle_exceptions
@jwt_required()
@rate_limit(limit=10, period=300)
@validate_json(PerformanceAnalysisRequestSchema)
def analyze_performance():
    """
    Öğrenci performans analizi.
    
    Öğrenciler sadece kendi analizlerini görebilir.
    Öğretmenler kendi öğrencilerinin analizini görebilir.
    
    ---
    tags:
      - AI
    security:
      - BearerAuth: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              student_id:
                type: integer
                description: Öğretmen/Admin için - öğrenci ID
              period_days:
                type: integer
                minimum: 7
                maximum: 365
                default: 30
              include_recommendations:
                type: boolean
                default: true
              include_predictions:
                type: boolean
                default: true
    responses:
      200:
        description: Analiz başarıyla tamamlandı
      403:
        description: Kota aşıldı veya yetkisiz erişim
    """
    data = g.validated_data
    user = get_current_user()
    
    result = AIService.analyze_performance(
        user=user,
        student_id=data.get('student_id'),
        period_days=data.get('period_days', 30),
        include_recommendations=data.get('include_recommendations', True)
    )
    
    return success_response(
        data=result,
        message='Performans analizi tamamlandı.'
    )


# =============================================================================
# SORU OLUŞTURMA (Öğretmen+)
# =============================================================================

@ai_bp.route('/generate-questions', methods=['POST'])
@handle_exceptions
@jwt_required()
@rate_limit(limit=10, period=60)
@validate_json(QuestionGenerationRequestSchema)
def generate_questions():
    """
    Otomatik soru oluştur.
    
    Sadece öğretmen ve üstü roller erişebilir.
    
    ---
    tags:
      - AI
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - topic
            properties:
              topic:
                type: string
                minLength: 2
                maxLength: 200
              subject:
                type: string
              difficulty:
                type: string
                enum: [easy, medium, hard]
                default: medium
              question_type:
                type: string
                enum: [multiple_choice, true_false, open_ended, fill_blank]
                default: multiple_choice
              count:
                type: integer
                minimum: 1
                maximum: 20
                default: 5
              include_answers:
                type: boolean
                default: true
    responses:
      200:
        description: Sorular başarıyla oluşturuldu
      403:
        description: Kota aşıldı veya yetkisiz erişim
    """
    data = g.validated_data
    user = get_current_user()
    
    result = AIService.generate_questions(
        user=user,
        topic=data['topic'],
        difficulty=data.get('difficulty', 'medium'),
        count=data.get('count', 5),
        question_type=data.get('question_type', 'multiple_choice')
    )
    
    return success_response(
        data=result,
        message='Sorular başarıyla oluşturuldu.'
    )


# =============================================================================
# İÇERİK ZENGİNLEŞTİRME (Öğretmen+)
# =============================================================================

@ai_bp.route('/enhance-content', methods=['POST'])
@handle_exceptions
@jwt_required()
@rate_limit(limit=10, period=60)
@validate_json(ContentEnhancementRequestSchema)
def enhance_content():
    """
    İçerik zenginleştir.
    
    Sadece öğretmen ve üstü roller erişebilir.
    
    ---
    tags:
      - AI
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - content
            properties:
              content:
                type: string
                minLength: 50
                maxLength: 10000
              content_type:
                type: string
                enum: [lesson, summary, exercise, example]
                default: lesson
              target_level:
                type: string
                enum: [basic, intermediate, advanced]
              add_examples:
                type: boolean
                default: true
              add_summary:
                type: boolean
                default: true
    responses:
      200:
        description: İçerik başarıyla zenginleştirildi
      403:
        description: Kota aşıldı veya yetkisiz erişim
    """
    data = g.validated_data
    user = get_current_user()
    
    result = AIService.enhance_content(
        user=user,
        content=data['content'],
        content_type=data.get('content_type', 'lesson'),
        add_examples=data.get('add_examples', True),
        add_summary=data.get('add_summary', True)
    )
    
    return success_response(
        data=result,
        message='İçerik başarıyla zenginleştirildi.'
    )


# =============================================================================
# KOTA SORGULAMA
# =============================================================================

@ai_bp.route('/quota', methods=['GET'])
@handle_exceptions
@jwt_required()
def get_quota():
    """
    AI kullanım kotası durumunu sorgula.
    
    ---
    tags:
      - AI
    security:
      - BearerAuth: []
    responses:
      200:
        description: Kota durumu
        content:
          application/json:
            schema:
              type: object
              properties:
                role:
                  type: string
                daily_tokens_used:
                  type: integer
                daily_tokens_limit:
                  type: integer
                monthly_tokens_used:
                  type: integer
                monthly_tokens_limit:
                  type: integer
                is_blocked:
                  type: boolean
    """
    user = get_current_user()
    result = AIService.get_quota_status(user)
    
    return success_response(
        data=result,
        message='Kota durumu.'
    )


# =============================================================================
# KULLANIM GEÇMİŞİ
# =============================================================================

@ai_bp.route('/usage-history', methods=['GET'])
@handle_exceptions
@jwt_required()
def get_usage_history():
    """
    AI kullanım geçmişini sorgula.
    
    ---
    tags:
      - AI
    security:
      - BearerAuth: []
    parameters:
      - in: query
        name: limit
        schema:
          type: integer
          default: 50
          maximum: 100
      - in: query
        name: offset
        schema:
          type: integer
          default: 0
    responses:
      200:
        description: Kullanım geçmişi
    """
    user = get_current_user()
    limit = min(int(request.args.get('limit', 50)), 100)
    offset = int(request.args.get('offset', 0))
    
    result = AIService.get_usage_history(user, limit=limit, offset=offset)
    
    return success_response(
        data=result,
        message='Kullanım geçmişi.'
    )


# =============================================================================
# KULLANILABILIR ÖZELLİKLER
# =============================================================================

@ai_bp.route('/features', methods=['GET'])
@handle_exceptions
@jwt_required()
def get_features():
    """
    Kullanılabilir AI özelliklerini listele.
    
    ---
    tags:
      - AI
    security:
      - BearerAuth: []
    responses:
      200:
        description: Kullanılabilir özellikler
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                  description:
                    type: string
                  token_cost:
                    type: integer
                  available:
                    type: boolean
                  cooldown_seconds:
                    type: integer
    """
    user = get_current_user()
    features = AIService.get_available_features(user)
    
    return success_response(
        data={'features': features},
        message='Kullanılabilir AI özellikleri.'
    )


# =============================================================================
# SAĞLIK KONTROLÜ
# =============================================================================

@ai_bp.route('/health', methods=['GET'])
@handle_exceptions
def ai_health():
    """
    AI modülü sağlık kontrolü.
    
    ---
    tags:
      - AI
    responses:
      200:
        description: AI modülü sağlıklı
    """
    from flask import current_app
    
    return success_response(
        data={
            'status': 'healthy',
            'provider': current_app.config.get('AI_PROVIDER', 'mock'),
            'mock_mode': current_app.config.get('AI_PROVIDER', 'mock') == 'mock'
        },
        message='AI modülü çalışıyor.'
    )
