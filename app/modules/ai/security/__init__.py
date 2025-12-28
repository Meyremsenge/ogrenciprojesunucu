"""
AI Security Module.

Kurumsal AI güvenlik katmanı.

Bu modül şunları içerir:
- Prompt Injection Detection & Prevention
- Jailbreak Attempt Detection
- Input Sanitization & Validation
- Quota Attack Prevention
- Data Leakage Prevention (PII, secrets)
- Audit Trail & Forensics

Kullanım:
    from app.modules.ai.security import (
        ai_security_guard,
        SecurityCheckResult,
        ThreatLevel
    )
    
    # Gelen isteği kontrol et
    result = ai_security_guard.check_input(
        user_id=user_id,
        content=user_input,
        context={'feature': 'question_hint'}
    )
    
    if not result.is_safe:
        return error_response(result.message, 403)
"""

from app.modules.ai.security.constants import (
    ThreatLevel,
    ThreatCategory,
    PROMPT_INJECTION_PATTERNS,
    JAILBREAK_PATTERNS,
    PII_PATTERNS,
    SECURITY_THRESHOLDS
)

from app.modules.ai.security.detector import (
    PromptInjectionDetector,
    JailbreakDetector,
    PIIDetector,
    ThreatDetectionResult
)

from app.modules.ai.security.sanitizer import (
    InputSanitizer,
    OutputSanitizer,
    SanitizationResult
)

from app.modules.ai.security.guard import (
    AISecurityGuard,
    SecurityCheckResult,
    ai_security_guard,
    security_check
)

from app.modules.ai.security.audit import (
    SecurityAuditLogger,
    SecurityEvent,
    security_audit_logger
)

from app.modules.ai.security.authorization import (
    AIFeature,
    AIAccessLevel,
    AIAccessChecker,
    get_ai_access_summary,
    require_ai_access
)

__all__ = [
    # Constants
    'ThreatLevel',
    'ThreatCategory',
    'PROMPT_INJECTION_PATTERNS',
    'JAILBREAK_PATTERNS',
    'PII_PATTERNS',
    'SECURITY_THRESHOLDS',
    
    # Detectors
    'PromptInjectionDetector',
    'JailbreakDetector',
    'PIIDetector',
    'ThreatDetectionResult',
    
    # Sanitizers
    'InputSanitizer',
    'OutputSanitizer',
    'SanitizationResult',
    
    # Main Guard
    'AISecurityGuard',
    'SecurityCheckResult',
    'ai_security_guard',
    'security_check',
    
    # Audit
    'SecurityAuditLogger',
    'SecurityEvent',
    'security_audit_logger',
    
    # Authorization
    'AIFeature',
    'AIAccessLevel',
    'AIAccessChecker',
    'get_ai_access_summary',
    'require_ai_access',
]
