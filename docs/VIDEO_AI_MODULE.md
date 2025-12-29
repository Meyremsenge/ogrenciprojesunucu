# Video Modülü - YouTube Embed + AI Danışman

## Genel Bakış

Bu modül YouTube gizli (unlisted) videolarının uygulama içine güvenli bir şekilde gömülmesini ve öğrencilere AI destekli yardım sağlanmasını kapsar.

## ⚠️ KRİTİK MİMARİ KARARLAR

### AI NE YAPAR?
- ✅ Öğrenci sorularına video metadata'sından (başlık, açıklama) cevap verir
- ✅ Video konusunu metadata'dan açıklar
- ✅ İzleme geçmişine göre tekrar önerileri sunar
- ✅ Anlık quiz soruları üretir (kalıcı değil)

### AI NE YAPMAZ?
- ❌ Video içeriğini ANALİZ ETMEZ
- ❌ Video transcript'ini işlemez
- ❌ Otomatik ETİKETLEME yapmaz
- ❌ Otomatik DEĞERLENDİRME yapmaz
- ❌ Video kalitesi hakkında yorum yapmaz
- ❌ İçerik önerileri oluşturmaz

### Neden Bu Kararlar?
1. **Maliyet**: Video analizi çok pahalı (transcript + vision API)
2. **Doğruluk**: AI video içeriğini yanlış anlayabilir
3. **Sorumluluk**: Otomatik değerlendirme hatalı olabilir
4. **Performans**: Video analizi çok yavaş
5. **Gizlilik**: Unlisted videolar gizli kalmalı

---

## Dosya Yapısı

```
app/
├── modules/contents/
│   ├── video_ai_service.py    # Video AI iş mantığı
│   └── routes_video_ai.py     # Video AI endpoint'leri
├── services/
│   └── youtube_service.py     # YouTube API entegrasyonu
└── models/content.py          # VideoProgress modeli

frontend/src/
├── services/
│   └── videoService.ts        # Video API client + state manager
└── components/video/
    ├── SecureVideoPlayer.tsx  # YouTube embed player
    └── VideoAIAssistant.tsx   # AI danışman paneli
```

---

## Backend API

### Video AI Endpoint'leri

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/v1/videos/{id}/ai/ask` | POST | Video hakkında soru sor |
| `/api/v1/videos/{id}/ai/explain` | POST | Video konusunu açıkla |
| `/api/v1/videos/{id}/ai/key-points` | GET | Ana noktaları listele |
| `/api/v1/videos/{id}/ai/quiz` | POST | Anlık quiz oluştur |
| `/api/v1/videos/{id}/ai/review-suggestions` | GET | Tekrar önerileri al |
| `/api/v1/ai/review-suggestions` | GET | Genel tekrar önerileri |
| `/api/v1/videos/{id}/embed-info` | GET | Güvenli embed URL al |

### Request/Response Örnekleri

#### Soru Sor
```http
POST /api/v1/videos/123/ai/ask
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "Bu konunun temel prensipleri nelerdir?",
  "timestamp": 120
}
```

```json
{
  "success": true,
  "data": {
    "answer": "Video başlığı ve açıklamasına göre...",
    "question": "Bu konunun temel prensipleri nelerdir?",
    "video_id": 123,
    "video_title": "Python Temelleri",
    "timestamp": 120,
    "disclaimer": "Bu yanıt AI tarafından video başlığı ve açıklamasından üretilmiştir. Video içeriği analiz edilmemiştir.",
    "is_ai_generated": true,
    "generated_at": "2025-01-15T10:30:00Z"
  }
}
```

#### Konu Açıkla
```http
POST /api/v1/videos/123/ai/explain
Authorization: Bearer <token>
Content-Type: application/json

{
  "detail_level": "medium"
}
```

#### Quiz Oluştur
```http
POST /api/v1/videos/123/ai/quiz
Authorization: Bearer <token>
Content-Type: application/json

