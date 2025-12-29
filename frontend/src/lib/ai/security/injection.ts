/**
 * AI Input Security - Prompt Injection Detection
 * 
 * Prompt manipulation girişimlerini tespit etme.
 * 
 * GÜVENLİK ÖNLEMLERİ:
 * ===================
 * 1. System prompt override attempts
 * 2. Role manipulation (pretend you are...)
 * 3. Instruction bypass attempts
 * 4. Context escape patterns
 * 5. Jailbreak attempts
 * 
 * NOT: Bu frontend seviyesinde bir ilk savunma hattıdır.
 * Asıl güvenlik backend'de sağlanmalıdır.
 */

import type { InputValidationError, InputValidationWarning } from './validation';

// =============================================================================
// INJECTION PATTERNS
// =============================================================================

/**
 * Patterns indicating prompt injection attempts
 * Organized by severity and type
 */
const INJECTION_PATTERNS = {
  // High severity - Direct system prompt manipulation
  systemOverride: [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
    /forget\s+(all\s+)?(your\s+)?(instructions?|training|rules?)/i,
    /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions?|prompts?)/i,
    /override\s+(system|your)\s+(prompt|instructions?)/i,
    /new\s+instructions?:\s*/i,
    /\[system\]/i,
    /\[INST\]/i,
    /<<SYS>>/i,
    /system:\s*you\s+are/i,
  ],
  
  // High severity - Role manipulation
  roleManipulation: [
    /pretend\s+(you\s+are|to\s+be|you're)\s+(a|an|the)?\s*(different|new|another)/i,
    /act\s+as\s+(if\s+you\s+(are|were)|a|an)\s*/i,
    /you\s+are\s+now\s+(a|an|the)?\s*(different|new)/i,
    /roleplay\s+as\s*/i,
    /imagine\s+you\s+are\s+(a|an|the)?\s*(different|new|another)/i,
    /from\s+now\s+on,?\s+you\s+(are|will\s+be)/i,
    /switch\s+(to|into)\s+(a\s+)?(different|new)\s+(role|mode|persona)/i,
  ],
  
  // Medium severity - Instruction bypass
  instructionBypass: [
    /but\s+first,?\s+(tell|show|give)\s+me/i,
    /before\s+(that|answering),?\s+(tell|show|give)/i,
    /instead\s+of\s+(that|answering),?\s*/i,
    /skip\s+(the|your)\s+(rules?|restrictions?|limitations?)/i,
    /bypass\s+(the|your|all)\s+(filters?|restrictions?|rules?)/i,
    /without\s+(any\s+)?(restrictions?|limitations?|rules?)/i,
  ],
  
  // Medium severity - Context escape
  contextEscape: [
    /\[end\s*(of\s*)?(context|conversation|prompt)\]/i,
    /---+\s*(end|new|start)\s*(of\s*)?(context|prompt|conversation)?/i,
    /\*\*\*\s*(new|end|start)\s*(instructions?|prompt)?/i,
    /###\s*(new|end|start)\s*(instructions?|prompt)?/i,
    /<\|endoftext\|>/i,
    /<\|im_end\|>/i,
    /<\/?(system|user|assistant)>/i,
  ],
  
  // Medium severity - Jailbreak attempts
  jailbreak: [
    /DAN\s*(mode)?/i,  // "Do Anything Now"
    /developer\s+mode/i,
    /sudo\s+mode/i,
    /god\s+mode/i,
    /unrestricted\s+mode/i,
    /no\s+(filter|censorship)\s+mode/i,
    /jailbreak/i,
    /unlock\s+(your\s+)?(full|true)\s+(potential|capabilities)/i,
  ],
  
  // Low severity - Suspicious patterns (might be legitimate)
  suspicious: [
    /what\s+(are|is)\s+your\s+(system\s+)?prompt/i,
    /show\s+(me\s+)?(your\s+)?(system\s+)?instructions/i,
    /reveal\s+(your\s+)?(hidden|secret|system)\s*/i,
    /what\s+were\s+you\s+told\s+to\s+do/i,
    /repeat\s+(your\s+)?(initial|system|first)\s+(instructions?|prompt)/i,
  ],
};

