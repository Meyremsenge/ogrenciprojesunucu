/**
 * Exam Results Page
 * Sınav sonuçları sayfası
 */

import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BarChart3,
  Eye,
  Download,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock exam result
const EXAM_RESULT = {
  id: 1,
  title: 'React Temelleri Değerlendirmesi',
  course: 'React ile Modern Web Geliştirme',
  completedAt: '2024-01-20T14:30:00',
  duration: 25, // minutes taken
  totalDuration: 30, // total allowed
  score: 85,
  passingScore: 70,
  passed: true,
  totalQuestions: 20,
  correctAnswers: 17,
  incorrectAnswers: 3,
  ranking: 15,
  totalParticipants: 250,
  percentile: 94,
  categories: [
    { name: 'React Hooks', correct: 5, total: 6 },
    { name: 'JSX & Components', correct: 4, total: 4 },
    { name: 'State Management', correct: 3, total: 4 },
    { name: 'Routing', correct: 3, total: 3 },
    { name: 'Performance', correct: 2, total: 3 },
  ],
  questions: [
    {
      id: 1,
      text: 'React\'ta state yönetimi için hangi hook kullanılır?',
      userAnswer: 'useState',
      correctAnswer: 'useState',
      isCorrect: true,
    },
    {
      id: 2,
      text: 'Aşağıdakilerden hangisi React\'ın temel özelliklerinden biridir?',
      userAnswer: 'Virtual DOM',
      correctAnswer: 'Virtual DOM',
      isCorrect: true,
    },
    {
      id: 3,
      text: 'useEffect hook\'u ne zaman çalışır?',
      userAnswer: 'Sadece component mount olduğunda',
      correctAnswer: 'Dependency array\'e bağlı olarak',
      isCorrect: false,
    },
    {
      id: 4,
      text: 'JSX nedir?',
      userAnswer: 'JavaScript için syntax extension',
      correctAnswer: 'JavaScript için syntax extension',
      isCorrect: true,
    },
    {
      id: 5,
      text: 'React component\'ları arasında veri paylaşımı için hangisi kullanılmaz?',
      userAnswer: 'SQL Queries',
      correctAnswer: 'SQL Queries',
      isCorrect: true,
    },
  ],
};

export default function ExamResultsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to="/exams"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Sınavlara Dön
      </Link>

      {/* Result Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Score Circle */}
          <div className="relative w-32 h-32 flex-shrink-0 mx-auto md:mx-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(EXAM_RESULT.score / 100) * 352} 352`}
                className={cn(
                  EXAM_RESULT.passed ? 'text-green-500' : 'text-red-500'
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                'text-3xl font-bold',
                EXAM_RESULT.passed ? 'text-green-500' : 'text-red-500'
              )}>
                {EXAM_RESULT.score}
              </span>
              <span className="text-sm text-muted-foreground">puan</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              {EXAM_RESULT.passed ? (
                <span className="badge badge-success flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Başarılı
                </span>
              ) : (
                <span className="badge badge-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Başarısız
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold">{EXAM_RESULT.title}</h1>
            <p className="text-muted-foreground">{EXAM_RESULT.course}</p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {EXAM_RESULT.duration} dakikada tamamlandı
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Sıralama: {EXAM_RESULT.ranking}/{EXAM_RESULT.totalParticipants}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Award className="h-4 w-4" />
                İlk %{100 - EXAM_RESULT.percentile} içinde
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                'border hover:bg-muted transition-colors'
              )}
            >
              <Download className="h-4 w-4" />
              PDF İndir
            </button>
            <button
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                'border hover:bg-muted transition-colors'
              )}
            >
              <Share2 className="h-4 w-4" />
              Paylaş
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-6"
        >
          {/* Summary */}
          <div className="card p-4">
            <h3 className="font-semibold mb-4">Özet</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Toplam Soru</span>
                <span className="font-medium">{EXAM_RESULT.totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Doğru</span>
                <span className="font-medium text-green-500">{EXAM_RESULT.correctAnswers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Yanlış</span>
                <span className="font-medium text-red-500">{EXAM_RESULT.incorrectAnswers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Geçme Notu</span>
                <span className="font-medium">{EXAM_RESULT.passingScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tamamlanma</span>
                <span className="font-medium">
                  {new Date(EXAM_RESULT.completedAt).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
          </div>

          {/* Category Performance */}
          <div className="card p-4">
            <h3 className="font-semibold mb-4">Kategori Performansı</h3>
            <div className="space-y-4">
              {EXAM_RESULT.categories.map((category) => {
                const percentage = Math.round((category.correct / category.total) * 100);
                return (
                  <div key={category.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{category.name}</span>
                      <span className="text-muted-foreground">
                        {category.correct}/{category.total}
                      </span>
                    </div>
                    <div className="progress">
                      <div
                        className={cn(
                          'progress-bar',
                          percentage >= 70 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Question Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="card p-4">
            <h3 className="font-semibold mb-4">Soru İncelemesi</h3>
            <div className="space-y-4">
              {EXAM_RESULT.questions.map((question, index) => (
                <div
                  key={question.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    question.isCorrect
                      ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/10'
                      : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      question.isCorrect ? 'bg-green-500' : 'bg-red-500'
                    )}>
                      {question.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : (
                        <XCircle className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        <span className="text-muted-foreground">Soru {index + 1}:</span>{' '}
                        {question.text}
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Cevabınız:</span>{' '}
                          <span className={cn(
                            'font-medium',
                            question.isCorrect ? 'text-green-600' : 'text-red-600'
                          )}>
                            {question.userAnswer}
                          </span>
                        </p>
                        {!question.isCorrect && (
                          <p>
                            <span className="text-muted-foreground">Doğru cevap:</span>{' '}
                            <span className="font-medium text-green-600">
                              {question.correctAnswer}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View All Button */}
            <button
              className={cn(
                'w-full mt-4 py-3 rounded-lg font-medium',
                'border hover:bg-muted transition-colors',
                'flex items-center justify-center gap-2'
              )}
            >
              <Eye className="h-4 w-4" />
              Tüm Soruları Görüntüle ({EXAM_RESULT.totalQuestions})
            </button>
          </div>
        </motion.div>
      </div>

      {/* Retry Button */}
      {!EXAM_RESULT.passed && (
        <div className="text-center">
          <Link
            to={`/exams/${id}/take`}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
            )}
          >
            Tekrar Dene
          </Link>
        </div>
      )}
    </div>
  );
}
