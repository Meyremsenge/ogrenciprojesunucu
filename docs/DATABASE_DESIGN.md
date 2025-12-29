# PostgreSQL Database Design Document

## 📋 Genel Bakış

Bu doküman, Öğrenci Sistemi'nin PostgreSQL veritabanı şemasını detaylı olarak açıklar. Sistem, eğitim platformu için gerekli tüm tabloları, ilişkileri, indexleri ve best practice'leri içerir.

---

## 🗄️ Veritabanı Şeması Diyagramı

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            CORE ENTITIES                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐                │
│  │   users     │────▶│   roles     │────▶│   permissions   │                │
│  └─────────────┘     └─────────────┘     └─────────────────┘                │
│         │                   │                     │                          │
│         │                   └─────────────────────┘                          │
│         │                           │                                        │
│         │               ┌───────────────────────┐                           │
│         │               │   role_permissions    │                           │
│         │               └───────────────────────┘                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐                                                            │
│  │  packages   │◀────────────────┐                                          │
│  └─────────────┘                 │                                          │
│         │                        │                                          │
│         ▼                        │                                          │
│  ┌───────────────┐               │                                          │
│  │ user_packages │───────────────┘                                          │
│  └───────────────┘                                                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           COURSE STRUCTURE                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │
│  │ categories  │────▶│   courses   │────▶│   topics    │                    │
│  └─────────────┘     └─────────────┘     └─────────────┘                    │
│                             │                   │                            │
│                             │                   ├──────────┐                 │
│                             │                   │          │                 │
│                             ▼                   ▼          ▼                 │
│                      ┌─────────────┐     ┌──────────┐  ┌───────────┐        │
│                      │ enrollments │     │  videos  │  │ questions │        │
│                      └─────────────┘     └──────────┘  └───────────┘        │
│                             │                   │          │                 │
│                             │                   ▼          ▼                 │
│                             │            ┌───────────┐ ┌──────────┐          │
│                             │            │  progress │ │ answers  │          │
│                             │            └───────────┘ └──────────┘          │
│                             │                                                │
│                             ▼                                                │
│                      ┌─────────────────┐                                    │
│                      │ student_progress│                                    │
│                      └─────────────────┘                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              EXAM SYSTEM                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│        ┌─────────────┐                                                       │
│        │    exams    │                                                       │
│        └─────────────┘                                                       │
│              │                                                               │
│              ├──────────────────────────┐                                   │
│              │                          │                                   │
│              ▼                          ▼                                   │
│       ┌───────────────┐         ┌──────────────┐                           │
│       │ exam_questions│         │ exam_results │                           │
│       └───────────────┘         └──────────────┘                           │
│              │                          │                                   │
│              ▼                          ▼                                   │
│       ┌───────────────┐         ┌──────────────┐                           │
│       │   questions   │         │ exam_answers │                           │
│       └───────────────┘         └──────────────┘                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          LIVE SESSIONS & AUDIT                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌───────────────┐       ┌─────────────────────┐       ┌─────────────┐      │
│  │ live_sessions │──────▶│ session_attendances │       │ audit_logs  │      │
│  └───────────────┘       └─────────────────────┘       └─────────────┘      │
│         │                                                     │              │
│         │                                                     │              │
│         ▼                                                     ▼              │
│  ┌───────────────┐                                    ┌─────────────┐       │
│  │  evaluations  │                                    │    users    │       │
│  └───────────────┘                                    └─────────────┘       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Tablo Detayları

### 1. Users & Authorization

#### `users`
Tüm kullanıcıların temel bilgilerini saklar.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | E-posta adresi |
| password_hash | VARCHAR(255) | NOT NULL | Şifrelenmiş parola |
| first_name | VARCHAR(100) | NOT NULL | Ad |
| last_name | VARCHAR(100) | NOT NULL | Soyad |
| phone | VARCHAR(20) | | Telefon numarası |
| avatar_url | VARCHAR(500) | | Profil resmi URL |
| is_active | BOOLEAN | DEFAULT TRUE, INDEX | Aktif durumu |
| is_verified | BOOLEAN | DEFAULT FALSE | E-posta doğrulaması |
| role_id | INTEGER | FK(roles.id), INDEX | Rol referansı |
| last_login_at | DATETIME | INDEX | Son giriş zamanı |
| created_at | DATETIME | DEFAULT NOW(), INDEX | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

