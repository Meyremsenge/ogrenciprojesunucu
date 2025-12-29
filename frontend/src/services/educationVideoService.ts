/**
 * Education Video Service
 * YouTube tabanlı eğitim videoları API servisi
 */

import api from './api';

// =============================================================================
// Types
// =============================================================================

export type GradeLevel = 
  | 'grade_1' | 'grade_2' | 'grade_3' | 'grade_4'  // İlkokul
  | 'grade_5' | 'grade_6' | 'grade_7' | 'grade_8'  // Ortaokul
  | 'grade_9' | 'grade_10' | 'grade_11' | 'grade_12'  // Lise
  | 'graduate';  // Mezun

export type EducationLevel = 'primary' | 'middle' | 'high' | 'graduate';

export type Subject = 
  | 'turkish' | 'mathematics' | 'science' | 'social_studies' | 'english'
  | 'physics' | 'chemistry' | 'biology' | 'history' | 'geography'
  | 'philosophy' | 'religious_culture' | 'literature' | 'geometry' | 'other';

export type VideoOwnerType = 'system' | 'teacher';

export interface EducationVideo {
  id: number;
  title: string;
  description?: string;
  youtube_url: string;
  youtube_id: string;
  thumbnail_url: string;
  embed_url: string;
  duration_seconds: number;
  duration_formatted: string;
  grade_level: GradeLevel;
  grade_display: string;
  education_level: EducationLevel;
  subject: Subject;
  topic?: string;
  owner_type: VideoOwnerType;
  is_system_video: boolean;
  created_by: number;
  creator_name?: string;
  organization_id?: number;
  is_active: boolean;
  sort_order: number;
  tags: string[];
  view_count?: number;
  like_count?: number;
  created_at: string;
  published_at?: string;
}

export interface VideoWatchProgress {
  id: number;
  user_id: number;
  video_id: number;
  watched_seconds: number;
  last_position: number;
  watch_count: number;
  is_completed: boolean;
  completed_at?: string;
  first_watched_at: string;
  last_watched_at: string;
  video?: EducationVideo;
}

export interface CreateVideoDTO {
  youtube_url: string;
  title: string;
  description?: string;
  grade_level: GradeLevel;
  subject: Subject;
  topic?: string;
  duration_seconds?: number;
  tags?: string[];
}

export interface UpdateVideoDTO {
  title?: string;
  description?: string;
  youtube_url?: string;
  grade_level?: GradeLevel;
  subject?: Subject;
  topic?: string;
  duration_seconds?: number;
  tags?: string[];
  sort_order?: number;
  is_active?: boolean;
}

export interface VideoListParams {
  page?: number;
  per_page?: number;
  grade_level?: GradeLevel;
  education_level?: EducationLevel;
  subject?: Subject;
  owner_type?: VideoOwnerType;
  search?: string;
  organization_id?: number;
}

export interface VideoConstants {
  grade_levels: { value: string; label: string }[];
  education_levels: { value: string; label: string }[];
  subjects: { value: string; label: string }[];
  education_level_grades: Record<string, string[]>;
}

export interface VideoStats {
  total_videos: number;
  system_videos: number;
  teacher_videos: number;
  by_education_level: Record<string, { label: string; count: number }>;
  by_subject: Record<string, { label: string; count: number }>;
}

// =============================================================================
// Label Mappings (Frontend)
// =============================================================================

export const GRADE_LABELS: Record<GradeLevel, string> = {
  grade_1: '1. Sınıf',
  grade_2: '2. Sınıf',
  grade_3: '3. Sınıf',
  grade_4: '4. Sınıf',
  grade_5: '5. Sınıf',
  grade_6: '6. Sınıf',
  grade_7: '7. Sınıf',
  grade_8: '8. Sınıf',
  grade_9: '9. Sınıf',
  grade_10: '10. Sınıf',
  grade_11: '11. Sınıf',
  grade_12: '12. Sınıf',
  graduate: 'Mezun',
};

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  primary: 'İlkokul',
  middle: 'Ortaokul',
  high: 'Lise',
  graduate: 'Mezun',
};

export const SUBJECT_LABELS: Record<Subject, string> = {
  turkish: 'Türkçe',
  mathematics: 'Matematik',
  science: 'Fen Bilimleri',
  social_studies: 'Sosyal Bilgiler',
  english: 'İngilizce',
  physics: 'Fizik',
  chemistry: 'Kimya',
  biology: 'Biyoloji',
  history: 'Tarih',
  geography: 'Coğrafya',
  philosophy: 'Felsefe',
  religious_culture: 'Din Kültürü',
  literature: 'Edebiyat',
  geometry: 'Geometri',
  other: 'Diğer',
};

