/**
 * API Contract - Frontend-Backend Sözleşme Modülü
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bu modül, frontend ve backend arasındaki iletişimi standartlaştırır.
 * Tutarlı API response handling, error messaging ve versioning sağlar.
 * 
 * MODÜL YAPISI:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 1. ApiContractTypes.ts - Tip tanımlamaları
 *    - ApiResponse, ApiErrorDetail, PaginatedResponse
 *    - Type guards: isSuccessResponse, isErrorResponse
 * 
 * 2. ErrorCodeMessages.tsx - Hata kodu → kullanıcı mesajı
 *    - ERROR_MESSAGES: Tüm hata kodları için Türkçe mesajlar
 *    - ErrorDisplay: Hata görüntüleme komponenti
 * 
 * 3. StatusCodeUX.tsx - HTTP status code → UX aksiyonu
 *    - STATUS_CODE_UX: Her status code için UX konfigürasyonu
 *    - useStatusCodeHandler: Status code handler hook
 * 
 * 4. ApiResponseHandler.tsx - Yanıt işleme katmanı
 *    - processApiResponse: Yanıt standardizasyonu
 *    - fetchWithRetry: Retry mantığı
 *    - DataWrapper: Loading/error/empty state yönetimi
 * 
 * 5. ApiVersioning.tsx - Versiyon yönetimi
 *    - VersionProvider: Versiyon context
 *    - UpdateRequiredBanner: Güncelleme bildirimi
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Base types
  ApiResponse,
  ApiMeta,
  PaginationMeta,
  CursorMeta,
  PaginatedResponse,
  CursorPaginatedResponse,
  
  // Error types
  ApiErrorDetail,
  FieldError,
  ApiErrorCode,
  
  // Cache & Rate Limit
  CacheMeta,
  RateLimitMeta,
  
  // Versioning
  DeprecationMeta,
  ApiVersion,
  
  // Request types
  PaginationParams,
  CursorParams,
  FilterParams,
  BulkOperationRequest,
  BulkOperationResponse,
  
  // Async operations
  AsyncOperationStatus,
  AsyncOperationResponse,
  
  // Utility types
  Identifiable,
  Timestamped,
  SoftDeletable,
  Versionable,
  Auditable,
  FullResource,
} from './ApiContractTypes';

export {
  // Type guards
  isSuccessResponse,
  isErrorResponse,
  isPaginatedResponse,
  hasFieldErrors,
} from './ApiContractTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ ERROR MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ErrorMessage,
} from './ErrorCodeMessages';

export {
  // Constants
  ERROR_MESSAGES,
  FIELD_ERROR_MESSAGES,
  
  // Utilities
  getErrorMessage,
  formatErrorForUser,
  formatFieldError,
  fieldErrorsToObject,
  formatFieldPath,
  
  // Context & Hooks
  ErrorMessageProvider,
  useErrorMessages,
  
  // Components
  ErrorDisplay,
  FieldErrorText,
  ErrorToast,
} from './ErrorCodeMessages';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 STATUS CODE UX
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  StatusCodeCategory,
  UXAction,
  StatusCodeUXConfig,
} from './StatusCodeUX';

export {
  // Constants
  STATUS_CODE_UX,
  
  // Utilities
  getStatusCodeUX,
  getStatusCategory,
  isSuccessStatus,
  isRetryable,
  calculateRetryDelay,
  
  // Hooks
  useStatusCodeHandler,
  useRateLimitHandler,
  useAutoRetry,
  
  // Components
  StatusCodeIndicator,
  RateLimitWarning,
  RetryCountdown,
} from './StatusCodeUX';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 RESPONSE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ResponseHandlerConfig,
  RequestOptions,
  ProcessedResponse,
} from './ApiResponseHandler';

export {
  // Utilities
  processApiResponse,
  extractRateLimitFromHeaders,
  createNetworkError,
  statusCodeToErrorCode,
  fetchWithRetry,
  
  // Cache
  responseCache,
  
  // Context & Hooks
  ResponseHandlerProvider,
  useResponseHandler,
  useApiCall,
  useAsyncOperation,
  
  // Components
  LoadingState,
  EmptyState,
  AsyncOperationProgress,
  DataWrapper,
} from './ApiResponseHandler';

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 VERSIONING
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  VersionComparison,
  CompatibilityStatus,
  ServerVersionInfo,
  BreakingChange,
  MaintenanceWindow,
} from './ApiVersioning';

export {
  // Utilities
  parseVersion,
  formatVersion,
  compareVersions,
  isVersionCompatible,
  getCompatibilityStatus,
  shouldShowDeprecationWarning,
  getDeprecationUrgency,
  createVersionHeaders,
  extractVersionFromHeaders,
  
  // Context & Hooks
  VersionProvider,
  useVersion,
  
  // Components
  UpdateRequiredBanner,
  DeprecationWarning,
  MaintenanceAlert,
  VersionInfo,
} from './ApiVersioning';
