# 🏛️ Kurumsal Yazılım Standartları

> **Versiyon:** 1.0.0  
> **Son Güncelleme:** 2024-12-24  
> **Yazar:** Principal Software Engineer  
> **Durum:** ✅ Aktif

---

## 📋 İçindekiler

1. [Genel Prensipler](#genel-prensipler)
2. [Naming Convention](#naming-convention)
3. [Soft Delete ve Veri Geri Alma](#soft-delete-ve-veri-geri-alma)
4. [Versiyonlama Stratejisi](#versiyonlama-stratejisi)
5. [Audit Logging](#audit-logging)
6. [Yetkilendirme ve Rol Kontrolü](#yetkilendirme-ve-rol-kontrolü)
7. [Error Handling](#error-handling)
8. [API Response Formatı](#api-response-formatı)
9. [Veritabanı Standartları](#veritabanı-standartları)
10. [Frontend Standartları](#frontend-standartları)

---

## 🎯 Genel Prensipler

### SOLID Prensipleri

| Prensip | Açıklama | Uygulama |
|---------|----------|----------|
| **S**ingle Responsibility | Her sınıf tek bir sorumluluğa sahip | Service → iş mantığı, Repository → veri erişimi |
| **O**pen/Closed | Genişlemeye açık, değişikliğe kapalı | Mixin'ler ve abstract class kullanımı |
| **L**iskov Substitution | Alt sınıflar üst sınıf yerine kullanılabilmeli | BaseModel, BaseService kalıtımları |
| **I**nterface Segregation | İstemciler kullanmadığı arayüzlere bağımlı olmamalı | Modül bazlı schema ayrımı |
| **D**ependency Inversion | Üst seviye modüller alt seviyeye bağımlı olmamalı | Dependency injection |

### Clean Code Kuralları

```python
# ✅ DOĞRU: Anlamlı ve açıklayıcı isimler
def calculate_course_completion_percentage(enrollment: Enrollment) -> float:
    completed_lessons = enrollment.completed_lessons
    total_lessons = enrollment.course.total_lessons
    return (completed_lessons / total_lessons) * 100 if total_lessons > 0 else 0.0

# ❌ YANLIŞ: Kısa ve anlamsız isimler
def calc_pct(e):
    return e.c / e.t * 100
```

### Kritiklik Seviyesi

Bu standartlar neden kritik?

1. **Tutarlılık**: 10+ developer'lık ekiplerde kod tabanının anlaşılabilir kalması
2. **Bakım Kolaylığı**: Yeni ekip üyelerinin hızla adapte olması
3. **Hata Önleme**: Standart yapılar sayesinde yaygın hataların önlenmesi
4. **Ölçeklenebilirlik**: Modüler yapı sayesinde yatay büyüme
5. **Güvenlik**: Tutarlı authorization ve audit mekanizmaları

---

## 📝 Naming Convention

### Python Kod Standartları (PEP 8+)

| Tip | Format | Örnek |
|-----|--------|-------|
| **Sınıf** | PascalCase | `UserService`, `CourseEnrollment` |
| **Fonksiyon/Metod** | snake_case | `get_user_by_id()`, `calculate_score()` |
| **Değişken** | snake_case | `user_count`, `total_score` |
| **Sabit** | SCREAMING_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS`, `DEFAULT_PAGE_SIZE` |
| **Private** | _leading_underscore | `_validate_input()`, `_cache` |
| **Protected** | __double_underscore | `__internal_state` |
| **Modül** | snake_case | `user_service.py`, `auth_utils.py` |
| **Paket** | snake_case | `live_classes/`, `course_management/` |

### Veritabanı Naming Convention

| Tip | Format | Örnek |
|-----|--------|-------|
| **Tablo** | snake_case (çoğul) | `users`, `course_enrollments`, `exam_attempts` |
| **Kolon** | snake_case | `created_at`, `user_id`, `is_active` |
| **Primary Key** | `id` | Her tabloda `id` |
| **Foreign Key** | `{tablo}_id` | `user_id`, `course_id` |
| **Junction Table** | `{tablo1}_{tablo2}` | `role_permissions`, `course_topics` |
| **Index** | `ix_{tablo}_{kolon}` | `ix_users_email` |
| **Unique Constraint** | `uq_{tablo}_{kolon}` | `uq_users_email` |
| **Check Constraint** | `ck_{tablo}_{kolon}` | `ck_users_age` |

### API Endpoint Naming

```
# RESTful Convention
GET    /api/v1/users                 # Liste
POST   /api/v1/users                 # Oluştur
GET    /api/v1/users/{id}            # Detay
PUT    /api/v1/users/{id}            # Güncelle (tam)
PATCH  /api/v1/users/{id}            # Güncelle (kısmi)
DELETE /api/v1/users/{id}            # Sil

# Alt kaynaklar
GET    /api/v1/users/{id}/enrollments
POST   /api/v1/courses/{id}/topics

# Aksiyonlar (RPC-style sadece gerektiğinde)
POST   /api/v1/courses/{id}/publish
POST   /api/v1/exams/{id}/submit
```

---

## 🗑️ Soft Delete ve Veri Geri Alma

### Neden Soft Delete?

1. **Veri Kaybı Önleme**: Yanlışlıkla silinen veriler geri alınabilir
2. **Audit Trail**: Silinen verilerin izi takip edilebilir
3. **Referential Integrity**: İlişkili kayıtlar bozulmaz
4. **Yasal Uyumluluk**: KVKK/GDPR gereksinimleri için veri saklama

### Uygulama Stratejisi

```python
class SoftDeleteMixin:
    """
    Soft delete özelliği ekleyen mixin.
    
    Alanlar:
        - is_deleted: Boolean flag
        - deleted_at: Silme zamanı
        - deleted_by_id: Silen kullanıcı
    """
    
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True, index=True)
    deleted_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    def soft_delete(self, deleted_by: int = None):
        """Kaydı soft delete olarak işaretle."""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        self.deleted_by_id = deleted_by
    
    def restore(self, restored_by: int = None):
        """Soft delete'i geri al."""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by_id = None
        # Audit log kaydı oluştur
        
    @classmethod
    def query_active(cls):
        """Sadece aktif kayıtları sorgula."""
        return cls.query.filter_by(is_deleted=False)
    
    @classmethod
    def query_deleted(cls):
        """Sadece silinmiş kayıtları sorgula."""
        return cls.query.filter_by(is_deleted=True)
```

### Veri Saklama Politikası

| Veri Tipi | Saklama Süresi | Aksiyon |
|-----------|----------------|---------|
| Kullanıcı Verileri | 2 yıl | Anonimize et |
| Ödeme Kayıtları | 10 yıl | Arşivle |
| Sınav Sonuçları | 5 yıl | Arşivle |
| Log Kayıtları | 1 yıl | Kalıcı sil |
| Oturum Verileri | 30 gün | Kalıcı sil |

### Hard Delete Kriterleri

Aşağıdaki durumlarda hard delete uygulanabilir:
- Kullanıcı açık GDPR silme talebi
- Saklama süresi dolmuş veriler
- Test/geliştirme verileri

---

## 🔄 Versiyonlama Stratejisi

### Entity Versioning

```python
class VersionedMixin:
    """
    Kayıt versiyonlama için mixin.
    
    Optimistic locking ve değişiklik takibi sağlar.
    """
    
    version = Column(Integer, default=1, nullable=False)
    version_hash = Column(String(64), nullable=True)
    
    def increment_version(self):
        """Versiyon numarasını artır."""
        self.version += 1
        self._update_version_hash()
    
    def _update_version_hash(self):
        """Versiyon hash'i güncelle."""
        import hashlib
        content = f"{self.id}:{self.version}:{datetime.utcnow().isoformat()}"
        self.version_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
```

### API Versioning

```
/api/v1/users    # Mevcut stabil versiyon
/api/v2/users    # Yeni özellikler (beta)
```

**Versiyon Geçiş Politikası:**
- v(n-1) en az 6 ay desteklenir
- Deprecation header'ları ile uyarı
- Migration guide dokümantasyonu

### Semantic Versioning (SemVer)

```
MAJOR.MINOR.PATCH

1.0.0  → İlk stabil release
1.1.0  → Yeni özellik (geriye uyumlu)
1.1.1  → Bug fix
2.0.0  → Breaking change
```

---

## 📊 Audit Logging

### Neden Audit Log?

1. **Güvenlik**: Şüpheli aktivitelerin tespiti
2. **Uyumluluk**: Yasal gereksinimler (SOC2, ISO27001)
3. **Debug**: Hata analizi ve sistem davranışı takibi
4. **Analytics**: Kullanıcı davranış analizi

### Audit Log Yapısı

```python
class AuditLog(BaseModel):
    """
    Sistem genelinde audit log kaydı.
    """
    
    __tablename__ = 'audit_logs'
    
    # Kim?
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)  # Denormalize for query
    ip_address = Column(String(45), nullable=True)   # IPv6 support
    user_agent = Column(String(500), nullable=True)
    
    # Ne?
    action = Column(String(50), nullable=False, index=True)  # CREATE, UPDATE, DELETE, LOGIN, etc.
    entity_type = Column(String(100), nullable=False, index=True)  # User, Course, Exam
    entity_id = Column(Integer, nullable=True, index=True)
    
    # Değişiklik detayları
    old_values = Column(JSON, nullable=True)  # Önceki değerler
    new_values = Column(JSON, nullable=True)  # Yeni değerler
    changed_fields = Column(JSON, nullable=True)  # Değişen alanlar listesi
    
    # Bağlam
    request_id = Column(String(36), nullable=True, index=True)  # Correlation ID
    session_id = Column(String(36), nullable=True)
    module = Column(String(50), nullable=True)  # auth, users, courses
    
    # Sonuç
    status = Column(String(20), default='success')  # success, failure, error
    error_message = Column(Text, nullable=True)
    
    # Zaman
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
```

### Audit Log Kategorileri

| Kategori | Aksiyonlar | Öncelik |
|----------|------------|---------|
| **Authentication** | LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE | 🔴 Kritik |
| **Authorization** | PERMISSION_DENIED, ROLE_CHANGE | 🔴 Kritik |
| **Data Mutation** | CREATE, UPDATE, DELETE | 🟡 Yüksek |
| **Data Access** | READ (hassas veriler için) | 🟢 Normal |
| **System** | CONFIG_CHANGE, MAINTENANCE | 🔴 Kritik |

### Audit Log Dekoratörü

```python
from functools import wraps

def audit_log(action: str, entity_type: str = None):
    """
    Audit log kaydı oluşturan dekoratör.
    
    Kullanım:
        @audit_log(action='CREATE', entity_type='Course')
        def create_course(self, data):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # İşlem öncesi durum
            old_values = None
            
            try:
                result = func(*args, **kwargs)
                
                # Başarılı audit log
                AuditService.log(
                    action=action,
                    entity_type=entity_type or func.__name__,
                    status='success',
                    new_values=result if isinstance(result, dict) else None
                )
                
                return result
                
            except Exception as e:
                # Hata audit log
                AuditService.log(
                    action=action,
                    entity_type=entity_type,
                    status='error',
                    error_message=str(e)
                )
                raise
        return wrapper
    return decorator
```

---

## 🔐 Yetkilendirme ve Rol Kontrolü

### RBAC (Role-Based Access Control) Yapısı

```
┌─────────────────────────────────────────────────────────────┐
│                         SUPER_ADMIN                         │
│  (Tüm yetkiler + sistem yönetimi)                          │
├─────────────────────────────────────────────────────────────┤
│                           ADMIN                             │
│  (Kullanıcı yönetimi, kurs yönetimi, raporlar)             │
├─────────────────────────────────────────────────────────────┤
│                          TEACHER                            │
│  (Kendi kursları, öğrenci değerlendirme, içerik yönetimi)  │
├─────────────────────────────────────────────────────────────┤
│                          STUDENT                            │
│  (Kayıtlı kurslar, sınavlar, ilerleme takibi)              │
└─────────────────────────────────────────────────────────────┘
```

### Permission Tanımlama

```python
# Permission format: {resource}:{action}
PERMISSIONS = {
    # User permissions
    'users:create': 'Kullanıcı oluşturma',
    'users:read': 'Kullanıcı görüntüleme',
    'users:update': 'Kullanıcı güncelleme',
    'users:delete': 'Kullanıcı silme',
    'users:manage': 'Kullanıcı yönetimi (tümü)',
    
    # Course permissions
    'courses:create': 'Kurs oluşturma',
    'courses:read': 'Kurs görüntüleme',
    'courses:update': 'Kurs güncelleme',
    'courses:delete': 'Kurs silme',
    'courses:publish': 'Kurs yayınlama',
    'courses:manage': 'Kurs yönetimi (tümü)',
    
    # Exam permissions
    'exams:create': 'Sınav oluşturma',
    'exams:grade': 'Sınav puanlama',
    'exams:take': 'Sınava girme',
    
    # System permissions
    'system:admin': 'Sistem yönetimi',
    'system:audit': 'Audit log görüntüleme',
}
```

### Yetki Kontrol Dekoratörleri

```python
@require_role('admin', 'super_admin')
def delete_user(user_id: int):
    """Sadece admin ve super_admin kullanabilir."""
    pass

@require_permission('courses:publish')
def publish_course(course_id: int):
    """courses:publish yetkisi gerektirir."""
    pass

@require_owner_or_role('admin')
def update_profile(user_id: int):
    """Kaynak sahibi veya admin olmalı."""
    pass
```

### Ownership Control

```python
def check_ownership(entity, user_id: int, owner_field: str = 'user_id') -> bool:
    """
    Kaynak sahipliğini kontrol eder.
    
    Args:
        entity: Kontrol edilecek kaynak
        user_id: Mevcut kullanıcı ID
        owner_field: Sahiplik alanı adı
    """
    owner_id = getattr(entity, owner_field, None)
    return owner_id == user_id
```

---

## ⚠️ Error Handling

### Exception Hiyerarşisi

```
AppException (Base)
├── ValidationError (400)
│   ├── InvalidFormatError
│   └── MissingFieldError
├── AuthenticationError (401)
│   ├── InvalidCredentialsError
│   └── TokenExpiredError
├── AuthorizationError (403)
│   ├── InsufficientPermissionError
│   └── ResourceAccessDeniedError
├── NotFoundError (404)
├── ConflictError (409)
│   └── DuplicateResourceError
├── RateLimitError (429)
├── BusinessLogicError (422)
└── ExternalServiceError (502)
```

### Error Handling Best Practices

```python
# ✅ DOĞRU: Spesifik exception kullan
from app.core.exceptions import NotFoundError, ValidationError

def get_user(user_id: int) -> User:
    user = User.query.get(user_id)
    if not user:
        raise NotFoundError('Kullanıcı', user_id)
    return user

# ❌ YANLIŞ: Generic exception
def get_user(user_id: int) -> User:
    user = User.query.get(user_id)
    if not user:
        raise Exception('User not found')  # Kötü!
    return user
```

### Global Exception Handler

```python
@app.errorhandler(AppException)
def handle_app_exception(error: AppException):
    """Tüm uygulama exception'larını yakala."""
    
    # Audit log
    AuditService.log_error(error)
    
    # Response
    return error_response(
        message=error.message,
        code=error.code,
        status_code=error.status_code,
        details=error.details
    )
```

---

## 📤 API Response Formatı

### Başarılı Response

```json
{
    "success": true,
    "timestamp": "2024-12-24T10:30:00.000Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "İşlem başarılı",
    "data": {
        "user": {
            "id": 1,
            "email": "user@example.com",
            "full_name": "John Doe"
        }
    },
    "meta": {
        "version": "1.0.0"
    }
}
```

### Hata Response

```json
{
    "success": false,
    "timestamp": "2024-12-24T10:30:00.000Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Doğrulama hatası",
        "details": {
            "field": "email"
        },
        "errors": [
            {
                "field": "email",
                "message": "Geçerli bir e-posta adresi giriniz"
            },
            {
                "field": "password",
                "message": "Şifre en az 8 karakter olmalıdır"
            }
        ]
    }
}
```

### Sayfalanmış Response

```json
{
    "success": true,
    "timestamp": "2024-12-24T10:30:00.000Z",
    "data": [
        {"id": 1, "title": "Kurs 1"},
        {"id": 2, "title": "Kurs 2"}
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total": 150,
        "total_pages": 8,
        "has_next": true,
        "has_prev": false,
        "next_page": 2,
        "prev_page": null
    }
}
```

---

## 🗄️ Veritabanı Standartları

### Zorunlu Alanlar (Her Tabloda)

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | INTEGER | Primary key, auto-increment |
| `created_at` | TIMESTAMP | Oluşturulma zamanı (UTC) |
| `updated_at` | TIMESTAMP | Son güncelleme (UTC) |

### Opsiyonel Standart Alanlar

| Alan | Tip | Kullanım |
|------|-----|----------|
| `is_deleted` | BOOLEAN | Soft delete flag |
| `deleted_at` | TIMESTAMP | Silme zamanı |
| `version` | INTEGER | Optimistic locking |
| `created_by_id` | INTEGER FK | Oluşturan kullanıcı |
| `updated_by_id` | INTEGER FK | Güncelleyen kullanıcı |

### Index Stratejisi

```sql
-- Primary key (otomatik)
CREATE INDEX ix_users_id ON users(id);

-- Foreign key'ler
CREATE INDEX ix_enrollments_user_id ON enrollments(user_id);
CREATE INDEX ix_enrollments_course_id ON enrollments(course_id);

-- Sık sorgulanan alanlar
CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_is_active ON users(is_active);

-- Composite index (sık birlikte sorgulanan)
CREATE INDEX ix_enrollments_user_course ON enrollments(user_id, course_id);

-- Partial index (filtrelenmiş)
CREATE INDEX ix_users_active ON users(id) WHERE is_deleted = false;
```

---

## 🎨 Frontend Standartları

### Kurumsal ve Elegant Tasarım Prensipleri

#### Renk Paleti

```css
:root {
    /* Primary */
    --primary-50: #eff6ff;
    --primary-100: #dbeafe;
    --primary-500: #3b82f6;
    --primary-600: #2563eb;
    --primary-700: #1d4ed8;
    
    /* Neutral */
    --gray-50: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-500: #6b7280;
    --gray-900: #111827;
    
    /* Semantic */
    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
    --info: #3b82f6;
}
```

#### Tipografi

```css
/* Heading hierarchy */
.h1 { font-size: 2.25rem; font-weight: 700; line-height: 1.2; }
.h2 { font-size: 1.875rem; font-weight: 600; line-height: 1.25; }
.h3 { font-size: 1.5rem; font-weight: 600; line-height: 1.3; }
.h4 { font-size: 1.25rem; font-weight: 500; line-height: 1.4; }

/* Body text */
.body-lg { font-size: 1.125rem; line-height: 1.75; }
.body-md { font-size: 1rem; line-height: 1.6; }
.body-sm { font-size: 0.875rem; line-height: 1.5; }
```

#### Spacing System (8px grid)

```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
```

#### Component Standards

```
┌─────────────────────────────────────────────────────────────┐
│  CARD COMPONENT                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Border-radius: 12px                                │   │
│  │  Shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)         │   │
│  │  Padding: 24px                                      │   │
│  │  Background: white                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  BUTTON VARIANTS                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Primary  │ │Secondary │ │ Outline  │ │  Ghost   │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  INPUT FIELDS                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Label                                              │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ Placeholder text                            │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │  Helper text or error message                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Checklist: Yeni Modül Oluşturma

Yeni bir modül oluştururken aşağıdaki kontrol listesini takip edin:

### 1. Model Layer
- [ ] BaseModel'den inherit
- [ ] TimestampMixin kullanıldı
- [ ] SoftDeleteMixin kullanıldı (uygun ise)
- [ ] VersionedMixin kullanıldı (uygun ise)
- [ ] `__tablename__` tanımlandı
- [ ] `__table_args__` ile extend_existing eklendi
- [ ] Index'ler tanımlandı
- [ ] Relationship'ler tanımlandı
- [ ] `to_dict()` override edildi

### 2. Service Layer
- [ ] BaseService'den inherit
- [ ] Audit log dekoratörleri eklendi
- [ ] Transaction management
- [ ] Exception handling
- [ ] Input validation

### 3. Route Layer
- [ ] Blueprint oluşturuldu
- [ ] RESTful endpoint'ler
- [ ] Role/Permission dekoratörleri
- [ ] Request validation
- [ ] Standart response format

### 4. Schema Layer
- [ ] Request schema'ları
- [ ] Response schema'ları
- [ ] Validation kuralları
- [ ] Sensitive field'lar exclude

### 5. Testing
- [ ] Unit testler
- [ ] Integration testler
- [ ] Authorization testler

---

## 🔗 İlgili Dokümanlar

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Proje klasör yapısı
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Sistem mimarisi
- [SCALING.md](./SCALING.md) - Ölçeklendirme stratejileri

---

> **Not**: Bu standartlar canlı bir dokümandır ve proje gereksinimleri doğrultusunda güncellenebilir. Değişiklikler için PR açılmalı ve en az 2 senior developer onayı alınmalıdır.
