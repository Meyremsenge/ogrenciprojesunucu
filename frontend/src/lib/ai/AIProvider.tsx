/**
 * AI Provider - Global Context
 * 
 * Uygulamanın AI yeteneklerini sağlayan global provider.
 * Tüm AI state ve servisleri bu context üzerinden erişilir.
 * 
 * KULLANIM:
 * =========
 * 1. App.tsx'de AIProvider ile uygulamayı sar
 * 2. Herhangi bir bileşende useAIContext() ile erişim sağla
 */

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  useMemo,
  type ReactNode 
} from 'react';

import { 
  type IAIService, 
  setAIService, 
  getAIService,
  isAIServiceInitialized,
} from './services/aiService';
import { APIAdapter } from './adapters/apiAdapter';
import { MockAdapter } from './adapters/mockAdapter';
import { useAIStore } from '@/stores/aiStore';
import { useAuthStore } from '@/stores/authStore';
import type { 
  AIFeatureType, 
  AIContext, 
  AIChatMessage,
  AIQuotaStatus,
  AIFeedback,
} from '@/types/ai';

// =============================================================================
// CONTEXT TYPES
// =============================================================================

interface AIProviderConfig {
  mode: 'api' | 'mock';
  apiBaseUrl?: string;
  mockDelay?: number;
}

interface AIContextValue {
  // Service Status
  isReady: boolean;
  isConnected: boolean;
  
  // Chat Operations
  sendMessage: (
    feature: AIFeatureType,
    message: string,
    context?: Partial<AIContext>
  ) => Promise<AIChatMessage | null>;
  
  streamMessage: (
    feature: AIFeatureType,
    message: string,
    context?: Partial<AIContext>,
    onChunk?: (chunk: string) => void
  ) => Promise<AIChatMessage | null>;
  
  // Hint Operations
  getHint: (
    level: 1 | 2 | 3,
    context?: Partial<AIContext>
  ) => Promise<string | null>;
  
  // Quota
  quota: AIQuotaStatus | null;
  refreshQuota: () => Promise<void>;
  
  // Feedback
  submitFeedback: (feedback: AIFeedback) => Promise<boolean>;
  
  // UI Control
  openChat: (feature: AIFeatureType, context?: Partial<AIContext>) => void;
  closeChat: () => void;
  
