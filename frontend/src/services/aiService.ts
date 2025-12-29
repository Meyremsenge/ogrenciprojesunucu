/**
 * AI Chat Service
 * 
 * AI asistan ile iletişim için güvenli servis katmanı.
 * - Context limiting
 * - Rate limiting (client-side)
 * - Error handling
 * - Streaming support
 */

import api from './api';

// ============================================================================
// Types
// ============================================================================

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface AIHintRequest {
  question_text: string;
  difficulty_level?: 'kolay' | 'orta' | 'zor';
  subject?: string;
  topic?: string;
}

export interface AIHintResponse {
  hint: string;
  hint_level: number;
  tokens_used: number;
  disclaimer: string;
  ai_generated: boolean;
}

export interface AIExplainRequest {
  topic: string;
  subject?: string;
  difficulty?: 'basic' | 'medium' | 'advanced';
}

export interface AIExplainResponse {
  explanation: string;
  tokens_used: number;
  disclaimer: string;
  ai_generated: boolean;
}

export interface AIQuotaStatus {
  tokens: {
    daily: { used: number; limit: number | 'unlimited'; remaining: number | 'unlimited' };
    monthly: { used: number; limit: number | 'unlimited'; remaining: number | 'unlimited' };
  };
  requests: {
    daily: { used: number; limit: number | 'unlimited'; remaining: number | 'unlimited' };
  };
}

export interface StreamChunk {
  chunk?: string;
  accumulated?: string;
  status?: 'started' | 'completed' | 'failed';
  error?: string;
  disclaimer?: string;
}

// ============================================================================
// Constants
// ============================================================================

// Client-side rate limiting
const RATE_LIMIT = {
  maxRequestsPerMinute: 10,
  minRequestInterval: 3000, // 3 saniye
};

// Context limits
const CONTEXT_LIMITS = {
  maxMessages: 10,
  maxMessageLength: 2000,
};

// ============================================================================
// Rate Limiter (Client-side)
// ============================================================================

class ClientRateLimiter {
  private requests: number[] = [];
  private lastRequestTime = 0;

  canMakeRequest(): { allowed: boolean; waitTime?: number } {
    const now = Date.now();
    
    // Minimum interval kontrolü
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT.minRequestInterval) {
      return {
        allowed: false,
        waitTime: RATE_LIMIT.minRequestInterval - timeSinceLastRequest,
      };
    }
    
    // Dakikalık limit kontrolü
    const oneMinuteAgo = now - 60000;
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    if (this.requests.length >= RATE_LIMIT.maxRequestsPerMinute) {
      const oldestRequest = this.requests[0];
      return {
        allowed: false,
        waitTime: 60000 - (now - oldestRequest),
      };
    }
    
    return { allowed: true };
  }

  recordRequest(): void {
    this.requests.push(Date.now());
    this.lastRequestTime = Date.now();
  }
}

const rateLimiter = new ClientRateLimiter();

// ============================================================================
// Input Sanitizer (Client-side)
// ============================================================================

function sanitizeInput(input: string): string {
  // Maksimum uzunluk
  let sanitized = input.slice(0, CONTEXT_LIMITS.maxMessageLength);
  
  // Tehlikeli karakterleri temizle
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // HTML tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
  
  return sanitized.trim();
}

function limitMessages(messages: AIMessage[]): AIMessage[] {
  // Son N mesajı al
  const limited = messages.slice(-CONTEXT_LIMITS.maxMessages);
  
  // Her mesajın uzunluğunu kontrol et
  return limited.map(msg => ({
    ...msg,
    content: msg.content.slice(0, CONTEXT_LIMITS.maxMessageLength),
  }));
}

// ============================================================================
// Error Handler
// ============================================================================

class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'AIError';
  }
}

function handleAIError(error: any): never {
  if (error.response) {
    const { status, data } = error.response;
    
    if (status === 429) {
      throw new AIError(
        data.message || 'Çok fazla istek gönderdiniz. Lütfen bekleyin.',
        'RATE_LIMIT_EXCEEDED',
        status,
        data.retry_after
      );
    }
    
    if (status === 403) {
      if (data.error_code === 'EXAM_IN_PROGRESS') {
        throw new AIError(
          'Sınav süresince AI asistan kullanılamaz.',
          'EXAM_BLOCKED',
          status
        );
      }
      throw new AIError(
        data.message || 'Erişim reddedildi.',
        'ACCESS_DENIED',
        status
      );
    }
    
    if (status === 400) {
      throw new AIError(
        data.message || 'Geçersiz istek.',
        'INVALID_REQUEST',
        status
      );
    }
    
    throw new AIError(
      data.message || 'Bir hata oluştu.',
      'UNKNOWN_ERROR',
      status
    );
  }
  
  throw new AIError(
    'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
    'NETWORK_ERROR'
  );
}

// ============================================================================
// AI Service
// ============================================================================

