"""
AI Security - Threat Detectors.

Prompt injection, jailbreak ve veri sızıntısı tespit sistemleri.
"""

import re
import hashlib
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple, Set
from datetime import datetime
from enum import Enum

from app.modules.ai.security.constants import (
    ThreatLevel,
    ThreatCategory,
    COMPILED_INJECTION_PATTERNS,
    COMPILED_JAILBREAK_PATTERNS,
    COMPILED_PII_PATTERNS,
    COMPILED_SECRET_PATTERNS,
    COMPILED_WHITELIST,
    SECURITY_THRESHOLDS
)


logger = logging.getLogger(__name__)


# =============================================================================
# DETECTION RESULT
# =============================================================================

@dataclass
class ThreatDetectionResult:
    """Tehdit tespit sonucu."""
    is_threat: bool = False
    threat_level: ThreatLevel = ThreatLevel.NONE
    category: Optional[ThreatCategory] = None
    pattern_name: Optional[str] = None
    description: Optional[str] = None
    matched_text: Optional[str] = None
    confidence: float = 0.0
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Dict'e dönüştür."""
        return {
            "is_threat": self.is_threat,
            "threat_level": self.threat_level.name if self.threat_level else None,
            "category": self.category.value if self.category else None,
            "pattern_name": self.pattern_name,
            "description": self.description,
            "matched_text": self.matched_text[:50] + "..." if self.matched_text and len(self.matched_text) > 50 else self.matched_text,
            "confidence": self.confidence,
            "details": self.details
        }


@dataclass
class MultiThreatResult:
    """Çoklu tehdit tespit sonucu."""
    threats: List[ThreatDetectionResult] = field(default_factory=list)
    highest_level: ThreatLevel = ThreatLevel.NONE
    total_score: float = 0.0
    is_blocked: bool = False
    
    def add_threat(self, result: ThreatDetectionResult) -> None:
        """Tehdit ekle."""
        if result.is_threat:
            self.threats.append(result)
            if result.threat_level > self.highest_level:
                self.highest_level = result.threat_level
            self.total_score += result.confidence * result.threat_level
    
    def to_dict(self) -> Dict[str, Any]:
        """Dict'e dönüştür."""
        return {
            "threat_count": len(self.threats),
            "highest_level": self.highest_level.name,
            "total_score": round(self.total_score, 2),
            "is_blocked": self.is_blocked,
            "threats": [t.to_dict() for t in self.threats]
        }


# =============================================================================
# BASE DETECTOR
# =============================================================================

class BaseDetector:
    """Temel tehdit dedektörü."""
    
    def __init__(self):
        self._cache: Dict[str, ThreatDetectionResult] = {}
        self._cache_size = 1000
    
    def _get_cache_key(self, content: str) -> str:
        """Cache key oluştur."""
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def _check_cache(self, content: str) -> Optional[ThreatDetectionResult]:
        """Cache'den kontrol et."""
        key = self._get_cache_key(content)
        return self._cache.get(key)
    
    def _set_cache(self, content: str, result: ThreatDetectionResult) -> None:
        """Cache'e kaydet."""
        if len(self._cache) >= self._cache_size:
            # LRU benzeri basit temizlik
            self._cache.clear()
        key = self._get_cache_key(content)
        self._cache[key] = result
    
    def _check_whitelist(self, content: str) -> bool:
        """Whitelist kontrolü."""
        for pattern in COMPILED_WHITELIST:
            if pattern.search(content):
                return True
        return False
    
    def detect(self, content: str) -> ThreatDetectionResult:
        """Tehdit tespit et (override edilmeli)."""
        raise NotImplementedError


# =============================================================================
# PROMPT INJECTION DETECTOR
# =============================================================================

