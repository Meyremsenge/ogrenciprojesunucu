/**
 * useAIRequest Hook - Professional AI Request Management
 * 
 * AI istekleri için tam lifecycle yönetimi sağlayan hook.
 * 
 * KULLANIM:
 * =========
 * ```tsx
 * const { execute, data, status, error, cancel, retry } = useAIRequest({
 *   requestId: 'hint-123',
 *   onSuccess: (data) => console.log('Success:', data),
 *   onError: (error) => console.log('Error:', error),
 *   cache: { enabled: true, ttl: 60000 },
 * });
 * 
 * // Execute request
 * await execute(() => api.getHint(questionId, level));
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAIRequestStore } from '../state/requestStore';
import { useAICacheStore } from '../state/cacheStore';
import type { RequestState, RequestError, RequestStatus } from '../state/requestState';

// =============================================================================
// TYPES
// =============================================================================

export interface UseAIRequestOptions<T> {
  /** Unique request identifier */
  requestId: string;
  /** Initial data (for SSR/hydration) */
  initialData?: T;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: RequestError) => void;
  /** Callback on settle (success or error) */
  onSettled?: (data: T | null, error: RequestError | null) => void;
  /** Cache configuration */
  cache?: {
    enabled: boolean;
    key?: string;
    ttl?: number;
    tags?: string[];
    staleWhileRevalidate?: boolean;
  };
  /** Retry configuration */
  retry?: {
    enabled: boolean;
    maxRetries?: number;
    retryDelay?: number | ((attempt: number) => number);
  };
  /** Auto-cancel on unmount */
  cancelOnUnmount?: boolean;
  /** Request metadata */
  metadata?: Record<string, unknown>;
}

export interface UseAIRequestReturn<T> {
  /** Current status */
  status: RequestStatus;
  /** Response data */
  data: T | null;
  /** Error info */
  error: RequestError | null;
  /** Is loading */
  isLoading: boolean;
  /** Is idle */
  isIdle: boolean;
  /** Is success */
  isSuccess: boolean;
  /** Is error */
  isError: boolean;
  /** Is fetching (loading or refetching) */
  isFetching: boolean;
  /** Has been fetched at least once */
  isFetched: boolean;
  /** Execute the request */
  execute: (fetcher: () => Promise<T>) => Promise<T | null>;
  /** Cancel the request */
  cancel: () => void;
  /** Retry failed request */
  retry: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Refetch with last fetcher */
  refetch: () => Promise<T | null>;
  /** Request duration in ms */
  duration: number | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAIRequest<T = unknown>(
  options: UseAIRequestOptions<T>
): UseAIRequestReturn<T> {
  const {
    requestId,
    initialData,
    onSuccess,
    onError,
    onSettled,
    cache,
    retry: retryConfig,
    cancelOnUnmount = true,
    metadata,
  } = options;
  
  // Store hooks
  const requestStore = useAIRequestStore();
  const cacheStore = useAICacheStore();
  
  // Local state for computed values
  const [isFetched, setIsFetched] = useState(false);
  
  // Refs
  const lastFetcherRef = useRef<(() => Promise<T>) | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  
  // Get current request state from store
  const requestState = requestStore.getRequest<T>(requestId);
  
  // Derived state
  const status = requestState?.status ?? 'idle';
  const data = requestState?.data ?? initialData ?? null;
  const error = requestState?.error ?? null;
  const isLoading = status === 'loading';
  const isIdle = status === 'idle';
  const isSuccess = status === 'success';
  const isError = status === 'error';
  const isFetching = isLoading;
  const duration = requestState?.startedAt && requestState?.completedAt
    ? requestState.completedAt - requestState.startedAt
    : null;
  
  // =========================================================================
  // EXECUTE
  // =========================================================================
  
  const execute = useCallback(async (fetcher: () => Promise<T>): Promise<T | null> => {
    lastFetcherRef.current = fetcher;
    
    // Check cache first
    if (cache?.enabled && cache.key) {
      const cached = cacheStore.get<T>(cache.key);
      if (cached !== null) {
        // Update store with cached data
        requestStore.setSuccess(requestId, cached);
        onSuccess?.(cached);
        onSettled?.(cached, null);
        setIsFetched(true);
        return cached;
      }
    }
    
    // Create abort controller
    const abortController = new AbortController();
    requestStore.registerAbortController(requestId, abortController);
    
    // Start request
    requestStore.startRequest<T>(requestId, {
      feature: metadata?.feature as string,
      context: metadata,
    });
    
    try {
      const result = await fetcher();
      
      if (!mountedRef.current) return null;
      
      // Update store with success
      requestStore.setSuccess(requestId, result);
      
      // Cache result
      if (cache?.enabled && cache.key) {
        cacheStore.set(cache.key, result, cache.ttl, cache.tags);
      }
      
      // Callbacks
      onSuccess?.(result);
      onSettled?.(result, null);
      setIsFetched(true);
      retryCountRef.current = 0;
      
      return result;
      
    } catch (err) {
      if (!mountedRef.current) return null;
      
      const requestError: RequestError = {
        code: (err as any)?.code || 'UNKNOWN_ERROR',
        message: (err as any)?.message || 'An error occurred',
        userMessage: (err as any)?.userMessage || 'Bir hata oluştu. Lütfen tekrar deneyin.',
        retryable: (err as any)?.retryable ?? true,
        retryAfter: (err as any)?.retryAfter,
      };
      
      // Handle abort
      if ((err as any)?.name === 'AbortError') {
        requestError.code = 'CANCELLED';
        requestError.message = 'Request cancelled';
        requestError.userMessage = 'İstek iptal edildi.';
        requestError.retryable = false;
      }
      
      // Update store with error
      requestStore.setError(requestId, requestError);
      
      // Auto-retry if enabled
      if (
        retryConfig?.enabled &&
        requestError.retryable &&
        retryCountRef.current < (retryConfig.maxRetries ?? 3)
      ) {
        retryCountRef.current++;
        
        const delay = typeof retryConfig.retryDelay === 'function'
          ? retryConfig.retryDelay(retryCountRef.current)
          : retryConfig.retryDelay ?? 1000 * retryCountRef.current;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (mountedRef.current && lastFetcherRef.current) {
          return execute(lastFetcherRef.current);
        }
      }
      
      // Callbacks
      onError?.(requestError);
      onSettled?.(null, requestError);
      setIsFetched(true);
      
      return null;
    }
  }, [requestId, cache, metadata, onSuccess, onError, onSettled, retryConfig, requestStore, cacheStore]);
  
  // =========================================================================
  // CANCEL
  // =========================================================================
  
  const cancel = useCallback(() => {
    requestStore.cancel(requestId);
  }, [requestId, requestStore]);
  
  // =========================================================================
  // RETRY
  // =========================================================================
  
  const retry = useCallback(() => {
    if (lastFetcherRef.current && isError) {
      retryCountRef.current = 0;
      execute(lastFetcherRef.current);
    }
  }, [isError, execute]);
  
  // =========================================================================
  // RESET
  // =========================================================================
  
  const reset = useCallback(() => {
    requestStore.removeRequest(requestId);
    setIsFetched(false);
    retryCountRef.current = 0;
    lastFetcherRef.current = null;
  }, [requestId, requestStore]);
  
  // =========================================================================
  // REFETCH
  // =========================================================================
  
  const refetch = useCallback(async (): Promise<T | null> => {
    if (!lastFetcherRef.current) return null;
    
    // Invalidate cache
    if (cache?.enabled && cache.key) {
      cacheStore.invalidate(cache.key);
    }
    
    return execute(lastFetcherRef.current);
  }, [cache, execute, cacheStore]);
  
  // =========================================================================
  // EFFECTS
  // =========================================================================
  
  // Track mount status
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (cancelOnUnmount && isLoading) {
        requestStore.cancel(requestId);
      }
    };
  }, [cancelOnUnmount, isLoading, requestId, requestStore]);
  
  // =========================================================================
  // RETURN
  // =========================================================================
  
  return {
    status,
    data,
    error,
    isLoading,
    isIdle,
    isSuccess,
    isError,
    isFetching,
    isFetched,
    execute,
    cancel,
    retry,
    reset,
    refetch,
    duration,
  };
}

