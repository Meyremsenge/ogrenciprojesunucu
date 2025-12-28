"""
AuditLog model for comprehensive system audit logging.
"""

from datetime import datetime
from enum import Enum
from app.extensions import db
import json


class AuditAction(Enum):
    """Audit action types."""
    # CRUD Operations
    CREATE = 'create'
    READ = 'read'
    UPDATE = 'update'
    DELETE = 'delete'
    
    # Authentication
    LOGIN = 'login'
    LOGOUT = 'logout'
    LOGIN_FAILED = 'login_failed'
    PASSWORD_CHANGE = 'password_change'
    PASSWORD_RESET = 'password_reset'
    
    # Authorization
    PERMISSION_GRANTED = 'permission_granted'
    PERMISSION_DENIED = 'permission_denied'
    ROLE_CHANGE = 'role_change'
    
    # User Management
    USER_ACTIVATE = 'user_activate'
    USER_DEACTIVATE = 'user_deactivate'
    USER_VERIFY = 'user_verify'
    
    # Course Operations
    COURSE_PUBLISH = 'course_publish'
    COURSE_UNPUBLISH = 'course_unpublish'
    ENROLLMENT = 'enrollment'
    UNENROLLMENT = 'unenrollment'
    
    # Exam Operations
    EXAM_START = 'exam_start'
    EXAM_SUBMIT = 'exam_submit'
    EXAM_GRADE = 'exam_grade'
    
    # Package Operations
    PACKAGE_PURCHASE = 'package_purchase'
    PACKAGE_CANCEL = 'package_cancel'
    PACKAGE_RENEW = 'package_renew'
    PACKAGE_EXPIRE = 'package_expire'
    
    # Admin Operations
    BULK_OPERATION = 'bulk_operation'
    DATA_EXPORT = 'data_export'
    DATA_IMPORT = 'data_import'
    SETTINGS_CHANGE = 'settings_change'
    
    # Security Events
    SECURITY_ALERT = 'security_alert'
    RATE_LIMIT_HIT = 'rate_limit_hit'
    SUSPICIOUS_ACTIVITY = 'suspicious_activity'
    
    # AI Operations
    AI_REQUEST = 'ai_request'
    AI_VIOLATION = 'ai_violation'


class AuditSeverity(Enum):
    """Audit log severity levels."""
    DEBUG = 'debug'
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'


