"""
AI Security - Input/Output Sanitizer.

Giriş ve çıkış temizleme sistemleri.
"""

import re
import html
import unicodedata
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Set
from enum import Enum

from app.modules.ai.security.constants import (
    ThreatLevel,
    SECURITY_THRESHOLDS,
    COMPILED_PII_PATTERNS,
    COMPILED_SECRET_PATTERNS
)


logger = logging.getLogger(__name__)


# =============================================================================
# SANITIZATION RESULT
# =============================================================================

@dataclass
class SanitizationResult:
    """Temizleme sonucu."""
    original: str
    sanitized: str
    changes_made: List[str] = field(default_factory=list)
    items_removed: int = 0
    items_masked: int = 0
    was_truncated: bool = False
    is_safe: bool = True
    warnings: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Dict'e dönüştür."""
        return {
            "original_length": len(self.original),
            "sanitized_length": len(self.sanitized),
            "changes_made": self.changes_made,
            "items_removed": self.items_removed,
            "items_masked": self.items_masked,
            "was_truncated": self.was_truncated,
            "is_safe": self.is_safe,
            "warnings": self.warnings
        }


# =============================================================================
# INPUT SANITIZER
# =============================================================================

class InputSanitizer:
    """
    Kullanıcı girdisi temizleme sistemi.
    
    İşlemler:
    - Uzunluk kontrolü ve kırpma
    - Zararlı karakter temizleme
    - Unicode normalize
    - HTML/Script temizleme
    - Boşluk normalize
    - Control character kaldırma
    """
    
    # Kaldırılacak control karakterleri (görünmez)
    CONTROL_CHARS = set(range(0, 32)) - {9, 10, 13}  # Tab, LF, CR hariç
    
    # Tehlikeli Unicode kategorileri
    DANGEROUS_UNICODE_CATEGORIES = {'Cf', 'Co', 'Cn'}  # Format, Private, Unassigned
    
    # Izin verilen HTML benzeri kalıplar (kod örnekleri için)
    ALLOWED_CODE_PATTERNS = [
        r'<[a-zA-Z_][a-zA-Z0-9_]*>',  # Type hints: List<int>
        r'<[a-zA-Z_][a-zA-Z0-9_]*/>',  # Self-closing: <br/>
    ]
    
    def __init__(self, max_length: int = None, preserve_code: bool = True):
        """
        Args:
            max_length: Maksimum karakter uzunluğu
            preserve_code: Kod bloklarını koru
        """
        self.max_length = max_length or SECURITY_THRESHOLDS["max_input_length"]
        self.preserve_code = preserve_code
        self._code_block_pattern = re.compile(r'```[\s\S]*?```|`[^`]+`')
    
    def sanitize(self, content: str) -> SanitizationResult:
        """
        Girdiyi temizle.
        
        Args:
            content: Temizlenecek metin
            
        Returns:
            SanitizationResult
        """
        if not content:
            return SanitizationResult(
                original="",
                sanitized="",
                is_safe=True
            )
        
        result = SanitizationResult(
            original=content,
            sanitized=content
        )
        
        sanitized = content
        
        # 1. Kod bloklarını koru (varsa)
        code_blocks = []
        if self.preserve_code:
            sanitized, code_blocks = self._extract_code_blocks(sanitized)
        
        # 2. Control karakterleri kaldır
        sanitized, removed = self._remove_control_chars(sanitized)
        if removed > 0:
            result.changes_made.append(f"control_chars_removed:{removed}")
            result.items_removed += removed
        
        # 3. Tehlikeli Unicode karakterleri temizle
        sanitized, normalized = self._normalize_unicode(sanitized)
        if normalized:
            result.changes_made.append("unicode_normalized")
        
        # 4. Zero-width karakterleri kaldır
        sanitized, zw_removed = self._remove_zero_width(sanitized)
        if zw_removed > 0:
            result.changes_made.append(f"zero_width_removed:{zw_removed}")
            result.items_removed += zw_removed
        
        # 5. HTML entities decode ve tehlikeli tag'leri kaldır
        sanitized, html_cleaned = self._clean_html(sanitized)
        if html_cleaned:
            result.changes_made.append("html_cleaned")
        
        # 6. Boşlukları normalize et
        sanitized = self._normalize_whitespace(sanitized)
        
        # 7. Aşırı uzun tek satırları kes
        sanitized, line_truncated = self._truncate_long_lines(sanitized)
        if line_truncated:
            result.changes_made.append("long_lines_truncated")
            result.warnings.append("Çok uzun satırlar kısaltıldı")
        
        # 8. Tekrarlayan karakterleri sınırla
        sanitized, repeated = self._limit_repetition(sanitized)
        if repeated:
            result.changes_made.append("repetition_limited")
        
        # 9. Toplam uzunluk kontrolü
        if len(sanitized) > self.max_length:
            sanitized = sanitized[:self.max_length]
            result.was_truncated = True
            result.changes_made.append(f"truncated_to:{self.max_length}")
            result.warnings.append(f"İçerik {self.max_length} karaktere kısaltıldı")
        
        # 10. Kod bloklarını geri ekle
        if code_blocks:
            sanitized = self._restore_code_blocks(sanitized, code_blocks)
        
        # 11. Trim
        sanitized = sanitized.strip()
        
        result.sanitized = sanitized
        
        # Güvenlik değerlendirmesi
        if result.items_removed > 50:
            result.is_safe = False
            result.warnings.append("Çok fazla şüpheli karakter kaldırıldı")
        
        return result
    
    def _extract_code_blocks(self, text: str) -> tuple:
        """Kod bloklarını çıkar ve placeholder koy."""
        blocks = []
        
        def replacer(match):
            blocks.append(match.group(0))
            return f"__CODE_BLOCK_{len(blocks) - 1}__"
        
        cleaned = self._code_block_pattern.sub(replacer, text)
        return cleaned, blocks
    
    def _restore_code_blocks(self, text: str, blocks: List[str]) -> str:
        """Kod bloklarını geri yükle."""
        for i, block in enumerate(blocks):
            text = text.replace(f"__CODE_BLOCK_{i}__", block)
        return text
    
    def _remove_control_chars(self, text: str) -> tuple:
        """Control karakterleri kaldır."""
        removed = 0
        result = []
        
        for char in text:
            if ord(char) in self.CONTROL_CHARS:
                removed += 1
            else:
                result.append(char)
        
        return ''.join(result), removed
    
    def _normalize_unicode(self, text: str) -> tuple:
        """Unicode normalize et."""
        # NFKC normalization - homoglyph saldırılarını önler
        normalized = unicodedata.normalize('NFKC', text)
        
        # Tehlikeli kategorilerdeki karakterleri kaldır
        cleaned = []
        was_normalized = False
        
        for char in normalized:
            category = unicodedata.category(char)
            if category not in self.DANGEROUS_UNICODE_CATEGORIES:
                cleaned.append(char)
            else:
                was_normalized = True
        
        return ''.join(cleaned), was_normalized or normalized != text
    
    def _remove_zero_width(self, text: str) -> tuple:
        """Zero-width karakterleri kaldır."""
        zero_width = [
            '\u200b',  # Zero Width Space
            '\u200c',  # Zero Width Non-Joiner
            '\u200d',  # Zero Width Joiner
            '\u2060',  # Word Joiner
            '\ufeff',  # Zero Width No-Break Space (BOM)
            '\u180e',  # Mongolian Vowel Separator
        ]
        
        removed = 0
        result = text
        
        for zw in zero_width:
            count = result.count(zw)
            if count > 0:
                removed += count
                result = result.replace(zw, '')
        
        return result, removed
    
    def _clean_html(self, text: str) -> tuple:
        """HTML temizle."""
        # HTML entities decode
        decoded = html.unescape(text)
        
        # Tehlikeli HTML tag'lerini kaldır
        dangerous_patterns = [
            r'<script[^>]*>[\s\S]*?</script>',
            r'<iframe[^>]*>[\s\S]*?</iframe>',
            r'<object[^>]*>[\s\S]*?</object>',
            r'<embed[^>]*>',
            r'<form[^>]*>[\s\S]*?</form>',
            r'on\w+\s*=\s*["\'][^"\']*["\']',  # Event handlers
            r'javascript\s*:',
            r'data\s*:\s*text/html',
        ]
        
        cleaned = decoded
        was_cleaned = False
        
        for pattern in dangerous_patterns:
            if re.search(pattern, cleaned, re.IGNORECASE):
                cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
                was_cleaned = True
        
        return cleaned, was_cleaned
    
    def _normalize_whitespace(self, text: str) -> str:
        """Boşlukları normalize et."""
        # Birden fazla boşluğu tek boşluğa indir (satır sonları hariç)
        result = re.sub(r'[^\S\n]+', ' ', text)
        
        # Birden fazla boş satırı iki satıra indir
        result = re.sub(r'\n{3,}', '\n\n', result)
        
        return result
    
    def _truncate_long_lines(self, text: str, max_line_length: int = 1000) -> tuple:
        """Çok uzun satırları kes."""
        lines = text.split('\n')
        truncated = False
        result = []
        
        for line in lines:
            if len(line) > max_line_length:
                result.append(line[:max_line_length] + '...')
                truncated = True
            else:
                result.append(line)
        
        return '\n'.join(result), truncated
    
    def _limit_repetition(self, text: str, max_repeat: int = None) -> tuple:
        """Tekrarlayan karakterleri sınırla."""
        max_repeat = max_repeat or SECURITY_THRESHOLDS["max_repeated_chars"]
        
        # Aynı karakterin max_repeat'den fazla tekrarını sınırla
        pattern = r'(.)\1{' + str(max_repeat) + r',}'
        
        def replacer(match):
            return match.group(1) * max_repeat
        
        result = re.sub(pattern, replacer, text)
        return result, result != text


