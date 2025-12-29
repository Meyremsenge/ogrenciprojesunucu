/**
 * Dashboard Service
 * 
 * Tüm dashboard türleri için veri toplama servisi.
 * Backend'deki farklı endpoint'lerden veri toplayarak dashboard'lara sunar.
 */

import api from './api';
import { getMyCourses, getCourses } from './courseService';
import { getExams, getMyAttempts, getMyPerformance, getPeerComparison } from './examService';
import { getSessions, getMySessions } from './liveSessionService';
import { getMyProfile } from './userService';
import { getDashboardStats, getUserGrowthChart, getRecentActivities } from './adminService';

// =============================================================================
// Types
// =============================================================================

export interface StudentDashboardData {
  metrics: {
    activeCourses: number;
    weeklyStudyHours: number;
    completedLessons: number;
    overallProgress: number;
    streak: number;
  };
  currentCourse: {
    id: number;
    title: string;
    instructor: string;
    progress: number;
    currentLesson: string;
    currentLessonNumber: number;
    totalLessons: number;
    thumbnail?: string;
  } | null;
  upcomingExams: {
    id: number;
    title: string;
    course: string;
    date: string;
    timeLeft: string;
    questions: number;
    duration: string;
  }[];
  continueLearning: {
    id: number;
    title: string;
    instructor: string;
    progress: number;
    nextLesson: string;
  }[];
  todaySchedule: {
    time: string;
    title: string;
    type: 'live' | 'exam' | 'deadline';
    isNow?: boolean;
  }[];
  weeklyProgress: {
    day: string;
    value: number;
    active?: boolean;
  }[];
  achievements: {
    emoji: string;
    label: string;
    isNew: boolean;
  }[];
}

export interface TeacherDashboardData {
  metrics: {
    totalCourses: number;
    totalStudents: number;
    averageRating: number;
    completionRate: number;
  };
  myCourses: {
    id: number;
    title: string;
    studentCount: number;
    rating: number;
    status: string;
  }[];
  upcomingSessions: {
    id: number;
    title: string;
    scheduledAt: string;
    registeredCount: number;
  }[];
  pendingGrades: {
    id: number;
    examTitle: string;
    studentName: string;
    submittedAt: string;
  }[];
  recentActivity: {
    type: string;
    message: string;
    timestamp: string;
  }[];
}

export interface AdminDashboardData {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalCourses: number;
    totalRevenue: number;
    userGrowth: number;
    courseGrowth: number;
  };
  userGrowthChart: {
    date: string;
    value: number;
  }[];
  revenueChart: {
    date: string;
    value: number;
  }[];
  recentActivities: {
    id: number;
    action: string;
    user: string;
    timestamp: string;
  }[];
  pendingApprovals: number;
  systemHealth: {
    status: string;
    uptime: number;
    errorRate: number;
  };
}

// =============================================================================
// Student Dashboard
// =============================================================================

