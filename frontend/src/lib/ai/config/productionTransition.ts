/**
 * Production Transition Configuration
 * 
 * GPT-4.1 API aktif edildiğinde kontrollü geçiş stratejileri.
 * Mock → Real API geçişi, rollback mekanizması ve UX optimizasyonları.
 * 
 * SENIOR ENGINEER NOTLARI:
 * ========================
 * 1. Frontend kodunda DEĞİŞİKLİK GEREKMİYOR - Adapter pattern sayesinde
 * 2. Sadece konfigürasyon değişiklikleri yeterli
 * 3. Feature flags ile kontrollü rollout
 * 4. Otomatik rollback mekanizması
 * 5. Performance monitoring entegrasyonu
 */

import type { AIMode, RolloutStrategy } from './featureFlags';
import type { AIFeatureType } from '@/types/ai';

// =============================================================================
// TRANSITION TYPES
// =============================================================================

export type TransitionPhase = 
  | 'preparation'      // Hazırlık - Mock mode, testler
  | 'canary'          // Canary - %1 internal users
  | 'early_adopters'  // Early Adopters - %10 beta users
  | 'gradual_rollout' // Kademeli - %25, %50, %75
  | 'full_rollout'    // Tam rollout - %100
  | 'stable';         // Stable - Tüm metrikler pozitif

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface TransitionConfig {
  /** Current transition phase */
  currentPhase: TransitionPhase;
  /** Target mode */
  targetMode: AIMode;
  /** Rollback mode */
  rollbackMode: AIMode;
  /** Auto rollback enabled */
  autoRollback: boolean;
  /** Error threshold for auto rollback (percentage) */
  errorThreshold: number;
  /** Latency threshold for warnings (ms) */
  latencyThreshold: number;
  /** Min success rate for phase advancement (percentage) */
  minSuccessRate: number;
  /** Monitoring window (minutes) */
  monitoringWindow: number;
}

export interface TransitionMetrics {
  /** Total requests in window */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average latency (ms) */
  averageLatency: number;
  /** P95 latency (ms) */
  p95Latency: number;
  /** Error rate (percentage) */
  errorRate: number;
  /** Success rate (percentage) */
  successRate: number;
  /** Health status */
  healthStatus: HealthStatus;
  /** Last updated */
  lastUpdated: Date;
}

export interface RollbackEvent {
  timestamp: Date;
  phase: TransitionPhase;
  reason: string;
  metrics: TransitionMetrics;
  automatic: boolean;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  currentPhase: 'preparation',
  targetMode: 'real',
  rollbackMode: 'mock',
  autoRollback: true,
  errorThreshold: 10, // %10 error rate = rollback
  latencyThreshold: 3000, // 3 saniye
  minSuccessRate: 95, // %95 başarı = faz ilerlemesi
  monitoringWindow: 15, // 15 dakika
};

// =============================================================================
// PHASE CONFIGURATIONS
// =============================================================================

export interface PhaseConfig {
  mode: AIMode;
  rolloutStrategy: RolloutStrategy;
  rolloutPercentage: number;
  description: string;
  requirements: string[];
  nextPhase: TransitionPhase | null;
  previousPhase: TransitionPhase | null;
}

export const PHASE_CONFIGS: Record<TransitionPhase, PhaseConfig> = {
  preparation: {
    mode: 'mock',
    rolloutStrategy: 'disabled',
    rolloutPercentage: 0,
    description: 'Hazırlık aşaması - Mock mode ile testler',
    requirements: [
      'Tüm unit testler başarılı',
      'Integration testler başarılı',
      'UI testleri tamamlandı',
      'Performance benchmark alındı',
    ],
    nextPhase: 'canary',
    previousPhase: null,
  },
  
  canary: {
    mode: 'real',
    rolloutStrategy: 'internal',
    rolloutPercentage: 1,
    description: 'Canary - Sadece internal kullanıcılar (%1)',
    requirements: [
      'Backend health check başarılı',
      'API credentials doğrulandı',
      'Monitoring aktif',
    ],
    nextPhase: 'early_adopters',
    previousPhase: 'preparation',
  },
  
  early_adopters: {
    mode: 'real',
    rolloutStrategy: 'beta',
    rolloutPercentage: 10,
    description: 'Early Adopters - Beta kullanıcıları (%10)',
    requirements: [
      'Canary fazında %95+ başarı',
      'Ortalama latency < 2s',
      'Kullanıcı feedback pozitif',
    ],
    nextPhase: 'gradual_rollout',
    previousPhase: 'canary',
  },
  
  gradual_rollout: {
    mode: 'real',
    rolloutStrategy: 'percentage',
    rolloutPercentage: 50,
    description: 'Kademeli Rollout (%25 → %50 → %75)',
    requirements: [
      'Early adopters fazında %95+ başarı',
      'P95 latency < 3s',
      'Error rate < %5',
    ],
    nextPhase: 'full_rollout',
    previousPhase: 'early_adopters',
  },
  
  full_rollout: {
    mode: 'real',
    rolloutStrategy: 'full',
    rolloutPercentage: 100,
    description: 'Tam Rollout - Tüm kullanıcılar (%100)',
    requirements: [
      'Gradual rollout başarılı',
      '24 saat stable metrikler',
      'Rollback test edildi',
    ],
    nextPhase: 'stable',
    previousPhase: 'gradual_rollout',
  },
  
  stable: {
    mode: 'real',
    rolloutStrategy: 'full',
    rolloutPercentage: 100,
    description: 'Stable - Production hazır',
    requirements: [
      '7 gün sorunsuz çalışma',
      'Tüm metrikler pozitif',
    ],
    nextPhase: null,
    previousPhase: 'full_rollout',
  },
};

