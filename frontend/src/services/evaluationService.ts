/**
 * Evaluation Service
 * 
 * Ödev, Gönderim, Koçluk ve Performans Değerlendirmesi API servisleri.
 * Backend: app/modules/evaluations/routes.py
 */

import api from './api';

// =============================================================================
// TYPES
// =============================================================================

export type AssignmentStatus = 'draft' | 'published' | 'closed' | 'archived';
export type SubmissionStatus = 'submitted' | 'late' | 'graded' | 'returned';

export interface Assignment {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  course_id: number;
  course_title?: string;
  topic_id?: number;
  topic_title?: string;
  created_by: number;
  created_by_name?: string;
  status: AssignmentStatus;
  max_score: number;
  passing_score: number;
  due_date: string | null;
  allow_late_submission: boolean;
  late_penalty_percent: number;
  submission_count: number;
  graded_count: number;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: number;
  assignment_id: number;
  assignment_title?: string;
  user_id: number;
  user_name?: string;
  content: string;
  file_url?: string;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  graded_by?: number;
  graded_by_name?: string;
  graded_at?: string;
  submitted_at: string;
  is_late: boolean;
  late_penalty_applied?: number;
}

export interface CoachingNote {
  id: number;
  student_id: number;
  student_name?: string;
  coach_id: number;
  coach_name?: string;
  course_id?: number;
  course_title?: string;
  title: string;
  content: string;
  note_type: 'progress' | 'feedback' | 'goal' | 'concern' | 'achievement';
  is_private: boolean;
  is_visible_to_student: boolean;
  created_at: string;
  updated_at: string;
}

export interface PerformanceReview {
  id: number;
  student_id: number;
  student_name?: string;
  reviewer_id: number;
  reviewer_name?: string;
  course_id?: number;
  course_title?: string;
  period_start: string;
  period_end: string;
  overall_rating: number;
  strengths: string[];
  areas_for_improvement: string[];
  goals: string[];
  comments: string | null;
  is_published: boolean;
  published_at?: string;
  created_at: string;
}

export interface AssignmentCreateData {
  title: string;
  description?: string;
  instructions?: string;
  course_id: number;
  topic_id?: number;
  max_score?: number;
  passing_score?: number;
  due_date?: string;
  allow_late_submission?: boolean;
  late_penalty_percent?: number;
}

export interface AssignmentUpdateData {
  title?: string;
  description?: string;
  instructions?: string;
  max_score?: number;
  passing_score?: number;
  due_date?: string;
  allow_late_submission?: boolean;
  late_penalty_percent?: number;
}

export interface SubmissionCreateData {
  content: string;
  file_url?: string;
}

export interface GradeData {
  score: number;
  feedback?: string;
}

export interface CoachingNoteCreateData {
  student_id: number;
  course_id?: number;
  title: string;
  content: string;
  note_type?: 'progress' | 'feedback' | 'goal' | 'concern' | 'achievement';
  is_private?: boolean;
  is_visible_to_student?: boolean;
}

