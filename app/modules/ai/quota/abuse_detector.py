"""
AI Quota - Abuse Detector.

Kötüye kullanım tespit ve engelleme sistemi.
"""

import re
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple, List

from app.modules.ai.core.interfaces import AbuseDetectorInterface, AIRequest, AIFeature
from app.modules.ai.core.constants import (
    ABUSE_THRESHOLDS,
    AbuseSeverity,
    BANNED_PATTERNS
)


class AbuseDetector(AbuseDetectorInterface):
    """
    Abuse tespit sistemi.
    
    Kötüye kullanım kalıplarını tespit eder:
    - Spam istekler
    - Yasaklı içerik
    - Bot davranışı
    - Tekrarlayan istekler
    """
    
    def __init__(self, redis_client=None):
        """
        Args:
            redis_client: Redis client instance. None ise in-memory fallback kullanılır.
        """
        self._redis = redis_client
        self._memory_store: Dict[str, Any] = {}
        self._request_hashes: Dict[int, List[Tuple[str, float]]] = {}  # user_id -> [(hash, timestamp), ...]
    
    @property
    def is_redis_available(self) -> bool:
        """Redis bağlantısı var mı."""
        if self._redis is None:
            return False
        try:
            self._redis.ping()
            return True
        except Exception:
            return False
    
    def check_abuse(
        self,
        user_id: int,
        request: AIRequest
    ) -> Tuple[bool, Optional[str]]:
        """
        Abuse kontrolü yap.
        
        Args:
            user_id: Kullanıcı ID
            request: AI isteği
            
        Returns:
            (abuse_var_mı, sebep)
        """
        # 1. Engellenmiş kullanıcı kontrolü
        is_blocked, blocked_until = self.is_blocked(user_id)
        if is_blocked:
            return True, f"Hesabınız {blocked_until.strftime('%Y-%m-%d %H:%M')} tarihine kadar engellendi"
        
        # 2. Yasaklı içerik kontrolü
        banned_result = self._check_banned_content(request.prompt)
        if banned_result:
            self.record_violation(
                user_id,
                'banned_content',
                {'pattern': banned_result, 'severity': AbuseSeverity.MAJOR}
            )
            return True, "İçerik güvenlik politikalarını ihlal ediyor"
        
        # 3. Tekrarlayan istek kontrolü
        duplicate_result = self._check_duplicate_requests(user_id, request.prompt)
        if duplicate_result:
            self.record_violation(
                user_id,
                'duplicate_requests',
                {'count': duplicate_result, 'severity': AbuseSeverity.WARNING}
            )
            return True, "Çok fazla tekrarlayan istek gönderildi"
        
        # 4. Hızlı istek kontrolü (bot davranışı)
        rapid_result = self._check_rapid_requests(user_id)
        if rapid_result:
            self.record_violation(
                user_id,
                'rapid_requests',
                {'interval_ms': rapid_result, 'severity': AbuseSeverity.MINOR}
            )
            return True, "Çok hızlı istek gönderiliyor. Lütfen yavaşlayın."
        
        return False, None
    
    def record_violation(
        self,
        user_id: int,
        violation_type: str,
        details: Dict[str, Any]
    ) -> None:
        """
        İhlal kaydet.
        
        Args:
            user_id: Kullanıcı ID
            violation_type: İhlal türü
            details: Detaylar
        """
        key = f"abuse:violations:{user_id}"
        severity = details.get('severity', AbuseSeverity.WARNING)
        
        violation = {
            'type': violation_type,
            'severity': severity.value if isinstance(severity, AbuseSeverity) else severity,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details
        }
        
        # Violation'ı kaydet
        violations = self._get_violations(user_id)
        violations.append(violation)
        
        # Son 24 saatteki violation'ları tut
        cutoff = datetime.utcnow() - timedelta(hours=24)
        violations = [
            v for v in violations
            if datetime.fromisoformat(v['timestamp']) > cutoff
        ]
        
        self._set_violations(user_id, violations)
        
        # Eşik kontrolü ve engelleme
        self._check_and_block_if_needed(user_id, violations)
    
    def is_blocked(self, user_id: int) -> Tuple[bool, Optional[datetime]]:
        """
        Kullanıcı engellenmiş mi kontrol et.
        
        Args:
            user_id: Kullanıcı ID
            
        Returns:
            (engelli_mi, engel_bitiş_zamanı)
        """
        key = f"abuse:blocked:{user_id}"
        
        if self.is_redis_available:
            try:
                blocked_until = self._redis.get(key)
                if blocked_until:
                    until = datetime.fromisoformat(blocked_until.decode())
                    if until > datetime.utcnow():
                        return True, until
                return False, None
            except Exception:
                pass
        
        # Memory fallback
        data = self._memory_store.get(key)
        if data:
            until = datetime.fromisoformat(data)
            if until > datetime.utcnow():
                return True, until
        
        return False, None
    
    def get_violation_history(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Kullanıcı ihlal geçmişini al.
        
        Args:
            user_id: Kullanıcı ID
            
        Returns:
            İhlal listesi
        """
        return self._get_violations(user_id)
    
    def clear_violations(self, user_id: int) -> bool:
        """
        Kullanıcı ihlallerini temizle (admin için).
        
        Args:
            user_id: Kullanıcı ID
            
        Returns:
            Başarılı mı
        """
        key = f"abuse:violations:{user_id}"
        blocked_key = f"abuse:blocked:{user_id}"
        
        if self.is_redis_available:
            try:
                self._redis.delete(key, blocked_key)
                return True
            except Exception:
                pass
        
        self._memory_store.pop(key, None)
        self._memory_store.pop(blocked_key, None)
        return True
    
    # Private methods
    def _check_banned_content(self, text: str) -> Optional[str]:
        """Yasaklı içerik kontrolü."""
        text_lower = text.lower()
        
        for pattern in BANNED_PATTERNS:
            if pattern in text_lower:
                return pattern
        
        return None
    
    def _check_duplicate_requests(self, user_id: int, prompt: str) -> Optional[int]:
        """Tekrarlayan istek kontrolü."""
        now = time.time()
        cutoff = now - 300  # Son 5 dakika
        
        # Prompt hash'i
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:16]
        
        # Kullanıcının son isteklerini al
        if user_id not in self._request_hashes:
            self._request_hashes[user_id] = []
        
        # Eski kayıtları temizle
        self._request_hashes[user_id] = [
            (h, t) for h, t in self._request_hashes[user_id] if t > cutoff
        ]
        
        # Aynı hash'ten kaç tane var
        same_hash_count = sum(1 for h, _ in self._request_hashes[user_id] if h == prompt_hash)
        
        # Yeni isteği ekle
        self._request_hashes[user_id].append((prompt_hash, now))
        
        max_identical = ABUSE_THRESHOLDS.get('max_identical_requests', 5)
        if same_hash_count >= max_identical:
            return same_hash_count + 1
        
        return None
    
    def _check_rapid_requests(self, user_id: int) -> Optional[int]:
        """Hızlı istek kontrolü."""
        now = time.time()
        key = f"abuse:last_request:{user_id}"
        
        min_interval = ABUSE_THRESHOLDS.get('min_request_interval_ms', 500) / 1000
        
        if self.is_redis_available:
            try:
                last_request = self._redis.get(key)
                if last_request:
                    elapsed = now - float(last_request)
                    if elapsed < min_interval:
                        return int(elapsed * 1000)
                
                self._redis.setex(key, 60, str(now))
            except Exception:
                pass
        else:
            last_request = self._memory_store.get(key)
            if last_request:
                elapsed = now - last_request
                if elapsed < min_interval:
                    return int(elapsed * 1000)
            
            self._memory_store[key] = now
        
        return None
    
    def _get_violations(self, user_id: int) -> List[Dict[str, Any]]:
        """Violations listesini al."""
        key = f"abuse:violations:{user_id}"
        
        if self.is_redis_available:
            try:
                import json
                data = self._redis.get(key)
                return json.loads(data) if data else []
            except Exception:
                pass
        
        return self._memory_store.get(key, [])
    
    def _set_violations(self, user_id: int, violations: List[Dict[str, Any]]) -> None:
        """Violations listesini kaydet."""
        key = f"abuse:violations:{user_id}"
        
        if self.is_redis_available:
            try:
                import json
                self._redis.setex(key, 86400, json.dumps(violations))
                return
            except Exception:
                pass
        
        self._memory_store[key] = violations
    
    def _check_and_block_if_needed(
        self,
        user_id: int,
        violations: List[Dict[str, Any]]
    ) -> None:
        """Gerekirse kullanıcıyı engelle."""
        max_violations = ABUSE_THRESHOLDS.get('max_violations_before_block', 5)
        
        if len(violations) < max_violations:
            return
        
        # En yüksek severity'yi bul
        max_severity = max(
            v.get('severity', 1) for v in violations
        )
        
        # Severity'ye göre engelleme süresi
        severity_enum = AbuseSeverity(max_severity) if max_severity in [s.value for s in AbuseSeverity] else AbuseSeverity.WARNING
        block_hours = ABUSE_THRESHOLDS.get('block_duration_hours', {}).get(severity_enum, 1)
        
        if block_hours <= 0:
            return
        
        blocked_until = datetime.utcnow() + timedelta(hours=block_hours)
        key = f"abuse:blocked:{user_id}"
        
        if self.is_redis_available:
            try:
                self._redis.setex(key, block_hours * 3600, blocked_until.isoformat())
                return
            except Exception:
                pass
        
        self._memory_store[key] = blocked_until.isoformat()
