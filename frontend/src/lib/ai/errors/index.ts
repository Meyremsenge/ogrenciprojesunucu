/**
 * AI Error UX Module
 * 
 * Profesyonel AI hata ve limit senaryoları için UX sistemi.
 * 
 * ÖZELLİKLER:
 * ===========
 * 1. Kota dolduğunda gösterilecek UX
 * 2. Backend AI hataları
 * 3. Network / timeout hataları
 * 4. AI cevap üretmediğinde fallback davranışı
 * 5. Kullanıcının AI'ye güvenini zedelemeyecek mesaj dili
 */

// =============================================================================
// TYPES
// =============================================================================

export {
  // Error Codes
  AI_ERROR_CODES,
  type AIErrorCode,
  
  // Error Categories
  type AIErrorCategory,
  type AIErrorSeverity,
  
  // Error Interface
  type AIError,
  
  // Classification
  ERROR_CLASSIFICATIONS,
  getErrorClassification,
  
  // Type Guards
  isQuotaError,
  isNetworkError,
  isRetryableError,
  isSevereError,
} from './types';

// =============================================================================
// MESSAGES
// =============================================================================

export {
  // Message Templates
  ERROR_MESSAGES,
  
  // Factory Functions
  createAIError,
  httpStatusToErrorCode,
  parseError,
  
  // Display Helpers
  getErrorEmoji,
  getErrorTitle,
  getErrorMessage,
  getSuggestedAction,
  formatErrorForLogging,
} from './messages';

// =============================================================================
// UI COMPONENTS
// =============================================================================

// Error Display
export {
  AIErrorDisplay,
  AIInlineError,
  AIErrorModal,
  createErrorToast,
  type AIErrorDisplayProps,
  type AIInlineErrorProps,
  type AIErrorModalProps,
  type AIErrorToastConfig,
} from './AIErrorDisplay';

// Quota UI
export {
  AIQuotaIndicator,
  AIQuotaWarning,
  AIQuotaExhausted,
  AIQuotaBadge,
  AIQuotaTooltip,
  type QuotaInfo,
  type AIQuotaIndicatorProps,
  type AIQuotaWarningProps,
  type AIQuotaExhaustedProps,
  type AIQuotaBadgeProps,
  type AIQuotaTooltipProps,
} from './AIQuotaUI';

// Fallback UI
export {
  AIFallback,
  AISkeletonFallback,
  AIThinkingIndicator,
  AIHintFallback,
  type FallbackReason,
  type FallbackAction,
  type AIFallbackProps,
  type AISkeletonFallbackProps,
  type AIThinkingIndicatorProps,
  type AIHintFallbackProps,
} from './AIFallback';

// Error Boundary
export {
  AIErrorBoundary,
  withAIErrorBoundary,
  type AIErrorBoundaryProps,
} from './AIErrorBoundary';

// =============================================================================
// HOOKS
// =============================================================================

export {
  useAIError,
  useQuotaError,
  useNetworkError,
  createErrorHandler,
  type UseAIErrorOptions,
  type UseAIErrorReturn,
} from './useAIError';
