# Canlı Ders Modülü

## Genel Bakış

Bu modül, link tabanlı canlı ders oturumları yönetimi sağlar. Zoom, Google Meet, Microsoft Teams gibi platformları destekler.

## Özellikler

### 🎥 Platform Desteği

| Platform | Açıklama |
|----------|----------|
| Zoom | Zoom meeting linki |
| Google Meet | Google Meet linki |
| Microsoft Teams | Teams toplantı linki |
| Jitsi | Açık kaynak Jitsi Meet |
| Webex | Cisco Webex |
| Custom | Özel platform linki |

### 📅 Zamanlama

- **Tek seferlik dersler**: Belirli tarih ve saatte
- **Tekrarlayan dersler**: Günlük, haftalık, iki haftada bir, aylık
- **Erken katılım**: Ders başlamadan X dakika önce katılım
- **Geç katılım**: Ders başladıktan sonra X dakikaya kadar katılım

### 🔐 Erişim Kontrolü

```python
# Erişim kontrolü katmanları
1. Kursa kayıt kontrolü (require_enrollment)
2. Derse önceden kayıt kontrolü (require_registration)
3. Kapasite kontrolü (max_participants)
4. Zaman kontrolü (early_join, late_join)
```

### 📊 Katılım Takibi

- Kayıt zamanı
- Katılım zamanı
- Ayrılış zamanı
- Katılım süresi
- Katılım yüzdesi

## Model Yapısı

### LiveSession

```python
class LiveSession(BaseModel):
    # Temel bilgiler
    title: str
    description: str
    course_id: int
    topic_id: int  # Optional
    host_id: int
    
    # Durum
    status: SessionStatus  # draft, scheduled, live, ended, cancelled
    
    # Platform
    platform: SessionPlatform  # zoom, google_meet, microsoft_teams, jitsi, webex, custom
    meeting_url: str
    meeting_id: str
    meeting_password: str
    access_token: str  # Güvenlik tokeni
    
    # Zamanlama
    scheduled_start: datetime
    scheduled_end: datetime
    actual_start: datetime
    actual_end: datetime
    duration_minutes: int
    
    # Tekrarlayan ders
    recurrence_type: RecurrenceType  # none, daily, weekly, biweekly, monthly
    recurrence_end_date: datetime
    parent_session_id: int
    
    # Erişim kontrolü
    require_enrollment: bool  # Kursa kayıtlı olmalı
    require_registration: bool  # Derse önceden kayıt gerekli
    early_join_minutes: int  # 15 dakika önce
    late_join_allowed: bool
    late_join_minutes: int  # 30 dakika sonrasına kadar
    
    # Ayarlar
    max_participants: int
    is_recording_enabled: bool
    recording_url: str
    
    # İstatistikler
    participant_count: int
    peak_participants: int
```

### SessionAttendance

```python
class SessionAttendance(BaseModel):
    session_id: int
    user_id: int
    
    # Durum
    status: AttendanceStatus  # registered, joined, left, absent
    
    # Zamanlama
    registered_at: datetime
    joined_at: datetime
    left_at: datetime
    
    # İstatistikler
    duration_minutes: int
    join_count: int
    attendance_percentage: float
```

## API Endpoints

### Ders Yönetimi

```
GET    /api/v1/live-classes                    - Ders listesi
GET    /api/v1/live-classes/:id                - Ders detayı
POST   /api/v1/live-classes                    - Yeni ders oluştur
PUT    /api/v1/live-classes/:id                - Ders güncelle
DELETE /api/v1/live-classes/:id                - Ders iptal et
```

### Ders Kontrolü

```
POST   /api/v1/live-classes/:id/start          - Dersi başlat
POST   /api/v1/live-classes/:id/end            - Dersi bitir
```

### Erişim Kontrolü

```
GET    /api/v1/live-classes/:id/access         - Erişim durumunu kontrol et
GET    /api/v1/live-classes/:id/join-info      - Katılım bilgilerini al
```

### Katılım

```
POST   /api/v1/live-classes/:id/register       - Derse kayıt ol
POST   /api/v1/live-classes/:id/join           - Derse katıl
POST   /api/v1/live-classes/:id/leave          - Dersten ayrıl
GET    /api/v1/live-classes/:id/attendances    - Katılımcı listesi
```

### Benim Derslerim

```
GET    /api/v1/live-classes/my-sessions        - Kayıtlı olduğum dersler
GET    /api/v1/live-classes/upcoming           - Yaklaşan dersler
```

### Tekrarlayan Dersler

```
POST   /api/v1/live-classes/recurring          - Tekrarlayan ders oluştur
GET    /api/v1/live-classes/:id/series         - Ders serisini görüntüle
```

### Kayıt

```
POST   /api/v1/live-classes/:id/recording      - Kayıt linki ekle
GET    /api/v1/live-classes/:id/recording      - Kayıt linkini al
```

### Analitikler

```
GET    /api/v1/live-classes/:id/analytics      - Ders analitikleri
```

## Kullanım Örnekleri

### 1. Canlı Ders Oluşturma

```python
from app.modules.live_classes.services import LiveSessionService

session = LiveSessionService.create({
    'title': 'Python Temelleri - Canlı Ders',
    'description': 'Değişkenler ve veri tipleri',
    'course_id': 1,
    'host_id': teacher_id,
    'platform': SessionPlatform.ZOOM,
    'meeting_url': 'https://zoom.us/j/123456789',
    'meeting_id': '123 456 789',
    'meeting_password': 'abc123',
    'scheduled_start': datetime(2024, 1, 15, 14, 0),
    'duration_minutes': 60,
    'max_participants': 50,
    'require_enrollment': True,
    'early_join_minutes': 15
})
```

