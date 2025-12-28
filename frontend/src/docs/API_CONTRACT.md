# 📋 Frontend-Backend API Contract (Sözleşme) Dokümantasyonu

> **Frontend–Backend Integration Architect** perspektifinden hazırlanmış kapsamlı rehber.

## 🎯 Neden Ticari Ürünler İçin Kritik?

### 1. Tutarlı Kullanıcı Deneyimi
- Her API yanıtı aynı formatta işlenir
- Tüm hatalar kullanıcıya anlaşılır şekilde iletilir
- Loading, error, empty state'ler standartlaştırılır

### 2. Güvenlik & Hata İzleme
- Hassas bilgiler kullanıcıdan gizlenir
- 401/403 durumlarında güvenli yönlendirme
- 5xx hatalarında otomatik raporlama

### 3. Bakım Kolaylığı
- Backend değişikliklerinde etkilenen yerler tip kontrolüyle bulunur
- API versiyon yönetimi ile kademeli geçiş
- Deprecation yönetimi ile eski kod temizliği

### 4. Takımlar Arası İletişim
- Frontend-Backend arasında açık sözleşme
- Tip tanımları ile dokümantasyon
- Breaking changes için erken uyarı

---

## 📦 Modül Yapısı

```
lib/api-contract/
├── index.ts                 # Ana export dosyası
├── ApiContractTypes.ts      # Tip tanımlamaları
├── ErrorCodeMessages.tsx    # Hata kodu → kullanıcı mesajı
├── StatusCodeUX.tsx         # Status code → UX aksiyonu
├── ApiResponseHandler.tsx   # Yanıt işleme katmanı
└── ApiVersioning.tsx        # Versiyon yönetimi
```

---

## 1️⃣ API Response Formatları ve UI Etkisi

### Standart Response Wrapper

```typescript
interface ApiResponse<T> {
  success: boolean;        // İşlem başarılı mı?
  data?: T;               // Yanıt verisi
  message?: string;       // Kullanıcıya mesaj
  timestamp: string;      // ISO 8601 zaman damgası
  request_id?: string;    // Debug için istek ID
  meta?: ApiMeta;         // Metadata (pagination, cache, etc.)
  error?: ApiErrorDetail; // Hata detayları
}
```

### UI'ya Etkisi

| Field | UI Etkisi |
|-------|-----------|
| `success: true` | Başarı toast, redirect, data gösterimi |
| `success: false` | Hata toast, form validasyon, retry butonu |
| `message` | Toast notification mesajı |
| `meta.pagination` | Sayfalama UI (next/prev, page numbers) |
| `error.errors[]` | Form field error highlighting |
| `meta.rate_limit` | Rate limit warning banner |

### Kullanım Örneği

```tsx
import { DataWrapper, useApiCall } from '@/lib/api-contract';

function UserList() {
  const { data, isLoading, error, execute, reset } = useApiCall(fetchUsers);
  
  return (
    <DataWrapper
      data={data}
      isLoading={isLoading}
      error={error}
      onRetry={execute}
      loadingMessage="Kullanıcılar yükleniyor..."
      emptyMessage="Henüz kullanıcı bulunmuyor"
    >
      {(users) => (
        <ul>
          {users.map(user => <UserCard key={user.id} user={user} />)}
        </ul>
      )}
    </DataWrapper>
  );
}
```

---

## 2️⃣ Status Code – UX İlişkisi

### Status Code Kategorileri

```typescript
type StatusCodeCategory = 
  | 'success'      // 2xx - Başarılı
  | 'redirect'     // 3xx - Yönlendirme
  | 'client_error' // 4xx - İstemci hatası
  | 'server_error' // 5xx - Sunucu hatası
  | 'network';     // Ağ hataları
```

### UX Aksiyonları

```typescript
type UXAction = 
  | 'none'            // Aksiyon gerekmez
  | 'show_success'    // Başarı mesajı
  | 'show_error'      // Hata mesajı
  | 'redirect_login'  // Login'e yönlendir
  | 'redirect_home'   // Ana sayfaya yönlendir
  | 'retry'           // Otomatik retry
  | 'wait_retry'      // Bekle ve retry
  | 'contact_support' // Destek öner
  | 'refresh_page'    // Sayfa yenileme
  | 'report_error';   // Hata raporu
```

