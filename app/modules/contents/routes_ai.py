"""
Contents Module - AI Routes.

AI destekli içerik endpoint'leri.

MİMARİ NOTLAR:
=============
1. Öğrenci endpoint'leri (READ-ONLY):
   - /contents/{type}/{id}/ai/explain
   - /contents/{type}/{id}/ai/simplify
   - /contents/{type}/{id}/ai/examples
   - /contents/{type}/{id}/ai/ask
   - /contents/{type}/{id}/ai/summarize
   
   Bu endpoint'ler:
   - İçeriği DEĞİŞTİRMEZ
   - Kalıcı veri OLUŞTURMAZ
   - Sadece AI yanıtı döndürür

2. Öğretmen endpoint'leri (SUGGESTION):
   - /contents/ai/suggestions - Öneri oluştur
   - Oluşturulan öneri 'pending' durumunda kalır
   - Admin onayı gerekir

3. Admin endpoint'leri (APPROVAL):
   - /admin/ai/suggestions - Önerileri listele
   - /admin/ai/suggestions/{id}/review - Onayla/Reddet
   - /admin/ai/suggestions/{id}/apply - İçeriğe uygula
"""

from datetime import datetime, timedelta
from flask import request, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.modules.contents import contents_bp
from app.modules.contents.ai_service import ContentAIService, ContentAIFeature
from app.modules.contents.models_ai import (
    ContentAISuggestion, ContentAIInteraction,
    SuggestionStatus, SuggestionType
)
from app.modules.contents.schemas_ai import (
    ExplainContentRequestSchema,
    SimplifyContentRequestSchema,
    SuggestExamplesRequestSchema,
    ContentQuestionRequestSchema,
    SummarizeContentRequestSchema,
    CreateSuggestionRequestSchema,
    ReviewSuggestionRequestSchema,
    ApplySuggestionRequestSchema,
    ContentAIFeedbackSchema
)
from app.modules.contents.models import ContentCategory
from app.core.responses import success_response, created_response, error_response, paginated_response
from app.core.decorators import require_role, validate_json, handle_exceptions, rate_limit
from app.core.pagination import PaginationParams
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.extensions import db
from app.models.user import User


