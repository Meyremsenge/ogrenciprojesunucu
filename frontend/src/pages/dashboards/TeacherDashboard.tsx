/**
 * Teacher Dashboard - UX Optimized
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * UX PRENSİPLERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🎯 GÖSTERILECEK METRİKLER (Öncelik Sırasına Göre):
 *    1. Bekleyen değerlendirmeler (acil aksiyon gerektiren)
 *    2. Aktif kurslar ve öğrenci sayısı
 *    3. Bugünkü/yaklaşan canlı dersler
 *    4. Ortalama öğrenci başarısı
 * 
 * 📌 ÖNCELİKLİ AKSİYONLAR:
 *    1. "Değerlendir" - Bekleyen sınavları değerlendir
 *    2. "Canlı Ders Başlat" - Anlık ders başlatma
 *    3. "Yeni İçerik Ekle" - Kurs içeriği oluşturma
 * 
 * ⚖️ BİLGİ YOĞUNLUĞU DENGESİ:
 *    - Bekleyen değerlendirmeler: Öncelikli (acil badge ile)
 *    - Kurs kartları: Kompakt, temel metrikler
 *    - Öğrenci aktivitesi: Son 5-7 gün özeti
 *    - Sidebar: Bugünün programı + hızlı istatistik
 * 
 * 🚫 GEREKSİZ VERİDEN KAÇINMA:
 *    - Geçmiş değerlendirmeler gösterilmez
 *    - Detaylı öğrenci listesi ayrı sayfada
 *    - Tamamlanmış dersler özet olarak
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Users,
  FileText,
  Video,
  TrendingUp,
  Calendar,
  Clock,
  Plus,
  Play,
  AlertCircle,
  CheckCircle,
  Star,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';

import { useUser } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import {
  MetricCard,
  DashboardSection,
  ListItem,
  ScheduleItem,
  StatusBadge,
  ProgressIndicator,
  MiniChart,
} from '@/components/dashboard';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const mockMetrics = {
  activeCourses: 8,
  totalStudents: 342,
  pendingEvaluations: 15,
  urgentEvaluations: 3,
  averageSuccess: 78,
  thisWeekLiveClasses: 4,
};

const mockPendingEvaluations = [
  { id: 1, student: 'Ali Yılmaz', exam: 'React Hooks Quiz', course: 'React Modern Web', submittedAt: '2 saat önce', urgent: true },
  { id: 2, student: 'Ayşe Demir', exam: 'JavaScript Final', course: 'JS Fundamentals', submittedAt: '5 saat önce', urgent: true },
  { id: 3, student: 'Mehmet Kaya', exam: 'Python Basics', course: 'Python Veri Bilimi', submittedAt: '1 gün önce', urgent: false },
  { id: 4, student: 'Zeynep Öz', exam: 'Node.js Quiz', course: 'Backend Development', submittedAt: '2 gün önce', urgent: false },
];

const mockMyCourses = [
  { id: 1, title: 'React ile Modern Web', students: 86, completion: 72, rating: 4.8, status: 'active' as const, newEnrollments: 5 },
  { id: 2, title: 'Python Veri Bilimi', students: 124, completion: 45, rating: 4.6, status: 'active' as const, newEnrollments: 12 },
  { id: 3, title: 'JavaScript Fundamentals', students: 58, completion: 90, rating: 4.9, status: 'completed' as const, newEnrollments: 0 },
  { id: 4, title: 'Node.js Backend', students: 42, completion: 20, rating: 4.5, status: 'draft' as const, newEnrollments: 0 },
];

const mockTodaySchedule = [
  { time: '10:00', title: 'React Hooks Canlı Ders', type: 'live' as const, isNow: false },
  { time: '14:00', title: 'Python Q&A Session', type: 'meeting' as const, isNow: true },
  { time: '16:00', title: 'Node.js Workshop', type: 'live' as const, isNow: false },
];

const mockRecentActivity = [
  { id: 1, type: 'enrollment', student: 'Emre Yıldız', course: 'React Modern Web', time: '30 dk önce' },
  { id: 2, type: 'completion', student: 'Selin Acar', course: 'JavaScript Fundamentals', time: '2 saat önce' },
  { id: 3, type: 'question', student: 'Can Özkan', course: 'Python Veri Bilimi', time: '3 saat önce' },
];

const mockWeeklyEngagement = [65, 72, 58, 80, 75, 42, 38];

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TeacherDashboard() {
  const user = useUser();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER - Hızlı aksiyonlar
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Öğretmen Paneli</h1>
          <p className="text-muted-foreground">
            Hoş geldin, {user?.first_name}. İşte bugünün özeti.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/courses/create')}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Yeni Kurs
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/live-classes/start')}
            leftIcon={<Video className="h-4 w-4" />}
          >
            Canlı Ders Başlat
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          METRICS ROW
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={BookOpen}
          label="Aktif Kurslar"
          value={mockMetrics.activeCourses}
          color="primary"
          delay={0.1}
          onClick={() => navigate('/courses')}
        />
        <MetricCard
          icon={Users}
          label="Toplam Öğrenci"
          value={mockMetrics.totalStudents}
          change={8}
          trend="up"
          changeLabel="+28 bu hafta"
          color="info"
          delay={0.2}
          onClick={() => navigate('/students')}
        />
        <MetricCard
          icon={FileText}
          label="Bekleyen Değerlendirme"
          value={mockMetrics.pendingEvaluations}
          changeLabel={`${mockMetrics.urgentEvaluations} acil`}
          color="warning"
          delay={0.3}
          onClick={() => navigate('/evaluations')}
        />
        <MetricCard
          icon={TrendingUp}
          label="Ortalama Başarı"
          value={`%${mockMetrics.averageSuccess}`}
          change={5}
          trend="up"
          color="success"
          delay={0.4}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          URGENT ALERT - Acil değerlendirmeler varsa
          ═══════════════════════════════════════════════════════════════════════ */}
      {mockMetrics.urgentEvaluations > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl"
        >
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-orange-700 dark:text-orange-400">
              {mockMetrics.urgentEvaluations} sınav değerlendirme bekliyor
            </p>
            <p className="text-sm text-muted-foreground">
              24 saatten uzun süredir bekleyen değerlendirmeler var
            </p>
          </div>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => navigate('/evaluations?filter=urgent')}
          >
            Değerlendir
          </Button>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Evaluations */}
          <DashboardSection
            title="Bekleyen Değerlendirmeler"
            icon={FileText}
            action="Tümünü Gör"
            onAction={() => navigate('/evaluations')}
          >
            <div className="space-y-2">
              {mockPendingEvaluations.slice(0, 4).map((evaluation) => (
                <EvaluationItem
                  key={evaluation.id}
                  evaluation={evaluation}
                  onClick={() => navigate(`/evaluations/${evaluation.id}`)}
                />
              ))}
            </div>
          </DashboardSection>

          {/* My Courses */}
          <DashboardSection
            title="Kurslarım"
            icon={BookOpen}
            action="Tümünü Gör"
            onAction={() => navigate('/courses')}
          >
            <div className="grid md:grid-cols-2 gap-4">
              {mockMyCourses.slice(0, 4).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={() => navigate(`/courses/${course.id}`)}
                />
              ))}
            </div>
          </DashboardSection>

          {/* Recent Activity */}
          <DashboardSection
            title="Son Aktiviteler"
            icon={Clock}
          >
            <div className="space-y-2">
              {mockRecentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </DashboardSection>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <DashboardSection title="Bugünün Programı" icon={Calendar}>
            <div className="space-y-1">
              {mockTodaySchedule.length > 0 ? (
                mockTodaySchedule.map((item, index) => (
                  <ScheduleItem
                    key={index}
                    time={item.time}
                    title={item.title}
                    type={item.type}
                    isNow={item.isNow}
                    onClick={() => navigate('/live-classes')}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Bugün için planlanmış ders yok
                </p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/schedule/create')}
              >
                Ders Planla
              </Button>
            </div>
          </DashboardSection>

          {/* Weekly Engagement */}
          <DashboardSection title="Haftalık Etkileşim" icon={TrendingUp}>
            <div className="space-y-4">
              <MiniChart data={mockWeeklyEngagement} height={60} color="primary" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pzt</span>
                <span>Sal</span>
                <span>Çar</span>
                <span>Per</span>
                <span>Cum</span>
                <span>Cmt</span>
                <span>Paz</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Toplam görüntülenme</span>
                <span className="font-semibold">2,847</span>
              </div>
            </div>
          </DashboardSection>

          {/* Quick Stats */}
          <DashboardSection title="Hızlı İstatistikler" icon={Star}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ortalama kurs puanı</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">4.7</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tamamlama oranı</span>
                <span className="font-semibold">68%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Aktif öğrenci</span>
                <span className="font-semibold">287</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bu ay sertifika</span>
                <span className="font-semibold">34</span>
              </div>
            </div>
          </DashboardSection>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧩 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface EvaluationItemProps {
  evaluation: {
    id: number;
    student: string;
    exam: string;
    course: string;
    submittedAt: string;
    urgent: boolean;
  };
  onClick?: () => void;
}

function EvaluationItem({ evaluation, onClick }: EvaluationItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer',
        evaluation.urgent 
          ? 'bg-orange-500/5 hover:bg-orange-500/10' 
          : 'hover:bg-muted'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold',
        evaluation.urgent ? 'bg-orange-500/20 text-orange-600' : 'bg-primary/10 text-primary'
      )}>
        {evaluation.student.split(' ').map(n => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{evaluation.student}</p>
          {evaluation.urgent && (
            <span className="shrink-0 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded">
              Acil
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{evaluation.exam}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm text-muted-foreground">{evaluation.submittedAt}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

interface CourseCardProps {
  course: {
    id: number;
    title: string;
    students: number;
    completion: number;
    rating: number;
    status: 'active' | 'completed' | 'draft';
    newEnrollments: number;
  };
  onClick?: () => void;
}

function CourseCard({ course, onClick }: CourseCardProps) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-xl border border-border hover:border-primary/50 transition-all cursor-pointer bg-card"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium line-clamp-1">{course.title}</h3>
        <StatusBadge status={course.status} />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Users className="h-4 w-4" />
            {course.students} öğrenci
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            {course.rating}
          </span>
        </div>
        
        <ProgressIndicator
          value={course.completion}
          label="Tamamlanma"
          size="sm"
        />
        
        {course.newEnrollments > 0 && (
          <p className="text-xs text-green-600 dark:text-green-400">
            +{course.newEnrollments} yeni kayıt bu hafta
          </p>
        )}
      </div>
    </div>
  );
}

interface ActivityItemProps {
  activity: {
    id: number;
    type: string;
    student: string;
    course: string;
    time: string;
  };
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'enrollment': return <Users className="h-4 w-4 text-blue-500" />;
      case 'completion': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'question': return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = () => {
    switch (activity.type) {
      case 'enrollment': return `${activity.student} kursa kaydoldu`;
      case 'completion': return `${activity.student} kursu tamamladı`;
      case 'question': return `${activity.student} soru sordu`;
      default: return activity.student;
    }
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        {getActivityIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{getActivityText()}</p>
        <p className="text-xs text-muted-foreground truncate">{activity.course}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
    </div>
  );
}
