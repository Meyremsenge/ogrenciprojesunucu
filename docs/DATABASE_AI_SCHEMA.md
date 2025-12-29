# AI Veritabanı Şeması Tasarımı

Bu doküman, AI chat desteği için PostgreSQL veritabanı şemasını detaylandırır.

## 📊 Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    AI DATABASE SCHEMA                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐       ┌─────────────────────┐       ┌──────────────────────┐
│     users       │       │   ai_chat_sessions  │       │   ai_chat_messages   │
├─────────────────┤       ├─────────────────────┤       ├──────────────────────┤
│ id (PK)         │──┐    │ id (PK)             │──┐    │ id (PK)              │
│ email           │  │    │ session_id (UUID)   │  │    │ session_id (FK)──────┼───┐
│ first_name      │  └───▶│ user_id (FK)────────┼──┘    │ role                 │   │
│ last_name       │       │ title               │       │ content              │   │
│ role            │       │ context_type        │       │ tokens_used          │   │
└─────────────────┘       │ status              │       │ feedback_rating      │   │
                          │ message_count       │       │ is_anonymized        │   │
                          │ total_tokens_used   │       │ created_at           │   │
                          │ is_anonymized       │       └──────────────────────┘   │
                          │ anonymized_at       │                                   │
                          │ expires_at          │◀──────────────────────────────────┘
                          │ created_at          │
                          │ updated_at          │
                          └─────────────────────┘
                                    │
                                    │
┌─────────────────────┐             │          ┌──────────────────────────┐
│   ai_usage_logs     │             │          │   ai_prompt_templates    │
├─────────────────────┤             │          ├──────────────────────────┤
│ id (PK)             │             │          │ id (PK)                  │
│ user_id (FK)────────┼─────────────┘          │ name                     │
│ feature             │                        │ version                  │──┐
│ tokens_used         │                        │ feature                  │  │
│ processing_time_ms  │                        │ system_prompt            │  │
│ model_used          │                        │ user_prompt_template     │  │
│ is_mock             │                        │ required_variables       │  │
│ created_at          │                        │ optional_variables       │  │
└─────────────────────┘                        │ model_name               │  │
                                               │ max_tokens               │  │
┌─────────────────────┐                        │ temperature              │  │
│     ai_quotas       │                        │ status                   │  │
├─────────────────────┤                        │ roles_allowed            │  │
│ id (PK)             │                        │ is_default               │  │
│ user_id (FK) UNIQUE │                        │ ab_test_group            │  │
│ daily_tokens_used   │                        │ ab_test_weight           │  │
│ monthly_tokens_used │                        │ usage_count              │  │
│ daily_requests      │                        │ avg_tokens_used          │  │
│ monthly_requests    │                        │ avg_response_time_ms     │  │
│ daily_reset_at      │                        │ avg_feedback_rating      │  │
│ monthly_reset_at    │                        │ success_rate             │  │
│ is_blocked          │                        │ description              │  │
│ blocked_until       │                        │ changelog                │  │
└─────────────────────┘                        │ content_hash             │  │
                                               │ created_by (FK)          │  │
┌─────────────────────┐                        │ updated_by (FK)          │  │
│  ai_configurations  │                        │ created_at               │  │
├─────────────────────┤                        │ updated_at               │  │
│ id (PK)             │                        └──────────────────────────┘  │
│ key (UNIQUE)        │                                                      │
│ value               │                                                      │
│ value_type          │                        ┌──────────────────────────┐  │
│ description         │                        │  ai_prompt_usage_logs    │  │
│ is_active           │                        ├──────────────────────────┤  │
│ updated_by (FK)     │                        │ id (PK)                  │  │
│ updated_at          │                        │ template_id (FK)─────────┼──┘
└─────────────────────┘                        │ user_id (FK)             │
                                               │ session_id (FK)          │
┌─────────────────────┐                        │ variables_used           │
│    ai_violations    │                        │ tokens_input             │
├─────────────────────┤                        │ tokens_output            │
│ id (PK)             │                        │ response_time_ms         │
│ user_id (FK)        │                        │ success                  │
│ violation_type      │                        │ error_type               │
│ severity            │                        │ error_message            │
│ details             │                        │ feedback_rating          │
│ resolved            │                        │ feedback_helpful         │
│ resolved_by (FK)    │                        │ ab_test_group            │
│ created_at          │                        │ created_at               │
└─────────────────────┘                        └──────────────────────────┘

