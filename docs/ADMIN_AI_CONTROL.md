# Admin & Süper Admin Paneli - AI Kontrol Sistemi

## 📋 Genel Bakış

Bu belge Admin ve Süper Admin panelindeki AI kontrol fonksiyonlarını açıklar.

---

## 🔐 Yetki Farklılıkları

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         YETKİ MATRİSİ                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FONKSİYON                           │  ADMIN  │  SUPER ADMIN              │
│  ────────────────────────────────────┼─────────┼───────────────            │
│  AI Durumunu Görüntüleme             │   ✅    │     ✅                    │
│  AI Kullanım İstatistikleri          │   ✅    │     ✅                    │
│  AI İhlal Raporları                  │   ✅    │     ✅                    │
│  Kullanıcı AI Kotası Görüntüleme     │   ✅    │     ✅                    │
│  Kullanıcı AI Kotası Sıfırlama       │   ✅    │     ✅                    │
│  Kullanıcı AI Engelleme              │   ✅    │     ✅                    │
│  Prompt Template Görüntüleme (kısıtlı)│  ✅    │     ✅                    │
│  ────────────────────────────────────┼─────────┼───────────────            │
│  AI Global Açma/Kapama               │   ❌    │     ✅                    │
│  AI KILL SWITCH                      │   ❌    │     ✅                    │
│  AI Limitlerini Değiştirme           │   ❌    │     ✅                    │
│  Prompt Template Düzenleme           │   ❌    │     ✅                    │
│  Prompt Template Rollback            │   ❌    │     ✅                    │
│  AI Özellik Aç/Kapat                 │   ❌    │     ✅                    │
│  AI Provider/Model Değiştirme        │   ❌    │     ✅                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚨 AI Kill Switch

Kill Switch, AI sistemini **ANINDA** devre dışı bırakan acil durum mekanizmasıdır.

### Kullanım Senaryoları

1. **Güvenlik İhlali**: Prompt injection, veri sızıntısı
2. **Maliyet Aşımı**: Beklenmeyen yüksek kullanım
3. **Hatalı Davranış**: AI uygunsuz yanıtlar veriyor
4. **Yasal Zorunluluk**: Regülatör talebi

### Kill Switch Özellikleri

```i
┌──────────────────────────────────────────────────────────────────┐
│                     KILL SWITCH ÖZELLİKLERİ                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✓ Anında etki - Tüm AI servisleri durur                        │
│  ✓ Zorunlu neden - Min 10 karakter açıklama                     │
│  ✓ Opsiyonel süre - X saat sonra otomatik açılabilir            │
│  ✓ Kritik loglama - Tüm işlemler loglanır                       │
│  ✓ Sadece Super Admin - Admin kullanamaz                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### API Kullanımı

```bash
# Kill Switch Aktif Et
POST /api/v1/admin/ai/kill-switch
{
    "reason": "Beklenmeyen yüksek maliyet - araştırılıyor",
    "duration_hours": 24  # Opsiyonel: 24 saat sonra otomatik açılır
}

# Kill Switch Kapat
DELETE /api/v1/admin/ai/kill-switch
{
    "reason": "Sorun çözüldü"
}
```

---

## ⚙️ AI Limit Yönetimi

### Limit Tipleri

| Tip | Açıklama |
|-----|----------|
| `global` | Sistem geneli limitler |
| `student` | Öğrenci rol limitleri |
| `teacher` | Öğretmen rol limitleri |

### Limit Parametreleri

**Global:**
- `daily_limit`: Günlük toplam AI istek limiti
- `monthly_limit`: Aylık toplam AI istek limiti
- `max_tokens_per_request`: İstek başına maksimum token

**Rol Bazlı:**
- `daily_tokens`: Günlük token limiti
- `monthly_tokens`: Aylık token limiti

### API Kullanımı

```bash
# Limitleri Görüntüle
GET /api/v1/admin/ai/limits

# Öğrenci Limitlerini Güncelle (Super Admin)
PUT /api/v1/admin/ai/limits/student
{
    "daily_tokens": 2000,
    "monthly_tokens": 40000
}
```

---

## 📝 Prompt Template Yönetimi

### Versiyon Kontrolü

- Her güncelleme otomatik versiyon oluşturur
- Son 10 versiyon saklanır
- Herhangi bir versiyona rollback yapılabilir

### API Kullanımı

```bash
# Template Listesi
GET /api/v1/admin/ai/templates

# Template Detayı
GET /api/v1/admin/ai/templates/question_hint

# Template Güncelle (Super Admin)
PUT /api/v1/admin/ai/templates/question_hint
{
    "content": "Yeni prompt içeriği...",
    "description": "Güncelleme açıklaması"
}