export async function getStudentDashboard(): Promise<StudentDashboardData> {
  try {
    // Paralel API çağrıları
    const [enrollmentsRes, examsRes, sessionsRes, profileRes] = await Promise.all([
      getMyCourses().catch(() => ({ data: { enrollments: [] } })),
      getExams({ status: 'published' }).catch(() => ({ data: { exams: [] } })),
      getMySessions().catch(() => ({ data: { sessions: [] } })),
      getMyProfile().catch(() => null),
    ]);

    // Type-safe erişim
    const enrollmentsData = enrollmentsRes as any;
    const enrollments = enrollmentsData?.data?.enrollments || enrollmentsData?.enrollments || [];
    const exams = examsRes?.data?.exams || [];
    const sessions = sessionsRes?.data?.sessions || [];

    // En son erişilen kursu bul
    const sortedEnrollments = [...enrollments].sort((a: any, b: any) => {
      const dateA = new Date(a.last_accessed_at || 0).getTime();
      const dateB = new Date(b.last_accessed_at || 0).getTime();
      return dateB - dateA;
    });

    const currentEnrollment = sortedEnrollments[0];
    const currentCourse = currentEnrollment ? {
      id: currentEnrollment.course?.id || currentEnrollment.course_id,
      title: currentEnrollment.course?.title || 'Kurs',
      instructor: currentEnrollment.course?.teacher_name || 'Eğitmen',
      progress: currentEnrollment.progress_percentage || 0,
      currentLesson: currentEnrollment.current_lesson_title || 'Ders',
      currentLessonNumber: currentEnrollment.completed_lessons || 1,
      totalLessons: currentEnrollment.course?.lesson_count || 1,
      thumbnail: currentEnrollment.course?.thumbnail,
    } : null;

    // Metrikleri hesapla
    const activeCourses = enrollments.filter((e: any) => e.progress_percentage < 100).length;
    const completedLessons = enrollments.reduce((sum: number, e: any) => sum + (e.completed_lessons || 0), 0);
    const totalProgress = enrollments.length > 0
      ? Math.round(enrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) / enrollments.length)
      : 0;

    // Yaklaşan sınavları formatla
    const now = new Date();
    const upcomingExams = exams
      .filter((exam: any) => {
        const dueDate = new Date(exam.due_date || exam.end_time);
        return dueDate > now && exam.status !== 'completed';
      })
      .slice(0, 3)
      .map((exam: any) => {
        const dueDate = new Date(exam.due_date || exam.end_time);
        const diffMs = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return {
          id: exam.id,
          title: exam.title,
          course: exam.course_title || exam.course?.title || 'Kurs',
          date: dueDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
          timeLeft: diffDays <= 0 ? 'Bugün' : `${diffDays} gün`,
          questions: exam.question_count || 0,
          duration: exam.duration_minutes ? `${exam.duration_minutes} dk` : '-',
        };
      });

    // Devam edilen kurslar
    const continueLearning = enrollments
      .filter((e: any) => e.progress_percentage > 0 && e.progress_percentage < 100)
      .slice(0, 3)
      .map((e: any) => ({
        id: e.course?.id || e.course_id,
        title: e.course?.title || 'Kurs',
        instructor: e.course?.teacher_name || 'Eğitmen',
        progress: e.progress_percentage || 0,
        nextLesson: e.current_lesson_title || 'Sonraki ders',
      }));

    // Bugünün programı
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaySchedule: StudentDashboardData['todaySchedule'] = [];
    
    // Canlı dersler
    sessions.forEach((session: any) => {
      const sessionDate = new Date(session.scheduled_at);
      if (sessionDate >= todayStart && sessionDate <= todayEnd) {
        const isNow = session.status === 'live';
        todaySchedule.push({
          time: sessionDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          title: `Canlı Ders: ${session.title}`,
          type: 'live',
          isNow,
        });
      }
    });

    // Sınav deadlines
    exams.forEach((exam: any) => {
      const examDate = new Date(exam.due_date || exam.end_time);
      if (examDate >= todayStart && examDate <= todayEnd) {
        todaySchedule.push({
          time: examDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          title: `Sınav: ${exam.title}`,
          type: 'exam',
        });
      }
    });

    // Zamana göre sırala
    todaySchedule.sort((a, b) => a.time.localeCompare(b.time));

    // Haftalık ilerleme (mock - gerçek tracking endpoint'i olmalı)
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const todayIndex = (new Date().getDay() + 6) % 7; // Pazartesi = 0
    const weeklyProgress = days.map((day, index) => ({
      day,
      value: index < todayIndex ? Math.floor(Math.random() * 100) : (index === todayIndex ? Math.floor(Math.random() * 50) : 0),
      active: index === todayIndex,
    }));

    // Başarılar (gerçek achievement sistemi olmalı)
    const achievements = [
      { emoji: '🔥', label: '7 Gün Seri', isNew: true },
      { emoji: '🏆', label: 'İlk Sertifika', isNew: false },
    ];

    return {
      metrics: {
        activeCourses,
        weeklyStudyHours: 12, // Tracking endpoint'i lazım
        completedLessons,
        overallProgress: totalProgress,
        streak: 7, // Tracking endpoint'i lazım
      },
      currentCourse,
      upcomingExams,
      continueLearning,
      todaySchedule,
      weeklyProgress,
      achievements,
    };
  } catch (error) {
    console.error('Student dashboard fetch error:', error);
    throw error;
  }
}

