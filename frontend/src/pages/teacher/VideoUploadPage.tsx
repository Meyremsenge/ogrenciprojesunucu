/**
 * Video Upload Page - Öğretmenler için video yükleme sayfası
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Video,
  FileVideo,
  X,
  Check,
  AlertCircle,
  Loader2,
  Youtube,
  Link,
  Plus,
  Trash2,
  GripVertical,
  Play,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface VideoFormData {
  title: string;
  description: string;
  youtubeUrl: string;
  duration: number;
  isPublished: boolean;
  orderIndex: number;
}

type UploadMethod = 'youtube' | 'upload';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function VideoUploadPage() {
  const navigate = useNavigate();
  const { courseId, topicId } = useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadMethod, setUploadMethod] = useState<UploadMethod>('youtube');
  const [videos, setVideos] = useState<VideoFormData[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoFormData>({
    title: '',
    description: '',
    youtubeUrl: '',
    duration: 0,
    isPublished: false,
    orderIndex: videos.length,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Extract YouTube video ID
  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Validate YouTube URL
  const validateYoutubeUrl = (url: string): boolean => {
    return extractYoutubeId(url) !== null;
  };

  // Handle YouTube URL change
  const handleYoutubeUrlChange = async (url: string) => {
    setCurrentVideo((prev) => ({ ...prev, youtubeUrl: url }));
    
    const videoId = extractYoutubeId(url);
    if (videoId) {
      // TODO: YouTube API'den video bilgilerini çek
      setError(null);
    }
  };

  // Add video to list
  const handleAddVideo = () => {
    if (!currentVideo.title.trim()) {
      setError('Video başlığı gerekli');
      return;
    }

    if (uploadMethod === 'youtube' && !validateYoutubeUrl(currentVideo.youtubeUrl)) {
      setError('Geçerli bir YouTube URL\'si girin');
      return;
    }

    setVideos((prev) => [
      ...prev,
      { ...currentVideo, orderIndex: prev.length },
    ]);

    // Reset form
    setCurrentVideo({
      title: '',
      description: '',
      youtubeUrl: '',
      duration: 0,
      isPublished: false,
      orderIndex: videos.length + 1,
    });
    setError(null);
  };

  // Remove video from list
  const handleRemoveVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle video visibility
  const toggleVideoPublished = (index: number) => {
    setVideos((prev) =>
      prev.map((v, i) =>
        i === index ? { ...v, isPublished: !v.isPublished } : v
      )
    );
  };

  // Save all videos
  const saveMutation = useMutation({
    mutationFn: async () => {
      // API call to save videos
      const response = await fetch(`/api/v1/courses/${courseId}/topics/${topicId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos }),
      });
      if (!response.ok) throw new Error('Videolar kaydedilemedi');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      navigate(`/courses/${courseId}/manage`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    // TODO: Actual file upload implementation
    setTimeout(() => {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(100);
    }, 5000);
  };

  const youtubeVideoId = extractYoutubeId(currentVideo.youtubeUrl);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Ekle</h1>
          <p className="text-muted-foreground">
            Kursunuza yeni videolar ekleyin
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Geri
        </Button>
      </div>

      {/* Upload Method Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setUploadMethod('youtube')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            uploadMethod === 'youtube'
              ? 'bg-background shadow text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Youtube className="h-4 w-4" />
          YouTube URL
        </button>
        <button
          onClick={() => setUploadMethod('upload')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
            uploadMethod === 'upload'
              ? 'bg-background shadow text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Upload className="h-4 w-4" />
          Dosya Yükle
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg"
        >
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Video Form */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Yeni Video</h2>

        {/* YouTube URL Input */}
        {uploadMethod === 'youtube' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">YouTube URL</label>
            <div className="flex gap-2">
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={currentVideo.youtubeUrl}
                onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                leftIcon={<Link className="h-4 w-4" />}
              />
            </div>
            
            {/* YouTube Preview */}
            {youtubeVideoId && (
              <div className="aspect-video w-full max-w-md rounded-lg overflow-hidden bg-muted">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )}

        {/* File Upload */}
        {uploadMethod === 'upload' && (
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
              isUploading
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            
            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                <div className="space-y-2">
                  <p className="font-medium">Yükleniyor...</p>
                  <div className="w-full max-w-xs mx-auto h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <div
                className="cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileVideo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Video dosyası yükleyin</p>
                <p className="text-sm text-muted-foreground mt-1">
                  MP4, MOV, AVI • Maks 500MB
                </p>
                <Button variant="outline" className="mt-4">
                  Dosya Seç
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Video Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Video Başlığı *</label>
            <Input
              placeholder="Ders 1: Giriş"
              value={currentVideo.title}
              onChange={(e) =>
                setCurrentVideo((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Süre (dakika)</label>
            <Input
              type="number"
              placeholder="15"
              value={currentVideo.duration || ''}
              onChange={(e) =>
                setCurrentVideo((prev) => ({
                  ...prev,
                  duration: parseInt(e.target.value) || 0,
                }))
              }
              leftIcon={<Clock className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Açıklama</label>
          <textarea
            className="w-full min-h-[100px] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Bu videoda neler öğrenilecek..."
            value={currentVideo.description}
            onChange={(e) =>
              setCurrentVideo((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />
        </div>

        {/* Add Button */}
        <div className="flex justify-end">
          <Button onClick={handleAddVideo} leftIcon={<Plus className="h-4 w-4" />}>
            Listeye Ekle
          </Button>
        </div>
      </div>

      {/* Video List */}
      {videos.length > 0 && (
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Eklenecek Videolar ({videos.length})</h2>
          
          <div className="space-y-2">
            {videos.map((video, index) => (
              <motion.div
                key={index}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                
                <div className="h-10 w-16 bg-muted rounded flex items-center justify-center">
                  {video.youtubeUrl ? (
                    <img
                      src={`https://img.youtube.com/vi/${extractYoutubeId(video.youtubeUrl)}/default.jpg`}
                      alt=""
                      className="h-full w-full object-cover rounded"
                    />
                  ) : (
                    <Video className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{video.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {video.duration > 0 && `${video.duration} dk`}
                  </p>
                </div>

                <button
                  onClick={() => toggleVideoPublished(index)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    video.isPublished
                      ? 'text-green-600 bg-green-100'
                      : 'text-muted-foreground bg-muted'
                  )}
                >
                  {video.isPublished ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={() => handleRemoveVideo(index)}
                  className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setVideos([])}
              disabled={saveMutation.isPending}
            >
              Temizle
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              leftIcon={
                saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )
              }
            >
              {saveMutation.isPending ? 'Kaydediliyor...' : 'Videoları Kaydet'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
