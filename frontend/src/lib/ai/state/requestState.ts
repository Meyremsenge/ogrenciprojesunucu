/**
 * AI Request State Management
 * 
 * Profesyonel AI request lifecycle yönetimi.
 * 
 * ÖZELLİKLER:
 * ===========
 * 1. Request Lifecycle: idle → loading → success/error
 * 2. Eş zamanlı çoklu istek yönetimi
 * 3. Sayfa yenilenme davranışı (persist/non-persist)
 * 4. Intelligent caching
 * 5. Framework-agnostic tasarım
 */

// =============================================================================
// REQUEST STATUS TYPES
// =============================================================================

/**
 * Request Lifecycle Status
 */
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Single Request State
 */
export interface RequestState<T = unknown> {
  /** Unique request identifier */
  id: string;
  /** Current status */
  status: RequestStatus;
  /** Response data (when success) */
  data: T | null;
  /** Error information (when error) */
  error: RequestError | null;
  /** Request start timestamp */
  startedAt: number | null;
  /** Request completion timestamp */
  completedAt: number | null;
  /** Number of retry attempts */
  retryCount: number;
  /** Is this request stale (needs refresh) */
  isStale: boolean;
  /** Request metadata */
  metadata?: RequestMetadata;
}

export interface RequestError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  retryAfter?: number;
}

export interface RequestMetadata {
  feature?: string;
  context?: Record<string, unknown>;
  cacheKey?: string;
  priority?: 'low' | 'normal' | 'high';
  source?: 'user' | 'prefetch' | 'retry';
}

// =============================================================================
// CONCURRENT REQUEST MANAGER
// =============================================================================

/**
 * Manages multiple concurrent AI requests
 */
export interface ConcurrentRequestManager {
  /** All active requests by ID */
  requests: Map<string, RequestState>;
  /** Request queue for rate limiting */
  queue: RequestQueueItem[];
  /** Currently executing request count */
  activeCount: number;
  /** Maximum concurrent requests */
  maxConcurrent: number;
  /** Global loading state (any request loading) */
  isAnyLoading: boolean;
  /** All requests completed successfully */
  isAllSuccess: boolean;
  /** Any request has error */
  hasAnyError: boolean;
}

export interface RequestQueueItem {
  id: string;
  priority: 'low' | 'normal' | 'high';
  addedAt: number;
  execute: () => Promise<void>;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  lastAccessedAt: number;
  tags: string[];
}

export interface CacheConfig {
  /** Enable caching */
  enabled: boolean;
  /** Default TTL in milliseconds */
  defaultTTL: number;
  /** Maximum cache entries */
  maxEntries: number;
  /** Persist cache to localStorage */
  persist: boolean;
  /** Cache key prefix */
  prefix: string;
}

// =============================================================================
// STATE FACTORY - Framework Agnostic
// =============================================================================

/**
 * Creates initial request state
 */
export function createInitialRequestState<T>(id: string): RequestState<T> {
  return {
    id,
    status: 'idle',
    data: null,
    error: null,
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    isStale: false,
  };
}

/**
 * Creates loading state
 */
export function createLoadingState<T>(
  prevState: RequestState<T>,
  metadata?: RequestMetadata
): RequestState<T> {
  return {
    ...prevState,
    status: 'loading',
    error: null,
    startedAt: Date.now(),
    completedAt: null,
    metadata: { ...prevState.metadata, ...metadata },
  };
}

/**
 * Creates success state
 */
export function createSuccessState<T>(
  prevState: RequestState<T>,
  data: T
): RequestState<T> {
  return {
    ...prevState,
    status: 'success',
    data,
    error: null,
    completedAt: Date.now(),
    isStale: false,
  };
}

/**
 * Creates error state
 */
export function createErrorState<T>(
  prevState: RequestState<T>,
  error: RequestError
): RequestState<T> {
  return {
    ...prevState,
    status: 'error',
    error,
    completedAt: Date.now(),
  };
}

/**
 * Creates retry state
 */
export function createRetryState<T>(
  prevState: RequestState<T>
): RequestState<T> {
  return {
    ...prevState,
    status: 'loading',
    retryCount: prevState.retryCount + 1,
    startedAt: Date.now(),
    completedAt: null,
  };
}

// =============================================================================
// STATE PREDICATES
// =============================================================================

export function isIdle<T>(state: RequestState<T>): boolean {
  return state.status === 'idle';
}

export function isLoading<T>(state: RequestState<T>): boolean {
  return state.status === 'loading';
}

export function isSuccess<T>(state: RequestState<T>): boolean {
  return state.status === 'success';
}

export function isError<T>(state: RequestState<T>): boolean {
  return state.status === 'error';
}

export function isSettled<T>(state: RequestState<T>): boolean {
  return state.status === 'success' || state.status === 'error';
}

export function canRetry<T>(state: RequestState<T>, maxRetries: number = 3): boolean {
  return (
    state.status === 'error' &&
    state.error?.retryable === true &&
    state.retryCount < maxRetries
  );
}

