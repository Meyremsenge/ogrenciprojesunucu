/**
 * AI Error Display Components
 * 
 * Kullanıcı dostu hata gösterim bileşenleri.
 * 
 * UX PRENSİPLERİ:
 * ===============
 * 1. Görsel olarak yumuşak ve destekleyici
 * 2. Açık aksiyon butonları
 * 3. Retry mekanizması entegrasyonu
 * 4. Accessibility (ARIA) desteği
 * 5. Animasyonlu geçişler
 */

import React, { useCallback, useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  X, 
  AlertCircle, 
  Clock, 
  WifiOff, 
  Server,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import type { AIError, AIErrorCategory, AIErrorSeverity } from './types';
import { getErrorEmoji, getSuggestedAction } from './messages';

// =============================================================================
// TYPES
// =============================================================================

export interface AIErrorDisplayProps {
  /** The error to display */
  error: AIError;
  /** Retry handler */
  onRetry?: () => void;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Show retry button */
  showRetry?: boolean;
  /** Show dismiss button */
  showDismiss?: boolean;
  /** Auto-dismiss after ms (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Compact mode */
  compact?: boolean;
  /** Show technical details (debug mode) */
  showTechnicalDetails?: boolean;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// STYLING MAPS
// =============================================================================

const severityStyles: Record<AIErrorSeverity, {
  bg: string;
  border: string;
  text: string;
  icon: string;
}> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-500',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    icon: 'text-amber-500',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-500',
  },
  critical: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-900 dark:text-red-100',
    icon: 'text-red-600',
  },
};

const categoryIcons: Record<AIErrorCategory, React.ReactNode> = {
  quota: <Clock className="w-5 h-5" />,
  network: <WifiOff className="w-5 h-5" />,
  service: <Server className="w-5 h-5" />,
  temporary: <RefreshCw className="w-5 h-5" />,
  permanent: <AlertCircle className="w-5 h-5" />,
  content: <AlertCircle className="w-5 h-5" />,
  unknown: <HelpCircle className="w-5 h-5" />,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AIErrorDisplay = memo(function AIErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showRetry = true,
  showDismiss = true,
  autoDismiss = 0,
  compact = false,
  showTechnicalDetails = false,
  className = '',
}: AIErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  
  const styles = severityStyles[error.severity];
  const icon = categoryIcons[error.category];
  const emoji = getErrorEmoji(error.code);
  const suggestedAction = getSuggestedAction(error);
  
  // Auto-dismiss effect
  useEffect(() => {
    if (autoDismiss > 0 && onDismiss) {
      const timer = setTimeout(onDismiss, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onDismiss]);
  
  // Retry countdown effect
  useEffect(() => {
    if (error.retryable && error.retryAfter && error.retryAfter > 0) {
      setRetryCountdown(Math.ceil(error.retryAfter / 1000));
      const interval = setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [error.retryable, error.retryAfter]);
  
  const handleRetry = useCallback(() => {
    if (retryCountdown !== null && retryCountdown > 0) return;
    onRetry?.();
  }, [onRetry, retryCountdown]);
  
  const canRetry = showRetry && error.retryable && onRetry;
  const isRetryDisabled = retryCountdown !== null && retryCountdown > 0;
  
  // Compact Mode
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`
          flex items-center gap-3 px-4 py-2.5 rounded-lg border
          ${styles.bg} ${styles.border} ${styles.text}
          ${className}
        `}
        role="alert"
        aria-live="polite"
      >
        <span className="text-lg">{emoji}</span>
        <span className="flex-1 text-sm font-medium">{error.userMessage}</span>
        {canRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetryDisabled}
            className="flex items-center gap-1 text-sm font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetryDisabled ? '' : 'hover:animate-spin'}`} />
            {isRetryDisabled ? `${retryCountdown}s` : 'Tekrar'}
          </button>
        )}
        {showDismiss && onDismiss && (
          <button onClick={onDismiss} className="p-1 hover:opacity-70" aria-label="Kapat">
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    );
  }
  
  // Full Mode
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        rounded-xl border shadow-sm overflow-hidden
        ${styles.bg} ${styles.border}
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className={`flex items-start gap-3 p-4 ${styles.text}`}>
        <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <h4 className="font-semibold">{error.userTitle}</h4>
          </div>
          <p className="mt-1 text-sm opacity-90">{error.userMessage}</p>
          
          {suggestedAction && (
            <p className="mt-2 text-sm opacity-75 italic">{suggestedAction}</p>
          )}
        </div>
        
        {showDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Actions */}
      {(canRetry || showTechnicalDetails) && (
        <div className="flex items-center gap-2 px-4 pb-4">
          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetryDisabled}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                text-sm font-medium transition-all
                ${isRetryDisabled
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm border'
                }
              `}
            >
              <RefreshCw className={`w-4 h-4 ${isRetryDisabled ? '' : 'group-hover:animate-spin'}`} />
              {isRetryDisabled ? `${retryCountdown} saniye sonra...` : 'Tekrar Dene'}
            </button>
          )}
          
          {showTechnicalDetails && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 px-3 py-2 text-sm opacity-60 hover:opacity-100"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Detaylar
            </button>
          )}
        </div>
      )}
      
      {/* Technical Details (Debug) */}
      <AnimatePresence>
        {showTechnicalDetails && showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
          >
            <div className="p-4 text-xs font-mono text-gray-600 dark:text-gray-400 space-y-1">
              <div><span className="font-semibold">Kod:</span> {error.code}</div>
              <div><span className="font-semibold">Kategori:</span> {error.category}</div>
              <div><span className="font-semibold">Teknik:</span> {error.technicalMessage}</div>
              {error.requestId && (
                <div><span className="font-semibold">Request ID:</span> {error.requestId}</div>
              )}
              <div><span className="font-semibold">Zaman:</span> {new Date(error.timestamp).toLocaleString('tr-TR')}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// =============================================================================
// INLINE ERROR (For forms/inputs)
// =============================================================================

export interface AIInlineErrorProps {
  error: AIError;
  onRetry?: () => void;
  className?: string;
}

export const AIInlineError = memo(function AIInlineError({
  error,
  onRetry,
  className = '',
}: AIInlineErrorProps) {
  const emoji = getErrorEmoji(error.code);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2 text-sm text-red-600 dark:text-red-400 ${className}`}
      role="alert"
    >
      <span>{emoji}</span>
      <span>{error.userMessage}</span>
      {error.retryable && onRetry && (
        <button
          onClick={onRetry}
          className="underline hover:no-underline font-medium"
        >
          Tekrar dene
        </button>
      )}
    </motion.div>
  );
});

