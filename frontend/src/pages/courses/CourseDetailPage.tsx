/**
 * Course Detail Page
 * Kurs detay sayfası
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  Users,
  Star,
  BookOpen,
  PlayCircle,
  FileText,
  Download,
  CheckCircle2,
  Award,
  Calendar,
  Loader2,
  RefreshCw,
  Edit,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCourse, getTopics, enrollCourse, unenrollCourse, Topic } from '@/services/courseService';
import { useAuthStore } from '@/stores/authStore';

// Level label helper
const getLevelLabel = (level?: string): string => {
  const labels: Record<string, string> = {
    beginner: 'Başlangıç',
    intermediate: 'Orta',
    advanced: 'İleri',
  };
  return level ? labels[level] || level : '';
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const courseId = parseInt(id || '0');

  // Fetch course details
  const { 
    data: course, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourse(courseId),
    enabled: courseId > 0,
  });

  // Fetch topics
  const { data: topics = [] } = useQuery({
    queryKey: ['courseTopics', courseId],
    queryFn: () => getTopics(courseId),
    enabled: courseId > 0,
  });

  // Enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: () => enrollCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['myCourses'] });
    },
  });

  // Unenroll mutation
  const unenrollMutation = useMutation({
    mutationFn: () => unenrollCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['myCourses'] });
    },
  });

  // Check if user is enrolled (this would be from course data or separate endpoint)
  const isEnrolled = course?.is_enrolled || false;
  const isOwner = user?.id === course?.teacher_id;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (isError || !course) {
    return (
      <div className="text-center py-24">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Kurs bulunamadı</h3>
        <p className="text-red-500 mt-2">{(error as Error)?.message || 'Bir hata oluştu'}</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Tekrar Dene
          </button>
          <Link
            to="/courses"
            className="px-4 py-2 border rounded-lg hover:bg-muted"
          >
            Kurslara Dön
          </Link>
        </div>
      </div>
    );
  }

  // Calculate duration in hours
  const durationHours = course.total_duration ? Math.round(course.total_duration / 60) : 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kurslara Dön
        </Link>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg border hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Hero Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Course Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            {/* Thumbnail */}
            <div className="h-64 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center mb-6 overflow-hidden">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="h-16 w-16 text-primary/40" />
              )}
            </div>

            {/* Category & Level */}
            <div className="flex items-center gap-2 mb-3">
              {course.category && <span className="badge badge-primary">{course.category}</span>}
              {course.level && <span className="badge bg-muted text-muted-foreground">{getLevelLabel(course.level)}</span>}
              {!course.is_published && (
                <span className="badge bg-yellow-100 text-yellow-700">Taslak</span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold">{course.title}</h1>

            {/* Description */}
            <p className="text-muted-foreground mt-3">{course.description}</p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
              {course.average_rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <strong>{course.average_rating.toFixed(1)}</strong> ({course.rating_count || 0} değerlendirme)
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                {course.enrollment_count?.toLocaleString() || 0} öğrenci
              </span>
              {durationHours > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {durationHours} saat
                </span>
              )}
              <span className="flex items-center gap-1">
                <PlayCircle className="h-4 w-4 text-muted-foreground" />
                {course.lesson_count || 0} ders
              </span>
              {course.updated_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Son güncelleme: {new Date(course.updated_at).toLocaleDateString('tr-TR')}
                </span>
              )}
            </div>

            {/* Instructor */}
            <div className="flex items-center gap-4 mt-6 pt-6 border-t">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {course.teacher_name?.charAt(0) || 'E'}
                </span>
              </div>
              <div>
                <p className="font-medium">{course.teacher_name || 'Eğitmen'}</p>
                <p className="text-sm text-muted-foreground">Eğitmen</p>
              </div>
            </div>
          </motion.div>

          {/* Learning Objectives */}
          {course.learning_objectives && course.learning_objectives.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Bu kursta neler öğreneceksiniz?</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {course.learning_objectives.map((objective: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{objective}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Curriculum / Topics */}
          {topics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Müfredat</h2>
              <div className="space-y-4">
                {topics.map((topic, index) => (
                  <div key={topic.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 font-medium flex items-center justify-between">
                      <span>{index + 1}. {topic.title}</span>
                      {topic.lesson_count !== undefined && (
                        <span className="text-sm text-muted-foreground">
                          {topic.lesson_count} ders
                        </span>
                      )}
                    </div>
                    {topic.description && (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        {topic.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Requirements */}
          {course.requirements && course.requirements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Gereksinimler</h2>
              <ul className="space-y-2">
                {course.requirements.map((req: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {req}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>

        {/* Sidebar - Enrollment Card */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6 sticky top-20"
          >
            {/* Enrollment Status */}
            {isEnrolled && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>Bu kursa kayıtlısınız</span>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="space-y-3">
              {isOwner ? (
                <>
                  <Link
                    to={`/courses/${courseId}/edit`}
                    className={cn(
                      'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2',
                      'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                    )}
                  >
                    <Edit className="h-4 w-4" />
                    Kursu Düzenle
                  </Link>
                </>
              ) : isEnrolled ? (
                <>
                  <Link
                    to={`/courses/${courseId}/learn`}
                    className={cn(
                      'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2',
                      'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                    )}
                  >
                    <PlayCircle className="h-4 w-4" />
                    Derse Devam Et
                  </Link>
                  <button
                    onClick={() => unenrollMutation.mutate()}
                    disabled={unenrollMutation.isPending}
                    className={cn(
                      'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2',
                      'border text-red-600 hover:bg-red-50 transition-colors'
                    )}
                  >
                    {unenrollMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Kaydı İptal Et
                  </button>
                </>
              ) : (
                <button
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending}
                  className={cn(
                    'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2',
                    'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                  )}
                >
                  {enrollMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      Kursa Kayıt Ol
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Features */}
            <div className="mt-6 pt-6 border-t space-y-3">
              <h3 className="font-medium">Bu kurs şunları içerir:</h3>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {durationHours > 0 ? `${durationHours} saat video içerik` : 'Video içerik'}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <PlayCircle className="h-4 w-4 text-muted-foreground" />
                {course.lesson_count || 0} ders
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-muted-foreground" />
                Tamamlama sertifikası
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4 text-muted-foreground" />
                İndirilebilir kaynaklar
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Proje ödevleri
              </div>
            </div>

            {/* Error Messages */}
            {enrollMutation.isError && (
              <p className="text-red-500 text-sm mt-4">
                {(enrollMutation.error as Error)?.message || 'Kayıt yapılamadı'}
              </p>
            )}
            {unenrollMutation.isError && (
              <p className="text-red-500 text-sm mt-4">
                {(unenrollMutation.error as Error)?.message || 'Kayıt iptal edilemedi'}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
