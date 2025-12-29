/**
 * AI Integration Tests
 * 
 * Bileşenler arası etkileşim testleri.
 * Service + State + Config entegrasyonu.
 */

// @ts-ignore - vitest yüklendiginde çalışır
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TestMockAIService,
  createTestService,
  createMockContext,
  createMockQuota,
  createSuccessResponse,
  TEST_SCENARIOS,
} from './setup';

// Mock zustand store
const mockAuthStore = {
  user: {
    id: 1,
    email: 'test@example.com',
    role: 'student' as const,
  },
};

// Mock config values
const mockConfig = {
  aiEnabled: true,
  defaultMode: 'mock' as const,
  environment: 'test' as const,
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (state: typeof mockAuthStore) => unknown) => {
    if (selector) return selector(mockAuthStore);
    return mockAuthStore;
  }),
}));

describe('AI Integration Tests', () => {
  let service: TestMockAIService;
  
  beforeEach(() => {
    service = createTestService();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    service.reset();
  });
  
  // ===========================================================================
  // Service + State Integration
  // ===========================================================================
  
  describe('Service + State Integration', () => {
    it('should maintain quota state across calls', async () => {
      // Initial quota
      let quota = await service.getQuota();
      expect(quota.data?.used).toBe(0);
      
      // Make calls
      await service.sendMessage('question_hint', 'msg1', createMockContext());
      await service.sendMessage('question_hint', 'msg2', createMockContext());
      await service.getHint(1, createMockContext());
      
      // Verify quota updated
      quota = await service.getQuota();
      expect(quota.data?.used).toBe(3);
    });
    
    it('should track feature usage independently', async () => {
      const context = createMockContext();
      
      await service.sendMessage('question_hint', 'msg', context);
      await service.sendMessage('topic_explanation', 'msg', context);
      await service.sendMessage('study_plan', 'msg', context);
      
      // All calls should be logged
      expect(service.getCallCount('sendMessage')).toBe(3);
      
      // Verify each feature was called
      expect(service.wasCalledWith('sendMessage', args => args[0] === 'question_hint')).toBe(true);
      expect(service.wasCalledWith('sendMessage', args => args[0] === 'topic_explanation')).toBe(true);
      expect(service.wasCalledWith('sendMessage', args => args[0] === 'study_plan')).toBe(true);
    });
    
    it('should handle session context correctly', async () => {
      const session1 = createMockContext({ lessonId: 1, questionId: 100 });
      const session2 = createMockContext({ lessonId: 2, questionId: 200 });
      
      await service.sendMessage('question_hint', 'msg1', session1);
      await service.sendMessage('question_hint', 'msg2', session2);
      
      // Verify sessions tracked
      expect(service.wasCalledWith('sendMessage', args => args[2].lessonId === 1)).toBe(true);
      expect(service.wasCalledWith('sendMessage', args => args[2].lessonId === 2)).toBe(true);
    });
  });
  
  // ===========================================================================
  // Quota Limit Enforcement
  // ===========================================================================
  
  describe('Quota Limit Enforcement', () => {
    it('should block requests when quota exhausted', async () => {
      service.setQuotaUsed(30); // Exhaust quota
      
      const result = await service.sendMessage('question_hint', 'msg', createMockContext());
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('QUOTA_EXCEEDED');
    });
    
    it('should allow requests until limit reached', async () => {
      service.setQuotaUsed(29); // One request left
      
      // First request should succeed
      const result1 = await service.sendMessage('question_hint', 'msg', createMockContext());
      expect(result1.success).toBe(true);
      
      // Second request should fail
      const result2 = await service.sendMessage('question_hint', 'msg', createMockContext());
      expect(result2.success).toBe(false);
    });
    
    it('should enforce quota across different operations', async () => {
      service.setQuotaUsed(28); // Two requests left
      
      await service.sendMessage('question_hint', 'msg', createMockContext());
      await service.getHint(1, createMockContext());
      
      // Third operation should fail
      const result = await service.streamMessage(
        'topic_explanation',
        'msg',
        createMockContext(),
        () => {}
      );
      
      expect(result.success).toBe(false);
    });
  });
  
  // ===========================================================================
  // Error Recovery Scenarios
  // ===========================================================================
  
  describe('Error Recovery Scenarios', () => {
    it('should recover after transient errors', async () => {
      // Queue an error, then success
      service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.networkError);
      
      // First call fails
      const result1 = await service.sendMessage('question_hint', 'msg', createMockContext());
      expect(result1.success).toBe(false);
      
      // Second call succeeds (no more queued errors)
      const result2 = await service.sendMessage('question_hint', 'msg', createMockContext());
      expect(result2.success).toBe(true);
    });
    
    it('should handle multiple error types in sequence', async () => {
      service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.rateLimited);
      service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.serverError);
      
      const result1 = await service.sendMessage('question_hint', 'msg', createMockContext());
      expect(result1.error?.code).toBe('RATE_LIMITED');
      
      const result2 = await service.sendMessage('question_hint', 'msg', createMockContext());
      expect(result2.error?.code).toBe('SERVER_ERROR');
      
      const result3 = await service.sendMessage('question_hint', 'msg', createMockContext());
      expect(result3.success).toBe(true);
    });
  });
  
  // ===========================================================================
  // Streaming Integration
  // ===========================================================================
  
  describe('Streaming Integration', () => {
    it('should stream complete content', async () => {
      const chunks: string[] = [];
      
      const result = await service.streamMessage(
        'topic_explanation',
        'Explain',
        createMockContext(),
        (chunk) => chunks.push(chunk)
      );
      
      const reconstructed = chunks.join('').trim();
      expect(result.data?.content).toBe(reconstructed);
    });
    
    it('should handle streaming with quota check', async () => {
      service.setQuotaUsed(30);
      
      const chunks: string[] = [];
      const result = await service.streamMessage(
        'topic_explanation',
        'msg',
        createMockContext(),
        (chunk) => chunks.push(chunk)
      );
      
      expect(result.success).toBe(false);
      expect(chunks.length).toBe(0); // No chunks should be received
    });
  });
  
  // ===========================================================================
  // Feedback Integration
  // ===========================================================================
  
  describe('Feedback Integration', () => {
    it('should track feedback for messages', async () => {
      // Send message
      const msgResult = await service.sendMessage('question_hint', 'msg', createMockContext());
      const responseId = msgResult.data?.id;
      
      // Submit feedback
      await service.submitFeedback({
        responseId: responseId!,
        rating: 5,
        helpful: true,
      });
      
      // Verify feedback logged
      expect(service.wasCalledWith('submitFeedback', args => 
        args[0].responseId === responseId
      )).toBe(true);
    });
    
    it('should accept feedback with comments', async () => {
      await service.submitFeedback({
        responseId: 'msg-123',
        rating: 1,
        helpful: false,
        comment: 'Could be more detailed',
      });
      
      expect(service.wasCalledWith('submitFeedback', args =>
        args[0].comment === 'Could be more detailed'
      )).toBe(true);
    });
  });
  
  // ===========================================================================
  // Health Check Integration
  // ===========================================================================
  
  describe('Health Check Integration', () => {
    it('should report healthy status', async () => {
      const isHealthy = await service.checkHealth();
      expect(isHealthy).toBe(true);
    });
    
    it('should be callable multiple times', async () => {
      await service.checkHealth();
      await service.checkHealth();
      await service.checkHealth();
      
      expect(service.getCallCount('checkHealth')).toBe(3);
    });
  });
});

