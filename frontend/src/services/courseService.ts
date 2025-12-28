/**
 * Course Service
 * 
 * Kurs yönetimi API servisleri.
 * Backend: app/modules/courses/routes.py
 */

import api from './api';

// =============================================================================
// TYPES
// =============================================================================

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  status: 'draft' | 'published' | 'archived';
  level: 'beginner' | 'intermediate' | 'advanced';
  teacher_id: number;
  teacher_name: string;
  total_duration: number;
  total_lessons: number;
  lesson_count: number;
  enrollment_count: number;
  average_rating: number;
  rating_count: number;
  is_published: boolean;
  is_enrolled?: boolean;
  published_at: string | null;
  created_at: string;
  updated_at?: string;
  learning_objectives?: string[];
  requirements?: string[];
}

export interface Topic {
  id: number;
  title: string;
  description: string | null;
  order: number;
  course_id: number;
  is_free: boolean;
  is_published: boolean;
  lesson_count?: number;
  created_at: string;
}

export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  course?: Course;
  status: 'active' | 'completed' | 'dropped';
  progress_percentage: number;
  completed_lessons: number;
  last_accessed_at: string | null;
  completed_at: string | null;
  certificate_issued: boolean;
  created_at: string;
}

export interface CourseCreateData {
  title: string;
  description?: string;
  short_description?: string;
  thumbnail_url?: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string;
}

export interface CourseUpdateData {
  title?: string;
  description?: string;
  short_description?: string;
  thumbnail_url?: string;
  category?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string;
}

export interface TopicCreateData {
  title: string;
  description?: string;
  is_free?: boolean;
}

export interface CourseFilters {
  page?: number;
  per_page?: number;
  category?: string;
  level?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

// =============================================================================
// COURSE API FUNCTIONS
// =============================================================================

/**
 * Kurs listesi (public)
 */
export const getCourses = async (params?: CourseFilters): Promise<PaginatedResponse<Course>> => {
  const response = await api.get('/courses', { params });
  return response.data.data;
};

/**
 * Kurs detayı
 */
export const getCourse = async (courseId: number): Promise<Course> => {
  const response = await api.get(`/courses/${courseId}`);
  return response.data.data.course;
};

/**
 * Yeni kurs oluştur (Teacher/Admin)
 */
export const createCourse = async (data: CourseCreateData): Promise<Course> => {
  const response = await api.post('/courses', data);
  return response.data.data.course;
};

/**
 * Kurs güncelle
 */
export const updateCourse = async (courseId: number, data: CourseUpdateData): Promise<Course> => {
  const response = await api.put(`/courses/${courseId}`, data);
  return response.data.data.course;
};

/**
 * Kurs sil (Admin only)
 */
export const deleteCourse = async (courseId: number): Promise<void> => {
  await api.delete(`/courses/${courseId}`);
};

/**
 * Kursu yayınla
 */
export const publishCourse = async (courseId: number): Promise<Course> => {
  const response = await api.post(`/courses/${courseId}/publish`);
  return response.data.data.course;
};

// =============================================================================
// TOPIC API FUNCTIONS
// =============================================================================

/**
 * Kursun konularını listele
 */
export const getTopics = async (courseId: number): Promise<Topic[]> => {
  const response = await api.get(`/courses/${courseId}/topics`);
  return response.data.data.topics;
};

/**
 * Kursa yeni konu ekle
 */
export const createTopic = async (courseId: number, data: TopicCreateData): Promise<Topic> => {
  const response = await api.post(`/courses/${courseId}/topics`, data);
  return response.data.data.topic;
};

// =============================================================================
// ENROLLMENT API FUNCTIONS
// =============================================================================

/**
 * Kursa kayıt ol
 */
export const enrollCourse = async (courseId: number): Promise<Enrollment> => {
  const response = await api.post(`/courses/${courseId}/enroll`);
  return response.data.data.enrollment;
};

/**
 * Kurs kaydını iptal et
 */
export const unenrollCourse = async (courseId: number): Promise<void> => {
  await api.post(`/courses/${courseId}/unenroll`);
};

/**
 * Kayıtlı olduğum kurslar
 */
export const getMyCourses = async (params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<Enrollment>> => {
  const response = await api.get('/courses/my-courses', { params });
  return response.data.data;
};

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  // Courses
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  
  // Topics
  getTopics,
  createTopic,
  
  // Enrollments
  enrollCourse,
  unenrollCourse,
  getMyCourses,
};