export const aiService = {
  /**
   * Soru ipucu al
   */
  async getHint(request: AIHintRequest): Promise<AIHintResponse> {
    // Rate limit kontrolü
    const rateCheck = rateLimiter.canMakeRequest();
    if (!rateCheck.allowed) {
      throw new AIError(
        `Lütfen ${Math.ceil((rateCheck.waitTime || 0) / 1000)} saniye bekleyin.`,
        'CLIENT_RATE_LIMIT',
        429,
        rateCheck.waitTime
      );
    }
    
    // Input sanitization
    const sanitizedRequest = {
      ...request,
      question_text: sanitizeInput(request.question_text),
    };
    
    try {
      rateLimiter.recordRequest();
      const response = await api.post<{ data: AIHintResponse }>('/ai/hint', sanitizedRequest);
      return response.data.data;
    } catch (error) {
      handleAIError(error);
    }
  },

  /**
   * Konu açıklaması al
   */
  async explainTopic(request: AIExplainRequest): Promise<AIExplainResponse> {
    const rateCheck = rateLimiter.canMakeRequest();
    if (!rateCheck.allowed) {
      throw new AIError(
        `Lütfen ${Math.ceil((rateCheck.waitTime || 0) / 1000)} saniye bekleyin.`,
        'CLIENT_RATE_LIMIT',
        429,
        rateCheck.waitTime
      );
    }
    
    const sanitizedRequest = {
      ...request,
      topic: sanitizeInput(request.topic),
    };
    
    try {
      rateLimiter.recordRequest();
      const response = await api.post<{ data: AIExplainResponse }>('/ai/explain', sanitizedRequest);
      return response.data.data;
    } catch (error) {
      handleAIError(error);
    }
  },

  /**
   * Kota durumunu al
   */
  async getQuotaStatus(): Promise<AIQuotaStatus> {
    try {
      const response = await api.get<{ data: AIQuotaStatus }>('/ai/quota/status');
      return response.data.data;
    } catch (error) {
      handleAIError(error);
    }
  },

  /**
   * Genel kota bilgisini al
   */
  async getQuota(): Promise<{ data: { used: number; limit: number } }> {
    try {
      const response = await api.get('/ai/quota');
      return response.data;
    } catch (error) {
      // Fallback değer
      return { data: { used: 0, limit: 100 } };
    }
  },

  /**
   * AI Chat - Genel sohbet
   */
  async chat(request: {
    message: string;
    feature?: string;
    context?: {
      topic?: string;
      courseId?: number;
    };
  }): Promise<{ response?: string; message?: string }> {
    const rateCheck = rateLimiter.canMakeRequest();
    if (!rateCheck.allowed) {
      throw new AIError(
        `Lütfen ${Math.ceil((rateCheck.waitTime || 0) / 1000)} saniye bekleyin.`,
        'CLIENT_RATE_LIMIT',
        429,
        rateCheck.waitTime
      );
    }

    const sanitizedRequest = {
      message: sanitizeInput(request.message),
      feature: request.feature || 'general',
      context: request.context,
    };

    try {
      rateLimiter.recordRequest();
      const response = await api.post('/ai/chat', sanitizedRequest);
      return response.data.data || response.data;
    } catch (error) {
      handleAIError(error);
    }
  },

  /**
   * Streaming ile ipucu al (SSE)
   */
  streamHint(
    request: AIHintRequest,
    onChunk: (chunk: StreamChunk) => void,
    onError: (error: AIError) => void,
    onComplete: () => void
  ): () => void {
    const rateCheck = rateLimiter.canMakeRequest();
    if (!rateCheck.allowed) {
      onError(new AIError(
        `Lütfen ${Math.ceil((rateCheck.waitTime || 0) / 1000)} saniye bekleyin.`,
        'CLIENT_RATE_LIMIT',
        429,
        rateCheck.waitTime
      ));
      return () => {};
    }
    
    rateLimiter.recordRequest();
    
    // SSE bağlantısı kur
    const token = localStorage.getItem('access_token');
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    
    // POST için fetch kullan
    const controller = new AbortController();
    
    fetch(`${baseUrl}/ai/stream/hint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        question_text: sanitizeInput(request.question_text),
        difficulty_level: request.difficulty_level,
      }),
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('Stream not supported');
        }
        
        function read() {
          reader!.read().then(({ done, value }) => {
            if (done) {
              onComplete();
              return;
            }
            
            const text = decoder.decode(value);
            const lines = text.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  onChunk(data);
                } catch (e) {
                  // JSON parse hatası, devam et
                }
              }
            }
            
            read();
          }).catch(error => {
            if (error.name !== 'AbortError') {
              onError(new AIError(error.message, 'STREAM_ERROR'));
            }
          });
        }
        
        read();
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          onError(new AIError(error.message, 'STREAM_ERROR'));
        }
      });
    
    // Cleanup function
    return () => {
      controller.abort();
    };
  },

  /**
   * Rate limit durumunu kontrol et
   */
  checkRateLimit(): { allowed: boolean; waitTime?: number } {
    return rateLimiter.canMakeRequest();
  },

  /**
   * Mesaj listesini context limitine göre kırp
   */
  limitContext(messages: AIMessage[]): AIMessage[] {
    return limitMessages(messages);
  },
};

export default aiService;
