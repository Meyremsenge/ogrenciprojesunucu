"""
Contents Module - Routes.

İçerik yönetimi endpoint'leri.
Admin onayı, versiyonlama ve soft delete destekli.
"""

from flask import request, g
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.modules.contents import contents_bp
from app.modules.contents.services import (
    VideoService, DocumentService, ProgressService,
    ApprovalService, VersionService
)
from app.modules.contents.schemas import (
    VideoSchema,
    VideoCreateSchema,
    VideoUpdateSchema,
    DocumentSchema,
    DocumentCreateSchema,
    DocumentUpdateSchema,
    ProgressUpdateSchema,
    ContentApprovalSchema,
    ContentRejectSchema,
    VersionCompareSchema
)
from app.modules.contents.models import ContentCategory, RejectionReason
from app.core.responses import success_response, created_response, no_content_response, paginated_response
from app.core.decorators import require_role, validate_json, handle_exceptions
from app.core.pagination import PaginationParams


# =============================================================================
# Video Routes
# =============================================================================

@contents_bp.route('/videos', methods=['GET'])
@jwt_required()
@handle_exceptions
def list_videos():
    """
    Video listesi.
    
    Query params:
        - topic_id: Topic filtresi
        - content_status: İçerik durumu (draft/pending_review/approved/published/archived)
        - include_drafts: Taslakları dahil et (sadece teacher/admin)
    """
    params = PaginationParams.from_request()
    topic_id = request.args.get('topic_id', type=int)
    content_status = request.args.get('content_status')
    include_drafts = request.args.get('include_drafts', 'false').lower() == 'true'
    
    result = VideoService.get_paginated(
        page=params.page,
        per_page=params.per_page,
        topic_id=topic_id,
        content_status=content_status,
        include_drafts=include_drafts
    )
    
    return paginated_response(
        items=[v.to_dict() for v in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@contents_bp.route('/videos/my', methods=['GET'])
@jwt_required()
@handle_exceptions
def list_my_videos():
    """Kullanıcının kendi videoları."""
    user_id = get_jwt_identity()
    params = PaginationParams.from_request()
    content_status = request.args.get('content_status')
    
    result = VideoService.get_my_videos(
        user_id=user_id,
        content_status=content_status,
        page=params.page,
        per_page=params.per_page
    )
    
    return paginated_response(
        items=[v.to_dict(include_approval=True) for v in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@contents_bp.route('/videos/<int:video_id>', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_video(video_id: int):
    """Video detayı."""
    user_id = get_jwt_identity()
    video = VideoService.get_or_404(video_id)
    
    # İzleme kaydı (sadece yayındaki videolar için)
    try:
        VideoService.record_view(video_id, user_id)
    except:
        pass  # Yayında değilse devam et
    
    return success_response(data={'video': video.to_dict(include_approval=True)})


@contents_bp.route('/topics/<int:topic_id>/videos', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(VideoCreateSchema)
def create_video(topic_id: int):
    """
    Yeni video ekle.
    
    İlk durumu DRAFT olarak oluşturulur.
    """
    user_id = get_jwt_identity()
    data = g.validated_data
    data['topic_id'] = topic_id
    data['uploaded_by'] = user_id
    
    video = VideoService.create(data)
    
    return created_response(
        data={'video': video.to_dict(include_approval=True)},
        message='Video başarıyla eklendi. Onay için göndermek için submit endpoint\'ini kullanın.'
    )


@contents_bp.route('/videos/<int:video_id>', methods=['PUT'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(VideoUpdateSchema)
def update_video(video_id: int):
    """
    Video güncelle.
    
    Otomatik olarak yeni versiyon oluşturulur.
    """
    user_id = get_jwt_identity()
    data = g.validated_data
    change_summary = data.pop('change_summary', None)
    
    video = VideoService.update(
        video_id=video_id,
        data=data,
        updated_by_id=user_id,
        change_summary=change_summary
    )
    
    return success_response(
        data={'video': video.to_dict(include_approval=True)},
        message='Video güncellendi'
    )


@contents_bp.route('/videos/<int:video_id>', methods=['DELETE'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def delete_video(video_id: int):
    """Video sil (soft delete)."""
    user_id = get_jwt_identity()
    VideoService.soft_delete(video_id, deleted_by_id=user_id)
    return no_content_response()


@contents_bp.route('/videos/<int:video_id>/restore', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def restore_video(video_id: int):
    """Silinmiş videoyu geri yükle."""
    user_id = get_jwt_identity()
    video = VideoService.restore(video_id, restored_by_id=user_id)
    
    return success_response(
        data={'video': video.to_dict()},
        message='Video geri yüklendi'
    )


# =============================================================================
# Video Approval Routes
# =============================================================================

@contents_bp.route('/videos/<int:video_id>/submit', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def submit_video_for_review(video_id: int):
    """Videoyu onaya gönder."""
    user_id = get_jwt_identity()
    approval = VideoService.submit_for_review(video_id, user_id)
    
    return success_response(
        data={'approval': approval.to_dict()},
        message='Video onaya gönderildi'
    )


@contents_bp.route('/videos/<int:video_id>/approve', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(ContentApprovalSchema)
def approve_video(video_id: int):
    """Videoyu onayla."""
    user_id = get_jwt_identity()
    data = g.validated_data
    
    approval = VideoService.approve(
        video_id=video_id,
        approved_by_id=user_id,
        notes=data.get('notes'),
        auto_publish=data.get('auto_publish', False)
    )
    
    return success_response(
        data={'approval': approval.to_dict()},
        message='Video onaylandı'
    )


@contents_bp.route('/videos/<int:video_id>/reject', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(ContentRejectSchema)
def reject_video(video_id: int):
    """Videoyu reddet."""
    user_id = get_jwt_identity()
    data = g.validated_data
    
    approval = VideoService.reject(
        video_id=video_id,
        rejected_by_id=user_id,
        reason=RejectionReason(data['reason']),
        details=data.get('details')
    )
    
    return success_response(
        data={'approval': approval.to_dict()},
        message='Video reddedildi'
    )


@contents_bp.route('/videos/<int:video_id>/publish', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def publish_video(video_id: int):
    """Onaylı videoyu yayınla."""
    user_id = get_jwt_identity()
    approval = VideoService.publish(video_id, user_id)
    
    return success_response(
        data={'approval': approval.to_dict()},
        message='Video yayınlandı'
    )


@contents_bp.route('/videos/<int:video_id>/archive', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def archive_video(video_id: int):
    """Videoyu arşivle."""
    user_id = get_jwt_identity()
    approval = VideoService.archive(video_id, user_id)
    
    return success_response(
        data={'approval': approval.to_dict()},
        message='Video arşivlendi'
    )


# =============================================================================
# Video Version Routes
# =============================================================================

@contents_bp.route('/videos/<int:video_id>/versions', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def list_video_versions(video_id: int):
    """Video versiyonları."""
    params = PaginationParams.from_request()
    
    result = VideoService.get_versions(
        video_id=video_id,
        page=params.page,
        per_page=params.per_page
    )
    
    return paginated_response(
        items=[v.to_dict() for v in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@contents_bp.route('/videos/<int:video_id>/versions/<int:version_id>/restore', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def restore_video_version(video_id: int, version_id: int):
    """Eski video versiyonunu geri yükle."""
    user_id = get_jwt_identity()
    version = VideoService.restore_version(video_id, version_id, user_id)
    
    return success_response(
        data={'version': version.to_dict()},
        message='Versiyon geri yüklendi'
    )


# =============================================================================
# Document Routes
# =============================================================================

@contents_bp.route('/documents', methods=['GET'])
@jwt_required()
@handle_exceptions
def list_documents():
    """
    Doküman listesi.
    
    Query params:
        - topic_id: Topic filtresi
        - content_status: İçerik durumu filtresi
        - include_drafts: Taslakları dahil et
    """
    params = PaginationParams.from_request()
    topic_id = request.args.get('topic_id', type=int)
    content_status = request.args.get('content_status')
    include_drafts = request.args.get('include_drafts', 'false').lower() == 'true'
    
    result = DocumentService.get_paginated(
        page=params.page,
        per_page=params.per_page,
        topic_id=topic_id,
        content_status=content_status,
        include_drafts=include_drafts
    )
    
    return paginated_response(
        items=[d.to_dict() for d in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@contents_bp.route('/documents/my', methods=['GET'])
@jwt_required()
@handle_exceptions
def list_my_documents():
    """Kullanıcının kendi dokümanları."""
    user_id = get_jwt_identity()
    params = PaginationParams.from_request()
    content_status = request.args.get('content_status')
    
    result = DocumentService.get_my_documents(
        user_id=user_id,
        content_status=content_status,
        page=params.page,
        per_page=params.per_page
    )
    
    return paginated_response(
        items=[d.to_dict(include_approval=True) for d in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@contents_bp.route('/documents/<int:document_id>', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_document(document_id: int):
    """Doküman detayı."""
    document = DocumentService.get_or_404(document_id)
    return success_response(data={'document': document.to_dict(include_approval=True)})


@contents_bp.route('/topics/<int:topic_id>/documents', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(DocumentCreateSchema)
def create_document(topic_id: int):
    """Yeni doküman ekle."""
    user_id = get_jwt_identity()
    data = g.validated_data
    data['topic_id'] = topic_id
    data['uploaded_by'] = user_id
    
    document = DocumentService.create(data)
    
    return created_response(
        data={'document': document.to_dict(include_approval=True)},
        message='Doküman başarıyla eklendi'
    )


@contents_bp.route('/documents/<int:document_id>', methods=['PUT'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
@validate_json(DocumentUpdateSchema)
def update_document(document_id: int):
    """Doküman güncelle."""
    user_id = get_jwt_identity()
    data = g.validated_data
    change_summary = data.pop('change_summary', None)
    
    document = DocumentService.update(
        document_id=document_id,
        data=data,
        updated_by_id=user_id,
        change_summary=change_summary
    )
    
    return success_response(
        data={'document': document.to_dict(include_approval=True)},
        message='Doküman güncellendi'
    )


@contents_bp.route('/documents/<int:document_id>', methods=['DELETE'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def delete_document(document_id: int):
    """Doküman sil (soft delete)."""
    user_id = get_jwt_identity()
    DocumentService.soft_delete(document_id, deleted_by_id=user_id)
    return no_content_response()


@contents_bp.route('/documents/<int:document_id>/restore', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def restore_document(document_id: int):
    """Silinmiş dokümanı geri yükle."""
    user_id = get_jwt_identity()
    document = DocumentService.restore(document_id, restored_by_id=user_id)
    
    return success_response(
        data={'document': document.to_dict()},
        message='Doküman geri yüklendi'
    )


@contents_bp.route('/documents/<int:document_id>/download', methods=['GET'])
@jwt_required()
@handle_exceptions
def download_document(document_id: int):
    """Doküman indirme linki al."""
    user_id = get_jwt_identity()
    download_url = DocumentService.get_download_url(document_id, user_id)
    
    return success_response(data={'download_url': download_url})


# =============================================================================
# Document Approval Routes
# =============================================================================

@contents_bp.route('/documents/<int:document_id>/submit', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def submit_document_for_review(document_id: int):
    """Dokümanı onaya gönder."""
    user_id = get_jwt_identity()
    approval = DocumentService.submit_for_review(document_id, user_id)
    
    return success_response(
        data={'approval': approval.to_dict()},
        message='Doküman onaya gönderildi'
    )


@contents_bp.route('/documents/<int:document_id>/approve', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(ContentApprovalSchema)
def approve_document(document_id: int):
    """Dokümanı onayla."""
    user_id = get_jwt_identity()
    data = g.validated_data
    
    approval = DocumentService.approve(
        document_id=document_id,
        approved_by_id=user_id,
        notes=data.get('notes'),
        auto_publish=data.get('auto_publish', False)
    )
    
    return success_response(
        data={'approval': approval.to_dict()},
        message='Doküman onaylandı'
    )


@contents_bp.route('/documents/<int:document_id>/reject', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(ContentRejectSchema)
def reject_document(document_id: int):
    """Dokümanı reddet."""
    user_id = get_jwt_identity()
    data = g.validated_data
    
    approval = DocumentService.reject(
        document_id=document_id,
        rejected_by_id=user_id,
        reason=RejectionReason(data['reason']),
        details=data.get('details')
    )
    
    return success_response(
        data={'approval': approval.to_dict()},
        message='Doküman reddedildi'
    )


@contents_bp.route('/documents/<int:document_id>/publish', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def publish_document(document_id: int):
    """Onaylı dokümanı yayınla."""
    user_id = get_jwt_identity()
    approval = DocumentService.publish(document_id, user_id)
    
    return success_response(
        data={'approval': approval.to_dict()},
        message='Doküman yayınlandı'
    )


@contents_bp.route('/documents/<int:document_id>/archive', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def archive_document(document_id: int):
    """Dokümanı arşivle."""
    user_id = get_jwt_identity()
    approval = DocumentService.archive(document_id, user_id)
    
    return success_response(
        data={'approval': approval.to_dict()},
        message='Doküman arşivlendi'
    )


# =============================================================================
# Document Version Routes
# =============================================================================

@contents_bp.route('/documents/<int:document_id>/versions', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def list_document_versions(document_id: int):
    """Doküman versiyonları."""
    params = PaginationParams.from_request()
    
    result = DocumentService.get_versions(
        document_id=document_id,
        page=params.page,
        per_page=params.per_page
    )
    
    return paginated_response(
        items=[v.to_dict() for v in result.items],
        page=result.page,
        per_page=result.per_page,
        total=result.total
    )


@contents_bp.route('/documents/<int:document_id>/versions/<int:version_id>/restore', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def restore_document_version(document_id: int, version_id: int):
    """Eski doküman versiyonunu geri yükle."""
    user_id = get_jwt_identity()
    version = DocumentService.restore_version(document_id, version_id, user_id)
    
    return success_response(
        data={'version': version.to_dict()},
        message='Versiyon geri yüklendi'
    )


# =============================================================================
# Admin Content Management Routes
# =============================================================================

@contents_bp.route('/admin/pending-reviews', methods=['GET'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
def get_pending_reviews():
    """Onay bekleyen tüm içerikler."""
    content_type = request.args.get('content_type')
    
    content_category = None
    if content_type == 'video':
        content_category = ContentCategory.VIDEO
    elif content_type == 'document':
        content_category = ContentCategory.DOCUMENT
    
    result = ApprovalService.get_pending_reviews(content_category)
    
    return success_response(data=result)


@contents_bp.route('/admin/versions/compare', methods=['POST'])
@jwt_required()
@require_role('admin', 'super_admin')
@handle_exceptions
@validate_json(VersionCompareSchema)
def compare_versions():
    """İki versiyon arasındaki farkları göster."""
    data = g.validated_data
    
    diff = VersionService.compare_versions(
        version_id_1=data['version_id_1'],
        version_id_2=data['version_id_2']
    )
    
    return success_response(data={'comparison': diff})


# =============================================================================
# YouTube Video Embed & Analytics Routes
# =============================================================================

@contents_bp.route('/videos/<int:video_id>/embed-url', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_video_embed_url(video_id: int):
    """
    Video için güvenli embed URL'si döner.
    
    Kullanıcının erişim yetkisi kontrol edilir ve
    imzalı URL oluşturulur.
    """
    from app.services.video_embed_service import VideoEmbedSecurity
    
    user_id = get_jwt_identity()
    
    # Erişim kontrolü
    has_access, error = VideoEmbedSecurity.check_user_video_access(user_id, video_id)
    if not has_access:
        from app.core.responses import error_response
        return error_response(error, status_code=403)
    
    video = VideoService.get_or_404(video_id)
    
    if not video.video_id:
        from app.core.responses import error_response
        return error_response('Video YouTube ID bulunamadı', status_code=400)
    
    # Parametreleri al
    autoplay = request.args.get('autoplay', 'false').lower() == 'true'
    start_time = request.args.get('start', 0, type=int)
    
    # Güvenli embed URL oluştur
    embed_url = VideoEmbedSecurity.generate_secure_youtube_embed_url(
        youtube_video_id=video.video_id,
        autoplay=autoplay,
        start_time=start_time
    )
    
    # Signed URL (opsiyonel - ekstra güvenlik için)
    signed_url = VideoEmbedSecurity.generate_signed_embed_url(
        youtube_video_id=video.video_id,
        video_id=video_id,
        user_id=user_id,
        autoplay=autoplay,
        start_time=start_time
    )
    
    return success_response(data={
        'embed_url': embed_url,
        'signed_url': signed_url,
        'youtube_video_id': video.video_id,
        'duration': video.duration,
        'duration_formatted': video.duration_formatted
    })


@contents_bp.route('/videos/<int:video_id>/watch/start', methods=['POST'])
@jwt_required()
@handle_exceptions
def start_video_watch(video_id: int):
    """
    Video izleme oturumu başlatır.
    
    Redis'te session oluşturur ve izlenme sayacını artırır.
    """
    from app.services.video_embed_service import VideoEmbedSecurity
    from app.services.video_analytics_service import VideoAnalyticsService
    
    user_id = get_jwt_identity()
    
    # Erişim kontrolü
    has_access, error = VideoEmbedSecurity.check_user_video_access(user_id, video_id)
    if not has_access:
        from app.core.responses import error_response
        return error_response(error, status_code=403)
    
    video = VideoService.get_or_404(video_id)
    
    # İzleme oturumu başlat
    session_id = VideoAnalyticsService.start_watch_session(
        video_id=video_id,
        user_id=user_id,
        youtube_video_id=video.video_id or ''
    )
    
    return success_response(data={
        'session_id': session_id,
        'video_id': video_id,
        'message': 'İzleme oturumu başlatıldı'
    })


@contents_bp.route('/videos/watch/<session_id>/update', methods=['POST'])
@jwt_required()
@handle_exceptions
def update_video_watch(session_id: str):
    """
    Video izleme oturumunu günceller.
    
    İzleme ilerlemesi ve olayları kaydeder.
    """
    from app.services.video_analytics_service import VideoAnalyticsService, WatchEventType
    
    data = request.get_json() or {}
    position = data.get('position', 0)
    event_type = data.get('event_type', 'progress')
    extra_data = data.get('extra_data')
    
    # Event type'ı enum'a çevir
    try:
        event = WatchEventType(event_type)
    except ValueError:
        event = WatchEventType.PROGRESS
    
    # Oturumu güncelle
    session_data = VideoAnalyticsService.update_watch_session(
        session_id=session_id,
        position=position,
        event_type=event,
        extra_data=extra_data
    )
    
    if not session_data:
        from app.core.responses import error_response
        return error_response('İzleme oturumu bulunamadı', status_code=404)
    
    return success_response(data={
        'session_id': session_id,
        'current_position': session_data.get('current_position'),
        'total_watched': session_data.get('total_watched'),
        'is_completed': session_data.get('is_completed')
    })


@contents_bp.route('/videos/watch/<session_id>/end', methods=['POST'])
@jwt_required()
@handle_exceptions
def end_video_watch(session_id: str):
    """
    Video izleme oturumunu sonlandırır.
    
    İlerlemeyi kaydeder ve oturumu temizler.
    """
    from app.services.video_analytics_service import VideoAnalyticsService
    
    session_data = VideoAnalyticsService.end_watch_session(session_id)
    
    if not session_data:
        from app.core.responses import error_response
        return error_response('İzleme oturumu bulunamadı', status_code=404)
    
    return success_response(data={
        'video_id': session_data.get('video_id'),
        'total_watched': session_data.get('total_watched'),
        'is_completed': session_data.get('is_completed'),
        'message': 'İzleme oturumu sonlandırıldı'
    })


@contents_bp.route('/videos/<int:video_id>/analytics', methods=['GET'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def get_video_analytics(video_id: int):
    """Video analytics verilerini döner."""
    from app.services.video_analytics_service import VideoAnalyticsService
    
    video = VideoService.get_or_404(video_id)
    analytics = VideoAnalyticsService.get_video_analytics(video_id)
    
    return success_response(data={
        'video_id': video_id,
        'title': video.title,
        'analytics': analytics
    })


@contents_bp.route('/videos/<int:video_id>/sync-metadata', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def sync_video_metadata(video_id: int):
    """YouTube'dan video metadata'sını senkronize eder."""
    from app.services.youtube_service import YouTubeService
    
    yt_service = YouTubeService()
    success, error = yt_service.sync_video_metadata(video_id)
    
    if not success:
        from app.core.responses import error_response
        return error_response(error, status_code=400)
    
    video = VideoService.get_or_404(video_id)
    
    return success_response(
        data={'video': video.to_dict()},
        message='Metadata senkronize edildi'
    )


@contents_bp.route('/videos/validate-youtube', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def validate_youtube_video():
    """
    YouTube video URL'sini doğrular.
    
    Video var mı, embed edilebilir mi kontrol eder
    ve metadata döner.
    """
    from app.services.youtube_service import YouTubeService, extract_video_id
    
    data = request.get_json() or {}
    url = data.get('url', '')
    
    if not url:
        from app.core.responses import error_response
        return error_response('URL gerekli', status_code=400)
    
    # Video ID çıkar
    video_id = extract_video_id(url)
    
    if not video_id:
        from app.core.responses import error_response
        return error_response('Geçersiz YouTube URL', status_code=400)
    
    yt_service = YouTubeService()
    
    # Embed edilebilirlik kontrolü
    embeddable, embed_error = yt_service.check_video_embeddable(video_id)
    
    if not embeddable:
        from app.core.responses import error_response
        return error_response(embed_error, status_code=400)
    
    # Video bilgilerini al
    video_info, error = yt_service.get_video_info(video_id)
    
    if error:
        from app.core.responses import error_response
        return error_response(error, status_code=400)
    
    return success_response(data={
        'valid': True,
        'video_id': video_id,
        'video_info': video_info
    })


@contents_bp.route('/topics/<int:topic_id>/import-playlist', methods=['POST'])
@jwt_required()
@require_role('teacher', 'admin', 'super_admin')
@handle_exceptions
def import_youtube_playlist(topic_id: int):
    """
    YouTube playlist'ini topic'e import eder.
    
    Playlist'teki tüm videolar için kayıt oluşturur.
    """
    from app.services.youtube_service import YouTubeService, extract_playlist_id
    
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    url = data.get('url', '')
    
    if not url:
        from app.core.responses import error_response
        return error_response('Playlist URL gerekli', status_code=400)
    
    # Playlist ID çıkar
    playlist_id = extract_playlist_id(url)
    
    if not playlist_id:
        from app.core.responses import error_response
        return error_response('Geçersiz YouTube playlist URL', status_code=400)
    
    yt_service = YouTubeService()
    
    videos, error = yt_service.import_playlist_as_topic(
        playlist_id=playlist_id,
        topic_id=topic_id,
        uploaded_by=user_id
    )
    
    if error:
        from app.core.responses import error_response
        return error_response(error, status_code=400)
    
    return created_response(
        data={
            'imported_count': len(videos),
            'videos': [v.to_dict() for v in videos]
        },
        message=f'{len(videos)} video başarıyla import edildi'
    )


@contents_bp.route('/my/watch-history', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_watch_history():
    """Kullanıcının izleme geçmişini döner."""
    from app.services.video_analytics_service import VideoAnalyticsService
    
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 20, type=int)
    
    history = VideoAnalyticsService.get_user_watch_history(user_id, limit)
    
    return success_response(data={'history': history})


@contents_bp.route('/popular-videos', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_popular_videos():
    """Popüler videoları döner."""
    from app.services.video_analytics_service import VideoAnalyticsService
    
    period = request.args.get('period', 'daily')
    limit = request.args.get('limit', 10, type=int)
    
    videos = VideoAnalyticsService.get_popular_videos(period, limit)
    
    return success_response(data={'videos': videos})


# =============================================================================
# Progress Routes
# =============================================================================

@contents_bp.route('/progress', methods=['GET'])
@jwt_required()
@handle_exceptions
def get_my_progress():
    """Kullanıcının ilerleme durumu."""
    user_id = get_jwt_identity()
    course_id = request.args.get('course_id', type=int)
    
    progress = ProgressService.get_user_progress(user_id, course_id)
    
    return success_response(data={'progress': progress})


@contents_bp.route('/videos/<int:video_id>/progress', methods=['PUT'])
@jwt_required()
@handle_exceptions
@validate_json(ProgressUpdateSchema)
def update_video_progress(video_id: int):
    """Video izleme ilerlemesini güncelle."""
    user_id = get_jwt_identity()
    data = g.validated_data
    
    progress = ProgressService.update_video_progress(
        user_id=user_id,
        video_id=video_id,
        position=data.get('position', 0),
        progress_percentage=data.get('progress_percentage', 0)
    )
    
    return success_response(
        data={'progress': progress.to_dict()},
        message='İlerleme kaydedildi'
    )


@contents_bp.route('/documents/<int:document_id>/complete', methods=['POST'])
@jwt_required()
@handle_exceptions
def complete_document(document_id: int):
    """Dokümanı tamamlandı olarak işaretle."""
    user_id = get_jwt_identity()
    
    progress = ProgressService.mark_document_completed(user_id, document_id)
    
    return success_response(
        data={'progress': progress.to_dict()},
        message='Doküman tamamlandı'
    )
