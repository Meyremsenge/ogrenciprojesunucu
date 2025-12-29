"""
AI Security - Constants.

Güvenlik modülü için sabit değerler ve tehdit tanımlamaları.
"""

from enum import Enum, IntEnum
from typing import Dict, List, Pattern
import re


# =============================================================================
# THREAT LEVELS
# =============================================================================

class ThreatLevel(IntEnum):
    """Tehdit seviyesi."""
    NONE = 0
    LOW = 1       # Şüpheli ama zararsız olabilir
    MEDIUM = 2    # Muhtemelen kötü niyetli
    HIGH = 3      # Kesinlikle kötü niyetli
    CRITICAL = 4  # Sistemik tehdit


class ThreatCategory(str, Enum):
    """Tehdit kategorisi."""
    PROMPT_INJECTION = "prompt_injection"
    JAILBREAK = "jailbreak"
    PII_LEAKAGE = "pii_leakage"
    SECRET_EXPOSURE = "secret_exposure"
    BANNED_CONTENT = "banned_content"
    QUOTA_ATTACK = "quota_attack"
    BOT_BEHAVIOR = "bot_behavior"
    SQL_INJECTION = "sql_injection"
    XSS_ATTEMPT = "xss_attempt"
    PATH_TRAVERSAL = "path_traversal"


# =============================================================================
# PROMPT INJECTION PATTERNS
# =============================================================================

# Direct Prompt Injection - Doğrudan sistem promptunu manipüle etme
PROMPT_INJECTION_PATTERNS: Dict[str, Dict] = {
    # Yüksek Riskli - Doğrudan komut enjeksiyonu
    "ignore_instructions": {
        "patterns": [
            r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)",
            r"(?i)disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)",
            r"(?i)forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)",
            r"(?i)yukarıdaki\s+(tüm\s+)?(talimatları?|kuralları?)\s+(unut|yoksay)",
            r"(?i)önceki\s+(tüm\s+)?(talimatları?|kuralları?)\s+(unut|yoksay)",
        ],
        "level": ThreatLevel.HIGH,
        "description": "Önceki talimatları yok sayma girişimi"
    },
    
    # Role Override - Rol değiştirme
    "role_override": {
        "patterns": [
            r"(?i)you\s+are\s+(now|actually)\s+(a|an)\s+",
            r"(?i)pretend\s+(to\s+be|you\s+are)\s+",
            r"(?i)act\s+as\s+(if\s+you\s+(are|were)\s+)?",
            r"(?i)role\s*play\s+as\s+",
            r"(?i)sen\s+(artık|şimdi)\s+bir\s+",
            r"(?i)gibi\s+davran\s*$",
            r"(?i)rolünü\s+oyna",
        ],
        "level": ThreatLevel.HIGH,
        "description": "Rol değiştirme girişimi"
    },
    
    # System Prompt Extraction - Sistem promptunu çıkarma
    "system_prompt_extraction": {
        "patterns": [
            r"(?i)(print|show|display|reveal|tell)\s+(me\s+)?(your\s+)?(system\s+)?prompt",
            r"(?i)(what|show)\s+(is|are)\s+your\s+(instructions?|rules?|prompt)",
            r"(?i)repeat\s+(your\s+)?(system\s+)?(instructions?|prompt)",
            r"(?i)sistem\s+prompt[u\s]*(nedir|göster|yaz)",
            r"(?i)talimatların(ı|izi)?\s+(göster|yaz|söyle)",
            r"(?i)kuralların(ı|izi)?\s+(göster|yaz|söyle)",
        ],
        "level": ThreatLevel.HIGH,
        "description": "Sistem promptunu çıkarma girişimi"
    },
    
    # Developer Mode - Geliştirici modu açma
    "developer_mode": {
        "patterns": [
            r"(?i)(enable|activate|enter)\s+(developer|dev|debug)\s+mode",
            r"(?i)(developer|dev|debug)\s+mode\s+(on|enabled?|activate)",
            r"(?i)dan\s+mode",
            r"(?i)jailbreak\s+mode",
            r"(?i)geliştirici\s+mod(u|unu)?\s+(aç|etkinleştir)",
        ],
        "level": ThreatLevel.CRITICAL,
        "description": "Geliştirici modu açma girişimi"
    },
    
    # Delimiter Injection - Ayraç enjeksiyonu
    "delimiter_injection": {
        "patterns": [
            r"```system",
            r"\[SYSTEM\]",
            r"\[INST\]",
            r"<\|system\|>",
            r"<\|im_start\|>",
            r"<\|endoftext\|>",
            r"###\s*System",
            r"---\s*BEGIN\s*SYSTEM",
        ],
        "level": ThreatLevel.CRITICAL,
        "description": "Sistem ayracı enjeksiyonu"
    },
    
    # Indirect Injection - Dolaylı enjeksiyon
    "indirect_injection": {
        "patterns": [
            r"(?i)when\s+someone\s+asks?\s+(you\s+)?about",
            r"(?i)if\s+(anyone|someone|a\s+user)\s+asks?\s+you",
            r"(?i)respond\s+to\s+all\s+(future\s+)?questions?\s+with",
            r"(?i)from\s+now\s+on\s*,?\s*(always|you\s+(will|must|should))",
            r"(?i)bundan\s+sonra\s+(her\s+zaman|hep)",
        ],
        "level": ThreatLevel.MEDIUM,
        "description": "Dolaylı prompt enjeksiyonu"
    },
    
    # Encoding Bypass - Encoding ile atlatma
    "encoding_bypass": {
        "patterns": [
            r"(?i)base64\s*decode",
            r"(?i)hex\s*decode",
            r"(?i)rot13",
            r"(?i)unicode\s*escape",
            r"(?i)url\s*decode",
            r"\\x[0-9a-fA-F]{2}",  # Hex encoding
            r"\\u[0-9a-fA-F]{4}",  # Unicode encoding
        ],
        "level": ThreatLevel.MEDIUM,
        "description": "Encoding ile güvenlik bypass girişimi"
    },
}


