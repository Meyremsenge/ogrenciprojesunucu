/**
 * AI Library - Barrel Export
 * 
 * AI modülünün tek giriş noktası.
 * Tüm AI servisleri, hook'lar, bileşenler ve yardımcı fonksiyonlar buradan export edilir.
 */

// Initialization (call in main.tsx)
export {
  initializeAI,
  isAIInitialized,
  resetAI,
  setAuthTokenGetter,
  setOnAuthError,
  setOnQuotaExceeded,
  type AIInitOptions,
  type AIEnvironmentConfig,
} from './init';

// Core Services
export * from './services';
export * from './adapters';

// API Layer (contracts, normalizers)
export * from './api';

// State Management
export * from './state';

// Error UX System
export * from './errors';

// Provider
export { AIProvider, useAIContext } from './AIProvider';

// Hooks
export * from './hooks';

// Constants
export * from './constants';

// Utils
export * from './utils';

// Components
export * from './components';

// Security
export * from './security';

// Config & Feature Flags
export * from './config';
