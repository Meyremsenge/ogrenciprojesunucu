# Sınav & Değerlendirme Modülü - AI Hariç Politikası

## ⚠️ KRİTİK MİMARİ KARAR

**Bu modülde AI KULLANILMAZ.**

Tüm değerlendirmeler ya deterministik kurallarla otomatik yapılır ya da öğretmen tarafından manuel olarak gerçekleştirilir.

---

## AI'nın Bu Modülde Kullanılmamasının Gerekçeleri

### 1. 📜 Hukuki Gerekçeler

| Risk | Açıklama | Yasal Dayanak |
|------|----------|---------------|
| **Öğrenci Hakları** | Sınav sonuçları öğrencinin akademik geleceğini doğrudan etkiler | MEB Yönetmelikleri |
| **İtiraz Hakkı** | AI değerlendirmesi itiraz edilemez ve açıklanamaz | Anayasa Md. 36 |
| **Şeffaflık** | Otomatik kararların açıklanabilir olması zorunluluğu | KVKK Md. 11, GDPR Md. 22 |
| **Sorumluluk** | AI hatası durumunda yasal sorumluluk belirsiz | Borçlar Kanunu |
| **Eşitlik** | AI bias'ı bazı öğrenci gruplarını olumsuz etkileyebilir | Eğitimde Fırsat Eşitliği |

#### KVKK/GDPR Perspektifi
```
KVKK Madde 11 - Veri sorumlusuna başvuru hakkı:
"İlgili kişi, veri sorumlusuna başvurarak kendisiyle ilgili;
...
f) Münhasıran otomatik sistemler vasıtasıyla analiz edilmek suretiyle 
   kişinin kendisi aleyhine bir sonucun ortaya çıkmasına itiraz etme..."
```

AI değerlendirmesi kullanılsaydı, her öğrenci KVKK kapsamında itiraz hakkını kullanabilirdi ve bu kaotik bir duruma yol açardı.

### 2. 📚 Pedagojik Gerekçeler

| Risk | Açıklama |
|------|----------|
| **Tutarlılık** | Her öğrenci aynı ve net kriterlere göre değerlendirilmelidir |
| **Öğrenme Geri Bildirimi** | AI açıklamaları pedagojik açıdan yetersiz kalabilir |
| **Öğretmen Otoritesi** | Değerlendirme, öğretmenin mesleki sorumluluğundadır |
| **Müfredat Uyumu** | AI, müfredatın inceliklerini tam anlayamayabilir |
| **Bağlamsal Anlayış** | AI, öğrencinin bireysel öğrenme sürecini göz ardı eder |

#### Pedagojik Değerlendirme Piramidi
```
                    ┌─────────────────┐
                    │   Öğretmen      │ ← Essay, proje, portfolyo
                    │   Manuel        │
                    ├─────────────────┤
                    │  Deterministik  │ ← Çoktan seçmeli, D/Y
                    │   Otomatik      │
                    └─────────────────┘
                    
     ❌ AI BU PİRAMİTTE YER ALMAZ ❌
```

### 3. 🔒 Güvenlik Gerekçeleri

| Risk | Açıklama | Örnek |
|------|----------|-------|
| **Prompt Injection** | Öğrenciler AI'yı yanıltmak için özel cevaplar yazabilir | "Ignore previous instructions..." |
| **Tutarsızlık** | AI aynı cevaba farklı zamanlarda farklı puan verebilir | Temperature parametresi |
| **Manipülasyon** | AI sisteminin manipüle edilmesi riski | Adversarial attacks |
| **Veri Sızıntısı** | Sınav içerikleri AI'ya gönderilirken sızabilir | API güvenlik açıkları |
| **Denetlenebilirlik** | AI kararları denetlenemez ve kanıtlanamaz | Black box sorunu |

#### Güvenlik Riski Matrisi
```
               Olasılık
           Düşük  Orta  Yüksek
         ┌──────┬──────┬──────┐
 Etki    │      │      │  ⚠️  │ Yüksek (Prompt Injection)
 Yüksek  │      │  ⚠️  │      │ Tutarsızlık
         ├──────┼──────┼──────┤
 Etki    │      │  ⚠️  │      │ Veri Sızıntısı
 Orta    │  ⚠️  │      │      │ Manipülasyon
         └──────┴──────┴──────┘
```

---