### Status Code → UX Mapping

| Status | Kategori | Aksiyon | Retry? | Örnek |
|--------|----------|---------|--------|-------|
| 200 | success | none | ❌ | GET isteği |
| 201 | success | show_success | ❌ | Kayıt oluşturuldu |
| 400 | client_error | show_error | ❌ | Validation hatası |
| 401 | client_error | redirect_login | ❌ | Token expired |
| 403 | client_error | show_error | ❌ | Yetkisiz erişim |
| 404 | client_error | show_error | ❌ | Kaynak bulunamadı |
| 429 | client_error | wait_retry | ✅ | Rate limit |
| 500 | server_error | report_error | ✅ | Sunucu hatası |
| 503 | server_error | wait_retry | ✅ | Bakım modu |

### Hook Kullanımı

```tsx
import { useStatusCodeHandler } from '@/lib/api-contract';

function ApiProvider({ children }) {
  const { handleStatusCode } = useStatusCodeHandler({
    onRedirectLogin: () => navigate('/login'),
    onShowError: (msg) => toast.error(msg),
    onShowSuccess: (msg) => toast.success(msg),
    onReportError: (error, status) => Sentry.captureException(error),
  });
  
  // Axios interceptor
  useEffect(() => {
    api.interceptors.response.use(
      (response) => response,
      (error) => {
        handleStatusCode(error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }, []);
  
  return children;
}
```

---

## 3️⃣ Error Code – Kullanıcı Mesajı Eşleşmesi

### Error Code Kategorileri

```typescript
type ApiErrorCode =
  // Authentication (401)
  | 'UNAUTHORIZED' | 'TOKEN_EXPIRED' | 'MFA_REQUIRED'
  
  // Authorization (403)
  | 'FORBIDDEN' | 'INSUFFICIENT_PERMISSION' | 'ACCOUNT_SUSPENDED'
  
  // Validation (400, 422)
  | 'VALIDATION_ERROR' | 'INVALID_FORMAT' | 'MISSING_FIELD'
  
  // Not Found (404)
  | 'NOT_FOUND' | 'USER_NOT_FOUND' | 'RESOURCE_NOT_FOUND'
  
  // Conflict (409)
  | 'CONFLICT' | 'DUPLICATE_RESOURCE' | 'VERSION_CONFLICT'
  
  // Rate Limit (429)
  | 'RATE_LIMIT_EXCEEDED' | 'QUOTA_EXCEEDED'
  
  // Server (500+)
  | 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE' | 'DATABASE_ERROR';
```

### Mesaj Yapısı

```typescript
interface ErrorMessage {
  title: string;       // "Oturum Süresi Doldu"
  description: string; // "Güvenliğiniz için oturumunuz sonlandırıldı."
  action?: string;     // "Lütfen tekrar giriş yapın."
  icon?: 'warning' | 'error' | 'info' | 'lock' | 'clock' | 'network';
  suggestRetry?: boolean;
  suggestSupport?: boolean;
}
```

### Örnek Mesajlar

| Error Code | Title | Description | Action |
|------------|-------|-------------|--------|
| `TOKEN_EXPIRED` | Oturum Süresi Doldu | Güvenliğiniz için oturumunuz sonlandırıldı | Lütfen tekrar giriş yapın |
| `VALIDATION_ERROR` | Geçersiz Veri | Gönderilen bilgilerde hatalar var | İşaretli alanları düzeltip tekrar deneyin |
| `RATE_LIMIT_EXCEEDED` | Çok Fazla İstek | Kısa sürede çok fazla işlem yaptınız | Biraz bekleyip tekrar deneyin |
| `INTERNAL_ERROR` | Sistem Hatası | Beklenmeyen bir hata oluştu | Daha sonra tekrar deneyin |

### Component Kullanımı

```tsx
import { ErrorDisplay, formatErrorForUser } from '@/lib/api-contract';

function ErrorHandler({ error }: { error: ApiErrorDetail }) {
  return (
    <ErrorDisplay
      error={error}
      showAction
      showSupport
      onRetry={() => refetch()}
      onContactSupport={() => openSupportChat()}
    />
  );
}
```

### Field Validation Errors

