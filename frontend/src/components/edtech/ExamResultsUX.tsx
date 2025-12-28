/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 EXAM RESULTS UX - Sonuç ve Değerlendirme Ekranları
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * EdTech sonuç görüntüleme UX bileşenleri:
 * - Score Display (motivasyonel)
 * - Question Review
 * - Performance Analytics
 * - Achievement Badges
 * - Improvement Suggestions
 * 
 * Tasarım Kararları:
 * - Pozitif vurgulu skorlama → düşük puanda bile cesaret verir
 * - Detaylı analiz → gelişim alanlarını gösterir
 * - Başarı rozetleri → motivasyonu artırır
 * - Yapıcı öneriler → ileriye dönük rehberlik
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart,
  Eye,
  EyeOff,
  ArrowRight,
  RotateCcw,
  Share2,
  Download,
  Award,
  Zap,
  Flame,
  Star,
  BookOpen,
  Lightbulb,
  Medal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ExamResult {
  examId: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  timeTaken: number; // minutes
  timeLimit: number; // minutes
  submittedAt: Date;
  passingScore: number;
  isPassed: boolean;
}

interface QuestionResult {
  id: string | number;
  text: string;
  userAnswer?: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: 'trophy' | 'star' | 'flame' | 'zap' | 'medal' | 'target';
  color: string;
  isNew?: boolean;
}

// ============================================================================
// SCORE DISPLAY
// ============================================================================

interface ScoreDisplayProps {
  result: ExamResult;
  showAnimation?: boolean;
  className?: string;
}

