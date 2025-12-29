/**
 * Performance Dashboard Component
 * 
 * Öğrenci performans gösterge paneli.
 */

import React, { useState, useEffect } from 'react';
import { getMyPerformance, getPeerComparison, getRecommendedQuestions } from '@/services/examService';
import type { StudentPerformanceReport, PeerComparison, Question } from '@/types/exam';

interface PerformanceDashboardProps {
  courseId?: number;
}

export function PerformanceDashboard({ courseId }: PerformanceDashboardProps) {
  const [performance, setPerformance] = useState<StudentPerformanceReport | null>(null);
  const [peerComparison, setPeerComparison] = useState<PeerComparison | null>(null);
  const [recommendedQuestions, setRecommendedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [courseId, selectedDays]);

  const loadData = async () => {
    setLoading(true);
    try {
      const perfData = await getMyPerformance({ course_id: courseId, days: selectedDays });
      setPerformance(perfData);

      if (courseId) {
        const comparison = await getPeerComparison(courseId);
        setPeerComparison(comparison);
      }

      const recommended = await getRecommendedQuestions({ course_id: courseId, limit: 5 });
      setRecommendedQuestions(recommended);
    } catch (error) {
      console.error('Performans verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="text-center py-12 text-gray-500">
        Performans verisi bulunamadı.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Performans Özeti
        </h2>
        <select
          value={selectedDays}
          onChange={(e) => setSelectedDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Son 7 gün</option>
          <option value={30}>Son 30 gün</option>
          <option value={90}>Son 90 gün</option>
          <option value={365}>Son 1 yıl</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Genel Skor"
          value={`${Math.round(performance.overall_score)}`}
          subtitle={`${getPerformanceLevelLabel(performance.performance_level)}`}
          icon="📊"
          color={getPerformanceLevelColor(performance.performance_level)}
        />
        <StatCard
          title="Başarı Oranı"
          value={`%${Math.round(performance.overall_success_rate)}`}
          subtitle={`${performance.correct_answers}/${performance.total_questions_attempted} doğru`}
          icon="✓"
          color="green"
        />
        <StatCard
          title="Trend"
          value={getTrendLabel(performance.trend)}
          subtitle={`${performance.trend_score_change > 0 ? '+' : ''}${Math.round(performance.trend_score_change)} puan`}
          icon={getTrendIcon(performance.trend)}
          color={getTrendColor(performance.trend)}
        />
        <StatCard
          title="Sınav Geçme"
          value={`%${Math.round(performance.exam_pass_rate)}`}
          subtitle={`${performance.exams_passed}/${performance.exams_taken} geçti`}
          icon="🎓"
          color="purple"
        />
      </div>

      {/* Peer Comparison */}
      {peerComparison && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Akran Karşılaştırması</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{Math.round(peerComparison.user_score)}</div>
              <div className="text-sm text-gray-500">Senin Skorun</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">{Math.round(peerComparison.class_average)}</div>
              <div className="text-sm text-gray-500">Sınıf Ortalaması</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">%{Math.round(peerComparison.percentile)}</div>
              <div className="text-sm text-gray-500">Yüzdelik Dilim</div>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-600">
            {peerComparison.comparison_message}
          </div>
          <div className="mt-2 text-center text-sm text-gray-500">
            Sıralama: {peerComparison.rank} / {peerComparison.total_students}
          </div>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">💪</span> Güçlü Yönler
          </h3>
          <div className="space-y-3">
            {performance.strengths.length > 0 ? (
              performance.strengths.map((strength, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-green-800">{strength.area}</div>
                    <div className="text-sm text-green-600">{strength.description}</div>
                  </div>
                  <div className="text-green-700 font-semibold">
                    %{Math.round(strength.success_rate)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                Henüz yeterli veri yok
              </p>
            )}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">📚</span> Geliştirilecek Alanlar
          </h3>
          <div className="space-y-3">
            {performance.weaknesses.length > 0 ? (
              performance.weaknesses.map((weakness, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-orange-800">{weakness.area}</div>
                    <div className="text-sm text-orange-600">{weakness.description}</div>
                  </div>
                  <div className="text-orange-700 font-semibold">
                    %{Math.round(weakness.success_rate)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                Harika! Zayıf nokta bulunamadı
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Topic Performance Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Konu Bazlı Performans</h3>
        <div className="space-y-4">
          {performance.topic_performances.map((topic) => (
            <div key={topic.topic_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{topic.topic_name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${getTrendColor(topic.trend)}`}>
                    {getTrendIcon(topic.trend)}
                  </span>
                  <span className="font-semibold">%{Math.round(topic.success_rate)}</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${getProgressBarColor(topic.success_rate)}`}
                  style={{ width: `${topic.success_rate}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500">
                {topic.total_attempts} deneme · Ort. {Math.round(topic.average_time_seconds)}s
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Patterns */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Öğrenme Desenleri</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <PatternCard
            icon="🕐"
            label="En Verimli Saat"
            value={performance.learning_pattern.best_time_of_day}
          />
          <PatternCard
            icon="📅"
            label="En Aktif Gün"
            value={performance.learning_pattern.most_active_day}
          />
          <PatternCard
            icon="⚡"
            label="Ortalama Süre"
            value={`${Math.round(performance.learning_pattern.average_answer_time)}s`}
          />
          <PatternCard
            icon="🔥"
            label="Çalışma Serisi"
            value={`${performance.learning_pattern.streak_days} gün`}
          />
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Öneriler</h3>
        <ul className="space-y-2">
          {performance.recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2">💡</span>
              <span>{recommendation}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommended Questions */}
      {recommendedQuestions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Önerilen Sorular</h3>
          <div className="space-y-3">
            {recommendedQuestions.map((question) => (
              <div
                key={question.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800 line-clamp-1">
                    {question.question_text}
                  </p>
                  <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                    <span>{getQuestionTypeLabel(question.question_type)}</span>
                    <span>·</span>
                    <span>{getDifficultyLabel(question.difficulty)}</span>
                    <span>·</span>
                    <span>{question.points} puan</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Çöz
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <span className={`w-10 h-10 flex items-center justify-center rounded-full ${colorClasses[color]}`}>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

interface PatternCardProps {
  icon: string;
  label: string;
  value: string;
}

function PatternCard({ icon, label, value }: PatternCardProps) {
  return (
    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-semibold text-gray-800">{value}</div>
    </div>
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

function getPerformanceLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    excellent: 'Mükemmel',
    good: 'İyi',
    average: 'Ortalama',
    below_average: 'Ortalamanın Altı',
    needs_improvement: 'Geliştirilmeli',
  };
  return labels[level] || level;
}

function getPerformanceLevelColor(level: string): string {
  const colors: Record<string, string> = {
    excellent: 'green',
    good: 'blue',
    average: 'yellow',
    below_average: 'yellow',
    needs_improvement: 'red',
  };
  return colors[level] || 'gray';
}

function getTrendLabel(trend: string): string {
  const labels: Record<string, string> = {
    improving: 'Yükseliyor',
    stable: 'Sabit',
    declining: 'Düşüyor',
  };
  return labels[trend] || trend;
}

function getTrendIcon(trend: string): string {
  const icons: Record<string, string> = {
    improving: '📈',
    stable: '➡️',
    declining: '📉',
  };
  return icons[trend] || '';
}

function getTrendColor(trend: string): string {
  const colors: Record<string, string> = {
    improving: 'green',
    stable: 'gray',
    declining: 'red',
  };
  return colors[trend] || 'gray';
}

function getProgressBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-blue-500';
  if (percentage >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    multiple_choice: 'Çoktan Seçmeli',
    multiple_select: 'Çoklu Seçim',
    true_false: 'Doğru/Yanlış',
    short_answer: 'Kısa Cevap',
    essay: 'Uzun Cevap',
    fill_in_blank: 'Boşluk Doldurma',
    matching: 'Eşleştirme',
    ordering: 'Sıralama',
    numeric: 'Sayısal',
    code: 'Kod Yazma',
  };
  return labels[type] || type;
}

function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    very_easy: 'Çok Kolay',
    easy: 'Kolay',
    medium: 'Orta',
    hard: 'Zor',
    very_hard: 'Çok Zor',
  };
  return labels[difficulty] || difficulty;
}

export default PerformanceDashboard;