## Değerlendirme Kuralları

### Soru Tiplerine Göre Değerlendirme

| Soru Tipi | Değerlendirme Yöntemi | Kısmi Puan |
|-----------|----------------------|------------|
| `single_choice` | Doğru seçenek = Tam puan | ❌ Hayır |
| `multiple_choice` | Her doğru +puan, her yanlış -ceza | ✅ Evet |
| `true_false` | Tam eşleşme gerekli | ❌ Hayır |
| `short_answer` | Normalize metin karşılaştırması | ❌ Hayır |
| `fill_blank` | Normalize metin karşılaştırması | ❌ Hayır |
| `essay` | **SADECE Öğretmen** | ✅ Evet |

### Metin Normalizasyonu Kuralları

```python
# Kısa cevap ve boşluk doldurma için
def normalize_text(text):
    text = text.strip()              # Baş/son boşlukları kaldır
    text = text.lower()              # Küçük harfe çevir
    text = unicodedata.normalize()   # Unicode normalizasyonu
    text = re.sub(r'\s+', ' ', text) # Çoklu boşlukları tek boşluğa
    return text
```

### Çoklu Seçim Kısmi Puan Formülü

```
Puan = (Doğru_Seçilen × Puan_Per_Doğru) - (Yanlış_Seçilen × Ceza_Per_Yanlış)
Puan = max(0, Puan)  # Negatif puan yok
```

---

## API Endpoint'leri

### Öğretmen Değerlendirme Endpoint'leri

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/v1/exams/attempts/{id}/pending-essays` | GET | Bekleyen essay cevapları |
| `/api/v1/exams/attempts/{id}/grade-answer` | POST | Tek cevabı değerlendir |
| `/api/v1/exams/attempts/{id}/finalize-grading` | POST | Değerlendirmeyi tamamla |
| `/api/v1/exams/grading/pending` | GET | Tüm bekleyen değerlendirmeler |
| `/api/v1/exams/grading/rules` | GET | Değerlendirme kuralları |

### Örnek: Manuel Değerlendirme

```http
POST /api/v1/exams/attempts/123/grade-answer
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "question_id": 456,
  "points": 8.5,
  "is_correct": true,
  "comment": "İyi bir analiz yapılmış, ancak sonuç kısmı eksik."
}
```

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "answer_id": 789,
    "points_earned": 8.5,
    "is_correct": true,
    "graded_by": 42,
    "ai_used": false
  },
  "message": "Cevap başarıyla değerlendirildi"
}
```

---

## Dosya Yapısı

```
app/modules/exams/
├── __init__.py
├── models.py           # Exam, Question, Answer, ExamAttempt, AttemptAnswer
├── routes.py           # API endpoint'leri (AI kullanmaz)
├── schemas.py          # Request/Response şemaları
├── services.py         # İş mantığı servisleri
└── grading_service.py  # ⚠️ Deterministik değerlendirme servisi (AI YOK)
```

### grading_service.py İçeriği

```python
class GradingRules:
    """Sabit değerlendirme kuralları."""
    DECIMAL_PLACES = 2
    PARTIAL_CREDIT_ENABLED = True
    ...

class DeterministicGrader:
    """
    Deterministik sınav değerlendirici.
    BU SINIF AI KULLANMAZ.
    """
    
    @classmethod
    def grade_attempt(cls, attempt) -> Dict:
        """Sınav girişini değerlendir."""
        ...
    
    @classmethod
    def _grade_single_choice(cls, question, answer, result) -> Dict:
        """Tek seçimli soru."""
        ...
    
    @classmethod
    def _handle_essay(cls, question, answer, result) -> Dict:
        """
        ⚠️ ESSAY SORULARI SADECE ÖĞRETMEN TARAFINDAN DEĞERLENDİRİLİR.
        ⚠️ AI BU TİP SORULARI DEĞERLENDİRMEZ.
        """
        ...

class ManualGrader:
    """Öğretmen manuel değerlendirmesi."""
    
    @classmethod
    def grade_answer(cls, answer, points, comment, grader_id):
        """Tek cevabı değerlendir."""
        ...
    
    @classmethod
    def finalize_grading(cls, attempt, grader_id):
        """Değerlendirmeyi tamamla."""
        ...
```

---

