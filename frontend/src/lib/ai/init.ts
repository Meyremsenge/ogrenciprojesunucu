/**
 * AI Service Initialization & Configuration
 * 
 * Uygulama başlangıcında AI servislerini yapılandırır.
 * Environment-based configuration ile Mock/Real API switching sağlar.
 */

import { setAIService } from './services/aiService';
import { EnhancedAPIAdapter } from './adapters/enhancedApiAdapter';
import { MockAdapter } from './adapters/mockAdapter';

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

export interface AIEnvironmentConfig {
  /** Use mock adapter instead of real API */
  useMock: boolean;
  /** API base URL */
  apiBaseUrl: string;
  /** Request timeout in ms */
  timeout: number;
  /** Max retry attempts */
  maxRetries: number;
  /** Enable debug logging */
  enableLogging: boolean;
}

function getEnvironmentConfig(): AIEnvironmentConfig {
  const isDev = import.meta.env.DEV;
  const useMock = import.meta.env.VITE_AI_USE_MOCK === 'true' || 
                  (isDev && !import.meta.env.VITE_AI_API_URL);
  
  return {
    useMock,
    apiBaseUrl: import.meta.env.VITE_AI_API_URL || '/api/v1/ai',
    timeout: parseInt(import.meta.env.VITE_AI_TIMEOUT || '30000', 10),
    maxRetries: parseInt(import.meta.env.VITE_AI_MAX_RETRIES || '3', 10),
    enableLogging: isDev || import.meta.env.VITE_AI_ENABLE_LOGGING === 'true',
  };
}

// =============================================================================
// AUTH TOKEN MANAGEMENT
// =============================================================================

let authTokenGetter: () => string | null = () => null;

/**
 * Set the function to retrieve auth token
 * This should be called during app initialization
 */
export function setAuthTokenGetter(getter: () => string | null): void {
  authTokenGetter = getter;
}

/**
 * Get current auth token
 */
export function getAuthToken(): string | null {
  return authTokenGetter();
}

// =============================================================================
// ERROR HANDLERS
// =============================================================================

let onAuthErrorHandler: (() => void) | undefined;
let onQuotaExceededHandler: (() => void) | undefined;

/**
 * Set handler for authentication errors (401)
 */
export function setOnAuthError(handler: () => void): void {
  onAuthErrorHandler = handler;
}

/**
 * Set handler for quota exceeded errors
 */
export function setOnQuotaExceeded(handler: () => void): void {
  onQuotaExceededHandler = handler;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

let isInitialized = false;

export interface AIInitOptions {
  /** Override environment config */
  config?: Partial<AIEnvironmentConfig>;
  /** Auth token getter function */
  getAuthToken?: () => string | null;
  /** Handler for auth errors */
  onAuthError?: () => void;
  /** Handler for quota exceeded */
  onQuotaExceeded?: () => void;
}

/**
 * Initialize AI services
 * 
 * Call this during app startup, typically in main.tsx or App.tsx
 * 
 * @example
 * ```tsx
 * // In main.tsx or App.tsx
 * import { initializeAI } from '@/lib/ai';
 * import { useAuthStore } from '@/stores/authStore';
 * 
 * initializeAI({
 *   getAuthToken: () => useAuthStore.getState().token,
 *   onAuthError: () => useAuthStore.getState().logout(),
 * });
 * ```
 */
export function initializeAI(options: AIInitOptions = {}): void {
  if (isInitialized) {
    console.warn('[AI] Already initialized. Skipping re-initialization.');
    return;
  }
  
  const envConfig = getEnvironmentConfig();
  const config = { ...envConfig, ...options.config };
  
  // Set auth token getter
  if (options.getAuthToken) {
    setAuthTokenGetter(options.getAuthToken);
  }
  
  // Set error handlers
  if (options.onAuthError) {
    setOnAuthError(options.onAuthError);
  }
  if (options.onQuotaExceeded) {
    setOnQuotaExceeded(options.onQuotaExceeded);
  }
  
  // Create appropriate adapter
  let adapter;
  
  if (config.useMock) {
    console.log('[AI] Using Mock Adapter (development mode)');
    adapter = new MockAdapter();
  } else {
    console.log('[AI] Using Enhanced API Adapter');
    adapter = new EnhancedAPIAdapter(
      {
        baseUrl: config.apiBaseUrl,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
        enableLogging: config.enableLogging,
        onAuthError: onAuthErrorHandler,
        onQuotaExceeded: onQuotaExceededHandler,
      },
      authTokenGetter
    );
  }
  
  // Register the adapter globally
  setAIService(adapter);
  
  isInitialized = true;
  console.log('[AI] Initialization complete');
}

/**
 * Check if AI services are initialized
 */
export function isAIInitialized(): boolean {
  return isInitialized;
}

/**
 * Reset AI services (for testing)
 */
export function resetAI(): void {
  isInitialized = false;
  authTokenGetter = () => null;
  onAuthErrorHandler = undefined;
  onQuotaExceededHandler = undefined;
}
