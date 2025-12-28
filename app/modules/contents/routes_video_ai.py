"""
Video AI Route'ları.

YouTube videolar için AI danışman endpoint'leri.

ÖNEMLİ: AI video içeriğini analiz etmez.
"""

from flask import Blueprint, request, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, fields, validate

from app.core.decorators import require_role
from app.core.responses import success_response, error_response
from app.core.pagination import paginate_query
from app.core.exceptions import ValidationError, NotFoundError
from app.modules.contents.video_ai_service import VideoAIService, VideoAIFeature


video_ai_bp = Blueprint('video_ai', __name__)


# =============================================================================
# Request Schemas
# =============================================================================

class VideoQuestionSchema(Schema):
    """Video soru schema."""
    question = fields.Str(required=True, validate=validate.Length(min=5, max=1000))
    timestamp = fields.Int(required=False, validate=validate.Range(min=0))


class VideoExplainSchema(Schema):
    """Video açıklama schema."""
    detail_level = fields.Str(
        required=False, 
        load_default='medium',
        validate=validate.OneOf(['brief', 'medium', 'detailed'])
    )


class VideoQuizSchema(Schema):
    """Video quiz schema."""
    question_count = fields.Int(
        required=False, 
        load_default=3,
        validate=validate.Range(min=1, max=5)
    )


class ReviewSuggestionSchema(Schema):
    """Tekrar önerisi schema."""
    topic_id = fields.Int(required=False)


# =============================================================================
# Video AI Endpoints
# =============================================================================

@video_ai_bp.route('/videos/<int:video_id>/ai/ask', methods=['POST'])
@jwt_required()
def ask_about_video(video_id):
    """
    Video hakkında soru sor.
    
    AI video içeriğini analiz etmez, sadece başlık/açıklama bilgisinden cevaplar.
    
    ---
    tags:
      - Video AI
    security:
      - BearerAuth: []
    parameters:
      - name: video_id
        in: path
        type: integer
        required: true
        description: Video ID
    requestBody:
      content:
        application/json:
          schema:
            type: object
            required:
              - question
            properties:
              question:
                type: string
                description: Öğrencinin sorusu (5-1000 karakter)
                example: "Bu konunun temel prensipleri nelerdir?"
              timestamp:
                type: integer
                description: Video'daki konum (saniye)
                example: 120
    responses:
      200:
        description: AI yanıtı
        content:
          application/json:
            schema:
              type: object
              properties:
                answer:
                  type: string
                disclaimer:
                  type: string
      400:
        description: Geçersiz soru
      404:
        description: Video bulunamadı
    """
    schema = VideoQuestionSchema()
    data = schema.load(request.get_json() or {})
    
    result = VideoAIService.ask_about_video(
        user_id=get_jwt_identity(),
        video_id=video_id,
        question=data['question'],
        timestamp=data.get('timestamp')
    )
    
    return success_response(
        data=result,
        message='Soru başarıyla yanıtlandı'
    )


@video_ai_bp.route('/videos/<int:video_id>/ai/explain', methods=['POST'])
@jwt_required()
def explain_video_topic(video_id):
    """
    Video konusunu açıkla.
    
    AI video'yu izlemez, sadece metadata'dan konu açıklar.
    
    ---
    tags:
      - Video AI
    security:
      - BearerAuth: []
    parameters:
      - name: video_id
        in: path
        type: integer
        required: true
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              detail_level:
                type: string
                enum: [brief, medium, detailed]
                default: medium
    responses:
      200:
        description: Konu açıklaması
    """
    schema = VideoExplainSchema()
    data = schema.load(request.get_json() or {})
    
    result = VideoAIService.explain_video_topic(
        user_id=get_jwt_identity(),
        video_id=video_id,
        detail_level=data['detail_level']
    )
    
    return success_response(
        data=result,
        message='Konu açıklaması oluşturuldu'
    )


@video_ai_bp.route('/videos/<int:video_id>/ai/key-points', methods=['GET'])
@jwt_required()
def get_video_key_points(video_id):
    """
    Video'nun ana noktalarını al.
    
    AI video'yu analiz etmez, metadata'dan muhtemel noktaları listeler.
    
    ---
    tags:
      - Video AI
    security:
      - BearerAuth: []
    responses:
      200:
        description: Ana noktalar listesi
    """
    result = VideoAIService.get_key_points(
        user_id=get_jwt_identity(),
        video_id=video_id
    )
    
    return success_response(
        data=result,
        message='Ana noktalar listelendi'
    )