# =============================================================================
# JAILBREAK PATTERNS
# =============================================================================

JAILBREAK_PATTERNS: Dict[str, Dict] = {
    # DAN Pattern - "Do Anything Now"
    "dan_pattern": {
        "patterns": [
            r"(?i)do\s+anything\s+now",
            r"(?i)\bDAN\b.*?(mode|prompt)",
            r"(?i)jailbr[ae][ae]?k",
            r"(?i)bypass\s+(restrictions?|filters?|safety)",
        ],
        "level": ThreatLevel.CRITICAL,
        "description": "DAN jailbreak girişimi"
    },
    
    # Hypothetical Scenarios - Varsayımsal senaryo
    "hypothetical": {
        "patterns": [
            r"(?i)hypothetically\s*,?\s*(if|what\s+if)",
            r"(?i)in\s+a\s+(fictional|hypothetical|imaginary)\s+(world|scenario)",
            r"(?i)let'?s?\s+(pretend|imagine|suppose)",
            r"(?i)for\s+(academic|research|educational)\s+purposes?\s+(only)?",
            r"(?i)varsayalım\s+ki",
            r"(?i)hayali\s+bir\s+senaryoda",
            r"(?i)eğitim\s+amaçlı",
        ],
        "level": ThreatLevel.MEDIUM,
        "description": "Varsayımsal senaryo ile jailbreak girişimi"
    },
    
    # Character Play - Karakter oyunu
    "character_play": {
        "patterns": [
            r"(?i)you\s+are\s+(now\s+)?playing\s+(the\s+)?(role|character)",
            r"(?i)in\s+this\s+(story|narrative|game)\s*,?\s*you\s+are",
            r"(?i)as\s+an?\s+evil\s+(version|ai|assistant)",
            r"(?i)opposite\s+(mode|day)",
            r"(?i)kötü\s+(versiyon|asistan)",
        ],
        "level": ThreatLevel.MEDIUM,
        "description": "Karakter oyunu ile jailbreak girişimi"
    },
    
    # Token Smuggling - Token kaçırma
    "token_smuggling": {
        "patterns": [
            r"s\.y\.s\.t\.e\.m",
            r"i\.g\.n\.o\.r\.e",
            r"p\.r\.o\.m\.p\.t",
            r"[iİ1l|][gğ][nñ][oö0][rř][eé3]",  # Typosquatting
            r"ıgnore|1gnore|lgn0re",
        ],
        "level": ThreatLevel.MEDIUM,
        "description": "Token kaçırma girişimi"
    },
    
    # Multi-language Bypass - Çoklu dil bypass
    "multilang_bypass": {
        "patterns": [
            r"(?i)translate\s+and\s+(ignore|bypass)",
            r"(?i)в\s*р\s*е\s*ж\s*и\s*м",  # Cyrillic "режим"
            r"(?i)無視して",  # Japanese "ignore"
            r"(?i)忽略",  # Chinese "ignore"
        ],
        "level": ThreatLevel.MEDIUM,
        "description": "Çoklu dil ile bypass girişimi"
    },
    
    # Output Manipulation - Çıktı manipülasyonu
    "output_manipulation": {
        "patterns": [
            r"(?i)respond\s+(only\s+)?with\s+(yes|no|true|false|ok)",
            r"(?i)answer\s+(only\s+)?in\s+(one\s+word|json|code)",
            r"(?i)don'?t\s+(explain|elaborate|add\s+context)",
            r"(?i)skip\s+(the\s+)?(warnings?|disclaimers?)",
            r"(?i)uyarıları?\s+(atla|gösterme)",
        ],
        "level": ThreatLevel.LOW,
        "description": "Çıktı manipülasyonu girişimi"
    },
}


