/**
 * Content Service
 * 
 * Video ve Doküman yönetimi API servisleri.
 * Backend: app/modules/contents/routes.py
 */

import api from './api';

// =============================================================================
// TYPES
// =============================================================================

export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived' | 'rejected';

export type RejectionReason = 
  | 'low_quality' 
  | 'inappropriate_content' 
  | 'copyright_issue' 
  | 'incorrect_information' 
  | 'duplicate_content' 
  | 'other';

export interface Video {
  id: number;
  title: string;
  description: string | null;
  video_id: string | null;  // YouTube video ID
  video_url: string | null;
  thumbnail_url: string | null;
  duration: number;
  duration_formatted: string;
  topic_id: number;
  topic_title?: string;
  course_id?: number;
  course_title?: string;
  uploaded_by: number;
  teacher_name?: string;
  status: ContentStatus;
  content_status?: ContentStatus;
  view_count: number;
  is_free: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  approval?: ContentApproval;
}

export interface Document {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number;
  topic_id: number;
  topic_title?: string;
  uploaded_by: number;
  teacher_name?: string;
  status: ContentStatus;
  content_status?: ContentStatus;
  view_count: number;
  download_count: number;
  is_free: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  approval?: ContentApproval;
}

export interface ContentApproval {
  id: number;
  content_type: 'video' | 'document';
  content_id: number;
  status: ContentStatus;
  submitted_by: number;
  submitted_at: string;
  reviewed_by?: number;
  reviewed_at?: string;
  notes?: string;
  rejection_reason?: RejectionReason;
  rejection_details?: string;
}

export interface ContentVersion {
  id: number;
  content_type: 'video' | 'document';
  content_id: number;
  version_number: number;
  data: Record<string, any>;
  change_summary?: string;
  created_by: number;
  created_at: string;
}

export interface VideoCreateData {
  title: string;
  description?: string;
  video_url: string;
  is_free?: boolean;
}

export interface VideoUpdateData {
  title?: string;
  description?: string;
  video_url?: string;
  is_free?: boolean;
  order?: number;
  change_summary?: string;
}

export interface DocumentCreateData {
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  is_free?: boolean;
}

export interface DocumentUpdateData {
  title?: string;
  description?: string;
  file_url?: string;
  is_free?: boolean;
  order?: number;
  change_summary?: string;
}

export interface ApprovalData {
  notes?: string;
  auto_publish?: boolean;
}

export interface RejectionData {
  reason: RejectionReason;
  details?: string;
}

export interface ContentFilters {
  page?: number;
  per_page?: number;
  topic_id?: number;
  content_status?: ContentStatus;
  status?: ContentStatus | string;
  search?: string;
  include_drafts?: boolean;
}

export interface WatchSession {
  session_id: string;
  video_id: number;
  current_position: number;
  total_watched: number;
  is_completed: boolean;
}

