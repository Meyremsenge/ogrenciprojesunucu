# Enterprise Prompt Management System

## Genel Bakış

Bu sistem, AI promptlarının kurumsal düzeyde yönetilmesini sağlar:

- ✅ **Koddan Ayrılma**: Promptlar YAML dosyalarında saklanır
- ✅ **Versiyonlama**: Her değişiklik yeni versiyon olarak kaydedilir
- ✅ **A/B Testing**: Farklı prompt versiyonları test edilebilir
- ✅ **Rollback**: Sorunlu değişiklikler geri alınabilir
- ✅ **Audit Logging**: Tüm değişiklikler izlenebilir

---

## Dosya Yapısı

```
app/modules/ai/prompts/
├── __init__.py                 # Package exports
├── manager.py                  # Legacy prompt manager
├── versioning.py               # Enterprise versioning system
│
├── templates/                  # Legacy YAML templates (migrated)
│   ├── hint.yaml
│   ├── explanation.yaml
│   ├── study_plan.yaml
│   └── ...
│
└── versioned/                  # Enterprise versioned storage
    ├── versions/               # Tüm versiyonlar
    │   ├── question_hint/
    │   │   ├── 1.0.0.yaml
    │   │   ├── 1.1.0.yaml
    │   │   ├── 2.0.0.yaml
    │   │   └── metadata.json
    │   ├── topic_explanation/
    │   │   ├── 1.0.0.yaml
    │   │   └── metadata.json
    │   └── ...
    │
    ├── active/                 # Aktif versiyonlar (symlink-like)
    │   ├── question_hint.yaml
    │   ├── topic_explanation.yaml
    │   └── ...
    │
    ├── ab_tests.json           # Aktif A/B testleri
    └── audit_log.json          # Değişiklik geçmişi
```

---

## Versiyon Yapısı

Her prompt versiyonu şu bilgileri içerir:

```yaml
# versions/question_hint/1.1.0.yaml

name: question_hint
version: "1.1.0"
status: active  # draft, active, testing, deprecated, archived

# Metadata
description: "Soru ipucu verme - geliştirilmiş versiyon"
author: "admin@example.com"
created_at: "2025-12-25T10:00:00"
updated_at: "2025-12-25T12:00:00"

# Prompt içerikleri
system_prompt: |
  Sen bir eğitim koçusun...

user_prompt: |
  Aşağıdaki soru için ipucu ver:
  {question_text}
  ...

# Konfigürasyon
max_tokens: 200
temperature: 0.7
required_variables:
  - question_text
  - difficulty_level
optional_variables:
  - subject
  - topic
roles:
  - student
  - teacher

# A/B test (eğer varsa)
ab_test_weight: 0.0

# Validation kuralları
validation_rules:
  question_text:
    min_length: 10
    max_length: 2000
```

---

## Semantic Versioning

Versiyon numaraları **MAJOR.MINOR.PATCH** formatındadır:

| Değişiklik | Versiyon | Örnek |
|------------|----------|-------|
| Breaking change (yapı değişikliği) | MAJOR | 1.0.0 → 2.0.0 |
| Yeni özellik (geriye uyumlu) | MINOR | 1.0.0 → 1.1.0 |
| Hata düzeltme, iyileştirme | PATCH | 1.0.0 → 1.0.1 |

---

## Kullanım

### 1. Aktif Prompt'u Almak

```python
from app.modules.ai.prompts import prompt_version_manager

# Aktif versiyonu al
prompt = prompt_version_manager.get_active_prompt('question_hint')

print(prompt.system_prompt)
print(prompt.user_prompt)
print(prompt.version)  # "1.1.0"
```

### 2. A/B Test Variant'ı Almak

```python
# Kullanıcıya göre variant seç
prompt, variant = prompt_version_manager.get_ab_test_variant(
    'question_hint',
    user_id=123,
    session_id='abc123'
)

print(variant)  # 'control' veya 'test'
print(prompt.version)
```

### 3. Yeni Versiyon Oluşturmak

```python
# Yeni versiyon oluştur
new_prompt = prompt_version_manager.create_version(
    name='question_hint',
    system_prompt='Yeni system prompt...',
    user_prompt='Yeni user prompt...',
    author='admin@example.com',
    version='1.2.0',  # veya None (otomatik artırılır)
    description='Daha detaylı ipuçları',
    max_tokens=300
)

print(new_prompt.version)  # "1.2.0"
print(new_prompt.status)   # PromptStatus.DRAFT
```

### 4. Versiyonu Aktif Yapmak

```python
# Draft versiyonu aktif yap
activated = prompt_version_manager.activate_version(
    name='question_hint',
    version='1.2.0',
    activated_by='admin@example.com'
)

print(activated.status)  # PromptStatus.ACTIVE
```