class AuditLog(db.Model):
    """
    AuditLog model for comprehensive system audit trail.
    
    Tracks all significant system events for security, compliance,
    and debugging purposes.
    
    Design Considerations:
    - Immutable: Logs should never be updated or deleted in production
    - Partitioned: Consider partitioning by created_at for large deployments
    - Archived: Old logs should be archived, not deleted
    """
    
    __tablename__ = 'audit_logs'
    __table_args__ = (
        # Performance indexes
        db.Index('idx_audit_logs_user', 'user_id'),
        db.Index('idx_audit_logs_action', 'action'),
        db.Index('idx_audit_logs_resource', 'resource_type', 'resource_id'),
        db.Index('idx_audit_logs_created', 'created_at'),
        db.Index('idx_audit_logs_severity', 'severity'),
        db.Index('idx_audit_logs_session', 'session_id'),
        
        # Composite indexes for common queries
        db.Index('idx_audit_logs_user_action', 'user_id', 'action'),
        db.Index('idx_audit_logs_user_created', 'user_id', 'created_at'),
        db.Index('idx_audit_logs_resource_action', 'resource_type', 'action'),
        db.Index('idx_audit_logs_created_severity', 'created_at', 'severity'),
        {'extend_existing': True}
    )
    
    id = db.Column(db.BigInteger, primary_key=True)  # BigInteger for large volume
    
    # Who performed the action
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), index=True)
    user_email = db.Column(db.String(255))  # Stored separately for historical accuracy
    user_role = db.Column(db.String(50))  # Role at time of action
    
    # Session tracking
    session_id = db.Column(db.String(100))  # JWT jti or session identifier
    
    # What action was performed
    action = db.Column(db.String(50), nullable=False)
    action_category = db.Column(db.String(50))  # auth, crud, admin, security
    
    # On what resource
    resource_type = db.Column(db.String(50))  # user, course, exam, package, etc.
    resource_id = db.Column(db.Integer)
    resource_name = db.Column(db.String(255))  # Human-readable identifier
    
    # Action details
    description = db.Column(db.Text)
    severity = db.Column(db.String(20), default=AuditSeverity.INFO.value)
    
    # Before and after states (for updates)
    old_values = db.Column(db.JSON)  # Previous state
    new_values = db.Column(db.JSON)  # New state
    changed_fields = db.Column(db.JSON)  # List of changed field names
    
    # Request context
    ip_address = db.Column(db.String(45))  # IPv6 support
    user_agent = db.Column(db.String(500))
    request_method = db.Column(db.String(10))
    request_path = db.Column(db.String(500))
    request_id = db.Column(db.String(100))  # Correlation ID
    
    # Location (optional, from IP)
    country = db.Column(db.String(100))
    city = db.Column(db.String(100))
    
    # Status
    success = db.Column(db.Boolean, default=True)
    error_message = db.Column(db.Text)
    
    # Additional data
    extra_data = db.Column(db.JSON)  # Any additional context
    
    # Timing
    duration_ms = db.Column(db.Integer)  # Action duration in milliseconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('audit_logs', lazy='dynamic'))
    
    def __repr__(self):
        return f'<AuditLog {self.id} {self.action} by User:{self.user_id}>'
    
    def to_dict(self, include_changes=False):
        """Convert audit log to dictionary."""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'user_email': self.user_email,
            'user_role': self.user_role,
            'action': self.action,
            'action_category': self.action_category,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'resource_name': self.resource_name,
            'description': self.description,
            'severity': self.severity,
            'ip_address': self.ip_address,
            'success': self.success,
            'error_message': self.error_message,
            'duration_ms': self.duration_ms,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        
        if include_changes:
            data['old_values'] = self.old_values
            data['new_values'] = self.new_values
            data['changed_fields'] = self.changed_fields
        
        return data


# ============================================================================
# Audit Logger Service
# ============================================================================

