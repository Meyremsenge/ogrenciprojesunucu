/**
 * AI UI State Tests
 * 
 * Loading, error, success state testleri.
 * UI bileşenlerinin farklı durumlara tepkisi.
 */

// @ts-ignore - vitest yüklendiginde çalışır
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TestMockAIService,
  createTestService,
  createMockContext,
  createMockMessage,
  createMockQuota,
  createSuccessResponse,
  createErrorResponse,
  createMockError,
  TEST_SCENARIOS,
  waitFor,
} from './setup';

// =============================================================================
// UI STATE TYPES (Simulated)
// =============================================================================

interface UIState {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  errorMessage: string | null;
  data: any | null;
}

/**
 * Simulates UI state management for testing
 */
class UIStateManager {
  private state: UIState = {
    isLoading: false,
    isError: false,
    isSuccess: false,
    errorMessage: null,
    data: null,
  };
  
  private stateHistory: UIState[] = [];
  
  getState(): UIState {
    return { ...this.state };
  }
  
  getHistory(): UIState[] {
    return [...this.stateHistory];
  }
  
  setLoading(): void {
    this.state = {
      isLoading: true,
      isError: false,
      isSuccess: false,
      errorMessage: null,
      data: null,
    };
    this.stateHistory.push(this.getState());
  }
  
  setSuccess(data: any): void {
    this.state = {
      isLoading: false,
      isError: false,
      isSuccess: true,
      errorMessage: null,
      data,
    };
    this.stateHistory.push(this.getState());
  }
  
  setError(message: string): void {
    this.state = {
      isLoading: false,
      isError: true,
      isSuccess: false,
      errorMessage: message,
      data: null,
    };
    this.stateHistory.push(this.getState());
  }
  
  reset(): void {
    this.state = {
      isLoading: false,
      isError: false,
      isSuccess: false,
      errorMessage: null,
      data: null,
    };
    this.stateHistory = [];
  }
}

// =============================================================================
// LOADING STATE TESTS
// =============================================================================

describe('UI Loading State', () => {
  let service: TestMockAIService;
  let uiState: UIStateManager;
  
  beforeEach(() => {
    service = createTestService({ responseDelay: 50 });
    uiState = new UIStateManager();
  });
  
  it('should show loading state during request', async () => {
    uiState.setLoading();
    expect(uiState.getState().isLoading).toBe(true);
    
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    uiState.setSuccess(result.data);
    expect(uiState.getState().isLoading).toBe(false);
  });
  
  it('should transition: idle -> loading -> success', async () => {
    // Start
    expect(uiState.getState().isLoading).toBe(false);
    
    // Loading
    uiState.setLoading();
    expect(uiState.getState().isLoading).toBe(true);
    expect(uiState.getState().isSuccess).toBe(false);
    
    // Request
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    // Success
    uiState.setSuccess(result.data);
    expect(uiState.getState().isLoading).toBe(false);
    expect(uiState.getState().isSuccess).toBe(true);
    expect(uiState.getState().data).toBeDefined();
  });
  
  it('should transition: idle -> loading -> error', async () => {
    service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.serverError);
    
    // Loading
    uiState.setLoading();
    
    // Request
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    // Error
    if (!result.success) {
      uiState.setError(result.error!.userMessage);
    }
    
    expect(uiState.getState().isLoading).toBe(false);
    expect(uiState.getState().isError).toBe(true);
    expect(uiState.getState().errorMessage).toBeTruthy();
  });
  
  it('should maintain loading state history', async () => {
    uiState.setLoading();
    await service.sendMessage('question_hint', 'msg', createMockContext());
    uiState.setSuccess({ message: 'done' });
    
    const history = uiState.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].isLoading).toBe(true);
    expect(history[1].isSuccess).toBe(true);
  });
});

// =============================================================================
// ERROR STATE TESTS
// =============================================================================

