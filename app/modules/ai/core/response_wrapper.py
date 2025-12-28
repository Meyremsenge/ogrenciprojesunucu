"""
AI Core - Response Wrapper.

AI yanıtlarını güvenli ve standart formata sarar.
Disclaimer, confidence score ve diğer meta verileri ekler.
"""

import hashlib
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class ResponseType(str, Enum):
    """AI yanıt türleri."""
    HINT = "hint"
    EXPLANATION = "explanation"
    STUDY_PLAN = "study_plan"
    EVALUATION = "evaluation"
    GENERATION = "generation"
    ANALYSIS = "analysis"


class ConfidenceLevel(str, Enum):
    """Güven seviyesi."""
    HIGH = "high"        # > 0.8
    MEDIUM = "medium"    # 0.5 - 0.8
    LOW = "low"          # < 0.5
    UNKNOWN = "unknown"  # Hesaplanamadı


@dataclass
class AIResponseWrapper:
    """
    AI yanıtını saran güvenli wrapper.
    
    Özellikler:
    - Otomatik disclaimer ekleme
    - Confidence score tracking
    - PII maskeleme
    - Response hash (integrity)
    - Kaynak referansları
    """
    
    # Ana içerik
    content: str
    response_type: ResponseType = ResponseType.HINT
    
    # Güven ve doğrulama
    confidence: float = 0.0
    needs_verification: bool = True
    
    # Disclaimer ve uyarılar
    disclaimer: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    
    # Meta veriler
    source_references: List[str] = field(default_factory=list)
    model_used: Optional[str] = None
    tokens_used: int = 0
    response_time_ms: float = 0.0
    
    # Güvenlik
    pii_detected: bool = False
    pii_masked: bool = False
    content_hash: Optional[str] = None
    
    # Zaman damgası
    generated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def __post_init__(self):
        """Post-initialization işlemleri."""
        # Content hash hesapla
        if self.content and not self.content_hash:
            self.content_hash = hashlib.sha256(self.content.encode()).hexdigest()[:16]
        
        # Confidence seviyesine göre otomatik disclaimer
        if not self.disclaimer:
            self.disclaimer = self._get_default_disclaimer()
        
        # Düşük confidence'ta verification flag'i
        if self.confidence < 0.8:
            self.needs_verification = True
    
    def _get_default_disclaimer(self) -> str:
        """Varsayılan disclaimer metni."""
        base_disclaimer = "Bu içerik AI tarafından üretilmiştir."
        
        if self.confidence < 0.5:
            return f"{base_disclaimer} Doğruluğu düşük olabilir, lütfen öğretmeninize danışın."
        elif self.confidence < 0.8:
            return f"{base_disclaimer} Kesin bilgi için öğretmeninize danışmanızı öneririz."
        else:
            return base_disclaimer
    
    @property
    def confidence_level(self) -> ConfidenceLevel:
        """Güven seviyesi kategorisi."""
        if self.confidence >= 0.8:
            return ConfidenceLevel.HIGH
        elif self.confidence >= 0.5:
            return ConfidenceLevel.MEDIUM
        elif self.confidence > 0:
            return ConfidenceLevel.LOW
        return ConfidenceLevel.UNKNOWN
    
    def add_warning(self, warning: str) -> None:
        """Uyarı ekle."""
        if warning not in self.warnings:
            self.warnings.append(warning)
    
    def add_source(self, source: str) -> None:
        """Kaynak referansı ekle."""
        if source not in self.source_references:
            self.source_references.append(source)
    
    def to_dict(self) -> Dict[str, Any]:
        """Dict'e dönüştür (frontend için)."""
        return {
            "content": self.content,
            "response_type": self.response_type.value,
            "confidence": round(self.confidence, 2),
            "confidence_level": self.confidence_level.value,
            "needs_verification": self.needs_verification,
            "disclaimer": self.disclaimer,
            "warnings": self.warnings,
            "source_references": self.source_references,
            "ai_generated": True,
            "generated_at": self.generated_at,
            "meta": {
                "model": self.model_used,
                "tokens": self.tokens_used,
                "response_time_ms": round(self.response_time_ms, 2),
                "content_hash": self.content_hash
            }
        }
    
    def to_safe_response(self) -> Dict[str, Any]:
        """
        Güvenli yanıt formatı.
        
        Hassas meta verileri hariç tutar.
        """
        return {
            "content": self.content,
            "disclaimer": self.disclaimer,
            "confidence_level": self.confidence_level.value,
            "needs_verification": self.needs_verification,
            "ai_generated": True
        }


