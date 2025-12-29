/**
 * Streaming UI Adapter
 * 
 * GPT-4.1 streaming response için UI optimizasyonları.
 * Real API'de streaming daha belirgin ve önemli olur.
 * 
 * STREAMING FARKLARI:
 * ===================
 * Mock:  Simüle edilmiş, hızlı chunk'lar
 * Real:  Gerçek SSE stream, değişken hızda chunk'lar
 * 
 * UI ADAPTASYONLARI:
 * ==================
 * 1. Typing indicator animasyonu
 * 2. Chunk buffering (smooth rendering)
 * 3. Auto-scroll optimization
 * 4. First token feedback
 * 5. Connection status
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { performanceTracker, shouldShowDelayMessage } from './performanceMonitor';
import type { AIFeatureType } from '@/types/ai';

// =============================================================================
// STREAMING STATE TYPES
// =============================================================================

export type StreamingState = 
  | 'idle'           // Beklemede
  | 'connecting'     // Bağlantı kuruluyor
  | 'waiting'        // İlk token bekleniyor
  | 'streaming'      // Aktif stream
  | 'buffering'      // Buffer dolduruluyor
  | 'completing'     // Tamamlanıyor
  | 'completed'      // Tamamlandı
  | 'error'          // Hata
  | 'cancelled';     // İptal edildi

export interface StreamingProgress {
  state: StreamingState;
  content: string;
  tokensReceived: number;
  estimatedTotalTokens?: number;
  startTime: number;
  firstTokenTime?: number;
  lastChunkTime: number;
  chunkCount: number;
  averageChunkSize: number;
  isDelayed: boolean;
  connectionHealthy: boolean;
}

export interface StreamingConfig {
  /** Buffer size before rendering (characters) */
  bufferSize: number;
  /** Max time to buffer before forcing render (ms) */
  bufferTimeout: number;
  /** Auto-scroll behavior */
  autoScroll: boolean;
  /** Show typing indicator */
  showTypingIndicator: boolean;
  /** Enable smooth scrolling */
  smoothScroll: boolean;
  /** Debounce scroll updates (ms) */
  scrollDebounce: number;
  /** Animation speed for typing effect */
  typingAnimationSpeed: 'slow' | 'normal' | 'fast';
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  bufferSize: 10,
  bufferTimeout: 50,
  autoScroll: true,
  showTypingIndicator: true,
  smoothScroll: true,
  scrollDebounce: 100,
  typingAnimationSpeed: 'normal',
};

// =============================================================================
// STREAMING MANAGER
// =============================================================================

