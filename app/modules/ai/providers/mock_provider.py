"""
AI Providers - Mock Provider.

Geliştirme ve test için Mock AI Provider.
"""

import time
import random
import re
from typing import Generator, Dict, Any, Optional
from datetime import datetime

from app.modules.ai.providers.base import BaseProvider
from app.modules.ai.core.interfaces import AIRequest, AIResponse, AIFeature
from app.modules.ai.core.constants import BANNED_PATTERNS, REDIRECT_TOPICS


class MockProvider(BaseProvider):
    """
    Mock AI Provider.
    
    Gerçek AI API'si olmadan sistem testleri için kullanılır.
    Realistic yanıtlar üretir ve gerçek provider davranışını simüle eder.
    """
    
    @property
    def name(self) -> str:
        return "mock"
    
    def _do_initialize(self) -> None:
        """Mock provider initialization."""
        pass  # Mock için initialization gerekmiyor
    
    def _do_health_check(self) -> bool:
        """Mock her zaman sağlıklı."""
        return True
    
    def complete(self, request: AIRequest) -> AIResponse:
        """Mock completion."""
        start_time = time.time()
        
        # Simulated delay
        delay = random.uniform(
            self.config.get('delay_min', 0.3),
            self.config.get('delay_max', 1.0)
        )
        time.sleep(delay)
        
        # İçerik güvenliği kontrolü
        safety_result = self._check_content_safety(request.prompt)
        if safety_result:
            content = safety_result
            tokens_used = self.count_tokens(content)
        else:
            # Feature'a göre yanıt üret
            content = self._generate_response(request)
            tokens_used = self.count_tokens(content)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return self._create_response(
            content=content,
            request=request,
            tokens_used=tokens_used,
            model="mock-v1",
            processing_time_ms=processing_time,
            is_mock=True,
            metadata={
                'simulated_delay': delay,
                'safety_filtered': bool(safety_result)
            }
        )
    
    def stream(self, request: AIRequest) -> Generator[str, None, None]:
        """Mock streaming completion."""
        content = self._generate_response(request)
        words = content.split()
        
        for word in words:
            yield word + " "
            time.sleep(random.uniform(0.01, 0.05))
    
    def _check_content_safety(self, text: str) -> Optional[str]:
        """İçerik güvenliği kontrolü."""
        text_lower = text.lower()
        
        # Yasaklı pattern kontrolü
        for pattern in BANNED_PATTERNS:
            if pattern in text_lower:
                return "Bu tür içerikler hakkında yardımcı olamıyorum. Lütfen eğitimle ilgili bir soru sorun."
        
        # Yönlendirme konuları kontrolü
        for topic, redirect_message in REDIRECT_TOPICS.items():
            if topic in text_lower:
                return redirect_message
        
        return None
    
    def _generate_response(self, request: AIRequest) -> str:
        """Feature'a göre mock yanıt üret."""
        generators = {
            AIFeature.QUESTION_HINT: self._generate_hint,
            AIFeature.TOPIC_EXPLANATION: self._generate_explanation,
            AIFeature.STUDY_PLAN: self._generate_study_plan,
            AIFeature.ANSWER_EVALUATION: self._generate_evaluation,
            AIFeature.PERFORMANCE_ANALYSIS: self._generate_analysis,
            AIFeature.QUESTION_GENERATION: self._generate_questions,
            AIFeature.CONTENT_ENHANCEMENT: self._generate_enhancement,
            AIFeature.MOTIVATION_MESSAGE: self._generate_motivation
        }
        
        generator = generators.get(request.feature)
        if generator:
            return generator(request)
        
        return f"Mock yanıt - Feature: {request.feature.value}"
    
    def _generate_hint(self, request: AIRequest) -> str:
        """Soru ipucu üret."""
        hints = [
            "💡 **İpucu**\n\nBu soruyu çözerken önce verilenleri dikkatlice listele.\n\n**Düşünme Yönlendirmesi:**\nProblemi daha küçük parçalara ayırmayı dene.\n\n**İlgili Kavram:**\nBu tür sorularda temel formülleri hatırla.\n\n**Strateji:**\nAdım adım ilerle, aceye gelme!",
            "🎯 **Yönlendirici İpucu**\n\n**Adım 1:** Sorunun ne istediğini tam olarak anla.\n\n**Adım 2:** Bildiklerini yaz.\n\n**Adım 3:** Bilinmeyen ile bilinen arasındaki ilişkiyi bul.\n\n*İpucu: Benzer sorularda hangi yöntemi kullandığını hatırla!*",
            "🔍 **Düşünme Rehberi**\n\n1. **Verilenler:** Soruda hangi bilgiler var?\n2. **İstenen:** Ne bulmamız gerekiyor?\n3. **Bağlantı:** Bu ikisi nasıl ilişkili?\n\n💪 Doğru yoldasın, devam et!"
        ]
        return random.choice(hints)
    
    def _generate_explanation(self, request: AIRequest) -> str:
        """Konu açıklaması üret."""
        context = request.context
        topic = context.get('topic_name', 'Konu')
        
        return f"""📚 **{topic} - Detaylı Açıklama**

## Temel Kavram
{topic}, öğrenme sürecinin önemli bir parçasıdır. Bu kavramı anlamak için önce temel prensipleri kavramalısın.

## Detaylı Açıklama
Bu konuyu daha iyi anlamak için şu adımları takip edelim:

1. **Tanım**: {topic} nedir ve neden önemlidir?
2. **Özellikler**: Temel karakteristikleri nelerdir?
3. **Uygulama**: Günlük hayatta nasıl karşımıza çıkar?

## Örnekler
- **Örnek 1**: Basit bir uygulama
- **Örnek 2**: Orta düzey bir problem
- **Örnek 3**: Gelişmiş bir senaryo

## Özet
{topic} konusunu öğrenirken temel prensipleri kavramak ve bol pratik yapmak önemlidir.

## ✅ Kendini Test Et
Bu konuyu ne kadar anladığını test etmek için: Bu kavramı kendi cümlelerinle açıklamayı dene!"""
    
    def _generate_study_plan(self, request: AIRequest) -> str:
        """Çalışma planı üret."""
        context = request.context
        goal = context.get('goal', 'Hedef')
        
        return f"""📋 **Kişiselleştirilmiş Çalışma Planı**

## 🎯 Hedef: {goal}

### Genel Strateji
Bu hedefe ulaşmak için sistematik ve düzenli bir çalışma programı oluşturdum.

### 📅 Haftalık Program

| Gün | Sabah (09:00-11:00) | Öğlen (14:00-16:00) | Akşam (19:00-21:00) |
|-----|---------------------|---------------------|---------------------|
| Pzt | Teori çalışması | Pratik | Tekrar |
| Sal | Yeni konu | Soru çözümü | Özet |
| Çar | Tekrar | Test | Değerlendirme |
| Per | Zayıf konular | Pratik | Ara |
| Cum | Genel tekrar | Mock test | - |
| Cmt | Eksik tamamlama | - | - |
| Paz | Dinlenme | - | - |

### 📊 Konu Önceliklendirme
1. 🔴 Acil: Zayıf konuları güçlendir
2. 🟡 Orta: Temel konuları pekiştir
3. 🟢 Düşük: Güçlü konuları koru

### 💪 Motivasyon İpuçları
- Her gün küçük hedefler belirle
- Başarılarını kutla
- Düzenli mola ver
- Yeterli uyku al

### ⚠️ Değerlendirme Noktaları
- Haftalık: Mini test
- İki haftada bir: Kapsamlı değerlendirme
- Aylık: Genel performans analizi"""
    
    def _generate_evaluation(self, request: AIRequest) -> str:
        """Cevap değerlendirmesi üret."""
        score = random.randint(60, 95)
        
        return f"""📝 **Cevap Değerlendirmesi**

## PUAN: {score} / 100

### ✅ Doğru Yönler
- Temel kavramı doğru anlamışsın
- Mantıksal akış tutarlı
- Önemli noktaları vurgulamışsın

### ⚠️ Eksik/Hatalı Yönler
- Bazı detaylar atlanmış
- Örnek kullanımı yetersiz
- Sonuç bölümü geliştirilebilir

### 💡 İyileştirme Önerileri
1. Cevabını daha detaylı açıkla
2. Örnekler ekle
3. Sonuç paragrafı yaz

### 📊 Genel Değerlendirme
Güzel bir çaba! Temel anlayışın sağlam, birkaç detayı geliştirirsen çok daha iyi olacak.

*Not: Bu bir mock değerlendirmedir. Gerçek değerlendirme için öğretmeninize danışın.*"""
    
    def _generate_analysis(self, request: AIRequest) -> str:
        """Performans analizi üret."""
        return """📊 **Performans Analizi Raporu**

## Genel Performans Özeti
Değerlendirilen dönemde genel performansınız **İYİ** seviyesindedir.

### 📈 Güçlü Yönler
- ✅ Matematik: %85 başarı
- ✅ Düzenli çalışma alışkanlığı
- ✅ Soru çözme hızı artmış

### 📉 Gelişim Gerektiren Alanlar
- ⚠️ Geometri konuları
- ⚠️ Uzun metin soruları
- ⚠️ Zaman yönetimi

### 📊 Trend Analizi
```
Hafta 1: ████████░░ 80%
Hafta 2: █████████░ 85%
Hafta 3: ████████░░ 82%
Hafta 4: ██████████ 90%
```
**Sonuç:** Yükseliş trendi! 🎯

### 💡 Öneriler
1. Geometri için ek pratik yap
2. Uzun metinleri parçalara ayırarak çöz
3. Zamanlı testler ile pratik yap

### 🎯 Sonraki Hedef
- Kısa vadeli: Geometri başarısını %80'e çıkar
- Orta vadeli: Genel ortalamayı %90'a yükselt"""
    
    def _generate_questions(self, request: AIRequest) -> str:
        """Soru üret."""
        context = request.context
        topic = context.get('topic', 'Genel')
        count = context.get('question_count', 3)
        
        questions = []
        for i in range(min(count, 5)):
            questions.append(f"""
### Soru {i+1}
**Zorluk:** {'Kolay' if i < 2 else 'Orta' if i < 4 else 'Zor'}

{topic} konusuyla ilgili örnek soru {i+1}.

A) Şık A
B) Şık B
C) Şık C ✓
D) Şık D

**Açıklama:** Bu sorunun çözümü için temel kavramları bilmek gerekir.
**Ölçtüğü Beceri:** Anlama ve Uygulama
""")
        
        return f"""📝 **Üretilen Sorular - {topic}**

{''.join(questions)}

---
*Bu sorular mock AI tarafından üretilmiştir. Gerçek sınav soruları için öğretmeninize danışın.*"""
    
    def _generate_enhancement(self, request: AIRequest) -> str:
        """İçerik zenginleştirme üret."""
        return """✨ **Zenginleştirilmiş İçerik**

## Orijinal İçerik (Özet)
[Orijinal içerik özeti]

## Zenginleştirilmiş Versiyon
İçerik daha açıklayıcı hale getirildi, örnekler eklendi ve görsel öneriler sunuldu.

### Yapılan Değişiklikler
1. ✅ Daha basit dil kullanıldı
2. ✅ Örnekler eklendi
3. ✅ Alt başlıklar oluşturuldu
4. ✅ Özet eklendi

### Ek Öneriler
- İnfografik eklenebilir
- Video içerik hazırlanabilir
- Etkileşimli quiz eklenebilir

### Görsel/Multimedya Önerileri
- 📊 Akış diyagramı
- 📹 Kısa açıklama videosu
- 🎮 Etkileşimli simülasyon

*Bu bir mock zenginleştirmedir.*"""
    
    def _generate_motivation(self, request: AIRequest) -> str:
        """Motivasyon mesajı üret."""
        context = request.context
        name = context.get('student_name', 'Öğrenci')
        
        messages = [
            f"🌟 Merhaba {name}!\n\nBugün yeni bir gün ve yeni fırsatlarla dolu! Her adım seni hedefe yaklaştırıyor. Küçük ilerlemeler bile büyük başarıların temelidir.\n\n💪 Sen yapabilirsin!",
            f"🎯 Selam {name}!\n\nZorluklarla karşılaşmak normal, önemli olan vazgeçmemek. Her hata aslında bir öğrenme fırsatı. Devam et, yolun yarısını çoktan geçtin!\n\n🚀 Başarıya doğru!",
            f"✨ Hey {name}!\n\nBugün kendine inan! Çalıştıkça gelişiyorsun, her gün biraz daha iyiye gidiyorsun. Unutma: Başarı bir yarış değil, bir yolculuk.\n\n🌈 Harika işler çıkaracaksın!"
        ]
        return random.choice(messages)
