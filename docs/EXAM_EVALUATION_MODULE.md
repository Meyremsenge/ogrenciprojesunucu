# Sınav & Değerlendirme Modülü

## Genel Bakış

Bu modül, kapsamlı bir sınav ve değerlendirme sistemi sağlar. Öğrencilerin bilgi düzeylerini ölçmek, otomatik değerlendirme yapmak ve performans analizi sunmak için tasarlanmıştır.

## Özellikler

### 🎯 Soru Tipleri (12 Farklı Tip)

| Tip | Açıklama | Otomatik Değerlendirme |
|-----|----------|------------------------|
| `multiple_choice` | Çoktan seçmeli (tek doğru) | ✅ |
| `multiple_select` | Çoktan seçmeli (çok doğru) | ✅ |
| `true_false` | Doğru/Yanlış | ✅ |
| `short_answer` | Kısa cevap | ✅ |
| `essay` | Uzun cevap | ❌ Manuel |
| `fill_in_blank` | Boşluk doldurma | ✅ |
| `matching` | Eşleştirme | ✅ |
| `ordering` | Sıralama | ✅ |
| `numeric` | Sayısal cevap (tolerans ile) | ✅ |
| `code` | Kod yazma | ✅ |
| `hotspot` | Resim üzerinde işaretleme | ✅ |
| `drag_drop` | Sürükle-bırak | ✅ |

### 📊 Zorluk Seviyeleri

| Seviye | Ağırlık | Açıklama |
|--------|---------|----------|
| `very_easy` | 0.5 | Temel kavramlar |
| `easy` | 0.75 | Basit uygulama |
| `medium` | 1.0 | Orta düzey analiz |
| `hard` | 1.5 | Karmaşık problem çözme |
| `very_hard` | 2.0 | İleri düzey sentez |

### ✅ Otomatik Değerlendirme

```python
from app.services.grading_service import GradingService

# Tek soru değerlendirme
result = GradingService.grade_question(question_id=1, answer=selected_answer_id)

# Pratik modu (ipucu cezası ile)
result, attempt = GradingService.grade_practice_question(
    user_id=123,
    question_id=1,
    answer=[1, 2],
    time_spent_seconds=45,
    hint_used=True
)

# Tam sınav değerlendirme
exam_result = GradingService.grade_exam(
    exam_id=1,
    attempt_id=5,
    answers={
        1: 'A',
        2: [1, 3],
        3: True
    }
)
```

### 📈 Performans Analizi

```python
from app.services.performance_analytics_service import PerformanceAnalyticsService

# Öğrenci performans raporu
report = PerformanceAnalyticsService.get_student_performance(
    user_id=123,
    course_id=1,
    days=30
)

# Akran karşılaştırması
comparison = PerformanceAnalyticsService.get_comparison_with_peers(
    user_id=123,
    course_id=1
)

# Önerilen sorular
questions = PerformanceAnalyticsService.get_recommended_questions(
    user_id=123,
    course_id=1,
    limit=10
)
```

### 📋 Raporlama

```python
from app.services.reporting_service import ReportingService, ReportFormat

# Öğrenci raporu
report = ReportingService.generate_student_report(
    student_id=123,
    course_id=1,
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 12, 31)
)

# Kurs analitikleri
course_report = ReportingService.generate_course_report(course_id=1)

# Sınav analitikleri
exam_analytics = ReportingService.generate_exam_analytics(exam_id=5)

# Kurum genel görünümü
overview = ReportingService.generate_institution_overview()

# Export (JSON, CSV, Excel, PDF)
content = ReportingService.export_report(report, ReportFormat.EXCEL)
```

## API Endpoints

### Sınav Yönetimi

```
GET    /api/v1/exams                     - Sınav listesi
GET    /api/v1/exams/:id                 - Sınav detayı
POST   /api/v1/exams                     - Yeni sınav oluştur
PUT    /api/v1/exams/:id                 - Sınav güncelle
DELETE /api/v1/exams/:id                 - Sınav sil
POST   /api/v1/exams/:id/publish         - Sınavı yayınla
```

### Soru Yönetimi

```
GET    /api/v1/exams/:id/questions       - Sınav soruları
POST   /api/v1/exams/:id/questions       - Soru ekle
PUT    /api/v1/exams/:id/questions/:qid  - Soru güncelle
DELETE /api/v1/exams/:id/questions/:qid  - Soru sil
```

### Sınav Çözme

```
POST   /api/v1/exams/:id/start           - Sınavı başlat
POST   /api/v1/exams/:id/attempts/:aid/answer  - Cevap gönder
POST   /api/v1/exams/:id/attempts/:aid/submit  - Sınavı bitir
GET    /api/v1/exams/:id/attempts/:aid/result  - Sonuç görüntüle
GET    /api/v1/exams/my-attempts         - Girişlerim
```