export interface VideoAnalytics {
  total_views: number;
  unique_viewers: number;
  average_watch_time: number;
  completion_rate: number;
  engagement_score: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

// =============================================================================
// VIDEO API FUNCTIONS
// =============================================================================

/**
 * Video listesi
 */
export const getVideos = async (params?: ContentFilters): Promise<PaginatedResponse<Video>> => {
  const response = await api.get('/contents/videos', { params });
  return response.data.data;
};

/**
 * Kendi videolarım
 */
export const getMyVideos = async (params?: ContentFilters): Promise<PaginatedResponse<Video>> => {
  const response = await api.get('/contents/videos/my', { params });
  return response.data.data;
};

/**
 * Video detayı
 */
export const getVideo = async (videoId: number): Promise<Video> => {
  const response = await api.get(`/contents/videos/${videoId}`);
  return response.data.data.video;
};

/**
 * Yeni video ekle
 */
export const createVideo = async (topicId: number, data: VideoCreateData): Promise<Video> => {
  const response = await api.post(`/contents/topics/${topicId}/videos`, data);
  return response.data.data.video;
};

/**
 * Video güncelle
 */
export const updateVideo = async (videoId: number, data: VideoUpdateData): Promise<Video> => {
  const response = await api.put(`/contents/videos/${videoId}`, data);
  return response.data.data.video;
};

/**
 * Video sil (soft delete)
 */
export const deleteVideo = async (videoId: number): Promise<void> => {
  await api.delete(`/contents/videos/${videoId}`);
};

/**
 * Silinmiş videoyu geri yükle
 */
export const restoreVideo = async (videoId: number): Promise<Video> => {
  const response = await api.post(`/contents/videos/${videoId}/restore`);
  return response.data.data.video;
};

// =============================================================================
// VIDEO APPROVAL API FUNCTIONS
// =============================================================================

/**
 * Videoyu onaya gönder
 */
export const submitVideoForReview = async (videoId: number): Promise<ContentApproval> => {
  const response = await api.post(`/contents/videos/${videoId}/submit`);
  return response.data.data.approval;
};

/**
 * Videoyu onayla (Admin)
 */
export const approveVideo = async (videoId: number, data?: ApprovalData): Promise<ContentApproval> => {
  const response = await api.post(`/contents/videos/${videoId}/approve`, data || {});
  return response.data.data.approval;
};

/**
 * Videoyu reddet (Admin)
 */
export const rejectVideo = async (videoId: number, data: RejectionData): Promise<ContentApproval> => {
  const response = await api.post(`/contents/videos/${videoId}/reject`, data);
  return response.data.data.approval;
};

/**
 * Videoyu yayınla
 */
export const publishVideo = async (videoId: number): Promise<ContentApproval> => {
  const response = await api.post(`/contents/videos/${videoId}/publish`);
  return response.data.data.approval;
};

/**
 * Videoyu arşivle
 */
export const archiveVideo = async (videoId: number): Promise<ContentApproval> => {
  const response = await api.post(`/contents/videos/${videoId}/archive`);
  return response.data.data.approval;
};

// =============================================================================
// VIDEO VERSION API FUNCTIONS
// =============================================================================

/**
 * Video versiyonları
 */
export const getVideoVersions = async (videoId: number, params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<ContentVersion>> => {
  const response = await api.get(`/contents/videos/${videoId}/versions`, { params });
  return response.data.data;
};

/**
 * Eski video versiyonunu geri yükle
 */
export const restoreVideoVersion = async (videoId: number, versionId: number): Promise<ContentVersion> => {
  const response = await api.post(`/contents/videos/${videoId}/versions/${versionId}/restore`);
  return response.data.data.version;
};

// =============================================================================
// DOCUMENT API FUNCTIONS
// =============================================================================

/**
 * Doküman listesi
 */
export const getDocuments = async (params?: ContentFilters): Promise<PaginatedResponse<Document>> => {
  const response = await api.get('/contents/documents', { params });
  return response.data.data;
};

/**
 * Kendi dokümanlarım
 */
export const getMyDocuments = async (params?: ContentFilters): Promise<PaginatedResponse<Document>> => {
  const response = await api.get('/contents/documents/my', { params });
  return response.data.data;
};

/**
 * Doküman detayı
 */
export const getDocument = async (documentId: number): Promise<Document> => {
  const response = await api.get(`/contents/documents/${documentId}`);
  return response.data.data.document;
};

/**
 * Yeni doküman ekle
 */
export const createDocument = async (topicId: number, data: DocumentCreateData): Promise<Document> => {
  const response = await api.post(`/contents/topics/${topicId}/documents`, data);
  return response.data.data.document;
};

/**
 * Doküman güncelle
 */
export const updateDocument = async (documentId: number, data: DocumentUpdateData): Promise<Document> => {
  const response = await api.put(`/contents/documents/${documentId}`, data);
  return response.data.data.document;
};

/**
 * Doküman sil (soft delete)
 */
export const deleteDocument = async (documentId: number): Promise<void> => {
  await api.delete(`/contents/documents/${documentId}`);
};

/**
 * Silinmiş dokümanı geri yükle
 */
export const restoreDocument = async (documentId: number): Promise<Document> => {
  const response = await api.post(`/contents/documents/${documentId}/restore`);
  return response.data.data.document;
};

/**
 * Doküman indirme linki al
 */
export const downloadDocument = async (documentId: number): Promise<string> => {
  const response = await api.get(`/contents/documents/${documentId}/download`);
  return response.data.data.download_url;
};

// =============================================================================
// DOCUMENT APPROVAL API FUNCTIONS
// =============================================================================

/**
 * Dokümanı onaya gönder
 */
export const submitDocumentForReview = async (documentId: number): Promise<ContentApproval> => {
  const response = await api.post(`/contents/documents/${documentId}/submit`);
  return response.data.data.approval;
};

/**
 * Dokümanı onayla (Admin)
 */
export const approveDocument = async (documentId: number, data?: ApprovalData): Promise<ContentApproval> => {
  const response = await api.post(`/contents/documents/${documentId}/approve`, data || {});
  return response.data.data.approval;
};

/**
 * Dokümanı reddet (Admin)
 */
export const rejectDocument = async (documentId: number, data: RejectionData): Promise<ContentApproval> => {
  const response = await api.post(`/contents/documents/${documentId}/reject`, data);
  return response.data.data.approval;
};

/**
 * Dokümanı yayınla
 */
export const publishDocument = async (documentId: number): Promise<ContentApproval> => {
  const response = await api.post(`/contents/documents/${documentId}/publish`);
  return response.data.data.approval;
};

/**
 * Dokümanı arşivle
 */
export const archiveDocument = async (documentId: number): Promise<ContentApproval> => {
  const response = await api.post(`/contents/documents/${documentId}/archive`);
  return response.data.data.approval;
};

// =============================================================================
// DOCUMENT VERSION API FUNCTIONS
// =============================================================================

/**
 * Doküman versiyonları
 */
export const getDocumentVersions = async (documentId: number, params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<ContentVersion>> => {
  const response = await api.get(`/contents/documents/${documentId}/versions`, { params });
  return response.data.data;
};

/**
 * Eski doküman versiyonunu geri yükle
 */
export const restoreDocumentVersion = async (documentId: number, versionId: number): Promise<ContentVersion> => {
  const response = await api.post(`/contents/documents/${documentId}/versions/${versionId}/restore`);
  return response.data.data.version;
};

// =============================================================================
// ADMIN CONTENT MANAGEMENT API FUNCTIONS
// =============================================================================

/**
 * Onay bekleyen tüm içerikler
 */
export const getPendingReviews = async (contentType?: 'video' | 'document'): Promise<{
  videos: Video[];
  documents: Document[];
  total_count: number;
}> => {
  const params = contentType ? { content_type: contentType } : {};
  const response = await api.get('/contents/admin/pending-reviews', { params });
  return response.data.data;
};

/**
 * İki versiyon arasındaki farkları göster
 */
export const compareVersions = async (versionId1: number, versionId2: number): Promise<{
  version1: ContentVersion;
  version2: ContentVersion;
  differences: Record<string, { old: any; new: any }>;
}> => {
  const response = await api.post('/contents/admin/versions/compare', {
    version_id_1: versionId1,
    version_id_2: versionId2,
  });
  return response.data.data.comparison;
};

// =============================================================================
// VIDEO EMBED & ANALYTICS API FUNCTIONS
// =============================================================================

/**
 * Video için güvenli embed URL'si al
 */
export const getVideoEmbedUrl = async (videoId: number, options?: { autoplay?: boolean; start?: number }): Promise<{
  embed_url: string;
  signed_url: string;
  youtube_video_id: string;
  duration: number;
  duration_formatted: string;
}> => {
  const params = {
    autoplay: options?.autoplay ? 'true' : 'false',
    start: options?.start || 0,
  };
  const response = await api.get(`/contents/videos/${videoId}/embed-url`, { params });
  return response.data.data;
};

/**
 * Video izleme oturumu başlat
 */
export const startVideoWatch = async (videoId: number): Promise<WatchSession> => {
  const response = await api.post(`/contents/videos/${videoId}/watch/start`);
  return response.data.data;
};

/**
 * Video izleme oturumunu güncelle
 */
export const updateVideoWatch = async (sessionId: string, data: {
  position: number;
  event_type?: 'play' | 'pause' | 'seek' | 'progress' | 'ended' | 'buffer';
  extra_data?: Record<string, any>;
}): Promise<WatchSession> => {
  const response = await api.post(`/contents/videos/watch/${sessionId}/update`, data);
  return response.data.data;
};

/**
 * Video izleme oturumunu sonlandır
 */
export const endVideoWatch = async (sessionId: string): Promise<{
  video_id: number;
  total_watched: number;
  is_completed: boolean;
}> => {
  const response = await api.post(`/contents/videos/watch/${sessionId}/end`);
  return response.data.data;
};

/**
 * Video analytics verilerini al
 */
export const getVideoAnalytics = async (videoId: number): Promise<VideoAnalytics> => {
  const response = await api.get(`/contents/videos/${videoId}/analytics`);
  return response.data.data.analytics;
};

/**
 * YouTube'dan video metadata'sını senkronize et
 */
export const syncVideoMetadata = async (videoId: number): Promise<Video> => {
  const response = await api.post(`/contents/videos/${videoId}/sync-metadata`);
  return response.data.data.video;
};

/**
 * YouTube video URL'sini doğrula
 */
export const validateYouTubeVideo = async (url: string): Promise<{
  valid: boolean;
  video_id: string;
  video_info: {
    title: string;
    description: string;
    duration: number;
    thumbnail_url: string;
  };
}> => {
  const response = await api.post('/contents/videos/validate-youtube', { url });
  return response.data.data;
};

/**
 * YouTube playlist'ini topic'e import et
 */
export const importYouTubePlaylist = async (topicId: number, playlistUrl: string): Promise<{
  imported_count: number;
  videos: Video[];
}> => {
  const response = await api.post(`/contents/topics/${topicId}/import-playlist`, { url: playlistUrl });
  return response.data.data;
};

// =============================================================================
// WATCH HISTORY & PROGRESS API FUNCTIONS
// =============================================================================

/**
 * İzleme geçmişi
 */
export const getWatchHistory = async (limit?: number): Promise<Array<{
  video_id: number;
  video_title: string;
  last_position: number;
  watched_at: string;
}>> => {
  const response = await api.get('/contents/my/watch-history', { params: { limit } });
  return response.data.data.history;
};

/**
 * Popüler videolar
 */
export const getPopularVideos = async (period?: 'daily' | 'weekly' | 'monthly', limit?: number): Promise<Array<{
  video_id: number;
  title: string;
  view_count: number;
  thumbnail_url: string;
}>> => {
  const response = await api.get('/contents/popular-videos', { params: { period, limit } });
  return response.data.data.videos;
};

/**
 * İlerleme durumu
 */
export const getMyProgress = async (courseId?: number): Promise<{
  total_videos: number;
  watched_videos: number;
  total_documents: number;
  read_documents: number;
  overall_progress: number;
}> => {
  const params = courseId ? { course_id: courseId } : {};
  const response = await api.get('/contents/progress', { params });
  return response.data.data.progress;
};

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  // Videos
  getVideos,
  getMyVideos,
  getVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  restoreVideo,
  
  // Video Approval
  submitVideoForReview,
  approveVideo,
  rejectVideo,
  publishVideo,
  archiveVideo,
  
  // Video Versions
  getVideoVersions,
  restoreVideoVersion,
  
  // Documents
  getDocuments,
  getMyDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  restoreDocument,
  downloadDocument,
  
  // Document Approval
  submitDocumentForReview,
  approveDocument,
  rejectDocument,
  publishDocument,
  archiveDocument,
  
  // Document Versions
  getDocumentVersions,
  restoreDocumentVersion,
  
  // Admin
  getPendingReviews,
  compareVersions,
  
  // Video Embed & Analytics
  getVideoEmbedUrl,
  startVideoWatch,
  updateVideoWatch,
  endVideoWatch,
  getVideoAnalytics,
  syncVideoMetadata,
  validateYouTubeVideo,
  importYouTubePlaylist,
  
  // Watch History & Progress
  getWatchHistory,
  getPopularVideos,
  getMyProgress,
};
