/**
 * AI Access Control
 * 
 * Kullanıcı rolüne göre AI erişim kontrolü.
 * Rollout stratejisi yönetimi.
 */

import type { AIFeatureType } from '@/types/ai';
import type { UserRole, User } from '@/types';
import {
  type AIFeatureFlagConfig,
  type RolloutStrategy,
  getFeatureConfig,
  isAIEnabled,
  isFeatureEnabled,
  isDebugMode,
} from './featureFlags';

// =============================================================================
// ACCESS CHECK RESULT
// =============================================================================

export interface AccessCheckResult {
  /** Access granted */
  allowed: boolean;
  /** Reason for denial (if not allowed) */
  reason?: AccessDeniedReason;
  /** User-friendly message */
  message?: string;
  /** Should hide from UI completely */
  hideFromUI: boolean;
}

export type AccessDeniedReason =
  | 'ai_disabled'
  | 'feature_disabled'
  | 'role_not_allowed'
  | 'not_in_rollout'
  | 'not_in_beta'
  | 'not_internal'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'not_authenticated';

const REASON_MESSAGES: Record<AccessDeniedReason, string> = {
  ai_disabled: 'AI özellikleri şu anda devre dışı.',
  feature_disabled: 'Bu özellik şu anda kullanılamıyor.',
  role_not_allowed: 'Bu özelliğe erişim yetkiniz yok.',
  not_in_rollout: 'Bu özellik henüz sizin için aktif değil.',
  not_in_beta: 'Bu özellik beta kullanıcıları için açık.',
  not_internal: 'Bu özellik sadece iç kullanım için.',
  quota_exceeded: 'AI kullanım kotanız doldu.',
  rate_limited: 'Çok fazla istek gönderdiniz. Lütfen bekleyin.',
  not_authenticated: 'Lütfen giriş yapın.',
};

// =============================================================================
// ROLE-BASED ACCESS
// =============================================================================

/**
 * Check if user role is allowed for feature
 */
export function checkRoleAccess(
  userRole: UserRole | undefined,
  allowedRoles: UserRole[]
): boolean {
  if (!userRole) return false;
  
  // Super admin always has access
  if (userRole === 'super_admin') return true;
  
  return allowedRoles.includes(userRole);
}

/**
 * Get features accessible by role
 */
export function getAccessibleFeatures(
  userRole: UserRole
): AIFeatureType[] {
  const allFeatures: AIFeatureType[] = [
    'question_hint',
    'topic_explanation',
    'study_plan',
    'answer_evaluation',
    'performance_analysis',
    'question_generation',
    'content_enhancement',
    'motivation_message',
  ];
  
  return allFeatures.filter(feature => {
    const config = getFeatureConfig(feature);
    return config.enabled && checkRoleAccess(userRole, config.allowedRoles);
  });
}

// =============================================================================
// ROLLOUT CHECKS
// =============================================================================

/**
 * Check percentage-based rollout
 * Uses consistent hashing for stable assignment
 */
function checkPercentageRollout(
  userId: string,
  featureId: string,
  percentage: number
): boolean {
  // Create a stable hash from user + feature
  const hash = simpleHash(`${userId}:${featureId}`);
  const bucket = hash % 100;
  return bucket < percentage;
}

/**
 * Simple hash function for rollout bucketing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if user is in beta program
 */
function checkBetaAccess(
  userId: string,
  betaUserIds: string[] = []
): boolean {
  return betaUserIds.includes(userId);
}

/**
 * Check if user is internal
 */
function checkInternalAccess(
  userEmail: string | undefined,
  internalDomains: string[] = []
): boolean {
  if (!userEmail) return false;
  return internalDomains.some(domain => 
    userEmail.toLowerCase().endsWith(domain.toLowerCase())
  );
}

/**
 * Check rollout strategy for user
 */
export function checkRolloutAccess(
  user: User | null,
  config: AIFeatureFlagConfig,
  featureId: string
): { allowed: boolean; reason?: AccessDeniedReason } {
  if (!user) {
    return { allowed: false, reason: 'not_authenticated' };
  }
  
  switch (config.rolloutStrategy) {
    case 'disabled':
      return { allowed: false, reason: 'feature_disabled' };
      
    case 'full':
      return { allowed: true };
      
    case 'role_based':
      if (checkRoleAccess(user.role, config.allowedRoles)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'role_not_allowed' };
      
    case 'percentage':
      if (checkPercentageRollout(
        user.id.toString(),
        featureId,
        config.rolloutPercentage || 0
      )) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'not_in_rollout' };
      
    case 'beta':
      if (checkBetaAccess(user.id.toString(), config.betaUserIds)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'not_in_beta' };
      
    case 'internal':
      if (checkInternalAccess(user.email, config.internalDomains)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'not_internal' };
      
    default:
      return { allowed: false, reason: 'feature_disabled' };
  }
}

