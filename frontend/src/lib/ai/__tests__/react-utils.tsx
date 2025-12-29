/**
 * React Testing Utilities
 * 
 * React bileşenlerinin test edilmesi için yardımcı fonksiyonlar.
 * NOT: Bu dosya Vitest yüklendiğinde çalışır.
 */

import React, { ReactElement, ReactNode } from 'react';
// @ts-ignore - testing-library yüklendiğinde çalışır
import { render, RenderOptions, RenderResult } from '@testing-library/react';
// @ts-ignore - jest-dom matchers için
import '@testing-library/jest-dom';
// @ts-ignore - vitest yüklendiğinde çalışır
import { vi, expect } from 'vitest';

// =============================================================================
// MOCK PROVIDERS
// =============================================================================

interface MockAIContextValue {
  isEnabled: boolean;
  mode: 'mock' | 'real' | 'disabled';
  quota: {
    used: number;
    limit: number;
    remaining: number;
    resetAt: Date;
  };
  features: {
    chat: boolean;
    hint: boolean;
    explanation: boolean;
    streaming: boolean;
  };
}

const defaultAIContext: MockAIContextValue = {
  isEnabled: true,
  mode: 'mock',
  quota: {
    used: 5,
    limit: 50,
    remaining: 45,
    resetAt: new Date(Date.now() + 86400000),
  },
  features: {
    chat: true,
    hint: true,
    explanation: true,
    streaming: true,
  },
};

// Mock AI Context
const MockAIContext = React.createContext<MockAIContextValue>(defaultAIContext);

/**
 * Mock AI Provider
 */
interface MockAIProviderProps {
  children: ReactNode;
  value?: Partial<MockAIContextValue>;
}

export function MockAIProvider({ children, value = {} }: MockAIProviderProps) {
  const contextValue = {
    ...defaultAIContext,
    ...value,
  };
  
  return (
    <MockAIContext.Provider value={contextValue}>
      {children}
    </MockAIContext.Provider>
  );
}

// =============================================================================
// ALL PROVIDERS WRAPPER
// =============================================================================

interface AllProvidersProps {
  children: ReactNode;
  aiContext?: Partial<MockAIContextValue>;
}

/**
 * Tüm provider'ları saran wrapper
 */
export function AllProviders({ children, aiContext }: AllProvidersProps) {
  return (
    <MockAIProvider value={aiContext}>
      {children}
    </MockAIProvider>
  );
}

// =============================================================================
// CUSTOM RENDER
// =============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  aiContext?: Partial<MockAIContextValue>;
}

/**
 * Custom render fonksiyonu - provider'larla sarılmış render
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { aiContext, ...renderOptions } = options;
  
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AllProviders aiContext={aiContext}>
        {children}
      </AllProviders>
    );
  }
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// =============================================================================
// AI COMPONENT TESTING HELPERS
// =============================================================================

/**
 * AI bileşeni için loading state test helper
 */
export function testLoadingState(getByTestId: (id: string) => HTMLElement) {
  const loader = getByTestId('ai-loading');
  expect(loader).toBeInTheDocument();
  expect(loader).toHaveAttribute('aria-busy', 'true');
}

/**
 * AI bileşeni için error state test helper
 */
export function testErrorState(
  getByTestId: (id: string) => HTMLElement,
  getByRole: (role: string, options?: { name?: RegExp }) => HTMLElement
) {
  const error = getByTestId('ai-error');
  expect(error).toBeInTheDocument();
  
  // Retry button'u olmalı
  const retryButton = getByRole('button', { name: /tekrar dene/i });
  expect(retryButton).toBeInTheDocument();
}

/**
 * AI bileşeni için success state test helper
 */
export function testSuccessState(getByTestId: (id: string) => HTMLElement) {
  const content = getByTestId('ai-content');
  expect(content).toBeInTheDocument();
  expect(content.textContent).toBeTruthy();
}

// =============================================================================
// MOCK FUNCTIONS
// =============================================================================

/**
 * AI Service mock factory
 */
export function createMockAIService() {
  return {
    sendMessage: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'msg_123',
        content: 'Test yanıtı',
        role: 'assistant',
        createdAt: new Date(),
      },
    }),
    
    streamMessage: vi.fn().mockImplementation(
      async function* () {
        yield { content: 'Test', done: false };
        yield { content: ' yanıtı', done: true };
      }
    ),
    
    getHint: vi.fn().mockResolvedValue({
      success: true,
      data: {
        hint: 'Test ipucu',
        level: 1,
      },
    }),
    
    getQuota: vi.fn().mockResolvedValue({
      success: true,
      data: {
        used: 5,
        limit: 50,
        remaining: 45,
        resetAt: new Date(),
      },
    }),
    
    submitFeedback: vi.fn().mockResolvedValue({
      success: true,
    }),
    
    checkHealth: vi.fn().mockResolvedValue({
      healthy: true,
      latency: 100,
    }),
  };
}

/**
 * AI Store mock factory
 */
export function createMockAIStore() {
  return {
    messages: [],
    isLoading: false,
    error: null,
    quota: {
      used: 5,
      limit: 50,
      remaining: 45,
      resetAt: new Date(),
    },
    
    // Actions
    sendMessage: vi.fn(),
    addMessage: vi.fn(),
    clearMessages: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    clearError: vi.fn(),
    updateQuota: vi.fn(),
    reset: vi.fn(),
  };
}

// =============================================================================
// ASYNC TESTING HELPERS
// =============================================================================

/**
 * Belirtilen süre kadar bekle
 */
export function waitForMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Condition true olana kadar bekle
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition timed out');
    }
    await waitForMs(interval);
  }
}

/**
 * Element görünür olana kadar bekle
 */
export async function waitForElement(
  querySelector: () => HTMLElement | null,
  timeout = 5000
): Promise<HTMLElement> {
  const startTime = Date.now();
  
  while (true) {
    const element = querySelector();
    if (element) {
      return element;
    }
    
    if (Date.now() - startTime > timeout) {
      throw new Error('Element not found within timeout');
    }
    
    await waitForMs(50);
  }
}

// =============================================================================
// USER INTERACTION HELPERS
// =============================================================================

/**
 * Input değerini değiştir
 */
export function changeInputValue(
  input: HTMLInputElement,
  value: string
): void {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  }
  
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Enter tuşuna bas
 */
export function pressEnter(element: HTMLElement): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      bubbles: true,
    })
  );
}

/**
 * Escape tuşuna bas
 */
export function pressEscape(element: HTMLElement): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      bubbles: true,
    })
  );
}

// =============================================================================
// SNAPSHOT HELPERS
// =============================================================================

/**
 * AI mesaj listesi snapshot
 */
export function getMessagesSnapshot(container: HTMLElement) {
  const messages = container.querySelectorAll('[data-testid="ai-message"]');
  return Array.from(messages).map(msg => ({
    role: msg.getAttribute('data-role'),
    content: msg.textContent?.trim(),
  }));
}

/**
 * Quota display snapshot
 */
export function getQuotaSnapshot(container: HTMLElement) {
  const quota = container.querySelector('[data-testid="ai-quota"]');
  if (!quota) return null;
  
  return {
    used: quota.getAttribute('data-used'),
    limit: quota.getAttribute('data-limit'),
    percentage: quota.getAttribute('data-percentage'),
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { render };
// @ts-ignore - testing-library yüklendiğinde çalışır
export * from '@testing-library/react';