┌──────────────────────────┐                   ┌──────────────────────────────┐
│   ai_usage_summaries     │                   │  ai_data_retention_policies  │
├──────────────────────────┤                   ├──────────────────────────────┤
│ id (PK)                  │                   │ id (PK)                      │
│ user_id (FK)             │                   │ name (UNIQUE)                │
│ period_type              │                   │ target_table                 │
│ period_date              │                   │ retention_days               │
│ total_requests           │                   │ anonymization_days           │
│ successful_requests      │                   │ deletion_days                │
│ failed_requests          │                   │ action                       │
│ total_tokens_input       │                   │ legal_basis                  │
│ total_tokens_output      │                   │ is_active                    │
│ estimated_cost           │                   │ run_schedule                 │
│ avg_response_time_ms     │                   │ last_run_at                  │
│ max_response_time_ms     │                   │ next_run_at                  │
│ feature_breakdown (JSON) │                   │ description                  │
│ model_breakdown (JSON)   │                   │ created_by (FK)              │
│ avg_feedback_rating      │                   │ created_at                   │
│ feedback_count           │                   │ updated_at                   │
│ created_at               │                   └──────────────────────────────┘
│ updated_at               │
│ UNIQUE(user_id,          │                   ┌──────────────────────────────┐
│   period_type,           │                   │   ai_data_retention_logs     │
│   period_date)           │                   ├──────────────────────────────┤
└──────────────────────────┘                   │ id (PK)                      │
                                               │ action                       │
                                               │ target_type                  │
                                               │ target_count                 │
                                               │ details                      │
                                               │ performed_by (FK)            │
                                               │ created_at                   │
                                               └──────────────────────────────┘