class PromptInjectionDetector(BaseDetector):
    """
    Prompt Injection tespit sistemi.
    
    Tespit edilen saldırı türleri:
    - Direct injection: Doğrudan sistem promptunu değiştirme
    - Role override: AI'ın rolünü değiştirme
    - Delimiter injection: Sistem ayraçları enjekte etme
    - Instruction extraction: Sistem promptunu çıkarma
    - Encoding bypass: Encoding ile filtreleri atlama
    """
    
    # Ağırlık tabanlı skor hesaplama
    PATTERN_WEIGHTS = {
        "ignore_instructions": 1.0,
        "role_override": 0.9,
        "system_prompt_extraction": 1.0,
        "developer_mode": 1.0,
        "delimiter_injection": 1.0,
        "indirect_injection": 0.7,
        "encoding_bypass": 0.8,
    }
    
    def detect(self, content: str) -> ThreatDetectionResult:
        """
        Prompt injection tespit et.
        
        Args:
            content: Kontrol edilecek metin
            
        Returns:
            ThreatDetectionResult
        """
        if not content or len(content) < SECURITY_THRESHOLDS["min_input_length"]:
            return ThreatDetectionResult()
        
        # Cache kontrolü
        cached = self._check_cache(content)
        if cached:
            return cached
        
        # Whitelist kontrolü
        if self._check_whitelist(content):
            result = ThreatDetectionResult(
                is_threat=False,
                details={"whitelisted": True}
            )
            self._set_cache(content, result)
            return result
        
        # Normalize et
        normalized = self._normalize_text(content)
        
        # Pattern matching
        highest_result = ThreatDetectionResult()
        
        for pattern_name, config in COMPILED_INJECTION_PATTERNS.items():
            for compiled_pattern in config.get("compiled", []):
                match = compiled_pattern.search(normalized)
                if match:
                    level = config.get("level", ThreatLevel.MEDIUM)
                    weight = self.PATTERN_WEIGHTS.get(pattern_name, 0.8)
                    confidence = weight * 0.9  # Base confidence
                    
                    result = ThreatDetectionResult(
                        is_threat=True,
                        threat_level=level,
                        category=ThreatCategory.PROMPT_INJECTION,
                        pattern_name=pattern_name,
                        description=config.get("description", "Prompt injection tespit edildi"),
                        matched_text=match.group(0),
                        confidence=confidence,
                        details={
                            "pattern_type": pattern_name,
                            "original_length": len(content),
                            "match_position": match.start()
                        }
                    )
                    
                    # En yüksek seviyeyi tut
                    if result.threat_level > highest_result.threat_level:
                        highest_result = result
                    
                    # CRITICAL ise hemen dön
                    if level == ThreatLevel.CRITICAL:
                        self._set_cache(content, result)
                        return result
        
        # Heuristic checks
        heuristic_result = self._heuristic_analysis(normalized)
        if heuristic_result.is_threat and heuristic_result.threat_level > highest_result.threat_level:
            highest_result = heuristic_result
        
        self._set_cache(content, highest_result)
        return highest_result
    
    def _normalize_text(self, text: str) -> str:
        """Metni normalize et."""
        # Lowercase
        normalized = text.lower()
        
        # Birden fazla boşluğu tek boşluğa indir
        normalized = re.sub(r'\s+', ' ', normalized)
        
        # Unicode homoglyphs normalize (basit)
        homoglyphs = {
            'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y',  # Cyrillic
            '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't',  # Leetspeak
            '@': 'a', '$': 's', '!': 'i',
        }
        for char, replacement in homoglyphs.items():
            normalized = normalized.replace(char, replacement)
        
        return normalized
    
    def _heuristic_analysis(self, content: str) -> ThreatDetectionResult:
        """Heuristic tabanlı analiz."""
        suspicious_score = 0
        reasons = []
        
        # Çok fazla özel karakter
        special_chars = len(re.findall(r'[{}\[\]<>|\\]', content))
        if special_chars > 10:
            suspicious_score += 0.3
            reasons.append("excessive_special_chars")
        
        # Çok uzun tek satır (copy-paste saldırısı)
        lines = content.split('\n')
        for line in lines:
            if len(line) > 500:
                suspicious_score += 0.2
                reasons.append("very_long_line")
                break
        
        # Multiple encoding markers
        encoding_markers = len(re.findall(r'\\x|\\u|%[0-9a-fA-F]{2}', content))
        if encoding_markers > 3:
            suspicious_score += 0.4
            reasons.append("encoding_markers")
        
        # Suspicious keywords density
        keywords = ['ignore', 'forget', 'system', 'prompt', 'instruction', 
                   'role', 'pretend', 'override', 'bypass']
        keyword_count = sum(1 for k in keywords if k in content.lower())
        if keyword_count >= 3:
            suspicious_score += 0.3 * keyword_count
            reasons.append(f"keyword_density_{keyword_count}")
        
        if suspicious_score >= 0.7:
            return ThreatDetectionResult(
                is_threat=True,
                threat_level=ThreatLevel.MEDIUM,
                category=ThreatCategory.PROMPT_INJECTION,
                pattern_name="heuristic_detection",
                description="Şüpheli içerik kalıpları tespit edildi",
                confidence=min(suspicious_score, 1.0),
                details={"reasons": reasons, "score": suspicious_score}
            )
        
        return ThreatDetectionResult()


