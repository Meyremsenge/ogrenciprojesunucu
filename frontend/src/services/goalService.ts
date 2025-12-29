/**
 * Goal Service - Hedef Yönetimi API
 * 
 * Öğrenci hedeflerinin yönetimi için API çağrıları.
 */

import api from './api';

// Types
export interface Goal {
  id: number;
  title: string;
  description?: string;
  goal_type: 'quiz' | 'course' | 'video' | 'lesson' | 'custom';
  status: 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
  target_id?: number;
  target_type?: string;
  student_id: number;
  organization_id?: number;
  created_by?: number;
  due_date?: string;
  completed_at?: string;
  target_score: number;
  achieved_score?: number;
  progress: number;
  grade_level?: string;
  created_at: string;
  updated_at?: string;
}

export interface GoalStatistics {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  expired: number;
  upcoming_deadline: number;
  completion_rate: number;
}

export interface GoalListResponse {
  success: boolean;
  data: {
    items: Goal[];
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

export interface AssignGoalsRequest {
  exam_id: number;
  exam_title: string;
  grade_level?: string;
  organization_id?: number;
  due_date?: string;
  target_score?: number;
}

// API Functions

/**
 * Kendi hedeflerimi getir
 */
export async function getMyGoals(params?: {
  status?: string;
  goal_type?: string;
}): Promise<{ goals: Goal[]; count: number }> {
  const response = await api.get('/goals/my', { params });
  return response.data.data;
}

/**
 * Hedef istatistiklerimi getir
 */
export async function getMyGoalStatistics(): Promise<GoalStatistics> {
  const response = await api.get('/goals/my/statistics');
  return response.data.data;
}

/**
 * Tüm hedefleri listele (öğretmen/admin)
 */
export async function listGoals(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  goal_type?: string;
  student_id?: number;
}): Promise<GoalListResponse['data']> {
  const response = await api.get('/goals', { params });
  return response.data.data;
}

/**
 * Hedef detayı
 */
export async function getGoal(goalId: number): Promise<Goal> {
  const response = await api.get(`/goals/${goalId}`);
  return response.data.data.goal;
}

/**
 * Hedef ilerlemesi güncelle
 */
export async function updateGoalProgress(
  goalId: number,
  data: { progress?: number; achieved_score?: number }
): Promise<Goal> {
  const response = await api.put(`/goals/${goalId}/progress`, data);
  return response.data.data.goal;
}

/**
 * Quiz'i öğrencilere hedef olarak ata
 */
export async function assignExamGoals(data: AssignGoalsRequest): Promise<{
  assigned_count: number;
  goal_ids: number[];
}> {
  const response = await api.post('/goals/assign-exam', data);
  return response.data.data;
}

/**
 * Hedef sil
 */
export async function deleteGoal(goalId: number): Promise<void> {
  await api.delete(`/goals/${goalId}`);
}

// Helper functions

export const GOAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  expired: 'Süresi Dolmuş',
  cancelled: 'İptal Edildi',
};

export const GOAL_TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  course: 'Kurs',
  video: 'Video',
  lesson: 'Ders',
  custom: 'Özel',
};

export const getGoalStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getGoalTypeIcon = (type: string): string => {
  switch (type) {
    case 'quiz':
      return '📝';
    case 'course':
      return '📚';
    case 'video':
      return '🎬';
    case 'lesson':
      return '📖';
    default:
      return '🎯';
  }
};
