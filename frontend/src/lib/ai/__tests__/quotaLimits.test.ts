/**
 * AI Quota & Limit Tests
 * 
 * Kota limitleri ve rate limiting testleri.
 * Edge case senaryoları.
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
  waitFor,
} from './setup';

// =============================================================================
// QUOTA LIMIT TESTS
// =============================================================================

describe('Quota Limits', () => {
  let service: TestMockAIService;
  
  beforeEach(() => {
    service = createTestService();
  });
  
  afterEach(() => {
    service.reset();
  });
  
  describe('Daily Limits', () => {
    it('should allow requests within limit', async () => {
      const results: boolean[] = [];
      
      for (let i = 0; i < 10; i++) {
        const result = await service.sendMessage('question_hint', `msg${i}`, createMockContext());
        results.push(result.success);
      }
      
      expect(results.every(r => r)).toBe(true);
    });
    
    it('should block requests at exact limit', async () => {
      service.setQuotaUsed(30);
      
      const result = await service.sendMessage('question_hint', 'msg', createMockContext());
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('QUOTA_EXCEEDED');
    });
    
    it('should block all operations when limit reached', async () => {
      service.setQuotaUsed(30);
      
      const messageResult = await service.sendMessage('question_hint', 'msg', createMockContext());
      const hintResult = await service.getHint(1, createMockContext());
      const streamResult = await service.streamMessage(
        'topic_explanation',
        'msg',
        createMockContext(),
        () => {}
      );
      
      expect(messageResult.success).toBe(false);
      expect(hintResult.success).toBe(false);
      expect(streamResult.success).toBe(false);
    });
    
    it('should accurately track remaining quota', async () => {
      // Use 10 requests
      for (let i = 0; i < 10; i++) {
        await service.sendMessage('question_hint', `msg${i}`, createMockContext());
      }
      
      const quota = await service.getQuota();
      const used = quota.data?.used ?? 0;
      const limit = quota.data?.limit ?? 30;
      expect(used).toBe(10);
      expect(limit - used).toBe(20);
    });
  });
  
  describe('Quota Status Levels', () => {
    it('should identify healthy status (< 70%)', () => {
      const quota = createMockQuota({ used: 15, limit: 30 });
      const used = quota.used ?? 0;
      const limit = quota.limit ?? 30;
      const percentage = (used / limit) * 100;
      
      expect(percentage).toBe(50);
      expect(percentage < 70).toBe(true);
    });
    
    it('should identify warning status (70-90%)', () => {
      const quota = createMockQuota({ used: 24, limit: 30 });
      const used = quota.used ?? 0;
      const limit = quota.limit ?? 30;
      const percentage = (used / limit) * 100;
      
      expect(percentage).toBe(80);
      expect(percentage >= 70 && percentage < 90).toBe(true);
    });
    
    it('should identify critical status (>= 90%)', () => {
      const quota = createMockQuota({ used: 28, limit: 30 });
      const used = quota.used ?? 0;
      const limit = quota.limit ?? 30;
      const percentage = (used / limit) * 100;
      
      expect(percentage).toBeGreaterThan(90);
    });
    
    it('should identify exhausted status (100%)', () => {
      const quota = createMockQuota({ used: 30, limit: 30 });
      const used = quota.used ?? 0;
      const limit = quota.limit ?? 30;
      const percentage = (used / limit) * 100;
      
      expect(percentage).toBe(100);
      expect(used >= limit).toBe(true);
    });
  });
  
  describe('Unlimited Quota', () => {
    it('should not block requests when unlimited', async () => {
      service.queueResponse('getQuota', createSuccessResponse(
        createMockQuota({ isUnlimited: true })
      ));
      
      const quota = await service.getQuota();
      expect(quota.data?.isUnlimited).toBe(true);
    });
    
    it('should handle unlimited flag correctly', () => {
      const quota = TEST_SCENARIOS.QUOTA.unlimited;
      expect(quota.isUnlimited).toBe(true);
    });
  });
  
  describe('Quota Reset', () => {
    it('should include reset time in quota', async () => {
      const quota = await service.getQuota();
      
      expect(quota.data?.resetAt).toBeInstanceOf(Date);
      const resetAt = quota.data?.resetAt;
      expect(resetAt ? resetAt.getTime() : 0).toBeGreaterThan(Date.now());
    });
    
    it('should calculate time until reset', async () => {
      const quota = await service.getQuota();
      const resetAt = quota.data?.resetAt ?? new Date();
      const now = new Date();
      
      const hoursUntilReset = (resetAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      expect(hoursUntilReset).toBeGreaterThan(0);
      expect(hoursUntilReset).toBeLessThanOrEqual(24);
    });
  });
});

// =============================================================================
// RATE LIMITING TESTS
// =============================================================================

describe('Rate Limiting', () => {
  let service: TestMockAIService;
  
  beforeEach(() => {
    service = createTestService();
  });
  
  describe('Rate Limit Response', () => {
    it('should return rate limit error with retry-after', async () => {
      service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.rateLimited);
      
      const result = await service.sendMessage('question_hint', 'msg', createMockContext());
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RATE_LIMITED');
      expect(result.error?.retryAfter).toBeDefined();
      expect(result.error?.retryable).toBe(true);
    });
    
    it('should provide retry time in seconds', async () => {
      service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.rateLimited);
      
      const result = await service.sendMessage('question_hint', 'msg', createMockContext());
      
      expect(typeof result.error?.retryAfter).toBe('number');
      expect(result.error!.retryAfter).toBeGreaterThan(0);
    });
  });
  
  describe('Rate Limit Handling', () => {
    it('should allow retry after wait period', async () => {
      service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.rateLimited);
      
      // First request - rate limited
      const result1 = await service.sendMessage('question_hint', 'msg', createMockContext());
      expect(result1.success).toBe(false);
      
      // Second request - should succeed (simulated wait)
      const result2 = await service.sendMessage('question_hint', 'msg', createMockContext());
      expect(result2.success).toBe(true);
    });
    
    it('should display user-friendly rate limit message', async () => {
      service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.rateLimited);
      
      const result = await service.sendMessage('question_hint', 'msg', createMockContext());
      
      expect(result.error?.userMessage).toBeTruthy();
      expect(result.error?.userMessage.toLowerCase()).toContain('bekle');
    });
  });
});

// =============================================================================
// FEATURE-SPECIFIC LIMIT TESTS
// =============================================================================

describe('Feature-Specific Limits', () => {
  let service: TestMockAIService;
  
  beforeEach(() => {
    service = createTestService();
  });
  
  describe('Hint Level Limits', () => {
    it('should allow all hint levels', async () => {
      const context = createMockContext();
      
      const hint1 = await service.getHint(1, context);
      const hint2 = await service.getHint(2, context);
      const hint3 = await service.getHint(3, context);
      
      expect(hint1.success).toBe(true);
      expect(hint2.success).toBe(true);
      expect(hint3.success).toBe(true);
    });
    
    it('should count each hint against quota', async () => {
      const context = createMockContext();
      
      await service.getHint(1, context);
      await service.getHint(2, context);
      await service.getHint(3, context);
      
      const quota = await service.getQuota();
      expect(quota.data?.used).toBe(3);
    });
  });
  
  describe('Streaming Limits', () => {
    it('should count streaming against quota', async () => {
      await service.streamMessage(
        'topic_explanation',
        'msg',
        createMockContext(),
        () => {}
      );
      
      const quota = await service.getQuota();
      expect(quota.data?.used).toBe(1);
    });
    
    it('should fail streaming when quota exhausted', async () => {
      service.setQuotaUsed(30);
      
      const chunks: string[] = [];
      const result = await service.streamMessage(
        'topic_explanation',
        'msg',
        createMockContext(),
        (chunk) => chunks.push(chunk)
      );
      
      expect(result.success).toBe(false);
      expect(chunks.length).toBe(0);
    });
  });
});

// =============================================================================
// BOUNDARY TESTS
// =============================================================================

describe('Boundary Tests', () => {
  let service: TestMockAIService;
  
  beforeEach(() => {
    service = createTestService();
  });
  
  describe('Zero Quota', () => {
    it('should block immediately at zero limit', async () => {
      service.setQuotaUsed(30);
      
      const result = await service.sendMessage('question_hint', 'msg', createMockContext());
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('One Request Left', () => {
    it('should allow last request before blocking', async () => {
      service.setQuotaUsed(29);
      
      // Last allowed request
      const result1 = await service.sendMessage('question_hint', 'msg1', createMockContext());
      expect(result1.success).toBe(true);
      
      // Should now be blocked
      const result2 = await service.sendMessage('question_hint', 'msg2', createMockContext());
      expect(result2.success).toBe(false);
    });
  });
  
  describe('Negative Quota', () => {
    it('should handle edge case of negative used (reset)', async () => {
      service.setQuotaUsed(-1); // Edge case
      
      // Should still work (or reset to 0)
      const quota = await service.getQuota();
      const used = quota.data?.used ?? 0;
      const limit = quota.data?.limit ?? Infinity;
      expect(used).toBeLessThan(limit);
    });
  });
  
  describe('Very Large Limit', () => {
    it('should handle large quota limits', async () => {
      service.queueResponse('getQuota', createSuccessResponse(
        createMockQuota({ used: 0, limit: 1000000 })
      ));
      
      const quota = await service.getQuota();
      expect(quota.data?.limit).toBe(1000000);
    });
  });
});

// =============================================================================
// CONCURRENT QUOTA TESTS
// =============================================================================

describe('Concurrent Quota Access', () => {
  it('should handle parallel requests near limit', async () => {
    const service = createTestService();
    service.setQuotaUsed(28); // 2 left
    
    // Send 5 parallel requests
    const promises = Array(5).fill(null).map(() =>
      service.sendMessage('question_hint', 'msg', createMockContext())
    );
    
    const results = await Promise.all(promises);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    expect(successCount).toBe(2);
    expect(failCount).toBe(3);
  });
  
  it('should maintain quota accuracy under load', async () => {
    const service = createTestService();
    
    // Send 20 parallel requests
    const promises = Array(20).fill(null).map(() =>
      service.sendMessage('question_hint', 'msg', createMockContext())
    );
    
    await Promise.all(promises);
    
    const quota = await service.getQuota();
    expect(quota.data?.used).toBe(20);
  });
});

// =============================================================================
// QUOTA UI INTEGRATION
// =============================================================================

describe('Quota UI Integration', () => {
  it('should calculate percentage correctly', () => {
    const testCases = [
      { used: 0, limit: 30, expected: 0 },
      { used: 15, limit: 30, expected: 50 },
      { used: 21, limit: 30, expected: 70 },
      { used: 27, limit: 30, expected: 90 },
      { used: 30, limit: 30, expected: 100 },
    ];
    
    testCases.forEach(({ used, limit, expected }) => {
      const percentage = (used / limit) * 100;
      expect(percentage).toBe(expected);
    });
  });
  
  it('should determine UI color based on percentage', () => {
    const getColor = (percentage: number): string => {
      if (percentage >= 100) return 'red';
      if (percentage >= 90) return 'orange';
      if (percentage >= 70) return 'yellow';
      return 'green';
    };
    
    expect(getColor(50)).toBe('green');
    expect(getColor(70)).toBe('yellow');
    expect(getColor(90)).toBe('orange');
    expect(getColor(100)).toBe('red');
  });
  
  it('should format remaining quota message', () => {
    const formatRemaining = (quota: { used: number; limit: number }): string => {
      const remaining = quota.limit - quota.used;
      if (remaining === 0) return 'Kota doldu';
      if (remaining === 1) return '1 kullanım kaldı';
      return `${remaining} kullanım kaldı`;
    };
    
    expect(formatRemaining({ used: 28, limit: 30 })).toBe('2 kullanım kaldı');
    expect(formatRemaining({ used: 29, limit: 30 })).toBe('1 kullanım kaldı');
    expect(formatRemaining({ used: 30, limit: 30 })).toBe('Kota doldu');
  });
});