**Indexler:**
- `idx_users_email` - E-posta aramaları için
- `idx_users_role_active` - Rol ve aktiflik filtrelemesi
- `idx_users_created` - Tarih sıralaması
- `idx_users_verified_active` - Doğrulama filtrelemesi

#### `roles`
Kullanıcı rollerini tanımlar.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Rol adı |
| description | TEXT | | Rol açıklaması |
| is_system | BOOLEAN | DEFAULT FALSE | Sistem rolü mü |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

**Varsayılan Roller:**
- `super_admin` - Tam yetki
- `admin` - Yönetici
- `teacher` - Öğretmen
- `student` - Öğrenci

#### `permissions`
Detaylı izin tanımları.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| name | VARCHAR(100) | UNIQUE, NOT NULL | İzin adı |
| description | TEXT | | İzin açıklaması |
| resource | VARCHAR(50) | NOT NULL | Kaynak tipi (courses, users) |
| action | VARCHAR(50) | NOT NULL | İşlem tipi (create, read, update, delete) |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

#### `role_permissions`
Rol-izin ilişki tablosu (Many-to-Many).

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| role_id | INTEGER | PK, FK(roles.id) | Rol referansı |
| permission_id | INTEGER | PK, FK(permissions.id) | İzin referansı |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

---

### 2. Packages & Subscriptions

#### `packages`
Abonelik paketleri.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| name | VARCHAR(100) | NOT NULL | Paket adı |
| slug | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | URL dostu isim |
| description | TEXT | | Detaylı açıklama |
| short_description | VARCHAR(255) | | Kısa açıklama |
| package_type | VARCHAR(20) | DEFAULT 'monthly' | Paket tipi |
| duration_days | INTEGER | DEFAULT 30 | Süre (gün) |
| price | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Fiyat |
| discount_price | DECIMAL(10,2) | CHECK >= 0 | İndirimli fiyat |
| currency | VARCHAR(3) | DEFAULT 'TRY' | Para birimi |
| features | JSON | | Özellik listesi |
| max_courses | INTEGER | | Maksimum kurs erişimi |
| max_downloads | INTEGER | | Maksimum indirme |
| max_live_sessions | INTEGER | | Maksimum canlı ders |
| ai_questions_per_day | INTEGER | DEFAULT 0 | Günlük AI soru limiti |
| ai_questions_per_month | INTEGER | DEFAULT 0 | Aylık AI soru limiti |
| course_ids | JSON | | Erişilebilir kurs ID'leri |
| category_ids | JSON | | Erişilebilir kategori ID'leri |
| all_courses_access | BOOLEAN | DEFAULT FALSE | Tüm kurslara erişim |
| status | VARCHAR(20) | DEFAULT 'active', INDEX | Paket durumu |
| is_published | BOOLEAN | DEFAULT FALSE | Yayında mı |
| is_featured | BOOLEAN | DEFAULT FALSE | Öne çıkan mı |
| display_order | INTEGER | DEFAULT 0 | Sıralama |
| total_subscribers | INTEGER | DEFAULT 0 | Toplam abone |
| total_revenue | DECIMAL(15,2) | DEFAULT 0 | Toplam gelir |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |
| created_by | INTEGER | FK(users.id) | Oluşturan |
| updated_by | INTEGER | FK(users.id) | Güncelleyen |

**Paket Tipleri:**
- `monthly` - Aylık
- `quarterly` - 3 Aylık
- `yearly` - Yıllık
- `lifetime` - Ömür boyu

