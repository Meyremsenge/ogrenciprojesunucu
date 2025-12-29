"""
AI Service - Facade.

AI modülünün ana giriş noktası.
Tüm AI işlemlerini orkestre eder.
"""

import uuid
import time
from typing import Dict, Any, Optional
from datetime import datetime

from flask import request as flask_request

from app.modules.ai.core.interfaces import AIRequest, AIResponse, AIFeature
from app.modules.ai.core.exceptions import (
    AIException,
    AIQuotaExceededError,
    AIRateLimitError,
    AIAbuseDetectedError,
    AIFeatureDisabledError
)
from app.modules.ai.core.constants import TOKEN_COSTS, QUOTA_LIMITS
from app.modules.ai.providers import provider_factory, ProviderType
from app.modules.ai.prompts import prompt_manager
from app.modules.ai.quota import RedisQuotaManager, RedisRateLimiter, AbuseDetector
from app.modules.ai.services.audit import ai_audit_logger


class AIServiceFacade:
    """
    AI Service Facade.
    
    Tüm AI işlemlerini koordine eden ana servis.
    Provider bağımsız çalışır, kolayca değiştirilebilir.
    """
    
    def __init__(self, redis_client=None):
        """
        Args:
            redis_client: Redis client (opsiyonel)
        """
        self._quota_manager = RedisQuotaManager(redis_client)
        self._rate_limiter = RedisRateLimiter(redis_client)
        self._abuse_detector = AbuseDetector(redis_client)
        self._current_provider = ProviderType.MOCK
    
    @property
    def provider(self):
        """Aktif AI provider."""
        return provider_factory.get(self._current_provider.value)
    
    def set_provider(self, provider_type: ProviderType) -> None:
        """
        Provider'ı değiştir.
        
        Args:
            provider_type: Yeni provider tipi
        """
        old_provider = self._current_provider
        self._current_provider = provider_type
        
        ai_audit_logger.log_provider_switch(
            user_id=None,
            from_provider=old_provider.value,
            to_provider=provider_type.value,
            reason="manual_switch"
        )
    
    def process(
        self,
        user_id: int,
        feature: AIFeature,
        variables: Dict[str, Any],
        role: str = 'student',
        options: Optional[Dict[str, Any]] = None
    ) -> AIResponse:
        """
        AI isteğini işle.
        
        Bu metod tüm kontrolleri ve işlemleri sırasıyla yapar:
        1. Abuse kontrolü
        2. Rate limit kontrolü
        3. Kota kontrolü
        4. Prompt oluşturma
        5. AI çağrısı
        6. Kota tüketimi
        7. Audit logging
        
        Args:
            user_id: Kullanıcı ID
            feature: AI özelliği
            variables: Prompt değişkenleri
            role: Kullanıcı rolü
            options: Ek seçenekler
            
        Returns:
            AIResponse
            
        Raises:
            AIAbuseDetectedError: Abuse tespit edildiğinde
            AIRateLimitError: Rate limit aşıldığında
            AIQuotaExceededError: Kota aşıldığında
            AIException: Diğer hatalarda
        """
        options = options or {}
        request_id = str(uuid.uuid4())
        start_time = time.time()
        ip_address = self._get_client_ip()
        
        # Tahmini token sayısı
        estimated_tokens = TOKEN_COSTS.get(feature.value, 100)
        
        try:
            # 1. Prompt oluştur (role kontrolü de burada)
            system_prompt, user_prompt, template = prompt_manager.get_prompt(
                feature=feature,
                variables=variables,
                role=role
            )
            
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # 2. AI Request oluştur
            ai_request = AIRequest(
                feature=feature,
                prompt=full_prompt,
                user_id=user_id,
                role=role,
                context={'system_prompt': system_prompt, **variables},
                options=options,
                request_id=request_id
            )
            
            # 3. Abuse kontrolü
            is_abuse, abuse_reason = self._abuse_detector.check_abuse(user_id, ai_request)
            if is_abuse:
                ai_audit_logger.log_abuse_detected(
                    user_id=user_id,
                    violation_type='request_abuse',
                    details={'reason': abuse_reason},
                    ip_address=ip_address
                )
                raise AIAbuseDetectedError(message=abuse_reason)
            
            # 4. Rate limit kontrolü
            is_allowed, wait_time = self._rate_limiter.is_allowed(user_id, feature, role)
            if not is_allowed:
                ai_audit_logger.log_rate_limit(
                    user_id=user_id,
                    feature=feature,
                    wait_seconds=wait_time,
                    ip_address=ip_address
                )
                raise AIRateLimitError(
                    message=f"Lütfen {wait_time} saniye bekleyin",
                    retry_after=wait_time
                )
            
            # 5. Kota kontrolü
            quota_ok, quota_error = self._quota_manager.check_quota(
                user_id, feature, estimated_tokens, role
            )
            if not quota_ok:
                ai_audit_logger.log_quota_exceeded(
                    user_id=user_id,
                    feature=feature,
                    quota_type='pre_check',
                    limit=0,
                    used=0,
                    ip_address=ip_address
                )
                raise AIQuotaExceededError(message=quota_error)
            
            # 6. Rate limit kaydı
            self._rate_limiter.record_request(user_id, feature)
            
            # 7. Request audit log
            ai_audit_logger.log_request(user_id, ai_request, ip_address)
            
            # 8. AI provider'dan yanıt al
            response = self.provider.complete(ai_request)
            
            # 9. Kota tüket
            self._quota_manager.consume_quota(user_id, feature, response.tokens_used)
            
            # 10. Response audit log
            ai_audit_logger.log_response(user_id, response, ip_address)
            
            return response
            
        except AIException:
            raise
        except Exception as e:
            ai_audit_logger.log_error(
                user_id=user_id,
                feature=feature,
                error=str(e),
                error_type=type(e).__name__,
                ip_address=ip_address
            )
            raise AIException(message=str(e))
    
    def get_hint(
        self,
        user_id: int,
        question_text: str,
        difficulty_level: str = 'orta',
        role: str = 'student',
        **kwargs
    ) -> Dict[str, Any]:
        """
        Soru ipucu al.
        
        Args:
            user_id: Kullanıcı ID
            question_text: Soru metni
            difficulty_level: Zorluk seviyesi
            role: Kullanıcı rolü
            **kwargs: Ek parametreler
            
        Returns:
            AI yanıtı dict olarak
        """
        response = self.process(
            user_id=user_id,
            feature=AIFeature.QUESTION_HINT,
            variables={
                'question_text': question_text,
                'difficulty_level': difficulty_level,
                **kwargs
            },
            role=role
        )
        return response.to_dict()
    
    def explain_topic(
        self,
        user_id: int,
        topic_name: str,
        student_level: str = 'lise',
        role: str = 'student',
        **kwargs
    ) -> Dict[str, Any]:
        """
        Konu açıklaması al.
        
        Args:
            user_id: Kullanıcı ID
            topic_name: Konu adı
            student_level: Öğrenci seviyesi
            role: Kullanıcı rolü
            **kwargs: Ek parametreler
            
        Returns:
            AI yanıtı dict olarak
        """
        response = self.process(
            user_id=user_id,
            feature=AIFeature.TOPIC_EXPLANATION,
            variables={
                'topic_name': topic_name,
                'student_level': student_level,
                **kwargs
            },
            role=role
        )
        return response.to_dict()
    
    def create_study_plan(
        self,
        user_id: int,
        goal: str,
        deadline: str,
        role: str = 'student',
        **kwargs
    ) -> Dict[str, Any]:
        """
        Çalışma planı oluştur.
        
        Args:
            user_id: Kullanıcı ID
            goal: Hedef
            deadline: Son tarih
            role: Kullanıcı rolü
            **kwargs: Ek parametreler
            
        Returns:
            AI yanıtı dict olarak
        """
        response = self.process(
            user_id=user_id,
            feature=AIFeature.STUDY_PLAN,
            variables={
                'goal': goal,
                'deadline': deadline,
                **kwargs
            },
            role=role
        )
        return response.to_dict()
    
    def evaluate_answer(
        self,
        user_id: int,
        question: str,
        student_answer: str,
        role: str = 'teacher',
        **kwargs
    ) -> Dict[str, Any]:
        """
        Cevap değerlendir (sadece öğretmenler).
        
        Args:
            user_id: Kullanıcı ID
            question: Soru
            student_answer: Öğrenci cevabı
            role: Kullanıcı rolü
            **kwargs: Ek parametreler
            
        Returns:
            AI yanıtı dict olarak
        """
        response = self.process(
            user_id=user_id,
            feature=AIFeature.ANSWER_EVALUATION,
            variables={
                'question': question,
                'student_answer': student_answer,
                **kwargs
            },
            role=role
        )
        return response.to_dict()
    
    def analyze_performance(
        self,
        user_id: int,
        student_data: str,
        role: str = 'student',
        **kwargs
    ) -> Dict[str, Any]:
        """
        Performans analizi yap.
        
        Args:
            user_id: Kullanıcı ID
            student_data: Öğrenci verileri (JSON string)
            role: Kullanıcı rolü
            **kwargs: Ek parametreler
            
        Returns:
            AI yanıtı dict olarak
        """
        response = self.process(
            user_id=user_id,
            feature=AIFeature.PERFORMANCE_ANALYSIS,
            variables={
                'student_data': student_data,
                **kwargs
            },
            role=role
        )
        return response.to_dict()
    
    def generate_questions(
        self,
        user_id: int,
        topic: str,
        difficulty: str = 'orta',
        question_count: int = 5,
        role: str = 'teacher',
        **kwargs
    ) -> Dict[str, Any]:
        """
        Soru üret (sadece öğretmenler).
        
        Args:
            user_id: Kullanıcı ID
            topic: Konu
            difficulty: Zorluk
            question_count: Soru sayısı
            role: Kullanıcı rolü
            **kwargs: Ek parametreler
            
        Returns:
            AI yanıtı dict olarak
        """
        response = self.process(
            user_id=user_id,
            feature=AIFeature.QUESTION_GENERATION,
            variables={
                'topic': topic,
                'difficulty': difficulty,
                'question_count': question_count,
                **kwargs
            },
            role=role
        )
        return response.to_dict()
    
    def enhance_content(
        self,
        user_id: int,
        content: str,
        enhancement_type: str,
        role: str = 'teacher',
        **kwargs
    ) -> Dict[str, Any]:
        """
        İçerik zenginleştir (sadece öğretmenler).
        
        Args:
            user_id: Kullanıcı ID
            content: İçerik
            enhancement_type: Zenginleştirme tipi
            role: Kullanıcı rolü
            **kwargs: Ek parametreler
            
        Returns:
            AI yanıtı dict olarak
        """
        response = self.process(
            user_id=user_id,
            feature=AIFeature.CONTENT_ENHANCEMENT,
            variables={
                'content': content,
                'enhancement_type': enhancement_type,
                **kwargs
            },
            role=role
        )
        return response.to_dict()
    
    def get_motivation(
        self,
        user_id: int,
        student_name: str,
        role: str = 'student',
        **kwargs
    ) -> Dict[str, Any]:
        """
        Motivasyon mesajı al.
        
        Args:
            user_id: Kullanıcı ID
            student_name: Öğrenci adı
            role: Kullanıcı rolü
            **kwargs: Ek parametreler
            
        Returns:
            AI yanıtı dict olarak
        """
        response = self.process(
            user_id=user_id,
            feature=AIFeature.MOTIVATION_MESSAGE,
            variables={
                'student_name': student_name,
                **kwargs
            },
            role=role
        )
        return response.to_dict()
    
    def get_quota_status(self, user_id: int, role: str = 'student') -> Dict[str, Any]:
        """
        Kota durumunu al.
        
        Args:
            user_id: Kullanıcı ID
            role: Kullanıcı rolü
            
        Returns:
            Kota bilgileri
        """
        return self._quota_manager.get_quota_status(user_id, role)
    
    def get_rate_status(self, user_id: int, role: str = 'student') -> Dict[str, Any]:
        """
        Rate limit durumunu al.
        
        Args:
            user_id: Kullanıcı ID
            role: Kullanıcı rolü
            
        Returns:
            Rate limit bilgileri
        """
        return self._rate_limiter.get_rate_status(user_id, role)
    
    def get_available_features(self, role: str = 'student') -> list:
        """
        Kullanılabilir özellikleri listele.
        
        Args:
            role: Kullanıcı rolü
            
        Returns:
            Özellik listesi
        """
        return prompt_manager.list_available_features(role)
    
    def health_check(self) -> Dict[str, Any]:
        """
        Servis sağlık kontrolü.
        
        Returns:
            Sağlık durumu
        """
        provider_health = self.provider.health_check()
        
        return {
            'status': 'healthy' if provider_health.is_healthy else 'degraded',
            'provider': {
                'name': self.provider.name,
                'is_healthy': provider_health.is_healthy,
                'latency_ms': provider_health.latency_ms,
                'error': provider_health.error_message
            },
            'quota_backend': 'redis' if self._quota_manager.is_redis_available else 'memory',
            'rate_limiter_backend': 'redis' if self._rate_limiter.is_redis_available else 'memory',
            'checked_at': datetime.utcnow().isoformat()
        }
    
    def _get_client_ip(self) -> Optional[str]:
        """Flask request'ten client IP al."""
        try:
            if flask_request:
                return flask_request.environ.get('HTTP_X_FORWARDED_FOR', flask_request.remote_addr)
        except RuntimeError:
            # Request context dışında
            pass
        return None


# Singleton instance
ai_service = AIServiceFacade()
