/**
 * Video Service
 * 
 * YouTube video embed ve AI danışman servisi.
 * 
 * ÖNEMLİ MİMARİ KARARLAR:
 * =======================
 * 1. AI video içeriğini ANALİZ ETMEZ
 * 2. AI otomatik ETİKETLEME yapmaz
 * 3. AI otomatik DEĞERLENDİRME yapmaz
 * 4. Tüm AI yanıtları anlık ve geçicidir
 * 
 * YouTube Privacy-Enhanced Mode:
 * - youtube-nocookie.com kullanılır (GDPR uyumluluk)
 * - Reklam takibi devre dışı
 * - 3. taraf çerezleri engellenir
 */

import api from './api';

// ============================================================================
// Types
// ============================================================================

/**
 * Video embed bilgisi
 */
export interface VideoEmbedInfo {
  video_id: number;
  title: string;
  provider: 'youtube' | 'vimeo' | 'local' | 'bunny' | null;
  embed_url: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  duration_formatted: string | null;
  is_free_preview: boolean;
  privacy_notice: string;
}

/**
 * Video AI soru yanıtı
 */
export interface VideoAIAnswer {
  answer: string;
  question: string;
  video_id: number;
  video_title: string;
  timestamp: number | null;
  disclaimer: string;
  is_ai_generated: boolean;
  generated_at: string;
}

/**
 * Video konu açıklaması
 */
export interface VideoExplanation {
  explanation: string;
  video_id: number;
  video_title: string;
  detail_level: 'brief' | 'medium' | 'detailed';
  disclaimer: string;
  is_ai_generated: boolean;
  generated_at: string;
}

/**
 * Video ana noktaları
 */
export interface VideoKeyPoints {
  key_points: string;
  video_id: number;
  video_title: string;
  disclaimer: string;
  is_ai_generated: boolean;
  generated_at: string;
}

/**
 * Video quiz
 */
export interface VideoQuiz {
  quiz: string;
  video_id: number;
  video_title: string;
  question_count: number;
  disclaimer: string;
  is_ai_generated: boolean;
  is_temporary: boolean;
  generated_at: string;
}

/**
 * Tekrar önerisi
 */
export interface ReviewSuggestion {
  type: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  video_ids?: number[];
  video_titles?: string[];
  resume_position?: number;
  videos?: Array<{
    video_id: number;
    title: string;
    watch_ratio: number;
  }>;
}

/**
 * Tekrar önerileri yanıtı
 */
export interface ReviewSuggestionsResponse {
  suggestions: ReviewSuggestion[];
  video_id: number | null;
  topic_id: number | null;
  disclaimer: string;
  generated_at: string;
}

/**
 * Video ilerleme
 */
export interface VideoProgress {
  video_id: number;
  watched_seconds: number;
  last_position: number;
  is_completed: boolean;
  watch_count: number;
  first_watched_at: string;
  last_watched_at: string;
  completed_at: string | null;
}

// ============================================================================
// Video Embed Service
// ============================================================================

/**
 * Video embed bilgilerini al.
 * 
 * YouTube videoları için privacy-enhanced mode (youtube-nocookie.com) kullanılır.
 */
export async function getVideoEmbedInfo(videoId: number): Promise<VideoEmbedInfo> {
  const response = await api.get(`/videos/${videoId}/embed-info`);
  return response.data.data;
}

/**
 * YouTube embed URL oluştur (client-side fallback).
 * 
 * NOT: Mümkünse sunucudan alınan URL kullanılmalı.
 * Bu fonksiyon sadece fallback amaçlıdır.
 */
export function buildYouTubeEmbedUrl(
  youtubeVideoId: string,
  options: {
    autoplay?: boolean;
    startTime?: number;
    privacyMode?: boolean;
  } = {}
): string {
  const { autoplay = false, startTime = 0, privacyMode = true } = options;
  
  // GDPR uyumluluk için privacy-enhanced mode
  const domain = privacyMode ? 'www.youtube-nocookie.com' : 'www.youtube.com';
  
  const params = new URLSearchParams({
    rel: '0',           // İlgili videolar kapalı
    modestbranding: '1', // Minimal YouTube branding
    enablejsapi: '1',   // JavaScript API aktif
    origin: window.location.origin,
  });
  
  if (autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1'); // Autoplay için mute gerekli
  }
  
  if (startTime > 0) {
    params.set('start', String(startTime));
  }
  
  return `https://${domain}/embed/${youtubeVideoId}?${params.toString()}`;
}

// ============================================================================
// Video AI Service
// ============================================================================

/**
 * Video hakkında soru sor.
 * 
 * NOT: AI video içeriğini analiz etmez.
 * Sadece video başlığı ve açıklamasından yanıt verir.
 */
export async function askAboutVideo(
  videoId: number,
  question: string,
  timestamp?: number
): Promise<VideoAIAnswer> {
  const response = await api.post(`/videos/${videoId}/ai/ask`, {
    question,
    timestamp,
  });
  return response.data.data;
}

/**
 * Video konusunu açıkla.
 * 
 * NOT: AI videoyu izlemez, sadece metadata'dan açıklama yapar.
 */
export async function explainVideoTopic(
  videoId: number,
  detailLevel: 'brief' | 'medium' | 'detailed' = 'medium'
): Promise<VideoExplanation> {
  const response = await api.post(`/videos/${videoId}/ai/explain`, {
    detail_level: detailLevel,
  });
  return response.data.data;
}