```

---

## 📋 Tablo Detayları

### 1. `ai_chat_sessions` - Chat Oturumları

**Amaç:** Öğrenci bazlı chat oturumu yönetimi

| Kolon | Tip | Null | Index | Açıklama |
|-------|-----|------|-------|----------|
| id | INTEGER | NO | PK | Auto-increment primary key |
| session_id | UUID | NO | UNIQUE | Dış referans için benzersiz ID |
| user_id | INTEGER | NO | FK, IX | Kullanıcı referansı |
| title | VARCHAR(200) | YES | - | Oturum başlığı |
| context_type | VARCHAR(50) | YES | IX | 'question', 'topic', 'general' |
| context_id | INTEGER | YES | - | İlgili kaynak ID |
| status | VARCHAR(20) | NO | IX | 'active', 'closed', 'archived' |
| message_count | INTEGER | NO | - | Mesaj sayısı (denormalized) |
| total_tokens_used | INTEGER | NO | - | Toplam token (denormalized) |
| is_anonymized | BOOLEAN | NO | IX | KVKK anonimleştirme durumu |
| anonymized_at | DATETIME | YES | - | Anonimleştirme zamanı |
| expires_at | DATETIME | YES | IX | Otomatik silme tarihi |
| created_at | DATETIME | NO | IX | Oluşturma zamanı |
| updated_at | DATETIME | NO | - | Güncelleme zamanı |

**Index Gerekçeleri:**
- `ix_chat_sessions_user_id`: Kullanıcının tüm oturumlarını hızlı getirme
- `ix_chat_sessions_status`: Aktif oturumları filtreleme
- `ix_chat_sessions_context`: Context bazlı sorgulama
- `ix_chat_sessions_expires`: Temizlik job'ları için

**Foreign Keys:**
- `user_id -> users.id ON DELETE CASCADE`: Kullanıcı silinince oturumlar da silinir

---

### 2. `ai_chat_messages` - Chat Mesajları

**Amaç:** Oturum mesajlarının saklanması ve KVKK uyumlu anonimleştirme

| Kolon | Tip | Null | Index | Açıklama |
|-------|-----|------|-------|----------|
| id | INTEGER | NO | PK | Auto-increment primary key |
| session_id | INTEGER | NO | FK, IX | Oturum referansı |
| role | VARCHAR(20) | NO | - | 'user', 'assistant', 'system' |
| content | TEXT | NO | - | Mesaj içeriği |
| tokens_used | INTEGER | NO | - | Bu mesajın token sayısı |
| model_used | VARCHAR(50) | YES | - | Kullanılan AI model |
| feedback_rating | INTEGER | YES | - | 1-5 puan |
| feedback_text | TEXT | YES | - | Feedback açıklaması |
| is_anonymized | BOOLEAN | NO | - | Anonimleştirildi mi |
| created_at | DATETIME | NO | IX | Mesaj zamanı |

**Index Gerekçeleri:**
- `ix_chat_messages_session_id`: Oturumdaki mesajları sıralı getirme
- `ix_chat_messages_created_at`: Zaman bazlı sorgular ve temizlik

**Foreign Keys:**
- `session_id -> ai_chat_sessions.id ON DELETE CASCADE`: Oturum silinince mesajlar da silinir

---

### 3. `ai_prompt_templates` - Prompt Şablonları

**Amaç:** Prompt versiyonlama ve A/B testing

| Kolon | Tip | Null | Index | Açıklama |
|-------|-----|------|-------|----------|
| id | INTEGER | NO | PK | Auto-increment primary key |
| name | VARCHAR(100) | NO | IX | Şablon adı |
| version | VARCHAR(20) | NO | - | Semantic versioning (1.0.0) |
| feature | VARCHAR(50) | NO | IX | 'question_hint', 'topic_explanation' |
| system_prompt | TEXT | NO | - | Sistem prompt'u |
| user_prompt_template | TEXT | NO | - | Kullanıcı prompt şablonu |
| required_variables | JSON | NO | - | Zorunlu değişkenler |
| optional_variables | JSON | NO | - | Opsiyonel değişkenler |
| model_name | VARCHAR(50) | NO | - | 'gpt-4o-mini', 'gpt-4o' |
| max_tokens | INTEGER | NO | - | Maksimum yanıt token |
| temperature | FLOAT | NO | - | 0.0-2.0 arası |
| status | VARCHAR(20) | NO | IX | 'draft', 'active', 'testing', 'deprecated' |
| roles_allowed | JSON | NO | - | Erişim izinleri |
| is_default | BOOLEAN | NO | - | Varsayılan mı |
| ab_test_group | VARCHAR(20) | YES | - | A/B test grubu |
| ab_test_weight | FLOAT | NO | - | Ağırlık (0-1) |
| usage_count | INTEGER | NO | - | Denormalized kullanım sayısı |
| avg_tokens_used | FLOAT | NO | - | Ortalama token |
| avg_response_time_ms | FLOAT | NO | - | Ortalama yanıt süresi |
| avg_feedback_rating | FLOAT | NO | - | Ortalama puan |
| success_rate | FLOAT | NO | - | Başarı oranı % |
| description | TEXT | YES | - | Açıklama |
| changelog | TEXT | YES | - | Değişiklik notları |
| content_hash | VARCHAR(64) | YES | - | SHA-256 hash |
| created_by | INTEGER | YES | FK | Oluşturan kullanıcı |
| updated_by | INTEGER | YES | FK | Güncelleyen kullanıcı |
| created_at | DATETIME | NO | IX | Oluşturma zamanı |
| updated_at | DATETIME | NO | - | Güncelleme zamanı |

**Unique Constraints:**
- `uq_prompt_name_version(name, version)`: Aynı isim-versiyon kombinasyonu tekrar edilemez

**Index Gerekçeleri:**
- `ix_prompt_templates_name`: İsme göre arama
- `ix_prompt_templates_feature`: Feature bazlı sorgulama
- `ix_prompt_templates_status`: Aktif prompt'ları filtreleme
- `ix_prompt_feature_status`: Composite - Feature + Status kombinasyonu

---

### 4. `ai_usage_logs` - Kullanım Logları

**Amaç:** Her AI çağrısının detaylı kaydı

| Kolon | Tip | Null | Index | Açıklama |
|-------|-----|------|-------|----------|
| id | INTEGER | NO | PK | Auto-increment primary key |
| user_id | INTEGER | YES | FK, IX | Kullanıcı referansı |
| feature | VARCHAR(50) | NO | IX | Kullanılan özellik |
| tokens_used | INTEGER | NO | - | Harcanan token |
| processing_time_ms | INTEGER | NO | - | İşlem süresi (ms) |
| model_used | VARCHAR(50) | YES | - | Kullanılan model |
| request_type | VARCHAR(50) | YES | - | İstek tipi |
| context_info | JSON | YES | - | Ek bağlam bilgisi |
| is_mock | BOOLEAN | NO | - | Test verisi mi |
| created_at | DATETIME | NO | IX | Log zamanı |

**Index Gerekçeleri:**
- `ix_usage_logs_user_id`: Kullanıcı bazlı raporlama
- `ix_usage_logs_feature`: Feature bazlı analiz
- `ix_usage_logs_created_at`: Zaman bazlı sorgular ve cleanup

---

### 5. `ai_usage_summaries` - Kullanım Özetleri

**Amaç:** Günlük/aylık aggregate veriler - OLAP sorguları için

| Kolon | Tip | Null | Index | Açıklama |
|-------|-----|------|-------|----------|
| id | INTEGER | NO | PK | Auto-increment primary key |
| user_id | INTEGER | YES | FK, IX | NULL = sistem geneli |
| period_type | VARCHAR(10) | NO | IX | 'daily', 'monthly', 'yearly' |
| period_date | DATE | NO | IX | Dönem başlangıcı |
| total_requests | INTEGER | NO | - | Toplam istek |
| successful_requests | INTEGER | NO | - | Başarılı istek |
| failed_requests | INTEGER | NO | - | Başarısız istek |
| total_tokens_input | BIGINT | NO | - | Input token toplamı |
| total_tokens_output | BIGINT | NO | - | Output token toplamı |
| estimated_cost | NUMERIC(10,6) | NO | - | Tahmini maliyet (USD) |
| avg_response_time_ms | FLOAT | NO | - | Ortalama yanıt süresi |
| max_response_time_ms | INTEGER | NO | - | Maksimum yanıt süresi |
| feature_breakdown | JSON | NO | - | Feature bazlı detay |
| model_breakdown | JSON | NO | - | Model bazlı detay |
| avg_feedback_rating | FLOAT | NO | - | Ortalama feedback |
| feedback_count | INTEGER | NO | - | Feedback sayısı |
| created_at | DATETIME | NO | - | Oluşturma |
| updated_at | DATETIME | NO | - | Güncelleme |

**Unique Constraints:**
- `uq_usage_summary(user_id, period_type, period_date)`: Aynı kombinasyon tekrar edilemez

**Index Gerekçeleri:**
- `ix_usage_summary_period`: Dönem bazlı raporlar (dashboard)
- `ix_usage_summary_user_period`: Kullanıcı raporları

**Performans Notu:**
- `BIGINT` token kolonları için: Büyük sistemlerde token sayıları milyarlara ulaşabilir
- `NUMERIC(10,6)` maliyet için: Hassas maliyet takibi (0.000001 USD'ye kadar)
- JSON kolonlar: Esnek breakdown yapısı, şema değişikliği gerektirmez

---

### 6. `ai_data_retention_policies` - KVKK Politikaları

**Amaç:** Veri saklama ve silme kurallarının tanımlanması

| Kolon | Tip | Null | Index | Açıklama |
|-------|-----|------|-------|----------|
| id | INTEGER | NO | PK | Auto-increment primary key |
| name | VARCHAR(100) | NO | UNIQUE | Politika adı |
| target_table | VARCHAR(100) | NO | IX | Hedef tablo |
| retention_days | INTEGER | NO | - | Saklama süresi (gün) |
| anonymization_days | INTEGER | YES | - | Anonimleştirme süresi |
| deletion_days | INTEGER | YES | - | Silme süresi |
| action | VARCHAR(50) | NO | - | 'anonymize', 'delete', 'archive' |
| legal_basis | VARCHAR(100) | YES | - | Yasal dayanak |
| is_active | BOOLEAN | NO | - | Aktif mi |
| run_schedule | VARCHAR(50) | NO | - | Çalışma zamanlaması |
| last_run_at | DATETIME | YES | - | Son çalışma |
| next_run_at | DATETIME | YES | - | Sonraki çalışma |
| description | TEXT | YES | - | Açıklama |
| created_by | INTEGER | YES | FK | Oluşturan |
| created_at | DATETIME | NO | - | Oluşturma |
| updated_at | DATETIME | NO | - | Güncelleme |

---

## 🔑 Foreign Key İlişkileri

```sql
-- Chat Sessions
ALTER TABLE ai_chat_sessions 
    ADD CONSTRAINT fk_sessions_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Chat Messages
