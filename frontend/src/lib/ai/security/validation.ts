/**
 * AI Input Security - Validation & Limits
 * 
 * Kullanıcı input'larının sınırlandırılması ve doğrulanması.
 * 
 * GÜVENLİK ÖNLEMLERİ:
 * ===================
 * 1. Karakter limitleri (min/max)
 * 2. Token estimation
 * 3. Line/word limitleri
 * 4. Rate limiting desteği
 * 5. Content type validation
 */

// =============================================================================
// LIMIT CONSTANTS
// =============================================================================

/**
 * Input limits by feature type
 */
export const AI_INPUT_LIMITS = {
  // Chat messages
  chat: {
    minLength: 1,
    maxLength: 2000,
    maxTokens: 500,
    maxLines: 20,
    maxWords: 400,
  },
  
  // Question hints
  hint: {
    minLength: 5,
    maxLength: 1000,
    maxTokens: 250,
    maxLines: 10,
    maxWords: 200,
  },
  
  // Topic explanation requests
  explanation: {
    minLength: 3,
    maxLength: 500,
    maxTokens: 125,
    maxLines: 5,
    maxWords: 100,
  },
  
  // Answer for evaluation
  answer: {
    minLength: 1,
    maxLength: 5000,
    maxTokens: 1250,
    maxLines: 100,
    maxWords: 1000,
  },
  
  // Feedback messages
  feedback: {
    minLength: 10,
    maxLength: 1000,
    maxTokens: 250,
    maxLines: 10,
    maxWords: 200,
  },
  
  // Context data (not direct user input)
  context: {
    minLength: 0,
    maxLength: 10000,
    maxTokens: 2500,
    maxLines: 200,
    maxWords: 2000,
  },
  
  // Default fallback
  default: {
    minLength: 1,
    maxLength: 2000,
    maxTokens: 500,
    maxLines: 20,
    maxWords: 400,
  },
} as const;

export type AIInputType = keyof typeof AI_INPUT_LIMITS;

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface InputValidationResult {
  isValid: boolean;
  errors: InputValidationError[];
  warnings: InputValidationWarning[];
  sanitizedInput?: string;
  stats: InputStats;
}

export interface InputValidationError {
  code: InputErrorCode;
  message: string;
  field?: string;
}

export interface InputValidationWarning {
  code: InputWarningCode;
  message: string;
  suggestion?: string;
}

export interface InputStats {
  length: number;
  estimatedTokens: number;
  lineCount: number;
  wordCount: number;
  percentOfLimit: number;
}

export type InputErrorCode =
  | 'EMPTY_INPUT'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'TOO_MANY_TOKENS'
  | 'TOO_MANY_LINES'
  | 'TOO_MANY_WORDS'
  | 'INVALID_CHARACTERS'
  | 'CONTAINS_HTML'
  | 'CONTAINS_SCRIPT'
  | 'PROMPT_INJECTION'
  | 'CONTAINS_PII';

export type InputWarningCode =
  | 'APPROACHING_LIMIT'
  | 'POSSIBLE_PII'
  | 'SUSPICIOUS_PATTERN'
  | 'LOW_QUALITY_INPUT'
  | 'EXCESSIVE_PUNCTUATION'
  | 'ALL_CAPS';

// =============================================================================
// TOKEN ESTIMATION
// =============================================================================

/**
 * Estimate token count from text
 * Approximate: 1 token ≈ 4 characters for English, 2-3 for Turkish
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  // Turkish specific: shorter words, more characters per token
  // Using a conservative estimate of 3 chars per token
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  
  // Hybrid approach: average of char-based and word-based estimates
  const charBasedTokens = Math.ceil(charCount / 3);
  const wordBasedTokens = Math.ceil(wordCount * 1.3); // Most words are ~1.3 tokens
  
  return Math.ceil((charBasedTokens + wordBasedTokens) / 2);
}

/**
 * Get remaining token budget
 */
export function getRemainingTokens(
  currentInput: string,
  inputType: AIInputType = 'default'
): number {
  const limit = AI_INPUT_LIMITS[inputType]?.maxTokens ?? AI_INPUT_LIMITS.default.maxTokens;
  const used = estimateTokenCount(currentInput);
  return Math.max(0, limit - used);
}

// =============================================================================
// INPUT STATS
// =============================================================================

/**
 * Calculate input statistics
 */
export function calculateInputStats(
  input: string,
  inputType: AIInputType = 'default'
): InputStats {
  const limits = AI_INPUT_LIMITS[inputType] ?? AI_INPUT_LIMITS.default;
  
  const length = input.length;
  const estimatedTokens = estimateTokenCount(input);
  const lineCount = input.split('\n').length;
  const wordCount = input.split(/\s+/).filter(Boolean).length;
  const percentOfLimit = Math.round((length / limits.maxLength) * 100);
  
  return {
    length,
    estimatedTokens,
    lineCount,
    wordCount,
    percentOfLimit,
  };
}

