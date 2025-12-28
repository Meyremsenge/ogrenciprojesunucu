# 🎓 Öğrenci Koçluk Uygulaması - Mimari Tasarım Dokümanı

## 📋 İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Sistem Mimarisi](#sistem-mimarisi)
3. [Veritabanı Tasarımı](#veritabanı-tasarımı)
4. [API Tasarımı](#api-tasarımı)
5. [Güvenlik Mimarisi](#güvenlik-mimarisi)
6. [Modül Yapıları](#modül-yapıları)
7. [Deployment Stratejisi](#deployment-stratejisi)

---

## 1. Genel Bakış

### 1.1 Proje Tanımı
Ticari nitelikte, ölçeklenebilir bir öğrenci koçluk platformu. Öğrencilerin video içerikler izleyebildiği, sorular çözebildiği, sınavlara girebildiği ve performans takibi yapabildiği kapsamlı bir eğitim yönetim sistemi.

### 1.2 Teknoloji Stack'i

| Katman | Teknoloji |
|--------|-----------|
| Backend | Python 3.11+, Flask 3.x |
| Database | PostgreSQL 15+ |
| ORM | SQLAlchemy 2.x |
| Migration | Alembic |
| Authentication | Flask-JWT-Extended |
| API Docs | Flask-RESTX / Swagger |
| Caching | Redis |
| Task Queue | Celery + Redis |
| Video Platform | YouTube Data API v3 |
| File Storage | AWS S3 / MinIO |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |

### 1.3 Rol Hiyerarşisi

```
┌─────────────────────────────────────────────────────────┐
│                    SÜPER ADMİN                          │
│  • Tüm sistem yönetimi                                  │
│  • Admin oluşturma/silme                                │
│  • Sistem ayarları                                      │
│  • Finansal raporlar                                    │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                      ADMİN                              │
│  • Öğretmen yönetimi                                    │
│  • İçerik onaylama                                      │
│  • Öğrenci yönetimi                                     │
│  • Raporlama                                            │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                    ÖĞRETMEN                             │
│  • İçerik oluşturma (video, soru, sınav)               │
│  • Öğrenci değerlendirme                                │
│  • Performans takibi                                    │
│  • Mesajlaşma                                           │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                     ÖĞRENCİ                             │
│  • Video izleme                                         │
│  • Soru çözme                                           │
│  • Sınava girme                                         │
│  • İlerleme takibi                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Sistem Mimarisi

### 2.1 Yüksek Seviye Mimari

```
                                    ┌─────────────────┐
                                    │   CDN (Video)   │
                                    │   CloudFlare    │
                                    └────────┬────────┘
                                             │
┌─────────────┐     ┌─────────────┐    ┌─────┴─────┐
│   Mobile    │────▶│             │    │  YouTube  │
│    Apps     │     │   NGINX     │    │    API    │
└─────────────┘     │   Reverse   │    └───────────┘
                    │    Proxy    │
┌─────────────┐     │             │    ┌───────────┐
│    Web      │────▶│  + SSL/TLS  │───▶│   Flask   │
│   Client    │     │  + Rate     │    │    API    │
└─────────────┘     │    Limit    │    │  Server   │
                    └─────────────┘    └─────┬─────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
              ┌─────┴─────┐          ┌───────┴───────┐        ┌───────┴───────┐
              │PostgreSQL │          │     Redis     │        │    Celery     │
              │  Primary  │          │    Cache      │        │    Workers    │
              └─────┬─────┘          └───────────────┘        └───────────────┘
                    │
              ┌─────┴─────┐
              │PostgreSQL │
              │  Replica  │
              └───────────┘
```

### 2.2 Proje Dizin Yapısı

```
student-coaching-app/
├── app/
│   ├── __init__.py                 # Flask app factory
│   ├── config.py                   # Konfigürasyon sınıfları
│   ├── extensions.py               # Flask extensions
│   │
│   ├── models/                     # SQLAlchemy modelleri
│   │   ├── __init__.py
│   │   ├── user.py                 # User, Role modelleri
│   │   ├── course.py               # Course, Topic modelleri
│   │   ├── content.py              # Video, Document modelleri
│   │   ├── question.py             # Question, Answer modelleri
│   │   ├── exam.py                 # Exam, ExamResult modelleri
│   │   └── evaluation.py           # Evaluation, Progress modelleri
│   │
│   ├── api/                        # API Blueprint'leri
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             # Kimlik doğrulama
│   │   │   ├── users.py            # Kullanıcı yönetimi
│   │   │   ├── courses.py          # Kurs yönetimi
│   │   │   ├── content.py          # İçerik yönetimi
│   │   │   ├── videos.py           # Video yönetimi
│   │   │   ├── questions.py        # Soru yönetimi
│   │   │   ├── exams.py            # Sınav yönetimi
│   │   │   ├── evaluations.py      # Değerlendirme
│   │   │   └── reports.py          # Raporlama
│   │   └── decorators.py           # Özel decorator'lar
│   │
│   ├── services/                   # İş mantığı katmanı
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── course_service.py
│   │   ├── video_service.py
│   │   ├── youtube_service.py      # YouTube API entegrasyonu
│   │   ├── exam_service.py
│   │   ├── evaluation_service.py
│   │   └── notification_service.py
│   │
│   ├── repositories/               # Veri erişim katmanı
│   │   ├── __init__.py
│   │   ├── base_repository.py
│   │   ├── user_repository.py
│   │   ├── course_repository.py
│   │   └── exam_repository.py
│   │
│   ├── schemas/                    # Marshmallow şemaları
│   │   ├── __init__.py
│   │   ├── user_schema.py
│   │   ├── course_schema.py
│   │   ├── content_schema.py
│   │   ├── exam_schema.py
│   │   └── evaluation_schema.py
│   │
│   ├── utils/                      # Yardımcı fonksiyonlar
│   │   ├── __init__.py
│   │   ├── validators.py
│   │   ├── helpers.py
│   │   ├── decorators.py
│   │   └── exceptions.py
│   │
│   └── tasks/                      # Celery görevleri
│       ├── __init__.py
│       ├── email_tasks.py
│       ├── video_tasks.py
│       └── report_tasks.py
│
├── migrations/                     # Alembic migrations
├── tests/                          # Test dosyaları
│   ├── unit/
│   ├── integration/
│   └── conftest.py
│
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.celery
│   └── nginx.conf
│
├── scripts/                        # Utility scripts
│   ├── seed_data.py
│   └── backup_db.py
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docker-compose.prod.yml
├── requirements.txt
├── requirements-dev.txt
├── pytest.ini
└── README.md
```

---

## 3. Veritabanı Tasarımı

### 3.1 ER Diyagramı

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      users       │       │      roles       │       │   permissions    │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │──┐    │ id (PK)          │──┐    │ id (PK)          │
│ email            │  │    │ name             │  │    │ name             │
│ password_hash    │  │    │ description      │  │    │ description      │
│ first_name       │  │    │ created_at       │  │    │ resource         │
│ last_name        │  │    └──────────────────┘  │    │ action           │
│ phone            │  │              │           │    └──────────────────┘
│ avatar_url       │  │    ┌─────────┴────────┐  │              │
│ is_active        │  │    │  role_permissions │  │    ┌────────┴────────┐
│ is_verified      │  │    ├──────────────────┤  │    │                  │
│ role_id (FK)     │──┴───▶│ role_id (FK)     │◀─┘    │                  │
│ created_at       │       │ permission_id(FK)│◀──────┘                  │
│ updated_at       │       └──────────────────┘                          │
└──────────────────┘                                                     │
         │                                                               │
         │         ┌──────────────────┐       ┌──────────────────┐       │
         │         │     courses      │       │      topics      │       │
         │         ├──────────────────┤       ├──────────────────┤       │
         │         │ id (PK)          │──┐    │ id (PK)          │       │
         │         │ title            │  │    │ course_id (FK)   │◀──────┘
         │         │ description      │  │    │ title            │
         │         │ thumbnail_url    │  │    │ description      │
         │         │ teacher_id (FK)  │◀─┼────│ order_index      │
         │         │ category_id (FK) │  │    │ is_published     │
         │         │ price            │  │    │ created_at       │
         │         │ is_published     │  │    └──────────────────┘
         │         │ created_at       │  │              │
         │         └──────────────────┘  │              │
         │                   │           │    ┌─────────┴────────┐
         │                   │           │    │                  │
┌────────┴─────────┐         │           │    ▼                  ▼
│  enrollments     │         │     ┌──────────────────┐  ┌──────────────────┐
├──────────────────┤         │     │     videos       │  │    questions     │
│ id (PK)          │         │     ├──────────────────┤  ├──────────────────┤
│ user_id (FK)     │◀────────┼─────│ id (PK)          │  │ id (PK)          │
│ course_id (FK)   │◀────────┘     │ topic_id (FK)    │  │ topic_id (FK)    │
│ enrolled_at      │               │ title            │  │ question_text    │
│ completed_at     │               │ description      │  │ question_type    │
│ progress_percent │               │ youtube_video_id │  │ difficulty       │
│ status           │               │ duration_seconds │  │ points           │
└──────────────────┘               │ order_index      │  │ explanation      │
                                   │ is_published     │  │ created_at       │
                                   │ created_at       │  └──────────────────┘
                                   └──────────────────┘            │
                                             │                     │
                                   ┌─────────┴────────┐  ┌─────────┴────────┐
                                   │  video_progress  │  │     answers      │
                                   ├──────────────────┤  ├──────────────────┤
                                   │ id (PK)          │  │ id (PK)          │
                                   │ user_id (FK)     │  │ question_id (FK) │
                                   │ video_id (FK)    │  │ answer_text      │
                                   │ watched_seconds  │  │ is_correct       │
                                   │ is_completed     │  │ order_index      │
                                   │ last_watched_at  │  └──────────────────┘
                                   └──────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      exams       │       │  exam_questions  │       │   exam_results   │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │──┐    │ id (PK)          │       │ id (PK)          │
│ topic_id (FK)    │  │    │ exam_id (FK)     │◀──────│ exam_id (FK)     │
│ title            │  │    │ question_id (FK) │       │ user_id (FK)     │
│ description      │  │    │ order_index      │       │ score            │
│ duration_minutes │  │    │ points           │       │ max_score        │
│ passing_score    │  │    └──────────────────┘       │ started_at       │
│ max_attempts     │  │                               │ completed_at     │
│ is_published     │  │                               │ is_passed        │
│ created_at       │  │                               └──────────────────┘
└──────────────────┘  │                                         │
                      │                               ┌─────────┴────────┐
                      │                               │  exam_answers    │
                      │                               ├──────────────────┤
                      │                               │ id (PK)          │
                      └──────────────────────────────▶│ exam_result_id   │
                                                      │ question_id (FK) │
                                                      │ selected_answer  │
                                                      │ is_correct       │
                                                      │ answered_at      │
                                                      └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│   evaluations    │       │ student_progress │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ student_id (FK)  │       │ user_id (FK)     │
│ teacher_id (FK)  │       │ course_id (FK)   │
│ course_id (FK)   │       │ topic_id (FK)    │
│ rating           │       │ videos_completed │
│ feedback         │       │ questions_solved │
│ strengths        │       │ exams_passed     │
│ improvements     │       │ total_points     │
│ created_at       │       │ last_activity_at │
└──────────────────┘       └──────────────────┘
```

### 3.2 Temel Tablolar SQL

```sql
-- Roller
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İzinler
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL
);

-- Rol-İzin İlişkisi
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Kullanıcılar
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    role_id INTEGER REFERENCES roles(id),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active);
```

---

## 4. API Tasarımı

### 4.1 RESTful API Endpoint'leri

#### Authentication Endpoints
```
POST   /api/v1/auth/register          # Kayıt
POST   /api/v1/auth/login              # Giriş
POST   /api/v1/auth/logout             # Çıkış
POST   /api/v1/auth/refresh            # Token yenileme
POST   /api/v1/auth/forgot-password    # Şifre sıfırlama isteği
POST   /api/v1/auth/reset-password     # Şifre sıfırlama
POST   /api/v1/auth/verify-email       # Email doğrulama
```

#### User Management Endpoints
```
GET    /api/v1/users                   # Kullanıcı listesi (Admin+)
GET    /api/v1/users/:id               # Kullanıcı detayı
PUT    /api/v1/users/:id               # Kullanıcı güncelleme
DELETE /api/v1/users/:id               # Kullanıcı silme (Soft delete)
GET    /api/v1/users/me                # Mevcut kullanıcı profili
PUT    /api/v1/users/me                # Profil güncelleme
PUT    /api/v1/users/me/password       # Şifre değiştirme
PUT    /api/v1/users/me/avatar         # Avatar güncelleme
```

#### Course Endpoints
```
GET    /api/v1/courses                 # Kurs listesi
POST   /api/v1/courses                 # Kurs oluşturma (Öğretmen+)
GET    /api/v1/courses/:id             # Kurs detayı
PUT    /api/v1/courses/:id             # Kurs güncelleme
DELETE /api/v1/courses/:id             # Kurs silme
POST   /api/v1/courses/:id/enroll      # Kursa kayıt (Öğrenci)
GET    /api/v1/courses/:id/students    # Kurs öğrencileri (Öğretmen+)
GET    /api/v1/courses/:id/progress    # Kurs ilerleme durumu
```

#### Topic Endpoints
```
GET    /api/v1/courses/:courseId/topics           # Konu listesi
POST   /api/v1/courses/:courseId/topics           # Konu oluşturma
GET    /api/v1/topics/:id                         # Konu detayı
PUT    /api/v1/topics/:id                         # Konu güncelleme
DELETE /api/v1/topics/:id                         # Konu silme
PUT    /api/v1/topics/:id/reorder                 # Konu sıralama
```

#### Video Endpoints
```
GET    /api/v1/topics/:topicId/videos             # Video listesi
POST   /api/v1/topics/:topicId/videos             # Video ekleme
GET    /api/v1/videos/:id                         # Video detayı
PUT    /api/v1/videos/:id                         # Video güncelleme
DELETE /api/v1/videos/:id                         # Video silme
POST   /api/v1/videos/:id/progress                # İzleme ilerlemesi kaydet
GET    /api/v1/videos/:id/embed                   # YouTube embed URL
```

#### Question Endpoints
```
GET    /api/v1/topics/:topicId/questions          # Soru listesi
POST   /api/v1/topics/:topicId/questions          # Soru oluşturma
GET    /api/v1/questions/:id                      # Soru detayı
PUT    /api/v1/questions/:id                      # Soru güncelleme
DELETE /api/v1/questions/:id                      # Soru silme
POST   /api/v1/questions/:id/answer               # Soru cevaplama
GET    /api/v1/questions/:id/statistics           # Soru istatistikleri
```

#### Exam Endpoints
```
GET    /api/v1/topics/:topicId/exams              # Sınav listesi
POST   /api/v1/topics/:topicId/exams              # Sınav oluşturma
GET    /api/v1/exams/:id                          # Sınav detayı
PUT    /api/v1/exams/:id                          # Sınav güncelleme
DELETE /api/v1/exams/:id                          # Sınav silme
POST   /api/v1/exams/:id/start                    # Sınava başla
POST   /api/v1/exams/:id/submit                   # Sınavı gönder
GET    /api/v1/exams/:id/results                  # Sınav sonuçları
GET    /api/v1/exams/:id/results/:resultId        # Sonuç detayı
```

#### Evaluation Endpoints
```
GET    /api/v1/students/:id/evaluations           # Öğrenci değerlendirmeleri
POST   /api/v1/students/:id/evaluations           # Değerlendirme oluştur
GET    /api/v1/evaluations/:id                    # Değerlendirme detayı
PUT    /api/v1/evaluations/:id                    # Değerlendirme güncelle
GET    /api/v1/students/:id/progress              # Öğrenci ilerleme raporu
GET    /api/v1/students/:id/analytics             # Öğrenci analitikleri
```

#### Report Endpoints (Admin+)
```
GET    /api/v1/reports/dashboard                  # Dashboard istatistikleri
GET    /api/v1/reports/users                      # Kullanıcı raporları
GET    /api/v1/reports/courses                    # Kurs raporları
GET    /api/v1/reports/exams                      # Sınav raporları
GET    /api/v1/reports/revenue                    # Gelir raporları (Süper Admin)
```

### 4.2 API Response Formatı

```json
{
    "success": true,
    "message": "Operation successful",
    "data": {
        // Response data
    },
    "meta": {
        "page": 1,
        "per_page": 20,
        "total": 100,
        "total_pages": 5
    },
    "timestamp": "2024-12-24T10:30:00Z"
}
```

### 4.3 Error Response Formatı

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": [
            {
                "field": "email",
                "message": "Invalid email format"
            }
        ]
    },
    "timestamp": "2024-12-24T10:30:00Z"
}
```

---

## 5. Güvenlik Mimarisi

### 5.1 Authentication Flow

```
┌─────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│  Client │          │   API   │          │  Redis  │          │   DB    │
└────┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │                    │
     │  POST /auth/login  │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │  Check credentials │                    │
     │                    │───────────────────────────────────────▶│
     │                    │                    │                    │
     │                    │◀───────────────────────────────────────│
     │                    │                    │                    │
     │                    │  Store refresh     │                    │
     │                    │  token in Redis    │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │  Access + Refresh  │                    │                    │
     │◀───────────────────│                    │                    │
     │                    │                    │                    │
     │  API Request       │                    │                    │
     │  + Access Token    │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │  Validate JWT      │                    │
     │                    │  (local)           │                    │
     │                    │                    │                    │
     │  Response          │                    │                    │
     │◀───────────────────│                    │                    │
```

### 5.2 JWT Token Yapısı

```json
{
    "header": {
        "alg": "RS256",
        "typ": "JWT"
    },
    "payload": {
        "sub": "user_id",
        "email": "user@example.com",
        "role": "student",
        "permissions": ["read:courses", "read:videos"],
        "iat": 1703412600,
        "exp": 1703416200,
        "jti": "unique_token_id"
    }
}
```

### 5.3 Rate Limiting Stratejisi

| Endpoint Kategorisi | Rate Limit | Pencere |
|---------------------|------------|---------|
| Auth endpoints | 5 req | 1 dakika |
| Public endpoints | 100 req | 1 dakika |
| Authenticated endpoints | 200 req | 1 dakika |
| Admin endpoints | 500 req | 1 dakika |
| Video streaming | 50 req | 1 dakika |

### 5.4 İzin Matrisi

| Kaynak | Öğrenci | Öğretmen | Admin | Süper Admin |
|--------|---------|----------|-------|-------------|
| Kurs görüntüleme | ✅ | ✅ | ✅ | ✅ |
| Kurs oluşturma | ❌ | ✅ | ✅ | ✅ |
| Kurs silme | ❌ | ✅* | ✅ | ✅ |
| Video izleme | ✅ | ✅ | ✅ | ✅ |
| Video yükleme | ❌ | ✅ | ✅ | ✅ |
| Soru çözme | ✅ | ✅ | ✅ | ✅ |
| Soru oluşturma | ❌ | ✅ | ✅ | ✅ |
| Sınava girme | ✅ | ❌ | ❌ | ❌ |
| Sınav oluşturma | ❌ | ✅ | ✅ | ✅ |
| Değerlendirme yazma | ❌ | ✅ | ✅ | ✅ |
| Kullanıcı yönetimi | ❌ | ❌ | ✅ | ✅ |
| Sistem ayarları | ❌ | ❌ | ❌ | ✅ |
| Finansal raporlar | ❌ | ❌ | ❌ | ✅ |

*Sadece kendi kursları

---

## 6. Modül Yapıları

### 6.1 Video Modülü - YouTube Entegrasyonu

```python
# YouTube Service Akışı
┌─────────────────────────────────────────────────────────────────┐
│                     VIDEO UPLOAD FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Öğretmen video bilgilerini girer                           │
│     ↓                                                           │
│  2. YouTube Video ID (unlisted video) sisteme kaydedilir       │
│     ↓                                                           │
│  3. Video metadata YouTube API'den çekilir                      │
│     ↓                                                           │
│  4. Thumbnail ve süre bilgisi veritabanına kaydedilir          │
│     ↓                                                           │
│  5. Video konuya bağlanır ve sıralaması belirlenir             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     VIDEO PLAYBACK FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Öğrenci video sayfasını açar                               │
│     ↓                                                           │
│  2. Backend enrollment ve yetki kontrolü yapar                  │
│     ↓                                                           │
│  3. Signed embed URL oluşturulur (zaman sınırlı)               │
│     ↓                                                           │
│  4. Frontend YouTube player'ı embed URL ile yükler             │
│     ↓                                                           │
│  5. Player events ile izleme ilerlemesi kaydedilir             │
│     ↓                                                           │
│  6. Video tamamlandığında progress güncellenir                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Sınav Modülü

```
┌─────────────────────────────────────────────────────────────────┐
│                       EXAM FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OLUŞTURMA (Öğretmen)                                          │
│  ─────────────────────                                          │
│  1. Sınav temel bilgileri (başlık, süre, geçme notu)           │
│  2. Soru havuzundan soru seçimi                                 │
│  3. Soru puanları ve sıralama                                   │
│  4. Yayınlama ve erişim ayarları                               │
│                                                                 │
│  ÇÖZME (Öğrenci)                                               │
│  ────────────────                                               │
│  1. Sınav başlatma (attempt oluşturma)                         │
│  2. Süre sayacı başlatma (frontend + backend validation)        │
│  3. Soru navigasyonu ve cevaplama                              │
│  4. Otomatik kaydetme (her cevap değişikliğinde)               │
│  5. Sınav gönderme veya süre dolumu                            │
│                                                                 │
│  DEĞERLENDİRME                                                 │
│  ─────────────                                                  │
│  1. Otomatik puanlama (çoktan seçmeli)                         │
│  2. Sonuç hesaplama ve kaydetme                                │
│  3. Detaylı analiz (doğru/yanlış breakdown)                    │
│  4. Karşılaştırmalı performans                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Değerlendirme Modülü

```
Değerlendirme Boyutları:
├── Akademik Performans
│   ├── Sınav skorları
│   ├── Ödev tamamlama oranı
│   └── Quiz başarısı
│
├── Katılım Metrikleri
│   ├── Video izleme süresi
│   ├── Platform aktifliği
│   └── Düzenlilik
│
├── Öğretmen Değerlendirmesi
│   ├── Güçlü yönler
│   ├── Gelişim alanları
│   └── Öneriler
│
└── İlerleme Takibi
    ├── Konu bazlı ilerleme
    ├── Hedef takibi
    └── Karşılaştırmalı analiz
```

---

## 7. Deployment Stratejisi

### 7.1 Development Environment

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=development
    volumes:
      - .:/app
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: coaching_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  celery:
    build: .
    command: celery -A app.celery worker --loglevel=info
    depends_on:
      - redis
      - db

volumes:
  postgres_data:
```

### 7.2 Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                         Load Balancer                           │
│                    (AWS ALB / CloudFlare)                       │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│         ┌────────┐      ┌────────┐      ┌────────┐             │
│         │ API #1 │      │ API #2 │      │ API #3 │             │
│         │(Docker)│      │(Docker)│      │(Docker)│             │
│         └────────┘      └────────┘      └────────┘             │
│              │               │               │                  │
│              └───────────────┼───────────────┘                  │
│                              ▼                                  │
│         ┌─────────────────────────────────────────┐            │
│         │           Redis Cluster                  │            │
│         │      (ElastiCache / Redis Cloud)        │            │
│         └─────────────────────────────────────────┘            │
│                              │                                  │
│         ┌─────────────────────────────────────────┐            │
│         │        PostgreSQL (RDS / Aurora)         │            │
│         │         Primary + Read Replicas          │            │
│         └─────────────────────────────────────────┘            │
│                                                                 │
│         ┌─────────────────────────────────────────┐            │
│         │           Celery Workers                 │            │
│         │        (ECS / Kubernetes)                │            │
│         └─────────────────────────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Monitoring & Logging

```
Monitoring Stack:
├── Application Monitoring
│   ├── Sentry (Error tracking)
│   ├── New Relic / DataDog (APM)
│   └── Custom metrics (Prometheus)
│
├── Infrastructure Monitoring
│   ├── CloudWatch / Grafana
│   ├── PagerDuty (Alerting)
│   └── Uptime Robot (Availability)
│
├── Logging
│   ├── Structured logging (JSON)
│   ├── ELK Stack / CloudWatch Logs
│   └── Log aggregation
│
└── Analytics
    ├── User behavior (Mixpanel)
    ├── Business metrics
    └── Custom dashboards
```

---

## 8. Geliştirme Yol Haritası

### Phase 1: MVP (4-6 hafta)
- [ ] Temel authentication sistemi
- [ ] Kullanıcı yönetimi
- [ ] Kurs ve konu yapısı
- [ ] Video entegrasyonu (YouTube)
- [ ] Basit soru-cevap sistemi

### Phase 2: Core Features (4-6 hafta)
- [ ] Sınav modülü
- [ ] İlerleme takibi
- [ ] Değerlendirme sistemi
- [ ] Dashboard ve raporlama
- [ ] Bildirim sistemi

### Phase 3: Advanced Features (4-6 hafta)
- [ ] Gelişmiş analitikler
- [ ] Ödeme sistemi entegrasyonu
- [ ] Mobil uygulama API'leri
- [ ] Canlı ders desteği
- [ ] Performans optimizasyonları

### Phase 4: Scale & Optimize (Sürekli)
- [ ] Caching stratejileri
- [ ] Database optimizasyonları
- [ ] CDN entegrasyonu
- [ ] A/B testing altyapısı
- [ ] Machine learning önerileri

---

**Doküman Versiyonu:** 1.0  
**Son Güncelleme:** 24 Aralık 2024  
**Hazırlayan:** Senior Software Architect
