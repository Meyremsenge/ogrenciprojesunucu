/**
 * Content Detail Page
 * İçerik detay sayfası
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Clock,
  Star,
  Users,
  BookOpen,
  CheckCircle,
  Share2,
  Heart,
  Download,
  MessageSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  isCompleted: boolean;
  isLocked: boolean;
}

interface ContentDetail {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  instructor: {
    name: string;
    avatar?: string;
    title: string;
    students: number;
    courses: number;
  };
  rating: number;
  ratingCount: number;
  students: number;
  duration: string;
  lessons: Lesson[];
  progress: number;
  category: string;
  tags: string[];
  updatedAt: string;
}

// Mock data
const contentDetail: ContentDetail = {
  id: '1',
  title: 'React ile Modern Web Geliştirme',
  description: 'React, Redux ve modern JavaScript ile web uygulamaları geliştirin',
  longDescription: `Bu kapsamlı kurs ile React ekosistemini baştan sona öğreneceksiniz. 
    Hooks, Context API, Redux Toolkit ve daha fazlasını pratik projelerle pekiştireceksiniz.
    
    Kurs boyunca gerçek dünya projeleri geliştirerek portföyünüzü zenginleştireceksiniz.`,
  instructor: {
    name: 'Ahmet Yılmaz',
    title: 'Senior Frontend Developer',
    students: 15420,
    courses: 12,
  },
  rating: 4.8,
  ratingCount: 2341,
  students: 15420,
  duration: '24 saat',
  progress: 65,
  category: 'Web Geliştirme',
  tags: ['React', 'JavaScript', 'Frontend', 'Hooks'],
  updatedAt: '2024-01-15',
  lessons: [
    { id: '1', title: 'React\'a Giriş', duration: '15 dk', isCompleted: true, isLocked: false },
    { id: '2', title: 'JSX ve Componentler', duration: '25 dk', isCompleted: true, isLocked: false },
    { id: '3', title: 'Props ve State', duration: '30 dk', isCompleted: true, isLocked: false },
    { id: '4', title: 'Event Handling', duration: '20 dk', isCompleted: true, isLocked: false },
    { id: '5', title: 'React Hooks - useState', duration: '35 dk', isCompleted: false, isLocked: false },
    { id: '6', title: 'React Hooks - useEffect', duration: '40 dk', isCompleted: false, isLocked: false },
    { id: '7', title: 'Custom Hooks', duration: '45 dk', isCompleted: false, isLocked: false },
    { id: '8', title: 'Context API', duration: '50 dk', isCompleted: false, isLocked: true },
    { id: '9', title: 'Redux Toolkit', duration: '60 dk', isCompleted: false, isLocked: true },
    { id: '10', title: 'Final Projesi', duration: '120 dk', isCompleted: false, isLocked: true },
  ],
};

export default function ContentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  
  const content = contentDetail; // In real app, fetch by id
  const completedLessons = content.lessons.filter(l => l.isCompleted).length;
  const nextLesson = content.lessons.find(l => !l.isCompleted && !l.isLocked);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri
      </Button>

      {/* Hero Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Video Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center relative overflow-hidden"
          >
            <Button
              size="xl"
              className="rounded-full"
              onClick={() => navigate(`/contents/${id}/watch`)}
            >
              <Play className="h-8 w-8 mr-2" />
              Kursa Başla
            </Button>
          </motion.div>

          {/* Content Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge>{content.category}</Badge>
              {content.tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
            
            <h1 className="text-3xl font-bold">{content.title}</h1>
            <p className="text-lg text-muted-foreground mt-2">{content.description}</p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 mt-4">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{content.rating}</span>
                <span className="text-muted-foreground">({content.ratingCount} değerlendirme)</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span>{content.students.toLocaleString()} öğrenci</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span>{content.duration}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <BookOpen className="h-5 w-5" />
                <span>{content.lessons.length} ders</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsLiked(!isLiked)}>
                <Heart className={cn('h-4 w-4 mr-2', isLiked && 'fill-red-500 text-red-500')} />
                Kaydet
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Paylaş
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                İndir
              </Button>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="curriculum">
            <TabsList>
              <TabsTrigger value="curriculum">Müfredat</TabsTrigger>
              <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
              <TabsTrigger value="reviews">Yorumlar</TabsTrigger>
            </TabsList>

            <TabsContent value="curriculum">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Ders İçerikleri</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {completedLessons}/{content.lessons.length} tamamlandı
                    </span>
                  </div>
                  <Progress value={(completedLessons / content.lessons.length) * 100} className="mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {content.lessons.map((lesson, index) => (
                      <LessonItem
                        key={lesson.id}
                        lesson={lesson}
                        index={index}
                        onClick={() => !lesson.isLocked && navigate(`/contents/${id}/watch?lesson=${lesson.id}`)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Bu kurs hakkında</h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {content.longDescription}
                  </p>

                  <h3 className="font-semibold mt-6 mb-4">Neler öğreneceksiniz?</h3>
                  <ul className="grid md:grid-cols-2 gap-2">
                    {[
                      'React componentleri oluşturma ve kullanma',
                      'State ve props yönetimi',
                      'React Hooks kullanımı',
                      'Context API ile global state',
                      'Redux Toolkit entegrasyonu',
                      'Gerçek dünya projeleri',
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold">{content.rating}</div>
                      <div className="flex mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-4 w-4',
                              i < Math.floor(content.rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground'
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {content.ratingCount} değerlendirme
                      </p>
                    </div>
                  </div>

                  {/* Sample reviews */}
                  <div className="space-y-4">
                    {[
                      { name: 'Ali K.', rating: 5, comment: 'Harika bir kurs, çok faydalı!' },
                      { name: 'Zeynep Y.', rating: 4, comment: 'Anlatım çok açık ve net.' },
                      { name: 'Mehmet D.', rating: 5, comment: 'React öğrenmek için mükemmel.' },
                    ].map((review, index) => (
                      <div key={index} className="border-b pb-4 last:border-0">
                        <div className="flex items-center gap-3">
                          <Avatar alt={review.name} size="sm" />
                          <div>
                            <p className="font-medium">{review.name}</p>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    'h-3 w-3',
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground'
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Instructor Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eğitmen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar alt={content.instructor.name} size="lg" />
                <div>
                  <p className="font-semibold">{content.instructor.name}</p>
                  <p className="text-sm text-muted-foreground">{content.instructor.title}</p>
                </div>
              </div>
              <div className="flex justify-around mt-4 pt-4 border-t">
                <div className="text-center">
                  <p className="font-semibold">{content.instructor.students.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Öğrenci</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold">{content.instructor.courses}</p>
                  <p className="text-xs text-muted-foreground">Kurs</p>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                <MessageSquare className="h-4 w-4 mr-2" />
                Mesaj Gönder
              </Button>
            </CardContent>
          </Card>

          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">İlerlemeniz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-primary">{content.progress}%</div>
                <p className="text-sm text-muted-foreground">tamamlandı</p>
              </div>
              <Progress value={content.progress} className="mb-4" />
              
              {nextLesson && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Sıradaki ders:</p>
                  <p className="font-medium text-sm">{nextLesson.title}</p>
                  <Button size="sm" className="w-full mt-3" onClick={() => navigate(`/contents/${id}/watch?lesson=${nextLesson.id}`)}>
                    <Play className="h-4 w-4 mr-2" />
                    Devam Et
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Lesson Item Component
function LessonItem({ lesson, index, onClick }: { lesson: Lesson; index: number; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'flex items-center gap-4 p-3 rounded-lg transition-colors',
        lesson.isLocked ? 'opacity-50' : 'hover:bg-muted cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
        lesson.isCompleted ? 'bg-green-100 text-green-600' : 'bg-muted'
      )}>
        {lesson.isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
      </div>
      <div className="flex-1">
        <p className={cn('font-medium', lesson.isCompleted && 'line-through text-muted-foreground')}>
          {lesson.title}
        </p>
        <p className="text-xs text-muted-foreground">{lesson.duration}</p>
      </div>
      {!lesson.isLocked && !lesson.isCompleted && (
        <Play className="h-4 w-4 text-muted-foreground" />
      )}
    </motion.div>
  );
}
