/**
 * Status Code UX - HTTP Status Code → UX İlişkisi
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NEDEN TİCARİ ÜRÜNLER İÇİN KRİTİK?
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 1. TUTARLILIK: Her status code için standart UX davranışı
 * 2. GÜVENLİK: 401/403 durumlarında güvenli yönlendirme
 * 3. KULLANICI DENEYİMİ: Anlaşılır ve aksiyona dönüştürülebilir yanıtlar
 * 4. PERFORMANS: 429 durumunda akıllı rate limiting yönetimi
 * 5. HATA İZLEME: 5xx hatalarında otomatik raporlama
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { ApiErrorCode, ApiResponse, RateLimitMeta } from './ApiContractTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 STATUS CODE CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HTTP Status Code kategorileri
 */
export type StatusCodeCategory = 
  | 'success'      // 2xx
  | 'redirect'     // 3xx
  | 'client_error' // 4xx
  | 'server_error' // 5xx
  | 'network';     // Network/timeout errors

/**
 * UX aksiyon türleri
 */
export type UXAction = 
  | 'none'           // Aksiyon gerekmez
  | 'show_success'   // Başarı mesajı göster
  | 'show_error'     // Hata mesajı göster
  | 'redirect_login' // Login sayfasına yönlendir
  | 'redirect_home'  // Ana sayfaya yönlendir
  | 'show_upgrade'   // Upgrade/plan değişikliği öner
  | 'retry'          // Otomatik retry
  | 'wait_retry'     // Belirli süre bekle, sonra retry
  | 'contact_support'// Destek iletişimi öner
  | 'refresh_page'   // Sayfa yenileme öner
  | 'show_offline'   // Offline modu aktifleştir
  | 'report_error';  // Hata raporlama

/**
 * Status code UX konfigürasyonu
 */
export interface StatusCodeUXConfig {
  /** Kategori */
  category: StatusCodeCategory;
  
  /** Önerilen UX aksiyonu */
  action: UXAction;
  
  /** Retry edilebilir mi? */
  retryable: boolean;
  
  /** Önerilen retry sayısı */
  maxRetries?: number;
  
  /** Retry arasındaki bekleme (ms) */
  retryDelay?: number;
  
  /** Cache'lenebilir mi? */
  cacheable: boolean;
  
  /** Loglama seviyesi */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  /** Hata raporlama yapılsın mı? */
  reportError: boolean;
  
  /** Varsayılan hata kodu */
  defaultErrorCode: ApiErrorCode;
  
  /** Kullanıcıya toast gösterilsin mi? */
  showToast: boolean;
  
  /** İşlemi iptal et mi? (pending işlemler için) */
  cancelPending: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 STATUS CODE UX MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HTTP Status Code → UX Config Mapping
 */
export const STATUS_CODE_UX: Record<number, StatusCodeUXConfig> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // ✅ SUCCESS (2xx)
  // ─────────────────────────────────────────────────────────────────────────────
  200: {
    category: 'success',
    action: 'none',
    retryable: false,
    cacheable: true,
    logLevel: 'debug',
    reportError: false,
    defaultErrorCode: 'ERROR',
    showToast: false,
    cancelPending: false,
  },
  
  201: {
    category: 'success',
    action: 'show_success',
    retryable: false,
    cacheable: false,
    logLevel: 'info',
    reportError: false,
    defaultErrorCode: 'ERROR',
    showToast: true,
    cancelPending: false,
  },
  
  202: {
    category: 'success',
    action: 'none', // Async işlem başladı, polling yapılacak
    retryable: false,
    cacheable: false,
    logLevel: 'info',
    reportError: false,
    defaultErrorCode: 'ERROR',
    showToast: true,
    cancelPending: false,
  },
  
