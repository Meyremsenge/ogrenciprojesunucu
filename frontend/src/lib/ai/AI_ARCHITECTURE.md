# AI UI Component Architecture

## Genel Bakış

Bu doküman, AI UI bileşenlerinin kurumsal ve ölçeklenebilir mimarisini açıklar. Mimari, backend'den bağımsız çalışacak şekilde tasarlanmıştır.

## Mimari Diyagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              APP.tsx                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                       QueryClientProvider                            │ │
│  │  ┌───────────────────────────────────────────────────────────────┐  │ │
│  │  │                        AIProvider                              │  │ │
│  │  │   ┌─────────────────────────────────────────────────────────┐  │  │ │
│  │  │   │                    BrowserRouter                         │  │  │ │
│  │  │   │                       Routes                             │  │  │ │
│  │  │   │  ┌────────────────────────────────────────────────────┐  │  │  │ │
│  │  │   │  │                AIContextHelper                      │  │  │  │ │
│  │  │   │  │   ┌─────────────────────────────────────────────┐   │  │  │  │ │
│  │  │   │  │   │                Page Components              │   │  │  │  │ │
│  │  │   │  │   │  ┌───────────┐ ┌───────────┐ ┌───────────┐  │   │  │  │  │ │
│  │  │   │  │   │  │AIChatPanel│ │ AIHintBox │ │AIFloating │  │   │  │  │  │ │
│  │  │   │  │   │  └───────────┘ └───────────┘ └───────────┘  │   │  │  │  │ │
│  │  │   │  │   └─────────────────────────────────────────────┘   │  │  │  │ │
│  │  │   │  └────────────────────────────────────────────────────┘  │  │  │ │
│  │  │   └─────────────────────────────────────────────────────────┘  │  │ │
│  │  └───────────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

## Katman Yapısı

```
src/lib/ai/
├── index.ts                 # Barrel export
├── AIProvider.tsx           # Global Context Provider
├── adapters/
│   ├── index.ts
│   ├── apiAdapter.ts        # Backend API adapter
│   └── mockAdapter.ts       # Development mock adapter
├── services/
│   ├── index.ts
│   └── aiService.ts         # Core service interface
├── hooks/
│   └── index.ts             # Custom React hooks
├── components/
│   ├── index.ts
│   ├── AIChatPanel.tsx      # Full chat interface
│   ├── AIHintBox.tsx        # Progressive hint system
│   ├── AIFeedbackCard.tsx   # Feedback collection
│   ├── AIFloatingButton.tsx # FAB with panel
│   └── AIContextHelper.tsx  # Context auto-detection
├── constants/
│   └── index.ts             # Feature configs, thresholds
├── utils/
│   └── index.ts             # Helper functions
└── examples/
    └── page-integrations.tsx # Usage examples
```

## 1. Service Layer (Backend Independence)

### Adapter Pattern

```typescript
// IAIService interface - Tüm adapter'lar bu interface'i implement eder
interface IAIService {
  sendMessage(message: string, context: AIContext): Promise<AIServiceResponse>;
  streamMessage(message: string, context: AIContext): AsyncGenerator<string>;
  getHint(questionId: number, level: number): Promise<AIHint>;
  getQuota(): Promise<AIQuota>;
  submitFeedback(messageId: string, rating: number, comment?: string): Promise<void>;
}

// API Adapter - Gerçek backend
class APIAdapter extends BaseAIService implements IAIService { ... }

// Mock Adapter - Geliştirme/Test
class MockAdapter extends BaseAIService implements IAIService { ... }
```

### Avantajlar
- ✅ Backend hazır olmadan frontend geliştirme
- ✅ Test senaryoları için mock data
- ✅ Backend değişikliklerinden izolasyon
- ✅ Farklı AI provider'lar (GPT, Claude, vb.) için kolay geçiş

## 2. Provider & Context

### AIProvider

```tsx
// App.tsx
<AIProvider mode="api" autoInitialize>
  <App />
</AIProvider>

// Herhangi bir component'te
const { sendMessage, isAvailable, persona } = useAIContext();
```

### Context Value

```typescript
interface AIContextValue {
  // State
  isInitialized: boolean;
  isAvailable: boolean;
  persona: AIPersona | null;
  
  // Actions
  sendMessage: (message: string, context: AIContext) => Promise<AIMessage>;
  getHint: (questionId: number, level?: number) => Promise<AIHint>;
  getQuota: () => Promise<AIQuota>;
  submitFeedback: (messageId: string, rating: number) => Promise<void>;
  
  // Service access
  service: IAIService | null;
}
```

## 3. Custom Hooks

| Hook | Amaç | Kullanım |
|------|------|----------|
| `useAIChat` | Chat mesajlaşma | `const { messages, sendMessage, isLoading } = useAIChat(feature, context)` |
| `useAIHint` | İpucu sistemi | `const { hints, requestNextHint, currentLevel } = useAIHint(questionId)` |
| `useAIQuota` | Kota yönetimi | `const { quota, isLow, isExhausted } = useAIQuota()` |
| `useAIFeedback` | Geri bildirim | `const { submitFeedback, isSubmitting } = useAIFeedback()` |
| `useAIFeature` | Özellik kontrolü | `const { isEnabled, canUse, quota } = useAIFeature('topic_explain')` |
| `useAIPageContext` | Sayfa context'i | `const { pageContext, setPageContext } = useAIPageContext()` |