### Pratik Modu

```
POST   /api/v1/exams/practice            - Tek soru pratik
POST   /api/v1/exams/practice/bulk       - Toplu pratik
```

### Performans & Analitik

```
GET    /api/v1/exams/my-performance      - Kendi performansım
GET    /api/v1/exams/my-performance/comparison  - Akran karşılaştırması
GET    /api/v1/exams/recommended-questions      - Önerilen sorular
GET    /api/v1/exams/:id/analytics       - Sınav analitikleri
GET    /api/v1/exams/questions/:id/analytics    - Soru analitikleri
```

### Manuel Değerlendirme

```
GET    /api/v1/exams/pending-grades      - Bekleyen değerlendirmeler
POST   /api/v1/exams/attempts/:id/manual-grade  - Manuel değerlendir
```

### Raporlar

```
GET    /api/v1/exams/reports/student/:id - Öğrenci raporu
GET    /api/v1/exams/reports/course/:id  - Kurs raporu
GET    /api/v1/exams/reports/institution - Kurum raporu
POST   /api/v1/exams/reports/export      - Rapor export
```

## Veri Modelleri

### Question Model

```python
class Question(db.Model):
    id = Integer
    topic_id = Integer  # FK to topics
    question_text = Text
    question_type = String  # QuestionType enum
    
    # Media
    image_url = String
    audio_url = String
    video_url = String
    
    # Scoring
    difficulty = String  # DifficultyLevel enum
    points = Integer
    negative_points = Integer
    partial_credit = Boolean
    
    # Advanced
    hint = Text
    hint_penalty = Float
    bloom_level = String
    time_limit_seconds = Integer
    question_data = JSON  # Tip-specific data
    grading_rubric = Text
    
    # Statistics
    total_attempts = Integer
    correct_attempts = Integer
    avg_time_seconds = Integer
```

### QuestionAttempt Model

```python
class QuestionAttempt(db.Model):
    id = Integer
    user_id = Integer
    question_id = Integer
    
    # Answer
    selected_answer_ids = JSON
    text_answer = Text
    answer_data = JSON
    
    # Result
    is_correct = Boolean
    points_earned = Float
    max_points = Float
    feedback = Text
    grading_details = JSON
    
    # Context
    context_type = String  # practice, exam, quiz
    context_id = Integer
    time_spent_seconds = Integer
    hint_used = Boolean
    
    # Manual grading
    graded_by = Integer  # FK to users
    graded_at = DateTime
```

## Soru Tipleri Detayları

### 1. Fill in Blank (Boşluk Doldurma)

```python
question = Question(
    question_text="Python'da değişken tanımlamak için [blank_1] kullanılır.",
    question_type="fill_in_blank",
    question_data={
        "blanks": {
            "blank_1": ["=", "eşittir"]  # Kabul edilen cevaplar
        }
    }
)
```

### 2. Matching (Eşleştirme)

```python
question = Question(
    question_text="Başkentleri eşleştirin",
    question_type="matching",
    question_data={
        "pairs": [
            {"left": "1", "left_text": "Türkiye", "right": "A", "right_text": "Ankara"},
            {"left": "2", "left_text": "Fransa", "right": "B", "right_text": "Paris"},
            {"left": "3", "left_text": "Almanya", "right": "C", "right_text": "Berlin"}
        ]
    }
)
```

### 3. Ordering (Sıralama)

```python
question = Question(
    question_text="Olayları kronolojik sıraya koyun",
    question_type="ordering",
    question_data={
        "items": [
            {"id": "a", "text": "Kurtuluş Savaşı"},
            {"id": "b", "text": "Cumhuriyet'in İlanı"},
            {"id": "c", "text": "TBMM'nin Açılması"}
        ],
        "correct_order": ["a", "c", "b"]
    }
)
```

### 4. Numeric (Sayısal)

```python
question = Question(
    question_text="2^10 = ?",
    question_type="numeric",
    question_data={
        "correct_value": 1024,
        "tolerance": 0,  # Tam eşleşme
        "tolerance_type": "absolute",
        "unit": None
    }
)

# Tolerans ile
question = Question(
    question_text="Pi sayısının değeri nedir?",
    question_type="numeric",
    question_data={
        "correct_value": 3.14159,
        "tolerance": 1,  # %1 tolerans
        "tolerance_type": "percentage"
    }
)
```

## Performans Raporu Yapısı

