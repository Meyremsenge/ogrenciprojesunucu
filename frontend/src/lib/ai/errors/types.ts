/**
 * AI Error Types & Classification
 * 
 * Profesyonel AI hata sınıflandırması.
 * UX için hata türlerini kategorize eder.
 */

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * AI Error Code Categories
 */
export const AI_ERROR_CODES = {
  // Quota & Rate Limiting
  QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  QUOTA_DAILY_LIMIT: 'AI_QUOTA_DAILY_LIMIT',
  QUOTA_FEATURE_LIMIT: 'AI_QUOTA_FEATURE_LIMIT',
  RATE_LIMITED: 'AI_RATE_LIMITED',
  
  // Network Errors
  NETWORK_ERROR: 'AI_NETWORK_ERROR',
  TIMEOUT: 'AI_TIMEOUT',
  CONNECTION_REFUSED: 'AI_CONNECTION_REFUSED',
  
  // Backend AI Errors
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  AI_MODEL_OVERLOADED: 'AI_MODEL_OVERLOADED',
  AI_RESPONSE_INVALID: 'AI_RESPONSE_INVALID',
  AI_CONTENT_FILTERED: 'AI_CONTENT_FILTERED',
  
  // Request Errors
  INVALID_REQUEST: 'AI_INVALID_REQUEST',
  CONTEXT_TOO_LARGE: 'AI_CONTEXT_TOO_LARGE',
  UNAUTHORIZED: 'AI_UNAUTHORIZED',
  FORBIDDEN: 'AI_FORBIDDEN',
  
  // Response Issues
  EMPTY_RESPONSE: 'AI_EMPTY_RESPONSE',
  PARTIAL_RESPONSE: 'AI_PARTIAL_RESPONSE',
  PARSING_ERROR: 'AI_PARSING_ERROR',
  
  // Unknown
  UNKNOWN: 'AI_UNKNOWN_ERROR',
} as const;

export type AIErrorCode = typeof AI_ERROR_CODES[keyof typeof AI_ERROR_CODES];

// =============================================================================
// ERROR CATEGORIES
// =============================================================================

/**
 * Error Category - kullanıcı açısından anlam ifade eden gruplar
 */
export type AIErrorCategory = 
  | 'quota'        // Kota/limit sorunları
  | 'network'      // Bağlantı sorunları
  | 'service'      // AI servisi sorunları
  | 'temporary'    // Geçici sorunlar (retry yapılabilir)
  | 'permanent'    // Kalıcı sorunlar
  | 'content'      // İçerik sorunları
  | 'unknown';     // Bilinmeyen

/**
 * Error Severity - UX'te nasıl gösterileceğini belirler
 */
export type AIErrorSeverity = 
  | 'info'         // Bilgilendirme
  | 'warning'      // Uyarı (devam edilebilir)
  | 'error'        // Hata (işlem başarısız)
  | 'critical';    // Kritik (sistem kullanılamaz)

// =============================================================================
// ERROR INTERFACE
// =============================================================================

/**
 * Structured AI Error
 */