export class StreamingUIManager {
  private config: StreamingConfig;
  private progress: StreamingProgress;
  private buffer: string = '';
  private bufferTimer: ReturnType<typeof setTimeout> | null = null;
  private onUpdate: ((progress: StreamingProgress) => void) | null = null;
  private onContent: ((content: string) => void) | null = null;
  private requestId: string = '';
  private feature: AIFeatureType = 'question_hint';
  
  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = { ...DEFAULT_STREAMING_CONFIG, ...config };
    this.progress = this.createInitialProgress();
  }
  
  private createInitialProgress(): StreamingProgress {
    return {
      state: 'idle',
      content: '',
      tokensReceived: 0,
      startTime: 0,
      lastChunkTime: 0,
      chunkCount: 0,
      averageChunkSize: 0,
      isDelayed: false,
      connectionHealthy: true,
    };
  }
  
  /**
   * Start streaming session
   */
  start(
    requestId: string,
    feature: AIFeatureType,
    onUpdate: (progress: StreamingProgress) => void,
    onContent: (content: string) => void
  ): void {
    this.requestId = requestId;
    this.feature = feature;
    this.onUpdate = onUpdate;
    this.onContent = onContent;
    this.buffer = '';
    
    this.progress = {
      ...this.createInitialProgress(),
      state: 'connecting',
      startTime: performance.now(),
    };
    
    performanceTracker.startRequest(requestId, feature, true);
    this.notifyUpdate();
    
    // Transition to waiting after short delay
    setTimeout(() => {
      if (this.progress.state === 'connecting') {
        this.progress.state = 'waiting';
        this.notifyUpdate();
      }
    }, 100);
  }
  
  /**
   * Handle incoming chunk
   */
  handleChunk(chunk: string): void {
    // Record first token
    if (!this.progress.firstTokenTime) {
      this.progress.firstTokenTime = performance.now() - this.progress.startTime;
      performanceTracker.recordFirstToken(this.requestId);
      this.progress.state = 'streaming';
    }
    
    // Update metrics
    this.progress.lastChunkTime = performance.now();
    this.progress.chunkCount++;
    this.progress.tokensReceived += this.estimateTokens(chunk);
    
    // Calculate average chunk size
    const totalChars = this.progress.content.length + this.buffer.length + chunk.length;
    this.progress.averageChunkSize = totalChars / this.progress.chunkCount;
    
    // Check if delayed
    const elapsed = performance.now() - this.progress.startTime;
    this.progress.isDelayed = shouldShowDelayMessage(elapsed, this.feature);
    
    // Buffer chunk
    this.buffer += chunk;
    
    // Flush buffer if needed
    if (this.buffer.length >= this.config.bufferSize) {
      this.flushBuffer();
    } else if (!this.bufferTimer) {
      this.bufferTimer = setTimeout(() => {
        this.flushBuffer();
      }, this.config.bufferTimeout);
    }
    
    this.notifyUpdate();
  }
  
  /**
   * Flush buffer to content
   */
  private flushBuffer(): void {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
    
    if (this.buffer.length > 0) {
      this.progress.content += this.buffer;
      this.onContent?.(this.buffer);
      this.buffer = '';
    }
  }
  
  /**
   * Complete streaming
   */
  complete(success: boolean, totalTokens?: number): void {
    this.flushBuffer();
    
    this.progress.state = success ? 'completed' : 'error';
    this.progress.estimatedTotalTokens = totalTokens;
    
    const duration = performance.now() - this.progress.startTime;
    performanceTracker.completeRequest(this.requestId, success, {
      totalTokens,
    });
    
    this.notifyUpdate();
    
    // Reset after animation
    setTimeout(() => {
      this.reset();
    }, 300);
  }
  
  /**
   * Cancel streaming
   */
  cancel(): void {
    this.flushBuffer();
    this.progress.state = 'cancelled';
    performanceTracker.cancelRequest(this.requestId);
    this.notifyUpdate();
  }
  
  /**
   * Handle connection issue
   */
  handleConnectionIssue(): void {
    this.progress.connectionHealthy = false;
    this.progress.state = 'buffering';
    this.notifyUpdate();
  }
  
  /**
   * Recover connection
   */
  recoverConnection(): void {
    this.progress.connectionHealthy = true;
    if (this.progress.state === 'buffering') {
      this.progress.state = 'streaming';
    }
    this.notifyUpdate();
  }
  
  /**
   * Estimate tokens from text
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Notify update listener
   */
  private notifyUpdate(): void {
    this.onUpdate?.({ ...this.progress });
  }
  
  /**
   * Reset manager
   */
  reset(): void {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
    this.buffer = '';
    this.progress = this.createInitialProgress();
    this.onUpdate = null;
    this.onContent = null;
  }
  
  /**
   * Get current progress
   */
  getProgress(): StreamingProgress {
    return { ...this.progress };
  }
  
  /**
   * Update config
   */
  updateConfig(config: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// =============================================================================
// REACT HOOK
// =============================================================================

export interface UseStreamingUIOptions extends Partial<StreamingConfig> {
  feature: AIFeatureType;
  onComplete?: (content: string, success: boolean) => void;
  onError?: (error: Error) => void;
}

export interface UseStreamingUIReturn {
  progress: StreamingProgress;
  content: string;
  start: (requestId: string) => void;
  handleChunk: (chunk: string) => void;
  complete: (success: boolean, totalTokens?: number) => void;
  cancel: () => void;
  isActive: boolean;
  isComplete: boolean;
}

export function useStreamingUI(options: UseStreamingUIOptions): UseStreamingUIReturn {
  const { feature, onComplete, onError, ...config } = options;
  
  const managerRef = useRef<StreamingUIManager | null>(null);
  const [progress, setProgress] = useState<StreamingProgress>({
    state: 'idle',
    content: '',
    tokensReceived: 0,
    startTime: 0,
    lastChunkTime: 0,
    chunkCount: 0,
    averageChunkSize: 0,
    isDelayed: false,
    connectionHealthy: true,
  });
  const [content, setContent] = useState('');
  
  // Initialize manager
  useEffect(() => {
    managerRef.current = new StreamingUIManager(config);
    return () => {
      managerRef.current?.reset();
    };
  }, []);
  
  const start = useCallback((requestId: string) => {
    setContent('');
    managerRef.current?.start(
      requestId,
      feature,
      setProgress,
      (chunk) => setContent(prev => prev + chunk)
    );
  }, [feature]);
  
  const handleChunk = useCallback((chunk: string) => {
    managerRef.current?.handleChunk(chunk);
  }, []);
  
  const complete = useCallback((success: boolean, totalTokens?: number) => {
    managerRef.current?.complete(success, totalTokens);
    if (success) {
      onComplete?.(content, true);
    } else {
      onError?.(new Error('Stream failed'));
    }
  }, [content, onComplete, onError]);
  
  const cancel = useCallback(() => {
    managerRef.current?.cancel();
  }, []);
  
  const isActive = ['connecting', 'waiting', 'streaming', 'buffering'].includes(progress.state);
  const isComplete = progress.state === 'completed';
  
  return {
    progress,
    content,
    start,
    handleChunk,
    complete,
    cancel,
    isActive,
    isComplete,
  };
}

// =============================================================================
// UI COMPONENTS HELPERS
// =============================================================================

/**
 * Get typing indicator animation class
 */
export function getTypingIndicatorClass(
  state: StreamingState,
  speed: StreamingConfig['typingAnimationSpeed']
): string {
  if (state !== 'streaming' && state !== 'waiting') {
    return 'hidden';
  }
  
  const baseClass = 'animate-pulse';
  const speedClass = {
    slow: 'duration-1000',
    normal: 'duration-700',
    fast: 'duration-400',
  }[speed];
  
  return `${baseClass} ${speedClass}`;
}

/**
 * Get streaming status message
 */
export function getStreamingStatusMessage(progress: StreamingProgress): string {
  switch (progress.state) {
    case 'connecting':
      return 'Bağlanıyor...';
    case 'waiting':
      return 'Yanıt bekleniyor...';
    case 'streaming':
      return progress.isDelayed 
        ? 'Yanıt yazılıyor (normalden uzun sürüyor)...'
        : 'Yanıt yazılıyor...';
    case 'buffering':
      return 'Bağlantı yenileniyor...';
    case 'completing':
      return 'Tamamlanıyor...';
    case 'completed':
      return 'Tamamlandı';
    case 'error':
      return 'Bir hata oluştu';
    case 'cancelled':
      return 'İptal edildi';
    default:
      return '';
  }
}

/**
 * Calculate progress percentage
 */
export function getStreamingProgressPercent(progress: StreamingProgress): number {
  if (!progress.estimatedTotalTokens) {
    // Estimate based on typical response length
    const estimatedTotal = 500; // tokens
    return Math.min(95, (progress.tokensReceived / estimatedTotal) * 100);
  }
  
  return Math.min(100, (progress.tokensReceived / progress.estimatedTotalTokens) * 100);
}

/**
 * Should show connection warning
 */
export function shouldShowConnectionWarning(progress: StreamingProgress): boolean {
  if (!progress.connectionHealthy) return true;
  
  // Check for stalled stream (no chunk in 5 seconds while streaming)
  if (progress.state === 'streaming') {
    const timeSinceLastChunk = performance.now() - progress.lastChunkTime;
    return timeSinceLastChunk > 5000;
  }
  
  return false;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DEFAULT_STREAMING_CONFIG };
