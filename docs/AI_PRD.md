# AI Modülü Ürün Gereksinim Dokümanı (AI-PRD)

**Versiyon:** 1.0  
**Tarih:** 25 Aralık 2025  
**Yazar:** AI Product Architecture Team  
**Uygulama:** Öğrenci Koçluk Sistemi  

---

## Özet

Bu doküman, Python Flask ve PostgreSQL tabanlı öğrenci koçluk uygulaması için geliştirilecek yapay zeka (AI) destekli modülün teknik ve iş gereksinimlerini tanımlar. AI modülü başlangıçta Mock (simüle) olarak çalışacak ve proje tamamlandığında GPT API entegrasyonu yapılacaktır.

---

## 1. AI Modülünün Amaçları

### 1.1 Öğrenci Akademik Destek

| Özellik | Açıklama | Öncelik |
|---------|----------|---------|
| **Akıllı Soru Çözüm Desteği** | Öğrencilerin takıldığı sorularda adım adım ipuçları sunma | Yüksek |
| **Kişiselleştirilmiş Çalışma Planı** | Öğrenci performansına göre haftalık/aylık çalışma planı | Yüksek |
| **Konu Anlatım Asistanı** | Anlaşılmayan konuların farklı perspektiflerle açıklanması | Orta |
| **Eksik Konu Analizi** | Performans verilerine göre zayıf konu tespiti | Orta |
| **Motivasyon Mesajları** | Başarı oranına göre teşvik edici geri bildirimler | Düşük |

### 1.2 Öğretmen İçerik Desteği

| Özellik | Açıklama | Öncelik |
|---------|----------|---------|
| **Soru Oluşturma Asistanı** | Konu ve zorluk seviyesine göre otomatik soru önerileri | Yüksek |
| **Açık Uçlu Cevap Değerlendirme** | Öğrenci cevaplarının AI destekli ön değerlendirmesi | Yüksek |
| **İçerik Zenginleştirme** | Mevcut ders materyallerinin AI ile geliştirilmesi | Orta |
| **Öğrenci Performans Özeti** | Sınıf bazında performans analiz raporları | Orta |

### 1.3 Admin Analiz Desteği

| Özellik | Açıklama | Öncelik |
|---------|----------|---------|
| **Platform Kullanım Analizi** | AI destekli kullanım pattern tespiti | Orta |
| **Anomali Tespiti** | Olağandışı kullanım davranışlarının tespiti | Orta |
| **Trend Analizi** | Öğrenci başarı trendlerinin AI ile analizi | Düşük |
| **Raporlama Asistanı** | Otomatik rapor oluşturma ve özetleme | Düşük |

---

## 2. Rol Bazlı AI Yetkinlikleri

### 2.1 Öğrenci (Student)

```yaml
Erişebileceği AI Özellikleri:
  - question_hint: Soru ipucu alma
  - topic_explanation: Konu anlatım desteği
  - study_plan: Kişisel çalışma planı
  - weakness_analysis: Zayıf konu analizi
  - motivation_message: Motivasyon mesajları

Kısıtlamalar:
  - Sadece kendi verilerine erişim
  - Günlük kota limiti uygulanır
  - Direkt cevap alma YASAK (sadece ipucu)
```

### 2.2 Öğretmen (Teacher)

```yaml
Erişebileceği AI Özellikleri:
  - question_generation: Soru oluşturma asistanı
  - answer_evaluation: Açık uçlu cevap değerlendirme
  - content_enhancement: İçerik zenginleştirme
  - class_performance: Sınıf performans analizi
  - student_report: Öğrenci performans özeti
  - Öğrenci seviyesi tüm özellikler

Kısıtlamalar:
  - Sadece kendi öğrencilerinin verilerine erişim
  - Genişletilmiş günlük kota
  - Toplu işlem limitleri
```

### 2.3 Admin

