"""
Log Services - Security, Performance, Error & Reporting Services

Production-ready logging and reporting services for:
- Security event tracking and alerting
- Performance metrics collection
- Error logging with deduplication
- Reporting and analytics
"""

import hashlib
import traceback
import sys
import platform
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Union
from functools import wraps

from flask import request, g, has_request_context, current_app
from sqlalchemy import func, desc, and_, or_
from sqlalchemy.sql import text

from app.extensions import db
from app.models.audit import (
    SecurityEvent, SecurityEventType, SecuritySeverity,
    PerformanceMetric, MetricType,
    ErrorLog, ErrorSeverity,
    RequestLog, AggregatedMetric
)


# ==================== SECURITY SERVICE ====================

class SecurityService:
    """
    Güvenlik olayları servisi.
    
    Güvenlik ile ilgili tüm olayları kaydeder ve yönetir.
    """
    
    # Severity mapping for event types
    SEVERITY_MAP = {
        SecurityEventType.LOGIN_SUCCESS.value: SecuritySeverity.INFO.value,
        SecurityEventType.LOGIN_FAILED.value: SecuritySeverity.MEDIUM.value,
        SecurityEventType.LOGIN_LOCKED.value: SecuritySeverity.HIGH.value,
        SecurityEventType.BRUTE_FORCE_ATTEMPT.value: SecuritySeverity.CRITICAL.value,
        SecurityEventType.PERMISSION_DENIED.value: SecuritySeverity.MEDIUM.value,
        SecurityEventType.UNAUTHORIZED_ACCESS.value: SecuritySeverity.HIGH.value,
        SecurityEventType.ROLE_CHANGED.value: SecuritySeverity.MEDIUM.value,
        SecurityEventType.PASSWORD_CHANGED.value: SecuritySeverity.LOW.value,
        SecurityEventType.PASSWORD_RESET_REQUESTED.value: SecuritySeverity.LOW.value,
        SecurityEventType.RATE_LIMIT_EXCEEDED.value: SecuritySeverity.MEDIUM.value,
        SecurityEventType.SQL_INJECTION_ATTEMPT.value: SecuritySeverity.CRITICAL.value,
        SecurityEventType.XSS_ATTEMPT.value: SecuritySeverity.CRITICAL.value,
        SecurityEventType.DATA_BREACH_DETECTED.value: SecuritySeverity.CRITICAL.value,
        SecurityEventType.CONFIG_CHANGED.value: SecuritySeverity.HIGH.value,
    }
    
    @classmethod
    def log_event(
        cls,
        event_type: Union[SecurityEventType, str],
        user_id: int = None,
        user_email: str = None,
        description: str = None,
        details: Dict = None,
        severity: Union[SecuritySeverity, str] = None
    ) -> Optional[SecurityEvent]:
        """
        Güvenlik olayı kaydeder.
        
        Args:
            event_type: Olay tipi
            user_id: Kullanıcı ID
            user_email: Kullanıcı email
            description: Açıklama
            details: Ek detaylar
            severity: Önem derecesi (otomatik hesaplanır)
        
        Returns:
            SecurityEvent veya None
        """
        try:
            event_type_str = event_type.value if isinstance(event_type, SecurityEventType) else str(event_type)
            
            # Auto-determine severity if not provided
            if severity is None:
                severity = cls.SEVERITY_MAP.get(event_type_str, SecuritySeverity.MEDIUM.value)
            else:
                severity = severity.value if isinstance(severity, SecuritySeverity) else str(severity)
            
            # Get request context
            ip_address = None
            user_agent = None
            request_path = None
            request_method = None
            request_id = None
            
            if has_request_context():
                ip_address = cls._get_client_ip()
                user_agent = request.headers.get('User-Agent', '')[:500]
                request_path = request.path
                request_method = request.method
                request_id = getattr(g, 'request_id', None)
            
            event = SecurityEvent(
                event_type=event_type_str,
                severity=severity,
                user_id=user_id,
                user_email=user_email,
                ip_address=ip_address,
                user_agent=user_agent,
                request_path=request_path,
                request_method=request_method,
                request_id=request_id,
                description=description,
                details=details,
                created_at=datetime.utcnow()
            )
            
            db.session.add(event)
            db.session.commit()
            
            # Check for critical events and alert
            if severity == SecuritySeverity.CRITICAL.value:
                cls._send_critical_alert(event)
            
            return event
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Security event logging error: {e}")
            return None
    
    @classmethod
    def log_login_success(cls, user_id: int, user_email: str) -> Optional[SecurityEvent]:
        """Başarılı giriş kaydı."""
        return cls.log_event(
            SecurityEventType.LOGIN_SUCCESS,
            user_id=user_id,
            user_email=user_email,
            description=f"User {user_email} logged in successfully"
        )
    
    @classmethod
    def log_login_failed(cls, email: str, reason: str = None) -> Optional[SecurityEvent]:
        """Başarısız giriş kaydı."""
        return cls.log_event(
            SecurityEventType.LOGIN_FAILED,
            user_email=email,
            description=f"Failed login attempt for {email}",
            details={'reason': reason}
        )
    
    @classmethod
    def log_brute_force(cls, ip_address: str, attempts: int) -> Optional[SecurityEvent]:
        """Brute force saldırı tespiti."""
        return cls.log_event(
            SecurityEventType.BRUTE_FORCE_ATTEMPT,
            description=f"Brute force attack detected from {ip_address}",
            details={'ip': ip_address, 'attempts': attempts},
            severity=SecuritySeverity.CRITICAL
        )
    
    @classmethod
    def log_permission_denied(cls, user_id: int, resource: str, action: str) -> Optional[SecurityEvent]:
        """Yetki reddi kaydı."""
        return cls.log_event(
            SecurityEventType.PERMISSION_DENIED,
            user_id=user_id,
            description=f"Permission denied for {action} on {resource}",
            details={'resource': resource, 'action': action}
        )
    
    @classmethod
    def log_rate_limit(cls, user_id: int = None, endpoint: str = None) -> Optional[SecurityEvent]:
        """Rate limit aşımı kaydı."""
        return cls.log_event(
            SecurityEventType.RATE_LIMIT_EXCEEDED,
            user_id=user_id,
            description=f"Rate limit exceeded for endpoint {endpoint}",
            details={'endpoint': endpoint}
        )
    
    @classmethod
    def get_events(
        cls,
        event_type: str = None,
        severity: str = None,
        user_id: int = None,
        ip_address: str = None,
        is_resolved: bool = None,
        start_date: datetime = None,
        end_date: datetime = None,
        page: int = 1,
        per_page: int = 50
    ) -> Dict[str, Any]:
        """Güvenlik olaylarını filtreli getirir."""
        query = SecurityEvent.query
        
        if event_type:
            query = query.filter(SecurityEvent.event_type == event_type)
        if severity:
            query = query.filter(SecurityEvent.severity == severity)
        if user_id:
            query = query.filter(SecurityEvent.user_id == user_id)
        if ip_address:
            query = query.filter(SecurityEvent.ip_address == ip_address)
        if is_resolved is not None:
            query = query.filter(SecurityEvent.is_resolved == is_resolved)
        if start_date:
            query = query.filter(SecurityEvent.created_at >= start_date)
        if end_date:
            query = query.filter(SecurityEvent.created_at <= end_date)
        
        query = query.order_by(desc(SecurityEvent.created_at))
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
    def get_security_stats(cls, days: int = 7) -> Dict[str, Any]:
        """Güvenlik istatistiklerini getirir."""
        since = datetime.utcnow() - timedelta(days=days)
        
        # Event counts by severity
        severity_counts = db.session.query(
            SecurityEvent.severity,
            func.count(SecurityEvent.id)
        ).filter(
            SecurityEvent.created_at >= since
        ).group_by(SecurityEvent.severity).all()
        
        # Event counts by type
        type_counts = db.session.query(
            SecurityEvent.event_type,
            func.count(SecurityEvent.id)
        ).filter(
            SecurityEvent.created_at >= since
        ).group_by(SecurityEvent.event_type).order_by(
            desc(func.count(SecurityEvent.id))
        ).limit(10).all()
        
        # Failed logins by IP
        failed_login_ips = db.session.query(
            SecurityEvent.ip_address,
            func.count(SecurityEvent.id).label('count')
        ).filter(
            SecurityEvent.event_type == SecurityEventType.LOGIN_FAILED.value,
            SecurityEvent.created_at >= since
        ).group_by(SecurityEvent.ip_address).order_by(
            desc(func.count(SecurityEvent.id))
        ).limit(10).all()
        
        # Unresolved critical events
        unresolved_critical = SecurityEvent.query.filter(
            SecurityEvent.severity == SecuritySeverity.CRITICAL.value,
            SecurityEvent.is_resolved == False
        ).count()
        
        return {
            'period_days': days,
            'severity_counts': {s: c for s, c in severity_counts},
            'event_type_counts': {t: c for t, c in type_counts},
            'top_failed_login_ips': [{'ip': ip, 'count': count} for ip, count in failed_login_ips],
            'unresolved_critical_count': unresolved_critical,
        }
    
    @classmethod
    def resolve_event(cls, event_id: int, resolved_by: int, notes: str = None) -> Optional[SecurityEvent]:
        """Güvenlik olayını çözümlenmiş olarak işaretler."""
        event = SecurityEvent.query.get(event_id)
        if event:
            event.is_resolved = True
            event.resolved_at = datetime.utcnow()
            event.resolved_by = resolved_by
            event.resolution_notes = notes
            db.session.commit()
        return event
    
    @classmethod
    def _get_client_ip(cls) -> str:
        """Get real client IP, handling proxies."""
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        if request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        return request.remote_addr or 'unknown'
    
    @classmethod
    def _send_critical_alert(cls, event: SecurityEvent):
        """Kritik güvenlik olayı için alarm gönderir."""
        # TODO: Email/Slack notification integration
        current_app.logger.critical(
            f"CRITICAL SECURITY EVENT: {event.event_type} - {event.description}",
            extra={'event_id': event.id, 'ip': event.ip_address}
        )


