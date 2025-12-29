/**
 * AI Store - Zustand State Management
 * 
 * AI durumu için merkezi state yönetimi.
 * 
 * ÖZELLİKLER:
 * ===========
 * 1. Session yönetimi - Aktif AI oturumları
 * 2. Kota takibi - Kullanım limitleri
 * 3. Mesaj geçmişi - Chat history
 * 4. Ayarlar - Kullanıcı tercihleri
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  AIChatMessage,
  AIQuotaStatus,
  AISession,
  AICoachPersona,
  AIFeatureType,
  AIContext,
  AIFeedback,
  UserRole,
} from '@/types/ai';

// =============================================================================
// TYPES
// =============================================================================

interface AIState {
  // Session
  currentSession: AISession | null;
  sessions: AISession[];
  
  // Messages
  messagesBySession: Record<string, AIChatMessage[]>;
  
  // Quota
  quota: AIQuotaStatus | null;
  
  // UI State
  isOpen: boolean;
  activeFeature: AIFeatureType | null;
  currentContext: AIContext | null;
  isLoading: boolean;
  error: string | null;
  
  // Settings
  settings: AISettings;
  
  // Actions
  openAI: (feature: AIFeatureType, context: AIContext) => void;
  closeAI: () => void;
  
  // Session actions
  startSession: (feature: AIFeatureType, context: AIContext) => string;
  endSession: (sessionId: string) => void;
  
  // Message actions
  addMessage: (sessionId: string, message: AIChatMessage) => void;
  clearMessages: (sessionId: string) => void;
  
  // Quota actions
  setQuota: (quota: AIQuotaStatus) => void;
  incrementUsage: () => void;
  
  // Feedback
  submitFeedback: (feedback: AIFeedback) => Promise<void>;
  
  // Settings
  updateSettings: (settings: Partial<AISettings>) => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

interface AISettings {
  showDisclaimer: boolean;
  preferredPersona: 'default' | 'mentor' | 'buddy';
  enableSuggestions: boolean;
  enableFloatingButton: boolean;
  hintLevel: 'basic' | 'detailed' | 'progressive';
}

const DEFAULT_SETTINGS: AISettings = {
  showDisclaimer: true,
  preferredPersona: 'default',
  enableSuggestions: true,
  enableFloatingButton: true,
  hintLevel: 'progressive',
};

// =============================================================================
// STORE
// =============================================================================

export const useAIStore = create<AIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentSession: null,
        sessions: [],
        messagesBySession: {},
        quota: null,
        isOpen: false,
        activeFeature: null,
        currentContext: null,
        isLoading: false,
        error: null,
        settings: DEFAULT_SETTINGS,

        // Open AI panel
        openAI: (feature, context) => {
          const sessionId = get().startSession(feature, context);
          set({
            isOpen: true,
            activeFeature: feature,
            currentContext: context,
          });
        },

        // Close AI panel
        closeAI: () => {
          set({
            isOpen: false,
            activeFeature: null,
            currentContext: null,
          });
        },

        // Start new session
        startSession: (feature, context) => {
          const sessionId = `session-${Date.now()}`;
          const session: AISession = {
            id: sessionId,
            feature,
            context,
            startedAt: new Date(),
            messageCount: 0,
            status: 'active',
          };

          set((state) => ({
            currentSession: session,
            sessions: [session, ...state.sessions].slice(0, 50), // Keep last 50 sessions
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: [],
            },
          }));

          return sessionId;
        },

        // End session
        endSession: (sessionId) => {
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === sessionId
                ? { ...s, status: 'ended' as const, endedAt: new Date() }
                : s
            ),
            currentSession:
              state.currentSession?.id === sessionId
                ? null
                : state.currentSession,
          }));
        },

        // Add message
        addMessage: (sessionId, message) => {
          set((state) => ({
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: [
                ...(state.messagesBySession[sessionId] || []),
                message,
              ],
            },
            sessions: state.sessions.map((s) =>
              s.id === sessionId
                ? { ...s, messageCount: s.messageCount + 1 }
                : s
            ),
          }));
        },

        // Clear messages
        clearMessages: (sessionId) => {
          set((state) => ({
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: [],
            },
          }));
        },

        // Set quota
        setQuota: (quota) => {
          set({ quota });
        },

        // Increment usage
        incrementUsage: () => {
          set((state) => {
            if (!state.quota || state.quota.isUnlimited) return state;
            const currentUsed = state.quota.used ?? state.quota.dailyUsed ?? 0;
            return {
              quota: {
                ...state.quota,
                used: currentUsed + 1,
                dailyUsed: currentUsed + 1,
              },
            };
          });
        },

        // Submit feedback
        submitFeedback: async (feedback) => {
          // TODO: Send to API
          console.log('Feedback submitted:', feedback);
        },

        // Update settings
        updateSettings: (newSettings) => {
          set((state) => ({
            settings: { ...state.settings, ...newSettings },
          }));
        },

        // Set error
        setError: (error) => {
          set({ error });
        },

        // Clear error
        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'ai-store',
        partialize: (state) => ({
          settings: state.settings,
          // Don't persist sessions or messages for privacy
        }),
      }
    ),
    { name: 'AIStore' }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

export const useAISession = () => useAIStore((state) => state.currentSession);
export const useAIMessages = (sessionId?: string) =>
  useAIStore((state) =>
    sessionId ? state.messagesBySession[sessionId] || [] : []
  );
export const useAIQuota = () => useAIStore((state) => state.quota);
export const useAISettings = () => useAIStore((state) => state.settings);
export const useAIIsOpen = () => useAIStore((state) => state.isOpen);
export const useAIActiveFeature = () => useAIStore((state) => state.activeFeature);
export const useAIError = () => useAIStore((state) => state.error);

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Ana AI hook'u - tüm AI işlemleri için
 */
