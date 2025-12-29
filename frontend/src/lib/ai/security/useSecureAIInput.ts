/**
 * useSecureAIInput Hook
 * 
 * AI input güvenliği için React hook.
 * Validation, sanitization ve security checks.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  type AIInputType,
  type InputValidationResult,
  type InputValidationError,
  type InputValidationWarning,
  type InputStats,
  AI_INPUT_LIMITS,
  calculateInputStats,
  validateInputLength,
  checkInputQuality,
  isApproachingLimit,
  getInputLimits,
  truncateToLimit,
  estimateTokenCount,
} from './validation';
import {
  sanitizeInput,
  validateAndSanitize,
  containsDangerousContent,
  type SanitizationOptions,
} from './sanitization';
import {
  detectPromptInjection,
  validateForInjection,
  type InjectionDetectionResult,
} from './injection';
import {
  detectPII,
  validateForPII,
  removePII,
  type PIIDetectionResult,
} from './pii';

// =============================================================================
// TYPES
// =============================================================================

export interface UseSecureAIInputOptions {
  /** Input type for validation limits */
  inputType?: AIInputType;
  /** Initial value */
  initialValue?: string;
  /** Enable sanitization on change */
  sanitizeOnChange?: boolean;
  /** Sanitization options */
  sanitizationOptions?: SanitizationOptions;
  /** Enable PII detection */
  detectPII?: boolean;
  /** Enable injection detection */
  detectInjection?: boolean;
  /** Debounce validation (ms) */
  debounceMs?: number;
  /** Block on injection detection */
  blockOnInjection?: boolean;
  /** Warn on PII detection */
  warnOnPII?: boolean;
  /** On validation change */
  onValidationChange?: (result: ValidationState) => void;
  /** On blocked */
  onBlocked?: (reason: string) => void;
}

export interface ValidationState {
  isValid: boolean;
  isBlocked: boolean;
  errors: InputValidationError[];
  warnings: InputValidationWarning[];
  stats: InputStats;
  piiResult: PIIDetectionResult | null;
  injectionResult: InjectionDetectionResult | null;
}

export interface UseSecureAIInputReturn {
  /** Current input value */
  value: string;
  /** Set input value (with validation) */
  setValue: (value: string) => void;
  /** Current validation state */
  validation: ValidationState;
  /** Is input valid for submission */
  isValid: boolean;
  /** Is input blocked (security) */
  isBlocked: boolean;
  /** Current errors */
  errors: InputValidationError[];
  /** Current warnings */
  warnings: InputValidationWarning[];
  /** Input statistics */
  stats: InputStats;
  /** Has PII */
  hasPII: boolean;
  /** Has injection attempt */
  hasInjection: boolean;
  /** Clear input */
  clear: () => void;
  /** Get sanitized value for submission */
  getSanitizedValue: () => string;
  /** Get value with PII removed (for logging) */
  getValueForLogging: () => string;
  /** Manually trigger validation */
  validate: () => ValidationState;
  /** Input limits */
  limits: ReturnType<typeof getInputLimits>;
  /** Remaining characters */
  remainingChars: number;
  /** Remaining tokens (estimated) */
  remainingTokens: number;
  /** Is approaching limit */
  isApproachingLimit: boolean;
  /** Input props for textarea */
  inputProps: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
    maxLength: number;
    'aria-invalid': boolean;
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useSecureAIInput(
  options: UseSecureAIInputOptions = {}
): UseSecureAIInputReturn {
  const {
    inputType = 'default',
    initialValue = '',
    sanitizeOnChange = false,
    sanitizationOptions,
    detectPII: enablePII = true,
    detectInjection: enableInjection = true,
    debounceMs = 150,
    blockOnInjection = true,
    warnOnPII = true,
    onValidationChange,
    onBlocked,
  } = options;
  
  const [value, setValueInternal] = useState(initialValue);
  const [validation, setValidation] = useState<ValidationState>(() => ({
    isValid: true,
    isBlocked: false,
    errors: [],
    warnings: [],
    stats: calculateInputStats(initialValue, inputType),
    piiResult: null,
    injectionResult: null,
  }));
  
  const limits = useMemo(() => getInputLimits(inputType), [inputType]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Validation function
  const performValidation = useCallback((input: string): ValidationState => {
    const allErrors: InputValidationError[] = [];
    const allWarnings: InputValidationWarning[] = [];
    let isBlocked = false;
    
    // Calculate stats
    const stats = calculateInputStats(input, inputType);
    
    // Length validation
    const lengthResult = validateInputLength(input, inputType);
    allErrors.push(...lengthResult.errors);
    
    // Quality checks
    const qualityWarnings = checkInputQuality(input);
    allWarnings.push(...qualityWarnings);
    
    // Dangerous content check
    if (input) {
      const dangerCheck = containsDangerousContent(input);
      if (dangerCheck.isDangerous) {
        const sanitizeResult = validateAndSanitize(input, sanitizationOptions);
        allErrors.push(...sanitizeResult.errors);
      }
    }
    
    // Injection detection
    let injectionResult: InjectionDetectionResult | null = null;
    if (enableInjection && input) {
      injectionResult = detectPromptInjection(input);
      if (injectionResult.shouldBlock && blockOnInjection) {
        isBlocked = true;
        allErrors.push({
          code: 'PROMPT_INJECTION',
          message: injectionResult.message || 'Bu mesaj gönderilemez.',
        });
        onBlocked?.('injection');
      } else if (injectionResult.isInjection) {
        allWarnings.push({
          code: 'SUSPICIOUS_PATTERN',
          message: 'Mesajınız olağandışı kalıplar içeriyor.',
        });
      }
    }
    
    // PII detection
    let piiResult: PIIDetectionResult | null = null;
    if (enablePII && input) {
      piiResult = detectPII(input);
      if (piiResult.hasPII && warnOnPII) {
        for (const warning of piiResult.warnings) {
          allWarnings.push({
            code: 'POSSIBLE_PII',
            message: `${warning.title}: ${warning.suggestion}`,
          });
        }
      }
    }
    
    const newState: ValidationState = {
      isValid: allErrors.length === 0,
      isBlocked,
      errors: allErrors,
      warnings: allWarnings,
      stats,
      piiResult,
      injectionResult,
    };
    
    return newState;
  }, [
    inputType, 
    enableInjection, 
    enablePII, 
    blockOnInjection, 
    warnOnPII, 
    sanitizationOptions,
    onBlocked,
  ]);
  
  // Set value with debounced validation
  const setValue = useCallback((newValue: string) => {
    // Optionally sanitize on change
    let processedValue = newValue;
    if (sanitizeOnChange) {
      processedValue = sanitizeInput(newValue, sanitizationOptions);
    }
    
    // Enforce max length
    if (processedValue.length > limits.maxLength) {
      processedValue = processedValue.substring(0, limits.maxLength);
    }
    
    setValueInternal(processedValue);
    
    // Debounced validation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      const newValidation = performValidation(processedValue);
      setValidation(newValidation);
      onValidationChange?.(newValidation);
    }, debounceMs);
  }, [limits.maxLength, sanitizeOnChange, sanitizationOptions, debounceMs, performValidation, onValidationChange]);
  