```tsx
import { fieldErrorsToObject, FieldErrorText } from '@/lib/api-contract';

function FormWithErrors({ errors }: { errors: FieldError[] }) {
  const errorMap = fieldErrorsToObject(errors);
  
  return (
    <form>
      <input name="email" />
      {errorMap.email && <FieldErrorText error={errorMap.email} />}
      
      <input name="password" />
      {errorMap.password && <FieldErrorText error={errorMap.password} />}
    </form>
  );
}
```

---

## 4️⃣ Versiyonlama ve Geriye Uyumluluk

### Version Format (Semantic Versioning)

```
v{MAJOR}.{MINOR}.{PATCH}

MAJOR: Breaking changes (uyumsuz değişiklikler)
MINOR: Yeni özellikler (geriye uyumlu)
PATCH: Bug fixes
```

### Compatibility Status

```typescript
type CompatibilityStatus = 
  | 'compatible'       // ✅ Tam uyumlu
  | 'update_available' // 🆕 Güncelleme mevcut (opsiyonel)
  | 'update_required'  // ⚠️ Güncelleme zorunlu
  | 'unsupported';     // ❌ Desteklenmiyor
```

### Provider Kurulumu

```tsx
import { VersionProvider, UpdateRequiredBanner, useVersion } from '@/lib/api-contract';

function App() {
  return (
    <VersionProvider
      clientVersion="1.2.0"
      fetchVersionInfo={async () => {
        const response = await fetch('/api/version');
        return response.json();
      }}
      checkInterval={5 * 60 * 1000} // 5 dakika
    >
      <VersionChecker />
      <Router />
    </VersionProvider>
  );
}

function VersionChecker() {
  const { compatibilityStatus, deprecations, upcomingMaintenance } = useVersion();
  
  return (
    <>
      <UpdateRequiredBanner
        status={compatibilityStatus}
        onUpdate={() => window.location.reload()}
      />
      
      {deprecations.map(d => (
        <DeprecationWarning key={d.deprecated} deprecation={d} />
      ))}
      
      {upcomingMaintenance.map(m => (
        <MaintenanceAlert key={m.id} maintenance={m} />
      ))}
    </>
  );
}
```

### Deprecation Yönetimi

```typescript
interface DeprecationMeta {
  deprecated: string;      // Deprecated endpoint/field
  alternative?: string;    // Alternatif
  sunset_date?: string;    // Kaldırılma tarihi
  migration_guide?: string; // Migration rehberi URL
  message?: string;        // Uyarı mesajı
}
```

### API Header'ları

```typescript
// Request headers
const headers = createVersionHeaders('1.2.0', {
  acceptedVersions: ['v1', 'v2'],
  preferVersion: 'v2',
});

// Response headers
const versionInfo = extractVersionFromHeaders(response.headers);
// { apiVersion: 'v2.1.0', deprecationWarning: '...', sunsetDate: '...' }
```

---

## 5️⃣ Retry & Cache Stratejileri

### Retry Mantığı

```typescript
const response = await fetchWithRetry<User[]>('/api/users', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
}, {
  maxRetries: 3,
  shouldRetry: (error, statusCode) => {
    // 429 ve 5xx için retry
    return statusCode === 429 || statusCode >= 500;
  },
  onRetry: (attempt, delay) => {
    console.log(`Retry ${attempt}, waiting ${delay}ms`);
  },
});
```

### Exponential Backoff

```
Attempt 1: 1000ms * 2^0 = 1000ms + jitter
Attempt 2: 1000ms * 2^1 = 2000ms + jitter
Attempt 3: 1000ms * 2^2 = 4000ms + jitter
Max: 30000ms
```

### Response Cache

```typescript
import { responseCache } from '@/lib/api-contract';

// Cache'e kaydet
responseCache.set('users:all', userData, 60000); // 1 dakika TTL

// Cache'den oku
const cached = responseCache.get<User[]>('users:all');

// Prefix ile invalidate
responseCache.invalidateByPrefix('users:');

// Tümünü temizle
responseCache.clear();
```

---

## 6️⃣ Async Operations (Long-Running Tasks)

### 202 Accepted Pattern

