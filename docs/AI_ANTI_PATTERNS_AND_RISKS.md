# 🛡️ AI Anti-Pattern ve Risk Listesi

Bu doküman, AI Danışman modülündeki potansiyel güvenlik risklerini, anti-pattern'leri ve bunların önleme yöntemlerini detaylı şekilde açıklar.

---

## 📋 İçindekiler

1. [Güvenlik Riskleri](#-güvenlik-riskleri)
2. [Performans & Maliyet Riskleri](#-performans--maliyet-riskleri)
3. [Pedagojik & Ürün Riskleri](#-pedagojik--ürün-riskleri)
4. [Uygulanan Önlemler](#-uygulanan-önlemler)
5. [Kontrol Listesi](#-kontrol-listesi)

---

## 🔐 Güvenlik Riskleri

### 1. AI Chat Promptlarının Frontend'de Hardcode Edilmesi

#### ❌ Neden Tehlikeli?
- Prompt'lar client-side JavaScript'te görünür
- Prompt injection saldırıları kolaylaşır
- Sistem davranışı manipüle edilebilir
- Rakipler prompt engineering stratejinizi kopyalayabilir

#### 🔍 Nasıl Tespit Edilir?
```bash
# Frontend kodunda prompt araması
grep -r "system.*prompt\|role.*system\|You are" frontend/src/
```

#### ✅ Önleme Yöntemleri

**Backend:**
- Tüm prompt'lar `app/modules/ai/prompts/templates/` klasöründe YAML olarak saklanır
- `PromptManager` class'ı template'leri yükler ve render eder
- Frontend'e sadece feature adı gönderilir

**Frontend:**
```typescript
// ❌ YANLIŞ - Prompt frontend'de
const response = await api.post('/ai/chat', {
  messages: [
    { role: 'system', content: 'Sen bir eğitim asistanısın...' },
    { role: 'user', content: userMessage }
  ]
});

// ✅ DOĞRU - Sadece feature adı
const response = await api.post('/ai/hint', {
  question_text: userMessage,
  difficulty_level: 'medium'
});
```

**Dosyalar:**
- `app/modules/ai/prompts/manager.py` - Template yönetimi
- `app/modules/ai/prompts/templates/*.yaml` - Prompt dosyaları

---

### 2. AI API Anahtarının Backend Dışına Sızması

#### ❌ Neden Tehlikeli?
- Kötü niyetli kullanıcılar anahtarı kullanabilir
- Maliyet kontrolü kaybedilir
- API kullanım limitleri aşılabilir
- Yasal sorumluluk doğar

#### 🔍 Nasıl Tespit Edilir?
```bash
# Git history'de API key araması
git log -p | grep -i "sk-\|api_key\|apikey"

# Environment variable kontrolü
grep -r "OPENAI\|API_KEY" --include="*.ts" --include="*.tsx" frontend/

# Log dosyalarında API key kontrolü
grep -r "sk-" logs/
```

#### ✅ Önleme Yöntemleri

**Backend:**
```python
# app/modules/ai/config.py - Güvenli API key yönetimi
class AIConfig:
    def get_masked_api_key(self) -> str:
        """Log için maskelenmiş key döner."""
        if not self._api_key:
            return "[NOT_SET]"
        return f"{self._api_key[:7]}...{self._api_key[-4:]}"
    
    def validate_api_key(self, key: str) -> bool:
        """API key formatını doğrula."""
        if not key:
            return False
        return key.startswith(('sk-', 'sk-proj-'))
```

**Environment:**
```bash
# .env dosyası (git'e eklenmemeli)
OPENAI_API_KEY=sk-proj-xxx...

# .gitignore
.env
.env.local
*.env
```

**Log Sanitization:**
```python
# app/modules/ai/security/sanitizer.py
class OutputSanitizer:
    SECRET_PATTERNS = [
        r'sk-[a-zA-Z0-9]{20,}',  # OpenAI keys
        r'api[_-]?key["\s:=]+[a-zA-Z0-9]{20,}',
    ]
```

---

### 3. Öğrenci Verilerinin Prompt İçine Kontrolsüz Eklenmesi

#### ❌ Neden Tehlikeli?
- KVKK/GDPR ihlali
- Öğrenci mahremiyeti tehlikeye girer
- AI provider'a kişisel veri sızar
- Yasal yaptırımlar

#### 🔍 Nasıl Tespit Edilir?
```python
# Prompt içeriğinde PII kontrolü
grep -r "student_name\|email\|tc_kimlik\|phone" app/modules/ai/
```

#### ✅ Önleme Yöntemleri

**Backend - PII Detection & Masking:**
```python
# app/modules/ai/security/detector.py
class PIIDetector:
    """Kişisel veri tespit sistemi."""
    
    PATTERNS = {
        "tc_kimlik": r"\b[1-9][0-9]{10}\b",
        "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "phone": r"\b(05\d{9}|\+90\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2})\b",
        "credit_card": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
    }
    
    def detect_and_mask(self, content: str) -> str:
        """PII tespit et ve maskele."""
        for pii_type, pattern in self.PATTERNS.items():
            content = re.sub(pattern, f"[{pii_type.upper()}_MASKED]", content)
        return content
```

**Prompt Template'lerinde Güvenli Değişkenler:**
```yaml
# templates/question_hint.yaml
required_variables:
  - question_text    # ✅ Güvenli - soru içeriği
  - difficulty_level # ✅ Güvenli - zorluk seviyesi

# ❌ YASAK değişkenler (template'de kullanılamaz)
forbidden_variables:
  - student_name
  - student_email
  - tc_kimlik
  - phone_number
```

---

### 4. AI Çıktılarının Loglarda Kişisel Veri İçermesi

#### ❌ Neden Tehlikeli?
- Log dosyaları sızarsa KVKK ihlali
- Compliance denetimleri başarısız olur
- Forensics zorlaşır (aşırı veri)

#### 🔍 Nasıl Tespit Edilir?
```bash
# Log dosyalarında PII araması
grep -E "[1-9][0-9]{10}|[a-zA-Z0-9._%+-]+@|05[0-9]{9}" logs/*.log
```

#### ✅ Önleme Yöntemleri

**Backend - Output Log Sanitization:**
```python
# app/modules/ai/security/audit.py
class SecurityAuditLogger:
    def _sanitize_for_log(self, content: str) -> str:
        """Log için içeriği temizle."""
        # PII maskele
        content = self.pii_detector.mask(content)
        # İlk 100 karakteri al
        if len(content) > 100:
            content = content[:100] + "...[TRUNCATED]"
        return content
    
    def log_ai_response(self, response: str, user_id: int):
        """AI yanıtını güvenli şekilde logla."""
        self.log(SecurityEvent(
            event_type=SecurityEventType.AI_RESPONSE,
            content_hash=hashlib.sha256(response.encode()).hexdigest()[:16],
            content_preview=self._sanitize_for_log(response),
            user_id=user_id
        ))
```

**Log Retention Policy:**
```python
# 90 gün sonra otomatik temizlik
RETENTION_DAYS = 90
```

---

## ⚙️ Performans & Maliyet Riskleri

### 5. Her Mesajda Context'in Sınırsız Büyümesi

#### ❌ Neden Tehlikeli?
- Token maliyeti katlanarak artar
- API rate limitleri aşılır
- Yanıt süresi uzar
- Memory overflow riski

#### 🔍 Nasıl Tespit Edilir?
```python
# Context boyutu metriği
avg_context_tokens = sum(request.context_tokens for request in requests) / len(requests)
if avg_context_tokens > 2000:
    alert("Context boyutu çok büyük!")
```

#### ✅ Önleme Yöntemleri

**Backend - Context Limiter Middleware:**
```python
# app/modules/ai/middleware/context_limiter.py
class ContextLimiter:
    MAX_CONTEXT_TOKENS = 2000
    MAX_CONVERSATION_HISTORY = 10
    
    def limit_context(self, messages: List[dict]) -> List[dict]:
        """Context'i sınırla."""
        # Son N mesajı al
        messages = messages[-self.MAX_CONVERSATION_HISTORY:]
        
        # Token sayısını kontrol et
        total_tokens = sum(self._count_tokens(m) for m in messages)
        while total_tokens > self.MAX_CONTEXT_TOKENS and len(messages) > 2:
            messages.pop(0)  # En eski mesajı kaldır
            total_tokens = sum(self._count_tokens(m) for m in messages)
        
        return messages
```

**Frontend - Conversation Pruning:**
```typescript
// stores/aiChatStore.ts
const MAX_MESSAGES = 10;

function addMessage(message: ChatMessage) {
  messages.push(message);
  // Eski mesajları temizle
  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(-MAX_MESSAGES);
  }
}
```

---

### 6. Streaming Response Yönetilmemesi

#### ❌ Neden Tehlikeli?
- Kullanıcı uzun süre bekler (UX kötü)
- Timeout hataları
- Connection kaynakları tükenir

#### 🔍 Nasıl Tespit Edilir?
```python
# Ortalama yanıt süresi > 10 saniye ise sorun var
if avg_response_time > 10:
    alert("Streaming implemente edilmeli!")
```

#### ✅ Önleme Yöntemleri

**Backend - SSE Streaming:**
```python
# app/modules/ai/routes_v3.py
@ai_bp.route('/stream/hint', methods=['POST'])
@jwt_required()
def stream_hint():
    """Server-Sent Events ile streaming."""
    def generate():
        for chunk in ai_service.stream_hint(data):
            yield f"data: {json.dumps(chunk)}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )
```

**Frontend - EventSource:**
```typescript
// services/aiStreamService.ts
function streamHint(question: string, onChunk: (text: string) => void) {
  const eventSource = new EventSource(`/api/v1/ai/stream/hint?q=${encodeURIComponent(question)}`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onChunk(data.text);
  };
  
  eventSource.onerror = () => eventSource.close();
}
```

---

### 7. AI Rate Limit Olmaması

#### ❌ Neden Tehlikeli?
- Tek kullanıcı tüm kaynakları tüketebilir
- DoS saldırılarına açık
- Maliyet kontrolü imkansız

#### 🔍 Nasıl Tespit Edilir?
```python
# Dakikada 100+ istek yapan kullanıcılar
high_frequency_users = get_users_with_rpm_over(100)
```

#### ✅ Önleme Yöntemleri

**Backend - Multi-Layer Rate Limiting:**
```python
# app/modules/ai/quota/rate_limiter.py
class AIRateLimiter:
    """Çok katmanlı rate limiting."""
    
    LIMITS = {
        'global': {'rpm': 60, 'tpm': 100000, 'rpd': 10000},
        'per_user': {
            'student': {'rpm': 10, 'tpm': 10000, 'rpd': 100},
            'teacher': {'rpm': 30, 'tpm': 30000, 'rpd': 500},
        }
    }
    
    def check_limits(self, user_id: int, role: str, tokens: int) -> bool:
        # Global limit
        if self.get_global_rpm() >= self.LIMITS['global']['rpm']:
            raise AIRateLimitError("Sistem meşgul, lütfen bekleyin")
        
        # User limit
        user_limits = self.LIMITS['per_user'].get(role, self.LIMITS['per_user']['student'])
        if self.get_user_rpm(user_id) >= user_limits['rpm']:
            raise AIRateLimitError("Rate limit aşıldı")
```

---

### 8. Kullanıcı Başına AI Limitinin Olmaması

#### ❌ Neden Tehlikeli?
- Öğrenciler sistemi sınırsız kullanabilir
- Maliyet tahmin edilemez
- Adil kullanım sağlanamaz

#### 🔍 Nasıl Tespit Edilir?
```sql
SELECT user_id, COUNT(*) as request_count, SUM(tokens) as total_tokens
FROM ai_requests 
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY user_id
ORDER BY total_tokens DESC;
```

#### ✅ Önleme Yöntemleri

**Backend - Rol Bazlı Kota Sistemi:**
```python
# app/modules/ai/core/constants.py
QUOTA_LIMITS = {
    'student': {
        'daily_tokens': 1000,
        'monthly_tokens': 20000,
        'daily_requests': 20,
        'max_tokens_per_request': 200,
        'cooldown_seconds': 30,
    },
    'teacher': {
        'daily_tokens': 5000,
        'monthly_tokens': 100000,
        'daily_requests': 100,
        'max_tokens_per_request': 500,
        'cooldown_seconds': 10,
    },
    'admin': {
        'daily_tokens': 20000,
        'monthly_tokens': 500000,
        'daily_requests': 500,
        'max_tokens_per_request': 1000,
        'cooldown_seconds': 5,
    },
    'super_admin': {
        'daily_tokens': -1,  # Sınırsız
        'monthly_tokens': -1,
        'daily_requests': -1,
        'max_tokens_per_request': -1,
        'cooldown_seconds': 0,
    }
}
```

---

## 🧠 Pedagojik & Ürün Riskleri

### 9. AI'nin Öğretmen Yerine Konumlandırılması

#### ❌ Neden Tehlikeli?
- Öğrenciler öğretmene güvenini kaybeder
- Öğrenme süreci zarar görür
- Yanlış bilgi düzeltilmez

#### 🔍 Nasıl Tespit Edilir?
```python
# AI kullanım oranı vs öğretmen etkileşimi
ai_usage_ratio = ai_requests / teacher_interactions
if ai_usage_ratio > 5:
    alert("AI aşırı kullanılıyor!")
```

#### ✅ Önleme Yöntemleri

**Backend - AI Role Limitation:**
```yaml
# prompts/templates/question_hint.yaml
system_prompt: |
  Sen bir eğitim YARDIMCISISIN, öğretmen DEĞİLSİN.
  
  KRİTİK KURALLAR:
  1. Asla cevabı doğrudan verme
  2. Sadece yönlendirici ipuçları ver
  3. Öğrenciyi düşünmeye teşvik et
  4. "Öğretmeninize danışın" önerisinde bulun
  5. Karmaşık konularda öğretmene yönlendir
```

**Frontend - Disclaimer Banner:**
```typescript
// components/ai/AIDisclaimer.tsx
export const AIDisclaimer = () => (
  <Alert variant="info">
    <AlertIcon />
    <AlertDescription>
      AI asistan sadece yardımcı bir araçtır. 
      Kesin bilgi için öğretmeninize danışın.
    </AlertDescription>
  </Alert>
);
```

---

### 10. Yanlış Bilgi Üretiminin Kontrolsüz Sunulması

#### ❌ Neden Tehlikeli?
- Öğrenciler yanlış öğrenir
- Güven kaybı yaşanır
- Eğitim kalitesi düşer

#### 🔍 Nasıl Tespit Edilir?
```python
# Öğretmen düzeltme oranı
correction_rate = teacher_corrections / ai_responses
if correction_rate > 0.1:  # %10'dan fazla düzeltme
    alert("AI yanıt kalitesi düşük!")
```

#### ✅ Önleme Yöntemleri

**Backend - Confidence Score & Disclaimer:**
```python
# app/modules/ai/services/hint_service.py
class HintService:
    def generate_hint(self, question: str) -> AIResponse:
        response = self.provider.generate(prompt)
        
        # Confidence düşükse disclaimer ekle
        if response.confidence < 0.7:
            response.disclaimer = "Bu bilgi kesin olmayabilir. Lütfen öğretmeninize danışın."
        
        return response
```

**AI Output Wrapper:**
```python
# app/modules/ai/core/response_wrapper.py
@dataclass
class AIResponseWrapper:
    content: str
    confidence: float
    disclaimer: Optional[str] = None
    source_references: List[str] = field(default_factory=list)
    needs_verification: bool = False
    
    def to_safe_response(self) -> dict:
        return {
            "content": self.content,
            "disclaimer": self.disclaimer or "Bu AI tarafından üretilmiş bir içeriktir.",
            "needs_verification": self.confidence < 0.8,
            "ai_generated": True
        }
```

---

### 11. AI'nin Sınav veya Değerlendirme Süreçlerine Sızması

#### ❌ Neden Tehlikeli?
- Akademik dürüstlük ihlali
- Değerlendirme geçersiz olur
- Öğrenciler arası adaletsizlik

#### 🔍 Nasıl Tespit Edilir?
```sql
-- Sınav sırasında AI kullanımı
SELECT u.id, e.title, COUNT(ar.id) as ai_requests
FROM users u
JOIN exam_attempts ea ON u.id = ea.user_id
JOIN ai_requests ar ON u.id = ar.user_id
WHERE ar.created_at BETWEEN ea.started_at AND ea.completed_at
GROUP BY u.id, e.title;
```

#### ✅ Önleme Yöntemleri

**Backend - Exam Context Blocker:**
```python
# app/modules/ai/security/exam_guard.py
class ExamContextGuard:
    """Sınav sürecinde AI erişimini engeller."""
    
    def check_exam_context(self, user_id: int) -> bool:
        """Kullanıcı aktif sınavda mı kontrol et."""
        active_exam = ExamAttempt.query.filter(
            ExamAttempt.user_id == user_id,
            ExamAttempt.status == 'in_progress'
        ).first()
        
        if active_exam:
            raise AIAccessDeniedError(
                "Sınav süresince AI asistan kullanılamaz.",
                error_code="EXAM_IN_PROGRESS"
            )
        return True
```

**Route-Level Protection:**
```python
# app/modules/ai/routes.py
@ai_bp.before_request
def check_exam_context():
    """Her AI isteğinden önce sınav kontrolü."""
    user_id = get_jwt_identity()
    if user_id:
        exam_guard.check_exam_context(user_id)
```

**Frontend - Exam Mode Detection:**
```typescript
// hooks/useAIChat.ts
function useAIChat() {
  const { isInExam } = useExamContext();
  
  const sendMessage = async (message: string) => {
    if (isInExam) {
      toast.error("Sınav süresince AI asistan kullanılamaz.");
      return;
    }
    // ... normal flow
  };
}
```

---

## ✅ Uygulanan Önlemler

### Backend Güvenlik Katmanları

| Katman | Dosya | Açıklama |
|--------|-------|----------|
| Prompt Manager | `ai/prompts/manager.py` | Template tabanlı prompt yönetimi |
| PII Detector | `ai/security/detector.py` | Kişisel veri tespiti |
| Input Sanitizer | `ai/security/sanitizer.py` | Girdi temizleme |
| Output Sanitizer | `ai/security/sanitizer.py` | Çıktı temizleme |
| Injection Detector | `ai/security/detector.py` | Prompt injection tespiti |
| Jailbreak Detector | `ai/security/detector.py` | Jailbreak tespiti |
| Security Guard | `ai/security/guard.py` | Merkezi güvenlik kontrolü |
| Rate Limiter | `ai/quota/rate_limiter.py` | İstek sınırlama |
| Quota Manager | `ai/quota/quota_manager.py` | Kota yönetimi |
| Abuse Detector | `ai/quota/abuse_detector.py` | Kötüye kullanım tespiti |
| Audit Logger | `ai/security/audit.py` | Güvenlik loglama |

### API Key Güvenliği

- ✅ Environment variable'da saklanır
- ✅ `.gitignore`'da yer alır
- ✅ Log'larda maskelenir
- ✅ Format validation yapılır
- ✅ Frontend'e hiç gönderilmez

### Rol Bazlı Erişim

| Özellik | Student | Teacher | Admin |
|---------|:-------:|:-------:|:-----:|
| question_hint | ✅ | ✅ | ✅ |
| topic_explanation | ✅ | ✅ | ✅ |
| study_plan | ✅ | ✅ | ✅ |
| question_generation | ❌ | ✅ | ✅ |
| answer_evaluation | ❌ | ✅ | ✅ |

---

## 📝 Kontrol Listesi

### Deployment Öncesi

- [ ] API key'ler environment variable'da mı?
- [ ] `.env` dosyası `.gitignore`'da mı?
- [ ] Log dosyalarında PII var mı?
- [ ] Rate limit ayarları uygun mu?
- [ ] Kota limitleri tanımlı mı?
- [ ] Sınav modu koruması aktif mi?
- [ ] Disclaimer metinleri yerinde mi?
- [ ] Context limit ayarları yapıldı mı?

### Haftalık Kontrol

- [ ] Kota aşım raporları incelendi mi?
- [ ] Rate limit hit oranları normal mi?
- [ ] Security alert'ler gözden geçirildi mi?
- [ ] Maliyet analizi yapıldı mı?
- [ ] Öğretmen geri bildirimleri değerlendirildi mi?

### Aylık Audit

- [ ] PII log taraması yapıldı mı?
- [ ] API key rotation gerekli mi?
- [ ] Prompt template'ler güncellendi mi?
- [ ] Kota limitleri gözden geçirildi mi?
- [ ] Abuse pattern analizi yapıldı mı?

---

## 📚 İlgili Dosyalar

```
app/modules/ai/
├── core/
│   ├── constants.py      # Sabitler ve limitler
│   ├── exceptions.py     # Hata sınıfları
│   └── interfaces.py     # Arayüzler
├── prompts/
│   ├── manager.py        # Template yönetimi
│   └── templates/        # YAML prompt'ları
├── quota/
│   ├── quota_manager.py  # Kota yönetimi
│   ├── rate_limiter.py   # Rate limiting
│   └── abuse_detector.py # Abuse tespiti
├── security/
│   ├── guard.py          # Merkezi güvenlik
│   ├── detector.py       # Tehdit tespiti
│   ├── sanitizer.py      # Temizleme
│   └── audit.py          # Loglama
└── middleware/
    ├── context_limiter.py  # Context sınırlama
    └── exam_guard.py       # Sınav koruması
```
