# YouTube Video Modülü

## Genel Bakış

Bu modül, YouTube gizli videolarının uygulama içinde güvenli bir şekilde embed edilmesini sağlar. Modül, video metadata yönetimi, öğretmen video ekleme süreci, izlenme sayacı ve güvenlik önlemlerini içerir.

## Mimari

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           YouTube Video Module                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐        │
│  │   Frontend   │───▶│    API Layer     │───▶│    Backend Services │        │
│  │  Components  │    │    Endpoints     │    │                     │        │
│  └──────────────┘    └──────────────────┘    └─────────────────────┘        │
│         │                    │                         │                     │
│         │                    │                         │                     │
│         ▼                    ▼                         ▼                     │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐        │
│  │SecureVideo   │    │VideoEmbedService │    │  YouTubeService    │        │
│  │Player        │    │                  │    │  (Google API)      │        │
│  └──────────────┘    └──────────────────┘    └─────────────────────┘        │
│         │                    │                         │                     │
│         │                    │                         │                     │
│         ▼                    ▼                         ▼                     │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐        │
│  │VideoApi     │    │VideoAnalytics    │    │     Redis           │        │
│  │ Service     │    │Service           │◀───│   (İzlenme Sayacı)  │        │
│  └──────────────┘    └──────────────────┘    └─────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Backend Servisleri

### 1. VideoEmbedSecurity (`app/services/video_embed_service.py`)

Gizli YouTube videolarının güvenli embed edilmesi için servis.

#### Özellikler

- **Token-based Access**: Her embed isteği için imzalı token
- **Signed URLs**: URL'ler kriptografik olarak imzalanır
- **Referer Kontrolü**: Sadece izin verilen domainlerden erişim
- **TTL (Time To Live)**: Tokenlar belirli süre sonra geçersiz olur

#### Örnek Kullanım

```python
from app.services.video_embed_service import VideoEmbedSecurity

# Token oluştur
token = VideoEmbedSecurity.generate_embed_token(
    video_id=123,
    user_id=456,
    youtube_video_id='abc123def'
)

# Token doğrula
payload, error = VideoEmbedSecurity.verify_embed_token(token)

# Güvenli embed URL
embed_url = VideoEmbedSecurity.generate_secure_youtube_embed_url(
    youtube_video_id='abc123def',
    autoplay=True,
    start_time=30
)
```

### 2. VideoAnalyticsService (`app/services/video_analytics_service.py`)

Redis tabanlı video izlenme sayacı ve analytics servisi.

#### Redis Key Yapısı

| Key Pattern | Açıklama | TTL |
|-------------|----------|-----|
| `video_analytics:views:{video_id}` | Toplam izlenme | - |
| `video_analytics:unique_views:{video_id}` | Benzersiz izlenme (set) | - |
| `video_analytics:daily:{video_id}:{date}` | Günlük izlenme | 7 gün |
| `video_analytics:hourly:{video_id}:{date}:{hour}` | Saatlik izlenme | 1 gün |
| `video_analytics:session:{session_id}` | İzleme oturumu | 2 saat |
| `video_analytics:history:{user_id}` | Kullanıcı geçmişi | 30 gün |
| `video_analytics:realtime:{video_id}` | Gerçek zamanlı izleyici | 1 dakika |

#### Watch Session Flow

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  start_watch  │────▶│ update_watch  │────▶│  end_watch    │
│   _session    │     │   _session    │     │   _session    │
└───────────────┘     └───────────────┘     └───────────────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Redis'te      │     │ Position ve   │     │ Progress DB'ye│
│ session oluştur│    │ event kaydet  │     │ kaydedilir    │
└───────────────┘     └───────────────┘     └───────────────┘
```

### 3. YouTubeService (`app/services/youtube_service.py`)

YouTube API entegrasyonu.

#### Özellikler

- Video metadata çekme
- Embed edilebilirlik kontrolü
- Playlist import
- Metadata senkronizasyonu
- Cache desteği

## API Endpoints

### Video Embed

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/v1/contents/videos/{id}/embed-url` | GET | Güvenli embed URL al |
| `/api/v1/contents/videos/{id}/watch/start` | POST | İzleme oturumu başlat |
| `/api/v1/contents/videos/watch/{session_id}/update` | POST | Oturum güncelle |
| `/api/v1/contents/videos/watch/{session_id}/end` | POST | Oturum sonlandır |

### Analytics

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/v1/contents/videos/{id}/analytics` | GET | Video istatistikleri |
| `/api/v1/contents/my/watch-history` | GET | İzleme geçmişi |
| `/api/v1/contents/popular-videos` | GET | Popüler videolar |

### YouTube Operations

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/v1/contents/videos/validate-youtube` | POST | URL doğrulama |
| `/api/v1/contents/videos/{id}/sync-metadata` | POST | Metadata senkronizasyonu |
| `/api/v1/contents/topics/{id}/import-playlist` | POST | Playlist import |

## Frontend Bileşenleri

### SecureVideoPlayer

YouTube videolarını güvenli şekilde oynatır.

```tsx
import { SecureVideoPlayer } from '@/components/video/SecureVideoPlayer';

<SecureVideoPlayer
  videoId={123}
  title="Ders 1: Giriş"
  autoplay={false}
  startTime={0}
  onComplete={() => console.log('Video tamamlandı')}
  onProgress={(progress) => console.log(`%${progress}`)}
  onError={(error) => console.error(error)}
/>
```

### VideoUploadForm