  // Clear input
  const clear = useCallback(() => {
    setValueInternal('');
    setValidation({
      isValid: true,
      isBlocked: false,
      errors: [],
      warnings: [],
      stats: calculateInputStats('', inputType),
      piiResult: null,
      injectionResult: null,
    });
  }, [inputType]);
  
  // Get sanitized value for submission
  const getSanitizedValue = useCallback(() => {
    return sanitizeInput(value, sanitizationOptions);
  }, [value, sanitizationOptions]);
  
  // Get value with PII removed (for logging)
  const getValueForLogging = useCallback(() => {
    return removePII(value);
  }, [value]);
  
  // Manual validation trigger
  const validate = useCallback(() => {
    const newValidation = performValidation(value);
    setValidation(newValidation);
    return newValidation;
  }, [value, performValidation]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // Computed values
  const remainingChars = limits.maxLength - value.length;
  const remainingTokens = limits.maxTokens - estimateTokenCount(value);
  const approaching = isApproachingLimit(value, inputType);
  const hasPII = validation.piiResult?.hasPII ?? false;
  const hasInjection = validation.injectionResult?.isInjection ?? false;
  
  // Input props for easy binding
  const inputProps = useMemo(() => ({
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setValue(e.target.value);
    },
    maxLength: limits.maxLength,
    'aria-invalid': !validation.isValid,
  }), [value, setValue, limits.maxLength, validation.isValid]);
  
  return {
    value,
    setValue,
    validation,
    isValid: validation.isValid,
    isBlocked: validation.isBlocked,
    errors: validation.errors,
    warnings: validation.warnings,
    stats: validation.stats,
    hasPII,
    hasInjection,
    clear,
    getSanitizedValue,
    getValueForLogging,
    validate,
    limits,
    remainingChars,
    remainingTokens,
    isApproachingLimit: approaching,
    inputProps,
  };
}

// =============================================================================
// QUICK VALIDATION HOOK
// =============================================================================

/**
 * Quick validation hook - just checks if input is safe
 */
export function useInputSecurity(value: string) {
  return useMemo(() => {
    const hasHTML = /<[^>]*>/.test(value);
    const hasScript = /<script/i.test(value) || /javascript:/i.test(value);
    const injection = detectPromptInjection(value);
    const pii = detectPII(value);
    
    return {
      isSafe: !hasScript && !injection.shouldBlock,
      hasHTML,
      hasScript,
      hasInjection: injection.isInjection,
      injectionSeverity: injection.severity,
      hasPII: pii.hasPII,
      piiSeverity: pii.severity,
    };
  }, [value]);
}

// =============================================================================
// SUBMISSION HELPER
// =============================================================================

/**
 * Prepare input for API submission
 */
export function prepareForSubmission(
  value: string,
  inputType: AIInputType = 'default'
): {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate length
  const lengthResult = validateInputLength(value, inputType);
  if (!lengthResult.valid) {
    errors.push(...lengthResult.errors.map(e => e.message));
  }
  
  // Check for injection
  const injectionResult = detectPromptInjection(value);
  if (injectionResult.shouldBlock) {
    errors.push(injectionResult.message || 'Güvenlik kontrolü başarısız.');
  }
  
  // Sanitize
  const sanitizedValue = sanitizeInput(value, {
    stripHTML: true,
    removeControlChars: true,
    removeScripts: true,
    normalizeUnicode: true,
    trim: true,
    collapseSpaces: true,
  });
  
  return {
    isValid: errors.length === 0,
    sanitizedValue,
    errors,
  };
}

export default useSecureAIInput;
