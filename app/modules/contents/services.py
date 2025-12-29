"""
Contents Module - Services.

İçerik yönetimi iş mantığı.
Admin onayı, versiyonlama ve soft delete destekli.
"""

from typing import Dict, Any, List, Optional, Type, Union
from datetime import datetime
import json

from app.extensions import db
from app.common.base_service import BaseService
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.core.pagination import PaginationResult, paginate_query
from app.modules.contents.models import (
    Video, Document, ContentProgress, ContentType, VideoStatus,
    ContentStatus, ContentCategory, ContentVersion, ContentApproval,
    RejectionReason, VideoProvider
)


# =============================================================================
# Version Service - Tüm içerikler için versiyonlama
# =============================================================================

class VersionService:
    """
    İçerik versiyonlama servisi.
    
    Tüm içerik türleri için versiyonlama, karşılaştırma ve geri yükleme.
    """
    
    @classmethod
    def create_version(
        cls,
        content: Union[Video, Document],
        content_category: ContentCategory,
        changed_by_id: int,
        change_summary: str = None
    ) -> ContentVersion:
        """
        Yeni versiyon oluşturur.
        
        Args:
            content: Video veya Document modeli
            content_category: İçerik kategorisi
            changed_by_id: Değişikliği yapan kullanıcı
            change_summary: Değişiklik özeti
        """
        # Mevcut versiyonu bul ve is_current'ı kaldır
        current_version = ContentVersion.query.filter_by(
            content_category=content_category,
            content_id=content.id,
            is_current=True
        ).first()
        
        if current_version:
            current_version.is_current = False
        
        # Yeni versiyon numarası
        new_version_number = (content.current_version or 0) + 1
        
        # Snapshot al
        snapshot = content.get_snapshot()
        
        # Diff hesapla (önceki varsa)
        changes_diff = None
        if current_version:
            changes_diff = cls._calculate_diff(
                current_version.content_snapshot,
                snapshot
            )
        
        # Yeni versiyon oluştur
        version = ContentVersion(
            content_category=content_category,
            content_id=content.id,
            version_number=new_version_number,
            changed_by_id=changed_by_id,
            change_summary=change_summary,
            previous_version_id=current_version.id if current_version else None,
            content_snapshot=snapshot,
            changes_diff=changes_diff,
            is_current=True
        )
        
        db.session.add(version)
        
        # İçeriğin versiyon numarasını güncelle
        content.current_version = new_version_number
        
        return version
    
    @classmethod
    def get_versions(
        cls,
        content_category: ContentCategory,
        content_id: int,
        page: int = 1,
        per_page: int = 20
    ) -> PaginationResult:
        """İçeriğin tüm versiyonlarını döner."""
        query = ContentVersion.query.filter_by(
            content_category=content_category,
            content_id=content_id
        ).order_by(ContentVersion.version_number.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_version(cls, version_id: int) -> ContentVersion:
        """Belirli bir versiyonu döner."""
        version = ContentVersion.query.get(version_id)
        if not version:
            raise NotFoundError('Versiyon bulunamadı')
        return version
    
    @classmethod
    def compare_versions(
        cls,
        version_id_1: int,
        version_id_2: int
    ) -> Dict[str, Any]:
        """İki versiyon arasındaki farkları gösterir."""
        v1 = cls.get_version(version_id_1)
        v2 = cls.get_version(version_id_2)
        
        if v1.content_category != v2.content_category or v1.content_id != v2.content_id:
            raise ValidationError('Farklı içeriklerin versiyonları karşılaştırılamaz')
        
        return {
            'version_1': {
                'version_number': v1.version_number,
                'changed_by': v1.changed_by.full_name if v1.changed_by else None,
                'created_at': v1.created_at.isoformat()
            },
            'version_2': {
                'version_number': v2.version_number,
                'changed_by': v2.changed_by.full_name if v2.changed_by else None,
                'created_at': v2.created_at.isoformat()
            },
            'diff': cls._calculate_diff(v1.content_snapshot, v2.content_snapshot)
        }
    
    @classmethod
    def restore_version(
        cls,
        content: Union[Video, Document],
        content_category: ContentCategory,
        version_id: int,
        restored_by_id: int
    ) -> ContentVersion:
        """
        Eski versiyonu geri yükler.
        
        Yeni bir versiyon oluşturarak eski içeriği geri getirir.
        """
        old_version = cls.get_version(version_id)
        
        if old_version.content_id != content.id or old_version.content_category != content_category:
            raise ValidationError('Versiyon bu içeriğe ait değil')
        
        # Eski snapshot'tan değerleri geri yükle
        snapshot = old_version.content_snapshot
        
        for key, value in snapshot.items():
            if hasattr(content, key):
                # Enum değerlerini dönüştür
                if key == 'provider' and value:
                    setattr(content, key, VideoProvider(value))
                elif key == 'file_type' and value:
                    from app.modules.contents.models import DocumentType
                    setattr(content, key, DocumentType(value))
                else:
                    setattr(content, key, value)
        
        # Yeni versiyon oluştur
        new_version = cls.create_version(
            content=content,
            content_category=content_category,
            changed_by_id=restored_by_id,
            change_summary=f'v{old_version.version_number} versiyonundan geri yüklendi'
        )
        
        new_version.restored_from_version_id = old_version.id
        
        return new_version
    
    @classmethod
    def _calculate_diff(
        cls,
        old_snapshot: Dict[str, Any],
        new_snapshot: Dict[str, Any]
    ) -> Dict[str, Any]:
        """İki snapshot arasındaki farkları hesaplar."""
        diff = {
            'added': {},
            'removed': {},
            'changed': {}
        }
        
        all_keys = set(old_snapshot.keys()) | set(new_snapshot.keys())
        
        for key in all_keys:
            old_val = old_snapshot.get(key)
            new_val = new_snapshot.get(key)
            
            if key not in old_snapshot:
                diff['added'][key] = new_val
            elif key not in new_snapshot:
                diff['removed'][key] = old_val
            elif old_val != new_val:
                diff['changed'][key] = {
                    'old': old_val,
                    'new': new_val
                }
        
        return diff


# =============================================================================
# Approval Service - Admin onay workflow
# =============================================================================

class ApprovalService:
    """
    İçerik onay servisi.
    
    Admin onay workflow'u yönetimi.
    """
    
    @classmethod
    def submit_for_review(
        cls,
        content: Union[Video, Document],
        content_category: ContentCategory,
        submitted_by_id: int
    ) -> ContentApproval:
        """İçeriği onaya gönderir."""
        if content.content_status not in [ContentStatus.DRAFT, ContentStatus.REJECTED]:
            raise ValidationError('Bu içerik onaya gönderilemez')
        
        previous_status = content.content_status
        content.submit_for_review()
        
        approval = ContentApproval(
            content_category=content_category,
            content_id=content.id,
            previous_status=previous_status,
            new_status=ContentStatus.PENDING_REVIEW,
            reviewed_by_id=submitted_by_id,
            reviewer_notes='İçerik onay için gönderildi'
        )
        
        db.session.add(approval)
        db.session.commit()
        
        return approval
    
    @classmethod
    def approve_content(
        cls,
        content: Union[Video, Document],
        content_category: ContentCategory,
        approved_by_id: int,
        notes: str = None,
        auto_publish: bool = False
    ) -> ContentApproval:
        """İçeriği onaylar."""
        if content.content_status != ContentStatus.PENDING_REVIEW:
            raise ValidationError('Bu içerik onay bekleyen durumda değil')
        
        previous_status = content.content_status
        content.approve(approved_by_id)
        
        approval = ContentApproval(
            content_category=content_category,
            content_id=content.id,
            previous_status=previous_status,
            new_status=ContentStatus.APPROVED,
            reviewed_by_id=approved_by_id,
            reviewer_notes=notes
        )
        
        db.session.add(approval)
        
        # Otomatik yayınlama
        if auto_publish:
            content.publish()
            approval.new_status = ContentStatus.PUBLISHED
        
        db.session.commit()
        
        return approval
    
    @classmethod
    def reject_content(
        cls,
        content: Union[Video, Document],
        content_category: ContentCategory,
        rejected_by_id: int,
        reason: RejectionReason,
        details: str = None
    ) -> ContentApproval:
        """İçeriği reddeder."""
        if content.content_status != ContentStatus.PENDING_REVIEW:
            raise ValidationError('Bu içerik onay bekleyen durumda değil')
        
        previous_status = content.content_status
        content.reject()
        
        approval = ContentApproval(
            content_category=content_category,
            content_id=content.id,
            previous_status=previous_status,
            new_status=ContentStatus.REJECTED,
            reviewed_by_id=rejected_by_id,
            rejection_reason=reason,
            rejection_details=details
        )
        
        db.session.add(approval)
        db.session.commit()
        
        return approval
    
    @classmethod
    def publish_content(
        cls,
        content: Union[Video, Document],
        content_category: ContentCategory,
        published_by_id: int
    ) -> ContentApproval:
        """Onaylı içeriği yayınlar."""
        if content.content_status != ContentStatus.APPROVED:
            raise ValidationError('Sadece onaylı içerikler yayınlanabilir')
        
        previous_status = content.content_status
        content.publish()
        
        # Mevcut versiyonu published olarak işaretle
        current_version = ContentVersion.query.filter_by(
            content_category=content_category,
            content_id=content.id,
            is_current=True
        ).first()
        
        if current_version:
            current_version.is_published_version = True
        
        approval = ContentApproval(
            content_category=content_category,
            content_id=content.id,
            previous_status=previous_status,
            new_status=ContentStatus.PUBLISHED,
            reviewed_by_id=published_by_id,
            version_id=current_version.id if current_version else None
        )
        
        db.session.add(approval)
        db.session.commit()
        
        return approval
    
    @classmethod
    def archive_content(
        cls,
        content: Union[Video, Document],
        content_category: ContentCategory,
        archived_by_id: int
    ) -> ContentApproval:
        """İçeriği arşivler."""
        previous_status = content.content_status
        content.archive()
        
        approval = ContentApproval(
            content_category=content_category,
            content_id=content.id,
            previous_status=previous_status,
            new_status=ContentStatus.ARCHIVED,
            reviewed_by_id=archived_by_id
        )
        
        db.session.add(approval)
        db.session.commit()
        
        return approval
    
    @classmethod
    def get_pending_reviews(
        cls,
        content_category: ContentCategory = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """Onay bekleyen içerikleri döner."""
        results = {
            'videos': [],
            'documents': [],
            'total': 0
        }
        
        if content_category is None or content_category == ContentCategory.VIDEO:
            video_query = Video.query.filter_by(
                content_status=ContentStatus.PENDING_REVIEW,
                is_deleted=False
            )
            videos = video_query.all()
            results['videos'] = [v.to_dict(include_approval=True) for v in videos]
        
        if content_category is None or content_category == ContentCategory.DOCUMENT:
            doc_query = Document.query.filter_by(
                content_status=ContentStatus.PENDING_REVIEW,
                is_deleted=False
            )
            documents = doc_query.all()
            results['documents'] = [d.to_dict(include_approval=True) for d in documents]
        
        results['total'] = len(results['videos']) + len(results['documents'])
        
        return results
    
    @classmethod
    def get_approval_history(
        cls,
        content_category: ContentCategory,
        content_id: int
    ) -> List[ContentApproval]:
        """İçeriğin onay geçmişini döner."""
        return ContentApproval.query.filter_by(
            content_category=content_category,
            content_id=content_id
        ).order_by(ContentApproval.created_at.desc()).all()


class VideoService(BaseService[Video]):
    """Video servisi - Versiyonlama ve onay destekli."""
    
    model = Video
    
    @classmethod
    def query(cls, include_all_status: bool = False):
        """
        Video query'si.
        
        Args:
            include_all_status: True ise tüm durumları dahil eder
        """
        query = Video.query.filter_by(is_deleted=False)
        if not include_all_status:
            query = query.filter(Video.content_status == ContentStatus.PUBLISHED)
        return query
    
    @classmethod
    def get_paginated(
        cls,
        page: int = 1,
        per_page: int = 20,
        topic_id: int = None,
        status: str = None,
        content_status: str = None,
        uploaded_by: int = None,
        include_drafts: bool = False
    ) -> PaginationResult:
        """
        Filtrelenmiş video listesi.
        
        Args:
            page: Sayfa numarası
            per_page: Sayfa başına kayıt
            topic_id: Topic filtresi
            status: Teknik durum filtresi (processing/ready/error)
            content_status: İçerik durumu filtresi (draft/pending_review/etc.)
            uploaded_by: Yükleyen kullanıcı filtresi
            include_drafts: Taslakları dahil et
        """
        query = Video.query.filter_by(is_deleted=False)
        
        if topic_id:
            query = query.filter(Video.topic_id == topic_id)
        
        if status:
            query = query.filter(Video.status == VideoStatus(status))
        else:
            query = query.filter(Video.status == VideoStatus.READY)
        
        if content_status:
            query = query.filter(Video.content_status == ContentStatus(content_status))
        elif not include_drafts:
            query = query.filter(Video.content_status == ContentStatus.PUBLISHED)
        
        if uploaded_by:
            query = query.filter(Video.uploaded_by == uploaded_by)
        
        query = query.order_by(Video.order.asc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_my_videos(
        cls,
        user_id: int,
        content_status: str = None,
        page: int = 1,
        per_page: int = 20
    ) -> PaginationResult:
        """Kullanıcının kendi videolarını döner."""
        query = Video.query.filter_by(
            uploaded_by=user_id,
            is_deleted=False
        )
        
        if content_status:
            query = query.filter(Video.content_status == ContentStatus(content_status))
        
        query = query.order_by(Video.created_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def create(
        cls,
        data: Dict[str, Any],
        create_version: bool = True
    ) -> Video:
        """
        Yeni video oluşturur.
        
        Args:
            data: Video verileri
            create_version: Versiyon oluştur (varsayılan True)
        """
        # YouTube ID'sini URL'den çıkar
        if 'video_url' in data and 'video_id' not in data:
            data['video_id'] = cls._extract_youtube_id(data['video_url'])
        
        # İlk durumu DRAFT olarak ayarla
        data.setdefault('content_status', ContentStatus.DRAFT)
        
        video = Video(**data)
        db.session.add(video)
        db.session.flush()  # ID almak için
        
        # İlk versiyon oluştur
        if create_version and video.id:
            VersionService.create_version(
                content=video,
                content_category=ContentCategory.VIDEO,
                changed_by_id=data.get('uploaded_by'),
                change_summary='İlk versiyon oluşturuldu'
            )
        
        # Topic'in course'unun toplam süresini güncelle
        cls._update_course_duration(data.get('topic_id'))
        
        db.session.commit()
        return video
    
    @classmethod
    def update(
        cls,
        video_id: int,
        data: Dict[str, Any],
        updated_by_id: int,
        change_summary: str = None
    ) -> Video:
        """
        Video günceller ve yeni versiyon oluşturur.
        
        Args:
            video_id: Video ID
            data: Güncellenecek veriler
            updated_by_id: Güncelleyen kullanıcı ID
            change_summary: Değişiklik özeti
        """
        video = cls.get_or_404(video_id)
        
        # Yetki kontrolü
        if not video.can_edit(updated_by_id, is_admin=False):
            raise ForbiddenError('Bu videoyu düzenleme yetkiniz yok')
        
        # Güncelle
        for key, value in data.items():
            if hasattr(video, key) and key not in ['id', 'created_at', 'uploaded_by']:
                setattr(video, key, value)
        
        # Yeni versiyon oluştur
        VersionService.create_version(
            content=video,
            content_category=ContentCategory.VIDEO,
            changed_by_id=updated_by_id,
            change_summary=change_summary or 'İçerik güncellendi'
        )
        
        video.updated_at = datetime.utcnow()
        db.session.commit()
        
        return video
    
    @classmethod
    def _extract_youtube_id(cls, url: str) -> Optional[str]:
        """YouTube URL'sinden video ID çıkarır."""
        import re
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
            r'youtube\.com\/watch\?.*v=([^&\n?#]+)'
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    @classmethod
    def _update_course_duration(cls, topic_id: int):
        """Kursun toplam süresini günceller."""
        if not topic_id:
            return
        
        from app.modules.courses.models import Topic
        topic = Topic.query.get(topic_id)
        if topic and topic.course:
            total = db.session.query(db.func.sum(Video.duration)).filter(
                Video.topic_id.in_([t.id for t in topic.course.topics]),
                Video.is_deleted == False,
                Video.content_status == ContentStatus.PUBLISHED
            ).scalar() or 0
            
            topic.course.total_duration = total // 60  # Dakikaya çevir
    
    @classmethod
    def record_view(cls, video_id: int, user_id: int):
        """Video görüntüleme kaydı."""
        video = cls.get_or_404(video_id)
        
        # Sadece yayındaki videolar izlenebilir
        if video.content_status != ContentStatus.PUBLISHED:
            raise ForbiddenError('Bu video henüz yayında değil')
        
        video.view_count += 1
        
        # İlerleme kaydı oluştur/güncelle
        progress = ContentProgress.query.filter_by(
            user_id=user_id,
            content_type=ContentType.VIDEO,
            content_id=video_id
        ).first()
        
        if progress:
            progress.update_access()
        else:
            progress = ContentProgress(
                user_id=user_id,
                content_type=ContentType.VIDEO,
                content_id=video_id
            )
            db.session.add(progress)
        
        db.session.commit()
    
    @classmethod
    def soft_delete(cls, video_id: int, deleted_by_id: int = None):
        """Videoyu soft delete yapar."""
        video = cls.get_or_404(video_id)
        video.soft_delete(deleted_by=deleted_by_id)
        
        cls._update_course_duration(video.topic_id)
        db.session.commit()
    
    @classmethod
    def restore(cls, video_id: int, restored_by_id: int) -> Video:
        """Silinmiş videoyu geri yükler."""
        video = Video.query.get(video_id)
        if not video:
            raise NotFoundError('Video bulunamadı')
        
        if not video.is_deleted:
            raise ValidationError('Bu video silinmemiş')
        
        video.is_deleted = False
        video.deleted_at = None
        video.deleted_by_id = None
        video.content_status = ContentStatus.DRAFT  # Geri yüklenince taslak olur
        
        db.session.commit()
        return video
    
    # Approval workflow delegations
    @classmethod
    def submit_for_review(cls, video_id: int, user_id: int) -> 'ContentApproval':
        """Videoyu onaya gönderir."""
        video = cls.get_or_404(video_id)
        return ApprovalService.submit_for_review(video, ContentCategory.VIDEO, user_id)
    
    @classmethod
    def approve(cls, video_id: int, approved_by_id: int, notes: str = None, auto_publish: bool = False) -> 'ContentApproval':
        """Videoyu onaylar."""
        video = cls.get_or_404(video_id)
        return ApprovalService.approve_content(video, ContentCategory.VIDEO, approved_by_id, notes, auto_publish)
    
    @classmethod
    def reject(cls, video_id: int, rejected_by_id: int, reason: RejectionReason, details: str = None) -> 'ContentApproval':
        """Videoyu reddeder."""
        video = cls.get_or_404(video_id)
        return ApprovalService.reject_content(video, ContentCategory.VIDEO, rejected_by_id, reason, details)
    
    @classmethod
    def publish(cls, video_id: int, published_by_id: int) -> 'ContentApproval':
        """Onaylı videoyu yayınlar."""
        video = cls.get_or_404(video_id)
        return ApprovalService.publish_content(video, ContentCategory.VIDEO, published_by_id)
    
    @classmethod
    def archive(cls, video_id: int, archived_by_id: int) -> 'ContentApproval':
        """Videoyu arşivler."""
        video = cls.get_or_404(video_id)
        return ApprovalService.archive_content(video, ContentCategory.VIDEO, archived_by_id)
    
    # Version workflow delegations
    @classmethod
    def get_versions(cls, video_id: int, page: int = 1, per_page: int = 20) -> PaginationResult:
        """Video versiyonlarını döner."""
        return VersionService.get_versions(ContentCategory.VIDEO, video_id, page, per_page)
    
    @classmethod
    def restore_version(cls, video_id: int, version_id: int, restored_by_id: int) -> ContentVersion:
        """Eski versiyonu geri yükler."""
        video = cls.get_or_404(video_id)
        return VersionService.restore_version(video, ContentCategory.VIDEO, version_id, restored_by_id)


class DocumentService(BaseService[Document]):
    """Doküman servisi - Versiyonlama ve onay destekli."""
    
    model = Document
    
    @classmethod
    def query(cls, include_all_status: bool = False):
        """Doküman query'si."""
        query = Document.query.filter_by(is_deleted=False)
        if not include_all_status:
            query = query.filter(Document.content_status == ContentStatus.PUBLISHED)
        return query
    
    @classmethod
    def get_paginated(
        cls,
        page: int = 1,
        per_page: int = 20,
        topic_id: int = None,
        content_status: str = None,
        uploaded_by: int = None,
        include_drafts: bool = False
    ) -> PaginationResult:
        """Filtrelenmiş doküman listesi."""
        query = Document.query.filter_by(is_deleted=False)
        
        if topic_id:
            query = query.filter(Document.topic_id == topic_id)
        
        if content_status:
            query = query.filter(Document.content_status == ContentStatus(content_status))
        elif not include_drafts:
            query = query.filter(Document.content_status == ContentStatus.PUBLISHED)
        
        if uploaded_by:
            query = query.filter(Document.uploaded_by == uploaded_by)
        
        query = query.order_by(Document.order.asc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def get_my_documents(
        cls,
        user_id: int,
        content_status: str = None,
        page: int = 1,
        per_page: int = 20
    ) -> PaginationResult:
        """Kullanıcının kendi dokümanlarını döner."""
        query = Document.query.filter_by(
            uploaded_by=user_id,
            is_deleted=False
        )
        
        if content_status:
            query = query.filter(Document.content_status == ContentStatus(content_status))
        
        query = query.order_by(Document.created_at.desc())
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def create(
        cls,
        data: Dict[str, Any],
        create_version: bool = True
    ) -> Document:
        """Yeni doküman oluşturur."""
        data.setdefault('content_status', ContentStatus.DRAFT)
        
        document = Document(**data)
        db.session.add(document)
        db.session.flush()
        
        if create_version and document.id:
            VersionService.create_version(
                content=document,
                content_category=ContentCategory.DOCUMENT,
                changed_by_id=data.get('uploaded_by'),
                change_summary='İlk versiyon oluşturuldu'
            )
        
        db.session.commit()
        return document
    
    @classmethod
    def update(
        cls,
        document_id: int,
        data: Dict[str, Any],
        updated_by_id: int,
        change_summary: str = None
    ) -> Document:
        """Doküman günceller ve yeni versiyon oluşturur."""
        document = cls.get_or_404(document_id)
        
        if not document.can_edit(updated_by_id, is_admin=False):
            raise ForbiddenError('Bu dokümanı düzenleme yetkiniz yok')
        
        for key, value in data.items():
            if hasattr(document, key) and key not in ['id', 'created_at', 'uploaded_by']:
                setattr(document, key, value)
        
        VersionService.create_version(
            content=document,
            content_category=ContentCategory.DOCUMENT,
            changed_by_id=updated_by_id,
            change_summary=change_summary or 'İçerik güncellendi'
        )
        
        document.updated_at = datetime.utcnow()
        db.session.commit()
        
        return document
    
    @classmethod
    def get_download_url(cls, document_id: int, user_id: int) -> str:
        """İndirme URL'si döner ve kaydeder."""
        document = cls.get_or_404(document_id)
        
        # Sadece yayındaki dokümanlar indirilebilir
        if document.content_status != ContentStatus.PUBLISHED:
            raise ForbiddenError('Bu doküman henüz yayında değil')
        
        if not document.is_downloadable:
            raise ValidationError('Bu doküman indirilemez')
        
        document.download_count += 1
        
        progress = ContentProgress.query.filter_by(
            user_id=user_id,
            content_type=ContentType.DOCUMENT,
            content_id=document_id
        ).first()
        
        if progress:
            progress.update_access()
        else:
            progress = ContentProgress(
                user_id=user_id,
                content_type=ContentType.DOCUMENT,
                content_id=document_id
            )
            db.session.add(progress)
        
        db.session.commit()
        
        return document.file_url
    
    @classmethod
    def soft_delete(cls, document_id: int, deleted_by_id: int = None):
        """Dokümanı soft delete yapar."""
        document = cls.get_or_404(document_id)
        document.soft_delete(deleted_by=deleted_by_id)
        db.session.commit()
    
    @classmethod
    def restore(cls, document_id: int, restored_by_id: int) -> Document:
        """Silinmiş dokümanı geri yükler."""
        document = Document.query.get(document_id)
        if not document:
            raise NotFoundError('Doküman bulunamadı')
        
        if not document.is_deleted:
            raise ValidationError('Bu doküman silinmemiş')
        
        document.is_deleted = False
        document.deleted_at = None
        document.deleted_by_id = None
        document.content_status = ContentStatus.DRAFT
        
        db.session.commit()
        return document
    
    # Approval workflow delegations
    @classmethod
    def submit_for_review(cls, document_id: int, user_id: int) -> 'ContentApproval':
        document = cls.get_or_404(document_id)
        return ApprovalService.submit_for_review(document, ContentCategory.DOCUMENT, user_id)
    
    @classmethod
    def approve(cls, document_id: int, approved_by_id: int, notes: str = None, auto_publish: bool = False) -> 'ContentApproval':
        document = cls.get_or_404(document_id)
        return ApprovalService.approve_content(document, ContentCategory.DOCUMENT, approved_by_id, notes, auto_publish)
    
    @classmethod
    def reject(cls, document_id: int, rejected_by_id: int, reason: RejectionReason, details: str = None) -> 'ContentApproval':
        document = cls.get_or_404(document_id)
        return ApprovalService.reject_content(document, ContentCategory.DOCUMENT, rejected_by_id, reason, details)
    
    @classmethod
    def publish(cls, document_id: int, published_by_id: int) -> 'ContentApproval':
        document = cls.get_or_404(document_id)
        return ApprovalService.publish_content(document, ContentCategory.DOCUMENT, published_by_id)
    
    @classmethod
    def archive(cls, document_id: int, archived_by_id: int) -> 'ContentApproval':
        document = cls.get_or_404(document_id)
        return ApprovalService.archive_content(document, ContentCategory.DOCUMENT, archived_by_id)
    
    # Version workflow delegations
    @classmethod
    def get_versions(cls, document_id: int, page: int = 1, per_page: int = 20) -> PaginationResult:
        return VersionService.get_versions(ContentCategory.DOCUMENT, document_id, page, per_page)
    
    @classmethod
    def restore_version(cls, document_id: int, version_id: int, restored_by_id: int) -> ContentVersion:
        document = cls.get_or_404(document_id)
        return VersionService.restore_version(document, ContentCategory.DOCUMENT, version_id, restored_by_id)


class ProgressService(BaseService[ContentProgress]):
    """İlerleme servisi."""
    
    model = ContentProgress
    
    @classmethod
    def get_user_progress(cls, user_id: int, course_id: int = None) -> Dict[str, Any]:
        """Kullanıcının ilerleme özetini döner."""
        query = ContentProgress.query.filter_by(user_id=user_id)
        
        progress_list = query.all()
        
        completed = sum(1 for p in progress_list if p.is_completed)
        total = len(progress_list)
        
        return {
            'total_contents': total,
            'completed_contents': completed,
            'completion_percentage': (completed / total * 100) if total > 0 else 0,
            'progress_items': [p.to_dict() for p in progress_list]
        }
    
    @classmethod
    def update_video_progress(
        cls,
        user_id: int,
        video_id: int,
        position: int,
        progress_percentage: float
    ) -> ContentProgress:
        """Video izleme ilerlemesini günceller."""
        progress = ContentProgress.query.filter_by(
            user_id=user_id,
            content_type=ContentType.VIDEO,
            content_id=video_id
        ).first()
        
        if not progress:
            progress = ContentProgress(
                user_id=user_id,
                content_type=ContentType.VIDEO,
                content_id=video_id
            )
            db.session.add(progress)
        
        progress.last_position = position
        progress.progress_percentage = min(100.0, max(0.0, progress_percentage))
        progress.update_access()
        
        # %95+ ise tamamlandı say
        if progress.progress_percentage >= 95:
            progress.mark_completed()
        
        db.session.commit()
        
        # Kurs ilerlemesini güncelle
        cls._update_enrollment_progress(user_id, video_id)
        
        return progress
    
    @classmethod
    def mark_document_completed(cls, user_id: int, document_id: int) -> ContentProgress:
        """Dokümanı tamamlandı olarak işaretler."""
        progress = ContentProgress.query.filter_by(
            user_id=user_id,
            content_type=ContentType.DOCUMENT,
            content_id=document_id
        ).first()
        
        if not progress:
            progress = ContentProgress(
                user_id=user_id,
                content_type=ContentType.DOCUMENT,
                content_id=document_id
            )
            db.session.add(progress)
        
        progress.mark_completed()
        db.session.commit()
        
        return progress
    
    @classmethod
    def _update_enrollment_progress(cls, user_id: int, video_id: int):
        """Kullanıcının kurs kaydı ilerlemesini günceller."""
        from app.modules.courses.models import Enrollment
        from app.modules.contents.models import Video
        
        video = Video.query.get(video_id)
        if not video or not video.topic:
            return
        
        course = video.topic.course
        if not course:
            return
        
        enrollment = Enrollment.query.filter_by(
            user_id=user_id,
            course_id=course.id
        ).first()
        
        if not enrollment:
            return
        
        # Kurstaki tüm videoları say
        all_video_ids = []
        for topic in course.topics:
            all_video_ids.extend([v.id for v in topic.videos if not v.is_deleted])
        
        if not all_video_ids:
            return
        
        # Tamamlanan videoları say
        completed_count = ContentProgress.query.filter(
            ContentProgress.user_id == user_id,
            ContentProgress.content_type == ContentType.VIDEO,
            ContentProgress.content_id.in_(all_video_ids),
            ContentProgress.is_completed == True
        ).count()
        
        enrollment.completed_lessons = completed_count
        enrollment.progress_percentage = (completed_count / len(all_video_ids)) * 100
        enrollment.last_accessed_at = datetime.utcnow()
        
        if enrollment.progress_percentage >= 100:
            enrollment.complete()
        
        db.session.commit()
