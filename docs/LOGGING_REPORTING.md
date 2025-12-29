# Log, Audit & Raporlama Sistemi

Bu doküman, sistemdeki kapsamlı loglama, audit ve raporlama altyapısını açıklar.

## 🎯 Genel Bakış

Sistem, production-ready bir observability altyapısı sağlar:

- **Audit Logging**: Kim neyi ne zaman yaptı
- **Security Events**: Güvenlik olayları takibi
- **Performance Metrics**: Yanıt süreleri, yavaş istekler
- **Error Logging**: Hata takibi ve deduplication
- **Reporting**: Dashboard ve raporlar

## 📁 Dosya Yapısı

```
app/
├── models/
│   └── audit.py              # Tüm log modelleri
├── services/
│   └── log_service.py        # Log servisleri
├── middleware/
│   └── logging.py            # Request/Response logging
├── modules/
│   └── logs/
│       ├── __init__.py       # Blueprint
│       └── routes.py         # API endpoints
├── tasks/
│   └── cleanup_tasks.py      # Log temizleme görevleri

frontend/src/pages/admin/
├── SecurityLogsPage.tsx      # Güvenlik olayları
├── ErrorLogsPage.tsx         # Hata logları
├── PerformanceMetricsPage.tsx # Performans metrikleri
└── AuditLogsPage.tsx         # Audit logları
```

## 🗄️ Veritabanı Modelleri

### SecurityEvent
Güvenlik olaylarını kaydeder.

```python
class SecurityEventType(enum.Enum):
    LOGIN_SUCCESS = 'login_success'
    LOGIN_FAILED = 'login_failed'
    LOGOUT = 'logout'
    PASSWORD_RESET_REQUEST = 'password_reset_request'
    PASSWORD_CHANGED = 'password_changed'
    ACCOUNT_LOCKED = 'account_locked'
    BRUTE_FORCE_ATTEMPT = 'brute_force_attempt'
    TOKEN_REFRESH = 'token_refresh'
    TOKEN_REVOKED = 'token_revoked'
    PERMISSION_DENIED = 'permission_denied'
    UNAUTHORIZED_ACCESS = 'unauthorized_access'
    SUSPICIOUS_ACTIVITY = 'suspicious_activity'
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'
    SQL_INJECTION_ATTEMPT = 'sql_injection_attempt'
    XSS_ATTEMPT = 'xss_attempt'
    API_KEY_CREATED = 'api_key_created'
    API_KEY_REVOKED = 'api_key_revoked'
    TWO_FACTOR_ENABLED = 'two_factor_enabled'
    TWO_FACTOR_DISABLED = 'two_factor_disabled'
    DATA_EXPORT = 'data_export'
    BULK_OPERATION = 'bulk_operation'
    CONFIG_CHANGED = 'config_changed'
    ADMIN_ACTION = 'admin_action'

class SecuritySeverity(enum.Enum):
    INFO = 'info'
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'
```

### PerformanceMetric
Performans metriklerini kaydeder.

```python
class MetricType(enum.Enum):
    REQUEST = 'request'        # HTTP istekleri
    DATABASE = 'database'      # DB sorguları
    CACHE = 'cache'           # Cache işlemleri
    EXTERNAL_API = 'external_api'  # Dış API çağrıları
    TASK = 'task'             # Celery görevleri
    CUSTOM = 'custom'         # Özel metrikler
```

Alanlar:
- `duration_ms`: İşlem süresi (milisaniye)
- `endpoint`: API endpoint
- `method`: HTTP method
- `status_code`: HTTP durum kodu
- `query_count`: Yapılan DB sorgu sayısı
- `cache_hits`: Cache isabet sayısı
- `cache_misses`: Cache kaçırma sayısı
- `is_slow`: Yavaş istek mi?

### ErrorLog
Uygulama hatalarını kaydeder.

```python
class ErrorSeverity(enum.Enum):
    DEBUG = 'debug'
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'
```

Özellikler:
- **Fingerprinting**: Aynı hatalar gruplanır
- **Occurrence Counting**: Tekrar sayısı takibi
- **Stack Trace**: Detaylı hata izleme
- **Resolution Tracking**: Çözüm durumu

### RequestLog
HTTP isteklerini kaydeder.

### AggregatedMetric
Saatlik/günlük aggregate metrikler (dashboard için).

## 🔧 Servisler

### SecurityService