// =============================================================================
// FEATURE ACCESS INTEGRATION
// =============================================================================

describe('Feature Access Integration', () => {
  it('should validate feature types', async () => {
    const service = createTestService();
    const validFeatures = [
      'question_hint',
      'topic_explanation',
      'study_plan',
      'answer_evaluation',
      'performance_analysis',
      'question_generation',
      'content_enhancement',
      'motivation_message',
    ] as const;
    
    for (const feature of validFeatures) {
      const result = await service.sendMessage(feature, 'test', createMockContext());
      expect(result.success).toBe(true);
    }
  });
});

// =============================================================================
// CONCURRENT REQUEST HANDLING
// =============================================================================

describe('Concurrent Request Handling', () => {
  it('should handle parallel requests', async () => {
    const service = createTestService();
    const context = createMockContext();
    
    const promises = [
      service.sendMessage('question_hint', 'msg1', context),
      service.sendMessage('topic_explanation', 'msg2', context),
      service.sendMessage('study_plan', 'msg3', context),
    ];
    
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
    
    expect(service.getCallCount('sendMessage')).toBe(3);
  });
  
  it('should maintain quota accuracy under concurrent load', async () => {
    const service = createTestService();
    service.setQuotaUsed(25); // 5 requests left
    const context = createMockContext();
    
    const promises = Array(10).fill(null).map((_, i) =>
      service.sendMessage('question_hint', `msg${i}`, context)
    );
    
    const results = await Promise.all(promises);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    expect(successCount).toBe(5);
    expect(failCount).toBe(5);
  });
});
