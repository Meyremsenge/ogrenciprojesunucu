"""
Standart API Response Formatları.

Tüm API endpoint'leri bu formatları kullanmalıdır.
Tutarlı ve kurumsal response yapısı sağlar.

Response Yapısı:
    - success: Boolean (başarı durumu)
    - timestamp: ISO 8601 format
    - request_id: Correlation ID (loglama için)
    - data: Response payload
    - message: Kullanıcıya mesaj
    - meta: Ek metadata
    - pagination: Sayfalama bilgisi
    - error: Hata detayları (hata durumunda)

Kullanım:
    from app.core.responses import success_response, error_response
    
    return success_response(
        data={'user': user.to_dict()},
        message='Kullanıcı başarıyla oluşturuldu',
        status_code=201
    )
"""

from typing import Any, Dict, List, Optional, Union
from flask import jsonify, Response, g, has_request_context
from datetime import datetime
import uuid


def _get_request_id() -> Optional[str]:
    """Request ID'yi alır veya oluşturur."""
    if has_request_context():
        if not hasattr(g, 'request_id') or g.request_id is None:
            g.request_id = str(uuid.uuid4())
        return g.request_id
    return None


def _get_api_version() -> str:
    """API versiyonunu döner."""
    return '1.0.0'


def success_response(
    data: Any = None,
    message: str = None,
    status_code: int = 200,
    meta: Dict[str, Any] = None,
    headers: Dict[str, str] = None
) -> tuple:
    """
    Başarılı API response'u oluşturur.
    
    Args:
        data: Response data (dict, list, veya herhangi bir serializable obje)
        message: Opsiyonel mesaj
        status_code: HTTP status code (default: 200)
        meta: Ek metadata (örn: processing time)
        headers: Ek response headers
    
    Returns:
        Tuple of (response_dict, status_code, headers)
    
    Örnek Response:
        {
            "success": true,
            "timestamp": "2024-12-24T10:30:00.000Z",
            "request_id": "550e8400-e29b-41d4-a716-446655440000",
            "message": "İşlem başarılı",
            "data": {...},
            "meta": {"version": "1.0.0"}
        }
    """
    response = {
        'success': True,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'request_id': _get_request_id()
    }
    
    if message:
        response['message'] = message
    
    if data is not None:
        response['data'] = data
    
    # Meta bilgisi ekle
    response_meta = {'version': _get_api_version()}
    if meta:
        response_meta.update(meta)
    response['meta'] = response_meta
    
    if headers:
        return response, status_code, headers
    
    return response, status_code


def created_response(
    data: Any,
    message: str = 'Kayıt başarıyla oluşturuldu',
    location: str = None
) -> tuple:
    """
    201 Created response'u oluşturur.
    
    Args:
        data: Oluşturulan kayıt verisi
        message: Başarı mesajı
        location: Oluşturulan kaynağın URI'si
    
    Returns:
        Tuple of (response_dict, 201, headers)
    """
    headers = {}
    if location:
        headers['Location'] = location
    
    return success_response(
        data=data,
        message=message,
        status_code=201,
        headers=headers if headers else None
    )


def no_content_response() -> tuple:
    """
    204 No Content response'u oluşturur.
    
    Silme işlemleri için kullanılır.
    
    Returns:
        Tuple of ('', 204)
    """
    return '', 204


def error_response(
    message: str,
    code: str = 'ERROR',
    status_code: int = 400,
    details: Dict[str, Any] = None,
    errors: List[Dict[str, Any]] = None,
    help_url: str = None
) -> tuple:
    """
    Hata API response'u oluşturur.
    
    Args:
        message: Hata mesajı
        code: Makine tarafından okunabilir hata kodu
        status_code: HTTP status code (default: 400)
        details: Ek hata detayları
        errors: Birden fazla hata listesi (validation errors için)
        help_url: Hata hakkında yardım URL'si
    
    Returns:
        Tuple of (response_dict, status_code)
    
    Örnek Response:
        {
            "success": false,
            "timestamp": "2024-12-24T10:30:00.000Z",
            "request_id": "550e8400-e29b-41d4-a716-446655440000",
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Doğrulama hatası",
                "details": {"field": "email"},
                "errors": [...],
                "help_url": "https://docs.example.com/errors/validation"
            }
        }
    """
    response = {
        'success': False,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'request_id': _get_request_id(),
        'error': {
            'code': code,
            'message': message
        }
    }
    
    if details:
        response['error']['details'] = details
    
    if errors:
        response['error']['errors'] = errors
    
    if help_url:
        response['error']['help_url'] = help_url
    
    return response, status_code


def validation_error_response(
    errors: List[Dict[str, Any]],
    message: str = 'Doğrulama hatası'
) -> tuple:
    """
    Validation error response'u oluşturur.
    
    Args:
        errors: Alan bazlı hata listesi
        message: Genel hata mesajı
    
    Returns:
        Tuple of (response_dict, 400)
    
    Örnek:
        validation_error_response([
            {'field': 'email', 'message': 'Geçerli bir e-posta giriniz'},
            {'field': 'password', 'message': 'Şifre en az 8 karakter olmalı'}
        ])
    """
    return error_response(
        message=message,
        code='VALIDATION_ERROR',
        status_code=400,
        errors=errors
    )


