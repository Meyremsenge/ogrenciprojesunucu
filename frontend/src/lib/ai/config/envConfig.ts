/**
 * Environment Configuration Loader
 * 
 * Vite environment variables'ından AI config yükleme.
 * .env dosyalarından production geçiş ayarlarını okur.
 */

import type { 
  AIMode, 
  Environment, 
  RolloutStrategy,
} from './featureFlags';
import type { TransitionPhase } from './productionTransition';

// =============================================================================
// ENVIRONMENT VARIABLE TYPES
// =============================================================================

export interface AIEnvConfig {
  // Core
  environment: Environment;
  aiMode: AIMode;
  aiEnabled: boolean;
  debugMode: boolean;
  
  // Transition
  transitionPhase: TransitionPhase;
  rolloutPercentage: number;
  autoRollback: boolean;
  errorThreshold: number;
  latencyThreshold: number;
  fallbackToMock: boolean;
  
  // Rate Limiting
  rateLimit: number;
  maxConcurrent: number;
  
  // Streaming
  streamingEnabled: boolean;
  streamingBufferSize: number;
  
  // Analytics
  analyticsEnabled: boolean;
  
  // Access Control
  internalDomains: string[];
  betaUserIds: string[];
  
  // API
  apiBaseUrl: string;
  healthEndpoint: string;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULTS: AIEnvConfig = {
  environment: 'development',
  aiMode: 'mock',
  aiEnabled: true,
  debugMode: true,
  
  transitionPhase: 'preparation',
  rolloutPercentage: 0,
  autoRollback: true,
  errorThreshold: 10,
  latencyThreshold: 3000,
  fallbackToMock: true,
  
  rateLimit: 30,
  maxConcurrent: 3,
  
  streamingEnabled: true,
  streamingBufferSize: 10,
  
  analyticsEnabled: false,
  
  internalDomains: [],
  betaUserIds: [],
  
  apiBaseUrl: '/api/v1/ai',
  healthEndpoint: '/api/v1/ai/health',
};

// =============================================================================
// PARSERS
// =============================================================================

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseArray(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function parseEnum<T extends string>(
  value: string | undefined,
  validValues: T[],
  defaultValue: T
): T {
  if (value === undefined) return defaultValue;
  return validValues.includes(value as T) ? (value as T) : defaultValue;
}

// =============================================================================
// LOADER
// =============================================================================

let cachedConfig: AIEnvConfig | null = null;

/**
 * Load AI configuration from environment variables
 */
export function loadEnvConfig(): AIEnvConfig {
  if (cachedConfig) return cachedConfig;
  
  const config: AIEnvConfig = {
    // Core
    environment: parseEnum(
      import.meta.env.VITE_APP_ENV,
      ['development', 'staging', 'production', 'test'],
      DEFAULTS.environment
    ),
    aiMode: parseEnum(
      import.meta.env.VITE_AI_MODE,
      ['disabled', 'mock', 'real', 'hybrid'],
      DEFAULTS.aiMode
    ),
    aiEnabled: parseBoolean(
      import.meta.env.VITE_AI_ENABLED,
      DEFAULTS.aiEnabled
    ),
    debugMode: parseBoolean(
      import.meta.env.VITE_AI_DEBUG,
      DEFAULTS.debugMode
    ),
    
    // Transition
    transitionPhase: parseEnum(
      import.meta.env.VITE_AI_TRANSITION_PHASE,
      ['preparation', 'canary', 'early_adopters', 'gradual_rollout', 'full_rollout', 'stable'],
      DEFAULTS.transitionPhase
    ),
    rolloutPercentage: parseNumber(
      import.meta.env.VITE_AI_ROLLOUT_PERCENTAGE,
      DEFAULTS.rolloutPercentage
    ),
    autoRollback: parseBoolean(
      import.meta.env.VITE_AI_AUTO_ROLLBACK,
      DEFAULTS.autoRollback
    ),
    errorThreshold: parseNumber(
      import.meta.env.VITE_AI_ERROR_THRESHOLD,
      DEFAULTS.errorThreshold
    ),
    latencyThreshold: parseNumber(
      import.meta.env.VITE_AI_LATENCY_THRESHOLD,
      DEFAULTS.latencyThreshold
    ),
    fallbackToMock: parseBoolean(
      import.meta.env.VITE_AI_FALLBACK_TO_MOCK,
      DEFAULTS.fallbackToMock
    ),
    
    // Rate Limiting
    rateLimit: parseNumber(
      import.meta.env.VITE_AI_RATE_LIMIT,
      DEFAULTS.rateLimit
    ),
    maxConcurrent: parseNumber(
      import.meta.env.VITE_AI_MAX_CONCURRENT,
      DEFAULTS.maxConcurrent
    ),
    
    // Streaming
    streamingEnabled: parseBoolean(
      import.meta.env.VITE_AI_STREAMING_ENABLED,
      DEFAULTS.streamingEnabled
    ),
    streamingBufferSize: parseNumber(
      import.meta.env.VITE_AI_STREAMING_BUFFER_SIZE,
      DEFAULTS.streamingBufferSize
    ),
    
    // Analytics
    analyticsEnabled: parseBoolean(
      import.meta.env.VITE_AI_ANALYTICS_ENABLED,
      DEFAULTS.analyticsEnabled
    ),
    
    // Access Control
    internalDomains: parseArray(import.meta.env.VITE_AI_INTERNAL_DOMAINS),
    betaUserIds: parseArray(import.meta.env.VITE_AI_BETA_USER_IDS),
    
    // API
    apiBaseUrl: import.meta.env.VITE_AI_API_BASE_URL || DEFAULTS.apiBaseUrl,
    healthEndpoint: import.meta.env.VITE_AI_HEALTH_ENDPOINT || DEFAULTS.healthEndpoint,
  };
  
  cachedConfig = config;
  
  if (config.debugMode) {
    console.log('[AI Config] Loaded from environment:', config);
  }
  
  return config;
}

/**
 * Clear cached config (for testing or config reload)
 */
export function clearEnvConfigCache(): void {
  cachedConfig = null;
}

/**
 * Check if running in production with real API
 */
export function isProductionRealAPI(): boolean {
  const config = loadEnvConfig();
  return config.environment === 'production' && config.aiMode === 'real';
}

/**
 * Check if should use mock fallback
 */
export function shouldUseMockFallback(): boolean {
  const config = loadEnvConfig();
  return config.fallbackToMock && config.aiMode !== 'mock';
}

/**
 * Get rollout strategy from env config
 */
export function getEnvRolloutStrategy(): RolloutStrategy {
  const config = loadEnvConfig();
  
  if (!config.aiEnabled || config.aiMode === 'disabled') {
    return 'disabled';
  }
  
  if (config.internalDomains.length > 0 && config.transitionPhase === 'canary') {
    return 'internal';
  }
  
  if (config.betaUserIds.length > 0 && config.transitionPhase === 'early_adopters') {
    return 'beta';
  }
  
  if (config.rolloutPercentage > 0 && config.rolloutPercentage < 100) {
    return 'percentage';
  }
  
  if (config.rolloutPercentage >= 100) {
    return 'full';
  }
  
  return 'disabled';
}

// =============================================================================
// PRODUCTION PRESETS
// =============================================================================

export interface ProductionPreset {
  name: string;
  description: string;
  envVars: Partial<Record<string, string>>;
}

/**
 * Pre-defined production transition presets
 */
export const PRODUCTION_PRESETS: Record<string, ProductionPreset> = {
  preparation: {
    name: 'Hazırlık',
    description: 'Mock mode, test aşaması',
    envVars: {
      VITE_AI_MODE: 'mock',
      VITE_AI_TRANSITION_PHASE: 'preparation',
      VITE_AI_ROLLOUT_PERCENTAGE: '0',
    },
  },
  
  canary: {
    name: 'Canary',
    description: 'Real API, sadece internal kullanıcılar',
    envVars: {
      VITE_AI_MODE: 'real',
      VITE_AI_TRANSITION_PHASE: 'canary',
      VITE_AI_ROLLOUT_PERCENTAGE: '1',
      VITE_AI_FALLBACK_TO_MOCK: 'true',
      VITE_AI_AUTO_ROLLBACK: 'true',
    },
  },
  
  early_adopters: {
    name: 'Early Adopters',
    description: 'Real API, beta kullanıcıları (%10)',
    envVars: {
      VITE_AI_MODE: 'real',
      VITE_AI_TRANSITION_PHASE: 'early_adopters',
      VITE_AI_ROLLOUT_PERCENTAGE: '10',
      VITE_AI_FALLBACK_TO_MOCK: 'true',
      VITE_AI_AUTO_ROLLBACK: 'true',
    },
  },
  
  gradual_50: {
    name: 'Kademeli %50',
    description: 'Real API, %50 rollout',
    envVars: {
      VITE_AI_MODE: 'real',
      VITE_AI_TRANSITION_PHASE: 'gradual_rollout',
      VITE_AI_ROLLOUT_PERCENTAGE: '50',
      VITE_AI_FALLBACK_TO_MOCK: 'true',
      VITE_AI_AUTO_ROLLBACK: 'true',
    },
  },
  
  full_rollout: {
    name: 'Tam Rollout',
    description: 'Real API, tüm kullanıcılar',
    envVars: {
      VITE_AI_MODE: 'real',
      VITE_AI_TRANSITION_PHASE: 'full_rollout',
      VITE_AI_ROLLOUT_PERCENTAGE: '100',
      VITE_AI_FALLBACK_TO_MOCK: 'false',
      VITE_AI_AUTO_ROLLBACK: 'true',
    },
  },
  
  stable: {
    name: 'Stable',
    description: 'Production hazır, rollback kapalı',
    envVars: {
      VITE_AI_MODE: 'real',
      VITE_AI_TRANSITION_PHASE: 'stable',
      VITE_AI_ROLLOUT_PERCENTAGE: '100',
      VITE_AI_FALLBACK_TO_MOCK: 'false',
      VITE_AI_AUTO_ROLLBACK: 'false',
      VITE_AI_DEBUG: 'false',
    },
  },
};

/**
 * Generate .env content from preset
 */
export function generateEnvContent(preset: ProductionPreset): string {
  const lines = [
    `# AI Configuration: ${preset.name}`,
    `# ${preset.description}`,
    `# Generated: ${new Date().toISOString()}`,
    '',
  ];
  
  for (const [key, value] of Object.entries(preset.envVars)) {
    lines.push(`${key}=${value}`);
  }
  
  return lines.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DEFAULTS as ENV_DEFAULTS };