### 5. Rollback Yapmak

```python
# Önceki versiyona dön
rolled_back = prompt_version_manager.rollback(
    name='question_hint',
    target_version='1.1.0',  # veya None (bir önceki)
    rolled_back_by='admin@example.com'
)

print(rolled_back.version)  # "1.1.0"
```

### 6. A/B Test Başlatmak

```python
# %10 trafiği test versiyonuna yönlendir
ab_test = prompt_version_manager.start_ab_test(
    name='question_hint',
    test_version='1.2.0',
    test_weight=0.1,  # %10
    started_by='admin@example.com'
)
```

### 7. A/B Test Sonlandırmak

```python
# Test kazandı, aktif yap
winner = prompt_version_manager.end_ab_test(
    name='question_hint',
    winner='test',  # veya 'control'
    ended_by='admin@example.com'
)
```

---

## REST API

### Prompt Listesi

```http
GET /api/v1/ai/prompts
Authorization: Bearer <admin_token>

Response:
{
    "success": true,
    "data": {
        "prompts": [
            {
                "name": "question_hint",
                "active_version": "1.1.0",
                "latest_version": "1.2.0",
                "total_versions": 3,
                "has_ab_test": false
            }
        ],
        "total": 8
    }
}
```

### Prompt Detayı

```http
GET /api/v1/ai/prompts/question_hint
Authorization: Bearer <admin_token>

Response:
{
    "success": true,
    "data": {
        "prompt": {
            "name": "question_hint",
            "version": "1.1.0",
            "status": "active",
            "system_prompt": "...",
            "user_prompt": "...",
            ...
        },
        "ab_test": null
    }
}
```

### Versiyon Geçmişi

```http
GET /api/v1/ai/prompts/question_hint/versions
Authorization: Bearer <admin_token>

Response:
{
    "success": true,
    "data": {
        "versions": [
            {
                "version": "1.2.0",
                "status": "draft",
                "is_active": false,
                "author": "admin@example.com",
                "created_at": "2025-12-25T12:00:00"
            },
            {
                "version": "1.1.0",
                "status": "active",
                "is_active": true,
                ...
            }
        ]
    }
}
```

### Yeni Versiyon Oluştur

```http
POST /api/v1/ai/prompts/question_hint/versions
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "system_prompt": "Yeni system prompt...",
    "user_prompt": "Yeni user prompt...",
    "version": "1.2.0",
    "description": "Daha detaylı ipuçları"
}

Response:
{
    "success": true,
    "data": {
        "prompt": {...},
        "message": "Versiyon oluşturuldu: question_hint v1.2.0"
    }
}
```

### Versiyonu Aktif Yap

```http
POST /api/v1/ai/prompts/question_hint/activate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "version": "1.2.0"
}
```

### Rollback

```http
POST /api/v1/ai/prompts/question_hint/rollback
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "target_version": "1.0.0"  // opsiyonel
}
```

### A/B Test Başlat

```http
POST /api/v1/ai/prompts/question_hint/ab-test
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "test_version": "1.2.0",
    "test_weight": 0.1
}
```

### A/B Test Sonlandır

```http
DELETE /api/v1/ai/prompts/question_hint/ab-test
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "winner": "test"
}
```

### Audit Log

```http
GET /api/v1/ai/prompts/audit-log?prompt_name=question_hint&limit=50
Authorization: Bearer <admin_token>

Response:
{
    "success": true,
    "data": {
        "audit_log": [
            {
                "prompt_name": "question_hint",
                "version": "1.2.0",
                "change_type": "activated",
                "changed_by": "admin@example.com",
                "changed_at": "2025-12-25T12:00:00",
                "previous_version": "1.1.0",
                "details": {}
            }
        ]
    }
}
```

---

## A/B Testing Stratejisi

### Test Akışı

```
┌─────────────────────────────────────────────────────────────┐
│                     A/B Test Akışı                          │
└─────────────────────────────────────────────────────────────┘

1. HAZIRLIK
   ├── Yeni versiyon oluştur (status: draft)
   ├── Test ortamında doğrula
   └── A/B test başlat

2. TEST
   ├── Kontrol grubu (%90): Mevcut versiyon (v1.1.0)
   ├── Test grubu (%10): Yeni versiyon (v1.2.0)
   └── Metrik toplama (başarı oranı, token kullanımı, vb.)

3. ANALİZ
   ├── En az 1000 request / variant
   ├── Başarı oranı karşılaştırması
   └── Statistical significance kontrolü

4. KARAR
   ├── Test kazandı → test versiyonu aktif olur
   ├── Kontrol kazandı → test iptal
   └── Kararsız → testi uzat veya %20'ye çıkar
```

### Deterministic User Assignment