**Indexler:**
- `idx_packages_slug` - Slug aramaları
- `idx_packages_status` - Durum filtreleme
- `idx_packages_type` - Tip filtreleme
- `idx_packages_active_published` - Yayındaki aktif paketler

#### `user_packages`
Kullanıcı abonelikleri.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| user_id | INTEGER | FK(users.id), INDEX, NOT NULL | Kullanıcı referansı |
| package_id | INTEGER | FK(packages.id), INDEX, NOT NULL | Paket referansı |
| starts_at | DATETIME | NOT NULL | Başlangıç tarihi |
| expires_at | DATETIME | INDEX | Bitiş tarihi |
| subscription_status | VARCHAR(20) | DEFAULT 'pending', INDEX | Abonelik durumu |
| payment_status | VARCHAR(20) | DEFAULT 'pending' | Ödeme durumu |
| payment_method | VARCHAR(50) | | Ödeme yöntemi |
| payment_reference | VARCHAR(100) | | Harici ödeme referansı |
| transaction_id | VARCHAR(100) | INDEX | İşlem ID |
| amount_paid | DECIMAL(10,2) | NOT NULL | Ödenen tutar |
| currency | VARCHAR(3) | DEFAULT 'TRY' | Para birimi |
| discount_code | VARCHAR(50) | | Kupon kodu |
| discount_amount | DECIMAL(10,2) | DEFAULT 0 | İndirim tutarı |
| auto_renew | BOOLEAN | DEFAULT FALSE | Otomatik yenileme |
| renewal_reminder_sent | BOOLEAN | DEFAULT FALSE | Hatırlatma gönderildi mi |
| cancelled_at | DATETIME | | İptal tarihi |
| cancellation_reason | TEXT | | İptal sebebi |
| last_accessed_at | DATETIME | | Son erişim |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

**Abonelik Durumları:**
- `pending` - Beklemede
- `active` - Aktif
- `expired` - Süresi dolmuş
- `cancelled` - İptal edilmiş
- `suspended` - Askıya alınmış

**Ödeme Durumları:**
- `pending` - Beklemede
- `completed` - Tamamlandı
- `failed` - Başarısız
- `refunded` - İade edildi
- `cancelled` - İptal edildi

**Indexler:**
- `idx_user_packages_user` - Kullanıcı araması
- `idx_user_packages_user_status` - Kullanıcı + durum
- `idx_user_packages_active_expires` - Aktif abonelik + bitiş
- `idx_user_packages_transaction` - İşlem ID araması

**Unique Constraint:**
- `uq_user_package_subscription (user_id, package_id, starts_at)` - Aynı pakete tekrar abone olma

---

### 3. Course Structure

#### `categories`
Kurs kategorileri (hiyerarşik).

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| name | VARCHAR(100) | NOT NULL | Kategori adı |
| slug | VARCHAR(100) | UNIQUE, INDEX | URL dostu isim |
| description | TEXT | | Açıklama |
| parent_id | INTEGER | FK(categories.id) | Üst kategori |
| icon | VARCHAR(100) | | İkon sınıfı |
| order_index | INTEGER | DEFAULT 0 | Sıralama |
| is_active | BOOLEAN | DEFAULT TRUE | Aktif mi |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

