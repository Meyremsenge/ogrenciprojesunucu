/**
 * Video API Service
 * 
 * Video işlemleri için API çağrıları.
 */

import { api } from './axios';
import { ApiResponse } from '../../types/api';

// ============================================================================
// Types
// ============================================================================

export interface EmbedUrlResponse {
  embed_url: string;
  signed_url: string;
  youtube_video_id: string;
  duration: number;
  duration_formatted: string;
}

export interface WatchSessionResponse {
  session_id: string;
  video_id: number;
  message: string;
}

export interface WatchSessionUpdateResponse {
  session_id: string;
  current_position: number;
  total_watched: number;
  is_completed: boolean;
}

export interface VideoAnalytics {
  total_views: number;
  unique_views: number;
  daily_views: Record<string, number>;
  hourly_distribution: Record<string, number>;
  average_watch_time: number;
  completion_rate: number;
}

export interface WatchHistoryItem {
  video_id: number;
  title: string;
  watched_at: string;
  watch_percentage: number;
  duration: number;
}

export interface YouTubeValidationResult {
  valid: boolean;
  video_id: string;
  video_info: {
    title: string;
    description: string;
    channel_title: string;
    duration: number;
    duration_formatted: string;
    thumbnail_url: string;
    view_count: number;
    published_at: string;
  };
}

export interface PlaylistImportResult {
  imported_count: number;
  videos: Array<{
    id: number;
    title: string;
    video_id: string;
    duration: number;
  }>;
}

// ============================================================================
// API Functions
// ============================================================================

export const videoApi = {
  /**
   * Video için güvenli embed URL al
   */
  getEmbedUrl: async (
    videoId: number,
    options: { autoplay?: boolean; start?: number } = {}
  ): Promise<ApiResponse<EmbedUrlResponse>> => {
    const params = new URLSearchParams();
    if (options.autoplay) params.append('autoplay', 'true');
    if (options.start) params.append('start', String(options.start));

    const response = await api.get<ApiResponse<EmbedUrlResponse>>(
      `/contents/videos/${videoId}/embed-url?${params.toString()}`
    );
    return response.data;
  },

  /**
   * İzleme oturumu başlat
   */
  startWatchSession: async (
    videoId: number
  ): Promise<ApiResponse<WatchSessionResponse>> => {
    const response = await api.post<ApiResponse<WatchSessionResponse>>(
      `/contents/videos/${videoId}/watch/start`
    );
    return response.data;
  },

  /**
   * İzleme oturumu güncelle
   */
  updateWatchSession: async (
    sessionId: string,
    data: {
      position: number;
      event_type: string;
      extra_data?: any;
    }
  ): Promise<ApiResponse<WatchSessionUpdateResponse>> => {
    const response = await api.post<ApiResponse<WatchSessionUpdateResponse>>(
      `/contents/videos/watch/${sessionId}/update`,
      data
    );
    return response.data;
  },

  /**
   * İzleme oturumu sonlandır
   */
  endWatchSession: async (
    sessionId: string
  ): Promise<ApiResponse<void>> => {
    const response = await api.post<ApiResponse<void>>(
      `/contents/videos/watch/${sessionId}/end`
    );
    return response.data;
  },

  /**
   * Video analytics verilerini al
   */
  getVideoAnalytics: async (
    videoId: number
  ): Promise<ApiResponse<{ video_id: number; title: string; analytics: VideoAnalytics }>> => {
    const response = await api.get<ApiResponse<{ video_id: number; title: string; analytics: VideoAnalytics }>>(
      `/contents/videos/${videoId}/analytics`
    );
    return response.data;
  },

  /**
   * YouTube video URL'sini doğrula
   */
  validateYouTubeUrl: async (
    url: string
  ): Promise<ApiResponse<YouTubeValidationResult>> => {
    const response = await api.post<ApiResponse<YouTubeValidationResult>>(
      '/contents/videos/validate-youtube',
      { url }
    );
    return response.data;
  },

  /**
   * Video metadata'sını YouTube'dan senkronize et
   */
  syncVideoMetadata: async (
    videoId: number
  ): Promise<ApiResponse<{ video: any }>> => {
    const response = await api.post<ApiResponse<{ video: any }>>(
      `/contents/videos/${videoId}/sync-metadata`
    );
    return response.data;
  },

  /**
   * YouTube playlist'ini topic'e import et
   */
  importPlaylist: async (
    topicId: number,
    playlistUrl: string
  ): Promise<ApiResponse<PlaylistImportResult>> => {
    const response = await api.post<ApiResponse<PlaylistImportResult>>(
      `/contents/topics/${topicId}/import-playlist`,
      { url: playlistUrl }
    );
    return response.data;
  },

  /**
   * Kullanıcının izleme geçmişini al
   */
  getWatchHistory: async (
    limit: number = 20
  ): Promise<ApiResponse<{ history: WatchHistoryItem[] }>> => {
    const response = await api.get<ApiResponse<{ history: WatchHistoryItem[] }>>(
      `/contents/my/watch-history?limit=${limit}`
    );
    return response.data;
  },

  /**
   * Popüler videoları al
   */
  getPopularVideos: async (
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    limit: number = 10
  ): Promise<ApiResponse<{ videos: Array<{ video_id: number; views: number }> }>> => {
    const response = await api.get<ApiResponse<{ videos: Array<{ video_id: number; views: number }> }>>(
      `/contents/popular-videos?period=${period}&limit=${limit}`
    );
    return response.data;
  }
};

export default videoApi;
