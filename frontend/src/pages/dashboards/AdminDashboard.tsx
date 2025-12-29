/**
 * Admin Dashboard - UX Optimized
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * UX PRENSİPLERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🎯 GÖSTERILECEK METRİKLER (Öncelik Sırasına Göre):
 *    1. Toplam kullanıcı ve aktif oturumlar
 *    2. Aylık gelir ve büyüme
 *    3. Yeni kayıtlar (son 7 gün)
 *    4. Bekleyen onaylar (kurs/öğretmen)
 * 
 * 📌 ÖNCELİKLİ AKSİYONLAR:
 *    1. "Kullanıcı Onayla" - Bekleyen öğretmen onayları
 *    2. "Kurs Onayla" - Bekleyen kurs incelemeleri
 *    3. "Rapor Görüntüle" - Finansal raporlar
 * 
 * ⚖️ BİLGİ YOĞUNLUĞU DENGESİ:
 *    - Özet metrikler: Grid ile kompakt görünüm
 *    - Bekleyen işlemler: Liste formatında
 *    - Grafikler: Trend gösterimi (detaysız)
 *    - Kullanıcı aktivitesi: Son 5 kayıt
 * 
 * 🚫 GEREKSİZ VERİDEN KAÇINMA:
 *    - Tüm kullanıcı listesi ayrı sayfada
 *    - Detaylı finansal analiz raporlarda
 *    - Sistem logları ayrı sayfada
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  DollarSign,
  BookOpen,
  TrendingUp,
  TrendingDown,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  GraduationCap,
  FileText,
  Shield,
  Activity,
  ChevronRight,
  AlertTriangle,
  Eye,
  UserCheck,
  BookCheck,
} from 'lucide-react';

import { useUser } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  MetricCard,
  DashboardSection,
  StatusBadge,
  ProgressIndicator,
  MiniChart,
} from '@/components/dashboard';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const mockMetrics = {
  totalUsers: 12847,
  userGrowth: 12.5,
  activeSessions: 1234,
  monthlyRevenue: 248500,
  revenueGrowth: 8.3,
  totalCourses: 156,
  activeCourses: 142,
  pendingApprovals: 7,
};

const mockPendingTeachers = [
  { id: 1, name: 'Ahmet Çelik', email: 'ahmet@example.com', appliedAt: '2 gün önce', specialization: 'Web Development' },
  { id: 2, name: 'Fatma Yıldırım', email: 'fatma@example.com', appliedAt: '3 gün önce', specialization: 'Data Science' },
  { id: 3, name: 'Murat Özkan', email: 'murat@example.com', appliedAt: '5 gün önce', specialization: 'Mobile Development' },
];

const mockPendingCourses = [
  { id: 1, title: 'Flutter ile Mobil Uygulama', instructor: 'Emre Aydın', submittedAt: '1 gün önce', category: 'Mobile' },
  { id: 2, title: 'AWS Cloud Fundamentals', instructor: 'Selin Kara', submittedAt: '2 gün önce', category: 'Cloud' },
];

const mockRecentRegistrations = [
  { id: 1, name: 'Ali Veli', type: 'student', registeredAt: '10 dk önce' },
  { id: 2, name: 'Ayşe Yılmaz', type: 'student', registeredAt: '25 dk önce' },
  { id: 3, name: 'Mehmet Demir', type: 'teacher', registeredAt: '1 saat önce' },
  { id: 4, name: 'Zeynep Kaya', type: 'student', registeredAt: '2 saat önce' },
  { id: 5, name: 'Can Özdemir', type: 'student', registeredAt: '3 saat önce' },
];

const mockUserGrowthData = [820, 932, 901, 1034, 1190, 1230, 1410];
const mockRevenueData = [180, 195, 210, 225, 238, 242, 248];

const mockTopCourses = [
  { id: 1, title: 'React ile Modern Web', enrollments: 2847, revenue: 42500, growth: 15 },
  { id: 2, title: 'Python Veri Bilimi', enrollments: 2156, revenue: 38200, growth: 22 },
  { id: 3, title: 'JavaScript Fundamentals', enrollments: 1893, revenue: 28400, growth: 8 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const user = useUser();
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Yönetim Paneli</h1>
          <p className="text-muted-foreground">
            Merhaba {user?.first_name}, platformun güncel durumu aşağıda.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/reports')}
            leftIcon={<FileText className="h-4 w-4" />}
          >
            Raporlar
          </Button>
          <Button
            onClick={() => navigate('/admin/users')}
            leftIcon={<Users className="h-4 w-4" />}
          >
            Kullanıcı Yönetimi
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          METRICS GRID
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Toplam Kullanıcı"
          value={mockMetrics.totalUsers.toLocaleString()}
          change={mockMetrics.userGrowth}
          trend="up"
          color="primary"
          delay={0.1}
          onClick={() => navigate('/admin/users')}
        />
        <MetricCard
          icon={Activity}
          label="Aktif Oturum"
          value={mockMetrics.activeSessions.toLocaleString()}
          color="success"
          delay={0.2}
        />
        <MetricCard
          icon={DollarSign}
          label="Aylık Gelir"
          value={formatCurrency(mockMetrics.monthlyRevenue)}
          change={mockMetrics.revenueGrowth}
          trend="up"
          color="success"
          delay={0.3}
          onClick={() => navigate('/admin/finance')}
        />
        <MetricCard
          icon={BookOpen}
          label="Aktif Kurslar"
          value={`${mockMetrics.activeCourses}/${mockMetrics.totalCourses}`}
          color="info"
          delay={0.4}
          onClick={() => navigate('/admin/courses')}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PENDING APPROVALS ALERT
          ═══════════════════════════════════════════════════════════════════════ */}
      {mockMetrics.pendingApprovals > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl"
        >
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              {mockMetrics.pendingApprovals} onay bekleyen işlem var
            </p>
            <p className="text-sm text-muted-foreground">
              {mockPendingTeachers.length} öğretmen, {mockPendingCourses.length} kurs başvurusu
            </p>
          </div>
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600"
            onClick={() => navigate('/admin/approvals')}
          >
            İncele
          </Button>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Teacher Approvals */}
          <DashboardSection
            title="Bekleyen Öğretmen Başvuruları"
            icon={UserCheck}
            action="Tümünü Gör"
            onAction={() => navigate('/admin/teacher-approvals')}
          >
            <div className="space-y-2">
              {mockPendingTeachers.map((teacher) => (
                <TeacherApprovalItem
                  key={teacher.id}
                  teacher={teacher}
                  onApprove={() => console.log('Approve', teacher.id)}
                  onReject={() => console.log('Reject', teacher.id)}
                  onView={() => navigate(`/admin/teachers/${teacher.id}`)}
                />
              ))}
            </div>
          </DashboardSection>

          {/* Pending Course Approvals */}
          <DashboardSection
            title="Bekleyen Kurs Onayları"
            icon={BookCheck}
            action="Tümünü Gör"
            onAction={() => navigate('/admin/course-approvals')}
          >
            <div className="space-y-2">
              {mockPendingCourses.map((course) => (
                <CourseApprovalItem
                  key={course.id}
                  course={course}
                  onApprove={() => console.log('Approve', course.id)}
                  onReject={() => console.log('Reject', course.id)}
                  onView={() => navigate(`/admin/courses/${course.id}/review`)}
                />
              ))}
            </div>
          </DashboardSection>

          {/* Top Performing Courses */}
          <DashboardSection
            title="En İyi Performans Gösteren Kurslar"
            icon={TrendingUp}
            action="Detaylı Rapor"
            onAction={() => navigate('/admin/reports/courses')}
          >
            <div className="space-y-3">
              {mockTopCourses.map((course, index) => (
                <TopCourseItem key={course.id} course={course} rank={index + 1} />
              ))}
            </div>
          </DashboardSection>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* User Growth Chart */}
          <DashboardSection title="Kullanıcı Büyümesi" icon={TrendingUp}>
            <div className="space-y-4">
              <MiniChart data={mockUserGrowthData} height={80} color="primary" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pzt</span>
                <span>Sal</span>
                <span>Çar</span>
                <span>Per</span>
                <span>Cum</span>
                <span>Cmt</span>
                <span>Paz</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Bu hafta</p>
                  <p className="text-lg font-semibold text-green-600">+847</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Geçen hafta</p>
                  <p className="text-lg font-semibold">+723</p>
                </div>
              </div>
            </div>
          </DashboardSection>

          {/* Revenue Chart */}
          <DashboardSection title="Gelir Trendi" icon={DollarSign}>
            <div className="space-y-4">
              <MiniChart data={mockRevenueData} height={80} color="success" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Oca</span>
                <span>Şub</span>
                <span>Mar</span>
                <span>Nis</span>
                <span>May</span>
                <span>Haz</span>
                <span>Tem</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Yıllık toplam</span>
                  <span className="font-semibold">{formatCurrency(1538000)}</span>
                </div>
              </div>
            </div>
          </DashboardSection>

          {/* Recent Registrations */}
          <DashboardSection title="Son Kayıtlar" icon={UserPlus}>
            <div className="space-y-2">
              {mockRecentRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
                    reg.type === 'teacher' ? 'bg-purple-500/20 text-purple-600' : 'bg-blue-500/20 text-blue-600'
                  )}>
                    {reg.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{reg.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {reg.type === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {reg.registeredAt}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/admin/users?filter=recent')}
              >
                Tümünü Gör
              </Button>
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

interface TeacherApprovalItemProps {
  teacher: {
    id: number;
    name: string;
    email: string;
    appliedAt: string;
    specialization: string;
  };
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}

function TeacherApprovalItem({ teacher, onApprove, onReject, onView }: TeacherApprovalItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
        <GraduationCap className="h-5 w-5 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{teacher.name}</p>
        <p className="text-sm text-muted-foreground truncate">{teacher.specialization}</p>
      </div>
      <span className="text-sm text-muted-foreground shrink-0">{teacher.appliedAt}</span>
      <div className="flex gap-1 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onView}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
          onClick={onApprove}
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
          onClick={onReject}
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface CourseApprovalItemProps {
  course: {
    id: number;
    title: string;
    instructor: string;
    submittedAt: string;
    category: string;
  };
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}

function CourseApprovalItem({ course, onApprove, onReject, onView }: CourseApprovalItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
        <BookOpen className="h-5 w-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{course.title}</p>
        <p className="text-sm text-muted-foreground truncate">
          {course.instructor} • {course.category}
        </p>
      </div>
      <span className="text-sm text-muted-foreground shrink-0">{course.submittedAt}</span>
      <div className="flex gap-1 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onView}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
          onClick={onApprove}
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
          onClick={onReject}
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface TopCourseItemProps {
  course: {
    id: number;
    title: string;
    enrollments: number;
    revenue: number;
    growth: number;
  };
  rank: number;
}

function TopCourseItem({ course, rank }: TopCourseItemProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
        rank === 1 && 'bg-yellow-500/20 text-yellow-600',
        rank === 2 && 'bg-slate-400/20 text-slate-600',
        rank === 3 && 'bg-orange-500/20 text-orange-600'
      )}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{course.title}</p>
        <p className="text-sm text-muted-foreground">
          {course.enrollments.toLocaleString()} kayıt
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold">{formatCurrency(course.revenue)}</p>
        <p className={cn(
          'text-sm flex items-center justify-end gap-1',
          course.growth > 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {course.growth > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {course.growth}%
        </p>
      </div>
    </div>
  );
}
