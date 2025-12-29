/**
 * AI Feature Flags Hook
 * 
 * React hook for accessing AI configuration and feature flags.
 * Provides reactive updates when config changes.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AIFeatureType } from '@/types/ai';
import type { User } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import {
  type AIMode,
  type Environment,
  type RolloutStrategy,
  type AIGlobalConfig,
  type AIFeatureFlagConfig,
  getAIConfig,
  getFeatureConfig,
  getGlobalConfig,
  isAIEnabled,
  isFeatureEnabled,
  shouldShowFeature,
  getFeatureMode,
  getCurrentEnvironment,
  isDevelopment,
  isProduction,
  isDebugMode,
  setAIConfigOverrides,
  clearAIConfigCache,
} from './featureFlags';
import {
  type AccessCheckResult,
  checkFeatureAccess,
  canAccessFeature,
  getVisibleFeatures,
  hasAnyAIAccess,
  getAccessReport,
} from './accessControl';

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

export interface UseAIFlagsReturn {
  // Global State
  isEnabled: boolean;
  mode: AIMode;
  environment: Environment;
  isDebug: boolean;
  isDev: boolean;
  isProd: boolean;
  
  // Global Config
  config: AIGlobalConfig;
  
  // Feature Checks
  isFeatureEnabled: (feature: AIFeatureType) => boolean;
  getFeatureMode: (feature: AIFeatureType) => AIMode;
  shouldShowFeature: (feature: AIFeatureType) => boolean;
  getFeatureConfig: (feature: AIFeatureType) => AIFeatureFlagConfig;
  
  // Access Control
  canAccess: (feature: AIFeatureType) => boolean;
  checkAccess: (feature: AIFeatureType) => AccessCheckResult;
  visibleFeatures: AIFeatureType[];
  hasAnyAccess: boolean;
  
  // Debug
  getAccessReport: () => ReturnType<typeof getAccessReport>;
  
  // Admin Controls (if authorized)
  setOverrides: typeof setAIConfigOverrides;
  refreshConfig: () => void;
}

export interface UseFeatureFlagReturn {
  enabled: boolean;
  mode: AIMode;
  canAccess: boolean;
  showInUI: boolean;
  accessResult: AccessCheckResult;
  config: AIFeatureFlagConfig;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Main hook for AI feature flags
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isEnabled, canAccess, visibleFeatures } = useAIFlags();
 *   
 *   if (!isEnabled) return null;
 *   
 *   return (
 *     <div>
 *       {canAccess('question_hint') && <HintButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIFlags(): UseAIFlagsReturn {
  const user = useAuthStore((state) => state.user);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Force refresh config
  const refreshConfig = useCallback(() => {
    clearAIConfigCache();
    setRefreshKey(k => k + 1);
  }, []);
  
  // Memoized global config
  const config = useMemo(() => getGlobalConfig(), [refreshKey]);
  
  // Memoized checks
  const checks = useMemo(() => ({
    isEnabled: isAIEnabled(),
    mode: config.defaultMode,
    environment: getCurrentEnvironment(),
    isDebug: isDebugMode(),
    isDev: isDevelopment(),
    isProd: isProduction(),
  }), [config, refreshKey]);
  
  // Feature check functions (stable references)
  const isFeatureEnabledFn = useCallback(
    (feature: AIFeatureType) => isFeatureEnabled(feature),
    [refreshKey]
  );
  
  const getFeatureModeFn = useCallback(
    (feature: AIFeatureType) => getFeatureMode(feature),
    [refreshKey]
  );
  
  const shouldShowFeatureFn = useCallback(
    (feature: AIFeatureType) => shouldShowFeature(feature),
    [refreshKey]
  );
  
  const getFeatureConfigFn = useCallback(
    (feature: AIFeatureType) => getFeatureConfig(feature),
    [refreshKey]
  );
  
  // Access control functions
  const canAccessFn = useCallback(
    (feature: AIFeatureType) => canAccessFeature(feature, user),
    [user, refreshKey]
  );
  
  const checkAccessFn = useCallback(
    (feature: AIFeatureType) => checkFeatureAccess(feature, user),
    [user, refreshKey]
  );
  
  // Visible features for current user
  const visibleFeatures = useMemo(
    () => getVisibleFeatures(user),
    [user, refreshKey]
  );
  
  // Has any access
  const hasAnyAccessVal = useMemo(
    () => hasAnyAIAccess(user),
    [user, refreshKey]
  );
  
  // Debug report
  const getAccessReportFn = useCallback(
    () => getAccessReport(user),
    [user, refreshKey]
  );
  
  return {
    // Global State
    ...checks,
    config,
    
    // Feature Checks
    isFeatureEnabled: isFeatureEnabledFn,
    getFeatureMode: getFeatureModeFn,
    shouldShowFeature: shouldShowFeatureFn,
    getFeatureConfig: getFeatureConfigFn,
    
    // Access Control
    canAccess: canAccessFn,
    checkAccess: checkAccessFn,
    visibleFeatures,
    hasAnyAccess: hasAnyAccessVal,
    
    // Debug
    getAccessReport: getAccessReportFn,
    
    // Admin Controls
    setOverrides: setAIConfigOverrides,
    refreshConfig,
  };
}

// =============================================================================
// SINGLE FEATURE HOOK
// =============================================================================

/**
 * Hook for a single feature flag
 * 
 * @example
 * ```tsx
 * function HintButton() {
 *   const { enabled, canAccess, mode } = useFeatureFlag('question_hint');
 *   
 *   if (!enabled || !canAccess) return null;
 *   
 *   return <button>Get Hint ({mode})</button>;
 * }
 * ```
 */