Aynı kullanıcı her zaman aynı variant'ı görür:

```python
# Hash-based selection
hash_input = f"{prompt_name}:{user_id}:{session_id}"
hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
selection = (hash_value % 100) / 100.0

if selection < test_weight:
    return 'test'
else:
    return 'control'
```

---

## Rollback Senaryosu

### Otomatik Rollback Tetikleyicileri

```python
# Örnek: Hata oranı yüksekse rollback
if error_rate > 0.1:  # %10'dan fazla hata
    prompt_version_manager.rollback(
        name='question_hint',
        rolled_back_by='system:auto-rollback',
    )
```

### Manuel Rollback

```python
# Admin panelinden
prompt_version_manager.rollback(
    name='question_hint',
    target_version='1.0.0',
    rolled_back_by='admin@example.com'
)
```

### Rollback Audit Log

```json
{
    "prompt_name": "question_hint",
    "version": "1.0.0",
    "change_type": "rolled_back",
    "changed_by": "admin@example.com",
    "changed_at": "2025-12-25T14:00:00",
    "previous_version": "1.2.0",
    "details": {
        "reason": "Rolled back from v1.2.0"
    }
}
```

---

## Audit Log

### Kayıt Edilen Değişiklikler

| change_type | Açıklama |
|-------------|----------|
| `created` | Yeni versiyon oluşturuldu |
| `updated` | Mevcut versiyon güncellendi |
| `activated` | Versiyon aktif edildi |
| `deprecated` | Versiyon kullanımdan kaldırıldı |
| `rolled_back` | Önceki versiyona dönüldü |
| `ab_test_started` | A/B test başlatıldı |
| `ab_test_ended` | A/B test sonlandırıldı |

### Audit Log Örneği

```json
[
    {
        "prompt_name": "question_hint",
        "version": "1.0.0",
        "change_type": "created",
        "changed_by": "migration",
        "changed_at": "2025-12-25T10:00:00",
        "previous_version": null,
        "details": {"source": "templates/hint.yaml"}
    },
    {
        "prompt_name": "question_hint",
        "version": "1.1.0",
        "change_type": "created",
        "changed_by": "admin@example.com",
        "changed_at": "2025-12-25T11:00:00",
        "previous_version": "1.0.0",
        "details": {}
    },
    {
        "prompt_name": "question_hint",
        "version": "1.1.0",
        "change_type": "ab_test_started",
        "changed_by": "admin@example.com",
        "changed_at": "2025-12-25T12:00:00",
        "previous_version": null,
        "details": {
            "control_version": "1.0.0",
            "test_weight": 0.1
        }
    }
]
```

---

## Best Practices

### ✅ DO

```python
# Değişiklik yapmadan önce yeni versiyon oluştur
new_version = prompt_version_manager.create_version(...)

# Test ortamında doğrula
# ...

# A/B test ile yayınla
prompt_version_manager.start_ab_test(test_weight=0.1)

# Metrikleri izle, sonra karar ver
prompt_version_manager.end_ab_test(winner='test')
```

### ❌ DON'T

```python
# Aktif versiyonu doğrudan değiştirme!
# prompt.system_prompt = "..."  # YANLIŞ

# Production'a direkt deployment yapmadan test et
# prompt_version_manager.activate_version('1.2.0')  # A/B test olmadan riskli
```

---

## Entegrasyon

### Provider Abstraction ile Kullanım

```python
from app.modules.ai.providers import get_ai_provider, AICompletionRequest, AIMessage
from app.modules.ai.prompts import prompt_version_manager

# Prompt al (A/B test destekli)
prompt, variant = prompt_version_manager.get_ab_test_variant(
    'question_hint',
    user_id=current_user.id
)

# Provider al
provider = get_ai_provider()

# Request oluştur
request = AICompletionRequest(
    messages=[
        AIMessage(role='system', content=prompt.system_prompt),
        AIMessage(role='user', content=prompt.user_prompt.format(**variables))
    ],
    feature=AIFeatureType.QUESTION_HINT,
    user_id=current_user.id,
    max_tokens=prompt.max_tokens,
    metadata={'prompt_version': prompt.version, 'ab_variant': variant}
)

# AI çağrısı
response = provider.complete(request)

# A/B test sonucu kaydet
prompt_version_manager.record_ab_test_result(
    'question_hint',
    variant=variant,
    success=True
)
```

---

## Sonuç

Bu sistem ile:

1. ✅ **Promptlar koddan tamamen ayrıldı** → YAML dosyalarında
2. ✅ **Versiyonlama** → Semantic versioning ile izlenebilir
3. ✅ **A/B Testing** → Güvenli deployment
4. ✅ **Rollback** → Hızlı geri alma
5. ✅ **Audit Logging** → Tam izlenebilirlik
