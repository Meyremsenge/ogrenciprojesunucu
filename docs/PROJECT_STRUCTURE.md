# Kurumsal Flask Proje Yapısı

## 📁 Genel Bakış

Bu doküman, 10.000+ eş zamanlı kullanıcı için tasarlanmış kurumsal düzeyde Flask proje yapısını açıklar.

```
ÖğrenciSistemi/
│
├── app/                           # Ana uygulama paketi
│   ├── __init__.py               # App Factory
│   ├── config.py                 # Konfigürasyon sınıfları
│   ├── extensions.py             # Flask extension'ları
│   │
│   ├── core/                     # Çekirdek bileşenler (tüm modüller kullanır)
│   │   ├── __init__.py
│   │   ├── database.py           # Database utilities, base model
│   │   ├── security.py           # Güvenlik utilities (hash, token)
│   │   ├── exceptions.py         # Özel exception sınıfları
│   │   ├── responses.py          # Standart API response formatları
│   │   ├── decorators.py         # Ortak decorator'lar
│   │   └── pagination.py         # Pagination utilities
│   │
│   ├── common/                   # Paylaşılan bileşenler
│   │   ├── __init__.py
│   │   ├── base_model.py         # Tüm modeller için base class
│   │   ├── base_service.py       # Tüm servisler için base class
│   │   ├── base_schema.py        # Tüm schema'lar için base class
│   │   └── validators.py         # Ortak validation kuralları
│   │
│   ├── modules/                  # Feature modülleri (Domain-Driven)
│   │   ├── __init__.py
│   │   │
│   │   ├── auth/                 # Kimlik doğrulama modülü
│   │   │   ├── __init__.py
│   │   │   ├── routes.py         # API endpoint'leri
│   │   │   ├── services.py       # İş mantığı
│   │   │   ├── schemas.py        # Request/Response şemaları
│   │   │   └── utils.py          # Modüle özel yardımcılar
│   │   │
│   │   ├── users/                # Kullanıcı yönetimi modülü
│   │   │   ├── __init__.py
│   │   │   ├── models.py         # User, Role, Permission modelleri
│   │   │   ├── routes.py         # API endpoint'leri
│   │   │   ├── services.py       # İş mantığı
│   │   │   ├── schemas.py        # Serialization şemaları
│   │   │   └── permissions.py    # Yetki tanımları
│   │   │
│   │   ├── courses/              # Kurs yönetimi modülü
│   │   │   ├── __init__.py
│   │   │   ├── models.py         # Course, Topic, Enrollment
│   │   │   ├── routes.py
│   │   │   ├── services.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── contents/             # İçerik yönetimi modülü
│   │   │   ├── __init__.py
│   │   │   ├── models.py         # Video, Document, Progress
│   │   │   ├── routes.py
│   │   │   ├── services.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── exams/                # Sınav modülü
│   │   │   ├── __init__.py
│   │   │   ├── models.py         # Exam, Question, Answer, Attempt
│   │   │   ├── routes.py
│   │   │   ├── services.py
│   │   │   ├── schemas.py
│   │   │   └── grading.py        # Puanlama mantığı
│   │   │
│   │   ├── evaluations/          # Değerlendirme modülü
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── routes.py
│   │   │   ├── services.py
│   │   │   └── schemas.py
│   │   │
│   │   └── live_classes/         # Canlı ders modülü
│   │       ├── __init__.py
│   │       ├── models.py         # LiveSession, Attendance
│   │       ├── routes.py
│   │       ├── services.py
│   │       └── schemas.py
│   │
│   ├── services/                 # Paylaşılan servisler (Cross-cutting)
│   │   ├── __init__.py
│   │   ├── email_service.py      # E-posta gönderimi
│   │   ├── notification_service.py # Bildirim servisi
│   │   ├── cache_service.py      # Cache yönetimi
│   │   ├── storage_service.py    # Dosya depolama
│   │   └── youtube_service.py    # YouTube API entegrasyonu
│   │
│   ├── api/                      # API yapılandırması
│   │   ├── __init__.py
│   │   ├── v1/                   # API versiyon 1
│   │   │   ├── __init__.py       # Blueprint birleştirme
│   │   │   └── routes.py         # Route registration
│   │   └── v2/                   # Gelecek API versiyonu (hazırlık)
│   │       └── __init__.py
│   │
│   ├── middleware/               # HTTP Middleware'ler
│   │   ├── __init__.py
│   │   ├── logging.py            # Request logging
│   │   ├── rate_limiter.py       # Rate limiting
│   │   ├── cors.py               # CORS yapılandırması
│   │   └── error_handler.py      # Global error handling
│   │
│   ├── tasks/                    # Celery arka plan görevleri
│   │   ├── __init__.py
│   │   ├── email_tasks.py
│   │   ├── report_tasks.py
│   │   └── cleanup_tasks.py
│   │
│   └── utils/                    # Genel yardımcı fonksiyonlar
│       ├── __init__.py
│       ├── helpers.py            # Genel utility fonksiyonları
│       ├── constants.py          # Sabitler
│       └── enums.py              # Enum tanımları
│
├── migrations/                   # Alembic database migrations
├── tests/                        # Test dosyaları
│   ├── unit/                     # Birim testleri
│   ├── integration/              # Entegrasyon testleri
│   └── conftest.py               # Pytest fixtures
│
├── docker/                       # Docker yapılandırması
├── docs/                         # Dokümantasyon
├── scripts/                      # Utility script'ler
│
├── run.py                        # Uygulama giriş noktası
├── celery_worker.py              # Celery worker
├── requirements.txt              # Python bağımlılıkları
├── docker-compose.yml            # Docker Compose
└── .env.example                  # Environment değişkenleri örneği
```

