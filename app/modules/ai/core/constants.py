"""
AI Core - Constants.

AI modülü için sabit değerler.
"""

from enum import Enum
from typing import Dict, Any


# =============================================================================
# TOKEN MALİYETLERİ
# =============================================================================

TOKEN_COSTS: Dict[str, int] = {
    "question_hint": 100,
    "topic_explanation": 300,
    "study_plan": 500,
    "answer_evaluation": 400,
    "performance_analysis": 600,
    "question_generation": 350,
    "content_enhancement": 450,
    "class_performance": 500,
    "usage_analytics": 200,
    "motivation_message": 50,
}


# =============================================================================
# ROL BAZLI KOTA LİMİTLERİ
# =============================================================================

QUOTA_LIMITS: Dict[str, Dict[str, Any]] = {
    "student": {
        "daily_tokens": 1000,
        "monthly_tokens": 20000,
        "daily_requests": 20,
        "monthly_requests": 400,
        "max_tokens_per_request": 200,
        "cooldown_seconds": 30,
        "features": [
            "question_hint",
            "topic_explanation",
            "study_plan",
            "performance_analysis",
            "motivation_message"
        ]
    },
    "teacher": {
        "daily_tokens": 5000,
        "monthly_tokens": 100000,
        "daily_requests": 100,
        "monthly_requests": 2000,
        "max_tokens_per_request": 500,
        "cooldown_seconds": 10,
        "features": [
            "question_hint",
            "topic_explanation",
            "study_plan",
            "performance_analysis",
            "question_generation",
            "answer_evaluation",
            "content_enhancement",
            "class_performance",
            "motivation_message"
        ]
    },
    "admin": {
        "daily_tokens": 20000,
        "monthly_tokens": 500000,
        "daily_requests": 500,
        "monthly_requests": 10000,
        "max_tokens_per_request": 1000,
        "cooldown_seconds": 5,
        "features": "*"
    },
    "super_admin": {
        "daily_tokens": -1,
        "monthly_tokens": -1,
        "daily_requests": -1,
        "monthly_requests": -1,
        "max_tokens_per_request": -1,
        "cooldown_seconds": 0,
        "features": "*"
    }
}


# =============================================================================
# ABUSE TESPİT PARAMETRELERİ
# =============================================================================

class AbuseSeverity(int, Enum):
    """Abuse ciddiyet seviyeleri."""
    WARNING = 1
    MINOR = 2
    MAJOR = 3
    CRITICAL = 4


ABUSE_THRESHOLDS = {
    "max_requests_per_minute": 30,
    "max_requests_per_hour": 200,
    "max_identical_requests": 5,
    "min_request_interval_ms": 500,
    "max_violations_before_block": 5,
    "block_duration_hours": {
        AbuseSeverity.WARNING: 0,
        AbuseSeverity.MINOR: 1,
        AbuseSeverity.MAJOR: 24,
        AbuseSeverity.CRITICAL: 168,  # 7 gün
    }
}


# =============================================================================
# İÇERİK FİLTRELEME
# =============================================================================

BANNED_PATTERNS = [
    "intihar", "kendine zarar", "şiddet", "silah",
    "uyuşturucu", "yasadışı", "hack", "şifre kır",
    "bomba", "terör", "ırkçılık", "nefret"
]

REDIRECT_TOPICS = {
    "psikoloji": "Bu konuda size yardımcı olabilecek bir uzmanla görüşmenizi öneririz.",
    "depresyon": "Ruh sağlığı konularında profesyonel destek almanızı öneririz.",
    "anksiyete": "Bu durumla ilgili bir uzmana danışmanızı tavsiye ederiz.",
    "tıbbi": "Sağlık konularında bir sağlık profesyoneline danışmanız gerekir.",
    "ilaç": "İlaç kullanımı hakkında doktorunuza danışın.",
    "hukuki": "Yasal konularda bir hukuk danışmanına başvurmanız önerilir.",
    "avukat": "Hukuki konularda profesyonel destek almanızı öneririz."
}


# =============================================================================
# PROVIDER AYARLARI
# =============================================================================

PROVIDER_DEFAULTS = {
    "mock": {
        "delay_min": 0.3,
        "delay_max": 1.0,
        "simulate_errors": False,
        "error_rate": 0.0
    },
    "openai": {
        "model": "gpt-4o-mini",
        "max_tokens": 1000,
        "temperature": 0.7,
        "timeout_seconds": 30,
        "retry_attempts": 3,
        "retry_delay": 1.0
    },
    "azure": {
        "api_version": "2024-02-15-preview",
        "max_tokens": 1000,
        "temperature": 0.7,
        "timeout_seconds": 30
    }
}


# =============================================================================
# CIRCUIT BREAKER AYARLARI
# =============================================================================

CIRCUIT_BREAKER_CONFIG = {
    "failure_threshold": 5,
    "success_threshold": 2,
    "timeout_seconds": 60,
    "half_open_requests": 3
}


# =============================================================================
# CACHE AYARLARI
# =============================================================================

CACHE_CONFIG = {
    "enabled": True,
    "default_ttl": 3600,  # 1 saat
    "feature_ttl": {
        "question_hint": 1800,
        "topic_explanation": 3600,
        "study_plan": 7200,
        "question_generation": 3600
    }
}


# =============================================================================
# REDİS KEY PREFİXLERİ
# =============================================================================

REDIS_KEYS = {
    "quota_daily": "ai:quota:user:{user_id}:daily",
    "quota_monthly": "ai:quota:user:{user_id}:monthly",
    "rate_limit": "ai:rate:user:{user_id}",
    "abuse_violations": "ai:abuse:user:{user_id}:violations",
    "abuse_blocked": "ai:abuse:user:{user_id}:blocked",
    "cache_response": "ai:cache:response:{hash}",
    "circuit_breaker": "ai:circuit:{provider}",
    "provider_health": "ai:health:{provider}"
}
