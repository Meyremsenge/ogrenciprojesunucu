"""
Contents Module - İçerik yönetimi modülü.

Bu modül şunları içerir:
- Video içerikleri
- Doküman yönetimi
- İlerleme takibi
- Admin onay workflow'u
- Versiyonlama sistemi
- Soft delete
- AI destekli içerik yardımı
- Video AI danışman (soru-cevap, tekrar önerileri)
"""

from flask import Blueprint

contents_bp = Blueprint('contents', __name__)

from app.modules.contents import routes  # noqa: E402, F401
from app.modules.contents import routes_ai  # noqa: E402, F401 - AI routes
# Video AI blueprint ayrı yüklenir (circular import önleme)
from app.modules.contents.models import (
    Video, Document, ContentProgress,
    ContentVersion, ContentApproval,
    ContentStatus, ContentCategory,
    VideoStatus, VideoProvider,
    DocumentType, RejectionReason
)
from app.modules.contents.models_ai import (
    ContentAISuggestion, ContentAIInteraction,
    SuggestionStatus, SuggestionType
)

__all__ = [
    'contents_bp',
    # Models
    'Video',
    'Document', 
    'ContentProgress',
    'ContentVersion',
    'ContentApproval',
    # AI Models
    'ContentAISuggestion',
    'ContentAIInteraction',
    # Enums
    'ContentStatus',
    'ContentCategory',
    'VideoStatus',
    'VideoProvider',
    'DocumentType',
    'RejectionReason',
    'SuggestionStatus',
    'SuggestionType'
]