---

## 📂 Klasör Sorumlulukları

### 1. `app/core/` - Çekirdek Bileşenler

**Sorumluluk:** Tüm modüller tarafından kullanılan temel altyapı bileşenleri.

| Dosya | Açıklama |
|-------|----------|
| `database.py` | Database bağlantı yönetimi, session factory, health check |
| `security.py` | Password hashing, token generation, encryption utilities |
| `exceptions.py` | Özel exception sınıfları (ValidationError, NotFoundError vb.) |
| `responses.py` | Standart API response formatları (success, error, paginated) |
| `decorators.py` | `@require_role`, `@validate_json`, `@cache_response` |
| `pagination.py` | Cursor-based ve offset pagination utilities |

**Prensip:** Core bileşenler hiçbir modüle bağımlı olmamalı, yalnızca Flask ve extension'lara bağımlı olabilir.

---

### 2. `app/common/` - Paylaşılan Base Sınıflar

**Sorumluluk:** Tüm modüllerin miras aldığı base class'lar.

| Dosya | Açıklama |
|-------|----------|
| `base_model.py` | Tüm SQLAlchemy modelleri için ortak alanlar (id, created_at, updated_at) |
| `base_service.py` | CRUD operasyonları için generic service class |
| `base_schema.py` | Marshmallow schema'ları için ortak yapılandırma |
| `validators.py` | Ortak validation kuralları (email, phone, tc_kimlik vb.) |

---

### 3. `app/modules/` - Feature Modülleri (Domain-Driven)

**Sorumluluk:** Her modül kendi domain'ine ait tüm bileşenleri içerir.

#### Modül Yapısı:
```
module_name/
├── __init__.py      # Blueprint tanımı ve export'lar
├── models.py        # SQLAlchemy modelleri
├── routes.py        # API endpoint'leri (Controller)
├── services.py      # İş mantığı (Business Logic)
├── schemas.py       # Request/Response serialization
└── utils.py         # Modüle özel yardımcılar (opsiyonel)
```

#### Mevcut Modüller:

| Modül | Sorumluluk |
|-------|------------|
| `auth` | Login, logout, register, token yönetimi, şifre sıfırlama |
| `users` | Kullanıcı CRUD, rol/yetki yönetimi, profil |
| `courses` | Kurs oluşturma, konu yönetimi, kayıt işlemleri |
| `contents` | Video/döküman yönetimi, ilerleme takibi |
| `exams` | Sınav oluşturma, soru yönetimi, puanlama |
| `evaluations` | Öğrenci değerlendirme, not girişi |
| `live_classes` | Canlı ders planlaması, katılım takibi |

