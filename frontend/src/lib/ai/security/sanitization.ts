/**
 * AI Input Security - Sanitization
 * 
 * HTML/Script injection ve zararlı içerik temizleme.
 * 
 * GÜVENLİK ÖNLEMLERİ:
 * ===================
 * 1. HTML tag removal
 * 2. Script injection prevention
 * 3. Event handler stripping
 * 4. URL sanitization
 * 5. Unicode normalization
 * 6. Control character removal
 */

import type { InputValidationError } from './validation';

// =============================================================================
// DANGEROUS PATTERNS
// =============================================================================

/**
 * Patterns that indicate potentially malicious input
 */
const DANGEROUS_PATTERNS = {
  // HTML tags
  htmlTags: /<[^>]*>/gi,
  
  // Script tags specifically
  scriptTags: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  
  // Event handlers
  eventHandlers: /\s*on\w+\s*=/gi,
  
  // JavaScript protocol
  jsProtocol: /javascript\s*:/gi,
  
  // Data URLs (can contain scripts)
  dataUrls: /data\s*:\s*text\/html/gi,
  
  // VBScript
  vbScript: /vbscript\s*:/gi,
  
  // Expression (IE CSS)
  expression: /expression\s*\(/gi,
  
  // Encoded scripts
  encodedScript: /&#x?[0-9a-f]+;/gi,
  
  // Base64 suspicious patterns
  base64Script: /base64[,\s]/gi,
  
  // SQL injection patterns (for logging, not blocking)
  sqlPatterns: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b.*\b(FROM|INTO|WHERE|TABLE)\b)|(-{2}|\/\*|\*\/)/gi,
};

/**
 * Characters that should be escaped or removed
 */
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Zero-width characters (can be used for steganography)
 */
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF\u2060]/g;

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Check if input contains HTML tags
 */
export function containsHTML(input: string): boolean {
  return DANGEROUS_PATTERNS.htmlTags.test(input);
}

/**
 * Check if input contains script-like content
 */
export function containsScript(input: string): boolean {
  DANGEROUS_PATTERNS.scriptTags.lastIndex = 0;
  DANGEROUS_PATTERNS.jsProtocol.lastIndex = 0;
  DANGEROUS_PATTERNS.eventHandlers.lastIndex = 0;
  
  return (
    DANGEROUS_PATTERNS.scriptTags.test(input) ||
    DANGEROUS_PATTERNS.jsProtocol.test(input) ||
    DANGEROUS_PATTERNS.eventHandlers.test(input)
  );
}

/**
 * Check for any dangerous patterns
 */
export function containsDangerousContent(input: string): {
  isDangerous: boolean;
  detectedPatterns: string[];
} {
  const detectedPatterns: string[] = [];
  
  if (DANGEROUS_PATTERNS.htmlTags.test(input)) {
    detectedPatterns.push('html_tags');
  }
  
  if (DANGEROUS_PATTERNS.scriptTags.test(input)) {
    detectedPatterns.push('script_tags');
  }
  
  if (DANGEROUS_PATTERNS.eventHandlers.test(input)) {
    detectedPatterns.push('event_handlers');
  }
  
  if (DANGEROUS_PATTERNS.jsProtocol.test(input)) {
    detectedPatterns.push('javascript_protocol');
  }
  
  if (DANGEROUS_PATTERNS.dataUrls.test(input)) {
    detectedPatterns.push('data_urls');
  }
  
  if (DANGEROUS_PATTERNS.vbScript.test(input)) {
    detectedPatterns.push('vbscript');
  }
  
  if (DANGEROUS_PATTERNS.expression.test(input)) {
    detectedPatterns.push('css_expression');
  }
  
  // Reset lastIndex for all patterns
  Object.values(DANGEROUS_PATTERNS).forEach(pattern => {
    pattern.lastIndex = 0;
  });
  
  return {
    isDangerous: detectedPatterns.length > 0,
    detectedPatterns,
  };
}

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Remove all HTML tags
 */
export function stripHTML(input: string): string {
  return input
    .replace(DANGEROUS_PATTERNS.htmlTags, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(input: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  
  return input.replace(/[&<>"'`=/]/g, char => escapeMap[char] || char);
}

/**
 * Remove control characters
 */
export function removeControlChars(input: string): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(ZERO_WIDTH_CHARS, '');
}

/**
 * Normalize unicode (prevent homograph attacks)
 */
export function normalizeUnicode(input: string): string {
  // NFKC normalization - compatibility decomposition followed by canonical composition
  return input.normalize('NFKC');
}

/**
 * Remove script-related content
 */
export function removeScripts(input: string): string {
  let sanitized = input;
  
  // Remove script tags
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.scriptTags, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.eventHandlers, ' ');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.jsProtocol, '');
  
  // Remove data: URLs
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.dataUrls, '');
  
  // Remove vbscript:
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.vbScript, '');
  
  // Remove expression()
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.expression, '');
  
  return sanitized;
}