# =============================================================================
# OUTPUT SANITIZER
# =============================================================================

class OutputSanitizer:
    """
    AI çıktısı temizleme sistemi.
    
    İşlemler:
    - PII maskeleme
    - Secret maskeleme
    - Tehlikeli URL'leri kaldırma
    - Executable kod temizleme
    - System prompt sızıntısı önleme
    """
    
    # Sistem prompt sızıntısı kalıpları
    SYSTEM_LEAK_PATTERNS = [
        r'(?i)my\s+(system\s+)?instructions?\s+(are|is)',
        r'(?i)i\s+was\s+told\s+to',
        r'(?i)my\s+(?:initial\s+)?prompt\s+(?:is|was|says?)',
        r'(?i)here\s+(?:is|are)\s+my\s+instructions?',
        r'(?i)sistem\s+talimatlarım',
        r'(?i)bana\s+verilen\s+talimatlar',
    ]
    
    # Tehlikeli URL kalıpları
    DANGEROUS_URL_PATTERNS = [
        r'(?i)(?:https?://)?(?:www\.)?(?:\d{1,3}\.){3}\d{1,3}',  # IP addresses
        r'(?i)(?:https?://)?localhost',
        r'(?i)(?:https?://)?127\.0\.0\.1',
        r'(?i)file:///',
        r'(?i)data:text/html',
    ]
    
    def __init__(self, mask_pii: bool = True, mask_secrets: bool = True):
        """
        Args:
            mask_pii: PII'ları maskele
            mask_secrets: Secret'ları maskele
        """
        self.mask_pii = mask_pii
        self.mask_secrets = mask_secrets
        self._compiled_leak_patterns = [re.compile(p) for p in self.SYSTEM_LEAK_PATTERNS]
        self._compiled_url_patterns = [re.compile(p) for p in self.DANGEROUS_URL_PATTERNS]
    
    def sanitize(self, content: str, context: Dict[str, Any] = None) -> SanitizationResult:
        """
        AI çıktısını temizle.
        
        Args:
            content: Temizlenecek AI çıktısı
            context: Bağlam bilgisi (system prompt kontrolü için)
            
        Returns:
            SanitizationResult
        """
        if not content:
            return SanitizationResult(original="", sanitized="", is_safe=True)
        
        result = SanitizationResult(original=content, sanitized=content)
        sanitized = content
        
        # 1. System prompt sızıntısı kontrolü
        sanitized, leak_found = self._check_system_leak(sanitized, context)
        if leak_found:
            result.changes_made.append("system_leak_removed")
            result.warnings.append("Potansiyel sistem prompt sızıntısı engellendi")
            result.is_safe = False
        
        # 2. PII maskeleme
        if self.mask_pii:
            sanitized, pii_count = self._mask_pii(sanitized)
            if pii_count > 0:
                result.items_masked += pii_count
                result.changes_made.append(f"pii_masked:{pii_count}")
        
        # 3. Secret maskeleme
        if self.mask_secrets:
            sanitized, secret_count = self._mask_secrets(sanitized)
            if secret_count > 0:
                result.items_masked += secret_count
                result.changes_made.append(f"secrets_masked:{secret_count}")
                result.warnings.append("Potansiyel secret bilgi maskelendi")
        
        # 4. Tehlikeli URL'leri kaldır
        sanitized, url_removed = self._remove_dangerous_urls(sanitized)
        if url_removed > 0:
            result.items_removed += url_removed
            result.changes_made.append(f"dangerous_urls_removed:{url_removed}")
        
        # 5. Executable kod uyarısı
        sanitized, code_warning = self._check_executable_code(sanitized)
        if code_warning:
            result.warnings.append("Çalıştırılabilir kod içeriyor - dikkatli kullanın")
        
        result.sanitized = sanitized
        return result
    
    def _check_system_leak(self, content: str, context: Dict = None) -> tuple:
        """Sistem prompt sızıntısı kontrolü."""
        leak_found = False
        result = content
        
        for pattern in self._compiled_leak_patterns:
            if pattern.search(result):
                # Sızıntı olabilecek kısmı kaldır
                result = pattern.sub('[Bu bilgi gizlidir]', result)
                leak_found = True
        
        # Context'te system prompt varsa, çıktıda olup olmadığını kontrol et
        if context and context.get('system_prompt'):
            system_prompt = context['system_prompt']
            # System prompt'un önemli bir parçası çıktıda varsa
            if len(system_prompt) > 50:
                chunks = [system_prompt[i:i+50] for i in range(0, len(system_prompt), 50)]
                for chunk in chunks:
                    if chunk.lower() in content.lower():
                        result = result.replace(chunk, '[Bu bilgi gizlidir]')
                        leak_found = True
        
        return result, leak_found
    
    def _mask_pii(self, content: str) -> tuple:
        """PII maskeleme."""
        masked = content
        count = 0
        
        for pattern_name, config in COMPILED_PII_PATTERNS.items():
            mask = config.get("mask", "[MASKED]")
            for compiled_pattern in config.get("compiled", []):
                matches = compiled_pattern.findall(masked)
                count += len(matches)
                masked = compiled_pattern.sub(mask, masked)
        
        return masked, count
    
    def _mask_secrets(self, content: str) -> tuple:
        """Secret maskeleme."""
        masked = content
        count = 0
        
        for pattern_name, config in COMPILED_SECRET_PATTERNS.items():
            mask = config.get("mask", "[SECRET]")
            for compiled_pattern in config.get("compiled", []):
                matches = compiled_pattern.findall(masked)
                count += len(matches)
                masked = compiled_pattern.sub(mask, masked)
        
        return masked, count
    
    def _remove_dangerous_urls(self, content: str) -> tuple:
        """Tehlikeli URL'leri kaldır."""
        result = content
        count = 0
        
        for pattern in self._compiled_url_patterns:
            matches = pattern.findall(result)
            count += len(matches)
            result = pattern.sub('[URL kaldırıldı]', result)
        
        return result, count
    
    def _check_executable_code(self, content: str) -> tuple:
        """Çalıştırılabilir kod kontrolü."""
        dangerous_patterns = [
            r'(?i)(?:sudo|chmod|chown|rm\s+-rf)',
            r'(?i)(?:exec|eval|system)\s*\(',
            r'(?i)(?:import\s+os|import\s+subprocess)',
            r'(?i)(?:curl|wget)\s+.*\s*\|',
            r'(?i)powershell\s+-(?:encoded|e)\s+',
        ]
        
        has_dangerous = False
        for pattern in dangerous_patterns:
            if re.search(pattern, content):
                has_dangerous = True
                break
        
        return content, has_dangerous


# =============================================================================
# COMBINED SANITIZER
# =============================================================================

class CombinedSanitizer:
    """
    Birleşik sanitizer - giriş ve çıkış için tek arayüz.
    """
    
    def __init__(self):
        self.input_sanitizer = InputSanitizer()
        self.output_sanitizer = OutputSanitizer()
    
    def sanitize_input(self, content: str) -> SanitizationResult:
        """Kullanıcı girdisini temizle."""
        return self.input_sanitizer.sanitize(content)
    
    def sanitize_output(self, content: str, context: Dict = None) -> SanitizationResult:
        """AI çıktısını temizle."""
        return self.output_sanitizer.sanitize(content, context)
    
    def sanitize_both(
        self,
        input_content: str,
        output_content: str,
        context: Dict = None
    ) -> tuple:
        """Hem girişi hem çıkışı temizle."""
        input_result = self.sanitize_input(input_content)
        output_result = self.sanitize_output(output_content, context)
        return input_result, output_result
