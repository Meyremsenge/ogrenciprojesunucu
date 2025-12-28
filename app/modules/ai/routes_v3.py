"""
AI Routes V3 - Provider Abstraction Layer Demo.

Bu dosya, yeni AI Provider Abstraction mimarisinin nasıl kullanılacağını gösterir.

TEMEL PRENSİP:
=============
    Kodun HİÇBİR yerinde doğrudan GPT/OpenAI çağrısı YOKTUR!
    Tüm AI çağrıları get_ai_provider() üzerinden yapılır.

KULLANIM:
=========
    1. get_ai_provider() ile provider al
    2. AICompletionRequest oluştur
    3. provider.complete(request) çağır
    4. AICompletionResponse döner

CONFIG AYARLARI:
================
    Development: AI_PROVIDER = 'mock'
    Production:  AI_PROVIDER = 'openai'
"""

from flask import request, jsonify, current_app
from marshmallow import Schema, fields, validate
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.modules.ai import ai_bp
from app.core.responses import success_response, error_response

# NEW: Provider Abstraction Imports
from app.modules.ai.providers import (
    get_ai_provider,
    list_providers,
    AICompletionRequest,
    AIMessage,
    AIFeatureType,
    AIProviderException,
    is_using_mock,
    get_current_provider_name,
)


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class HintRequestSchema(Schema):
    """Soru ipucu isteği."""
    question_text = fields.Str(required=True, validate=validate.Length(min=10, max=2000))
    subject = fields.Str(required=False)
    difficulty = fields.Str(validate=validate.OneOf(['easy', 'medium', 'hard']))


class TopicExplanationSchema(Schema):
    """Konu açıklaması isteği."""
    topic = fields.Str(required=True, validate=validate.Length(min=3, max=200))
    level = fields.Str(validate=validate.OneOf(['beginner', 'intermediate', 'advanced']))
    include_examples = fields.Bool(load_default=True)


class StudyPlanSchema(Schema):
    """Çalışma planı isteği."""
    goals = fields.List(fields.Str(), required=True, validate=validate.Length(min=1))
    available_hours_per_day = fields.Float(load_default=2.0)
    deadline_days = fields.Int(load_default=30)
    weak_areas = fields.List(fields.Str(), load_default=[])


class AnswerEvaluationSchema(Schema):
    """Cevap değerlendirme isteği."""
    question = fields.Str(required=True)
    student_answer = fields.Str(required=True)
    correct_answer = fields.Str(required=False)


# =============================================================================
# ROUTES - Provider Abstraction Kullanımı
# =============================================================================

