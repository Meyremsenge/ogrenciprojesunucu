# AI Production Deployment Rehberi

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Deployment Stratejisi](#deployment-stratejisi)
3. [Mock → Real AI Geçişi](#mock--real-ai-geçişi)
4. [Environment Konfigürasyonu](#environment-konfigürasyonu)
5. [Gradual Rollout](#gradual-rollout)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Rollback Prosedürü](#rollback-prosedürü)
8. [Checklist](#checklist)

---

## Genel Bakış

Bu döküman AI sisteminin production ortamına kontrollü ve geri alınabilir şekilde deploy edilmesini anlatır.

### Mimari

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI PRODUCTION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │   Request    │──▶│   Feature    │──▶│   AI Production      │    │
│  │   Handler    │   │   Flags      │   │   Client             │    │
│  └──────────────┘   └──────────────┘   └──────────────────────┘    │
│         │                 │                      │                  │
│         ▼                 ▼                      ▼                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │   Rate       │   │   Rollout    │   │   Circuit            │    │
│  │   Limiter    │   │   Manager    │   │   Breaker            │    │
│  └──────────────┘   └──────────────┘   └──────────────────────┘    │
│         │                 │                      │                  │
│         │                 │                      ▼                  │
│         │                 │            ┌──────────────────────┐    │
│         │                 │            │   OpenAI API         │    │
│         │                 │            │   (with retry)       │    │
│         │                 │            └──────────────────────┘    │
│         │                 │                      │                  │
│         ▼                 ▼                      ▼                  │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                    COST MONITORING                        │      │
│  │   Daily Budget: $50 | Monthly Budget: $1000 | Alert: 80% │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Stratejisi

### Aşamalar

```
Phase 1: DISABLED (Mevcut)
    ↓
Phase 2: INTERNAL_ONLY (Test)
    ↓
Phase 3: CANARY (5%)
    ↓
Phase 4: BETA (25%)
    ↓
Phase 5: GRADUAL (50%)
    ↓
Phase 6: GENERAL (100%)
```

### Her Aşamada Yapılacaklar

| Aşama | Kullanıcılar | Süre | Kriterleri |
|-------|--------------|------|------------|
| DISABLED | Hiç kimse | - | Başlangıç |
| INTERNAL_ONLY | Admin/Staff | 3-5 gün | %0 hata, <2s latency |
| CANARY | %5 | 1 hafta | %1'den az hata |
| BETA | %25 | 1 hafta | Kullanıcı geri bildirimi |
| GRADUAL | %50 | 1 hafta | Maliyet kontrolü |
| GENERAL | %100 | - | Tüm metrikler OK |

---

## Mock → Real AI Geçişi

### Adım 1: Environment Hazırlığı

```bash
# .env dosyasını güncelle
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-your-api-key-here

# Feature flags (başlangıçta kapalı)
AI_ROLLOUT_STAGE=disabled
AI_ROLLOUT_PERCENTAGE=0
```

### Adım 2: API Key Doğrulama

```python
# Python ile test
from app.services.ai_client import get_ai_client

client = get_ai_client()
result = client.health_check()
print(result)
# {'healthy': True, 'provider': 'openai', 'model': 'gpt-4o-mini', 'latency_ms': 850}
```

### Adım 3: Internal Test

```bash
# Internal kullanıcılar için aç
AI_ROLLOUT_STAGE=internal_only
```

```python
# Admin panelinden veya kod ile
from app.services.ai_feature_flags import AIFeatureFlagService

AIFeatureFlagService.set_rollout_stage(
    stage=RolloutStage.INTERNAL_ONLY,
    percentage=0,
    admin_id=1
)
```

### Adım 4: Canary Deployment

```python
# %5 kullanıcıya aç
AIFeatureFlagService.set_rollout_stage(
    stage=RolloutStage.CANARY,
    percentage=5,
    admin_id=1
)
```

### Adım 5: Kademeli Açılım

```python
# Her seferinde %10 artır
AIFeatureFlagService.gradual_rollout(
    target_percentage=50,
    step=10,
    admin_id=1
)
# 5% -> 15% -> 25% -> 35% -> 45% -> 50%
```

### Adım 6: Genel Erişim

```python
AIFeatureFlagService.set_rollout_stage(
    stage=RolloutStage.GENERAL,
    percentage=100,
    admin_id=1
)
```

---

## Environment Konfigürasyonu

### Development (.env.development)

```bash
# AI Provider
AI_PROVIDER=mock
AI_MODEL=mock-model

# Rollout (kapalı)
AI_ROLLOUT_STAGE=disabled
AI_ROLLOUT_PERCENTAGE=0

# Mock ayarları
AI_MOCK_DELAY_MIN=0.3
AI_MOCK_DELAY_MAX=1.0
```

### Staging (.env.staging)

```bash
# AI Provider
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-staging-key

# Rollout (internal test)
AI_ROLLOUT_STAGE=internal_only
AI_ROLLOUT_PERCENTAGE=0

# Düşük bütçe
AI_DAILY_BUDGET_USD=10.0
AI_MONTHLY_BUDGET_USD=100.0

# Kısa timeout (test için)
AI_TOTAL_TIMEOUT=30.0
AI_MAX_RETRIES=2
```

### Production (.env.production)

```bash
# =============================================================================
# AI PRODUCTION CONFIGURATION
# =============================================================================

# Provider
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=${OPENAI_API_KEY}  # Secret manager'dan

# Timeout Settings
AI_CONNECT_TIMEOUT=5.0
AI_READ_TIMEOUT=30.0
AI_TOTAL_TIMEOUT=60.0
AI_STREAM_TIMEOUT=120.0

# Retry Settings
AI_MAX_RETRIES=3
AI_RETRY_INITIAL_DELAY=1.0
AI_RETRY_MAX_DELAY=30.0

# Circuit Breaker
AI_CB_FAILURE_THRESHOLD=5
AI_CB_SUCCESS_THRESHOLD=3
AI_CB_TIMEOUT=60.0

# Rate Limiting
AI_RPM=100
AI_RPH=1000
AI_USER_RPM=10
AI_USER_RPH=100

# Budget
AI_DAILY_BUDGET_USD=50.0
AI_MONTHLY_BUDGET_USD=1000.0
AI_ALERT_THRESHOLD=80

# Rollout (başlangıçta internal_only)
AI_ROLLOUT_STAGE=internal_only
AI_ROLLOUT_PERCENTAGE=0

# Features
AI_ENABLED_FEATURES=question_hint,topic_explanation,study_plan,performance_analysis
AI_DISABLED_FEATURES=

# Security
AI_CONTENT_FILTER=true
AI_PROMPT_INJECTION_DETECTION=true

# Logging (GDPR compliant)
AI_LOG_REQUESTS=true
AI_LOG_RESPONSES=false
AI_LOG_TOKENS=true
AI_LOG_COSTS=true
```

---

## Gradual Rollout

### Otomatik Rollout Script

```python
#!/usr/bin/env python
"""
AI Gradual Rollout Script

Kullanım:
    python scripts/ai_rollout.py --target 50 --step 10 --wait 3600
"""

import argparse
import time
from datetime import datetime

from app.services.ai_feature_flags import AIFeatureFlagService, RolloutStage
from app.services.ai_cost_monitoring import AICostMonitoringService


def check_health():
    """Sistem sağlığını kontrol et."""
    from app.services.ai_client import get_ai_client
    
    client = get_ai_client()
    status = client.get_status()
    
    # Circuit breaker kontrolü
    if status['circuit_breaker_state'] == 'open':
        return False, "Circuit breaker is OPEN"
    
    # Bütçe kontrolü
    budget = AICostMonitoringService.check_budget()
    if not budget['within_budget']:
        return False, "Budget exceeded"
    
    return True, "OK"


def gradual_rollout(target: int, step: int, wait_seconds: int, admin_id: int = 1):
    """Kademeli rollout."""
    
    print(f"Starting gradual rollout to {target}%")
    print(f"Step size: {step}%, Wait time: {wait_seconds}s")
    print("-" * 50)
    
    current = AIFeatureFlagService.get_status()['rollout']['percentage']
    
    while current < target:
        # Sağlık kontrolü
        healthy, reason = check_health()
        if not healthy:
            print(f"[{datetime.now()}] STOPPING: {reason}")
            return False
        
        # Bir adım artır
        result = AIFeatureFlagService.gradual_rollout(
            target_percentage=target,
            step=step,
            admin_id=admin_id
        )
        
        current = result['current']
        print(f"[{datetime.now()}] Rollout: {result['previous']}% -> {current}%")
        
        if current >= target:
            break
        
        # Bekle
        print(f"Waiting {wait_seconds}s before next step...")
        time.sleep(wait_seconds)
    
    print("-" * 50)
    print(f"Rollout complete: {current}%")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=int, default=50)
    parser.add_argument("--step", type=int, default=10)
    parser.add_argument("--wait", type=int, default=3600)  # 1 saat
    args = parser.parse_args()
    
    gradual_rollout(args.target, args.step, args.wait)
```

---

## Monitoring & Alerting

### Prometheus Metrics

```python
# app/utils/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# AI Request metrics
ai_requests_total = Counter(
    'ai_requests_total',
    'Total AI requests',
    ['feature', 'status', 'is_mock']
)

ai_request_latency = Histogram(
    'ai_request_latency_seconds',
    'AI request latency',
    ['feature']
)

ai_tokens_used = Counter(
    'ai_tokens_used_total',
    'Total tokens used',
    ['model', 'type']  # type: input/output
)

ai_cost_usd = Counter(
    'ai_cost_usd_total',
    'Total AI cost in USD',
    ['model']
)

ai_circuit_breaker_state = Gauge(
    'ai_circuit_breaker_state',
    'Circuit breaker state (0=closed, 1=half_open, 2=open)'
)

ai_rollout_percentage = Gauge(
    'ai_rollout_percentage',
    'Current rollout percentage'
)
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "AI Production Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {"expr": "rate(ai_requests_total[5m])"}
        ]
      },
      {
        "title": "Latency P95",
        "type": "graph",
        "targets": [
          {"expr": "histogram_quantile(0.95, rate(ai_request_latency_seconds_bucket[5m]))"}
        ]
      },
      {
        "title": "Daily Cost",
        "type": "stat",
        "targets": [
          {"expr": "sum(increase(ai_cost_usd_total[24h]))"}
        ]
      },
      {
        "title": "Circuit Breaker",
        "type": "stat",
        "targets": [
          {"expr": "ai_circuit_breaker_state"}
        ]
      }
    ]
  }
}
```

### Alert Rules

```yaml
# prometheus/alerts/ai.yml
groups:
  - name: ai_alerts
    rules:
      # Yüksek hata oranı
      - alert: AIHighErrorRate
        expr: rate(ai_requests_total{status="error"}[5m]) / rate(ai_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "AI error rate above 5%"
      
      # Circuit breaker açık
      - alert: AICircuitBreakerOpen
        expr: ai_circuit_breaker_state == 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "AI circuit breaker is OPEN"
      
      # Bütçe uyarısı
      - alert: AIBudgetWarning
        expr: sum(increase(ai_cost_usd_total[24h])) > 40  # $50 günlük bütçenin %80'i
        labels:
          severity: warning
        annotations:
          summary: "AI daily budget at 80%"
      
      # Yüksek latency
      - alert: AIHighLatency
        expr: histogram_quantile(0.95, rate(ai_request_latency_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "AI P95 latency above 5 seconds"
```

---

## Rollback Prosedürü

### Acil Durum: Kill Switch

```python
# Anında tüm AI'yı kapat
from app.services.ai_feature_flags import AIFeatureFlagService

AIFeatureFlagService.activate_kill_switch(
    reason="Production incident - high error rate",
    admin_id=1
)
```

### Normal Rollback: Yüzde Düşürme

```python
# Yüzdeyi azalt
AIFeatureFlagService.set_rollout_stage(
    stage=RolloutStage.CANARY,
    percentage=5,
    admin_id=1
)
```

### Mock'a Dönüş

```bash
# Environment değiştir
AI_PROVIDER=mock
AI_ROLLOUT_STAGE=disabled
```

### Rollback Karar Kriterleri

| Metrik | Eşik | Aksiyon |
|--------|------|---------|
| Hata oranı | >5% | Kill switch |
| P95 Latency | >10s | Yüzde azalt |
| Günlük maliyet | >$60 | Yüzde azalt |
| Circuit breaker | OPEN >5dk | Kill switch |

---

## Checklist

### Pre-Deployment

- [ ] OpenAI API key alındı ve test edildi
- [ ] Budget limitleri belirlendi
- [ ] Monitoring dashboard hazır
- [ ] Alert rules tanımlandı
- [ ] Rollback prosedürü dokümante edildi
- [ ] Team bilgilendirildi

### Internal Test (3-5 gün)

- [ ] Admin/staff ile test yapıldı
- [ ] Tüm AI özellikleri çalışıyor
- [ ] Error handling düzgün
- [ ] Logging doğru
- [ ] Latency kabul edilebilir (<3s)

### Canary (5%, 1 hafta)

- [ ] %5 kullanıcıya açıldı
- [ ] Metrikler izleniyor
- [ ] Kullanıcı şikayeti yok
- [ ] Maliyet beklenen aralıkta

### Beta (25%, 1 hafta)

- [ ] %25'e yükseltildi
- [ ] Feedback toplandı
- [ ] Performance stabil
- [ ] Cost/request optimize

### General Availability

- [ ] %100'e açıldı
- [ ] Dokümantasyon güncellendi
- [ ] Kullanıcılara duyuruldu
- [ ] Support team hazır

---

## Komut Referansı

### CLI Komutları

```bash
# Rollout durumunu gör
flask ai-status

# Kill switch aktif et
flask ai-kill --reason "Emergency"

# Kill switch kapat
flask ai-resume

# Rollout yüzdesi değiştir
flask ai-rollout --percentage 25

# Maliyet raporu
flask ai-cost-report --days 7
```

### API Endpoints (Admin)

```bash
# Status
GET /api/v1/admin/ai/status

# Kill switch
POST /api/v1/admin/ai/kill-switch
DELETE /api/v1/admin/ai/kill-switch

# Rollout
PUT /api/v1/admin/ai/rollout
{"stage": "gradual", "percentage": 25}

# Feature toggle
PUT /api/v1/admin/ai/features/{feature_name}/enable
PUT /api/v1/admin/ai/features/{feature_name}/disable

# Cost report
GET /api/v1/admin/ai/cost-report?days=7
```

---

## Sorun Giderme

### Problem: Circuit Breaker Sürekli Açılıyor

**Olası Nedenler:**
1. OpenAI API key geçersiz
2. Rate limit aşıldı
3. Network sorunu

**Çözüm:**
```python
# Client'ı sıfırla
from app.services.ai_client import reset_ai_client
reset_ai_client()

# Circuit breaker'ı manuel sıfırla
client = get_ai_client()
client._circuit_breaker.reset()
```

### Problem: Yüksek Maliyet

**Çözümler:**
1. Model değiştir (gpt-4o-mini daha ucuz)
2. Max tokens azalt
3. Cache ekle
4. Yüzdeyi düşür

```bash
# Daha ucuz model
AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=500
```

### Problem: Yavaş Yanıt

**Çözümler:**
1. Timeout değerlerini kontrol et
2. Streaming kullan
3. Prompt'ları kısalt

---

**Son Güncelleme:** 2024-01-15
**Versiyon:** 1.0