```yaml
Erişebileceği AI Özellikleri:
  - usage_analytics: Platform kullanım analizi
  - anomaly_detection: Anomali tespiti
  - trend_analysis: Trend analizi
  - report_generation: Otomatik raporlama
  - Öğretmen seviyesi tüm özellikler

Kısıtlamalar:
  - Tüm platform verilerine erişim
  - Yüksek kota limitleri
  - Denetim kaydı (audit log) zorunlu
```

### 2.4 Süper Admin (Super Admin)

```yaml
Erişebileceği AI Özellikleri:
  - system_diagnostics: AI sistem diagnostiği
  - quota_management: Kota yönetimi
  - ai_configuration: AI konfigürasyon yönetimi
  - cost_analysis: API maliyet analizi
  - Admin seviyesi tüm özellikler

Kısıtlamalar:
  - Tam sistem erişimi
  - Sınırsız kota (veya çok yüksek limit)
  - Tüm işlemler loglanır
```

### 2.5 Yetkinlik Matrisi

| Özellik | Öğrenci | Öğretmen | Admin | Süper Admin |
|---------|:-------:|:--------:|:-----:|:-----------:|
| question_hint | ✅ | ✅ | ✅ | ✅ |
| topic_explanation | ✅ | ✅ | ✅ | ✅ |
| study_plan | ✅ | ✅ | ✅ | ✅ |
| weakness_analysis | ✅ | ✅ | ✅ | ✅ |
| question_generation | ❌ | ✅ | ✅ | ✅ |
| answer_evaluation | ❌ | ✅ | ✅ | ✅ |
| content_enhancement | ❌ | ✅ | ✅ | ✅ |
| class_performance | ❌ | ✅ | ✅ | ✅ |
| usage_analytics | ❌ | ❌ | ✅ | ✅ |
| anomaly_detection | ❌ | ❌ | ✅ | ✅ |
| quota_management | ❌ | ❌ | ❌ | ✅ |
| ai_configuration | ❌ | ❌ | ❌ | ✅ |

---

## 3. AI Kullanım Senaryoları

### 3.1 Soru Çözümünde İpucu Verme

**Senaryo ID:** AI-UC-001  
**Aktör:** Öğrenci  
**Öncelik:** Yüksek

#### Akış:
```
1. Öğrenci bir soruyu çözerken takılır
2. "İpucu Al" butonuna tıklar
3. Sistem soru içeriğini AI modülüne gönderir
4. AI, adım adım ipuçları üretir (cevabı vermeden)
5. İlk ipucu gösterilir
6. Öğrenci isterse ek ipucu alabilir (kota dahilinde)
7. Kullanım loglanır
```

#### İpucu Seviyeleri:
- **Seviye 1:** Genel yönlendirme ("Bu soruda hangi formülü kullanmalısın?")
- **Seviye 2:** Orta detay ("İlk adımda x değişkenini bul")
- **Seviye 3:** Detaylı ipucu ("x = a + b formülünü kullan, sonra...")

#### Mock Response Örneği:
```json
{
  "hint_level": 1,
  "hint_text": "Bu soruda alan formülünü kullanman gerekiyor. Dikdörtgenin alanı nasıl hesaplanır?",
  "next_hint_available": true,
  "hints_remaining": 2,
  "related_topics": ["Geometri", "Alan Hesaplama"]
}
```

### 3.2 Konu Anlatım Desteği

**Senaryo ID:** AI-UC-002  
**Aktör:** Öğrenci  
**Öncelik:** Orta

#### Akış:
```
1. Öğrenci bir konuyu anlamakta zorlanır
2. "Konuyu Açıkla" özelliğini kullanır
3. Sistem konu bilgisini AI'a iletir
4. AI, farklı öğrenme stillerine uygun açıklamalar üretir
5. Öğrenci ek soru sorabilir (diyalog formatında)
```

#### Mock Response Örneği:
```json
{
  "topic": "Pisagor Teoremi",
  "explanation": "Pisagor teoremi, dik üçgenlerde kenarlar arasındaki ilişkiyi gösterir...",
  "examples": [
    {
      "title": "Günlük Hayat Örneği",
      "content": "Bir merdiveni duvara yaslarsanız..."
    }
  ],
  "visual_suggestion": "Dik üçgen çizimi",
  "difficulty_level": "Temel"
}
```

