/**
 * AI Integration Example
 * 
 * Bu dosya, AI modülünün uygulamaya nasıl entegre edileceğini gösterir.
 * main.tsx dosyasında kullanılmalıdır.
 */

import { initializeAI } from '@/lib/ai';
import { getAIApiClient, type AIApiRequestConfig, type AIApiResponse, type AIServiceError } from '@/lib/ai/services';

/**
 * AI Servisini Başlat
 * 
 * Bu fonksiyon uygulama başlamadan önce çağrılmalıdır.
 * Genellikle main.tsx içinde, ReactDOM.createRoot'tan önce.
 * 
 * @example
 * ```tsx
 * // main.tsx
 * import { setupAI } from '@/lib/ai/examples/integration';
 * 
 * // Uygulamayı başlatmadan önce
 * setupAI();
 * 
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <React.StrictMode>
 *     <AIProvider>
 *       <App />
 *     </AIProvider>
 *   </React.StrictMode>
 * );
 * ```
 */
export function setupAI() {
  // Auth store'dan token al
  // NOT: Bu örnek, Zustand store kullanıldığını varsayar
  const getAuthToken = () => {
    // localStorage'dan veya store'dan token al
    const token = localStorage.getItem('auth_token');
    return token;
  };
  
  // Auth hatası handler
  const handleAuthError = () => {
    // Token'ı temizle
    localStorage.removeItem('auth_token');
    // Login sayfasına yönlendir
    window.location.href = '/login?reason=session_expired';
  };
  
  // Kota aşıldı handler
  const handleQuotaExceeded = () => {
    // Kullanıcıya bildirim göster
    console.warn('AI quota exceeded');
    // Toast notification gösterilebilir
  };
  
  // AI servisini başlat
  initializeAI({
    getAuthToken,
    onAuthError: handleAuthError,
    onQuotaExceeded: handleQuotaExceeded,
    config: {
      // Development'ta mock kullan
      useMock: import.meta.env.DEV && !import.meta.env.VITE_AI_API_URL,
      // Production'da gerçek API
      apiBaseUrl: import.meta.env.VITE_AI_API_URL || '/api/v1/ai',
      // 30 saniye timeout
      timeout: 30000,
      // 3 retry
      maxRetries: 3,
      // Development'ta logging açık
      enableLogging: import.meta.env.DEV,
    },
  });
  
  console.log('[AI] Service initialized successfully');
}

/**
 * Zustand Store ile Entegrasyon Örneği
 * 
 * Auth store kullanıyorsanız, token getter'ı store'dan alabilirsiniz.
 */
export function setupAIWithZustand() {
  // Lazy import to avoid circular dependencies
  // const { useAuthStore } = await import('@/stores/authStore');
  
  initializeAI({
    getAuthToken: () => {
      // Store state'ine direkt erişim (subscribe olmadan)
      // return useAuthStore.getState().token;
      return localStorage.getItem('auth_token');
    },
    onAuthError: () => {
      // useAuthStore.getState().logout();
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    },
  });
}

/**
 * Custom Interceptor Örneği
 * 
 * Request/Response interceptor'ları eklemek için.
 */
export function setupAIWithInterceptors() {
  // Initialize first
  initializeAI({
    getAuthToken: () => localStorage.getItem('auth_token'),
  });
  
  try {
    const client = getAIApiClient();
    
    // Request logging
    client.addRequestInterceptor((config: AIApiRequestConfig): AIApiRequestConfig => {
      console.log(`[AI Request] ${config.method} ${config.endpoint}`, {
        body: config.body,
        timestamp: new Date().toISOString(),
      });
      return config;
    });
    
    // Response timing
    client.addResponseInterceptor(<T>(response: AIApiResponse<T>): AIApiResponse<T> => {
      if (response.metadata?.latency && response.metadata.latency > 3000) {
        console.warn(`[AI Slow Response] ${response.metadata.latency}ms`);
      }
      return response;
    });
    
    // Error analytics
    client.addErrorInterceptor((error: AIServiceError): AIServiceError => {
      // Analytics'e hata gönder
      console.error('[AI Error]', {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
      });
      return error;
    });
    
  } catch (e) {
    console.error('Failed to add interceptors:', e);
  }
}

/**
 * Test Environment Setup
 * 
 * Test ortamı için mock adapter kullanımı.
 */
export function setupAIForTests() {
  initializeAI({
    getAuthToken: () => 'test-token',
    config: {
      useMock: true,
      enableLogging: false,
    },
  });
}
