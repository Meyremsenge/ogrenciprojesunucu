/**
 * AI Feature Flags & Configuration
 * 
 * Environment-based AI feature management.
 * Mock/Real API switching ve rollout strategies.
 * 
 * MIMARI:
 * =======
 * 1. Environment Config - Dev/Staging/Production ayarları
 * 2. Feature Flags - Özellik bazlı açma/kapama
 * 3. Role Guards - Kullanıcı rolüne göre erişim
 * 4. Rollout Strategies - Güvenli production release
 */

import type { AIFeatureType } from '@/types/ai';
import type { UserRole } from '@/types';

// =============================================================================
// ENVIRONMENT TYPES
// =============================================================================

export type Environment = 'development' | 'staging' | 'production' | 'test';

export type AIMode = 'disabled' | 'mock' | 'real' | 'hybrid';

export type RolloutStrategy = 
  | 'disabled'           // Tamamen kapalı
  | 'internal'           // Sadece internal kullanıcılar
  | 'beta'               // Beta kullanıcıları
  | 'percentage'         // Yüzdelik rollout
  | 'role_based'         // Role bazlı
  | 'full';              // Herkes için açık

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface AIFeatureFlagConfig {
  /** Feature enabled/disabled */
  enabled: boolean;
  /** Current AI mode */
  mode: AIMode;
  /** Allowed user roles */
  allowedRoles: UserRole[];
  /** Rollout strategy */
  rolloutStrategy: RolloutStrategy;
  /** Rollout percentage (0-100) when strategy is 'percentage' */
  rolloutPercentage?: number;
  /** Beta user IDs when strategy is 'beta' */
  betaUserIds?: string[];
  /** Internal domains when strategy is 'internal' */
  internalDomains?: string[];
  /** Show in UI */
  showInUI: boolean;
  /** Feature-specific config overrides */
  config?: Record<string, unknown>;
}

export interface AIGlobalConfig {
  /** Global AI enable/disable */
  aiEnabled: boolean;
  /** Default mode for all features */
  defaultMode: AIMode;
  /** Environment */
  environment: Environment;
  /** Show AI features in navigation */
  showInNav: boolean;
  /** Show AI assistant button */
  showAssistantButton: boolean;
  /** Enable AI analytics */
  enableAnalytics: boolean;
  /** Enable debug mode */
  debugMode: boolean;
  /** Fallback to mock on API failure */
  fallbackToMock: boolean;
  /** Rate limit (requests per minute) */
  rateLimitPerMinute: number;
  /** Max concurrent requests */
  maxConcurrentRequests: number;
}