export function useFeatureFlag(feature: AIFeatureType): UseFeatureFlagReturn {
  const user = useAuthStore((state) => state.user);
  
  return useMemo(() => {
    const config = getFeatureConfig(feature);
    const accessResult = checkFeatureAccess(feature, user);
    
    return {
      enabled: isFeatureEnabled(feature),
      mode: getFeatureMode(feature),
      canAccess: accessResult.allowed,
      showInUI: shouldShowFeature(feature) && !accessResult.hideFromUI,
      accessResult,
      config,
    };
  }, [feature, user]);
}

// =============================================================================
// MULTIPLE FEATURES HOOK
// =============================================================================

/**
 * Hook for multiple feature flags
 */
export function useFeatureFlags(features: AIFeatureType[]): {
  flags: Record<AIFeatureType, UseFeatureFlagReturn>;
  anyEnabled: boolean;
  allEnabled: boolean;
  anyAccessible: boolean;
  allAccessible: boolean;
} {
  const user = useAuthStore((state) => state.user);
  
  return useMemo(() => {
    const flags: Partial<Record<AIFeatureType, UseFeatureFlagReturn>> = {};
    
    for (const feature of features) {
      const config = getFeatureConfig(feature);
      const accessResult = checkFeatureAccess(feature, user);
      
      flags[feature] = {
        enabled: isFeatureEnabled(feature),
        mode: getFeatureMode(feature),
        canAccess: accessResult.allowed,
        showInUI: shouldShowFeature(feature) && !accessResult.hideFromUI,
        accessResult,
        config,
      };
    }
    
    const flagValues = Object.values(flags) as UseFeatureFlagReturn[];
    
    return {
      flags: flags as Record<AIFeatureType, UseFeatureFlagReturn>,
      anyEnabled: flagValues.some(f => f.enabled),
      allEnabled: flagValues.every(f => f.enabled),
      anyAccessible: flagValues.some(f => f.canAccess),
      allAccessible: flagValues.every(f => f.canAccess),
    };
  }, [features, user]);
}

// =============================================================================
// ENVIRONMENT HOOK
// =============================================================================

/**
 * Hook for environment-specific behavior
 */
export function useAIEnvironment(): {
  environment: Environment;
  isDev: boolean;
  isStaging: boolean;
  isProd: boolean;
  isTest: boolean;
  isDebug: boolean;
  useMock: boolean;
} {
  return useMemo(() => {
    const env = getCurrentEnvironment();
    const config = getGlobalConfig();
    
    return {
      environment: env,
      isDev: env === 'development',
      isStaging: env === 'staging',
      isProd: env === 'production',
      isTest: env === 'test',
      isDebug: isDebugMode(),
      useMock: config.defaultMode === 'mock',
    };
  }, []);
}

// =============================================================================
// DEBUG HOOK
// =============================================================================

/**
 * Debug hook - logs config changes
 */
export function useAIFlagsDebug(): void {
  const { isEnabled, environment, config, getAccessReport } = useAIFlags();
  
  useEffect(() => {
    if (!isDebugMode()) return;
    
    console.group('🤖 AI Feature Flags Debug');
    console.log('Environment:', environment);
    console.log('AI Enabled:', isEnabled);
    console.log('Mode:', config.defaultMode);
    console.log('Config:', config);
    console.log('Access Report:', getAccessReport());
    console.groupEnd();
  }, [isEnabled, environment, config, getAccessReport]);
}
