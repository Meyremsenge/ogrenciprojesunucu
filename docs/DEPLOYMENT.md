# 🚀 Deployment Guide

Bu dokümantasyon, Öğrenci Sistemi Flask uygulamasının production ortamına deploy edilmesi için gerekli tüm bilgileri içerir.

## 📋 İçindekiler

1. [Gereksinimler](#gereksinimler)
2. [Hızlı Başlangıç](#hızlı-başlangıç)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Konfigürasyon](#konfigürasyon)
6. [SSL/TLS Kurulumu](#ssltls-kurulumu)
7. [Veritabanı Yönetimi](#veritabanı-yönetimi)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Bakım & Operasyon](#bakım--operasyon)
10. [Sorun Giderme](#sorun-giderme)

---

## Gereksinimler

### Sistem Gereksinimleri

| Bileşen | Minimum | Önerilen |
|---------|---------|----------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 40 GB SSD | 100+ GB SSD |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |

### Yazılım Gereksinimleri

- Docker 24.0+
- Docker Compose 2.20+
- Git 2.30+
- (Opsiyonel) kubectl 1.28+ (Kubernetes için)

---

## Hızlı Başlangıç

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/your-org/ogrenci-sistemi.git
cd ogrenci-sistemi
```

### 2. Environment Dosyasını Hazırlayın

```bash
cp .env.production.template .env.production
nano .env.production
```

**Kritik değişkenler:**
- `SECRET_KEY` - Güçlü rastgele key
- `JWT_SECRET_KEY` - Farklı rastgele key
- `DATABASE_PASSWORD` - PostgreSQL şifresi
- `REDIS_PASSWORD` - Redis şifresi

### 3. Deploy Edin

```bash
chmod +x scripts/*.sh
./scripts/deploy.sh full
```

---

## Docker Deployment

### Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx                                 │
│            (Load Balancer + SSL Termination)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│    API-1      │ │    API-2      │ │   Frontend    │
│  (Gunicorn)   │ │  (Gunicorn)   │ │   (Static)    │
└───────┬───────┘ └───────┬───────┘ └───────────────┘
        │                 │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│PostgreSQL│ │  Redis  │ │ Celery  │
│   15    │ │    7    │ │ Worker  │
└─────────┘ └─────────┘ └─────────┘
```

### Production Docker Compose

```bash
# Tüm servisleri başlat
docker-compose -f docker-compose.prod.yml up -d

# Logları izle
docker-compose -f docker-compose.prod.yml logs -f

# Servis durumunu kontrol et
docker-compose -f docker-compose.prod.yml ps
```

### Container Konfigürasyonu

#### Gunicorn Workers

```python
# gunicorn.conf.py
workers = (CPU_CORES * 2) + 1  # Örn: 4 core = 9 worker
worker_class = 'gevent'         # Async I/O
worker_connections = 1000       # Worker başına bağlantı
max_requests = 10000            # Memory leak önleme
timeout = 120                   # Request timeout
```

#### PostgreSQL Tuning

```yaml
# docker-compose.prod.yml
command:
  - postgres
  - -c
  - max_connections=200
  - -c
  - shared_buffers=512MB
  - -c
  - effective_cache_size=1536MB
  - -c
  - work_mem=16MB
```

#### Redis Konfigürasyonu

```yaml
command:
  - redis-server
  - --maxmemory
  - 512mb
  - --maxmemory-policy
  - allkeys-lru
```

---

## Kubernetes Deployment

### Cluster Hazırlığı

```bash
# Namespace oluştur
kubectl apply -f k8s/namespace.yaml

# Secrets oluştur (önce düzenleyin!)
kubectl apply -f k8s/secrets.yaml

# ConfigMap uygula
kubectl apply -f k8s/configmap.yaml
```

### Uygulama Deploy

```bash
# Sırasıyla uygula
kubectl apply -f k8s/pvc.yaml
kubectl apply -f k8s/serviceaccount.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/networkpolicy.yaml
kubectl apply -f k8s/poddisruptionbudget.yaml
```

### Tek Komutla Deploy

```bash
kubectl apply -f k8s/
```

### HPA (Horizontal Pod Autoscaler)

```yaml
# CPU %70 üzerinde scale up
# Memory %80 üzerinde scale up
# Min: 3, Max: 20 replica
```

### Monitoring

```bash
# Pod durumları
kubectl get pods -n ogrenci-sistemi

# HPA durumu
kubectl get hpa -n ogrenci-sistemi

# Loglar
kubectl logs -f deployment/api -n ogrenci-sistemi
```

---

## Konfigürasyon

### Environment Değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `FLASK_ENV` | Çalışma ortamı | production |
| `SECRET_KEY` | Flask secret key | - |
| `JWT_SECRET_KEY` | JWT imza key | - |
| `DATABASE_URL` | PostgreSQL URL | - |
| `REDIS_URL` | Redis URL | - |
| `CELERY_BROKER_URL` | Celery broker | Redis |

### Güvenlik Ayarları

```bash
# .env.production
CORS_ORIGINS=https://ogrenci-sistemi.com
RATE_LIMIT_DEFAULT=100/minute
RATE_LIMIT_AUTH=20/minute
JWT_ACCESS_TOKEN_EXPIRES=3600
SESSION_COOKIE_SECURE=true
```

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Genel API | 100/dakika |
| Auth endpoints | 20/dakika |
| Email gönderimi | 100/dakika |
| YouTube API | 30/dakika |

---

## SSL/TLS Kurulumu

### Let's Encrypt (Production)

```bash
# SSL dizinlerini hazırla
./scripts/ssl-renew.sh init

# Sertifika al (önce staging ile test edin)
./scripts/ssl-renew.sh request --staging

# Production sertifika
./scripts/ssl-renew.sh request
```

### Otomatik Yenileme

```bash
# Cron job kur
./scripts/ssl-renew.sh auto-renew

# Manuel yenileme
./scripts/ssl-renew.sh renew
```

### Self-Signed (Development)

```bash
./scripts/ssl-renew.sh self-signed
```

---

## Veritabanı Yönetimi

### Migrations

```bash
# Migration oluştur
docker-compose exec api flask db migrate -m "Add new table"

# Migration uygula
docker-compose exec api flask db upgrade

# Rollback
docker-compose exec api flask db downgrade
```

### Backup

```bash
# Manuel backup
./scripts/backup.sh backup

# S3'e yükle
./scripts/backup.sh full

# Backupları listele
./scripts/backup.sh list

# Restore
./scripts/backup.sh restore backup_ogrenci_db_20240115_030000.sql.gz
```

### Backup Stratejisi

| Tip | Sıklık | Retention |
|-----|--------|-----------|
| Full backup | Günlük 03:00 | 30 gün |
| S3 backup | Günlük | 90 gün |
| Point-in-time | Sürekli | 7 gün |

---

## Monitoring & Alerting

### Health Checks

```bash
# Tüm kontrolleri çalıştır
./scripts/health-check.sh all

# Sadece API
./scripts/health-check.sh api

# Sistem kaynakları
./scripts/health-check.sh resources
```

### Health Endpoints

| Endpoint | Açıklama |
|----------|----------|
| `/health` | Genel sağlık durumu |
| `/health/ready` | Readiness probe |
| `/health/live` | Liveness probe |
| `/metrics` | Prometheus metrics |

### Slack Alerting

```bash
export SLACK_WEBHOOK="https://hooks.slack.com/services/xxx"
./scripts/health-check.sh all
```

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'ogrenci-sistemi'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'
```

---

## Bakım & Operasyon

### Rolling Update

```bash
# Sıfır kesinti ile güncelleme
./scripts/deploy.sh update
```

### Servis Yönetimi

```bash
# Durumu görüntüle
./scripts/deploy.sh status

# Logları izle
./scripts/deploy.sh logs api-1

# Restart
./scripts/deploy.sh restart

# Durdur
./scripts/deploy.sh stop
```

### Cleanup

```bash
# Kullanılmayan kaynakları temizle
./scripts/deploy.sh cleanup
```

### Scheduled Tasks (Celery Beat)

| Task | Sıklık | Açıklama |
|------|--------|----------|
| cleanup-expired-tokens | Saatlik | Expired JWT temizliği |
| aggregate-performance-metrics | Saatlik | Performans metrik toplama |
| cleanup-request-logs | Günlük 03:00 | 30 günlük log temizliği |
| kvkk-anonymize-ai-sessions | Günlük 02:00 | KVKK uyumlu anonimleştirme |
| cleanup-performance-metrics | Haftalık | 90 günlük metrik temizliği |
| cleanup-audit-logs | Aylık | 1 yıllık audit log temizliği |

---

## Sorun Giderme

### Yaygın Sorunlar

#### API Yanıt Vermiyor

```bash
# Container durumunu kontrol et
docker-compose ps

# Logları incele
docker-compose logs api-1 --tail=100

# Health check
curl http://localhost/health
```

#### Database Bağlantı Hatası

```bash
# PostgreSQL durumu
docker-compose exec postgres pg_isready -U postgres

# Connection sayısı
docker-compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Redis Memory Full

```bash
# Memory kullanımı
docker-compose exec redis redis-cli info memory

# Key sayısı
docker-compose exec redis redis-cli dbsize

# Cache temizle
docker-compose exec redis redis-cli flushdb
```

#### Celery Worker Çalışmıyor

```bash
# Worker durumu
docker-compose exec celery celery -A celery_worker.celery inspect active

# Queue durumu
docker-compose exec celery celery -A celery_worker.celery inspect reserved
```

### Log Analizi

```bash
# API hataları
docker-compose logs api-1 2>&1 | grep -i error

# Slow queries
docker-compose logs postgres | grep "duration:"

# Failed tasks
docker-compose logs celery | grep -i "task.*failed"
```

### Performance Debugging

```bash
# Container kaynak kullanımı
docker stats

# Database slow queries
docker-compose exec postgres psql -U postgres -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';
"
```

---

## Ek Kaynaklar

- [Architecture Documentation](./ARCHITECTURE.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [Authentication & Security](./AUTHENTICATION_SECURITY.md)
- [Scaling Guide](./SCALING.md)
- [Coding Standards](./CODING_STANDARDS.md)

---

## Checklist

### Pre-Deployment

- [ ] `.env.production` dosyası hazırlandı
- [ ] Tüm secret'lar güçlü değerlerle ayarlandı
- [ ] SSL sertifikaları hazır
- [ ] Backup stratejisi belirlendi
- [ ] Monitoring/alerting kuruldu

### Post-Deployment

- [ ] Health check başarılı
- [ ] SSL sertifikası geçerli
- [ ] Database migration'lar uygulandı
- [ ] Celery worker'lar çalışıyor
- [ ] İlk backup alındı
- [ ] Monitoring dashboard'u kontrol edildi

---

## Destek

Sorunlar için:
1. Bu dokümantasyonu inceleyin
2. Log dosyalarını kontrol edin
3. Health check script'ini çalıştırın
4. Issue açın (gerekirse)
