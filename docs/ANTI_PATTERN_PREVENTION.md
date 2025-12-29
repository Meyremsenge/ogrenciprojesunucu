# 🛡️ Anti-Pattern & Risk Önleme Kılavuzu

Bu dokümantasyon, projede potansiyel güvenlik açıkları, performans sorunları ve mimari hataları önlemek için oluşturulan koruma mekanizmalarını açıklar.

## 📁 Oluşturulan Modüller

| Modül | Konum | Açıklama |
|-------|-------|----------|
| Security Checks | `app/core/security_checks.py` | Güvenlik açıkları önleme |
| Performance Guards | `app/core/performance_guards.py` | Performans sorunları tespiti |
| Authorization Guards | `app/core/authorization_guards.py` | Yetkilendirme zaafları önleme |
| Database Guards | `app/core/database_guards.py` | Veritabanı tasarım hataları |
| Security Middleware | `app/middleware/security_middleware.py` | Tüm kontrolleri birleştiren middleware |

---

## 🔐 1. Güvenlik Açıkları

### 1.1 Secret Key Güvenliği

**Risk:** Zayıf veya hardcoded secret key'ler JWT token'ların kırılmasına yol açar.

**Çözüm:**
```python
from app.core import SecretKeyValidator

# Production'da kontrol
issues = SecretKeyValidator.check_production_secrets()
if issues:
    raise SecurityError("Güvenlik sorunu tespit edildi")
```

### 1.2 SQL Injection Koruması

**Risk:** Raw SQL ve string interpolation veritabanı ele geçirmesine yol açar.

**Çözüm:**
```python
from app.core import SQLInjectionGuard

# Girdi kontrolü
user_input = request.args.get('search')
if SQLInjectionGuard.check_for_injection(user_input):
    raise ValidationError("Geçersiz karakter")

# Temizleme
safe_input = SQLInjectionGuard.sanitize_input(user_input)
```

### 1.3 XSS (Cross-Site Scripting) Koruması

**Risk:** Kullanıcı girdilerinin sanitize edilmeden render edilmesi JavaScript injection'a yol açar.

**Çözüm:**
```python
from app.core import XSSGuard

# Kontrol
if XSSGuard.check_for_xss(user_input):
    raise ValidationError("Geçersiz karakter")

# Temizleme
safe_html = XSSGuard.sanitize_html(user_input)
```

### 1.4 Brute Force Koruması

**Risk:** Sınırsız login denemesi şifre kırma saldırılarına izin verir.

**Çözüm:**
```python
from app.core import BruteForceProtection

# Login denemesi öncesi kontrol
is_locked, remaining = BruteForceProtection.is_locked(user_ip)
if is_locked:
    return error_response(f"{remaining} saniye bekleyin", 429)

# Başarısız deneme kaydet
BruteForceProtection.record_attempt(user_ip, success=False)

# Başarılı login - sayacı sıfırla
BruteForceProtection.record_attempt(user_ip, success=True)
```

### 1.5 Hassas Veri Maskeleme

**Risk:** Şifrelerin ve kişisel verilerin loglara yazılması.

**Çözüm:**
```python
from app.core import SensitiveDataMasker

# Log öncesi maskele
masked_data = SensitiveDataMasker.mask_dict(request_data)
logger.info("Request data", extra=masked_data)

# E-posta maskeleme
masked_email = SensitiveDataMasker.mask_email("user@example.com")
# Sonuç: "u**r@example.com"
```

---

## ⚡ 2. Performans Sorunları

### 2.1 N+1 Query Problemi

**Risk:** Her kayıt için ayrı SQL sorgusu çalıştırmak veritabanını zorlar.

**Çözüm:**
```python
from app.core import QueryMonitor

# Request başında
QueryMonitor.start_request()

# ... işlemler ...

# Request sonunda istatistikler
stats = QueryMonitor.end_request()
if stats['potential_n_plus_one']:
    logger.warning("N+1 query tespit edildi")
```

### 2.2 Cache Stratejisi

**Risk:** Cache kullanmamak veritabanına gereksiz yük bindirir.

**Çözüm:**
```python
from app.core import cached, CacheHelper

@cached(ttl_seconds=300, key_prefix='users')
def get_user_stats(user_id):
    # Bu fonksiyon 5 dakika cache'lenir
    return expensive_calculation()

# Manuel cache kullanımı
CacheHelper.set('key', value, ttl_seconds=600)
cached_value = CacheHelper.get('key')
```

### 2.3 Büyük Liste İşleme

**Risk:** Büyük listelerin tek seferde işlenmesi memory sorunlarına yol açar.

**Çözüm:**
```python
from app.core import batch_process, MemoryGuard

# Batch işleme
for batch in batch_process(large_list, batch_size=100):
    process_batch(batch)

# Liste boyutu kontrolü
MemoryGuard.check_list_size(result_list, 'users')
```

