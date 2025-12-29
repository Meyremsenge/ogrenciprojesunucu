/**
 * AI Constants
 * 
 * AI modülünde kullanılan sabit değerler.
 */

import type { AIFeatureType } from '@/types/ai';

// =============================================================================
// FEATURE CONFIGURATION
// =============================================================================

export const AI_FEATURES: Record<AIFeatureType, AIFeatureConfig> = {
  question_hint: {
    id: 'question_hint',
    name: 'Soru İpucu',
    description: 'Soru çözerken ipucu al',
    icon: '💡',
    color: 'blue',
    roles: ['student'],
    quotaWeight: 1,
  },
  topic_explanation: {
    id: 'topic_explanation',
    name: 'Konu Açıklaması',
    description: 'Konuyu anlamana yardımcı ol',
    icon: '📚',
    color: 'purple',
    roles: ['student', 'teacher'],
    quotaWeight: 1,
  },
  study_plan: {
    id: 'study_plan',
    name: 'Çalışma Planı',
    description: 'Kişisel çalışma planı oluştur',
    icon: '📋',
    color: 'green',
    roles: ['student'],
    quotaWeight: 2,
  },
  answer_evaluation: {
    id: 'answer_evaluation',
    name: 'Cevap Değerlendirme',
    description: 'Cevabını değerlendir',
    icon: '✅',
    color: 'emerald',
    roles: ['student', 'teacher'],
    quotaWeight: 1,
  },
  performance_analysis: {
    id: 'performance_analysis',
    name: 'Performans Analizi',
    description: 'Öğrenme performansını analiz et',
    icon: '📊',
    color: 'indigo',
    roles: ['student', 'teacher', 'admin'],
    quotaWeight: 2,
  },
  question_generation: {
    id: 'question_generation',
    name: 'Soru Üretimi',
    description: 'Otomatik soru üret',
    icon: '✍️',
    color: 'orange',
    roles: ['teacher', 'admin'],
    quotaWeight: 3,
  },
  content_enhancement: {
    id: 'content_enhancement',
    name: 'İçerik Zenginleştirme',
    description: 'İçeriği geliştir ve zenginleştir',
    icon: '🎨',
    color: 'pink',
    roles: ['teacher', 'admin'],
    quotaWeight: 2,
  },
  motivation_message: {
    id: 'motivation_message',
    name: 'Motivasyon',
    description: 'Motivasyon mesajı al',
    icon: '💪',
    color: 'yellow',
    roles: ['student'],
    quotaWeight: 0.5,
  },
};

interface AIFeatureConfig {
  id: AIFeatureType;
  name: string;
  description: string;
  icon: string;
  color: string;
  roles: string[];
  quotaWeight: number;
}

// =============================================================================
// HINT LEVELS
// =============================================================================

export const HINT_LEVELS = {
  1: {
    level: 1,
    name: 'Hafif İpucu',
    description: 'Düşünme yönü',
    icon: '💡',
  },
  2: {
    level: 2,
    name: 'Orta İpucu',
    description: 'Daha detaylı yardım',
    icon: '🔍',
  },
  3: {
    level: 3,
    name: 'Detaylı İpucu',
    description: 'Çözüm yaklaşımı',
    icon: '📚',
  },
} as const;

// =============================================================================
// QUOTA THRESHOLDS
// =============================================================================

export const QUOTA_THRESHOLDS = {
  warning: 70,    // %70 kullanımda uyarı
  critical: 90,   // %90 kullanımda kritik uyarı
  exhausted: 100, // %100 tükenmiş
} as const;

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const AI_ERROR_MESSAGES: Record<string, string> = {
  QUOTA_EXCEEDED: 'Günlük kullanım limitine ulaştın. Yarın tekrar dene!',
  NETWORK_ERROR: 'Bağlantı hatası. İnternet bağlantını kontrol et.',
  SERVICE_UNAVAILABLE: 'AI servisi şu an kullanılamıyor. Daha sonra tekrar dene.',
  CONTENT_FILTERED: 'Bu içerik işlenemedi. Lütfen farklı bir soru sor.',
  RATE_LIMIT: 'Çok hızlı istek gönderiyorsun. Biraz bekle.',
  INVALID_REQUEST: 'Geçersiz istek. Lütfen tekrar dene.',
  UNKNOWN_ERROR: 'Beklenmeyen bir hata oluştu. Lütfen tekrar dene.',
};

// =============================================================================
// PERSONA DEFAULTS
// =============================================================================

export const DEFAULT_PERSONA = {
  id: 'coach',
  name: 'Koç',
  avatar: '🎓',
  personality: 'encouraging' as const,
  greetings: [
    'Merhaba! Bugün sana nasıl yardımcı olabilirim?',
    'Selam! Birlikte öğrenmeye hazır mısın?',
    'Merhaba! Ne öğrenmek istersin?',
  ],
  encouragements: [
    'Harika gidiyorsun! Devam et.',
    'Doğru yoldasın, biraz daha düşün.',
    'Bu zor bir soru ama başarabilirsin!',
  ],
};

// =============================================================================
// PAGE CONTEXTS
// =============================================================================

export const PAGE_CONTEXTS = {
  content: {
    pageType: 'topic' as const,
    availableFeatures: ['topic_explanation', 'study_plan'] as AIFeatureType[],
  },
  video: {
    pageType: 'topic' as const,
    availableFeatures: ['topic_explanation'] as AIFeatureType[],
  },
  topic: {
    pageType: 'topic' as const,
    availableFeatures: ['topic_explanation', 'study_plan'] as AIFeatureType[],
  },
  question: {
    pageType: 'question' as const,
    availableFeatures: ['question_hint', 'answer_evaluation'] as AIFeatureType[],
  },
  exam: {
    pageType: 'exam' as const,
    availableFeatures: ['question_hint'] as AIFeatureType[],
  },
  course: {
    pageType: 'course' as const,
    availableFeatures: ['topic_explanation', 'study_plan'] as AIFeatureType[],
  },
  dashboard: {
    pageType: 'dashboard' as const,
    availableFeatures: ['study_plan', 'motivation_message', 'performance_analysis'] as AIFeatureType[],
  },
};