### 3.3 Öğrenci Performans Analizi

**Senaryo ID:** AI-UC-003  
**Aktör:** Öğretmen, Admin  
**Öncelik:** Orta

#### Akış:
```
1. Öğretmen öğrenci performans raporuna erişir
2. "AI Analizi" butonuna tıklar
3. Sistem öğrenci verilerini AI'a gönderir
4. AI, güçlü/zayıf yönleri analiz eder
5. Öneriler ve aksiyon planı sunulur
```

#### Analiz Kriterleri:
- Doğru/yanlış cevap oranı
- Konu bazlı performans
- Zaman içindeki gelişim
- Çalışma düzeni analizi

#### Mock Response Örneği:
```json
{
  "student_id": 123,
  "analysis_period": "2025-01",
  "strengths": ["Geometri", "Temel Matematik"],
  "weaknesses": ["Türev", "İntegral"],
  "recommendations": [
    "Türev konusuna günde 30 dakika ayırmalı",
    "Pratik soru sayısını artırmalı"
  ],
  "predicted_success_rate": 75,
  "trend": "improving"
}
```

### 3.4 Kişisel Çalışma Planı Oluşturma

**Senaryo ID:** AI-UC-004  
**Aktör:** Öğrenci  
**Öncelik:** Yüksek

#### Akış:
```
1. Öğrenci çalışma planı oluşturmak ister
2. Hedef ve müsait saatlerini girer
3. Sistem performans verilerini AI'a iletir
4. AI, kişiselleştirilmiş haftalık plan oluşturur
5. Plan takvime entegre edilebilir
```

#### Plan Parametreleri:
- Hedef sınav/tarih
- Günlük müsait süre
- Zayıf konular (otomatik tespit)
- Öğrenme stili tercihi

#### Mock Response Örneği:
```json
{
  "plan_id": "SP-2025-001",
  "duration_weeks": 4,
  "weekly_hours": 15,
  "schedule": {
    "monday": [
      {"time": "17:00-18:00", "topic": "Türev", "activity": "Konu tekrarı"},
      {"time": "18:30-19:30", "topic": "Türev", "activity": "Soru çözümü"}
    ],
    "tuesday": [
      {"time": "17:00-18:30", "topic": "İntegral", "activity": "Video izleme"}
    ]
  },
  "milestones": [
    {"week": 2, "goal": "Türev konusunda %70 başarı"},
    {"week": 4, "goal": "Tüm konularda %80 başarı"}
  ]
}
```

### 3.5 Açık Uçlu Cevap Değerlendirme

**Senaryo ID:** AI-UC-005  
**Aktör:** Öğretmen  
**Öncelik:** Yüksek

#### Akış:
```
1. Öğretmen açık uçlu sınavı değerlendirir
2. "AI Ön Değerlendirme" özelliğini kullanır
3. Sistem cevapları AI'a gönderir
4. AI, her cevap için puan önerisi ve gerekçe sunar
5. Öğretmen değerlendirmeyi onaylar/düzenler
```

#### Değerlendirme Kriterleri:
- İçerik doğruluğu
- Kavram kullanımı
- Argüman kalitesi
- Dil ve anlatım

#### Mock Response Örneği:
```json
{
  "answer_id": 456,
  "suggested_score": 7.5,
  "max_score": 10,
  "evaluation": {
    "content_accuracy": {"score": 8, "feedback": "Doğru kavramlar kullanılmış"},
    "argumentation": {"score": 7, "feedback": "Argümanlar geliştirilebilir"},
    "language": {"score": 8, "feedback": "Dil kullanımı yeterli"}
  },
  "overall_feedback": "Öğrenci konuyu kavramış ancak örneklendirme eksik.",
  "improvement_suggestions": ["Daha fazla örnek kullanılmalı"]
}
```

---

## 4. AI Kapsam Dışı Alanlar

### 4.1 Psikolojik Yönlendirme