---

## 🔑 3. Yetkilendirme Zaafları

### 3.1 IDOR (Insecure Direct Object Reference)

**Risk:** Kullanıcıların ID tahmin ederek başkalarının verilerine erişmesi.

**Çözüm:**
```python
from app.core import IDORGuard, require_ownership

# Manuel kontrol
if not IDORGuard.check_ownership(resource, current_user.id):
    raise AuthorizationError("Bu kaynağa erişim yetkiniz yok")

# Decorator ile
@require_ownership(owner_field='user_id', admin_bypass=True)
def update_resource(resource_id):
    # Sadece sahibi veya admin erişebilir
    pass
```

### 3.2 Privilege Escalation

**Risk:** Kullanıcıların kendi yetkilerini yükseltmesi.

**Çözüm:**
```python
from app.core import PrivilegeGuard, prevent_self_elevation

# Rol değişikliği kontrolü
if not PrivilegeGuard.can_modify_role(actor_role, target_current, target_new):
    raise AuthorizationError("Bu rol değişikliğini yapamazsınız")

# Self-elevation önleme
@prevent_self_elevation(target_id_param='user_id')
def update_user_role(user_id):
    # Kullanıcı kendi rolünü değiştiremez
    pass
```

---

## 🗃️ 4. Veritabanı Tasarım Hataları

### 4.1 Index Eksikliği

**Risk:** Foreign key'lerde index olmaması yavaş JOIN'lere yol açar.

**Çözüm:**
```python
from app.core import IndexAnalyzer

# Model analizi
analysis = IndexAnalyzer.analyze_model(User)
for missing in analysis['missing_indexes']:
    print(f"Eksik index: {missing['suggestion']}")
```

### 4.2 Query Optimizasyonu

**Risk:** N+1 query, SELECT *, LIMIT eksikliği.

**Çözüm:**
```python
from app.core import QueryOptimizer

# Eager loading önerileri
suggestions = QueryOptimizer.suggest_eager_loading(Course)
for s in suggestions:
    print(f"Öneri: {s['suggestion']}")

# Optimizasyon ipuçları
tip = QueryOptimizer.get_tip('n_plus_one')
print(tip['solution'])
```

### 4.3 Şema Doğrulama

**Risk:** id, created_at gibi zorunlu alanların eksikliği.

**Çözüm:**
```python
from app.core import SchemaValidator

# Model doğrulama
validation = SchemaValidator.validate_model(User)
if not validation['is_valid']:
    for issue in validation['issues']:
        print(f"Hata: {issue['message']}")
```

---

## 🩺 5. Health Check Endpoint'leri

```bash
# Basit health check
GET /health
# Response: {"status": "healthy", "timestamp": "..."}

# Detaylı health check (admin only)
GET /health/detailed
# Response: Tüm kontrollerin sonuçları
```

---

## 🚀 6. Middleware Entegrasyonu

```python
from app.middleware.security_middleware import (
    register_security_middleware,
    register_health_endpoints,
    run_startup_checks
)

def create_app():
    app = Flask(__name__)
    
    # Security middleware'leri kayıt et
    register_security_middleware(app)
    
    # Health endpoint'leri kayıt et
    register_health_endpoints(app)
    
    # Başlangıç kontrolleri
    with app.app_context():
        results = run_startup_checks(app)
        if results['overall_status'] == 'FAIL':
            logger.critical("Startup checks failed!")
    
    return app
```

---

## 📋 7. Checklist

### Production Deployment Öncesi

- [ ] `SECRET_KEY` en az 32 karakter ve rastgele
- [ ] `JWT_SECRET_KEY` benzersiz ve güvenli
- [ ] `DEBUG = False`
- [ ] HTTPS zorunlu
- [ ] Rate limiting aktif
- [ ] CORS origins kısıtlı
- [ ] Database credentials environment variable'da

### Yeni Endpoint Oluştururken

- [ ] Input validation eklendi mi?
- [ ] Authentication decorator var mı?
- [ ] Authorization kontrolü yapılıyor mu?
- [ ] IDOR koruması var mı?
- [ ] Rate limiting uygulandı mı?
- [ ] Audit logging eklendi mi?

### Yeni Model Oluştururken

- [ ] Primary key var mı?
- [ ] created_at, updated_at alanları var mı?
- [ ] Foreign key'lerde index var mı?
- [ ] Soft delete desteği var mı?
- [ ] Uygun constraint'ler tanımlı mı?

---

## 📞 Hata Bildirimi

Güvenlik açığı tespit ettiyseniz:
1. Detaylı loglayın
2. İlgili kişilere bildirin
3. Önce düzeltmeyi deploy edin
4. Sonra duyurun