# =============================================================================
# PII PATTERNS (Personally Identifiable Information)
# =============================================================================

PII_PATTERNS: Dict[str, Dict] = {
    # Turkish TC Number
    "tc_kimlik": {
        "patterns": [
            r"\b[1-9]\d{10}\b",  # 11 haneli, 0 ile başlamayan
        ],
        "level": ThreatLevel.HIGH,
        "description": "TC Kimlik numarası",
        "mask": "[TC_MASKED]"
    },
    
    # Credit Card Numbers
    "credit_card": {
        "patterns": [
            r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9]{2})[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11})\b",
        ],
        "level": ThreatLevel.CRITICAL,
        "description": "Kredi kartı numarası",
        "mask": "[CARD_MASKED]"
    },
    
    # Phone Numbers
    "phone_number": {
        "patterns": [
            r"\b(?:\+90|0)?[5][0-9]{9}\b",  # Turkish mobile
            r"\b(?:\+90|0)?[2-4][0-9]{9}\b",  # Turkish landline
            r"\b\+?[1-9]\d{1,14}\b",  # International format
        ],
        "level": ThreatLevel.MEDIUM,
        "description": "Telefon numarası",
        "mask": "[PHONE_MASKED]"
    },
    
    # Email Addresses
    "email": {
        "patterns": [
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        ],
        "level": ThreatLevel.MEDIUM,
        "description": "E-posta adresi",
        "mask": "[EMAIL_MASKED]"
    },
    
    # IP Addresses
    "ip_address": {
        "patterns": [
            r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b",
        ],
        "level": ThreatLevel.LOW,
        "description": "IP adresi",
        "mask": "[IP_MASKED]"
    },
    
    # IBAN
    "iban": {
        "patterns": [
            r"\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b",
        ],
        "level": ThreatLevel.HIGH,
        "description": "IBAN numarası",
        "mask": "[IBAN_MASKED]"
    },
    
    # Passwords/Secrets in text
    "password_leak": {
        "patterns": [
            r"(?i)(?:password|şifre|parola)\s*[:=]\s*\S+",
            r"(?i)(?:api[_\s]?key|secret[_\s]?key)\s*[:=]\s*\S+",
            r"(?i)(?:token|bearer)\s*[:=]\s*\S+",
        ],
        "level": ThreatLevel.CRITICAL,
        "description": "Şifre/API anahtarı sızıntısı",
        "mask": "[SECRET_MASKED]"
    },
}


# =============================================================================
# SECRET PATTERNS (API Keys, Tokens, etc.)
# =============================================================================