```
❌ AI YAPMAYACAK:
- Psikolojik danışmanlık veya terapi önerileri
- Ruh sağlığı değerlendirmesi
- Stres/anksiyete tedavisi önerileri
- Aile içi sorunlara müdahale
- Davranış bozukluğu teşhisi

✅ AI YAPACAK:
- Genel motivasyon mesajları
- Olumlu pekiştirici geri bildirimler
- Ciddi durumlar için uzman yönlendirme önerisi

⚠️ UYARI MEKANIZMASI:
- Kullanıcı psikolojik destek ihtiyacı ifade ederse:
  "Bu konuda size yardımcı olabilecek bir uzmanla görüşmenizi öneririz."
  mesajı döner ve olay loglanır.
```

### 4.2 Tıbbi Tavsiye

```
❌ AI YAPMAYACAK:
- Hastalık teşhisi
- İlaç önerisi
- Tedavi planı
- Sağlık durumu değerlendirmesi
- Acil sağlık yönlendirmesi

✅ AI YAPACAK:
- Genel sağlıklı yaşam önerileri (çalışma ergonomisi)
- Göz dinlendirme hatırlatmaları
- Mola önerileri

⚠️ UYARI MEKANIZMASI:
- Tıbbi soru algılanırsa:
  "Sağlık konularında bir sağlık profesyoneline danışmanız gerekir."
  mesajı döner.
```

### 4.3 Hukuki Tavsiye

```
❌ AI YAPMAYACAK:
- Yasal danışmanlık
- Hukuki süreç yönlendirmesi
- Sözleşme yorumlama
- Haklar konusunda bilgilendirme

⚠️ UYARI MEKANIZMASI:
- Hukuki soru algılanırsa:
  "Yasal konularda bir hukuk danışmanına başvurmanız önerilir."
  mesajı döner.
```

### 4.4 Kişisel Veri İşleme Kısıtlamaları

```
❌ AI YAPMAYACAK:
- Kişisel verileri kalıcı olarak öğrenme/saklama
- Kullanıcı profili oluşturma (oturum dışında)
- Verileri üçüncü taraflarla paylaşma
- KVKK/GDPR kapsamı dışında işleme

✅ AI YAPACAK:
- Oturum bazlı bağlam kullanımı
- Anonimleştirilmiş istatistiksel analiz
- Şifreli veri iletimi
- Otomatik veri temizleme (30 gün)

📋 KVKK UYUMLULUK:
- Açık rıza alınmadan AI işleme yapılmaz
- Kullanıcı istediğinde veriler silinir
- İşleme kayıtları denetim için saklanır
```

### 4.5 Tehlikeli İçerik Filtreleme

```
❌ AI YAPMAYACAK:
- Şiddet içerikli yanıtlar
- Cinsel içerik
- Nefret söylemi
- Yasadışı aktivite yönlendirmesi
- Kendine zarar verme içeriği

🛡️ GÜVENLİK MEKANİZMASI:
- Input/Output filtreleme
- Banned word listesi
- Pattern tespiti
- Otomatik içerik engelleme
- Olay bildirimi (ciddi durumlar)
```

---

## 5. Maliyet ve Kota Politikası

### 5.1 Günlük / Aylık Kullanım Limitleri

#### Token Bazlı Kota Sistemi

```python
# Her AI isteğinin token maliyeti
TOKEN_COSTS = {
    "question_hint": 100,         # Düşük maliyet
    "topic_explanation": 300,     # Orta maliyet
    "study_plan": 500,            # Yüksek maliyet
    "answer_evaluation": 400,     # Yüksek maliyet
    "performance_analysis": 600,  # Çok yüksek maliyet
}
```

#### Varsayılan Kotalar

| Rol | Günlük Token | Aylık Token | Günlük İstek | Aylık İstek |
|-----|-------------|-------------|--------------|-------------|
| Öğrenci | 1,000 | 20,000 | 20 | 400 |
| Öğretmen | 5,000 | 100,000 | 100 | 2,000 |
| Admin | 20,000 | 500,000 | 500 | 10,000 |
| Süper Admin | ∞ | ∞ | ∞ | ∞ |

