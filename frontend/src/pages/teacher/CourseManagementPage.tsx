/**
 * Course Management Page - Öğretmenler için kurs yönetim sayfası
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Video,
  FileText,
  Users,
  Settings,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  BarChart,
  Clock,
  BookOpen,
  ChevronRight,
  MoreVertical,
  Loader2,
  Upload,
  FolderPlus,
  GripVertical,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  is_published: boolean;
  total_students: number;
  total_videos: number;
  total_duration_minutes: number;
  topics: Topic[];
}

interface Topic {
  id: number;
  title: string;
  order_index: number;
  videos: Video[];
}

interface Video {
  id: number;
  title: string;
  duration_minutes: number;
  is_published: boolean;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockCourses: Course[] = [
  {
    id: 1,
    title: 'React ile Modern Web Geliştirme',
    description: 'React, TypeScript ve modern araçlarla web uygulamaları geliştirin',
    thumbnail_url: 'https://placehold.co/400x225/3b82f6/white?text=React',
    is_published: true,
    total_students: 156,
    total_videos: 24,
    total_duration_minutes: 480,
    topics: [
      {
        id: 1,
        title: 'React Temelleri',
        order_index: 0,
        videos: [
          { id: 1, title: 'React Nedir?', duration_minutes: 15, is_published: true },
          { id: 2, title: 'JSX Yazımı', duration_minutes: 20, is_published: true },
          { id: 3, title: 'Component Yapısı', duration_minutes: 25, is_published: false },
        ],
      },
      {
        id: 2,
        title: 'State Yönetimi',
        order_index: 1,
        videos: [
          { id: 4, title: 'useState Hook', duration_minutes: 18, is_published: true },
          { id: 5, title: 'useEffect Hook', duration_minutes: 22, is_published: true },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Python ile Veri Bilimi',
    description: 'Python, Pandas ve NumPy ile veri analizi',
    thumbnail_url: 'https://placehold.co/400x225/22c55e/white?text=Python',
    is_published: false,
    total_students: 0,
    total_videos: 12,
    total_duration_minutes: 240,
    topics: [],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CourseManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<number[]>([]);

  // Fetch courses (using mock data for now)
  const { data: courses = mockCourses, isLoading } = useQuery({
    queryKey: ['teacherCourses'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      return mockCourses;
    },
  });

  // Toggle topic expansion
  const toggleTopic = (topicId: number) => {
    setExpandedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  // Navigate to video upload
  const handleAddVideo = (courseId: number, topicId: number) => {
    navigate(`/teacher/courses/${courseId}/topics/${topicId}/videos/add`);
  };

  // Navigate to create course
  const handleCreateCourse = () => {
    navigate('/teacher/courses/create');
  };

  // Add new topic
  const handleAddTopic = (courseId: number) => {
    // TODO: Open modal or navigate to topic creation
    console.log('Add topic to course:', courseId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kurs Yönetimi</h1>
          <p className="text-muted-foreground">
            Kurslarınızı düzenleyin, video ekleyin ve içerik yönetin
          </p>
        </div>
        <Button onClick={handleCreateCourse} leftIcon={<Plus className="h-4 w-4" />}>
          Yeni Kurs Oluştur
        </Button>
      </div>

      {/* Course List */}
      <div className="grid gap-6 lg:grid-cols-2">
        {courses.map((course) => (
          <motion.div
            key={course.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-xl overflow-hidden"
          >
            {/* Course Header */}
            <div className="relative">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-primary/50" />
                </div>
              )}
              
              {/* Status Badge */}
              <Badge
                className="absolute top-3 right-3"
                variant={course.is_published ? 'default' : 'secondary'}
              >
                {course.is_published ? 'Yayında' : 'Taslak'}
              </Badge>
            </div>

            {/* Course Info */}
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{course.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {course.description}
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{course.total_students} öğrenci</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Video className="h-4 w-4" />
                  <span>{course.total_videos} video</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{Math.floor(course.total_duration_minutes / 60)} saat</span>
                </div>
              </div>

              {/* Topics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Konular</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddTopic(course.id)}
                    leftIcon={<FolderPlus className="h-3 w-3" />}
                  >
                    Konu Ekle
                  </Button>
                </div>

                {course.topics.length > 0 ? (
                  <div className="space-y-1">
                    {course.topics.map((topic) => (
                      <div key={topic.id} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleTopic(topic.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{topic.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {topic.videos.length} video
                            </Badge>
                          </div>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 transition-transform',
                              expandedTopics.includes(topic.id) && 'rotate-90'
                            )}
                          />
                        </button>

                        {/* Videos */}
                        <AnimatePresence>
                          {expandedTopics.includes(topic.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t bg-muted/30"
                            >
                              {topic.videos.map((video) => (
                                <div
                                  key={video.id}
                                  className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <Video className="h-3 w-3 text-muted-foreground" />
                                    <span>{video.title}</span>
                                    <span className="text-muted-foreground">
                                      ({video.duration_minutes} dk)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {video.is_published ? (
                                      <Eye className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Add Video Button */}
                              <button
                                onClick={() => handleAddVideo(course.id, topic.id)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors border-t"
                              >
                                <Upload className="h-3 w-3" />
                                <span>Video Ekle</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/30">
                    Henüz konu eklenmemiş
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/courses/${course.id}`)}
                  leftIcon={<Eye className="h-4 w-4" />}
                >
                  Önizle
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}
                  leftIcon={<Edit className="h-4 w-4" />}
                >
                  Düzenle
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/teacher/courses/${course.id}/analytics`)}
                  leftIcon={<BarChart className="h-4 w-4" />}
                >
                  <span className="sr-only">İstatistikler</span>
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {courses.length === 0 && (
        <div className="text-center py-12 border rounded-xl bg-muted/30">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Henüz kurs oluşturmadınız</h3>
          <p className="text-muted-foreground mb-4">
            İlk kursunuzu oluşturarak öğrencilerinize ulaşmaya başlayın
          </p>
          <Button onClick={handleCreateCourse} leftIcon={<Plus className="h-4 w-4" />}>
            İlk Kursumu Oluştur
          </Button>
        </div>
      )}
    </div>
  );
}
