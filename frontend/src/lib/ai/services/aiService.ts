/**
 * AI Service Layer - Core Service
 * 
 * Backend'den tamamen bağımsız AI servisi.
 * Tüm AI API çağrıları bu katman üzerinden yapılır.
 * 
 * MİMARİ PRENSİPLER:
 * ==================
 * 1. Adapter Pattern - Backend değişse bile UI etkilenmez
 * 2. Repository Pattern - Veri erişimi soyutlanır
 * 3. Strategy Pattern - Farklı AI provider'lar kullanılabilir
 */

import type {
  AIFeatureType,
  AIContext,
  AIChatMessage,
  AIResponse,
  AIQuotaStatus,
  AIFeedback,
} from '@/types/ai';

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

/**
 * AI Servis Interface
 * Backend adapter'ları bu interface'i implement eder
 */
export interface IAIService {
  // Chat
  sendMessage(
    feature: AIFeatureType,
    message: string,
    context: AIContext
  ): Promise<AIServiceResponse<AIChatMessage>>;
  
  // Streaming
  streamMessage(
    feature: AIFeatureType,
    message: string,
    context: AIContext,
    onChunk: (chunk: string) => void
  ): Promise<AIServiceResponse<AIChatMessage>>;
  
  // Hints
  getHint(
    level: 1 | 2 | 3,
    context: AIContext
  ): Promise<AIServiceResponse<string>>;
  
  // Quota
  getQuota(): Promise<AIServiceResponse<AIQuotaStatus>>;
  
  // Feedback
  submitFeedback(feedback: AIFeedback): Promise<AIServiceResponse<void>>;
  
  // Health
  checkHealth(): Promise<boolean>;
}

/**
 * Standart servis yanıtı
 */
export interface AIServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: AIServiceError;
  metadata?: {
    tokensUsed?: number;
    cached?: boolean;
    latency?: number;
  };
}

export interface AIServiceError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  retryAfter?: number;
}

// =============================================================================
// SERVICE EVENTS
// =============================================================================

export type AIServiceEventType = 
  | 'message:sent'
  | 'message:received'
  | 'message:error'
  | 'stream:start'
  | 'stream:chunk'
  | 'stream:end'
  | 'stream:error'
  | 'quota:updated'
  | 'quota:exceeded'
  | 'session:start'
  | 'session:end';

export interface AIServiceEvent {
  type: AIServiceEventType;
  timestamp: Date;
  data?: unknown;
}

export type AIServiceEventHandler = (event: AIServiceEvent) => void;

// =============================================================================
// ABSTRACT BASE SERVICE
// =============================================================================

/**
 * Temel AI Servisi
 * Tüm AI servis implementasyonları bu sınıfı extend eder
 */
export abstract class BaseAIService implements IAIService {
  protected eventHandlers: Map<AIServiceEventType, Set<AIServiceEventHandler>> = new Map();
  
  // Event system
  on(event: AIServiceEventType, handler: AIServiceEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }
  
  protected emit(type: AIServiceEventType, data?: unknown): void {
    const event: AIServiceEvent = {
      type,
      timestamp: new Date(),
      data,
    };
    this.eventHandlers.get(type)?.forEach(handler => handler(event));
  }
  
  // Abstract methods - must be implemented by adapters
  abstract sendMessage(
    feature: AIFeatureType,
    message: string,
    context: AIContext
  ): Promise<AIServiceResponse<AIChatMessage>>;
  
  abstract streamMessage(
    feature: AIFeatureType,
    message: string,
    context: AIContext,
    onChunk: (chunk: string) => void
  ): Promise<AIServiceResponse<AIChatMessage>>;
  
  abstract getHint(
    level: 1 | 2 | 3,
    context: AIContext
  ): Promise<AIServiceResponse<string>>;
  
  abstract getQuota(): Promise<AIServiceResponse<AIQuotaStatus>>;
  
  abstract submitFeedback(feedback: AIFeedback): Promise<AIServiceResponse<void>>;
  
  abstract checkHealth(): Promise<boolean>;
}

// =============================================================================
// SERVICE FACTORY
// =============================================================================

export type AIServiceType = 'api' | 'mock' | 'offline';

let currentService: IAIService | null = null;

export function getAIService(): IAIService {
  if (!currentService) {
    throw new Error('AI Service not initialized. Call initializeAIService first.');
  }
  return currentService;
}

export function setAIService(service: IAIService): void {
  currentService = service;
}

export function isAIServiceInitialized(): boolean {
  return currentService !== null;
}
