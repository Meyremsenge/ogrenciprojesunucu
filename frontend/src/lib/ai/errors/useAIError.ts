/**
 * useAIError Hook
 * 
 * React hook for managing AI errors.
 * Provides error handling, display, and recovery.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { AIError, AIErrorCode, AIErrorCategory } from './types';
import { 
  createAIError, 
  parseError, 
  getErrorEmoji,
  getErrorTitle,
  getErrorMessage,
  getSuggestedAction,
} from './messages';
import { 
  isQuotaError, 
  isNetworkError, 
  isRetryableError,
  isSevereError,
  AI_ERROR_CODES,
} from './types';
import { useToastStore } from '@/stores/toastStore';
import { createErrorToast } from './AIErrorDisplay';

// =============================================================================
// TYPES
// =============================================================================

export interface UseAIErrorOptions {
  /** Auto-dismiss error after ms (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Show toast on error */
  showToast?: boolean;
  /** Log errors to console */
  logErrors?: boolean;
  /** Error callback */
  onError?: (error: AIError) => void;
  /** Recovery callback (after retry/dismiss) */
  onRecover?: () => void;
  /** Max retry attempts */
  maxRetries?: number;
}

export interface UseAIErrorReturn {
  /** Current error */
  error: AIError | null;
  /** Is there an error */
  hasError: boolean;
  /** Error helpers */
  isQuotaError: boolean;
  isNetworkError: boolean;
  isRetryable: boolean;
  isSevere: boolean;
  /** Retry count */
  retryCount: number;
  /** Can retry (under limit) */
  canRetry: boolean;
  /** Set error from any source */
  setError: (error: unknown) => AIError;
  /** Set error by code */
  setErrorByCode: (code: AIErrorCode, message?: string) => AIError;
  /** Clear error */
  clearError: () => void;
  /** Retry last action */
  retry: () => void;
  /** Dismiss error */
  dismiss: () => void;
  /** Error display helpers */
  getEmoji: () => string;
  getTitle: () => string;
  getMessage: () => string;
  getAction: () => string | undefined;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAIError(options: UseAIErrorOptions = {}): UseAIErrorReturn {
  const {
    autoDismiss = 0,
    showToast = false,
    logErrors = true,
    onError,
    onRecover,
    maxRetries = 3,
  } = options;
  
  const [error, setErrorState] = useState<AIError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const autoDismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionRef = useRef<(() => void) | null>(null);
  
  const toast = useToastStore();
  
  // Clear auto-dismiss timeout
  useEffect(() => {
    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    };
  }, []);
  
  // Auto-dismiss effect
  useEffect(() => {
    if (error && autoDismiss > 0) {
      autoDismissTimeoutRef.current = setTimeout(() => {
        setErrorState(null);
        onRecover?.();
      }, autoDismiss);
      
      return () => {
        if (autoDismissTimeoutRef.current) {
          clearTimeout(autoDismissTimeoutRef.current);
        }
      };
    }
  }, [error, autoDismiss, onRecover]);
  
  // Set error from any source
  const setError = useCallback((rawError: unknown): AIError => {
    const aiError = parseError(rawError);
    
    // Log
    if (logErrors) {
      console.error('[AI Error]', aiError.code, aiError.technicalMessage);
    }
    
    // Set state
    setErrorState(aiError);
    
    // Show toast if enabled
    if (showToast) {
      const toastConfig = createErrorToast({
        error: aiError,
        onRetry: aiError.retryable ? () => {
          lastActionRef.current?.();
        } : undefined,
      });
      toast.addToast(toastConfig);
    }
    
    // Callback
    onError?.(aiError);
    
    return aiError;
  }, [logErrors, showToast, toast, onError]);
  
  // Set error by code
  const setErrorByCode = useCallback((code: AIErrorCode, message?: string): AIError => {
    const aiError = createAIError(code, message || 'Error occurred');
    return setError(aiError);
  }, [setError]);
  
  // Clear error
  const clearError = useCallback(() => {
    setErrorState(null);
    setRetryCount(0);
    onRecover?.();
  }, [onRecover]);
  
  // Retry
  const retry = useCallback(() => {
    if (retryCount >= maxRetries) {
      console.warn('[AI Error] Max retries reached');
      return;
    }
    
    setRetryCount((prev) => prev + 1);
    setErrorState(null);
    lastActionRef.current?.();
  }, [retryCount, maxRetries]);
  
