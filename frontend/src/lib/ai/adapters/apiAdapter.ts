/**
 * API Adapter - Backend Integration
 * 
 * Gerçek backend API'si ile iletişim kuran adapter.
 * Backend değişirse sadece bu dosya güncellenir.
 */

import { BaseAIService, type AIServiceResponse } from '../services/aiService';
import type {
  AIFeatureType,
  AIContext,
  AIChatMessage,
  AIQuotaStatus,
  AIFeedback,
} from '@/types/ai';

// =============================================================================
// API ADAPTER
// =============================================================================

export class APIAdapter extends BaseAIService {
  private baseUrl: string;
  private getAuthToken: () => string | null;
  
  constructor(
    baseUrl: string = '/api/v1/ai',
    getAuthToken: () => string | null = () => null
  ) {
    super();
    this.baseUrl = baseUrl;
    this.getAuthToken = getAuthToken;
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<AIServiceResponse<T>> {
    try {
      const token = this.getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      };
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || 'UNKNOWN_ERROR',
            message: data.error?.message || 'An error occurred',
            userMessage: data.error?.user_message || 'Bir hata oluştu. Lütfen tekrar deneyin.',
            retryable: response.status >= 500 || response.status === 429,
            retryAfter: response.status === 429 
              ? parseInt(response.headers.get('Retry-After') || '60') 
              : undefined,
          },
        };
      }
      
      return {
        success: true,
        data: data.data,
        metadata: data.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
          userMessage: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
          retryable: true,
        },
      };
    }
  }
  
  async sendMessage(
    feature: AIFeatureType,
    message: string,
    context: AIContext
  ): Promise<AIServiceResponse<AIChatMessage>> {
    this.emit('message:sent', { feature, message });
    
    const result = await this.request<AIChatMessage>('/chat', {
      method: 'POST',
      body: JSON.stringify({ feature, message, context }),
    });
    
    if (result.success) {
      this.emit('message:received', result.data);
    } else {
      this.emit('message:error', result.error);
    }
    
    return result;
  }
  
  async streamMessage(
    feature: AIFeatureType,
    message: string,
    context: AIContext,
    onChunk: (chunk: string) => void
  ): Promise<AIServiceResponse<AIChatMessage>> {
    this.emit('stream:start', { feature, message });
    
    try {
      const token = this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ feature, message, context }),
      });
      
      if (!response.ok || !response.body) {
        throw new Error('Stream failed');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        onChunk(chunk);
        this.emit('stream:chunk', { chunk });
      }
      
      this.emit('stream:end', { fullContent });
      
      return {
        success: true,
        data: {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
          metadata: { feature, isStreaming: false },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STREAM_ERROR',
          message: error instanceof Error ? error.message : 'Stream error',
          userMessage: 'Yanıt alınırken bir hata oluştu.',
          retryable: true,
        },
      };
    }
  }
  
  async getHint(
    level: 1 | 2 | 3,
    context: AIContext
  ): Promise<AIServiceResponse<string>> {
    return this.request<string>('/hint', {
      method: 'POST',
      body: JSON.stringify({ level, context }),
    });
  }
  
  async getQuota(): Promise<AIServiceResponse<AIQuotaStatus>> {
    const result = await this.request<AIQuotaStatus>('/quota');
    if (result.success) {
      this.emit('quota:updated', result.data);
    }
    return result;
  }
  
  async submitFeedback(feedback: AIFeedback): Promise<AIServiceResponse<void>> {
    return this.request<void>('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }
  
  async checkHealth(): Promise<boolean> {
    try {
      const result = await this.request<{ status: string }>('/health');
      return result.success;
    } catch {
      return false;
    }
  }
}
