/**
 * AI Security Module - Barrel Export
 * 
 * Frontend güvenlik katmanı: Validation, Sanitization, Injection & PII Detection
 */

// =============================================================================
// VALIDATION
// =============================================================================

export {
  // Constants
  AI_INPUT_LIMITS,
  
  // Types
  type AIInputType,
  type InputValidationResult,
  type InputValidationError,
  type InputValidationWarning,
  type InputStats,
  
  // Functions
  estimateTokenCount,
  calculateInputStats,
  validateInputLength,
  checkInputQuality,
  getInputLimits,
  isApproachingLimit,
  truncateToLimit,
} from './validation';

// =============================================================================
// SANITIZATION
// =============================================================================

export {
  // Types
  type SanitizationOptions,
  type SanitizationResult,
  
  // Detection Functions
  containsHTML,
  containsScript,
  containsDangerousContent,
  
  // Sanitization Functions
  sanitizeInput,
  validateAndSanitize,
  sanitizeAIResponse,
  escapeHTML,
  stripHTML,
  removeScripts,
  removeControlChars,
  normalizeUnicode,
  prepareForInnerHTML,
} from './sanitization';

// =============================================================================
// INJECTION DETECTION
// =============================================================================

export {
  // Types
  type InjectionDetectionResult,
  
  // Functions
  detectPromptInjection,
  validateForInjection,
  formatInjectionLog,
  getAllPatterns,
} from './injection';

// =============================================================================
// PII DETECTION
// =============================================================================

export {
  // Types
  type PIIType,
  type PIIWarning,
  type PIIDetectionResult,
  
  // Detection Functions
  detectPII,
  validateForPII,
  
  // Masking Functions
  maskPII,
  removePII,
} from './pii';

// =============================================================================
// COMPONENTS
// =============================================================================

export {
  SecureAIInput,
  CharacterCounter,
  SecurityBadge,
  type SecureAIInputProps,
  type CharacterCounterProps,
  type SecurityBadgeProps,
} from './SecureAIInput';

// =============================================================================
// HOOKS
// =============================================================================

export {
  useSecureAIInput,
  useInputSecurity,
  prepareForSubmission,
  type UseSecureAIInputOptions,
  type UseSecureAIInputReturn,
  type ValidationState,
} from './useSecureAIInput';

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

import { containsDangerousContent as _containsDangerous, sanitizeInput as _sanitize } from './sanitization';
import { detectPromptInjection as _detectInjection } from './injection';
import { detectPII as _detectPII } from './pii';
import { validateInputLength as _validateLength, checkInputQuality as _checkQuality, type AIInputType } from './validation';

/**
 * Quick security check for any input
 */
export function quickSecurityCheck(input: string): {
  isSafe: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  const dangerCheck = _containsDangerous(input);
  if (dangerCheck.isDangerous) {
    issues.push('Tehlikeli içerik tespit edildi');
  }
  
  const injectionResult = _detectInjection(input);
  if (injectionResult.isInjection) {
    issues.push('Prompt injection girişimi');
  }
  
  const piiResult = _detectPII(input);
  if (piiResult.hasPII) {
    issues.push('Kişisel veri tespit edildi');
  }
  
  return {
    isSafe: issues.length === 0,
    issues,
  };
}

/**
 * Full input processing pipeline
 */
export function processSecureInput(
  input: string,
  options?: {
    inputType?: AIInputType;
    sanitize?: boolean;
    checkInjection?: boolean;
    checkPII?: boolean;
  }
): {
  processed: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const { 
    inputType = 'default', 
    sanitize = true,
    checkInjection = true,
    checkPII = true,
  } = options || {};
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate length
  const lengthResult = _validateLength(input, inputType);
  if (!lengthResult.valid) {
    errors.push(...lengthResult.errors.map((e) => e.message));
  }
  
  // Quality warnings
  const qualityWarnings = _checkQuality(input);
  warnings.push(...qualityWarnings.map((w) => w.message));
  
  // Check injection
  if (checkInjection) {
    const injectionResult = _detectInjection(input);
    if (injectionResult.shouldBlock) {
      errors.push(injectionResult.message || 'Güvenlik ihlali');
    } else if (injectionResult.isInjection) {
      warnings.push('Şüpheli kalıp tespit edildi');
    }
  }
  
  // Check PII
  if (checkPII) {
    const piiResult = _detectPII(input);
    if (piiResult.hasPII) {
      for (const w of piiResult.warnings) {
        warnings.push(`${w.title}: ${w.suggestion}`);
      }
    }
  }
  
  // Sanitize
  const processed = sanitize ? _sanitize(input) : input;
  
  return {
    processed,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