export function ScoreDisplay({
  result,
  showAnimation = true,
  className,
}: ScoreDisplayProps) {
  const scoreColor = useMemo(() => {
    if (result.score >= 90) return 'text-emerald-500';
    if (result.score >= 70) return 'text-blue-500';
    if (result.score >= 50) return 'text-amber-500';
    return 'text-red-500';
  }, [result.score]);

  const getMessage = () => {
    if (result.score >= 90) return { emoji: '🎉', text: 'Mükemmel! Harika bir performans!' };
    if (result.score >= 80) return { emoji: '🌟', text: 'Çok İyi! Başarılı bir sınav!' };
    if (result.score >= 70) return { emoji: '👏', text: 'İyi! Geçme notunu yakaladın!' };
    if (result.score >= 60) return { emoji: '💪', text: 'Fena değil! Biraz daha çalışmayla...' };
    if (result.score >= 50) return { emoji: '📚', text: 'Geçtin! Ama geliştirebilirsin.' };
    return { emoji: '🎯', text: 'Endişelenme! Her deneme seni ileriye taşır.' };
  };

  const message = getMessage();

  return (
    <motion.div
      initial={showAnimation ? { scale: 0.8, opacity: 0 } : undefined}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.5 }}
      className={cn('text-center', className)}
    >
      {/* Score Circle */}
      <div className="relative inline-block mb-6">
        <svg className="w-48 h-48 transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <motion.circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className={scoreColor}
            initial={{ strokeDasharray: '0 553' }}
            animate={{
              strokeDasharray: showAnimation
                ? `${(result.score / 100) * 553} 553`
                : `${(result.score / 100) * 553} 553`,
            }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={showAnimation ? { opacity: 0, y: 20 } : undefined}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className={cn('text-5xl font-bold', scoreColor)}
          >
            {result.score}
          </motion.span>
          <span className="text-muted-foreground text-lg">/ 100</span>
        </div>
      </div>

      {/* Message */}
      <motion.div
        initial={showAnimation ? { opacity: 0, y: 20 } : undefined}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <span className="text-4xl mb-2 block">{message.emoji}</span>
        <h2 className="text-2xl font-bold text-foreground mb-2">{message.text}</h2>
        
        {/* Pass/Fail Badge */}
        <div className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
          result.isPassed
            ? 'bg-emerald-500/10 text-emerald-600'
            : 'bg-amber-500/10 text-amber-600'
        )}>
          {result.isPassed ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Geçti (Min: %{result.passingScore})
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              Geçemedi (Gerekli: %{result.passingScore})
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// RESULTS SUMMARY
// ============================================================================

interface ResultsSummaryProps {
  result: ExamResult;
  className?: string;
}

export function ResultsSummary({ result, className }: ResultsSummaryProps) {
  const stats = [
    {
      label: 'Doğru',
      value: result.correctAnswers,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Yanlış',
      value: result.wrongAnswers,
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Boş',
      value: result.unanswered,
      icon: AlertCircle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Süre',
      value: `${result.timeTaken} dk`,
      icon: Clock,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className={cn(
              'p-4 rounded-xl border border-border',
              stat.bg
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn('w-5 h-5', stat.color)} />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className={cn('text-2xl font-bold', stat.color)}>
              {stat.value}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================================
// QUESTION REVIEW
// ============================================================================

interface QuestionReviewProps {
  questions: QuestionResult[];
  showCorrectAnswers?: boolean;
  className?: string;
}

export function QuestionReview({
  questions,
  showCorrectAnswers = true,
  className,
}: QuestionReviewProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all');

  const filteredQuestions = useMemo(() => {
    if (filter === 'all') return questions;
    if (filter === 'correct') return questions.filter((q) => q.isCorrect);
    return questions.filter((q) => !q.isCorrect);
  }, [questions, filter]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        {[
          { value: 'all', label: 'Tümü', count: questions.length },
          { value: 'correct', label: 'Doğru', count: questions.filter((q) => q.isCorrect).length },
          { value: 'wrong', label: 'Yanlış', count: questions.filter((q) => !q.isCorrect).length },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as typeof filter)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              filter === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              filter === tab.value ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/20'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filteredQuestions.map((question, index) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            {/* Question Header */}
            <button
              onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
              className="w-full p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors text-left"
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                question.isCorrect ? 'bg-emerald-500/10' : 'bg-red-500/10'
              )}>
                {question.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-1">
                  Soru {index + 1}
                  {question.topic && (
                    <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
                      {question.topic}
                    </span>
                  )}
                </p>
                <p className="text-foreground line-clamp-2">{question.text}</p>
              </div>

              {expandedId === question.id ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
              {expandedId === question.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border"
                >
                  <div className="p-4 space-y-4">
                    {/* User Answer */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'px-3 py-1 rounded text-xs font-medium',
                        question.isCorrect
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-red-500/10 text-red-600'
                      )}>
                        Senin Cevabın
                      </div>
                      <p className="text-foreground">
                        {question.userAnswer || '(Boş bırakıldı)'}
                      </p>
                    </div>

                    {/* Correct Answer */}
                    {showCorrectAnswers && !question.isCorrect && (
                      <div className="flex items-start gap-3">
                        <div className="px-3 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600">
                          Doğru Cevap
                        </div>
                        <p className="text-foreground">{question.correctAnswer}</p>
                      </div>
                    )}

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                        <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-2">
                          <Lightbulb className="w-4 h-4" />
                          Açıklama
                        </div>
                        <p className="text-sm text-foreground">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ACHIEVEMENT BADGES
// ============================================================================

interface AchievementBadgesProps {
  achievements: Achievement[];
  className?: string;
}

export function AchievementBadges({ achievements, className }: AchievementBadgesProps) {
  const iconMap = {
    trophy: Trophy,
    star: Star,
    flame: Flame,
    zap: Zap,
    medal: Medal,
    target: Target,
  };

  if (achievements.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Award className="w-5 h-5 text-amber-500" />
        Kazanılan Başarılar
      </h3>
      
      <div className="flex flex-wrap gap-3">
        {achievements.map((achievement, index) => {
          const Icon = iconMap[achievement.icon];
          
          return (
            <motion.div
              key={achievement.id}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2 * index, type: 'spring' }}
              className={cn(
                'relative p-4 rounded-xl border-2 text-center min-w-[120px]',
                achievement.isNew
                  ? 'border-amber-500 bg-amber-500/5'
                  : 'border-border bg-card'
              )}
            >
              {achievement.isNew && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                  Yeni!
                </span>
              )}
              
              <div
                className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                style={{ backgroundColor: `${achievement.color}20` }}
              >
                <Icon
                  className="w-6 h-6"
                  style={{ color: achievement.color }}
                />
              </div>
              
              <p className="font-medium text-foreground text-sm">{achievement.title}</p>
              <p className="text-xs text-muted-foreground">{achievement.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// IMPROVEMENT SUGGESTIONS
// ============================================================================

interface ImprovementSuggestionsProps {
  weakTopics: { topic: string; score: number }[];
  strongTopics: { topic: string; score: number }[];
  recommendations: string[];
  className?: string;
}

export function ImprovementSuggestions({
  weakTopics,
  strongTopics,
  recommendations,
  className,
}: ImprovementSuggestionsProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Topic Analysis */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Strong Topics */}
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <h4 className="font-medium text-emerald-600 flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" />
            Güçlü Olduğun Konular
          </h4>
          <div className="space-y-2">
            {strongTopics.map((topic) => (
              <div key={topic.topic} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{topic.topic}</span>
                <span className="text-sm font-medium text-emerald-600">%{topic.score}</span>
              </div>
            ))}
            {strongTopics.length === 0 && (
              <p className="text-sm text-muted-foreground">Henüz veri yok</p>
            )}
          </div>
        </div>

        {/* Weak Topics */}
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <h4 className="font-medium text-amber-600 flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4" />
            Geliştirmen Gereken Konular
          </h4>
          <div className="space-y-2">
            {weakTopics.map((topic) => (
              <div key={topic.topic} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{topic.topic}</span>
                <span className="text-sm font-medium text-amber-600">%{topic.score}</span>
              </div>
            ))}
            {weakTopics.length === 0 && (
              <p className="text-sm text-muted-foreground">Tebrikler! Zayıf konu yok.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <h4 className="font-medium text-blue-600 flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4" />
            Öneriler
          </h4>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                <ArrowRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RESULTS ACTIONS
// ============================================================================

interface ResultsActionsProps {
  onRetry?: () => void;
  onReview?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onBack: () => void;
  canRetry?: boolean;
}

export function ResultsActions({
  onRetry,
  onReview,
  onShare,
  onDownload,
  onBack,
  canRetry = true,
}: ResultsActionsProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {canRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Tekrar Dene
        </button>
      )}
      
      {onReview && (
        <button
          onClick={onReview}
          className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Cevapları İncele
        </button>
      )}
      
      {onShare && (
        <button
          onClick={onShare}
          className="px-4 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
      )}
      
      {onDownload && (
        <button
          onClick={onDownload}
          className="px-4 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      )}
      
      <button
        onClick={onBack}
        className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Geri Dön
      </button>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  ExamResult,
  QuestionResult,
  Achievement,
  ScoreDisplayProps,
  ResultsSummaryProps,
  QuestionReviewProps,
  AchievementBadgesProps,
  ImprovementSuggestionsProps,
  ResultsActionsProps,
};