#### `courses`
Kurslar.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| title | VARCHAR(200) | NOT NULL | Kurs başlığı |
| slug | VARCHAR(200) | UNIQUE, INDEX | URL dostu isim |
| description | TEXT | | Açıklama |
| short_description | VARCHAR(500) | | Kısa açıklama |
| teacher_id | INTEGER | FK(users.id), INDEX | Öğretmen |
| category_id | INTEGER | FK(categories.id), INDEX | Kategori |
| thumbnail_url | VARCHAR(500) | | Kapak resmi |
| preview_video_url | VARCHAR(500) | | Önizleme videosu |
| price | DECIMAL(10,2) | DEFAULT 0 | Fiyat |
| status | VARCHAR(20) | DEFAULT 'draft', INDEX | Durum |
| is_published | BOOLEAN | DEFAULT FALSE, INDEX | Yayında mı |
| is_featured | BOOLEAN | DEFAULT FALSE | Öne çıkan mı |
| level | VARCHAR(20) | | Seviye (beginner, intermediate, advanced) |
| duration_hours | INTEGER | | Toplam süre (saat) |
| total_videos | INTEGER | DEFAULT 0 | Video sayısı |
| total_students | INTEGER | DEFAULT 0 | Öğrenci sayısı |
| average_rating | DECIMAL(3,2) | DEFAULT 0 | Ortalama puan |
| total_ratings | INTEGER | DEFAULT 0 | Değerlendirme sayısı |
| seo_title | VARCHAR(200) | | SEO başlık |
| seo_description | VARCHAR(500) | | SEO açıklama |
| seo_keywords | VARCHAR(500) | | SEO anahtar kelimeler |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

#### `topics`
Kurs konuları/bölümleri.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| course_id | INTEGER | FK(courses.id), INDEX | Kurs referansı |
| title | VARCHAR(200) | NOT NULL | Konu başlığı |
| description | TEXT | | Açıklama |
| order_index | INTEGER | DEFAULT 0 | Sıralama |
| is_free | BOOLEAN | DEFAULT FALSE | Ücretsiz mi |
| is_published | BOOLEAN | DEFAULT FALSE | Yayında mı |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

#### `enrollments`
Kurs kayıtları.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| student_id | INTEGER | FK(users.id), INDEX | Öğrenci |
| course_id | INTEGER | FK(courses.id), INDEX | Kurs |
| status | VARCHAR(20) | DEFAULT 'active', INDEX | Kayıt durumu |
| progress_percent | INTEGER | DEFAULT 0 | İlerleme yüzdesi |
| enrolled_at | DATETIME | DEFAULT NOW() | Kayıt tarihi |
| completed_at | DATETIME | | Tamamlanma tarihi |
| last_accessed_at | DATETIME | | Son erişim |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

**Unique Constraint:**
- `uq_enrollment_student_course (student_id, course_id)`

---

### 4. Content

#### `videos`
YouTube videoları.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| topic_id | INTEGER | FK(topics.id), INDEX | Konu referansı |
| title | VARCHAR(200) | NOT NULL | Video başlığı |
| description | TEXT | | Açıklama |
| youtube_video_id | VARCHAR(50) | NOT NULL | YouTube video ID |
| youtube_url | VARCHAR(500) | | YouTube URL |
| thumbnail_url | VARCHAR(500) | | Küçük resim |
| duration_seconds | INTEGER | DEFAULT 0 | Süre (saniye) |
| order_index | INTEGER | DEFAULT 0, INDEX | Sıralama |
| is_published | BOOLEAN | DEFAULT FALSE, INDEX | Yayında mı |
| is_free_preview | BOOLEAN | DEFAULT FALSE | Ücretsiz önizleme mi |
| view_count | INTEGER | DEFAULT 0 | İzlenme sayısı |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

#### `video_progress`
Video izleme ilerlemesi.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| user_id | INTEGER | FK(users.id), INDEX | Kullanıcı |
| video_id | INTEGER | FK(videos.id), INDEX | Video |
| watched_seconds | INTEGER | DEFAULT 0 | İzlenen süre |
| is_completed | BOOLEAN | DEFAULT FALSE | Tamamlandı mı |
| last_position | INTEGER | DEFAULT 0 | Son konum |
| watch_count | INTEGER | DEFAULT 1 | İzleme sayısı |
| completed_at | DATETIME | | Tamamlanma tarihi |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

**Unique Constraint:**
- `uq_video_progress_user_video (user_id, video_id)`

---

### 5. Questions & Answers

