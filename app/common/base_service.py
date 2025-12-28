"""
Base Service - Tüm servisler için temel sınıf.

Generic CRUD operasyonları ve ortak iş mantığı burada tanımlanır.
"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar
from sqlalchemy.orm import Query

from app.extensions import db
from app.core.exceptions import NotFoundError, ValidationError
from app.core.pagination import PaginationParams, PaginationResult, paginate_query

# Generic type for models
T = TypeVar('T')


class BaseService(Generic[T]):
    """
    Generic base service class.
    
    Tüm servisler bu sınıfı miras almalı ve model class'ını belirtmelidir.
    
    Kullanım:
        class UserService(BaseService[User]):
            model = User
            
            @classmethod
            def get_active_users(cls):
                return cls.query().filter_by(is_active=True).all()
    """
    
    model: Type[T] = None
    
    @classmethod
    def query(cls) -> Query:
        """
        Base query döner.
        
        Override edilerek default filtreler eklenebilir.
        """
        if cls.model is None:
            raise NotImplementedError('model class must be defined')
        return cls.model.query
    
    @classmethod
    def get_by_id(cls, id: int) -> Optional[T]:
        """
        ID ile kayıt bulur.
        
        Args:
            id: Primary key
        
        Returns:
            Model instance veya None
        """
        return cls.query().get(id)
    
    @classmethod
    def get_or_404(cls, id: int) -> T:
        """
        ID ile kayıt bulur, yoksa NotFoundError fırlatır.
        
        Args:
            id: Primary key
        
        Returns:
            Model instance
        
        Raises:
            NotFoundError: Kayıt bulunamazsa
        """
        instance = cls.get_by_id(id)
        if instance is None:
            raise NotFoundError(cls.model.__name__, id)
        return instance
    
    @classmethod
    def get_all(cls) -> List[T]:
        """Tüm kayıtları döner."""
        return cls.query().all()
    
    @classmethod
    def get_paginated(
        cls,
        page: int = 1,
        per_page: int = 20,
        **filters
    ) -> PaginationResult:
        """
        Sayfalanmış kayıtları döner.
        
        Args:
            page: Sayfa numarası
            per_page: Sayfa başına öğe sayısı
            **filters: Filtre parametreleri
        
        Returns:
            PaginationResult
        """
        query = cls.query()
        
        # Filtreleri uygula
        for key, value in filters.items():
            if hasattr(cls.model, key) and value is not None:
                query = query.filter(getattr(cls.model, key) == value)
        
        return paginate_query(query, page, per_page)
    
    @classmethod
    def create(cls, data: Dict[str, Any]) -> T:
        """
        Yeni kayıt oluşturur.
        
        Args:
            data: Model verileri
        
        Returns:
            Oluşturulan model instance
        """
        instance = cls.model(**data)
        db.session.add(instance)
        db.session.commit()
        return instance
    
    @classmethod
    def update(cls, id: int, data: Dict[str, Any]) -> T:
        """
        Kaydı günceller.
        
        Args:
            id: Primary key
            data: Güncellenecek veriler
        
        Returns:
            Güncellenmiş model instance
        
        Raises:
            NotFoundError: Kayıt bulunamazsa
        """
        instance = cls.get_or_404(id)
        
        for key, value in data.items():
            if hasattr(instance, key) and key not in ['id', 'created_at']:
                setattr(instance, key, value)
        
        db.session.commit()
        return instance
    
    @classmethod
    def delete(cls, id: int) -> bool:
        """
        Kaydı siler.
        
        Args:
            id: Primary key
        
        Returns:
            True eğer silindiyse
        
        Raises:
            NotFoundError: Kayıt bulunamazsa
        """
        instance = cls.get_or_404(id)
        db.session.delete(instance)
        db.session.commit()
        return True
    
    @classmethod
    def soft_delete(cls, id: int) -> T:
        """
        Kaydı soft delete yapar (SoftDeleteMixin gerektirir).
        
        Args:
            id: Primary key
        
        Returns:
            Güncellenen model instance
        """
        instance = cls.get_or_404(id)
        
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete()
            db.session.commit()
        else:
            raise NotImplementedError('Model does not support soft delete')
        
        return instance
    
    @classmethod
    def exists(cls, **filters) -> bool:
        """
        Kayıt var mı kontrol eder.
        
        Args:
            **filters: Filtre parametreleri
        
        Returns:
            True eğer kayıt varsa
        """
        query = cls.query()
        for key, value in filters.items():
            if hasattr(cls.model, key):
                query = query.filter(getattr(cls.model, key) == value)
        return query.first() is not None
    
    @classmethod
    def get_by(cls, **filters) -> Optional[T]:
        """
        Filtrelere göre tek kayıt döner.
        
        Args:
            **filters: Filtre parametreleri
        
        Returns:
            Model instance veya None
        """
        query = cls.query()
        for key, value in filters.items():
            if hasattr(cls.model, key):
                query = query.filter(getattr(cls.model, key) == value)
        return query.first()
    
    @classmethod
    def get_many_by(cls, **filters) -> List[T]:
        """
        Filtrelere göre kayıtları döner.
        
        Args:
            **filters: Filtre parametreleri
        
        Returns:
            Model instance listesi
        """
        query = cls.query()
        for key, value in filters.items():
            if hasattr(cls.model, key):
                query = query.filter(getattr(cls.model, key) == value)
        return query.all()
    
    @classmethod
    def count(cls, **filters) -> int:
        """
        Kayıt sayısını döner.
        
        Args:
            **filters: Filtre parametreleri
        
        Returns:
            Kayıt sayısı
        """
        query = cls.query()
        for key, value in filters.items():
            if hasattr(cls.model, key):
                query = query.filter(getattr(cls.model, key) == value)
        return query.count()
    
    @classmethod
    def bulk_create(cls, items: List[Dict[str, Any]]) -> List[T]:
        """
        Toplu kayıt oluşturur.
        
        Args:
            items: Model verileri listesi
        
        Returns:
            Oluşturulan model instance listesi
        """
        instances = [cls.model(**item) for item in items]
        db.session.add_all(instances)
        db.session.commit()
        return instances
    
    @classmethod
    def bulk_delete(cls, ids: List[int]) -> int:
        """
        Toplu kayıt siler.
        
        Args:
            ids: Silinecek ID'ler
        
        Returns:
            Silinen kayıt sayısı
        """
        count = cls.query().filter(cls.model.id.in_(ids)).delete(
            synchronize_session=False
        )
        db.session.commit()
        return count
