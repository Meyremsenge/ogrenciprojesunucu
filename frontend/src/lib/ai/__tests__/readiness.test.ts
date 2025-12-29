/**
 * AI Frontend Readiness Checker
 * 
 * Gerçek AI entegrasyonundan önce frontend'in hazır olduğunu doğrulayan
 * kapsamlı kontrol sistemi.
 */

// @ts-ignore - vitest yüklendiginde çalışır
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TestMockAIService,
  createTestService,
  createMockContext,
  createMockQuota,
  createSuccessResponse,
  TEST_SCENARIOS,
} from './setup';

// =============================================================================
// READINESS CHECK TYPES
// =============================================================================

interface ReadinessCheckResult {
  category: string;
  check: string;
  passed: boolean;
  message: string;
  critical: boolean;
}

interface ReadinessReport {
  ready: boolean;
  passedCount: number;
  failedCount: number;
  criticalFailures: number;
  checks: ReadinessCheckResult[];
  timestamp: Date;
}

// =============================================================================
// READINESS CHECKER CLASS
// =============================================================================

class AIFrontendReadinessChecker {
  private results: ReadinessCheckResult[] = [];
  private service: TestMockAIService;
  
  constructor(service?: TestMockAIService) {
    this.service = service || createTestService();
  }
  
  private addResult(
    category: string,
    check: string,
    passed: boolean,
    message: string,
    critical: boolean = false
  ): void {
    this.results.push({ category, check, passed, message, critical });
  }
  
  // API Contract Checks
  async checkAPIContracts(): Promise<void> {
    // sendMessage contract
    try {
      const result = await this.service.sendMessage(
        'question_hint',
        'test',
        createMockContext()
      );
      
      this.addResult(
        'API Contract',
        'sendMessage returns correct structure',
        result.success !== undefined && (result.data !== undefined || result.error !== undefined),
        'sendMessage response yapısı doğru',
        true
      );
      
      if (result.success && result.data) {
        this.addResult(
          'API Contract',
          'Message has required fields',
          !!(result.data.id && result.data.role && result.data.content && result.data.timestamp),
          'Message tüm gerekli alanları içeriyor',
          true
        );
      }
    } catch (e) {
      this.addResult('API Contract', 'sendMessage', false, `Hata: ${e}`, true);
    }
    
    // getHint contract
    try {
      const result = await this.service.getHint(1, createMockContext());
      
      this.addResult(
        'API Contract',
        'getHint returns string',
        result.success && typeof result.data === 'string',
        'getHint string döndürüyor',
        true
      );
    } catch (e) {
      this.addResult('API Contract', 'getHint', false, `Hata: ${e}`, true);
    }
    
    // getQuota contract
    try {
      const result = await this.service.getQuota();
      
      this.addResult(
        'API Contract',
        'getQuota returns quota status',
        result.success && 
        result.data?.used !== undefined && 
        result.data?.limit !== undefined,
        'getQuota doğru yapıda döndürüyor',
        true
      );
    } catch (e) {
      this.addResult('API Contract', 'getQuota', false, `Hata: ${e}`, true);
    }
    
    // streamMessage contract
    try {
      const chunks: string[] = [];
      const result = await this.service.streamMessage(
        'topic_explanation',
        'test',
        createMockContext(),
        (chunk) => chunks.push(chunk)
      );
      
      this.addResult(
        'API Contract',
        'streamMessage calls onChunk',
        chunks.length > 0,
        'Streaming chunk callback çalışıyor',
        true
      );
    } catch (e) {
      this.addResult('API Contract', 'streamMessage', false, `Hata: ${e}`, true);
    }
  }
  
  // Error Handling Checks
  async checkErrorHandling(): Promise<void> {
    const errorCases = [
      { name: 'QUOTA_EXCEEDED', scenario: TEST_SCENARIOS.ERRORS.quotaExceeded },
      { name: 'RATE_LIMITED', scenario: TEST_SCENARIOS.ERRORS.rateLimited },
      { name: 'NETWORK_ERROR', scenario: TEST_SCENARIOS.ERRORS.networkError },
      { name: 'SERVER_ERROR', scenario: TEST_SCENARIOS.ERRORS.serverError },
      { name: 'AUTH_ERROR', scenario: TEST_SCENARIOS.ERRORS.authError },
    ];
    
    for (const { name, scenario } of errorCases) {
      this.service.reset();
      this.service.queueResponse('sendMessage', scenario);
      
      const result = await this.service.sendMessage(
        'question_hint',
        'test',
        createMockContext()
      );
      
      this.addResult(
        'Error Handling',
        `${name} error structure`,
        !result.success && !!result.error?.code && !!result.error?.userMessage,
        `${name} hatası doğru yapıda`,
        true
      );
    }
  }
  
