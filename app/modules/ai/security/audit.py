"""
AI Security - Security Audit Logger.

Güvenlik olayları loglama ve forensics sistemi.
"""

import json
import logging
import hashlib
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
from enum import Enum


logger = logging.getLogger(__name__)


# =============================================================================
# SECURITY EVENT TYPES
# =============================================================================

class SecurityEventType(str, Enum):
    """Güvenlik olay türleri."""
    # Threat Events
    PROMPT_INJECTION_DETECTED = "prompt_injection_detected"
    JAILBREAK_ATTEMPT = "jailbreak_attempt"
    PII_DETECTED = "pii_detected"
    SECRET_EXPOSED = "secret_exposed"
    BANNED_CONTENT = "banned_content"
    
    # Quota Events
    QUOTA_EXCEEDED = "quota_exceeded"
    RATE_LIMIT_HIT = "rate_limit_hit"
    QUOTA_ATTACK = "quota_attack"
    
    # Abuse Events
    BOT_BEHAVIOR = "bot_behavior"
    SUSPICIOUS_PATTERN = "suspicious_pattern"
    USER_BLOCKED = "user_blocked"
    USER_UNBLOCKED = "user_unblocked"
    
    # System Events
    SECURITY_CHECK_PASSED = "security_check_passed"
    SECURITY_CHECK_FAILED = "security_check_failed"
    INPUT_SANITIZED = "input_sanitized"
    OUTPUT_SANITIZED = "output_sanitized"
    
    # Admin Events
    SECURITY_RULE_ADDED = "security_rule_added"
    SECURITY_RULE_REMOVED = "security_rule_removed"
    SECURITY_CONFIG_CHANGED = "security_config_changed"


class SecurityEventSeverity(str, Enum):
    """Güvenlik olay şiddeti."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


# =============================================================================
# SECURITY EVENT
# =============================================================================

@dataclass
class SecurityEvent:
    """Güvenlik olayı."""
    event_type: SecurityEventType
    severity: SecurityEventSeverity
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    request_id: Optional[str] = None
    
    # Threat details
    threat_level: Optional[int] = None
    threat_category: Optional[str] = None
    pattern_matched: Optional[str] = None
    
    # Content (sanitized)
    content_hash: Optional[str] = None
    content_preview: Optional[str] = None  # İlk 100 karakter (maskelenmiş)
    
    # Context
    feature: Optional[str] = None
    endpoint: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Action taken
    action: Optional[str] = None
    blocked: bool = False
    
    # Extra details
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Dict'e dönüştür."""
        return {k: v for k, v in asdict(self).items() if v is not None}
    
    def to_json(self) -> str:
        """JSON'a dönüştür."""
        return json.dumps(self.to_dict(), default=str, ensure_ascii=False)


# =============================================================================
# SECURITY AUDIT LOGGER
# =============================================================================