{
  "question_count": 3
}
```

⚠️ **Not**: Quiz kalıcı olarak kaydedilmez, anlık üretilir.

---

## YouTube Embed Güvenliği

### Privacy-Enhanced Mode
Tüm YouTube videoları `youtube-nocookie.com` domain'i üzerinden embed edilir:

```
https://www.youtube-nocookie.com/embed/{video_id}?rel=0&modestbranding=1&enablejsapi=1
```

**Avantajları:**
- GDPR uyumlu (3. taraf çerezleri engellenir)
- Reklam takibi devre dışı
- Kullanıcı izleme geçmişine eklenmez

### Embed URL Parametreleri
| Parametre | Değer | Açıklama |
|-----------|-------|----------|
| `rel` | 0 | İlgili videolar kapalı |
| `modestbranding` | 1 | Minimal YouTube logosu |
| `enablejsapi` | 1 | JavaScript API aktif |
| `origin` | (sunucu) | CORS için origin |
| `autoplay` | 0/1 | Otomatik başlatma |
| `start` | (saniye) | Başlangıç zamanı |

### Güvenlik Kontrolleri
1. Video embed edilebilir mi? (`embeddable: true`)
2. Video gizli/unlisted mi?
3. Kullanıcı bu videoya erişebilir mi?
4. Origin kontrolü (CORS)

---

## Tekrar Önerisi Sistemi

### Öneri Türleri

| Tür | Öncelik | Tetikleyici |
|-----|---------|-------------|
| `not_started` | Yüksek | Video hiç izlenmemiş |
| `incomplete` | Yüksek | <%50 izlenmiş |
| `almost_complete` | Orta | <%90 izlenmiş |
| `review_needed` | Düşük | 14+ gündür izlenmemiş |
| `low_completion` | Orta | Genel tamamlama oranı düşük |
| `spaced_repetition` | Düşük | Eski videolar tekrar edilmeli |

### Algoritma
```python
# Tek video için
if not progress:
    return "not_started" (high)
elif watch_ratio < 0.5:
    return "incomplete" (high)
elif watch_ratio < 0.9:
    return "almost_complete" (medium)

# Zaman bazlı
if days_since_watch > 14:
    return "review_needed" (low)
```

---

## Frontend Entegrasyonu

### Video Player State Manager
```typescript
import { VideoPlayerStateManager } from '@/services/videoService';

const player = new VideoPlayerStateManager(videoId, initialProgress);

// YouTube iframe'den event'ler
youtubePlayer.on('timeupdate', (time, duration) => {
  player.onTimeUpdate(time, duration);
});

youtubePlayer.on('pause', (time) => {
  player.onPause(time);
});

youtubePlayer.on('ended', () => {
  player.onEnded();
});

// Video başlatırken kaldığı yerden devam
const resumePosition = player.getResumePosition();
```

### AI Assistant Kullanımı
```tsx
import { VideoAIAssistant } from '@/components/video/VideoAIAssistant';

<VideoAIAssistant
  videoId={videoId}
  videoTitle="Python Temelleri"
  currentTimestamp={currentTime}
  defaultCollapsed={false}
