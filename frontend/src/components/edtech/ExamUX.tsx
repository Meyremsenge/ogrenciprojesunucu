/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📝 EXAM UX COMPONENTS - Sınav Çözme Deneyimi
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * EdTech sınav çözme UX bileşenleri:
 * - Timer (stres azaltıcı tasarım)
 * - Question Navigator
 * - Answer Feedback
 * - Progress Indicator
 * - Submit Confirmation
 * 
 * Tasarım Kararları:
 * - Yumuşak timer renkleri → sınav kaygısını azaltır
 * - İlerleme görselleştirmesi → kontrol hissi verir
 * - Kolay navigasyon → zaman kaybını önler
 * - Pozitif feedback → motivasyonu korur
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Flag,
  FlagOff,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Send,
  Pause,
  Play,
  HelpCircle,
  Eye,
  EyeOff,
  RotateCcw,
  Lightbulb,
  Check,
  X,
  ArrowRight,
  Timer,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type QuestionStatus = 'unanswered' | 'answered' | 'flagged' | 'current';

interface Question {
  id: string | number;
  text: string;
  type: 'single' | 'multiple' | 'text' | 'true-false';
  options?: { id: string; text: string }[];
  image?: string;
}

interface ExamState {
  currentQuestion: number;
  answers: Record<string | number, string | string[]>;
  flagged: Set<string | number>;
  startTime: Date;
  timeLimit: number; // minutes
}

// ============================================================================
// EXAM TIMER
// ============================================================================

interface ExamTimerProps {
  timeLimit: number; // minutes
  startTime: Date;
  onTimeUp: () => void;
  isPaused?: boolean;
  className?: string;
}

export function ExamTimer({
  timeLimit,
  startTime,
  onTimeUp,
  isPaused = false,
  className,
}: ExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    return Math.max(0, timeLimit * 60 - elapsed);
  });

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, onTimeUp]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const percentRemaining = (timeLeft / (timeLimit * 60)) * 100;
  
  // Color based on time remaining - softer colors to reduce stress
  const getTimerStyle = () => {
    if (percentRemaining > 50) {
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', ring: 'ring-emerald-500/30' };
    }
    if (percentRemaining > 25) {
      return { bg: 'bg-amber-500/10', text: 'text-amber-600', ring: 'ring-amber-500/30' };
    }
    if (percentRemaining > 10) {
      return { bg: 'bg-orange-500/10', text: 'text-orange-600', ring: 'ring-orange-500/30' };
    }
    return { bg: 'bg-red-500/10', text: 'text-red-600', ring: 'ring-red-500/30' };
  };

  const style = getTimerStyle();

  return (
    <motion.div
      layout
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-xl ring-1',
        style.bg,
        style.ring,
        className
      )}
    >
      <Timer className={cn('w-5 h-5', style.text)} />
      <span className={cn('font-mono text-lg font-semibold', style.text)}>
        {formatTime(timeLeft)}
      </span>
      
      {/* Low time pulse animation */}
      {percentRemaining <= 10 && (
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-2 h-2 rounded-full bg-red-500"
        />
      )}
    </motion.div>
  );
}

// ============================================================================
// QUESTION NAVIGATOR
// ============================================================================

