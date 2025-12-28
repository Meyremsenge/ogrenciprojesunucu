"""
AI Security - Security Guard.

Ana güvenlik katmanı - tüm kontrolleri tek bir arayüzde birleştirir.
"""

import time
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from functools import wraps

from flask import request, g

from app.modules.ai.security.constants import (
    ThreatLevel,
    ThreatCategory,
    SECURITY_THRESHOLDS
)
from app.modules.ai.security.detector import (
    PromptInjectionDetector,
    JailbreakDetector,
    PIIDetector,
    QuotaAttackDetector,
    ThreatDetectionResult,
    MultiThreatResult
)
from app.modules.ai.security.sanitizer import (
    InputSanitizer,
    OutputSanitizer,
    SanitizationResult
)
from app.modules.ai.security.audit import (
    SecurityAuditLogger,
    SecurityEvent,
    SecurityEventType,
    SecurityEventSeverity,
    security_audit_logger
)


logger = logging.getLogger(__name__)


# =============================================================================
# SECURITY CHECK RESULT
# =============================================================================

@dataclass
class SecurityCheckResult:
    """Güvenlik kontrol sonucu."""
    is_safe: bool = True
    blocked: bool = False
    message: Optional[str] = None
    threat_level: ThreatLevel = ThreatLevel.NONE
    threats_detected: List[ThreatDetectionResult] = field(default_factory=list)
    sanitized_input: Optional[str] = None
    sanitization_result: Optional[SanitizationResult] = None
    check_duration_ms: float = 0.0
    checks_performed: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Dict'e dönüştür."""
        return {
            "is_safe": self.is_safe,
            "blocked": self.blocked,
            "message": self.message,
            "threat_level": self.threat_level.name if self.threat_level else None,
            "threat_count": len(self.threats_detected),
            "check_duration_ms": round(self.check_duration_ms, 2),
            "checks_performed": self.checks_performed,
            "warnings": self.warnings
        }


# =============================================================================
# AI SECURITY GUARD
# =============================================================================