Öğretmenler için video ekleme formu.

```tsx
import { VideoUploadForm } from '@/components/video/VideoUploadForm';

<VideoUploadForm
  topics={[{ id: 1, title: 'Konu 1' }]}
  onSubmit={async (data) => {
    await api.createVideo(data);
  }}
  onCancel={() => navigate(-1)}
/>
```

### useVideoAnalytics Hook

Video analytics yönetimi.

```tsx
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';

const {
  sessionId,
  startSession,
  updateSession,
  endSession,
  isLoading,
  error
} = useVideoAnalytics(videoId);
```

## Öğretmen Video Ekleme Akışı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Öğretmen Video Ekleme Süreci                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────────┐     ┌────────────────────┐
    │   1. URL    │────▶│  2. Doğrulama   │────▶│   3. Önizleme      │
    │   Girişi    │     │   (Validate)    │     │   (Preview)        │
    └─────────────┘     └─────────────────┘     └────────────────────┘
                               │                         │
                               ▼                         ▼
                        ┌─────────────────┐     ┌────────────────────┐
                        │ - Video var mı? │     │ - Thumbnail        │
                        │ - Embed edilir? │     │ - Başlık           │
                        │ - Gizli mi?     │     │ - Süre             │
                        └─────────────────┘     │ - Kanal            │
                                                └────────────────────┘
                                                         │
                                                         ▼
    ┌─────────────┐     ┌─────────────────┐     ┌────────────────────┐
    │  6. Onay    │◀────│  5. İçerik      │◀────│   4. Düzenleme     │
    │  Bekle      │     │   Oluştur       │     │   (Edit Form)      │
    └─────────────┘     └─────────────────┘     └────────────────────┘
          │
          ▼
    ┌─────────────┐
    │  7. Yayın   │
    │  (Publish)  │
    └─────────────┘
```

## Güvenlik Önlemleri

### 1. Token-Based Access

Her video izleme isteği imzalı token gerektirir:

```python
# Token yapısı
{
    'vid': video_id,      # Veritabanı video ID
    'uid': user_id,       # Kullanıcı ID
    'ytid': youtube_id,   # YouTube video ID
    'ts': timestamp,      # Oluşturulma zamanı
    'nonce': random_hex   # Tekrar kullanımı önle
}
```

### 2. Privacy-Enhanced Mode

YouTube embed'leri `youtube-nocookie.com` üzerinden:

- GDPR uyumlu
- Cookie tracking yok
- Daha az veri sızıntısı

### 3. Referer Kontrolü

Sadece izin verilen domainlerden erişim:

```python
ALLOWED_EMBED_DOMAINS = [
    'localhost',
    'yourdomain.com',
    'app.yourdomain.com'
]
```

### 4. Erişim Kontrolü

Video izlemeden önce:
1. JWT doğrulaması
2. Kullanıcı kursa kayıtlı mı?
3. Paket aktif mi?
4. Video published durumda mı?

## Konfigürasyon

### Environment Variables

```bash
# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key

# Video Embed Security
VIDEO_EMBED_SECRET=your_32_byte_hex_secret
VIDEO_EMBED_TOKEN_TTL=3600
ALLOWED_EMBED_DOMAINS=localhost,yourdomain.com

# Video Analytics
VIDEO_VIEW_COUNT_SYNC_INTERVAL=300
VIDEO_SESSION_TTL=7200
VIDEO_MIN_WATCH_FOR_VIEW=5
```

### Redis Gereksinimleri

- Redis 6.0+
- Memory: ~50MB per 10,000 active videos
- Persistence: RDB snapshots recommended

## İzlenme Sayacı Mantığı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         İzlenme Sayacı Akışı                                │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────┐          ┌──────────────────┐         ┌─────────────┐
   │  Video Play  │─────────▶│  Minimum 5 sn    │────────▶│  View +1    │
   │    Event     │          │  izlendi mi?     │         │  (Redis)    │
   └──────────────┘          └──────────────────┘         └─────────────┘
                                     │                           │
                                     │ Hayır                     │
                                     ▼                           ▼
                             ┌──────────────────┐    ┌───────────────────────┐
                             │  Sayılmaz        │    │  - Toplam views       │
                             │                  │    │  - Unique views (set) │
                             └──────────────────┘    │  - Daily counter      │
                                                     │  - Hourly counter     │
                                                     └───────────────────────┘
```

## Periyodik Sync İşlemi

Redis'teki sayaçlar düzenli olarak veritabanına senkronize edilir:

```python
# Celery task
@celery.task
def sync_video_views():
    """Her 5 dakikada Redis'ten DB'ye sync."""
    VideoAnalyticsService.sync_all_to_database()
```

## Performans Optimizasyonları

1. **Redis Pipeline**: Batch operations
2. **Lazy Sync**: Redis → DB async senkronizasyon
3. **Beacon API**: Sayfa kapandığında veri kaybı önleme
4. **Debounced Updates**: Progress güncellemeleri throttle

## Hata Yönetimi

| Hata | Çözüm |
|------|-------|
| YouTube API quota aşımı | Cache kullan, rate limit |
| Redis bağlantı hatası | Local cache fallback |
| Token expired | Frontend'de yenile |
| Video embed izni yok | Kullanıcıya bildir |

## Test

```bash
# Unit tests
pytest tests/test_video_embed.py
pytest tests/test_video_analytics.py

# Integration tests
pytest tests/integration/test_youtube_flow.py
```
