/**
 * Secure AI Input Components
 * 
 * Güvenlik kontrolleri entegre edilmiş input bileşenleri.
 * 
 * ÖZELLİKLER:
 * ===========
 * 1. Real-time karakter/token sayacı
 * 2. Güvenlik uyarıları gösterimi
 * 3. PII tespit uyarıları
 * 4. Prompt injection engelleme
 * 5. Accessibility desteği
 */

import React, { 
  useState, 
  useCallback, 
  useEffect, 
  useRef, 
  memo,
  forwardRef,
  type TextareaHTMLAttributes,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  EyeOff, 
  Info, 
  X,
  Lock,
  Zap,
} from 'lucide-react';

import { 
  type AIInputType,
  type InputValidationError,
  type InputValidationWarning,
  type InputStats,
  AI_INPUT_LIMITS,
  calculateInputStats,
  validateInputLength,
  checkInputQuality,
  isApproachingLimit,
  getInputLimits,
} from './validation';
import { validateAndSanitize } from './sanitization';
import { validateForInjection } from './injection';
import { validateForPII, type PIIDetectionResult } from './pii';

// =============================================================================
// TYPES
// =============================================================================

export interface SecureAIInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Input type for limits */
  inputType?: AIInputType;
  /** Show character counter */
  showCounter?: boolean;
  /** Show token estimate */
  showTokens?: boolean;
  /** Enable PII detection */
  detectPII?: boolean;
  /** Enable injection detection */
  detectInjection?: boolean;
  /** Enable HTML sanitization */
  sanitize?: boolean;
  /** Auto-resize textarea */
  autoResize?: boolean;
  /** Min height in pixels */
  minHeight?: number;
  /** Max height in pixels */
  maxHeight?: number;
  /** On validation error */
  onValidationError?: (errors: InputValidationError[]) => void;
  /** On security warning */
  onSecurityWarning?: (warnings: InputValidationWarning[]) => void;
  /** On PII detected */
  onPIIDetected?: (result: PIIDetectionResult) => void;
  /** Custom class for wrapper */
  wrapperClassName?: string;
}

// =============================================================================
// SECURE INPUT COMPONENT
// =============================================================================

