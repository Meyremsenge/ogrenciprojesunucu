/**
 * SecureVideoPlayer Component
 * 
 * YouTube gizli videolarını güvenli şekilde oynatır.
 * Token-based access ve analytics tracking ile.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVideoAnalytics } from '../../hooks/useVideoAnalytics';
import { videoApi } from '../../services/api/videoApi';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AlertCircle, Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface SecureVideoPlayerProps {
  /** Video ID (database) */
  videoId: number;
  /** Başlık */
  title?: string;
  /** Otomatik başlat */
  autoplay?: boolean;
  /** Başlangıç zamanı (saniye) */
  startTime?: number;
  /** Oynatma tamamlandığında */
  onComplete?: () => void;
  /** İlerleme değiştiğinde */
  onProgress?: (progress: number) => void;
  /** Hata durumunda */
  onError?: (error: string) => void;
  /** Ekstra sınıf */
  className?: string;
  /** Poster resmi */
  posterUrl?: string;
}

interface EmbedData {
  embed_url: string;
  signed_url: string;
  youtube_video_id: string;
  duration: number;
  duration_formatted: string;
}

// ============================================================================
// YouTube Player Message Types
// ============================================================================

interface YouTubePlayerState {
  currentTime: number;
  duration: number;
  playerState: number; // -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
  volume: number;
  isMuted: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  videoId,
  title,
  autoplay = false,
  startTime = 0,
  onComplete,
  onProgress,
  onError,
  className = '',
  posterUrl
}) => {
  // State
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);

  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Analytics hook
  const {
    startSession,
    updateSession,
    endSession,
    sessionId
  } = useVideoAnalytics(videoId);

  // ============================================================================
  // Fetch Embed URL
  // ============================================================================

  useEffect(() => {
    const fetchEmbedUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await videoApi.getEmbedUrl(videoId, {
          autoplay: autoplay,
          start: startTime
        });

        if (response.success && response.data) {
          setEmbedData(response.data);
        } else {
          throw new Error(response.message || 'Embed URL alınamadı');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Video yüklenemedi';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchEmbedUrl();
  }, [videoId, autoplay, startTime]);

  // ============================================================================
  // YouTube PostMessage Communication
  // ============================================================================

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // YouTube origin kontrolü
      if (
        event.origin !== 'https://www.youtube.com' &&
        event.origin !== 'https://www.youtube-nocookie.com'
      ) {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // YouTube iframe API mesajları
        if (data.event === 'onStateChange') {
          handlePlayerStateChange(data.info);
        } else if (data.event === 'onReady') {
          setPlayerReady(true);
          if (autoplay) {
            startSession();
          }
        } else if (data.event === 'infoDelivery' && data.info) {
          handleInfoDelivery(data.info);
        }
      } catch (e) {
        // Parse error, ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId]);

  const handlePlayerStateChange = (state: number) => {
    switch (state) {
      case 1: // Playing
        setIsPlaying(true);
        if (!sessionId) {
          startSession();
        }
        updateSession(0, 'play');
        break;
      case 2: // Paused
        setIsPlaying(false);
        updateSession(0, 'pause');
        break;
      case 0: // Ended
        setIsPlaying(false);
        updateSession(0, 'complete');
        endSession();
        onComplete?.();
        break;
      case 3: // Buffering
        updateSession(0, 'buffer');
        break;
    }
  };

  const handleInfoDelivery = (info: Partial<YouTubePlayerState>) => {
    if (info.currentTime !== undefined && embedData?.duration) {
      const progress = (info.currentTime / embedData.duration) * 100;
      onProgress?.(progress);
      updateSession(info.currentTime, 'progress');
    }
  };

  // ============================================================================
  // Player Controls (via PostMessage)
  // ============================================================================

  const sendPlayerCommand = useCallback((func: string, args?: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args: args ? [args] : []
        }),
        '*'
      );
    }
  }, []);

  const playVideo = useCallback(() => {
    sendPlayerCommand('playVideo');
  }, [sendPlayerCommand]);

  const pauseVideo = useCallback(() => {
    sendPlayerCommand('pauseVideo');
  }, [sendPlayerCommand]);

  const seekTo = useCallback((seconds: number) => {
    sendPlayerCommand('seekTo', seconds);
    updateSession(seconds, 'seek');
  }, [sendPlayerCommand, updateSession]);

  // ============================================================================
  // Control Visibility
  // ============================================================================

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Cleanup on unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, [sessionId, endSession]);

  // ============================================================================
  // Fullscreen
  // ============================================================================

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 aspect-video rounded-lg ${className}`}>
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-white">Video yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-900 aspect-video rounded-lg ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <p className="text-white text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!embedData) {
    return null;
  }

  // YouTube iframe embed URL with enablejsapi for PostMessage
  const iframeSrc = `${embedData.embed_url}&enablejsapi=1&origin=${window.location.origin}`;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Title */}
      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
          <h3 className="text-white font-medium truncate">{title}</h3>
        </div>
      )}

      {/* YouTube Iframe */}
      <div className="aspect-video w-full">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || 'Video Player'}
        />
      </div>

      {/* Custom Overlay Controls (optional) */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            {/* Play/Pause */}
            <button
              onClick={isPlaying ? pauseVideo : playVideo}
              className="p-2 text-white hover:text-blue-400 transition-colors"
              aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            {/* Duration */}
            <span className="text-white text-sm">
              {embedData.duration_formatted}
            </span>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:text-blue-400 transition-colors"
              aria-label="Tam Ekran"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureVideoPlayer;