#### `questions`
Sorular.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| topic_id | INTEGER | FK(topics.id), INDEX | Konu referansı |
| question_text | TEXT | NOT NULL | Soru metni |
| question_type | VARCHAR(20) | DEFAULT 'multiple_choice', INDEX | Soru tipi |
| image_url | VARCHAR(500) | | Görsel URL |
| difficulty | VARCHAR(20) | DEFAULT 'medium', INDEX | Zorluk seviyesi |
| points | INTEGER | DEFAULT 1 | Puan değeri |
| explanation | TEXT | | Açıklama |
| hint | TEXT | | İpucu |
| tags | JSON | | Etiketler |
| is_published | BOOLEAN | DEFAULT FALSE, INDEX | Yayında mı |
| total_attempts | INTEGER | DEFAULT 0 | Toplam deneme |
| correct_attempts | INTEGER | DEFAULT 0 | Doğru sayısı |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

**Soru Tipleri:**
- `multiple_choice` - Çoktan seçmeli (tek doğru)
- `multiple_select` - Çoktan seçmeli (çok doğru)
- `true_false` - Doğru/Yanlış
- `short_answer` - Kısa cevap
- `essay` - Uzun cevap

#### `answers`
Cevap seçenekleri.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| question_id | INTEGER | FK(questions.id), INDEX | Soru referansı |
| answer_text | TEXT | NOT NULL | Cevap metni |
| is_correct | BOOLEAN | DEFAULT FALSE | Doğru mu |
| explanation | TEXT | | Açıklama |
| order_index | INTEGER | DEFAULT 0 | Sıralama |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

#### `question_attempts`
Soru cevaplama denemeleri.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| user_id | INTEGER | FK(users.id), INDEX | Kullanıcı |
| question_id | INTEGER | FK(questions.id), INDEX | Soru |
| selected_answer_ids | JSON | | Seçilen cevaplar |
| is_correct | BOOLEAN | | Doğru mu |
| time_spent_seconds | INTEGER | | Harcanan süre |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

---

### 6. Exams

#### `exams`
Sınavlar.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| topic_id | INTEGER | FK(topics.id), INDEX | Konu referansı |
| title | VARCHAR(200) | NOT NULL | Sınav başlığı |
| description | TEXT | | Açıklama |
| instructions | TEXT | | Talimatlar |
| duration_minutes | INTEGER | NOT NULL | Süre (dakika) |
| passing_score | INTEGER | DEFAULT 60 | Geçme puanı |
| total_points | INTEGER | DEFAULT 0 | Toplam puan |
| max_attempts | INTEGER | DEFAULT 1 | Maksimum deneme |
| show_answers_after | BOOLEAN | DEFAULT TRUE | Cevapları göster |
| shuffle_questions | BOOLEAN | DEFAULT FALSE | Soruları karıştır |
| shuffle_answers | BOOLEAN | DEFAULT FALSE | Cevapları karıştır |
| status | VARCHAR(20) | DEFAULT 'draft', INDEX | Durum |
| is_published | BOOLEAN | DEFAULT FALSE, INDEX | Yayında mı |
| available_from | DATETIME | | Başlangıç tarihi |
| available_until | DATETIME | | Bitiş tarihi |
| total_attempts | INTEGER | DEFAULT 0 | Toplam deneme |
| average_score | DECIMAL(5,2) | DEFAULT 0 | Ortalama puan |
| pass_rate | DECIMAL(5,2) | DEFAULT 0 | Geçme oranı |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

#### `exam_questions`
Sınav-soru ilişkisi.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| exam_id | INTEGER | FK(exams.id), INDEX | Sınav |
| question_id | INTEGER | FK(questions.id), INDEX | Soru |
| order_index | INTEGER | DEFAULT 0 | Sıralama |
| points | INTEGER | | Özel puan (varsa) |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