class ResponseWrapperFactory:
    """
    AI yanıt wrapper factory.
    
    Farklı yanıt türleri için uygun wrapper oluşturur.
    """
    
    # Yanıt türüne göre varsayılan disclaimerlar
    DEFAULT_DISCLAIMERS = {
        ResponseType.HINT: "Bu ipucu sadece yönlendirme amaçlıdır. Doğru cevabı bulmak için düşünmeye devam edin.",
        ResponseType.EXPLANATION: "Bu açıklama AI tarafından üretilmiştir. Detaylı bilgi için ders materyallerinize veya öğretmeninize başvurun.",
        ResponseType.STUDY_PLAN: "Bu çalışma planı kişiselleştirilmiş bir öneridir. İhtiyaçlarınıza göre uyarlayabilirsiniz.",
        ResponseType.EVALUATION: "Bu değerlendirme AI tarafından yapılmıştır. Kesin not için öğretmeninizin değerlendirmesini bekleyin.",
        ResponseType.GENERATION: "Bu içerik AI tarafından üretilmiştir. Kullanmadan önce doğruluğunu kontrol edin.",
        ResponseType.ANALYSIS: "Bu analiz AI tarafından yapılmıştır. Genel bir bakış sağlar, detaylı değerlendirme için uzman görüşü alın."
    }
    
    # Yanıt türüne göre minimum confidence eşikleri
    MIN_CONFIDENCE_THRESHOLDS = {
        ResponseType.HINT: 0.5,
        ResponseType.EXPLANATION: 0.6,
        ResponseType.STUDY_PLAN: 0.5,
        ResponseType.EVALUATION: 0.7,
        ResponseType.GENERATION: 0.6,
        ResponseType.ANALYSIS: 0.6
    }
    
    @classmethod
    def create(
        cls,
        content: str,
        response_type: ResponseType,
        confidence: float = 0.0,
        model_used: str = None,
        tokens_used: int = 0,
        response_time_ms: float = 0.0,
        **kwargs
    ) -> AIResponseWrapper:
        """
        Yanıt wrapper'ı oluştur.
        
        Args:
            content: AI yanıt içeriği
            response_type: Yanıt türü
            confidence: Güven skoru (0-1)
            model_used: Kullanılan model
            tokens_used: Kullanılan token sayısı
            response_time_ms: Yanıt süresi (ms)
            **kwargs: Ek parametreler
            
        Returns:
            AIResponseWrapper instance
        """
        # Varsayılan disclaimer
        disclaimer = kwargs.get('disclaimer') or cls.DEFAULT_DISCLAIMERS.get(response_type)
        
        # Minimum confidence kontrolü
        min_confidence = cls.MIN_CONFIDENCE_THRESHOLDS.get(response_type, 0.5)
        needs_verification = confidence < min_confidence
        
        # Düşük confidence uyarısı
        warnings = list(kwargs.get('warnings', []))
        if confidence < 0.5:
            warnings.append("Yanıtın doğruluğu düşük olabilir.")
        
        return AIResponseWrapper(
            content=content,
            response_type=response_type,
            confidence=confidence,
            needs_verification=needs_verification,
            disclaimer=disclaimer,
            warnings=warnings,
            model_used=model_used,
            tokens_used=tokens_used,
            response_time_ms=response_time_ms,
            source_references=kwargs.get('source_references', []),
            pii_detected=kwargs.get('pii_detected', False),
            pii_masked=kwargs.get('pii_masked', False)
        )
    
    @classmethod
    def create_hint(cls, content: str, confidence: float = 0.7, **kwargs) -> AIResponseWrapper:
        """İpucu yanıtı oluştur."""
        return cls.create(content, ResponseType.HINT, confidence, **kwargs)
    
    @classmethod
    def create_explanation(cls, content: str, confidence: float = 0.7, **kwargs) -> AIResponseWrapper:
        """Açıklama yanıtı oluştur."""
        return cls.create(content, ResponseType.EXPLANATION, confidence, **kwargs)
    
    @classmethod
    def create_study_plan(cls, content: str, confidence: float = 0.6, **kwargs) -> AIResponseWrapper:
        """Çalışma planı yanıtı oluştur."""
        return cls.create(content, ResponseType.STUDY_PLAN, confidence, **kwargs)
    
    @classmethod
    def create_evaluation(cls, content: str, confidence: float = 0.7, **kwargs) -> AIResponseWrapper:
        """Değerlendirme yanıtı oluştur."""
        return cls.create(content, ResponseType.EVALUATION, confidence, **kwargs)


# Convenience alias
create_response = ResponseWrapperFactory.create