  // State Management Checks
  async checkStateManagement(): Promise<void> {
    this.service.reset();
    
    // Quota tracking
    const initialQuota = await this.service.getQuota();
    await this.service.sendMessage('question_hint', 'test', createMockContext());
    const afterQuota = await this.service.getQuota();
    
    const initialUsed = initialQuota.data?.used ?? 0;
    const afterUsed = afterQuota.data?.used ?? 0;
    
    this.addResult(
      'State Management',
      'Quota increments on request',
      afterUsed === initialUsed + 1,
      'Kota kullanımı doğru takip ediliyor'
    );
    
    // Call logging
    this.addResult(
      'State Management',
      'Calls are logged',
      this.service.getCallCount() > 0,
      'Çağrılar loglanıyor'
    );
    
    // State reset
    this.service.reset();
    this.addResult(
      'State Management',
      'State resets correctly',
      this.service.getCallCount() === 0,
      'State reset çalışıyor'
    );
  }
  
  // Feature Coverage Checks
  async checkFeatureCoverage(): Promise<void> {
    const features = [
      'question_hint',
      'topic_explanation',
      'study_plan',
      'answer_evaluation',
      'performance_analysis',
      'question_generation',
      'content_enhancement',
      'motivation_message',
    ] as const;
    
    for (const feature of features) {
      this.service.reset();
      
      const result = await this.service.sendMessage(
        feature,
        'test',
        createMockContext()
      );
      
      this.addResult(
        'Feature Coverage',
        `${feature} feature works`,
        result.success,
        `${feature} özelliği çalışıyor`
      );
    }
  }
  
  // Streaming Checks
  async checkStreaming(): Promise<void> {
    this.service.reset();
    
    const chunks: string[] = [];
    const result = await this.service.streamMessage(
      'topic_explanation',
      'test',
      createMockContext(),
      (chunk) => chunks.push(chunk)
    );
    
    this.addResult(
      'Streaming',
      'Receives multiple chunks',
      chunks.length > 1,
      'Birden fazla chunk alınıyor'
    );
    
    this.addResult(
      'Streaming',
      'Content matches chunks',
      result.data?.content === chunks.join('').trim(),
      'Son içerik chunk toplamına eşit'
    );
  }
  
  // Quota Edge Cases
  async checkQuotaEdgeCases(): Promise<void> {
    // At limit
    this.service.reset();
    this.service.setQuotaUsed(30);
    
    const atLimit = await this.service.sendMessage('question_hint', 'test', createMockContext());
    this.addResult(
      'Quota Edge Cases',
      'Blocks at limit',
      !atLimit.success && atLimit.error?.code === 'QUOTA_EXCEEDED',
      'Limit aşımında engelleme çalışıyor'
    );
    
    // One before limit
    this.service.reset();
    this.service.setQuotaUsed(29);
    
    const oneLeft = await this.service.sendMessage('question_hint', 'test', createMockContext());
    this.addResult(
      'Quota Edge Cases',
      'Allows last request',
      oneLeft.success,
      'Son istek izin veriliyor'
    );
    
    // After last request
    const afterLast = await this.service.sendMessage('question_hint', 'test', createMockContext());
    this.addResult(
      'Quota Edge Cases',
      'Blocks after last',
      !afterLast.success,
      'Son istekten sonra engelleme'
    );
  }
  
  // Generate Report
  generateReport(): ReadinessReport {
    const passedCount = this.results.filter(r => r.passed).length;
    const failedCount = this.results.filter(r => !r.passed).length;
    const criticalFailures = this.results.filter(r => !r.passed && r.critical).length;
    
    return {
      ready: criticalFailures === 0,
      passedCount,
      failedCount,
      criticalFailures,
      checks: this.results,
      timestamp: new Date(),
    };
  }
  
  // Run all checks
  async runAllChecks(): Promise<ReadinessReport> {
    this.results = [];
    
    await this.checkAPIContracts();
    await this.checkErrorHandling();
    await this.checkStateManagement();
    await this.checkFeatureCoverage();
    await this.checkStreaming();
    await this.checkQuotaEdgeCases();
    
    return this.generateReport();
  }
}

// =============================================================================
// READINESS TESTS
// =============================================================================

