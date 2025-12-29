/**
 * Contents Page
 * İçerik listeleme sayfası - Video ve Dökümanlar
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Play,
  FileText,
  Video,
  Clock,
  Loader2,
  RefreshCw,
  Eye,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVideos, getDocuments, Video as VideoType, Document } from '@/services/contentService';
import { useAuthStore } from '@/stores/authStore';

type ContentType = 'video' | 'document' | 'all';

// Status label helper
const getStatusLabel = (status?: string): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: 'Taslak', color: 'bg-gray-100 text-gray-700' },
    pending_review: { label: 'İnceleme Bekliyor', color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: 'Onaylandı', color: 'bg-blue-100 text-blue-700' },
    published: { label: 'Yayında', color: 'bg-green-100 text-green-700' },
    rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-700' },
    archived: { label: 'Arşivlendi', color: 'bg-gray-100 text-gray-500' },
  };
  return status ? statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' } : { label: 'Bilinmiyor', color: 'bg-gray-100 text-gray-700' };
};

export default function ContentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [contentType, setContentType] = useState<ContentType>('all');
  const [videoPage, setVideoPage] = useState(1);
  const [docPage, setDocPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setVideoPage(1);
      setDocPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch videos
  const { 
    data: videosData, 
    isLoading: videosLoading,
    refetch: refetchVideos,
  } = useQuery({
    queryKey: ['videos', { search: debouncedSearch, page: videoPage }],
    queryFn: () => getVideos({ 
      search: debouncedSearch || undefined,
      page: videoPage,
      per_page: 12,
      status: 'published',
    }),
    enabled: contentType === 'all' || contentType === 'video',
  });

  // Fetch documents
  const { 
    data: docsData, 
    isLoading: docsLoading,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ['documents', { search: debouncedSearch, page: docPage }],
    queryFn: () => getDocuments({ 
      search: debouncedSearch || undefined,
      page: docPage,
      per_page: 12,
      status: 'published',
    }),
    enabled: contentType === 'all' || contentType === 'document',
  });

  const videos: VideoType[] = videosData?.items || [];
  const documents: Document[] = docsData?.items || [];

  const isLoading = videosLoading || docsLoading;
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const handleRefresh = () => {
    refetchVideos();
    refetchDocs();
  };

  const handleVideoClick = (video: VideoType) => {
    navigate(`/contents/${video.id}/watch`);
  };

  const handleDocumentClick = (doc: Document) => {
    navigate(`/contents/document/${doc.id}`);
  };

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">İçerikler</h1>
          <p className="text-muted-foreground">Tüm eğitim materyallerine göz atın</p>
        </div>
        <div className="flex items-center gap-2">
          {isTeacher && (
            <Link
              to="/contents/create"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Yeni İçerik
            </Link>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="İçerik ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg border transition-colors',
              viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg border transition-colors',
              viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content Type Tabs */}
      <div className="flex items-center border rounded-lg overflow-hidden w-fit">
        {[
          { key: 'all', label: 'Tümü', icon: Filter },
          { key: 'video', label: 'Videolar', icon: Video },
          { key: 'document', label: 'Dökümanlar', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setContentType(tab.key as ContentType)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
              contentType === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Videos Section */}
      {!isLoading && (contentType === 'all' || contentType === 'video') && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Videolar
            <span className="text-sm font-normal text-muted-foreground">
              ({videosData?.total || 0})
            </span>
          </h2>

          {videos.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <Video className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Video bulunamadı</p>
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            )}>
              {videos.map((video, index) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  viewMode={viewMode}
                  index={index}
                  onClick={() => handleVideoClick(video)}
                  formatDuration={formatDuration}
                />
              ))}
            </div>
          )}

          {/* Video Pagination */}
          {videosData && videosData.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setVideoPage(p => Math.max(1, p - 1))}
                disabled={videoPage === 1}
                className="px-3 py-1 text-sm rounded border hover:bg-muted disabled:opacity-50"
              >
                Önceki
              </button>
              <span className="text-sm text-muted-foreground">
                {videoPage} / {videosData.pages}
              </span>
              <button
                onClick={() => setVideoPage(p => Math.min(videosData.pages, p + 1))}
                disabled={videoPage === videosData.pages}
                className="px-3 py-1 text-sm rounded border hover:bg-muted disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      )}

      {/* Documents Section */}
      {!isLoading && (contentType === 'all' || contentType === 'document') && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Dökümanlar
            <span className="text-sm font-normal text-muted-foreground">
              ({docsData?.total || 0})
            </span>
          </h2>

          {documents.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Döküman bulunamadı</p>
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            )}>
              {documents.map((doc, index) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  viewMode={viewMode}
                  index={index}
                  onClick={() => handleDocumentClick(doc)}
                />
              ))}
            </div>
          )}

          {/* Document Pagination */}
          {docsData && docsData.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDocPage(p => Math.max(1, p - 1))}
                disabled={docPage === 1}
                className="px-3 py-1 text-sm rounded border hover:bg-muted disabled:opacity-50"
              >
                Önceki
              </button>
              <span className="text-sm text-muted-foreground">
                {docPage} / {docsData.pages}
              </span>
              <button
                onClick={() => setDocPage(p => Math.min(docsData.pages, p + 1))}
                disabled={docPage === docsData.pages}
                className="px-3 py-1 text-sm rounded border hover:bg-muted disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Video Card Component