export interface AIEnvironmentConfig {
  global: AIGlobalConfig;
  features: Partial<Record<AIFeatureType, Partial<AIFeatureFlagConfig>>>;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

const DEFAULT_FEATURE_CONFIG: AIFeatureFlagConfig = {
  enabled: true,
  mode: 'real',
  allowedRoles: ['student', 'teacher', 'admin', 'super_admin'],
  rolloutStrategy: 'full',
  showInUI: true,
};

const ENVIRONMENT_CONFIGS: Record<Environment, AIEnvironmentConfig> = {
  // Development - Full access, mock mode
  development: {
    global: {
      aiEnabled: true,
      defaultMode: 'mock',
      environment: 'development',
      showInNav: true,
      showAssistantButton: true,
      enableAnalytics: false,
      debugMode: true,
      fallbackToMock: true,
      rateLimitPerMinute: 100,
      maxConcurrentRequests: 10,
    },
    features: {
      // All features enabled in dev
    },
  },
  
  // Staging - Real API, internal users
  staging: {
    global: {
      aiEnabled: true,
      defaultMode: 'real',
      environment: 'staging',
      showInNav: true,
      showAssistantButton: true,
      enableAnalytics: true,
      debugMode: true,
      fallbackToMock: true,
      rateLimitPerMinute: 60,
      maxConcurrentRequests: 5,
    },
    features: {
      question_generation: {
        rolloutStrategy: 'internal',
        internalDomains: ['@company.com', '@test.com'],
      },
    },
  },
  
  // Production - Controlled rollout
  production: {
    global: {
      aiEnabled: true,
      defaultMode: 'real',
      environment: 'production',
      showInNav: true,
      showAssistantButton: true,
      enableAnalytics: true,
      debugMode: false,
      fallbackToMock: false,
      rateLimitPerMinute: 30,
      maxConcurrentRequests: 3,
    },
    features: {
      // Conservative rollout for new features
      question_generation: {
        rolloutStrategy: 'percentage',
        rolloutPercentage: 50,
      },
      content_enhancement: {
        rolloutStrategy: 'role_based',
        allowedRoles: ['teacher', 'admin', 'super_admin'],
      },
    },
  },
  
  // Test - Mock mode, all enabled
  test: {
    global: {
      aiEnabled: true,
      defaultMode: 'mock',
      environment: 'test',
      showInNav: true,
      showAssistantButton: true,
      enableAnalytics: false,
      debugMode: true,
      fallbackToMock: true,
      rateLimitPerMinute: 1000,
      maxConcurrentRequests: 100,
    },
    features: {},
  },
};

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

function detectEnvironment(): Environment {
  // Check Vite environment variable first
  const envVar = import.meta.env.VITE_APP_ENV as string | undefined;
  if (envVar && ['development', 'staging', 'production', 'test'].includes(envVar)) {
    return envVar as Environment;
  }
  
  // Fallback to Vite mode
  if (import.meta.env.MODE === 'test') return 'test';
  if (import.meta.env.DEV) return 'development';
  if (import.meta.env.PROD) return 'production';
  
  return 'development';
}

// =============================================================================
// CONFIGURATION LOADING
// =============================================================================

let cachedConfig: AIEnvironmentConfig | null = null;
let configOverrides: Partial<AIEnvironmentConfig> | null = null;

/**
 * Get current environment configuration
 */
export function getAIConfig(): AIEnvironmentConfig {
  if (cachedConfig) return cachedConfig;
  
  const env = detectEnvironment();
  const baseConfig = ENVIRONMENT_CONFIGS[env];
  
  // Apply environment variable overrides
  const envOverrides = loadEnvOverrides();
  
  // Merge configs
  cachedConfig = mergeConfigs(baseConfig, envOverrides, configOverrides || {});
  
  return cachedConfig;
}

/**
 * Load overrides from environment variables
 */
function loadEnvOverrides(): Partial<AIEnvironmentConfig> {
  const overrides: Partial<AIEnvironmentConfig> = {
    global: {} as AIGlobalConfig,
    features: {},
  };
  
  // Global overrides
  if (import.meta.env.VITE_AI_ENABLED !== undefined) {
    overrides.global!.aiEnabled = import.meta.env.VITE_AI_ENABLED === 'true';
  }
  
  if (import.meta.env.VITE_AI_MODE) {
    overrides.global!.defaultMode = import.meta.env.VITE_AI_MODE as AIMode;
  }
  
  if (import.meta.env.VITE_AI_DEBUG === 'true') {
    overrides.global!.debugMode = true;
  }
  
  if (import.meta.env.VITE_AI_FALLBACK_MOCK === 'true') {
    overrides.global!.fallbackToMock = true;
  }
  
  return overrides;
}

/**
 * Deep merge configurations
 */
function mergeConfigs(
  base: AIEnvironmentConfig,
  ...overrides: Partial<AIEnvironmentConfig>[]
): AIEnvironmentConfig {
  let result = { ...base, global: { ...base.global }, features: { ...base.features } };
  
  for (const override of overrides) {
    if (override.global) {
      result.global = { ...result.global, ...override.global };
    }
    if (override.features) {
      result.features = { ...result.features, ...override.features };
    }
  }
  
  return result;
}

/**
 * Set runtime config overrides (useful for testing or admin panel)
 */
export function setAIConfigOverrides(overrides: Partial<AIEnvironmentConfig>): void {
  configOverrides = overrides;
  cachedConfig = null; // Clear cache to recompute
}

/**
 * Clear config cache (force reload)
 */
export function clearAIConfigCache(): void {
  cachedConfig = null;
}

// =============================================================================
// FEATURE FLAG ACCESS
// =============================================================================

/**
 * Get configuration for a specific feature
 */
export function getFeatureConfig(feature: AIFeatureType): AIFeatureFlagConfig {
  const config = getAIConfig();
  const featureOverride = config.features[feature] || {};
  
  // Merge with defaults, applying global mode
  return {
    ...DEFAULT_FEATURE_CONFIG,
    mode: config.global.defaultMode,
    ...featureOverride,
  };
}

/**
 * Check if AI is globally enabled
 */
export function isAIEnabled(): boolean {
  return getAIConfig().global.aiEnabled;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: AIFeatureType): boolean {
  if (!isAIEnabled()) return false;
  return getFeatureConfig(feature).enabled;
}

/**
 * Get current AI mode for a feature
 */
export function getFeatureMode(feature: AIFeatureType): AIMode {
  if (!isAIEnabled()) return 'disabled';
  return getFeatureConfig(feature).mode;
}

/**
 * Check if feature should be shown in UI
 */
export function shouldShowFeature(feature: AIFeatureType): boolean {
  if (!isAIEnabled()) return false;
  const config = getFeatureConfig(feature);
  return config.enabled && config.showInUI;
}

/**
 * Get global config values
 */
export function getGlobalConfig(): AIGlobalConfig {
  return getAIConfig().global;
}

// =============================================================================
// ENVIRONMENT HELPERS
// =============================================================================

/**
 * Get current environment
 */
export function getCurrentEnvironment(): Environment {
  return getAIConfig().global.environment;
}

/**
 * Check if in development mode
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === 'development';
}

/**
 * Check if in production mode
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === 'production';
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return getAIConfig().global.debugMode;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DEFAULT_FEATURE_CONFIG, ENVIRONMENT_CONFIGS };
