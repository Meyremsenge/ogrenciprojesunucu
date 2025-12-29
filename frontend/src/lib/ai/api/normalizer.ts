/**
 * Response Normalizer - Mock/Real API Response Parity
 * 
 * Mock API ve Real API response'larının frontend'de aynı 
 * formatta işlenmesini garantiler.
 */

import type {
  HintResponse,
  ExplanationResponse,
  StudyPlanResponse,
  EvaluateAnswerResponse,
  AnalyzePerformanceResponse,
  GenerateQuestionsResponse,
  ChatResponse,
  QuotaResponse,
  HealthResponse,
  FeaturesResponse,
  ApiMetadata,
} from './contracts';

// =============================================================================
// NORMALIZER INTERFACE
// =============================================================================

export interface NormalizedResponse<T> {
  data: T;
  metadata: NormalizedMetadata;
  source: 'api' | 'mock' | 'cache';
  timestamp: Date;
}

export interface NormalizedMetadata {
  requestId: string;
  latencyMs: number;
  tokensUsed?: number;
  cached: boolean;
  quotaRemaining?: number;
}

// =============================================================================
// FIELD MAPPERS - Snake Case to Camel Case
// =============================================================================

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformKeys<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeys(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = transformKeys(value);
    }
    return result as T;
  }
  
  return obj as T;
}

// =============================================================================
// GENERIC NORMALIZER
// =============================================================================

export function normalizeApiResponse<T>(
  rawResponse: unknown,
  source: 'api' | 'mock' | 'cache',
  metadata?: Partial<ApiMetadata>
): NormalizedResponse<T> {
  // Transform backend snake_case to frontend camelCase
  const transformedData = transformKeys<T>(rawResponse);
  
  return {
    data: transformedData,
    metadata: {
      requestId: metadata?.request_id || generateLocalRequestId(),
      latencyMs: metadata?.processing_time_ms || 0,
      tokensUsed: metadata?.tokens_used,
      cached: metadata?.cached || source === 'cache',
      quotaRemaining: metadata?.quota_remaining,
    },
    source,
    timestamp: new Date(),
  };
}

// =============================================================================
// SPECIFIC NORMALIZERS
// =============================================================================

export function normalizeHintResponse(
  raw: unknown,
  source: 'api' | 'mock' | 'cache'
): NormalizedResponse<HintResponse> {
  const data = transformKeys<HintResponse>(raw);
  
  // Ensure all required fields have defaults
  const normalized: HintResponse = {
    hint: data.hint || '',
    hint_level: data.hint_level ?? 1,
    max_hints: data.max_hints ?? 3,
    remaining_hints: data.remaining_hints ?? 2,
    confidence: data.confidence ?? 0.8,
    sources: data.sources || [],
    next_hint_available: data.next_hint_available ?? true,
  };
  
  return {
    data: normalized,
    metadata: extractMetadata(raw),
    source,
    timestamp: new Date(),
  };
}

export function normalizeExplanationResponse(
  raw: unknown,
  source: 'api' | 'mock' | 'cache'
): NormalizedResponse<ExplanationResponse> {
  const data = transformKeys<ExplanationResponse>(raw);
  
  const normalized: ExplanationResponse = {
    explanation: data.explanation || '',
    summary: data.summary || '',
    key_points: data.key_points || [],
    examples: data.examples || [],
    related_topics: data.related_topics || [],
    difficulty_level: data.difficulty_level || 'intermediate',
    estimated_reading_time_minutes: data.estimated_reading_time_minutes ?? 5,
  };
  
  return {
    data: normalized,
    metadata: extractMetadata(raw),
    source,
    timestamp: new Date(),
  };
}

export function normalizeStudyPlanResponse(
  raw: unknown,
  source: 'api' | 'mock' | 'cache'
): NormalizedResponse<StudyPlanResponse> {
  const data = transformKeys<StudyPlanResponse>(raw);
  
  const normalized: StudyPlanResponse = {
    plan_id: data.plan_id || generateLocalRequestId(),
    title: data.title || 'Çalışma Planı',
    description: data.description || '',
    total_duration_weeks: data.total_duration_weeks ?? 4,
    weekly_hours: data.weekly_hours ?? 10,
    phases: data.phases || [],
    milestones: data.milestones || [],
    recommended_resources: data.recommended_resources || [],
    estimated_completion_date: data.estimated_completion_date || getFutureDate(30),
  };
  
  return {
    data: normalized,
    metadata: extractMetadata(raw),
    source,
    timestamp: new Date(),
  };
}

export function normalizeEvaluationResponse(
  raw: unknown,
  source: 'api' | 'mock' | 'cache'
): NormalizedResponse<EvaluateAnswerResponse> {
  const data = transformKeys<EvaluateAnswerResponse>(raw);
  
  const normalized: EvaluateAnswerResponse = {
    is_correct: data.is_correct ?? false,
    score: data.score ?? 0,
    max_score: data.max_score ?? 100,
    percentage: data.percentage ?? 0,
    feedback: data.feedback || 'Değerlendirme tamamlandı.',
    detailed_feedback: data.detailed_feedback || {
      strengths: [],
      weaknesses: [],
    },
    improvement_suggestions: data.improvement_suggestions || [],
    similar_correct_answer: data.similar_correct_answer,
  };
  
  return {
    data: normalized,
    metadata: extractMetadata(raw),
    source,
    timestamp: new Date(),
  };
}