#### `exam_results`
Sınav sonuçları.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| user_id | INTEGER | FK(users.id), INDEX | Kullanıcı |
| exam_id | INTEGER | FK(exams.id), INDEX | Sınav |
| status | VARCHAR(20) | DEFAULT 'in_progress', INDEX | Durum |
| started_at | DATETIME | | Başlangıç |
| submitted_at | DATETIME | | Teslim |
| total_points | INTEGER | DEFAULT 0 | Toplam puan |
| earned_points | INTEGER | DEFAULT 0 | Kazanılan puan |
| score_percent | DECIMAL(5,2) | | Yüzde |
| is_passed | BOOLEAN | | Geçti mi |
| time_spent_seconds | INTEGER | | Harcanan süre |
| attempt_number | INTEGER | DEFAULT 1 | Deneme numarası |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

#### `exam_answers`
Sınav cevapları.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| exam_result_id | INTEGER | FK(exam_results.id), INDEX | Sınav sonucu |
| question_id | INTEGER | FK(questions.id), INDEX | Soru |
| selected_answer_ids | JSON | | Seçilen cevaplar |
| answer_text | TEXT | | Yazılı cevap |
| is_correct | BOOLEAN | | Doğru mu |
| points_earned | INTEGER | DEFAULT 0 | Kazanılan puan |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

---

### 7. Live Sessions

#### `live_sessions`
Canlı dersler.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| title | VARCHAR(200) | NOT NULL | Ders başlığı |
| description | TEXT | | Açıklama |
| meeting_url | VARCHAR(500) | NOT NULL | Toplantı linki |
| meeting_platform | VARCHAR(50) | | Platform (zoom, meet) |
| scheduled_start | DATETIME | NOT NULL, INDEX | Planlanan başlangıç |
| scheduled_end | DATETIME | NOT NULL | Planlanan bitiş |
| actual_start | DATETIME | | Gerçek başlangıç |
| actual_end | DATETIME | | Gerçek bitiş |
| status | VARCHAR(20) | DEFAULT 'scheduled', INDEX | Durum |
| max_participants | INTEGER | DEFAULT 100 | Maksimum katılımcı |
| recording_url | VARCHAR(500) | | Kayıt URL |
| recording_available | BOOLEAN | DEFAULT FALSE | Kayıt var mı |
| course_id | INTEGER | FK(courses.id), INDEX | Kurs |
| topic_id | INTEGER | FK(topics.id) | Konu |
| host_id | INTEGER | FK(users.id), INDEX | Sunucu |
| is_active | BOOLEAN | DEFAULT TRUE | Aktif mi |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

#### `session_attendances`
Ders katılımları.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| session_id | INTEGER | FK(live_sessions.id), INDEX | Oturum |
| user_id | INTEGER | FK(users.id), INDEX | Kullanıcı |
| registered_at | DATETIME | DEFAULT NOW() | Kayıt tarihi |
| joined_at | DATETIME | | Katılım tarihi |
| left_at | DATETIME | | Ayrılma tarihi |
| attended | BOOLEAN | DEFAULT FALSE | Katıldı mı |
| attendance_duration_minutes | INTEGER | DEFAULT 0 | Katılım süresi |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |

---

### 8. Evaluations

#### `evaluations`
Öğretmen değerlendirmeleri.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| student_id | INTEGER | FK(users.id), INDEX | Öğrenci |
| teacher_id | INTEGER | FK(users.id), INDEX | Öğretmen |
| course_id | INTEGER | FK(courses.id), INDEX | Kurs |
| rating | INTEGER | | Puan (1-5) |
| feedback | TEXT | | Geri bildirim |
| strengths | JSON | | Güçlü yönler |
| improvements | JSON | | Gelişim alanları |
| goals | JSON | | Hedefler |
| performance_data | JSON | | Performans verileri |
| is_visible_to_student | BOOLEAN | DEFAULT TRUE | Öğrenci görebilir mi |
| evaluation_date | DATETIME | DEFAULT NOW(), INDEX | Değerlendirme tarihi |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