# ==================== PERFORMANCE SERVICE ====================

class PerformanceService:
    """
    Performans metrikleri servisi.
    
    Sistem performansını izler ve raporlar.
    """
    
    # Slow request thresholds (ms)
    SLOW_THRESHOLDS = {
        'request': 1000,      # 1 second
        'database': 100,      # 100ms
        'cache': 50,          # 50ms
        'external_api': 2000, # 2 seconds
    }
    
    @classmethod
    def record_metric(
        cls,
        metric_type: Union[MetricType, str],
        metric_name: str,
        duration_ms: float,
        endpoint: str = None,
        http_method: str = None,
        status_code: int = None,
        query_count: int = None,
        cache_hits: int = None,
        cache_misses: int = None,
        user_id: int = None,
        details: Dict = None
    ) -> Optional[PerformanceMetric]:
        """
        Performans metriği kaydeder.
        """
        try:
            type_str = metric_type.value if isinstance(metric_type, MetricType) else str(metric_type)
            
            # Determine if slow
            threshold = cls.SLOW_THRESHOLDS.get(type_str, 1000)
            is_slow = duration_ms > threshold
            
            # Get request context
            request_id = None
            if has_request_context():
                request_id = getattr(g, 'request_id', None)
            
            metric = PerformanceMetric(
                metric_type=type_str,
                metric_name=metric_name,
                request_id=request_id,
                endpoint=endpoint,
                http_method=http_method,
                duration_ms=duration_ms,
                is_slow=is_slow,
                status_code=status_code,
                query_count=query_count,
                cache_hits=cache_hits,
                cache_misses=cache_misses,
                user_id=user_id,
                details=details,
                created_at=datetime.utcnow()
            )
            
            db.session.add(metric)
            db.session.commit()
            
            # Log slow requests
            if is_slow:
                current_app.logger.warning(
                    f"Slow {type_str}: {metric_name} took {duration_ms:.2f}ms",
                    extra={'endpoint': endpoint, 'duration_ms': duration_ms}
                )
            
            return metric
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Performance metric recording error: {e}")
            return None
    
    @classmethod
    def record_request(
        cls,
        endpoint: str,
        http_method: str,
        duration_ms: float,
        status_code: int,
        response_size: int = None,
        user_id: int = None
    ) -> Optional[RequestLog]:
        """HTTP request kaydeder."""
        try:
            request_id = getattr(g, 'request_id', None) if has_request_context() else None
            ip_address = None
            user_agent = None
            full_url = None
            
            if has_request_context():
                ip_address = cls._get_client_ip()
                user_agent = request.headers.get('User-Agent', '')[:500]
                full_url = request.url
            
            is_slow = duration_ms > cls.SLOW_THRESHOLDS['request']
            
            log = RequestLog(
                request_id=request_id or 'unknown',
                http_method=http_method,
                endpoint=endpoint,
                full_url=full_url,
                status_code=status_code,
                response_size=response_size,
                duration_ms=duration_ms,
                is_slow=is_slow,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=datetime.utcnow()
            )
            
            db.session.add(log)
            db.session.commit()
            
            return log
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Request log recording error: {e}")
            return None
    
    @classmethod
    def get_metrics(
        cls,
        metric_type: str = None,
        endpoint: str = None,
        is_slow: bool = None,
        start_date: datetime = None,
        end_date: datetime = None,
        page: int = 1,
        per_page: int = 50
    ) -> Dict[str, Any]:
        """Performans metriklerini getirir."""
        query = PerformanceMetric.query
        
        if metric_type:
            query = query.filter(PerformanceMetric.metric_type == metric_type)
        if endpoint:
            query = query.filter(PerformanceMetric.endpoint.ilike(f'%{endpoint}%'))
        if is_slow is not None:
            query = query.filter(PerformanceMetric.is_slow == is_slow)
        if start_date:
            query = query.filter(PerformanceMetric.created_at >= start_date)
        if end_date:
            query = query.filter(PerformanceMetric.created_at <= end_date)
        
        query = query.order_by(desc(PerformanceMetric.created_at))
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
    def get_performance_stats(cls, hours: int = 24) -> Dict[str, Any]:
        """Performans istatistiklerini getirir."""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        # Request stats
        request_stats = db.session.query(
            func.count(RequestLog.id).label('total'),
            func.avg(RequestLog.duration_ms).label('avg_duration'),
            func.max(RequestLog.duration_ms).label('max_duration'),
            func.min(RequestLog.duration_ms).label('min_duration'),
            func.sum(func.cast(RequestLog.is_slow, db.Integer)).label('slow_count')
        ).filter(RequestLog.created_at >= since).first()
        
        # Status code distribution
        status_dist = db.session.query(
            RequestLog.status_code,
            func.count(RequestLog.id)
        ).filter(
            RequestLog.created_at >= since
        ).group_by(RequestLog.status_code).all()
        
        # Slowest endpoints
        slowest_endpoints = db.session.query(
            RequestLog.endpoint,
            func.avg(RequestLog.duration_ms).label('avg_duration'),
            func.count(RequestLog.id).label('count')
        ).filter(
            RequestLog.created_at >= since
        ).group_by(RequestLog.endpoint).order_by(
            desc(func.avg(RequestLog.duration_ms))
        ).limit(10).all()
        
        # Error rate
        error_count = RequestLog.query.filter(
            RequestLog.created_at >= since,
            RequestLog.status_code >= 500
        ).count()
        
        total_requests = request_stats.total or 0
        
        return {
            'period_hours': hours,
            'total_requests': total_requests,
            'avg_duration_ms': round(request_stats.avg_duration or 0, 2),
            'max_duration_ms': round(request_stats.max_duration or 0, 2),
            'min_duration_ms': round(request_stats.min_duration or 0, 2),
            'slow_request_count': request_stats.slow_count or 0,
            'slow_request_rate': round((request_stats.slow_count or 0) / max(total_requests, 1) * 100, 2),
            'error_count': error_count,
            'error_rate': round(error_count / max(total_requests, 1) * 100, 2),
            'status_distribution': {str(s): c for s, c in status_dist},
            'slowest_endpoints': [
                {'endpoint': e, 'avg_duration_ms': round(d, 2), 'count': c}
                for e, d, c in slowest_endpoints
            ],
        }
    
    @classmethod
    def _get_client_ip(cls) -> str:
        """Get real client IP."""
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        return request.remote_addr or 'unknown'


