# İçerik Yönetim Sistemi - Content Management System

Bu dokümantasyon, öğrenci sistemi için içerik yönetimi modülünü açıklar.

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [İçerik Durumları (Content Status)](#içerik-durumları)
3. [Admin Onay Workflow](#admin-onay-workflow)
4. [Versiyonlama Sistemi](#versiyonlama-sistemi)
5. [Soft Delete](#soft-delete)
6. [API Endpoint'leri](#api-endpointleri)
7. [Veritabanı Şeması](#veritabanı-şeması)
8. [Kullanım Örnekleri](#kullanım-örnekleri)

---

## Genel Bakış

İçerik yönetim modülü aşağıdaki özellikleri sağlar:

- **Video ve Doküman Yönetimi**: CRUD operasyonları
- **Admin Onay Workflow**: İçeriklerin yayınlanmadan önce admin tarafından onaylanması
- **Versiyonlama**: Her değişikliğin kaydı ve geri yükleme imkanı
- **Soft Delete**: Kalıcı silme yerine geri alınabilir silme
- **Yetkilendirme**: Role-based access control

### Desteklenen İçerik Türleri

| Tür | Açıklama | Model |
|-----|----------|-------|
| Video | YouTube, Vimeo, Local, Bunny video içerikleri | `Video` |
| Document | PDF, DOC, SLIDE, SPREADSHEET dosyaları | `Document` |

---

## İçerik Durumları

İçerikler aşağıdaki durumlardan birinde olabilir:

```
┌─────────┐    submit     ┌────────────────┐
│  DRAFT  │──────────────▶│ PENDING_REVIEW │
└─────────┘               └────────────────┘
     ▲                           │
     │                    ┌──────┴──────┐
     │                    ▼             ▼
     │              ┌──────────┐  ┌──────────┐
     │              │ APPROVED │  │ REJECTED │
     │              └──────────┘  └──────────┘
     │                    │             │
     │                    ▼             │
     │              ┌───────────┐       │
     │              │ PUBLISHED │       │
     │              └───────────┘       │
     │                    │             │
     └────────────────────┴─────────────┘
                          │
                          ▼
                    ┌───────────┐
                    │ ARCHIVED  │
                    └───────────┘
```

### Durum Açıklamaları

| Durum | Açıklama | Kim Görebilir |
|-------|----------|---------------|
| `draft` | Taslak, sadece sahibi görebilir | Sahip, Admin |
| `pending_review` | Onay bekliyor | Sahip, Admin |
| `approved` | Onaylandı, yayınlanabilir | Sahip, Admin |
| `rejected` | Reddedildi, düzenleme gerekiyor | Sahip, Admin |
| `published` | Yayında, herkes görebilir | Tüm Kullanıcılar |
| `archived` | Arşivlendi | Sadece Admin |

---

## Admin Onay Workflow

### İçerik Oluşturma Akışı

```python
# 1. İçerik oluşturulur (DRAFT durumunda)
POST /api/v1/contents/topics/{topic_id}/videos
{
    "title": "Python Temelleri",
    "video_url": "https://youtube.com/watch?v=xyz",
    "description": "Python programlama dili temelleri"
}

# 2. İçerik onaya gönderilir
POST /api/v1/contents/videos/{video_id}/submit

# 3. Admin onaylar veya reddeder
POST /api/v1/contents/videos/{video_id}/approve
{
    "notes": "İçerik uygun",
    "auto_publish": true
}

# VEYA

POST /api/v1/contents/videos/{video_id}/reject
{
    "reason": "low_quality",
    "details": "Video kalitesi yetersiz, lütfen daha yüksek çözünürlükte yükleyin"
}

# 4. Onaylanan içerik yayınlanır (auto_publish=false ise manuel)
POST /api/v1/contents/videos/{video_id}/publish
```

### Ret Nedenleri

```python
class RejectionReason(enum.Enum):
    INAPPROPRIATE_CONTENT = 'inappropriate_content'  # Uygunsuz içerik
    LOW_QUALITY = 'low_quality'                      # Düşük kalite
    DUPLICATE = 'duplicate'                          # Tekrarlayan içerik
    COPYRIGHT_VIOLATION = 'copyright_violation'       # Telif hakkı ihlali
    INCOMPLETE = 'incomplete'                         # Tamamlanmamış
    TECHNICAL_ISSUE = 'technical_issue'              # Teknik sorun
    OTHER = 'other'                                  # Diğer
```

---

## Versiyonlama Sistemi

Her içerik değişikliği otomatik olarak yeni bir versiyon oluşturur.

### Versiyon Yapısı

```python
class ContentVersion:
    id: int
    content_category: ContentCategory  # VIDEO, DOCUMENT
    content_id: int
    version_number: int               # 1, 2, 3, ...
    version_label: str                # "v1.0", "Major Update"
    changed_by_id: int
    change_summary: str               # "Başlık güncellendi"
    content_snapshot: dict            # JSON - içeriğin tam hali
    changes_diff: dict                # JSON - önceki versiyondan farklar
    is_current: bool                  # Mevcut versiyon mu?
    is_published_version: bool        # Yayınlanan versiyon mu?
```

### Versiyon İşlemleri

```python
# Versiyonları listele
GET /api/v1/contents/videos/{video_id}/versions

# Versiyon detayı
GET /api/v1/contents/versions/{version_id}

# Eski versiyonu geri yükle
POST /api/v1/contents/videos/{video_id}/versions/{version_id}/restore

# İki versiyonu karşılaştır
POST /api/v1/contents/admin/versions/compare
{
    "version_id_1": 1,
    "version_id_2": 3
}
```

### Diff Formatı

```json
{
    "version_1": {
        "version_number": 1,
        "changed_by": "Ali Veli",
        "created_at": "2024-01-10T10:00:00"
    },
    "version_2": {
        "version_number": 3,
        "changed_by": "Mehmet Yılmaz",
        "created_at": "2024-01-15T14:30:00"
    },
    "diff": {
        "added": {},
        "removed": {},
        "changed": {
            "title": {
                "old": "Python Temelleri",
                "new": "Python 3 Temelleri"
            },
            "description": {
                "old": "Python öğrenin",
                "new": "Python 3.11 ile programlama öğrenin"
            }
        }
    }
}
```

---

## Soft Delete

İçerikler kalıcı olarak silinmez, `is_deleted` flag'i ile işaretlenir.

### Soft Delete Avantajları

1. **Veri Kurtarma**: Yanlışlıkla silinen içerikler geri alınabilir
2. **Audit Trail**: Silme işlemlerinin kaydı tutulur
3. **KVKK/GDPR Uyumu**: Yasal süreç için veriler saklanabilir
4. **Referans Bütünlüğü**: Foreign key ilişkileri bozulmaz

### Soft Delete İşlemleri

```python
# Silme (soft delete)
DELETE /api/v1/contents/videos/{video_id}

# Geri yükleme (sadece admin)
POST /api/v1/contents/videos/{video_id}/restore
```

### Model Yapısı

```python
class SoftDeleteMixin:
    is_deleted: bool = False
    deleted_at: datetime = None
    deleted_by_id: int = None
    
    def soft_delete(self, deleted_by: int = None):
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        self.deleted_by_id = deleted_by
    
    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by_id = None
```

---

## API Endpoint'leri

### Video Endpoint'leri

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/videos` | Video listesi | Tüm kullanıcılar |
| GET | `/videos/my` | Kullanıcının videoları | Authenticated |
| GET | `/videos/{id}` | Video detayı | Tüm kullanıcılar |
| POST | `/topics/{topic_id}/videos` | Video oluştur | Teacher, Admin |
| PUT | `/videos/{id}` | Video güncelle | Sahip, Admin |
| DELETE | `/videos/{id}` | Video sil | Sahip, Admin |
| POST | `/videos/{id}/restore` | Geri yükle | Admin |

### Video Onay Endpoint'leri

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| POST | `/videos/{id}/submit` | Onaya gönder | Sahip |
| POST | `/videos/{id}/approve` | Onayla | Admin |
| POST | `/videos/{id}/reject` | Reddet | Admin |
| POST | `/videos/{id}/publish` | Yayınla | Admin |
| POST | `/videos/{id}/archive` | Arşivle | Admin |

### Video Versiyon Endpoint'leri

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/videos/{id}/versions` | Versiyonları listele | Sahip, Admin |
| POST | `/videos/{id}/versions/{v_id}/restore` | Versiyon geri yükle | Sahip, Admin |

### Doküman Endpoint'leri

Aynı yapı `/documents` prefix'i ile kullanılır.

### Admin Endpoint'leri

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/admin/pending-reviews` | Onay bekleyenler | Admin |
| POST | `/admin/versions/compare` | Versiyon karşılaştır | Admin |

---

## Veritabanı Şeması

### content_versions

```sql
CREATE TABLE content_versions (
    id SERIAL PRIMARY KEY,
    content_category content_category_enum NOT NULL,
    content_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    version_label VARCHAR(100),
    changed_by_id INTEGER NOT NULL REFERENCES users(id),
    change_summary VARCHAR(500),
    previous_version_id INTEGER REFERENCES content_versions(id),
    content_snapshot JSONB NOT NULL,
    changes_diff JSONB,
    is_current BOOLEAN DEFAULT TRUE,
    is_published_version BOOLEAN DEFAULT FALSE,
    restored_from_version_id INTEGER REFERENCES content_versions(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(content_category, content_id, version_number)
);

-- Indexes
CREATE INDEX ix_content_versions_content ON content_versions(content_category, content_id);
CREATE INDEX ix_content_versions_current ON content_versions(content_category, content_id, is_current);
```

### content_approvals

```sql
CREATE TABLE content_approvals (
    id SERIAL PRIMARY KEY,
    content_category content_category_enum NOT NULL,
    content_id INTEGER NOT NULL,
    previous_status content_status_enum NOT NULL,
    new_status content_status_enum NOT NULL,
    reviewed_by_id INTEGER NOT NULL REFERENCES users(id),
    reviewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    rejection_reason rejection_reason_enum,
    rejection_details TEXT,
    reviewer_notes TEXT,
    version_id INTEGER REFERENCES content_versions(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX ix_content_approvals_content ON content_approvals(content_category, content_id);
CREATE INDEX ix_content_approvals_reviewed_at ON content_approvals(reviewed_at);
```

### videos (eklenen kolonlar)

```sql
ALTER TABLE videos ADD COLUMN content_status content_status_enum NOT NULL DEFAULT 'draft';
ALTER TABLE videos ADD COLUMN current_version INTEGER DEFAULT 1;
ALTER TABLE videos ADD COLUMN submitted_for_review_at TIMESTAMP;
ALTER TABLE videos ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE videos ADD COLUMN approved_by_id INTEGER REFERENCES users(id);
ALTER TABLE videos ADD COLUMN published_at TIMESTAMP;
ALTER TABLE videos ADD COLUMN tags JSONB DEFAULT '[]';
ALTER TABLE videos ADD COLUMN metadata JSONB DEFAULT '{}';
```

---

## Kullanım Örnekleri

### 1. Öğretmen: Video Oluşturma ve Onaya Gönderme

```python
# Video oluştur (taslak)
response = client.post('/api/v1/contents/topics/1/videos', json={
    'title': 'Python ile Web Geliştirme',
    'video_url': 'https://youtube.com/watch?v=abc123',
    'description': 'Flask ve Django ile web uygulamaları',
    'tags': ['python', 'web', 'flask']
})
video_id = response.json()['data']['video']['id']

# Onaya gönder
client.post(f'/api/v1/contents/videos/{video_id}/submit')
```

### 2. Admin: Onay Bekleyenleri Görüntüleme

```python
# Tüm onay bekleyenler
response = client.get('/api/v1/contents/admin/pending-reviews')

# Sadece videolar
response = client.get('/api/v1/contents/admin/pending-reviews?content_type=video')

print(response.json())
# {
#     "videos": [...],
#     "documents": [...],
#     "total": 5
# }
```

### 3. Admin: İçerik Onaylama

```python
# Onayla ve otomatik yayınla
client.post(f'/api/v1/contents/videos/{video_id}/approve', json={
    'notes': 'Kaliteli içerik, onaylandı',
    'auto_publish': True
})

# Veya sadece onayla (manuel yayın gerekir)
client.post(f'/api/v1/contents/videos/{video_id}/approve', json={
    'notes': 'İçerik uygun'
})
# Sonra manuel yayınla
client.post(f'/api/v1/contents/videos/{video_id}/publish')
```

### 4. Admin: İçerik Reddetme

```python
client.post(f'/api/v1/contents/videos/{video_id}/reject', json={
    'reason': 'low_quality',
    'details': 'Video çözünürlüğü çok düşük. Lütfen en az 720p kalitede yükleyin.'
})
```

### 5. Versiyon Geçmişini Görüntüleme

```python
response = client.get(f'/api/v1/contents/videos/{video_id}/versions')
versions = response.json()['data']['items']

for v in versions:
    print(f"v{v['version_number']}: {v['change_summary']} - {v['changed_by_name']}")
```

### 6. Eski Versiyonu Geri Yükleme

```python
# Versiyon 2'ye geri dön
client.post(f'/api/v1/contents/videos/{video_id}/versions/2/restore')
# Bu işlem yeni bir versiyon (v4) oluşturur, v2'nin içeriğiyle
```

### 7. Silinmiş İçeriği Geri Yükleme

```python
# Admin olarak silinen videoyu geri yükle
client.post(f'/api/v1/contents/videos/{video_id}/restore')
# Video DRAFT durumunda geri döner
```

---

## Best Practices

### 1. İçerik Oluşturma

- Her zaman anlamlı başlıklar kullanın
- Açıklama alanını doldurun
- Uygun etiketler ekleyin
- Video için thumbnail belirtin

### 2. Versiyon Yönetimi

- Güncelleme yaparken `change_summary` belirtin
- Büyük değişikliklerde `version_label` kullanın
- Geri yükleme öncesi versiyonları karşılaştırın

### 3. Onay Süreci

- Reddetme nedenini detaylı açıklayın
- `auto_publish` kullanırken dikkatli olun
- Onay notlarını kaydedin

### 4. Performans

- `include_drafts=true` sadece gerektiğinde kullanın
- Pagination kullanın
- İndekslenmiş kolonlarda filtreleyin

---

## Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 400 | Geçersiz istek (validation hatası) |
| 403 | Yetki hatası (bu işlemi yapamazsınız) |
| 404 | İçerik bulunamadı |
| 409 | Durum konflikti (bu durumda bu işlem yapılamaz) |

---

## Sonuç

Bu içerik yönetim sistemi:

- ✅ **Güvenli**: Role-based erişim kontrolü
- ✅ **İzlenebilir**: Tam audit trail ve versiyon geçmişi
- ✅ **Esnek**: Farklı içerik türlerini destekler
- ✅ **Geri Alınabilir**: Soft delete ve versiyon restore
- ✅ **Ölçeklenebilir**: Verimli indeksleme ve pagination