### 2. Tekrarlayan Ders Oluşturma

```python
sessions = LiveSessionService.create_recurring(
    data={
        'title': 'Haftalık Canlı Ders',
        'course_id': 1,
        'platform': SessionPlatform.GOOGLE_MEET,
        'meeting_url': 'https://meet.google.com/abc-def-ghi',
        'scheduled_start': datetime(2024, 1, 8, 14, 0),
        'duration_minutes': 90
    },
    recurrence_type=RecurrenceType.WEEKLY,
    recurrence_end_date=datetime(2024, 3, 31),
    user_id=teacher_id
)
# 12 haftalık ders serisi oluşturulur
```

### 3. Erişim Kontrolü

```python
# Kullanıcının erişim durumunu kontrol et
access = session.check_user_access(user_id=student_id)

# access = {
#     'can_access': True,
#     'reason': '',
#     'is_host': False,
#     'is_registered': True,
#     'is_enrolled': True
# }

# Erişim yoksa sebep döner
# access = {
#     'can_access': False,
#     'reason': 'Bu kursa kayıtlı değilsiniz',
#     ...
# }
```

### 4. Derse Katılım

```python
from app.modules.live_classes.services import AttendanceService

# Kayıt ol
attendance = AttendanceService.register(session_id, user_id)

# Katıl (meeting URL döner)
join_info = AttendanceService.join(session_id, user_id)
# join_info = {
#     'attendance': {...},
#     'meeting_url': 'https://zoom.us/j/...',
#     'meeting_password': 'abc123'
# }

# Ayrıl
attendance = AttendanceService.leave(session_id, user_id)
```

### 5. Dersi Yönetme

```python
# Dersi başlat
session = LiveSessionService.start_session(session_id, host_id)

# Dersi bitir
session = LiveSessionService.end_session(session_id, host_id)

# Dersi iptal et
LiveSessionService.cancel_session(session_id, host_id)
```

## Celery Tasks

### Hatırlatmalar

```python
# 24 saat önce hatırlatma
@shared_task
def send_session_reminders():
    # Yaklaşan dersler için öğrencilere bildirim gönder
    pass

# 1 saat önce hatırlatma
# Host'a da bildirim
```

### Otomatik İşlemler

```python
# Süresi dolan dersleri otomatik bitir
@shared_task
def auto_end_expired_sessions():
    # Planlanan bitiş + 30 dakikayı geçen LIVE oturumları bitirir
    pass

# İstatistik güncelleme
@shared_task
def update_session_stats():
    # Aktif oturumların katılımcı sayısını güncelle
    pass
```

## Frontend Bileşenleri

### LiveSessionCard

Ders kartı bileşeni.

```tsx
import { LiveSessionCard } from '@/components/live-session/LiveSessionCard';

<LiveSessionCard
  session={session}
  onJoin={() => handleJoin(session.id)}
  onRegister={() => handleRegister(session.id)}
  onView={() => navigate(`/live-classes/${session.id}`)}
/>
```

### JoinSessionModal

Derse katılım modalı.

```tsx
import { JoinSessionModal } from '@/components/live-session/JoinSessionModal';

<JoinSessionModal
  session={session}
  isOpen={showModal}
  onClose={() => setShowModal(false)}
/>
```

### CreateSessionForm

Ders oluşturma formu.

```tsx
import { CreateSessionForm } from '@/components/live-session/CreateSessionForm';

<CreateSessionForm
  courseId={courseId}
  onSubmit={handleCreate}
  onCancel={() => setShowForm(false)}
/>
```

## Güvenlik

### Meeting URL Koruma

```python
# URL sadece erişim yetkisi olanlara gösterilir
session.to_dict(include_url=False)  # URL gizli
session.to_dict(include_url=True)   # URL dahil

# check_user_access() ile yetki kontrolü yapılır
```

### Access Token

```python
# Her oturum için benzersiz token oluşturulur
access_token = secrets.token_urlsafe(32)

# Kullanıcı bazlı join link oluşturulabilir
join_link = session.generate_join_link(user_id)
```

### Erişim Katmanları

1. **Kursa Kayıt**: `require_enrollment=True`
2. **Derse Kayıt**: `require_registration=True`
3. **Kapasite**: `max_participants`
4. **Zaman**: `early_join_minutes`, `late_join_minutes`

## Analitikler

```python
# Ders analitikleri
analytics = {
    'total_registered': 45,       # Kayıtlı öğrenci
    'total_joined': 40,           # Katılan öğrenci
    'total_completed': 38,        # %80+ katılım
    'attendance_rate': 88.9,      # Katılım oranı
    'completion_rate': 84.4,      # Tamamlama oranı
    'peak_participants': 42,      # Max eş zamanlı
    'average_duration_minutes': 55,
    'session_duration_minutes': 60
}
```

## Workflow

```
1. Öğretmen ders oluşturur
   ↓
2. Öğrencilere bildirim gönderilir
   ↓
3. 24 saat önce hatırlatma
   ↓
4. 1 saat önce hatırlatma
   ↓
5. Erken katılım başlar (15 dk önce)
   ↓
6. Öğretmen dersi başlatır
   ↓
7. Öğrenciler katılır
   ↓
8. Ders biter (manuel veya otomatik)
   ↓
9. Kayıt linki eklenir (opsiyonel)
   ↓
10. Katılım raporu oluşturulur
```

## Sonraki Geliştirmeler

- [ ] Zoom/Meet API entegrasyonu (otomatik link oluşturma)
- [ ] Canlı sohbet (WebSocket)
- [ ] Ekran paylaşımı takibi
- [ ] Anket/Quiz entegrasyonu
- [ ] Whiteboard desteği
- [ ] Breakout rooms