// =============================================================================
// MAIN ACCESS CHECK
// =============================================================================

/**
 * Comprehensive access check for AI feature
 */
export function checkFeatureAccess(
  feature: AIFeatureType,
  user: User | null
): AccessCheckResult {
  // 1. Check if AI is globally enabled
  if (!isAIEnabled()) {
    return {
      allowed: false,
      reason: 'ai_disabled',
      message: REASON_MESSAGES.ai_disabled,
      hideFromUI: true,
    };
  }
  
  // 2. Check if feature is enabled
  if (!isFeatureEnabled(feature)) {
    return {
      allowed: false,
      reason: 'feature_disabled',
      message: REASON_MESSAGES.feature_disabled,
      hideFromUI: true,
    };
  }
  
  // 3. Check authentication
  if (!user) {
    return {
      allowed: false,
      reason: 'not_authenticated',
      message: REASON_MESSAGES.not_authenticated,
      hideFromUI: false, // Show but prompt login
    };
  }
  
  const config = getFeatureConfig(feature);
  
  // 4. Check role access
  if (!checkRoleAccess(user.role, config.allowedRoles)) {
    return {
      allowed: false,
      reason: 'role_not_allowed',
      message: REASON_MESSAGES.role_not_allowed,
      hideFromUI: true, // Hide from unauthorized roles
    };
  }
  
  // 5. Check rollout strategy
  const rolloutResult = checkRolloutAccess(user, config, feature);
  if (!rolloutResult.allowed) {
    return {
      allowed: false,
      reason: rolloutResult.reason,
      message: rolloutResult.reason ? REASON_MESSAGES[rolloutResult.reason] : undefined,
      hideFromUI: !config.showInUI, // Based on config
    };
  }
  
  // All checks passed
  return {
    allowed: true,
    hideFromUI: false,
  };
}

/**
 * Quick check - just returns boolean
 */
export function canAccessFeature(
  feature: AIFeatureType,
  user: User | null
): boolean {
  return checkFeatureAccess(feature, user).allowed;
}

/**
 * Check multiple features at once
 */
export function checkFeaturesAccess(
  features: AIFeatureType[],
  user: User | null
): Record<AIFeatureType, AccessCheckResult> {
  const results: Partial<Record<AIFeatureType, AccessCheckResult>> = {};
  
  for (const feature of features) {
    results[feature] = checkFeatureAccess(feature, user);
  }
  
  return results as Record<AIFeatureType, AccessCheckResult>;
}

// =============================================================================
// VISIBILITY HELPERS
// =============================================================================

/**
 * Get features that should be visible in UI for user
 */
export function getVisibleFeatures(user: User | null): AIFeatureType[] {
  const allFeatures: AIFeatureType[] = [
    'question_hint',
    'topic_explanation',
    'study_plan',
    'answer_evaluation',
    'performance_analysis',
    'question_generation',
    'content_enhancement',
    'motivation_message',
  ];
  
  return allFeatures.filter(feature => {
    const result = checkFeatureAccess(feature, user);
    return !result.hideFromUI;
  });
}

/**
 * Check if any AI feature is available
 */
export function hasAnyAIAccess(user: User | null): boolean {
  const visible = getVisibleFeatures(user);
  return visible.length > 0 && visible.some(f => checkFeatureAccess(f, user).allowed);
}

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

/**
 * Get detailed access report (for debugging)
 */
export function getAccessReport(user: User | null): {
  globalEnabled: boolean;
  environment: string;
  debugMode: boolean;
  features: Record<AIFeatureType, {
    enabled: boolean;
    mode: string;
    allowed: boolean;
    reason?: string;
    visible: boolean;
  }>;
} {
  const allFeatures: AIFeatureType[] = [
    'question_hint',
    'topic_explanation',
    'study_plan',
    'answer_evaluation',
    'performance_analysis',
    'question_generation',
    'content_enhancement',
    'motivation_message',
  ];
  
  const features: Record<string, any> = {};
  
  for (const feature of allFeatures) {
    const config = getFeatureConfig(feature);
    const access = checkFeatureAccess(feature, user);
    
    features[feature] = {
      enabled: config.enabled,
      mode: config.mode,
      allowed: access.allowed,
      reason: access.reason,
      visible: !access.hideFromUI,
    };
  }
  
  return {
    globalEnabled: isAIEnabled(),
    environment: isDebugMode() ? 'debug' : 'production',
    debugMode: isDebugMode(),
    features: features as any,
  };
}