# =============================================================================
# JAILBREAK DETECTOR
# =============================================================================

class JailbreakDetector(BaseDetector):
    """
    Jailbreak girişimi tespit sistemi.
    
    Tespit edilen saldırı türleri:
    - DAN attacks: "Do Anything Now" stili
    - Hypothetical scenarios: "Varsayalım ki..." 
    - Character roleplay: Kötü karakter oynama
    - Token smuggling: Kelime gizleme
    - Multi-language bypass: Farklı diller kullanma
    """
    
    def detect(self, content: str) -> ThreatDetectionResult:
        """Jailbreak girişimi tespit et."""
        if not content or len(content) < SECURITY_THRESHOLDS["min_input_length"]:
            return ThreatDetectionResult()
        
        cached = self._check_cache(content)
        if cached:
            return cached
        
        if self._check_whitelist(content):
            return ThreatDetectionResult()
        
        normalized = content.lower()
        highest_result = ThreatDetectionResult()
        
        for pattern_name, config in COMPILED_JAILBREAK_PATTERNS.items():
            for compiled_pattern in config.get("compiled", []):
                match = compiled_pattern.search(normalized)
                if match:
                    level = config.get("level", ThreatLevel.MEDIUM)
                    
                    # Context check - bazı kalıplar eğitim bağlamında normaldir
                    if self._is_educational_context(content, match.group(0)):
                        continue
                    
                    result = ThreatDetectionResult(
                        is_threat=True,
                        threat_level=level,
                        category=ThreatCategory.JAILBREAK,
                        pattern_name=pattern_name,
                        description=config.get("description", "Jailbreak girişimi tespit edildi"),
                        matched_text=match.group(0),
                        confidence=0.85,
                        details={"pattern_type": pattern_name}
                    )
                    
                    if result.threat_level > highest_result.threat_level:
                        highest_result = result
                    
                    if level == ThreatLevel.CRITICAL:
                        self._set_cache(content, result)
                        return result
        
        # Composite detection - birden fazla düşük seviye kalıp birlikte
        composite_result = self._composite_detection(content)
        if composite_result.is_threat and composite_result.threat_level > highest_result.threat_level:
            highest_result = composite_result
        
        self._set_cache(content, highest_result)
        return highest_result
    
    def _is_educational_context(self, content: str, matched: str) -> bool:
        """Eğitim bağlamı kontrolü."""
        # Matematik problemleri için "varsayalım ki x = 5"
        if re.search(r'varsayalım\s+ki\s+[a-z]\s*=', content, re.IGNORECASE):
            return True
        
        # Fizik problemleri
        if re.search(r'(hypothetically|varsayalım).*?(velocity|hız|mass|kütle)', content, re.IGNORECASE):
            return True
        
        return False
    
    def _composite_detection(self, content: str) -> ThreatDetectionResult:
        """Kompozit pattern tespiti."""
        # Birden fazla düşük seviye kalıp = yüksek risk
        low_level_matches = 0
        matched_patterns = []
        
        for pattern_name, config in COMPILED_JAILBREAK_PATTERNS.items():
            if config.get("level", ThreatLevel.MEDIUM) == ThreatLevel.LOW:
                for compiled_pattern in config.get("compiled", []):
                    if compiled_pattern.search(content.lower()):
                        low_level_matches += 1
                        matched_patterns.append(pattern_name)
                        break
        
        if low_level_matches >= 2:
            return ThreatDetectionResult(
                is_threat=True,
                threat_level=ThreatLevel.MEDIUM,
                category=ThreatCategory.JAILBREAK,
                pattern_name="composite_detection",
                description="Birden fazla şüpheli kalıp tespit edildi",
                confidence=0.7 + (low_level_matches * 0.1),
                details={"matched_patterns": matched_patterns, "count": low_level_matches}
            )
        
        return ThreatDetectionResult()


# =============================================================================
# PII DETECTOR
# =============================================================================