#### `student_progress`
Öğrenci ilerleme takibi.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | INTEGER | PK, AUTO | Birincil anahtar |
| user_id | INTEGER | FK(users.id), INDEX | Kullanıcı |
| course_id | INTEGER | FK(courses.id), INDEX | Kurs |
| topic_id | INTEGER | FK(topics.id) | Konu |
| videos_total | INTEGER | DEFAULT 0 | Toplam video |
| videos_completed | INTEGER | DEFAULT 0 | Tamamlanan video |
| total_watch_time_seconds | INTEGER | DEFAULT 0 | Toplam izleme süresi |
| questions_total | INTEGER | DEFAULT 0 | Toplam soru |
| questions_attempted | INTEGER | DEFAULT 0 | Denenen soru |
| questions_correct | INTEGER | DEFAULT 0 | Doğru soru |
| exams_total | INTEGER | DEFAULT 0 | Toplam sınav |
| exams_passed | INTEGER | DEFAULT 0 | Geçilen sınav |
| overall_progress | DECIMAL(5,2) | DEFAULT 0 | Genel ilerleme |
| last_activity_at | DATETIME | | Son aktivite |
| created_at | DATETIME | DEFAULT NOW() | Oluşturma zamanı |
| updated_at | DATETIME | DEFAULT NOW() | Güncelleme zamanı |

---

### 9. Audit Logs

#### `audit_logs`
Sistem denetim logları.

| Kolon | Tip | Kısıtlamalar | Açıklama |
|-------|-----|--------------|----------|
| id | BIGINT | PK, AUTO | Birincil anahtar |
| user_id | INTEGER | FK(users.id), INDEX | Kullanıcı |
| user_email | VARCHAR(255) | | E-posta (anlık kayıt) |
| user_role | VARCHAR(50) | | Rol (anlık kayıt) |
| session_id | VARCHAR(100) | INDEX | Oturum ID |
| action | VARCHAR(50) | NOT NULL, INDEX | İşlem |
| action_category | VARCHAR(50) | | Kategori |
| resource_type | VARCHAR(50) | | Kaynak tipi |
| resource_id | INTEGER | | Kaynak ID |
| resource_name | VARCHAR(255) | | Kaynak adı |
| description | TEXT | | Açıklama |
| severity | VARCHAR(20) | DEFAULT 'info', INDEX | Önem seviyesi |
| old_values | JSON | | Önceki değerler |
| new_values | JSON | | Yeni değerler |
| changed_fields | JSON | | Değişen alanlar |
| ip_address | VARCHAR(45) | | IP adresi |
| user_agent | VARCHAR(500) | | Tarayıcı bilgisi |
| request_method | VARCHAR(10) | | HTTP metodu |
| request_path | VARCHAR(500) | | İstek yolu |
| request_id | VARCHAR(100) | | Korelasyon ID |
| country | VARCHAR(100) | | Ülke |
| city | VARCHAR(100) | | Şehir |
| success | BOOLEAN | DEFAULT TRUE | Başarılı mı |
| error_message | TEXT | | Hata mesajı |
| metadata | JSON | | Ek veriler |
| duration_ms | INTEGER | | Süre (ms) |
| created_at | DATETIME | NOT NULL, INDEX | Oluşturma zamanı |

**Audit İşlem Tipleri:**
- **CRUD:** create, read, update, delete
- **Auth:** login, logout, login_failed, password_change, password_reset
- **Authorization:** permission_granted, permission_denied, role_change
- **User:** user_activate, user_deactivate, user_verify
- **Course:** course_publish, course_unpublish, enrollment, unenrollment
- **Exam:** exam_start, exam_submit, exam_grade
- **Package:** package_purchase, package_cancel, package_renew, package_expire
- **Admin:** bulk_operation, data_export, data_import, settings_change
- **Security:** security_alert, rate_limit_hit, suspicious_activity
- **AI:** ai_request, ai_violation

**Önem Seviyeleri:**
- `debug` - Geliştirme
- `info` - Bilgi
- `warning` - Uyarı
- `error` - Hata
- `critical` - Kritik

---

## 🔧 Index Stratejisi

### Primary Key Indexes (Otomatik)
Tüm tablolarda `id` kolonunda otomatik olarak oluşturulur.