interface VideoCardProps {
  video: VideoType;
  viewMode: 'grid' | 'list';
  index: number;
  onClick: () => void;
  formatDuration: (seconds?: number) => string;
}

function VideoCard({ video, viewMode, index, onClick, formatDuration }: VideoCardProps) {
  const status = getStatusLabel(video.status);

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={onClick}
        className="card p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-24 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
            ) : (
              <Video className="h-6 w-6 text-primary/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{video.title}</h3>
              <span className={cn('text-xs px-2 py-0.5 rounded', status.color)}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{video.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {video.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(video.duration)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {video.view_count?.toLocaleString() || 0} izlenme
              </span>
              <span>{video.teacher_name}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="card overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
    >
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 relative flex items-center justify-center">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <Video className="h-12 w-12 text-primary/40 group-hover:scale-110 transition-transform" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
          <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <span className={cn('absolute top-2 right-2 text-xs px-2 py-0.5 rounded', status.color)}>
          {status.label}
        </span>
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold line-clamp-1">{video.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{video.description}</p>
        
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">{video.teacher_name}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            {video.view_count?.toLocaleString() || 0}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Document Card Component
interface DocumentCardProps {
  document: Document;
  viewMode: 'grid' | 'list';
  index: number;
  onClick: () => void;
}

function DocumentCard({ document, viewMode, index, onClick }: DocumentCardProps) {
  const status = getStatusLabel(document.status);

  // Format file size
  const formatSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={onClick}
        className="card p-4 cursor-pointer hover:shadow-md transition-all hover:border-blue-500/50"
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{document.title}</h3>
              <span className={cn('text-xs px-2 py-0.5 rounded', status.color)}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{document.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {document.file_type && (
                <span className="uppercase">{document.file_type}</span>
              )}
              {document.file_size && (
                <span>{formatSize(document.file_size)}</span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {document.view_count?.toLocaleString() || 0} görüntüleme
              </span>
              <span>{document.teacher_name}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="card overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:border-blue-500/50 group"
    >
      <div className="aspect-[4/3] bg-blue-50 dark:bg-blue-900/20 relative flex items-center justify-center">
        <FileText className="h-16 w-16 text-blue-400 group-hover:scale-110 transition-transform" />
        <span className={cn('absolute top-2 right-2 text-xs px-2 py-0.5 rounded', status.color)}>
          {status.label}
        </span>
        {document.file_type && (
          <span className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded uppercase">
            {document.file_type}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold line-clamp-1">{document.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{document.description}</p>
        
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">{document.teacher_name}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {document.file_size && (
              <span>{formatSize(document.file_size)}</span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {document.view_count?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
