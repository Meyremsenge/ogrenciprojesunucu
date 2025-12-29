/**
 * Exams Page - API Entegrasyonlu
 * Sınavlar listesi
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Clock,
  Calendar,
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  Play,
  Eye,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getExams, getMyAttempts } from '@/services/examService';

interface Exam {
  id: number;
  title: string;
  course_title?: string;
  course?: { title: string };
  exam_type: string;
  question_count: number;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  status: string;
  due_date?: string;
  end_time?: string;
  start_time?: string;
  // Computed fields
  usedAttempts?: number;
  lastScore?: number;
  userStatus?: string;
}

const FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'available', label: 'Alınabilir' },
  { key: 'upcoming', label: 'Yaklaşan' },
  { key: 'completed', label: 'Tamamlanan' },
  { key: 'failed', label: 'Başarısız' },
];

export default function ExamsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Sınavları çek
  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => getExams({ status: 'published' }),
  });

  // Kullanıcının denemelerini çek
  const { data: attemptsData } = useQuery({
    queryKey: ['myAttempts'],
    queryFn: () => getMyAttempts(),
  });

  // Sınavları kullanıcı durumlarıyla birleştir
  const examsWithStatus = useMemo(() => {
    const exams = examsData?.data?.exams || [];
    const attempts = attemptsData || [];

    return exams.map((exam: Exam) => {
      const examAttempts = attempts.filter((a: any) => a.exam_id === exam.id);
      const usedAttempts = examAttempts.length;
      const lastAttempt = examAttempts[examAttempts.length - 1];
      const lastScore = lastAttempt?.score;
      
      const now = new Date();
      const startDate = exam.start_time ? new Date(exam.start_time) : null;
      const dueDate = exam.due_date || exam.end_time ? new Date(exam.due_date || exam.end_time!) : null;
      
      let userStatus = 'available';
      if (startDate && startDate > now) {
        userStatus = 'upcoming';
      } else if (lastScore !== undefined) {
        userStatus = lastScore >= exam.passing_score ? 'completed' : 'failed';
      } else if (dueDate && dueDate < now) {
        userStatus = 'expired';
      }

      return {
        ...exam,
        usedAttempts,
        lastScore,
        userStatus,
        course: exam.course_title || exam.course?.title || 'Kurs',
        type: exam.exam_type || 'quiz',
        questions: exam.question_count || 0,
        duration: exam.duration_minutes || 0,
        passingScore: exam.passing_score || 50,
        attempts: exam.max_attempts || 1,
        dueDate: exam.due_date || exam.end_time || new Date().toISOString(),
      };
    });
  }, [examsData, attemptsData]);

  const filteredExams = useMemo(() => {
    return examsWithStatus.filter((exam: any) => {
      const matchesSearch =
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.course && exam.course.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = selectedFilter === 'all' || exam.userStatus === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [examsWithStatus, searchQuery, selectedFilter]);

  // Stats hesapla
  const stats = useMemo(() => ({
    total: examsWithStatus.length,
    available: examsWithStatus.filter((e: any) => e.userStatus === 'available').length,
    upcoming: examsWithStatus.filter((e: any) => e.userStatus === 'upcoming').length,
    completed: examsWithStatus.filter((e: any) => e.userStatus === 'completed').length,
  }), [examsWithStatus]);

  const getStatusBadge = (status: string, lastScore?: number, passingScore?: number) => {
    switch (status) {
      case 'available':
        return <span className="badge badge-primary">Alınabilir</span>;
      case 'upcoming':
        return <span className="badge bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Yaklaşan</span>;
      case 'completed':
        return <span className="badge badge-success">Tamamlandı</span>;
      case 'failed':
        return <span className="badge badge-destructive">Başarısız</span>;
      case 'expired':
        return <span className="badge bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Süresi Doldu</span>;
      default:
        return null;
    }
  };

  const getExamTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'Quiz';
      case 'exam':
        return 'Sınav';
      case 'midterm':
        return 'Ara Sınav';
      case 'final':
        return 'Final';
      case 'assignment':
        return 'Ödev';
      default:
        return type;
    }
  };

  // Loading state
  if (examsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Sınavlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Sınavlarım</h1>
        <p className="text-muted-foreground mt-1">
          Quiz, sınav ve ödevlerinizi buradan takip edebilirsiniz
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam', value: stats.total, icon: FileQuestion, color: 'text-primary' },
          { label: 'Alınabilir', value: stats.available, icon: Play, color: 'text-green-500' },
          { label: 'Yaklaşan', value: stats.upcoming, icon: Calendar, color: 'text-yellow-500' },
          { label: 'Tamamlanan', value: stats.completed, icon: CheckCircle2, color: 'text-blue-500' },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={cn('h-8 w-8', stat.color)} />
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sınav veya kurs ara..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
                selectedFilter === filter.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exams List */}
      <div className="space-y-4">
        {filteredExams.map((exam: any, index: number) => (
          <motion.div
            key={exam.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="card p-4 hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                  exam.userStatus === 'available' && 'bg-green-100 dark:bg-green-900/30',
                  exam.userStatus === 'upcoming' && 'bg-yellow-100 dark:bg-yellow-900/30',
                  exam.userStatus === 'completed' && 'bg-blue-100 dark:bg-blue-900/30',
                  exam.userStatus === 'failed' && 'bg-red-100 dark:bg-red-900/30',
                  exam.userStatus === 'expired' && 'bg-gray-100 dark:bg-gray-900/30',
                )}>
                  <FileQuestion className={cn(
                    'h-6 w-6',
                    exam.userStatus === 'available' && 'text-green-600 dark:text-green-400',
                    exam.userStatus === 'upcoming' && 'text-yellow-600 dark:text-yellow-400',
                    exam.userStatus === 'completed' && 'text-blue-600 dark:text-blue-400',
                    exam.userStatus === 'failed' && 'text-red-600 dark:text-red-400',
                    exam.userStatus === 'expired' && 'text-gray-600 dark:text-gray-400',
                  )} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{exam.title}</h3>
                    {getStatusBadge(exam.userStatus, exam.lastScore, exam.passingScore)}
                  </div>
                  <p className="text-sm text-muted-foreground">{exam.course}</p>

                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="badge bg-muted">{getExamTypeLabel(exam.type)}</span>
                    <span className="flex items-center gap-1">
                      <FileQuestion className="h-4 w-4" />
                      {exam.questions} soru
                    </span>
                    {exam.duration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {exam.duration} dakika
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Son tarih: {new Date(exam.dueDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-4">
                  {exam.lastScore !== undefined && (
                    <div className="text-center">
                      <div className={cn(
                        'text-2xl font-bold',
                        exam.lastScore >= exam.passingScore ? 'text-green-500' : 'text-red-500'
                      )}>
                        {exam.lastScore}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Geçme: {exam.passingScore}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {exam.userStatus === 'available' && exam.usedAttempts < exam.attempts && (
                      <Link
                        to={`/exams/${exam.id}/take`}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                          'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                        )}
                      >
                        <Play className="h-4 w-4" />
                        Sınava Gir
                      </Link>
                    )}

                    {exam.userStatus === 'failed' && exam.usedAttempts < exam.attempts && (
                      <Link
                        to={`/exams/${exam.id}/take`}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                          'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                        )}
                      >
                        <Play className="h-4 w-4" />
                        Tekrar Dene
                      </Link>
                    )}

                    {(exam.userStatus === 'completed' || exam.userStatus === 'failed') && (
                      <Link
                        to={`/exams/${exam.id}/results`}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                          'border hover:bg-muted transition-colors'
                        )}
                      >
                        <Eye className="h-4 w-4" />
                        Sonuçları Gör
                      </Link>
                    )}

                    {exam.userStatus === 'upcoming' && (
                      <span className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        Henüz başlamadı
                      </span>
                    )}

                    {exam.userStatus === 'expired' && (
                      <span className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        Süresi doldu
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Attempts Info */}
              {exam.attempts > 1 && (
                <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                  Deneme hakkı: {exam.usedAttempts}/{exam.attempts} kullanıldı
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredExams.length === 0 && (
        <div className="text-center py-12">
          <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Sınav bulunamadı</h3>
          <p className="text-muted-foreground mt-1">
            Arama kriterlerinize uygun sınav yok.
          </p>
        </div>
      )}
    </div>
  );
}