// =============================================================================
// TRANSITION STATE MANAGEMENT
// =============================================================================

interface TransitionState {
  config: TransitionConfig;
  metrics: TransitionMetrics;
  rollbackHistory: RollbackEvent[];
  isTransitioning: boolean;
  lastPhaseChange: Date | null;
}

const createInitialMetrics = (): TransitionMetrics => ({
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageLatency: 0,
  p95Latency: 0,
  errorRate: 0,
  successRate: 100,
  healthStatus: 'unknown',
  lastUpdated: new Date(),
});

let transitionState: TransitionState = {
  config: DEFAULT_TRANSITION_CONFIG,
  metrics: createInitialMetrics(),
  rollbackHistory: [],
  isTransitioning: false,
  lastPhaseChange: null,
};

// =============================================================================
// TRANSITION FUNCTIONS
// =============================================================================

/**
 * Get current transition configuration
 */
export function getTransitionConfig(): TransitionConfig {
  return { ...transitionState.config };
}

/**
 * Get current phase configuration
 */
export function getCurrentPhaseConfig(): PhaseConfig {
  return PHASE_CONFIGS[transitionState.config.currentPhase];
}

/**
 * Get current metrics
 */
export function getTransitionMetrics(): TransitionMetrics {
  return { ...transitionState.metrics };
}

/**
 * Check if system should use real API
 */
export function shouldUseRealAPI(): boolean {
  const phase = transitionState.config.currentPhase;
  return phase !== 'preparation' && 
         transitionState.metrics.healthStatus !== 'critical';
}

/**
 * Get current AI mode based on transition state
 */
export function getTransitionMode(): AIMode {
  if (transitionState.metrics.healthStatus === 'critical') {
    return transitionState.config.rollbackMode;
  }
  return getCurrentPhaseConfig().mode;
}

/**
 * Update metrics with new request data
 */
export function updateMetrics(
  success: boolean,
  latency: number
): void {
  const { metrics } = transitionState;
  
  metrics.totalRequests++;
  if (success) {
    metrics.successfulRequests++;
  } else {
    metrics.failedRequests++;
  }
  
  // Update latency (running average)
  const alpha = 0.1; // Smoothing factor
  metrics.averageLatency = metrics.averageLatency * (1 - alpha) + latency * alpha;
  
  // Update P95 (simplified - track max as proxy)
  if (latency > metrics.p95Latency * 0.95) {
    metrics.p95Latency = latency;
  }
  
  // Calculate rates
  metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;
  metrics.successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
  
  // Determine health status
  metrics.healthStatus = determineHealthStatus(metrics);
  metrics.lastUpdated = new Date();
  
  // Check for auto rollback
  checkAutoRollback();
}

/**
 * Determine health status from metrics
 */
function determineHealthStatus(metrics: TransitionMetrics): HealthStatus {
  const { config } = transitionState;
  
  if (metrics.errorRate >= config.errorThreshold) {
    return 'critical';
  }
  
  if (metrics.errorRate >= config.errorThreshold * 0.7) {
    return 'degraded';
  }
  
  if (metrics.averageLatency > config.latencyThreshold) {
    return 'degraded';
  }
  
  return 'healthy';
}

/**
 * Check if auto rollback should trigger
 */
function checkAutoRollback(): void {
  const { config, metrics } = transitionState;
  
  if (!config.autoRollback) return;
  if (config.currentPhase === 'preparation') return;
  
  if (metrics.healthStatus === 'critical') {
    rollbackToPreviousPhase('Auto rollback: Error threshold exceeded');
  }
}

/**
 * Rollback to previous phase
 */
