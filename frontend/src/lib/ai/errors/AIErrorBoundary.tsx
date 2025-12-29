/**
 * AI Error Boundary
 * 
 * React Error Boundary for AI components.
 * Catches rendering errors and displays fallback UI.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, Home, MessageSquare } from 'lucide-react';
import { AI_ERROR_CODES, AIError } from './types';
import { createAIError, formatErrorForLogging } from './messages';

// =============================================================================
// TYPES
// =============================================================================

export interface AIErrorBoundaryProps {
  /** Child components */
  children: ReactNode;
  /** Fallback component */
  fallback?: ReactNode | ((error: AIError, reset: () => void) => ReactNode);
  /** Error handler callback */
  onError?: (error: AIError, errorInfo: ErrorInfo) => void;
  /** Feature name for context */
  feature?: string;
  /** Show compact fallback */
  compact?: boolean;
  /** Custom class */
  className?: string;
}

interface AIErrorBoundaryState {
  hasError: boolean;
  error: AIError | null;
  errorInfo: ErrorInfo | null;
}

// =============================================================================
// ERROR BOUNDARY
// =============================================================================

export class AIErrorBoundary extends Component<AIErrorBoundaryProps, AIErrorBoundaryState> {
  constructor(props: AIErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<AIErrorBoundaryState> {
    // Convert to AIError
    const aiError = createAIError(
      AI_ERROR_CODES.UNKNOWN,
      error.message,
      { originalError: error }
    );
    
    return {
      hasError: true,
      error: aiError,
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Create structured error
    const aiError = this.state.error || createAIError(
      AI_ERROR_CODES.UNKNOWN,
      error.message,
      { originalError: error }
    );
    
    // Log error
    console.error('[AIErrorBoundary] Caught error:', formatErrorForLogging(aiError));
    console.error('[AIErrorBoundary] Component stack:', errorInfo.componentStack);
    
    // Update state with errorInfo
    this.setState({ errorInfo });
    
    // Call error handler
    this.props.onError?.(aiError, errorInfo);
  }
  
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };
  
  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, compact, className, feature } = this.props;
    
    if (!hasError || !error) {
      return children;
    }
    
    // Custom fallback
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(error, this.handleReset);
      }
      return fallback;
    }
    
    // Default fallback UI
    if (compact) {
      return (
        <AIErrorBoundaryCompact
          error={error}
          onReset={this.handleReset}
          className={className}
        />
      );
    }
    
    return (
      <AIErrorBoundaryFallback
        error={error}
        feature={feature}
        onReset={this.handleReset}
        className={className}
      />
    );
  }
}

// =============================================================================
// FALLBACK COMPONENTS
// =============================================================================

interface FallbackProps {
  error: AIError;
  onReset: () => void;
  feature?: string;
  className?: string;
}

function AIErrorBoundaryFallback({ error, onReset, feature, className = '' }: FallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex flex-col items-center justify-center p-8 text-center
        min-h-[300px] rounded-xl
        bg-gradient-to-b from-red-50 to-white dark:from-red-900/20 dark:to-gray-900/50
        border border-red-200 dark:border-red-800
        ${className}
      `}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4"
      >
        <AlertCircle className="w-8 h-8 text-red-500" />
      </motion.div>
      
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Bir Sorun Oluştu
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 max-w-md mb-2">
        {feature ? `${feature} bileşeni` : 'Bu bileşen'} beklenmedik bir hatayla karşılaştı.
      </p>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Endişelenmeyin, sayfayı yenileyerek devam edebilirsiniz.
      </p>
      
      {/* Actions */}
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </motion.button>
        
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium transition-colors"
        >
          <Home className="w-4 h-4" />
          Sayfayı Yenile
        </button>
      </div>
      
      {/* Support Link */}
      <a
        href="/support"
        className="flex items-center gap-1 mt-6 text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
      >
        <MessageSquare className="w-3 h-3" />
        Sorun devam ederse destek alın
      </a>
    </motion.div>
  );
}

function AIErrorBoundaryCompact({ error, onReset, className = '' }: Omit<FallbackProps, 'feature'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-center gap-3 p-4 rounded-lg
        bg-red-50 dark:bg-red-900/20
        border border-red-200 dark:border-red-800
        ${className}
      `}
    >
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-red-800 dark:text-red-200 text-sm">
          Bileşen yüklenemedi
        </p>
        <p className="text-xs text-red-600 dark:text-red-300">
          Tekrar deneyin veya sayfayı yenileyin.
        </p>
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Tekrar
      </button>
    </motion.div>
  );
}

// =============================================================================
// HOC WRAPPER
// =============================================================================

/**
 * Higher-Order Component for wrapping components with error boundary
 */
export function withAIErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<AIErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  function WithErrorBoundary(props: P) {
    return (
      <AIErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </AIErrorBoundary>
    );
  }
  
  WithErrorBoundary.displayName = `withAIErrorBoundary(${displayName})`;
  
  return WithErrorBoundary;
}

export default AIErrorBoundary;
