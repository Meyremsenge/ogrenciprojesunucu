"""
Education Videos API Routes
YouTube tabanlı eğitim videoları CRUD işlemleri
"""

from flask import Blueprint, request, g
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps

from app.extensions import db
from app.core.responses import success_response, error_response, paginated_response
from app.core.decorators import super_admin_required
from app.core.exceptions import AuthorizationError
from app.models.education_video import (
    EducationVideo, VideoWatchHistory,
    GradeLevel, EducationLevel, Subject, VideoOwnerType,
    extract_youtube_id, GRADE_LABELS, EDUCATION_LEVEL_LABELS, SUBJECT_LABELS
)
from app.models.user import User

education_videos_bp = Blueprint('education_videos', __name__, url_prefix='/education-videos')


# Helper decorator for teacher+ roles
def teacher_or_admin_required(fn):
    """Öğretmen, Admin veya Super Admin rolü gerektirir."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        user_role = claims.get('role', '')
        if user_role not in ('teacher', 'admin', 'super_admin'):
            raise AuthorizationError(
                message='Bu işlem için öğretmen veya admin yetkisi gerekiyor.'
            )
        return fn(*args, **kwargs)
    return wrapper


# =============================================================================
# Constants Endpoints
# =============================================================================

@education_videos_bp.route('/constants', methods=['GET'])
@jwt_required()
def get_constants():
    """
    Video ekleme/düzenleme için sabit değerleri döner.
    """
    return success_response(data={
        'grade_levels': [
            {'value': g.value, 'label': GRADE_LABELS[g]}
            for g in GradeLevel
        ],
        'education_levels': [
            {'value': e.value, 'label': EDUCATION_LEVEL_LABELS[e]}
            for e in EducationLevel
        ],
        'subjects': [
            {'value': s.value, 'label': SUBJECT_LABELS[s]}
            for s in Subject
        ],
        'education_level_grades': {
            'primary': ['grade_1', 'grade_2', 'grade_3', 'grade_4'],
            'middle': ['grade_5', 'grade_6', 'grade_7', 'grade_8'],
            'high': ['grade_9', 'grade_10', 'grade_11', 'grade_12'],
            'graduate': ['graduate'],
        }
    })


# =============================================================================
# List & Filter Endpoints
# =============================================================================

@education_videos_bp.route('', methods=['GET'])
@jwt_required()
def list_videos():
    """
    Videoları listele (filtreleme destekli).
    
    Erişim kuralları:
    - Super Admin: Tüm videoları görür
    - Öğretmen/Öğrenci: Sistem videoları + kendi kurumunun öğretmen videoları
    
    Query params:
    - grade_level: Sınıf seviyesi
    - education_level: Eğitim kademesi (primary, middle, high, graduate)
    - subject: Ders
    - owner_type: system veya teacher
    - search: Başlık araması
    - page, per_page: Sayfalama
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    user_org_id = user.organization_id if user else None
    
    # Query başlat
    query = EducationVideo.query.filter(
        EducationVideo.is_deleted == False,
        EducationVideo.is_active == True
    )
    
    # Erişim kontrolü - Super Admin değilse kısıtla
    if user_role != 'super_admin':
        # Sistem videoları VEYA kendi kurumunun öğretmen videoları
        query = query.filter(
            db.or_(
                # Sistem videoları - herkes görebilir
                EducationVideo.owner_type == VideoOwnerType.SYSTEM,
                # Kendi kurumunun öğretmen videoları
                db.and_(
                    EducationVideo.owner_type == VideoOwnerType.TEACHER,
                    EducationVideo.organization_id == user_org_id
                )
            )
        )
    
    # Filtreler
    grade_level = request.args.get('grade_level')
    education_level = request.args.get('education_level')
    subject = request.args.get('subject')
    owner_type = request.args.get('owner_type')
    search = request.args.get('search')
    
    if grade_level:
        try:
            query = query.filter(EducationVideo.grade_level == GradeLevel(grade_level))
        except ValueError:
            pass
    
    if education_level:
        try:
            query = query.filter(EducationVideo.education_level == EducationLevel(education_level))
        except ValueError:
            pass
    
    if subject:
        try:
            query = query.filter(EducationVideo.subject == Subject(subject))
        except ValueError:
            pass
    
    if owner_type:
        try:
            query = query.filter(EducationVideo.owner_type == VideoOwnerType(owner_type))
        except ValueError:
            pass
    
    if search:
        search_term = f'%{search}%'
        query = query.filter(
            db.or_(
                EducationVideo.title.ilike(search_term),
                EducationVideo.description.ilike(search_term),
                EducationVideo.topic.ilike(search_term)
            )
        )
    
    # Sıralama
    query = query.order_by(
        EducationVideo.education_level,
        EducationVideo.grade_level,
        EducationVideo.subject,
        EducationVideo.sort_order,
        EducationVideo.created_at.desc()
    )
    
    # Sayfalama
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    videos = [v.to_dict(include_stats=True) for v in pagination.items]
    
    return paginated_response(
        items=videos,
        page=page,
        per_page=per_page,
        total=pagination.total,
        message='Videolar listelendi'
    )


