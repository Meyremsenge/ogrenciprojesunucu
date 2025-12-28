/**
 * Courses Page
 * Tüm kursların listelendiği sayfa
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  BookOpen,
  Clock,
  Users,
  Star,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCourses, type Course, type CourseFilters } from '@/services/courseService';

const CATEGORIES = ['Tümü', 'Web Geliştirme', 'Backend', 'Veri Bilimi', 'Mobil', 'DevOps', 'Tasarım'];
const LEVELS = [
  { value: '', label: 'Tümü' },
  { value: 'beginner', label: 'Başlangıç' },
  { value: 'intermediate', label: 'Orta' },
  { value: 'advanced', label: 'İleri' },
];

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build filters
  const filters: CourseFilters = {
    page,
    per_page: 12,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(selectedCategory !== 'Tümü' && { category: selectedCategory }),
    ...(selectedLevel && { level: selectedLevel }),
  };

  // Fetch courses
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['courses', filters],
    queryFn: () => getCourses(filters),
    staleTime: 5 * 60 * 1000,
  });

  const courses = data?.items || [];
  const totalCourses = data?.total || 0;
  const totalPages = data?.pages || 1;

  const getLevelLabel = useCallback((level: string) => {
    const found = LEVELS.find(l => l.value === level);
    return found?.label || level;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Kurslar</h1>
        <p className="text-muted-foreground mt-1">
          Yeteneklerinizi geliştirmek için kurslara göz atın
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
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

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Level Filter */}
        <select
          value={selectedLevel}
          onChange={(e) => {
            setSelectedLevel(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>

        {/* View Mode */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            <List className="h-5 w-5" />
          </button>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="p-2 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        {totalCourses} kurs bulundu
      </p>

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

      {/* Courses Grid/List */}
      {!isLoading && !isError && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/courses/${course.id}`}
                className="block card overflow-hidden hover:shadow-lg transition-shadow group"
              >
                {/* Thumbnail */}
                <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="h-12 w-12 text-primary/40" />
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* Category & Level */}
                  <div className="flex items-center gap-2">
                    {course.category && <span className="badge badge-primary">{course.category}</span>}
                    <span className="text-xs text-muted-foreground">{getLevelLabel(course.level)}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>

                  {/* Instructor */}
                  <p className="text-sm text-muted-foreground">{course.teacher_name}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {course.total_duration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {Math.round(course.total_duration / 60)} saat
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.enrollment_count.toLocaleString()}
                    </span>
                    {course.average_rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        {course.average_rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="pt-3 border-t flex items-center justify-between">
                    <span className={cn(
                      'text-sm font-medium',
                      course.is_published ? 'text-green-600' : 'text-yellow-600'
                    )}>
                      {course.is_published ? 'Yayında' : 'Taslak'}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && !isError && viewMode === 'list' && (
        <div className="space-y-4">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/courses/${course.id}`}
                className="block card p-4 hover:shadow-lg transition-shadow group"
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-48 h-28 flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center overflow-hidden">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="h-8 w-8 text-primary/40" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Category & Level */}
                    <div className="flex items-center gap-2 mb-2">
                      {course.category && <span className="badge badge-primary">{course.category}</span>}
                      <span className="text-xs text-muted-foreground">{getLevelLabel(course.level)}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {course.short_description || course.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span>{course.teacher_name}</span>
                      {course.total_duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {Math.round(course.total_duration / 60)} saat
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {course.enrollment_count.toLocaleString()}
                      </span>
                      {course.average_rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          {course.average_rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <span className={cn(
                      'text-sm font-medium',
                      course.is_published ? 'text-green-600' : 'text-yellow-600'
                    )}>
                      {course.is_published ? 'Yayında' : 'Taslak'}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && courses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Kurs bulunamadı</h3>
          <p className="text-muted-foreground mt-1">Farklı filtreler deneyebilirsiniz.</p>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !isError && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Önceki
          </button>
          <span className="text-sm text-muted-foreground">
            Sayfa {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
  );
}