@ai_bp.route('/v3/provider/info', methods=['GET'])
@jwt_required()
def get_provider_info():
    """
    Aktif AI provider bilgisini döndür.
    
    Bu endpoint, hangi provider'ın kullanıldığını ve
    available provider'ları gösterir.
    """
    try:
        provider = get_ai_provider()
        
        return success_response({
            'current_provider': {
                'name': provider.name,
                'display_name': provider.display_name,
                'is_production_ready': provider.is_production_ready,
                'is_available': provider.is_available,
            },
            'config_provider': get_current_provider_name(),
            'using_mock': is_using_mock(),
            'available_providers': list_providers(),
            'stats': provider.stats
        })
        
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/v3/provider/health', methods=['GET'])
@jwt_required()
def check_provider_health():
    """
    Provider sağlık kontrolü.
    
    Bu endpoint, aktif provider'ın durumunu kontrol eder.
    """
    try:
        provider = get_ai_provider()
        health = provider.health_check()
        
        return success_response({
            'provider': health.provider,
            'status': health.status.value,
            'latency_ms': health.latency_ms,
            'error': health.error,
            'details': health.details,
            'last_check': health.last_check.isoformat()
        })
        
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/v3/hint', methods=['POST'])
@jwt_required()
def get_question_hint_v3():
    """
    Soru ipucu al - Provider Abstraction ile.
    
    Bu endpoint, doğrudan GPT çağırmaz!
    Config'e göre Mock veya OpenAI kullanır.
    """
    # Request validation
    schema = HintRequestSchema()
    data = schema.load(request.get_json())
    
    user_id = get_jwt_identity()
    
    try:
        # 1. Provider'ı al (config'den)
        provider = get_ai_provider()
        
        # 2. Request oluştur
        ai_request = AICompletionRequest(
            messages=[
                AIMessage(
                    role='system',
                    content="""Sen yardımcı bir eğitim asistanısın. 
                    Öğrencilere sorularla ilgili ipuçları veriyorsun.
                    Cevabı direkt verme, düşünmesini sağla."""
                ),
                AIMessage(
                    role='user',
                    content=f"Bu soru için ipucu ver:\n\n{data['question_text']}"
                )
            ],
            feature=AIFeatureType.QUESTION_HINT,
            user_id=user_id,
            max_tokens=500,
            temperature=0.7,
            metadata={
                'subject': data.get('subject'),
                'difficulty': data.get('difficulty')
            }
        )
        
        # 3. AI çağrısı yap (DOĞRUDAN GPT DEĞİL!)
        response = provider.complete(ai_request)
        
        # 4. Yanıt döndür
        return success_response({
            'hint': response.content,
            'provider': response.provider,
            'model': response.model,
            'tokens_used': response.tokens_used,
            'latency_ms': response.latency_ms,
            'is_mock': is_using_mock()
        })
        
    except AIProviderException as e:
        return error_response(f"AI Provider hatası: {e.message}", 503)
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/v3/explain', methods=['POST'])
@jwt_required()
def get_topic_explanation_v3():
    """
    Konu açıklaması al - Provider Abstraction ile.
    """
    schema = TopicExplanationSchema()
    data = schema.load(request.get_json())
    
    user_id = get_jwt_identity()
    
    try:
        provider = get_ai_provider()
        
        level_text = {
            'beginner': 'başlangıç seviyesinde, basit kelimelerle',
            'intermediate': 'orta seviyede, biraz teknik detayla',
            'advanced': 'ileri seviyede, detaylı ve teknik'
        }.get(data.get('level', 'intermediate'), 'orta seviyede')
        
        example_text = "Örneklerle açıkla." if data.get('include_examples') else ""
        
        ai_request = AICompletionRequest(
            messages=[
                AIMessage(
                    role='system',
                    content=f"""Sen uzman bir öğretmensin. 
                    Konuları {level_text} açıklıyorsun. {example_text}"""
                ),
                AIMessage(
                    role='user',
                    content=f"'{data['topic']}' konusunu açıklar mısın?"
                )
            ],
            feature=AIFeatureType.TOPIC_EXPLANATION,
            user_id=user_id,
            max_tokens=1000,
            temperature=0.5
        )
        
        response = provider.complete(ai_request)
        
        return success_response({
            'explanation': response.content,
            'topic': data['topic'],
            'level': data.get('level', 'intermediate'),
            'provider': response.provider,
            'tokens_used': response.tokens_used
        })
        
    except AIProviderException as e:
        return error_response(f"AI Provider hatası: {e.message}", 503)
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/v3/study-plan', methods=['POST'])
@jwt_required()
def create_study_plan_v3():
    """
    Çalışma planı oluştur - Provider Abstraction ile.
    """
    schema = StudyPlanSchema()
    data = schema.load(request.get_json())
    
    user_id = get_jwt_identity()
    
    try:
        provider = get_ai_provider()
        
        goals_text = "\n".join(f"- {goal}" for goal in data['goals'])
        weak_areas_text = "\n".join(f"- {area}" for area in data.get('weak_areas', []))
        
        ai_request = AICompletionRequest(
            messages=[
                AIMessage(
                    role='system',
                    content="""Sen deneyimli bir eğitim danışmanısın.
                    Öğrencilere kişiselleştirilmiş çalışma planları oluşturuyorsun."""
                ),
                AIMessage(
                    role='user',
                    content=f"""Bana bir çalışma planı oluştur:

Hedeflerim:
{goals_text}

Günlük çalışma saatim: {data['available_hours_per_day']} saat
Sürem: {data['deadline_days']} gün

{f'Zayıf alanlarım: {weak_areas_text}' if weak_areas_text else ''}"""
                )
            ],
            feature=AIFeatureType.STUDY_PLAN,
            user_id=user_id,
            max_tokens=1500,
            temperature=0.6
        )
        
        response = provider.complete(ai_request)
        
        return success_response({
            'study_plan': response.content,
            'goals': data['goals'],
            'duration_days': data['deadline_days'],
            'provider': response.provider,
            'tokens_used': response.tokens_used
        })
        
    except AIProviderException as e:
        return error_response(f"AI Provider hatası: {e.message}", 503)
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/v3/evaluate', methods=['POST'])
@jwt_required()
def evaluate_answer_v3():
    """
    Cevap değerlendir - Provider Abstraction ile.
    """
    schema = AnswerEvaluationSchema()
    data = schema.load(request.get_json())
    
    user_id = get_jwt_identity()
    
    try:
        provider = get_ai_provider()
        
        correct_answer_text = ""
        if data.get('correct_answer'):
            correct_answer_text = f"\n\nDoğru cevap: {data['correct_answer']}"
        
        ai_request = AICompletionRequest(
            messages=[
                AIMessage(
                    role='system',
                    content="""Sen adil ve yapıcı bir öğretmensin.
                    Öğrenci cevaplarını değerlendirip geri bildirim veriyorsun.
                    Yanılgıları düzelt ama cesaretlendirici ol."""
                ),
                AIMessage(
                    role='user',
                    content=f"""Bu cevabı değerlendir:

Soru: {data['question']}

Öğrenci Cevabı: {data['student_answer']}{correct_answer_text}"""
                )
            ],
            feature=AIFeatureType.ANSWER_EVALUATION,
            user_id=user_id,
            max_tokens=800,
            temperature=0.4
        )
        
        response = provider.complete(ai_request)
        
        return success_response({
            'evaluation': response.content,
            'question': data['question'],
            'student_answer': data['student_answer'],
            'provider': response.provider,
            'tokens_used': response.tokens_used
        })
        
    except AIProviderException as e:
        return error_response(f"AI Provider hatası: {e.message}", 503)
    except Exception as e:
        return error_response(str(e), 500)


