"""
AI Module - Services.

AI iş mantığı ve Mock/GPT servis implementasyonları.
"""

import time
import random
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, date
from typing import Dict, Any, Optional, List, Tuple

from flask import current_app, g
from app.extensions import db
from app.models.ai import AIUsageLog, AIQuota, AIConfiguration, AIViolation
from app.core.exceptions import (
    ValidationError,
    ForbiddenError,
    NotFoundError
)


# =============================================================================
# KOTA KONFİGÜRASYONU
# =============================================================================

# Her AI özelliğinin token maliyeti
TOKEN_COSTS = {
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

# Rol bazlı kota limitleri
QUOTA_LIMITS = {
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
        "features": "*"  # Tüm özellikler
    },
    "super_admin": {
        "daily_tokens": -1,  # Sınırsız
        "monthly_tokens": -1,
        "daily_requests": -1,
        "monthly_requests": -1,
        "max_tokens_per_request": -1,
        "cooldown_seconds": 0,
        "features": "*"
    }
}

# Tehlikeli içerik filtreleme
BANNED_PATTERNS = [
    "intihar", "kendine zarar", "şiddet", "silah",
    "uyuşturucu", "yasadışı", "hack", "şifre kır"
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
# AI SERVICE INTERFACE
# =============================================================================

class AIServiceInterface(ABC):
    """AI servisi için abstract interface."""
    
    @abstractmethod
    def generate_hint(self, question: str, hint_level: int, subject: str = None) -> Dict[str, Any]:
        """Soru için ipucu üretir."""
        pass
    
    @abstractmethod
    def explain_topic(self, topic: str, difficulty: str, learning_style: str = None) -> Dict[str, Any]:
        """Konu açıklaması üretir."""
        pass
    
    @abstractmethod
    def create_study_plan(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Kişisel çalışma planı oluşturur."""
        pass
    
    @abstractmethod
    def evaluate_answer(self, question: str, answer: str, rubric: Dict = None) -> Dict[str, Any]:
        """Açık uçlu cevabı değerlendirir."""
        pass
    
    @abstractmethod
    def analyze_performance(self, performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Öğrenci performansını analiz eder."""
        pass
    
    @abstractmethod
    def generate_questions(self, topic: str, difficulty: str, count: int, q_type: str) -> Dict[str, Any]:
        """Soru oluşturur."""
        pass
    
    @abstractmethod
    def enhance_content(self, content: str, content_type: str, options: Dict) -> Dict[str, Any]:
        """İçerik zenginleştirir."""
        pass


# =============================================================================
# MOCK AI SERVICE
# =============================================================================

class MockAIService(AIServiceInterface):
    """Geliştirme için mock AI servisi."""
    
    def __init__(self):
        self.delay_simulation = True
        self.min_delay = 0.3
        self.max_delay = 1.0
    
    def _simulate_delay(self):
        """API gecikmesini simüle et."""
        if self.delay_simulation:
            delay = random.uniform(self.min_delay, self.max_delay)
            time.sleep(delay)
    
    def _generate_id(self, prefix: str = "ai") -> str:
        """Benzersiz ID oluştur."""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        random_part = hashlib.md5(str(random.random()).encode()).hexdigest()[:6]
        return f"{prefix}-{timestamp}-{random_part}"
    
    def generate_hint(self, question: str, hint_level: int, subject: str = None) -> Dict[str, Any]:
        """Mock soru ipucu."""
        self._simulate_delay()
        
        hints = {
            1: [
                "Bu soruda hangi temel kavramları kullanman gerektiğini düşün.",
                "Soruyu dikkatli oku ve verilenleri belirle.",
                "Bu tür sorularda genellikle hangi formül kullanılır?",
                "Problemdeki anahtar kelimelere dikkat et."
            ],
            2: [
                "İlk adım olarak verilenleri ve istenenleri ayrı ayrı yaz.",
                "Bu konuyla ilgili formülü hatırla ve değişkenleri belirle.",
                "Adım adım ilerle: önce x değerini bul.",
                "Verilen bilgileri kullanarak ara bir değer hesapla."
            ],
            3: [
                "Formülü uygula: Verilen değerleri yerine koyarak çöz.",
                "x = verilen_değer1 / verilen_değer2 formülünü kullan.",
                "Sonucu bulduktan sonra birimi kontrol etmeyi unutma.",
                "Son adımda cevabını soruyla karşılaştırarak doğrula."
            ]
        }
        
        hint_list = hints.get(hint_level, hints[1])
        selected_hint = random.choice(hint_list)
        
        # Konu bazlı özelleştirme
        if subject:
            selected_hint = f"[{subject}] {selected_hint}"
        
        return {
            "hint_level": hint_level,
            "hint_text": selected_hint,
            "next_hint_available": hint_level < 3,
            "hints_remaining": 3 - hint_level,
            "related_topics": self._get_related_topics(subject),
            "mock": True
        }
    
    def explain_topic(self, topic: str, difficulty: str, learning_style: str = None) -> Dict[str, Any]:
        """Mock konu açıklaması."""
        self._simulate_delay()
        
        difficulty_intros = {
            "basic": "Temel düzeyde açıklarsak",
            "medium": "Orta düzeyde incelersek",
            "advanced": "İleri düzeyde ele alırsak"
        }
        
        intro = difficulty_intros.get(difficulty, difficulty_intros["medium"])
        
        explanation = f"""{intro}, {topic} konusu şu şekilde açıklanabilir:

{topic}, günlük hayatta sıkça karşılaştığımız bir kavramdır. Bu konuyu anlamak için öncelikle temel prensipleri kavramak gerekir.

1. **Temel Tanım**: {topic} kavramı, belirli kurallar çerçevesinde işleyen bir sistemdir.

2. **Uygulama Alanları**: Bu konu; matematik, fen bilimleri ve günlük yaşamda pek çok alanda kullanılır.

3. **Önemli Noktalar**: 
   - Kavramın özünü anlamak çok önemlidir
   - Pratik yapmak konuyu pekiştirir
   - Farklı örnekler üzerinde çalışmak faydalıdır

Bu açıklama mock bir yanıttır ve gerçek AI entegrasyonunda daha detaylı içerik sunulacaktır."""
        
        examples = [
            {
                "title": "Günlük Hayat Örneği",
                "content": f"{topic} konusunu günlük hayatta şöyle görebiliriz: Alışveriş yaparken, yemek yaparken veya seyahat ederken bu kavramla karşılaşırız."
            },
            {
                "title": "Problem Örneği",
                "content": f"Örnek soru: {topic} ile ilgili basit bir hesaplama yapınız. Çözüm: Adım adım ilerleyerek sonuca ulaşırız."
            }
        ]
        
        return {
            "topic": topic,
            "explanation": explanation,
            "examples": examples,
            "visual_suggestion": f"{topic} için açıklayıcı bir diyagram çizimi önerilir.",
            "difficulty_level": difficulty,
            "related_topics": self._get_related_topics(topic),
            "mock": True
        }
    
    def create_study_plan(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Mock çalışma planı."""
        self._simulate_delay()
        
        daily_hours = user_data.get('daily_hours', 2)
        weak_topics = user_data.get('weak_topics', ['Genel Konular'])
        preferred_times = user_data.get('preferred_times', ['afternoon'])
        
        time_slots = {
            'morning': '09:00-11:00',
            'afternoon': '14:00-16:00',
            'evening': '18:00-20:00',
            'night': '21:00-23:00'
        }
        
        selected_time = time_slots.get(preferred_times[0] if preferred_times else 'afternoon', '14:00-16:00')
        
        schedule = {
            "monday": [
                {"time": selected_time, "topic": weak_topics[0] if weak_topics else "Matematik", "activity": "Konu tekrarı"},
            ],
            "tuesday": [
                {"time": selected_time, "topic": weak_topics[0] if weak_topics else "Matematik", "activity": "Soru çözümü"},
            ],
            "wednesday": [
                {"time": selected_time, "topic": weak_topics[1] if len(weak_topics) > 1 else "Fen Bilgisi", "activity": "Video izleme"},
            ],
            "thursday": [
                {"time": selected_time, "topic": weak_topics[1] if len(weak_topics) > 1 else "Fen Bilgisi", "activity": "Pratik"},
            ],
            "friday": [
                {"time": selected_time, "topic": "Karma", "activity": "Genel tekrar"},
            ],
            "saturday": [
                {"time": selected_time, "topic": "Deneme Sınavı", "activity": "Test çözümü"},
            ],
            "sunday": [
                {"time": "10:00-11:00", "topic": "Haftalık Değerlendirme", "activity": "Eksik analizi"},
            ]
        }
        
        return {
            "plan_id": self._generate_id("SP"),
            "duration_weeks": 4,
            "weekly_hours": daily_hours * 7,
            "schedule": schedule,
            "milestones": [
                {"week": 1, "goal": f"{weak_topics[0] if weak_topics else 'İlk konu'} temel seviye"},
                {"week": 2, "goal": "Orta seviye sorular çözebilme"},
                {"week": 3, "goal": "İleri seviye konulara geçiş"},
                {"week": 4, "goal": "Genel tekrar ve sınav hazırlığı"}
            ],
            "focus_areas": weak_topics or ["Genel çalışma"],
            "tips": [
                "Her gün düzenli çalışmaya özen göster",
                "Anlamadığın konuları hemen not al",
                "Düzenli molalar ver (25 dk çalış, 5 dk dinlen)",
                "Konuları başkasına anlatarak pekiştir"
            ],
            "mock": True
        }
    
    def evaluate_answer(self, question: str, answer: str, rubric: Dict = None) -> Dict[str, Any]:
        """Mock cevap değerlendirme."""
        self._simulate_delay()
        
        # Basit bir değerlendirme simülasyonu
        answer_length = len(answer)
        base_score = min(answer_length / 100, 1.0)  # Uzun cevaplar daha yüksek puan
        
        # Rastgele varyasyon ekle
        score_variation = random.uniform(-0.2, 0.2)
        final_score = max(0, min(1, base_score + score_variation))
        
        max_score = rubric.get('max_score', 10) if rubric else 10
        suggested_score = round(final_score * max_score, 1)
        
        evaluation = {
            "content_accuracy": {
                "score": round(random.uniform(6, 9), 1),
                "feedback": "İçerik genel olarak doğru kavramlar içeriyor."
            },
            "argumentation": {
                "score": round(random.uniform(5, 8), 1),
                "feedback": "Argümanlar mantıklı bir şekilde sunulmuş."
            },
            "language": {
                "score": round(random.uniform(6, 9), 1),
                "feedback": "Dil kullanımı akademik standartlara uygun."
            },
            "completeness": {
                "score": round(random.uniform(5, 8), 1),
                "feedback": "Cevap sorunun tüm yönlerini kısmen ele alıyor."
            }
        }
        
        return {
            "suggested_score": suggested_score,
            "max_score": max_score,
            "evaluation": evaluation,
            "overall_feedback": "Öğrenci konuyu kavramış görünüyor. Bazı detaylar geliştirilebilir.",
            "improvement_suggestions": [
                "Daha fazla örnek kullanılabilir",
                "Kavramlar arası bağlantılar güçlendirilebilir",
                "Sonuç paragrafı daha net olabilir"
            ],
            "confidence_level": round(random.uniform(0.7, 0.9), 2),
            "mock": True
        }
    
    def analyze_performance(self, performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Mock performans analizi."""
        self._simulate_delay()
        
        student_id = performance_data.get('student_id')
        period_days = performance_data.get('period_days', 30)
        
        # Mock analiz sonuçları
        strengths = random.sample([
            "Geometri", "Temel Matematik", "Okuma Anlama",
            "Fen Bilimleri", "Problem Çözme", "Sözel Yetenek"
        ], k=2)
        
        weaknesses = random.sample([
            "Türev", "İntegral", "Trigonometri",
            "Fizik Problemleri", "Kimya Denklemleri", "Olasılık"
        ], k=2)
        
        return {
            "student_id": student_id,
            "analysis_period": f"Son {period_days} gün",
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendations": [
                f"{weaknesses[0]} konusuna günde 30 dakika ayırmalı",
                "Pratik soru sayısını artırmalı",
                f"{strengths[0]} konusundaki başarıyı korumak için düzenli tekrar yapmalı",
                "Deneme sınavlarına daha fazla katılmalı"
            ],
            "predicted_success_rate": round(random.uniform(60, 85), 1),
            "trend": random.choice(["improving", "stable", "declining"]),
            "detailed_analysis": {
                "total_questions_attempted": random.randint(50, 200),
                "correct_rate": round(random.uniform(0.5, 0.8), 2),
                "average_time_per_question": round(random.uniform(30, 120), 1),
                "consistency_score": round(random.uniform(0.6, 0.9), 2)
            },
            "mock": True
        }
    
    def generate_questions(self, topic: str, difficulty: str, count: int, q_type: str) -> Dict[str, Any]:
        """Mock soru oluşturma."""
        self._simulate_delay()
        
        questions = []
        
        for i in range(count):
            if q_type == 'multiple_choice':
                question = {
                    "id": i + 1,
                    "text": f"{topic} konusuyla ilgili örnek soru {i + 1}: Bu sorunun cevabı nedir?",
                    "type": "multiple_choice",
                    "options": [
                        {"key": "A", "text": "Seçenek A"},
                        {"key": "B", "text": "Seçenek B"},
                        {"key": "C", "text": "Seçenek C"},
                        {"key": "D", "text": "Seçenek D"}
                    ],
                    "correct_answer": random.choice(["A", "B", "C", "D"]),
                    "explanation": f"Bu sorunun doğru cevabı şu şekilde bulunur: {topic} konusundaki temel prensipler uygulanır."
                }
            elif q_type == 'true_false':
                question = {
                    "id": i + 1,
                    "text": f"{topic} konusuyla ilgili doğru/yanlış ifadesi {i + 1}.",
                    "type": "true_false",
                    "correct_answer": random.choice([True, False]),
                    "explanation": f"Bu ifade {'doğrudur' if random.choice([True, False]) else 'yanlıştır'} çünkü..."
                }
            elif q_type == 'fill_blank':
                question = {
                    "id": i + 1,
                    "text": f"{topic} konusunda _____ kavramı önemlidir.",
                    "type": "fill_blank",
                    "correct_answer": "temel kavram",
                    "explanation": "Boşluğa gelecek ifade konunun temel kavramlarından biridir."
                }
            else:  # open_ended
                question = {
                    "id": i + 1,
                    "text": f"{topic} konusunu kendi cümlelerinizle açıklayınız.",
                    "type": "open_ended",
                    "sample_answer": f"{topic} konusu şu şekilde açıklanabilir...",
                    "rubric": {
                        "content": 40,
                        "clarity": 30,
                        "examples": 30
                    }
                }
            
            questions.append(question)
        
        return {
            "topic": topic,
            "questions": questions,
            "count": count,
            "difficulty": difficulty,
            "mock": True
        }
    
    def enhance_content(self, content: str, content_type: str, options: Dict) -> Dict[str, Any]:
        """Mock içerik zenginleştirme."""
        self._simulate_delay()
        
        enhanced = f"""## Zenginleştirilmiş İçerik

{content}

### Ek Açıklamalar

Bu içerik AI tarafından zenginleştirilmiştir. Aşağıdaki eklemeler yapılmıştır:

1. **Kavram Açıklamaları**: Temel kavramlar daha detaylı açıklanmıştır.
2. **Görsel Öneriler**: İçeriğe uygun görseller önerilmiştir.
3. **Pratik Uygulamalar**: Konunun günlük hayattaki uygulamaları eklenmiştir.

*Bu mock bir zenginleştirmedir. Gerçek AI entegrasyonunda daha kapsamlı içerik sunulacaktır.*"""
        
        examples = []
        if options.get('add_examples', True):
            examples = [
                {"title": "Örnek 1", "content": "Konuyla ilgili pratik bir örnek..."},
                {"title": "Örnek 2", "content": "Günlük hayattan bir uygulama..."}
            ]
        
        summary = ""
        if options.get('add_summary', True):
            summary = f"Bu içeriğin özeti: {content[:100]}... şeklinde özetlenebilir."
        
        return {
            "original_length": len(content),
            "enhanced_content": enhanced,
            "added_examples": examples,
            "summary": summary,
            "key_points": [
                "Ana kavram 1",
                "Ana kavram 2",
                "Önemli nokta 1",
                "Önemli nokta 2"
            ],
            "mock": True
        }
    
    def _get_related_topics(self, topic: str = None) -> List[str]:
        """İlgili konuları döndür."""
        all_topics = [
            "Temel Matematik", "Geometri", "Cebir", "Trigonometri",
            "Fizik", "Kimya", "Biyoloji", "Türkçe", "Tarih", "Coğrafya"
        ]
        return random.sample(all_topics, k=min(3, len(all_topics)))


# =============================================================================
# GPT AI SERVICE (Gelecekte Implementasyon)
# =============================================================================

class GPTAIService(AIServiceInterface):
    """OpenAI GPT API servisi (gelecek implementasyon)."""
    
    def __init__(self):
        self.api_key = current_app.config.get('OPENAI_API_KEY')
        self.model = current_app.config.get('OPENAI_MODEL', 'gpt-4o-mini')
        self.max_tokens = current_app.config.get('OPENAI_MAX_TOKENS', 1000)
    
    def _call_api(self, messages: List[Dict], max_tokens: int = None) -> str:
        """OpenAI API çağrısı."""
        # TODO: Gerçek implementasyon
        raise NotImplementedError("GPT API entegrasyonu henüz yapılmadı. Mock servis kullanın.")
    
    def generate_hint(self, question: str, hint_level: int, subject: str = None) -> Dict[str, Any]:
        raise NotImplementedError("GPT API entegrasyonu henüz yapılmadı.")
    
    def explain_topic(self, topic: str, difficulty: str, learning_style: str = None) -> Dict[str, Any]:
        raise NotImplementedError("GPT API entegrasyonu henüz yapılmadı.")
    
    def create_study_plan(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError("GPT API entegrasyonu henüz yapılmadı.")
    
    def evaluate_answer(self, question: str, answer: str, rubric: Dict = None) -> Dict[str, Any]:
        raise NotImplementedError("GPT API entegrasyonu henüz yapılmadı.")
    
    def analyze_performance(self, performance_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError("GPT API entegrasyonu henüz yapılmadı.")
    
    def generate_questions(self, topic: str, difficulty: str, count: int, q_type: str) -> Dict[str, Any]:
        raise NotImplementedError("GPT API entegrasyonu henüz yapılmadı.")
    
    def enhance_content(self, content: str, content_type: str, options: Dict) -> Dict[str, Any]:
        raise NotImplementedError("GPT API entegrasyonu henüz yapılmadı.")


# =============================================================================
# AI SERVICE FACTORY
# =============================================================================

class AIServiceFactory:
    """AI servis fabrikası."""
    
    _instance: Optional[AIServiceInterface] = None
    
    @classmethod
    def get_service(cls) -> AIServiceInterface:
        """Konfigürasyona göre uygun AI servisini döner."""
        if cls._instance is None:
            provider = current_app.config.get('AI_PROVIDER', 'mock')
            
            if provider == 'openai' or provider == 'gpt':
                cls._instance = GPTAIService()
            else:
                cls._instance = MockAIService()
        
        return cls._instance
    
    @classmethod
    def reset(cls):
        """Test için servisi sıfırlar."""
        cls._instance = None


# =============================================================================
# ANA AI SERVİSİ
# =============================================================================

class AIService:
    """Ana AI servis sınıfı - Kota yönetimi ve güvenlik dahil."""
    
    @classmethod
    def _get_user_role(cls, user) -> str:
        """Kullanıcı rolünü al."""
        if hasattr(user, 'role') and user.role:
            return user.role.name.lower()
        return 'student'
    
    @classmethod
    def _get_quota_limits(cls, role: str) -> Dict[str, Any]:
        """Rol için kota limitlerini al."""
        return QUOTA_LIMITS.get(role, QUOTA_LIMITS['student'])
    
    @classmethod
    def _check_feature_access(cls, role: str, feature: str) -> bool:
        """Özelliğe erişim kontrolü."""
        limits = cls._get_quota_limits(role)
        allowed_features = limits.get('features', [])
        
        if allowed_features == '*':
            return True
        
        return feature in allowed_features
    
    @classmethod
    def _check_content_safety(cls, text: str) -> Tuple[bool, Optional[str]]:
        """İçerik güvenlik kontrolü."""
        text_lower = text.lower()
        
        # Yasaklı içerik kontrolü
        for pattern in BANNED_PATTERNS:
            if pattern in text_lower:
                return False, "Bu tür içerikler AI tarafından işlenememektedir."
        
        # Yönlendirme gerektiren konular
        for topic, message in REDIRECT_TOPICS.items():
            if topic in text_lower:
                return False, message
        
        return True, None
    
    @classmethod
    def _get_or_create_quota(cls, user_id: int) -> AIQuota:
        """Kullanıcı kotasını al veya oluştur."""
        quota = AIQuota.query.filter_by(user_id=user_id).first()
        
        if not quota:
            quota = AIQuota(user_id=user_id)
            db.session.add(quota)
            db.session.commit()
        
        return quota
    
    @classmethod
    def _check_quota(cls, user, feature: str) -> Tuple[bool, Optional[str], Optional[Dict]]:
        """
        Kota kontrolü.
        
        Returns:
            (geçerli_mi, hata_mesajı, kota_detayları)
        """
        role = cls._get_user_role(user)
        limits = cls._get_quota_limits(role)
        
        # Sınırsız kota kontrolü
        if limits['daily_tokens'] == -1:
            return True, None, None
        
        # Özellik erişim kontrolü
        if not cls._check_feature_access(role, feature):
            return False, f"Bu özelliğe ({feature}) erişim yetkiniz bulunmuyor.", None
        
        # Kota durumu kontrolü
        quota = cls._get_or_create_quota(user.id)
        
        # Engel kontrolü
        if quota.is_blocked:
            if quota.blocked_until and quota.blocked_until > datetime.utcnow():
                return False, f"AI erişiminiz geçici olarak engellenmiştir. Sebep: {quota.block_reason}", None
            else:
                # Engel süresi dolmuş, kaldır
                quota.is_blocked = False
                quota.blocked_until = None
                quota.block_reason = None
        
        # Kota aşım kontrolü
        is_exceeded, exceeded_type = quota.is_quota_exceeded(limits)
        
        if is_exceeded:
            quota_info = {
                'quota_type': exceeded_type,
                'limit': limits.get(exceeded_type, 0),
                'used': getattr(quota, exceeded_type.replace('daily_', 'daily_').replace('monthly_', 'monthly_'), 0)
            }
            
            if 'daily' in exceeded_type:
                quota_info['resets_at'] = (datetime.utcnow().replace(hour=0, minute=0, second=0) + timedelta(days=1)).isoformat() + 'Z'
            else:
                next_month = (datetime.utcnow().replace(day=1) + timedelta(days=32)).replace(day=1)
                quota_info['resets_at'] = next_month.isoformat() + 'Z'
            
            return False, "AI kullanım kotanızı aştınız.", quota_info
        
        return True, None, None
    
    @classmethod
    def _consume_and_log(cls, user, feature: str, tokens: int, request_data: Dict, response_summary: str, processing_time_ms: int):
        """Kota tüket ve kullanımı logla."""
        # Kota güncelle
        quota = cls._get_or_create_quota(user.id)
        quota.consume_quota(tokens)
        
        # Kullanım logu
        log = AIUsageLog(
            user_id=user.id,
            feature=feature,
            tokens_used=tokens,
            request_data=request_data,
            response_summary=response_summary[:500] if response_summary else None,
            processing_time_ms=processing_time_ms,
            is_mock=current_app.config.get('AI_PROVIDER', 'mock') == 'mock'
        )
        db.session.add(log)
        db.session.commit()
    
    @classmethod
    def _add_quota_info_to_response(cls, response: Dict, user) -> Dict:
        """Yanıta kota bilgisi ekle."""
        role = cls._get_user_role(user)
        limits = cls._get_quota_limits(role)
        quota = cls._get_or_create_quota(user.id)
        
        # Reset kontrolleri
        quota.check_and_reset_daily()
        quota.check_and_reset_monthly()
        
        if limits['daily_tokens'] == -1:
            response['remaining_quota'] = {
                'daily_tokens': 'unlimited',
                'daily_requests': 'unlimited'
            }
        else:
            response['remaining_quota'] = {
                'daily_tokens': max(0, limits['daily_tokens'] - quota.daily_tokens_used),
                'daily_requests': max(0, limits['daily_requests'] - quota.daily_requests_count)
            }
        
        return response
    
    # =========================================================================
    # PUBLIC API METHODS
    # =========================================================================
    
    @classmethod
    def get_hint(cls, user, question_text: str, hint_level: int = 1, subject: str = None, question_id: int = None) -> Dict[str, Any]:
        """Soru ipucu al."""
        feature = 'question_hint'
        
        # İçerik güvenlik kontrolü
        is_safe, safety_message = cls._check_content_safety(question_text)
        if not is_safe:
            raise ValidationError(safety_message)
        
        # Kota kontrolü
        is_valid, error_msg, quota_info = cls._check_quota(user, feature)
        if not is_valid:
            error = ValidationError(error_msg)
            if quota_info:
                error.details = quota_info
            raise error
        
        # AI servisini çağır
        start_time = time.time()
        service = AIServiceFactory.get_service()
        result = service.generate_hint(question_text, hint_level, subject)
        processing_time = int((time.time() - start_time) * 1000)
        
        # Token tüketimi
        tokens = TOKEN_COSTS.get(feature, 100)
        
        # Log ve kota güncelle
        cls._consume_and_log(
            user=user,
            feature=feature,
            tokens=tokens,
            request_data={'question_text': question_text[:200], 'hint_level': hint_level},
            response_summary=result.get('hint_text', '')[:200],
            processing_time_ms=processing_time
        )
        
        # Kota bilgisi ekle
        result['tokens_used'] = tokens
        result = cls._add_quota_info_to_response(result, user)
        
        return result
    
    @classmethod
    def explain_topic(cls, user, topic: str, difficulty: str = 'medium', learning_style: str = None, context: str = None) -> Dict[str, Any]:
        """Konu açıklaması al."""
        feature = 'topic_explanation'
        
        # İçerik güvenlik kontrolü
        is_safe, safety_message = cls._check_content_safety(topic + (context or ''))
        if not is_safe:
            raise ValidationError(safety_message)
        
        # Kota kontrolü
        is_valid, error_msg, quota_info = cls._check_quota(user, feature)
        if not is_valid:
            error = ValidationError(error_msg)
            if quota_info:
                error.details = quota_info
            raise error
        
        # AI servisini çağır
        start_time = time.time()
        service = AIServiceFactory.get_service()
        result = service.explain_topic(topic, difficulty, learning_style)
        processing_time = int((time.time() - start_time) * 1000)
        
        # Token tüketimi
        tokens = TOKEN_COSTS.get(feature, 300)
        
        # Log ve kota güncelle
        cls._consume_and_log(
            user=user,
            feature=feature,
            tokens=tokens,
            request_data={'topic': topic, 'difficulty': difficulty},
            response_summary=result.get('explanation', '')[:200],
            processing_time_ms=processing_time
        )
        
        # Kota bilgisi ekle
        result['tokens_used'] = tokens
        result = cls._add_quota_info_to_response(result, user)
        
        return result
    
    @classmethod
    def create_study_plan(cls, user, plan_data: Dict[str, Any]) -> Dict[str, Any]:
        """Çalışma planı oluştur."""
        feature = 'study_plan'
        
        # Kota kontrolü
        is_valid, error_msg, quota_info = cls._check_quota(user, feature)
        if not is_valid:
            error = ValidationError(error_msg)
            if quota_info:
                error.details = quota_info
            raise error
        
        # AI servisini çağır
        start_time = time.time()
        service = AIServiceFactory.get_service()
        result = service.create_study_plan(plan_data)
        processing_time = int((time.time() - start_time) * 1000)
        
        # Token tüketimi
        tokens = TOKEN_COSTS.get(feature, 500)
        
        # Log ve kota güncelle
        cls._consume_and_log(
            user=user,
            feature=feature,
            tokens=tokens,
            request_data=plan_data,
            response_summary=f"Plan ID: {result.get('plan_id', 'N/A')}",
            processing_time_ms=processing_time
        )
        
        # Kota bilgisi ekle
        result['tokens_used'] = tokens
        result = cls._add_quota_info_to_response(result, user)
        
        return result
    
    @classmethod
    def evaluate_answer(cls, user, question_text: str, student_answer: str, expected_answer: str = None, max_score: float = 10.0, rubric: Dict = None) -> Dict[str, Any]:
        """Cevap değerlendir."""
        feature = 'answer_evaluation'
        
        # Yetki kontrolü (sadece öğretmen ve üstü)
        role = cls._get_user_role(user)
        if role == 'student':
            raise ForbiddenError("Bu özelliğe erişim yetkiniz bulunmuyor.")
        
        # İçerik güvenlik kontrolü
        is_safe, safety_message = cls._check_content_safety(question_text + student_answer)
        if not is_safe:
            raise ValidationError(safety_message)
        
        # Kota kontrolü
        is_valid, error_msg, quota_info = cls._check_quota(user, feature)
        if not is_valid:
            error = ValidationError(error_msg)
            if quota_info:
                error.details = quota_info
            raise error
        
        # AI servisini çağır
        start_time = time.time()
        service = AIServiceFactory.get_service()
        
        eval_rubric = rubric or {'max_score': max_score}
        result = service.evaluate_answer(question_text, student_answer, eval_rubric)
        processing_time = int((time.time() - start_time) * 1000)
        
        # Token tüketimi
        tokens = TOKEN_COSTS.get(feature, 400)
        
        # Log ve kota güncelle
        cls._consume_and_log(
            user=user,
            feature=feature,
            tokens=tokens,
            request_data={'question_length': len(question_text), 'answer_length': len(student_answer)},
            response_summary=f"Score: {result.get('suggested_score', 'N/A')}/{max_score}",
            processing_time_ms=processing_time
        )
        
        # Kota bilgisi ekle
        result['tokens_used'] = tokens
        result = cls._add_quota_info_to_response(result, user)
        
        return result
    
    @classmethod
    def analyze_performance(cls, user, student_id: int = None, period_days: int = 30, include_recommendations: bool = True) -> Dict[str, Any]:
        """Performans analizi."""
        feature = 'performance_analysis'
        
        role = cls._get_user_role(user)
        
        # Öğrenci sadece kendi analizini görebilir
        if role == 'student':
            student_id = user.id
        elif student_id is None:
            student_id = user.id
        
        # Kota kontrolü
        is_valid, error_msg, quota_info = cls._check_quota(user, feature)
        if not is_valid:
            error = ValidationError(error_msg)
            if quota_info:
                error.details = quota_info
            raise error
        
        # AI servisini çağır
        start_time = time.time()
        service = AIServiceFactory.get_service()
        
        performance_data = {
            'student_id': student_id,
            'period_days': period_days,
            'include_recommendations': include_recommendations
        }
        result = service.analyze_performance(performance_data)
        processing_time = int((time.time() - start_time) * 1000)
        
        # Token tüketimi
        tokens = TOKEN_COSTS.get(feature, 600)
        
        # Log ve kota güncelle
        cls._consume_and_log(
            user=user,
            feature=feature,
            tokens=tokens,
            request_data=performance_data,
            response_summary=f"Student: {student_id}, Trend: {result.get('trend', 'N/A')}",
            processing_time_ms=processing_time
        )
        
        # Kota bilgisi ekle
        result['tokens_used'] = tokens
        result = cls._add_quota_info_to_response(result, user)
        
        return result
    
    @classmethod
    def generate_questions(cls, user, topic: str, difficulty: str = 'medium', count: int = 5, question_type: str = 'multiple_choice') -> Dict[str, Any]:
        """Soru oluştur."""
        feature = 'question_generation'
        
        # Yetki kontrolü (sadece öğretmen ve üstü)
        role = cls._get_user_role(user)
        if role == 'student':
            raise ForbiddenError("Bu özelliğe erişim yetkiniz bulunmuyor.")
        
        # İçerik güvenlik kontrolü
        is_safe, safety_message = cls._check_content_safety(topic)
        if not is_safe:
            raise ValidationError(safety_message)
        
        # Kota kontrolü
        is_valid, error_msg, quota_info = cls._check_quota(user, feature)
        if not is_valid:
            error = ValidationError(error_msg)
            if quota_info:
                error.details = quota_info
            raise error
        
        # AI servisini çağır
        start_time = time.time()
        service = AIServiceFactory.get_service()
        result = service.generate_questions(topic, difficulty, count, question_type)
        processing_time = int((time.time() - start_time) * 1000)
        
        # Token tüketimi (soru sayısına göre)
        base_tokens = TOKEN_COSTS.get(feature, 350)
        tokens = base_tokens + (count * 20)  # Her soru için ek token
        
        # Log ve kota güncelle
        cls._consume_and_log(
            user=user,
            feature=feature,
            tokens=tokens,
            request_data={'topic': topic, 'count': count, 'type': question_type},
            response_summary=f"Generated {count} {question_type} questions",
            processing_time_ms=processing_time
        )
        
        # Kota bilgisi ekle
        result['tokens_used'] = tokens
        result = cls._add_quota_info_to_response(result, user)
        
        return result
    
    @classmethod
    def enhance_content(cls, user, content: str, content_type: str = 'lesson', add_examples: bool = True, add_summary: bool = True) -> Dict[str, Any]:
        """İçerik zenginleştir."""
        feature = 'content_enhancement'
        
        # Yetki kontrolü (sadece öğretmen ve üstü)
        role = cls._get_user_role(user)
        if role == 'student':
            raise ForbiddenError("Bu özelliğe erişim yetkiniz bulunmuyor.")
        
        # İçerik güvenlik kontrolü
        is_safe, safety_message = cls._check_content_safety(content)
        if not is_safe:
            raise ValidationError(safety_message)
        
        # Kota kontrolü
        is_valid, error_msg, quota_info = cls._check_quota(user, feature)
        if not is_valid:
            error = ValidationError(error_msg)
            if quota_info:
                error.details = quota_info
            raise error
        
        # AI servisini çağır
        start_time = time.time()
        service = AIServiceFactory.get_service()
        
        options = {
            'add_examples': add_examples,
            'add_summary': add_summary
        }
        result = service.enhance_content(content, content_type, options)
        processing_time = int((time.time() - start_time) * 1000)
        
        # Token tüketimi (içerik uzunluğuna göre)
        base_tokens = TOKEN_COSTS.get(feature, 450)
        tokens = base_tokens + (len(content) // 100)  # Her 100 karakter için ek token
        
        # Log ve kota güncelle
        cls._consume_and_log(
            user=user,
            feature=feature,
            tokens=tokens,
            request_data={'content_length': len(content), 'content_type': content_type},
            response_summary=f"Enhanced content: {len(result.get('enhanced_content', ''))} chars",
            processing_time_ms=processing_time
        )
        
        # Kota bilgisi ekle
        result['tokens_used'] = tokens
        result = cls._add_quota_info_to_response(result, user)
        
        return result
    
    # =========================================================================
    # KOTA VE KULLANIM YÖNETİMİ
    # =========================================================================
    
    @classmethod
    def get_quota_status(cls, user) -> Dict[str, Any]:
        """Kullanıcının kota durumunu döndür."""
        role = cls._get_user_role(user)
        limits = cls._get_quota_limits(role)
        quota = cls._get_or_create_quota(user.id)
        
        # Reset kontrolleri
        quota.check_and_reset_daily()
        quota.check_and_reset_monthly()
        db.session.commit()
        
        return {
            'role': role,
            'daily_tokens_used': quota.daily_tokens_used,
            'daily_tokens_limit': limits['daily_tokens'],
            'monthly_tokens_used': quota.monthly_tokens_used,
            'monthly_tokens_limit': limits['monthly_tokens'],
            'daily_requests_count': quota.daily_requests_count,
            'daily_requests_limit': limits['daily_requests'],
            'monthly_requests_count': quota.monthly_requests_count,
            'monthly_requests_limit': limits['monthly_requests'],
            'daily_reset_at': quota.daily_reset_at.isoformat() if quota.daily_reset_at else None,
            'monthly_reset_at': quota.monthly_reset_at.isoformat() if quota.monthly_reset_at else None,
            'is_blocked': quota.is_blocked,
            'blocked_until': quota.blocked_until.isoformat() if quota.blocked_until else None,
            'block_reason': quota.block_reason,
            'available_features': limits['features'] if limits['features'] != '*' else list(TOKEN_COSTS.keys()),
            'cooldown_seconds': limits['cooldown_seconds']
        }
    
    @classmethod
    def get_usage_history(cls, user, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Kullanıcının AI kullanım geçmişini döndür."""
        logs = AIUsageLog.query.filter_by(user_id=user.id)\
            .order_by(AIUsageLog.created_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
        
        total = AIUsageLog.query.filter_by(user_id=user.id).count()
        
        return {
            'items': [log.to_dict() for log in logs],
            'total': total,
            'limit': limit,
            'offset': offset
        }
    
    @classmethod
    def get_available_features(cls, user) -> List[Dict[str, Any]]:
        """Kullanıcının erişebileceği AI özelliklerini döndür."""
        role = cls._get_user_role(user)
        limits = cls._get_quota_limits(role)
        allowed_features = limits.get('features', [])
        
        features = []
        for feature, cost in TOKEN_COSTS.items():
            available = allowed_features == '*' or feature in allowed_features
            features.append({
                'name': feature,
                'description': cls._get_feature_description(feature),
                'token_cost': cost,
                'available': available,
                'cooldown_seconds': limits['cooldown_seconds'] if available else None
            })
        
        return features
    
    @staticmethod
    def _get_feature_description(feature: str) -> str:
        """Özellik açıklaması döndür."""
        descriptions = {
            'question_hint': 'Soru çözerken ipucu alma',
            'topic_explanation': 'Konu anlatım desteği',
            'study_plan': 'Kişisel çalışma planı oluşturma',
            'answer_evaluation': 'Açık uçlu cevap değerlendirme',
            'performance_analysis': 'Öğrenci performans analizi',
            'question_generation': 'Otomatik soru oluşturma',
            'content_enhancement': 'İçerik zenginleştirme',
            'class_performance': 'Sınıf performans raporu',
            'usage_analytics': 'Platform kullanım analizi',
            'motivation_message': 'Motivasyon mesajları'
        }
        return descriptions.get(feature, feature)