export const EDUCATION_LEVEL_GRADES: Record<EducationLevel, GradeLevel[]> = {
  primary: ['grade_1', 'grade_2', 'grade_3', 'grade_4'],
  middle: ['grade_5', 'grade_6', 'grade_7', 'grade_8'],
  high: ['grade_9', 'grade_10', 'grade_11', 'grade_12'],
  graduate: ['graduate'],
};

// =============================================================================
// API Functions
// =============================================================================

/**
 * Video sabitleri getir
 */
export async function getVideoConstants(): Promise<VideoConstants> {
  const response = await api.get('/education-videos/constants');
  return response.data.data;
}

/**
 * Videoları listele
 */
export async function getVideos(params?: VideoListParams) {
  const response = await api.get('/education-videos', { params });
  return response.data;
}

/**
 * Sınıf seviyesine göre videoları listele
 */
export async function getVideosByGrade(gradeLevel: GradeLevel, params?: { subject?: Subject; page?: number; per_page?: number }) {
  const response = await api.get(`/education-videos/by-grade/${gradeLevel}`, { params });
  return response.data;
}

/**
 * Eğitim kademesine göre videoları listele
 */
export async function getVideosByEducationLevel(
  educationLevel: EducationLevel, 
  params?: { grade_level?: GradeLevel; subject?: Subject; page?: number; per_page?: number }
) {
  const response = await api.get(`/education-videos/by-education-level/${educationLevel}`, { params });
  return response.data;
}

/**
 * Video detayı getir
 */
export async function getVideo(videoId: number): Promise<EducationVideo> {
  const response = await api.get(`/education-videos/${videoId}`);
  return response.data.data;
}

/**
 * Yeni video ekle
 */
export async function createVideo(data: CreateVideoDTO): Promise<EducationVideo> {
  const response = await api.post('/education-videos', data);
  return response.data.data;
}

/**
 * Video güncelle
 */
export async function updateVideo(videoId: number, data: UpdateVideoDTO): Promise<EducationVideo> {
  const response = await api.put(`/education-videos/${videoId}`, data);
  return response.data.data;
}

/**
 * Video sil
 */
export async function deleteVideo(videoId: number): Promise<void> {
  await api.delete(`/education-videos/${videoId}`);
}

/**
 * İzleme ilerlemesini güncelle
 */
export async function updateWatchProgress(videoId: number, watchedSeconds: number, position?: number) {
  const response = await api.post(`/education-videos/${videoId}/progress`, {
    watched_seconds: watchedSeconds,
    position,
  });
  return response.data;
}

/**
 * Kullanıcının izleme geçmişini getir
 */
export async function getMyWatchProgress(params?: { page?: number; per_page?: number }) {
  const response = await api.get('/education-videos/my-progress', { params });
  return response.data;
}

/**
 * Video istatistikleri (Admin)
 */
export async function getVideoStats(): Promise<VideoStats> {
  const response = await api.get('/education-videos/stats');
  return response.data.data;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * YouTube URL'den video ID'si çıkar
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * YouTube video thumbnail URL'si oluştur
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'mq' | 'hq' | 'maxres' = 'hq'): string {
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    maxres: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * YouTube embed URL'si oluştur
 */
export function getYouTubeEmbedUrl(videoId: string, options?: { 
  autoplay?: boolean; 
  rel?: boolean;
  modestbranding?: boolean;
  start?: number;
}): string {
  const params = new URLSearchParams();
  
  if (options?.autoplay) params.set('autoplay', '1');
  if (options?.rel === false) params.set('rel', '0');
  if (options?.modestbranding !== false) params.set('modestbranding', '1');
  if (options?.start) params.set('start', String(options.start));
  
  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? '?' + queryString : ''}`;
}

/**
 * Süreyi formatla (saniye -> MM:SS veya HH:MM:SS)
 */
export function formatDuration(seconds: number): string {
  if (!seconds) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default {
  getVideoConstants,
  getVideos,
  getVideosByGrade,
  getVideosByEducationLevel,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  updateWatchProgress,
  getMyWatchProgress,
  getVideoStats,
  extractYouTubeId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  formatDuration,
};
