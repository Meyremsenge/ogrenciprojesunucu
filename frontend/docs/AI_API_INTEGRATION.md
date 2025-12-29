# AI API Entegrasyon Kılavuzu

Bu belge, Frontend uygulamasının AI Backend modülü ile nasıl entegre olacağını açıklar.

## 🏗️ Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐     │
│  │  UI          │     │  Hooks       │     │  Context/Provider    │     │
│  │  Components  │────▶│  (useAI...)  │────▶│  (AIProvider)        │     │
│  └──────────────┘     └──────────────┘     └──────────────────────┘     │
│                                                     │                    │
│                                                     ▼                    │
│                            ┌────────────────────────────────────┐       │
│                            │     AI Service Layer               │       │
│                            │     (IAIService interface)         │       │
│                            └────────────────────────────────────┘       │
│                                    │              │                     │
│                       ┌────────────┴──────┐   ┌───┴────────────┐       │
│                       │                   │   │                │       │
│                       ▼                   ▼   ▼                │       │
│               ┌───────────────┐   ┌───────────────┐            │       │
│               │ MockAdapter   │   │ EnhancedAPI   │            │       │
│               │ (Development) │   │ Adapter       │            │       │
│               └───────────────┘   └───────────────┘            │       │
│                                           │                     │       │
│                                           ▼                     │       │
│                            ┌────────────────────────────────┐  │       │
│                            │     AI API Client              │  │       │
│                            │  • JWT Token Management        │  │       │
│                            │  • Retry & Timeout             │  │       │
│                            │  • Rate Limiting               │  │       │
│                            │  • Request Interceptors        │  │       │
│                            └────────────────────────────────┘  │       │
│                                           │                     │       │
└───────────────────────────────────────────┼─────────────────────┘       │
                                            │                             │
                                            ▼                             │
                            ┌────────────────────────────────────────────┘
                            │          BACKEND API
                            │          /api/v1/ai/*
                            │
                            │  POST /hint
                            │  POST /explain
                            │  POST /study-plan
                            │  POST /evaluate-answer
                            │  POST /analyze-performance
                            │  POST /generate-questions
                            │  POST /chat/stream (SSE)
                            │  GET  /quota
                            │  GET  /features
                            │  GET  /health
                            │  POST /feedback
                            └─────────────────────────────────────────────
```

## 📦 Dosya Yapısı

```
frontend/src/lib/ai/
├── index.ts                    # Ana barrel export
├── init.ts                     # Initialization & configuration
├── AIProvider.tsx              # Global React context
│
├── api/
│   ├── index.ts
│   ├── contracts.ts            # Request/Response type definitions
│   └── normalizer.ts           # Response normalization (Mock/API parity)
│
├── services/
│   ├── index.ts
│   ├── aiService.ts            # Core interface & base class
│   └── apiClient.ts            # HTTP client with retry/timeout
│
├── adapters/
│   ├── index.ts
│   ├── apiAdapter.ts           # Legacy adapter
│   ├── enhancedApiAdapter.ts   # Production-ready adapter
│   └── mockAdapter.ts          # Development mock
│
├── hooks/
│   ├── index.ts
│   ├── useAIChat.ts
│   ├── useAIHint.ts
│   ├── useAIQuota.ts
│   ├── useAIFeedback.ts
│   ├── useAIFeature.ts
│   └── useAIPageContext.ts
│
├── components/
│   ├── index.ts
│   ├── AIChatPanel.tsx
│   ├── AIHintBox.tsx
│   ├── AIFeedbackCard.tsx
│   ├── AIFloatingButton.tsx
│   └── AIContextHelper.tsx
│
├── constants/
│   └── index.ts
│
└── utils/
    └── index.ts
```

## 🚀 Başlangıç

### 1. AI Servisini Başlat

`main.tsx` veya `App.tsx` dosyasında:

```tsx
import { initializeAI } from '@/lib/ai';
import { useAuthStore } from '@/stores/authStore';

// App başlamadan önce
initializeAI({
  getAuthToken: () => useAuthStore.getState().token,
  onAuthError: () => {
    useAuthStore.getState().logout();
    window.location.href = '/login';
  },
  onQuotaExceeded: () => {
    // Kota aşıldığında bildirim göster
    toast.warning('AI kullanım limitine ulaştınız');
  },
});
```

### 2. AIProvider ile Sarmalama

```tsx
import { AIProvider } from '@/lib/ai';

function App() {
  return (
    <AIProvider>
      <YourApp />
    </AIProvider>
  );
}
```

### 3. Hook'ları Kullan

```tsx
import { useAIChat, useAIHint, useAIQuota } from '@/lib/ai';

function QuestionPage() {
  const { sendMessage, messages, isLoading } = useAIChat('question_hint');
  const { getHint, hint, hintLevel } = useAIHint();
  const { quota, isLow, isExhausted } = useAIQuota();

  return (
    <div>
      {isExhausted && <QuotaWarning />}
      
      <button onClick={() => getHint(1, context)}>
        İpucu Al ({hintLevel}/3)
      </button>
      
      <ChatBox 
        messages={messages}
        onSend={sendMessage}
        disabled={isLoading || isExhausted}
      />
    </div>
  );
}
```

## 🔐 JWT Token Güvenliği

### Token Yönetimi

```typescript
// authStore.ts
export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  
  login: async (credentials) => {
    const response = await api.login(credentials);
    set({ token: response.token });
    
    // Token değiştiğinde AI servisine bildir
    // (Otomatik olarak getAuthToken callback'i kullanılır)
  },
  
  logout: () => {
    set({ token: null });
  },
}));
```

### Request Header'ları

Her AI API isteğinde otomatik olarak:

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
X-Request-ID: req-1234567890-abc123def
X-Client-Version: 1.0.0
```

## ⏱️ Timeout & Retry Stratejileri

### Varsayılan Ayarlar

```typescript
const DEFAULT_CONFIG = {
  timeout: 30000,           // 30 saniye
  maxRetries: 3,            // 3 deneme
  retryBaseDelay: 1000,     // 1 saniye başlangıç
  retryMaxDelay: 10000,     // Max 10 saniye
  retryMultiplier: 2,       // Exponential backoff
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};
```

### Retry Mantığı

```
İstek 1: Başarısız (500) → 1 saniye bekle
İstek 2: Başarısız (500) → 2 saniye bekle  
İstek 3: Başarısız (500) → 4 saniye bekle
İstek 4: Hata döndür (max retry'a ulaşıldı)
```

### Rate Limiting

```typescript
// Frontend tarafı rate limiting
rateLimitPerWindow: 60,     // Dakikada 60 istek
rateLimitWindow: 60000,     // 1 dakika
```

## 📊 Request/Response Kontratları

### Hint API

**Request:**
```typescript
interface HintRequest {
  question_id: string;
  question_text: string;
  subject?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  previous_hints?: string[];
  context?: {
    course_id?: string;
    lesson_id?: string;
  };
}
```

**Response:**
```typescript
interface HintResponse {
  hint: string;
  hint_level: number;
  max_hints: number;
  remaining_hints: number;
  confidence: number;
  next_hint_available: boolean;
}
```

### Chat Stream API

**Request:**
```typescript
interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  persona_id?: string;
  context?: {
    course_id?: string;
    lesson_id?: string;
  };
  options?: {
    stream?: boolean;
    max_tokens?: number;
  };
}
```

**SSE Stream Format:**
```
data: {"content": "Merhaba", "tokens": 1}

data: {"content": ", nasıl", "tokens": 3}

data: {"content": " yardımcı olabilirim?", "tokens": 7}

data: [DONE]
```

## 🔄 Mock vs Real API Parity

Normalizer katmanı sayesinde Mock ve Real API response'ları aynı formatta:

```typescript
// Her iki adapter da aynı NormalizedResponse döndürür
interface NormalizedResponse<T> {
  data: T;
  metadata: {
    requestId: string;
    latencyMs: number;
    tokensUsed?: number;
    cached: boolean;
  };
  source: 'api' | 'mock' | 'cache';
  timestamp: Date;
}
```

### Mock Mode Açma

```bash
# .env.local
VITE_AI_USE_MOCK=true
```

veya environment'ta `VITE_AI_API_URL` tanımlı değilse otomatik mock mode.

## 🛡️ Error Handling

### Error Tipleri

```typescript
type AIErrorType = 
  | 'rate_limit'         // 429 - Çok fazla istek
  | 'quota_exceeded'     // Kota aşıldı
  | 'content_filtered'   // İçerik filtrelendi
  | 'network_error'      // Ağ hatası
  | 'service_unavailable' // 503 - Servis kapalı
  | 'invalid_request';   // 400 - Geçersiz istek
```

### Error Handling Pattern

```tsx
function AIComponent() {
  const { sendMessage, error, isLoading } = useAIChat('topic_explanation');
  
  if (error) {
    switch (error.code) {
      case 'QUOTA_EXCEEDED':
        return <QuotaExceededMessage resetTime={error.retryAfter} />;
      case 'NETWORK_ERROR':
        return <OfflineMessage onRetry={() => sendMessage(lastMessage)} />;
      case 'HTTP_401':
        return <SessionExpiredMessage />;
      default:
        return <GenericError message={error.userMessage} />;
    }
  }
  
  return <ChatUI />;
}
```

## 📈 Monitoring & Logging

### Request Interceptors

```typescript
// Custom logging
client.addRequestInterceptor((config) => {
  console.log(`[AI] ${config.method} ${config.endpoint}`);
  analytics.track('ai_request', { endpoint: config.endpoint });
  return config;
});

// Performance monitoring
client.addResponseInterceptor((response) => {
  if (response.metadata?.latency > 5000) {
    reportSlowRequest(response);
  }
  return response;
});
```

## 🧪 Test Etme

### Mock Adapter ile Test

```typescript
import { MockAdapter } from '@/lib/ai/adapters';
import { setAIService } from '@/lib/ai/services';

beforeEach(() => {
  setAIService(new MockAdapter());
});

test('hint alınabilmeli', async () => {
  const { result } = renderHook(() => useAIHint());
  
  await act(async () => {
    await result.current.getHint(1, mockContext);
  });
  
  expect(result.current.hint).toBeTruthy();
});
```

## 📝 Environment Değişkenleri

```bash
# .env.local (development)
VITE_AI_USE_MOCK=true
VITE_AI_ENABLE_LOGGING=true

# .env.production
VITE_AI_API_URL=/api/v1/ai
VITE_AI_TIMEOUT=30000
VITE_AI_MAX_RETRIES=3
VITE_AI_ENABLE_LOGGING=false
```

## 🔗 İlgili Dosyalar

- [contracts.ts](src/lib/ai/api/contracts.ts) - Tüm API kontratları
- [normalizer.ts](src/lib/ai/api/normalizer.ts) - Response normalization
- [apiClient.ts](src/lib/ai/services/apiClient.ts) - HTTP client
- [enhancedApiAdapter.ts](src/lib/ai/adapters/enhancedApiAdapter.ts) - Production adapter
- [init.ts](src/lib/ai/init.ts) - Initialization

---

**Son Güncelleme:** 2024-01-XX  
**Versiyon:** 1.0.0
