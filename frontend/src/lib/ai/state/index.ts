/**
 * AI State Management - Barrel Export
 */

// Request State (Framework-agnostic primitives)
export {
  type RequestStatus,
  type RequestState,
  type RequestError,
  type RequestMetadata,
  type ConcurrentRequestManager,
  type RequestQueueItem,
  type CacheEntry,
  type CacheConfig,
  type PersistConfig,
  // State factories
  createInitialRequestState,
  createLoadingState,
  createSuccessState,
  createErrorState,
  createRetryState,
  // Predicates
  isIdle,
  isLoading,
  isSuccess,
  isError,
  isSettled,
  canRetry,
  // Cache utilities
  generateCacheKey,
  isCacheValid,
  createCacheEntry,
  // Persistence
  persistState,
  loadPersistedState,
  clearPersistedState,
  // Aggregation
  getAggregatedStatus,
  getErrors,
  getSuccessData,
  // Timing
  getRequestDuration,
  isSlowRequest,
} from './requestState';

// Request Store (Zustand)
export {
  type AIRequestStoreState,
  useAIRequestStore,
  useAIRequest as useAIRequestState, // Renamed to avoid conflict with hook
  useIsAnyAILoading,
  useAIErrors,
  useActiveRequestCount,
  subscribeToRequest,
  subscribeToLoading,
} from './requestStore';

// Cache Store (Zustand)
export {
  type AICacheStoreState,
  type CacheStats,
  type CacheOptions,
  useAICacheStore,
  useAICached,
  useAICacheStats,
  useAICacheConfig,
  hintCacheKey,
  explanationCacheKey,
  quotaCacheKey,
} from './cacheStore';
