"""
Audit Logging System.

Sistem genelinde tüm kritik işlemleri kaydeder.
KVKK/GDPR uyumluluğu ve güvenlik takibi için kullanılır.

Kullanım:
    from app.core.audit import AuditService, audit_log
    
    # Dekoratör ile
    @audit_log(action='CREATE', entity_type='Course')
    def create_course(data):
        ...
    
    # Manuel
    AuditService.log(
        action=AuditAction.CREATE,
        entity_type='User',
        entity_id=user.id,
        new_values=user.to_dict()
    )
"""

from datetime import datetime
from enum import Enum
from functools import wraps
from typing import Any, Dict, List, Optional, Callable
import json
import hashlib
import traceback

from flask import request, g, has_request_context

from app.extensions import db


class AuditAction(str, Enum):
    """Audit log aksiyonları."""
    
    # Authentication
    LOGIN = 'LOGIN'
    LOGOUT = 'LOGOUT'
    LOGIN_FAILED = 'LOGIN_FAILED'
    PASSWORD_CHANGE = 'PASSWORD_CHANGE'
    PASSWORD_RESET = 'PASSWORD_RESET'
    TOKEN_REFRESH = 'TOKEN_REFRESH'
    
    # CRUD Operations
    CREATE = 'CREATE'
    READ = 'READ'
    UPDATE = 'UPDATE'
    DELETE = 'DELETE'
    SOFT_DELETE = 'SOFT_DELETE'
    RESTORE = 'RESTORE'
    
    # Special Operations
    PUBLISH = 'PUBLISH'
    ARCHIVE = 'ARCHIVE'
    ACTIVATE = 'ACTIVATE'
    DEACTIVATE = 'DEACTIVATE'
    APPROVE = 'APPROVE'
    REJECT = 'REJECT'
    SUBMIT = 'SUBMIT'
    GRADE = 'GRADE'
    
    # System
    PERMISSION_DENIED = 'PERMISSION_DENIED'
    ROLE_CHANGE = 'ROLE_CHANGE'
    CONFIG_CHANGE = 'CONFIG_CHANGE'
    EXPORT = 'EXPORT'
    IMPORT = 'IMPORT'
    BULK_OPERATION = 'BULK_OPERATION'


class AuditStatus(str, Enum):
    """Audit log durumları."""
    SUCCESS = 'success'
    FAILURE = 'failure'
    ERROR = 'error'


class AuditSeverity(str, Enum):
    """Audit log önem seviyesi."""
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'


# Aksiyon-Önem seviyesi mapping
ACTION_SEVERITY = {
    AuditAction.LOGIN: AuditSeverity.LOW,
    AuditAction.LOGOUT: AuditSeverity.LOW,
    AuditAction.LOGIN_FAILED: AuditSeverity.HIGH,
    AuditAction.PASSWORD_CHANGE: AuditSeverity.HIGH,
    AuditAction.PASSWORD_RESET: AuditSeverity.HIGH,
    AuditAction.CREATE: AuditSeverity.MEDIUM,
    AuditAction.UPDATE: AuditSeverity.MEDIUM,
    AuditAction.DELETE: AuditSeverity.HIGH,
    AuditAction.SOFT_DELETE: AuditSeverity.MEDIUM,
    AuditAction.PERMISSION_DENIED: AuditSeverity.HIGH,
    AuditAction.ROLE_CHANGE: AuditSeverity.CRITICAL,
    AuditAction.CONFIG_CHANGE: AuditSeverity.CRITICAL,
    AuditAction.BULK_OPERATION: AuditSeverity.HIGH,
}


# Import AuditLog from models to avoid duplicate definition
from app.models.audit import AuditLog