export function rollbackToPreviousPhase(reason: string): void {
  const currentPhase = transitionState.config.currentPhase;
  const phaseConfig = PHASE_CONFIGS[currentPhase];
  
  if (!phaseConfig.previousPhase) {
    console.warn('Cannot rollback: Already at first phase');
    return;
  }
  
  const rollbackEvent: RollbackEvent = {
    timestamp: new Date(),
    phase: currentPhase,
    reason,
    metrics: { ...transitionState.metrics },
    automatic: reason.startsWith('Auto rollback'),
  };
  
  transitionState.rollbackHistory.push(rollbackEvent);
  transitionState.config.currentPhase = phaseConfig.previousPhase;
  transitionState.lastPhaseChange = new Date();
  transitionState.metrics = createInitialMetrics();
  
  console.warn(`[Transition] Rollback to ${phaseConfig.previousPhase}: ${reason}`);
  
  // Emit rollback event for monitoring
  window.dispatchEvent(new CustomEvent('ai:rollback', { detail: rollbackEvent }));
}

/**
 * Advance to next phase
 */
export function advanceToNextPhase(): boolean {
  const { config, metrics } = transitionState;
  const phaseConfig = PHASE_CONFIGS[config.currentPhase];
  
  if (!phaseConfig.nextPhase) {
    console.log('Already at final phase');
    return false;
  }
  
  // Check requirements
  if (metrics.successRate < config.minSuccessRate) {
    console.warn(`Cannot advance: Success rate ${metrics.successRate}% < ${config.minSuccessRate}%`);
    return false;
  }
  
  if (metrics.totalRequests < 100) {
    console.warn('Cannot advance: Not enough data points (need 100+ requests)');
    return false;
  }
  
  transitionState.config.currentPhase = phaseConfig.nextPhase;
  transitionState.lastPhaseChange = new Date();
  transitionState.metrics = createInitialMetrics();
  
  console.log(`[Transition] Advanced to ${phaseConfig.nextPhase}`);
  
  // Emit phase change event
  window.dispatchEvent(new CustomEvent('ai:phase-change', {
    detail: { from: config.currentPhase, to: phaseConfig.nextPhase },
  }));
  
  return true;
}

/**
 * Force set phase (admin only)
 */
export function setPhase(phase: TransitionPhase): void {
  transitionState.config.currentPhase = phase;
  transitionState.lastPhaseChange = new Date();
  transitionState.metrics = createInitialMetrics();
  console.log(`[Transition] Force set to ${phase}`);
}

/**
 * Reset all transition state
 */
export function resetTransition(): void {
  transitionState = {
    config: DEFAULT_TRANSITION_CONFIG,
    metrics: createInitialMetrics(),
    rollbackHistory: [],
    isTransitioning: false,
    lastPhaseChange: null,
  };
}

/**
 * Get rollback history
 */
export function getRollbackHistory(): RollbackEvent[] {
  return [...transitionState.rollbackHistory];
}

// =============================================================================
// FEATURE-SPECIFIC TRANSITION
// =============================================================================

interface FeatureTransitionState {
  feature: AIFeatureType;
  enabled: boolean;
  mode: AIMode;
  metrics: TransitionMetrics;
}

const featureTransitionStates = new Map<AIFeatureType, FeatureTransitionState>();

/**
 * Get feature-specific transition state
 */
export function getFeatureTransitionState(
  feature: AIFeatureType
): FeatureTransitionState | undefined {
  return featureTransitionStates.get(feature);
}

/**
 * Update feature metrics
 */
export function updateFeatureMetrics(
  feature: AIFeatureType,
  success: boolean,
  latency: number
): void {
  let state = featureTransitionStates.get(feature);
  
  if (!state) {
    state = {
      feature,
      enabled: true,
      mode: getTransitionMode(),
      metrics: createInitialMetrics(),
    };
    featureTransitionStates.set(feature, state);
  }
  
  const { metrics } = state;
  metrics.totalRequests++;
  if (success) {
    metrics.successfulRequests++;
  } else {
    metrics.failedRequests++;
  }
  
  metrics.averageLatency = (metrics.averageLatency + latency) / 2;
  metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;
  metrics.successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
  metrics.lastUpdated = new Date();
}

/**
 * Disable specific feature (emergency kill switch)
 */
export function disableFeature(feature: AIFeatureType): void {
  const state = featureTransitionStates.get(feature);
  if (state) {
    state.enabled = false;
    state.mode = 'mock';
  }
  console.warn(`[Transition] Feature ${feature} disabled`);
}

/**
 * Enable specific feature
 */
export function enableFeature(feature: AIFeatureType): void {
  const state = featureTransitionStates.get(feature);
  if (state) {
    state.enabled = true;
    state.mode = getTransitionMode();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  TransitionState,
  FeatureTransitionState,
};
