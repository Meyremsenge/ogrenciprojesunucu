/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎬 VIDEO UX COMPONENTS - Video İzleme Deneyimi
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * EdTech video izleme UX bileşenleri:
 * - YouTube Embed Player (dikkat takibi ile)
 * - Video Progress Tracker
 * - Video Notes (timestamp bazlı)
 * - Video Chapters
 * - Picture-in-Picture desteği
 * - Playback speed controls
 * 
 * Tasarım Kararları:
 * - Otomatik duraklama (tab değişince) → dikkat kaybını önler
 * - İlerleme kaydı → motivasyonu artırır
 * - Bölüm navigasyonu → uzun videoları yönetilebilir kılar
 * - Not alma → aktif öğrenmeyi destekler
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  Maximize,
  Minimize,
  PictureInPicture2,
  ListVideo,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  Gauge,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface VideoChapter {
  id: string;
  title: string;
  startTime: number; // seconds
  endTime: number;
  description?: string;
}

interface VideoNote {
  id: string;
  timestamp: number;
  content: string;
  createdAt: Date;
}

interface VideoProgress {
  videoId: string;
  currentTime: number;
  duration: number;
  percentComplete: number;
  isCompleted: boolean;
  lastWatched: Date;
  watchedSegments: [number, number][]; // start-end pairs
}

// ============================================================================
// YOUTUBE EMBED PLAYER
// ============================================================================

interface YouTubeEmbedPlayerProps {
  videoId: string;
  title?: string;
  chapters?: VideoChapter[];
  onProgress?: (progress: VideoProgress) => void;
  onComplete?: () => void;
  initialTime?: number;
  autoPlay?: boolean;
  showChapters?: boolean;
  className?: string;
}

