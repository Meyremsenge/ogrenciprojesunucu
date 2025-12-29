/**
 * AI Feature Guard Component
 * 
 * AI özelliklerinin erişim kontrolü için wrapper bileşenler.
 * Role-based ve feature flag kontrolü yapar.
 */

import React, { type ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AIFeatureType } from '@/types/ai';
import type { User } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import {
  checkFeatureAccess,
  canAccessFeature,
  hasAnyAIAccess,
  type AccessCheckResult,
  type AccessDeniedReason,
} from './accessControl';
import { isAIEnabled, getGlobalConfig } from './featureFlags';

// =============================================================================
// TYPES
// =============================================================================

interface AIFeatureGuardProps {
  /** Feature to check access for */
  feature: AIFeatureType;
  /** Children to render if access granted */
  children: ReactNode;
  /** What to render when access denied (optional) */
  fallback?: ReactNode;
  /** Custom user (defaults to auth store) */
  user?: User | null;
  /** Hide completely when denied (no fallback) */
  hideWhenDenied?: boolean;
  /** Show loading state */
  showLoading?: boolean;
}

interface AIGlobalGuardProps {
  /** Children to render if AI is enabled */
  children: ReactNode;
  /** What to render when AI is disabled */
  fallback?: ReactNode;
  /** Hide completely when disabled */
  hideWhenDisabled?: boolean;
}

interface AIRoleGuardProps {
  /** Required roles */
  roles: string[];
  /** Children to render if role matches */
  children: ReactNode;
  /** Fallback when role doesn't match */
  fallback?: ReactNode;
  /** Require all roles (AND) vs any role (OR) */
  requireAll?: boolean;
}

interface AIAccessDeniedProps {
  /** Denial reason */
  reason: AccessDeniedReason;
  /** Feature that was denied */
  feature?: AIFeatureType;
  /** Custom message */
  message?: string;
  /** Show retry option */
  showRetry?: boolean;
  /** Retry callback */
  onRetry?: () => void;
  /** Compact mode */
  compact?: boolean;
}

// =============================================================================
// ACCESS DENIED COMPONENT
// =============================================================================

export function AIAccessDenied({
  reason,
  feature,
  message,
  showRetry = false,
  onRetry,
  compact = false,
}: AIAccessDeniedProps) {
  const config = getReasonConfig(reason);
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>{config.icon}</span>
        <span>{message || config.message}</span>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="text-4xl mb-3">{config.icon}</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
        {config.title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        {message || config.message}
      </p>
      
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tekrar Dene
        </button>
      )}
      
      {reason === 'not_authenticated' && (
        <button
          onClick={() => window.location.href = '/login'}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Giriş Yap
        </button>
      )}
    </motion.div>
  );
}

function getReasonConfig(reason: AccessDeniedReason): {
  icon: string;
  title: string;
  message: string;
} {
  const configs: Record<AccessDeniedReason, { icon: string; title: string; message: string }> = {
    ai_disabled: {
      icon: '🔌',
      title: 'AI Devre Dışı',
      message: 'AI özellikleri şu anda kullanılamıyor.',
    },
    feature_disabled: {
      icon: '🚧',
      title: 'Özellik Kullanılamıyor',
      message: 'Bu özellik şu anda bakımda veya devre dışı.',
    },
    role_not_allowed: {
      icon: '🔒',
      title: 'Erişim Kısıtlı',
      message: 'Bu özelliğe erişim yetkiniz bulunmuyor.',
    },
    not_in_rollout: {
      icon: '⏳',
      title: 'Yakında Sizde',
      message: 'Bu özellik kademeli olarak açılıyor.',
    },
    not_in_beta: {
      icon: '🧪',
      title: 'Beta Özelliği',
      message: 'Bu özellik şu anda beta kullanıcıları için açık.',
    },
    not_internal: {
      icon: '🏢',
      title: 'İç Kullanım',
      message: 'Bu özellik şu anda sadece iç kullanıcılar için.',
    },
    quota_exceeded: {
      icon: '📊',
      title: 'Kota Doldu',
      message: 'AI kullanım kotanız doldu. Yarın tekrar deneyin.',
    },
    rate_limited: {
      icon: '⏱️',
      title: 'Çok Hızlı',
      message: 'Çok fazla istek gönderdiniz. Biraz bekleyin.',
    },
    not_authenticated: {
      icon: '🔐',
      title: 'Giriş Gerekli',
      message: 'Bu özelliği kullanmak için giriş yapmalısınız.',
    },
  };
  
  return configs[reason] || configs.feature_disabled;
}

