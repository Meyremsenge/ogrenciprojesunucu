/**
 * Student Dashboard - UX Optimized + API Entegrasyonlu
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Trophy,
  Target,
  Play,
  Calendar,
  FileText,
  ChevronRight,
  Flame,
  Star,
  TrendingUp,
  Loader2,
  AlertCircle,
<<<<<<< HEAD
=======
  CheckCircle2,
>>>>>>> eski/main
} from 'lucide-react';

import { useUser } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  MetricCard,
  DashboardSection,
  ProgressIndicator,
  ScheduleItem,
  AchievementBadge,
} from '@/components/dashboard';
import { getStudentDashboard, type StudentDashboardData } from '@/services/dashboardService';
<<<<<<< HEAD
=======
import { getMyGoals, type Goal, GOAL_STATUS_LABELS, getGoalStatusColor, getGoalTypeIcon } from '@/services/goalService';
>>>>>>> eski/main

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function StudentDashboard() {
  const user = useUser();
  const navigate = useNavigate();

  // API'den dashboard verilerini çek
  const { data: dashboardData, isLoading, error } = useQuery<StudentDashboardData>({
    queryKey: ['studentDashboard'],
    queryFn: getStudentDashboard,
    staleTime: 1000 * 60 * 5, // 5 dakika cache
    refetchOnWindowFocus: true,
  });

<<<<<<< HEAD
=======
  // Hedeflerimi çek
  const { data: goalsData } = useQuery({
    queryKey: ['myGoals'],
    queryFn: () => getMyGoals({ status: 'pending' }),
    staleTime: 1000 * 60 * 2, // 2 dakika cache
  });

>>>>>>> eski/main
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Veriler yüklenirken bir hata oluştu</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Tekrar Dene
          </Button>
        </div>
      </div>
    );
  }

  // Veri yoksa fallback
  const metrics = dashboardData?.metrics || {
    activeCourses: 0,
    weeklyStudyHours: 0,
    completedLessons: 0,
    overallProgress: 0,
    streak: 0,
  };
  
  const currentCourse = dashboardData?.currentCourse;
  const upcomingExams = dashboardData?.upcomingExams || [];
  const continueLearning = dashboardData?.continueLearning || [];
  const todaySchedule = dashboardData?.todaySchedule || [];
  const weeklyProgress = dashboardData?.weeklyProgress || [];
  const achievements = dashboardData?.achievements || [];

  const handleContinueLearning = () => {
    if (currentCourse) {
      navigate(`/courses/${currentCourse.id}/watch`);
    } else {
      navigate('/courses');
    }
  };

  const handleViewExam = (examId: number) => {
    navigate(`/exams/${examId}`);
  };

  const handleViewCourse = (courseId: number) => {
    navigate(`/courses/${courseId}`);
  };

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION - Ana aksiyon alanı
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-blue-600 rounded-2xl p-6 text-white"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,white_1px,transparent_1px)] bg-[size:20px_20px]" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left - Greeting & Current Progress */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {metrics.streak > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-sm">
                    <Flame className="h-4 w-4 text-orange-300" />
                    <span>{metrics.streak} gün seri!</span>
                  </span>
                )}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                Hoş geldin, {user?.first_name}! 👋
              </h1>
              {currentCourse ? (
                <p className="text-white/80 mb-4">
                  &ldquo;{currentCourse.title}&rdquo; dersinde kaldığın yerden devam et.
                </p>
              ) : (
                <p className="text-white/80 mb-4">
                  Yeni bir kursa kaydol ve öğrenmeye başla!
                </p>
              )}
              
              {/* Current course quick info */}
              {currentCourse && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 max-w-md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{currentCourse.currentLesson}</p>
                      <p className="text-sm text-white/70">Ders {currentCourse.currentLessonNumber}/{currentCourse.totalLessons}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Kurs ilerlemesi</span>
                      <span className="font-medium">{currentCourse.progress}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all"
                        style={{ width: `${currentCourse.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right - CTA */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleContinueLearning}
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-lg"
                leftIcon={<Play className="h-5 w-5" />}
              >
                Derse Devam Et
              </Button>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => navigate('/courses')}
              >
                Tüm Kurslarım
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          METRICS ROW - 4 ana metrik
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={BookOpen}
          label="Aktif Kurslar"
          value={metrics.activeCourses}
          color="primary"
          delay={0.1}
          onClick={() => navigate('/courses')}
        />
        <MetricCard
          icon={Clock}
          label="Bu Hafta"
          value={`${metrics.weeklyStudyHours} saat`}
          change={25}
          trend="up"
          color="info"
          delay={0.2}
        />
        <MetricCard
          icon={Target}
          label="Tamamlanan Ders"
          value={metrics.completedLessons}
          change={5}
          trend="up"
          color="success"
          delay={0.3}
        />
        <MetricCard
          icon={Trophy}
          label="Genel İlerleme"
          value={`%${metrics.overallProgress}`}
          color="warning"
          delay={0.4}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT GRID
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Exams - Time sensitive, high priority */}
          {upcomingExams.length > 0 && (
            <DashboardSection
              title="Yaklaşan Sınavlar"
              icon={Target}
              action="Tümünü Gör"
              onAction={() => navigate('/exams')}
            >
              <div className="space-y-3">
                {upcomingExams.slice(0, 3).map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    onClick={() => handleViewExam(exam.id)}
                  />
                ))}
              </div>
            </DashboardSection>
          )}

          {/* Continue Learning */}
          {continueLearning.length > 0 ? (
            <DashboardSection
              title="Devam Et"
              icon={Play}
              action="Tüm Kurslar"
              onAction={() => navigate('/courses')}
            >
              <div className="space-y-3">
                {continueLearning.slice(0, 3).map((course) => (
                  <CourseProgressCard
                    key={course.id}
                    course={course}
                    onClick={() => handleViewCourse(course.id)}
                  />
                ))}
              </div>
            </DashboardSection>
          ) : (
            <DashboardSection
              title="Kurs Yok"
              icon={BookOpen}
              action="Kurslara Göz At"
              onAction={() => navigate('/courses')}
            >
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Henüz bir kursa kayıtlı değilsiniz</p>
                <Button className="mt-4" onClick={() => navigate('/courses')}>
                  Kurslara Göz At
                </Button>
              </div>
            </DashboardSection>
          )}
        </div>

        {/* Right Column - 1/3 width (Sidebar) */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <DashboardSection title="Bugünün Programı" icon={Calendar}>
            <div className="space-y-1">
              {todaySchedule.length > 0 ? (
                todaySchedule.map((item, index) => (
                  <ScheduleItem
                    key={index}
                    time={item.time}
                    title={item.title}
                    type={item.type}
                    isNow={item.isNow}
                    onClick={() => {
                      if (item.type === 'live') navigate('/live-classes');
                      if (item.type === 'exam') navigate('/exams');
                    }}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Bugün için planlanmış etkinlik yok
                </p>
              )}
            </div>
          </DashboardSection>

          {/* Weekly Progress */}
          {weeklyProgress.length > 0 && (
            <DashboardSection title="Haftalık Çalışma" icon={TrendingUp}>
              <div className="space-y-3">
                {weeklyProgress.map((day) => (
                  <div key={day.day} className="flex items-center gap-3">
                    <span className={cn(
                      'text-sm w-8',
                      day.active ? 'font-semibold text-primary' : 'text-muted-foreground'
                    )}>
                      {day.day}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          day.active ? 'bg-primary/50' : 'bg-primary'
                        )}
                        style={{ width: `${day.value}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">
                      {day.value > 0 ? `${day.value}%` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </DashboardSection>
          )}

<<<<<<< HEAD
=======
          {/* Hedeflerim */}
          {goalsData && goalsData.goals.length > 0 && (
            <DashboardSection title="Hedeflerim" icon={Target}>
              <div className="space-y-2">
                {goalsData.goals.slice(0, 4).map((goal: Goal) => (
                  <GoalCard key={goal.id} goal={goal} onClick={() => {
                    if (goal.target_type === 'exam' && goal.target_id) {
                      navigate(`/exams/${goal.target_id}`);
                    }
                  }} />
                ))}
              </div>
              {goalsData.count > 4 && (
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-sm"
                  onClick={() => navigate('/goals')}
                >
                  Tümünü Gör ({goalsData.count})
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </DashboardSection>
          )}

>>>>>>> eski/main
          {/* Achievements */}
          {achievements.length > 0 && (
            <DashboardSection title="Başarılar" icon={Star}>
              <div className="flex flex-wrap gap-2">
                {achievements.map((achievement, index) => (
                  <AchievementBadge
                    key={index}
                    emoji={achievement.emoji}
                    label={achievement.label}
                    isNew={achievement.isNew}
                  />
                ))}
              </div>
            </DashboardSection>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧩 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface ExamCardProps {
  exam: {
    id: number;
    title: string;
    course: string;
    date: string;
    timeLeft: string;
    questions: number;
    duration: string;
  };
  onClick?: () => void;
}

function ExamCard({ exam, onClick }: ExamCardProps) {
  const isUrgent = exam.timeLeft.includes('gün') && parseInt(exam.timeLeft) <= 2;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer',
        isUrgent 
          ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40' 
          : 'bg-muted/50 border-transparent hover:bg-muted'
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
        isUrgent ? 'bg-orange-500/10 text-orange-500' : 'bg-primary/10 text-primary'
      )}>
        <FileText className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{exam.title}</h3>
          {isUrgent && (
            <span className="shrink-0 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
              Yaklaşıyor
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{exam.course}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-medium">{exam.timeLeft}</p>
        <p className="text-xs text-muted-foreground">{exam.questions} soru • {exam.duration}</p>
      </div>
    </div>
  );
}

interface CourseProgressCardProps {
  course: {
    id: number;
    title: string;
    instructor: string;
    progress: number;
    nextLesson: string;
  };
  onClick?: () => void;
}

function CourseProgressCard({ course, onClick }: CourseProgressCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
        <BookOpen className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{course.title}</h3>
        <p className="text-sm text-muted-foreground truncate">
          Sonraki: {course.nextLesson}
        </p>
        <div className="mt-2">
          <ProgressIndicator
            value={course.progress}
            size="sm"
            showValue={false}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium">{course.progress}%</span>
        <button className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors">
          <Play className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

// Goal Card Component
interface GoalCardProps {
  goal: Goal;
  onClick?: () => void;
}

function GoalCard({ goal, onClick }: GoalCardProps) {
  const dueDate = goal.due_date ? new Date(goal.due_date) : null;
  const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft > 0;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
        goal.status === 'completed' 
          ? 'bg-green-500/5 border-green-500/20'
          : isUrgent
            ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40'
            : isOverdue
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-muted/50 border-transparent hover:bg-muted'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0',
        goal.status === 'completed'
          ? 'bg-green-500/10'
          : isUrgent
            ? 'bg-orange-500/10'
            : 'bg-primary/10'
      )}>
        {goal.status === 'completed' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          getGoalTypeIcon(goal.goal_type)
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{goal.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            getGoalStatusColor(goal.status)
          )}>
            {GOAL_STATUS_LABELS[goal.status]}
          </span>
          {daysLeft !== null && goal.status !== 'completed' && (
            <span className={cn(
              'text-xs',
              isOverdue ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-muted-foreground'
            )}>
              {isOverdue 
                ? `${Math.abs(daysLeft)} gün geçti` 
                : daysLeft === 0 
                  ? 'Bugün!' 
                  : `${daysLeft} gün kaldı`}
            </span>
          )}
        </div>
      </div>
      
      {/* Progress */}
      {goal.target_score && (
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Hedef</p>
          <p className="text-sm font-medium">%{goal.target_score}</p>
        </div>
      )}
    </div>
  );
}
>>>>>>> eski/main