export function YouTubeEmbedPlayer({
  videoId,
  title,
  chapters = [],
  onProgress,
  onComplete,
  initialTime = 0,
  autoPlay = false,
  showChapters = true,
  className,
}: YouTubeEmbedPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isTabActive, setIsTabActive] = useState(true);
  const [showChapterList, setShowChapterList] = useState(false);

  // Tab visibility detection - pause when user switches tabs
  useEffect(() => {
    const handleVisibility = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsTabActive(isVisible);
      
      // Auto-pause when tab becomes hidden (attention tracking)
      if (!isVisible && isPlaying) {
        // Send pause command to YouTube iframe
        postMessage('pauseVideo');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying]);

  const postMessage = (action: string, args?: unknown) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: action, args }),
        '*'
      );
    }
  };

  const currentChapter = chapters.find(
    (c) => currentTime >= c.startTime && currentTime < c.endTime
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Embed URL with parameters
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&start=${Math.floor(initialTime)}&autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1`;

  return (
    <div className={cn('relative bg-black rounded-xl overflow-hidden group', className)}>
      {/* Video Container */}
      <div className="relative aspect-video">
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={title || 'Video Player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />

        {/* Overlay Controls (shown on hover) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        {/* Tab Inactive Warning */}
        <AnimatePresence>
          {!isTabActive && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg z-10"
            >
              <Pause className="w-4 h-4" />
              <span className="text-sm font-medium">Video duraklatıldı</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-white/20">
        <motion.div
          className="h-full bg-primary"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
        {/* Chapter markers */}
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className="absolute top-0 w-1 h-full bg-white/50"
            style={{ left: `${(chapter.startTime / duration) * 100}%` }}
          />
        ))}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/90 p-3 flex items-center justify-between gap-4">
        {/* Left Controls */}
        <div className="flex items-center gap-3">
          {/* Current Chapter */}
          {currentChapter && (
            <button
              onClick={() => setShowChapterList(!showChapterList)}
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              <ListVideo className="w-4 h-4" />
              <span className="max-w-[200px] truncate">{currentChapter.title}</span>
              {showChapterList ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Playback Speed */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            >
              <Gauge className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-xl p-2 min-w-[120px]"
                >
                  <p className="text-xs text-white/50 px-2 mb-1">Oynatma Hızı</p>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        postMessage('setPlaybackRate', [speed]);
                        setShowSettings(false);
                      }}
                      className={cn(
                        'w-full px-3 py-1.5 text-sm text-left rounded hover:bg-white/10 flex items-center justify-between',
                        playbackSpeed === speed ? 'text-primary' : 'text-white'
                      )}
                    >
                      {speed === 1 ? 'Normal' : `${speed}x`}
                      {playbackSpeed === speed && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Chapter List Dropdown */}
      <AnimatePresence>
        {showChapterList && chapters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-900 border-t border-white/10 max-h-60 overflow-y-auto"
          >
            {chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                onClick={() => {
                  postMessage('seekTo', [chapter.startTime, true]);
                  setShowChapterList(false);
                }}
                className={cn(
                  'w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left',
                  currentChapter?.id === chapter.id && 'bg-primary/10'
                )}
              >
                <span className="text-xs text-white/50 font-mono w-12">
                  {formatTime(chapter.startTime)}
                </span>
                <div className="flex-1">
                  <p className={cn(
                    'text-sm',
                    currentChapter?.id === chapter.id ? 'text-primary' : 'text-white'
                  )}>
                    {index + 1}. {chapter.title}
                  </p>
                  {chapter.description && (
                    <p className="text-xs text-white/50 mt-0.5">{chapter.description}</p>
                  )}
                </div>
                {currentChapter?.id === chapter.id && (
                  <span className="text-xs text-primary bg-primary/20 px-2 py-0.5 rounded">
                    Şu an
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// VIDEO PROGRESS TRACKER
// ============================================================================

interface VideoProgressTrackerProps {
  progress: VideoProgress;
  showDetails?: boolean;
  className?: string;
}

export function VideoProgressTracker({
  progress,
  showDetails = true,
  className,
}: VideoProgressTrackerProps) {
  const progressPercent = Math.min(100, Math.round(progress.percentComplete));
  
  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            progress.isCompleted ? 'bg-green-500' : 'bg-primary'
          )}
        />
        {/* Watched segments visualization */}
        {progress.watchedSegments.map(([start, end], i) => (
          <div
            key={i}
            className="absolute inset-y-0 bg-primary/30"
            style={{
              left: `${(start / progress.duration) * 100}%`,
              width: `${((end - start) / progress.duration) * 100}%`,
            }}
          />
        ))}
      </div>

      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {progress.isCompleted ? (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="w-4 h-4" />
                Tamamlandı
              </span>
            ) : (
              <span className="text-muted-foreground">
                {formatTime(progress.currentTime)} / {formatTime(progress.duration)}
              </span>
            )}
          </div>
          <span className={cn(
            'font-medium',
            progress.isCompleted ? 'text-green-600' : 'text-foreground'
          )}>
            %{progressPercent}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VIDEO NOTES PANEL
// ============================================================================

interface VideoNotesPanelProps {
  notes: VideoNote[];
  onAddNote: (content: string, timestamp: number) => void;
  onDeleteNote: (noteId: string) => void;
  onSeekTo: (timestamp: number) => void;
  currentTime: number;
  className?: string;
}

export function VideoNotesPanel({
  notes,
  onAddNote,
  onDeleteNote,
  onSeekTo,
  currentTime,
  className,
}: VideoNotesPanelProps) {
  const [newNote, setNewNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim(), currentTime);
      setNewNote('');
    }
  };

  const sortedNotes = [...notes].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className={cn('bg-card rounded-xl border border-border', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-primary" />
          <span className="font-medium">Notlarım</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {notes.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {/* Add Note */}
            <div className="px-4 pb-3 border-b border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder="Not ekle..."
                  className="flex-1 px-3 py-2 rounded-lg bg-muted border-0 text-sm focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  Ekle
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                📍 {formatTime(currentTime)} anına eklenecek
              </p>
            </div>

            {/* Notes List */}
            <div className="max-h-60 overflow-y-auto">
              {sortedNotes.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Lightbulb className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Henüz not eklemediniz
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Önemli anları not alarak öğrenmenizi güçlendirin
                  </p>
                </div>
              ) : (
                sortedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => onSeekTo(note.timestamp)}
                        className="text-xs text-primary font-mono hover:underline"
                      >
                        {formatTime(note.timestamp)}
                      </button>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-foreground mt-1">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// VIDEO COMPLETION CELEBRATION
// ============================================================================

interface VideoCompletionProps {
  videoTitle: string;
  nextVideo?: { id: string; title: string };
  onRewatch: () => void;
  onContinue?: () => void;
  onGoBack: () => void;
}

export function VideoCompletionCelebration({
  videoTitle,
  nextVideo,
  onRewatch,
  onContinue,
  onGoBack,
}: VideoCompletionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-black/90 flex items-center justify-center z-20"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-center max-w-md px-6"
      >
        {/* Celebration Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', bounce: 0.5 }}
          className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
            }}
            transition={{ repeat: 2, duration: 0.5 }}
          >
            <Check className="w-12 h-12 text-green-500" />
          </motion.div>
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-2">
          Tebrikler! 🎉
        </h2>
        <p className="text-white/70 mb-6">
          "{videoTitle}" videosunu tamamladınız
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {nextVideo && onContinue && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onContinue}
              className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
            >
              Sonraki Video
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={onRewatch}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Tekrar İzle
            </button>
            <button
              onClick={onGoBack}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Kursa Dön
            </button>
          </div>
        </div>

        {nextVideo && (
          <p className="text-sm text-white/50 mt-4">
            Sıradaki: {nextVideo.title}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// ATTENTION REMINDER
// ============================================================================

interface AttentionReminderProps {
  onContinue: () => void;
  onTakeBreak: () => void;
  watchDuration: number; // minutes watched
}

export function AttentionReminder({
  onContinue,
  onTakeBreak,
  watchDuration,
}: AttentionReminderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card rounded-2xl p-6 max-w-sm mx-4 text-center shadow-2xl"
      >
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">
          {watchDuration} dakikadır izliyorsunuz
        </h3>
        <p className="text-muted-foreground text-sm mb-6">
          Düzenli aralar vermek, öğrenmenizi güçlendirir ve dikkat sürenizi uzatır.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onTakeBreak}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            5 dk Mola
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Devam Et
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  VideoChapter,
  VideoNote,
  VideoProgress,
  YouTubeEmbedPlayerProps,
  VideoProgressTrackerProps,
  VideoNotesPanelProps,
  VideoCompletionProps,
  AttentionReminderProps,
};
