# 🔐 Authentication & Security Guide

## İçindekiler

1. [JWT Token Yapısı](#jwt-token-yapısı)
2. [Kullanıcı Giriş Akışı](#kullanıcı-giriş-akışı)
3. [Token Blacklist Sistemi](#token-blacklist-sistemi)
4. [RBAC Yetkilendirme](#rbac-yetkilendirme)
5. [Güvenlik Önlemleri](#güvenlik-önlemleri)
6. [API Kullanım Örnekleri](#api-kullanım-örnekleri)

---

## JWT Token Yapısı

### Token Çifti (Access + Refresh)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TOKEN PAİR                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────┐    ┌─────────────────────────────────┐ │
│  │    ACCESS TOKEN         │    │      REFRESH TOKEN              │ │
│  ├─────────────────────────┤    ├─────────────────────────────────┤ │
│  │ Süre: 15-60 dakika      │    │ Süre: 7-30 gün                  │ │
│  │ Kullanım: API erişimi   │    │ Kullanım: Access yenileme       │ │
│  │ Saklama: Memory/State   │    │ Saklama: HttpOnly Cookie        │ │
│  └─────────────────────────┘    └─────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Token Payload (Claims)

```python
{
    # Standart JWT Claims
    "sub": "user_id",           # Kullanıcı ID
    "iat": 1699999999,          # Token oluşturma zamanı
    "exp": 1700000999,          # Token bitiş zamanı
    "jti": "unique-token-id",   # Unique token identifier
    "type": "access",           # Token tipi (access/refresh)
    "fresh": true,              # Taze login mi?
    
    # Custom Claims
    "role": "admin",            # Kullanıcı rolü
    "permissions": [            # İzinler listesi
        "user:read",
        "user:write",
        "course:manage"
    ],
    "token_version": 1,         # Mass invalidation için
    "device_id": "device-xyz",  # Cihaz takibi
}
```

---

## Kullanıcı Giriş Akışı

### 1️⃣ Login Request

```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "remember_me": true,
    "device_id": "optional-device-identifier"
}
```

### 2️⃣ Server Tarafı İşlemler

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        LOGIN AKIŞI                                        │
└──────────────────────────────────────────────────────────────────────────┘

Client                      Server                          Database/Redis
   │                           │                                   │
   │  1. POST /login           │                                   │
   │  {email, password}        │                                   │
   │ ─────────────────────────>│                                   │
   │                           │                                   │
   │                           │  2. Email ile kullanıcı bul       │
   │                           │ ─────────────────────────────────>│
   │                           │                                   │
   │                           │  3. Kullanıcı verisi              │
   │                           │ <─────────────────────────────────│
   │                           │                                   │
   │                           │  4. bcrypt.verify(password, hash) │
   │                           │  ┌─────────────────────────────┐  │
   │                           │  │ Timing-safe karşılaştırma   │  │
   │                           │  │ Constant-time execution     │  │
   │                           │  └─────────────────────────────┘  │
   │                           │                                   │
   │                           │  5. Token version kontrolü        │
   │                           │ ─────────────────────────────────>│
   │                           │                                   │
   │                           │  6. Token pair oluştur            │
   │                           │  ┌─────────────────────────────┐  │
   │                           │  │ access_token (15-60 dk)     │  │
   │                           │  │ refresh_token (7-30 gün)    │  │
   │                           │  │ + claims (role, permissions)│  │
   │                           │  └─────────────────────────────┘  │
   │                           │                                   │
   │                           │  7. Session kaydet (Redis)        │
   │                           │ ─────────────────────────────────>│
   │                           │                                   │
   │                           │  8. Audit log                     │
   │                           │ ─────────────────────────────────>│
   │                           │                                   │
   │  9. Token response        │                                   │
   │ <─────────────────────────│                                   │
   │                           │                                   │

```

### 3️⃣ Başarılı Login Response

```json
{
    "success": true,
    "message": "Giriş başarılı",
    "data": {
        "user": {
            "id": "uuid-here",
            "email": "user@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "role": "student"
        },
        "tokens": {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "Bearer",
            "expires_in": 900,
            "refresh_expires_in": 604800
        }
    }
}
```

---

## Token Blacklist Sistemi

### Redis Tabanlı Blacklist

```
┌────────────────────────────────────────────────────────────────────────┐
│                     TOKEN BLACKLIST SİSTEMİ                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Redis Key Patterns:                                                   │
│  ├── token:blacklist:{jti}     → İptal edilen token                   │
│  ├── token:version:{user_id}   → Kullanıcının token versiyonu         │
│  └── token:sessions:{user_id}  → Aktif oturumlar (Set)                │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Token Doğrulama Akışı                                           │ │
│  │                                                                   │ │
│  │  1. JWT imza kontrolü (HMAC-SHA256)                              │ │
│  │  2. Token süresi kontrolü (exp claim)                            │ │
│  │  3. Blacklist kontrolü (Redis lookup)                            │ │
│  │  4. Token version kontrolü                                        │ │
│  │  5. Kullanıcı aktiflik kontrolü                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Token Rotation (Refresh)

```
                Token Rotation Akışı
                
    ┌─────────┐      Eski Refresh Token       ┌─────────┐
    │ Client  │ ────────────────────────────> │ Server  │
    └─────────┘                               └────┬────┘
                                                   │
                                                   ▼
                                         ┌─────────────────┐
                                         │ Eski token'ı    │
                                         │ blacklist'e ekle│
                                         └────────┬────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ Yeni token pair │
                                         │ oluştur         │
                                         └────────┬────────┘
                                                  │
    ┌─────────┐      Yeni Token Pair             │
    │ Client  │ <────────────────────────────────┘
    └─────────┘
```

---

## RBAC Yetkilendirme

### Rol Hiyerarşisi

```
                    Rol Hiyerarşisi
                    
        ┌───────────────────────────────┐
        │        super_admin            │  Level: 100
        │   (Tüm yetkiler + sistem)     │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │           admin               │  Level: 80
        │   (Kullanıcı + içerik yönetim)│
        └───────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │          teacher              │  Level: 50
        │   (Kurs oluşturma + sınav)    │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │          student              │  Level: 20
        │   (Kurs alma + profil)        │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │           guest               │  Level: 0
        │   (Sadece okuma)              │
        └───────────────────────────────┘
```

### Permission Örnekleri

```python
# Kullanıcı Yetkileri
USER_READ       = "user:read"
USER_WRITE      = "user:write"
USER_DELETE     = "user:delete"

# Kurs Yetkileri
COURSE_CREATE   = "course:create"
COURSE_MANAGE   = "course:manage"
COURSE_ENROLL   = "course:enroll"

# Admin Yetkileri
ADMIN_ACCESS    = "admin:access"
SYSTEM_CONFIG   = "system:config"
```

### Decorator Kullanımı

```python
from app.core.auth import (
    require_auth,
    require_role,
    require_permission,
    require_fresh_auth,
    require_owner_or_role
)

# Sadece giriş yapmış kullanıcı
@require_auth
def get_profile():
    pass

# Belirli rol gerekli
@require_role('admin', 'teacher')
def manage_courses():
    pass

# Belirli izin gerekli
@require_permission('course:create')
def create_course():
    pass

# Fresh token gerekli (hassas işlemler)
@require_fresh_auth
def change_password():
    pass

# Kaynak sahibi veya admin
@require_owner_or_role('admin')
def edit_resource():
    pass
```

---

## Güvenlik Önlemleri

### 🛡️ Implemented Security Features

| Özellik | Açıklama | Korunan Saldırı |
|---------|----------|-----------------|
| **bcrypt Password Hashing** | Adaptive cost factor (12 rounds) | Rainbow table, brute force |
| **Timing-safe Comparison** | Constant-time password check | Timing attacks |
| **Token Blacklist** | Redis-backed revocation | Token theft |
| **Token Rotation** | Refresh token tek kullanımlık | Token reuse |
| **Token Versioning** | Mass invalidation | Account takeover |
| **Rate Limiting** | Request throttling | Brute force, DDoS |
| **Fresh Token** | Sensitive ops için yeni login | Session hijacking |
| **Device Tracking** | Multi-device session management | Unauthorized access |
| **Audit Logging** | Tüm auth işlemleri loglanır | Forensics |

### Şifre Gereksinimleri

```python
def validate_password_strength(password):
    """
    - Minimum 8 karakter
    - Maksimum 128 karakter
    - En az 1 büyük harf (A-Z)
    - En az 1 küçük harf (a-z)
    - En az 1 rakam (0-9)
    - En az 1 özel karakter (!@#$%^&*...)
    - Yaygın şifreler yasak
    """
```

### JWT Güvenlik Konfigürasyonu

```python
# .env
JWT_SECRET_KEY=<256-bit-random-key>
JWT_ACCESS_TOKEN_EXPIRES=900        # 15 dakika
JWT_REFRESH_TOKEN_EXPIRES=604800    # 7 gün
JWT_ALGORITHM=HS256                 # HMAC-SHA256
JWT_TOKEN_LOCATION=["headers"]      # Bearer token
```

---

## API Kullanım Örnekleri

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "first_name": "Ali",
    "last_name": "Yılmaz"
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "remember_me": true
}
```

### Protected Endpoint Erişimi

```http
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Yenileme

```http
POST /api/v1/auth/refresh
Authorization: Bearer <refresh_token>
```

### Logout (Mevcut Cihaz)

```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

### Tüm Cihazlardan Çıkış

```http
POST /api/v1/auth/logout-all
Authorization: Bearer <access_token>
```

### Aktif Oturumları Görüntüleme

```http
GET /api/v1/auth/sessions
Authorization: Bearer <access_token>
```

### Belirli Oturumu Sonlandırma

```http
DELETE /api/v1/auth/sessions/{session_id}
Authorization: Bearer <access_token>
```

---

## Hata Kodları

| Kod | Açıklama | HTTP Status |
|-----|----------|-------------|
| `INVALID_CREDENTIALS` | Yanlış email/şifre | 401 |
| `ACCOUNT_DISABLED` | Hesap devre dışı | 403 |
| `TOKEN_EXPIRED` | Token süresi dolmuş | 401 |
| `TOKEN_INVALID` | Geçersiz token | 401 |
| `TOKEN_REVOKED` | Token iptal edilmiş | 401 |
| `FRESH_TOKEN_REQUIRED` | Yeni login gerekli | 401 |
| `INSUFFICIENT_PERMISSIONS` | Yetki yetersiz | 403 |
| `WEAK_PASSWORD` | Şifre güçlü değil | 400 |

---

## Best Practices

### Client Tarafı

1. **Access token'ı memory'de sakla** (localStorage'da DEĞİL)
2. **Refresh token'ı HttpOnly cookie'de sakla**
3. **Token yenileme işlemini otomatik yap**
4. **Logout'ta tüm token'ları temizle**

### Server Tarafı

1. **HTTPS zorunlu** (production'da)
2. **Rate limiting aktif**
3. **CORS konfigürasyonu doğru ayarla**
4. **Sensitive işlemlerde fresh token iste**
5. **Audit log'ları düzenli incele**

---

*Bu dokümantasyon Öğrenci Yönetim Sistemi v2.0 için hazırlanmıştır.*