class AuditLogger:
    """
    Service class for creating audit logs.
    
    Provides a clean interface for logging various types of events
    throughout the application.
    """
    
    @staticmethod
    def log(
        action: str,
        user_id: int = None,
        user_email: str = None,
        user_role: str = None,
        resource_type: str = None,
        resource_id: int = None,
        resource_name: str = None,
        description: str = None,
        severity: str = AuditSeverity.INFO.value,
        old_values: dict = None,
        new_values: dict = None,
        ip_address: str = None,
        user_agent: str = None,
        request_method: str = None,
        request_path: str = None,
        request_id: str = None,
        session_id: str = None,
        success: bool = True,
        error_message: str = None,
        extra_data: dict = None,
        duration_ms: int = None
    ) -> AuditLog:
        """
        Create a new audit log entry.
        
        Args:
            action: The action being logged (use AuditAction enum values)
            user_id: ID of the user performing the action
            user_email: Email of the user (stored for historical accuracy)
            user_role: Role of the user at time of action
            resource_type: Type of resource affected
            resource_id: ID of the resource affected
            resource_name: Human-readable resource identifier
            description: Description of what happened
            severity: Log severity level
            old_values: Previous state (for updates)
            new_values: New state (for updates)
            ip_address: Client IP address
            user_agent: Client user agent
            request_method: HTTP method
            request_path: Request URL path
            request_id: Correlation ID
            session_id: Session or JWT identifier
            success: Whether action was successful
            error_message: Error message if failed
            extra_data: Additional context data
            duration_ms: Action duration in milliseconds
            
        Returns:
            AuditLog: Created audit log entry
        """
        # Calculate changed fields if both old and new values provided
        changed_fields = None
        if old_values and new_values:
            changed_fields = [
                key for key in set(old_values.keys()) | set(new_values.keys())
                if old_values.get(key) != new_values.get(key)
            ]
        
        # Determine action category
        action_category = AuditLogger._get_action_category(action)
        
        audit_log = AuditLog(
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            session_id=session_id,
            action=action,
            action_category=action_category,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            description=description,
            severity=severity,
            old_values=old_values,
            new_values=new_values,
            changed_fields=changed_fields,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            request_id=request_id,
            success=success,
            error_message=error_message,
            extra_data=extra_data,
            duration_ms=duration_ms
        )
        
        db.session.add(audit_log)
        db.session.commit()
        
        return audit_log
    
    @staticmethod
    def _get_action_category(action: str) -> str:
        """Determine action category based on action type."""
        auth_actions = [
            AuditAction.LOGIN.value,
            AuditAction.LOGOUT.value,
            AuditAction.LOGIN_FAILED.value,
            AuditAction.PASSWORD_CHANGE.value,
            AuditAction.PASSWORD_RESET.value,
        ]
        
        security_actions = [
            AuditAction.SECURITY_ALERT.value,
            AuditAction.RATE_LIMIT_HIT.value,
            AuditAction.SUSPICIOUS_ACTIVITY.value,
            AuditAction.PERMISSION_DENIED.value,
        ]
        
        admin_actions = [
            AuditAction.BULK_OPERATION.value,
            AuditAction.DATA_EXPORT.value,
            AuditAction.DATA_IMPORT.value,
            AuditAction.SETTINGS_CHANGE.value,
            AuditAction.ROLE_CHANGE.value,
        ]
        
        crud_actions = [
            AuditAction.CREATE.value,
            AuditAction.READ.value,
            AuditAction.UPDATE.value,
            AuditAction.DELETE.value,
        ]
        
        if action in auth_actions:
            return 'auth'
        elif action in security_actions:
            return 'security'
        elif action in admin_actions:
            return 'admin'
        elif action in crud_actions:
            return 'crud'
        else:
            return 'other'
    
    @staticmethod
    def log_login(user_id: int, user_email: str, ip_address: str = None, 
                  user_agent: str = None, success: bool = True, 
                  error_message: str = None) -> AuditLog:
        """Log a login attempt."""
        action = AuditAction.LOGIN.value if success else AuditAction.LOGIN_FAILED.value
        severity = AuditSeverity.INFO.value if success else AuditSeverity.WARNING.value
        
        return AuditLogger.log(
            action=action,
            user_id=user_id if success else None,
            user_email=user_email,
            resource_type='user',
            resource_id=user_id if success else None,
            description=f"User {'logged in' if success else 'failed to login'}",
            severity=severity,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message
        )
    
    @staticmethod
    def log_logout(user_id: int, user_email: str, session_id: str = None) -> AuditLog:
        """Log a logout event."""
        return AuditLogger.log(
            action=AuditAction.LOGOUT.value,
            user_id=user_id,
            user_email=user_email,
            session_id=session_id,
            resource_type='user',
            resource_id=user_id,
            description="User logged out"
        )
    
    @staticmethod
    def log_create(user_id: int, user_email: str, resource_type: str, 
                   resource_id: int, resource_name: str = None,
                   new_values: dict = None, **kwargs) -> AuditLog:
        """Log a resource creation."""
        return AuditLogger.log(
            action=AuditAction.CREATE.value,
            user_id=user_id,
            user_email=user_email,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            description=f"Created {resource_type} {resource_id}",
            new_values=new_values,
            **kwargs
        )
    
    @staticmethod
    def log_update(user_id: int, user_email: str, resource_type: str,
                   resource_id: int, resource_name: str = None,
                   old_values: dict = None, new_values: dict = None,
                   **kwargs) -> AuditLog:
        """Log a resource update."""
        return AuditLogger.log(
            action=AuditAction.UPDATE.value,
            user_id=user_id,
            user_email=user_email,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            description=f"Updated {resource_type} {resource_id}",
            old_values=old_values,
            new_values=new_values,
            **kwargs
        )
    
    @staticmethod
    def log_delete(user_id: int, user_email: str, resource_type: str,
                   resource_id: int, resource_name: str = None,
                   old_values: dict = None, **kwargs) -> AuditLog:
        """Log a resource deletion."""
        return AuditLogger.log(
            action=AuditAction.DELETE.value,
            user_id=user_id,
            user_email=user_email,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            description=f"Deleted {resource_type} {resource_id}",
            severity=AuditSeverity.WARNING.value,
            old_values=old_values,
            **kwargs
        )
    
    @staticmethod
    def log_security_event(action: str, description: str, user_id: int = None,
                           user_email: str = None, severity: str = AuditSeverity.WARNING.value,
                           **kwargs) -> AuditLog:
        """Log a security-related event."""
        return AuditLogger.log(
            action=action,
            user_id=user_id,
            user_email=user_email,
            description=description,
            severity=severity,
            **kwargs
        )
    
    @staticmethod
    def log_permission_denied(user_id: int, user_email: str, resource_type: str,
                              resource_id: int = None, action_attempted: str = None,
                              **kwargs) -> AuditLog:
        """Log a permission denied event."""
        return AuditLogger.log(
            action=AuditAction.PERMISSION_DENIED.value,
            user_id=user_id,
            user_email=user_email,
            resource_type=resource_type,
            resource_id=resource_id,
            description=f"Permission denied for {action_attempted or 'access'} on {resource_type}",
            severity=AuditSeverity.WARNING.value,
            success=False,
            **kwargs
        )


