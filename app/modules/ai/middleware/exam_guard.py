"""
AI Middleware - Exam Guard.

Sınav sürecinde AI erişimini engeller.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from functools import wraps

from flask import request, g
from flask_jwt_extended import get_jwt_identity

logger = logging.getLogger(__name__)


# =============================================================================
# EXCEPTIONS
# =============================================================================

class AIAccessDeniedError(Exception):
    """AI erişimi reddedildi hatası."""
    
    def __init__(self, message: str, error_code: str = "ACCESS_DENIED"):
        self.message = message
        self.error_code = error_code
        super().__init__(message)


# =============================================================================
# EXAM CONTEXT
# =============================================================================

@dataclass
class ExamContext:
    """Aktif sınav bağlamı."""
    exam_id: int
    exam_title: str
    user_id: int
    started_at: datetime
    time_limit_minutes: int
    is_active: bool
    
    @property
    def remaining_minutes(self) -> int:
        """Kalan süre (dakika)."""
        if not self.is_active:
            return 0
        elapsed = datetime.utcnow() - self.started_at
        remaining = self.time_limit_minutes - (elapsed.total_seconds() / 60)
        return max(0, int(remaining))
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "exam_id": self.exam_id,
            "exam_title": self.exam_title,
            "started_at": self.started_at.isoformat(),
            "time_limit_minutes": self.time_limit_minutes,
            "remaining_minutes": self.remaining_minutes,
            "is_active": self.is_active
        }


# =============================================================================
# EXAM GUARD
# =============================================================================

class ExamGuard:
    """
    Sınav sürecinde AI erişimini engelleyen guard.
    
    Özellikler:
    - Aktif sınav tespiti
    - Grace period (sınav bitiminden sonra kısa bekleme)
    - Whitelist (bazı AI özellikleri sınavda açık olabilir)
    - Audit logging
    """
    
    # Sınav bitiminden sonra AI'a erişim için bekleme süresi (dakika)
    POST_EXAM_GRACE_PERIOD = 5
    
    # Sınavda izin verilen AI özellikleri (boş = hiçbiri)
    EXAM_WHITELISTED_FEATURES: List[str] = []
    
    def __init__(self):
        self._audit_logger = None
    
    def get_active_exam(self, user_id: int) -> Optional[ExamContext]:
        """
        Kullanıcının aktif sınavını al.
        
        Args:
            user_id: Kullanıcı ID
            
        Returns:
            ExamContext veya None
        """
        try:
            # Lazy import to avoid circular imports
            from app.models.exam import ExamAttempt
            
            # Aktif sınav kontrolü
            active_attempt = ExamAttempt.query.filter(
                ExamAttempt.user_id == user_id,
                ExamAttempt.status == 'in_progress'
            ).first()
            
            if active_attempt:
                return ExamContext(
                    exam_id=active_attempt.exam_id,
                    exam_title=active_attempt.exam.title if active_attempt.exam else "Unknown",
                    user_id=user_id,
                    started_at=active_attempt.started_at,
                    time_limit_minutes=active_attempt.exam.time_limit if active_attempt.exam else 60,
                    is_active=True
                )
            
            # Son tamamlanan sınav (grace period kontrolü)
            recent_attempt = ExamAttempt.query.filter(
                ExamAttempt.user_id == user_id,
                ExamAttempt.status == 'completed',
                ExamAttempt.completed_at > datetime.utcnow() - timedelta(minutes=self.POST_EXAM_GRACE_PERIOD)
            ).first()
            
            if recent_attempt:
                return ExamContext(
                    exam_id=recent_attempt.exam_id,
                    exam_title=recent_attempt.exam.title if recent_attempt.exam else "Unknown",
                    user_id=user_id,
                    started_at=recent_attempt.started_at,
                    time_limit_minutes=self.POST_EXAM_GRACE_PERIOD,
                    is_active=False  # Grace period'da
                )
            
            return None
            
        except Exception as e:
            logger.warning(f"Error checking exam context: {e}")
            return None
    
    def check_exam_context(
        self,
        user_id: int,
        feature: str = None,
        raise_on_block: bool = True
    ) -> Dict[str, Any]:
        """
        Kullanıcının sınav bağlamını kontrol et.
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği (whitelist kontrolü için)
            raise_on_block: Engelleme durumunda exception at
            
        Returns:
            Kontrol sonucu
            
        Raises:
            AIAccessDeniedError: Sınav sürecinde AI erişimi engellendiyse
        """
        result = {
            "allowed": True,
            "in_exam": False,
            "exam_context": None,
            "reason": None
        }
        
        exam_context = self.get_active_exam(user_id)
        
        if not exam_context:
            return result
        
        result["in_exam"] = True
        result["exam_context"] = exam_context.to_dict()
        
        # Whitelist kontrolü
        if feature and feature in self.EXAM_WHITELISTED_FEATURES:
            result["reason"] = f"Feature '{feature}' is whitelisted for exams"
            return result
        
        # Sınav aktif mi?
        if exam_context.is_active:
            result["allowed"] = False
            result["reason"] = "Sınav süresince AI asistan kullanılamaz."
            
            self._log_blocked_access(user_id, exam_context, "active_exam")
            
            if raise_on_block:
                raise AIAccessDeniedError(
                    message=result["reason"],
                    error_code="EXAM_IN_PROGRESS"
                )
        else:
            # Grace period
            result["allowed"] = False
            result["reason"] = f"Sınav tamamlandıktan sonra {self.POST_EXAM_GRACE_PERIOD} dakika beklemeniz gerekiyor."
            
            self._log_blocked_access(user_id, exam_context, "grace_period")
            
            if raise_on_block:
                raise AIAccessDeniedError(
                    message=result["reason"],
                    error_code="EXAM_GRACE_PERIOD"
                )
        
        return result
    
    def _log_blocked_access(
        self,
        user_id: int,
        exam_context: ExamContext,
        block_reason: str
    ) -> None:
        """Engellenen erişimi logla."""
        logger.warning(
            f"AI access blocked during exam: user={user_id}, "
            f"exam={exam_context.exam_id}, reason={block_reason}"
        )
        
        # Security audit log
        try:
            from app.modules.ai.security.audit import security_audit_logger, SecurityEventType
            security_audit_logger.log_info(
                event_type=SecurityEventType.SECURITY_CHECK_FAILED,
                user_id=user_id,
                details={
                    "reason": block_reason,
                    "exam_id": exam_context.exam_id,
                    "exam_title": exam_context.exam_title
                }
            )
        except Exception:
            pass
    
    def is_allowed(self, user_id: int, feature: str = None) -> bool:
        """
        AI erişimi izinli mi? (Exception atmaz)
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            
        Returns:
            True/False
        """
        result = self.check_exam_context(user_id, feature, raise_on_block=False)
        return result["allowed"]


# =============================================================================
# DECORATOR
# =============================================================================

def exam_guard_required(feature: str = None):
    """
    Sınav koruma decorator'ı.
    
    Kullanım:
        @exam_guard_required(feature='question_hint')
        def get_hint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            if user_id:
                exam_guard.check_exam_context(user_id, feature)
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# =============================================================================
# SINGLETON
# =============================================================================

exam_guard = ExamGuard()