```python
from app.services.log_service import SecurityService

# Güvenlik olayı kaydet
SecurityService.log_event(
    event_type=SecurityEventType.LOGIN_FAILED,
    user_id=None,
    description="Invalid password",
    details={'email': 'user@example.com', 'attempts': 3},
    severity=SecuritySeverity.MEDIUM
)

# Login başarılı
SecurityService.log_login_success(user_id=1, email='user@example.com')

# Login başarısız
SecurityService.log_login_failed(email='user@example.com', reason='Invalid password')

# Brute force algılandı
SecurityService.log_brute_force(ip_address='192.168.1.1', attempts=10)

# İzinsiz erişim
SecurityService.log_permission_denied(
    user_id=1, 
    resource='admin_panel',
    action='access'
)

# İstatistikler
stats = SecurityService.get_security_stats(days=7)
# {
#   'severity_counts': {'critical': 2, 'high': 5, ...},
#   'event_type_counts': {'login_failed': 15, ...},
#   'unresolved_count': 8,
#   'top_ips': [{'ip': '...', 'count': 10}]
# }

# Olayı çözümle
SecurityService.resolve_event(
    event_id=123,
    resolved_by=1,
    notes="IP blocked in firewall"
)
```

### PerformanceService

```python
from app.services.log_service import PerformanceService

# Request metriği kaydet
PerformanceService.record_request(
    endpoint='/api/v1/users',
    method='GET',
    duration_ms=150.5,
    status_code=200,
    query_count=3,
    cache_hits=2,
    cache_misses=1,
    user_id=1
)

# Genel metrik kaydet
PerformanceService.record_metric(
    metric_type=MetricType.DATABASE,
    name='complex_query',
    duration_ms=500,
    endpoint='/api/v1/reports',
    details={'table': 'users', 'rows': 1000}
)

# İstatistikler
stats = PerformanceService.get_performance_stats(hours=24)
# {
#   'avg_duration_ms': 125.5,
#   'max_duration_ms': 5000,
#   'total_requests': 10000,
#   'slow_requests': 50,
#   'slow_request_rate': 0.5,
#   'error_rate': 1.2
# }
```

### ErrorService

```python
from app.services.log_service import ErrorService, ErrorSeverity

# Hata kaydet (otomatik deduplication)
try:
    risky_operation()
except Exception as e:
    ErrorService.log_error(
        exception=e,
        severity=ErrorSeverity.ERROR,
        tags=['payment', 'stripe'],
        extra_data={'order_id': 123}
    )

# Hata istatistikleri
stats = ErrorService.get_error_stats(days=7)
# {
#   'severity_counts': {'critical': 2, 'error': 15, ...},
#   'most_frequent': [{'error_type': 'ValueError', 'count': 10}],
#   'unresolved_count': 8
# }

# Hatayı çözümle
ErrorService.resolve_error(
    error_id=123,
    resolved_by=1,
    notes="Fixed input validation"
)
```

### ReportingService

```python
from app.services.log_service import ReportingService

# Dashboard istatistikleri
stats = ReportingService.get_dashboard_stats()

# Aktivite zaman çizelgesi
timeline = ReportingService.get_activity_timeline(hours=24)

# Kullanıcı aktivite raporu
report = ReportingService.get_user_activity_report(user_id=1, days=30)

# Sistem raporu
report = ReportingService.generate_system_report(
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 1, 31)
)
```

## 🎨 Dekoratörler

### @track_performance

Fonksiyon performansını otomatik izler.

```python
from app.services.log_service import track_performance

@track_performance('complex_calculation')
def process_report(data):
    # Uzun süren işlem
    return result
```

### @log_errors

Hataları otomatik loglar.

```python
from app.services.log_service import log_errors, ErrorSeverity

@log_errors(severity=ErrorSeverity.CRITICAL, tags=['payment'])
def process_payment(order_id):
    # Kritik işlem
    pass
```

## 🌐 API Endpoints

### Dashboard
```
GET /api/v1/logs/dashboard
GET /api/v1/logs/dashboard/timeline?hours=24
```

### Security Events
```
GET /api/v1/logs/security?severity=high&is_resolved=false
GET /api/v1/logs/security/stats?days=7
GET /api/v1/logs/security/event-types
POST /api/v1/logs/security/:id/resolve
GET /api/v1/logs/export/security
```

### Performance Metrics
```
GET /api/v1/logs/performance?is_slow=true
GET /api/v1/logs/performance/stats?hours=24
GET /api/v1/logs/performance/slow-requests
```

### Error Logs
```
GET /api/v1/logs/errors?severity=error
GET /api/v1/logs/errors/:id
GET /api/v1/logs/errors/stats?days=7
POST /api/v1/logs/errors/:id/resolve
GET /api/v1/logs/export/errors
```

### Audit Logs (Super Admin Only)
```
GET /api/v1/logs/audit?action=delete
GET /api/v1/logs/audit/entity/:type/:id
```

### Reports
```
GET /api/v1/logs/reports/system?start_date=...&end_date=...
GET /api/v1/logs/reports/user/:id?days=30
```

## ⏰ Celery Görevleri

### Log Temizleme

