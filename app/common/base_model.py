"""
Base Model - Tüm SQLAlchemy modelleri için temel sınıf.

Ortak alanlar ve metodlar burada tanımlanır.

Mixin'ler:
    - TimestampMixin: created_at, updated_at alanları
    - SoftDeleteMixin: Soft delete desteği
    - VersionedMixin: Optimistic locking ve versiyon takibi
    - AuditableMixin: Oluşturan/güncelleyen kullanıcı takibi

Kullanım:
    class Course(BaseModel, SoftDeleteMixin, VersionedMixin):
        __tablename__ = 'courses'
        title = Column(String(255))
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Type, TypeVar
import uuid
import hashlib

from sqlalchemy import Column, Integer, DateTime, Boolean, String, ForeignKey, inspect, event
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import relationship

from app.extensions import db

T = TypeVar('T', bound='BaseModel')


class TimestampMixin:
    """
    Timestamp alanları ekleyen mixin.
    
    Attributes:
        created_at: Oluşturulma zamanı
        updated_at: Son güncelleme zamanı
    """
    
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )
    
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class SoftDeleteMixin:
    """
    Soft delete özelliği ekleyen mixin.
    
    Kayıtları silmek yerine deleted_at ile işaretler.
    KVKK/GDPR uyumluluğu ve veri geri alma için kritik.
    
    Attributes:
        is_deleted: Silindi flag'i
        deleted_at: Silinme zamanı
        deleted_by_id: Silen kullanıcı ID
    """
    
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True, index=True)
    
    @declared_attr
    def deleted_by_id(cls):
        return Column(Integer, ForeignKey('users.id'), nullable=True)
    
    def soft_delete(self, deleted_by: int = None):
        """
        Kaydı soft delete olarak işaretle.
        
        Args:
            deleted_by: Silen kullanıcı ID
        """
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        if deleted_by:
            self.deleted_by_id = deleted_by
        
        # Audit log
        try:
            from app.core.audit import AuditService, AuditAction
            AuditService.log(
                action=AuditAction.SOFT_DELETE,
                entity_type=self.__class__.__name__,
                entity_id=self.id,
                extra_data={'deleted_by': deleted_by}
            )
        except ImportError:
            pass
    
    def restore(self, restored_by: int = None):
        """
        Soft delete'i geri al.
        
        Args:
            restored_by: Geri alan kullanıcı ID
        """
        old_deleted_at = self.deleted_at
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by_id = None
        
        # Audit log
        try:
            from app.core.audit import AuditService, AuditAction
            AuditService.log(
                action=AuditAction.RESTORE,
                entity_type=self.__class__.__name__,
                entity_id=self.id,
                extra_data={
                    'restored_by': restored_by,
                    'was_deleted_at': old_deleted_at.isoformat() if old_deleted_at else None
                }
            )
        except ImportError:
            pass
    
    @classmethod
    def query_active(cls):
        """Sadece aktif (silinmemiş) kayıtları döner."""
        return cls.query.filter_by(is_deleted=False)
    
    @classmethod
    def query_deleted(cls):
        """Sadece silinmiş kayıtları döner."""
        return cls.query.filter_by(is_deleted=True)
    
    @classmethod
    def query_all_including_deleted(cls):
        """Silinmişler dahil tüm kayıtları döner."""
        return cls.query


class VersionedMixin:
    """
    Kayıt versiyonlama için mixin.
    
    Optimistic locking ve değişiklik takibi sağlar.
    Concurrent update'leri güvenli hale getirir.
    
    Attributes:
        version: Versiyon numarası (her güncelleme artar)
        version_hash: Versiyon hash'i (bütünlük kontrolü)
    """
    
    version = Column(Integer, default=1, nullable=False)
    version_hash = Column(String(32), nullable=True)
    
    def increment_version(self):
        """Versiyon numarasını artır ve hash'i güncelle."""
        self.version += 1
        self._update_version_hash()
    
    def _update_version_hash(self):
        """Versiyon hash'i güncelle."""
        content = f"{self.id}:{self.version}:{datetime.utcnow().timestamp()}"
        self.version_hash = hashlib.md5(content.encode()).hexdigest()[:16]
    
    def check_version(self, expected_version: int) -> bool:
        """
        Versiyon kontrolü yapar (optimistic locking).
        
        Args:
            expected_version: Beklenen versiyon numarası
        
        Returns:
            Versiyon eşleşiyor mu?
        
        Raises:
            ConflictError: Versiyon uyuşmazlığı
        """
        if self.version != expected_version:
            from app.core.exceptions import ConflictError
            raise ConflictError(
                message='Bu kayıt başka bir kullanıcı tarafından güncellenmiş',
                resource=self.__class__.__name__
            )
        return True