  // Dismiss
  const dismiss = useCallback(() => {
    setErrorState(null);
    onRecover?.();
  }, [onRecover]);
  
  // Computed values
  const hasError = error !== null;
  const isQuota = error ? isQuotaError(error) : false;
  const isNetwork = error ? isNetworkError(error) : false;
  const isRetryable = error ? isRetryableError(error) : false;
  const isSevere = error ? isSevereError(error) : false;
  const canRetry = isRetryable && retryCount < maxRetries;
  
  // Display helpers
  const getEmoji = useCallback(() => 
    error ? getErrorEmoji(error.code) : '', [error]);
  
  const getTitle = useCallback(() => 
    error ? getErrorTitle(error) : '', [error]);
  
  const getMessage = useCallback(() => 
    error ? getErrorMessage(error) : '', [error]);
  
  const getAction = useCallback(() => 
    error ? getSuggestedAction(error) : undefined, [error]);
  
  return {
    error,
    hasError,
    isQuotaError: isQuota,
    isNetworkError: isNetwork,
    isRetryable,
    isSevere,
    retryCount,
    canRetry,
    setError,
    setErrorByCode,
    clearError,
    retry,
    dismiss,
    getEmoji,
    getTitle,
    getMessage,
    getAction,
  };
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for quota-specific error handling
 */
export function useQuotaError() {
  const {
    error,
    setError,
    clearError,
    hasError,
    getMessage,
    getAction,
  } = useAIError({
    showToast: true,
    autoDismiss: 0, // Don't auto-dismiss quota errors
  });
  
  const isExhausted = hasError && error?.code === AI_ERROR_CODES.QUOTA_EXCEEDED;
  const isDailyLimit = hasError && error?.code === AI_ERROR_CODES.QUOTA_DAILY_LIMIT;
  const isRateLimited = hasError && error?.code === AI_ERROR_CODES.RATE_LIMITED;
  
  const setQuotaExhausted = useCallback(() => {
    setError(createAIError(AI_ERROR_CODES.QUOTA_EXCEEDED, 'Quota exhausted'));
  }, [setError]);
  
  const setDailyLimitReached = useCallback(() => {
    setError(createAIError(AI_ERROR_CODES.QUOTA_DAILY_LIMIT, 'Daily limit reached'));
  }, [setError]);
  
  const setRateLimited = useCallback((retryAfter?: number) => {
    const error = createAIError(AI_ERROR_CODES.RATE_LIMITED, 'Rate limited');
    if (retryAfter) {
      error.retryAfter = retryAfter;
    }
    setError(error);
  }, [setError]);
  
  return {
    error,
    hasError,
    isExhausted,
    isDailyLimit,
    isRateLimited,
    setQuotaExhausted,
    setDailyLimitReached,
    setRateLimited,
    clearError,
    getMessage,
    getAction,
  };
}

/**
 * Hook for network error handling with auto-retry
 */
export function useNetworkError(options?: { maxRetries?: number; retryDelay?: number }) {
  const { maxRetries = 3, retryDelay = 3000 } = options || {};
  const [isRetrying, setIsRetrying] = useState(false);
  
  const {
    error,
    hasError,
    retryCount,
    canRetry,
    setError,
    clearError,
  } = useAIError({ maxRetries });
  
  // Auto-retry with delay
  const retryWithDelay = useCallback(async (action: () => Promise<void>) => {
    if (!canRetry) return false;
    
    setIsRetrying(true);
    clearError();
    
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    
    try {
      await action();
      setIsRetrying(false);
      return true;
    } catch (err) {
      setError(err);
      setIsRetrying(false);
      return false;
    }
  }, [canRetry, clearError, retryDelay, setError]);
  
  return {
    error,
    hasError,
    isRetrying,
    retryCount,
    canRetry,
    setError,
    clearError,
    retryWithDelay,
  };
}

// =============================================================================
// ERROR WRAPPER
// =============================================================================

/**
 * Wrap an async function with error handling
 */
export function createErrorHandler(errorHook: UseAIErrorReturn) {
  return async function handleWithError<T>(
    action: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: AIError) => void;
      fallback?: T;
    }
  ): Promise<T | undefined> {
    try {
      const result = await action();
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = errorHook.setError(err);
      options?.onError?.(error);
      return options?.fallback;
    }
  };
}

export default useAIError;