// =============================================================================
// LENGTH VALIDATION
// =============================================================================

/**
 * Validate input length
 */
export function validateInputLength(
  input: string,
  inputType: AIInputType = 'default'
): { valid: boolean; errors: InputValidationError[] } {
  const errors: InputValidationError[] = [];
  const limits = AI_INPUT_LIMITS[inputType] ?? AI_INPUT_LIMITS.default;
  const stats = calculateInputStats(input, inputType);
  
  // Empty check
  if (!input || input.trim().length === 0) {
    errors.push({
      code: 'EMPTY_INPUT',
      message: 'Lütfen bir mesaj girin.',
    });
    return { valid: false, errors };
  }
  
  // Min length
  if (input.trim().length < limits.minLength) {
    errors.push({
      code: 'TOO_SHORT',
      message: `Mesaj en az ${limits.minLength} karakter olmalıdır.`,
    });
  }
  
  // Max length
  if (input.length > limits.maxLength) {
    errors.push({
      code: 'TOO_LONG',
      message: `Mesaj en fazla ${limits.maxLength} karakter olabilir. (${input.length}/${limits.maxLength})`,
    });
  }
  
  // Token limit
  if (stats.estimatedTokens > limits.maxTokens) {
    errors.push({
      code: 'TOO_MANY_TOKENS',
      message: `Mesaj çok uzun. Lütfen kısaltın.`,
    });
  }
  
  // Line limit
  if (stats.lineCount > limits.maxLines) {
    errors.push({
      code: 'TOO_MANY_LINES',
      message: `Maksimum ${limits.maxLines} satır girilebilir.`,
    });
  }
  
  // Word limit
  if (stats.wordCount > limits.maxWords) {
    errors.push({
      code: 'TOO_MANY_WORDS',
      message: `Maksimum ${limits.maxWords} kelime girilebilir.`,
    });
  }
  
  return { valid: errors.length === 0, errors };
}

// =============================================================================
// INPUT QUALITY CHECKS
// =============================================================================

/**
 * Check for input quality issues (warnings, not errors)
 */
export function checkInputQuality(input: string): InputValidationWarning[] {
  const warnings: InputValidationWarning[] = [];
  
  if (!input || input.trim().length === 0) return warnings;
  
  // All caps detection
  const alphaChars = input.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ]/g, '');
  if (alphaChars.length > 10 && alphaChars === alphaChars.toUpperCase()) {
    warnings.push({
      code: 'ALL_CAPS',
      message: 'Tamamı büyük harf yazmak yerine normal yazım kullanmanız önerilir.',
      suggestion: 'Caps Lock tuşunu kontrol edin.',
    });
  }
  
  // Excessive punctuation
  const punctuationRatio = (input.match(/[!?.,;:'"]/g) || []).length / input.length;
  if (punctuationRatio > 0.15 && input.length > 20) {
    warnings.push({
      code: 'EXCESSIVE_PUNCTUATION',
      message: 'Aşırı noktalama işareti kullanımı tespit edildi.',
      suggestion: 'Daha az noktalama işareti kullanmayı deneyin.',
    });
  }
  
  // Very short input that might be low quality
  if (input.trim().length > 0 && input.trim().length < 10) {
    warnings.push({
      code: 'LOW_QUALITY_INPUT',
      message: 'Daha detaylı bir soru sormak daha iyi sonuçlar verebilir.',
      suggestion: 'Sorunuzu biraz daha açıklayın.',
    });
  }
  
  return warnings;
}

// =============================================================================
// LIMIT HELPERS
// =============================================================================

/**
 * Get limits for input type
 */
export function getInputLimits(inputType: AIInputType = 'default') {
  return AI_INPUT_LIMITS[inputType] ?? AI_INPUT_LIMITS.default;
}

/**
 * Check if approaching limit
 */
export function isApproachingLimit(
  input: string,
  inputType: AIInputType = 'default',
  threshold: number = 80
): boolean {
  const limits = getInputLimits(inputType);
  const percentUsed = (input.length / limits.maxLength) * 100;
  return percentUsed >= threshold;
}

/**
 * Truncate input to limit
 */
export function truncateToLimit(
  input: string,
  inputType: AIInputType = 'default'
): string {
  const limits = getInputLimits(inputType);
  if (input.length <= limits.maxLength) return input;
  
  // Try to cut at word boundary
  const truncated = input.substring(0, limits.maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > limits.maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated.substring(0, limits.maxLength - 3) + '...';
}
