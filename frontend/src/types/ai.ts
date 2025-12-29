/**
 * AI Module Types & Interfaces
 * 
 * Yapay Zeka destekli özelliklerin type tanımları.
 * UX stratejisi: AI = "Koç" (Coach) olarak konumlandırılır.
 */

// =============================================================================
// AI PERSONA & IDENTITY
// =============================================================================

/**
 * AI Koç Personası
 * 
 * Tasarım Kararı: "Asistan" yerine "Koç" tercih edildi çünkü:
 * - Koç öğrenciyle birlikte çalışır, cevabı direkt vermez
 * - Koç motive eder ve yönlendirir
 * - Koç öğrenme sürecine odaklanır
 */
export interface AICoachPersona {
  id: string;
  name: string;           // "Mentor", "Koç", "Öğrenme Arkadaşı"
  avatar: string;         // Avatar URL veya emoji
  personality: AIPersonality;
  greetings: string[];    // Karşılama mesajları
  encouragements: string[]; // Motivasyon mesajları
}

export type AIPersonality = 
  | 'friendly'      // Arkadaşça, samimi
  | 'professional'  // Profesyonel, resmi
  | 'encouraging'   // Motive edici
  | 'patient';      // Sabırlı, anlayışlı

// =============================================================================
// USER ROLES & AI EXPERIENCE
// =============================================================================

/**
 * Rol Bazlı AI Deneyimi
 * UserRole auth.ts'den import edilir - burada tekrar tanımlanmaz
 */
import type { UserRole } from './auth';

// Re-export for convenience
export type { UserRole } from './auth';

export interface RoleBasedAIConfig {
  role: UserRole;
  features: AIFeatureAccess;
  quotaMultiplier: number;  // Rol bazlı kota çarpanı
  customPromptAllowed: boolean;
  adminControls: boolean;
}

export interface AIFeatureConfig {
  enabled: boolean;
  quotaLimit?: number;
  isUnlimited?: boolean;
}

export interface AIFeatureAccess {
  role?: UserRole;
  features?: Record<AIFeatureType, AIFeatureConfig>;
  dailyQuota?: number;
  priorityLevel?: number;
  
  // Öğrenci özellikleri
  questionHint?: boolean;
  topicExplanation?: boolean;
  studyPlan?: boolean;
  answerEvaluation?: boolean;
  motivationMessages?: boolean;
  
  // Öğretmen özellikleri
  questionGeneration?: boolean;
  contentEnhancement?: boolean;
  performanceAnalysis?: boolean;
  bulkOperations?: boolean;
  
  // Admin özellikleri
  promptManagement?: boolean;
  usageAnalytics?: boolean;
  costMonitoring?: boolean;
  systemConfiguration?: boolean;
}

// =============================================================================
// AI INTERACTION MODELS
// =============================================================================

/**
 * AI Etkileşim Türleri
 */
export type AIInteractionType = 
  | 'chat'            // Sohbet tabanlı
  | 'contextual'      // Bağlama duyarlı
  | 'embedded'        // Sayfa içi gömülü
  | 'floating'        // Yüzen asistan
  | 'inline';         // Satır içi yardım

/**
 * Chat Mesaj Yapısı
 */
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    feature?: AIFeatureType;
    tokens?: number;
    isStreaming?: boolean;
    hasError?: boolean;
    confidence?: number;  // AI güven skoru
  };
}

export type AIFeatureType = 
  | 'question_hint'
  | 'topic_explanation'
  | 'study_plan'
  | 'answer_evaluation'
  | 'performance_analysis'
  | 'question_generation'
  | 'content_enhancement'
  | 'motivation_message';

/**
 * Context-Aware AI Request
 */
export interface AIContextualRequest {
  feature: AIFeatureType;
  context: AIContext;
  userMessage?: string;
  options?: AIRequestOptions;
}

export interface AIContext {
  // Sayfa bağlamı
  currentPage?: string;
  pagePath?: string;
  pageType?: 'question' | 'topic' | 'exam' | 'course' | 'dashboard';
  
  // İçerik bağlamı - string veya number kabul eder
  questionId?: string | number;
  questionText?: string;
  topicId?: string | number;
  examId?: string | number;
  courseId?: string | number;
  lessonId?: string | number;
  contentType?: string;
  subject?: string;
  
  // Kullanıcı bağlamı
  userLevel?: string;
  studentLevel?: 'beginner' | 'intermediate' | 'advanced' | string;
  recentMistakes?: string[];
  learningStyle?: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  
  // AI-specific context
  previousMessages?: AIChatMessage[];
  previousHints?: string[];
  studentAttempt?: string;
  
  // Intent
  intent?: 'explain' | 'question' | 'practice' | string;
}

export interface AIRequestOptions {
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  priority?: 'low' | 'normal' | 'high';
}

// =============================================================================
// AI RESPONSE & FEEDBACK
// =============================================================================

/**
 * AI Yanıt Yapısı
 */
export interface AIResponse {
  id: string;
  content: string;
  feature: AIFeatureType;
  metadata: AIResponseMetadata;
  suggestions?: AISuggestion[];
  relatedContent?: AIRelatedContent[];
}

