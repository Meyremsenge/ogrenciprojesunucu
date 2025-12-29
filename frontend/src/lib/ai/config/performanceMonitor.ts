/**
 * Performance Monitoring for GPT-4.1 API
 * 
 * Mock → Real API geçişinde performans farklarının izlenmesi.
 * UX etkilerinin ölçülmesi ve optimizasyonları.
 * 
 * PERFORMANS FARKLARI:
 * ====================
 * Mock API:  ~50-200ms (lokal simülasyon)
 * Real API:  ~500-3000ms (GPT-4.1 inference)
 * 
 * UX ETKİLERİ:
 * ============
 * 1. Loading state daha uzun sürer
 * 2. Streaming response daha belirgin
 * 3. Timeout riski artar
 * 4. Network hatası olasılığı artar
 */

import { updateMetrics, updateFeatureMetrics } from './productionTransition';
import type { AIFeatureType } from '@/types/ai';

// =============================================================================
// PERFORMANCE TYPES
// =============================================================================

export interface PerformanceMetric {
  feature: AIFeatureType;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  cached: boolean;
  streaming: boolean;
  firstTokenTime?: number;
  totalTokens?: number;
  tokensPerSecond?: number;
}

export interface PerformanceThresholds {
  /** Target latency (ms) */
  targetLatency: number;
  /** Warning latency (ms) */
  warningLatency: number;
  /** Critical latency (ms) */
  criticalLatency: number;
  /** Timeout (ms) */
  timeout: number;
  /** First token max time for streaming (ms) */
  firstTokenMaxTime: number;
}

export interface PerformanceSummary {
  totalRequests: number;
  averageLatency: number;
  medianLatency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  cacheHitRate: number;
  streamingUsage: number;
  averageTokensPerSecond: number;
  withinTarget: number; // percentage
  withinWarning: number; // percentage
  overCritical: number; // percentage
}

// =============================================================================
// THRESHOLDS CONFIGURATION
// =============================================================================

export const PERFORMANCE_THRESHOLDS: Record<AIFeatureType, PerformanceThresholds> = {
  // Chat features - users expect quick response
  question_hint: {
    targetLatency: 1000,
    warningLatency: 2000,
    criticalLatency: 5000,
    timeout: 30000,
    firstTokenMaxTime: 1500,
  },
  topic_explanation: {
    targetLatency: 1500,
    warningLatency: 3000,
    criticalLatency: 8000,
    timeout: 60000,
    firstTokenMaxTime: 2000,
  },
  study_plan: {
    targetLatency: 2000,
    warningLatency: 4000,
    criticalLatency: 10000,
    timeout: 60000,
    firstTokenMaxTime: 2500,
  },
  
  // Evaluation features - can be slower
  answer_evaluation: {
    targetLatency: 2000,
    warningLatency: 5000,
    criticalLatency: 15000,
    timeout: 90000,
    firstTokenMaxTime: 3000,
  },
  performance_analysis: {
    targetLatency: 3000,
    warningLatency: 6000,
    criticalLatency: 15000,
    timeout: 90000,
    firstTokenMaxTime: 4000,
  },
  
  // Generation features - slowest
  question_generation: {
    targetLatency: 5000,
    warningLatency: 10000,
    criticalLatency: 30000,
    timeout: 120000,
    firstTokenMaxTime: 5000,
  },
  content_enhancement: {
    targetLatency: 5000,
    warningLatency: 10000,
    criticalLatency: 30000,
    timeout: 120000,
    firstTokenMaxTime: 5000,
  },
  
  // Motivation messages
  motivation_message: {
    targetLatency: 1000,
    warningLatency: 2000,
    criticalLatency: 5000,
    timeout: 30000,
    firstTokenMaxTime: 1500,
  },
};

// =============================================================================
// PERFORMANCE TRACKER
// =============================================================================