def get_current_user():
    """Mevcut kullanıcıyı al."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)


def log_ai_interaction(
    user_id: int,
    content_id: int,
    content_type: str,
    interaction_type: str,
    user_input: str = None,
    response_summary: str = None,
    tokens_used: int = 0,
    response_time_ms: int = 0
):
    """AI etkileşimini logla."""
    try:
        interaction = ContentAIInteraction(
            user_id=user_id,
            content_category=ContentCategory.VIDEO if content_type == 'video' else ContentCategory.DOCUMENT,
            content_id=content_id,
            interaction_type=interaction_type,
            user_input=user_input[:500] if user_input else None,
            response_summary=response_summary[:500] if response_summary else None,
            tokens_used=tokens_used,
            response_time_ms=response_time_ms,
            expires_at=datetime.utcnow() + timedelta(days=90)  # KVKK: 90 gün
        )
        db.session.add(interaction)
        db.session.commit()
    except Exception as e:
        # Log hatası kritik değil, devam et
        db.session.rollback()


# =============================================================================
# ÖĞRENCİ ENDPOINT'LERİ (READ-ONLY AI)
# =============================================================================

@contents_bp.route('/<content_type>/<int:content_id>/ai/explain', methods=['POST'])
@jwt_required()
@handle_exceptions
@rate_limit(limit=30, period=60)  # 30 istek/dakika
@validate_json(ExplainContentRequestSchema)
def ai_explain_content(content_type: str, content_id: int):
    """
    İçeriği AI ile açıkla.
    
    NOT: Bu işlem içeriği DEĞİŞTİRMEZ.
    Sadece öğrenciye anlık açıklama sağlar.
    
    ---
    tags:
      - Content AI
    security:
      - BearerAuth: []
    parameters:
      - name: content_type
        in: path
        required: true
        schema:
          type: string
          enum: [video, document]
      - name: content_id
        in: path
        required: true
        schema:
          type: integer
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              specific_part:
                type: string
                maxLength: 500
              level:
                type: string
                enum: [beginner, intermediate, advanced]
    responses:
      200:
        description: AI açıklaması
      404:
        description: İçerik bulunamadı
    """
    data = g.validated_data
    user = get_current_user()
    
    start_time = datetime.utcnow()
    
    result = ContentAIService.explain_content(
        user_id=user.id,
        content_id=content_id,
        content_type=content_type,
        specific_part=data.get('specific_part'),
        level=data.get('level', 'intermediate')
    )
    
    # Etkileşimi logla
    elapsed = (datetime.utcnow() - start_time).total_seconds() * 1000
    log_ai_interaction(
        user_id=user.id,
        content_id=content_id,
        content_type=content_type,
        interaction_type=ContentAIFeature.EXPLAIN_CONTENT,
        user_input=data.get('specific_part'),
        response_summary=result.get('explanation', '')[:200],
        response_time_ms=int(elapsed)
    )
    
    return success_response(data=result)


@contents_bp.route('/<content_type>/<int:content_id>/ai/simplify', methods=['POST'])
@jwt_required()
@handle_exceptions
@rate_limit(limit=20, period=60)
@validate_json(SimplifyContentRequestSchema)
def ai_simplify_content(content_type: str, content_id: int):
    """
    İçeriği basit dille açıkla.
    
    NOT: Orijinal içerik DEĞİŞMEZ.
    """
    data = g.validated_data
    user = get_current_user()
    
    result = ContentAIService.simplify_content(
        user_id=user.id,
        content_id=content_id,
        content_type=content_type,
        target_audience=data.get('target_audience', 'high_school')
    )
    
    log_ai_interaction(
        user_id=user.id,
        content_id=content_id,
        content_type=content_type,
        interaction_type=ContentAIFeature.SIMPLIFY_CONTENT
    )
    
    return success_response(data=result)


@contents_bp.route('/<content_type>/<int:content_id>/ai/examples', methods=['POST'])
@jwt_required()
@handle_exceptions
@rate_limit(limit=20, period=60)
@validate_json(SuggestExamplesRequestSchema)
def ai_suggest_examples(content_type: str, content_id: int):
    """
    İçerik için ek örnekler öner.
    
    NOT: Bu örnekler içeriğe EKLENMez.
    """
    data = g.validated_data
    user = get_current_user()
    
    result = ContentAIService.suggest_examples(
        user_id=user.id,
        content_id=content_id,
        content_type=content_type,
        example_count=data.get('example_count', 3)
    )
    
    log_ai_interaction(
        user_id=user.id,
        content_id=content_id,
        content_type=content_type,
        interaction_type=ContentAIFeature.SUGGEST_EXAMPLES
    )
    
    return success_response(data=result)


@contents_bp.route('/<content_type>/<int:content_id>/ai/ask', methods=['POST'])
@jwt_required()
@handle_exceptions
@rate_limit(limit=30, period=60)
@validate_json(ContentQuestionRequestSchema)
def ai_answer_question(content_type: str, content_id: int):
    """
    İçerik hakkında sorulan soruyu cevapla.
    
    NOT: Cevap kalıcı olarak saklanmaz.
    """
    data = g.validated_data
    user = get_current_user()
    
    result = ContentAIService.answer_content_question(
        user_id=user.id,
        content_id=content_id,
        content_type=content_type,
        question=data['question']
    )
    
    log_ai_interaction(
        user_id=user.id,
        content_id=content_id,
        content_type=content_type,
        interaction_type=ContentAIFeature.ANSWER_QUESTION,
        user_input=data['question'],
        response_summary=result.get('answer', '')[:200]
    )
    
    return success_response(data=result)


@contents_bp.route('/<content_type>/<int:content_id>/ai/summarize', methods=['POST'])
@jwt_required()
@handle_exceptions
@rate_limit(limit=20, period=60)
@validate_json(SummarizeContentRequestSchema)
def ai_summarize_content(content_type: str, content_id: int):
    """
    İçeriği özetle.
    
    NOT: Özet içeriğe eklenmez, sadece gösterilir.
    """
    data = g.validated_data
    user = get_current_user()
    
    result = ContentAIService.summarize_content(
        user_id=user.id,
        content_id=content_id,
        content_type=content_type,
        summary_length=data.get('summary_length', 'medium')
    )
    
    log_ai_interaction(
        user_id=user.id,
        content_id=content_id,
        content_type=content_type,
        interaction_type=ContentAIFeature.SUMMARIZE_CONTENT
    )
    
    return success_response(data=result)


@contents_bp.route('/<content_type>/<int:content_id>/ai/feedback', methods=['POST'])
@jwt_required()
@handle_exceptions
@validate_json(ContentAIFeedbackSchema)
def submit_ai_feedback(content_type: str, content_id: int):
    """AI yanıtı için feedback gönder."""
    data = g.validated_data
    user = get_current_user()
    
    # Son etkileşimi bul ve güncelle
    interaction = ContentAIInteraction.query.filter_by(
        user_id=user.id,
        content_id=content_id
    ).order_by(ContentAIInteraction.created_at.desc()).first()
    
    if interaction:
        interaction.was_helpful = data.get('was_helpful')
        interaction.feedback_rating = data.get('rating')
        db.session.commit()
    
    return success_response(message='Geri bildirim alındı')


# =============================================================================
# ÖĞRETMEN ENDPOINT'LERİ (SUGGESTION OLUŞTURMA)
# =============================================================================

@contents_bp.route('/ai/suggestions', methods=['POST'])
@jwt_required()
@handle_exceptions
@require_role(['teacher', 'admin'])
@rate_limit(limit=10, period=60)  # Öneriler için düşük limit
@validate_json(CreateSuggestionRequestSchema)
def create_ai_suggestion():
    """
    AI içerik iyileştirme önerisi oluştur.
    
    NOT: Bu öneri DOĞRUDAN İÇERİĞE UYGULANMAZ!
    Admin onayından sonra ayrı bir işlemle uygulanır.
    
    ---
    tags:
      - Content AI Admin
    security:
      - BearerAuth: []
    """
    data = g.validated_data
    user = get_current_user()
    
    suggestion = ContentAIService.create_enhancement_suggestion(
        user_id=user.id,
        content_id=data['content_id'],
        content_type=data['content_type'],
        enhancement_type=data['enhancement_type'],
        details=data.get('details')
    )
    
    return created_response(
        data=suggestion.to_dict(),
        message='Öneri oluşturuldu ve admin onayı bekliyor'
    )


@contents_bp.route('/ai/suggestions/my', methods=['GET'])
@jwt_required()
@handle_exceptions
@require_role(['teacher', 'admin'])
def list_my_suggestions():
    """Kullanıcının kendi AI önerilerini listele."""
    user = get_current_user()
    params = PaginationParams.from_request()
    status = request.args.get('status')
    
    query = ContentAISuggestion.query.filter_by(suggested_by_id=user.id)
    
    if status:
        try:
            status_enum = SuggestionStatus(status)
            query = query.filter_by(status=status_enum)
        except ValueError:
            pass
    
    query = query.order_by(ContentAISuggestion.created_at.desc())
    
    # Pagination
    total = query.count()
    items = query.offset((params.page - 1) * params.per_page).limit(params.per_page).all()
    
    return paginated_response(
        items=[s.to_dict() for s in items],
        page=params.page,
        per_page=params.per_page,
        total=total
    )


# =============================================================================
# ADMİN ENDPOINT'LERİ (ONAY YÖNETİMİ)
# =============================================================================

@contents_bp.route('/ai/suggestions/pending', methods=['GET'])
@jwt_required()
@handle_exceptions
@require_role(['admin'])
def list_pending_suggestions():
    """Onay bekleyen AI önerilerini listele."""
    params = PaginationParams.from_request()
    content_type = request.args.get('content_type')
    suggestion_type = request.args.get('suggestion_type')
    
    query = ContentAISuggestion.query.filter_by(status=SuggestionStatus.PENDING)
    
    if content_type:
        category = ContentCategory.VIDEO if content_type == 'video' else ContentCategory.DOCUMENT
        query = query.filter_by(content_category=category)
    
    if suggestion_type:
        try:
            stype = SuggestionType(suggestion_type)
            query = query.filter_by(suggestion_type=stype)
        except ValueError:
            pass
    
    query = query.order_by(ContentAISuggestion.created_at.asc())  # FIFO
    
    total = query.count()
    items = query.offset((params.page - 1) * params.per_page).limit(params.per_page).all()
    
    return paginated_response(
        items=[s.to_dict() for s in items],
        page=params.page,
        per_page=params.per_page,
        total=total
    )


@contents_bp.route('/ai/suggestions/<int:suggestion_id>', methods=['GET'])
@jwt_required()
@handle_exceptions
@require_role(['teacher', 'admin'])
def get_suggestion(suggestion_id: int):
    """AI öneri detayı."""
    user = get_current_user()
    
    suggestion = ContentAISuggestion.query.get(suggestion_id)
    if not suggestion:
        raise NotFoundError('Öneri bulunamadı')
    
    # Sadece kendi önerisi veya admin görebilir
    if suggestion.suggested_by_id != user.id and user.role != 'admin':
        raise ForbiddenError('Bu öneriyi görüntüleme yetkiniz yok')
    
    return success_response(data=suggestion.to_dict(include_content=True))


@contents_bp.route('/ai/suggestions/<int:suggestion_id>/review', methods=['POST'])
@jwt_required()
@handle_exceptions
@require_role(['admin'])
@validate_json(ReviewSuggestionRequestSchema)
def review_suggestion(suggestion_id: int):
    """
    AI önerisini incele (onayla/reddet).
    
    NOT: Onay, öneriyi otomatik olarak içeriğe UYGULAMAZ.
    Uygulama için ayrı bir endpoint kullanılır.
    """
    data = g.validated_data
    user = get_current_user()
    
    suggestion = ContentAISuggestion.query.get(suggestion_id)
    if not suggestion:
        raise NotFoundError('Öneri bulunamadı')
    
    if suggestion.status != SuggestionStatus.PENDING:
        raise ValidationError('Sadece bekleyen öneriler incelenebilir')
    
    action = data['action']
    
    if action == 'approve':
        suggestion.approve(
            reviewer_id=user.id,
            notes=data.get('notes')
        )
        message = 'Öneri onaylandı. İçeriğe uygulamak için /apply endpoint\'ini kullanın.'
    else:
        if not data.get('rejection_reason'):
            raise ValidationError('Red için neden belirtilmeli')
        suggestion.reject(
            reviewer_id=user.id,
            reason=data.get('rejection_reason'),
            notes=data.get('notes')
        )
        message = 'Öneri reddedildi'
    
    db.session.commit()
    
    return success_response(
        data=suggestion.to_dict(),
        message=message
    )


@contents_bp.route('/ai/suggestions/<int:suggestion_id>/apply', methods=['POST'])
@jwt_required()
@handle_exceptions
@require_role(['admin'])
@validate_json(ApplySuggestionRequestSchema)
def apply_suggestion(suggestion_id: int):
    """
    Onaylanmış AI önerisini içeriğe uygula.
    
    Bu işlem:
    1. Öneri içeriğini alır
    2. İlgili içeriğe ekler/günceller
    3. Yeni versiyon oluşturur (opsiyonel)
    4. Öneriyi 'applied' olarak işaretler
    """
    from app.modules.contents.services import VersionService
    from app.modules.contents.models import Video, Document, ContentCategory
    
    data = g.validated_data
    user = get_current_user()
    
    suggestion = ContentAISuggestion.query.get(suggestion_id)
    if not suggestion:
        raise NotFoundError('Öneri bulunamadı')
    
    if suggestion.status != SuggestionStatus.APPROVED:
        raise ValidationError('Sadece onaylanmış öneriler uygulanabilir')
    
    # İçeriği bul
    if suggestion.content_category == ContentCategory.VIDEO:
        content = Video.query.get(suggestion.content_id)
    else:
        content = Document.query.get(suggestion.content_id)
    
    if not content:
        raise NotFoundError('İçerik bulunamadı')
    
    # Öneri tipine göre uygula
    version_id = None
    
    if suggestion.suggestion_type == SuggestionType.EXAMPLES:
        # Örnekleri extra_data'ya ekle
        extra_data = content.extra_data or {}
        ai_examples = extra_data.get('ai_examples', [])
        ai_examples.append({
            'content': suggestion.suggested_content,
            'added_at': datetime.utcnow().isoformat(),
            'suggestion_id': suggestion.id
        })
        extra_data['ai_examples'] = ai_examples
        content.extra_data = extra_data
        
    elif suggestion.suggestion_type == SuggestionType.SUMMARY:
        # Özeti extra_data'ya ekle
        extra_data = content.extra_data or {}
        extra_data['ai_summary'] = {
            'content': suggestion.suggested_content,
            'added_at': datetime.utcnow().isoformat(),
            'suggestion_id': suggestion.id
        }
        content.extra_data = extra_data
        
    elif suggestion.suggestion_type == SuggestionType.QUIZ:
        # Quiz soruları ayrı tabloya eklenebilir (şimdilik extra_data)
        extra_data = content.extra_data or {}
        extra_data['ai_quiz'] = {
            'content': suggestion.suggested_content,
            'added_at': datetime.utcnow().isoformat(),
            'suggestion_id': suggestion.id
        }
        content.extra_data = extra_data
    
    # Versiyon oluştur
    if data.get('create_version', True):
        version = VersionService.create_version(
            content=content,
            content_category=suggestion.content_category,
            changed_by_id=user.id,
            change_summary=f'AI önerisi uygulandı: {suggestion.suggestion_type.value}'
        )
        version_id = version.id
    
    # Öneriyi 'applied' olarak işaretle
    suggestion.mark_applied(
        applied_by_id=user.id,
        version_id=version_id
    )
    
    db.session.commit()
    
    return success_response(
        data=suggestion.to_dict(),
        message='Öneri içeriğe başarıyla uygulandı'
    )


# =============================================================================
# ANALİZ ENDPOINT'LERİ (ADMİN)
# =============================================================================

@contents_bp.route('/ai/analytics', methods=['GET'])
@jwt_required()
@handle_exceptions
@require_role(['admin'])
def ai_content_analytics():
    """AI içerik etkileşim analizi."""
    from sqlalchemy import func
    
    days = request.args.get('days', 30, type=int)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Etkileşim istatistikleri
    interaction_stats = db.session.query(
        ContentAIInteraction.interaction_type,
        func.count(ContentAIInteraction.id).label('count'),
        func.avg(ContentAIInteraction.feedback_rating).label('avg_rating')
    ).filter(
        ContentAIInteraction.created_at >= start_date
    ).group_by(
        ContentAIInteraction.interaction_type
    ).all()
    
    # Öneri istatistikleri
    suggestion_stats = db.session.query(
        ContentAISuggestion.status,
        func.count(ContentAISuggestion.id).label('count')
    ).group_by(
        ContentAISuggestion.status
    ).all()
    
    # En çok AI yardımı istenen içerikler
    top_contents = db.session.query(
        ContentAIInteraction.content_category,
        ContentAIInteraction.content_id,
        func.count(ContentAIInteraction.id).label('interaction_count')
    ).filter(
        ContentAIInteraction.created_at >= start_date
    ).group_by(
        ContentAIInteraction.content_category,
        ContentAIInteraction.content_id
    ).order_by(
        func.count(ContentAIInteraction.id).desc()
    ).limit(10).all()
    
    return success_response(data={
        'period_days': days,
        'interaction_stats': [
            {
                'type': stat[0],
                'count': stat[1],
                'avg_rating': float(stat[2]) if stat[2] else None
            }
            for stat in interaction_stats
        ],
        'suggestion_stats': [
            {
                'status': stat[0].value if stat[0] else None,
                'count': stat[1]
            }
            for stat in suggestion_stats
        ],
        'top_contents': [
            {
                'content_category': content[0].value if content[0] else None,
                'content_id': content[1],
                'interaction_count': content[2]
            }
            for content in top_contents
        ]
    })