// =============================================================================
// TURKISH PATTERNS
// =============================================================================

/**
 * Turkish language injection patterns
 */
const TURKISH_INJECTION_PATTERNS = {
  systemOverride: [
    /önceki\s+(talimatları|kuralları|komutları)\s+(unut|yoksay|görmezden\s+gel)/i,
    /tüm\s+kuralları\s+(unut|yoksay|geç)/i,
    /sistem\s+promptunu\s+(değiştir|geçersiz\s+kıl)/i,
  ],
  
  roleManipulation: [
    /sen\s+artık\s+(farklı|başka)\s+bir/i,
    /gibi\s+davran/i,
    /rolünü\s+değiştir/i,
    /şundan\s+itibaren\s+sen/i,
  ],
  
  instructionBypass: [
    /kısıtlamaları\s+(kaldır|yoksay|geç)/i,
    /kuralları\s+(yoksay|geç)/i,
    /sınırlamaları\s+(kaldır|yoksay)/i,
  ],
};

// =============================================================================
// DETECTION RESULT
// =============================================================================

export interface InjectionDetectionResult {
  /** Whether injection attempt was detected */
  isInjection: boolean;
  /** Confidence level (0-1) */
  confidence: number;
  /** Severity of detected patterns */
  severity: 'none' | 'low' | 'medium' | 'high';
  /** Categories of detected patterns */
  detectedCategories: string[];
  /** Number of patterns matched */
  matchCount: number;
  /** Should block the input */
  shouldBlock: boolean;
  /** User-facing message */
  message?: string;
}

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Check single pattern category
 */
function checkPatterns(
  input: string,
  patterns: RegExp[]
): { matched: boolean; count: number } {
  let count = 0;
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) {
      count++;
    }
  }
  return { matched: count > 0, count };
}

/**
 * Detect prompt injection attempts
 */
export function detectPromptInjection(input: string): InjectionDetectionResult {
  const detectedCategories: string[] = [];
  let totalMatches = 0;
  let highestSeverity: 'none' | 'low' | 'medium' | 'high' = 'none';
  
  // Check English patterns
  const systemCheck = checkPatterns(input, INJECTION_PATTERNS.systemOverride);
  if (systemCheck.matched) {
    detectedCategories.push('system_override');
    totalMatches += systemCheck.count;
    highestSeverity = 'high';
  }
  
  const roleCheck = checkPatterns(input, INJECTION_PATTERNS.roleManipulation);
  if (roleCheck.matched) {
    detectedCategories.push('role_manipulation');
    totalMatches += roleCheck.count;
    if (highestSeverity !== 'high') highestSeverity = 'high';
  }
  
  const bypassCheck = checkPatterns(input, INJECTION_PATTERNS.instructionBypass);
  if (bypassCheck.matched) {
    detectedCategories.push('instruction_bypass');
    totalMatches += bypassCheck.count;
    if (highestSeverity === 'none') highestSeverity = 'medium';
  }
  
  const escapeCheck = checkPatterns(input, INJECTION_PATTERNS.contextEscape);
  if (escapeCheck.matched) {
    detectedCategories.push('context_escape');
    totalMatches += escapeCheck.count;
    if (highestSeverity === 'none') highestSeverity = 'medium';
  }
  
  const jailbreakCheck = checkPatterns(input, INJECTION_PATTERNS.jailbreak);
  if (jailbreakCheck.matched) {
    detectedCategories.push('jailbreak');
    totalMatches += jailbreakCheck.count;
    if (highestSeverity === 'none') highestSeverity = 'medium';
  }
  
  const suspiciousCheck = checkPatterns(input, INJECTION_PATTERNS.suspicious);
  if (suspiciousCheck.matched) {
    detectedCategories.push('suspicious');
    totalMatches += suspiciousCheck.count;
    if (highestSeverity === 'none') highestSeverity = 'low';
  }
  
  // Check Turkish patterns
  const trSystemCheck = checkPatterns(input, TURKISH_INJECTION_PATTERNS.systemOverride);
  if (trSystemCheck.matched) {
    detectedCategories.push('tr_system_override');
    totalMatches += trSystemCheck.count;
    highestSeverity = 'high';
  }
  
  const trRoleCheck = checkPatterns(input, TURKISH_INJECTION_PATTERNS.roleManipulation);
  if (trRoleCheck.matched) {
    detectedCategories.push('tr_role_manipulation');
    totalMatches += trRoleCheck.count;
    if (highestSeverity !== 'high') highestSeverity = 'high';
  }
  
  const trBypassCheck = checkPatterns(input, TURKISH_INJECTION_PATTERNS.instructionBypass);
  if (trBypassCheck.matched) {
    detectedCategories.push('tr_instruction_bypass');
    totalMatches += trBypassCheck.count;
    if (highestSeverity === 'none') highestSeverity = 'medium';
  }
  
  // Calculate confidence
  const confidence = Math.min(1, totalMatches * 0.3);
  
  // Determine if should block
  const shouldBlock = highestSeverity === 'high' || totalMatches >= 2;
  
  // Generate message
  let message: string | undefined;
  if (shouldBlock) {
    message = 'Bu mesaj güvenlik nedeniyle gönderilemez. Lütfen normal bir soru sorun.';
  } else if (highestSeverity !== 'none') {
    message = 'Mesajınız şüpheli içerik içeriyor olabilir.';
  }
  
  return {
    isInjection: detectedCategories.length > 0,
    confidence,
    severity: highestSeverity,
    detectedCategories,
    matchCount: totalMatches,
    shouldBlock,
    message,
  };
}

