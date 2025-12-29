"""
Mock AI Provider Implementation.

Development ve test ortamlarında kullanılır.
Gerçek API çağrısı yapmadan AI yanıtları simüle eder.

KULLANIM:
=========
    from app.modules.ai.providers import get_ai_provider
    
    provider = get_ai_provider('mock')
    response = provider.complete(request)

ÖZELLİKLER:
===========
- Gerçekçi yanıtlar (her AI özelliği için özelleştirilmiş)
- Yapılandırılabilir gecikme (gerçek API süresini simüle etmek için)
- İsteğe bağlı hata simülasyonu
- Token sayımı simülasyonu
- İçerik güvenlik filtresi simülasyonu
"""

import random
import time
from typing import Dict, Any, Optional, Generator
from datetime import datetime

from .abstraction import (
    BaseAIProvider,
    AICompletionRequest,
    AICompletionResponse,
    ProviderHealthStatus,
    ProviderStatus,
    AIFeatureType,
    AIContentFilterError,
    register_provider
)


@register_provider('mock')
class MockAIProvider(BaseAIProvider):
    """
    Mock AI Provider.
    
    Development ve test ortamları için tasarlanmıştır.
    Ücretli API kullanmadan AI davranışını simüle eder.
    """
    
    # =========================================================================
    # MOCK YANIT ŞABLONLARI
    # =========================================================================
    
    RESPONSE_TEMPLATES = {
        AIFeatureType.QUESTION_HINT: [
            """💡 **İpucu**

Bu soruyu çözerken şu adımları düşün:

1. **Problemi anla**: Soruda ne isteniyor?
2. **Verilenler**: Hangi bilgiler verilmiş?
3. **İlişkiyi kur**: Bu bilgiler nasıl bağlanır?

**Kritik kavram**: Bu konuyla ilgili temel formül veya kuralı hatırla.

Cevabı hemen vermek yerine, bu ipuçlarıyla tekrar dene! 🎯""",
            
            """🔍 **Yardımcı İpucu**

Soruya farklı bir açıdan bakalım:

• Bu tür soruları çözerken önce **ne yapmamalısın** düşün
• Seçenekleri eleme yöntemini dene
• Benzer bir soru çözdüğünü hatırlıyor musun?

**Önemli**: Acele etme, soruyu dikkatlice oku! ✨"""
        ],
        
        AIFeatureType.TOPIC_EXPLANATION: [
            """📚 **Konu Açıklaması**

## Genel Bakış
Bu konu, temel kavramların anlaşılmasıyla başlar ve pratik uygulamalarla pekişir.

## Temel Kavramlar
1. **Birinci kavram**: Detaylı açıklama
2. **İkinci kavram**: Örnekle birlikte
3. **Üçüncü kavram**: Uygulama alanları

## Örnek
```
Gerçek hayattan bir örnek düşün...
```

## Özet
Bu konuyu anlamak için pratik yapmak çok önemli! 📝"""
        ],
        
        AIFeatureType.STUDY_PLAN: [
            """📅 **Kişiselleştirilmiş Çalışma Planı**

## Haftalık Program

### Pazartesi - Çarşamba
- **Sabah (1 saat)**: Teori çalışması
- **Akşam (45 dk)**: Pratik sorular

### Perşembe - Cuma
- **Sabah (1 saat)**: Zor konuları tekrar
- **Akşam (1 saat)**: Test çözümü

### Hafta Sonu
- **Cumartesi**: Deneme sınavı
- **Pazar**: Hataları analiz et

## Öneriler
✅ Pomodoro tekniğini kullan (25 dk çalış, 5 dk mola)
✅ Zorlandığın konuları işaretle
✅ Düzenli uyku ve beslenme

**Başarılar!** 🎯"""
        ],
        
        AIFeatureType.ANSWER_EVALUATION: [
            """✅ **Cevap Değerlendirmesi**

## Genel Değerlendirme
Cevabın **%75 doğru**!

## Güçlü Yönler
- ✅ Ana kavramı doğru anlamışsın
- ✅ Mantık kurma yeteneğin iyi

## Gelişim Alanları
- ⚠️ Detaylarda bazı hatalar var
- ⚠️ Formül uygulamasını tekrar et

## Doğru Yaklaşım
Şu şekilde düşünmeliydin:
1. Önce verilenleri belirle
2. İlgili formülü uygula
3. Sonucu kontrol et

**Öğrenme Önerisi**: Bu konuyla ilgili 5 soru daha çöz! 📝"""
        ],
        
        AIFeatureType.PERFORMANCE_ANALYSIS: [
            """📊 **Performans Analizi**

## Genel Durum
Performansın **ortalama üstü** 👍

## Güçlü Alanlar
| Alan | Başarı |
|------|--------|
| Matematik | %85 |
| Türkçe | %78 |

## Geliştirilmesi Gereken
| Alan | Mevcut | Hedef |
|------|--------|-------|
| Fen | %65 | %80 |
| Sosyal | %60 | %75 |

## Öneriler
1. Fen konularında daha fazla pratik yap
2. Sosyal bilgiler için görsel materyaller kullan
3. Günlük 30 dakika ek çalışma planla

**Motivasyon**: Her gün biraz daha iyiye gidiyorsun! 🚀"""
        ],
        
        AIFeatureType.QUESTION_GENERATION: [
            """❓ **Oluşturulan Soru**

## Soru
Aşağıdakilerden hangisi doğrudur?

A) Birinci seçenek
B) İkinci seçenek
C) Üçüncü seçenek
D) Dördüncü seçenek

## Zorluk: Orta
## Konu: Belirtilen konu
## Beklenen Süre: 2 dakika

---

**Doğru Cevap**: C
**Açıklama**: Bu cevabın doğru olmasının nedeni..."""
        ],
        
        AIFeatureType.CONTENT_ENHANCEMENT: [
            """✨ **İyileştirilmiş İçerik**

## Özet
İçerik daha anlaşılır hale getirildi.

## Yapılan İyileştirmeler
- ✅ Daha net açıklamalar eklendi
- ✅ Örnekler zenginleştirildi
- ✅ Görsel öneriler eklendi

## İyileştirilmiş Metin
[Burada iyileştirilmiş içerik yer alır]

## Öneriler
- İnfografik eklenebilir
- Video içerik destekleyebilir"""
        ],
        
        AIFeatureType.MOTIVATION_MESSAGE: [
            """🌟 **Motivasyon Mesajı**

Hey! Bugün harika bir gün olacak!

Unutma:
> "Başarı, küçük adımların toplamıdır."

## Günün Hedefi
- [ ] 3 konu çalış
- [ ] 10 soru çöz
- [ ] Notlarını gözden geçir

**Sen yapabilirsin!** 💪

Her zorlandığında hatırla: Zorlandığın an öğrendiğin andır! 🎯""",
            
            """💪 **Günlük Motivasyon**

Bugün kendine inan!

📌 **Düşünceler**:
- Her yanlış, doğruya giden bir adımdır
- Kararlılık zekadan önemlidir
- Küçük adımlar büyük başarılar getirir

🎯 **Bugünkü Odak**:
Sadece bugüne odaklan, yarını düşünme!

**Başarılar!** ⭐"""
        ]
    }
    
    # =========================================================================
    # ABSTRACT PROPERTY IMPLEMENTATIONS
    # =========================================================================
    
    @property
    def name(self) -> str:
        return "mock"
    
    @property
    def display_name(self) -> str:
        return "Mock AI Provider"
    
    @property
    def is_production_ready(self) -> bool:
        return False  # Test/development provider
    
    # =========================================================================
    # ABSTRACT METHOD IMPLEMENTATIONS
    # =========================================================================
    
    def _initialize(self) -> None:
        """Mock provider initialization."""
        self._delay_min = self._config.get('delay_min', 0.3)
        self._delay_max = self._config.get('delay_max', 1.0)
        self._simulate_errors = self._config.get('simulate_errors', False)
        self._error_rate = self._config.get('error_rate', 0.1)  # %10 hata şansı
    
    def complete(self, request: AICompletionRequest) -> AICompletionResponse:
        """Mock completion."""
        start_time = time.time()
        
        # Hata simülasyonu
        if self._simulate_errors and random.random() < self._error_rate:
            self._record_error(Exception("Simulated error"))
            raise AIContentFilterError(self.name, "simulated_filter")
        
        # İçerik güvenlik kontrolü
        if request.user_prompt:
            self._check_content_safety(request.user_prompt)
        
        # Gecikme simülasyonu
        delay = random.uniform(self._delay_min, self._delay_max)
        time.sleep(delay)
        
        # Yanıt oluştur
        content = self._generate_response(request.feature, request.user_prompt)
        tokens = self.count_tokens(content)
        
        # İstatistik güncelle
        self._record_request(tokens)
        
        # Latency hesapla
        latency_ms = int((time.time() - start_time) * 1000)
        
        return AICompletionResponse(
            content=content,
            tokens_used=tokens,
            model="mock-model-v1",
            provider=self.name,
            finish_reason="stop",
            request_id=request.request_id,
            latency_ms=latency_ms,
            cached=False,
            metadata={
                'simulated': True,
                'feature': request.feature.value
            }
        )
    
    def stream(self, request: AICompletionRequest) -> Generator[str, None, None]:
        """Mock streaming - kelime kelime yanıt."""
        # Önce normal yanıt al
        response = self.complete(request)
        
        # Kelime kelime yield et
        words = response.content.split()
        for i, word in enumerate(words):
            time.sleep(0.05)  # 50ms per word
            yield word + (" " if i < len(words) - 1 else "")
    
    def health_check(self) -> ProviderHealthStatus:
        """Mock sağlık kontrolü - her zaman healthy."""
        return ProviderHealthStatus(
            status=ProviderStatus.HEALTHY,
            provider=self.name,
            latency_ms=random.randint(5, 20),
            details={
                'version': 'mock-v1',
                'uptime': '99.99%',
                'note': 'Development/test provider'
            }
        )
    
    def count_tokens(self, text: str) -> int:
        """Yaklaşık token sayımı."""
        # Türkçe için 3 karakter = 1 token yaklaşımı
        return max(1, len(text) // 3)
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _generate_response(self, feature: AIFeatureType, user_prompt: str = None) -> str:
        """Feature'a göre yanıt oluştur."""
        templates = self.RESPONSE_TEMPLATES.get(feature, [])
        
        if not templates:
            return f"Mock yanıt: {feature.value} için örnek yanıt."
        
        return random.choice(templates)
    
    def _check_content_safety(self, text: str) -> None:
        """İçerik güvenlik kontrolü simülasyonu."""
        # Basit keyword kontrolü
        unsafe_keywords = ['zararlı', 'tehlikeli', 'yasadışı']
        text_lower = text.lower()
        
        for keyword in unsafe_keywords:
            if keyword in text_lower:
                raise AIContentFilterError(self.name, f"keyword:{keyword}")