// =============================================================================
// CACHE UTILITIES
// =============================================================================

/**
 * Generate cache key from request parameters
 */
export function generateCacheKey(
  feature: string,
  params: Record<string, unknown>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, unknown>);
  
  return `ai:${feature}:${JSON.stringify(sortedParams)}`;
}

/**
 * Check if cache entry is valid
 */
export function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() < entry.expiresAt;
}

/**
 * Create cache entry
 */
export function createCacheEntry<T>(
  key: string,
  data: T,
  ttl: number,
  tags: string[] = []
): CacheEntry<T> {
  const now = Date.now();
  return {
    key,
    data,
    createdAt: now,
    expiresAt: now + ttl,
    hitCount: 0,
    lastAccessedAt: now,
    tags,
  };
}

// =============================================================================
// PERSISTENCE HELPERS
// =============================================================================

export interface PersistConfig {
  /** Storage key */
  key: string;
  /** What to persist */
  include: ('cache' | 'settings' | 'quota')[];
  /** Storage type */
  storage: 'localStorage' | 'sessionStorage' | 'memory';
  /** Serialize function */
  serialize?: (data: unknown) => string;
  /** Deserialize function */
  deserialize?: (data: string) => unknown;
}

const DEFAULT_PERSIST_CONFIG: PersistConfig = {
  key: 'ai-request-state',
  include: ['cache', 'settings'],
  storage: 'localStorage',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
};

/**
 * Save state to storage
 */
export function persistState(
  state: unknown,
  config: Partial<PersistConfig> = {}
): void {
  const finalConfig = { ...DEFAULT_PERSIST_CONFIG, ...config };
  
  try {
    const serialized = finalConfig.serialize!(state);
    
    switch (finalConfig.storage) {
      case 'localStorage':
        localStorage.setItem(finalConfig.key, serialized);
        break;
      case 'sessionStorage':
        sessionStorage.setItem(finalConfig.key, serialized);
        break;
      case 'memory':
        // In-memory storage handled elsewhere
        break;
    }
  } catch (error) {
    console.warn('[AI State] Failed to persist state:', error);
  }
}

/**
 * Load state from storage
 */
export function loadPersistedState<T>(
  config: Partial<PersistConfig> = {}
): T | null {
  const finalConfig = { ...DEFAULT_PERSIST_CONFIG, ...config };
  
  try {
    let serialized: string | null = null;
    
    switch (finalConfig.storage) {
      case 'localStorage':
        serialized = localStorage.getItem(finalConfig.key);
        break;
      case 'sessionStorage':
        serialized = sessionStorage.getItem(finalConfig.key);
        break;
      case 'memory':
        return null;
    }
    
    if (!serialized) return null;
    return finalConfig.deserialize!(serialized) as T;
  } catch (error) {
    console.warn('[AI State] Failed to load persisted state:', error);
    return null;
  }
}

/**
 * Clear persisted state
 */
export function clearPersistedState(
  config: Partial<PersistConfig> = {}
): void {
  const finalConfig = { ...DEFAULT_PERSIST_CONFIG, ...config };
  
  try {
    switch (finalConfig.storage) {
      case 'localStorage':
        localStorage.removeItem(finalConfig.key);
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(finalConfig.key);
        break;
    }
  } catch (error) {
    console.warn('[AI State] Failed to clear persisted state:', error);
  }
}

// =============================================================================
// AGGREGATION UTILITIES
// =============================================================================

/**
 * Get aggregated status from multiple requests
 */
export function getAggregatedStatus(
  requests: RequestState[]
): RequestStatus {
  if (requests.length === 0) return 'idle';
  
  // Any loading = loading
  if (requests.some(r => r.status === 'loading')) return 'loading';
  
  // Any error = error
  if (requests.some(r => r.status === 'error')) return 'error';
  
  // All success = success
  if (requests.every(r => r.status === 'success')) return 'success';
  
  // Otherwise idle
  return 'idle';
}

/**
 * Get all errors from requests
 */
export function getErrors(requests: RequestState[]): RequestError[] {
  return requests
    .filter(r => r.status === 'error' && r.error)
    .map(r => r.error!);
}

/**
 * Get all successful data from requests
 */
export function getSuccessData<T>(requests: RequestState<T>[]): T[] {
  return requests
    .filter(r => r.status === 'success' && r.data !== null)
    .map(r => r.data!);
}

// =============================================================================
// TIMING UTILITIES
// =============================================================================

/**
 * Calculate request duration
 */
export function getRequestDuration<T>(state: RequestState<T>): number | null {
  if (!state.startedAt) return null;
  const endTime = state.completedAt || Date.now();
  return endTime - state.startedAt;
}

/**
 * Check if request is taking too long
 */
export function isSlowRequest<T>(
  state: RequestState<T>,
  threshold: number = 5000
): boolean {
  if (state.status !== 'loading') return false;
  const duration = getRequestDuration(state);
  return duration !== null && duration > threshold;
}