// =============================================================================
// BATCH REQUEST HOOK
// =============================================================================

export interface UseBatchAIRequestOptions<T> {
  requests: Array<{
    id: string;
    fetcher: () => Promise<T>;
    cache?: { key: string; ttl?: number };
  }>;
  parallel?: boolean;
  onAllSuccess?: (results: T[]) => void;
  onAnyError?: (errors: RequestError[]) => void;
}

export function useBatchAIRequest<T>(options: UseBatchAIRequestOptions<T>) {
  const { requests, parallel = true, onAllSuccess, onAnyError } = options;
  const requestStore = useAIRequestStore();
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<(T | null)[]>([]);
  const [errors, setErrors] = useState<(RequestError | null)[]>([]);
  
  const execute = useCallback(async () => {
    setIsExecuting(true);
    setResults([]);
    setErrors([]);
    
    const executeOne = async (req: typeof requests[0], index: number) => {
      try {
        requestStore.startRequest(req.id);
        const result = await req.fetcher();
        requestStore.setSuccess(req.id, result);
        return { index, result, error: null };
      } catch (err) {
        const error: RequestError = {
          code: (err as any)?.code || 'UNKNOWN_ERROR',
          message: (err as any)?.message || 'Error',
          userMessage: 'Hata oluştu',
          retryable: true,
        };
        requestStore.setError(req.id, error);
        return { index, result: null, error };
      }
    };
    
    let outcomes: { index: number; result: T | null; error: RequestError | null }[];
    
    if (parallel) {
      outcomes = await Promise.all(requests.map((req, i) => executeOne(req, i)));
    } else {
      outcomes = [];
      for (let i = 0; i < requests.length; i++) {
        outcomes.push(await executeOne(requests[i], i));
      }
    }
    
    const newResults = outcomes.map(o => o.result);
    const newErrors = outcomes.map(o => o.error);
    
    setResults(newResults);
    setErrors(newErrors);
    setIsExecuting(false);
    
    const allSucceeded = newErrors.every(e => e === null);
    const hasErrors = newErrors.some(e => e !== null);
    
    if (allSucceeded && onAllSuccess) {
      onAllSuccess(newResults as T[]);
    }
    
    if (hasErrors && onAnyError) {
      onAnyError(newErrors.filter(Boolean) as RequestError[]);
    }
    
    return outcomes;
  }, [requests, parallel, onAllSuccess, onAnyError, requestStore]);
  
  const cancelAll = useCallback(() => {
    requests.forEach(req => requestStore.cancel(req.id));
  }, [requests, requestStore]);
  
  return {
    execute,
    cancelAll,
    isExecuting,
    results,
    errors,
    isAllSuccess: results.length === requests.length && errors.every(e => e === null),
    hasAnyError: errors.some(e => e !== null),
  };
}