## Mimari Diyagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Sınav Modülü                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Sınav Girişi (Attempt)                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  Cevapları Topla                              │   │
│  │  (single_choice, multiple_choice, true_false, short_answer,  │   │
│  │   fill_blank, essay)                                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│           ┌──────────────────┴──────────────────┐                   │
│           │                                      │                   │
│           ▼                                      ▼                   │
│  ┌─────────────────────┐             ┌─────────────────────┐        │
│  │  Otomatik Tipler    │             │    Essay Tipi       │        │
│  │  (Deterministik)    │             │   (Manuel)          │        │
│  ├─────────────────────┤             ├─────────────────────┤        │
│  │ • Tek seçim         │             │ • Öğretmen bekle    │        │
│  │ • Çoklu seçim       │             │ • Manuel puan ver   │        │
│  │ • Doğru/Yanlış      │             │ • Yorum ekle        │        │
│  │ • Kısa cevap        │             │                     │        │
│  │ • Boşluk doldur     │             │                     │        │
│  └──────────┬──────────┘             └──────────┬──────────┘        │
│             │                                    │                   │
│             │  ❌ AI YOK                         │  ❌ AI YOK        │
│             │                                    │                   │
│             └────────────────┬───────────────────┘                   │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     Final Puan Hesapla                        │   │
│  │  Puan = Σ(her_soru_puanı)                                     │   │
│  │  Yüzde = (Puan / Max_Puan) × 100                              │   │
│  │  Geçti = Yüzde >= Pass_Score                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      Sonuç                                    │   │
│  │  • Puan, Yüzde, Geçti/Kaldı                                  │   │
│  │  • Soru bazlı detaylar                                        │   │
│  │  • grading_method: 'DETERMINISTIC'                            │   │
│  │  • ai_used: false                                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Audit Trail (Denetim İzi)

Her değerlendirme işlemi kaydedilir:

```json
{
  "event_type": "EXAM_AUTO_GRADED",
  "resource_type": "exam_attempt",
  "resource_id": 123,
  "details": {
    "exam_id": 456,
    "user_id": 789,
    "score": 85,
    "percentage": 85.0,
    "passed": true,
    "grading_method": "DETERMINISTIC",
    "ai_used": false
  },
  "timestamp": "2025-12-27T10:30:00Z"
}
```

---

## Sık Sorulan Sorular (SSS)

### S: AI neden değerlendirmede kullanılmıyor?
**C:** Hukuki (KVKK/GDPR), pedagojik (tutarlılık, öğretmen otoritesi) ve güvenlik (prompt injection, tutarsızlık) gerekçeleriyle AI değerlendirmede kullanılmaz. Detaylar için bu dokümantasyonun ilgili bölümlerine bakın.

### S: Essay sorularını kim değerlendiriyor?
**C:** Essay soruları SADECE öğretmen tarafından manuel olarak değerlendirilir. Sistem sadece cevabın alındığını kaydeder, puanlama öğretmenin sorumluluğundadır.

### S: Kısmi puan nasıl hesaplanıyor?
**C:** Çoklu seçimli sorularda kısmi puan verilebilir. Her doğru seçim pozitif puan, her yanlış seçim negatif ceza getirir. Sonuç negatif olamaz.

### S: Değerlendirme kuralları değiştirilebilir mi?
**C:** `GradingRules` sınıfındaki sabitler değiştirilebilir, ancak bu sistem genelinde etki yapar. Değişiklikler dikkatli planlanmalıdır.

### S: Öğrenci değerlendirmeye itiraz edebilir mi?
**C:** Evet. Deterministik değerlendirmeler için kurallar açıkça tanımlıdır ve itiraz durumunda gösterilebilir. Manuel değerlendirmeler için öğretmen açıklama yapabilir.

---

## Sonuç

Bu modül, eğitim teknolojilerinde AI kullanımının sınırlarını net bir şekilde çizer. Değerlendirme gibi kritik alanlarda:

1. **Deterministic > AI**: Öngörülebilirlik ve tutarlılık önceliklidir
2. **Öğretmen > AI**: İnsan kararı, makine kararından üstündür
3. **Şeffaflık > Verimlilik**: Açıklanabilirlik, hızdan önemlidir
4. **Güvenlik > Kolaylık**: Risk almaktansa manuel yapmak yeğdir

Bu kararlar, öğrenci haklarını korumak ve eğitim kalitesini garanti altına almak için alınmıştır.
