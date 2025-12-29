/**
 * API Response Handler - Yanıt İşleme Katmanı
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NEDEN TİCARİ ÜRÜNLER İÇİN KRİTİK?
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 1. TUTARLILIK: Tüm API yanıtları aynı şekilde işlenir
 * 2. HATA YÖNETİMİ: Merkezi hata yakalama ve işleme
 * 3. TİP GÜVENLİĞİ: Runtime'da tip doğrulama
 * 4. LOGLAMa: Tüm API etkileşimleri izlenebilir
 * 5. CACHE: Akıllı cache yönetimi
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import type { 
  ApiResponse, 
  ApiErrorDetail, 
  ApiErrorCode,
  PaginatedResponse,
  RateLimitMeta,
  AsyncOperationResponse,
} from './ApiContractTypes';
import { isSuccessResponse, isErrorResponse } from './ApiContractTypes';
import { getStatusCodeUX, isRetryable, calculateRetryDelay } from './StatusCodeUX';
import { formatErrorForUser, getErrorMessage } from './ErrorCodeMessages';

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 RESPONSE HANDLER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Response handler configuration
 */
export interface ResponseHandlerConfig {
  /** Base URL for API calls */
  baseUrl?: string;
  
  /** Default timeout (ms) */
  timeout?: number;
  
  /** Auto retry enabled */
  autoRetry?: boolean;
  
  /** Max retry attempts */
  maxRetries?: number;
  
  /** Unauthorized handler */
  onUnauthorized?: () => void;
  
  /** Generic error handler */
  onError?: (error: ApiErrorDetail) => void;
  
  /** Rate limit handler */
  onRateLimit?: (meta: RateLimitMeta) => void;
  
  /** Log level */
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  
  /** Error reporting function */
  reportError?: (error: Error, context?: Record<string, unknown>) => void;
}

/**
 * Request options
 */
export interface RequestOptions {
  /** Skip auth header */
  skipAuth?: boolean;
  
  /** Custom timeout */
  timeout?: number;
  
  /** Skip auto retry */
  skipRetry?: boolean;
  
  /** Cache key */
  cacheKey?: string;
  
  /** Cache TTL (ms) */
  cacheTTL?: number;
  
  /** Abort signal */
  signal?: AbortSignal;
  
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Processed response
 */
export interface ProcessedResponse<T> {
  /** Success status */
  success: boolean;
  
  /** Response data (if successful) */
  data?: T;
  
  /** Error details (if failed) */
  error?: ApiErrorDetail;
  
  /** HTTP status code */
  statusCode: number;
  
  /** Rate limit info */
  rateLimit?: RateLimitMeta;
  
  /** Request ID for debugging */
  requestId?: string;
  
  /** Was this from cache? */
  fromCache?: boolean;
  
  /** Response timestamp */
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🛠️ RESPONSE PROCESSING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw API response'u işler ve standart formata dönüştürür
 */
export function processApiResponse<T>(
  response: Response,
  data: ApiResponse<T>,
  startTime: number
): ProcessedResponse<T> {
  const statusCode = response.status;
  const timestamp = new Date();
  
  // Rate limit header'larını oku
  const rateLimit = extractRateLimitFromHeaders(response.headers);
  
  // Request ID
  const requestId = data.request_id || response.headers.get('X-Request-ID') || undefined;
  
  if (isSuccessResponse(data)) {
    return {
      success: true,
      data: data.data,
      statusCode,
      rateLimit,
      requestId,
      timestamp,
    };
  }
  
  if (isErrorResponse(data)) {
    return {
      success: false,
      error: data.error,
      statusCode,
      rateLimit,
      requestId,
      timestamp,
    };
  }
  
  // Fallback for malformed responses
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'Beklenmeyen yanıt formatı',
    },
    statusCode,
    rateLimit,
    requestId,
    timestamp,
  };
}

/**
 * Response header'larından rate limit bilgisi çıkarır
 */