export const SecureAIInput = memo(forwardRef<HTMLTextAreaElement, SecureAIInputProps>(
  function SecureAIInput(props, ref) {
    const {
      value,
      onChange,
      inputType = 'default',
      showCounter = true,
      showTokens = false,
      detectPII = true,
      detectInjection = true,
      sanitize = true,
      autoResize = true,
      minHeight = 80,
      maxHeight = 300,
      onValidationError,
      onSecurityWarning,
      onPIIDetected,
      wrapperClassName = '',
      className = '',
      placeholder = 'Mesajınızı yazın...',
      disabled,
      ...textareaProps
    } = props;
    
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [stats, setStats] = useState<InputStats>(() => calculateInputStats(value, inputType));
    const [errors, setErrors] = useState<InputValidationError[]>([]);
    const [warnings, setWarnings] = useState<InputValidationWarning[]>([]);
    const [piiResult, setPIIResult] = useState<PIIDetectionResult | null>(null);
    const [showPIIWarning, setShowPIIWarning] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    
    const limits = getInputLimits(inputType);
    
    // Combine refs
    const setRefs = useCallback((element: HTMLTextAreaElement | null) => {
      textareaRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    }, [ref]);
    
    // Auto-resize effect
    useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${newHeight}px`;
      }
    }, [value, autoResize, minHeight, maxHeight]);
    
    // Validation effect
    useEffect(() => {
      const newStats = calculateInputStats(value, inputType);
      setStats(newStats);
      
      const allErrors: InputValidationError[] = [];
      const allWarnings: InputValidationWarning[] = [];
      
      // Length validation
      const lengthResult = validateInputLength(value, inputType);
      allErrors.push(...lengthResult.errors);
      
      // Quality checks
      const qualityWarnings = checkInputQuality(value);
      allWarnings.push(...qualityWarnings);
      
      // Sanitization check
      if (sanitize && value) {
        const sanitizeResult = validateAndSanitize(value);
        allErrors.push(...sanitizeResult.errors);
      }
      
      // Injection detection
      if (detectInjection && value) {
        const injectionResult = validateForInjection(value);
        allErrors.push(...injectionResult.errors);
        allWarnings.push(...injectionResult.warnings);
        setIsBlocked(injectionResult.errors.length > 0);
      } else {
        setIsBlocked(false);
      }
      
      // PII detection
      if (detectPII && value) {
        const piiValidation = validateForPII(value);
        allWarnings.push(...piiValidation.warnings);
        setPIIResult(piiValidation.piiResult);
        setShowPIIWarning(piiValidation.shouldWarn);
        onPIIDetected?.(piiValidation.piiResult);
      } else {
        setPIIResult(null);
        setShowPIIWarning(false);
      }
      
      setErrors(allErrors);
      setWarnings(allWarnings);
      
      // Callbacks
      if (allErrors.length > 0) {
        onValidationError?.(allErrors);
      }
      if (allWarnings.length > 0) {
        onSecurityWarning?.(allWarnings);
      }
    }, [value, inputType, sanitize, detectInjection, detectPII, onValidationError, onSecurityWarning, onPIIDetected]);
    
    // Handle change
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let newValue = e.target.value;
      
      // Optional: Sanitize on input (aggressive)
      // if (sanitize) {
      //   newValue = sanitizeInput(newValue);
      // }
      
      // Enforce max length
      if (newValue.length > limits.maxLength) {
        newValue = newValue.substring(0, limits.maxLength);
      }
      
      onChange(newValue);
    }, [onChange, limits.maxLength]);
    
    // Counter color
    const getCounterColor = () => {
      if (stats.percentOfLimit >= 100) return 'text-red-500';
      if (stats.percentOfLimit >= 90) return 'text-amber-500';
      if (stats.percentOfLimit >= 70) return 'text-yellow-500';
      return 'text-gray-400';
    };
    
    const hasErrors = errors.length > 0;
    const hasWarnings = warnings.length > 0 || showPIIWarning;
    
    return (
      <div className={`relative ${wrapperClassName}`}>
        {/* Main Input */}
        <div className={`
          relative rounded-xl border transition-all
          ${hasErrors ? 'border-red-300 dark:border-red-700' : 
            hasWarnings ? 'border-amber-300 dark:border-amber-700' : 
            'border-gray-200 dark:border-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          focus-within:ring-2 focus-within:ring-indigo-500/20
        `}>
          <textarea
            ref={setRefs}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled || isBlocked}
            className={`
              w-full px-4 py-3 bg-transparent resize-none
              text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none
              ${className}
            `}
            style={{ minHeight }}
            aria-invalid={hasErrors}
            aria-describedby={hasErrors ? 'input-errors' : hasWarnings ? 'input-warnings' : undefined}
            {...textareaProps}
          />
          
          {/* Counter & Security Indicators */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-800">
            {/* Left: Security indicators */}
            <div className="flex items-center gap-2">
              {detectInjection && (
                <Shield className={`w-4 h-4 ${isBlocked ? 'text-red-500' : 'text-green-500'}`} />
              )}
              {detectPII && piiResult?.hasPII && (
                <button
                  type="button"
                  onClick={() => setShowPIIWarning(!showPIIWarning)}
                  className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  title="Hassas veri uyarısı"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </button>
              )}
            </div>
            
            {/* Right: Counter */}
            {showCounter && (
              <div className={`flex items-center gap-2 text-xs ${getCounterColor()}`}>
                {showTokens && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    ~{stats.estimatedTokens} token
                  </span>
                )}
                <span>
                  {stats.length}/{limits.maxLength}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Error Messages */}
        <AnimatePresence>
          {hasErrors && (
            <motion.div
              id="input-errors"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-2 space-y-1"
              role="alert"
            >
              {errors.map((error, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span>{error.message}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* PII Warning Banner */}
        <AnimatePresence>
          {showPIIWarning && piiResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
            >
              <PIIWarningBanner
                piiResult={piiResult}
                onDismiss={() => setShowPIIWarning(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Quality Warnings */}
        <AnimatePresence>
          {!hasErrors && warnings.length > 0 && !showPIIWarning && (
            <motion.div
              id="input-warnings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2"
            >
              {warnings.slice(0, 1).map((warning, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <Info className="w-3 h-3 flex-shrink-0" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
));

// =============================================================================
// PII WARNING BANNER
// =============================================================================

interface PIIWarningBannerProps {
  piiResult: PIIDetectionResult;
  onDismiss: () => void;
}

const PIIWarningBanner = memo(function PIIWarningBanner({
  piiResult,
  onDismiss,
}: PIIWarningBannerProps) {
  const isCritical = piiResult.severity === 'high';
  
  return (
    <div className={`
      rounded-lg border p-3
      ${isCritical 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }
    `}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          isCritical ? 'text-red-500' : 'text-amber-500'
        }`} />
        
        <div className="flex-1">
          <h4 className={`font-medium text-sm ${
            isCritical ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'
          }`}>
            {isCritical ? '⚠️ Hassas Bilgi Uyarısı' : 'Kişisel Bilgi Tespit Edildi'}
          </h4>
          
          <div className="mt-1 space-y-1">
            {piiResult.warnings.map((warning, i) => (
              <p key={i} className={`text-xs ${
                isCritical ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                • {warning.suggestion}
              </p>
            ))}
          </div>
          
          <p className={`mt-2 text-xs italic ${
            isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            Bu bilgiler AI ile paylaşılsa bile güvenli olacaktır, ancak gerekli değildir.
          </p>
        </div>
        
        <button
          onClick={onDismiss}
          className={`p-1 rounded hover:bg-white/50 dark:hover:bg-black/20 ${
            isCritical ? 'text-red-500' : 'text-amber-500'
          }`}
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

// =============================================================================
// CHARACTER COUNTER COMPONENT
// =============================================================================

export interface CharacterCounterProps {
  current: number;
  max: number;
  showTokens?: boolean;
  tokenCount?: number;
  className?: string;
}

export const CharacterCounter = memo(function CharacterCounter({
  current,
  max,
  showTokens = false,
  tokenCount = 0,
  className = '',
}: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  
  const getColor = () => {
    if (percentage >= 100) return 'text-red-500';
    if (percentage >= 90) return 'text-amber-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-gray-400';
  };
  
  return (
    <div className={`flex items-center gap-2 text-xs ${getColor()} ${className}`}>
      {showTokens && (
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          ~{tokenCount}
        </span>
      )}
      <span>{current}/{max}</span>
    </div>
  );
});

// =============================================================================
// SECURITY BADGE
// =============================================================================

export interface SecurityBadgeProps {
  level: 'safe' | 'warning' | 'danger';
  message?: string;
  className?: string;
}

export const SecurityBadge = memo(function SecurityBadge({
  level,
  message,
  className = '',
}: SecurityBadgeProps) {
  const config = {
    safe: {
      icon: <Shield className="w-3 h-3" />,
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      label: 'Güvenli',
    },
    warning: {
      icon: <AlertTriangle className="w-3 h-3" />,
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      label: 'Uyarı',
    },
    danger: {
      icon: <Lock className="w-3 h-3" />,
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      label: 'Engellendi',
    },
  };
  
  const { icon, bg, text, label } = config[level];
  
  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${bg} ${text} ${className}`}
      title={message}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
});

export default SecureAIInput;