@education_videos_bp.route('/by-grade/<grade_level>', methods=['GET'])
@jwt_required()
def list_videos_by_grade(grade_level):
    """
    Belirli bir sınıf seviyesindeki videoları listele.
    
    Erişim kuralları:
    - Super Admin: Tüm videoları görür
    - Öğretmen/Öğrenci: Sistem videoları + kendi kurumunun öğretmen videoları
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    user_org_id = user.organization_id if user else None
    
    try:
        grade = GradeLevel(grade_level)
    except ValueError:
        return error_response('Geçersiz sınıf seviyesi', status_code=400)
    
    query = EducationVideo.query.filter(
        EducationVideo.is_deleted == False,
        EducationVideo.is_active == True,
        EducationVideo.grade_level == grade
    )
    
    # Erişim kontrolü - Super Admin değilse kısıtla
    if user_role != 'super_admin':
        query = query.filter(
            db.or_(
                EducationVideo.owner_type == VideoOwnerType.SYSTEM,
                db.and_(
                    EducationVideo.owner_type == VideoOwnerType.TEACHER,
                    EducationVideo.organization_id == user_org_id
                )
            )
        )
    
    # Ders filtresi
    subject = request.args.get('subject')
    if subject:
        try:
            query = query.filter(EducationVideo.subject == Subject(subject))
        except ValueError:
            pass
    
    query = query.order_by(EducationVideo.subject, EducationVideo.sort_order)
    
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    videos = [v.to_dict(include_stats=True) for v in pagination.items]
    
    return paginated_response(
        items=videos,
        page=page,
        per_page=per_page,
        total=pagination.total,
        message=f'{GRADE_LABELS[grade]} videoları'
    )


@education_videos_bp.route('/by-education-level/<education_level>', methods=['GET'])
@jwt_required()
def list_videos_by_education_level(education_level):
    """
    Eğitim kademesine göre videoları listele (ilkokul, ortaokul, lise, mezun).
    
    Erişim kuralları:
    - Super Admin: Tüm videoları görür
    - Öğretmen/Öğrenci: Sistem videoları + kendi kurumunun öğretmen videoları
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    user_org_id = user.organization_id if user else None
    
    try:
        level = EducationLevel(education_level)
    except ValueError:
        return error_response('Geçersiz eğitim kademesi', status_code=400)
    
    query = EducationVideo.query.filter(
        EducationVideo.is_deleted == False,
        EducationVideo.is_active == True,
        EducationVideo.education_level == level
    )
    
    # Erişim kontrolü - Super Admin değilse kısıtla
    if user_role != 'super_admin':
        query = query.filter(
            db.or_(
                EducationVideo.owner_type == VideoOwnerType.SYSTEM,
                db.and_(
                    EducationVideo.owner_type == VideoOwnerType.TEACHER,
                    EducationVideo.organization_id == user_org_id
                )
            )
        )
    
    # Ders filtresi
    subject = request.args.get('subject')
    if subject:
        try:
            query = query.filter(EducationVideo.subject == Subject(subject))
        except ValueError:
            pass
    
    # Sınıf filtresi
    grade_level = request.args.get('grade_level')
    if grade_level:
        try:
            query = query.filter(EducationVideo.grade_level == GradeLevel(grade_level))
        except ValueError:
            pass
    
    query = query.order_by(
        EducationVideo.grade_level,
        EducationVideo.subject,
        EducationVideo.sort_order
    )
    
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    videos = [v.to_dict(include_stats=True) for v in pagination.items]
    
    return paginated_response(
        items=videos,
        page=page,
        per_page=per_page,
        total=pagination.total,
        message=f'{EDUCATION_LEVEL_LABELS[level]} videoları'
    )


# =============================================================================
# CRUD Endpoints
# =============================================================================

