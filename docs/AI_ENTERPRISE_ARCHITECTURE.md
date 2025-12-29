# AI Modülü Kurumsal Mimari Dokümantasyonu

## Genel Bakış

Bu doküman, Öğrenci Koçluk Uygulaması için tasarlanmış kurumsal düzeyde AI modülünün mimarisini açıklar. Modül, provider bağımsız tasarımı, YAML tabanlı prompt yönetimi, Redis tabanlı kota/rate limiting ve Celery async task desteği ile enterprise-grade bir çözüm sunar.

## Mimari Diyagramı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                    (Web App, Mobile App, Admin Panel)                        │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│                     Flask Blueprint (/api/v1/ai)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   /hint     │  │  /explain   │  │ /study-plan │  │  /evaluate  │  ...   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI SERVICE FACADE                                    │
│                    (Orchestration & Coordination)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Abuse Detection → 2. Rate Limiting → 3. Quota Check            │   │
│  │  4. Prompt Building → 5. Provider Call → 6. Quota Consume          │   │
│  │  7. Audit Logging → 8. Response                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────┬────────────────────┬────────────────────┬────────────────────┬─────┘
         │                    │                    │                    │
         ▼                    ▼                    ▼                    ▼
┌────────────────┐   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│  PROMPT LAYER  │   │ PROVIDER LAYER │   │  QUOTA LAYER   │   │  AUDIT LAYER   │
│                │   │                │   │                │   │                │
│ ┌────────────┐ │   │ ┌────────────┐ │   │ ┌────────────┐ │   │ ┌────────────┐ │
│ │YAML        │ │   │ │ Provider   │ │   │ │ Redis      │ │   │ │ Audit      │ │
│ │Templates   │ │   │ │ Factory    │ │   │ │ Quota Mgr  │ │   │ │ Logger     │ │
│ ├────────────┤ │   │ ├────────────┤ │   │ ├────────────┤ │   │ ├────────────┤ │
│ │ Prompt     │ │   │ │ Mock       │ │   │ │ Rate       │ │   │ │ AI Audit   │ │
│ │ Registry   │ │   │ │ Provider   │ │   │ │ Limiter    │ │   │ │ Actions    │ │
│ ├────────────┤ │   │ ├────────────┤ │   │ ├────────────┤ │   │ └────────────┘ │
│ │ Prompt     │ │   │ │ OpenAI     │ │   │ │ Abuse      │ │   │                │
│ │ Builder    │ │   │ │ Provider   │ │   │ │ Detector   │ │   │                │
│ └────────────┘ │   │ └────────────┘ │   │ └────────────┘ │   │                │
└────────────────┘   └────────────────┘   └───────┬────────┘   └────────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │    REDIS     │
                                          │  (Caching,   │
                                          │   Quotas,    │
                                          │  Rate Limit) │
                                          └──────────────┘
```

## Dizin Yapısı

```
app/modules/ai/
├── __init__.py              # Ana modül, Blueprint tanımı
├── routes.py                # Legacy API routes (backward compat)
├── routes_v2.py             # Yeni enterprise API routes
├── schemas.py               # Marshmallow schemas
├── services_legacy.py       # Eski AIService (backward compat)
│
├── core/                    # Çekirdek bileşenler
│   ├── __init__.py
│   ├── interfaces.py        # Abstract interfaces
│   ├── exceptions.py        # AI özel exception'lar
│   └── constants.py         # Sabitler, limitler
│
├── providers/               # AI sağlayıcıları
│   ├── __init__.py
│   ├── base.py              # BaseProvider abstract class
│   ├── factory.py           # ProviderFactory
│   ├── mock_provider.py     # Mock AI (geliştirme)
│   └── openai_provider.py   # OpenAI GPT (production)
│
├── prompts/                 # Prompt yönetimi
│   ├── __init__.py
│   ├── manager.py           # PromptRegistry, PromptBuilder
│   └── templates/           # YAML prompt templates
│       ├── hint.yaml
│       ├── explanation.yaml
│       ├── study_plan.yaml
│       ├── evaluation.yaml
│       ├── performance_analysis.yaml
│       ├── question_generation.yaml
│       ├── content_enhancement.yaml
│       └── motivation.yaml
│
├── quota/                   # Kota ve rate limiting
│   ├── __init__.py
│   ├── quota_manager.py     # Redis quota yönetimi
│   ├── rate_limiter.py      # Sliding window rate limit
│   └── abuse_detector.py    # Kötüye kullanım tespiti
│
└── services/                # Servis katmanı
    ├── __init__.py
    ├── facade.py            # AIServiceFacade (ana giriş)
    └── audit.py             # AI audit logging