class AuditService:
    """
    Audit logging servis sınıfı.
    
    Tüm audit log işlemlerini yönetir.
    """
    
    # Hassas alanlar - loglanmayacak
    SENSITIVE_FIELDS = {
        'password', 'password_hash', 'token', 'secret', 'api_key',
        'credit_card', 'ssn', 'tc_kimlik', 'verification_token',
        'password_reset_token', 'access_token', 'refresh_token'
    }
    
    @classmethod
    def log(
        cls,
        action: AuditAction | str,
        entity_type: str,
        entity_id: int = None,
        entity_name: str = None,
        old_values: Dict = None,
        new_values: Dict = None,
        status: AuditStatus | str = AuditStatus.SUCCESS,
        description: str = None,
        error_message: str = None,
        error_stack: str = None,
        module: str = None,
        extra_data: Dict = None,
        user_id: int = None,
        duration_ms: int = None
    ) -> Optional[AuditLog]:
        """
        Audit log kaydı oluşturur.
        
        Args:
            action: Yapılan işlem (CREATE, UPDATE, DELETE, vb.)
            entity_type: Etkilenen varlık tipi (User, Course, vb.)
            entity_id: Varlık ID'si
            entity_name: İnsan okunabilir tanımlayıcı
            old_values: İşlem öncesi değerler
            new_values: İşlem sonrası değerler
            status: İşlem sonucu (success, failure, error)
            description: İşlem açıklaması
            error_message: Hata mesajı (failure/error durumunda)
            error_stack: Hata stack trace
            module: İşlemin yapıldığı modül
            extra_data: Ek metadata
            user_id: Kullanıcı ID (otomatik alınmaz ise)
            duration_ms: İşlem süresi (milisaniye)
        
        Returns:
            Oluşturulan AuditLog kaydı veya None (hata durumunda)
        """
        try:
            # Action'ı string'e çevir
            action_str = action.value if isinstance(action, AuditAction) else str(action)
            status_str = status.value if isinstance(status, AuditStatus) else str(status)
            
            # Hassas alanları temizle
            clean_old = cls._sanitize_values(old_values) if old_values else None
            clean_new = cls._sanitize_values(new_values) if new_values else None
            
            # Değişen alanları hesapla
            changed_fields = cls._calculate_changed_fields(old_values, new_values)
            
            # Request context'ten bilgileri al
            ip_address = None
            user_agent = None
            request_method = None
            request_path = None
            request_id = None
            session_id = None
            
            if has_request_context():
                ip_address = cls._get_client_ip()
                user_agent = request.headers.get('User-Agent', '')[:500]
                request_method = request.method
                request_path = request.path
                request_id = getattr(g, 'request_id', None)
                session_id = getattr(g, 'session_id', None)
            
            # Kullanıcı bilgilerini al
            if user_id is None and has_request_context():
                current_user = getattr(g, 'current_user', None)
                if current_user:
                    user_id = current_user.id
                    user_email = getattr(current_user, 'email', None)
                    user_role = getattr(current_user, 'role_name', None)
                else:
                    user_email = None
                    user_role = None
            else:
                user_email = None
                user_role = None
            
            # Önem seviyesini belirle
            severity = ACTION_SEVERITY.get(
                AuditAction(action_str) if action_str in [a.value for a in AuditAction] else None,
                AuditSeverity.MEDIUM
            )
            if status_str in ['failure', 'error']:
                severity = AuditSeverity.HIGH
            
            severity_str = severity.value if isinstance(severity, AuditSeverity) else str(severity)
            
            # Audit log kaydı oluştur
            audit_log = AuditLog(
                user_id=user_id,
                user_email=user_email,
                user_role=user_role,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
                action=action_str,
                entity_type=entity_type,
                entity_id=entity_id,
                entity_name=entity_name,
                old_values=clean_old,
                new_values=clean_new,
                changed_fields=changed_fields,
                request_id=request_id,
                session_id=session_id,
                module=module,
                description=description,
                status=status_str,
                severity=severity_str,
                error_message=error_message,
                error_stack=error_stack,
                duration_ms=duration_ms,
                extra_data=extra_data,
                created_at=datetime.utcnow()
            )
            
            # Checksum hesapla
            db.session.add(audit_log)
            db.session.flush()  # ID almak için
            audit_log.checksum = audit_log.calculate_checksum()
            
            db.session.commit()
            
            return audit_log
            
        except Exception as e:
            # Audit log hatası uygulamayı durdurmamalı
            db.session.rollback()
            import logging
            logging.getLogger(__name__).error(f"Audit log error: {e}")
            return None
    
    @classmethod
    def log_auth(
        cls,
        action: AuditAction,
        user_id: int = None,
        user_email: str = None,
        success: bool = True,
        error_message: str = None,
        extra_data: Dict = None
    ) -> Optional[AuditLog]:
        """Authentication işlemleri için özel log metodu."""
        return cls.log(
            action=action,
            entity_type='Authentication',
            entity_id=user_id,
            entity_name=user_email,
            status=AuditStatus.SUCCESS if success else AuditStatus.FAILURE,
            error_message=error_message,
            module='auth',
            extra_data=extra_data
        )
    
    @classmethod
    def log_data_access(
        cls,
        entity_type: str,
        entity_id: int,
        fields_accessed: List[str] = None,
        reason: str = None
    ) -> Optional[AuditLog]:
        """Hassas veri erişimi için log."""
        return cls.log(
            action=AuditAction.READ,
            entity_type=entity_type,
            entity_id=entity_id,
            description=reason,
            extra_data={'fields_accessed': fields_accessed}
        )
    
    @classmethod
    def log_permission_denied(
        cls,
        resource: str,
        action: str,
        required_permission: str = None
    ) -> Optional[AuditLog]:
        """Yetki reddi için log."""
        return cls.log(
            action=AuditAction.PERMISSION_DENIED,
            entity_type=resource,
            status=AuditStatus.FAILURE,
            description=f"Permission denied for {action}",
            extra_data={'required_permission': required_permission}
        )
    
    @classmethod
    def get_logs(
        cls,
        user_id: int = None,
        entity_type: str = None,
        entity_id: int = None,
        action: str = None,
        status: str = None,
        severity: str = None,
        start_date: datetime = None,
        end_date: datetime = None,
        page: int = 1,
        per_page: int = 50
    ) -> Dict[str, Any]:
        """
        Audit logları filtreli olarak getirir.
        
        Returns:
            {'items': [...], 'total': int, 'page': int, 'per_page': int}
        """
        query = AuditLog.query
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if status:
            query = query.filter(AuditLog.status == status)
        if severity:
            query = query.filter(AuditLog.severity == severity)
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        
        # Sıralama ve sayfalama
        query = query.order_by(AuditLog.created_at.desc())
        total = query.count()
        
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            'items': [item.to_dict() for item in items],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    
    @classmethod
    def get_entity_history(
        cls,
        entity_type: str,
        entity_id: int
    ) -> List[Dict[str, Any]]:
        """Belirli bir varlığın tüm değişiklik geçmişini getirir."""
        logs = AuditLog.query.filter(
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id
        ).order_by(AuditLog.created_at.desc()).all()
        
        return [log.to_dict() for log in logs]
    
    @classmethod
    def _sanitize_values(cls, values: Dict) -> Dict:
        """Hassas alanları maskeler."""
        if not values:
            return values
        
        sanitized = {}
        for key, value in values.items():
            if key.lower() in cls.SENSITIVE_FIELDS:
                sanitized[key] = '***REDACTED***'
            elif isinstance(value, dict):
                sanitized[key] = cls._sanitize_values(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    @classmethod
    def _calculate_changed_fields(
        cls,
        old_values: Dict,
        new_values: Dict
    ) -> Optional[List[str]]:
        """Değişen alanları hesaplar."""
        if not old_values or not new_values:
            return None
        
        changed = []
        all_keys = set(old_values.keys()) | set(new_values.keys())
        
        for key in all_keys:
            old_val = old_values.get(key)
            new_val = new_values.get(key)
            if old_val != new_val:
                changed.append(key)
        
        return changed if changed else None
    
    @classmethod
    def _get_client_ip(cls) -> str:
        """İstemci IP adresini alır (proxy arkasında da çalışır)."""
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        elif request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        else:
            return request.remote_addr


def audit_log(
    action: AuditAction | str,
    entity_type: str = None,
    get_entity_id: Callable = None,
    get_entity_name: Callable = None,
    get_old_values: Callable = None,
    module: str = None
):
    """
    Audit log dekoratörü.
    
    Fonksiyon çağrılarını otomatik olarak loglar.
    
    Kullanım:
        @audit_log(action=AuditAction.CREATE, entity_type='Course')
        def create_course(self, data):
            course = Course(**data)
            db.session.add(course)
            db.session.commit()
            return course
        
        @audit_log(
            action=AuditAction.UPDATE,
            entity_type='User',
            get_entity_id=lambda args, kwargs, result: kwargs.get('user_id'),
            get_old_values=lambda args, kwargs, result: User.query.get(kwargs.get('user_id')).to_dict()
        )
        def update_user(self, user_id, data):
            ...
    
    Args:
        action: Yapılacak işlem tipi
        entity_type: Varlık tipi (None ise fonksiyon adından çıkarılır)
        get_entity_id: Entity ID'yi almak için callable
        get_entity_name: Entity adını almak için callable
        get_old_values: Eski değerleri almak için callable
        module: Modül adı
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = datetime.utcnow()
            old_values = None
            
            # Eski değerleri al (varsa)
            if get_old_values:
                try:
                    old_values = get_old_values(args, kwargs, None)
                except Exception:
                    pass
            
            try:
                # Fonksiyonu çalıştır
                result = func(*args, **kwargs)
                
                # Süreyi hesapla
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                # Entity bilgilerini al
                entity_id = None
                entity_name = None
                new_values = None
                
                if get_entity_id:
                    try:
                        entity_id = get_entity_id(args, kwargs, result)
                    except Exception:
                        pass
                
                if get_entity_name:
                    try:
                        entity_name = get_entity_name(args, kwargs, result)
                    except Exception:
                        pass
                
                # Result'tan new_values çıkar
                if result:
                    if hasattr(result, 'to_dict'):
                        new_values = result.to_dict()
                        if not entity_id and hasattr(result, 'id'):
                            entity_id = result.id
                    elif isinstance(result, dict):
                        new_values = result
                        if not entity_id:
                            entity_id = result.get('id')
                
                # Audit log oluştur
                AuditService.log(
                    action=action,
                    entity_type=entity_type or func.__name__,
                    entity_id=entity_id,
                    entity_name=entity_name,
                    old_values=old_values,
                    new_values=new_values,
                    status=AuditStatus.SUCCESS,
                    module=module,
                    duration_ms=duration_ms
                )
                
                return result
                
            except Exception as e:
                # Hata durumunda log
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                AuditService.log(
                    action=action,
                    entity_type=entity_type or func.__name__,
                    status=AuditStatus.ERROR,
                    error_message=str(e),
                    error_stack=traceback.format_exc(),
                    module=module,
                    duration_ms=duration_ms
                )
                
                raise
        
        return wrapper
    return decorator


# Kısayol dekoratörler
def audit_create(entity_type: str, module: str = None):
    """CREATE işlemi için audit log dekoratörü."""
    return audit_log(action=AuditAction.CREATE, entity_type=entity_type, module=module)


def audit_update(entity_type: str, module: str = None):
    """UPDATE işlemi için audit log dekoratörü."""
    return audit_log(action=AuditAction.UPDATE, entity_type=entity_type, module=module)


def audit_delete(entity_type: str, module: str = None):
    """DELETE işlemi için audit log dekoratörü."""
    return audit_log(action=AuditAction.DELETE, entity_type=entity_type, module=module)
