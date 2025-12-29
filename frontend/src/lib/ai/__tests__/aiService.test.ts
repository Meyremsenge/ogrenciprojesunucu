/**
 * AI Service Unit Tests
 * 
 * Mock AI response ile unit test senaryoları.
 * Gerçek API çağrısı yapmadan tüm edge case'leri test eder.
 */

// @ts-ignore - vitest yüklendiginde çalışır
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TestMockAIService,
  createTestService,
  createFailingService,
  createExhaustedQuotaService,
  createMockMessage,
  createMockQuota,
  createMockContext,
  createMockError,
  createSuccessResponse,
  createErrorResponse,
  TEST_SCENARIOS,
  assertServiceCalled,
  assertServiceNotCalled,
  flushPromises,
} from './setup';

describe('AI Service - Unit Tests', () => {
  let service: TestMockAIService;
  
  beforeEach(() => {
    service = createTestService();
  });
  
  afterEach(() => {
    service.reset();
  });
  
  // ===========================================================================
  // sendMessage Tests
  // ===========================================================================
  
  describe('sendMessage', () => {
    it('should return success response with valid input', async () => {
      const context = createMockContext();
      const result = await service.sendMessage('question_hint', 'Test message', context);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.role).toBe('assistant');
      expect(result.data?.content).toBeTruthy();
    });
    
    it('should log the call with correct arguments', async () => {
      const context = createMockContext({ questionId: 999 });
      await service.sendMessage('topic_explanation', 'Explain this', context);
      
      assertServiceCalled(service, 'sendMessage', 1);
      expect(service.wasCalledWith('sendMessage', (args) => 
        args[0] === 'topic_explanation' && 
        args[1] === 'Explain this' &&
        args[2].questionId === 999
      )).toBe(true);
    });
    
    it('should return feature-specific responses', async () => {
      const context = createMockContext();
      
      const hintResult = await service.sendMessage('question_hint', 'msg', context);
      expect(hintResult.data?.metadata?.feature).toBe('question_hint');
      
      const planResult = await service.sendMessage('study_plan', 'msg', context);
      expect(planResult.data?.metadata?.feature).toBe('study_plan');
    });
    
    it('should include metadata in response', async () => {
      const result = await service.sendMessage('question_hint', 'msg', createMockContext());
      
      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata?.tokensUsed).toBe('number');
    });
    
    it('should use queued response when available', async () => {
      const customResponse = createSuccessResponse(createMockMessage({
        content: 'Custom queued response',
      }));
      
      service.queueResponse('sendMessage', customResponse);
      
      const result = await service.sendMessage('question_hint', 'msg', createMockContext());
      expect(result.data?.content).toBe('Custom queued response');
    });
  });
  
  // ===========================================================================
  // streamMessage Tests
  // ===========================================================================
  
  describe('streamMessage', () => {
    it('should call onChunk for each word', async () => {
      const chunks: string[] = [];
      const context = createMockContext();
      
      await service.streamMessage(
        'topic_explanation',
        'Explain',
        context,
        (chunk) => chunks.push(chunk)
      );
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every(c => c.endsWith(' '))).toBe(true);
    });
    
    it('should return complete message after streaming', async () => {
      const chunks: string[] = [];
      
      const result = await service.streamMessage(
        'question_hint',
        'msg',
        createMockContext(),
        (chunk) => chunks.push(chunk)
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.content).toBe(chunks.join('').trim());
    });
    
    it('should increment quota on stream', async () => {
      await service.streamMessage('question_hint', 'msg', createMockContext(), () => {});
      
      const quota = await service.getQuota();
      expect(quota.data?.used).toBe(1);
    });
  });
  
  // ===========================================================================
  // getHint Tests
  // ===========================================================================
  
  describe('getHint', () => {
    it('should return hint for level 1', async () => {
      const result = await service.getHint(1, createMockContext());
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('Temel');
    });
    
    it('should return hint for level 2', async () => {
      const result = await service.getHint(2, createMockContext());
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('Orta');
    });
    
    it('should return hint for level 3', async () => {
      const result = await service.getHint(3, createMockContext());
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('Detaylı');
    });
    
    it('should increment quota', async () => {
      await service.getHint(1, createMockContext());
      await service.getHint(2, createMockContext());
      
      const quota = await service.getQuota();
      expect(quota.data?.used).toBe(2);
    });
  });
  
  // ===========================================================================
  // getQuota Tests
  // ===========================================================================
  
  describe('getQuota', () => {
    it('should return quota status', async () => {
      const result = await service.getQuota();
      
      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(30);
      expect(result.data?.used).toBe(0);
    });
    
    it('should reflect used quota', async () => {
      await service.sendMessage('question_hint', 'msg', createMockContext());
      await service.sendMessage('question_hint', 'msg', createMockContext());
      
      const result = await service.getQuota();
      expect(result.data?.used).toBe(2);
    });
    
    it('should use queued response', async () => {
      service.queueResponse('getQuota', createSuccessResponse(
        createMockQuota({ used: 25, limit: 50 })
      ));
      
      const result = await service.getQuota();
      expect(result.data?.used).toBe(25);
      expect(result.data?.limit).toBe(50);
    });
  });
  
  // ===========================================================================
  // submitFeedback Tests
  // ===========================================================================
  
  describe('submitFeedback', () => {
    it('should accept feedback', async () => {
      const feedback = {
        responseId: 'msg-123',
        rating: 5 as const,
        helpful: true,
        comment: 'Great help!',
      };
      
      const result = await service.submitFeedback(feedback);
      
      expect(result.success).toBe(true);
      assertServiceCalled(service, 'submitFeedback', 1);
    });
    
    it('should log feedback details', async () => {
      const feedback = {
        responseId: 'msg-456',
        rating: 1 as const,
        helpful: false,
      };
      
      await service.submitFeedback(feedback);
      
      expect(service.wasCalledWith('submitFeedback', (args) =>
        args[0].responseId === 'msg-456'
      )).toBe(true);
    });
  });
  
  // ===========================================================================
  // checkHealth Tests
  // ===========================================================================
  
  describe('checkHealth', () => {
    it('should return true for healthy service', async () => {
      const isHealthy = await service.checkHealth();
      expect(isHealthy).toBe(true);
    });
  });
  
  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================
  
  describe('Error Handling', () => {
    it('should return quota exceeded error', async () => {
      const exhaustedService = createExhaustedQuotaService();
      
      const result = await exhaustedService.sendMessage(
        'question_hint',
        'msg',
        createMockContext()
      );
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('QUOTA_EXCEEDED');
    });
    
    it('should handle queued error responses', async () => {
      service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.networkError);
      
      const result = await service.sendMessage('question_hint', 'msg', createMockContext());
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(result.error?.retryable).toBe(true);
    });
    
    it('should not increment quota on error', async () => {
      const exhaustedService = createExhaustedQuotaService();
      
      await exhaustedService.sendMessage('question_hint', 'msg', createMockContext());
      
      const quota = await exhaustedService.getQuota();
      expect(quota.data?.used).toBe(30); // Still at limit
    });
  });
  
  // ===========================================================================
  // Service State Tests
  // ===========================================================================
  
  describe('Service State', () => {
    it('should track all calls', async () => {
      await service.sendMessage('question_hint', 'msg1', createMockContext());
      await service.getHint(1, createMockContext());
      await service.getQuota();
      
      expect(service.getCallCount()).toBe(3);
      expect(service.getCallCount('sendMessage')).toBe(1);
      expect(service.getCallCount('getHint')).toBe(1);
      expect(service.getCallCount('getQuota')).toBe(1);
    });
    
    it('should reset state', async () => {
      await service.sendMessage('question_hint', 'msg', createMockContext());
      await service.sendMessage('question_hint', 'msg', createMockContext());
      
      service.reset();
      
      expect(service.getCallCount()).toBe(0);
      const quota = await service.getQuota();
      expect(quota.data?.used).toBe(0);
    });
    
    it('should allow setting quota used directly', async () => {
      service.setQuotaUsed(15);
      
      const quota = await service.getQuota();
      expect(quota.data?.used).toBe(15);
    });
  });
});