export interface AIError {
  /** Unique error code */
  code: AIErrorCode;
  /** Error category */
  category: AIErrorCategory;
  /** Error severity */
  severity: AIErrorSeverity;
  /** Technical error message (for logging) */
  technicalMessage: string;
  /** User-friendly message */
  userMessage: string;
  /** User-friendly title */
  userTitle: string;
  /** Suggested action for user */
  suggestedAction?: string;
  /** Is this error retryable? */
  retryable: boolean;
  /** Retry delay in ms (if retryable) */
  retryAfter?: number;
  /** Original error (for debugging) */
  originalError?: unknown;
  /** Timestamp */
  timestamp: number;
  /** Request ID (for support) */
  requestId?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

interface ErrorClassification {
  category: AIErrorCategory;
  severity: AIErrorSeverity;
  retryable: boolean;
  retryAfter?: number;
}

/**
 * Error code to classification mapping
 */
export const ERROR_CLASSIFICATIONS: Record<AIErrorCode, ErrorClassification> = {
  // Quota errors - not retryable immediately
  [AI_ERROR_CODES.QUOTA_EXCEEDED]: {
    category: 'quota',
    severity: 'warning',
    retryable: false,
  },
  [AI_ERROR_CODES.QUOTA_DAILY_LIMIT]: {
    category: 'quota',
    severity: 'warning',
    retryable: false,
  },
  [AI_ERROR_CODES.QUOTA_FEATURE_LIMIT]: {
    category: 'quota',
    severity: 'warning',
    retryable: false,
  },
  [AI_ERROR_CODES.RATE_LIMITED]: {
    category: 'quota',
    severity: 'info',
    retryable: true,
    retryAfter: 5000, // 5 seconds
  },
  
  // Network errors - usually retryable
  [AI_ERROR_CODES.NETWORK_ERROR]: {
    category: 'network',
    severity: 'error',
    retryable: true,
    retryAfter: 3000,
  },
  [AI_ERROR_CODES.TIMEOUT]: {
    category: 'network',
    severity: 'warning',
    retryable: true,
    retryAfter: 5000,
  },
  [AI_ERROR_CODES.CONNECTION_REFUSED]: {
    category: 'network',
    severity: 'error',
    retryable: true,
    retryAfter: 10000,
  },
  
  // Service errors - might be retryable
  [AI_ERROR_CODES.AI_SERVICE_UNAVAILABLE]: {
    category: 'service',
    severity: 'error',
    retryable: true,
    retryAfter: 30000,
  },
  [AI_ERROR_CODES.AI_PROVIDER_ERROR]: {
    category: 'service',
    severity: 'error',
    retryable: true,
    retryAfter: 10000,
  },
  [AI_ERROR_CODES.AI_MODEL_OVERLOADED]: {
    category: 'temporary',
    severity: 'warning',
    retryable: true,
    retryAfter: 15000,
  },
  [AI_ERROR_CODES.AI_RESPONSE_INVALID]: {
    category: 'service',
    severity: 'error',
    retryable: true,
    retryAfter: 3000,
  },
  [AI_ERROR_CODES.AI_CONTENT_FILTERED]: {
    category: 'content',
    severity: 'info',
    retryable: false,
  },
  
  // Request errors - usually not retryable
  [AI_ERROR_CODES.INVALID_REQUEST]: {
    category: 'permanent',
    severity: 'error',
    retryable: false,
  },
  [AI_ERROR_CODES.CONTEXT_TOO_LARGE]: {
    category: 'permanent',
    severity: 'warning',
    retryable: false,
  },
  [AI_ERROR_CODES.UNAUTHORIZED]: {
    category: 'permanent',
    severity: 'error',
    retryable: false,
  },
  [AI_ERROR_CODES.FORBIDDEN]: {
    category: 'permanent',
    severity: 'error',
    retryable: false,
  },
  
  // Response issues - might be retryable
  [AI_ERROR_CODES.EMPTY_RESPONSE]: {
    category: 'service',
    severity: 'warning',
    retryable: true,
    retryAfter: 3000,
  },
  [AI_ERROR_CODES.PARTIAL_RESPONSE]: {
    category: 'service',
    severity: 'info',
    retryable: true,
    retryAfter: 3000,
  },
  [AI_ERROR_CODES.PARSING_ERROR]: {
    category: 'service',
    severity: 'error',
    retryable: true,
    retryAfter: 3000,
  },
  
  // Unknown
  [AI_ERROR_CODES.UNKNOWN]: {
    category: 'unknown',
    severity: 'error',
    retryable: true,
    retryAfter: 5000,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get classification for an error code
 */
export function getErrorClassification(code: AIErrorCode): ErrorClassification {
  return ERROR_CLASSIFICATIONS[code] || ERROR_CLASSIFICATIONS[AI_ERROR_CODES.UNKNOWN];
}

/**
 * Check if error is quota related
 */
export function isQuotaError(error: AIError | AIErrorCode): boolean {
  const code = typeof error === 'string' ? error : error.code;
  return getErrorClassification(code).category === 'quota';
}

/**
 * Check if error is network related
 */
export function isNetworkError(error: AIError | AIErrorCode): boolean {
  const code = typeof error === 'string' ? error : error.code;
  return getErrorClassification(code).category === 'network';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AIError | AIErrorCode): boolean {
  const code = typeof error === 'string' ? error : error.code;
  return getErrorClassification(code).retryable;
}

/**
 * Check if error is severe
 */
export function isSevereError(error: AIError): boolean {
  return error.severity === 'error' || error.severity === 'critical';
}
