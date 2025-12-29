/**
 * AI Cache Store - Intelligent Response Caching
 * 
 * AI yanıtlarını akıllı bir şekilde cache'leyen store.
 * 
 * ÖZELLİKLER:
 * ===========
 * 1. TTL-based caching
 * 2. LRU eviction
 * 3. Tag-based invalidation
 * 4. Persistent cache (isteğe bağlı)
 * 5. Cache statistics
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  type CacheEntry,
  type CacheConfig,
  createCacheEntry,
  isCacheValid,
  generateCacheKey,
} from './requestState';

// =============================================================================
// STORE TYPES
// =============================================================================

export interface AICacheStoreState {
  /** Cache entries by key */
  entries: Record<string, CacheEntry>;
  /** Cache configuration */
  config: CacheConfig;
  /** Cache statistics */
  stats: CacheStats;
  
  // Actions
  /** Get cached data */
  get: <T>(key: string) => T | null;
  /** Set cache entry */
  set: <T>(key: string, data: T, ttl?: number, tags?: string[]) => void;
  /** Check if cache exists and is valid */
  has: (key: string) => boolean;
  /** Invalidate by key */
  invalidate: (key: string) => void;
  /** Invalidate by tag */
  invalidateByTag: (tag: string) => void;
  /** Invalidate by prefix */
  invalidateByPrefix: (prefix: string) => void;
  /** Clear all cache */
  clear: () => void;
  /** Prune expired entries */
  prune: () => number;
  /** Update config */
  updateConfig: (config: Partial<CacheConfig>) => void;
  /** Get cache size */
  getSize: () => number;
  /** Get or fetch with cache */
  getOrFetch: <T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ) => Promise<T>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  lastPruneAt: number | null;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  forceRefresh?: boolean;
  staleWhileRevalidate?: boolean;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100,
  persist: true,
  prefix: 'ai-cache',
};

const INITIAL_STATS: CacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0,
  size: 0,
  lastPruneAt: null,
};

// =============================================================================
// STORE
// =============================================================================