export function useAI() {
  const store = useAIStore();
  
  return {
    // State
    isOpen: store.isOpen,
    isLoading: store.isLoading,
    activeFeature: store.activeFeature,
    currentContext: store.currentContext,
    currentSession: store.currentSession,
    quota: store.quota,
    error: store.error,
    settings: store.settings,
    
    // Actions
    open: store.openAI,
    close: store.closeAI,
    startSession: store.startSession,
    endSession: store.endSession,
    addMessage: store.addMessage,
    incrementUsage: store.incrementUsage,
    submitFeedback: store.submitFeedback,
    updateSettings: store.updateSettings,
    setError: store.setError,
    clearError: store.clearError,
    
    // Computed
    canUseAI: store.quota?.isUnlimited || 
      (store.quota && (store.quota.used ?? store.quota.dailyUsed ?? 0) < (store.quota.limit ?? store.quota.dailyLimit ?? 100)),
    remainingQuota: store.quota?.isUnlimited 
      ? Infinity 
      : (store.quota?.limit ?? store.quota?.dailyLimit ?? 0) - (store.quota?.used ?? store.quota?.dailyUsed ?? 0),
  };
}

/**
 * AI Kota hook'u
 */
export function useAIQuotaStatus() {
  const quota = useAIStore((state) => state.quota);
  const incrementUsage = useAIStore((state) => state.incrementUsage);
  
  const used = quota?.used ?? quota?.dailyUsed ?? 0;
  const limit = quota?.limit ?? quota?.dailyLimit ?? 100;
  
  const percentage = quota && !quota.isUnlimited 
    ? (used / limit) * 100 
    : 0;
  
  const remaining = quota?.isUnlimited 
    ? Infinity 
    : limit - used;
  
  const isLow = !quota?.isUnlimited && remaining <= 3;
  const isExhausted = !quota?.isUnlimited && remaining <= 0;
  
  return {
    quota,
    percentage,
    remaining,
    isLow,
    isExhausted,
    increment: incrementUsage,
  };
}

/**
 * Feature-specific AI hook
 */
export function useAIFeature(feature: AIFeatureType) {
  const store = useAIStore();
  
  const open = (context: AIContext) => {
    store.openAI(feature, context);
  };
  
  const isActive = store.activeFeature === feature;
  
  return {
    isActive,
    open,
    close: store.closeAI,
  };
}

export default useAIStore;
