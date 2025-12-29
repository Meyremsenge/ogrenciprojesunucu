"""
Pagination utilities.

Offset-based ve cursor-based pagination desteği sağlar.
"""

from typing import Any, Dict, List, Tuple, Optional
from dataclasses import dataclass
from flask import request
from sqlalchemy.orm import Query


@dataclass
class PaginationParams:
    """Pagination parametreleri."""
    page: int = 1
    per_page: int = 20
    max_per_page: int = 100
    
    @classmethod
    def from_request(cls, max_per_page: int = 100) -> 'PaginationParams':
        """Request query params'dan pagination parametrelerini çıkarır."""
        try:
            page = max(1, int(request.args.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        
        try:
            per_page = int(request.args.get('per_page', 20))
            per_page = max(1, min(per_page, max_per_page))
        except (ValueError, TypeError):
            per_page = 20
        
        return cls(page=page, per_page=per_page, max_per_page=max_per_page)


@dataclass
class PaginationResult:
    """Pagination sonucu."""
    items: List[Any]
    page: int
    per_page: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool
    
    def to_dict(self) -> Dict[str, Any]:
        """Dict'e çevir."""
        return {
            'page': self.page,
            'per_page': self.per_page,
            'total': self.total,
            'total_pages': self.total_pages,
            'has_next': self.has_next,
            'has_prev': self.has_prev
        }


def paginate_query(
    query: Query,
    page: int = 1,
    per_page: int = 20
) -> PaginationResult:
    """
    SQLAlchemy query'sini paginate eder.
    
    Args:
        query: SQLAlchemy Query objesi
        page: Sayfa numarası (1-indexed)
        per_page: Sayfa başına öğe sayısı
    
    Returns:
        PaginationResult
    
    Kullanım:
        query = User.query.filter_by(is_active=True)
        result = paginate_query(query, page=1, per_page=20)
    """
    # Toplam sayıyı hesapla
    total = query.count()
    
    # Toplam sayfa sayısı
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    
    # Sayfa sınırlarını kontrol et
    page = max(1, min(page, total_pages)) if total_pages > 0 else 1
    
    # Offset hesapla
    offset = (page - 1) * per_page
    
    # Verileri çek
    items = query.offset(offset).limit(per_page).all()
    
    return PaginationResult(
        items=items,
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


def paginate_list(
    items: List[Any],
    page: int = 1,
    per_page: int = 20
) -> PaginationResult:
    """
    Python listesini paginate eder.
    
    Args:
        items: Öğe listesi
        page: Sayfa numarası (1-indexed)
        per_page: Sayfa başına öğe sayısı
    
    Returns:
        PaginationResult
    """
    total = len(items)
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    
    page = max(1, min(page, total_pages)) if total_pages > 0 else 1
    
    start = (page - 1) * per_page
    end = start + per_page
    
    return PaginationResult(
        items=items[start:end],
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


class CursorPagination:
    """
    Cursor-based pagination.
    
    Büyük veri setleri için daha performanslıdır.
    """
    
    def __init__(
        self,
        query: Query,
        cursor_field: str = 'id',
        per_page: int = 20
    ):
        self.query = query
        self.cursor_field = cursor_field
        self.per_page = per_page
    
    def get_page(
        self,
        after_cursor: Optional[str] = None,
        before_cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cursor'a göre sayfa döner.
        
        Args:
            after_cursor: Bu cursor'dan sonraki öğeler
            before_cursor: Bu cursor'dan önceki öğeler
        
        Returns:
            Dict with items, cursors, and has_more flags
        """
        from sqlalchemy import asc, desc
        
        # Model class'ını al
        model = self.query.column_descriptions[0]['type']
        cursor_column = getattr(model, self.cursor_field)
        
        query = self.query
        
        if after_cursor:
            query = query.filter(cursor_column > after_cursor)
            query = query.order_by(asc(cursor_column))
        elif before_cursor:
            query = query.filter(cursor_column < before_cursor)
            query = query.order_by(desc(cursor_column))
        else:
            query = query.order_by(asc(cursor_column))
        
        # +1 fazla çek has_more kontrolü için
        items = query.limit(self.per_page + 1).all()
        
        has_more = len(items) > self.per_page
        if has_more:
            items = items[:self.per_page]
        
        # Before cursor için listeyi ters çevir
        if before_cursor:
            items = list(reversed(items))
        
        # Cursor'ları oluştur
        start_cursor = None
        end_cursor = None
        
        if items:
            start_cursor = str(getattr(items[0], self.cursor_field))
            end_cursor = str(getattr(items[-1], self.cursor_field))
        
        return {
            'items': items,
            'page_info': {
                'start_cursor': start_cursor,
                'end_cursor': end_cursor,
                'has_next_page': has_more if not before_cursor else None,
                'has_previous_page': has_more if before_cursor else None
            }
        }