### 5.2 Rol Bazlı Kota Tasarımı

#### Kota Yapısı

```python
QUOTA_CONFIG = {
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
            "weakness_analysis"
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
            "weakness_analysis",
            "question_generation",
            "answer_evaluation",
            "content_enhancement",
            "class_performance"
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
```

### 5.3 Abuse (Kötüye Kullanım) Önleme

#### Tespit Mekanizmaları

```yaml
Rate Limiting:
  - IP bazlı limit: 100 istek/dakika
  - Kullanıcı bazlı limit: Rol kotasına göre
  - Burst protection: 10 istek/saniye

Pattern Tespiti:
  - Tekrarlı aynı sorular
  - Bot benzeri davranış (çok hızlı istekler)
  - Anormal saat kullanımı
  - Toplu veri çekme girişimi

İçerik Analizi:
  - Prompt injection tespiti
  - Jailbreak deneme tespiti
  - Zararlı içerik tespiti
```

#### Müdahale Seviyeleri

```yaml
Seviye 1 - Uyarı:
  - Tetikleyici: İlk ihlal
  - Aksiyon: Kullanıcıya uyarı mesajı
  - Log: Warning level

Seviye 2 - Geçici Kısıtlama:
  - Tetikleyici: 3 ihlal/gün
  - Aksiyon: 1 saat AI erişim kısıtlaması
  - Log: Warning level + Admin bildirimi

Seviye 3 - Günlük Askıya Alma:
  - Tetikleyici: 5 ihlal/gün veya ciddi ihlal
  - Aksiyon: 24 saat AI erişim engeli
  - Log: Error level + Admin bildirimi

Seviye 4 - Kalıcı Engel:
  - Tetikleyici: Tekrarlı Seviye 3 veya kötü niyetli kullanım
  - Aksiyon: Kalıcı AI erişim engeli
  - Log: Critical level + Yönetim bildirimi
```

#### Kota Aşım Yanıtı

```json
{
  "success": false,
  "error": {
    "code": "AI_QUOTA_EXCEEDED",
    "message": "Günlük AI kullanım kotanızı aştınız.",
    "details": {
      "quota_type": "daily_tokens",
      "limit": 1000,
      "used": 1000,
      "resets_at": "2025-12-26T00:00:00Z"
    }
  }
}
```

---

## 6. Mock AI → Gerçek GPT Geçiş Stratejisi

### 6.1 Servis Soyutlama Prensibi

#### Mimari Tasarım

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Controller (Routes)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     AI Service Layer                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AIServiceInterface (ABC)                │   │
│  │  - generate_hint()                                   │   │
│  │  - explain_topic()                                   │   │
│  │  - create_study_plan()                              │   │
│  │  - evaluate_answer()                                │   │
│  │  - analyze_performance()                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
           ┌──────────────┴──────────────┐
           │                             │
           ▼                             ▼
┌─────────────────────┐     ┌─────────────────────┐
│   MockAIService     │     │    GPTAIService     │
│   (Geliştirme)      │     │    (Prodüksiyon)    │
│                     │     │                     │
│ - Statik yanıtlar   │     │ - OpenAI API        │
│ - Template tabanlı  │     │ - Token yönetimi    │
│ - Hızlı response    │     │ - Retry logic       │
└─────────────────────┘     └─────────────────────┘
```

#### Interface Tanımı

```python
from abc import ABC, abstractmethod

class AIServiceInterface(ABC):
    """AI servisi için abstract interface."""
    
    @abstractmethod
    def generate_hint(self, question: str, hint_level: int) -> dict:
        """Soru için ipucu üretir."""
        pass
    
    @abstractmethod
    def explain_topic(self, topic: str, difficulty: str) -> dict:
        """Konu açıklaması üretir."""
        pass
    
    @abstractmethod
    def create_study_plan(self, student_data: dict) -> dict:
        """Kişisel çalışma planı oluşturur."""
        pass
    
    @abstractmethod
    def evaluate_answer(self, question: str, answer: str, rubric: dict) -> dict:
        """Açık uçlu cevabı değerlendirir."""
        pass
    
    @abstractmethod
    def analyze_performance(self, performance_data: dict) -> dict:
        """Öğrenci performansını analiz eder."""
        pass