// =============================================================================
// TOAST ERROR (For transient notifications)
// =============================================================================

export interface AIErrorToastConfig {
  error: AIError;
  onRetry?: () => void;
  duration?: number;
}

/**
 * Create toast config for toast store
 */
export function createErrorToast(config: AIErrorToastConfig) {
  const { error, onRetry, duration = 5000 } = config;
  const emoji = getErrorEmoji(error.code);
  
  return {
    type: error.severity === 'info' ? 'info' as const : 
          error.severity === 'warning' ? 'warning' as const : 'error' as const,
    title: `${emoji} ${error.userTitle}`,
    message: error.userMessage,
    duration: error.retryable ? 0 : duration, // Don't auto-dismiss if retryable
    action: error.retryable && onRetry ? {
      label: 'Tekrar Dene',
      onClick: onRetry,
    } : undefined,
    dismissible: true,
  };
}

// =============================================================================
// MODAL ERROR (For blocking/critical errors)
// =============================================================================

export interface AIErrorModalProps {
  error: AIError;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
  showSupport?: boolean;
  supportUrl?: string;
}

export const AIErrorModal = memo(function AIErrorModal({
  error,
  isOpen,
  onClose,
  onRetry,
  showSupport = false,
  supportUrl = '/support',
}: AIErrorModalProps) {
  const emoji = getErrorEmoji(error.code);
  const suggestedAction = getSuggestedAction(error);
  const styles = severityStyles[error.severity];
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Visual Header */}
          <div className={`p-6 text-center ${styles.bg}`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-16 h-16 mx-auto rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-3xl"
            >
              {emoji}
            </motion.div>
            <h3 className={`mt-4 text-xl font-bold ${styles.text}`}>
              {error.userTitle}
            </h3>
          </div>
          
          {/* Content */}
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              {error.userMessage}
            </p>
            {suggestedAction && (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                {suggestedAction}
              </p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex flex-col gap-2 p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            {error.retryable && onRetry && (
              <button
                onClick={() => {
                  onRetry();
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tekrar Dene
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium transition-colors"
            >
              Tamam
            </button>
            
            {showSupport && error.severity === 'critical' && (
              <a
                href={supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center gap-1"
              >
                Destek Al <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default AIErrorDisplay;