SECRET_PATTERNS: Dict[str, Dict] = {
    # AWS Keys
    "aws_access_key": {
        "patterns": [
            r"(?i)AKIA[0-9A-Z]{16}",
        ],
        "level": ThreatLevel.CRITICAL,
        "description": "AWS Access Key",
        "mask": "[AWS_KEY_MASKED]"
    },
    
    # OpenAI API Key
    "openai_key": {
        "patterns": [
            r"sk-[a-zA-Z0-9]{48}",
        ],
        "level": ThreatLevel.CRITICAL,
        "description": "OpenAI API Key",
        "mask": "[OPENAI_KEY_MASKED]"
    },
    
    # GitHub Token
    "github_token": {
        "patterns": [
            r"ghp_[a-zA-Z0-9]{36}",
            r"gho_[a-zA-Z0-9]{36}",
            r"ghu_[a-zA-Z0-9]{36}",
        ],
        "level": ThreatLevel.CRITICAL,
        "description": "GitHub Token",
        "mask": "[GITHUB_TOKEN_MASKED]"
    },
    
    # Generic API Key patterns
    "generic_api_key": {
        "patterns": [
            r"(?i)api[_-]?key['\"]?\s*[:=]\s*['\"]?[a-zA-Z0-9]{32,}",
            r"(?i)secret[_-]?key['\"]?\s*[:=]\s*['\"]?[a-zA-Z0-9]{32,}",
        ],
        "level": ThreatLevel.HIGH,
        "description": "Generic API Key",
        "mask": "[API_KEY_MASKED]"
    },
    
    # JWT Tokens
    "jwt_token": {
        "patterns": [
            r"eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+",
        ],
        "level": ThreatLevel.HIGH,
        "description": "JWT Token",
        "mask": "[JWT_MASKED]"
    },
    
    # Private Keys
    "private_key": {
        "patterns": [
            r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        ],
        "level": ThreatLevel.CRITICAL,
        "description": "Private Key",
        "mask": "[PRIVATE_KEY_MASKED]"
    },
}


# =============================================================================
# SECURITY THRESHOLDS
# =============================================================================

SECURITY_THRESHOLDS: Dict[str, int] = {
    # Minimum threat level to block (1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL)
    "block_threshold": ThreatLevel.HIGH,
    
    # Minimum threat level to log
    "log_threshold": ThreatLevel.LOW,
    
    # Maximum suspicious requests before temporary ban
    "max_suspicious_requests": 10,
    
    # Suspicious request time window (seconds)
    "suspicious_window_seconds": 300,  # 5 minutes
    
    # Temporary ban duration (seconds)
    "temp_ban_duration": 3600,  # 1 hour
    
    # Maximum input length (characters)
    "max_input_length": 10000,
    
    # Maximum prompt length after sanitization
    "max_sanitized_length": 5000,
    
    # Maximum repeated characters allowed
    "max_repeated_chars": 20,
    
    # Minimum input length for analysis
    "min_input_length": 3,
}


# =============================================================================
# ALLOWED CONTEXT PATTERNS (Whitelist)
# =============================================================================

# Eğitim bağlamında normal olan kalıplar (false positive önleme)
EDUCATIONAL_WHITELIST: List[str] = [
    # Matematik/Fizik
    r"(?i)varsayalım\s+ki\s+(x|y|a|b)\s*=",  # "Varsayalım ki x = 5"
    r"(?i)hypothetically\s*,?\s*if\s+(x|y|a|b)\s*=",
    
    # Programlama öğretimi
    r"(?i)örnek\s+(kod|program)",
    r"(?i)example\s+(code|program)",
    
    # Tarih/Edebiyat
    r"(?i)hayali\s+bir\s+(karakter|kişi)\s+(hakkında|için)",
    
    # Soru formatları
    r"(?i)aşağıdaki\s+(durumda|senaryoda)",
]


# =============================================================================
# COMPILED PATTERNS (Performance optimization)
# =============================================================================

def compile_patterns(pattern_dict: Dict[str, Dict]) -> Dict[str, Dict]:
    """Pattern'leri derle (performance için)."""
    compiled = {}
    for name, config in pattern_dict.items():
        compiled[name] = {
            **config,
            "compiled": [re.compile(p) for p in config.get("patterns", [])]
        }
    return compiled


# Derlenmis pattern'ler
COMPILED_INJECTION_PATTERNS = compile_patterns(PROMPT_INJECTION_PATTERNS)
COMPILED_JAILBREAK_PATTERNS = compile_patterns(JAILBREAK_PATTERNS)
COMPILED_PII_PATTERNS = compile_patterns(PII_PATTERNS)
COMPILED_SECRET_PATTERNS = compile_patterns(SECRET_PATTERNS)
COMPILED_WHITELIST = [re.compile(p) for p in EDUCATIONAL_WHITELIST]