export function extractRateLimitFromHeaders(headers: Headers): RateLimitMeta | undefined {
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');
  const retryAfter = headers.get('Retry-After');
  
  if (limit && remaining && reset) {
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
      retry_after: retryAfter ? parseInt(retryAfter, 10) : undefined,
    };
  }
  
  return undefined;
}

/**
 * Network hatalarını API error formatına dönüştürür
 */
export function createNetworkError(error: Error): ApiErrorDetail {
  if (error.name === 'AbortError') {
    return {
      code: 'TIMEOUT',
      message: 'İstek iptal edildi veya zaman aşımına uğradı',
      retryable: true,
    };
  }
  
  if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'İnternet bağlantısı kurulamadı',
      retryable: true,
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'Bilinmeyen bir hata oluştu',
    retryable: false,
  };
}

/**
 * HTTP status code'dan error code üretir
 */
export function statusCodeToErrorCode(statusCode: number): ApiErrorCode {
  const statusMap: Record<number, ApiErrorCode> = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'ERROR',
    408: 'TIMEOUT',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_ERROR',
    502: 'SERVICE_UNAVAILABLE',
    503: 'SERVICE_UNAVAILABLE',
    504: 'TIMEOUT',
  };
  
  return statusMap[statusCode] || 'UNKNOWN_ERROR';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 RETRY LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

interface RetryState {
  attempt: number;
  lastError?: ApiErrorDetail;
  nextRetryAt?: Date;
}

/**
 * Retry edilebilir fetch wrapper
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  config: {
    maxRetries: number;
    shouldRetry?: (error: ApiErrorDetail, statusCode: number) => boolean;
    onRetry?: (attempt: number, delay: number) => void;
  }
): Promise<ProcessedResponse<T>> {
  let lastResponse: ProcessedResponse<T> | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      const response = await fetch(url, options);
      
      let data: ApiResponse<T>;
      try {
        data = await response.json();
      } catch {
        // JSON parse error
        data = {
          success: false,
          timestamp: new Date().toISOString(),
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Sunucu yanıtı işlenemedi',
          },
        };
      }
      
      lastResponse = processApiResponse<T>(response, data, startTime);
      
      // Başarılı veya retry edilemez
      if (lastResponse.success || !isRetryable(lastResponse.statusCode)) {
        return lastResponse;
      }
      
      // Custom retry check
      if (config.shouldRetry && !config.shouldRetry(lastResponse.error!, lastResponse.statusCode)) {
        return lastResponse;
      }
      
      // Son deneme ise direkt dön
      if (attempt === config.maxRetries) {
        return lastResponse;
      }
      
      // Retry delay hesapla
      const delay = calculateRetryDelay(lastResponse.statusCode, attempt + 1, lastResponse.rateLimit);
      config.onRetry?.(attempt + 1, delay);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      const apiError = createNetworkError(error as Error);
      lastResponse = {
        success: false,
        error: apiError,
        statusCode: 0,
        timestamp: new Date(),
      };
      
      if (!apiError.retryable || attempt === config.maxRetries) {
        return lastResponse;
      }
      
      const delay = 1000 * Math.pow(2, attempt);
      config.onRetry?.(attempt + 1, delay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return lastResponse!;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Simple in-memory cache
 */
class ResponseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 100;
  
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    // TTL kontrolü
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data as T;
  }
  
  set<T>(key: string, data: T, ttl: number = 60000): void {
    // Max size kontrolü
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const responseCache = new ResponseCache();

// ═══════════════════════════════════════════════════════════════════════════════
// ⚛️ REACT CONTEXT & HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

interface ResponseHandlerContextValue {
  config: ResponseHandlerConfig;
  processResponse: <T>(response: Response, data: ApiResponse<T>) => ProcessedResponse<T>;
  handleError: (error: ApiErrorDetail, statusCode: number) => void;
}

const ResponseHandlerContext = createContext<ResponseHandlerContextValue | null>(null);

/**
 * Response handler provider
 */
export function ResponseHandlerProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: ResponseHandlerConfig;
}) {
  const processResponse = useCallback(<T,>(
    response: Response,
    data: ApiResponse<T>
  ): ProcessedResponse<T> => {
    return processApiResponse(response, data, Date.now());
  }, []);
  
  const handleError = useCallback((error: ApiErrorDetail, statusCode: number) => {
    const uxConfig = getStatusCodeUX(statusCode);
    
    // Loglama
    if (config.logLevel && config.logLevel !== 'none') {
      const logFn = console[uxConfig.logLevel] || console.log;
      logFn(`[API Error] ${statusCode} - ${error.code}: ${error.message}`);
    }
    
    // 401 handler
    if (statusCode === 401 && config.onUnauthorized) {
      config.onUnauthorized();
      return;
    }
    
    // Rate limit handler
    if (statusCode === 429 && error.retry_after && config.onRateLimit) {
      config.onRateLimit({
        limit: 0,
        remaining: 0,
        reset: Date.now() + (error.retry_after * 1000),
        retry_after: error.retry_after,
      });
    }
    
    // Generic error handler
    config.onError?.(error);
    
    // Error reporting
    if (uxConfig.reportError && config.reportError) {
      config.reportError(new Error(`${error.code}: ${error.message}`), {
        statusCode,
        errorCode: error.code,
        details: error.details,
      });
    }
  }, [config]);
  
  return (
    <ResponseHandlerContext.Provider value={{ config, processResponse, handleError }}>
      {children}
    </ResponseHandlerContext.Provider>
  );
}

/**
 * Response handler hook
 */
export function useResponseHandler() {
  const context = useContext(ResponseHandlerContext);
  
  if (!context) {
    throw new Error('useResponseHandler must be used within ResponseHandlerProvider');
  }
  
  return context;
}

/**
 * API call hook with full response handling
 */
export function useApiCall<T, TArgs extends unknown[] = []>(
  apiFn: (...args: TArgs) => Promise<ProcessedResponse<T>>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: ApiErrorDetail) => void;
    autoRetry?: boolean;
  } = {}
) {
  const [state, setState] = useState<{
    data: T | null;
    error: ApiErrorDetail | null;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
  }>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });
  
  const execute = useCallback(async (...args: TArgs) => {
    setState(prev => ({ ...prev, isLoading: true, isError: false }));
    
    try {
      const response = await apiFn(...args);
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
        });
        options.onSuccess?.(response.data);
        return response.data;
      } else {
        setState({
          data: null,
          error: response.error || null,
          isLoading: false,
          isSuccess: false,
          isError: true,
        });
        if (response.error) {
          options.onError?.(response.error);
        }
        throw response.error;
      }
    } catch (error) {
      const apiError = error as ApiErrorDetail || createNetworkError(error as Error);
      setState(prev => ({
        ...prev,
        error: apiError,
        isLoading: false,
        isError: true,
      }));
      throw apiError;
    }
  }, [apiFn, options]);
  
  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);
  
  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Polling hook for async operations
 */
