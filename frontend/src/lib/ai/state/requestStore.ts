/**
 * AI Request Store - Concurrent Request Management
 * 
 * Birden fazla eş zamanlı AI isteğini yöneten Zustand store.
 * 
 * ÖZELLİKLER:
 * ===========
 * 1. Request lifecycle yönetimi (idle → loading → success/error)
 * 2. Eş zamanlı istek takibi
 * 3. Request queue ve priority
 * 4. Abort/cancel desteği
 * 5. Retry mekanizması
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  type RequestState,
  type RequestStatus,
  type RequestError,
  type RequestMetadata,
  createInitialRequestState,
  createLoadingState,
  createSuccessState,
  createErrorState,
  createRetryState,
  getAggregatedStatus,
  isLoading,
  canRetry,
} from './requestState';

// =============================================================================
// STORE TYPES
// =============================================================================

export interface AIRequestStoreState {
  /** All requests by ID */
  requests: Record<string, RequestState>;
  /** Active request IDs in order */
  activeRequestIds: string[];
  /** Abort controllers for cancellation */
  abortControllers: Record<string, AbortController>;
  /** Maximum concurrent requests */
  maxConcurrent: number;
  /** Default retry count */
  maxRetries: number;
  
  // Computed getters
  /** Get request by ID */
  getRequest: <T = unknown>(id: string) => RequestState<T> | null;
  /** Get all active requests */
  getActiveRequests: () => RequestState[];
  /** Get aggregated status */
  getAggregatedStatus: () => RequestStatus;
  /** Check if any request is loading */
  isAnyLoading: () => boolean;
  /** Check if all requests succeeded */
  isAllSuccess: () => boolean;
  /** Get all errors */
  getAllErrors: () => RequestError[];
  /** Get active request count */
  getActiveCount: () => number;
  
  // Actions
  /** Start a new request */
  startRequest: <T = unknown>(id: string, metadata?: RequestMetadata) => RequestState<T>;
  /** Mark request as success */
  setSuccess: <T = unknown>(id: string, data: T) => void;
  /** Mark request as error */
  setError: (id: string, error: RequestError) => void;
  /** Retry a failed request */
  retry: (id: string) => boolean;
  /** Cancel a request */
  cancel: (id: string) => void;
  /** Cancel all requests */
  cancelAll: () => void;
  /** Remove a request from tracking */
  removeRequest: (id: string) => void;
  /** Clear all completed requests */
  clearCompleted: () => void;
  /** Reset store */
  reset: () => void;
  /** Register abort controller */
  registerAbortController: (id: string, controller: AbortController) => void;
  /** Get abort signal for request */
  getAbortSignal: (id: string) => AbortSignal | undefined;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const INITIAL_STATE = {
  requests: {},
  activeRequestIds: [],
  abortControllers: {},
  maxConcurrent: 5,
  maxRetries: 3,
};

// =============================================================================
// STORE
// =============================================================================