@education_videos_bp.route('/<int:video_id>', methods=['GET'])
@jwt_required()
def get_video(video_id):
    """
    Video detayı getir.
    
    Erişim kuralları:
    - Super Admin: Tüm videoları görebilir
    - Öğretmen/Öğrenci: Sistem videoları + kendi kurumunun öğretmen videoları
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    user_org_id = user.organization_id if user else None
    
    video = EducationVideo.query.filter(
        EducationVideo.id == video_id,
        EducationVideo.is_deleted == False
    ).first()
    
    if not video:
        return error_response('Video bulunamadı', status_code=404)
    
    # Erişim kontrolü
    if user_role != 'super_admin':
        # Öğretmen videosu ise ve kullanıcının kurumu eşleşmiyorsa erişim yok
        if video.owner_type == VideoOwnerType.TEACHER and video.organization_id != user_org_id:
            return error_response('Bu videoya erişim yetkiniz yok', status_code=403)
    
    # View count artır
    video.increment_view()
    db.session.commit()
    
    return success_response(data=video.to_dict(include_stats=True))


@education_videos_bp.route('', methods=['POST'])
@jwt_required()
def create_video():
    """
    Yeni video ekle.
    
    Super Admin: Sistem videosu ekler (owner_type=system)
    Öğretmen: Kendi videosu ekler (owner_type=teacher)
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return error_response('Kullanıcı bulunamadı', status_code=404)
    
    # Get role name (user.role is a Role object, not string)
    user_role = user.role.name if user.role else None
    
    # Yetki kontrolü
    if user_role not in ['super_admin', 'teacher']:
        return error_response('Bu işlem için yetkiniz yok', status_code=403)
    
    data = request.get_json() or {}
    
    # Zorunlu alanlar
    required_fields = ['youtube_url', 'title', 'grade_level', 'subject']
    for field in required_fields:
        if not data.get(field):
            return error_response(f'{field} alanı zorunludur', status_code=400)
    
    # YouTube URL doğrulama
    youtube_id = extract_youtube_id(data['youtube_url'])
    if not youtube_id:
        return error_response('Geçersiz YouTube URL', status_code=400)
    
    # Enum dönüşümleri
    try:
        grade_level = GradeLevel(data['grade_level'])
        subject = Subject(data['subject'])
    except ValueError as e:
        return error_response(f'Geçersiz değer: {str(e)}', status_code=400)
    
    # Owner type belirleme
    if user_role == 'super_admin':
        owner_type = VideoOwnerType.SYSTEM
        organization_id = None
    else:
        owner_type = VideoOwnerType.TEACHER
        organization_id = user.organization_id
    
    try:
        video = EducationVideo.create_from_youtube(
            youtube_url=data['youtube_url'],
            title=data['title'],
            grade_level=grade_level,
            subject=subject,
            created_by=current_user_id,
            owner_type=owner_type,
            description=data.get('description'),
            topic=data.get('topic'),
            organization_id=organization_id,
            duration_seconds=data.get('duration_seconds', 0),
            tags=data.get('tags', [])
        )
        
        db.session.add(video)
        db.session.commit()
        
        return success_response(
            data=video.to_dict(),
            message='Video başarıyla eklendi',
            status_code=201
        )
    
    except Exception as e:
        db.session.rollback()
        return error_response(f'Video eklenirken hata: {str(e)}', status_code=500)


@education_videos_bp.route('/<int:video_id>', methods=['PUT'])
@jwt_required()
def update_video(video_id):
    """
    Video güncelle.
    
    Yetki kuralları:
    - Super Admin: Sadece sistem videolarını düzenleyebilir
    - Öğretmen: Sadece kendi videolarını düzenleyebilir
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    video = EducationVideo.query.filter(
        EducationVideo.id == video_id,
        EducationVideo.is_deleted == False
    ).first()
    
    if not video:
        return error_response('Video bulunamadı', status_code=404)
    
    # Yetki kontrolü
    if not video.can_edit(current_user_id, user_role):
        return error_response('Bu videoyu düzenleme yetkiniz yok', status_code=403)
    
    data = request.get_json() or {}
    
    # Güncellenebilir alanlar
    if 'title' in data:
        video.title = data['title']
    if 'description' in data:
        video.description = data['description']
    if 'topic' in data:
        video.topic = data['topic']
    if 'tags' in data:
        video.tags = data['tags']
    if 'sort_order' in data:
        video.sort_order = data['sort_order']
    if 'is_active' in data:
        video.is_active = data['is_active']
    if 'duration_seconds' in data:
        video.duration_seconds = data['duration_seconds']
    
    # YouTube URL değiştirme
    if 'youtube_url' in data and data['youtube_url'] != video.youtube_url:
        youtube_id = extract_youtube_id(data['youtube_url'])
        if not youtube_id:
            return error_response('Geçersiz YouTube URL', status_code=400)
        video.youtube_url = data['youtube_url']
        video.youtube_id = youtube_id
        video.thumbnail_url = f'https://img.youtube.com/vi/{youtube_id}/maxresdefault.jpg'
    
    # Kategori değiştirme
    if 'grade_level' in data:
        try:
            from app.models.education_video import get_education_level
            video.grade_level = GradeLevel(data['grade_level'])
            video.education_level = get_education_level(video.grade_level)
        except ValueError:
            return error_response('Geçersiz sınıf seviyesi', status_code=400)
    
    if 'subject' in data:
        try:
            video.subject = Subject(data['subject'])
        except ValueError:
            return error_response('Geçersiz ders', status_code=400)
    
    try:
        db.session.commit()
        return success_response(data=video.to_dict(), message='Video güncellendi')
    except Exception as e:
        db.session.rollback()
        return error_response(f'Güncelleme hatası: {str(e)}', status_code=500)


@education_videos_bp.route('/<int:video_id>', methods=['DELETE'])
@jwt_required()
def delete_video(video_id):
    """
    Video sil (soft delete).
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    user_role = user.role.name if user and user.role else None
    
    video = EducationVideo.query.filter(
        EducationVideo.id == video_id,
        EducationVideo.is_deleted == False
    ).first()
    
    if not video:
        return error_response('Video bulunamadı', status_code=404)
    
    # Yetki kontrolü
    if not video.can_delete(current_user_id, user_role):
        return error_response('Bu videoyu silme yetkiniz yok', status_code=403)
    
    video.is_deleted = True
    video.is_active = False
    
    db.session.commit()
    
    return success_response(message='Video silindi')


