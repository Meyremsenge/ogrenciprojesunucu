# Admin & Süper Admin Modülü Dokümantasyonu

## Genel Bakış

Bu modül, öğrenci yönetim sistemi için kapsamlı bir admin ve süper admin paneli sağlar. Kullanıcı yönetimi, içerik onayları, paket atamaları, sistem ayarları ve duyuru yönetimi gibi temel admin işlevlerini içerir.

## İçindekiler

1. [Mimari Genel Bakış](#mimari-genel-bakış)
2. [Roller ve Yetkiler](#roller-ve-yetkiler)
3. [Veritabanı Modelleri](#veritabanı-modelleri)
4. [API Endpoints](#api-endpoints)
5. [Servisler](#servisler)
6. [Frontend Bileşenleri](#frontend-bileşenleri)
7. [Audit Logging](#audit-logging)
8. [Güvenlik](#güvenlik)

---

## Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐       │
│  │Dashboard │  Users   │ Approvals│ Packages │ Settings │       │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘       │
│       └──────────┴──────────┴──────────┴──────────┘             │
│                              │                                   │
│                    adminService.ts                               │
└──────────────────────────────┼───────────────────────────────────┘
                               │ HTTP/REST
┌──────────────────────────────┼───────────────────────────────────┐
│                        Backend (Flask)                           │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                      routes.py                             │  │
│  │    /api/v1/admin/*                                        │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                      services.py                           │  │
│  │  AdminUserService | ContentApprovalService | ...          │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                      models.py                             │  │
│  │  SystemSetting | AdminActionLog | ContentApprovalQueue    │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Roller ve Yetkiler

### Rol Hiyerarşisi

```
super_admin (En yüksek yetki)
    │
    ├── admin
    │
    ├── teacher
    │
    └── student (En düşük yetki)
```

### Yetki Matrisi

| İşlem | student | teacher | admin | super_admin |
|-------|---------|---------|-------|-------------|
| Dashboard görüntüleme | ❌ | ❌ | ✅ | ✅ |
| Kullanıcı listeleme | ❌ | ❌ | ✅ | ✅ |
| Kullanıcı oluşturma | ❌ | ❌ | ✅ | ✅ |
| Kullanıcı silme | ❌ | ❌ | ✅ | ✅ |
| Admin rolü atama | ❌ | ❌ | ❌ | ✅ |
| Süper admin rolü atama | ❌ | ❌ | ❌ | ✅ |
| İçerik onaylama | ❌ | ❌ | ✅ | ✅ |
| Paket oluşturma | ❌ | ❌ | ✅ | ✅ |
| Paket silme | ❌ | ❌ | ❌ | ✅ |
| Sistem ayarları okuma | ❌ | ❌ | ✅ | ✅ |
| Sistem ayarları yazma | ❌ | ❌ | ❌ | ✅ |
| Admin loglarını görme | ❌ | ❌ | ❌ | ✅ |
| Bakım modu açma | ❌ | ❌ | ❌ | ✅ |

---

## Veritabanı Modelleri

### SystemSetting

Sistem genelinde anahtar-değer ayarları saklar.

```python
class SystemSetting(db.Model):
    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text)
    setting_type = db.Column(db.Enum(SettingType))  # string, integer, float, boolean, json, secret
    category = db.Column(db.Enum(SettingCategory))  # general, security, email, payment, etc.
    description = db.Column(db.Text)
    is_sensitive = db.Column(db.Boolean, default=False)
    validation_rules = db.Column(JSONB)
```

**Kategoriler:**
- `general`: Genel sistem ayarları
- `security`: Güvenlik ayarları (oturum süresi, şifre politikası)
- `email`: E-posta sunucu ayarları
- `payment`: Ödeme sistemi ayarları
- `notification`: Bildirim ayarları
- `content`: İçerik yönetimi ayarları
- `ai`: Yapay zeka entegrasyonu ayarları
- `limits`: Sistem limitleri
- `appearance`: Görünüm ayarları
- `integration`: Harici entegrasyon ayarları

### AdminActionLog

Tüm admin işlemlerinin denetim kaydı.

```python
class AdminActionLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action_type = db.Column(db.Enum(AdminActionType))
    target_type = db.Column(db.String(50))  # user, content, package, setting
    target_id = db.Column(db.Integer)
    details = db.Column(JSONB)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    created_at = db.Column(db.DateTime)
```

**Action Types:**
- `user_create`, `user_update`, `user_delete`
- `user_activate`, `user_deactivate`
- `user_role_change`, `user_password_reset`, `user_unlock`
- `content_approve`, `content_reject`
- `package_create`, `package_update`, `package_delete`
- `package_assign`, `subscription_revoke`
- `setting_update`, `settings_initialize`
- `announcement_create`, `announcement_update`, `announcement_delete`
- `system_maintenance_toggle`, `cache_clear`

### ContentApprovalQueue

Onay bekleyen içeriklerin kuyruğu.

```python
class ContentApprovalQueue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content_type = db.Column(db.String(50))  # course, lesson, video, document, quiz, exam
    content_id = db.Column(db.Integer)
    title = db.Column(db.String(255))
    description = db.Column(db.Text)
    submitted_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    submitted_at = db.Column(db.DateTime)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    priority = db.Column(db.Enum(ApprovalPriority))  # low, normal, high, urgent
    status = db.Column(db.String(20))  # pending, approved, rejected
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    reviewed_at = db.Column(db.DateTime)
    review_notes = db.Column(db.Text)
```

### SystemAnnouncement

Sistem geneli duyurular.

```python
class SystemAnnouncement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255))
    content = db.Column(db.Text)
    announcement_type = db.Column(db.Enum(AnnouncementType))  # info, warning, success, error
    target_roles = db.Column(JSONB)  # ['student', 'teacher'] veya boş (tüm roller)
    starts_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
```

---

## API Endpoints

### Dashboard

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/v1/admin/dashboard` | Genel istatistikler | admin |
| GET | `/api/v1/admin/dashboard/charts/users` | Kullanıcı büyüme grafiği | admin |
| GET | `/api/v1/admin/dashboard/charts/revenue` | Gelir grafiği | admin |
| GET | `/api/v1/admin/dashboard/activities` | Son admin aktiviteleri | admin |

### Kullanıcı Yönetimi

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/v1/admin/users` | Kullanıcı listesi (sayfalı) | admin |
| GET | `/api/v1/admin/users/:id` | Kullanıcı detayı | admin |
| POST | `/api/v1/admin/users` | Yeni kullanıcı oluştur | admin |
| PUT | `/api/v1/admin/users/:id` | Kullanıcı güncelle | admin |
| DELETE | `/api/v1/admin/users/:id` | Kullanıcı sil (soft delete) | admin |
| PUT | `/api/v1/admin/users/:id/role` | Rol değiştir | super_admin (admin rolleri için) |
| POST | `/api/v1/admin/users/:id/activate` | Aktifleştir | admin |
| POST | `/api/v1/admin/users/:id/deactivate` | Deaktifleştir | admin |
| POST | `/api/v1/admin/users/:id/reset-password` | Şifre sıfırla | admin |
| POST | `/api/v1/admin/users/:id/unlock` | Hesap kilidini aç | admin |
| POST | `/api/v1/admin/users/bulk` | Toplu işlem | admin |

**Query Parameters (GET /users):**
- `page`: Sayfa numarası (default: 1)
- `per_page`: Sayfa başı kayıt (default: 20)
- `search`: İsim veya e-posta araması
- `role`: Rol filtresi
- `is_active`: Aktiflik filtresi (true/false)
- `sort_by`: Sıralama alanı
- `sort_order`: Sıralama yönü (asc/desc)

### İçerik Onayları

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/v1/admin/approvals` | Bekleyen onaylar | admin |
| GET | `/api/v1/admin/approvals/stats` | Onay istatistikleri | admin |
| POST | `/api/v1/admin/approvals/:id/assign` | Kendine ata | admin |
| POST | `/api/v1/admin/approvals/:id/approve` | Onayla | admin |
| POST | `/api/v1/admin/approvals/:id/reject` | Reddet (neden zorunlu) | admin |

### Paket Yönetimi

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/v1/admin/packages` | Paket listesi | admin |
| GET | `/api/v1/admin/packages/:id` | Paket detayı (abonelerle) | admin |
| POST | `/api/v1/admin/packages` | Yeni paket oluştur | admin |
| PUT | `/api/v1/admin/packages/:id` | Paket güncelle | admin |
| DELETE | `/api/v1/admin/packages/:id` | Paket sil | super_admin |
| POST | `/api/v1/admin/packages/assign` | Kullanıcıya paket ata | admin |
| POST | `/api/v1/admin/packages/subscriptions/:id/revoke` | Abonelik iptal | admin |

### Sistem Ayarları

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/v1/admin/settings` | Tüm ayarlar | admin (okuma) |
| GET | `/api/v1/admin/settings/:key` | Tekil ayar | admin |
| PUT | `/api/v1/admin/settings/:key` | Ayar güncelle | super_admin |
| PUT | `/api/v1/admin/settings` | Toplu güncelleme | super_admin |
| POST | `/api/v1/admin/settings/initialize` | Varsayılanları yükle | super_admin |

### Duyurular

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/v1/admin/announcements` | Duyuru listesi | admin |
| POST | `/api/v1/admin/announcements` | Yeni duyuru | admin |
| PUT | `/api/v1/admin/announcements/:id` | Duyuru güncelle | admin |
| DELETE | `/api/v1/admin/announcements/:id` | Duyuru sil | admin |

### Admin Logları

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| GET | `/api/v1/admin/logs` | Admin işlem logları | super_admin |

**Query Parameters:**
- `page`, `per_page`: Sayfalama
- `action_type`: İşlem tipi filtresi
- `admin_id`: Admin filtresi
- `target_type`: Hedef tipi filtresi
- `start_date`, `end_date`: Tarih aralığı

### Sistem İşlemleri

| Method | Endpoint | Açıklama | Yetki |
|--------|----------|----------|-------|
| POST | `/api/v1/admin/system/maintenance` | Bakım modu aç/kapa | super_admin |
| POST | `/api/v1/admin/system/cache/clear` | Cache temizle | super_admin |
| GET | `/api/v1/admin/system/health` | Sistem sağlık durumu | admin |

---

## Servisler

### AdminUserService

Kullanıcı CRUD ve yönetim işlemleri.

```python
class AdminUserService:
    @staticmethod
    def list_users(filters: dict, page: int, per_page: int) -> Pagination:
        """Filtrelenmiş ve sayfalı kullanıcı listesi"""
    
    @staticmethod
    def get_user_details(user_id: int) -> dict:
        """Kullanıcı detayları (istatistiklerle)"""
    
    @staticmethod
    def create_user(data: dict, created_by: int) -> User:
        """Yeni kullanıcı oluştur"""
    
    @staticmethod
    def update_user(user_id: int, data: dict, updated_by: int) -> User:
        """Kullanıcı güncelle"""
    
    @staticmethod
    def delete_user(user_id: int, deleted_by: int) -> bool:
        """Kullanıcı sil (soft delete)"""
    
    @staticmethod
    def change_role(user_id: int, new_role: str, changed_by: int) -> User:
        """Rol değiştir (yetki kontrolü ile)"""
    
    @staticmethod
    def activate_user(user_id: int, activated_by: int) -> User:
        """Kullanıcı aktifleştir"""
    
    @staticmethod
    def deactivate_user(user_id: int, deactivated_by: int) -> User:
        """Kullanıcı deaktifleştir"""
    
    @staticmethod
    def reset_password(user_id: int, reset_by: int) -> str:
        """Geçici şifre oluştur ve e-posta gönder"""
    
    @staticmethod
    def unlock_user(user_id: int, unlocked_by: int) -> User:
        """Kilitli hesabı aç"""
    
    @staticmethod
    def bulk_action(action: str, user_ids: list, performed_by: int) -> dict:
        """Toplu işlem (activate, deactivate, delete)"""
```

### ContentApprovalService

İçerik onay akışı yönetimi.

```python
class ContentApprovalService:
    @staticmethod
    def get_pending_approvals(filters: dict) -> list:
        """Bekleyen onayları getir"""
    
    @staticmethod
    def get_approval_stats() -> dict:
        """Onay istatistikleri"""
    
    @staticmethod
    def assign_approval(item_id: int, admin_id: int) -> ContentApprovalQueue:
        """Onay görevini kendine ata"""
    
    @staticmethod
    def approve_content(item_id: int, admin_id: int, notes: str = None) -> ContentApprovalQueue:
        """İçeriği onayla"""
    
    @staticmethod
    def reject_content(item_id: int, admin_id: int, reason: str) -> ContentApprovalQueue:
        """İçeriği reddet (neden zorunlu)"""
```

### PackageManagementService

Paket ve abonelik yönetimi.

```python
class PackageManagementService:
    @staticmethod
    def list_packages(include_inactive: bool = False) -> list:
        """Paket listesi"""
    
    @staticmethod
    def get_package_details(package_id: int) -> dict:
        """Paket detayı (abonelerle)"""
    
    @staticmethod
    def create_package(data: dict, created_by: int) -> Package:
        """Yeni paket oluştur"""
    
    @staticmethod
    def update_package(package_id: int, data: dict, updated_by: int) -> Package:
        """Paket güncelle"""
    
    @staticmethod
    def delete_package(package_id: int, deleted_by: int) -> bool:
        """Paket sil"""
    
    @staticmethod
    def assign_package(user_id: int, package_id: int, assigned_by: int) -> UserPackage:
        """Kullanıcıya paket ata"""
    
    @staticmethod
    def revoke_subscription(subscription_id: int, revoked_by: int) -> bool:
        """Abonelik iptal"""
```

### SystemSettingsService

Sistem ayarları yönetimi.

```python
class SystemSettingsService:
    @staticmethod
    def get_all_settings(category: str = None) -> list:
        """Tüm ayarları getir"""
    
    @staticmethod
    def get_setting(key: str) -> SystemSetting:
        """Tekil ayar getir"""
    
    @staticmethod
    def update_setting(key: str, value: any, updated_by: int) -> SystemSetting:
        """Ayar güncelle (tip dönüşümü ile)"""
    
    @staticmethod
    def bulk_update(settings: dict, updated_by: int) -> int:
        """Toplu ayar güncelleme"""
    
    @staticmethod
    def initialize_defaults(initialized_by: int) -> int:
        """Varsayılan ayarları yükle"""
```

### AdminDashboardService

Dashboard istatistikleri.

```python
class AdminDashboardService:
    @staticmethod
    def get_overview_stats() -> dict:
        """Genel istatistikler"""
        # Returns: total_users, active_users, total_courses, active_enrollments, revenue, pending_approvals
    
    @staticmethod
    def get_user_growth_chart(period: str = 'month') -> list:
        """Kullanıcı büyüme verisi"""
    
    @staticmethod
    def get_revenue_chart(period: str = 'month') -> list:
        """Gelir grafiği verisi"""
    
    @staticmethod
    def get_recent_activities(limit: int = 10) -> list:
        """Son admin aktiviteleri"""
```

---

## Frontend Bileşenleri

### AdminDashboard

Ana dashboard bileşeni - istatistikler ve grafikler.

```tsx
<AdminDashboard 
  stats={dashboardStats}
  activities={recentActivities}
  loading={loading}
/>
```

### UserManagement

Kullanıcı listesi ve yönetim arayüzü.

```tsx
<UserManagement
  users={users}
  loading={loading}
  totalUsers={total}
  currentPage={page}
  perPage={20}
  onSearch={(query) => {...}}
  onFilter={(filters) => {...}}
  onPageChange={(page) => {...}}
  onCreateUser={() => {...}}
  onViewUser={(id) => {...}}
  onEditUser={(id) => {...}}
  onDeleteUser={(id) => {...}}
  onActivateUser={(id) => {...}}
  onDeactivateUser={(id) => {...}}
  onResetPassword={(id) => {...}}
  onChangeRole={(id, role) => {...}}
  onUnlockUser={(id) => {...}}
  onBulkAction={(action, ids) => {...}}
/>
```

### ContentApprovalQueue

İçerik onay kuyruğu.

```tsx
<ContentApprovalQueue
  items={pendingApprovals}
  stats={approvalStats}
  loading={loading}
  onRefresh={() => {...}}
  onView={(id) => {...}}
  onApprove={(id) => {...}}
  onReject={(id, reason) => {...}}
  onAssign={(id) => {...}}
  onFilterChange={(filters) => {...}}
/>
```

### PackageManagement

Paket yönetimi arayüzü.

```tsx
<PackageManagement
  packages={packages}
  loading={loading}
  onCreatePackage={(data) => {...}}
  onUpdatePackage={(id, data) => {...}}
  onDeletePackage={(id) => {...}}
  onAssignPackage={(userId, packageId) => {...}}
  onRevokeSubscription={(subscriptionId) => {...}}
  onGetSubscribers={(packageId) => Promise<UserPackage[]>}
  onRefresh={() => {...}}
/>
```

### SystemSettingsPanel

Sistem ayarları paneli.

```tsx
<SystemSettingsPanel
  settings={settings}
  loading={loading}
  isSuperAdmin={user.role === 'super_admin'}
  onSave={(changes) => {...}}
  onRefresh={() => {...}}
  onInitialize={() => {...}}
/>
```

### AnnouncementManager

Duyuru yönetimi.

```tsx
<AnnouncementManager
  announcements={announcements}
  loading={loading}
  onCreate={(data) => {...}}
  onUpdate={(id, data) => {...}}
  onDelete={(id) => {...}}
  onRefresh={() => {...}}
/>
```

---

## Audit Logging

Tüm admin işlemleri `AdminActionLog` tablosuna kaydedilir.

### Log Yapısı

```json
{
  "admin_id": 1,
  "action_type": "user_role_change",
  "target_type": "user",
  "target_id": 42,
  "details": {
    "old_role": "student",
    "new_role": "teacher",
    "reason": "Öğretmen olarak terfi"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Log Kullanımı

```python
from app.modules.admin.services import AdminActionService

# İşlem sonrası log kaydet
AdminActionService.log_action(
    admin_id=current_user.id,
    action_type=AdminActionType.user_role_change,
    target_type='user',
    target_id=user.id,
    details={
        'old_role': old_role,
        'new_role': new_role
    }
)
```

---

## Güvenlik

### Rol Kontrolü Decoratörleri

```python
from app.core.decorators import admin_required, super_admin_required

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def list_users():
    """Admin veya super_admin erişebilir"""
    pass

@admin_bp.route('/settings/<key>', methods=['PUT'])
@jwt_required()
@super_admin_required
def update_setting(key):
    """Sadece super_admin erişebilir"""
    pass
```

### Güvenlik Kuralları

1. **Kendini silme engeli**: Adminler kendilerini silemez
2. **Rol hiyerarşisi**: Adminler sadece kendi seviyelerinin altındaki rolleri atayabilir
3. **Super admin koruması**: Super admin rolü sadece super admin tarafından atanabilir
4. **Hassas ayarlar**: `is_sensitive=True` olan ayarlar masked olarak döner
5. **IP loglama**: Tüm admin işlemlerinde IP adresi kaydedilir
6. **Rate limiting**: Admin API'leri rate limit koruması altındadır

### Şifre Sıfırlama Akışı

1. Admin şifre sıfırlama isteği gönderir
2. Sistem güvenli geçici şifre oluşturur
3. Kullanıcıya e-posta gönderilir
4. Kullanıcı ilk girişte şifre değiştirmeye zorlanır
5. İşlem audit log'a kaydedilir

---

## Migration

Modülü kullanmak için migration çalıştırın:

```bash
flask db upgrade
```

Varsayılan sistem ayarlarını yüklemek için:

```bash
# API üzerinden
POST /api/v1/admin/settings/initialize
Authorization: Bearer <super_admin_token>
```

Veya Python shell'den:

```python
from app.modules.admin.services import SystemSettingsService
SystemSettingsService.initialize_defaults(admin_id=1)
```

---

## Örnek Kullanım

### Kullanıcı Oluşturma

```typescript
import adminService from '@/services/adminService';

const newUser = await adminService.createUser({
  email: 'yeni@ornek.com',
  first_name: 'Yeni',
  last_name: 'Kullanıcı',
  password: 'guvenli123',
  role: 'student'
});
```

### İçerik Onaylama

```typescript
// Önce kendine ata
await adminService.assignApproval(approvalId);

// Sonra onayla
await adminService.approveContent(approvalId);

// Veya reddet (neden zorunlu)
await adminService.rejectContent(approvalId, 'İçerik standartlara uymuyor');
```

### Sistem Ayarı Güncelleme

```typescript
await adminService.updateSetting('maintenance_mode', true);

// Toplu güncelleme
await adminService.bulkUpdateSettings({
  'maintenance_mode': true,
  'max_file_size': 10485760,
  'email_notifications': false
});
```

---

## Sonuç

Bu admin modülü, kurumsal düzeyde yönetim paneli gereksinimleri için tasarlanmıştır. Rol tabanlı erişim kontrolü, tam denetim kaydı ve kullanıcı dostu arayüzler ile güvenli ve etkili yönetim sağlar.
