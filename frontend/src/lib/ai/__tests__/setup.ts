/**
 * AI Testing Setup & Configuration
 * 
 * Vitest ile AI modüllerinin test edilmesi için setup.
 * Mock providers, test utilities ve helpers.
 */

// @ts-ignore - relative path
import type { 
  AIFeatureType, 
  AIContext, 
  AIChatMessage,
  AIQuotaStatus,
  AIFeedback,
} from '../../../types/ai';
import type { IAIService, AIServiceResponse, AIServiceError } from '../services/aiService';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

export interface TestConfig {
  /** Delay for simulated responses (ms) */
  responseDelay: number;
  /** Default quota limit */
  quotaLimit: number;
  /** Should simulate errors */
  simulateErrors: boolean;
  /** Error rate (0-1) */
  errorRate: number;
  /** Network latency simulation */
  networkLatency: number;
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  responseDelay: 0, // No delay for unit tests
  quotaLimit: 30,
  simulateErrors: false,
  errorRate: 0,
  networkLatency: 0,
};

// =============================================================================
// MOCK RESPONSE FACTORIES
// =============================================================================

export const createMockMessage = (
  overrides: Partial<AIChatMessage> = {}
): AIChatMessage => ({
  id: `test-msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role: 'assistant',
  content: 'Bu bir test yanıtıdır.',
  timestamp: new Date(),
  metadata: {
    feature: 'question_hint',
    tokens: 50,
    confidence: 0.85,
  },
  ...overrides,
});

export const createMockQuota = (
  overrides: Partial<AIQuotaStatus> = {}
): AIQuotaStatus => ({
  feature: 'question_hint',
  used: 5,
  limit: 30,
  resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  unit: 'requests',
  isUnlimited: false,
  ...overrides,
});

export const createMockContext = (
  overrides: Partial<AIContext> = {}
): AIContext => ({
  pageType: 'question',
  questionId: 123,
  topicId: 456,
  lessonId: 789,
  ...overrides,
});

export const createMockError = (
  code: string = 'TEST_ERROR',
  overrides: Partial<AIServiceError> = {}
): AIServiceError => ({
  code,
  message: 'Test error occurred',
  userMessage: 'Bir test hatası oluştu.',
  retryable: false,
  ...overrides,
});

export const createSuccessResponse = <T>(
  data: T,
  metadata: Record<string, any> = {}
): AIServiceResponse<T> => ({
  success: true,
  data,
  metadata: {
    tokensUsed: 50,
    cached: false,
    latency: 100,
    ...metadata,
  },
});

export const createErrorResponse = <T>(
  error: AIServiceError
): AIServiceResponse<T> => ({
  success: false,
  error,
});

// =============================================================================
// PREDEFINED TEST SCENARIOS
// =============================================================================

export const TEST_SCENARIOS = {
  // Success scenarios
  SUCCESS: {
    hint: createSuccessResponse('Bu soruyu çözmek için formülü kullan.'),
    message: createSuccessResponse(createMockMessage({
      content: 'İşte yardımcı olabilecek bir açıklama...',
    })),
    quota: createSuccessResponse(createMockQuota()),
  },
  
  // Error scenarios
  ERRORS: {
    quotaExceeded: createErrorResponse<any>(createMockError('QUOTA_EXCEEDED', {
      message: 'Daily quota exceeded',
      userMessage: 'Günlük kullanım limitine ulaştın.',
      retryable: false,
    })),
    
    rateLimited: createErrorResponse<any>(createMockError('RATE_LIMITED', {
      message: 'Too many requests',
      userMessage: 'Çok fazla istek gönderdin. Biraz bekle.',
      retryable: true,
      retryAfter: 60,
    })),
    
    networkError: createErrorResponse<any>(createMockError('NETWORK_ERROR', {
      message: 'Network connection failed',
      userMessage: 'Bağlantı hatası. İnternet bağlantını kontrol et.',
      retryable: true,
    })),
    
    serverError: createErrorResponse<any>(createMockError('SERVER_ERROR', {
      message: 'Internal server error',
      userMessage: 'Sunucu hatası oluştu. Lütfen tekrar dene.',
      retryable: true,
    })),
    
    authError: createErrorResponse<any>(createMockError('AUTH_ERROR', {
      message: 'Authentication failed',
      userMessage: 'Oturum süresi doldu. Tekrar giriş yap.',
      retryable: false,
    })),
    
    validationError: createErrorResponse<any>(createMockError('VALIDATION_ERROR', {
      message: 'Invalid input',
      userMessage: 'Geçersiz giriş. Mesajını kontrol et.',
      retryable: false,
    })),
    
    contentFiltered: createErrorResponse<any>(createMockError('CONTENT_FILTERED', {
      message: 'Content was filtered',
      userMessage: 'Mesaj içeriği uygun değil.',
      retryable: false,
    })),
  },
  
  // Quota scenarios
  QUOTA: {
    healthy: createMockQuota({ used: 5, limit: 30 }),
    warning: createMockQuota({ used: 25, limit: 30 }),
    critical: createMockQuota({ used: 28, limit: 30 }),
    exhausted: createMockQuota({ used: 30, limit: 30 }),
    unlimited: createMockQuota({ isUnlimited: true }),
  },
  
  // Feature responses
  FEATURES: {
    question_hint: 'Formülü hatırla ve adım adım ilerle.',
    topic_explanation: 'Bu konuyu şöyle açıklayabiliriz...',
    study_plan: 'Senin için bir çalışma planı hazırladım.',
    answer_evaluation: 'Cevabını inceledim, doğru yoldasın.',
    performance_analysis: 'Performans analizine göre gelişme var.',
    question_generation: '5 yeni soru oluşturuldu.',
    content_enhancement: 'İçerik önerileri hazırlandı.',
    motivation_message: '💪 Harika gidiyorsun!',
  } as Record<AIFeatureType, string>,
} as const;

// =============================================================================
// MOCK AI SERVICE
// =============================================================================

export class TestMockAIService implements IAIService {
  private config: TestConfig;
  private quotaUsed: number = 0;
  private callLog: Array<{ method: string; args: any[]; timestamp: Date }> = [];
  private responseQueue: Map<string, AIServiceResponse<any>[]> = new Map();
  
  constructor(config: Partial<TestConfig> = {}) {
    this.config = { ...DEFAULT_TEST_CONFIG, ...config };
  }
  
  // Queue a response for a specific method
  queueResponse(method: string, response: AIServiceResponse<any>): void {
    const queue = this.responseQueue.get(method) || [];
    queue.push(response);
    this.responseQueue.set(method, queue);
  }
  
  // Get next queued response or default
  private getNextResponse<T>(method: string, defaultResponse: AIServiceResponse<T>): AIServiceResponse<T> {
    const queue = this.responseQueue.get(method);
    if (queue && queue.length > 0) {
      return queue.shift() as AIServiceResponse<T>;
    }
    
    // Simulate random errors if enabled
    if (this.config.simulateErrors && Math.random() < this.config.errorRate) {
      return TEST_SCENARIOS.ERRORS.serverError as AIServiceResponse<T>;
    }
    
    return defaultResponse;
  }
  
  private logCall(method: string, args: any[]): void {
    this.callLog.push({ method, args, timestamp: new Date() });
  }
  
  // Test utilities
  getCallLog() {
    return [...this.callLog];
  }
  
  getCallCount(method?: string): number {
    if (method) {
      return this.callLog.filter(c => c.method === method).length;
    }
    return this.callLog.length;
  }
  
  wasCalledWith(method: string, matcher: (args: any[]) => boolean): boolean {
    return this.callLog.some(c => c.method === method && matcher(c.args));
  }
  
  reset(): void {
    this.callLog = [];
    this.responseQueue.clear();
    this.quotaUsed = 0;
  }
  
  setQuotaUsed(used: number): void {
    this.quotaUsed = used;
  }
  
  // IAIService implementation
  async sendMessage(
    feature: AIFeatureType,
    message: string,
    context: AIContext
  ): Promise<AIServiceResponse<AIChatMessage>> {
    this.logCall('sendMessage', [feature, message, context]);
    
    await this.delay();
    
    if (this.quotaUsed >= this.config.quotaLimit) {
      return TEST_SCENARIOS.ERRORS.quotaExceeded;
    }
    
    this.quotaUsed++;
    
    const defaultResponse = createSuccessResponse(createMockMessage({
      content: TEST_SCENARIOS.FEATURES[feature] || 'Test response',
      metadata: { feature },
    }));
    
    return this.getNextResponse('sendMessage', defaultResponse);
  }
  
  async streamMessage(
    feature: AIFeatureType,
    message: string,
    context: AIContext,
    onChunk: (chunk: string) => void
  ): Promise<AIServiceResponse<AIChatMessage>> {
    this.logCall('streamMessage', [feature, message, context]);
    
    if (this.quotaUsed >= this.config.quotaLimit) {
      return TEST_SCENARIOS.ERRORS.quotaExceeded;
    }
    
    this.quotaUsed++;
    
    const content = TEST_SCENARIOS.FEATURES[feature] || 'Test streaming response';
    const words = content.split(' ');
    
    for (const word of words) {
      await new Promise(r => setTimeout(r, 10));
      onChunk(word + ' ');
    }
    
    return createSuccessResponse(createMockMessage({
      content,
      metadata: { feature, isStreaming: false },
    }));
  }
  
  async getHint(
    level: 1 | 2 | 3,
    context: AIContext
  ): Promise<AIServiceResponse<string>> {
    this.logCall('getHint', [level, context]);
    
    await this.delay();
    
    if (this.quotaUsed >= this.config.quotaLimit) {
      return TEST_SCENARIOS.ERRORS.quotaExceeded;
    }
    
    this.quotaUsed++;
    
    const hints: Record<1 | 2 | 3, string> = {
      1: 'Temel ipucu: Problem ne soruyor?',
      2: 'Orta ipucu: Şu formülü düşün...',
      3: 'Detaylı ipucu: Adım 1, Adım 2, Adım 3...',
    };
    
    return this.getNextResponse('getHint', createSuccessResponse(hints[level]));
  }
  
  async getQuota(): Promise<AIServiceResponse<AIQuotaStatus>> {
    this.logCall('getQuota', []);
    
    return this.getNextResponse('getQuota', createSuccessResponse(
      createMockQuota({ used: this.quotaUsed, limit: this.config.quotaLimit })
    ));
  }
  
  async submitFeedback(feedback: AIFeedback): Promise<AIServiceResponse<void>> {
    this.logCall('submitFeedback', [feedback]);
    await this.delay();
    return this.getNextResponse('submitFeedback', { success: true });
  }
  
  async checkHealth(): Promise<boolean> {
    this.logCall('checkHealth', []);
    return true;
  }
  
  private async delay(): Promise<void> {
    const totalDelay = this.config.responseDelay + this.config.networkLatency;
    if (totalDelay > 0) {
      await new Promise(r => setTimeout(r, totalDelay));
    }
  }
}

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Create a test service with pre-configured responses
 */
export function createTestService(config?: Partial<TestConfig>): TestMockAIService {
  return new TestMockAIService(config);
}

/**
 * Create a service that always fails
 */
export function createFailingService(error: AIServiceError = TEST_SCENARIOS.ERRORS.serverError.error!): TestMockAIService {
  const service = new TestMockAIService({ simulateErrors: true, errorRate: 1 });
  return service;
}

/**
 * Create a service with quota exhausted
 */
export function createExhaustedQuotaService(): TestMockAIService {
  const service = new TestMockAIService();
  service.setQuotaUsed(30);
  return service;
}

/**
 * Wait for async operations
 */
export const waitFor = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Flush all pending promises
 */
export const flushPromises = () => new Promise(r => setTimeout(r, 0));

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

export const assertServiceCalled = (
  service: TestMockAIService,
  method: string,
  times?: number
): void => {
  const count = service.getCallCount(method);
  if (times !== undefined) {
    if (count !== times) {
      throw new Error(`Expected ${method} to be called ${times} times, but was called ${count} times`);
    }
  } else if (count === 0) {
    throw new Error(`Expected ${method} to be called at least once`);
  }
};

export const assertServiceNotCalled = (
  service: TestMockAIService,
  method: string
): void => {
  const count = service.getCallCount(method);
  if (count > 0) {
    throw new Error(`Expected ${method} not to be called, but was called ${count} times`);
  }
};

// TestConfig is already exported at the interface definition