// =============================================================================
// FEATURE GUARD
// =============================================================================

/**
 * Guard component for individual AI features
 * 
 * @example
 * ```tsx
 * <AIFeatureGuard feature="question_hint">
 *   <HintButton />
 * </AIFeatureGuard>
 * ```
 */
export function AIFeatureGuard({
  feature,
  children,
  fallback,
  user: customUser,
  hideWhenDenied = false,
  showLoading = false,
}: AIFeatureGuardProps) {
  const authUser = useAuthStore((state) => state.user);
  const user = customUser !== undefined ? customUser : authUser;
  
  const accessResult = useMemo(() => 
    checkFeatureAccess(feature, user),
    [feature, user]
  );
  
  // Access granted - render children
  if (accessResult.allowed) {
    return <>{children}</>;
  }
  
  // Should hide completely
  if (accessResult.hideFromUI || hideWhenDenied) {
    return null;
  }
  
  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Default denial UI
  return (
    <AIAccessDenied
      reason={accessResult.reason!}
      feature={feature}
      message={accessResult.message}
      compact
    />
  );
}

// =============================================================================
// GLOBAL GUARD
// =============================================================================

/**
 * Guard component for global AI access
 * 
 * @example
 * ```tsx
 * <AIGlobalGuard>
 *   <AIAssistantButton />
 * </AIGlobalGuard>
 * ```
 */
export function AIGlobalGuard({
  children,
  fallback,
  hideWhenDisabled = true,
}: AIGlobalGuardProps) {
  const enabled = isAIEnabled();
  const globalConfig = getGlobalConfig();
  
  if (enabled) {
    return <>{children}</>;
  }
  
  if (hideWhenDisabled) {
    return null;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <AIAccessDenied
      reason="ai_disabled"
      compact
    />
  );
}

// =============================================================================
// ROLE GUARD
// =============================================================================

/**
 * Guard based on user roles
 * 
 * @example
 * ```tsx
 * <AIRoleGuard roles={['teacher', 'admin']}>
 *   <TeacherAITools />
 * </AIRoleGuard>
 * ```
 */
export function AIRoleGuard({
  roles,
  children,
  fallback,
  requireAll = false,
}: AIRoleGuardProps) {
  const user = useAuthStore((state) => state.user);
  
  const hasAccess = useMemo(() => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    
    if (requireAll) {
      return roles.every(role => user.role === role);
    }
    return roles.includes(user.role);
  }, [user, roles, requireAll]);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return null;
}

// =============================================================================
// CONDITIONAL WRAPPERS
// =============================================================================

interface AIConditionalProps {
  /** Condition to check */
  when: boolean;
  /** Children to render when true */
  children: ReactNode;
  /** Fallback when false */
  fallback?: ReactNode;
}

/**
 * Simple conditional rendering helper
 */
export function AIConditional({ when, children, fallback }: AIConditionalProps) {
  return when ? <>{children}</> : <>{fallback}</> || null;
}

/**
 * Check if user has any AI access
 */
export function AIAnyAccessGuard({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const hasAccess = useMemo(() => hasAnyAIAccess(user), [user]);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return null;
}

// =============================================================================
// HOOK FOR CONDITIONAL RENDERING
// =============================================================================

/**
 * Hook for checking feature access in components
 */
export function useAIFeatureAccess(feature: AIFeatureType): AccessCheckResult & {
  canAccess: boolean;
} {
  const user = useAuthStore((state) => state.user);
  
  return useMemo(() => {
    const result = checkFeatureAccess(feature, user);
    return {
      ...result,
      canAccess: result.allowed,
    };
  }, [feature, user]);
}

/**
 * Hook for checking multiple features
 */
export function useAIFeaturesAccess(features: AIFeatureType[]): {
  results: Record<AIFeatureType, AccessCheckResult>;
  hasAnyAccess: boolean;
  hasAllAccess: boolean;
} {
  const user = useAuthStore((state) => state.user);
  
  return useMemo(() => {
    const results: Partial<Record<AIFeatureType, AccessCheckResult>> = {};
    
    for (const feature of features) {
      results[feature] = checkFeatureAccess(feature, user);
    }
    
    const resultValues = Object.values(results) as AccessCheckResult[];
    
    return {
      results: results as Record<AIFeatureType, AccessCheckResult>,
      hasAnyAccess: resultValues.some(r => r.allowed),
      hasAllAccess: resultValues.every(r => r.allowed),
    };
  }, [features, user]);
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { AIFeatureGuardProps, AIGlobalGuardProps, AIRoleGuardProps, AIAccessDeniedProps };
