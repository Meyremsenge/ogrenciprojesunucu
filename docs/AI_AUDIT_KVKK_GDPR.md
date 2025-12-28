# AI Audit & Log Sistemi - KVKK/GDPR Uyumluluk Rehberi

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [KVKK Uyumluluk](#kvkk-uyumluluk)
3. [GDPR Uyumluluk](#gdpr-uyumluluk)
4. [Veri Saklama Politikası](#veri-saklama-politikası)
5. [Anonimleştirme Yöntemleri](#anonimleştirme-yöntemleri)
6. [API Referansı](#api-referansı)
7. [Celery Tasks](#celery-tasks)
8. [Güvenlik Önlemleri](#güvenlik-önlemleri)

---

## Genel Bakış

Bu modül, AI kullanım loglarını **KVKK (Kişisel Verilerin Korunması Kanunu)** ve **GDPR (General Data Protection Regulation)** standartlarına uygun şekilde yönetir.

### Temel Prensipler

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI LOG STRATEJİSİ                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ✅ KAYIT EDİLEN                    ❌ KAYIT EDİLMEYEN              │
│  ─────────────────                  ─────────────────               │
│  • Feature adı                      • Kullanıcı soruları            │
│  • Token sayısı                     • AI yanıtları                  │
│  • İşlem süresi (ms)                • Tam IP adresi                 │
│  • Başarı/hata durumu               • Dakika/saniye zaman           │
│  • Maskelenmiş IP                   • Kişisel bilgiler              │
│  • Yuvarlanmış zaman                • Konum verileri                │
│  • Hash'lenmiş user ID                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## KVKK Uyumluluk

### Madde 4 - Veri İşleme İlkeleri

| İlke | Uygulama |
|------|----------|
| Hukuka uygunluk | Sadece meşru amaçlar için loglama |
| Doğruluk | Otomatik ve tutarlı kayıt |
| Amaçla sınırlılık | Sadece analiz için kullanım |
| Ölçülülük | Minimum veri (prompt/yanıt yok) |
| Saklama süresi | Otomatik retention policy |

### Madde 7 - Kişisel Verilerin Silinmesi

```python
# Unutulma hakkı endpoint'i
DELETE /api/v1/logs/ai/user/{user_id}/delete

# Body:
{
    "reason": "Kullanıcı talebi - KVKK başvurusu"
}

# Response:
{
    "logs_deleted": 150,
    "quota_deleted": true,
    "violations_deleted": 2,
    "gdpr_compliant": true,
    "kvkk_compliant": true
}
```

### Madde 11 - İlgili Kişinin Hakları

```python
# Veri taşınabilirliği endpoint'i
GET /api/v1/logs/ai/user/{user_id}/export

# Response: Kullanıcının tüm AI meta-verileri (JSON)
```

### Madde 12 - Veri Güvenliği

- Sadece Admin/Super Admin erişebilir
- IP adresleri maskelenir
- User ID'ler hash'lenir
- TLS şifreleme zorunlu

---

## GDPR Uyumluluk

### Article 5 - Data Processing Principles

| Principle | Implementation |
|-----------|---------------|
| Lawfulness | Consent-based AI usage |
| Purpose limitation | Analytics only |
| Data minimization | No PII stored |
| Accuracy | Automated logging |
| Storage limitation | 30/90/365 day retention |
| Integrity | Encrypted transmission |

### Article 17 - Right to Erasure

```
┌─────────────────────────────────────────────────────────┐
│              UNUTULMA HAKKI AKIŞI                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Kullanıcı talep eder                                │
│         ↓                                               │
│  2. Super Admin onaylar                                 │
│         ↓                                               │
│  3. delete_user_ai_data() çağrılır                      │
│         ↓                                               │
│  4. Tüm AI logları silinir:                             │
│     • AIUsageLog kayıtları                              │
│     • AIQuota kayıtları                                 │
│     • AIViolation kayıtları                             │
│         ↓                                               │
│  5. Silme işlemi loglanır (anonim)                      │
│         ↓                                               │
│  6. Onay e-postası gönderilir                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Article 20 - Right to Data Portability

Export formatı:
```json
{
    "export_type": "ai_user_data",
    "user_id": 123,
    "usage_logs": [
        {
            "date": "2024-01-15T10:00:00",
            "feature": "question_hint",
            "tokens_used": 150,
            "processing_time_ms": 1200
        }
    ],
    "quota": { "daily_limit": 100, "monthly_limit": 2000 },
    "violations": [],
    "notice": {
        "tr": "Prompt ve AI yanıt içerikleri gizlilik politikası gereği kaydedilmemektedir."
    }
}
```

### Article 25 - Data Protection by Design

```
ANONİMLEŞTİRME KATMANLARI
═════════════════════════

Layer 1: User ID Hashing
    12345 → anon_a3f2b1c9d4e5f678

Layer 2: IP Masking
    192.168.1.100 → 192.168.x.x
    2001:0db8:85a3::8a2e → 2001:0db8:x:x

Layer 3: Time Truncation
    2024-01-15 14:35:22 → 2024-01-15 14:00:00

Layer 4: Content Exclusion
    Prompt → [NOT STORED]
    Response → [NOT STORED]
```

---

## Veri Saklama Politikası

### Retention Periods

| Veri Tipi | Saklama Süresi | Silme Yöntemi |
|-----------|----------------|---------------|
| Normal AI logları | 30 gün | Otomatik (celery) |
| Hata logları | 90 gün | Otomatik (celery) |
| Çözülmüş ihlaller | 365 gün | Otomatik (celery) |
| Aggregate istatistikler | Süresiz | Anonim |

### Otomatik Temizleme

```python
# Celery task (günlük 03:00)
@shared_task
def cleanup_ai_logs_kvkk_gdpr():
    """
    - 30 günden eski normal logları siler
    - 90 günden eski hata loglarını siler
    - 1 yıldan eski çözülmüş ihlalleri siler
    """
```

### Manuel Temizleme

```bash
# Super Admin endpoint
POST /api/v1/logs/ai/retention/apply
Authorization: Bearer {super_admin_token}
```

---

## Anonimleştirme Yöntemleri

### 1. User ID Hash

```python
def anonymize_user_id(user_id, include_date=True):
    """
    SHA-256 hash ile geri döndürülemez anonimleştirme.
    
    Günlük hash (include_date=True):
        - Her gün farklı hash
        - Cross-day tracking engellenir
    
    Sabit hash (include_date=False):
        - Trend analizi için
        - Hala geri döndürülemez
    """
    secret = get_hash_secret()
    
    if include_date:
        data = f"{secret}:{user_id}:{date.today()}"
    else:
        data = f"{secret}:{user_id}"
    
    return f"anon_{sha256(data)[:16]}"

# Örnek:
# 12345 → anon_a3f2b1c9d4e5f678
```

### 2. IP Adresi Maskeleme

```python
def mask_ip_address(ip):
    """
    IPv4: 192.168.1.100 → 192.168.x.x
    IPv6: 2001:0db8:85a3::8a2e → 2001:0db8:x:x
    
    Son iki oktet gizlenir.
    Subnet bilgisi korunur (abuse detection için).
    """
```

### 3. Zaman Yuvarlama

```python
def truncate_timestamp(dt, level='hour'):
    """
    hour: 2024-01-15 14:35:22 → 2024-01-15 14:00:00
    day:  2024-01-15 14:35:22 → 2024-01-15 00:00:00
    week: 2024-01-15 14:35:22 → 2024-01-13 00:00:00 (Pazartesi)
    """
```

---

## API Referansı

### AI Kullanım Raporu (Anonim)

```http
GET /api/v1/logs/ai/usage?days=30&privacy_level=anonymous
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
    "report_type": "ai_usage",
    "kvkk_compliant": true,
    "gdpr_compliant": true,
    "personal_data_included": false,
    
    "summary": {
        "total_requests": 15420,
        "total_tokens": 2500000,
        "avg_processing_time_ms": 850,
        "unique_users": 234
    },
    
    "by_feature": [
        {"feature": "question_hint", "requests": 5000, "tokens": 800000},
        {"feature": "topic_explanation", "requests": 3500, "tokens": 700000}
    ],
    
    "daily_trend": [
        {"date": "2024-01-15", "requests": 520, "unique_users": 45}
    ]
}
```

### AI Erişim Raporu

```http
GET /api/v1/logs/ai/access?days=30&include_user_details=false
Authorization: Bearer {admin_token}
```

**Response (anonim):**
```json
{
    "access_records": [
        {
            "anonymous_id": "anon_a3f2b1c9",
            "request_count": 150,
            "total_tokens": 25000,
            "first_access": "2024-01-01T10:00:00",
            "last_access": "2024-01-15T14:00:00"
        }
    ]
}
```

**Response (super admin - include_user_details=true):**
```json
{
    "personal_data_included": true,
    "access_records": [
        {
            "user_id": 123,
            "user_name": "Ahmet Yılmaz",
            "user_role": "student",
            "request_count": 150
        }
    ]
}
```

### Hata & Timeout Raporu

```http
GET /api/v1/logs/ai/errors?days=7
Authorization: Bearer {admin_token}
```

### Veri Silme (KVKK/GDPR)

```http
DELETE /api/v1/logs/ai/user/123/delete
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
    "reason": "Kullanıcı talebi - KVKK Madde 7 başvurusu"
}
```

### Veri Export (GDPR)

```http
GET /api/v1/logs/ai/user/123/export
Authorization: Bearer {super_admin_token}
```

### Privacy Policy

```http
GET /api/v1/logs/ai/privacy-policy
Authorization: Bearer {admin_token}
```

---

## Celery Tasks

### Günlük Retention Task

```python
# celeryconfig.py
beat_schedule = {
    'cleanup-ai-logs-kvkk-gdpr': {
        'task': 'app.tasks.cleanup_tasks.cleanup_ai_logs_kvkk_gdpr',
        'schedule': crontab(hour=3, minute=0),  # Her gece 03:00
    },
}
```

### Manuel Çalıştırma

```bash
# Terminal
celery -A celery_worker.celery call app.tasks.cleanup_tasks.cleanup_ai_logs_kvkk_gdpr
```

---

## Güvenlik Önlemleri

### Erişim Kontrolü

| Endpoint | Admin | Super Admin |
|----------|:-----:|:-----------:|
| GET /ai/usage | ✅ | ✅ |
| GET /ai/access | ✅ | ✅ |
| GET /ai/errors | ✅ | ✅ |
| GET /ai/access?include_user_details=true | ❌ | ✅ |
| DELETE /ai/user/{id}/delete | ❌ | ✅ |
| GET /ai/user/{id}/export | ❌ | ✅ |
| POST /ai/retention/apply | ❌ | ✅ |

### Audit Trail

Tüm veri silme işlemleri loglanır:

```python
AdminActionLog(
    admin_id=admin_id,
    action_type='gdpr_data_deletion',
    target_type='ai_data',
    target_id=user_id,
    description='KVKK/GDPR veri silme: {reason}',
    new_values={
        'logs_deleted': count,
        'anonymized_user': 'anon_xxx'  # Gerçek user_id değil!
    }
)
```

### Hash Secret

```python
# config/settings.py
AI_AUDIT_SECRET = os.environ.get('AI_AUDIT_SECRET', 'generate-unique-secret')

# Production'da mutlaka değiştirin!
# openssl rand -hex 32
```

---

## Sık Sorulan Sorular

### S: Prompt içerikleri neden kayıt edilmiyor?

**C:** KVKK Madde 4 ve GDPR Article 5 gereği "veri minimizasyonu" prensibi uygulanmaktadır. Prompt içerikleri kişisel veri içerebilir (isim, adres, sağlık bilgisi, vb.). Bu nedenle sadece metadata kaydedilir.

### S: Hash'lenmiş user ID'ler geri döndürülebilir mi?

**C:** Hayır. SHA-256 tek yönlü hash fonksiyonudur ve matematiksel olarak geri döndürülemez. Ayrıca secret key kullanıldığı için rainbow table saldırıları da etkisizdir.

### S: Retention policy nasıl çalışır?

**C:** Celery beat her gece 03:00'te `cleanup_ai_logs_kvkk_gdpr` task'ını çalıştırır. Bu task belirlenen süreleri geçmiş kayıtları otomatik siler.

### S: Bir kullanıcı verilerinin silinmesini talep ettiğinde ne yapılır?

**C:** Super Admin `DELETE /api/v1/logs/ai/user/{id}/delete` endpoint'ini çağırır. Silme nedeni zorunludur ve işlem AdminActionLog'a kaydedilir.

---

## Değişiklik Geçmişi

| Tarih | Sürüm | Açıklama |
|-------|-------|----------|
| 2024-01-15 | 1.0 | İlk sürüm - KVKK/GDPR uyumlu AI audit sistemi |

---

**⚠️ Önemli Not:** Bu dokümantasyon yasal tavsiye niteliğinde değildir. KVKK ve GDPR uyumluluğu için hukuk danışmanınıza başvurun.