ALTER TABLE ai_chat_messages 
    ADD CONSTRAINT fk_messages_session 
    FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE;

-- Prompt Templates
ALTER TABLE ai_prompt_templates 
    ADD CONSTRAINT fk_templates_creator 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE ai_prompt_templates 
    ADD CONSTRAINT fk_templates_updater 
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Prompt Usage Logs
ALTER TABLE ai_prompt_usage_logs 
    ADD CONSTRAINT fk_prompt_logs_template 
    FOREIGN KEY (template_id) REFERENCES ai_prompt_templates(id) ON DELETE CASCADE;

ALTER TABLE ai_prompt_usage_logs 
    ADD CONSTRAINT fk_prompt_logs_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE ai_prompt_usage_logs 
    ADD CONSTRAINT fk_prompt_logs_session 
    FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE SET NULL;

-- Usage Summaries
ALTER TABLE ai_usage_summaries 
    ADD CONSTRAINT fk_summaries_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

**ON DELETE Stratejileri:**

| İlişki | Strateji | Gerekçe |
|--------|----------|---------|
| users → sessions | CASCADE | Kullanıcı silinince chat verileri de silinmeli (KVKK) |
| sessions → messages | CASCADE | Oturum silinince mesajlar da silinmeli |
| users → usage_logs | SET NULL | Log verisi korunmalı, user_id NULL olabilir |
| templates → usage_logs | CASCADE | Template silinince loglar da silinebilir |
| users → quotas | CASCADE | Kullanıcı silinince kota kaydı da silinmeli |