export interface PerformanceReviewCreateData {
  student_id: number;
  course_id?: number;
  period_start: string;
  period_end: string;
  overall_rating: number;
  strengths?: string[];
  areas_for_improvement?: string[];
  goals?: string[];
  comments?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

// =============================================================================
// ASSIGNMENT API FUNCTIONS
// =============================================================================

/**
 * Ödev listesi
 */
export const getAssignments = async (params?: {
  page?: number;
  per_page?: number;
  course_id?: number;
}): Promise<PaginatedResponse<Assignment>> => {
  const response = await api.get('/evaluations/assignments', { params });
  return response.data.data;
};

/**
 * Ödev detayı
 */
export const getAssignment = async (assignmentId: number): Promise<Assignment> => {
  const response = await api.get(`/evaluations/assignments/${assignmentId}`);
  return response.data.data.assignment;
};

/**
 * Yeni ödev oluştur (Teacher/Admin)
 */
export const createAssignment = async (data: AssignmentCreateData): Promise<Assignment> => {
  const response = await api.post('/evaluations/assignments', data);
  return response.data.data.assignment;
};

/**
 * Ödev güncelle
 */
export const updateAssignment = async (assignmentId: number, data: AssignmentUpdateData): Promise<Assignment> => {
  const response = await api.put(`/evaluations/assignments/${assignmentId}`, data);
  return response.data.data.assignment;
};

/**
 * Ödevi yayınla
 */
export const publishAssignment = async (assignmentId: number): Promise<Assignment> => {
  const response = await api.post(`/evaluations/assignments/${assignmentId}/publish`);
  return response.data.data.assignment;
};

// =============================================================================
// SUBMISSION API FUNCTIONS
// =============================================================================

/**
 * Ödev gönder
 */
export const submitAssignment = async (assignmentId: number, data: SubmissionCreateData): Promise<Submission> => {
  const response = await api.post(`/evaluations/assignments/${assignmentId}/submit`, data);
  return response.data.data.submission;
};

/**
 * Ödev gönderimlerini listele (Teacher)
 */
export const getAssignmentSubmissions = async (assignmentId: number, params?: {
  page?: number;
  per_page?: number;
  status?: SubmissionStatus;
}): Promise<PaginatedResponse<Submission>> => {
  const response = await api.get(`/evaluations/assignments/${assignmentId}/submissions`, { params });
  return response.data.data;
};

/**
 * Gönderimi değerlendir (Teacher)
 */
export const gradeSubmission = async (submissionId: number, data: GradeData): Promise<Submission> => {
  const response = await api.post(`/evaluations/submissions/${submissionId}/grade`, data);
  return response.data.data.submission;
};

/**
 * Kendi gönderimlerim
 */
export const getMySubmissions = async (params?: {
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<Submission>> => {
  const response = await api.get('/evaluations/my-submissions', { params });
  return response.data.data;
};

// =============================================================================
// COACHING NOTE API FUNCTIONS
// =============================================================================

/**
 * Koçluk notları listesi (Teacher)
 */
export const getCoachingNotes = async (params?: {
  page?: number;
  per_page?: number;
  student_id?: number;
}): Promise<PaginatedResponse<CoachingNote>> => {
  const response = await api.get('/evaluations/coaching-notes', { params });
  return response.data.data;
};

/**
 * Koçluk notu oluştur (Teacher)
 */
export const createCoachingNote = async (data: CoachingNoteCreateData): Promise<CoachingNote> => {
  const response = await api.post('/evaluations/coaching-notes', data);
  return response.data.data.coaching_note;
};

/**
 * Bana yazılan koçluk notları (Student)
 */
export const getMyCoachingNotes = async (): Promise<CoachingNote[]> => {
  const response = await api.get('/evaluations/my-coaching-notes');
  return response.data.data.coaching_notes;
};

// =============================================================================
// PERFORMANCE REVIEW API FUNCTIONS
// =============================================================================

/**
 * Performans değerlendirmeleri listesi (Teacher)
 */
export const getPerformanceReviews = async (params?: {
  page?: number;
  per_page?: number;
  student_id?: number;
  course_id?: number;
}): Promise<PaginatedResponse<PerformanceReview>> => {
  const response = await api.get('/evaluations/performance-reviews', { params });
  return response.data.data;
};

/**
 * Performans değerlendirmesi oluştur (Teacher)
 */
export const createPerformanceReview = async (data: PerformanceReviewCreateData): Promise<PerformanceReview> => {
  const response = await api.post('/evaluations/performance-reviews', data);
  return response.data.data.performance_review;
};

/**
 * Performans değerlendirmesini yayınla
 */
export const publishPerformanceReview = async (reviewId: number): Promise<PerformanceReview> => {
  const response = await api.post(`/evaluations/performance-reviews/${reviewId}/publish`);
  return response.data.data.performance_review;
};

/**
 * Benim performans değerlendirmelerim (Student)
 */
export const getMyPerformanceReviews = async (): Promise<PerformanceReview[]> => {
  const response = await api.get('/evaluations/my-performance-reviews');
  return response.data.data.performance_reviews;
};

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  // Assignments
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  publishAssignment,
  
  // Submissions
  submitAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  getMySubmissions,
  
  // Coaching Notes
  getCoachingNotes,
  createCoachingNote,
  getMyCoachingNotes,
  
  // Performance Reviews
  getPerformanceReviews,
  createPerformanceReview,
  publishPerformanceReview,
  getMyPerformanceReviews,
};