```

## Bileşen Detayları

### 1. Core Layer

#### Interfaces (`core/interfaces.py`)
- `AIProviderInterface`: Provider sözleşmesi
- `AIRequest/AIResponse`: Standart veri yapıları
- `QuotaManagerInterface`: Kota yönetimi sözleşmesi
- `RateLimiterInterface`: Rate limit sözleşmesi
- `AbuseDetectorInterface`: Abuse tespit sözleşmesi

#### Exceptions (`core/exceptions.py`)
- `AIException`: Base exception
- `AIQuotaExceededError`: Kota aşımı (429)
- `AIRateLimitError`: Rate limit (429)
- `AIProviderError`: Provider hatası (503)
- `AIAbuseDetectedError`: Kötüye kullanım (403)
- `AIContentFilterError`: İçerik filtreleme (400)

#### Constants (`core/constants.py`)
- `TOKEN_COSTS`: Feature bazlı token maliyetleri
- `QUOTA_LIMITS`: Rol bazlı limitler
- `ABUSE_THRESHOLDS`: Abuse tespit eşikleri
- `BANNED_PATTERNS`: Yasaklı içerik desenleri
- `REDIS_KEYS`: Redis key formatları

### 2. Provider Layer

#### Provider Factory Pattern
```python
from app.modules.ai.providers import provider_factory, ProviderType

# Mock provider al (varsayılan)
mock = provider_factory.get_default()

# OpenAI provider al
openai = provider_factory.get(ProviderType.OPENAI.value, config={
    'api_key': 'sk-...',
    'model': 'gpt-4o-mini'
})
```

#### Provider Değiştirme (Hot-swap)
```python
from app.modules.ai.services import ai_service
from app.modules.ai.providers import ProviderType

# Runtime'da provider değiştir
ai_service.set_provider(ProviderType.OPENAI)
```

### 3. Prompt Layer

#### YAML Template Yapısı
```yaml
name: question_hint
version: "1.0.0"
description: "Öğrenciye soru çözümü için yönlendirici ipucu verir"

roles:
  - student
  - teacher

required_variables:
  - question_text
  - difficulty_level

optional_variables:
  - subject
  - topic

max_tokens: 200

cache:
  enabled: true
  ttl: 1800

system_prompt: |
  Sen bir eğitim koçusun...

user_prompt: |
  SORU: {question_text}
  ZORLUK: {difficulty_level}
  {% if subject %}DERS: {subject}{% endif %}

validation:
  question_text:
    min_length: 10
    max_length: 2000
  difficulty_level:
    allowed_values: ["kolay", "orta", "zor"]
```

#### Prompt Manager Kullanımı
```python
from app.modules.ai.prompts import prompt_manager
from app.modules.ai.core import AIFeature

# Prompt oluştur
system_prompt, user_prompt, template = prompt_manager.get_prompt(
    feature=AIFeature.QUESTION_HINT,
    variables={'question_text': '...', 'difficulty_level': 'orta'},
    role='student'
)

# Kullanılabilir özellikleri listele
features = prompt_manager.list_available_features('student')
```

### 4. Quota Layer

#### Redis Quota Manager
```python
from app.modules.ai.quota import RedisQuotaManager

quota_mgr = RedisQuotaManager(redis_client)

# Kota kontrolü
allowed, error = quota_mgr.check_quota(
    user_id=1,
    feature=AIFeature.QUESTION_HINT,
    tokens=100,
    role='student'
)

# Kota durumu
status = quota_mgr.get_quota_status(user_id=1, role='student')
```

#### Rate Limiter
```python
from app.modules.ai.quota import RedisRateLimiter

rate_limiter = RedisRateLimiter(redis_client)

# İzin kontrolü
allowed, wait_time = rate_limiter.is_allowed(user_id=1, feature=AIFeature.QUESTION_HINT)

if not allowed:
    raise AIRateLimitError(retry_after=wait_time)
```

#### Abuse Detector
```python
from app.modules.ai.quota import AbuseDetector

detector = AbuseDetector(redis_client)

# Abuse kontrolü
is_abuse, reason = detector.check_abuse(user_id=1, request=ai_request)

