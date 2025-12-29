/**
 * Exam & Evaluation Types
 * 
 * Sınav, soru ve değerlendirme tipleri.
 */

// =============================================================================
// Question Types
// =============================================================================

export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'fill_in_blank'
  | 'matching'
  | 'ordering'
  | 'numeric'
  | 'code'
  | 'hotspot'
  | 'drag_drop';

export type DifficultyLevel = 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';

export interface Answer {
  id: number;
  answer_text: string;
  order_index: number;
  image_url?: string;
  // Only if include_correct=true
  is_correct?: boolean;
  weight?: number;
  feedback?: string;
}

export interface Question {
  id: number;
  topic_id: number;
  question_text: string;
  question_type: QuestionType;
  image_url?: string;
  audio_url?: string;
  video_url?: string;
  difficulty: DifficultyLevel;
  points: number;
  negative_points: number;
  partial_credit: boolean;
  hint?: string;
  hint_penalty?: number;
  bloom_level?: string;
  time_limit_seconds?: number;
  question_data?: Record<string, any>;
  answers: Answer[];
  total_attempts?: number;
  correct_attempts?: number;
  success_rate?: number;
  explanation?: string;
  grading_rubric?: string;
  last_attempt?: {
    is_correct: boolean;
    points_earned: number;
    attempted_at: string;
  };
}

// =============================================================================
// Exam Types
// =============================================================================

export type ExamStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface Exam {
  id: number;
  course_id: number;
  title: string;
  description?: string;
  instructions?: string;
  status: ExamStatus;
  exam_type: string;
  time_limit_minutes?: number;
  passing_score?: number;
  max_attempts?: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  allow_review: boolean;
  start_date?: string;
  end_date?: string;
  question_count?: number;
  total_points?: number;
  created_at: string;
  updated_at?: string;
}

export interface ExamAttempt {
  id: number;
  exam_id: number;
  user_id: number;
  status: 'in_progress' | 'submitted' | 'graded' | 'expired';
  started_at: string;
  submitted_at?: string;
  time_remaining?: number;
  score?: number;
  max_score?: number;
  percentage?: number;
  passed?: boolean;
}

export interface ExamResult {
  attempt_id: number;
  exam_id: number;
  exam_title: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  time_spent_minutes: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  questions?: QuestionResult[];
}

export interface QuestionResult {
  question_id: number;
  question_text: string;
  question_type: QuestionType;
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  user_answer: any;
  correct_answer?: any;
  feedback?: string;
  time_spent_seconds?: number;
}

// =============================================================================
// Grading Types
// =============================================================================

export type GradingStatus = 'pending' | 'auto_graded' | 'manual_graded' | 'partial' | 'error';

export interface GradingResult {
  question_id: number;
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  feedback: string;
  details: Record<string, any>;
  status: GradingStatus;
}

export interface PracticeResult {
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  feedback: string;
  details: Record<string, any>;
  attempt_id: number;
}

export interface PendingGrade {
  attempt_id: number;
  question_id: number;
  user_id: number;
  user_name: string;
  question_text: string;
  text_answer: string;
  submitted_at: string;
  course_id: number;
  course_name: string;
}

// =============================================================================
// Performance & Analytics Types
// =============================================================================

export type PerformanceLevel = 'excellent' | 'good' | 'average' | 'below_average' | 'needs_improvement';
export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface TopicPerformance {
  topic_id: number;
  topic_name: string;
  total_attempts: number;
  correct_attempts: number;
  success_rate: number;
  average_time_seconds: number;
  performance_level: PerformanceLevel;
  trend: TrendDirection;
  difficulty_breakdown: Record<string, { attempts: number; success_rate: number }>;
  type_breakdown: Record<string, { attempts: number; success_rate: number }>;
}

export interface StrengthWeakness {
  area: string;
  type: 'topic' | 'difficulty' | 'question_type' | 'bloom_level';
  success_rate: number;
  total_attempts: number;
  description: string;
}