  // State
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AIContextInstance = createContext<AIContextValue | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface AIProviderProps {
  children: ReactNode;
  config?: Partial<AIProviderConfig>;
  /** Direkt mode belirtme (config.mode yerine) */
  mode?: 'api' | 'mock';
  /** Otomatik başlat */
  autoInitialize?: boolean;
}

export const AIProvider: React.FC<AIProviderProps> = ({ 
  children,
  config = {},
  mode: directMode,
  autoInitialize = true,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const aiStore = useAIStore();
  const { accessToken } = useAuthStore();
  
  // Determine mode - directMode > config.mode > env default
  const mode = directMode || config.mode || (import.meta.env.DEV ? 'mock' : 'api');
  
  // Initialize service
  useEffect(() => {
    const initService = async () => {
      try {
        let service: IAIService;
        
        if (mode === 'mock') {
          service = new MockAdapter({ delay: config.mockDelay || 600 });
        } else {
          service = new APIAdapter(
            config.apiBaseUrl || '/api/v1/ai',
            () => accessToken
          );
        }
        
        setAIService(service);
        
        // Check health
        const healthy = await service.checkHealth();
        setIsConnected(healthy);
        
        // Load quota
        const quotaResult = await service.getQuota();
        if (quotaResult.success && quotaResult.data) {
          aiStore.setQuota(quotaResult.data);
        }
        
        setIsReady(true);
      } catch (err) {
        console.error('[AIProvider] Initialization failed:', err);
        setError('AI servisi başlatılamadı');
        setIsReady(true); // Still mark as ready to not block UI
      }
    };
    
    initService();
  }, [mode, config.apiBaseUrl, config.mockDelay, accessToken]);
  
  // Build context
  const buildContext = useCallback((partial?: Partial<AIContext>): AIContext => {
    return {
      currentPage: window.location.pathname,
      pageType: 'dashboard',
      ...aiStore.currentContext,
      ...partial,
    };
  }, [aiStore.currentContext]);
  
  // Send message
  const sendMessage = useCallback(async (
    feature: AIFeatureType,
    message: string,
    context?: Partial<AIContext>
  ): Promise<AIChatMessage | null> => {
    if (!isAIServiceInitialized()) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const service = getAIService();
      const fullContext = buildContext(context);
      
      const result = await service.sendMessage(feature, message, fullContext);
      
      if (result.success && result.data) {
        aiStore.incrementUsage();
        return result.data;
      } else {
        setError(result.error?.userMessage || 'Mesaj gönderilemedi');
        return null;
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [buildContext, aiStore]);
  
  // Stream message
  const streamMessage = useCallback(async (
    feature: AIFeatureType,
    message: string,
    context?: Partial<AIContext>,
    onChunk?: (chunk: string) => void
  ): Promise<AIChatMessage | null> => {
    if (!isAIServiceInitialized()) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const service = getAIService();
      const fullContext = buildContext(context);
      
      const result = await service.streamMessage(
        feature, 
        message, 
        fullContext,
        onChunk || (() => {})
      );
      
      if (result.success && result.data) {
        aiStore.incrementUsage();
        return result.data;
      } else {
        setError(result.error?.userMessage || 'Yanıt alınamadı');
        return null;
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [buildContext, aiStore]);
  
  // Get hint
  const getHint = useCallback(async (
    level: 1 | 2 | 3,
    context?: Partial<AIContext>
  ): Promise<string | null> => {
    if (!isAIServiceInitialized()) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const service = getAIService();
      const fullContext = buildContext(context);
      
      const result = await service.getHint(level, fullContext);
      
      if (result.success && result.data) {
        aiStore.incrementUsage();
        return result.data;
      } else {
        setError(result.error?.userMessage || 'İpucu alınamadı');
        return null;
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [buildContext, aiStore]);
  
  // Refresh quota
  const refreshQuota = useCallback(async () => {
    if (!isAIServiceInitialized()) return;
    
    try {
      const service = getAIService();
      const result = await service.getQuota();
      
      if (result.success && result.data) {
        aiStore.setQuota(result.data);
      }
    } catch (err) {
      console.error('[AIProvider] Failed to refresh quota:', err);
    }
  }, [aiStore]);
  
  // Submit feedback
  const submitFeedback = useCallback(async (feedback: AIFeedback): Promise<boolean> => {
    if (!isAIServiceInitialized()) return false;
    
    try {
      const service = getAIService();
      const result = await service.submitFeedback(feedback);
      return result.success;
    } catch (err) {
      console.error('[AIProvider] Failed to submit feedback:', err);
      return false;
    }
  }, []);
  
  // Open chat
  const openChat = useCallback((feature: AIFeatureType, context?: Partial<AIContext>) => {
    aiStore.openAI(feature, buildContext(context));
  }, [aiStore, buildContext]);
  
  // Close chat
  const closeChat = useCallback(() => {
    aiStore.closeAI();
  }, [aiStore]);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    aiStore.clearError();
  }, [aiStore]);
  
  // Context value
  const value = useMemo<AIContextValue>(() => ({
    isReady,
    isConnected,
    sendMessage,
    streamMessage,
    getHint,
    quota: aiStore.quota,
    refreshQuota,
    submitFeedback,
    openChat,
    closeChat,
    isLoading,
    error,
    clearError,
  }), [
    isReady,
    isConnected,
    sendMessage,
    streamMessage,
    getHint,
    aiStore.quota,
    refreshQuota,
    submitFeedback,
    openChat,
    closeChat,
    isLoading,
    error,
    clearError,
  ]);
  
  return (
    <AIContextInstance.Provider value={value}>
      {children}
    </AIContextInstance.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

export function useAIContext(): AIContextValue {
  const context = useContext(AIContextInstance);
  
  if (!context) {
    throw new Error('useAIContext must be used within an AIProvider');
  }
  
  return context;
}