# ==================== ERROR SERVICE ====================

class ErrorService:
    """
    Hata log servisi.
    
    Uygulama hatalarını yakalar, gruplar ve raporlar.
    """
    
    @classmethod
    def log_error(
        cls,
        error: Exception,
        severity: Union[ErrorSeverity, str] = ErrorSeverity.ERROR,
        tags: List[str] = None,
        extra_data: Dict = None
    ) -> Optional[ErrorLog]:
        """
        Hata kaydeder.
        
        Aynı fingerprint'e sahip hatalar gruplandırılır.
        """
        try:
            error_type = type(error).__name__
            error_message = str(error)
            stack_trace = traceback.format_exc()
            
            # Generate fingerprint for grouping
            fingerprint = cls._generate_fingerprint(error_type, error_message, stack_trace)
            
            severity_str = severity.value if isinstance(severity, ErrorSeverity) else str(severity)
            
            # Check for existing error with same fingerprint
            existing = ErrorLog.query.filter_by(fingerprint=fingerprint).first()
            
            if existing:
                # Update existing error
                existing.occurrence_count += 1
                existing.last_seen_at = datetime.utcnow()
                db.session.commit()
                return existing
            
            # Get request context
            request_id = None
            endpoint = None
            http_method = None
            request_url = None
            request_headers = None
            user_id = None
            user_email = None
            ip_address = None
            user_agent = None
            
            if has_request_context():
                request_id = getattr(g, 'request_id', None)
                endpoint = request.endpoint
                http_method = request.method
                request_url = request.url
                request_headers = dict(request.headers)
                # Remove sensitive headers
                for key in ['Authorization', 'Cookie', 'X-Api-Key']:
                    request_headers.pop(key, None)
                
                ip_address = cls._get_client_ip()
                user_agent = request.headers.get('User-Agent', '')[:500]
                
                # Get user from g
                current_user = getattr(g, 'current_user', None)
                if current_user:
                    user_id = current_user.id
                    user_email = getattr(current_user, 'email', None)
            
            error_log = ErrorLog(
                error_type=error_type,
                error_message=error_message[:2000],  # Limit length
                severity=severity_str,
                fingerprint=fingerprint,
                stack_trace=stack_trace,
                request_id=request_id,
                endpoint=endpoint,
                http_method=http_method,
                request_url=request_url,
                request_headers=request_headers,
                user_id=user_id,
                user_email=user_email,
                ip_address=ip_address,
                user_agent=user_agent,
                environment=current_app.config.get('ENV', 'development'),
                server_name=platform.node(),
                python_version=sys.version.split()[0],
                extra_data=extra_data,
                tags=tags,
                created_at=datetime.utcnow()
            )
            
            db.session.add(error_log)
            db.session.commit()
            
            # Alert for critical errors
            if severity_str == ErrorSeverity.CRITICAL.value:
                cls._send_critical_alert(error_log)
            
            return error_log
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error logging error: {e}")
            return None
    
    @classmethod
    def get_errors(
        cls,
        error_type: str = None,
        severity: str = None,
        endpoint: str = None,
        is_resolved: bool = None,
        start_date: datetime = None,
        end_date: datetime = None,
        page: int = 1,
        per_page: int = 50
    ) -> Dict[str, Any]:
        """Hataları filtreli getirir."""
        query = ErrorLog.query
        
        if error_type:
            query = query.filter(ErrorLog.error_type.ilike(f'%{error_type}%'))
        if severity:
            query = query.filter(ErrorLog.severity == severity)
        if endpoint:
            query = query.filter(ErrorLog.endpoint.ilike(f'%{endpoint}%'))
        if is_resolved is not None:
            query = query.filter(ErrorLog.is_resolved == is_resolved)
        if start_date:
            query = query.filter(ErrorLog.created_at >= start_date)
        if end_date:
            query = query.filter(ErrorLog.created_at <= end_date)
        
        query = query.order_by(desc(ErrorLog.last_seen_at))
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
    def get_error_detail(cls, error_id: int) -> Optional[Dict]:
        """Hata detayını getirir."""
        error = ErrorLog.query.get(error_id)
        return error.to_detail_dict() if error else None
    
    @classmethod
    def get_error_stats(cls, days: int = 7) -> Dict[str, Any]:
        """Hata istatistiklerini getirir."""
        since = datetime.utcnow() - timedelta(days=days)
        
        # Error counts by severity
        severity_counts = db.session.query(
            ErrorLog.severity,
            func.count(ErrorLog.id),
            func.sum(ErrorLog.occurrence_count)
        ).filter(
            ErrorLog.created_at >= since
        ).group_by(ErrorLog.severity).all()
        
        # Most frequent errors
        frequent_errors = db.session.query(
            ErrorLog.error_type,
            ErrorLog.error_message,
            func.sum(ErrorLog.occurrence_count).label('total_occurrences')
        ).filter(
            ErrorLog.created_at >= since
        ).group_by(
            ErrorLog.error_type, ErrorLog.error_message
        ).order_by(
            desc(func.sum(ErrorLog.occurrence_count))
        ).limit(10).all()
        
        # Unresolved count
        unresolved = ErrorLog.query.filter(
            ErrorLog.is_resolved == False
        ).count()
        
        return {
            'period_days': days,
            'severity_counts': {s: {'unique': c, 'total': t or c} for s, c, t in severity_counts},
            'most_frequent_errors': [
                {'error_type': e, 'message': m[:100], 'occurrences': o}
                for e, m, o in frequent_errors
            ],
            'unresolved_count': unresolved,
        }
    
    @classmethod
    def resolve_error(cls, error_id: int, resolved_by: int, notes: str = None) -> Optional[ErrorLog]:
        """Hatayı çözümlenmiş olarak işaretler."""
        error = ErrorLog.query.get(error_id)
        if error:
            error.is_resolved = True
            error.resolved_at = datetime.utcnow()
            error.resolved_by = resolved_by
            error.resolution_notes = notes
            db.session.commit()
        return error
    
    @classmethod
    def _generate_fingerprint(cls, error_type: str, message: str, stack: str) -> str:
        """Hata için unique fingerprint oluşturur."""
        # Extract key parts from stack trace
        stack_lines = [l for l in stack.split('\n') if 'File "' in l][:3]
        stack_key = ''.join(stack_lines)
        
        content = f"{error_type}:{message[:100]}:{stack_key}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    @classmethod
    def _get_client_ip(cls) -> str:
        """Get real client IP."""
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        return request.remote_addr or 'unknown'
    
    @classmethod
    def _send_critical_alert(cls, error: ErrorLog):
        """Kritik hata için alarm gönderir."""
        current_app.logger.critical(
            f"CRITICAL ERROR: {error.error_type} - {error.error_message}",
            extra={'error_id': error.id, 'endpoint': error.endpoint}
        )


