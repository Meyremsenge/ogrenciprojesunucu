"""
Base Schema - Tüm Marshmallow şemaları için temel sınıf.

Ortak yapılandırma ve metodlar burada tanımlanır.
"""

from typing import Any, Dict, List
from datetime import datetime

from marshmallow import Schema, fields, EXCLUDE, post_load, pre_load, validates_schema
from marshmallow import ValidationError as MarshmallowValidationError


class BaseSchema(Schema):
    """
    Tüm şemalar için base class.
    
    Özellikler:
        - Bilinmeyen alanları yoksay
        - Otomatik timestamp formatı
        - Ortak alanlar
    """
    
    class Meta:
        # Bilinmeyen alanları yoksay
        unknown = EXCLUDE
        # Datetime formatı
        dateformat = '%Y-%m-%dT%H:%M:%SZ'
        # Sıralama
        ordered = True
    
    # Ortak read-only alanlar
    id = fields.Integer(dump_only=True)
    created_at = fields.DateTime(dump_only=True, format='%Y-%m-%dT%H:%M:%SZ')
    updated_at = fields.DateTime(dump_only=True, format='%Y-%m-%dT%H:%M:%SZ')
    
    @pre_load
    def strip_strings(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """String alanlarının başındaki/sonundaki boşlukları temizle."""
        if not isinstance(data, dict):
            return data
        
        for key, value in data.items():
            if isinstance(value, str):
                data[key] = value.strip()
        
        return data
    
    @post_load
    def remove_empty_strings(self, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Boş string'leri None yap."""
        for key, value in list(data.items()):
            if value == '':
                data[key] = None
        return data


class PaginatedSchema(Schema):
    """
    Sayfalanmış response için şema.
    
    Kullanım:
        class UserListSchema(PaginatedSchema):
            items = fields.Nested(UserSchema, many=True, data_key='data')
    """
    
    class Meta:
        ordered = True
    
    page = fields.Integer(required=True)
    per_page = fields.Integer(required=True)
    total = fields.Integer(required=True)
    total_pages = fields.Integer(required=True)
    has_next = fields.Boolean(required=True)
    has_prev = fields.Boolean(required=True)


class RequestSchema(BaseSchema):
    """
    Request body için base şema.
    
    ID ve timestamp alanlarını içermez.
    """
    
    # Override - request'te id olmamalı
    id = None
    created_at = None
    updated_at = None


class ResponseSchema(BaseSchema):
    """
    Response için base şema.
    
    Tüm alanlar read-only.
    """
    pass


# ============================================================================
# Common Fields
# ============================================================================

class TrimmedString(fields.String):
    """Otomatik trim yapan string field."""
    
    def _deserialize(self, value, attr, data, **kwargs):
        value = super()._deserialize(value, attr, data, **kwargs)
        return value.strip() if value else value


class Email(fields.Email):
    """Lowercase email field."""
    
    def _deserialize(self, value, attr, data, **kwargs):
        value = super()._deserialize(value, attr, data, **kwargs)
        return value.lower() if value else value


class PhoneNumber(fields.String):
    """Telefon numarası field."""
    
    def _deserialize(self, value, attr, data, **kwargs):
        import re
        value = super()._deserialize(value, attr, data, **kwargs)
        if value:
            # Sadece rakamları tut
            value = re.sub(r'\D', '', value)
        return value


class Slug(fields.String):
    """URL-safe slug field."""
    
    def _deserialize(self, value, attr, data, **kwargs):
        import re
        value = super()._deserialize(value, attr, data, **kwargs)
        if value:
            # Küçük harf, tire ve rakamlar
            value = re.sub(r'[^a-z0-9-]', '', value.lower())
            value = re.sub(r'-+', '-', value)  # Birden fazla tireyi teke indir
            value = value.strip('-')
        return value


class Password(fields.String):
    """
    Şifre field'ı.
    
    Dump sırasında gösterilmez.
    """
    
    def __init__(self, **kwargs):
        kwargs['load_only'] = True  # Asla response'da gösterme
        super().__init__(**kwargs)
    
    def _deserialize(self, value, attr, data, **kwargs):
        value = super()._deserialize(value, attr, data, **kwargs)
        
        if value and len(value) < 8:
            raise MarshmallowValidationError('Şifre en az 8 karakter olmalıdır')
        
        return value


# ============================================================================
# Validation Helpers
# ============================================================================

def validate_required_fields(data: Dict[str, Any], required: List[str]) -> None:
    """
    Zorunlu alanları kontrol eder.
    
    Args:
        data: Veri dictionary'si
        required: Zorunlu alan isimleri
    
    Raises:
        MarshmallowValidationError: Eksik alan varsa
    """
    missing = [field for field in required if not data.get(field)]
    if missing:
        raise MarshmallowValidationError(
            {field: ['Bu alan zorunludur.'] for field in missing}
        )


def validate_unique_fields(model, data: Dict[str, Any], unique: List[str], exclude_id: int = None) -> None:
    """
    Unique alanları kontrol eder.
    
    Args:
        model: SQLAlchemy model class
        data: Veri dictionary'si
        unique: Unique olması gereken alan isimleri
        exclude_id: Güncelleme durumunda hariç tutulacak ID
    
    Raises:
        MarshmallowValidationError: Çakışma varsa
    """
    errors = {}
    
    for field in unique:
        if field in data and data[field]:
            query = model.query.filter(getattr(model, field) == data[field])
            
            if exclude_id:
                query = query.filter(model.id != exclude_id)
            
            if query.first():
                errors[field] = [f'Bu {field} zaten kullanılıyor.']
    
    if errors:
        raise MarshmallowValidationError(errors)