# ============================================================================
# Query helpers
# ============================================================================

def get_user_audit_logs(user_id: int, limit: int = 100, offset: int = 0):
    """Get audit logs for a specific user."""
    return AuditLog.query.filter_by(user_id=user_id)\
        .order_by(AuditLog.created_at.desc())\
        .offset(offset).limit(limit).all()


def get_resource_audit_logs(resource_type: str, resource_id: int, 
                            limit: int = 100, offset: int = 0):
    """Get audit logs for a specific resource."""
    return AuditLog.query.filter_by(
        resource_type=resource_type,
        resource_id=resource_id
    ).order_by(AuditLog.created_at.desc())\
     .offset(offset).limit(limit).all()


def get_security_audit_logs(since: datetime = None, limit: int = 100):
    """Get security-related audit logs."""
    query = AuditLog.query.filter(
        AuditLog.action_category == 'security'
    )
    
    if since:
        query = query.filter(AuditLog.created_at >= since)
    
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()


def get_failed_logins(since: datetime = None, limit: int = 100):
    """Get failed login attempts."""
    query = AuditLog.query.filter_by(
        action=AuditAction.LOGIN_FAILED.value
    )
    
    if since:
        query = query.filter(AuditLog.created_at >= since)
    
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()


def cleanup_old_logs(days_to_keep: int = 90):
    """
    Delete audit logs older than specified days.
    
    Note: In production, consider archiving instead of deleting.
    
    Args:
        days_to_keep: Number of days to keep logs
        
    Returns:
        int: Number of logs deleted
    """
    from datetime import timedelta
    
    cutoff = datetime.utcnow() - timedelta(days=days_to_keep)
    
    result = AuditLog.query.filter(
        AuditLog.created_at < cutoff
    ).delete()
    
    db.session.commit()
    
    return result


# ==================== SECURITY EVENTS ====================