export const useAIRequestStore = create<AIRequestStoreState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...INITIAL_STATE,
      
      // =========================================================================
      // GETTERS
      // =========================================================================
      
      getRequest: <T = unknown>(id: string): RequestState<T> | null => {
        return (get().requests[id] as RequestState<T>) || null;
      },
      
      getActiveRequests: () => {
        const { requests, activeRequestIds } = get();
        return activeRequestIds
          .map(id => requests[id])
          .filter(Boolean);
      },
      
      getAggregatedStatus: () => {
        return getAggregatedStatus(get().getActiveRequests());
      },
      
      isAnyLoading: () => {
        return Object.values(get().requests).some(isLoading);
      },
      
      isAllSuccess: () => {
        const requests = Object.values(get().requests);
        return requests.length > 0 && requests.every(r => r.status === 'success');
      },
      
      getAllErrors: () => {
        return Object.values(get().requests)
          .filter(r => r.status === 'error' && r.error)
          .map(r => r.error!);
      },
      
      getActiveCount: () => {
        return Object.values(get().requests).filter(isLoading).length;
      },
      
      // =========================================================================
      // ACTIONS
      // =========================================================================
      
      startRequest: <T = unknown>(id: string, metadata?: RequestMetadata): RequestState<T> => {
        const existingRequest = get().requests[id] as RequestState<T> | undefined;
        
        const newState = existingRequest
          ? createLoadingState(existingRequest, metadata)
          : createLoadingState(createInitialRequestState<T>(id), metadata);
        
        set((state) => ({
          requests: { ...state.requests, [id]: newState },
          activeRequestIds: state.activeRequestIds.includes(id)
            ? state.activeRequestIds
            : [...state.activeRequestIds, id],
        }));
        
        return newState;
      },
      
      setSuccess: <T = unknown>(id: string, data: T) => {
        const request = get().requests[id];
        if (!request) return;
        
        set((state) => ({
          requests: {
            ...state.requests,
            [id]: createSuccessState(request as RequestState<T>, data),
          },
        }));
        
        // Cleanup abort controller
        const { abortControllers } = get();
        if (abortControllers[id]) {
          const newControllers = { ...abortControllers };
          delete newControllers[id];
          set({ abortControllers: newControllers });
        }
      },
      
      setError: (id: string, error: RequestError) => {
        const request = get().requests[id];
        if (!request) return;
        
        set((state) => ({
          requests: {
            ...state.requests,
            [id]: createErrorState(request, error),
          },
        }));
        
        // Cleanup abort controller
        const { abortControllers } = get();
        if (abortControllers[id]) {
          const newControllers = { ...abortControllers };
          delete newControllers[id];
          set({ abortControllers: newControllers });
        }
      },
      
      retry: (id: string): boolean => {
        const { requests, maxRetries } = get();
        const request = requests[id];
        
        if (!request || !canRetry(request, maxRetries)) {
          return false;
        }
        
        set((state) => ({
          requests: {
            ...state.requests,
            [id]: createRetryState(request),
          },
        }));
        
        return true;
      },
      
      cancel: (id: string) => {
        const { abortControllers, requests } = get();
        
        // Abort the request
        if (abortControllers[id]) {
          abortControllers[id].abort();
        }
        
        // Update state
        const request = requests[id];
        if (request && request.status === 'loading') {
          set((state) => ({
            requests: {
              ...state.requests,
              [id]: createErrorState(request, {
                code: 'CANCELLED',
                message: 'Request cancelled by user',
                userMessage: 'İstek iptal edildi.',
                retryable: false,
              }),
            },
            abortControllers: Object.fromEntries(
              Object.entries(state.abortControllers).filter(([key]) => key !== id)
            ),
          }));
        }
      },
      
      cancelAll: () => {
        const { abortControllers, requests } = get();
        
        // Abort all requests
        Object.values(abortControllers).forEach(controller => {
          controller.abort();
        });
        
        // Update all loading requests to cancelled
        const updatedRequests = { ...requests };
        Object.entries(requests).forEach(([id, request]) => {
          if (request.status === 'loading') {
            updatedRequests[id] = createErrorState(request, {
              code: 'CANCELLED',
              message: 'All requests cancelled',
              userMessage: 'Tüm istekler iptal edildi.',
              retryable: false,
            });
          }
        });
        
        set({
          requests: updatedRequests,
          abortControllers: {},
        });
      },
      
      removeRequest: (id: string) => {
        // Cancel if still loading
        get().cancel(id);
        
        set((state) => {
          const newRequests = { ...state.requests };
          delete newRequests[id];
          
          return {
            requests: newRequests,
            activeRequestIds: state.activeRequestIds.filter(rid => rid !== id),
          };
        });
      },
      
      clearCompleted: () => {
        set((state) => {
          const pendingRequests: Record<string, RequestState> = {};
          const pendingIds: string[] = [];
          
          Object.entries(state.requests).forEach(([id, request]) => {
            if (request.status === 'loading') {
              pendingRequests[id] = request;
              pendingIds.push(id);
            }
          });
          
          return {
            requests: pendingRequests,
            activeRequestIds: pendingIds,
          };
        });
      },
      
      reset: () => {
        // Cancel all first
        get().cancelAll();
        set(INITIAL_STATE);
      },
      
      registerAbortController: (id: string, controller: AbortController) => {
        set((state) => ({
          abortControllers: {
            ...state.abortControllers,
            [id]: controller,
          },
        }));
      },
      
      getAbortSignal: (id: string) => {
        return get().abortControllers[id]?.signal;
      },
    })),
    { name: 'AIRequestStore' }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Select a single request by ID
 */
export function useAIRequest<T = unknown>(id: string) {
  return useAIRequestStore((state) => state.requests[id] as RequestState<T> | undefined);
}

/**
 * Select loading state
 */
export function useIsAnyAILoading() {
  return useAIRequestStore((state) => 
    Object.values(state.requests).some(r => r.status === 'loading')
  );
}

/**
 * Select all errors
 */
export function useAIErrors() {
  return useAIRequestStore((state) =>
    Object.values(state.requests)
      .filter(r => r.status === 'error' && r.error)
      .map(r => r.error!)
  );
}

/**
 * Select active request count
 */
export function useActiveRequestCount() {
  return useAIRequestStore((state) =>
    Object.values(state.requests).filter(r => r.status === 'loading').length
  );
}

// =============================================================================
// SUBSCRIPTION HELPERS
// =============================================================================

/**
 * Subscribe to request status changes
 */
export function subscribeToRequest(
  id: string,
  callback: (state: RequestState | undefined) => void
): () => void {
  return useAIRequestStore.subscribe(
    (state) => state.requests[id],
    callback
  );
}

/**
 * Subscribe to loading state changes
 */
export function subscribeToLoading(
  callback: (isLoading: boolean) => void
): () => void {
  return useAIRequestStore.subscribe(
    (state) => Object.values(state.requests).some(r => r.status === 'loading'),
    callback
  );
}