```python
# Request logları (30 gün)
cleanup_old_request_logs.delay(retention_days=30)

# Performans metrikleri (90 gün)
cleanup_old_performance_metrics.delay(retention_days=90)

# Çözümlenmiş hatalar (60 gün sonra)
cleanup_resolved_errors.delay(days_after_resolution=60)

# Çözümlenmiş güvenlik olayları (90 gün sonra)
cleanup_resolved_security_events.delay(days_after_resolution=90)

# Audit logları (365 gün)
cleanup_old_audit_logs.delay(retention_days=365)
```

### Metric Aggregation

```python
# Saatlik aggregate (dashboard için)
aggregate_performance_metrics.delay()

# Günlük rapor
generate_daily_log_report.delay()
```

### Celery Beat Zamanlaması

```python
# celeryconfig.py'e ekleyin:
beat_schedule = {
    'cleanup-request-logs': {
        'task': 'app.tasks.cleanup_tasks.cleanup_old_request_logs',
        'schedule': crontab(hour=3, minute=0),  # Her gün 03:00
    },
    'cleanup-performance-metrics': {
        'task': 'app.tasks.cleanup_tasks.cleanup_old_performance_metrics',
        'schedule': crontab(hour=4, minute=0, day_of_week=0),  # Pazar 04:00
    },
    'aggregate-metrics': {
        'task': 'app.tasks.cleanup_tasks.aggregate_performance_metrics',
        'schedule': crontab(minute=0),  # Her saat başı
    },
    'daily-log-report': {
        'task': 'app.tasks.cleanup_tasks.generate_daily_log_report',
        'schedule': crontab(hour=7, minute=0),  # Her gün 07:00
    },
}
```

## 📊 Yavaş İstek Eşikleri

```python
# app/services/log_service.py
SLOW_THRESHOLDS = {
    MetricType.REQUEST: 1000,      # 1 saniye
    MetricType.DATABASE: 500,      # 500ms
    MetricType.CACHE: 100,         # 100ms
    MetricType.EXTERNAL_API: 3000, # 3 saniye
    MetricType.TASK: 30000,        # 30 saniye
    MetricType.CUSTOM: 1000,       # 1 saniye
}
```

## 🔒 Güvenlik

### Erişim Kontrolü

| Endpoint | Admin | Super Admin |
|----------|-------|-------------|
| Security Events | ✅ | ✅ |
| Error Logs | ✅ | ✅ |
| Performance Metrics | ✅ | ✅ |
| Audit Logs | ❌ | ✅ |
| System Reports | ❌ | ✅ |
| Export | ❌ | ✅ |

### Hassas Veri Filtreleme

Log'larda hassas veriler otomatik filtrelenir:
- Parolalar
- Token'lar
- Kredi kartı numaraları

## 🚀 Kurulum

### 1. Migration

```bash
flask db migrate -m "Add logging tables"
flask db upgrade
```

### 2. Blueprint Kaydı

```python
# app/api/v1/__init__.py
from app.modules.logs import logs_bp
app.register_blueprint(logs_bp, url_prefix='/api/v1/logs')
```

### 3. Middleware Aktifleştirme

Middleware otomatik olarak `app/__init__.py`'de aktiftir.

## 📈 Monitoring Best Practices

### 1. Alert Kuralları

```python
# Kritik güvenlik olayı -> Anlık bildirim
if event.severity == SecuritySeverity.CRITICAL:
    send_slack_alert(event)
    send_email_to_admins(event)

# Yüksek hata oranı -> Uyarı
if error_rate > 5:  # %5 üzeri
    trigger_alert('High error rate detected')

# Yavaş istek oranı -> Uyarı
if slow_rate > 10:  # %10 üzeri
    trigger_alert('Performance degradation detected')
```

### 2. Dashboard Metrikleri

- **Real-time**: Son 5 dakika
- **Hourly**: Saatlik trend
- **Daily**: Günlük özet
- **Weekly**: Haftalık karşılaştırma

### 3. Log Retention Politikası

| Log Tipi | Retention | Aggregate |
|----------|-----------|-----------|
| Request Logs | 30 gün | Saatlik |
| Performance Metrics | 90 gün | Günlük |
| Error Logs | 60 gün (resolved) | - |
| Security Events | 90-180 gün | - |
| Audit Logs | 365 gün | - |

## 🐛 Troubleshooting

### Log tabloları çok büyüyor
- Retention sürelerini azaltın
- Cleanup task'larının çalıştığından emin olun
- Partition kullanmayı düşünün

### Yavaş dashboard sorguları
- Aggregated metrikleri kullanın
- Index'leri kontrol edin
- Tarih aralığını sınırlayın

### Çok fazla error log
- Fingerprint ile gruplamayı kontrol edin
- Log severity seviyelerini ayarlayın
- Rate limiting uygulayın

## 📚 İlgili Dökümanlar

- [ARCHITECTURE.md](ARCHITECTURE.md) - Sistem mimarisi
- [AUTHENTICATION_SECURITY.md](AUTHENTICATION_SECURITY.md) - Güvenlik
- [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) - Teknik detaylar