---

## 📈 Index Performans Analizi

### Sık Kullanılan Sorgular ve İndeksler

```sql
-- 1. Kullanıcının aktif oturumlarını getir
-- Index: ix_chat_sessions_user_id, ix_chat_sessions_status
SELECT * FROM ai_chat_sessions 
WHERE user_id = ? AND status = 'active' 
ORDER BY updated_at DESC;

-- 2. Feature bazlı aktif prompt'u getir
-- Index: ix_prompt_feature_status (composite)
SELECT * FROM ai_prompt_templates 
WHERE feature = ? AND status = 'active' AND is_default = true;

-- 3. Günlük kullanım özeti
-- Index: ix_usage_summary_period
SELECT * FROM ai_usage_summaries 
WHERE period_type = 'daily' AND period_date >= ? AND period_date <= ?;

-- 4. Kullanıcının aylık token kullanımı
-- Index: ix_usage_summary_user_period (composite)
SELECT SUM(total_tokens_input + total_tokens_output) 
FROM ai_usage_summaries 
WHERE user_id = ? AND period_type = 'monthly' AND period_date = ?;

-- 5. KVKK cleanup - süresi dolan oturumlar
-- Index: ix_chat_sessions_expires
SELECT id FROM ai_chat_sessions 
WHERE expires_at < NOW() AND is_anonymized = false;

-- 6. A/B test analizi
-- Index: ix_prompt_usage_logs_template_created (composite)
SELECT ab_test_group, AVG(feedback_rating), COUNT(*) 
FROM ai_prompt_usage_logs 
WHERE template_id IN (?, ?) AND created_at >= ? 
GROUP BY ab_test_group;
```

### Index Boyut Tahmini

| Tablo | Tahmini Row | Index Sayısı | Tahmini Boyut |
|-------|-------------|--------------|---------------|
| ai_chat_sessions | 100K | 5 | ~50 MB |
| ai_chat_messages | 1M | 2 | ~100 MB |
| ai_prompt_templates | 1K | 5 | ~1 MB |
| ai_usage_logs | 10M | 3 | ~500 MB |
| ai_usage_summaries | 100K | 3 | ~30 MB |

---

## 🛡️ KVKK Uyumluluk

### Veri Saklama Süreleri

| Veri Türü | Saklama | Anonimleştirme | Silme | Yasal Dayanak |
|-----------|---------|----------------|-------|---------------|
| Chat Oturumları | 90 gün | 90 gün | 180 gün | KVKK Md. 7 |
| Chat Mesajları | 90 gün | 90 gün | 180 gün | KVKK Md. 7 |
| Kullanım Logları | 365 gün | - | 365 gün | KVKK Md. 4 |
| Prompt Logları | 30 gün | - | Aggregate | KVKK Md. 28 |
| Kullanım Özetleri | Süresiz | - | - | İstatistik amaçlı |

