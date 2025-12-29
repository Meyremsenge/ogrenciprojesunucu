/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📚 EDTECH COMPONENTS INDEX
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tüm EdTech UX bileşenlerinin merkezi export noktası.
 * Video, Sınav, Sonuç ve Canlı Ders modülleri için tasarlanmış bileşenler.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Video UX Components
export {
  YouTubeEmbedPlayer,
  VideoProgressTracker,
  VideoNotesPanel,
  VideoCompletionCelebration,
  AttentionReminder,
  type VideoChapter,
  type VideoNote,
  type VideoProgress,
  type YouTubeEmbedPlayerProps,
  type VideoProgressTrackerProps,
  type VideoNotesPanelProps,
  type VideoCompletionProps,
  type AttentionReminderProps,
} from './VideoUX';

// Exam UX Components
export {
  ExamTimer,
  QuestionNavigator,
  QuestionCard,
  ExamSubmitConfirmation,
  ExamEncouragement,
  type QuestionStatus,
  type Question,
  type ExamState,
  type ExamTimerProps,
  type QuestionNavigatorProps,
  type QuestionCardProps,
  type ExamSubmitConfirmationProps,
  type ExamEncouragementProps,
} from './ExamUX';

// Exam Results UX Components
export {
  ScoreDisplay,
  ResultsSummary,
  QuestionReview,
  AchievementBadges,
  ImprovementSuggestions,
  ResultsActions,
  type ExamResult,
  type QuestionResult,
  type Achievement,
  type ScoreDisplayProps,
  type ResultsSummaryProps,
  type QuestionReviewProps,
  type AchievementBadgesProps,
  type ImprovementSuggestionsProps,
  type ResultsActionsProps,
} from './ExamResultsUX';

// Live Class UX Components
export {
  ParticipantTile,
  ParticipantsGrid,
  LiveChatPanel,
  ReactionsBar,
  ConnectionStatus,
  ClassControls,
  ClassInfoBar,
  WaitingRoom,
  type Participant,
  type ChatMessage,
  type Reaction,
  type ConnectionQuality,
  type ParticipantTileProps,
  type ParticipantsGridProps,
  type LiveChatPanelProps,
  type ReactionsBarProps,
  type ConnectionStatusProps,
  type ClassControlsProps,
  type ClassInfoBarProps,
  type WaitingRoomProps,
} from './LiveClassUX';