class SecurityEventType(Enum):
    """Güvenlik olayı tipleri."""
    
    # Authentication
    LOGIN_SUCCESS = 'login_success'
    LOGIN_FAILED = 'login_failed'
    LOGIN_LOCKED = 'login_locked'
    LOGOUT = 'logout'
    PASSWORD_CHANGED = 'password_changed'
    PASSWORD_RESET_REQUESTED = 'password_reset_requested'
    PASSWORD_RESET_COMPLETED = 'password_reset_completed'
    
    # Token
    TOKEN_CREATED = 'token_created'
    TOKEN_REFRESHED = 'token_refreshed'
    TOKEN_REVOKED = 'token_revoked'
    TOKEN_EXPIRED = 'token_expired'
    TOKEN_INVALID = 'token_invalid'
    
    # Access
    PERMISSION_DENIED = 'permission_denied'
    UNAUTHORIZED_ACCESS = 'unauthorized_access'
    ROLE_CHANGED = 'role_changed'
    ACCOUNT_ACTIVATED = 'account_activated'
    ACCOUNT_DEACTIVATED = 'account_deactivated'
    ACCOUNT_LOCKED = 'account_locked'
    ACCOUNT_UNLOCKED = 'account_unlocked'
    
    # Suspicious Activity
    BRUTE_FORCE_ATTEMPT = 'brute_force_attempt'
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'
    SUSPICIOUS_IP = 'suspicious_ip'
    UNUSUAL_ACTIVITY = 'unusual_activity'
    SQL_INJECTION_ATTEMPT = 'sql_injection_attempt'
    XSS_ATTEMPT = 'xss_attempt'
    
    # Data
    SENSITIVE_DATA_ACCESS = 'sensitive_data_access'
    BULK_DATA_EXPORT = 'bulk_data_export'
    DATA_BREACH_DETECTED = 'data_breach_detected'
    
    # Admin
    ADMIN_ACTION = 'admin_action'
    CONFIG_CHANGED = 'config_changed'
    MAINTENANCE_MODE = 'maintenance_mode'


class SecuritySeverity(Enum):
    """Güvenlik olayı önem derecesi."""
    INFO = 'info'
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'