# Önceki Versiyona Dön (Super Admin)
POST /api/v1/admin/ai/templates/question_hint/rollback
{
    "version_index": 2
}
```

---

## 🔧 AI Özellik Yönetimi

Her AI özelliği ayrı ayrı açılıp kapatılabilir.

### Mevcut Özellikler

| Özellik | Açıklama |
|---------|----------|
| `question_hint` | Soru ipucu |
| `topic_explanation` | Konu açıklama |
| `study_plan` | Çalışma planı |
| `answer_evaluation` | Cevap değerlendirme |
| `performance_analysis` | Performans analizi |
| `question_generation` | Soru üretme |
| `content_enhancement` | İçerik geliştirme |
| `class_performance` | Sınıf performansı |
| `video_qa` | Video soru-cevap |
| `session_review` | Ders sonrası tekrar |

### API Kullanımı

```bash
# Özellikleri Listele
GET /api/v1/admin/ai/features

# Özellik Aç/Kapat (Super Admin)
PUT /api/v1/admin/ai/features/video_qa
{
    "enabled": false
}
```

---

## 👤 Kullanıcı AI Yönetimi

### Kota İşlemleri

```bash
# Kullanıcı Kotasını Görüntüle
GET /api/v1/admin/ai/users/123/quota

# Kotayı Sıfırla
POST /api/v1/admin/ai/users/123/quota/reset
{
    "reset_type": "daily"  # daily, monthly, all
}
```

### Engelleme İşlemleri

```bash
# Kullanıcı AI Erişimini Engelle
POST /api/v1/admin/ai/users/123/block
{
    "reason": "Uygunsuz kullanım tespit edildi",
    "duration_hours": 72  # 72 saat sonra otomatik açılır
}

# Engeli Kaldır
DELETE /api/v1/admin/ai/users/123/block
```

---

## 📊 İstatistikler ve Raporlar

### Kullanım İstatistikleri

```bash
GET /api/v1/admin/ai/stats?days=30

# Response
{
    "stats": {
        "period_days": 30,
        "total": {
            "requests": 15420,
            "tokens": 4523000,
            "avg_processing_time_ms": 245.5,
            "active_users": 342
        },
        "daily": [...],
        "by_feature": [...]
    }
}
```

### İhlal Raporları

```bash
GET /api/v1/admin/ai/violations?page=1&per_page=20

# Response
{
    "violations": [
        {
            "user_id": 123,
            "violation_type": "content_filter",
            "description": "Yasaklı içerik tespit edildi",
            "created_at": "2025-12-27T10:30:00Z"
        }
    ],
    "pagination": {...}
}
```

---

## 🔄 Entegrasyon

### Diğer Servislerde AI Durumu Kontrolü

```python
from app.modules.admin.ai_control_service import is_ai_operational

# AI çağrısından önce kontrol
operational, reason = is_ai_operational()
if not operational:
    raise ServiceUnavailableError(f'AI sistemi kullanılamıyor: {reason}')

# AI çağrısını yap
result = ai_service.call_ai(...)
```

---

## 📁 API Endpoint Özeti

### Admin & Super Admin Erişebilir

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/admin/ai/status` | AI durumu |
| GET | `/admin/ai/limits` | AI limitleri |
| GET | `/admin/ai/users/{id}/quota` | Kullanıcı kotası |
| POST | `/admin/ai/users/{id}/quota/reset` | Kota sıfırla |
| POST | `/admin/ai/users/{id}/block` | Kullanıcı engelle |
| DELETE | `/admin/ai/users/{id}/block` | Engeli kaldır |
| GET | `/admin/ai/templates` | Template listesi |
| GET | `/admin/ai/templates/{name}` | Template detayı |
| GET | `/admin/ai/features` | Özellik durumları |
| GET | `/admin/ai/stats` | Kullanım istatistikleri |
| GET | `/admin/ai/violations` | İhlal raporları |

### Sadece Super Admin

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/admin/ai/enable` | AI aç/kapat |
| POST | `/admin/ai/kill-switch` | Kill switch aktif |
| DELETE | `/admin/ai/kill-switch` | Kill switch kapat |
| PUT | `/admin/ai/limits/{type}` | Limit güncelle |
| PUT | `/admin/ai/templates/{name}` | Template güncelle |
| POST | `/admin/ai/templates/{name}/rollback` | Template rollback |
| PUT | `/admin/ai/features/{name}` | Özellik aç/kapat |

---

## 🔒 Güvenlik Notları

1. **Kill Switch Loglanır**: Her aktivasyon/deaktivasyon kalıcı olarak loglanır
2. **Neden Zorunlu**: Kill switch için minimum 10 karakter açıklama gerekir
3. **Yetki Kontrolü**: Her endpoint JWT token ve rol kontrolü yapar
4. **Audit Trail**: Tüm admin işlemleri `AdminActionLog` tablosuna yazılır

---

*Bu belge Admin & Süper Admin AI Kontrol Sistemi'ni tanımlar.*
*Son güncelleme: Aralık 2025*
