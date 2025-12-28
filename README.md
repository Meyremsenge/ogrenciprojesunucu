# Öğrenci Koçluk Sistemi

Ticari nitelikte, Flask ve PostgreSQL kullanılarak geliştirilmiş bir öğrenci koçluk uygulaması.

## 📋 Özellikler

- **Çoklu Kullanıcı Rolleri**: Öğrenci, Öğretmen, Admin, Süper Admin
- **Kurs Yönetimi**: Kurslar, konular, içerikler
- **Video Entegrasyonu**: YouTube unlisted video gömme ve ilerleme takibi
- **Soru Bankası**: Çoktan seçmeli, doğru-yanlış, açık uçlu sorular
- **Sınav Sistemi**: Zamanlı sınavlar, otomatik değerlendirme, çoklu deneme
- **Öğrenci Değerlendirme**: Performans takibi, raporlama, analitik
- **JWT Kimlik Doğrulama**: Güvenli erişim ve yetkilendirme

## 🏗️ Mimari

```
ÖğrenciSistemi/
├── app/
│   ├── __init__.py          # Flask uygulama fabrikası
│   ├── config.py             # Yapılandırma sınıfları
│   ├── extensions.py         # Flask eklentileri
│   ├── api/                  # API endpoint'leri
│   │   ├── v1/
│   │   │   ├── auth.py       # Kimlik doğrulama
│   │   │   ├── users.py      # Kullanıcı yönetimi
│   │   │   ├── courses.py    # Kurs işlemleri
│   │   │   ├── videos.py     # Video yönetimi
│   │   │   ├── questions.py  # Soru bankası
│   │   │   ├── exams.py      # Sınav sistemi
│   │   │   └── evaluations.py # Değerlendirme
│   │   └── decorators.py     # Yetkilendirme decorator'ları
│   ├── models/               # Veritabanı modelleri
│   ├── services/             # İş mantığı servisleri
│   ├── tasks/                # Celery görevleri
│   └── utils/                # Yardımcı fonksiyonlar
├── migrations/               # Alembic migration'ları
├── tests/                    # Test dosyaları
├── docker/                   # Docker yapılandırmaları
└── docs/                     # Dokümantasyon
```

## 🚀 Kurulum

### Gereksinimler

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (opsiyonel)

### Yerel Kurulum

1. **Depoyu klonlayın:**
```bash
git clone <repository-url>
cd ÖğrenciSistemi
```

2. **Sanal ortam oluşturun:**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# veya
.\venv\Scripts\activate  # Windows
```

3. **Bağımlılıkları yükleyin:**
```bash
pip install -r requirements.txt
```

4. **Ortam değişkenlerini ayarlayın:**
```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

5. **Veritabanını hazırlayın:**
```bash
# PostgreSQL veritabanı oluşturun
createdb student_coaching

# Migration'ları çalıştırın
flask db upgrade

# Seed verileri ekleyin
flask seed-database
```

6. **Uygulamayı çalıştırın:**
```bash
python run.py
```

### Docker ile Kurulum

1. **Docker Compose ile başlatın:**
```bash
docker-compose up -d
```

2. **Migration'ları çalıştırın:**
```bash
docker-compose exec api flask db upgrade
docker-compose exec api flask seed-database
```

3. **Erişim:**
- API: http://localhost:5000
- Swagger UI: http://localhost:5000/api/v1/docs
- pgAdmin: http://localhost:5050 (dev profili)

## 📚 API Dokümantasyonu

API dokümantasyonuna Swagger UI üzerinden erişebilirsiniz:

```
http://localhost:5000/api/v1/docs
```

### Ana Endpoint'ler

| Endpoint | Açıklama |
|----------|----------|
| `POST /api/v1/auth/register` | Yeni kullanıcı kaydı |
| `POST /api/v1/auth/login` | Kullanıcı girişi |
| `GET /api/v1/courses/` | Kurs listesi |
| `GET /api/v1/videos/` | Video listesi |
| `POST /api/v1/exams/{id}/start` | Sınav başlat |
| `POST /api/v1/exams/{id}/submit` | Sınav gönder |

## 🔐 Yetkilendirme

Sistem 4 kullanıcı rolü destekler:

| Rol | Yetkiler |
|-----|----------|
| **Süper Admin** | Tam erişim, sistem yönetimi |
| **Admin** | Kullanıcı yönetimi, içerik yönetimi |
| **Öğretmen** | Kurs oluşturma, sınav hazırlama, öğrenci değerlendirme |
| **Öğrenci** | Kurslara erişim, sınavlara katılım |

## 🧪 Test

```bash
# Tüm testleri çalıştır
pytest

# Coverage raporu ile
pytest --cov=app --cov-report=html
```

## 🔧 Yapılandırma

Önemli ortam değişkenleri:

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | PostgreSQL bağlantı URL'si |
| `REDIS_URL` | Redis bağlantı URL'si |
| `SECRET_KEY` | Flask gizli anahtarı |
| `JWT_SECRET_KEY` | JWT imzalama anahtarı |
| `YOUTUBE_API_KEY` | YouTube Data API anahtarı |

## 📦 Celery Görevleri

Arka plan görevlerini çalıştırmak için:

```bash
# Worker başlat
celery -A celery_worker:celery worker --loglevel=info

# Beat (scheduler) başlat
celery -A celery_worker:celery beat --loglevel=info
```

## 🚢 Production Dağıtımı

Production ortamı için:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Önemli kontroller:
- `FLASK_ENV=production` olmalı
- `DEBUG=False` olmalı
- Güçlü `SECRET_KEY` ve `JWT_SECRET_KEY` kullanın
- SSL/TLS sertifikası yapılandırın
- Nginx reverse proxy kullanın

## 📖 Ek Kaynaklar

- [Mimari Dokümantasyonu](docs/ARCHITECTURE.md)
- [API Referansı](http://localhost:5000/api/v1/docs)

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje ticari amaçlıdır. Tüm hakları saklıdır.

---

© 2024 Öğrenci Koçluk Sistemi