/>
```

---

## Mimari Diyagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐  │
│  │  SecureVideoPlayer  │  │       VideoAIAssistant                │  │
│  │  - YouTube iframe   │  │  ┌──────────────────────────────────┐│  │
│  │  - Progress tracking│  │  │ Soru Sor │ Açıkla │ Quiz │ Tekrar││  │
│  │  - State manager    │  │  └──────────────────────────────────┘│  │
│  └──────────┬──────────┘  └─────────────────┬────────────────────┘  │
│             │                               │                        │
│             └───────────────┬───────────────┘                        │
│                             │                                        │
│                   ┌─────────▼─────────┐                              │
│                   │   videoService.ts  │                              │
│                   └─────────┬─────────┘                              │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
                              │ HTTP/JSON
                              │
┌─────────────────────────────▼────────────────────────────────────────┐
│                        Backend (Flask)                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                      API Routes                                 │  │
│  │  /api/v1/videos/{id}/ai/ask         → VideoAIService           │  │
│  │  /api/v1/videos/{id}/ai/explain     → VideoAIService           │  │
│  │  /api/v1/videos/{id}/ai/quiz        → VideoAIService           │  │
│  │  /api/v1/videos/{id}/embed-info     → YouTubeService           │  │
│  │  /api/v1/videos/{id}/progress       → ProgressService          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─────────────────────┐  ┌──────────────────────┐                   │
│  │  VideoAIService     │  │   YouTubeService     │                   │
│  │  - ask_about_video  │  │   - get_embed_url    │                   │
│  │  - explain_topic    │  │   - validate_video   │                   │
│  │  - get_key_points   │  │   - check_embeddable │                   │
│  │  - generate_quiz    │  └──────────────────────┘                   │
│  │  - review_suggest   │                                             │
│  └──────────┬──────────┘                                             │
│             │                                                        │
│             │ AI API Call (video metadata only!)                     │
│             ▼                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                      AI Module                                  │  │
│  │  - OpenAI/Mock provider                                         │  │
│  │  - Context: video title, description, tags                      │  │
│  │  - NO video content analysis!                                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     YouTube (youtube-nocookie.com)                    │
│  - Privacy-enhanced mode                                              │
│  - GDPR compliant                                                     │
│  - No 3rd party cookies                                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Performans Optimizasyonları

### Caching
- YouTube video metadata: 1 saat cache (Redis)
- Embed URL: Her istekte üretilir (güvenlik için)
- AI yanıtları: Cache yapılmaz (dinamik içerik)

### Rate Limiting
- AI endpoint'leri: 10 istek/dakika (kullanıcı başına)
- Progress update: 1 istek/10 saniye (debounce)

### Lazy Loading
- AI paneli collapsed olarak başlar
- Tab içerikleri sadece tıklandığında yüklenir

---

## Güvenlik Kontrol Listesi

- [x] JWT authentication zorunlu
- [x] Video yayın durumu kontrolü (PUBLISHED)
- [x] YouTube privacy-enhanced mode
- [x] CORS origin kontrolü
- [x] Rate limiting
- [x] Input validation (question length)
- [x] AI disclaimer her yanıtta
- [x] No video content storage

---

## Test Senaryoları

### Backend Tests
```python
def test_ask_about_video_requires_auth():
    """Auth olmadan soru sorulamaz."""
    
def test_ask_about_video_validates_question():
    """Soru 5-1000 karakter arasında olmalı."""
    
def test_unpublished_video_not_accessible():
    """Yayınlanmamış videoların AI'ya erişimi yok."""
    
def test_ai_response_includes_disclaimer():
    """Her yanıtta disclaimer olmalı."""
```

### Frontend Tests
```typescript
test('VideoAIAssistant shows disclaimer', () => {
  // AI panelinde disclaimer görünmeli
});

test('VideoPlayerStateManager saves progress', () => {
  // Her 10 saniyede progress kaydedilmeli
});
```

---

## Gelecek Geliştirmeler

1. **Transcript Entegrasyonu** (Opsiyonel)
   - YouTube auto-caption'lardan transcript alma
   - Daha doğru AI yanıtları için
   - Ek maliyet ve gizlilik değerlendirmesi gerekli

2. **Timestamp Bazlı Sorular**
   - Video'nun belirli anları için soru sorma
   - "Bu kısımda ne anlatıldı?" desteği

3. **Öğrenme Analitiği**
   - İzleme pattern'leri analizi
   - Zor konuları tespit
   - Kişiselleştirilmiş öneriler

---

## Katkıda Bulunma

Bu modülü geliştirirken:
1. AI'nın video içeriğini analiz etmemesini sağlayın
2. Her AI yanıtına disclaimer ekleyin
3. Privacy-enhanced mode'u koruyun
4. Test coverage %80 üstünde tutun