```typescript
// 1. İşlemi başlat
POST /api/reports/generate
Response: 202 Accepted
{
  "success": true,
  "data": {
    "task_id": "task_abc123",
    "status": "pending",
    "status_url": "/api/tasks/task_abc123",
    "estimated_completion": 120
  }
}

// 2. Durumu sorgula (polling)
GET /api/tasks/task_abc123
Response: 200 OK
{
  "success": true,
  "data": {
    "task_id": "task_abc123",
    "status": "processing",
    "progress": 45
  }
}
```

### Hook Kullanımı

```tsx
import { useAsyncOperation, AsyncOperationProgress } from '@/lib/api-contract';

function ReportGenerator() {
  const { status, isPolling, progress, startPolling, stopPolling, error } = useAsyncOperation(
    (taskId) => checkTaskStatus(taskId),
    {
      pollingInterval: 2000,
      maxPollingTime: 5 * 60 * 1000, // 5 dakika
      onComplete: (result) => {
        toast.success('Rapor hazır!');
        downloadReport(result.task_id);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );
  
  const handleGenerate = async () => {
    const response = await generateReport();
    if (response.data?.task_id) {
      startPolling(response.data.task_id);
    }
  };
  
  return (
    <div>
      <button onClick={handleGenerate} disabled={isPolling}>
        Rapor Oluştur
      </button>
      
      <AsyncOperationProgress status={status} />
    </div>
  );
}
```

---

## 🔧 Entegrasyon Örneği

### Axios Interceptor Kurulumu

```typescript
import axios from 'axios';
import {
  processApiResponse,
  extractRateLimitFromHeaders,
  getStatusCodeUX,
  createVersionHeaders,
} from '@/lib/api-contract';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use((config) => {
  // Version headers
  const versionHeaders = createVersionHeaders('1.2.0');
  config.headers = { ...config.headers, ...versionHeaders };
  
  // Auth token
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Rate limit tracking
    const rateLimit = extractRateLimitFromHeaders(response.headers);
    if (rateLimit && rateLimit.remaining < 10) {
      console.warn('Rate limit warning:', rateLimit);
    }
    
    return response;
  },
  (error) => {
    const statusCode = error.response?.status || 0;
    const uxConfig = getStatusCodeUX(statusCode);
    
    // 401 handling
    if (statusCode === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Error reporting
    if (uxConfig.reportError) {
      Sentry.captureException(error);
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

## 📊 Best Practices Checklist

### ✅ Response Handling
- [ ] Tüm API yanıtları `DataWrapper` ile sarılıyor
- [ ] Loading state kullanıcıya gösteriliyor
- [ ] Error state retry butonu içeriyor
- [ ] Empty state anlaşılır mesaj içeriyor

### ✅ Error Messaging
- [ ] Tüm error code'lar için Türkçe mesaj var
- [ ] Field error'lar formda gösteriliyor
- [ ] Kritik hatalarda destek seçeneği sunuluyor
- [ ] Request ID hata mesajında gösteriliyor (debug)

### ✅ Status Code Handling
- [ ] 401'de login'e yönlendiriliyor
- [ ] 429'da rate limit banner gösteriliyor
- [ ] 5xx'te otomatik retry deneniyor
- [ ] 5xx hataları Sentry'ye raporlanıyor

### ✅ Versioning
- [ ] Client version header'da gönderiliyor
- [ ] Deprecation warning'ler gösteriliyor
- [ ] Update required banner var
- [ ] Maintenance alert gösteriliyor

### ✅ Performance
- [ ] Response cache kullanılıyor
- [ ] Exponential backoff uygulanıyor
- [ ] Abort controller ile istek iptali
- [ ] Polling için cleanup yapılıyor

---

## 🔗 İlgili Dosyalar

- [ApiContractTypes.ts](../lib/api-contract/ApiContractTypes.ts) - Tip tanımlamaları
- [ErrorCodeMessages.tsx](../lib/api-contract/ErrorCodeMessages.tsx) - Hata mesajları
- [StatusCodeUX.tsx](../lib/api-contract/StatusCodeUX.tsx) - Status code mapping
- [ApiResponseHandler.tsx](../lib/api-contract/ApiResponseHandler.tsx) - Response handler
- [ApiVersioning.tsx](../lib/api-contract/ApiVersioning.tsx) - Versiyon yönetimi