/**
 * Video'nun ana noktalarını al.
 * 
 * NOT: Bu liste video metadata'sından çıkarılır,
 * video içeriği analiz edilmez.
 */
export async function getVideoKeyPoints(videoId: number): Promise<VideoKeyPoints> {
  const response = await api.get(`/videos/${videoId}/ai/key-points`);
  return response.data.data;
}

/**
 * Video konusu için anlık quiz oluştur.
 * 
 * NOT: Bu quiz kalıcı değildir ve sisteme kaydedilmez.
 * AI video içeriğini analiz etmez.
 */
export async function generateVideoQuiz(
  videoId: number,
  questionCount: number = 3
): Promise<VideoQuiz> {
  const response = await api.post(`/videos/${videoId}/ai/quiz`, {
    question_count: questionCount,
  });
  return response.data.data;
}

// ============================================================================
// Review Suggestions Service
// ============================================================================

/**
 * Belirli video için tekrar önerileri.
 */
export async function getVideoReviewSuggestions(
  videoId: number
): Promise<ReviewSuggestionsResponse> {
  const response = await api.get(`/videos/${videoId}/ai/review-suggestions`);
  return response.data.data;
}

/**
 * Genel tekrar önerileri (tüm izleme geçmişi).
 */
export async function getGeneralReviewSuggestions(
  topicId?: number
): Promise<ReviewSuggestionsResponse> {
  const params = topicId ? { topic_id: topicId } : {};
  const response = await api.get('/ai/review-suggestions', { params });
  return response.data.data;
}

// ============================================================================
// Video Progress Service
// ============================================================================

/**
 * Video ilerleme bilgisini al.
 */
export async function getVideoProgress(videoId: number): Promise<VideoProgress | null> {
  try {
    const response = await api.get(`/videos/${videoId}/progress`);
    return response.data.data;
  } catch {
    return null;
  }
}

/**
 * Video ilerleme güncelle.
 */
export async function updateVideoProgress(
  videoId: number,
  watchedSeconds: number,
  lastPosition: number
): Promise<VideoProgress> {
  const response = await api.post(`/videos/${videoId}/progress`, {
    watched_seconds: watchedSeconds,
    last_position: lastPosition,
  });
  return response.data.data;
}

// ============================================================================
// Video Player State Management
// ============================================================================

/**
 * Video player state interface
 */
export interface VideoPlayerState {
  videoId: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  watchedSeconds: number;
  lastSavedPosition: number;
  isCompleted: boolean;
}

/**
 * Video player state manager.
 * 
 * Kullanım:
 * ```ts
 * const player = new VideoPlayerStateManager(videoId);
 * player.onTimeUpdate(currentTime, duration);
 * player.onPause();
 * ```
 */
export class VideoPlayerStateManager {
  private videoId: number;
  private watchedSeconds: number = 0;
  private lastSavedPosition: number = 0;
  private saveInterval: number = 10; // Her 10 saniyede kaydet
  private lastSaveTime: number = 0;
  
  constructor(videoId: number, initialProgress?: VideoProgress) {
    this.videoId = videoId;
    if (initialProgress) {
      this.watchedSeconds = initialProgress.watched_seconds;
      this.lastSavedPosition = initialProgress.last_position;
    }
  }
  
  /**
   * Video zaman güncellemesi.
   * Her 10 saniyede bir sunucuya kaydet.
   */
  async onTimeUpdate(currentTime: number, duration: number): Promise<void> {
    // İzlenen süreyi güncelle
    this.watchedSeconds = Math.max(this.watchedSeconds, Math.floor(currentTime));
    
    // Her 10 saniyede kaydet
    const now = Date.now();
    if (now - this.lastSaveTime > this.saveInterval * 1000) {
      await this.saveProgress(currentTime);
      this.lastSaveTime = now;
    }
  }
  
  /**
   * Video duraklatıldığında ilerlemeyi kaydet.
   */
  async onPause(currentTime: number): Promise<void> {
    await this.saveProgress(currentTime);
  }
  
  /**
   * Video bittiğinde ilerlemeyi kaydet.
   */
  async onEnded(): Promise<void> {
    // Video bittiğinde özel işlem (sunucu zaten tamamlandı olarak işaretler)
    await this.saveProgress(this.watchedSeconds);
  }
  
  /**
   * İlerlemeyi sunucuya kaydet.
   */
  private async saveProgress(position: number): Promise<void> {
    try {
      await updateVideoProgress(this.videoId, this.watchedSeconds, Math.floor(position));
      this.lastSavedPosition = Math.floor(position);
    } catch (error) {
      console.error('Video ilerleme kaydedilemedi:', error);
    }
  }
  
  /**
   * Son kaydedilen pozisyonu al (video başlatırken kullan).
   */
  getResumePosition(): number {
    return this.lastSavedPosition;
  }
}

// ============================================================================
// Video Service Export (default)
// ============================================================================

const videoService = {
  // Embed
  getVideoEmbedInfo,
  buildYouTubeEmbedUrl,
  
  // AI Features
  askAboutVideo,
  explainVideoTopic,
  getVideoKeyPoints,
  generateVideoQuiz,
  
  // Review Suggestions
  getVideoReviewSuggestions,
  getGeneralReviewSuggestions,
  
  // Progress
  getVideoProgress,
  updateVideoProgress,
  
  // Player State Manager
  VideoPlayerStateManager,
};

export default videoService;
