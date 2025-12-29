/**
 * My Courses Page
 * Kullanıcının kayıtlı olduğu kurslar
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  BookOpen,
  Clock,
  PlayCircle,
  CheckCircle2,
  MoreVertical,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMyCourses, Enrollment } from '@/services/courseService';

type FilterType = 'all' | 'in-progress' | 'completed' | 'not-started';

export default function MyCoursesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch enrolled courses
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['myCourses'],
    queryFn: () => getMyCourses(),
  });

  const enrollments: Enrollment[] = data?.items || [];

  // Client-side filtering for search and status
  const filteredCourses = useMemo(() => {
    return enrollments.filter((enrollment) => {
      const matchesSearch = enrollment.course?.title
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const progress = enrollment.progress_percentage || 0;

      switch (filter) {
        case 'in-progress':
          return progress > 0 && progress < 100;
        case 'completed':
          return enrollment.status === 'completed' || progress === 100;
        case 'not-started':
          return progress === 0;
        default:
          return true;
      }
    });
  }, [enrollments, searchQuery, filter]);

  const stats = useMemo(() => {
    return {
      total: enrollments.length,
      inProgress: enrollments.filter((e) => {
        const p = e.progress_percentage || 0;
        return p > 0 && p < 100;
      }).length,
      completed: enrollments.filter((e) => e.status === 'completed' || e.progress_percentage === 100).length,
      notStarted: enrollments.filter((e) => (e.progress_percentage || 0) === 0).length,
    };
  }, [enrollments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kurslarım</h1>
          <p className="text-muted-foreground mt-1">
            Kayıtlı olduğunuz kursları buradan takip edebilirsiniz
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="p-2 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Hata: {(error as Error)?.message || 'Kurslar yüklenemedi'}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Stats */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Toplam', value: stats.total, color: 'bg-primary/10 text-primary' },
            { label: 'Devam Ediyor', value: stats.inProgress, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            { label: 'Tamamlandı', value: stats.completed, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
            { label: 'Başlanmadı', value: stats.notStarted, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 text-center">
              <div className={cn('text-2xl font-bold', stat.color.split(' ')[1])}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {!isLoading && !isError && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kurs ara..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            {[
              { key: 'all', label: 'Tümü' },
              { key: 'in-progress', label: 'Devam Ediyor' },
              { key: 'completed', label: 'Tamamlandı' },
              { key: 'not-started', label: 'Başlanmadı' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as FilterType)}
                className={cn(
                  'px-4 py-2 text-sm transition-colors',
                  filter === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Courses List */}
      {!isLoading && !isError && (
        <div className="space-y-4">
          {filteredCourses.map((enrollment, index) => {
            const course = enrollment.course;
            if (!course) return null;
            
            const progress = Math.round(enrollment.progress_percentage || 0);
            const totalLectures = course.lesson_count || 0;
            const completedLectures = Math.round((totalLectures * progress) / 100);
            const totalDuration = course.total_duration || 0;
            
            return (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="card p-4 hover:shadow-lg transition-shadow">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-40 h-24 flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center overflow-hidden">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="h-8 w-8 text-primary/40" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            to={`/courses/${course.id}`}
                            className="font-semibold hover:text-primary transition-colors"
                          >
                            {course.title}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {course.teacher_name}
                          </p>
                        </div>
                        <button className="p-1 hover:bg-muted rounded">
                          <MoreVertical className="h-5 w-5 text-muted-foreground" />
                        </button>
                      </div>

                      {/* Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">
                            {completedLectures} / {totalLectures} ders tamamlandı
                          </span>
                          <span className={cn(
                            'font-medium',
                            progress === 100 ? 'text-green-500' : 'text-primary'
                          )}>
                            %{progress}
                          </span>
                        </div>
                        <div className="progress">
                          <div
                            className={cn(
                              'progress-bar',
                              progress === 100 && 'bg-green-500'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {totalDuration > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {Math.round(totalDuration / 60)} saat
                            </span>
                          )}
                          {enrollment.last_accessed_at && (
                            <span>
                              Son erişim: {new Date(enrollment.last_accessed_at).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </div>

                        {progress === 100 ? (
                          <span className="flex items-center gap-1 text-sm text-green-500">
                            <CheckCircle2 className="h-4 w-4" />
                            Tamamlandı
                          </span>
                        ) : (
                          <Link
                            to={`/courses/${course.id}/learn`}
                            className={cn(
                              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                              'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                            )}
                          >
                            <PlayCircle className="h-4 w-4" />
                            {progress === 0 ? 'Başla' : 'Devam Et'}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Kurs bulunamadı</h3>
          <p className="text-muted-foreground mt-1">
            {filter === 'all'
              ? 'Henüz bir kursa kayıt olmadınız.'
              : 'Bu kategoride kurs bulunmuyor.'}
          </p>
          {filter === 'all' && (
            <Link
              to="/courses"
              className={cn(
                'inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
              )}
            >
              Kurslara Göz At
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