class PIIDetector(BaseDetector):
    """
    PII (Personally Identifiable Information) tespit sistemi.
    
    Tespit edilen veri türleri:
    - TC Kimlik numarası
    - Kredi kartı numaraları
    - Telefon numaraları
    - E-posta adresleri
    - IBAN numaraları
    - Şifre/API key sızıntıları
    """
    
    def detect(self, content: str) -> MultiThreatResult:
        """
        PII tespit et.
        
        Args:
            content: Kontrol edilecek metin
            
        Returns:
            MultiThreatResult (birden fazla PII olabilir)
        """
        result = MultiThreatResult()
        
        if not content or len(content) < SECURITY_THRESHOLDS["min_input_length"]:
            return result
        
        # PII patterns
        for pattern_name, config in COMPILED_PII_PATTERNS.items():
            for compiled_pattern in config.get("compiled", []):
                matches = compiled_pattern.findall(content)
                for match in matches:
                    if self._validate_pii(pattern_name, match):
                        threat = ThreatDetectionResult(
                            is_threat=True,
                            threat_level=config.get("level", ThreatLevel.MEDIUM),
                            category=ThreatCategory.PII_LEAKAGE,
                            pattern_name=pattern_name,
                            description=config.get("description", "PII tespit edildi"),
                            matched_text=match if len(match) <= 20 else match[:10] + "****",
                            confidence=0.95,
                            details={"mask": config.get("mask", "[MASKED]")}
                        )
                        result.add_threat(threat)
        
        # Secret patterns
        for pattern_name, config in COMPILED_SECRET_PATTERNS.items():
            for compiled_pattern in config.get("compiled", []):
                matches = compiled_pattern.findall(content)
                for match in matches:
                    threat = ThreatDetectionResult(
                        is_threat=True,
                        threat_level=config.get("level", ThreatLevel.CRITICAL),
                        category=ThreatCategory.SECRET_EXPOSURE,
                        pattern_name=pattern_name,
                        description=config.get("description", "Secret tespit edildi"),
                        matched_text="***REDACTED***",
                        confidence=0.99,
                        details={"mask": config.get("mask", "[SECRET_MASKED]")}
                    )
                    result.add_threat(threat)
        
        # Block if HIGH or above
        if result.highest_level >= ThreatLevel.HIGH:
            result.is_blocked = True
        
        return result
    
    def _validate_pii(self, pii_type: str, value: str) -> bool:
        """PII değerini doğrula (false positive azaltma)."""
        if pii_type == "tc_kimlik":
            return self._validate_tc_kimlik(value)
        elif pii_type == "credit_card":
            return self._luhn_check(value)
        return True
    
    def _validate_tc_kimlik(self, tc: str) -> bool:
        """TC Kimlik numarası doğrula."""
        if not tc or len(tc) != 11 or not tc.isdigit():
            return False
        
        if tc[0] == '0':
            return False
        
        digits = [int(d) for d in tc]
        
        # Algoritma kontrolleri
        total_odd = sum(digits[0:9:2])
        total_even = sum(digits[1:8:2])
        
        digit_10 = (total_odd * 7 - total_even) % 10
        if digits[9] != digit_10:
            return False
        
        digit_11 = sum(digits[:10]) % 10
        if digits[10] != digit_11:
            return False
        
        return True
    
    def _luhn_check(self, card_number: str) -> bool:
        """Luhn algoritması ile kredi kartı doğrula."""
        digits = [int(d) for d in card_number if d.isdigit()]
        if len(digits) < 13 or len(digits) > 19:
            return False
        
        checksum = 0
        for i, digit in enumerate(reversed(digits)):
            if i % 2 == 1:
                digit *= 2
                if digit > 9:
                    digit -= 9
            checksum += digit
        
        return checksum % 10 == 0
    
    def mask_pii(self, content: str) -> str:
        """İçerikteki PII'ları maskele."""
        masked = content
        
        for pattern_name, config in COMPILED_PII_PATTERNS.items():
            mask = config.get("mask", "[MASKED]")
            for compiled_pattern in config.get("compiled", []):
                masked = compiled_pattern.sub(mask, masked)
        
        for pattern_name, config in COMPILED_SECRET_PATTERNS.items():
            mask = config.get("mask", "[SECRET_MASKED]")
            for compiled_pattern in config.get("compiled", []):
                masked = compiled_pattern.sub(mask, masked)
        
        return masked


# =============================================================================
# QUOTA ATTACK DETECTOR
# =============================================================================