```

### 6.2 Geliştirme Sürecinde Mock Response

#### Mock Service Implementasyonu

```python
class MockAIService(AIServiceInterface):
    """Geliştirme için mock AI servisi."""
    
    def __init__(self):
        self.templates = self._load_templates()
        self.delay_simulation = True
    
    def generate_hint(self, question: str, hint_level: int) -> dict:
        # Simüle edilmiş gecikme
        if self.delay_simulation:
            time.sleep(0.5)
        
        hints = {
            1: "Bu soruda temel kavramları düşün. Hangi formül gerekli?",
            2: "İlk adım olarak verilenleri belirle ve bilinmeyeni yaz.",
            3: "Formülü uygula: Verilen değerleri yerine koy ve çöz."
        }
        
        return {
            "hint_level": hint_level,
            "hint_text": hints.get(hint_level, hints[1]),
            "next_hint_available": hint_level < 3,
            "hints_remaining": 3 - hint_level,
            "mock": True  # Mock yanıt işareti
        }
```

#### Konfigürasyon Tabanlı Geçiş

```python
# config/settings.py

AI_CONFIG = {
    "provider": os.environ.get("AI_PROVIDER", "mock"),  # "mock" veya "openai"
    "openai": {
        "api_key": os.environ.get("OPENAI_API_KEY"),
        "model": "gpt-4o-mini",
        "max_tokens": 1000,
        "temperature": 0.7
    },
    "mock": {
        "response_delay": 0.5,
        "template_path": "templates/ai_responses"
    }
}
```

#### Factory Pattern ile Servis Seçimi

```python
# services/ai_factory.py

class AIServiceFactory:
    """AI servis fabrikası."""
    
    _instance = None
    
    @classmethod
    def get_service(cls) -> AIServiceInterface:
        """Konfigürasyona göre uygun AI servisini döner."""
        
        if cls._instance is None:
            provider = current_app.config.get("AI_PROVIDER", "mock")
            
            if provider == "openai":
                cls._instance = GPTAIService()
            else:
                cls._instance = MockAIService()
        
        return cls._instance
    
    @classmethod
    def reset(cls):
        """Test için servisi sıfırlar."""
        cls._instance = None
```

### 6.3 Geçiş Planı

#### Faz 1: Mock Geliştirme (Şu an)

```yaml
Süre: Proje geliştirme süreci boyunca
Hedef:
  - Tüm AI özelliklerinin UI/UX'ini tamamlama
  - Frontend entegrasyonu
  - Kota sisteminin test edilmesi
  - Hata yönetiminin oturtulması

Çıktılar:
  - Çalışan mock AI endpoints
  - Kapsamlı test suite
  - Dokümantasyon
```

#### Faz 2: OpenAI Entegrasyonu

```yaml
Süre: Proje sonunda 2-3 hafta
Hedef:
  - GPTAIService implementasyonu
  - API key yönetimi
  - Token optimizasyonu
  - Maliyet kontrolü

Çıktılar:
  - Çalışan GPT entegrasyonu
  - Maliyet raporları
  - Performance metrikleri
```

#### Faz 3: Hibrit Mod (Opsiyonel)

```yaml
Süre: Gerekirse
Hedef:
  - Bazı özellikler mock, bazıları gerçek AI
  - A/B testing
  - Gradual rollout

Örnek:
  - question_hint: GPT (kritik özellik)
  - motivation_message: Mock (düşük öncelik)
```

### 6.4 GPT Entegrasyonu Kontrol Listesi

```yaml
Pre-Entegrasyon:
  □ OpenAI hesabı ve API key
  □ Billing limitlerinin ayarlanması
  □ Rate limit stratejisi
  □ Prompt engineering dökümanı

Entegrasyon:
  □ GPTAIService sınıfı implementasyonu
  □ Retry logic (exponential backoff)
  □ Timeout handling
  □ Error mapping (OpenAI → Uygulama)

