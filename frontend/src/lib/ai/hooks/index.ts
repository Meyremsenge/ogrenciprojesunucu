/**
 * AI Hooks - Reusable AI Functionality
 * 
 * Sayfa ve bileşenlerde AI özelliklerini kullanmak için hook'lar.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAIContext } from '../AIProvider';
import { useAIStore } from '@/stores/aiStore';
import type { 
  AIFeatureType, 
  AIContext, 
  AIChatMessage,
  AIFeedback,
} from '@/types/ai';

// =============================================================================
// useAIChat - Chat Functionality
// =============================================================================

interface UseAIChatOptions {
  feature: AIFeatureType;
  context?: Partial<AIContext>;
  streaming?: boolean;
  onMessage?: (message: AIChatMessage) => void;
  onError?: (error: string) => void;
}

interface UseAIChatReturn {
  messages: AIChatMessage[];
  isLoading: boolean;
  error: string | null;
  send: (message: string) => Promise<void>;
  clear: () => void;
}

export function useAIChat(options: UseAIChatOptions): UseAIChatReturn {
  const { feature, context, streaming = false, onMessage, onError } = options;
  const ai = useAIContext();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const send = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    // Add user message
    const userMessage: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      let aiMessage: AIChatMessage | null;
      
      if (streaming) {
        let streamContent = '';
        const streamId = `ai-${Date.now()}`;
        
        // Add placeholder message
        setMessages(prev => [...prev, {
          id: streamId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          metadata: { isStreaming: true },
        }]);
        
        aiMessage = await ai.streamMessage(
          feature,
          message,
          context,
          (chunk) => {
            streamContent += chunk;
            setMessages(prev => 
              prev.map(m => 
                m.id === streamId 
                  ? { ...m, content: streamContent }
                  : m
              )
            );
          }
        );
        
        // Update with final message
        if (aiMessage) {
          setMessages(prev => 
            prev.map(m => 
              m.id === streamId 
                ? { ...aiMessage!, metadata: { ...aiMessage!.metadata, isStreaming: false } }
                : m
            )
          );
        }
      } else {
        aiMessage = await ai.sendMessage(feature, message, context);
        
        if (aiMessage) {
          setMessages(prev => [...prev, aiMessage!]);
        }
      }
      
      if (aiMessage) {
        onMessage?.(aiMessage);
      } else {
        const errorMsg = ai.error || 'Yanıt alınamadı';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Beklenmeyen bir hata oluştu';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [ai, feature, context, streaming, onMessage, onError]);
  
  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);
  
  return {
    messages,
    isLoading,
    error,
    send,
    clear,
  };
}

// =============================================================================
// useAIHint - Progressive Hint System
// =============================================================================

interface UseAIHintOptions {
  context?: Partial<AIContext>;
  maxLevel?: 1 | 2 | 3;
}

interface UseAIHintReturn {
  hints: string[];
  currentLevel: 0 | 1 | 2 | 3;
  isLoading: boolean;
  error: string | null;
  canGetMore: boolean;
  getNextHint: () => Promise<void>;
  reset: () => void;
}

export function useAIHint(options: UseAIHintOptions = {}): UseAIHintReturn {
  const { context, maxLevel = 3 } = options;
  const ai = useAIContext();
  const [hints, setHints] = useState<string[]>([]);
  const [currentLevel, setCurrentLevel] = useState<0 | 1 | 2 | 3>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const canGetMore = currentLevel < maxLevel;
  
  const getNextHint = useCallback(async () => {
    if (!canGetMore || isLoading) return;
    
    const nextLevel = (currentLevel + 1) as 1 | 2 | 3;
    setIsLoading(true);
    setError(null);
    
    try {
      const hint = await ai.getHint(nextLevel, context);
      
      if (hint) {
        setHints(prev => [...prev, hint]);
        setCurrentLevel(nextLevel);
      } else {
        setError(ai.error || 'İpucu alınamadı');
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [ai, context, currentLevel, canGetMore, isLoading]);
  
  const reset = useCallback(() => {
    setHints([]);
    setCurrentLevel(0);
    setError(null);
  }, []);
  
  return {
    hints,
    currentLevel,
    isLoading,
    error,
    canGetMore,
    getNextHint,
    reset,
  };
}

// =============================================================================
// useAIQuota - Quota Tracking
// =============================================================================

interface UseAIQuotaReturn {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  isLow: boolean;
  isExhausted: boolean;
  isUnlimited: boolean;
  resetAt: Date | null;
  refresh: () => Promise<void>;
}

export function useAIQuota(): UseAIQuotaReturn {
  const ai = useAIContext();
  const quota = ai.quota;
  
  const used = quota?.used ?? 0;
  const limit = quota?.limit ?? 0;
  const remaining = quota?.isUnlimited ? Infinity : Math.max(0, limit - used);
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const isLow = !quota?.isUnlimited && remaining <= 5;
  const isExhausted = !quota?.isUnlimited && remaining <= 0;
  const isUnlimited = quota?.isUnlimited ?? false;
  const resetAt = quota?.resetAt ? new Date(quota.resetAt) : null;
  
  return {
    used,
    limit,
    remaining,
    percentage,
    isLow,
    isExhausted,
    isUnlimited,
    resetAt,
    refresh: ai.refreshQuota,
  };
}

// =============================================================================
// useAIFeedback - Feedback Collection
// =============================================================================

interface UseAIFeedbackReturn {
  isSubmitting: boolean;
  isSubmitted: boolean;
  submit: (responseId: string, rating: 1 | 2 | 3 | 4 | 5, helpful: boolean) => Promise<void>;
  reset: () => void;
}

export function useAIFeedback(): UseAIFeedbackReturn {
  const ai = useAIContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const submit = useCallback(async (
    responseId: string,
    rating: 1 | 2 | 3 | 4 | 5,
    helpful: boolean
  ) => {
    setIsSubmitting(true);
    
    const feedback: AIFeedback = {
      responseId,
      rating,
      helpful,
      accurate: rating >= 4,
      submittedAt: new Date(),
    };
    
    const success = await ai.submitFeedback(feedback);
    
    setIsSubmitting(false);
    setIsSubmitted(success);
  }, [ai]);
  
  const reset = useCallback(() => {
    setIsSubmitted(false);
  }, []);
  
  return {
    isSubmitting,
    isSubmitted,
    submit,
    reset,
  };
}

// =============================================================================
// useAIFeature - Feature-Specific Hook
// =============================================================================

interface UseAIFeatureOptions {
  feature: AIFeatureType;
  autoOpen?: boolean;
}

interface UseAIFeatureReturn {
  isOpen: boolean;
  open: (context?: Partial<AIContext>) => void;
  close: () => void;
  toggle: (context?: Partial<AIContext>) => void;
}

export function useAIFeature(options: UseAIFeatureOptions): UseAIFeatureReturn {
  const { feature, autoOpen = false } = options;
  const ai = useAIContext();
  const store = useAIStore();
  
  const isOpen = store.isOpen && store.activeFeature === feature;
  
  const open = useCallback((context?: Partial<AIContext>) => {
    ai.openChat(feature, context);
  }, [ai, feature]);
  
  const close = useCallback(() => {
    ai.closeChat();
  }, [ai]);
  
  const toggle = useCallback((context?: Partial<AIContext>) => {
    if (isOpen) {
      close();
    } else {
      open(context);
    }
  }, [isOpen, open, close]);
  
  useEffect(() => {
    if (autoOpen) {
      open();
    }
  }, [autoOpen, open]);
  
  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

// =============================================================================
// useAIPageContext - Page-Level Context
// =============================================================================

export function useAIPageContext(pageContext: Partial<AIContext>) {
  const store = useAIStore();
  const contextRef = useRef(pageContext);
  
  useEffect(() => {
    contextRef.current = pageContext;
  }, [pageContext]);
  
  // Update store when page context changes
  useEffect(() => {
    if (store.isOpen && store.currentContext) {
      // Merge page context with current context
      const merged = { ...store.currentContext, ...pageContext };
      // Note: We don't update directly to avoid infinite loops
      // The context is used on next AI interaction
    }
  }, [pageContext, store.isOpen, store.currentContext]);
  
  return contextRef.current;
}

// =============================================================================
// Re-export from useAIRequest
// =============================================================================

export {
  useAIRequest,
  useBatchAIRequest,
  type UseAIRequestOptions,
  type UseAIRequestReturn,
  type UseBatchAIRequestOptions,
} from './useAIRequest';
