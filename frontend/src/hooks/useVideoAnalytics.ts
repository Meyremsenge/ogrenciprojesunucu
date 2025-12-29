/**
 * useVideoAnalytics Hook
 * 
 * Video izleme analitiklerini yönetir.
 * Watch session başlatma, güncelleme ve sonlandırma.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { videoApi } from '../services/api/videoApi';

// ============================================================================
// Types
// ============================================================================

export type WatchEventType = 
  | 'play' 
  | 'pause' 
  | 'resume' 
  | 'seek' 
  | 'complete' 
  | 'progress' 
  | 'buffer' 
  | 'error';

interface UseVideoAnalyticsReturn {
  /** Session ID */
  sessionId: string | null;
  /** Session başlat */
  startSession: () => Promise<void>;
  /** Session güncelle */
  updateSession: (position: number, eventType: WatchEventType, extraData?: any) => void;
  /** Session sonlandır */
  endSession: () => Promise<void>;
  /** Yükleniyor */
  isLoading: boolean;
  /** Hata */
  error: string | null;
}

interface WatchSessionData {
  video_id: number;
  position: number;
  last_event: WatchEventType;
  total_watched: number;
}

// ============================================================================
// Configuration
// ============================================================================

const UPDATE_INTERVAL_MS = 10000; // Her 10 saniyede bir sunucuya gönder
const MIN_WATCH_TIME_FOR_VIEW = 5; // Minimum 5 saniye izleme

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVideoAnalytics(videoId: number): UseVideoAnalyticsReturn {
  // State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for batching updates
  const pendingUpdatesRef = useRef<WatchSessionData | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const updateIntervalRef = useRef<NodeJS.Timeout>();
  const totalWatchedRef = useRef<number>(0);
  const lastPositionRef = useRef<number>(0);

  // ============================================================================
  // Start Watch Session
  // ============================================================================

  const startSession = useCallback(async () => {
    if (sessionId) {
      // Zaten aktif session var
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await videoApi.startWatchSession(videoId);

      if (response.success && response.data?.session_id) {
        setSessionId(response.data.session_id);
        totalWatchedRef.current = 0;
        lastPositionRef.current = 0;
        lastUpdateTimeRef.current = Date.now();
      } else {
        throw new Error(response.message || 'Session başlatılamadı');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Session başlatılamadı';
      setError(errorMessage);
      console.error('Watch session start error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, sessionId]);

  // ============================================================================
  // Update Watch Session (Batched)
  // ============================================================================

  const updateSession = useCallback((
    position: number,
    eventType: WatchEventType,
    extraData?: any
  ) => {
    if (!sessionId) return;

    // İzleme süresini hesapla
    const now = Date.now();
    const elapsed = (now - lastUpdateTimeRef.current) / 1000;
    
    // Sadece oynatma sırasında süre ekle
    if (eventType === 'progress' || eventType === 'play') {
      const watchedDelta = Math.min(elapsed, 2); // Max 2 saniye (sanity check)
      totalWatchedRef.current += watchedDelta;
    }
    
    lastUpdateTimeRef.current = now;
    lastPositionRef.current = position;

    // Batch update için pending data güncelle
    pendingUpdatesRef.current = {
      video_id: videoId,
      position,
      last_event: eventType,
      total_watched: totalWatchedRef.current
    };

    // Önemli eventlerde anında gönder
    if (['complete', 'seek', 'error'].includes(eventType)) {
      flushPendingUpdates();
    }
  }, [sessionId, videoId]);

  // ============================================================================
  // Flush Pending Updates
  // ============================================================================

  const flushPendingUpdates = useCallback(async () => {
    if (!sessionId || !pendingUpdatesRef.current) return;

    const updateData = pendingUpdatesRef.current;
    pendingUpdatesRef.current = null;

    try {
      await videoApi.updateWatchSession(sessionId, {
        position: updateData.position,
        event_type: updateData.last_event,
        extra_data: {
          total_watched: updateData.total_watched
        }
      });
    } catch (err) {
      console.error('Watch session update error:', err);
      // Hata durumunda pending data'yı geri koy
      pendingUpdatesRef.current = updateData;
    }
  }, [sessionId]);

  // ============================================================================
  // Periodic Update Interval
  // ============================================================================

  useEffect(() => {
    if (!sessionId) return;

    updateIntervalRef.current = setInterval(() => {
      if (pendingUpdatesRef.current) {
        flushPendingUpdates();
      }
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [sessionId, flushPendingUpdates]);

  // ============================================================================
  // End Watch Session
  // ============================================================================

  const endSession = useCallback(async () => {
    if (!sessionId) return;

    // Bekleyen güncellemeleri gönder
    if (pendingUpdatesRef.current) {
      await flushPendingUpdates();
    }

    try {
      setIsLoading(true);

      await videoApi.endWatchSession(sessionId);
      
      setSessionId(null);
      totalWatchedRef.current = 0;
      lastPositionRef.current = 0;
    } catch (err: any) {
      console.error('Watch session end error:', err);
      // Session'ı yine de temizle
      setSessionId(null);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, flushPendingUpdates]);

  // ============================================================================
  // Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      // Component unmount olurken session'ı sonlandır
      // Not: Bu async call unmount sırasında çalışmayabilir
      // Beacon API kullanmak daha güvenilir olur
      if (sessionId && pendingUpdatesRef.current) {
        // navigator.sendBeacon kullan
        const data = {
          session_id: sessionId,
          position: lastPositionRef.current,
          event_type: 'progress'
        };
        navigator.sendBeacon(
          `/api/v1/contents/videos/watch/${sessionId}/end`,
          JSON.stringify(data)
        );
      }
    };
  }, [sessionId]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    sessionId,
    startSession,
    updateSession,
    endSession,
    isLoading,
    error
  };
}

export default useVideoAnalytics;