@video_ai_bp.route('/videos/<int:video_id>/ai/quiz', methods=['POST'])
@jwt_required()
def generate_video_quiz(video_id):
    """
    Video konusu için anlık quiz oluştur.
    
    NOT: Bu quiz kalıcı olarak kaydedilmez. Anlık üretilir.
    AI video içeriğini analiz etmez.
    
    ---
    tags:
      - Video AI
    security:
      - BearerAuth: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              question_count:
                type: integer
                minimum: 1
                maximum: 5
                default: 3
    responses:
      200:
        description: Quiz soruları
    """
    schema = VideoQuizSchema()
    data = schema.load(request.get_json() or {})
    
    result = VideoAIService.generate_video_quiz(
        user_id=get_jwt_identity(),
        video_id=video_id,
        question_count=data['question_count']
    )
    
    return success_response(
        data=result,
        message='Quiz oluşturuldu'
    )


# =============================================================================
# Tekrar Önerisi Endpoints
# =============================================================================

@video_ai_bp.route('/videos/<int:video_id>/ai/review-suggestions', methods=['GET'])
@jwt_required()
def get_video_review_suggestions(video_id):
    """
    Belirli video için tekrar önerileri.
    
    İzleme geçmişine göre tekrar önerileri sunar.
    
    ---
    tags:
      - Video AI
    security:
      - BearerAuth: []
    responses:
      200:
        description: Tekrar önerileri
    """
    result = VideoAIService.get_review_suggestions(
        user_id=get_jwt_identity(),
        video_id=video_id
    )
    
    return success_response(
        data=result,
        message='Tekrar önerileri oluşturuldu'
    )


@video_ai_bp.route('/ai/review-suggestions', methods=['GET'])
@jwt_required()
def get_general_review_suggestions():
    """
    Genel tekrar önerileri.
    
    Tüm izleme geçmişine göre öneriler.
    
    ---
    tags:
      - Video AI
    security:
      - BearerAuth: []
    parameters:
      - name: topic_id
        in: query
        type: integer
        required: false
        description: Belirli konuya filtrele
    responses:
      200:
        description: Tekrar önerileri
    """
    schema = ReviewSuggestionSchema()
    data = schema.load(request.args)
    
    result = VideoAIService.get_review_suggestions(
        user_id=get_jwt_identity(),
        topic_id=data.get('topic_id')
    )
    
    return success_response(
        data=result,
        message='Tekrar önerileri oluşturuldu'
    )


# =============================================================================
# Video Embed Bilgisi
# =============================================================================

@video_ai_bp.route('/videos/<int:video_id>/embed-info', methods=['GET'])
@jwt_required()
def get_video_embed_info(video_id):
    """
    Video embed bilgilerini al.
    
    YouTube privacy-enhanced mode ile güvenli embed URL döner.
    
    ---
    tags:
      - Video
    security:
      - BearerAuth: []
    responses:
      200:
        description: Embed bilgileri
    """
    from app.modules.contents.models import Video, ContentStatus
    from app.services.youtube_service import YouTubeService
    from flask import current_app
    
    video = Video.query.filter_by(id=video_id, is_deleted=False).first()
    if not video:
        raise NotFoundError('Video bulunamadı')
    
    if video.content_status != ContentStatus.PUBLISHED:
        raise NotFoundError('Bu video henüz yayınlanmamış')
    
    # YouTube video için güvenli embed URL oluştur
    embed_url = None
    embed_html = None
    
    if video.provider and video.provider.value == 'youtube' and video.video_id:
        # Origin kontrolü için current_app.config kullan
        origin = current_app.config.get('SERVER_NAME', 'localhost')
        
        embed_url = YouTubeService.get_video_embed_url(
            video_id=video.video_id,
            autoplay=False,
            start=0
        )
    elif video.video_url:
        embed_url = video.video_url
    
    return success_response(
        data={
            'video_id': video.id,
            'title': video.title,
            'provider': video.provider.value if video.provider else None,
            'embed_url': embed_url,
            'thumbnail_url': video.thumbnail_url,
            'duration': video.duration,
            'duration_formatted': video.duration_formatted,
            'is_free_preview': video.is_free_preview,
            'privacy_notice': 'Bu video GDPR uyumlu privacy-enhanced modda sunulmaktadır.',
        },
        message='Embed bilgileri alındı'
    )