class AISecurityGuard:
    """
    Ana güvenlik bekçisi.
    
    Tüm güvenlik kontrollerini tek bir arayüzde birleştirir:
    - Prompt injection detection
    - Jailbreak detection
    - PII detection & masking
    - Quota attack detection
    - Input/Output sanitization
    - Audit logging
    
    Kullanım:
        result = ai_security_guard.check_input(
            user_id=user_id,
            content=user_input,
            context={'feature': 'question_hint'}
        )
        
        if not result.is_safe:
            return error_response(result.message, 403)
        
        # Temizlenmiş girdiyi kullan
        clean_input = result.sanitized_input
    """
    
    def __init__(
        self,
        block_threshold: ThreatLevel = None,
        enable_logging: bool = True,
        enable_sanitization: bool = True,
        redis_client=None
    ):
        """
        Args:
            block_threshold: Bu seviye ve üstü engellenir
            enable_logging: Audit loglama
            enable_sanitization: Girdi temizleme
            redis_client: Redis client (opsiyonel)
        """
        self.block_threshold = block_threshold or ThreatLevel(SECURITY_THRESHOLDS["block_threshold"])
        self.enable_logging = enable_logging
        self.enable_sanitization = enable_sanitization
        
        # Detektörler
        self.injection_detector = PromptInjectionDetector()
        self.jailbreak_detector = JailbreakDetector()
        self.pii_detector = PIIDetector()
        self.quota_detector = QuotaAttackDetector(redis_client)
        
        # Sanitizers
        self.input_sanitizer = InputSanitizer()
        self.output_sanitizer = OutputSanitizer()
        
        # Audit logger
        self.audit_logger = security_audit_logger
        
        # User tracking (in-memory, Redis'e taşınabilir)
        self._user_violations: Dict[int, List[Dict]] = {}
        self._blocked_users: Dict[int, datetime] = {}
    
    # =========================================================================
    # MAIN CHECK METHODS
    # =========================================================================
    
    def check_input(
        self,
        user_id: int,
        content: str,
        context: Dict[str, Any] = None,
        ip_address: str = None
    ) -> SecurityCheckResult:
        """
        Kullanıcı girdisini kontrol et.
        
        Args:
            user_id: Kullanıcı ID
            content: Kontrol edilecek içerik
            context: Bağlam bilgisi (feature, endpoint vb.)
            ip_address: IP adresi
            
        Returns:
            SecurityCheckResult
        """
        start_time = time.time()
        result = SecurityCheckResult()
        context = context or {}
        
        try:
            # 0. Blocked user kontrolü
            if self._is_user_blocked(user_id):
                result.is_safe = False
                result.blocked = True
                result.message = "Hesabınız güvenlik nedeniyle geçici olarak engellenmiştir"
                result.threat_level = ThreatLevel.CRITICAL
                self._log_blocked_access(user_id, context)
                return result
            
            # 1. Input sanitization
            if self.enable_sanitization:
                san_result = self.input_sanitizer.sanitize(content)
                result.sanitized_input = san_result.sanitized
                result.sanitization_result = san_result
                result.checks_performed.append("input_sanitization")
                
                if not san_result.is_safe:
                    result.warnings.extend(san_result.warnings)
                
                # Sanitize edilmiş içeriği kullan
                content_to_check = san_result.sanitized
            else:
                content_to_check = content
                result.sanitized_input = content
            
            # 2. Prompt Injection detection
            injection_result = self.injection_detector.detect(content_to_check)
            result.checks_performed.append("prompt_injection")
            
            if injection_result.is_threat:
                result.threats_detected.append(injection_result)
                if injection_result.threat_level > result.threat_level:
                    result.threat_level = injection_result.threat_level
            
            # 3. Jailbreak detection
            jailbreak_result = self.jailbreak_detector.detect(content_to_check)
            result.checks_performed.append("jailbreak_detection")
            
            if jailbreak_result.is_threat:
                result.threats_detected.append(jailbreak_result)
                if jailbreak_result.threat_level > result.threat_level:
                    result.threat_level = jailbreak_result.threat_level
            
            # 4. PII detection
            pii_result = self.pii_detector.detect(content_to_check)
            result.checks_performed.append("pii_detection")
            
            if pii_result.threats:
                result.threats_detected.extend(pii_result.threats)
                if pii_result.highest_level > result.threat_level:
                    result.threat_level = pii_result.highest_level
                
                # PII varsa maskele
                if self.enable_sanitization:
                    result.sanitized_input = self.pii_detector.mask_pii(content_to_check)
            
            # 5. Quota attack detection
            quota_result = self.quota_detector.detect(user_id, content_to_check, ip_address)
            result.checks_performed.append("quota_attack_detection")
            
            if quota_result.is_threat:
                result.threats_detected.append(quota_result)
                if quota_result.threat_level > result.threat_level:
                    result.threat_level = quota_result.threat_level
            
            # 6. Sonuç değerlendirmesi
            if result.threat_level >= self.block_threshold:
                result.is_safe = False
                result.blocked = True
                result.message = self._get_block_message(result.threats_detected)
                
                # Violation kaydet
                self._record_violation(user_id, result)
            elif result.threats_detected:
                result.is_safe = True
                result.blocked = False
                result.warnings.append(f"{len(result.threats_detected)} potansiyel tehdit tespit edildi")
            else:
                result.is_safe = True
            
        except Exception as e:
            logger.error(f"Security check error: {e}")
            # Hata durumunda güvenli tarafa geç
            result.is_safe = True
            result.sanitized_input = content
            result.warnings.append("Güvenlik kontrolü sırasında hata oluştu")
        
        finally:
            result.check_duration_ms = (time.time() - start_time) * 1000
            
            # Audit log
            if self.enable_logging:
                self._log_security_check(user_id, result, context, ip_address)
        
        return result
    
    def check_output(
        self,
        user_id: int,
        content: str,
        context: Dict[str, Any] = None
    ) -> SanitizationResult:
        """
        AI çıktısını kontrol et ve temizle.
        
        Args:
            user_id: Kullanıcı ID
            content: AI çıktısı
            context: Bağlam (system_prompt dahil olabilir)
            
        Returns:
            SanitizationResult
        """
        result = self.output_sanitizer.sanitize(content, context)
        
        if self.enable_logging and result.changes_made:
            self.audit_logger.log(SecurityEvent(
                event_type=SecurityEventType.OUTPUT_SANITIZED,
                severity=SecurityEventSeverity.INFO,
                user_id=user_id,
                details={
                    "changes": result.changes_made,
                    "items_masked": result.items_masked
                }
            ))
        
        return result
    
    # =========================================================================
    # USER BLOCKING
    # =========================================================================
    
    def _is_user_blocked(self, user_id: int) -> bool:
        """Kullanıcı engellenmiş mi?"""
        if user_id in self._blocked_users:
            blocked_until = self._blocked_users[user_id]
            if datetime.utcnow() < blocked_until:
                return True
            else:
                # Engel süresi doldu
                del self._blocked_users[user_id]
                self._log_user_unblocked(user_id)
        return False
    
    def block_user(self, user_id: int, duration_hours: int = 1, reason: str = None) -> None:
        """Kullanıcıyı engelle."""
        until = datetime.utcnow() + timedelta(hours=duration_hours)
        self._blocked_users[user_id] = until
        
        if self.enable_logging:
            self.audit_logger.log(SecurityEvent(
                event_type=SecurityEventType.USER_BLOCKED,
                severity=SecurityEventSeverity.WARNING,
                user_id=user_id,
                blocked=True,
                details={
                    "duration_hours": duration_hours,
                    "blocked_until": until.isoformat(),
                    "reason": reason
                }
            ))
        
        logger.warning(f"User {user_id} blocked until {until}")
    
    def unblock_user(self, user_id: int) -> bool:
        """Kullanıcı engelini kaldır."""
        if user_id in self._blocked_users:
            del self._blocked_users[user_id]
            self._log_user_unblocked(user_id)
            return True
        return False
    
    def _record_violation(self, user_id: int, result: SecurityCheckResult) -> None:
        """Violation kaydet ve gerekirse engelle."""
        if user_id not in self._user_violations:
            self._user_violations[user_id] = []
        
        violation = {
            "timestamp": datetime.utcnow(),
            "threat_level": result.threat_level,
            "threats": [t.pattern_name for t in result.threats_detected]
        }
        
        self._user_violations[user_id].append(violation)
        
        # Son 1 saatteki violation'ları say
        cutoff = datetime.utcnow() - timedelta(hours=1)
        recent = [v for v in self._user_violations[user_id] if v["timestamp"] > cutoff]
        self._user_violations[user_id] = recent  # Temizlik
        
        # Eşik aşıldıysa engelle
        max_violations = SECURITY_THRESHOLDS.get("max_suspicious_requests", 10)
        if len(recent) >= max_violations:
            # Severity'ye göre engel süresi
            if result.threat_level >= ThreatLevel.CRITICAL:
                duration = 24
            elif result.threat_level >= ThreatLevel.HIGH:
                duration = 6
            else:
                duration = 1
            
            self.block_user(user_id, duration, f"Too many violations: {len(recent)}")
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _get_block_message(self, threats: List[ThreatDetectionResult]) -> str:
        """Engelleme mesajı oluştur."""
        if not threats:
            return "Güvenlik kontrolü başarısız oldu"
        
        # En ciddi tehdide göre mesaj
        highest = max(threats, key=lambda t: t.threat_level)
        
        messages = {
            ThreatCategory.PROMPT_INJECTION: "İçerik güvenlik politikalarını ihlal ediyor",
            ThreatCategory.JAILBREAK: "Sistem güvenlik kurallarını atlatma girişimi tespit edildi",
            ThreatCategory.PII_LEAKAGE: "Kişisel veri güvenliği nedeniyle istek reddedildi",
            ThreatCategory.SECRET_EXPOSURE: "Hassas bilgi sızıntısı önlendi",
            ThreatCategory.QUOTA_ATTACK: "Anormal istek paterni tespit edildi",
            ThreatCategory.BOT_BEHAVIOR: "Otomatik istek davranışı tespit edildi"
        }
        
        return messages.get(highest.category, "Güvenlik kontrolü başarısız oldu")
    
    # =========================================================================
    # LOGGING HELPERS
    # =========================================================================
    
    def _log_security_check(
        self,
        user_id: int,
        result: SecurityCheckResult,
        context: Dict,
        ip_address: str
    ) -> None:
        """Güvenlik kontrolünü logla."""
        # Detaylı tehdit logları
        for threat in result.threats_detected:
            event_type = self._threat_to_event_type(threat.category)
            
            self.audit_logger.log_threat(
                event_type=event_type,
                user_id=user_id,
                threat_level=threat.threat_level,
                threat_category=threat.category.value if threat.category else "unknown",
                content=result.sanitized_input,
                blocked=result.blocked,
                ip_address=ip_address,
                feature=context.get("feature"),
                endpoint=context.get("endpoint"),
                pattern_matched=threat.pattern_name
            )
        
        # Genel kontrol logu
        self.audit_logger.log_security_check(
            user_id=user_id,
            passed=result.is_safe,
            checks_performed=result.checks_performed,
            duration_ms=result.check_duration_ms,
            ip_address=ip_address,
            feature=context.get("feature")
        )
    
    def _log_blocked_access(self, user_id: int, context: Dict) -> None:
        """Engelli kullanıcı erişim girişimi."""
        self.audit_logger.log(SecurityEvent(
            event_type=SecurityEventType.SECURITY_CHECK_FAILED,
            severity=SecurityEventSeverity.WARNING,
            user_id=user_id,
            blocked=True,
            action="access_denied",
            details={"reason": "user_blocked", "context": context}
        ))
    
    def _log_user_unblocked(self, user_id: int) -> None:
        """Kullanıcı engeli kalktı."""
        self.audit_logger.log(SecurityEvent(
            event_type=SecurityEventType.USER_UNBLOCKED,
            severity=SecurityEventSeverity.INFO,
            user_id=user_id,
            details={"action": "auto_unblock"}
        ))
    
    def _threat_to_event_type(self, category: ThreatCategory) -> SecurityEventType:
        """ThreatCategory'yi SecurityEventType'a dönüştür."""
        mapping = {
            ThreatCategory.PROMPT_INJECTION: SecurityEventType.PROMPT_INJECTION_DETECTED,
            ThreatCategory.JAILBREAK: SecurityEventType.JAILBREAK_ATTEMPT,
            ThreatCategory.PII_LEAKAGE: SecurityEventType.PII_DETECTED,
            ThreatCategory.SECRET_EXPOSURE: SecurityEventType.SECRET_EXPOSED,
            ThreatCategory.BANNED_CONTENT: SecurityEventType.BANNED_CONTENT,
            ThreatCategory.QUOTA_ATTACK: SecurityEventType.QUOTA_ATTACK,
            ThreatCategory.BOT_BEHAVIOR: SecurityEventType.BOT_BEHAVIOR,
        }
        return mapping.get(category, SecurityEventType.SUSPICIOUS_PATTERN)
    
    # =========================================================================
    # STATISTICS
    # =========================================================================
    
    def get_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Güvenlik istatistikleri."""
        stats = self.audit_logger.get_statistics(
            start_date=datetime.utcnow() - timedelta(hours=hours)
        )
        
        stats["currently_blocked_users"] = len(self._blocked_users)
        stats["users_with_violations"] = len(self._user_violations)
        
        return stats
    
    def get_blocked_users(self) -> Dict[int, str]:
        """Engellenmiş kullanıcıları getir."""
        return {
            user_id: until.isoformat()
            for user_id, until in self._blocked_users.items()
        }


# =============================================================================
# DECORATOR
# =============================================================================

def security_check(feature: str = None):
    """
    Flask route için güvenlik kontrolü decorator'ı.
    
    Kullanım:
        @ai_bp.route('/hint', methods=['POST'])
        @security_check(feature='question_hint')
        def get_hint():
            # g.sanitized_input temizlenmiş girdiyi içerir
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            from flask import request, g
            from app.core.responses import error_response
            
            # Request body'den içerik al
            data = request.get_json() or {}
            content = data.get('question_text') or data.get('topic') or data.get('content') or ''
            
            # User ID (JWT'den)
            user_id = getattr(g, 'user_id', None) or 0
            
            # Güvenlik kontrolü
            result = ai_security_guard.check_input(
                user_id=user_id,
                content=content,
                context={
                    'feature': feature,
                    'endpoint': request.endpoint,
                    'method': request.method
                },
                ip_address=request.remote_addr
            )
            
            if not result.is_safe:
                return error_response(
                    message=result.message,
                    status_code=403,
                    data={'security': result.to_dict()}
                )
            
            # Temizlenmiş veriyi g'ye ekle
            g.sanitized_input = result.sanitized_input
            g.security_result = result
            
            return f(*args, **kwargs)
        
        return wrapper
    return decorator


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

ai_security_guard = AISecurityGuard()