### Foreign Key Indexes
Tüm FK kolonlarında performans için index oluşturulmuştur.

### Composite Indexes
Sık kullanılan sorgu kalıpları için bileşik indexler:

```sql
-- Kullanıcı aramaları
CREATE INDEX idx_users_role_active ON users(role_id, is_active);
CREATE INDEX idx_users_verified_active ON users(is_verified, is_active);

-- Aktif abonelikler
CREATE INDEX idx_user_packages_user_status ON user_packages(user_id, subscription_status);
CREATE INDEX idx_user_packages_active_expires ON user_packages(subscription_status, expires_at);

-- Audit log sorguları
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_created_severity ON audit_logs(created_at, severity);

-- Kayıt filtreleme
CREATE INDEX idx_enrollments_user_course ON enrollments(student_id, course_id);

-- Video sıralama
CREATE INDEX idx_videos_topic_order ON videos(topic_id, order_index);
```

---

## 🔒 Constraints

### Check Constraints
```sql
-- Packages
CHECK (price >= 0)
CHECK (discount_price IS NULL OR discount_price >= 0)
CHECK (duration_days > 0 OR package_type = 'lifetime')

-- Evaluations
CHECK (rating BETWEEN 1 AND 5)

-- Progress
CHECK (progress_percent BETWEEN 0 AND 100)
```

### Unique Constraints
```sql
-- Kullanıcı e-postası
UNIQUE (email)

-- URL slugları
UNIQUE (slug)

-- Kayıt tekrarı önleme
UNIQUE (student_id, course_id) -- enrollments
UNIQUE (user_id, video_id) -- video_progress
UNIQUE (user_id, package_id, starts_at) -- user_packages
```

---

## 📈 Partitioning Önerileri

Yüksek trafikli sistemler için aşağıdaki tablolar partition edilebilir:

### audit_logs (Range Partitioning)
```sql
CREATE TABLE audit_logs (
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### video_progress (Hash Partitioning)
```sql
CREATE TABLE video_progress (
    ...
) PARTITION BY HASH (user_id);
```

---

## 🔄 Migration Yönetimi

### Migration Dosyası
Migration dosyası `migrations/versions/add_packages_audit.py` konumunda.

### Migration Komutları
```bash
# Migration uygula
flask db upgrade

# Migration geri al
flask db downgrade

# Yeni migration oluştur
flask db migrate -m "description"
```

---

## 📊 İstatistikler ve Bakım

### Analyze Komutları
```sql
-- Tüm tablolar için istatistik güncelle
ANALYZE;

-- Belirli tablo için
ANALYZE users;
ANALYZE audit_logs;
```

### Vacuum Komutları
```sql
-- Ölü satırları temizle
VACUUM ANALYZE audit_logs;

-- Tam temizlik (kilitleme gerektirir)
VACUUM FULL audit_logs;
```

### Index Bakımı
```sql
-- Index yeniden oluşturma
REINDEX INDEX idx_audit_logs_created;

-- Tablo için tüm indexleri yeniden oluştur
REINDEX TABLE audit_logs;
```

---

## 🚀 Performans İpuçları

1. **Connection Pooling:** PgBouncer veya SQLAlchemy pool kullanın
2. **Prepared Statements:** Sık çalışan sorgular için
3. **Pagination:** Büyük veri setlerinde LIMIT/OFFSET yerine keyset pagination
4. **Lazy Loading:** İlişkili verileri sadece gerektiğinde yükleyin
5. **Bulk Operations:** Toplu insert/update için batch işlemleri kullanın
6. **Audit Log Archiving:** Eski logları arşivleyin, silmeyin

---

## 📝 Versiyon Geçmişi

| Tarih | Değişiklik | Migration |
|-------|------------|-----------|
| 2025-01-09 | packages, user_packages, audit_logs eklendi | add_packages_audit |
| Önceki | AI tabloları eklendi | add_ai_tables |
| Önceki | Temel şema oluşturuldu | initial |