```python
@dataclass
class StudentPerformanceReport:
    user_id: int
    period_start: datetime
    period_end: datetime
    
    # Genel metrikler
    overall_score: float  # 0-100
    performance_level: PerformanceLevel
    total_questions_attempted: int
    correct_answers: int
    overall_success_rate: float
    total_time_spent_seconds: int
    average_time_per_question: float
    
    # Trend
    trend: TrendDirection  # improving, stable, declining
    trend_score_change: float
    
    # Sınav metrikleri
    exams_taken: int
    exams_passed: int
    exam_pass_rate: float
    
    # Detaylar
    topic_performances: List[TopicPerformance]
    strengths: List[StrengthWeakness]
    weaknesses: List[StrengthWeakness]
    learning_pattern: LearningPattern
    recommendations: List[str]
```

## Frontend Bileşenleri

### QuestionRenderer

Dinamik soru render bileşeni - tüm soru tiplerini destekler.

```tsx
import { QuestionRenderer } from '@/components/exam/QuestionRenderer';

<QuestionRenderer
  question={question}
  value={answer}
  onChange={setAnswer}
  showFeedback={submitted}
  feedback={result?.feedback}
  isCorrect={result?.is_correct}
  disabled={submitted}
/>
```

### PerformanceDashboard

Öğrenci performans gösterge paneli.

```tsx
import { PerformanceDashboard } from '@/components/exam/PerformanceDashboard';

<PerformanceDashboard courseId={1} />
```

### ExamView

Tam sınav çözme deneyimi.

```tsx
import { ExamView } from '@/components/exam/ExamView';

// Route: /exams/:examId
<ExamView />
```

## Kısmi Puanlama

Bazı soru tipleri kısmi puanlamayı destekler:

| Tip | Kısmi Puan Hesaplama |
|-----|---------------------|
| `multiple_select` | Doğru seçim oranı × Toplam puan |
| `fill_in_blank` | Doğru boşluk oranı × Toplam puan |
| `matching` | Doğru eşleşme oranı × Toplam puan |
| `ordering` | Doğru pozisyon oranı × Toplam puan |
| `numeric` | Toleransın 2 katına kadar = %50 puan |

## İpucu Sistemi

```python
# İpucu ile soru
question = Question(
    hint="Cevap A harfi ile başlar",
    hint_penalty=0.2  # %20 puan kesintisi
)

# Pratik modunda ipucu kullanımı
result, attempt = GradingService.grade_practice_question(
    user_id=123,
    question_id=1,
    answer='A',
    hint_used=True  # Puan: 10 × 0.8 = 8
)
```

## Bloom Taksonomisi Desteği

Sorular Bloom seviyelerine göre etiketlenebilir:

- `remembering` - Hatırlama
- `understanding` - Anlama
- `applying` - Uygulama
- `analyzing` - Analiz
- `evaluating` - Değerlendirme
- `creating` - Yaratma

## Güvenlik Önlemleri

1. **Sınav Başlatma**: Öğrenci aynı anda sadece bir aktif girişe sahip olabilir
2. **Süre Kontrolü**: Server-side süre takibi
3. **Cevap Validasyonu**: Tüm cevaplar server'da doğrulanır
4. **Kopya Önleme**: Shuffle sorular ve cevaplar
5. **Audit Log**: Tüm girişler ve değerlendirmeler loglanır

## Örnek Kullanım Senaryoları

### 1. Ödev Oluşturma

```python
# 10 soruluk bir quiz oluştur
exam = ExamService.create({
    'course_id': 1,
    'title': 'Haftalık Quiz',
    'time_limit_minutes': 30,
    'passing_score': 60,
    'shuffle_questions': True,
    'shuffle_answers': True
})

# Sorular ekle
for q_data in questions_data:
    QuestionService.create(exam.id, q_data)

# Yayınla
ExamService.publish(exam.id)
```

### 2. Performans Takibi

```python
# Her hafta öğrenci performansını kontrol et
for student in course.students:
    report = PerformanceAnalyticsService.get_student_performance(
        user_id=student.id,
        course_id=course.id,
        days=7
    )
    
    if report.trend == TrendDirection.DECLINING:
        # Uyarı gönder
        NotificationService.send(
            user_id=student.id,
            message=f"Performansınız düşüyor. {report.recommendations[0]}"
        )
```

### 3. Rapor Oluşturma

```python
# Dönem sonu kurs raporu
report = ReportingService.generate_course_report(
    course_id=1,
    start_date=semester_start,
    end_date=semester_end
)

# Excel olarak export
excel_content = ReportingService.export_report(report, ReportFormat.EXCEL)

# E-posta ile gönder
EmailService.send_with_attachment(
    to=instructor_email,
    subject="Dönem Sonu Raporu",
    attachment=excel_content,
    filename="kurs_raporu.xlsx"
)
```

## Sonraki Geliştirmeler

- [ ] Adaptive testing (Uyarlanabilir sınav)
- [ ] AI-powered essay grading
- [ ] Plagiarism detection (Kopya tespiti)
- [ ] Video question support
- [ ] Real-time proctoring integration
- [ ] Question bank sharing between courses