class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private activeRequests = new Map<string, PerformanceMetric>();
  private maxStoredMetrics = 1000;
  private listeners: Set<(metric: PerformanceMetric) => void> = new Set();
  
  /**
   * Start tracking a request
   */
  startRequest(
    requestId: string,
    feature: AIFeatureType,
    streaming: boolean = false
  ): void {
    const metric: PerformanceMetric = {
      feature,
      startTime: performance.now(),
      success: false,
      cached: false,
      streaming,
    };
    
    this.activeRequests.set(requestId, metric);
  }
  
  /**
   * Record first token time (for streaming)
   */
  recordFirstToken(requestId: string): void {
    const metric = this.activeRequests.get(requestId);
    if (metric && !metric.firstTokenTime) {
      metric.firstTokenTime = performance.now() - metric.startTime;
    }
  }
  
  /**
   * Complete request tracking
   */
  completeRequest(
    requestId: string,
    success: boolean,
    options: {
      cached?: boolean;
      totalTokens?: number;
    } = {}
  ): PerformanceMetric | undefined {
    const metric = this.activeRequests.get(requestId);
    if (!metric) return undefined;
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.cached = options.cached ?? false;
    metric.totalTokens = options.totalTokens;
    
    if (metric.totalTokens && metric.duration) {
      metric.tokensPerSecond = (metric.totalTokens / metric.duration) * 1000;
    }
    
    this.activeRequests.delete(requestId);
    this.storeMetric(metric);
    
    // Update transition metrics
    updateMetrics(success, metric.duration);
    updateFeatureMetrics(metric.feature, success, metric.duration);
    
    // Notify listeners
    this.notifyListeners(metric);
    
    return metric;
  }
  
  /**
   * Cancel request tracking
   */
  cancelRequest(requestId: string): void {
    this.activeRequests.delete(requestId);
  }
  
  /**
   * Store metric with limit
   */
  private storeMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }
  }
  
  /**
   * Get performance summary
   */
  getSummary(feature?: AIFeatureType): PerformanceSummary {
    let relevantMetrics = this.metrics;
    
    if (feature) {
      relevantMetrics = this.metrics.filter(m => m.feature === feature);
    }
    
    if (relevantMetrics.length === 0) {
      return this.createEmptySummary();
    }
    
    const durations = relevantMetrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!)
      .sort((a, b) => a - b);
    
    const successful = relevantMetrics.filter(m => m.success);
    const cached = relevantMetrics.filter(m => m.cached);
    const streaming = relevantMetrics.filter(m => m.streaming);
    
    const thresholds = feature 
      ? PERFORMANCE_THRESHOLDS[feature]
      : PERFORMANCE_THRESHOLDS.question_hint;
    
    const withinTarget = durations.filter(d => d <= thresholds.targetLatency).length;
    const withinWarning = durations.filter(d => d <= thresholds.warningLatency).length;
    const overCritical = durations.filter(d => d > thresholds.criticalLatency).length;
    
    const tokensPerSecond = relevantMetrics
      .filter(m => m.tokensPerSecond)
      .map(m => m.tokensPerSecond!);
    
    return {
      totalRequests: relevantMetrics.length,
      averageLatency: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianLatency: durations[Math.floor(durations.length / 2)] ?? 0,
      p95Latency: durations[Math.floor(durations.length * 0.95)] ?? 0,
      p99Latency: durations[Math.floor(durations.length * 0.99)] ?? 0,
      successRate: (successful.length / relevantMetrics.length) * 100,
      cacheHitRate: (cached.length / relevantMetrics.length) * 100,
      streamingUsage: (streaming.length / relevantMetrics.length) * 100,
      averageTokensPerSecond: tokensPerSecond.length > 0
        ? tokensPerSecond.reduce((a, b) => a + b, 0) / tokensPerSecond.length
        : 0,
      withinTarget: (withinTarget / durations.length) * 100,
      withinWarning: (withinWarning / durations.length) * 100,
      overCritical: (overCritical / durations.length) * 100,
    };
  }
  
  private createEmptySummary(): PerformanceSummary {
    return {
      totalRequests: 0,
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      successRate: 0,
      cacheHitRate: 0,
      streamingUsage: 0,
      averageTokensPerSecond: 0,
      withinTarget: 0,
      withinWarning: 0,
      overCritical: 0,
    };
  }
  
  /**
   * Check if latency is acceptable
   */
  isLatencyAcceptable(
    duration: number,
    feature: AIFeatureType
  ): { acceptable: boolean; level: 'good' | 'warning' | 'critical' } {
    const thresholds = PERFORMANCE_THRESHOLDS[feature];
    
    if (duration <= thresholds.targetLatency) {
      return { acceptable: true, level: 'good' };
    }
    
    if (duration <= thresholds.warningLatency) {
      return { acceptable: true, level: 'warning' };
    }
    
    return { acceptable: false, level: 'critical' };
  }
  
  /**
   * Add listener for new metrics
   */
  addListener(callback: (metric: PerformanceMetric) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  private notifyListeners(metric: PerformanceMetric): void {
    for (const listener of this.listeners) {
      try {
        listener(metric);
      } catch (e) {
        console.error('Performance listener error:', e);
      }
    }
  }
  
  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.activeRequests.clear();
  }
  
  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const performanceTracker = new PerformanceTracker();

// =============================================================================
// UX OPTIMIZATION HELPERS
// =============================================================================

/**
 * Calculate recommended skeleton duration based on feature
 */
export function getRecommendedSkeletonDuration(feature: AIFeatureType): number {
  const thresholds = PERFORMANCE_THRESHOLDS[feature];
  // Show skeleton for at least target latency to prevent flash
  return Math.max(thresholds.targetLatency * 0.8, 500);
}

/**
 * Should show "taking longer than usual" message
 */
export function shouldShowDelayMessage(
  duration: number,
  feature: AIFeatureType
): boolean {
  const thresholds = PERFORMANCE_THRESHOLDS[feature];
  return duration > thresholds.warningLatency;
}

/**
 * Get estimated remaining time for streaming
 */
export function getEstimatedRemainingTime(
  currentTokens: number,
  totalTokens: number,
  elapsedTime: number
): number {
  if (currentTokens === 0) return 0;
  const tokensPerMs = currentTokens / elapsedTime;
  const remainingTokens = totalTokens - currentTokens;
  return remainingTokens / tokensPerMs;
}

/**
 * Get UX delay class based on performance
 */
export function getUXDelayClass(
  duration: number,
  feature: AIFeatureType
): 'instant' | 'fast' | 'normal' | 'slow' | 'very-slow' {
  const thresholds = PERFORMANCE_THRESHOLDS[feature];
  
  if (duration < 200) return 'instant';
  if (duration < thresholds.targetLatency * 0.5) return 'fast';
  if (duration < thresholds.targetLatency) return 'normal';
  if (duration < thresholds.warningLatency) return 'slow';
  return 'very-slow';
}

// =============================================================================
// EXPORTS
// =============================================================================

export { PerformanceTracker };
