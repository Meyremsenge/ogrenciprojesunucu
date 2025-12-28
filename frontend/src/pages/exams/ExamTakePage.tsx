/**
 * Exam Take Page
 * Sınav çözme sayfası
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock exam data
const EXAM = {
  id: 1,
  title: 'React Temelleri Değerlendirmesi',
  course: 'React ile Modern Web Geliştirme',
  duration: 30, // minutes
  questions: [
    {
      id: 1,
      text: 'React\'ta state yönetimi için hangi hook kullanılır?',
      type: 'single',
      options: [
        { id: 'a', text: 'useEffect' },
        { id: 'b', text: 'useState' },
        { id: 'c', text: 'useContext' },
        { id: 'd', text: 'useReducer' },
      ],
      correctAnswer: 'b',
    },
    {
      id: 2,
      text: 'Aşağıdakilerden hangisi React\'ın temel özelliklerinden biridir?',
      type: 'single',
      options: [
        { id: 'a', text: 'Two-way data binding' },
        { id: 'b', text: 'Virtual DOM' },
        { id: 'c', text: 'Built-in routing' },
        { id: 'd', text: 'Template syntax' },
      ],
      correctAnswer: 'b',
    },
    {
      id: 3,
      text: 'useEffect hook\'u ne zaman çalışır?',
      type: 'single',
      options: [
        { id: 'a', text: 'Sadece component mount olduğunda' },
        { id: 'b', text: 'Sadece state değiştiğinde' },
        { id: 'c', text: 'Her render\'dan sonra' },
        { id: 'd', text: 'Dependency array\'e bağlı olarak' },
      ],
      correctAnswer: 'd',
    },
    {
      id: 4,
      text: 'JSX nedir?',
      type: 'single',
      options: [
        { id: 'a', text: 'Yeni bir programlama dili' },
        { id: 'b', text: 'JavaScript için syntax extension' },
        { id: 'c', text: 'CSS framework' },
        { id: 'd', text: 'Test kütüphanesi' },
      ],
      correctAnswer: 'b',
    },
    {
      id: 5,
      text: 'React component\'ları arasında veri paylaşımı için hangisi kullanılmaz?',
      type: 'single',
      options: [
        { id: 'a', text: 'Props' },
        { id: 'b', text: 'Context API' },
        { id: 'c', text: 'Redux' },
        { id: 'd', text: 'SQL Queries' },
      ],
      correctAnswer: 'd',
    },
  ],
};

export default function ExamTakePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(EXAM.duration * 60); // in seconds
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId: number, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const toggleFlag = (questionId: number) => {
    setFlagged((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    navigate(`/exams/${id}/results`);
  };

  const question = EXAM.questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / EXAM.questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold">{EXAM.title}</h1>
              <p className="text-sm text-muted-foreground">{EXAM.course}</p>
            </div>

            {/* Timer */}
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg',
              timeLeft <= 300 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted'
            )}>
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>{answeredCount}/{EXAM.questions.length} soru cevaplandı</span>
              <span>%{Math.round(progress)}</span>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question Navigator */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="card p-4 sticky top-32">
              <h3 className="font-semibold mb-3">Soru Navigasyonu</h3>
              <div className="grid grid-cols-5 gap-2">
                {EXAM.questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestion(index)}
                    className={cn(
                      'w-10 h-10 rounded-lg text-sm font-medium transition-colors relative',
                      currentQuestion === index && 'ring-2 ring-primary',
                      answers[q.id] ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted',
                      flagged.has(q.id) && 'ring-2 ring-yellow-500'
                    )}
                  >
                    {index + 1}
                    {flagged.has(q.id) && (
                      <Flag className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30" />
                  <span>Cevaplandı</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-muted" />
                  <span>Cevaplanmadı</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-yellow-500" />
                  <span>İşaretlendi</span>
                </div>
              </div>

              <button
                onClick={() => setShowSubmitModal(true)}
                className={cn(
                  'w-full mt-6 py-3 rounded-lg font-medium',
                  'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                )}
              >
                Sınavı Bitir
              </button>
            </div>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card p-6"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="badge badge-primary">
                    Soru {currentQuestion + 1} / {EXAM.questions.length}
                  </span>
                  <button
                    onClick={() => toggleFlag(question.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                      flagged.has(question.id)
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Flag className="h-4 w-4" />
                    {flagged.has(question.id) ? 'İşareti Kaldır' : 'İşaretle'}
                  </button>
                </div>

                {/* Question Text */}
                <h2 className="text-lg font-medium mb-6">{question.text}</h2>

                {/* Options */}
                <div className="space-y-3">
                  {question.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(question.id, option.id)}
                      className={cn(
                        'w-full p-4 rounded-lg border text-left transition-all',
                        'hover:border-primary hover:bg-primary/5',
                        answers[question.id] === option.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium',
                          answers[question.id] === option.id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        )}>
                          {option.id.toUpperCase()}
                        </div>
                        <span>{option.text}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                  <button
                    onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg',
                      'border hover:bg-muted transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Önceki
                  </button>

                  <button
                    onClick={() =>
                      setCurrentQuestion((prev) =>
                        Math.min(EXAM.questions.length - 1, prev + 1)
                      )
                    }
                    disabled={currentQuestion === EXAM.questions.length - 1}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg',
                      'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    Sonraki
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <h2 className="text-lg font-semibold">Sınavı Bitirmek İstiyor musunuz?</h2>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span>Cevaplanan sorular:</span>
                <span className="font-medium">{answeredCount}/{EXAM.questions.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>İşaretlenen sorular:</span>
                <span className="font-medium">{flagged.size}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Kalan süre:</span>
                <span className="font-medium">{formatTime(timeLeft)}</span>
              </div>
            </div>

            {answeredCount < EXAM.questions.length && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-700 dark:text-yellow-400 mb-4">
                <strong>Uyarı:</strong> Henüz tüm soruları cevaplamadınız!
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className={cn(
                  'flex-1 py-2 rounded-lg font-medium',
                  'border hover:bg-muted transition-colors'
                )}
              >
                Geri Dön
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  'flex-1 py-2 rounded-lg font-medium',
                  'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                  'disabled:opacity-50'
                )}
              >
                {isSubmitting ? 'Gönderiliyor...' : 'Sınavı Bitir'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