export interface LearningPattern {
  best_time_of_day: string;
  average_answer_time: number;
  fastest_question_type: string;
  slowest_question_type: string;
  most_active_day: string;
  streak_days: number;
  daily_activity: Record<string, number>;
}

export interface StudentPerformanceReport {
  user_id: number;
  period_start: string;
  period_end: string;
  overall_score: number;
  performance_level: PerformanceLevel;
  total_questions_attempted: number;
  correct_answers: number;
  overall_success_rate: number;
  total_time_spent_seconds: number;
  average_time_per_question: number;
  trend: TrendDirection;
  trend_score_change: number;
  exams_taken: number;
  exams_passed: number;
  exam_pass_rate: number;
  topic_performances: TopicPerformance[];
  strengths: StrengthWeakness[];
  weaknesses: StrengthWeakness[];
  learning_pattern: LearningPattern;
  recommendations: string[];
}

export interface PeerComparison {
  user_score: number;
  class_average: number;
  percentile: number;
  rank: number;
  total_students: number;
  comparison_message: string;
}

// =============================================================================
// Report Types
// =============================================================================

export type ReportType =
  | 'student_progress'
  | 'course_analytics'
  | 'exam_analytics'
  | 'class_performance'
  | 'question_analytics'
  | 'engagement_metrics'
  | 'institution_overview';

export type ReportFormat = 'json' | 'pdf' | 'excel' | 'csv';

export interface StudentReport {
  student_id: number;
  student_name: string;
  email: string;
  course_id?: number;
  course_name?: string;
  period: { start: string; end: string };
  summary: {
    total_exams: number;
    passed_exams: number;
    failed_exams: number;
    pass_rate: number;
    average_score: number;
    total_questions: number;
    correct_answers: number;
    success_rate: number;
    total_time_hours: number;
    performance_level: PerformanceLevel;
    trend: TrendDirection;
  };
  exams: Array<{
    exam_id: number;
    title: string;
    score: number;
    max_score: number;
    percentage: number;
    passed: boolean;
    date: string;
  }>;
  topic_breakdown: Array<{
    topic_id: number;
    name: string;
    success_rate: number;
    attempts: number;
  }>;
  recommendations: string[];
}

export interface CourseReport {
  course_id: number;
  course_name: string;
  period: { start: string; end: string };
  summary: {
    total_students: number;
    active_students: number;
    total_exams: number;
    average_pass_rate: number;
    average_score: number;
    completion_rate: number;
  };
  exam_analytics: Array<{
    exam_id: number;
    title: string;
    attempts: number;
    pass_rate: number;
    average_score: number;
  }>;
  student_performance_distribution: {
    excellent: number;
    good: number;
    average: number;
    below_average: number;
    needs_improvement: number;
  };
  topics_needing_attention: Array<{
    topic_id: number;
    name: string;
    success_rate: number;
  }>;
}

export interface ExamAnalytics {
  exam_id: number;
  title: string;
  total_attempts: number;
  unique_students: number;
  average_score: number;
  median_score: number;
  score_distribution: Record<string, number>;
  pass_rate: number;
  average_duration_minutes: number;
  question_analytics: Array<{
    question_id: number;
    question_text: string;
    success_rate: number;
    average_time: number;
    discrimination_index: number;
    difficulty_rating: string;
  }>;
}

export interface InstitutionOverview {
  period: { start: string; end: string };
  summary: {
    total_users: number;
    total_students: number;
    total_teachers: number;
    total_courses: number;
    active_courses: number;
    total_exams: number;
    total_questions: number;
  };
  engagement: {
    daily_active_users: number;
    weekly_active_users: number;
    monthly_active_users: number;
    total_exam_attempts: number;
    total_practice_sessions: number;
  };
  performance: {
    overall_pass_rate: number;
    average_score: number;
    completion_rate: number;
  };
  top_courses: Array<{
    course_id: number;
    name: string;
    enrollment: number;
    pass_rate: number;
  }>;
  trends: {
    user_growth: number;
    engagement_change: number;
    performance_change: number;
  };
}