describe('AI Frontend Readiness', () => {
  let checker: AIFrontendReadinessChecker;
  
  beforeEach(() => {
    checker = new AIFrontendReadinessChecker();
  });
  
  describe('Full Readiness Check', () => {
    it('should pass all readiness checks', async () => {
      const report = await checker.runAllChecks();
      
      console.log('\n📋 AI Frontend Readiness Report');
      console.log('================================');
      console.log(`✅ Passed: ${report.passedCount}`);
      console.log(`❌ Failed: ${report.failedCount}`);
      console.log(`🚨 Critical Failures: ${report.criticalFailures}`);
      console.log(`\n🎯 Ready for Production: ${report.ready ? 'YES' : 'NO'}`);
      console.log('\nDetailed Results:');
      
      const grouped = report.checks.reduce((acc, check) => {
        acc[check.category] = acc[check.category] || [];
        acc[check.category].push(check);
        return acc;
      }, {} as Record<string, ReadinessCheckResult[]>);
      
      Object.entries(grouped).forEach(([category, checks]) => {
        console.log(`\n  ${category}:`);
        checks.forEach(check => {
          const icon = check.passed ? '✓' : '✗';
          const critical = check.critical ? ' [CRITICAL]' : '';
          console.log(`    ${icon} ${check.check}${critical}`);
        });
      });
      
      expect(report.ready).toBe(true);
      expect(report.criticalFailures).toBe(0);
    });
  });
  
  describe('API Contract Verification', () => {
    it('should verify sendMessage contract', async () => {
      await checker.checkAPIContracts();
      const report = checker.generateReport();
      
      const contractChecks = report.checks.filter(c => c.category === 'API Contract');
      expect(contractChecks.every(c => c.passed)).toBe(true);
    });
  });
  
  describe('Error Handling Verification', () => {
    it('should verify all error types are handled', async () => {
      await checker.checkErrorHandling();
      const report = checker.generateReport();
      
      const errorChecks = report.checks.filter(c => c.category === 'Error Handling');
      expect(errorChecks.length).toBeGreaterThanOrEqual(5);
      expect(errorChecks.every(c => c.passed)).toBe(true);
    });
  });
  
  describe('Feature Coverage Verification', () => {
    it('should verify all features work', async () => {
      await checker.checkFeatureCoverage();
      const report = checker.generateReport();
      
      const featureChecks = report.checks.filter(c => c.category === 'Feature Coverage');
      expect(featureChecks.length).toBe(8); // All 8 features
      expect(featureChecks.every(c => c.passed)).toBe(true);
    });
  });
});

// =============================================================================
// PRODUCTION READINESS CHECKLIST
// =============================================================================

describe('Production Readiness Checklist', () => {
  it('✓ Mock service implements full IAIService interface', async () => {
    const service = createTestService();
    
    expect(typeof service.sendMessage).toBe('function');
    expect(typeof service.streamMessage).toBe('function');
    expect(typeof service.getHint).toBe('function');
    expect(typeof service.getQuota).toBe('function');
    expect(typeof service.submitFeedback).toBe('function');
    expect(typeof service.checkHealth).toBe('function');
  });
  
  it('✓ All error types have user-friendly messages', () => {
    const errors = TEST_SCENARIOS.ERRORS;
    
    Object.values(errors).forEach(errorResponse => {
      expect(errorResponse.error?.userMessage).toBeTruthy();
      expect(errorResponse.error?.userMessage.length).toBeGreaterThan(5);
    });
  });
  
  it('✓ Quota status includes all required fields', () => {
    const quota = createMockQuota();
    
    expect(quota.feature).toBeDefined();
    expect(quota.used).toBeDefined();
    expect(quota.limit).toBeDefined();
    expect(quota.resetAt).toBeDefined();
    expect(quota.unit).toBeDefined();
    expect(quota.isUnlimited).toBeDefined();
  });
  
  it('✓ Messages include metadata', async () => {
    const service = createTestService();
    const result = await service.sendMessage(
      'question_hint',
      'test',
      createMockContext()
    );
    
    expect(result.data?.metadata).toBeDefined();
    expect(result.data?.metadata?.feature).toBeDefined();
  });
  
  it('✓ Context is properly passed through', async () => {
    const service = createTestService();
    const context = createMockContext({
      lessonId: 123,
      questionId: 999,
      topicId: 888,
    });
    
    await service.sendMessage('question_hint', 'test', context);
    
    expect(service.wasCalledWith('sendMessage', (args) =>
      args[2].lessonId === 123 &&
      args[2].questionId === 999
    )).toBe(true);
  });
  
  it('✓ Service can be reset for clean test state', () => {
    const service = createTestService();
    service.setQuotaUsed(15);
    
    service.reset();
    
    expect(service.getCallCount()).toBe(0);
  });
  
  it('✓ Responses can be queued for specific scenarios', async () => {
    const service = createTestService();
    service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.networkError);
    
    const result = await service.sendMessage('question_hint', 'test', createMockContext());
    
    expect(result.error?.code).toBe('NETWORK_ERROR');
  });
});

// =============================================================================
// EXPORT CHECKER FOR MANUAL USE
// =============================================================================

export { AIFrontendReadinessChecker, type ReadinessReport, type ReadinessCheckResult };