// =============================================================================
// RESPONSE FACTORY TESTS
// =============================================================================

describe('Response Factories', () => {
  describe('createMockMessage', () => {
    it('should create message with defaults', () => {
      const msg = createMockMessage();
      
      expect(msg.id).toBeTruthy();
      expect(msg.role).toBe('assistant');
      expect(msg.content).toBeTruthy();
      expect(msg.timestamp).toBeInstanceOf(Date);
    });
    
    it('should allow overrides', () => {
      const msg = createMockMessage({
        content: 'Custom content',
        role: 'user',
      });
      
      expect(msg.content).toBe('Custom content');
      expect(msg.role).toBe('user');
    });
  });
  
  describe('createMockQuota', () => {
    it('should create quota with defaults', () => {
      const quota = createMockQuota();
      
      expect(quota.used).toBe(5);
      expect(quota.limit).toBe(30);
      expect(quota.isUnlimited).toBe(false);
    });
    
    it('should allow overrides', () => {
      const quota = createMockQuota({ used: 100, isUnlimited: true });
      
      expect(quota.used).toBe(100);
      expect(quota.isUnlimited).toBe(true);
    });
  });
  
  describe('createMockError', () => {
    it('should create error with code', () => {
      const error = createMockError('MY_ERROR');
      
      expect(error.code).toBe('MY_ERROR');
      expect(error.message).toBeTruthy();
      expect(error.userMessage).toBeTruthy();
    });
  });
});

// =============================================================================
// TEST SCENARIOS TESTS
// =============================================================================

describe('Test Scenarios', () => {
  it('should have all error scenarios defined', () => {
    expect(TEST_SCENARIOS.ERRORS.quotaExceeded).toBeDefined();
    expect(TEST_SCENARIOS.ERRORS.rateLimited).toBeDefined();
    expect(TEST_SCENARIOS.ERRORS.networkError).toBeDefined();
    expect(TEST_SCENARIOS.ERRORS.serverError).toBeDefined();
    expect(TEST_SCENARIOS.ERRORS.authError).toBeDefined();
    expect(TEST_SCENARIOS.ERRORS.validationError).toBeDefined();
    expect(TEST_SCENARIOS.ERRORS.contentFiltered).toBeDefined();
  });
  
  it('should have all quota scenarios defined', () => {
    expect(TEST_SCENARIOS.QUOTA.healthy.used).toBeLessThan(TEST_SCENARIOS.QUOTA.warning.used);
    expect(TEST_SCENARIOS.QUOTA.warning.used).toBeLessThan(TEST_SCENARIOS.QUOTA.critical.used);
    expect(TEST_SCENARIOS.QUOTA.critical.used).toBeLessThan(TEST_SCENARIOS.QUOTA.exhausted.used);
  });
  
  it('should have all feature responses defined', () => {
    const features = [
      'question_hint',
      'topic_explanation',
      'study_plan',
      'answer_evaluation',
      'performance_analysis',
      'question_generation',
      'content_enhancement',
      'motivation_message',
    ];
    
    features.forEach(feature => {
      expect(TEST_SCENARIOS.FEATURES[feature as keyof typeof TEST_SCENARIOS.FEATURES]).toBeTruthy();
    });
  });
});