**Prensip:** Modüller birbirine doğrudan bağımlı olmamalı. Modüller arası iletişim servisler üzerinden yapılmalı.

---

### 4. `app/services/` - Paylaşılan Servisler

**Sorumluluk:** Birden fazla modül tarafından kullanılan cross-cutting servisler.

| Servis | Sorumluluk |
|--------|------------|
| `email_service.py` | SMTP/SendGrid ile e-posta gönderimi |
| `notification_service.py` | Push notification, in-app bildirimler |
| `cache_service.py` | Redis cache CRUD operasyonları |
| `storage_service.py` | S3/Local dosya depolama |
| `youtube_service.py` | YouTube API entegrasyonu |

---

### 5. `app/api/` - API Versiyonlama

**Sorumluluk:** API version management ve route aggregation.

```python
# app/api/v1/__init__.py
from flask import Blueprint

api_v1_bp = Blueprint('api_v1', __name__, url_prefix='/api/v1')

# Tüm modül route'larını kaydet
from app.modules.auth import auth_bp
from app.modules.users import users_bp
# ...

api_v1_bp.register_blueprint(auth_bp, url_prefix='/auth')
api_v1_bp.register_blueprint(users_bp, url_prefix='/users')
```

---

### 6. `app/middleware/` - HTTP Middleware

**Sorumluluk:** Request/Response işleme katmanı.

| Middleware | Sorumluluk |
|------------|------------|
| `logging.py` | Request ID, timing, structured logging |
| `rate_limiter.py` | IP/User bazlı rate limiting |
| `cors.py` | CORS header yönetimi |
| `error_handler.py` | Global exception handling |

---

### 7. `app/tasks/` - Celery Görevleri

**Sorumluluk:** Asenkron arka plan işlemleri.

| Task | Sorumluluk |
|------|------------|
| `email_tasks.py` | E-posta gönderim kuyruğu |
| `report_tasks.py` | Rapor oluşturma |
| `cleanup_tasks.py` | Periyodik temizlik |

---

## 🔄 Veri Akışı

```
Request → Middleware → Route → Service → Model → Database
                                  ↓
                              Response
```

### Katman Sorumlulukları:

| Katman | Sorumluluk | Örnek |
|--------|------------|-------|
| **Route** | HTTP handling, validation, response | `POST /api/v1/users` |
| **Service** | Business logic, transaction | `UserService.create_user()` |
| **Model** | Data access, ORM | `User.query.filter_by()` |

---

## 📏 Kodlama Standartları

### 1. Import Sırası
```python
# 1. Standart kütüphaneler
import os
from datetime import datetime

# 2. Üçüncü parti kütüphaneler
from flask import Blueprint
from sqlalchemy import Column

# 3. Uygulama içi import'lar
from app.core.exceptions import NotFoundError
from app.common.base_service import BaseService
```

### 2. Modül Export
```python
# modules/users/__init__.py
from app.modules.users.routes import users_bp
from app.modules.users.models import User, Role
from app.modules.users.services import UserService

__all__ = ['users_bp', 'User', 'Role', 'UserService']
```

### 3. Service Pattern
```python
class UserService(BaseService):
    model = User
    
    @classmethod
    def create_user(cls, data: dict) -> User:
        # Validation
        # Business logic
        # Database operation
        # Return result
```

---

## 🚀 Avantajlar

1. **Modülerlik:** Her modül bağımsız geliştirilebilir ve test edilebilir
2. **Ölçeklenebilirlik:** Yeni modüller kolayca eklenebilir
3. **Bakım Kolaylığı:** İlgili kodlar bir arada, kolay navigasyon
4. **API Versiyonlama:** Breaking change'ler yeni versiyon altında
5. **Test Edilebilirlik:** Service layer mock'lanabilir
6. **Separation of Concerns:** Her katman tek sorumluluğa sahip