class SecurityAuditLogger:
    """
    Güvenlik olayları loglama sistemi.
    
    Özellikler:
    - Dosya tabanlı kalıcı log
    - Günlük rotasyon
    - Severity bazlı filtreleme
    - Forensics için arama
    - Real-time alerting (opsiyonel)
    """
    
    def __init__(
        self,
        log_dir: str = None,
        min_severity: SecurityEventSeverity = SecurityEventSeverity.INFO,
        enable_console: bool = True,
        retention_days: int = 90
    ):
        """
        Args:
            log_dir: Log dizini
            min_severity: Minimum log seviyesi
            enable_console: Konsola da log yaz
            retention_days: Log tutma süresi (gün)
        """
        self.log_dir = Path(log_dir) if log_dir else Path(__file__).parent / "audit_logs"
        self.min_severity = min_severity
        self.enable_console = enable_console
        self.retention_days = retention_days
        
        # Dizini oluştur
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Alert callbacks
        self._alert_callbacks: List[callable] = []
        
        # Memory buffer (son olaylar)
        self._buffer: List[SecurityEvent] = []
        self._buffer_size = 1000
    
    # =========================================================================
    # LOGGING
    # =========================================================================
    
    def log(self, event: SecurityEvent) -> None:
        """Güvenlik olayı logla."""
        # Severity kontrolü
        severity_order = [
            SecurityEventSeverity.INFO,
            SecurityEventSeverity.WARNING,
            SecurityEventSeverity.ERROR,
            SecurityEventSeverity.CRITICAL
        ]
        
        if severity_order.index(event.severity) < severity_order.index(self.min_severity):
            return
        
        # Buffer'a ekle
        self._buffer.append(event)
        if len(self._buffer) > self._buffer_size:
            self._buffer = self._buffer[-self._buffer_size:]
        
        # Dosyaya yaz
        self._write_to_file(event)
        
        # Konsola yaz
        if self.enable_console:
            self._write_to_console(event)
        
        # Alert callbacks
        if event.severity in [SecurityEventSeverity.ERROR, SecurityEventSeverity.CRITICAL]:
            self._trigger_alerts(event)
    
    def log_threat(
        self,
        event_type: SecurityEventType,
        user_id: int,
        threat_level: int,
        threat_category: str,
        content: str = None,
        blocked: bool = False,
        **kwargs
    ) -> None:
        """Tehdit olayı logla (kısayol)."""
        severity = SecurityEventSeverity.CRITICAL if threat_level >= 4 else \
                   SecurityEventSeverity.ERROR if threat_level >= 3 else \
                   SecurityEventSeverity.WARNING
        
        event = SecurityEvent(
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            threat_level=threat_level,
            threat_category=threat_category,
            content_hash=self._hash_content(content) if content else None,
            content_preview=self._preview_content(content) if content else None,
            blocked=blocked,
            action="blocked" if blocked else "logged",
            **kwargs
        )
        
        self.log(event)
    
    def log_quota_event(
        self,
        event_type: SecurityEventType,
        user_id: int,
        quota_type: str,
        current: int,
        limit: int,
        **kwargs
    ) -> None:
        """Kota olayı logla."""
        event = SecurityEvent(
            event_type=event_type,
            severity=SecurityEventSeverity.WARNING,
            user_id=user_id,
            details={
                "quota_type": quota_type,
                "current": current,
                "limit": limit,
                "percentage": round(current / limit * 100, 2) if limit > 0 else 0
            },
            **kwargs
        )
        
        self.log(event)
    
    def log_security_check(
        self,
        user_id: int,
        passed: bool,
        checks_performed: List[str],
        duration_ms: float,
        **kwargs
    ) -> None:
        """Güvenlik kontrolü sonucu logla."""
        event = SecurityEvent(
            event_type=SecurityEventType.SECURITY_CHECK_PASSED if passed else SecurityEventType.SECURITY_CHECK_FAILED,
            severity=SecurityEventSeverity.INFO if passed else SecurityEventSeverity.WARNING,
            user_id=user_id,
            details={
                "checks_performed": checks_performed,
                "duration_ms": duration_ms,
                "result": "passed" if passed else "failed"
            },
            **kwargs
        )
        
        self.log(event)
    
    # =========================================================================
    # FILE OPERATIONS
    # =========================================================================
    
    def _write_to_file(self, event: SecurityEvent) -> None:
        """Dosyaya yaz."""
        today = datetime.utcnow().strftime("%Y-%m-%d")
        log_file = self.log_dir / f"security_{today}.jsonl"
        
        try:
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(event.to_json() + '\n')
        except Exception as e:
            logger.error(f"Failed to write security log: {e}")
    
    def _write_to_console(self, event: SecurityEvent) -> None:
        """Konsola yaz."""
        log_msg = f"[SECURITY] [{event.severity.value.upper()}] {event.event_type.value}"
        
        if event.user_id:
            log_msg += f" | user:{event.user_id}"
        
        if event.threat_level:
            log_msg += f" | threat_level:{event.threat_level}"
        
        if event.blocked:
            log_msg += " | BLOCKED"
        
        if event.severity == SecurityEventSeverity.CRITICAL:
            logger.critical(log_msg)
        elif event.severity == SecurityEventSeverity.ERROR:
            logger.error(log_msg)
        elif event.severity == SecurityEventSeverity.WARNING:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)
    
    # =========================================================================
    # SEARCH & FORENSICS
    # =========================================================================
    
    def search(
        self,
        user_id: int = None,
        event_type: SecurityEventType = None,
        severity: SecurityEventSeverity = None,
        start_date: datetime = None,
        end_date: datetime = None,
        blocked_only: bool = False,
        limit: int = 100
    ) -> List[SecurityEvent]:
        """Güvenlik olaylarını ara."""
        results = []
        
        # Tarih aralığı belirle
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=7)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Log dosyalarını tara
        current = start_date
        while current <= end_date:
            log_file = self.log_dir / f"security_{current.strftime('%Y-%m-%d')}.jsonl"
            
            if log_file.exists():
                try:
                    with open(log_file, 'r', encoding='utf-8') as f:
                        for line in f:
                            if len(results) >= limit:
                                break
                            
                            try:
                                data = json.loads(line)
                                
                                # Filtrele
                                if user_id and data.get('user_id') != user_id:
                                    continue
                                if event_type and data.get('event_type') != event_type.value:
                                    continue
                                if severity and data.get('severity') != severity.value:
                                    continue
                                if blocked_only and not data.get('blocked'):
                                    continue
                                
                                results.append(self._dict_to_event(data))
                            except json.JSONDecodeError:
                                continue
                
                except Exception as e:
                    logger.error(f"Error reading log file {log_file}: {e}")
            
            current += timedelta(days=1)
        
        return results
    
    def get_user_history(
        self,
        user_id: int,
        days: int = 30,
        limit: int = 100
    ) -> List[SecurityEvent]:
        """Kullanıcı güvenlik geçmişi."""
        return self.search(
            user_id=user_id,
            start_date=datetime.utcnow() - timedelta(days=days),
            limit=limit
        )
    
    def get_recent_threats(
        self,
        hours: int = 24,
        min_threat_level: int = 2,
        limit: int = 50
    ) -> List[SecurityEvent]:
        """Son tehditleri getir."""
        events = self.search(
            start_date=datetime.utcnow() - timedelta(hours=hours),
            limit=limit * 2  # Filtreleme için fazla al
        )
        
        return [
            e for e in events
            if e.threat_level and e.threat_level >= min_threat_level
        ][:limit]
    
    def get_statistics(
        self,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> Dict[str, Any]:
        """Güvenlik istatistikleri."""
        events = self.search(
            start_date=start_date or datetime.utcnow() - timedelta(days=7),
            end_date=end_date,
            limit=10000
        )
        
        stats = {
            "total_events": len(events),
            "by_type": {},
            "by_severity": {},
            "blocked_count": 0,
            "unique_users": set(),
            "threat_levels": {1: 0, 2: 0, 3: 0, 4: 0}
        }
        
        for event in events:
            # By type
            type_key = event.event_type.value if event.event_type else "unknown"
            stats["by_type"][type_key] = stats["by_type"].get(type_key, 0) + 1
            
            # By severity
            sev_key = event.severity.value if event.severity else "unknown"
            stats["by_severity"][sev_key] = stats["by_severity"].get(sev_key, 0) + 1
            
            # Blocked
            if event.blocked:
                stats["blocked_count"] += 1
            
            # Users
            if event.user_id:
                stats["unique_users"].add(event.user_id)
            
            # Threat levels
            if event.threat_level:
                stats["threat_levels"][min(event.threat_level, 4)] += 1
        
        stats["unique_users"] = len(stats["unique_users"])
        
        return stats
    
    # =========================================================================
    # ALERTING
    # =========================================================================
    
    def add_alert_callback(self, callback: callable) -> None:
        """Alert callback ekle."""
        self._alert_callbacks.append(callback)
    
    def _trigger_alerts(self, event: SecurityEvent) -> None:
        """Alert'leri tetikle."""
        for callback in self._alert_callbacks:
            try:
                callback(event)
            except Exception as e:
                logger.error(f"Alert callback error: {e}")
    
    # =========================================================================
    # HELPERS
    # =========================================================================
    
    def _hash_content(self, content: str) -> str:
        """İçeriği hashle."""
        if not content:
            return None
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _preview_content(self, content: str, max_length: int = 100) -> str:
        """İçerik önizlemesi (maskelenmiş)."""
        if not content:
            return None
        
        preview = content[:max_length]
        
        # PII'ları maskele
        import re
        preview = re.sub(r'\b\d{11}\b', '[TC]', preview)  # TC
        preview = re.sub(r'\b\d{16}\b', '[CARD]', preview)  # Kart
        preview = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', preview)
        
        if len(content) > max_length:
            preview += "..."
        
        return preview
    
    def _dict_to_event(self, data: Dict) -> SecurityEvent:
        """Dict'i SecurityEvent'e dönüştür."""
        return SecurityEvent(
            event_type=SecurityEventType(data.get('event_type')) if data.get('event_type') else None,
            severity=SecurityEventSeverity(data.get('severity')) if data.get('severity') else SecurityEventSeverity.INFO,
            user_id=data.get('user_id'),
            ip_address=data.get('ip_address'),
            timestamp=data.get('timestamp'),
            request_id=data.get('request_id'),
            threat_level=data.get('threat_level'),
            threat_category=data.get('threat_category'),
            pattern_matched=data.get('pattern_matched'),
            content_hash=data.get('content_hash'),
            content_preview=data.get('content_preview'),
            feature=data.get('feature'),
            endpoint=data.get('endpoint'),
            user_agent=data.get('user_agent'),
            action=data.get('action'),
            blocked=data.get('blocked', False),
            details=data.get('details', {})
        )
    
    # =========================================================================
    # MAINTENANCE
    # =========================================================================
    
    def cleanup_old_logs(self) -> int:
        """Eski logları temizle."""
        cutoff = datetime.utcnow() - timedelta(days=self.retention_days)
        deleted = 0
        
        for log_file in self.log_dir.glob("security_*.jsonl"):
            try:
                # Dosya adından tarihi çıkar
                date_str = log_file.stem.replace("security_", "")
                file_date = datetime.strptime(date_str, "%Y-%m-%d")
                
                if file_date < cutoff:
                    log_file.unlink()
                    deleted += 1
                    logger.info(f"Deleted old security log: {log_file.name}")
            except Exception as e:
                logger.error(f"Error cleaning up {log_file}: {e}")
        
        return deleted


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

security_audit_logger = SecurityAuditLogger()