// =============================================================================
// FULL SANITIZATION
// =============================================================================

export interface SanitizationOptions {
  /** Strip all HTML tags */
  stripHTML?: boolean;
  /** Escape HTML instead of stripping */
  escapeHTML?: boolean;
  /** Remove control characters */
  removeControlChars?: boolean;
  /** Normalize unicode */
  normalizeUnicode?: boolean;
  /** Remove script-like content */
  removeScripts?: boolean;
  /** Trim whitespace */
  trim?: boolean;
  /** Collapse multiple spaces */
  collapseSpaces?: boolean;
  /** Max length (truncate if exceeded) */
  maxLength?: number;
}

const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
  stripHTML: true,
  escapeHTML: false,
  removeControlChars: true,
  normalizeUnicode: true,
  removeScripts: true,
  trim: true,
  collapseSpaces: true,
  maxLength: undefined,
};

/**
 * Full input sanitization
 */
export function sanitizeInput(
  input: string,
  options: SanitizationOptions = {}
): string {
  const opts = { ...DEFAULT_SANITIZATION_OPTIONS, ...options };
  let sanitized = input;
  
  // Normalize unicode first
  if (opts.normalizeUnicode) {
    sanitized = normalizeUnicode(sanitized);
  }
  
  // Remove control characters
  if (opts.removeControlChars) {
    sanitized = removeControlChars(sanitized);
  }
  
  // Remove scripts
  if (opts.removeScripts) {
    sanitized = removeScripts(sanitized);
  }
  
  // Handle HTML
  if (opts.stripHTML) {
    sanitized = stripHTML(sanitized);
  } else if (opts.escapeHTML) {
    sanitized = escapeHTML(sanitized);
  }
  
  // Collapse multiple spaces
  if (opts.collapseSpaces) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }
  
  // Trim
  if (opts.trim) {
    sanitized = sanitized.trim();
  }
  
  // Truncate
  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
  }
  
  return sanitized;
}

// =============================================================================
// VALIDATION WITH SANITIZATION
// =============================================================================

export interface SanitizationResult {
  original: string;
  sanitized: string;
  wasModified: boolean;
  removedContent: string[];
  errors: InputValidationError[];
}

/**
 * Validate and sanitize input, collecting what was removed
 */
export function validateAndSanitize(
  input: string,
  options: SanitizationOptions = {}
): SanitizationResult {
  const errors: InputValidationError[] = [];
  const removedContent: string[] = [];
  
  // Check for dangerous content
  const { isDangerous, detectedPatterns } = containsDangerousContent(input);
  
  if (isDangerous) {
    if (detectedPatterns.includes('html_tags')) {
      errors.push({
        code: 'CONTAINS_HTML',
        message: 'HTML kodları içerik için uygun değildir.',
      });
      removedContent.push('HTML etiketleri');
    }
    
    if (detectedPatterns.includes('script_tags') || 
        detectedPatterns.includes('event_handlers') ||
        detectedPatterns.includes('javascript_protocol')) {
      errors.push({
        code: 'CONTAINS_SCRIPT',
        message: 'Script içeriği tespit edildi ve temizlendi.',
      });
      removedContent.push('Script içeriği');
    }
  }
  
  const sanitized = sanitizeInput(input, options);
  
  return {
    original: input,
    sanitized,
    wasModified: input !== sanitized,
    removedContent,
    errors,
  };
}

// =============================================================================
// OUTPUT SANITIZATION (for displaying AI responses)
// =============================================================================

/**
 * Sanitize AI response before displaying
 * Less aggressive than input sanitization
 */
export function sanitizeAIResponse(response: string): string {
  let sanitized = response;
  
  // Normalize unicode
  sanitized = normalizeUnicode(sanitized);
  
  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Remove zero-width characters
  sanitized = sanitized.replace(ZERO_WIDTH_CHARS, '');
  
  // Remove any script tags (shouldn't be in AI responses)
  sanitized = sanitized.replace(DANGEROUS_PATTERNS.scriptTags, '');
  
  // Escape HTML for safe display
  // Note: If you're using React, React already escapes by default
  // This is for cases where you use dangerouslySetInnerHTML
  
  return sanitized;
}

/**
 * Prepare text for safe innerHTML insertion
 * Use only when necessary (prefer React's default escaping)
 */
export function prepareForInnerHTML(text: string): string {
  return escapeHTML(sanitizeAIResponse(text));
}
