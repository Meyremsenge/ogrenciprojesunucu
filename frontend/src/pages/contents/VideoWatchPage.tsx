/**
 * Video Watch Page
 * Video izleme sayfası
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  List,
  MessageSquare,
  X,
  ThumbsUp,
  Bookmark,
  Share2,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  isCompleted: boolean;
}

interface Note {
  id: string;
  timestamp: number;
  content: string;
  createdAt: string;
}

// Mock data
const courseData = {
  id: '1',
  title: 'React ile Modern Web Geliştirme',
  lessons: [
    { id: '1', title: "React'a Giriş", duration: '15 dk', videoUrl: '', isCompleted: true },
    { id: '2', title: 'JSX ve Componentler', duration: '25 dk', videoUrl: '', isCompleted: true },
    { id: '3', title: 'Props ve State', duration: '30 dk', videoUrl: '', isCompleted: true },
    { id: '4', title: 'Event Handling', duration: '20 dk', videoUrl: '', isCompleted: true },
    { id: '5', title: 'React Hooks - useState', duration: '35 dk', videoUrl: '', isCompleted: false },
    { id: '6', title: 'React Hooks - useEffect', duration: '40 dk', videoUrl: '', isCompleted: false },
    { id: '7', title: 'Custom Hooks', duration: '45 dk', videoUrl: '', isCompleted: false },
    { id: '8', title: 'Context API', duration: '50 dk', videoUrl: '', isCompleted: false },
    { id: '9', title: 'Redux Toolkit', duration: '60 dk', videoUrl: '', isCompleted: false },
    { id: '10', title: 'Final Projesi', duration: '120 dk', videoUrl: '', isCompleted: false },
  ],
};

export default function VideoWatchPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const lessonId = searchParams.get('lesson') || courseData.lessons[0].id;
  
  const [showSidebar, setShowSidebar] = useState(true);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');

  const currentLessonIndex = courseData.lessons.findIndex(l => l.id === lessonId);
  const currentLesson = courseData.lessons[currentLessonIndex];
  const prevLesson = currentLessonIndex > 0 ? courseData.lessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < courseData.lessons.length - 1 ? courseData.lessons[currentLessonIndex + 1] : null;
  
  const completedCount = courseData.lessons.filter(l => l.isCompleted).length;
  const overallProgress = (completedCount / courseData.lessons.length) * 100;

  const handleLessonChange = (newLessonId: string) => {
    navigate(`/contents/${id}/watch?lesson=${newLessonId}`);
  };

  const handleVideoProgress = (videoProgress: number) => {
    setProgress(videoProgress);
    // Auto-mark as complete when 90% watched
    if (videoProgress >= 90 && !currentLesson.isCompleted) {
      // In real app, call API to mark complete
      console.log('Lesson completed!');
    }
  };

  const handleVideoComplete = () => {
    // Auto-advance to next lesson
    if (nextLesson) {
      setTimeout(() => {
        handleLessonChange(nextLesson.id);
      }, 2000);
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      setNotes([
        ...notes,
        {
          id: Date.now().toString(),
          timestamp: 0, // In real app, get current video time
          content: newNote,
          createdAt: new Date().toISOString(),
        },
      ]);
      setNewNote('');
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/contents/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{courseData.title}</p>
            <p className="font-medium">{currentLesson?.title}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <Progress value={overallProgress} className="w-32" />
            <span className="text-sm text-muted-foreground">{Math.round(overallProgress)}%</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className={cn('flex-1 flex flex-col', showSidebar && 'lg:mr-80')}>
          {/* Video Player */}
          <div className="flex-1 bg-black flex items-center justify-center">
            <div className="w-full max-w-5xl aspect-video">
              <VideoPlayer
                src={currentLesson?.videoUrl || ''}
                title={currentLesson?.title}
                onProgress={handleVideoProgress}
                onComplete={handleVideoComplete}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Video Controls */}
          <div className="p-4 border-t bg-background">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                disabled={!prevLesson}
                onClick={() => prevLesson && handleLessonChange(prevLesson.id)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Önceki
              </Button>
              
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm">
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Beğen
                </Button>
                <Button variant="ghost" size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Kaydet
                </Button>
                <Button variant="ghost" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Paylaş
                </Button>
              </div>

              <Button
                disabled={!nextLesson}
                onClick={() => nextLesson && handleLessonChange(nextLesson.id)}
              >
                Sonraki
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Tabs for notes and comments */}
            <div className="mt-6">
              <Tabs defaultValue="notes">
                <TabsList>
                  <TabsTrigger value="notes">Notlarım</TabsTrigger>
                  <TabsTrigger value="comments">Yorumlar</TabsTrigger>
                  <TabsTrigger value="resources">Kaynaklar</TabsTrigger>
                </TabsList>

                <TabsContent value="notes">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Bu ders hakkında not ekle..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                        className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
                      />
                      <Button onClick={handleAddNote}>Ekle</Button>
                    </div>
                    
                    {notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Henüz not eklemediniz
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {notes.map((note) => (
                          <div key={note.id} className="p-3 rounded-lg bg-muted/50">
                            <p className="text-sm">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(note.createdAt).toLocaleString('tr-TR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="comments">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Yorum yaz..."
                        className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
                      />
                      <Button>Gönder</Button>
                    </div>
                    
                    {/* Sample comments */}
                    <div className="space-y-4">
                      {[
                        { name: 'Ali K.', comment: 'Çok faydalı bir ders, teşekkürler!', time: '2 saat önce' },
                        { name: 'Zeynep Y.', comment: 'useState hook çok net anlatılmış.', time: '5 saat önce' },
                      ].map((comment, index) => (
                        <div key={index} className="flex gap-3">
                          <Avatar alt={comment.name} size="sm" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{comment.name}</span>
                              <span className="text-xs text-muted-foreground">{comment.time}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{comment.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="resources">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Bu dersle ilgili kaynaklar:</p>
                    <ul className="space-y-2">
                      <li>
                        <a href="#" className="text-sm text-primary hover:underline">
                          📄 Ders Notları (PDF)
                        </a>
                      </li>
                      <li>
                        <a href="#" className="text-sm text-primary hover:underline">
                          💻 Örnek Kod Dosyaları (ZIP)
                        </a>
                      </li>
                      <li>
                        <a href="#" className="text-sm text-primary hover:underline">
                          🔗 React Hooks Dokümantasyonu
                        </a>
                      </li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Sidebar - Lesson List */}
        {showSidebar && (
          <motion.aside
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            className="fixed right-0 top-14 bottom-0 w-80 border-l bg-background overflow-y-auto"
          >
            <div className="p-4 border-b sticky top-0 bg-background">
              <h3 className="font-semibold">Ders Listesi</h3>
              <p className="text-sm text-muted-foreground">
                {completedCount}/{courseData.lessons.length} ders tamamlandı
              </p>
              <Progress value={overallProgress} className="mt-2" size="sm" />
            </div>

            <div className="p-2">
              {courseData.lessons.map((lesson, index) => (
                <button
                  key={lesson.id}
                  onClick={() => handleLessonChange(lesson.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                    lesson.id === lessonId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
                    lesson.isCompleted ? 'bg-green-100 text-green-600' : 
                    lesson.id === lessonId ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {lesson.isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      lesson.isCompleted && 'text-muted-foreground'
                    )}>
                      {lesson.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{lesson.duration}</p>
                  </div>
                  {lesson.id === lessonId && (
                    <Badge variant="secondary" className="text-xs">Oynatılıyor</Badge>
                  )}
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </div>
    </div>
  );
}