### Anonimleştirme Prosedürü

```python
# 1. Oturum anonimleştirme
def anonymize_session(session):
    session.user_id = None  # Kullanıcı bağlantısı koparılır
    session.title = f"Anonim Oturum #{session.id}"
    session.is_anonymized = True
    session.anonymized_at = datetime.utcnow()

# 2. Mesaj anonimleştirme
def anonymize_message(message):
    # PII temizleme (regex ile email, telefon, isim tespiti)
    message.content = anonymize_pii(message.content)
    message.is_anonymized = True
```

### KVKK Compliance Checklist

- ✅ Veri minimizasyonu: Sadece gerekli veriler saklanır
- ✅ Anonimleştirme: 90 gün sonra kişisel veri bağlantısı koparılır
- ✅ Silme: 180 gün sonra tamamen silinir
- ✅ Erişim kontrolü: Role-based access control
- ✅ Audit log: Tüm veri işlemleri loglanır
- ✅ Veri taşınabilirliği: Export fonksiyonları mevcut
- ✅ Rıza yönetimi: İlk kullanımda onay alınır

---

## 🚀 Performans Optimizasyonları

### 1. Partitioning (Büyük Tablolar İçin)

```sql
-- PostgreSQL range partitioning by date
CREATE TABLE ai_usage_logs (
    ...
) PARTITION BY RANGE (created_at);

-- Aylık partitionlar
CREATE TABLE ai_usage_logs_2025_01 
    PARTITION OF ai_usage_logs 
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE ai_usage_logs_2025_02 
    PARTITION OF ai_usage_logs 
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### 2. Materialized Views (Raporlar İçin)

```sql
-- Günlük AI kullanım dashboard'u
CREATE MATERIALIZED VIEW mv_daily_ai_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_requests,
    SUM(tokens_used) as total_tokens,
    AVG(processing_time_ms) as avg_response_time,
    COUNT(DISTINCT user_id) as unique_users
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at);

-- Her gece yenile
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_ai_stats;
```

### 3. Connection Pooling

```python
# SQLAlchemy pool configuration
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 20,
    'pool_recycle': 3600,
    'pool_pre_ping': True,
    'max_overflow': 30
}
```

### 4. Query Optimization Tips

```sql
-- 1. EXPLAIN ANALYZE kullanımı
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT * FROM ai_chat_sessions WHERE user_id = 123;

-- 2. Partial index (sık sorgulanan subset için)
CREATE INDEX ix_active_sessions ON ai_chat_sessions(user_id) 
WHERE status = 'active';

-- 3. BRIN index (time-series data için)
CREATE INDEX ix_usage_logs_created_brin ON ai_usage_logs 
USING BRIN (created_at) WITH (pages_per_range = 128);
```

---

## 📊 Monitoring ve Alerting

### Önerilen Metrikler

| Metrik | Eşik | Alert |
|--------|------|-------|
| Günlük token kullanımı | > 1M | Warning |
| Ortalama yanıt süresi | > 5s | Critical |
| Başarısız istek oranı | > 5% | Warning |
| Günlük benzersiz kullanıcı | < 10 | Info |
| Bekleyen anonimleştirme | > 1000 | Warning |

### Dashboard Sorguları

```sql
-- Real-time stats
SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as last_day,
    AVG(processing_time_ms) as avg_response_time,
    SUM(tokens_used) as total_tokens
FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '1 day';

-- Top features
SELECT feature, COUNT(*) as usage_count
FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY feature
ORDER BY usage_count DESC
LIMIT 10;
```

---

## 🔧 Migration Komutları

```bash
# Migration oluştur
flask db migrate -m "Add AI prompt tables"

# Migration uygula
flask db upgrade

# Geri al
flask db downgrade

# Migration durumunu kontrol et
flask db current
flask db history
```

---

## 📝 Sonuç

Bu veritabanı tasarımı:

1. **Ölçeklenebilirlik**: Partitioning ve materialized view desteği
2. **Performans**: Optimize edilmiş indexler ve composite key'ler
3. **KVKK Uyumu**: Otomatik anonimleştirme ve silme mekanizmaları
4. **Esneklik**: JSON kolonlar ile schema-less genişleme
5. **Audit**: Tam izlenebilirlik ve loglama

sağlamaktadır.