# =============================================================================
# Watch Progress Endpoints
# =============================================================================

@education_videos_bp.route('/<int:video_id>/progress', methods=['POST'])
@jwt_required()
def update_watch_progress(video_id):
    """
    Video izleme ilerlemesini güncelle.
    """
    current_user_id = get_jwt_identity()
    
    video = EducationVideo.query.get(video_id)
    if not video:
        return error_response('Video bulunamadı', status_code=404)
    
    data = request.get_json() or {}
    watched_seconds = data.get('watched_seconds', 0)
    position = data.get('position', 0)
    
    # Mevcut kaydı bul veya oluştur
    history = VideoWatchHistory.query.filter_by(
        user_id=current_user_id,
        video_id=video_id
    ).first()
    
    if not history:
        history = VideoWatchHistory(
            user_id=current_user_id,
            video_id=video_id
        )
        db.session.add(history)
    
    history.update_progress(watched_seconds, position)
    db.session.commit()
    
    return success_response(
        data=history.to_dict(),
        message='İlerleme kaydedildi'
    )


@education_videos_bp.route('/my-progress', methods=['GET'])
@jwt_required()
def get_my_progress():
    """
    Kullanıcının video izleme geçmişini getir.
    """
    current_user_id = get_jwt_identity()
    
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    query = VideoWatchHistory.query.filter_by(user_id=current_user_id)\
        .order_by(VideoWatchHistory.last_watched_at.desc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    items = []
    for history in pagination.items:
        item = history.to_dict()
        if history.video:
            item['video'] = history.video.to_dict()
        items.append(item)
    
    return paginated_response(
        items=items,
        page=page,
        per_page=per_page,
        total=pagination.total
    )


# =============================================================================
# Statistics Endpoints
# =============================================================================

@education_videos_bp.route('/stats', methods=['GET'])
@jwt_required()
@super_admin_required
def get_video_stats():
    """
    Video istatistikleri (Super Admin / Admin).
    """
    # Toplam video sayıları
    total_videos = EducationVideo.query.filter(
        EducationVideo.is_deleted == False
    ).count()
    
    system_videos = EducationVideo.query.filter(
        EducationVideo.is_deleted == False,
        EducationVideo.owner_type == VideoOwnerType.SYSTEM
    ).count()
    
    teacher_videos = EducationVideo.query.filter(
        EducationVideo.is_deleted == False,
        EducationVideo.owner_type == VideoOwnerType.TEACHER
    ).count()
    
    # Eğitim kademesine göre dağılım
    by_education_level = {}
    for level in EducationLevel:
        count = EducationVideo.query.filter(
            EducationVideo.is_deleted == False,
            EducationVideo.education_level == level
        ).count()
        by_education_level[level.value] = {
            'label': EDUCATION_LEVEL_LABELS[level],
            'count': count
        }
    
    # Derse göre dağılım
    by_subject = {}
    for subj in Subject:
        count = EducationVideo.query.filter(
            EducationVideo.is_deleted == False,
            EducationVideo.subject == subj
        ).count()
        if count > 0:
            by_subject[subj.value] = {
                'label': SUBJECT_LABELS[subj],
                'count': count
            }
    
    return success_response(data={
        'total_videos': total_videos,
        'system_videos': system_videos,
        'teacher_videos': teacher_videos,
        'by_education_level': by_education_level,
        'by_subject': by_subject
    })
