/**
 * AI Configuration Module - Barrel Export
 * 
 * Feature flags, access control ve guard components.
 */

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export {
  // Types
  type Environment,
  type AIMode,
  type RolloutStrategy,
  type AIFeatureFlagConfig,
  type AIGlobalConfig,
  type AIEnvironmentConfig,
  
  // Constants
  DEFAULT_FEATURE_CONFIG,
  ENVIRONMENT_CONFIGS,
  
  // Config Access
  getAIConfig,
  getFeatureConfig,
  getGlobalConfig,
  
  // Feature Checks
  isAIEnabled,
  isFeatureEnabled,
  getFeatureMode,
  shouldShowFeature,
  
  // Environment Helpers
  getCurrentEnvironment,
  isDevelopment,
  isProduction,
  isDebugMode,
  
  // Config Management
  setAIConfigOverrides,
  clearAIConfigCache,
} from './featureFlags';

// =============================================================================
// ACCESS CONTROL
// =============================================================================

export {
  // Types
  type AccessCheckResult,
  type AccessDeniedReason,
  
  // Role Checks
  checkRoleAccess,
  getAccessibleFeatures,
  
  // Rollout Checks
  checkRolloutAccess,
  
  // Main Access Check
  checkFeatureAccess,
  canAccessFeature,
  checkFeaturesAccess,
  
  // Visibility
  getVisibleFeatures,
  hasAnyAIAccess,
  
  // Debug
  getAccessReport,
} from './accessControl';

// =============================================================================
// GUARD COMPONENTS
// =============================================================================

export {
  // Components
  AIFeatureGuard,
  AIGlobalGuard,
  AIRoleGuard,
  AIAccessDenied,
  AIConditional,
  AIAnyAccessGuard,
  
  // Hooks
  useAIFeatureAccess,
  useAIFeaturesAccess,
  
  // Types
  type AIFeatureGuardProps,
  type AIGlobalGuardProps,
  type AIRoleGuardProps,
  type AIAccessDeniedProps,
} from './AIFeatureGuard';

// =============================================================================
// HOOKS
// =============================================================================

export {
  // Main Hook
  useAIFlags,
  
  // Single Feature Hook
  useFeatureFlag,
  
  // Multiple Features Hook
  useFeatureFlags,
  
  // Environment Hook
  useAIEnvironment,
  
  // Debug Hook
  useAIFlagsDebug,
  
  // Types
  type UseAIFlagsReturn,
  type UseFeatureFlagReturn,
} from './useAIFeatureFlags';

// =============================================================================
// PRODUCTION TRANSITION
// =============================================================================

export {
  // Types
  type TransitionPhase,
  type HealthStatus,
  type TransitionConfig,
  type TransitionMetrics,
  type RollbackEvent,
  type PhaseConfig,
  type TransitionState,
  type FeatureTransitionState,
  
  // Phase Configs
  PHASE_CONFIGS,
  
  // Transition State
  getTransitionConfig,
  getCurrentPhaseConfig,
  getTransitionMetrics,
  shouldUseRealAPI,
  getTransitionMode,
  
  // Metrics
  updateMetrics,
  updateFeatureMetrics,
  
  // Phase Management
  rollbackToPreviousPhase,
  advanceToNextPhase,
  setPhase,
  resetTransition,
  getRollbackHistory,
  
  // Feature Management
  getFeatureTransitionState,
  disableFeature,
  enableFeature,
} from './productionTransition';

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

export {
  // Types
  type PerformanceMetric,
  type PerformanceThresholds,
  type PerformanceSummary,
  
  // Thresholds
  PERFORMANCE_THRESHOLDS,
  
  // Tracker
  performanceTracker,
  PerformanceTracker,
  
  // UX Helpers
  getRecommendedSkeletonDuration,
  shouldShowDelayMessage,
  getEstimatedRemainingTime,
  getUXDelayClass,
} from './performanceMonitor';

// =============================================================================
// STREAMING ADAPTER
// =============================================================================

export {
  // Types
  type StreamingState,
  type StreamingProgress,
  type StreamingConfig,
  type UseStreamingUIOptions,
  type UseStreamingUIReturn,
  
  // Manager
  StreamingUIManager,
  DEFAULT_STREAMING_CONFIG,
  
  // Hook
  useStreamingUI,
  
  // UI Helpers
  getTypingIndicatorClass,
  getStreamingStatusMessage,
  getStreamingProgressPercent,
  shouldShowConnectionWarning,
} from './streamingAdapter';

// =============================================================================
// ENVIRONMENT CONFIG
// =============================================================================

export {
  // Types
  type AIEnvConfig,
  type ProductionPreset,
  
  // Loader
  loadEnvConfig,
  clearEnvConfigCache,
  
  // Helpers
  isProductionRealAPI,
  shouldUseMockFallback,
  getEnvRolloutStrategy,
  
  // Presets
  PRODUCTION_PRESETS,
  generateEnvContent,
  ENV_DEFAULTS,
} from './envConfig';