export interface AIResponseMetadata {
  tokensUsed: number;
  processingTime: number;
  model: string;
  cached: boolean;
  confidence: number;       // 0-1 arası güven skoru
  disclaimer?: string;      // Sorumluluk reddi
}

export interface AISuggestion {
  id: string;
  text: string;
  action: string;           // Tıklanınca yapılacak aksiyon
  icon?: string;
}

export interface AIRelatedContent {
  type: 'topic' | 'question' | 'video' | 'article';
  id: number;
  title: string;
  relevanceScore: number;
}

// =============================================================================
// USER EXPECTATION MANAGEMENT
// =============================================================================

/**
 * AI Sınır ve Uyarı Mesajları
 */
export interface AILimitation {
  id?: string;
  type: string;
  severity: 'info' | 'warning' | 'caution' | 'critical';
  message?: string;
  description?: string;
}

export interface AIDisclaimer {
  id: string;
  feature: AIFeatureType;
  title: string;            // Başlık
  message: string;          // Detaylı mesaj
  shortMessage: string;     // Kısa versiyon
  shortText?: string;       // Alternatif kısa metin
  longText?: string;        // Detaylı açıklama
  limitations: AILimitation[]; // Sınırlamalar listesi
  showAlways?: boolean;     // Her zaman göster
  showOnce?: boolean;       // Sadece bir kez göster
  requireAcknowledge?: boolean; // Kullanıcı onayı gerekli
  acceptRequired?: boolean; // Kabul gerekli
}

/**
 * AI Hata Yönetimi
 */
export interface AIErrorState {
  type: AIErrorType;
  message: string;
  userMessage: string;      // Kullanıcıya gösterilecek mesaj
  recoveryAction?: AIRecoveryAction;
}

export type AIErrorType = 
  | 'rate_limit'
  | 'quota_exceeded'
  | 'content_filtered'
  | 'network_error'
  | 'service_unavailable'
  | 'invalid_request';

export interface AIRecoveryAction {
  type: 'retry' | 'upgrade' | 'wait' | 'contact_support';
  label: string;
  action: () => void;
  countdown?: number;       // Bekle durumunda saniye
}

// =============================================================================
// QUOTA & USAGE CONTROL
// =============================================================================

/**
 * AI Kota Durumu
 */
export interface AIQuotaStatus {
  // Feature-specific quota
  feature?: AIFeatureType;
  used?: number;
  limit?: number;
  resetAt?: Date;
  unit?: 'requests' | 'tokens';
  isUnlimited?: boolean;
  
  // Daily quota
  dailyLimit?: number;
  dailyUsed?: number;
  dailyRemaining?: number;
  
  // Monthly quota
  monthlyLimit?: number;
  monthlyUsed?: number;
  monthlyRemaining?: number;
  
  // Reset time
  resetTime?: Date;
}

export interface AIUsageSummary {
  daily: AIQuotaStatus[];
  monthly: AIQuotaStatus[];
  totalCost?: number;       // Admin için
  efficiency?: number;      // Kullanım verimliliği
}

/**
 * Kota Uyarı Seviyeleri
 */
export interface AIQuotaWarning {
  level: 'info' | 'warning' | 'critical';
  threshold?: number;        // Yüzde
  message: string;
  action?: string;          // Aksiyon metni
  label?: string;           // Etiket
  bgColor?: string;         // Arkaplan rengi
  textColor?: string;       // Metin rengi
  borderColor?: string;     // Border rengi
}

export interface AIQuotaAction {
  type: 'upgrade' | 'wait' | 'optimize' | 'alternative';
  label: string;
  description: string;
  icon?: string;
}

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

/**
 * AI UI State
 */
export interface AIUIState {
  isOpen: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  currentFeature: AIFeatureType | null;
  interactionType: AIInteractionType;
  position: AIPosition;
  minimized: boolean;
}

export interface AIPosition {
  type: 'floating' | 'sidebar' | 'modal' | 'inline';
  anchor?: 'bottom-right' | 'bottom-left' | 'center';
  width?: number;
  height?: number;
}

/**
 * AI Session State
 */
export interface AISession {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  messages?: AIChatMessage[];
  context?: AIContext;
  feature?: AIFeatureType;
  quotaUsed?: number;
  messageCount: number;
  status: 'active' | 'ended' | 'error';
}

// =============================================================================
// FEEDBACK & IMPROVEMENT
// =============================================================================

/**
 * AI Yanıt Değerlendirme
 */
export interface AIFeedback {
  responseId: string;
  rating: 1 | 2 | 3 | 4 | 5 | number;
  helpful: boolean;
  accurate?: boolean;
  comment?: string;
  submittedAt?: Date;
  feature?: string;
}

export interface AIFeedbackPrompt {
  trigger: 'after_response' | 'on_error' | 'periodic';
  question: string;
  options: AIFeedbackOption[];
}

export interface AIFeedbackOption {
  value: string;
  label: string;
  icon?: string;
}
