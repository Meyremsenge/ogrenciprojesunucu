/**
 * YouTube Player Component
 * Gömülü YouTube video oynatıcı
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  className?: string;
  autoplay?: boolean;
  startAt?: number;
  onProgress?: (watchedSeconds: number, position: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function YouTubePlayer({
  videoId,
  title,
  className,
  autoplay = false,
  startAt = 0,
  onProgress,
  onComplete,
  onError,
}: YouTubePlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build embed URL with parameters
  const embedUrl = (() => {
    const params = new URLSearchParams({
      rel: '0',           // İlgili videolar gösterme
      modestbranding: '1', // YouTube logosu küçült
      enablejsapi: '1',    // JavaScript API'yi etkinleştir
      origin: window.location.origin,
    });
    
    if (autoplay) params.set('autoplay', '1');
    if (startAt > 0) params.set('start', String(startAt));
    
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  })();

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Video yüklenirken bir hata oluştu');
    onError?.('Video yüklenirken bir hata oluştu');
  };

  return (
    <div className={cn('relative w-full bg-black rounded-lg overflow-hidden', className)}>
      {/* Aspect ratio container (16:9) */}
      <div className="relative pt-[56.25%]">
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-2" />
              <p className="text-white/70 text-sm">Video yükleniyor...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center px-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Play className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-white font-medium mb-2">Video oynatılamıyor</p>
              <p className="text-white/60 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* YouTube iframe */}
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={title || 'YouTube Video'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Video Card Component
// =============================================================================

interface VideoCardProps {
  video: {
    id: number;
    title: string;
    description?: string;
    youtube_id: string;
    thumbnail_url: string;
    duration_formatted: string;
    grade_display: string;
    subject: string;
    creator_name?: string;
    is_system_video: boolean;
    view_count?: number;
  };
  onClick?: () => void;
  onPlay?: () => void;
  className?: string;
}

export function VideoCard({ video, onClick, onPlay, className }: VideoCardProps) {
  const [thumbnailError, setThumbnailError] = useState(false);
  
  const subjectLabels: Record<string, string> = {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card border rounded-xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer group',
        className
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
        {!thumbnailError ? (
          <img
            src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <Play className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.();
            }}
            className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center text-white hover:bg-primary transition-colors"
          >
            <Play className="h-6 w-6 ml-1" fill="currentColor" />
          </button>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {video.duration_formatted || '00:00'}
        </div>

        {/* System badge */}
        {video.is_system_video && (
          <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded font-medium">
            Sistem
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-muted px-2 py-0.5 rounded">
            {video.grade_display}
          </span>
          <span className="bg-muted px-2 py-0.5 rounded">
            {subjectLabels[video.subject] || video.subject}
          </span>
        </div>

        {video.view_count !== undefined && (
          <p className="text-xs text-muted-foreground mt-2">
            {video.view_count.toLocaleString('tr-TR')} görüntülenme
          </p>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Video Modal Component
// =============================================================================

interface VideoModalProps {
  video: {
    id: number;
    title: string;
    description?: string;
    youtube_id: string;
    grade_display: string;
    subject: string;
    creator_name?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onProgress?: (watchedSeconds: number, position: number) => void;
}

export function VideoModal({ video, isOpen, onClose, onProgress }: VideoModalProps) {
  if (!isOpen || !video) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-5xl bg-card rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video Player */}
        <YouTubePlayer
          videoId={video.youtube_id}
          title={video.title}
          autoplay
          onProgress={onProgress}
        />

        {/* Video Info */}
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2">{video.title}</h2>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span className="bg-muted px-2 py-0.5 rounded">{video.grade_display}</span>
            {video.creator_name && (
              <span>• {video.creator_name}</span>
            )}
          </div>

          {video.description && (
            <p className="text-sm text-muted-foreground">{video.description}</p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          ×
        </button>
      </motion.div>
    </motion.div>
  );
}

export default YouTubePlayer;