Post-Entegrasyon:
  □ Load testing
  □ Maliyet analizi (1000 kullanıcı senaryosu)
  □ Response kalite değerlendirmesi
  □ Fallback mekanizması (GPT down → Mock)
```

---

## 7. Teknik Spesifikasyonlar

### 7.1 Veritabanı Şeması

```sql
-- AI kullanım logları
CREATE TABLE ai_usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    feature VARCHAR(50) NOT NULL,
    tokens_used INTEGER NOT NULL,
    request_data JSONB,
    response_summary VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI kotaları
CREATE TABLE ai_quotas (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    daily_tokens_used INTEGER DEFAULT 0,
    monthly_tokens_used INTEGER DEFAULT 0,
    daily_requests_count INTEGER DEFAULT 0,
    monthly_requests_count INTEGER DEFAULT 0,
    last_request_at TIMESTAMP,
    daily_reset_at DATE DEFAULT CURRENT_DATE,
    monthly_reset_at DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI konfigürasyon (dinamik ayarlar)
CREATE TABLE ai_configurations (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI abuse/ihlal kayıtları
CREATE TABLE ai_violations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    violation_type VARCHAR(50) NOT NULL,
    severity INTEGER NOT NULL,  -- 1-4
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 7.2 API Endpoints

```yaml
Base Path: /api/v1/ai

Endpoints:
  POST /hint:
    description: Soru ipucu al
    auth: required
    roles: [student, teacher, admin, super_admin]
    
  POST /explain:
    description: Konu açıklaması al
    auth: required
    roles: [student, teacher, admin, super_admin]
    
  POST /study-plan:
    description: Çalışma planı oluştur
    auth: required
    roles: [student, teacher, admin, super_admin]
    
  POST /evaluate-answer:
    description: Cevap değerlendir
    auth: required
    roles: [teacher, admin, super_admin]
    
  POST /analyze-performance:
    description: Performans analizi
    auth: required
    roles: [teacher, admin, super_admin]
    
  GET /quota:
    description: Kota durumunu sorgula
    auth: required
    roles: [all]
    
  GET /usage-history:
    description: Kullanım geçmişi
    auth: required
    roles: [all]
```

### 7.3 Response Formatı

```json
{
  "success": true,
  "data": {
    "result": "...",
    "tokens_used": 100,
    "remaining_quota": {
      "daily_tokens": 900,
      "daily_requests": 19
    },
    "mock": true
  },
  "meta": {
    "request_id": "ai-req-12345",
    "processing_time_ms": 150
  }
}
```

---

## 8. Güvenlik Gereksinimleri

### 8.1 Input Validasyonu

- Maksimum input uzunluğu: 2000 karakter
- HTML/Script tag filtreleme
- SQL injection koruması
- Prompt injection tespiti

### 8.2 Output Sanitizasyonu

- PII (Kişisel Bilgi) maskeleme
- Zararlı içerik filtreleme
- Response size limiti

### 8.3 Denetim

- Tüm AI istekleri loglanır
- Hassas veriler maskelenir
- 90 gün log saklama
- KVKK uyumlu silme

---

## 9. Başarı Metrikleri

| Metrik | Hedef | Ölçüm Yöntemi |
|--------|-------|---------------|
| API Yanıt Süresi | < 2 saniye | Prometheus |
| Kullanıcı Memnuniyeti | > 4.0/5.0 | Anket |
| Hata Oranı | < 1% | Log analizi |
| Kota Aşım Oranı | < 5% | DB query |
| AI Özellik Kullanımı | > 50% aktif kullanıcı | Analytics |

---

## 10. Sonraki Adımlar

1. **Faz 1:** Mock AI modülü geliştirmesi ✅
2. **Faz 2:** Frontend entegrasyonu
3. **Faz 3:** Test ve QA
4. **Faz 4:** OpenAI entegrasyonu
5. **Faz 5:** Prodüksiyon deployment

---

**Doküman Sonu**

*Bu doküman proje süresince güncellenecektir.*