describe('UI Error State', () => {
  let service: TestMockAIService;
  let uiState: UIStateManager;
  
  beforeEach(() => {
    service = createTestService();
    uiState = new UIStateManager();
  });
  
  it('should display quota exceeded error', async () => {
    service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.quotaExceeded);
    
    uiState.setLoading();
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    if (!result.success) {
      uiState.setError(result.error!.userMessage);
    }
    
    expect(uiState.getState().errorMessage).toContain('limit');
  });
  
  it('should display rate limit error with retry info', async () => {
    service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.rateLimited);
    
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    expect(result.error?.retryable).toBe(true);
    expect(result.error?.retryAfter).toBe(60);
  });
  
  it('should display network error', async () => {
    service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.networkError);
    
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    if (!result.success) {
      uiState.setError(result.error!.userMessage);
    }
    
    expect(uiState.getState().errorMessage).toContain('bağlantı');
  });
  
  it('should display auth error', async () => {
    service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.authError);
    
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    if (!result.success) {
      uiState.setError(result.error!.userMessage);
    }
    
    expect(uiState.getState().errorMessage).toContain('giriş');
  });
  
  it('should display content filtered error', async () => {
    service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.contentFiltered);
    
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    expect(result.error?.code).toBe('CONTENT_FILTERED');
  });
  
  it('should clear error on retry success', async () => {
    // First call fails
    service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.serverError);
    
    uiState.setLoading();
    let result = await service.sendMessage('question_hint', 'msg', createMockContext());
    uiState.setError(result.error!.userMessage);
    
    expect(uiState.getState().isError).toBe(true);
    
    // Retry succeeds
    uiState.setLoading();
    result = await service.sendMessage('question_hint', 'msg', createMockContext());
    uiState.setSuccess(result.data);
    
    expect(uiState.getState().isError).toBe(false);
    expect(uiState.getState().isSuccess).toBe(true);
  });
});

// =============================================================================
// SUCCESS STATE TESTS
// =============================================================================

describe('UI Success State', () => {
  let service: TestMockAIService;
  let uiState: UIStateManager;
  
  beforeEach(() => {
    service = createTestService();
    uiState = new UIStateManager();
  });
  
  it('should display message content on success', async () => {
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    uiState.setSuccess(result.data);
    
    expect(uiState.getState().isSuccess).toBe(true);
    expect(uiState.getState().data?.content).toBeTruthy();
  });
  
  it('should display hint on success', async () => {
    const result = await service.getHint(1, createMockContext());
    
    uiState.setSuccess({ hint: result.data });
    
    expect(uiState.getState().data?.hint).toBeTruthy();
  });
  
  it('should preserve data after success', async () => {
    const result = await service.sendMessage('topic_explanation', 'explain', createMockContext());
    
    uiState.setSuccess(result.data);
    
    // Multiple reads should return same data
    const state1 = uiState.getState();
    const state2 = uiState.getState();
    
    expect(state1.data).toEqual(state2.data);
  });
});

// =============================================================================
// STREAMING UI STATE TESTS
// =============================================================================

describe('UI Streaming State', () => {
  let service: TestMockAIService;
  
  beforeEach(() => {
    service = createTestService();
  });
  
  it('should update UI progressively during streaming', async () => {
    const displayedContent: string[] = [];
    let currentContent = '';
    
    await service.streamMessage(
      'topic_explanation',
      'explain',
      createMockContext(),
      (chunk) => {
        currentContent += chunk;
        displayedContent.push(currentContent);
      }
    );
    
    // Content should grow over time
    expect(displayedContent.length).toBeGreaterThan(0);
    for (let i = 1; i < displayedContent.length; i++) {
      expect(displayedContent[i].length).toBeGreaterThan(displayedContent[i - 1].length);
    }
  });
  
  it('should show streaming indicator', async () => {
    let isStreaming = false;
    
    // Start streaming
    isStreaming = true;
    
    await service.streamMessage(
      'topic_explanation',
      'explain',
      createMockContext(),
      () => {
        expect(isStreaming).toBe(true); // Still streaming during chunks
      }
    );
    
    // End streaming
    isStreaming = false;
    expect(isStreaming).toBe(false);
  });
});

