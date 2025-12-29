/**
 * AI API Client - Enterprise-Grade API Integration
 * 
 * Frontend → Backend AI API çağrılarını yöneten merkezi client.
 * 
 * ÖZELLİKLER:
 * ===========
 * 1. JWT Token otomatik yönetimi
 * 2. Retry with exponential backoff
 * 3. Timeout yönetimi
 * 4. Request/Response interceptors
 * 5. Error normalization
 * 6. Request queuing & rate limiting
 * 7. Offline detection
 */

import type { AIServiceResponse, AIServiceError } from './aiService';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface AIApiClientConfig {
  /** Base API URL */
  baseUrl: string;
  /** Request timeout in ms */
  timeout: number;
  /** Max retry attempts */
  maxRetries: number;
  /** Base delay for exponential backoff (ms) */
  retryBaseDelay: number;
  /** Max delay between retries (ms) */
  retryMaxDelay: number;
  /** Retry multiplier for exponential backoff */
  retryMultiplier: number;
  /** HTTP status codes that should trigger retry */
  retryStatusCodes: number[];
  /** Rate limit: max requests per window */
  rateLimitPerWindow: number;
  /** Rate limit window in ms */
  rateLimitWindow: number;
}

const DEFAULT_CONFIG: AIApiClientConfig = {
  baseUrl: '/api/v1/ai',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryBaseDelay: 1000,
  retryMaxDelay: 10000,
  retryMultiplier: 2,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  rateLimitPerWindow: 60,
  rateLimitWindow: 60000, // 1 minute
};

// =============================================================================
// REQUEST TYPES
// =============================================================================

export interface AIApiRequestConfig {
  /** Request endpoint (appended to baseUrl) */
  endpoint: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Request body */
  body?: Record<string, unknown>;
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Override timeout for this request */
  timeout?: number;
  /** Skip retry for this request */
  skipRetry?: boolean;
  /** Request priority (higher = more important) */
  priority?: 'low' | 'normal' | 'high';
  /** Abort signal */
  signal?: AbortSignal;
}

export interface AIApiResponse<T> {
  success: boolean;
  data?: T;
  error?: AIServiceError;
  metadata?: {
    requestId?: string;
    latency?: number;
    cached?: boolean;
    tokensUsed?: number;
    retryCount?: number;
  };
}

// =============================================================================
// INTERCEPTORS
// =============================================================================

export type RequestInterceptor = (
  config: AIApiRequestConfig
) => AIApiRequestConfig | Promise<AIApiRequestConfig>;

export type ResponseInterceptor = <T>(
  response: AIApiResponse<T>
) => AIApiResponse<T> | Promise<AIApiResponse<T>>;

export type ErrorInterceptor = (
  error: AIServiceError
) => AIServiceError | Promise<AIServiceError>;

// =============================================================================
// AI API CLIENT
// =============================================================================

export class AIApiClient {
  private config: AIApiClientConfig;
  private getAuthToken: () => string | null;
  
  // Interceptors
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  
  // Rate limiting
  private requestTimestamps: number[] = [];
  
  // Offline detection
  private isOnline: boolean = navigator.onLine;
  
  constructor(
    config: Partial<AIApiClientConfig> = {},
    getAuthToken: () => string | null = () => null
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.getAuthToken = getAuthToken;
    
    // Setup online/offline detection
    window.addEventListener('online', () => { this.isOnline = true; });
    window.addEventListener('offline', () => { this.isOnline = false; });
  }
  
