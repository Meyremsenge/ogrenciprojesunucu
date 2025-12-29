/**
 * Education Videos Page
 * Eğitim videoları - Sınıf kademelerine göre kategorize
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  ChevronDown,
  GraduationCap,
  BookOpen,
  School,
  Building2,
  Trophy,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Youtube,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { YouTubePlayer, VideoCard, VideoModal } from '@/components/video/YouTubePlayer';
import { useAuthStore } from '@/stores/authStore';
import {
  getVideos,
  getVideosByEducationLevel,
  createVideo,
  updateVideo,
  deleteVideo,
  updateWatchProgress,
  type EducationVideo,
  type EducationLevel,
  type GradeLevel,
  type Subject,
  type CreateVideoDTO,
  GRADE_LABELS,
  EDUCATION_LEVEL_LABELS,
  SUBJECT_LABELS,
  EDUCATION_LEVEL_GRADES,
  extractYouTubeId,
} from '@/services/educationVideoService';

// =============================================================================
// Constants
// =============================================================================

const EDUCATION_LEVELS: { key: EducationLevel; label: string; icon: typeof School; grades: GradeLevel[] }[] = [
  { 
    key: 'primary', 
    label: 'İlkokul', 
    icon: School,
    grades: ['grade_1', 'grade_2', 'grade_3', 'grade_4']
  },
  { 
    key: 'middle', 
    label: 'Ortaokul', 
    icon: BookOpen,
    grades: ['grade_5', 'grade_6', 'grade_7', 'grade_8']
  },
  { 
    key: 'high', 
    label: 'Lise', 
    icon: GraduationCap,
    grades: ['grade_9', 'grade_10', 'grade_11', 'grade_12']
  },
  { 
    key: 'graduate', 
    label: 'Mezun', 
    icon: Trophy,
    grades: ['graduate']
  },
];

const SUBJECTS: { value: Subject; label: string }[] = [
  { value: 'turkish', label: 'Türkçe' },
  { value: 'mathematics', label: 'Matematik' },
  { value: 'geometry', label: 'Geometri' },
  { value: 'science', label: 'Fen Bilimleri' },
  { value: 'physics', label: 'Fizik' },
  { value: 'chemistry', label: 'Kimya' },
  { value: 'biology', label: 'Biyoloji' },
  { value: 'social_studies', label: 'Sosyal Bilgiler' },
  { value: 'history', label: 'Tarih' },
  { value: 'geography', label: 'Coğrafya' },
  { value: 'english', label: 'İngilizce' },
  { value: 'literature', label: 'Edebiyat' },
  { value: 'philosophy', label: 'Felsefe' },
  { value: 'religious_culture', label: 'Din Kültürü' },
  { value: 'other', label: 'Diğer' },
];

// =============================================================================
// Component
// =============================================================================

export default function EducationVideosPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const canAddVideo = isSuperAdmin || isTeacher;

  // State
  const [activeLevel, setActiveLevel] = useState<EducationLevel>('high');
  const [activeGrade, setActiveGrade] = useState<GradeLevel | 'all'>('all');
  const [activeSubject, setActiveSubject] = useState<Subject | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<EducationVideo | null>(null);
  const [editingVideo, setEditingVideo] = useState<EducationVideo | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New video form
  const [newVideo, setNewVideo] = useState<CreateVideoDTO>({
    youtube_url: '',
    title: '',
    description: '',
    grade_level: 'grade_9',
    subject: 'mathematics',
    topic: '',
    tags: [],
  });

  // Toast helper
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // =============================================================================
  // Queries & Mutations
  // =============================================================================

  const { data: videosData, isLoading, isError, refetch } = useQuery({
    queryKey: ['educationVideos', activeLevel, activeGrade, activeSubject, searchQuery],
    queryFn: async () => {
      const params: any = {
        education_level: activeLevel,
        per_page: 50,
      };
      if (activeGrade !== 'all') params.grade_level = activeGrade;
      if (activeSubject !== 'all') params.subject = activeSubject;
      if (searchQuery) params.search = searchQuery;
      
      const response = await getVideos(params);
      return response;
    },
  });

  // Helper to extract error message from API response
  const getErrorMessage = (error: any, fallback: string): string => {
    const apiError = error?.response?.data?.error;
    if (typeof apiError === 'string') return apiError;
    if (apiError?.message) return apiError.message;
    if (error?.message) return error.message;
    return fallback;
  };

  const createMutation = useMutation({
    mutationFn: createVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educationVideos'] });
      setShowAddModal(false);
      setNewVideo({
        youtube_url: '',
        title: '',
        description: '',
        grade_level: 'grade_9',
        subject: 'mathematics',
        topic: '',
        tags: [],
      });
      showToast('success', 'Video başarıyla eklendi');
    },
    onError: (error: any) => {
      showToast('error', getErrorMessage(error, 'Video eklenirken hata oluştu'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educationVideos'] });
      showToast('success', 'Video silindi');
    },
    onError: (error: any) => {
      showToast('error', getErrorMessage(error, 'Video silinirken hata oluştu'));
    },
  });

  // =============================================================================
  // Data Processing
  // =============================================================================

  const videos = useMemo(() => {
    const data = videosData as any;
    if (Array.isArray(data?.data)) return data.data as EducationVideo[];
    return [];
  }, [videosData]);

  const currentLevelData = EDUCATION_LEVELS.find(l => l.key === activeLevel);

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleAddVideo = () => {
    if (!newVideo.youtube_url || !newVideo.title) {
      showToast('error', 'YouTube URL ve başlık zorunludur');
      return;
    }

    const youtubeId = extractYouTubeId(newVideo.youtube_url);
    if (!youtubeId) {
      showToast('error', 'Geçersiz YouTube URL');
      return;
    }

    createMutation.mutate(newVideo);
  };

  const handlePlayVideo = (video: EducationVideo) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const handleDeleteVideo = (video: EducationVideo) => {
    if (confirm(`"${video.title}" videosu silinecek. Emin misiniz?`)) {
      deleteMutation.mutate(video.id);
    }
  };

  const handleVideoProgress = (watchedSeconds: number, position: number) => {
    if (selectedVideo) {
      updateWatchProgress(selectedVideo.id, watchedSeconds, position);
    }
  };

  // Check if user can edit this video
  const canEditVideo = (video: EducationVideo) => {
    if (isSuperAdmin) return video.is_system_video;
    if (isTeacher) return !video.is_system_video && video.created_by === user?.id;
    return false;
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2',
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Youtube className="h-7 w-7 text-red-500" />
            Eğitim Videoları
          </h1>
          <p className="text-muted-foreground mt-1">
            Sınıf ve derse göre eğitim videoları
          </p>
        </div>
        
        {canAddVideo && (
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Video Ekle
          </Button>
        )}
      </div>

      {/* Education Level Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {EDUCATION_LEVELS.map(level => {
          const Icon = level.icon;
          return (
            <button
              key={level.key}
              onClick={() => {
                setActiveLevel(level.key);
                setActiveGrade('all');
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors',
                activeLevel === level.key
                  ? 'bg-primary text-white'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              <Icon className="h-4 w-4" />
              {level.label}
            </button>
          );
        })}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Grade Filter */}
        {currentLevelData && currentLevelData.grades.length > 1 && (
          <select
            value={activeGrade}
            onChange={(e) => setActiveGrade(e.target.value as GradeLevel | 'all')}
            className="px-3 py-2 bg-card border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Tüm Sınıflar</option>
            {currentLevelData.grades.map(grade => (
              <option key={grade} value={grade}>{GRADE_LABELS[grade]}</option>
            ))}
          </select>
        )}

        {/* Subject Filter */}
        <select
          value={activeSubject}
          onChange={(e) => setActiveSubject(e.target.value as Subject | 'all')}
          className="px-3 py-2 bg-card border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Tüm Dersler</option>
          {SUBJECTS.map(subj => (
            <option key={subj.value} value={subj.value}>{subj.label}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Video ara..."
            className="pl-10"
          />
        </div>

        {/* View Mode */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded',
              viewMode === 'grid' ? 'bg-card shadow' : 'hover:bg-card/50'
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded',
              viewMode === 'list' ? 'bg-card shadow' : 'hover:bg-card/50'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Videos Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 bg-card border rounded-xl">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Videolar yüklenemedi</h3>
          <Button onClick={() => refetch()}>Tekrar Dene</Button>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-xl">
          <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Henüz Video Yok</h3>
          <p className="text-muted-foreground mb-4">
            Bu kategoride henüz video bulunmuyor
          </p>
          {canAddVideo && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Video Ekle
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map(video => (
            <div key={video.id} className="relative group">
              <VideoCard
                video={video}
                onClick={() => handlePlayVideo(video)}
                onPlay={() => handlePlayVideo(video)}
              />
              
              {/* Edit/Delete buttons for authorized users */}
              {canEditVideo(video) && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingVideo(video);
                      setShowAddModal(true);
                    }}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white shadow"
                  >
                    <Edit2 className="h-4 w-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVideo(video);
                    }}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white shadow"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map(video => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 p-3 bg-card border rounded-lg hover:border-primary/50 cursor-pointer group"
              onClick={() => handlePlayVideo(video)}
            >
              {/* Thumbnail */}
              <div className="relative w-40 aspect-video rounded overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-700">
                <img
                  src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Play className="h-8 w-8 text-white" fill="currentColor" />
                </div>
                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                  {video.duration_formatted}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{video.grade_display}</span>
                  <span>•</span>
                  <span>{SUBJECT_LABELS[video.subject as Subject] || video.subject}</span>
                  {video.view_count !== undefined && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {video.view_count}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              {canEditVideo(video) && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingVideo(video);
                      setShowAddModal(true);
                    }}
                    className="p-2 hover:bg-muted rounded"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVideo(video);
                    }}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Video Modal */}
      <VideoModal
        video={selectedVideo}
        isOpen={showVideoModal}
        onClose={() => {
          setShowVideoModal(false);
          setSelectedVideo(null);
        }}
        onProgress={handleVideoProgress}
      />

      {/* Add/Edit Video Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              setShowAddModal(false);
              setEditingVideo(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">
                  {editingVideo ? 'Video Düzenle' : 'Yeni Video Ekle'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingVideo(null);
                  }}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* YouTube URL */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    YouTube URL *
                  </label>
                  <Input
                    value={newVideo.youtube_url}
                    onChange={(e) => setNewVideo({ ...newVideo, youtube_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  {newVideo.youtube_url && extractYouTubeId(newVideo.youtube_url) && (
                    <div className="mt-2 aspect-video rounded overflow-hidden">
                      <img
                        src={`https://img.youtube.com/vi/${extractYouTubeId(newVideo.youtube_url)}/hqdefault.jpg`}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Başlık *
                  </label>
                  <Input
                    value={newVideo.title}
                    onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                    placeholder="Video başlığı"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Açıklama
                  </label>
                  <textarea
                    value={newVideo.description}
                    onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                    placeholder="Video açıklaması"
                    className="w-full px-3 py-2 bg-background border rounded-lg text-sm resize-none h-20"
                  />
                </div>

                {/* Grade Level */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sınıf Seviyesi *
                  </label>
                  <select
                    value={newVideo.grade_level}
                    onChange={(e) => setNewVideo({ ...newVideo, grade_level: e.target.value as GradeLevel })}
                    className="w-full px-3 py-2 bg-background border rounded-lg text-sm"
                  >
                    {Object.entries(GRADE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ders *
                  </label>
                  <select
                    value={newVideo.subject}
                    onChange={(e) => setNewVideo({ ...newVideo, subject: e.target.value as Subject })}
                    className="w-full px-3 py-2 bg-background border rounded-lg text-sm"
                  >
                    {SUBJECTS.map(subj => (
                      <option key={subj.value} value={subj.value}>{subj.label}</option>
                    ))}
                  </select>
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Konu (Opsiyonel)
                  </label>
                  <Input
                    value={newVideo.topic}
                    onChange={(e) => setNewVideo({ ...newVideo, topic: e.target.value })}
                    placeholder="Örn: Üçgenler, Osmanlı Tarihi..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingVideo(null);
                  }}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleAddVideo}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {editingVideo ? 'Güncelle' : 'Ekle'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