class SecurityEvent(db.Model):
    """
    Güvenlik olayları tablosu.
    
    Tüm güvenlik ile ilgili olayları saklar:
    - Başarılı/başarısız giriş denemeleri
    - Şifre değişiklikleri
    - Yetkisiz erişim girişimleri
    - Şüpheli aktiviteler
    """
    
    __tablename__ = 'security_events'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Event identification
    event_type = db.Column(db.String(50), nullable=False, index=True)
    severity = db.Column(db.String(20), default='medium', nullable=False, index=True)
    
    # User context
    user_id = db.Column(db.Integer, nullable=True, index=True)
    user_email = db.Column(db.String(255), nullable=True)
    username = db.Column(db.String(100), nullable=True)
    
    # Request context
    ip_address = db.Column(db.String(45), nullable=True, index=True)
    user_agent = db.Column(db.String(500), nullable=True)
    request_path = db.Column(db.String(500), nullable=True)
    request_method = db.Column(db.String(10), nullable=True)
    request_id = db.Column(db.String(36), nullable=True)
    
    # Event details
    description = db.Column(db.Text, nullable=True)
    details = db.Column(db.JSON, nullable=True)
    
    # Location (if available from IP)
    country = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    
    # Resolution
    is_resolved = db.Column(db.Boolean, default=False, index=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by = db.Column(db.Integer, nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f'<SecurityEvent {self.event_type} user={self.user_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'event_type': self.event_type,
            'severity': self.severity,
            'user_id': self.user_id,
            'user_email': self.user_email,
            'ip_address': self.ip_address,
            'description': self.description,
            'details': self.details,
            'country': self.country,
            'city': self.city,
            'is_resolved': self.is_resolved,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ==================== PERFORMANCE METRICS ====================

class MetricType(Enum):
    """Performans metrik tipleri."""
    REQUEST = 'request'
    DATABASE = 'database'
    CACHE = 'cache'
    EXTERNAL_API = 'external_api'
    TASK = 'task'
    CUSTOM = 'custom'


class PerformanceMetric(db.Model):
    """
    Performans metrikleri tablosu.
    
    Sistem performansını izlemek için:
    - Request response times
    - Database query times
    - Cache hit/miss ratios
    - External API latencies
    """
    
    __tablename__ = 'performance_metrics'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Metric identification
    metric_type = db.Column(db.String(50), nullable=False, index=True)
    metric_name = db.Column(db.String(200), nullable=False)
    
    # Request context
    request_id = db.Column(db.String(36), nullable=True)
    endpoint = db.Column(db.String(200), nullable=True, index=True)
    http_method = db.Column(db.String(10), nullable=True)
    
    # Performance data
    duration_ms = db.Column(db.Float, nullable=False)
    is_slow = db.Column(db.Boolean, default=False, index=True)
    
    # Additional metrics
    status_code = db.Column(db.Integer, nullable=True)
    query_count = db.Column(db.Integer, nullable=True)
    cache_hits = db.Column(db.Integer, nullable=True)
    cache_misses = db.Column(db.Integer, nullable=True)
    memory_used_mb = db.Column(db.Float, nullable=True)
    
    # Context
    user_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.JSON, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f'<PerformanceMetric {self.metric_type} {self.duration_ms}ms>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'metric_type': self.metric_type,
            'metric_name': self.metric_name,
            'endpoint': self.endpoint,
            'http_method': self.http_method,
            'duration_ms': self.duration_ms,
            'is_slow': self.is_slow,
            'status_code': self.status_code,
            'query_count': self.query_count,
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ==================== ERROR LOGS ====================

class ErrorSeverity(Enum):
    """Hata önem seviyesi."""
    DEBUG = 'debug'
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'


class ErrorLog(db.Model):
    """
    Uygulama hata logları tablosu.
    
    Tüm uygulama hatalarını detaylı olarak saklar:
    - Exception bilgileri
    - Stack trace
    - Request context
    - User context
    """
    
    __tablename__ = 'error_logs'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Error identification
    error_type = db.Column(db.String(200), nullable=False, index=True)
    error_message = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), default='error', nullable=False, index=True)
    fingerprint = db.Column(db.String(64), nullable=True, index=True)
    
    # Stack trace
    stack_trace = db.Column(db.Text, nullable=True)
    
    # Request context
    request_id = db.Column(db.String(36), nullable=True)
    endpoint = db.Column(db.String(200), nullable=True, index=True)
    http_method = db.Column(db.String(10), nullable=True)
    request_url = db.Column(db.String(500), nullable=True)
    request_headers = db.Column(db.JSON, nullable=True)
    request_body = db.Column(db.Text, nullable=True)
    
    # User context
    user_id = db.Column(db.Integer, nullable=True)
    user_email = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    
    # Environment
    environment = db.Column(db.String(50), nullable=True)
    server_name = db.Column(db.String(100), nullable=True)
    python_version = db.Column(db.String(20), nullable=True)
    
    # Additional context
    extra_data = db.Column(db.JSON, nullable=True)
    tags = db.Column(db.JSON, nullable=True)
    
    # Resolution tracking
    is_resolved = db.Column(db.Boolean, default=False, index=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by = db.Column(db.Integer, nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)
    
    # Occurrence tracking
    occurrence_count = db.Column(db.Integer, default=1)
    first_seen_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f'<ErrorLog {self.error_type}: {self.error_message[:50]}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'error_type': self.error_type,
            'error_message': self.error_message,
            'severity': self.severity,
            'fingerprint': self.fingerprint,
            'endpoint': self.endpoint,
            'http_method': self.http_method,
            'user_id': self.user_id,
            'user_email': self.user_email,
            'ip_address': self.ip_address,
            'is_resolved': self.is_resolved,
            'occurrence_count': self.occurrence_count,
            'first_seen_at': self.first_seen_at.isoformat() if self.first_seen_at else None,
            'last_seen_at': self.last_seen_at.isoformat() if self.last_seen_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
    
    def to_detail_dict(self):
        """Detaylı hata bilgisi."""
        data = self.to_dict()
        data.update({
            'stack_trace': self.stack_trace,
            'request_url': self.request_url,
            'request_headers': self.request_headers,
            'extra_data': self.extra_data,
            'tags': self.tags,
            'environment': self.environment,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolution_notes': self.resolution_notes,
        })
        return data


# ==================== REQUEST LOG ====================

class RequestLog(db.Model):
    """
    HTTP request logları.
    
    Tüm API isteklerinin kaydı:
    - Timing bilgileri
    - Status codes
    - User tracking
    """
    
    __tablename__ = 'request_logs'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Request identification
    request_id = db.Column(db.String(36), nullable=False, index=True)
    
    # Request details
    http_method = db.Column(db.String(10), nullable=False)
    endpoint = db.Column(db.String(200), nullable=False, index=True)
    full_url = db.Column(db.String(500), nullable=True)
    query_params = db.Column(db.JSON, nullable=True)
    
    # Response
    status_code = db.Column(db.Integer, nullable=False, index=True)
    response_size = db.Column(db.Integer, nullable=True)
    
    # Timing
    duration_ms = db.Column(db.Float, nullable=False)
    is_slow = db.Column(db.Boolean, default=False, index=True)
    
    # User context
    user_id = db.Column(db.Integer, nullable=True, index=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f'<RequestLog {self.http_method} {self.endpoint} {self.status_code}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'http_method': self.http_method,
            'endpoint': self.endpoint,
            'status_code': self.status_code,
            'duration_ms': self.duration_ms,
            'is_slow': self.is_slow,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ==================== AGGREGATED METRICS ====================

class AggregatedMetric(db.Model):
    """
    Aggregate edilmiş metrikler (saatlik/günlük).
    
    Raporlama için önceden hesaplanmış metrikler:
    - Saatlik request counts
    - Ortalama response times
    - Error rates
    """
    
    __tablename__ = 'aggregated_metrics'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Metric identification
    metric_name = db.Column(db.String(100), nullable=False, index=True)
    
    # Period
    period_type = db.Column(db.String(20), nullable=False)  # hourly, daily, weekly, monthly
    period_start = db.Column(db.DateTime, nullable=False, index=True)
    period_end = db.Column(db.DateTime, nullable=False)
    
    # Dimension (optional grouping)
    dimension_name = db.Column(db.String(50), nullable=True)
    dimension_value = db.Column(db.String(200), nullable=True)
    
    # Aggregated values
    count = db.Column(db.Integer, default=0)
    sum_value = db.Column(db.Float, default=0)
    avg_value = db.Column(db.Float, nullable=True)
    min_value = db.Column(db.Float, nullable=True)
    max_value = db.Column(db.Float, nullable=True)
    p50_value = db.Column(db.Float, nullable=True)
    p95_value = db.Column(db.Float, nullable=True)
    p99_value = db.Column(db.Float, nullable=True)
    
    # Error tracking
    error_count = db.Column(db.Integer, default=0)
    error_rate = db.Column(db.Float, nullable=True)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f'<AggregatedMetric {self.metric_name} {self.period_type}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'metric_name': self.metric_name,
            'period_type': self.period_type,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'dimension_name': self.dimension_name,
            'dimension_value': self.dimension_value,
            'count': self.count,
            'avg_value': self.avg_value,
            'min_value': self.min_value,
            'max_value': self.max_value,
            'p95_value': self.p95_value,
            'error_count': self.error_count,
            'error_rate': self.error_rate,
        }