interface QuestionNavigatorProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string | number, string | string[]>;
  flagged: Set<string | number>;
  onNavigate: (index: number) => void;
  className?: string;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  flagged,
  onNavigate,
  className,
}: QuestionNavigatorProps) {
  const getStatus = (question: Question, index: number): QuestionStatus => {
    if (index === currentIndex) return 'current';
    if (flagged.has(question.id)) return 'flagged';
    if (answers[question.id] !== undefined) return 'answered';
    return 'unanswered';
  };

  const statusStyles: Record<QuestionStatus, string> = {
    current: 'bg-primary text-primary-foreground ring-2 ring-primary/50',
    answered: 'bg-emerald-500 text-white',
    flagged: 'bg-amber-500 text-white',
    unanswered: 'bg-muted text-muted-foreground hover:bg-muted/80',
  };

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flagged.size;

  return (
    <div className={cn('bg-card rounded-xl border border-border p-4', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <span className="text-muted-foreground">
          Soru {currentIndex + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            {answeredCount}
          </span>
          {flaggedCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Flag className="w-4 h-4" />
              {flaggedCount}
            </span>
          )}
        </div>
      </div>

      {/* Question Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {questions.map((question, index) => {
          const status = getStatus(question, index);
          return (
            <motion.button
              key={question.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate(index)}
              className={cn(
                'w-8 h-8 rounded-lg text-xs font-medium transition-colors relative',
                statusStyles[status]
              )}
            >
              {index + 1}
              {status === 'flagged' && (
                <Flag className="absolute -top-1 -right-1 w-3 h-3" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" />
          Cevaplandı
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500" />
          İşaretli
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-muted" />
          Boş
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// QUESTION CARD
// ============================================================================

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer?: string | string[];
  isFlagged: boolean;
  onAnswer: (answer: string | string[]) => void;
  onFlag: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  className?: string;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  isFlagged,
  onAnswer,
  onFlag,
  onPrev,
  onNext,
  className,
}: QuestionCardProps) {
  const handleOptionClick = (optionId: string) => {
    if (question.type === 'multiple') {
      const current = (selectedAnswer as string[]) || [];
      const newAnswer = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      onAnswer(newAnswer);
    } else {
      onAnswer(optionId);
    }
  };

  const isOptionSelected = (optionId: string) => {
    if (question.type === 'multiple') {
      return (selectedAnswer as string[])?.includes(optionId);
    }
    return selectedAnswer === optionId;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn('bg-card rounded-xl border border-border', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Soru {questionNumber} / {totalQuestions}
          </span>
          {question.type === 'multiple' && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              Çoklu Seçim
            </span>
          )}
        </div>
        <button
          onClick={onFlag}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isFlagged
              ? 'bg-amber-500/10 text-amber-600'
              : 'hover:bg-muted text-muted-foreground'
          )}
          title={isFlagged ? 'İşareti Kaldır' : 'Sonra Dönmek İçin İşaretle'}
        >
          {isFlagged ? (
            <Flag className="w-5 h-5 fill-current" />
          ) : (
            <FlagOff className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Question */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-foreground mb-6 leading-relaxed">
          {question.text}
        </h3>

        {question.image && (
          <img
            src={question.image}
            alt="Soru görseli"
            className="max-w-md rounded-lg mb-6 border border-border"
          />
        )}

        {/* Options */}
        {question.options && (
          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = isOptionSelected(option.id);
              const letter = String.fromCharCode(65 + index); // A, B, C, D

              return (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleOptionClick(option.id)}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-muted/30'
                  )}
                >
                  <span
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {letter}
                  </span>
                  <span className="text-foreground pt-1">{option.text}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* True/False */}
        {question.type === 'true-false' && (
          <div className="flex gap-4">
            {['true', 'false'].map((value) => (
              <button
                key={value}
                onClick={() => onAnswer(value)}
                className={cn(
                  'flex-1 p-4 rounded-xl border-2 transition-all',
                  selectedAnswer === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                {value === 'true' ? 'Doğru' : 'Yanlış'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
        <button
          onClick={onPrev}
          disabled={!onPrev}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Önceki
        </button>

        <button
          onClick={onNext}
          disabled={!onNext}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Sonraki
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// EXAM SUBMIT CONFIRMATION
// ============================================================================

interface ExamSubmitConfirmationProps {
  totalQuestions: number;
  answeredCount: number;
  flaggedCount: number;
  unansweredQuestions: number[];
  onConfirm: () => void;
  onCancel: () => void;
  onGoToQuestion: (index: number) => void;
  isSubmitting?: boolean;
}

export function ExamSubmitConfirmation({
  totalQuestions,
  answeredCount,
  flaggedCount,
  unansweredQuestions,
  onConfirm,
  onCancel,
  onGoToQuestion,
  isSubmitting = false,
}: ExamSubmitConfirmationProps) {
  const allAnswered = answeredCount === totalQuestions;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              allAnswered ? 'bg-emerald-500/10' : 'bg-amber-500/10'
            )}>
              {allAnswered ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Sınavı Bitir
              </h3>
              <p className="text-sm text-muted-foreground">
                {allAnswered
                  ? 'Tüm soruları cevapladınız'
                  : 'Bazı sorular boş bırakıldı'}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-muted">
              <p className="text-2xl font-bold text-foreground">{totalQuestions}</p>
              <p className="text-xs text-muted-foreground">Toplam Soru</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <p className="text-2xl font-bold text-emerald-600">{answeredCount}</p>
              <p className="text-xs text-muted-foreground">Cevaplanan</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10">
              <p className="text-2xl font-bold text-amber-600">{unansweredQuestions.length}</p>
              <p className="text-xs text-muted-foreground">Boş</p>
            </div>
          </div>

          {/* Unanswered Warning */}
          {unansweredQuestions.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-700 mb-2">
                Aşağıdaki sorular boş bırakıldı:
              </p>
              <div className="flex flex-wrap gap-2">
                {unansweredQuestions.slice(0, 10).map((index) => (
                  <button
                    key={index}
                    onClick={() => onGoToQuestion(index)}
                    className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 transition-colors"
                  >
                    Soru {index + 1}
                  </button>
                ))}
                {unansweredQuestions.length > 10 && (
                  <span className="px-2 py-1 text-xs text-amber-700">
                    +{unansweredQuestions.length - 10} daha
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Flagged Warning */}
          {flaggedCount > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-500" />
              {flaggedCount} soru işaretli olarak bırakılmış
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 bg-muted/30 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Geri Dön
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Send className="w-4 h-4" />
                </motion.div>
                Gönderiliyor...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Sınavı Bitir
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// EXAM ENCOURAGEMENT
// ============================================================================

interface ExamEncouragementProps {
  message: string;
  type?: 'tip' | 'encouragement' | 'warning';
  onDismiss?: () => void;
}

export function ExamEncouragement({
  message,
  type = 'encouragement',
  onDismiss,
}: ExamEncouragementProps) {
  const config = {
    tip: {
      icon: Lightbulb,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      iconColor: 'text-blue-500',
    },
    encouragement: {
      icon: CheckCircle2,
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      iconColor: 'text-emerald-500',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      iconColor: 'text-amber-500',
    },
  };

  const { icon: Icon, bg, border, iconColor } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('rounded-xl p-4 border flex items-center gap-3', bg, border)}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', iconColor)} />
      <p className="text-sm text-foreground flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-black/10 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  QuestionStatus,
  Question,
  ExamState,
  ExamTimerProps,
  QuestionNavigatorProps,
  QuestionCardProps,
  ExamSubmitConfirmationProps,
  ExamEncouragementProps,
};