export const useAICacheStore = create<AICacheStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        entries: {},
        config: DEFAULT_CACHE_CONFIG,
        stats: INITIAL_STATS,
        
        // =========================================================================
        // GET
        // =========================================================================
        
        get: <T>(key: string): T | null => {
          const { entries, config } = get();
          
          if (!config.enabled) return null;
          
          const entry = entries[key];
          
          if (!entry || !isCacheValid(entry)) {
            set((state) => ({
              stats: { ...state.stats, misses: state.stats.misses + 1 },
            }));
            return null;
          }
          
          // Update hit count and last accessed
          set((state) => ({
            entries: {
              ...state.entries,
              [key]: {
                ...entry,
                hitCount: entry.hitCount + 1,
                lastAccessedAt: Date.now(),
              },
            },
            stats: { ...state.stats, hits: state.stats.hits + 1 },
          }));
          
          return entry.data as T;
        },
        
        // =========================================================================
        // SET
        // =========================================================================
        
        set: <T>(key: string, data: T, ttl?: number, tags: string[] = []) => {
          const { config, entries } = get();
          
          if (!config.enabled) return;
          
          // Check if we need to evict
          const currentSize = Object.keys(entries).length;
          if (currentSize >= config.maxEntries) {
            get().prune();
            
            // If still at max, evict LRU
            const entriesAfterPrune = get().entries;
            if (Object.keys(entriesAfterPrune).length >= config.maxEntries) {
              const lruKey = Object.entries(entriesAfterPrune)
                .sort(([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt)
                [0]?.[0];
              
              if (lruKey) {
                get().invalidate(lruKey);
                set((state) => ({
                  stats: { ...state.stats, evictions: state.stats.evictions + 1 },
                }));
              }
            }
          }
          
          const entry = createCacheEntry(key, data, ttl ?? config.defaultTTL, tags);
          
          set((state) => ({
            entries: { ...state.entries, [key]: entry },
            stats: { ...state.stats, size: Object.keys(state.entries).length + 1 },
          }));
        },
        
        // =========================================================================
        // HAS
        // =========================================================================
        
        has: (key: string): boolean => {
          const { entries, config } = get();
          if (!config.enabled) return false;
          
          const entry = entries[key];
          return entry !== undefined && isCacheValid(entry);
        },
        
        // =========================================================================
        // INVALIDATION
        // =========================================================================
        
        invalidate: (key: string) => {
          set((state) => {
            const newEntries = { ...state.entries };
            delete newEntries[key];
            return {
              entries: newEntries,
              stats: { ...state.stats, size: Object.keys(newEntries).length },
            };
          });
        },
        
        invalidateByTag: (tag: string) => {
          set((state) => {
            const newEntries = { ...state.entries };
            let removed = 0;
            
            Object.entries(newEntries).forEach(([key, entry]) => {
              if (entry.tags.includes(tag)) {
                delete newEntries[key];
                removed++;
              }
            });
            
            return {
              entries: newEntries,
              stats: {
                ...state.stats,
                size: Object.keys(newEntries).length,
                evictions: state.stats.evictions + removed,
              },
            };
          });
        },
        
        invalidateByPrefix: (prefix: string) => {
          set((state) => {
            const newEntries = { ...state.entries };
            let removed = 0;
            
            Object.keys(newEntries).forEach((key) => {
              if (key.startsWith(prefix)) {
                delete newEntries[key];
                removed++;
              }
            });
            
            return {
              entries: newEntries,
              stats: {
                ...state.stats,
                size: Object.keys(newEntries).length,
                evictions: state.stats.evictions + removed,
              },
            };
          });
        },
        
        // =========================================================================
        // CLEAR
        // =========================================================================
        
        clear: () => {
          set({
            entries: {},
            stats: { ...INITIAL_STATS, lastPruneAt: Date.now() },
          });
        },
        
        // =========================================================================
        // PRUNE
        // =========================================================================
        
        prune: (): number => {
          const { entries } = get();
          const now = Date.now();
          let pruned = 0;
          
          const validEntries: Record<string, CacheEntry> = {};
          
          Object.entries(entries).forEach(([key, entry]) => {
            if (isCacheValid(entry)) {
              validEntries[key] = entry;
            } else {
              pruned++;
            }
          });
          
          set((state) => ({
            entries: validEntries,
            stats: {
              ...state.stats,
              size: Object.keys(validEntries).length,
              evictions: state.stats.evictions + pruned,
              lastPruneAt: now,
            },
          }));
          
          return pruned;
        },
        
        // =========================================================================
        // CONFIG
        // =========================================================================
        
        updateConfig: (newConfig: Partial<CacheConfig>) => {
          set((state) => ({
            config: { ...state.config, ...newConfig },
          }));
        },
        
        getSize: (): number => {
          return Object.keys(get().entries).length;
        },
        
        // =========================================================================
        // GET OR FETCH
        // =========================================================================
        
        getOrFetch: async <T>(
          key: string,
          fetcher: () => Promise<T>,
          options: CacheOptions = {}
        ): Promise<T> => {
          const { config } = get();
          
          // Check cache first (unless force refresh)
          if (!options.forceRefresh) {
            const cached = get().get<T>(key);
            if (cached !== null) {
              return cached;
            }
          }
          
          // Fetch new data
          const data = await fetcher();
          
          // Cache the result
          if (config.enabled) {
            get().set(key, data, options.ttl, options.tags);
          }
          
          return data;
        },
      }),
      {
        name: 'ai-cache-store',
        partialize: (state) => ({
          entries: state.entries,
          config: state.config,
          // Don't persist stats
        }),
      }
    ),
    { name: 'AICacheStore' }
  )
);

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Use cached AI data
 */
export function useAICached<T>(key: string): T | null {
  return useAICacheStore((state) => {
    const entry = state.entries[key];
    if (!entry || !isCacheValid(entry)) return null;
    return entry.data as T;
  });
}

/**
 * Use cache statistics
 */
export function useAICacheStats() {
  return useAICacheStore((state) => state.stats);
}

/**
 * Use cache config
 */
export function useAICacheConfig() {
  return useAICacheStore((state) => ({
    config: state.config,
    updateConfig: state.updateConfig,
  }));
}

// =============================================================================
// CACHE KEY GENERATORS
// =============================================================================

export { generateCacheKey };

/**
 * Generate cache key for hint request
 */
export function hintCacheKey(
  questionId: string | number,
  level: number
): string {
  return generateCacheKey('hint', { questionId, level });
}

/**
 * Generate cache key for explanation request
 */
export function explanationCacheKey(
  topic: string,
  level: string = 'detailed'
): string {
  return generateCacheKey('explanation', { topic, level });
}

/**
 * Generate cache key for quota
 */
export function quotaCacheKey(userId?: string): string {
  return generateCacheKey('quota', { userId: userId || 'current' });
}
