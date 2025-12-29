/**
 * AI API Contracts - Request/Response Payload Standards
 * 
 * Frontend ve Backend arasındaki veri kontratlarını tanımlar.
 * Mock ve Real API response'larının tutarlılığını sağlar.
 */

// =============================================================================
// BASE CONTRACTS
// =============================================================================

/**
 * Standard API Response Wrapper
 * Backend'den gelen tüm response'lar bu formatta olmalı
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ApiMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  user_message?: string;
  details?: Record<string, unknown>;
}

export interface ApiMetadata {
  request_id?: string;
  timestamp?: string;
  tokens_used?: number;
  processing_time_ms?: number;
  cached?: boolean;
  quota_remaining?: number;
}

// =============================================================================
// HINT API
// =============================================================================

export interface HintRequest {
  question_id: string | number;
  question_text: string;
  subject?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  previous_hints?: string[];
  student_attempt?: string;
  context?: {
    course_id?: string | number;
    lesson_id?: string | number;
    exam_id?: string | number;
  };
}

export interface HintResponse {
  hint: string;
  hint_level: number;
  max_hints: number;
  remaining_hints: number;
  confidence: number;
  sources?: string[];
  next_hint_available: boolean;
}

// =============================================================================
// EXPLANATION API
// =============================================================================

export interface ExplanationRequest {
  topic: string;
  subject?: string;
  level?: 'basic' | 'detailed' | 'advanced';
  include_examples?: boolean;
  learning_style?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  context?: {
    course_id?: string | number;
    previous_knowledge?: string[];
  };
}

export interface ExplanationResponse {
  explanation: string;
  summary: string;
  key_points: string[];
  examples?: ExampleItem[];
  related_topics?: string[];
  difficulty_level: string;
  estimated_reading_time_minutes: number;
}

export interface ExampleItem {
  title: string;
  description: string;
  code?: string;
  visual_url?: string;
}

// =============================================================================
// STUDY PLAN API
// =============================================================================

export interface StudyPlanRequest {
  student_id?: string;
  goals: string[];
  available_hours_per_week: number;
  deadline?: string;
  subjects: string[];
  current_level?: Record<string, 'beginner' | 'intermediate' | 'advanced'>;
  preferences?: {
    study_time?: 'morning' | 'afternoon' | 'evening' | 'night';
    session_duration_minutes?: number;
    break_frequency_minutes?: number;
  };
}

export interface StudyPlanResponse {
  plan_id: string;
  title: string;
  description: string;
  total_duration_weeks: number;
  weekly_hours: number;
  phases: StudyPhase[];
  milestones: Milestone[];
  recommended_resources: Resource[];
  estimated_completion_date: string;
}

export interface StudyPhase {
  phase_number: number;
  title: string;
  duration_weeks: number;
  focus_areas: string[];
  activities: Activity[];
}

export interface Activity {
  type: 'reading' | 'practice' | 'quiz' | 'project' | 'review';
  title: string;
  description: string;
  duration_minutes: number;
  priority: 'high' | 'medium' | 'low';
}

export interface Milestone {
  title: string;
  target_date: string;
  criteria: string[];
  reward?: string;
}

export interface Resource {
  type: 'video' | 'article' | 'book' | 'course' | 'exercise';
  title: string;
  url?: string;
  estimated_time_minutes: number;
}

// =============================================================================
// ANSWER EVALUATION API
// =============================================================================

export interface EvaluateAnswerRequest {
  question_id: string;
  question_text: string;
  expected_answer?: string;
  student_answer: string;
  question_type: 'multiple_choice' | 'short_answer' | 'essay' | 'code';
  subject?: string;
  rubric?: RubricItem[];
  max_score?: number;
}

export interface RubricItem {
  criterion: string;
  description: string;
  max_points: number;
}

export interface EvaluateAnswerResponse {
  is_correct: boolean;
  score: number;
  max_score: number;
  percentage: number;
  feedback: string;
  detailed_feedback: DetailedFeedback;
  improvement_suggestions: string[];
  similar_correct_answer?: string;
}

export interface DetailedFeedback {
  strengths: string[];
  weaknesses: string[];
  rubric_scores?: RubricScore[];
}

export interface RubricScore {
  criterion: string;
  score: number;
  max_points: number;
  comment: string;
}

// =============================================================================
// PERFORMANCE ANALYSIS API
// =============================================================================

export interface AnalyzePerformanceRequest {
  student_id: string;
  time_range?: {
    start_date: string;
    end_date: string;
  };
  subjects?: string[];
  include_predictions?: boolean;
  comparison_group?: 'class' | 'school' | 'global';
}

export interface AnalyzePerformanceResponse {
  overall_score: number;
  performance_trend: 'improving' | 'stable' | 'declining';
  strengths: SkillArea[];
  weaknesses: SkillArea[];
  subject_breakdown: SubjectPerformance[];
  time_spent_analysis: TimeAnalysis;
  recommendations: Recommendation[];
  predictions?: PerformancePrediction[];
}

export interface SkillArea {
  name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export interface SubjectPerformance {
  subject: string;
  current_score: number;
  previous_score: number;
  change_percentage: number;
  topics_mastered: string[];
  topics_struggling: string[];
}

export interface TimeAnalysis {
  total_hours: number;
  average_daily_minutes: number;
  most_productive_time: string;
  efficiency_score: number;
}

export interface Recommendation {
  type: 'focus' | 'practice' | 'review' | 'break' | 'resource';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_url?: string;
}

export interface PerformancePrediction {
  subject: string;
  predicted_score: number;
  confidence: number;
  factors: string[];
}

// =============================================================================
// QUESTION GENERATION API
// =============================================================================

export interface GenerateQuestionsRequest {
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  question_types: ('multiple_choice' | 'true_false' | 'short_answer' | 'essay')[];
  count: number;
  learning_objectives?: string[];
  avoid_topics?: string[];
  context?: {
    course_id?: string;
    student_level?: string;
  };
}

export interface GenerateQuestionsResponse {
  questions: GeneratedQuestion[];
  topic_coverage: TopicCoverage[];
  difficulty_distribution: DifficultyDistribution;
  estimated_completion_time_minutes: number;
}

export interface GeneratedQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  text: string;
  options?: QuestionOption[];
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  points: number;
  time_limit_seconds?: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface TopicCoverage {
  topic: string;
  question_count: number;
  percentage: number;
}

export interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

// =============================================================================
// CHAT/STREAM API
// =============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  metadata?: {
    tokens?: number;
    model?: string;
    latency_ms?: number;
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  persona_id?: string;
  context?: {
    course_id?: string;
    lesson_id?: string;
    student_id?: string;
  };
  options?: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  };
}

export interface ChatResponse {
  message: ChatMessage;
  conversation_id: string;
  tokens_used: number;
  finish_reason: 'stop' | 'length' | 'content_filter';
  suggestions?: string[];
}

// =============================================================================
// QUOTA API
// =============================================================================

export interface QuotaResponse {
  daily_limit: number;
  daily_used: number;
  daily_remaining: number;
  monthly_limit: number;
  monthly_used: number;
  monthly_remaining: number;
  reset_time: string;
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  features_enabled: string[];
}

// =============================================================================
// FEEDBACK API
// =============================================================================

export interface FeedbackRequest {
  response_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback_type: 'helpful' | 'not_helpful' | 'incorrect' | 'inappropriate';
  comment?: string;
  context?: {
    feature?: string;
    session_id?: string;
  };
}

export interface FeedbackResponse {
  feedback_id: string;
  acknowledged: boolean;
  message: string;
}

// =============================================================================
// HEALTH API
// =============================================================================

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  components: {
    ai_service: ComponentHealth;
    cache: ComponentHealth;
    database: ComponentHealth;
  };
  uptime_seconds: number;
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency_ms?: number;
  last_check?: string;
}

// =============================================================================
// FEATURES API
// =============================================================================

export interface FeaturesResponse {
  features: FeatureConfig[];
  user_tier: string;
  experiment_flags?: Record<string, boolean>;
}

export interface FeatureConfig {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  quota_required?: boolean;
}