export function normalizePerformanceResponse(
  raw: unknown,
  source: 'api' | 'mock' | 'cache'
): NormalizedResponse<AnalyzePerformanceResponse> {
  const data = transformKeys<AnalyzePerformanceResponse>(raw);
  
  const normalized: AnalyzePerformanceResponse = {
    overall_score: data.overall_score ?? 0,
    performance_trend: data.performance_trend || 'stable',
    strengths: data.strengths || [],
    weaknesses: data.weaknesses || [],
    subject_breakdown: data.subject_breakdown || [],
    time_spent_analysis: data.time_spent_analysis || {
      total_hours: 0,
      average_daily_minutes: 0,
      most_productive_time: 'morning',
      efficiency_score: 0,
    },
    recommendations: data.recommendations || [],
    predictions: data.predictions,
  };
  
  return {
    data: normalized,
    metadata: extractMetadata(raw),
    source,
    timestamp: new Date(),
  };
}

export function normalizeQuestionsResponse(
  raw: unknown,
  source: 'api' | 'mock' | 'cache'
): NormalizedResponse<GenerateQuestionsResponse> {
  const data = transformKeys<GenerateQuestionsResponse>(raw);
  
  const normalized: GenerateQuestionsResponse = {
    questions: data.questions || [],
    topic_coverage: data.topic_coverage || [],
    difficulty_distribution: data.difficulty_distribution || {
      easy: 0,
      medium: 0,
      hard: 0,
    },
    estimated_completion_time_minutes: data.estimated_completion_time_minutes ?? 30,
  };
  
  return {
    data: normalized,
    metadata: extractMetadata(raw),
    source,
    timestamp: new Date(),
  };
}

export function normalizeChatResponse(
  raw: unknown,
  source: 'api' | 'mock' | 'cache'
): NormalizedResponse<ChatResponse> {
  const data = transformKeys<ChatResponse>(raw);
  
  const normalized: ChatResponse = {
    message: data.message || {
      role: 'assistant',
      content: '',
    },
    conversation_id: data.conversation_id || generateLocalRequestId(),
    tokens_used: data.tokens_used ?? 0,
    finish_reason: data.finish_reason || 'stop',
    suggestions: data.suggestions || [],
  };
  
  return {
    data: normalized,
    metadata: extractMetadata(raw),
    source,
    timestamp: new Date(),
  };
}

export function normalizeQuotaResponse(
  raw: unknown,
  source: 'api' | 'mock' | 'cache'
): NormalizedResponse<QuotaResponse> {
  const data = transformKeys<QuotaResponse>(raw);
  
  const normalized: QuotaResponse = {
    daily_limit: data.daily_limit ?? 100,
    daily_used: data.daily_used ?? 0,
    daily_remaining: data.daily_remaining ?? 100,
    monthly_limit: data.monthly_limit ?? 1000,
    monthly_used: data.monthly_used ?? 0,
    monthly_remaining: data.monthly_remaining ?? 1000,
    reset_time: data.reset_time || getTomorrowMidnight(),
    tier: data.tier || 'free',
    features_enabled: data.features_enabled || [],
  };
  
  return {
    data: normalized,
    metadata: extractMetadata(raw),
    source,
    timestamp: new Date(),
  };
}

export function normalizeHealthResponse(
  raw: unknown,
  source: 'api' | 'mock' | 'cache'
): NormalizedResponse<HealthResponse> {
  const data = transformKeys<HealthResponse>(raw);
  
  const normalized: HealthResponse = {
    status: data.status || 'healthy',
    version: data.version || '1.0.0',
    components: data.components || {
      ai_service: { status: 'up' },
      cache: { status: 'up' },
      database: { status: 'up' },
    },
    uptime_seconds: data.uptime_seconds ?? 0,
  };
  
  return {
    data: normalized,
    metadata: extractMetadata(raw),
    source,
    timestamp: new Date(),
  };
}

export function normalizeFeaturesResponse(
  raw: unknown,
  source: 'api' | 'mock' | 'cache'
): NormalizedResponse<FeaturesResponse> {
  const data = transformKeys<FeaturesResponse>(raw);
  
  const normalized: FeaturesResponse = {
    features: data.features || [],
    user_tier: data.user_tier || 'free',
    experiment_flags: data.experiment_flags || {},
  };
  
  return {
    data: normalized,
    metadata: extractMetadata(raw),
    source,
    timestamp: new Date(),
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

function extractMetadata(raw: unknown): NormalizedMetadata {
  const obj = raw as Record<string, unknown>;
  const metadata = obj?.metadata as Record<string, unknown> | undefined;
  
  return {
    requestId: (metadata?.request_id as string) || generateLocalRequestId(),
    latencyMs: (metadata?.processing_time_ms as number) || 0,
    tokensUsed: metadata?.tokens_used as number | undefined,
    cached: (metadata?.cached as boolean) || false,
    quotaRemaining: metadata?.quota_remaining as number | undefined,
  };
}

function generateLocalRequestId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getFutureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getTomorrowMidnight(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateResponse<T>(
  data: T,
  requiredFields: (keyof T)[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      errors.push(`Missing required field: ${String(field)}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
