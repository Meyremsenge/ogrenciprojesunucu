/**
 * Exam View Component
 * 
 * Sınav çözme ekranı.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QuestionRenderer } from './QuestionRenderer';
import { startExam, submitAnswer, submitExam } from '@/services/examService';
import type { Exam, ExamAttempt, Question, ExamResult } from '@/types/exam';

export function ExamView() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Start exam
  useEffect(() => {
    const initExam = async () => {
      if (!examId) return;
      
      try {
        const data = await startExam(Number(examId));
        setAttempt(data.attempt);
        setQuestions(data.questions);
        
        if (data.attempt.time_remaining) {
          setTimeRemaining(data.attempt.time_remaining);
        }
        
        startTimeRef.current = Date.now();
      } catch (error: any) {
        console.error('Sınav başlatılamadı:', error);
        alert(error.response?.data?.message || 'Sınav başlatılamadı');
        navigate('/exams');
      } finally {
        setLoading(false);
      }
    };
    
    initExam();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [examId, navigate]);

  // Timer
  useEffect(() => {
    if (timeRemaining === null || result) return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining !== null, result]);

  const currentQuestion = questions[currentIndex];

  const handleAnswerChange = useCallback(async (value: any) => {
    if (!attempt || !currentQuestion) return;
    
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    
    // Save answer to server
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      await submitAnswer(
        Number(examId),
        attempt.id,
        currentQuestion.id,
        value,
        timeSpent
      );
    } catch (error) {
      console.error('Cevap kaydedilemedi:', error);
    }
    
    startTimeRef.current = Date.now();
  }, [attempt, currentQuestion, examId]);

  const handleSubmit = async () => {
    if (!attempt || submitting) return;
    
    const confirmed = window.confirm(
      'Sınavı tamamlamak istediğinize emin misiniz? Bu işlem geri alınamaz.'
    );
    if (!confirmed) return;
    
    setSubmitting(true);
    try {
      const examResult = await submitExam(Number(examId), attempt.id);
      setResult(examResult);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } catch (error: any) {
      console.error('Sınav gönderilemedi:', error);
      alert(error.response?.data?.message || 'Sınav gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      startTimeRef.current = Date.now();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Sınav yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Result View
  if (result) {
    return <ExamResultView result={result} />;
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Soru bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sınav
            </h1>
            <p className="text-sm text-gray-500">
              Soru {currentIndex + 1} / {questions.length}
            </p>
          </div>
          
          {/* Timer */}
          {timeRemaining !== null && (
            <div className={`text-2xl font-bold ${
              timeRemaining < 300 ? 'text-red-600 animate-pulse' : 'text-gray-800'
            }`}>
              {formatTime(timeRemaining)}
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Gönderiliyor...' : 'Sınavı Bitir'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Question Navigator */}
        <aside className="w-48 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 sticky top-24">
            <h3 className="font-medium text-gray-700 mb-3">Sorular</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => {
                const isAnswered = answers[q.id] !== undefined;
                const isCurrent = index === currentIndex;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : isAnswered
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 text-sm text-gray-500 space-y-1">
              <div className="flex items-center">
                <span className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></span>
                Cevaplandı ({Object.keys(answers).length})
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 bg-gray-100 rounded mr-2"></span>
                Boş ({questions.length - Object.keys(answers).length})
              </div>
            </div>
          </div>
        </aside>

        {/* Question Content */}
        <main className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <QuestionRenderer
              question={currentQuestion}
              value={answers[currentQuestion.id]}
              onChange={handleAnswerChange}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Önceki
            </button>
            
            <span className="text-gray-500">
              {currentIndex + 1} / {questions.length}
            </span>
            
            <button
              onClick={() => goToQuestion(currentIndex + 1)}
              disabled={currentIndex === questions.length - 1}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki →
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// Exam Result View
// =============================================================================

interface ExamResultViewProps {
  result: ExamResult;
}

function ExamResultView({ result }: ExamResultViewProps) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Result Header */}
        <div className={`rounded-xl shadow-lg p-8 text-center ${
          result.passed
            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
            : 'bg-gradient-to-r from-red-500 to-rose-600'
        } text-white`}>
          <div className="text-6xl mb-4">
            {result.passed ? '🎉' : '📚'}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {result.passed ? 'Tebrikler!' : 'Başarısız'}
          </h1>
          <p className="text-lg opacity-90">
            {result.passed
              ? 'Sınavı başarıyla tamamladınız.'
              : 'Geçme notuna ulaşamadınız. Tekrar deneyin.'}
          </p>
        </div>

        {/* Score Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600">
                {Math.round(result.percentage)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Başarı Oranı</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-gray-800">
                {result.score}/{result.max_score}
              </div>
              <div className="text-sm text-gray-500 mt-1">Puan</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600">
                {result.correct_count}
              </div>
              <div className="text-sm text-gray-500 mt-1">Doğru</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600">
                {result.incorrect_count}
              </div>
              <div className="text-sm text-gray-500 mt-1">Yanlış</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Süre: {result.time_spent_minutes} dakika</span>
              <span>Boş: {result.unanswered_count} soru</span>
            </div>
          </div>
        </div>

        {/* Question Review */}
        {result.questions && result.questions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Soru Detayları</h2>
            <div className="space-y-4">
              {result.questions.map((q, index) => (
                <div
                  key={q.question_id}
                  className={`p-4 rounded-lg border ${
                    q.is_correct
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="font-medium text-gray-700">
                        Soru {index + 1}:
                      </span>
                      <p className="text-gray-800 mt-1 line-clamp-2">
                        {q.question_text}
                      </p>
                    </div>
                    <div className={`ml-4 font-semibold ${
                      q.is_correct ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {q.points_earned}/{q.max_points}
                    </div>
                  </div>
                  {q.feedback && (
                    <p className="mt-2 text-sm text-gray-600">{q.feedback}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={() => navigate('/exams')}
            className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Sınavlara Dön
          </button>
          <button
            onClick={() => navigate('/performance')}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Performansımı Gör
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export default ExamView;
