"""
Contents Module - Schemas.

İçerik serialization şemaları.
Admin onayı, versiyonlama destekli.
"""

from marshmallow import fields, validates, ValidationError, validate

from app.common.base_schema import BaseSchema, RequestSchema


# =============================================================================
# Video Schemas
# =============================================================================

class VideoSchema(BaseSchema):
    """Video response şeması."""
    
    id = fields.Integer(dump_only=True)
    title = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    order = fields.Integer(dump_only=True)
    provider = fields.String(dump_only=True)
    video_id = fields.String(dump_only=True)
    video_url = fields.String(dump_only=True)
    thumbnail_url = fields.String(dump_only=True)
    duration = fields.Integer(dump_only=True)
    duration_formatted = fields.String(dump_only=True)
    embed_url = fields.String(dump_only=True)
    status = fields.String(dump_only=True)
    content_status = fields.String(dump_only=True)
    topic_id = fields.Integer(dump_only=True)
    is_free_preview = fields.Boolean(dump_only=True)
    is_visible = fields.Boolean(dump_only=True)
    view_count = fields.Integer(dump_only=True)
    current_version = fields.Integer(dump_only=True)
    tags = fields.List(fields.String(), dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Approval bilgileri
    approved_at = fields.DateTime(dump_only=True)
    published_at = fields.DateTime(dump_only=True)


class VideoCreateSchema(RequestSchema):
    """Video oluşturma request şeması."""
    
    title = fields.String(
        required=True, 
        validate=validate.Length(min=3, max=255)
    )
    description = fields.String(required=False, allow_none=True)
    video_url = fields.URL(required=True)
    thumbnail_url = fields.URL(required=False, allow_none=True)
    duration = fields.Integer(required=False, load_default=0)
    provider = fields.String(required=False, load_default='youtube')
    is_free_preview = fields.Boolean(required=False, load_default=False)
    is_downloadable = fields.Boolean(required=False, load_default=False)
    order = fields.Integer(required=False, load_default=0)
    tags = fields.List(fields.String(), required=False, load_default=list)
    
    @validates('provider')
    def validate_provider(self, value):
        allowed = ['youtube', 'vimeo', 'local', 'bunny']
        if value and value not in allowed:
            raise ValidationError(f'Geçersiz sağlayıcı. İzin verilen: {", ".join(allowed)}')


class VideoUpdateSchema(RequestSchema):
    """Video güncelleme request şeması."""
    
    title = fields.String(
        required=False, 
        validate=validate.Length(min=3, max=255)
    )
    description = fields.String(required=False, allow_none=True)
    video_url = fields.URL(required=False)
    thumbnail_url = fields.URL(required=False, allow_none=True)
    duration = fields.Integer(required=False)
    is_free_preview = fields.Boolean(required=False)
    is_downloadable = fields.Boolean(required=False)
    order = fields.Integer(required=False)
    tags = fields.List(fields.String(), required=False)
    change_summary = fields.String(
        required=False, 
        validate=validate.Length(max=500),
        metadata={'description': 'Değişiklik özeti (versiyon için)'}
    )


# =============================================================================
# Document Schemas
# =============================================================================

class DocumentSchema(BaseSchema):
    """Doküman response şeması."""
    
    id = fields.Integer(dump_only=True)
    title = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    file_url = fields.String(dump_only=True)
    file_name = fields.String(dump_only=True)
    file_size = fields.Integer(dump_only=True)
    file_size_formatted = fields.String(dump_only=True)
    file_type = fields.String(dump_only=True)
    topic_id = fields.Integer(dump_only=True)
    is_downloadable = fields.Boolean(dump_only=True)
    content_status = fields.String(dump_only=True)
    is_visible = fields.Boolean(dump_only=True)
    download_count = fields.Integer(dump_only=True)
    current_version = fields.Integer(dump_only=True)
    tags = fields.List(fields.String(), dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Approval bilgileri
    approved_at = fields.DateTime(dump_only=True)
    published_at = fields.DateTime(dump_only=True)


class DocumentCreateSchema(RequestSchema):
    """Doküman oluşturma request şeması."""
    
    title = fields.String(
        required=True, 
        validate=validate.Length(min=3, max=255)
    )
    description = fields.String(required=False, allow_none=True)
    file_url = fields.URL(required=True)
    file_name = fields.String(required=True)
    file_size = fields.Integer(required=False, load_default=0)
    file_type = fields.String(required=False, load_default='pdf')
    mime_type = fields.String(required=False, allow_none=True)
    is_downloadable = fields.Boolean(required=False, load_default=True)
    order = fields.Integer(required=False, load_default=0)
    tags = fields.List(fields.String(), required=False, load_default=list)
    
    @validates('file_type')
    def validate_file_type(self, value):
        allowed = ['pdf', 'doc', 'slide', 'spreadsheet', 'other']
        if value and value not in allowed:
            raise ValidationError(f'Geçersiz dosya tipi. İzin verilen: {", ".join(allowed)}')


class DocumentUpdateSchema(RequestSchema):
    """Doküman güncelleme request şeması."""
    
    title = fields.String(
        required=False, 
        validate=validate.Length(min=3, max=255)
    )
    description = fields.String(required=False, allow_none=True)
    file_url = fields.URL(required=False)
    file_name = fields.String(required=False)
    file_size = fields.Integer(required=False)
    is_downloadable = fields.Boolean(required=False)
    order = fields.Integer(required=False)
    tags = fields.List(fields.String(), required=False)
    change_summary = fields.String(
        required=False, 
        validate=validate.Length(max=500),
        metadata={'description': 'Değişiklik özeti (versiyon için)'}
    )


# =============================================================================
# Progress Schemas
# =============================================================================

class ProgressSchema(BaseSchema):
    """İlerleme response şeması."""
    
    id = fields.Integer(dump_only=True)
    user_id = fields.Integer(dump_only=True)
    content_type = fields.String(dump_only=True)
    content_id = fields.Integer(dump_only=True)
    progress_percentage = fields.Float(dump_only=True)
    last_position = fields.Integer(dump_only=True)
    is_completed = fields.Boolean(dump_only=True)
    completed_at = fields.DateTime(dump_only=True)
    last_accessed_at = fields.DateTime(dump_only=True)


class ProgressUpdateSchema(RequestSchema):
    """İlerleme güncelleme request şeması."""
    
    position = fields.Integer(required=False, load_default=0)
    progress_percentage = fields.Float(required=False, load_default=0.0)
    
    @validates('progress_percentage')
    def validate_progress(self, value):
        if value < 0 or value > 100:
            raise ValidationError('İlerleme yüzdesi 0-100 arasında olmalı')


# =============================================================================
# Approval Schemas
# =============================================================================

class ContentApprovalSchema(RequestSchema):
    """İçerik onay request şeması."""
    
    notes = fields.String(
        required=False, 
        allow_none=True,
        validate=validate.Length(max=1000),
        metadata={'description': 'Onay notları'}
    )
    auto_publish = fields.Boolean(
        required=False, 
        load_default=False,
        metadata={'description': 'Onaydan sonra otomatik yayınla'}
    )


class ContentRejectSchema(RequestSchema):
    """İçerik ret request şeması."""
    
    reason = fields.String(
        required=True,
        validate=validate.OneOf([
            'inappropriate_content',
            'low_quality',
            'duplicate',
            'copyright_violation',
            'incomplete',
            'technical_issue',
            'other'
        ]),
        metadata={'description': 'Ret nedeni kategorisi'}
    )
    details = fields.String(
        required=False,
        allow_none=True,
        validate=validate.Length(max=2000),
        metadata={'description': 'Ret açıklaması'}
    )


class ContentApprovalResponseSchema(BaseSchema):
    """Onay işlemi response şeması."""
    
    id = fields.Integer(dump_only=True)
    content_category = fields.String(dump_only=True)
    content_id = fields.Integer(dump_only=True)
    previous_status = fields.String(dump_only=True)
    new_status = fields.String(dump_only=True)
    reviewed_by_name = fields.String(dump_only=True)
    reviewed_at = fields.DateTime(dump_only=True)
    rejection_reason = fields.String(dump_only=True)
    rejection_details = fields.String(dump_only=True)
    reviewer_notes = fields.String(dump_only=True)


# =============================================================================
# Version Schemas
# =============================================================================

class ContentVersionSchema(BaseSchema):
    """İçerik versiyon response şeması."""
    
    id = fields.Integer(dump_only=True)
    content_category = fields.String(dump_only=True)
    content_id = fields.Integer(dump_only=True)
    version_number = fields.Integer(dump_only=True)
    version_label = fields.String(dump_only=True)
    changed_by_name = fields.String(dump_only=True)
    change_summary = fields.String(dump_only=True)
    is_current = fields.Boolean(dump_only=True)
    is_published_version = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class VersionCompareSchema(RequestSchema):
    """Versiyon karşılaştırma request şeması."""
    
    version_id_1 = fields.Integer(
        required=True,
        metadata={'description': 'İlk versiyon ID'}
    )
    version_id_2 = fields.Integer(
        required=True,
        metadata={'description': 'İkinci versiyon ID'}
    )


class VersionDiffSchema(BaseSchema):
    """Versiyon farkları response şeması."""
    
    version_1 = fields.Dict(dump_only=True)
    version_2 = fields.Dict(dump_only=True)
    diff = fields.Dict(dump_only=True)