@ai_bp.route('/v3/motivation', methods=['GET'])
@jwt_required()
def get_motivation_v3():
    """
    Motivasyon mesajı al - Provider Abstraction ile.
    """
    user_id = get_jwt_identity()
    
    try:
        provider = get_ai_provider()
        
        ai_request = AICompletionRequest(
            messages=[
                AIMessage(
                    role='system',
                    content="""Sen pozitif ve ilham verici bir mentorsun.
                    Öğrencilere kısa ama etkili motivasyon mesajları veriyorsun."""
                ),
                AIMessage(
                    role='user',
                    content="Bugün için bana motive edici bir mesaj ver!"
                )
            ],
            feature=AIFeatureType.MOTIVATION_MESSAGE,
            user_id=user_id,
            max_tokens=300,
            temperature=0.8
        )
        
        response = provider.complete(ai_request)
        
        return success_response({
            'message': response.content,
            'provider': response.provider,
            'is_mock': is_using_mock()
        })
        
    except AIProviderException as e:
        return error_response(f"AI Provider hatası: {e.message}", 503)
    except Exception as e:
        return error_response(str(e), 500)


# =============================================================================
# STREAMING ENDPOINT
# =============================================================================

@ai_bp.route('/v3/stream/explain', methods=['POST'])
@jwt_required()
def stream_explanation_v3():
    """
    Streaming konu açıklaması - Provider Abstraction ile.
    
    SSE (Server-Sent Events) kullanarak yanıtı parça parça gönderir.
    """
    from flask import Response
    
    schema = TopicExplanationSchema()
    data = schema.load(request.get_json())
    
    user_id = get_jwt_identity()
    
    def generate():
        try:
            provider = get_ai_provider()
            
            ai_request = AICompletionRequest(
                messages=[
                    AIMessage(
                        role='system',
                        content="Sen uzman bir öğretmensin. Konuları net ve anlaşılır açıklıyorsun."
                    ),
                    AIMessage(
                        role='user',
                        content=f"'{data['topic']}' konusunu açıklar mısın?"
                    )
                ],
                feature=AIFeatureType.TOPIC_EXPLANATION,
                user_id=user_id,
                max_tokens=1000,
                temperature=0.5
            )
            
            # Stream yanıtı
            for chunk in provider.stream(ai_request):
                yield f"data: {chunk}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )
