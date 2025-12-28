# İçerik Yönetim Modülü - AI Danışman Desteği

## 📋 Genel Bakış

Bu doküman, AI danışman destekli içerik yönetim modülünün mimarisini açıklar.

### Temel İlkeler

| İlke | Açıklama |
|------|----------|
| **AI İçeriği Değiştirmez** | AI, orijinal içeriği otomatik olarak değiştirmez |
| **Yeni İçerik Oluşturmaz** | AI, sisteme kalıcı yeni içerik eklemez |
| **Admin Onayı Şart** | Kalıcı veri üretimi için admin onayı gerekir |
| **Read-Only Yardım** | Öğrenciler için AI yardımı sadece okuma amaçlıdır |

---

## 🏗️ Mimari Tasarım

### Katmanlı Yapı

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  Öğrenci UI     │  │  Öğretmen UI    │  │   Admin UI      │         │
│  │  (Read-Only AI) │  │  (Suggestions)  │  │  (Approvals)    │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
└───────────┼────────────────────┼────────────────────┼───────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY / ROUTES                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    routes_ai.py                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ /ai/explain │  │ /ai/suggest │  │ /ai/review  │              │   │
│  │  │ /ai/simplify│  │ /ai/my      │  │ /ai/apply   │              │   │
│  │  │ /ai/examples│  └─────────────┘  │ /ai/pending │              │   │
│  │  │ /ai/ask     │                   └─────────────┘              │   │
│  │  │ /ai/summary │       ▲                 ▲                       │   │
│  │  └──────┬──────┘       │                 │                       │   │
│  │         │              │                 │                       │   │
│  │         │       ROLE: teacher      ROLE: admin                   │   │
│  │         │                                                        │   │
│  │    ROLE: any                                                     │   │
│  └─────────┼────────────────────────────────────────────────────────┘   │
└────────────┼────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVICE LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ai_service.py                                 │   │
│  │                                                                  │   │
│  │  ContentAIService                                               │   │
│  │  ├── explain_content()      # İçeriği açıkla (kalıcı değil)    │   │
│  │  ├── simplify_content()     # Sadeleştir (kalıcı değil)        │   │
│  │  ├── suggest_examples()     # Örnek öner (kalıcı değil)        │   │
│  │  ├── answer_question()      # Soru cevapla (kalıcı değil)      │   │
│  │  ├── summarize_content()    # Özetle (kalıcı değil)            │   │
│  │  └── create_enhancement_suggestion()  # Öneri oluştur          │   │
│  │                                         (admin onayı gerekir)   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI MODULE                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    app/modules/ai/                               │   │
│  │  ├── providers/      # Mock & OpenAI providers                  │   │
│  │  ├── prompts/        # YAML prompt templates                    │   │
│  │  ├── quota/          # Rate limiting & kota                     │   │
│  │  └── services.py     # AI service facade                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                         │
│  ┌─────────────┐  ┌─────────────────────┐  ┌───────────────────────┐   │
│  │   videos    │  │ content_ai_         │  │ content_ai_           │   │
│  │  documents  │  │   suggestions       │  │   interactions        │   │
│  │             │  │ (admin onay bekler) │  │ (90 gün sonra silinir)│   │
│  └─────────────┘  └─────────────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Güvenlik Katmanları

### 1. AI İçeriği Değiştirmez

```python
# ❌ YANLIŞ - AI doğrudan içerik değiştirir
content.description = ai_response.text
db.session.commit()

# ✅ DOĞRU - AI sadece yanıt döndürür, içerik değişmez
return {
    'explanation': ai_response.text,
    'disclaimer': 'Bu AI tarafından üretilmiştir',
    'is_ai_generated': True
}
```

### 2. Yeni İçerik Oluşturmaz

```python
# ❌ YANLIŞ - AI yeni içerik oluşturur
new_video = Video(title=ai_generated_title, ...)
db.session.add(new_video)

# ✅ DOĞRU - AI öneri oluşturur, admin onaylar
suggestion = ContentAISuggestion(
    content_id=existing_content.id,
    suggested_content=ai_response,
    status='pending'  # Admin onayı bekler
)
```

### 3. Admin Onayı Olmadan Kalıcı Veri Üretmez

```
┌────────────────────────────────────────────────────────────────┐
│                    ÖNERİ WORKFLOW'U                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Öğretmen                   Admin                 Sistem       │
│     │                         │                     │          │
│     │  1. Öneri iste          │                     │          │
│     │─────────────────────────┼────────────────────►│          │
│     │                         │                     │          │
│     │                         │  2. AI öneri üretir │          │
│     │                         │◄────────────────────│          │
│     │                         │                     │          │
│     │  3. Öneri PENDING       │     (Kalıcı veri    │          │
│     │     durumda kaydedilir  │      YOK)           │          │
│     │◄────────────────────────┼─────────────────────│          │
│     │                         │                     │          │
│     │                         │  4. İncele          │          │
│     │                         │◄────────────────────│          │
│     │                         │                     │          │
│     │                         │  5. Onayla/Reddet   │          │
│     │                         │────────────────────►│          │
│     │                         │                     │          │
│     │                         │  6. Uygula (Sadece  │          │
│     │                         │     onaylanmışsa)   │          │
│     │                         │────────────────────►│          │
│     │                         │                     │          │
│     │                         │  7. İçerik          │          │
│     │                         │     güncellenir     │          │
│     │                         │     (YENİ VERSİYON) │          │
│     │                         │                     │          │
└─────┴─────────────────────────┴─────────────────────┴──────────┘
```

---

## 📡 API Endpoint Yapısı

### Öğrenci Endpoint'leri (Read-Only)

| Method | Endpoint | Açıklama | Rate Limit |
|--------|----------|----------|------------|
| POST | `/api/v1/contents/{type}/{id}/ai/explain` | İçeriği açıkla | 30/dk |
| POST | `/api/v1/contents/{type}/{id}/ai/simplify` | Sadeleştir | 20/dk |
| POST | `/api/v1/contents/{type}/{id}/ai/examples` | Örnek öner | 20/dk |
| POST | `/api/v1/contents/{type}/{id}/ai/ask` | Soru cevapla | 30/dk |
| POST | `/api/v1/contents/{type}/{id}/ai/summarize` | Özetle | 20/dk |
| POST | `/api/v1/contents/{type}/{id}/ai/feedback` | Feedback ver | - |

**Örnek İstek:**
```http
POST /api/v1/contents/video/123/ai/explain
Authorization: Bearer <token>
Content-Type: application/json

{
  "specific_part": "integral hesaplama",
  "level": "beginner"
}
```

**Örnek Yanıt:**
```json
{
  "success": true,
  "data": {
    "explanation": "İntegral, türevin tersi işlemidir...",
    "content_id": 123,
    "content_type": "video",
    "level": "beginner",
    "disclaimer": "Bu açıklama AI tarafından üretilmiştir ve orijinal içeriği değiştirmez.",
    "is_ai_generated": true,
    "generated_at": "2025-01-18T10:30:00Z"
  }
}
```

### Öğretmen Endpoint'leri (Suggestion)

| Method | Endpoint | Açıklama | Rate Limit |
|--------|----------|----------|------------|
| POST | `/api/v1/contents/ai/suggestions` | Öneri oluştur | 10/dk |
| GET | `/api/v1/contents/ai/suggestions/my` | Önerilerimi listele | - |

**Örnek İstek:**
```http
POST /api/v1/contents/ai/suggestions
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "content_id": 123,
  "content_type": "video",
  "enhancement_type": "examples",
  "details": {
    "example_count": 5
  }
}
```

### Admin Endpoint'leri (Approval)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/contents/ai/suggestions/pending` | Bekleyen öneriler |
| GET | `/api/v1/contents/ai/suggestions/{id}` | Öneri detayı |
| POST | `/api/v1/contents/ai/suggestions/{id}/review` | Onayla/Reddet |
| POST | `/api/v1/contents/ai/suggestions/{id}/apply` | İçeriğe uygula |
| GET | `/api/v1/contents/ai/analytics` | AI analizi |

---

## 📊 Veritabanı Şeması

### content_ai_suggestions

```sql
CREATE TABLE content_ai_suggestions (
    id SERIAL PRIMARY KEY,
    
    -- İçerik referansı
    content_category VARCHAR(50) NOT NULL,  -- 'video', 'document'
    content_id INTEGER NOT NULL,
    
    -- Öneri bilgileri
    suggestion_type VARCHAR(50) NOT NULL,   -- 'examples', 'quiz', 'summary'
    suggested_content TEXT NOT NULL,
    
    -- Durum (WORKFLOW)
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' -> 'approved' -> 'applied'
    --           -> 'rejected'
    --           -> 'expired'
    
    -- Kullanıcılar
    suggested_by_id INTEGER REFERENCES users(id),
    reviewed_by_id INTEGER REFERENCES users(id),
    applied_by_id INTEGER REFERENCES users(id),
    
    -- Tarihler
    reviewed_at TIMESTAMP,
    applied_at TIMESTAMP,
    expires_at TIMESTAMP,  -- 30 gün sonra expire
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- İnceleme notları
    review_notes TEXT,
    rejection_reason VARCHAR(500),
    
    -- AI bilgileri
    ai_model_used VARCHAR(50),
    ai_tokens_used INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX ix_suggestions_content ON content_ai_suggestions(content_category, content_id);
CREATE INDEX ix_suggestions_status ON content_ai_suggestions(status);
CREATE INDEX ix_suggestions_pending ON content_ai_suggestions(status, created_at) WHERE status = 'pending';
```

### content_ai_interactions

```sql
CREATE TABLE content_ai_interactions (
    id SERIAL PRIMARY KEY,
    
    -- Kullanıcı
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- İçerik
    content_category VARCHAR(50) NOT NULL,
    content_id INTEGER NOT NULL,
    
    -- Etkileşim
    interaction_type VARCHAR(50) NOT NULL,  -- 'explain', 'simplify', 'ask', etc.
    user_input TEXT,  -- Kullanıcının sorusu (varsa)
    response_summary VARCHAR(500),  -- AI yanıtı özeti (tam değil - KVKK)
    
    -- Metrikler
    response_time_ms INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    
    -- Feedback
    was_helpful BOOLEAN,
    feedback_rating INTEGER,  -- 1-5
    
    -- KVKK - Otomatik silme
    expires_at TIMESTAMP,  -- 90 gün sonra silinir
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX ix_interactions_user ON content_ai_interactions(user_id);
CREATE INDEX ix_interactions_content ON content_ai_interactions(content_category, content_id);
CREATE INDEX ix_interactions_expires ON content_ai_interactions(expires_at);
```

---

## 🔄 Veri Akışları

### 1. Öğrenci AI Yardımı Akışı

```
Öğrenci                  Backend                    AI Service
   │                        │                           │
   │  1. İçeriği görüntüle  │                           │
   │───────────────────────►│                           │
   │                        │                           │
   │  2. AI'ya soru sor     │                           │
   │───────────────────────►│                           │
   │                        │  3. Kota kontrolü         │
   │                        │─────────────────────────► │
   │                        │                           │
   │                        │  4. AI çağrısı            │
   │                        │─────────────────────────► │
   │                        │                           │
   │                        │  5. Yanıt                 │
   │                        │◄───────────────────────── │
   │                        │                           │
   │                        │  6. Etkileşimi logla      │
   │                        │  (90 gün sonra silinir)   │
   │                        │                           │
   │  7. AI yanıtı          │                           │
   │◄───────────────────────│                           │
   │                        │                           │
   │  (İçerik DEĞİŞMEDİ)   │                           │
   │                        │                           │
```

### 2. Öğretmen Öneri Akışı

```
Öğretmen                 Backend                    Admin
   │                        │                         │
   │  1. Öneri iste         │                         │
   │───────────────────────►│                         │
   │                        │                         │
   │                        │  2. AI öneri üretir     │
   │                        │                         │
   │                        │  3. PENDING olarak      │
   │                        │     kaydet              │
   │                        │                         │
   │  4. Öneri oluşturuldu  │                         │
   │◄───────────────────────│                         │
   │                        │                         │
   │                        │  5. Bekleyen önerileri  │
   │                        │     listele             │
   │                        │◄────────────────────────│
   │                        │                         │
   │                        │  6. İncele              │
   │                        │◄────────────────────────│
   │                        │                         │
   │                        │  7. Onayla              │
   │                        │◄────────────────────────│
   │                        │                         │
   │                        │  8. Uygula              │
   │                        │◄────────────────────────│
   │                        │                         │
   │                        │  9. İçerik güncellenir  │
   │                        │     (Yeni versiyon)     │
   │                        │                         │
```

---

## ⚠️ Güvenlik Kontrolleri

### Rate Limiting

```python
@rate_limit(limit=30, period=60)  # Dakikada 30 istek
def ai_explain_content():
    pass
```

### Role-Based Access

```python
# Öğrenci - Sadece okuma
@jwt_required()
def ai_explain_content():
    pass

# Öğretmen - Öneri oluşturma
@jwt_required()
@require_role(['teacher', 'admin'])
def create_ai_suggestion():
    pass

# Admin - Onaylama
@jwt_required()
@require_role(['admin'])
def review_suggestion():
    pass
```

### Token Kotası

```python
# Her AI çağrısı kota kontrolünden geçer
result = ai_service.call_ai(
    user_id=user.id,
    feature=AIFeature.CONTENT_ENHANCEMENT,
    # Kota aşılırsa AIQuotaExceededError
)
```

---

## 📈 KVKK Uyumluluk

### Veri Saklama Süreleri

| Veri Türü | Saklama Süresi | İşlem |
|-----------|----------------|-------|
| AI Etkileşimleri | 90 gün | Otomatik silme |
| Onaylanmamış Öneriler | 30 gün | Expire olur |
| Onaylanmış Öneriler | Süresiz | Versiyon olarak saklanır |
| AI Yanıtları | Saklanmaz | Sadece döndürülür |

### Anonimleştirme

```python
# Etkileşim kaydında tam AI yanıtı saklanmaz
interaction = ContentAIInteraction(
    user_input=data['question'][:500],  # Truncate
    response_summary=result['answer'][:500],  # Sadece özet
    expires_at=datetime.utcnow() + timedelta(days=90)  # KVKK
)
```

---

## 🧪 Test Senaryoları

### 1. Öğrenci AI Yardımı

```python
def test_student_can_get_ai_explanation():
    response = client.post(
        '/api/v1/contents/video/1/ai/explain',
        headers={'Authorization': f'Bearer {student_token}'},
        json={'level': 'beginner'}
    )
    assert response.status_code == 200
    assert response.json['data']['is_ai_generated'] == True
    
    # İçerik değişmemiş olmalı
    video = Video.query.get(1)
    assert video.description == original_description
```

### 2. Öneri Onay Workflow

```python
def test_suggestion_requires_admin_approval():
    # Öğretmen öneri oluşturur
    response = client.post(
        '/api/v1/contents/ai/suggestions',
        headers={'Authorization': f'Bearer {teacher_token}'},
        json={...}
    )
    suggestion_id = response.json['data']['id']
    
    # Öneri PENDING durumunda
    suggestion = ContentAISuggestion.query.get(suggestion_id)
    assert suggestion.status == SuggestionStatus.PENDING
    
    # İçerik değişmemiş
    video = Video.query.get(content_id)
    assert 'ai_examples' not in video.extra_data
    
    # Admin onaylar
    client.post(
        f'/api/v1/contents/ai/suggestions/{suggestion_id}/review',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'action': 'approve'}
    )
    
    # Admin uygular
    client.post(
        f'/api/v1/contents/ai/suggestions/{suggestion_id}/apply',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    # Şimdi içerik güncellendi
    video = Video.query.get(content_id)
    assert 'ai_examples' in video.extra_data
```

---

## 📁 Dosya Yapısı

```
app/modules/contents/
├── __init__.py           # Blueprint ve exports
├── models.py             # Video, Document, ContentVersion
├── models_ai.py          # ContentAISuggestion, ContentAIInteraction
├── routes.py             # Temel içerik endpoint'leri
├── routes_ai.py          # AI destekli endpoint'ler
├── services.py           # İçerik servisleri
├── ai_service.py         # AI içerik servisi
├── schemas.py            # Temel şemalar
└── schemas_ai.py         # AI şemaları
```

---

## 🚀 Kurulum ve Migration

```bash
# Migration oluştur
flask db migrate -m "Add content AI tables"

# Migration uygula
flask db upgrade

# Test
python -c "from app.modules.contents import ContentAISuggestion; print('OK')"
```