## 4. UI Components

### AIChatPanel
Tam özellikli chat arayüzü.

```tsx
<AIChatPanel
  feature="topic_explain"
  context={{ topicId: 123, topicName: "Türev" }}
  onClose={() => setOpen(false)}
/>
```

### AIHintBox
Aşamalı ipucu sistemi.

```tsx
<AIHintBox
  questionId={456}
  context={{ difficulty: 'medium' }}
  compact={true}
/>
```

### AIFeedbackCard
Geri bildirim toplama.

```tsx
<AIFeedbackCard
  messageId="msg-123"
  feature="topic_explain"
  variant="stars"  // 'stars' | 'thumbs' | 'emoji' | 'full'
  showComment={true}
/>
```

### AIFloatingButton
Sayfa köşesinde FAB.

```tsx
<AIFloatingButton
  feature="topic_explain"
  position="bottom-right"
  pulse={true}
/>
```

### AIContextHelper
Otomatik context algılama.

```tsx
<AIContextHelper context={{ topicId: 123 }} pageType="topic">
  <PageContent />
</AIContextHelper>
```

## 5. Sayfa Entegrasyonu

### Pattern 1: Wrapper Component

```tsx
// pages/contents/ContentDetailPage.tsx
import { ContentPageAIWrapper } from '@lib/ai/examples/page-integrations';

export default function ContentDetailPage() {
  const { id } = useParams();
  const { data: content } = useQuery(['content', id], fetchContent);

  return (
    <ContentPageAIWrapper contentId={Number(id)} topicName={content?.title}>
      <div className="content-detail">
        {/* Page content */}
      </div>
    </ContentPageAIWrapper>
  );
}
```

### Pattern 2: Direct Component Usage

```tsx
// Inline kullanım
export default function ExamPage() {
  const { questionId } = useCurrentQuestion();
  
  return (
    <div className="flex gap-6">
      <main className="flex-1">
        <QuestionDisplay />
      </main>
      
      <aside className="w-80">
        <AIHintBox questionId={questionId} />
      </aside>
    </div>
  );
}
```

### Pattern 3: Hook-Based Control

```tsx
export default function AdvancedPage() {
  const { sendMessage, isAvailable } = useAIContext();
  const { isEnabled, canUse } = useAIFeature('topic_explain');
  
  const handleAsk = async (question: string) => {
    if (!canUse) return;
    const response = await sendMessage(question, { topicId: 123 });
    // Handle response
  };
  
  if (!isAvailable || !isEnabled) return null;
  
  return <CustomAIInterface onAsk={handleAsk} />;
}
```

## 6. Environment Configuration

```bash
# .env.development
VITE_AI_MODE=mock  # Mock adapter kullan

# .env.production
VITE_AI_MODE=api   # Gerçek API kullan
VITE_AI_API_URL=https://api.example.com/ai
```

## 7. Best Practices

### ✅ Do's

1. **AIProvider'ı en üst seviyede kullanın**
   ```tsx
   <QueryClientProvider>
     <AIProvider>
       <App />
     </AIProvider>
   </QueryClientProvider>
   ```

2. **Hook'ları component içinde kullanın**
   ```tsx
   function MyComponent() {
     const { sendMessage } = useAIContext(); // ✅
   }
   ```

3. **Context'i spesifik tutun**
   ```tsx
   <AIChatPanel context={{ questionId: 123 }} /> // ✅ Spesifik
   ```

4. **Kota kontrolü yapın**
   ```tsx
   const { canUse } = useAIFeature('topic_explain');
   if (!canUse) return <QuotaExhaustedMessage />;
   ```

### ❌ Don'ts

1. **Provider dışında hook kullanmayın**
   ```tsx
   // ❌ Error: useAIContext must be used within AIProvider
   const ai = useAIContext(); // Component dışında
   ```

2. **Gereksiz re-render'lardan kaçının**
   ```tsx
   // ❌ Her render'da yeni obje
   <AIChatPanel context={{ id: 123 }} />
   
   // ✅ Memoize edin
   const context = useMemo(() => ({ id: 123 }), []);
   <AIChatPanel context={context} />
   ```

3. **Hata yönetimini ihmal etmeyin**
   ```tsx
   const { error } = useAIChat(feature);
   if (error) return <ErrorMessage message={error} />;
   ```

## 8. Troubleshooting

### "AI Service not initialized"
- AIProvider'ın `autoInitialize={true}` olduğundan emin olun
- Veya manuel: `const { initialize } = useAIContext(); useEffect(() => initialize(), []);`

### "Quota exceeded"
- Kullanıcının günlük kotası dolmuş
- `useAIQuota()` hook'u ile kota durumunu kontrol edin

### "Feature not available for role"
- Kullanıcı rolü bu özelliğe erişemiyor
- `useAIFeature(feature)` ile kontrol edin

## 9. Gelecek Geliştirmeler

- [ ] WebSocket streaming desteği
- [ ] Offline caching
- [ ] Voice input integration
- [ ] Multi-language AI responses
- [ ] Analytics dashboard integration