  204: {
    category: 'success',
    action: 'show_success',
    retryable: false,
    cacheable: false,
    logLevel: 'debug',
    reportError: false,
    defaultErrorCode: 'ERROR',
    showToast: false,
    cancelPending: false,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ↪️ REDIRECT (3xx)
  // ─────────────────────────────────────────────────────────────────────────────
  301: {
    category: 'redirect',
    action: 'none', // Tarayıcı otomatik yönlendirir
    retryable: false,
    cacheable: true,
    logLevel: 'debug',
    reportError: false,
    defaultErrorCode: 'ERROR',
    showToast: false,
    cancelPending: false,
  },
  
  302: {
    category: 'redirect',
    action: 'none',
    retryable: false,
    cacheable: false,
    logLevel: 'debug',
    reportError: false,
    defaultErrorCode: 'ERROR',
    showToast: false,
    cancelPending: false,
  },
  
  304: {
    category: 'redirect',
    action: 'none', // Not Modified - cache kullan
    retryable: false,
    cacheable: true,
    logLevel: 'debug',
    reportError: false,
    defaultErrorCode: 'ERROR',
    showToast: false,
    cancelPending: false,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ⚠️ CLIENT ERRORS (4xx)
  // ─────────────────────────────────────────────────────────────────────────────
  400: {
    category: 'client_error',
    action: 'show_error',
    retryable: false, // Aynı request tekrarlanmamalı
    cacheable: false,
    logLevel: 'warn',
    reportError: false,
    defaultErrorCode: 'VALIDATION_ERROR',
    showToast: true,
    cancelPending: false,
  },
  
  401: {
    category: 'client_error',
    action: 'redirect_login',
    retryable: false,
    cacheable: false,
    logLevel: 'info',
    reportError: false,
    defaultErrorCode: 'UNAUTHORIZED',
    showToast: true,
    cancelPending: true, // Tüm pending istekleri iptal et
  },
  
  403: {
    category: 'client_error',
    action: 'show_error',
    retryable: false,
    cacheable: false,
    logLevel: 'warn',
    reportError: false,
    defaultErrorCode: 'FORBIDDEN',
    showToast: true,
    cancelPending: false,
  },
  
  404: {
    category: 'client_error',
    action: 'show_error',
    retryable: false,
    cacheable: false, // 404'ler cache'lenmemeli
    logLevel: 'info',
    reportError: false,
    defaultErrorCode: 'NOT_FOUND',
    showToast: true,
    cancelPending: false,
  },
  
  405: {
    category: 'client_error',
    action: 'show_error',
    retryable: false,
    cacheable: false,
    logLevel: 'warn',
    reportError: true, // Bug olabilir
    defaultErrorCode: 'ERROR',
    showToast: true,
    cancelPending: false,
  },
  
  408: {
    category: 'client_error',
    action: 'retry',
    retryable: true,
    maxRetries: 3,
    retryDelay: 1000,
    cacheable: false,
    logLevel: 'warn',
    reportError: false,
    defaultErrorCode: 'TIMEOUT',
    showToast: true,
    cancelPending: false,
  },
  
  409: {
    category: 'client_error',
    action: 'refresh_page',
    retryable: false,
    cacheable: false,
    logLevel: 'warn',
    reportError: false,
    defaultErrorCode: 'CONFLICT',
    showToast: true,
    cancelPending: false,
  },
  
  410: {
    category: 'client_error',
    action: 'redirect_home',
    retryable: false,
    cacheable: true, // Gone kalıcıdır
    logLevel: 'info',
    reportError: false,
    defaultErrorCode: 'RESOURCE_NOT_FOUND',
    showToast: true,
    cancelPending: false,
  },
  
  422: {
    category: 'client_error',
    action: 'show_error',
    retryable: false,
    cacheable: false,
    logLevel: 'warn',
    reportError: false,
    defaultErrorCode: 'VALIDATION_ERROR',
    showToast: true,
    cancelPending: false,
  },
  
  429: {
    category: 'client_error',
    action: 'wait_retry',
    retryable: true,
    maxRetries: 1,
    retryDelay: 60000, // Rate limit header'dan güncellenir
    cacheable: false,
    logLevel: 'warn',
    reportError: false,
    defaultErrorCode: 'RATE_LIMIT_EXCEEDED',
    showToast: true,
    cancelPending: false,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ❌ SERVER ERRORS (5xx)
  // ─────────────────────────────────────────────────────────────────────────────
  500: {
    category: 'server_error',
    action: 'report_error',
    retryable: true,
    maxRetries: 2,
    retryDelay: 2000,
    cacheable: false,
    logLevel: 'error',
    reportError: true,
    defaultErrorCode: 'INTERNAL_ERROR',
    showToast: true,
    cancelPending: false,
  },
  
  501: {
    category: 'server_error',
    action: 'contact_support',
    retryable: false,
    cacheable: false,
    logLevel: 'error',
    reportError: true,
    defaultErrorCode: 'INTERNAL_ERROR',
    showToast: true,
    cancelPending: false,
  },
  
  502: {
    category: 'server_error',
    action: 'retry',
    retryable: true,
    maxRetries: 3,
    retryDelay: 3000,
    cacheable: false,
    logLevel: 'error',
    reportError: true,
    defaultErrorCode: 'SERVICE_UNAVAILABLE',
    showToast: true,
    cancelPending: false,
  },
  
  503: {
    category: 'server_error',
    action: 'wait_retry',
    retryable: true,
    maxRetries: 3,
    retryDelay: 5000,
    cacheable: false,
    logLevel: 'error',
    reportError: true,
    defaultErrorCode: 'SERVICE_UNAVAILABLE',
    showToast: true,
    cancelPending: false,
  },
  
  504: {
    category: 'server_error',
    action: 'retry',
    retryable: true,
    maxRetries: 2,
    retryDelay: 5000,
    cacheable: false,
    logLevel: 'error',
    reportError: true,
    defaultErrorCode: 'TIMEOUT',
    showToast: true,
    cancelPending: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🛠️ UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Status code için UX config döndürür
 */
export function getStatusCodeUX(statusCode: number): StatusCodeUXConfig {
  // Exact match
  if (STATUS_CODE_UX[statusCode]) {
    return STATUS_CODE_UX[statusCode];
  }
  
  // Fallback to category defaults
  if (statusCode >= 200 && statusCode < 300) {
    return STATUS_CODE_UX[200];
  }
  if (statusCode >= 300 && statusCode < 400) {
    return STATUS_CODE_UX[302];
  }
  if (statusCode >= 400 && statusCode < 500) {
    return STATUS_CODE_UX[400];
  }
  if (statusCode >= 500) {
    return STATUS_CODE_UX[500];
  }
  
  // Unknown status code
  return {
    category: 'server_error',
    action: 'show_error',
    retryable: false,
    cacheable: false,
    logLevel: 'error',
    reportError: true,
    defaultErrorCode: 'UNKNOWN_ERROR',
    showToast: true,
    cancelPending: false,
  };
}

/**
 * Status code kategorisini döndürür
 */
export function getStatusCategory(statusCode: number): StatusCodeCategory {
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 300 && statusCode < 400) return 'redirect';
  if (statusCode >= 400 && statusCode < 500) return 'client_error';
  if (statusCode >= 500) return 'server_error';
  return 'network';
}

/**
 * Status code başarılı mı kontrol eder
 */
export function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

/**
 * Status code retry edilebilir mi kontrol eder
 */
export function isRetryable(statusCode: number): boolean {
  const config = getStatusCodeUX(statusCode);
  return config.retryable;
}

/**
 * Retry delay hesaplar (exponential backoff)
 */
export function calculateRetryDelay(
  statusCode: number,
  attemptNumber: number,
  rateLimitMeta?: RateLimitMeta
): number {
  const config = getStatusCodeUX(statusCode);
  
  // Rate limit header'dan retry_after varsa kullan
  if (rateLimitMeta?.retry_after) {
    return rateLimitMeta.retry_after * 1000;
  }
  
  const baseDelay = config.retryDelay || 1000;
  
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
  const jitter = Math.random() * 1000;
  
  return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚛️ REACT HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

interface UseStatusCodeHandlerOptions {
  onRedirectLogin?: () => void;
  onRedirectHome?: () => void;
  onShowError?: (message: string) => void;
  onShowSuccess?: (message: string) => void;
  onReportError?: (error: Error, statusCode: number) => void;
  onContactSupport?: () => void;
}

/**
 * Status code handler hook
 */
export function useStatusCodeHandler(options: UseStatusCodeHandlerOptions = {}) {
  const handleStatusCode = useCallback((
    statusCode: number,
    response?: ApiResponse,
  ) => {
    const config = getStatusCodeUX(statusCode);
    
    switch (config.action) {
      case 'redirect_login':
        options.onRedirectLogin?.();
        break;
        
      case 'redirect_home':
        options.onRedirectHome?.();
        break;
        
      case 'show_error':
        const errorMessage = response?.error?.message || 
          response?.message || 
          'Bir hata oluştu';
        options.onShowError?.(errorMessage);
        break;
        
      case 'show_success':
        const successMessage = response?.message || 'İşlem başarılı';
        options.onShowSuccess?.(successMessage);
        break;
        
      case 'contact_support':
        options.onContactSupport?.();
        break;
        
      case 'report_error':
        if (config.reportError) {
          options.onReportError?.(
            new Error(`HTTP ${statusCode}: ${response?.error?.message}`),
            statusCode
          );
        }
        break;
    }
    
    return config;
  }, [options]);
  
  return { handleStatusCode, getStatusCodeUX };
}

/**
 * Rate limit handler hook
 */
export function useRateLimitHandler() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  
  const handleRateLimit = useCallback((rateLimitMeta?: RateLimitMeta) => {
    if (rateLimitMeta) {
      setRemaining(rateLimitMeta.remaining);
      
      if (rateLimitMeta.remaining === 0) {
        setIsRateLimited(true);
        setRetryAfter(rateLimitMeta.retry_after || 60);
      }
    }
  }, []);
  
  // Rate limit countdown
  useEffect(() => {
    if (isRateLimited && retryAfter !== null && retryAfter > 0) {
      const timer = setInterval(() => {
        setRetryAfter(prev => {
          if (prev === null || prev <= 1) {
            setIsRateLimited(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isRateLimited, retryAfter]);
  
  const reset = useCallback(() => {
    setIsRateLimited(false);
    setRetryAfter(null);
    setRemaining(null);
  }, []);
  
  return {
    isRateLimited,
    retryAfter,
    remaining,
    handleRateLimit,
    reset,
  };
}

/**
 * Auto retry hook
 */
export function useAutoRetry<T>(
  asyncFn: () => Promise<T>,
  statusCode: number,
  options: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    onMaxRetriesReached?: () => void;
  } = {}
) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const config = getStatusCodeUX(statusCode);
  const maxRetries = config.maxRetries || 0;
  
  const retry = useCallback(async () => {
    if (!config.retryable || retryCount >= maxRetries) {
      options.onMaxRetriesReached?.();
      return;
    }
    
    setIsRetrying(true);
    
    const delay = calculateRetryDelay(statusCode, retryCount + 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      const result = await asyncFn();
      setRetryCount(0);
      setIsRetrying(false);
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      setRetryCount(prev => prev + 1);
      setIsRetrying(false);
      options.onError?.(error as Error);
      throw error;
    }
  }, [asyncFn, statusCode, retryCount, maxRetries, config.retryable, options]);
  
  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);
  
  return {
    retry,
    reset,
    isRetrying,
    retryCount,
    maxRetries,
    canRetry: config.retryable && retryCount < maxRetries,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 REACT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface StatusCodeIndicatorProps {
  statusCode: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Status code görsel göstergesi
 */
export function StatusCodeIndicator({ 
  statusCode, 
  showLabel = true,
  size = 'md',
  className = '' 
}: StatusCodeIndicatorProps) {
  const category = getStatusCategory(statusCode);
  
  const colors: Record<StatusCodeCategory, string> = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    redirect: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    client_error: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    server_error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    network: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };
  
  const sizes: Record<string, string> = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };
  
  const labels: Record<StatusCodeCategory, string> = {
    success: 'Başarılı',
    redirect: 'Yönlendirme',
    client_error: 'İstemci Hatası',
    server_error: 'Sunucu Hatası',
    network: 'Ağ Hatası',
  };
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${colors[category]} ${sizes[size]} ${className}`}>
      <span>{statusCode}</span>
      {showLabel && <span className="hidden sm:inline">- {labels[category]}</span>}
    </span>
  );
}

interface RateLimitWarningProps {
  remaining: number;
  total: number;
  resetTime?: number;
  className?: string;
}

/**
 * Rate limit uyarı komponenti
 */
export function RateLimitWarning({ 
  remaining, 
  total, 
  resetTime,
  className = '' 
}: RateLimitWarningProps) {
  const percentage = (remaining / total) * 100;
  const isLow = percentage < 20;
  const isCritical = percentage < 5;
  
  if (percentage > 50) return null;
  
  return (
    <div 
      className={`
        p-3 rounded-lg border
        ${isCritical 
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
          : isLow 
            ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
            : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
        }
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{isCritical ? '⚠️' : isLow ? '⏳' : 'ℹ️'}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {isCritical 
              ? 'İstek limiti kritik seviyede!' 
              : isLow 
                ? 'İstek limiti azalıyor' 
                : 'İstek limiti bilgisi'
            }
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Kalan: {remaining}/{total} istek
            {resetTime && ` • Yenilenme: ${Math.ceil(resetTime / 60)} dakika`}
          </p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface RetryCountdownProps {
  retryAfter: number;
  onRetry?: () => void;
  className?: string;
}

/**
 * Retry countdown komponenti
 */
export function RetryCountdown({ retryAfter, onRetry, className = '' }: RetryCountdownProps) {
  const [countdown, setCountdown] = useState(retryAfter);
  
  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onRetry?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [countdown, onRetry]);
  
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  
  return (
    <div className={`text-center p-4 rounded-lg bg-gray-100 dark:bg-gray-800 ${className}`}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Yeniden deneme için bekleyin
      </p>
      <div className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      {countdown === 0 && onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Şimdi Dene
        </button>
      )}
    </div>
  );
}