def paginated_response(
    items: List[Any],
    page: int,
    per_page: int,
    total: int,
    message: str = None,
    meta: Dict[str, Any] = None
) -> tuple:
    """
    Sayfalanmış API response'u oluşturur.
    
    Args:
        items: Sayfa verileri listesi
        page: Mevcut sayfa numarası (1-indexed)
        per_page: Sayfa başına öğe sayısı
        total: Toplam öğe sayısı
        message: Opsiyonel mesaj
        meta: Ek metadata
    
    Returns:
        Tuple of (response_dict, 200)
    
    Örnek Response:
        {
            "success": true,
            "timestamp": "2024-12-24T10:30:00.000Z",
            "request_id": "...",
            "data": [...],
            "pagination": {
                "page": 1,
                "per_page": 20,
                "total": 150,
                "total_pages": 8,
                "has_next": true,
                "has_prev": false,
                "next_page": 2,
                "prev_page": null
            }
        }
    """
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    
    pagination = {
        'page': page,
        'per_page': per_page,
        'total': total,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1,
        'next_page': page + 1 if page < total_pages else None,
        'prev_page': page - 1 if page > 1 else None
    }
    
    response = {
        'success': True,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'request_id': _get_request_id(),
        'data': items,
        'pagination': pagination
    }
    
    if message:
        response['message'] = message
    
    # Meta bilgisi ekle
    response_meta = {'version': _get_api_version()}
    if meta:
        response_meta.update(meta)
    response['meta'] = response_meta
    
    return response, 200


def cursor_paginated_response(
    items: List[Any],
    next_cursor: str = None,
    prev_cursor: str = None,
    has_more: bool = False,
    limit: int = 20,
    message: str = None
) -> tuple:
    """
    Cursor-based sayfalama response'u.
    
    Büyük veri setleri için offset-based'den daha performanslı.
    
    Args:
        items: Sayfa verileri
        next_cursor: Sonraki sayfa cursor'ı
        prev_cursor: Önceki sayfa cursor'ı
        has_more: Daha fazla veri var mı?
        limit: Sayfa başına öğe sayısı
        message: Opsiyonel mesaj
    
    Returns:
        Tuple of (response_dict, 200)
    """
    response = {
        'success': True,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'request_id': _get_request_id(),
        'data': items,
        'pagination': {
            'type': 'cursor',
            'limit': limit,
            'has_more': has_more,
            'next_cursor': next_cursor,
            'prev_cursor': prev_cursor
        },
        'meta': {'version': _get_api_version()}
    }
    
    if message:
        response['message'] = message
    
    return response, 200


def accepted_response(
    task_id: str = None,
    message: str = 'İşlem kuyruğa alındı',
    status_url: str = None
) -> tuple:
    """
    202 Accepted response'u (async işlemler için).
    
    Args:
        task_id: Async task ID
        message: Mesaj
        status_url: İşlem durumu kontrol URL'si
    
    Returns:
        Tuple of (response_dict, 202)
    """
    data = {}
    if task_id:
        data['task_id'] = task_id
    if status_url:
        data['status_url'] = status_url
    
    return success_response(
        data=data if data else None,
        message=message,
        status_code=202
    )


# HTTP Status Code Kısayolları
def ok(data: Any = None, message: str = None) -> tuple:
    """200 OK response."""
    return success_response(data=data, message=message, status_code=200)


def created(data: Any, message: str = 'Oluşturuldu') -> tuple:
    """201 Created response."""
    return created_response(data=data, message=message)


def bad_request(message: str = 'Geçersiz istek', code: str = 'BAD_REQUEST') -> tuple:
    """400 Bad Request response."""
    return error_response(message=message, code=code, status_code=400)


def unauthorized(message: str = 'Kimlik doğrulama gerekli') -> tuple:
    """401 Unauthorized response."""
    return error_response(message=message, code='UNAUTHORIZED', status_code=401)


def forbidden(message: str = 'Bu işlem için yetkiniz yok') -> tuple:
    """403 Forbidden response."""
    return error_response(message=message, code='FORBIDDEN', status_code=403)


def not_found(resource: str = 'Kaynak', resource_id: Any = None) -> tuple:
    """404 Not Found response."""
    if resource_id:
        message = f'{resource} bulunamadı: {resource_id}'
    else:
        message = f'{resource} bulunamadı'
    return error_response(message=message, code='NOT_FOUND', status_code=404)


def conflict(message: str = 'Kaynak çakışması') -> tuple:
    """409 Conflict response."""
    return error_response(message=message, code='CONFLICT', status_code=409)


def too_many_requests(message: str = 'Çok fazla istek', retry_after: int = 60) -> tuple:
    """429 Too Many Requests response."""
    return error_response(
        message=message,
        code='RATE_LIMIT_EXCEEDED',
        status_code=429,
        details={'retry_after': retry_after}
    )


def internal_error(message: str = 'Sunucu hatası') -> tuple:
    """500 Internal Server Error response."""
    return error_response(message=message, code='INTERNAL_ERROR', status_code=500)


def created_response(
    data: Any,
    message: str = 'Kayıt başarıyla oluşturuldu',
    location: str = None
) -> tuple:
    """
    201 Created response'u oluşturur.
    
    Args:
        data: Oluşturulan kaynak
        message: Başarı mesajı
        location: Yeni kaynağın URL'i (Location header için)
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    response, _ = success_response(data=data, message=message, status_code=201)
    
    # Location header eklenebilir
    if location:
        response['meta'] = {'location': location}
    
    return response, 201


def no_content_response() -> tuple:
    """
    204 No Content response'u oluşturur.
    DELETE işlemleri için kullanılır.
    
    Returns:
        Tuple of (empty_string, 204)
    """
    return '', 204


def accepted_response(
    message: str = 'İşlem kabul edildi',
    task_id: str = None
) -> tuple:
    """
    202 Accepted response'u oluşturur.
    Async işlemler için kullanılır.
    
    Args:
        message: Kabul mesajı
        task_id: Celery task ID (durum takibi için)
    
    Returns:
        Tuple of (response_dict, 202)
    """
    response = {
        'success': True,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'message': message
    }
    
    if task_id:
        response['task_id'] = task_id
    
    return response, 202
