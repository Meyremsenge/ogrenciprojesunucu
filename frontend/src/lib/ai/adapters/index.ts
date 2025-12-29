/**
 * AI Adapters - Barrel Export
 */

// Legacy adapters
export { APIAdapter } from './apiAdapter';
export { MockAdapter } from './mockAdapter';

// Enhanced adapter (production-ready)
export { 
  EnhancedAPIAdapter, 
  createEnhancedAPIAdapter,
  type EnhancedAPIAdapterConfig,
} from './enhancedApiAdapter';