  // ===========================================================================
  // INTERCEPTOR MANAGEMENT
  // ===========================================================================
  
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) this.requestInterceptors.splice(index, 1);
    };
  }
  
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index > -1) this.responseInterceptors.splice(index, 1);
    };
  }
  
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index > -1) this.errorInterceptors.splice(index, 1);
    };
  }
  
  // ===========================================================================
  // RATE LIMITING
  // ===========================================================================
  
  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;
    
    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(t => t > windowStart);
    
    return this.requestTimestamps.length < this.config.rateLimitPerWindow;
  }
  
  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }
  
  private getTimeUntilNextSlot(): number {
    if (this.requestTimestamps.length === 0) return 0;
    
    const oldestInWindow = Math.min(...this.requestTimestamps);
    const nextSlotTime = oldestInWindow + this.config.rateLimitWindow;
    return Math.max(0, nextSlotTime - Date.now());
  }
  
  // ===========================================================================
  // RETRY LOGIC
  // ===========================================================================
  
  private calculateRetryDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter * 1000;
    }
    
    const delay = this.config.retryBaseDelay * Math.pow(this.config.retryMultiplier, attempt);
    const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
    return Math.min(delay + jitter, this.config.retryMaxDelay);
  }
  
  private shouldRetry(status: number, attempt: number, skipRetry?: boolean): boolean {
    if (skipRetry) return false;
    if (attempt >= this.config.maxRetries) return false;
    return this.config.retryStatusCodes.includes(status);
  }
  
  // ===========================================================================
  // MAIN REQUEST METHOD
  // ===========================================================================
  
  async request<T>(config: AIApiRequestConfig): Promise<AIApiResponse<T>> {
    const startTime = Date.now();
    let retryCount = 0;
    
    // Offline check
    if (!this.isOnline) {
      return this.createErrorResponse('OFFLINE', 'No internet connection', 
        'İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
    }
    
    // Rate limit check
    if (!this.checkRateLimit()) {
      const waitTime = this.getTimeUntilNextSlot();
      return this.createErrorResponse('RATE_LIMITED', 
        `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)}s`,
        `Çok fazla istek gönderildi. ${Math.ceil(waitTime / 1000)} saniye sonra tekrar deneyin.`,
        true, Math.ceil(waitTime / 1000));
    }
    
    // Apply request interceptors
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }
    
    // Build URL with query params
    let url = `${this.config.baseUrl}${finalConfig.endpoint}`;
    if (finalConfig.params) {
      const queryString = new URLSearchParams(
        Object.entries(finalConfig.params).map(([k, v]) => [k, String(v)])
      ).toString();
      url += `?${queryString}`;
    }
    
    // Execute with retry
    while (true) {
      try {
        const response = await this.executeRequest<T>(url, finalConfig, startTime);
        
        // Apply response interceptors
        let finalResponse = response;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = await interceptor(finalResponse);
        }
        
        // Add retry info to metadata
        if (finalResponse.metadata) {
          finalResponse.metadata.retryCount = retryCount;
        }
        
        this.recordRequest();
        return finalResponse;
        
      } catch (error) {
        const errorResponse = this.handleRequestError(error);
        
        // Check if we should retry
        const statusCode = this.getStatusCodeFromError(error);
        const retryAfter = this.getRetryAfterFromError(error);
        
        if (this.shouldRetry(statusCode, retryCount, finalConfig.skipRetry)) {
          retryCount++;
          const delay = this.calculateRetryDelay(retryCount, retryAfter);
          await this.sleep(delay);
          continue;
        }
        
        // Apply error interceptors
        let finalError = errorResponse.error!;
        for (const interceptor of this.errorInterceptors) {
          finalError = await interceptor(finalError);
        }
        
        return { success: false, error: finalError } as AIApiResponse<T>;
      }
    }
  }
  
  private async executeRequest<T>(
    url: string,
    config: AIApiRequestConfig,
    startTime: number
  ): Promise<AIApiResponse<T>> {
    const token = this.getAuthToken();
    const timeout = config.timeout ?? this.config.timeout;
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Merge signals if external signal provided
    const signal = config.signal 
      ? this.mergeAbortSignals(config.signal, controller.signal)
      : controller.signal;
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-ID': this.generateRequestId(),
        'X-Client-Version': '1.0.0',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...config.headers,
      };
      
      const response = await fetch(url, {
        method: config.method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal,
      });
      
      clearTimeout(timeoutId);
      
      const latency = Date.now() - startTime;
      const data = await response.json();
      
      if (!response.ok) {
        return this.handleHttpError(response, data, latency);
      }
      
      return {
        success: true,
        data: data.data,
        metadata: {
          requestId: response.headers.get('X-Request-ID') || undefined,
          latency,
          cached: response.headers.get('X-Cache') === 'HIT',
          tokensUsed: data.metadata?.tokens_used,
        },
      };
      
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================
  
  private handleHttpError<T>(
    response: Response,
    data: any,
    latency: number
  ): AIApiResponse<T> {
    const error: AIServiceError = {
      code: data.error?.code || `HTTP_${response.status}`,
      message: data.error?.message || response.statusText,
      userMessage: data.error?.user_message || this.getDefaultUserMessage(response.status),
      retryable: this.config.retryStatusCodes.includes(response.status),
      retryAfter: this.parseRetryAfter(response.headers.get('Retry-After')),
    };
    
    return {
      success: false,
      error,
      metadata: { latency },
    };
  }
  
  private handleRequestError<T>(error: unknown): AIApiResponse<T> {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return this.createErrorResponse('TIMEOUT', 
        'Request timed out',
        'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
        true);
    }
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return this.createErrorResponse('NETWORK_ERROR',
        'Network request failed',
        'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.',
        true);
    }
    
    return this.createErrorResponse('UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
      true);
  }
  
  private createErrorResponse<T>(
    code: string,
    message: string,
    userMessage: string,
    retryable: boolean = false,
    retryAfter?: number
  ): AIApiResponse<T> {
    return {
      success: false,
      error: { code, message, userMessage, retryable, retryAfter },
    };
  }
  
  private getDefaultUserMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'Geçersiz istek. Lütfen girdiğiniz bilgileri kontrol edin.',
      401: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
      403: 'Bu işlem için yetkiniz bulunmuyor.',
      404: 'İstenen kaynak bulunamadı.',
      429: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
      500: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
      502: 'Sunucu geçici olarak kullanılamıyor.',
      503: 'Servis şu an bakımda. Lütfen daha sonra tekrar deneyin.',
    };
    return messages[status] || 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
  
  // ===========================================================================
  // UTILITIES
  // ===========================================================================
  
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private parseRetryAfter(header: string | null): number | undefined {
    if (!header) return undefined;
    const seconds = parseInt(header, 10);
    return isNaN(seconds) ? undefined : seconds;
  }
  
  private getStatusCodeFromError(error: unknown): number {
    if (error instanceof Response) return error.status;
    if (error instanceof DOMException && error.name === 'AbortError') return 408;
    return 0;
  }
  
  private getRetryAfterFromError(error: unknown): number | undefined {
    if (error instanceof Response) {
      return this.parseRetryAfter(error.headers.get('Retry-After'));
    }
    return undefined;
  }
  
  private mergeAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort());
    }
    
    return controller.signal;
  }
  
  // ===========================================================================
  // CONVENIENCE METHODS
  // ===========================================================================
  
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<AIApiResponse<T>> {
    return this.request<T>({ endpoint, method: 'GET', params });
  }
  
  async post<T>(endpoint: string, body?: Record<string, unknown>): Promise<AIApiResponse<T>> {
    return this.request<T>({ endpoint, method: 'POST', body });
  }
  
  async put<T>(endpoint: string, body?: Record<string, unknown>): Promise<AIApiResponse<T>> {
    return this.request<T>({ endpoint, method: 'PUT', body });
  }
  
  async delete<T>(endpoint: string): Promise<AIApiResponse<T>> {
    return this.request<T>({ endpoint, method: 'DELETE' });
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let apiClientInstance: AIApiClient | null = null;

export function getAIApiClient(): AIApiClient {
  if (!apiClientInstance) {
    throw new Error('AI API Client not initialized');
  }
  return apiClientInstance;
}

export function initializeAIApiClient(
  config?: Partial<AIApiClientConfig>,
  getAuthToken?: () => string | null
): AIApiClient {
  apiClientInstance = new AIApiClient(config, getAuthToken);
  return apiClientInstance;
}
