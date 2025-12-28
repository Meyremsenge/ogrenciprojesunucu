# GPT-4.1 API Entegrasyon Rehberi

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Hızlı Başlangıç](#hızlı-başlangıç)
3. [Provider Yapısı](#provider-yapısı)
4. [Konfigürasyon](#konfigürasyon)
5. [Rate Limiting](#rate-limiting)
6. [Circuit Breaker](#circuit-breaker)
7. [Fallback Stratejisi](#fallback-stratejisi)
8. [Rollback Prosedürü](#rollback-prosedürü)
9. [Production Riskleri](#production-riskleri)
10. [Maliyet Kontrolü](#maliyet-kontrolü)
11. [Monitoring](#monitoring)

---

## 🎯 Genel Bakış

Bu dokümantasyon, öğrenci koçluk sistemine GPT-4.1 API entegrasyonunu açıklar.

### Mimari Prensipler

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION                               │
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   Routes    │───▶│  Services   │───▶│  Security   │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    AI MODULE                              │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │   │
│   │  │  Config  │  │Rate Limit│  │ Security │  │  Audit   │ │   │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │   │
│   │                       │                                   │   │
│   │                       ▼                                   │   │
│   │  ┌─────────────────────────────────────────────────────┐ │   │
│   │  │             PROVIDER ABSTRACTION                     │ │   │
│   │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │ │   │
│   │  │  │  Mock   │  │  GPT41  │  │ OpenAI  │             │ │   │
│   │  │  │Provider │  │Provider │  │Provider │             │ │   │
│   │  │  └─────────┘  └────┬────┘  └─────────┘             │ │   │
│   │  └────────────────────┼────────────────────────────────┘ │   │
│   └───────────────────────┼──────────────────────────────────┘   │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   OpenAI API  │
                    │   (GPT-4.1)   │
                    └───────────────┘
```

### Temel Özellikler

| Özellik | Açıklama |
|---------|----------|
| **Provider Abstraction** | Kodda tek satır değişiklik olmadan provider değişimi |
| **Circuit Breaker** | API hatalarında otomatik devre kesme |
| **Fallback** | Hata durumunda Mock provider'a düşme |
| **Rate Limiting** | RPM, TPM, günlük limit kontrolü |
| **Cost Control** | İstek ve kullanıcı bazlı maliyet limiti |
| **Audit Logging** | Tüm AI çağrılarının kaydı |
| **Security Guard** | Prompt injection, jailbreak koruması |

---

## 🚀 Hızlı Başlangıç

### 1. Environment Variables

```bash
# .env dosyasına ekleyin
AI_PROVIDER=gpt41
OPENAI_API_KEY=sk-your-actual-api-key
OPENAI_MODEL=gpt-4o-mini
```

### 2. Dependencies

```bash
pip install openai>=1.0.0 tiktoken
```

### 3. Test

```python
from app.modules.ai import get_ai_provider, AICompletionRequest, AIMessage, AIFeatureType

# Provider al
provider = get_ai_provider()

# İstek oluştur
request = AICompletionRequest(
    messages=[
        AIMessage(role="system", content="Sen yardımcı bir asistansın."),
        AIMessage(role="user", content="Merhaba!")
    ],
    feature=AIFeatureType.QUESTION_HINT,
    user_id=1
)

# Çağır
response = provider.complete(request)
print(response.content)
```

---

## 📦 Provider Yapısı

### Provider Seçenekleri

| Provider | Kod | Kullanım |
|----------|-----|----------|
| Mock | `mock` | Development, Test |
| GPT-4.1 | `gpt41` | Production (Önerilen) |
| OpenAI Legacy | `openai` | Geriye uyumluluk |

### GPT-4.1 Provider Özellikleri

```python
from app.modules.ai.providers import GPT41Provider

provider = GPT41Provider({
    'api_key': 'sk-...',
    'model': 'gpt-4o-mini',
    'max_tokens': 1000,
    'temperature': 0.7,
    'timeout': 30,
    'enable_fallback': True,
    'circuit_failure_threshold': 5,
})

# Health check
health = provider.health_check()
print(f"Status: {health.status.value}")

# Stats
stats = provider.get_stats()
print(f"Total cost: ${stats['cost']['total_cost_usd']}")
```

### Model Fiyatlandırma

| Model | Input ($/1M) | Output ($/1M) |
|-------|--------------|---------------|
| gpt-4.1 | $2.00 | $8.00 |
| gpt-4.1-mini | $0.40 | $1.60 |
| gpt-4.1-nano | $0.10 | $0.40 |
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |

---

## ⚙️ Konfigürasyon

### Environment Variables

```bash
# Provider
AI_PROVIDER=gpt41                    # mock, openai, gpt41

# API
OPENAI_API_KEY=sk-...               # OpenAI API key
OPENAI_MODEL=gpt-4o-mini            # Model seçimi
OPENAI_MAX_TOKENS=1000              # Maks token
OPENAI_TEMPERATURE=0.7              # Yaratıcılık (0-2)
OPENAI_TIMEOUT=30                   # Timeout (saniye)

# Rate Limiting
AI_RATE_LIMIT_RPM=60                # Requests per minute
AI_RATE_LIMIT_TPM=100000            # Tokens per minute
AI_RATE_LIMIT_RPD=10000             # Requests per day

# Circuit Breaker
AI_CIRCUIT_FAILURE_THRESHOLD=5      # Hata eşiği
AI_CIRCUIT_SUCCESS_THRESHOLD=2      # Başarı eşiği
AI_CIRCUIT_TIMEOUT=60               # Timeout (saniye)

# Cost
AI_MAX_COST_PER_REQUEST=0.10        # Maks istek maliyeti ($)
AI_MAX_COST_PER_USER_DAILY=1.0      # Günlük kullanıcı limiti ($)
AI_MAX_COST_MONTHLY=100.0           # Aylık toplam limit ($)

# Fallback
AI_ENABLE_FALLBACK=true             # Fallback aktif mi
AI_FALLBACK_PROVIDER=mock           # Fallback provider
```

### Config Manager Kullanımı

```python
from app.modules.ai import (
    get_ai_config,
    ai_config_manager,
    get_production_config
)

# Mevcut config
config = get_ai_config()
print(f"Provider: {config.provider_type.value}")
print(f"Has API Key: {config.has_valid_api_key()}")

# Production'a geç
ai_config_manager.switch_to_production(api_key="sk-...")

# Mock'a geri dön
ai_config_manager.switch_to_mock()

# Rollback
ai_config_manager.rollback()
```

---

## ⏱️ Rate Limiting

### Limit Türleri

| Limit | Varsayılan | Açıklama |
|-------|------------|----------|
| RPM (Global) | 60 | Dakikada toplam istek |
| RPM (User) | 10 | Kullanıcı başına dakikada istek |
| TPM (Global) | 100,000 | Dakikada toplam token |
| TPM (User) | 10,000 | Kullanıcı başına dakikada token |
| RPD (User) | 100 | Kullanıcı başına günlük istek |

### Kullanım

```python
from app.modules.ai import ai_rate_limiter

# İstek öncesi kontrol
allowed, error = ai_rate_limiter.check_limit(
    user_id=123,
    estimated_tokens=500
)

if not allowed:
    return {"error": error}, 429

# İstek sonrası kayıt
ai_rate_limiter.record_usage(
    user_id=123,
    tokens_used=450,
    cost_usd=0.001
)

# İstatistikler
stats = ai_rate_limiter.get_user_stats(123)
print(f"Today: {stats['today']['requests']} requests")
```

### Decorator

```python
from app.modules.ai import rate_limit_check

@app.route('/api/ai/hint')
@rate_limit_check(feature="hint", estimated_tokens=500)
def get_hint():
    # Rate limit otomatik kontrol edilir
    ...
```

---

## 🔌 Circuit Breaker

### Durumlar

```
    ┌──────────────────────────────────────────────────────┐
    │                                                      │
    │   CLOSED ──(failure_count >= threshold)──▶ OPEN     │
    │      │                                       │       │
    │      │                                       │       │
    │      │            (timeout)                  │       │
    │      │               │                       │       │
    │      │               ▼                       │       │
    │      │         HALF-OPEN                     │       │
    │      │               │                       │       │
    │      │    success────┘────failure            │       │
    │      │       │              │                │       │
    │      ◀───────┘              └────────────────┘       │
    │                                                      │
    └──────────────────────────────────────────────────────┘
```

| Durum | Açıklama |
|-------|----------|
| CLOSED | Normal çalışma, istekler geçer |
| OPEN | Devre açık, istekler reddedilir |
| HALF_OPEN | Test modu, bir istek denenir |

### Konfigürasyon

```python
from app.modules.ai.providers import CircuitBreakerConfig, CircuitBreaker

config = CircuitBreakerConfig(
    failure_threshold=5,     # 5 hatada OPEN
    success_threshold=2,     # 2 başarıda CLOSED
    timeout_seconds=60,      # 60s sonra HALF_OPEN
)

cb = CircuitBreaker(config)

# Manuel kontrol
if cb.can_execute():
    try:
        result = api_call()
        cb.record_success()
    except Exception:
        cb.record_failure()

# Manuel reset (admin)
cb.reset()
```

---

## 🔄 Fallback Stratejisi

### Fallback Zinciri

```
GPT-4.1 Provider
      │
      │ (error)
      ▼
Circuit Breaker Check
      │
      │ (OPEN)
      ▼
Mock Provider (Fallback)
      │
      │ (success)
      ▼
User Response (with fallback flag)
```

### Fallback Response'u Tespit

```python
response = provider.complete(request)

if response.metadata.get('fallback'):
    print("⚠️ Fallback provider kullanıldı")
    print(f"Original provider: {response.metadata.get('original_provider')}")
    print(f"Circuit state: {response.metadata.get('circuit_state')}")
```

### Manuel Fallback Tetikleme

```python
from app.modules.ai import ai_config_manager

# Acil durum: Mock'a geç
ai_config_manager.switch_to_mock()

# Normal operasyona dön
ai_config_manager.switch_to_production(api_key="sk-...")
```

---

## ⏪ Rollback Prosedürü

### Senaryo 1: API Hatası

```bash
# 1. Circuit breaker zaten açılacak
# 2. Fallback otomatik devreye girecek
# 3. Manuel müdahale gerekirse:

python -c "
from app.modules.ai import ai_config_manager
ai_config_manager.switch_to_mock()
"
```

### Senaryo 2: Kota Aşımı

```bash
# 1. Rate limiter reddedecek
# 2. Gerekirse limitleri artır:

export AI_RATE_LIMIT_RPM=120
# veya
python -c "
from app.modules.ai import ai_rate_limiter, RateLimitConfig
ai_rate_limiter.update_config(RateLimitConfig(rpm_limit=120))
"
```

### Senaryo 3: Maliyet Sorunu

```bash
# 1. Daily limit doldu
# 2. Manuel reset (admin):

python -c "
from app.modules.ai import ai_rate_limiter
ai_rate_limiter.reset_user(user_id=123)
"
```

### Senaryo 4: Config Geri Alma

```python
from app.modules.ai import ai_config_manager

# Önceki config'e dön
success = ai_config_manager.rollback()

# Status kontrol
status = ai_config_manager.get_status()
print(f"Can rollback: {status['can_rollback']}")
```

---

## ⚠️ Production Riskleri

### Risk Matrisi

| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| API Key Sızıntısı | Düşük | Kritik | Env vars, key rotation |
| Rate Limit Aşımı | Orta | Yüksek | Circuit breaker, fallback |
| Maliyet Patlaması | Orta | Yüksek | Cost controls, alerts |
| Prompt Injection | Yüksek | Orta | Security guard |
| Jailbreak | Orta | Orta | Content filtering |
| API Downtime | Düşük | Yüksek | Fallback, retry |

### Güvenlik Kontrol Listesi

- [ ] API key `.env` dosyasında, `.gitignore`'da
- [ ] Key asla loglara yazılmıyor
- [ ] Rate limiting aktif
- [ ] Circuit breaker yapılandırıldı
- [ ] Fallback provider hazır
- [ ] Maliyet limitleri ayarlandı
- [ ] Security guard aktif
- [ ] Audit logging açık
- [ ] Monitoring kuruldu

### API Key Güvenliği

```python
# YANLIŞ - Asla yapmayın!
api_key = "sk-abc123..."  # Hardcoded

# DOĞRU - Environment'dan al
import os
api_key = os.getenv('OPENAI_API_KEY')

# DOĞRU - Config manager kullan
from app.modules.ai import get_ai_config
config = get_ai_config()
key = config.get_api_key()  # Güvenli erişim
masked = config.get_masked_api_key()  # Loglar için
```

---

## 💰 Maliyet Kontrolü

### Maliyet Tahmin Formülü

```python
def estimate_cost(prompt_tokens: int, completion_tokens: int, model: str = "gpt-4o-mini"):
    pricing = {
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-4o": {"input": 2.50, "output": 10.00},
    }
    
    prices = pricing.get(model, pricing["gpt-4o-mini"])
    input_cost = (prompt_tokens / 1_000_000) * prices["input"]
    output_cost = (completion_tokens / 1_000_000) * prices["output"]
    
    return input_cost + output_cost
```

### Maliyet Raporu

```python
from app.modules.ai import get_ai_provider

provider = get_ai_provider()
cost_summary = provider.get_cost_summary()

print(f"Total Cost: ${cost_summary['total_cost_usd']:.4f}")
print(f"Model: {cost_summary['model']}")
print(f"Requests: {cost_summary['request_count']}")
print(f"Tokens: {cost_summary['total_tokens']}")
```

### Alert Eşikleri (Önerilen)

| Eşik | Aksiyon |
|------|---------|
| Günlük $50 | Warning email |
| Günlük $80 | Critical alert |
| Günlük $100 | Auto-switch to mock |
| Aylık $400 | Review trigger |

---

## 📊 Monitoring

### Health Check Endpoint

```python
@app.route('/api/ai/health')
def ai_health():
    from app.modules.ai import get_ai_provider, ai_rate_limiter
    
    provider = get_ai_provider()
    health = provider.health_check()
    
    return {
        'provider': provider.name,
        'status': health.status.value,
        'latency_ms': health.latency_ms,
        'circuit_breaker': provider.get_stats().get('circuit_breaker', {}),
        'rate_limits': ai_rate_limiter.get_global_stats(),
    }
```

### Metrics (Prometheus Format)

```python
# ai_requests_total{provider="gpt41", status="success"}
# ai_tokens_used_total{provider="gpt41"}
# ai_cost_usd_total{provider="gpt41"}
# ai_latency_seconds{provider="gpt41", quantile="0.99"}
# circuit_breaker_state{provider="gpt41"} # 0=closed, 1=open, 2=half_open
```

### Log Format

```json
{
  "timestamp": "2025-12-25T10:30:00Z",
  "level": "INFO",
  "provider": "gpt41",
  "user_id": 123,
  "feature": "question_hint",
  "tokens_used": 450,
  "cost_usd": 0.0012,
  "latency_ms": 1250,
  "circuit_state": "closed",
  "is_fallback": false
}
```

---

## 📝 Checklist: Production'a Geçiş

### Hazırlık

- [ ] OpenAI hesabı oluşturuldu
- [ ] API key alındı
- [ ] Billing limitleri ayarlandı
- [ ] Usage alerts aktif

### Kod

- [ ] `openai` paketi yüklendi
- [ ] `tiktoken` paketi yüklendi
- [ ] Environment variables ayarlandı
- [ ] Config validation geçti

### Test

- [ ] Development'ta mock test edildi
- [ ] Staging'de GPT test edildi
- [ ] Rate limiting test edildi
- [ ] Circuit breaker test edildi
- [ ] Fallback test edildi
- [ ] Cost tracking doğrulandı

### Go-Live

```bash
# 1. Environment değiştir
export AI_PROVIDER=gpt41
export OPENAI_API_KEY=sk-prod-key

# 2. Restart
systemctl restart app

# 3. Monitor
watch -n 5 'curl -s localhost:5000/api/ai/health | jq'
```

---

## 🆘 Troubleshooting

### "API key geçersiz"

```bash
# Key formatını kontrol et
python -c "
from app.modules.ai import get_ai_config
c = get_ai_config()
print(f'Valid: {c.has_valid_api_key()}')
print(f'Key: {c.get_masked_api_key()}')
"
```

### "Rate limit aşıldı"

```bash
# Mevcut kullanımı kontrol et
python -c "
from app.modules.ai import ai_rate_limiter
print(ai_rate_limiter.get_global_stats())
"
```

### "Circuit breaker OPEN"

```bash
# Manuel reset
python -c "
from app.modules.ai import get_ai_provider
p = get_ai_provider()
p.reset_circuit_breaker()
print('Reset complete')
"
```

### "Fallback aktif"

```bash
# Provider status kontrol
python -c "
from app.modules.ai import get_ai_provider
p = get_ai_provider()
h = p.health_check()
print(f'Status: {h.status.value}')
print(f'Error: {h.error}')
"
```

---

## 📚 Ek Kaynaklar

- [OpenAI API Docs](https://platform.openai.com/docs)
- [GPT-4.1 Pricing](https://openai.com/pricing)
- [Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
