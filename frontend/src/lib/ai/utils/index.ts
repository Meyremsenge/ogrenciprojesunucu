/**
 * AI Utilities
 * 
 * Yardımcı fonksiyonlar ve helper'lar.
 */

import type { AIFeatureType, UserRole } from '@/types/ai';
import { AI_FEATURES, QUOTA_THRESHOLDS } from '../constants';

// =============================================================================
// FEATURE HELPERS
// =============================================================================

/**
 * Kullanıcı rolüne göre erişilebilir özellikleri döndürür
 */
export function getAvailableFeatures(role: UserRole): AIFeatureType[] {
  return Object.entries(AI_FEATURES)
    .filter(([_, config]) => config.roles.includes(role))
    .map(([id]) => id as AIFeatureType);
}

/**
 * Özellik bilgilerini döndürür (constants'dan)
 */
export function getFeatureInfo(feature: AIFeatureType) {
  return AI_FEATURES[feature];
}

/**
 * Özelliğin kullanıcı rolü için erişilebilir olup olmadığını kontrol eder (basit kontrol)
 */
export function canUserAccessFeature(feature: AIFeatureType, role: UserRole): boolean {
  const config = AI_FEATURES[feature];
  return config?.roles.includes(role) ?? false;
}

// =============================================================================
// QUOTA HELPERS
// =============================================================================

/**
 * Kota durumunu hesaplar
 */
export function calculateQuotaStatus(used: number, limit: number) {
  if (limit <= 0) {
    return { percentage: 0, status: 'unknown' as const };
  }
  
  const percentage = (used / limit) * 100;
  
  let status: 'healthy' | 'warning' | 'critical' | 'exhausted';
  if (percentage >= QUOTA_THRESHOLDS.exhausted) {
    status = 'exhausted';
  } else if (percentage >= QUOTA_THRESHOLDS.critical) {
    status = 'critical';
  } else if (percentage >= QUOTA_THRESHOLDS.warning) {
    status = 'warning';
  } else {
    status = 'healthy';
  }
  
  return { percentage, status };
}

/**
 * Kota yenileme süresini formatlar
 */
export function formatResetTime(resetAt: Date | string): string {
  const reset = new Date(resetAt);
  const now = new Date();
  const diffMs = reset.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'şimdi';
  
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  
  if (diffHours === 1) return '1 saat içinde';
  if (diffHours < 24) return `${diffHours} saat içinde`;
  
  return reset.toLocaleDateString('tr-TR', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// MESSAGE HELPERS
// =============================================================================

/**
 * Mesaj ID'si oluşturur
 */
export function generateMessageId(prefix: 'user' | 'ai' | 'system' = 'ai'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mesaj zaman damgasını formatlar
 */
export function formatMessageTime(timestamp: Date | string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// CONTEXT HELPERS
// =============================================================================

/**
 * Sayfa yolundan sayfa tipini çıkarır
 */
export function inferPageType(pathname: string): 'question' | 'topic' | 'exam' | 'course' | 'dashboard' {
  if (pathname.includes('/exam') || pathname.includes('/quiz')) {
    return 'exam';
  }
  if (pathname.includes('/question')) {
    return 'question';
  }
  if (pathname.includes('/content') || pathname.includes('/video') || pathname.includes('/topic')) {
    return 'topic';
  }
  if (pathname.includes('/course')) {
    return 'course';
  }
  return 'dashboard';
}

/**
 * URL'den context ID'lerini çıkarır
 */
export function extractContextIds(pathname: string): {
  questionId?: number;
  topicId?: number;
  examId?: number;
  courseId?: number;
  contentId?: number;
} {
  const ids: Record<string, number> = {};
  
  // /contents/123 -> contentId: 123
  const contentMatch = pathname.match(/\/contents?\/(\d+)/);
  if (contentMatch) ids.contentId = parseInt(contentMatch[1]);
  
  // /courses/123 -> courseId: 123
  const courseMatch = pathname.match(/\/courses?\/(\d+)/);
  if (courseMatch) ids.courseId = parseInt(courseMatch[1]);
  
  // /exams/123 -> examId: 123
  const examMatch = pathname.match(/\/exams?\/(\d+)/);
  if (examMatch) ids.examId = parseInt(examMatch[1]);
  
  // /questions/123 -> questionId: 123
  const questionMatch = pathname.match(/\/questions?\/(\d+)/);
  if (questionMatch) ids.questionId = parseInt(questionMatch[1]);
  
  return ids;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Mesaj içeriğini validate eder
 */
export function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Mesaj boş olamaz' };
  }
  
  if (message.length > 4000) {
    return { valid: false, error: 'Mesaj çok uzun (max 4000 karakter)' };
  }
  
  return { valid: true };
}

// =============================================================================
// RETRY HELPERS
// =============================================================================

/**
 * Exponential backoff ile retry
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
