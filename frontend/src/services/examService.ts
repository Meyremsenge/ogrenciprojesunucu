/**
 * Exam & Evaluation API Service
 * 
 * Sınav, soru ve değerlendirme API işlemleri.
 */

import api from './api';
import type {
  Exam,
  ExamAttempt,
  ExamResult,
  Question,
  PracticeResult,
  StudentPerformanceReport,
  PeerComparison,
  PendingGrade,
  StudentReport,
  CourseReport,
  ExamAnalytics,
  InstitutionOverview,
  ReportFormat,
} from '@/types/exam';

// =============================================================================
// Exam CRUD
// =============================================================================

export async function getExams(params?: {
  course_id?: number;
  status?: string;
  page?: number;
  per_page?: number;
}) {
  const response = await api.get('/exams', { params });
  return response.data;
}

export async function getExam(examId: number) {
  const response = await api.get(`/exams/${examId}`);
  return response.data.data.exam as Exam;
}

export async function createExam(data: Partial<Exam>) {
  const response = await api.post('/exams', data);
  return response.data.data.exam as Exam;
}

export async function updateExam(examId: number, data: Partial<Exam>) {
  const response = await api.put(`/exams/${examId}`, data);
  return response.data.data.exam as Exam;
}

export async function deleteExam(examId: number) {
  await api.delete(`/exams/${examId}`);
}

export async function publishExam(examId: number) {
  const response = await api.post(`/exams/${examId}/publish`);
  return response.data.data.exam as Exam;
}

// =============================================================================
// Questions
// =============================================================================

export async function getExamQuestions(examId: number) {
  const response = await api.get(`/exams/${examId}/questions`);
  return response.data.data.questions as Question[];
}

export async function addQuestion(examId: number, data: Partial<Question>) {
  const response = await api.post(`/exams/${examId}/questions`, data);
  return response.data.data.question as Question;
}

export async function updateQuestion(examId: number, questionId: number, data: Partial<Question>) {
  const response = await api.put(`/exams/${examId}/questions/${questionId}`, data);
  return response.data.data.question as Question;
}

export async function deleteQuestion(examId: number, questionId: number) {
  await api.delete(`/exams/${examId}/questions/${questionId}`);
}

// =============================================================================
// Exam Attempts
// =============================================================================

export async function startExam(examId: number): Promise<{
  attempt: ExamAttempt;
  questions: Question[];
}> {
  const response = await api.post(`/exams/${examId}/start`);
  return response.data.data;
}

export async function submitAnswer(
  examId: number,
  attemptId: number,
  questionId: number,
  answer: any,
  timeSpent?: number
) {
  const response = await api.post(`/exams/${examId}/attempts/${attemptId}/answer`, {
    question_id: questionId,
    answer,
    time_spent_seconds: timeSpent,
  });
  return response.data;
}

export async function submitExam(examId: number, attemptId: number) {
  const response = await api.post(`/exams/${examId}/attempts/${attemptId}/submit`);
  return response.data.data.result as ExamResult;
}

export async function getExamResult(examId: number, attemptId: number) {
  const response = await api.get(`/exams/${examId}/attempts/${attemptId}/result`);
  return response.data.data.result as ExamResult;
}

export async function getMyAttempts(examId?: number) {
  const url = examId ? `/exams/${examId}/my-attempts` : '/exams/my-attempts';
  const response = await api.get(url);
  return response.data.data.attempts as ExamAttempt[];
}

// =============================================================================
// Practice Mode
// =============================================================================

export async function practiceQuestion(data: {
  question_id: number;
  answer: any;
  time_spent_seconds?: number;
  hint_used?: boolean;
}): Promise<PracticeResult> {
  const response = await api.post('/exams/practice', data);
  return response.data.data;
}

export async function practiceBulk(
  answers: Array<{
    question_id: number;
    answer: any;
    time_spent_seconds?: number;
    hint_used?: boolean;
  }>
): Promise<{
  results: Array<{
    question_id: number;
    is_correct: boolean;
    points_earned: number;
    feedback?: string;
    error?: string;
  }>;
  summary: {
    total_questions: number;
    correct_count: number;
    total_points: number;
    success_rate: number;
  };
}> {
  const response = await api.post('/exams/practice/bulk', { answers });
  return response.data.data;
}

// =============================================================================
// Performance & Analytics
// =============================================================================

export async function getMyPerformance(params?: {
  course_id?: number;
  days?: number;
}): Promise<StudentPerformanceReport> {
  const response = await api.get('/exams/my-performance', { params });
  return response.data.data.performance;
}

export async function getPeerComparison(courseId: number): Promise<PeerComparison> {
  const response = await api.get('/exams/my-performance/comparison', {
    params: { course_id: courseId },
  });
  return response.data.data.comparison;
}

export async function getRecommendedQuestions(params?: {
  course_id?: number;
  limit?: number;
}): Promise<Question[]> {
  const response = await api.get('/exams/recommended-questions', { params });
  return response.data.data.questions;
}

export async function getExamAnalytics(examId: number): Promise<ExamAnalytics> {
  const response = await api.get(`/exams/${examId}/analytics`);
  return response.data.data.analytics;
}

export async function getQuestionAnalytics(questionId: number) {
  const response = await api.get(`/exams/questions/${questionId}/analytics`);
  return response.data.data.analytics;
}

// =============================================================================
// Manual Grading
// =============================================================================

export async function getPendingGrades(params?: {
  course_id?: number;
  limit?: number;
}): Promise<PendingGrade[]> {
  const response = await api.get('/exams/pending-grades', { params });
  return response.data.data.pending_grades;
}

export async function manualGradeQuestion(
  attemptId: number,
  points: number,
  feedback?: string
) {
  const response = await api.post(`/exams/attempts/${attemptId}/manual-grade`, {
    points,
    feedback,
  });
  return response.data.data.attempt;
}

// =============================================================================
// Reports
// =============================================================================

export async function getStudentReport(
  studentId: number,
  params?: { course_id?: number; days?: number }
): Promise<StudentReport> {
  const response = await api.get(`/exams/reports/student/${studentId}`, { params });
  return response.data.data.report;
}

export async function getCourseReport(
  courseId: number,
  params?: { days?: number }
): Promise<CourseReport> {
  const response = await api.get(`/exams/reports/course/${courseId}`, { params });
  return response.data.data.report;
}

export async function getInstitutionReport(params?: {
  days?: number;
}): Promise<InstitutionOverview> {
  const response = await api.get('/exams/reports/institution', { params });
  return response.data.data.report;
}

export async function exportReport(
  reportType: 'student' | 'course' | 'institution',
  reportId: number | null,
  format: ReportFormat
): Promise<Blob> {
  const response = await api.post(
    '/exams/reports/export',
    {
      report_type: reportType,
      report_id: reportId,
      format,
    },
    {
      responseType: 'blob',
    }
  );
  return response.data;
}

// =============================================================================
// Teacher Grading
// =============================================================================

export async function getExamSubmissions(examId: number) {
  const response = await api.get(`/exams/${examId}/submissions`);
  return response.data.data.submissions;
}

export async function gradeAttempt(
  attemptId: number,
  grades: Array<{
    question_id: number;
    points: number;
    feedback?: string;
  }>
) {
  const response = await api.post(`/exams/attempts/${attemptId}/grade`, { grades });
  return response.data.data.result;
}