// =============================================================================
// UX-FRIENDLY DETECTION
// =============================================================================

/**
 * Check input and return validation-compatible result
 */
export function validateForInjection(input: string): {
  valid: boolean;
  errors: InputValidationError[];
  warnings: InputValidationWarning[];
} {
  const detection = detectPromptInjection(input);
  const errors: InputValidationError[] = [];
  const warnings: InputValidationWarning[] = [];
  
  if (detection.shouldBlock) {
    errors.push({
      code: 'PROMPT_INJECTION',
      message: detection.message || 'Bu içerik gönderilemez.',
    });
  } else if (detection.severity === 'low' || detection.severity === 'medium') {
    warnings.push({
      code: 'SUSPICIOUS_PATTERN',
      message: 'Mesajınız olağandışı kalıplar içeriyor.',
      suggestion: 'Lütfen normal bir şekilde sorunuzu yazın.',
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// LOGGING (for security monitoring)
// =============================================================================

export interface InjectionAttemptLog {
  timestamp: number;
  input: string;
  detection: InjectionDetectionResult;
  userId?: string;
  sessionId?: string;
}

/**
 * Format injection attempt for logging
 * Removes sensitive data but keeps enough for analysis
 */
export function formatInjectionLog(
  input: string,
  detection: InjectionDetectionResult,
  context?: { userId?: string; sessionId?: string }
): InjectionAttemptLog {
  return {
    timestamp: Date.now(),
    // Truncate and sanitize input for logging
    input: input.length > 200 ? input.substring(0, 200) + '...' : input,
    detection: {
      ...detection,
      // Don't log the full message
      message: undefined,
    },
    userId: context?.userId,
    sessionId: context?.sessionId,
  };
}

// =============================================================================
// PATTERN TESTING (for development)
// =============================================================================

/**
 * Test a specific pattern against sample inputs
 * Only for development/testing
 */
export function testPattern(
  pattern: RegExp,
  testCases: string[]
): { input: string; matched: boolean }[] {
  return testCases.map(input => ({
    input,
    matched: pattern.test(input),
  }));
}

/**
 * Get all patterns for review
 */
export function getAllPatterns(): Record<string, RegExp[]> {
  return {
    ...INJECTION_PATTERNS,
    ...Object.fromEntries(
      Object.entries(TURKISH_INJECTION_PATTERNS).map(([k, v]) => [`tr_${k}`, v])
    ),
  };
}