export function useAsyncOperation(
  checkStatusFn: (taskId: string) => Promise<ProcessedResponse<AsyncOperationResponse>>,
  options: {
    pollingInterval?: number;
    maxPollingTime?: number;
    onComplete?: (result: AsyncOperationResponse) => void;
    onError?: (error: ApiErrorDetail) => void;
  } = {}
) {
  const [status, setStatus] = useState<AsyncOperationResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<ApiErrorDetail | null>(null);
  
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const startPolling = useCallback((taskId: string) => {
    setIsPolling(true);
    setError(null);
    startTimeRef.current = Date.now();
    
    const poll = async () => {
      // Max polling time check
      if (options.maxPollingTime && Date.now() - startTimeRef.current > options.maxPollingTime) {
        stopPolling();
        const timeoutError: ApiErrorDetail = {
          code: 'TIMEOUT',
          message: 'İşlem zaman aşımına uğradı',
        };
        setError(timeoutError);
        options.onError?.(timeoutError);
        return;
      }
      
      try {
        const response = await checkStatusFn(taskId);
        
        if (!response.success || !response.data) {
          stopPolling();
          setError(response.error || null);
          if (response.error) {
            options.onError?.(response.error);
          }
          return;
        }
        
        setStatus(response.data);
        
        if (response.data.status === 'completed') {
          stopPolling();
          options.onComplete?.(response.data);
        } else if (response.data.status === 'failed' || response.data.status === 'cancelled') {
          stopPolling();
          const opError: ApiErrorDetail = {
            code: 'INTERNAL_ERROR',
            message: response.data.message || 'İşlem başarısız oldu',
          };
          setError(opError);
          options.onError?.(opError);
        }
      } catch (err) {
        stopPolling();
        const apiError = createNetworkError(err as Error);
        setError(apiError);
        options.onError?.(apiError);
      }
    };
    
    // İlk poll
    poll();
    
    // Interval başlat
    intervalRef.current = window.setInterval(poll, options.pollingInterval || 2000);
  }, [checkStatusFn, options]);
  
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  return {
    status,
    isPolling,
    error,
    progress: status?.progress || 0,
    startPolling,
    stopPolling,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 RESPONSE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Loading state component
 */
export function LoadingState({ message = 'Yükleniyor...', size = 'md', className = '' }: LoadingStateProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizes[size]}`} />
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Empty state component
 */
export function EmptyState({
  title = 'Veri bulunamadı',
  description = 'Henüz kayıt eklenmemiş.',
  action,
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      {icon || (
        <div className="text-4xl mb-4">📭</div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface AsyncOperationProgressProps {
  status: AsyncOperationResponse | null;
  className?: string;
}

/**
 * Async operation progress component
 */
export function AsyncOperationProgress({ status, className = '' }: AsyncOperationProgressProps) {
  if (!status) return null;
  
  const statusLabels = {
    pending: 'Bekliyor',
    processing: 'İşleniyor',
    completed: 'Tamamlandı',
    failed: 'Başarısız',
    cancelled: 'İptal edildi',
  };
  
  const statusColors = {
    pending: 'bg-gray-500',
    processing: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    cancelled: 'bg-yellow-500',
  };
  
  return (
    <div className={`p-4 rounded-lg border bg-white dark:bg-gray-800 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {statusLabels[status.status]}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {status.progress !== undefined ? `${status.progress}%` : ''}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-500 ${statusColors[status.status]}`}
          style={{ width: `${status.progress || 0}%` }}
        />
      </div>
      
      {status.message && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {status.message}
        </p>
      )}
      
      {status.estimated_completion && status.status === 'processing' && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Tahmini süre: {Math.ceil(status.estimated_completion / 60)} dakika
        </p>
      )}
    </div>
  );
}

interface DataWrapperProps<T> {
  data: T | null | undefined;
  isLoading: boolean;
  error: ApiErrorDetail | null;
  onRetry?: () => void;
  loadingMessage?: string;
  emptyMessage?: string;
  children: (data: T) => React.ReactNode;
  className?: string;
}

/**
 * Data wrapper component - loading, error, empty states'i yönetir
 */
export function DataWrapper<T>({
  data,
  isLoading,
  error,
  onRetry,
  loadingMessage = 'Yükleniyor...',
  emptyMessage = 'Veri bulunamadı',
  children,
  className = '',
}: DataWrapperProps<T>) {
  // Loading state
  if (isLoading) {
    return <LoadingState message={loadingMessage} className={className} />;
  }
  
  // Error state
  if (error) {
    const message = formatErrorForUser(error);
    return (
      <div className={`p-4 rounded-lg bg-red-50 dark:bg-red-900/20 ${className}`}>
        <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
          {message.title}
        </h4>
        <p className="text-red-700 dark:text-red-300 text-sm mb-3">
          {message.description}
        </p>
        {onRetry && message.suggestRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            Tekrar Dene
          </button>
        )}
      </div>
    );
  }
  
  // Empty state
  if (data === null || data === undefined) {
    return <EmptyState description={emptyMessage} className={className} />;
  }
  
  // Array empty check
  if (Array.isArray(data) && data.length === 0) {
    return <EmptyState description={emptyMessage} className={className} />;
  }
  
  // Render children with data
  return <>{children(data)}</>;
}