class QuotaAttackDetector:
    """
    Kota saldırısı tespit sistemi.
    
    Tespit edilen saldırılar:
    - Token stuffing: Gereksiz token ile kota tüketme
    - Request flooding: Hızlı ardışık istekler
    - Distributed attacks: Birden fazla hesaptan koordineli saldırı
    """
    
    def __init__(self, redis_client=None):
        self._redis = redis_client
        self._memory_store: Dict[str, List] = {}
    
    def detect(
        self,
        user_id: int,
        content: str,
        ip_address: str = None
    ) -> ThreatDetectionResult:
        """Kota saldırısı tespit et."""
        # Token stuffing detection
        stuffing_result = self._detect_token_stuffing(content)
        if stuffing_result.is_threat:
            return stuffing_result
        
        # Request pattern analysis
        pattern_result = self._detect_abnormal_pattern(user_id, ip_address)
        if pattern_result.is_threat:
            return pattern_result
        
        return ThreatDetectionResult()
    
    def _detect_token_stuffing(self, content: str) -> ThreatDetectionResult:
        """Token stuffing tespiti."""
        # Çok uzun içerik
        if len(content) > SECURITY_THRESHOLDS["max_input_length"]:
            return ThreatDetectionResult(
                is_threat=True,
                threat_level=ThreatLevel.HIGH,
                category=ThreatCategory.QUOTA_ATTACK,
                pattern_name="token_stuffing_length",
                description="Aşırı uzun içerik tespit edildi",
                confidence=0.95,
                details={"length": len(content), "max": SECURITY_THRESHOLDS["max_input_length"]}
            )
        
        # Tekrarlayan karakterler
        repeated = re.findall(r'(.)\1{' + str(SECURITY_THRESHOLDS["max_repeated_chars"]) + r',}', content)
        if repeated:
            return ThreatDetectionResult(
                is_threat=True,
                threat_level=ThreatLevel.MEDIUM,
                category=ThreatCategory.QUOTA_ATTACK,
                pattern_name="repeated_chars",
                description="Tekrarlayan karakter bloğu tespit edildi",
                confidence=0.8,
                details={"repeated_count": len(repeated)}
            )
        
        # Anlamsız içerik (entropy analizi)
        entropy_score = self._calculate_entropy(content)
        if entropy_score < 2.0 and len(content) > 100:  # Çok düşük entropy = anlamsız tekrar
            return ThreatDetectionResult(
                is_threat=True,
                threat_level=ThreatLevel.MEDIUM,
                category=ThreatCategory.QUOTA_ATTACK,
                pattern_name="low_entropy",
                description="Düşük kaliteli/tekrarlayan içerik",
                confidence=0.7,
                details={"entropy": entropy_score}
            )
        
        return ThreatDetectionResult()
    
    def _calculate_entropy(self, text: str) -> float:
        """Shannon entropy hesapla."""
        from collections import Counter
        import math
        
        if not text:
            return 0.0
        
        freq = Counter(text)
        length = len(text)
        entropy = 0.0
        
        for count in freq.values():
            if count > 0:
                probability = count / length
                entropy -= probability * math.log2(probability)
        
        return entropy
    
    def _detect_abnormal_pattern(
        self,
        user_id: int,
        ip_address: str = None
    ) -> ThreatDetectionResult:
        """Anormal istek paterni tespiti."""
        # Bu implementasyon Redis ile çalışır
        # Memory fallback için basit kontrol
        key = f"pattern:{user_id}"
        
        if key not in self._memory_store:
            self._memory_store[key] = []
        
        now = datetime.utcnow().timestamp()
        
        # Son 1 dakikadaki istekleri al
        recent = [t for t in self._memory_store[key] if now - t < 60]
        recent.append(now)
        self._memory_store[key] = recent[-100:]  # Son 100 istek
        
        # Çok hızlı istekler
        if len(recent) >= 20:
            # İstekler arası ortalama süre
            intervals = [recent[i] - recent[i-1] for i in range(1, len(recent))]
            avg_interval = sum(intervals) / len(intervals) if intervals else 10
            
            if avg_interval < 1.0:  # Saniyede birden fazla istek
                return ThreatDetectionResult(
                    is_threat=True,
                    threat_level=ThreatLevel.HIGH,
                    category=ThreatCategory.BOT_BEHAVIOR,
                    pattern_name="rapid_requests",
                    description="Bot benzeri davranış tespit edildi",
                    confidence=0.85,
                    details={
                        "requests_per_minute": len(recent),
                        "avg_interval_ms": avg_interval * 1000
                    }
                )
        
        return ThreatDetectionResult()