# ==================== REPORTING SERVICE ====================

class ReportingService:
    """
    Raporlama servisi.
    
    Log verilerinden raporlar ve analizler üretir.
    """
    
    @classmethod
    def get_dashboard_stats(cls) -> Dict[str, Any]:
        """Dashboard için özet istatistikler."""
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        # Today's stats
        today_requests = RequestLog.query.filter(RequestLog.created_at >= today).count()
        today_errors = ErrorLog.query.filter(ErrorLog.created_at >= today).count()
        today_security = SecurityEvent.query.filter(SecurityEvent.created_at >= today).count()
        
        # Last 24h performance
        perf_stats = db.session.query(
            func.avg(RequestLog.duration_ms).label('avg'),
            func.count(RequestLog.id).label('total')
        ).filter(RequestLog.created_at >= last_24h).first()
        
        # Active issues
        unresolved_errors = ErrorLog.query.filter(ErrorLog.is_resolved == False).count()
        critical_security = SecurityEvent.query.filter(
            SecurityEvent.severity == SecuritySeverity.CRITICAL.value,
            SecurityEvent.is_resolved == False
        ).count()
        
        return {
            'today': {
                'requests': today_requests,
                'errors': today_errors,
                'security_events': today_security,
            },
            'last_24h': {
                'avg_response_ms': round(perf_stats.avg or 0, 2),
                'total_requests': perf_stats.total or 0,
            },
            'active_issues': {
                'unresolved_errors': unresolved_errors,
                'critical_security': critical_security,
            }
        }
    
    @classmethod
    def get_activity_timeline(cls, hours: int = 24) -> List[Dict]:
        """Son X saat için aktivite zaman çizelgesi."""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        # Group by hour
        request_by_hour = db.session.query(
            func.date_trunc('hour', RequestLog.created_at).label('hour'),
            func.count(RequestLog.id).label('requests'),
            func.avg(RequestLog.duration_ms).label('avg_duration'),
            func.sum(func.cast(RequestLog.status_code >= 500, db.Integer)).label('errors')
        ).filter(
            RequestLog.created_at >= since
        ).group_by(
            func.date_trunc('hour', RequestLog.created_at)
        ).order_by('hour').all()
        
        return [
            {
                'hour': h.isoformat() if h else None,
                'requests': r,
                'avg_duration_ms': round(d or 0, 2),
                'errors': e or 0
            }
            for h, r, d, e in request_by_hour
        ]
    
    @classmethod
    def get_user_activity_report(cls, user_id: int, days: int = 30) -> Dict[str, Any]:
        """Belirli kullanıcı için aktivite raporu."""
        since = datetime.utcnow() - timedelta(days=days)
        
        # Request count
        request_count = RequestLog.query.filter(
            RequestLog.user_id == user_id,
            RequestLog.created_at >= since
        ).count()
        
        # Security events
        security_events = SecurityEvent.query.filter(
            SecurityEvent.user_id == user_id,
            SecurityEvent.created_at >= since
        ).all()
        
        # Most accessed endpoints
        top_endpoints = db.session.query(
            RequestLog.endpoint,
            func.count(RequestLog.id).label('count')
        ).filter(
            RequestLog.user_id == user_id,
            RequestLog.created_at >= since
        ).group_by(RequestLog.endpoint).order_by(
            desc(func.count(RequestLog.id))
        ).limit(10).all()
        
        return {
            'user_id': user_id,
            'period_days': days,
            'total_requests': request_count,
            'security_events': [e.to_dict() for e in security_events],
            'top_endpoints': [{'endpoint': e, 'count': c} for e, c in top_endpoints],
        }
    
    @classmethod
    def generate_system_report(cls, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Belirli tarih aralığı için sistem raporu."""
        # Request summary
        request_summary = db.session.query(
            func.count(RequestLog.id).label('total'),
            func.avg(RequestLog.duration_ms).label('avg_duration'),
            func.sum(func.cast(RequestLog.is_slow, db.Integer)).label('slow_count'),
            func.sum(func.cast(RequestLog.status_code >= 500, db.Integer)).label('error_count')
        ).filter(
            RequestLog.created_at >= start_date,
            RequestLog.created_at <= end_date
        ).first()
        
        # Security summary
        security_summary = db.session.query(
            SecurityEvent.severity,
            func.count(SecurityEvent.id)
        ).filter(
            SecurityEvent.created_at >= start_date,
            SecurityEvent.created_at <= end_date
        ).group_by(SecurityEvent.severity).all()
        
        # Error summary
        error_summary = db.session.query(
            ErrorLog.severity,
            func.count(ErrorLog.id),
            func.sum(ErrorLog.occurrence_count)
        ).filter(
            ErrorLog.created_at >= start_date,
            ErrorLog.created_at <= end_date
        ).group_by(ErrorLog.severity).all()
        
        return {
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
            },
            'requests': {
                'total': request_summary.total or 0,
                'avg_duration_ms': round(request_summary.avg_duration or 0, 2),
                'slow_count': request_summary.slow_count or 0,
                'error_count': request_summary.error_count or 0,
            },
            'security': {s: c for s, c in security_summary},
            'errors': {s: {'unique': c, 'total': t or c} for s, c, t in error_summary},
            'generated_at': datetime.utcnow().isoformat(),
        }


# ==================== DECORATORS ====================

def track_performance(name: str = None):
    """
    Fonksiyon performansını izleyen dekoratör.
    
    Usage:
        @track_performance('heavy_calculation')
        def calculate():
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = datetime.utcnow()
            try:
                result = func(*args, **kwargs)
                duration = (datetime.utcnow() - start).total_seconds() * 1000
                
                PerformanceService.record_metric(
                    metric_type=MetricType.CUSTOM,
                    metric_name=name or func.__name__,
                    duration_ms=duration
                )
                
                return result
            except Exception as e:
                duration = (datetime.utcnow() - start).total_seconds() * 1000
                PerformanceService.record_metric(
                    metric_type=MetricType.CUSTOM,
                    metric_name=name or func.__name__,
                    duration_ms=duration,
                    details={'error': str(e)}
                )
                raise
        return wrapper
    return decorator


def log_errors(severity: ErrorSeverity = ErrorSeverity.ERROR, tags: List[str] = None):
    """
    Fonksiyon hatalarını otomatik loglayan dekoratör.
    
    Usage:
        @log_errors(severity=ErrorSeverity.CRITICAL, tags=['payment'])
        def process_payment():
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                ErrorService.log_error(
                    error=e,
                    severity=severity,
                    tags=tags,
                    extra_data={'function': func.__name__}
                )
                raise
        return wrapper
    return decorator