class AuditableMixin:
    """
    Oluşturan ve güncelleyen kullanıcı takibi için mixin.
    
    Her kayıt için kim oluşturdu ve kim güncelledi bilgisini tutar.
    
    Attributes:
        created_by_id: Oluşturan kullanıcı FK
        updated_by_id: Son güncelleyen kullanıcı FK
    """
    
    @declared_attr
    def created_by_id(cls):
        return Column(Integer, ForeignKey('users.id'), nullable=True)
    
    @declared_attr
    def updated_by_id(cls):
        return Column(Integer, ForeignKey('users.id'), nullable=True)
    
    def set_created_by(self, user_id: int):
        """Oluşturan kullanıcıyı ayarla."""
        self.created_by_id = user_id
    
    def set_updated_by(self, user_id: int):
        """Güncelleyen kullanıcıyı ayarla."""
        self.updated_by_id = user_id


class BaseModel(db.Model, TimestampMixin):
    """
    Tüm modeller için base class.
    
    Özellikler:
        - Otomatik id (primary key)
        - created_at / updated_at timestamps
        - to_dict() serialization
        - from_dict() deserialization
        - Temel CRUD operasyonları
    """
    
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    def __repr__(self) -> str:
        return f'<{self.__class__.__name__} id={self.id}>'
    
    def to_dict(
        self,
        exclude: List[str] = None,
        include: List[str] = None
    ) -> Dict[str, Any]:
        """
        Model'i dictionary'e çevirir.
        
        Args:
            exclude: Dahil edilmeyecek alanlar
            include: Sadece dahil edilecek alanlar
        
        Returns:
            Dict representation
        """
        exclude = exclude or []
        exclude.extend(['password', 'password_hash'])  # Her zaman hariç tut
        
        result = {}
        
        for column in inspect(self.__class__).columns:
            key = column.name
            
            if include and key not in include:
                continue
            
            if key in exclude:
                continue
            
            value = getattr(self, key)
            
            # DateTime serialization
            if isinstance(value, datetime):
                value = value.isoformat() + 'Z'
            
            result[key] = value
        
        return result
    
    @classmethod
    def from_dict(cls: Type[T], data: Dict[str, Any]) -> T:
        """
        Dictionary'den model instance oluşturur.
        
        Args:
            data: Model verileri
        
        Returns:
            Model instance
        """
        # Sadece model'de tanımlı alanları al
        columns = {c.name for c in inspect(cls).columns}
        filtered_data = {k: v for k, v in data.items() if k in columns}
        
        return cls(**filtered_data)
    
    def update(self, data: Dict[str, Any]) -> 'BaseModel':
        """
        Model'i verilen verilerle günceller.
        
        Args:
            data: Güncellenecek alanlar
        
        Returns:
            Self
        """
        columns = {c.name for c in inspect(self.__class__).columns}
        
        for key, value in data.items():
            if key in columns and key not in ['id', 'created_at']:
                setattr(self, key, value)
        
        return self
    
    def save(self) -> 'BaseModel':
        """
        Model'i database'e kaydeder.
        
        Returns:
            Self
        """
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self) -> None:
        """Model'i database'den siler."""
        db.session.delete(self)
        db.session.commit()
    
    @classmethod
    def get_by_id(cls: Type[T], id: int) -> Optional[T]:
        """
        ID ile kayıt bulur.
        
        Args:
            id: Primary key
        
        Returns:
            Model instance veya None
        """
        return cls.query.get(id)
    
    @classmethod
    def get_or_404(cls: Type[T], id: int) -> T:
        """
        ID ile kayıt bulur, yoksa 404 fırlatır.
        
        Args:
            id: Primary key
        
        Returns:
            Model instance
        
        Raises:
            NotFoundError: Kayıt bulunamazsa
        """
        instance = cls.query.get(id)
        if instance is None:
            from app.core.exceptions import NotFoundError
            raise NotFoundError(cls.__name__, id)
        return instance
    
    @classmethod
    def create(cls: Type[T], **kwargs) -> T:
        """
        Yeni kayıt oluşturur ve kaydeder.
        
        Args:
            **kwargs: Model alanları
        
        Returns:
            Oluşturulan model instance
        """
        instance = cls(**kwargs)
        db.session.add(instance)
        db.session.commit()
        return instance
    
    @classmethod
    def get_all(cls: Type[T]) -> List[T]:
        """Tüm kayıtları döner."""
        return cls.query.all()
    
    @classmethod
    def count(cls) -> int:
        """Toplam kayıt sayısını döner."""
        return cls.query.count()


class UUIDBaseModel(db.Model, TimestampMixin):
    """
    UUID primary key kullanan base model.
    
    Distributed sistemler için uygundur.
    """
    
    __abstract__ = True
    
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    def __repr__(self) -> str:
        return f'<{self.__class__.__name__} id={self.id[:8]}...>'
    
    def to_dict(self, exclude: List[str] = None) -> Dict[str, Any]:
        """Model'i dictionary'e çevirir."""
        exclude = exclude or []
        exclude.extend(['password', 'password_hash'])
        
        result = {}
        
        for column in inspect(self.__class__).columns:
            key = column.name
            if key in exclude:
                continue
            
            value = getattr(self, key)
            if isinstance(value, datetime):
                value = value.isoformat() + 'Z'
            
            result[key] = value
        
        return result