# İhlal geçmişi
violations = detector.get_violation_history(user_id=1)
```

### 5. Service Facade

#### AIServiceFacade Kullanımı
```python
from app.modules.ai.services import ai_service

# İpucu al
result = ai_service.get_hint(
    user_id=1,
    question_text="Bir üçgenin iç açıları toplamı kaç derecedir?",
    difficulty_level="orta",
    role="student",
    subject="Matematik"
)

# Sağlık kontrolü
health = ai_service.health_check()

# Kota durumu
quota = ai_service.get_quota_status(user_id=1, role='student')
```

### 6. Celery Tasks

```python
from app.tasks.ai_tasks import (
    process_ai_request,
    batch_process_ai_requests,
    generate_daily_ai_report,
    cleanup_old_ai_logs,
    check_provider_health
)

# Async AI isteği
task = process_ai_request.delay(
    user_id=1,
    feature='question_hint',
    prompt='...',
    context={},
    role='student'
)

# Günlük rapor
report = generate_daily_ai_report.delay()
```

## API Endpoints

### V2 Endpoints (Enterprise)

| Endpoint | Method | Açıklama | Roller |
|----------|--------|----------|--------|
| `/api/v1/ai/v2/hint` | POST | Soru ipucu | student, teacher |
| `/api/v1/ai/v2/explain` | POST | Konu açıklaması | student, teacher |
| `/api/v1/ai/v2/study-plan` | POST | Çalışma planı | student, teacher |
| `/api/v1/ai/v2/evaluate-answer` | POST | Cevap değerlendirme | teacher, admin |
| `/api/v1/ai/v2/analyze-performance` | POST | Performans analizi | student, teacher |
| `/api/v1/ai/v2/generate-questions` | POST | Soru üretimi | teacher, admin |
| `/api/v1/ai/v2/enhance-content` | POST | İçerik zenginleştirme | teacher, admin |
| `/api/v1/ai/v2/motivation` | POST | Motivasyon mesajı | student, teacher |
| `/api/v1/ai/v2/quota` | GET | Kota durumu | all |
| `/api/v1/ai/v2/features` | GET | Özellik listesi | all |
| `/api/v1/ai/v2/health` | GET | Sağlık kontrolü | public |

## Kota Limitleri

| Rol | Günlük Token | Aylık Token | Günlük İstek | Cooldown |
|-----|-------------|-------------|--------------|----------|
| student | 1,000 | 20,000 | 20 | 30s |
| teacher | 5,000 | 100,000 | 100 | 10s |
| admin | 20,000 | 500,000 | 500 | 5s |
| super_admin | ∞ | ∞ | ∞ | 0s |

## Provider Geçişi (Mock → OpenAI)

### Adım 1: OpenAI API Key Ekle
```python
# config/secrets.py
OPENAI_API_KEY = "sk-..."
```

### Adım 2: Provider Değiştir
```python
# app/config.py
AI_PROVIDER = 'openai'  # 'mock' yerine
```

### Adım 3: Service'de Güncelle
```python
from app.modules.ai.services import ai_service
from app.modules.ai.providers import ProviderType

ai_service.set_provider(ProviderType.OPENAI)
```

## Güvenlik

### İçerik Filtreleme
- Yasaklı pattern'ler otomatik tespit
- Yönlendirme konuları için özel mesajlar
- Audit log'a kaydedilir

### Abuse Koruması
- Dakikalık istek limiti: 30
- Tekrarlayan istek tespiti: 5
- Minimum istek aralığı: 500ms
- Otomatik engelleme: 1-168 saat

### Audit Trail
- Tüm AI istekleri loglanır
- Yanıtlar ve token kullanımı kaydedilir
- Rate limit ve abuse olayları izlenir

## Performans

### Caching
- Prompt template'leri singleton olarak cache'lenir
- Benzer istekler için response cache (opsiyonel)
- Redis kullanılamadığında in-memory fallback

### Async İşleme
- Celery ile uzun süren işlemler asenkron
- Batch processing desteği
- Background health check'ler

## Test

```bash
# Modül testi
python -c "from app.modules.ai import ai_service; print(ai_service.health_check())"

# Flask app başlat
python run.py

# API testi
curl -X POST http://localhost:5000/api/v1/ai/v2/health
```

---

**Son Güncelleme:** 2024-12-25  
**Versiyon:** 2.0.0  
**Maintainer:** Backend Team