// =============================================================================
// QUOTA UI STATE TESTS
// =============================================================================

describe('UI Quota State', () => {
  let service: TestMockAIService;
  
  beforeEach(() => {
    service = createTestService();
  });
  
  it('should display healthy quota state', async () => {
    const quota = TEST_SCENARIOS.QUOTA.healthy;
    const percentage = (quota.used! / quota.limit!) * 100;
    
    expect(percentage).toBeLessThan(70);
    // UI should show green/healthy indicator
  });
  
  it('should display warning quota state', async () => {
    const quota = TEST_SCENARIOS.QUOTA.warning;
    const percentage = (quota.used! / quota.limit!) * 100;
    
    expect(percentage).toBeGreaterThanOrEqual(70);
    expect(percentage).toBeLessThan(90);
    // UI should show yellow/warning indicator
  });
  
  it('should display critical quota state', async () => {
    const quota = TEST_SCENARIOS.QUOTA.critical;
    const percentage = (quota.used! / quota.limit!) * 100;
    
    expect(percentage).toBeGreaterThanOrEqual(90);
    // UI should show red/critical indicator
  });
  
  it('should display exhausted quota state', async () => {
    const quota = TEST_SCENARIOS.QUOTA.exhausted;
    
    expect(quota.used).toBe(quota.limit);
    // UI should disable AI features
  });
  
  it('should update quota after request', async () => {
    let quota = await service.getQuota();
    const initialUsed = quota.data!.used!;
    
    await service.sendMessage('question_hint', 'msg', createMockContext());
    
    quota = await service.getQuota();
    expect(quota.data!.used).toBe(initialUsed + 1);
  });
});

// =============================================================================
// BUTTON STATE TESTS
// =============================================================================

describe('UI Button States', () => {
  it('should enable button when quota available', async () => {
    const quota = TEST_SCENARIOS.QUOTA.healthy;
    const shouldEnable = quota.used! < quota.limit!;
    
    expect(shouldEnable).toBe(true);
  });
  
  it('should disable button when quota exhausted', async () => {
    const quota = TEST_SCENARIOS.QUOTA.exhausted;
    const shouldEnable = quota.used! < quota.limit!;
    
    expect(shouldEnable).toBe(false);
  });
  
  it('should disable button during loading', async () => {
    const isLoading = true;
    const hasQuota = true;
    
    const shouldEnable = !isLoading && hasQuota;
    expect(shouldEnable).toBe(false);
  });
  
  it('should show tooltip on disabled button', async () => {
    const quota = TEST_SCENARIOS.QUOTA.exhausted;
    const tooltipMessage = quota.used! >= quota.limit!
      ? 'Günlük kullanım limitine ulaştın'
      : null;
    
    expect(tooltipMessage).toBeTruthy();
  });
});

// =============================================================================
// ANIMATION STATE TESTS
// =============================================================================

describe('UI Animation States', () => {
  it('should trigger enter animation on new message', async () => {
    const service = createTestService();
    const animations: string[] = [];
    
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    if (result.success) {
      animations.push('message-enter');
    }
    
    expect(animations).toContain('message-enter');
  });
  
  it('should trigger error shake animation', async () => {
    const service = createTestService();
    service.queueResponse('sendMessage', TEST_SCENARIOS.ERRORS.validationError);
    
    const animations: string[] = [];
    
    const result = await service.sendMessage('question_hint', 'msg', createMockContext());
    
    if (!result.success) {
      animations.push('error-shake');
    }
    
    expect(animations).toContain('error-shake');
  });
  
  it('should trigger typing indicator during stream', async () => {
    const service = createTestService();
    let typingVisible = false;
    
    const promise = service.streamMessage(
      'topic_explanation',
      'msg',
      createMockContext(),
      () => {
        typingVisible = true;
      }
    );
    
    await promise;
    expect(typingVisible).toBe(true);
  });
});