// =============================================================================
// Teacher Dashboard
// =============================================================================

export async function getTeacherDashboard(): Promise<TeacherDashboardData> {
  try {
    const [coursesRes, sessionsRes] = await Promise.all([
      api.get('/courses/my-courses').catch(() => ({ data: { data: [] } })),
      getSessions({ upcoming: true }).catch(() => ({ data: { sessions: [] } })),
    ]);

    const myCourses = coursesRes?.data?.data || [];
    const sessions = sessionsRes?.data?.sessions || [];

    // Metrikleri hesapla
    const totalStudents = myCourses.reduce((sum: number, c: any) => sum + (c.enrollment_count || 0), 0);
    const averageRating = myCourses.length > 0
      ? myCourses.reduce((sum: number, c: any) => sum + (c.rating || 0), 0) / myCourses.length
      : 0;

    return {
      metrics: {
        totalCourses: myCourses.length,
        totalStudents,
        averageRating: Math.round(averageRating * 10) / 10,
        completionRate: 75, // Hesaplanması gerekiyor
      },
      myCourses: myCourses.slice(0, 5).map((c: any) => ({
        id: c.id,
        title: c.title,
        studentCount: c.enrollment_count || 0,
        rating: c.rating || 0,
        status: c.status,
      })),
      upcomingSessions: sessions.slice(0, 3).map((s: any) => ({
        id: s.id,
        title: s.title,
        scheduledAt: s.scheduled_at,
        registeredCount: s.registered_count || 0,
      })),
      pendingGrades: [], // Backend endpoint gerekli
      recentActivity: [], // Backend endpoint gerekli
    };
  } catch (error) {
    console.error('Teacher dashboard fetch error:', error);
    throw error;
  }
}

// =============================================================================
// Admin Dashboard (adminService'i kullanır)
// =============================================================================

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  try {
    const [statsRes, userGrowth, activities] = await Promise.all([
      getDashboardStats().catch(() => null),
      getUserGrowthChart(30).catch(() => []),
      getRecentActivities(10).catch(() => []),
    ]);

    // Type-safe stats erişimi
    const stats = statsRes as any;

    return {
      stats: {
        totalUsers: stats?.users?.total || 0,
        activeUsers: stats?.users?.active || 0,
        totalCourses: stats?.courses?.total || 0,
        totalRevenue: stats?.revenue?.last_30_days || 0,
        userGrowth: stats?.users?.new_week || 0,
        courseGrowth: stats?.enrollments?.new_week || 0,
      },
      userGrowthChart: userGrowth.map((item: any) => ({
        date: item.date || item.label,
        value: item.count || item.value || 0,
      })),
      revenueChart: [], // getRevenueChart varsa eklenebilir
      recentActivities: activities.map((a: any) => ({
        id: a.id,
        action: a.action,
        user: a.user_name || a.user?.name || 'Kullanıcı',
        timestamp: a.created_at || a.timestamp,
      })),
      pendingApprovals: 0, // getPendingApprovals ile alınabilir
      systemHealth: {
        status: 'healthy',
        uptime: 99.9,
        errorRate: 0.1,
      },
    };
  } catch (error) {
    console.error('Admin dashboard fetch error:', error);
    throw error;
  }
}

// =============================================================================
// Export
// =============================================================================

export default {
  getStudentDashboard,
  getTeacherDashboard,
  getAdminDashboard,
};
