/**
 * Main Application Component
 * React Router ve global provider'ları içerir
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Layouts
import { AppLayout, AuthLayout } from '@/layouts';

// Route Guards
import { ProtectedRoute, GuestRoute, RoleRoute, AdminRoute, SuperAdminRoute } from '@/routes/guards';

// Toast Container
import { ToastContainer } from '@/components/ui';

// AI Provider
import { AIProvider } from '@lib/ai';

// Stores
import { useAuthStore } from '@/stores';

// Auth Pages (Eager loaded for fast initial access)
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, SuperAdminLoginPage } from '@/pages/auth';

// Lazy loaded pages for code splitting
// Dashboards (Lazy loaded for better code splitting)
const StudentDashboard = lazy(() => import('@/pages/dashboards/StudentDashboard'));
const TeacherDashboard = lazy(() => import('@/pages/dashboards/TeacherDashboard'));
const AdminDashboard = lazy(() => import('@/pages/dashboards/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('@/pages/dashboards/SuperAdminDashboard'));
const CoursesPage = lazy(() => import('@/pages/courses/CoursesPage'));
const CourseDetailPage = lazy(() => import('@/pages/courses/CourseDetailPage'));
const MyCoursesPage = lazy(() => import('@/pages/courses/MyCoursesPage'));
const EducationVideosPage = lazy(() => import('@/pages/courses/EducationVideosPage'));

const ContentsPage = lazy(() => import('@/pages/contents/ContentsPage'));
const ContentDetailPage = lazy(() => import('@/pages/contents/ContentDetailPage'));
const VideoWatchPage = lazy(() => import('@/pages/contents/VideoWatchPage'));

const LiveClassesPage = lazy(() => import('@/pages/live/LiveClassesPage'));
const LiveClassRoomPage = lazy(() => import('@/pages/live/LiveClassRoomPage'));
const StartLiveClassPage = lazy(() => import('@/pages/live/StartLiveClassPage'));

// AI Pages
const AIChatPage = lazy(() => import('@/pages/ai/AIChatPage'));

// Teacher Pages
const CourseManagementPage = lazy(() => import('@/pages/teacher/CourseManagementPage'));
const VideoUploadPage = lazy(() => import('@/pages/teacher/VideoUploadPage'));
const CalendarManagementPage = lazy(() => import('@/pages/teacher/CalendarManagementPage'));
const ExamManagementPage = lazy(() => import('@/pages/teacher/ExamManagementPage'));
const QuizManagementPage = lazy(() => import('@/pages/teacher/QuizManagementPage'));

const ExamsPage = lazy(() => import('@/pages/exams/ExamsPage'));
const ExamTakePage = lazy(() => import('@/pages/exams/ExamTakePage'));
const ExamResultsPage = lazy(() => import('@/pages/exams/ExamResultsPage'));

// Auth related
import { ForceChangePasswordPage } from '@/pages/auth';

const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'));

// AI Admin Pages
const AIControlPanelPage = lazy(() => import('@/pages/admin/AIControlPanelPage'));
const AIDashboardPage = lazy(() => import('@/pages/admin/AIDashboardPage'));
const AIQuotaManagementPage = lazy(() => import('@/pages/admin/AIQuotaManagementPage'));

// Super Admin Pages
const SystemConfigPage = lazy(() => import('@/pages/super-admin/SystemConfigPage'));
const AuditLogsPage = lazy(() => import('@/pages/super-admin/AuditLogsPage'));
const SecurityCenterPage = lazy(() => import('@/pages/super-admin/SecurityCenterPage'));
const AIPrivacyCenterPage = lazy(() => import('@/pages/super-admin/AIPrivacyCenterPage'));
const OrganizationManagementPage = lazy(() => import('@/pages/admin/OrganizationManagementPage'));
const OrganizationDetailPage = lazy(() => import('@/pages/super-admin/OrganizationDetailPage'));

const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
// Notifications ve Messages sayfaları kaldırıldı
const SchedulePage = lazy(() => import('@/pages/schedule/SchedulePage'));

const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
      </div>
    </div>
  );
}

// React Query Client Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function App() {
  // AI mode'u environment'a göre belirle
  const aiMode: 'api' | 'mock' = import.meta.env.VITE_AI_MODE === 'mock' ? 'mock' : 'api';
  
  return (
    <QueryClientProvider client={queryClient}>
      <AIProvider mode={aiMode} autoInitialize>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Public Auth Routes */}
            <Route element={<GuestRoute />}>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/super-admin-login" element={<SuperAdminLoginPage />} />
              </Route>
            </Route>

            {/* Force Password Change - Accessible after login if required */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AuthLayout />}>
                <Route path="/change-password" element={<ForceChangePasswordPage />} />
              </Route>
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Dashboard - Role Based */}
                <Route path="/dashboard" element={<DashboardRouter />} />

                {/* Student Routes */}
                <Route element={<RoleRoute roles={['student', 'teacher', 'admin', 'super_admin']} />}>
                  <Route path="/courses" element={<CoursesPage />} />
                  <Route path="/courses/:id" element={<CourseDetailPage />} />
                  <Route path="/my-courses" element={<MyCoursesPage />} />
                  
                  {/* Education Videos - All roles can view */}
                  <Route path="/student/education-videos" element={<EducationVideosPage />} />
                  
                  {/* Contents */}
                  <Route path="/contents" element={<ContentsPage />} />
                  <Route path="/contents/:id" element={<ContentDetailPage />} />
                  <Route path="/contents/:id/watch" element={<VideoWatchPage />} />
                  
                  {/* Live Classes */}
                  <Route path="/live" element={<LiveClassesPage />} />
                  <Route path="/live/:id" element={<LiveClassRoomPage />} />
                  
                  {/* AI Chat */}
                  <Route path="/ai-chat" element={<AIChatPage />} />
                  
                  {/* Exams */}
                  <Route path="/exams" element={<ExamsPage />} />
                  <Route path="/exams/:id/take" element={<ExamTakePage />} />
                  <Route path="/exams/:id/results" element={<ExamResultsPage />} />
                  <Route path="/schedule" element={<SchedulePage />} />
                </Route>

                {/* Teacher Routes */}
                <Route element={<RoleRoute roles={['teacher', 'admin', 'super_admin']} />}>
                  <Route path="/my-students" element={<div>Öğrencilerim</div>} />
                  <Route path="/evaluations" element={<div>Değerlendirmeler</div>} />
                  <Route path="/teacher/courses" element={<CourseManagementPage />} />
                  <Route path="/teacher/calendar" element={<CalendarManagementPage />} />
                  <Route path="/teacher/exams" element={<ExamManagementPage />} />
                  <Route path="/teacher/quizzes" element={<QuizManagementPage />} />
                  <Route path="/teacher/courses/:courseId/topics/:topicId/videos/add" element={<VideoUploadPage />} />
                  <Route path="/teacher/education-videos" element={<EducationVideosPage />} />
                  <Route path="/live-classes/start" element={<StartLiveClassPage />} />
                </Route>

                {/* Admin Routes */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin/users" element={<UsersPage />} />
                  <Route path="/admin/roles" element={<RolesPage />} />
                  <Route path="/admin/reports" element={<ReportsPage />} />
                  <Route path="/admin/settings" element={<SettingsPage />} />
                  {/* AI Management Routes */}
                  <Route path="/admin/ai/dashboard" element={<AIDashboardPage />} />
                  <Route path="/admin/ai/control" element={<AIControlPanelPage />} />
                  <Route path="/admin/ai/quotas" element={<AIQuotaManagementPage />} />
                </Route>

                {/* Super Admin Routes */}
                <Route element={<SuperAdminRoute />}>
                  <Route path="/super-admin/system" element={<SystemConfigPage />} />
                  <Route path="/super-admin/audit" element={<AuditLogsPage />} />
                  <Route path="/super-admin/security" element={<SecurityCenterPage />} />
                  <Route path="/super-admin/organizations" element={<OrganizationManagementPage />} />
                  <Route path="/super-admin/organizations/:id" element={<OrganizationDetailPage />} />
                  {/* AI Privacy Center (KVKK/GDPR) */}
                  <Route path="/super-admin/ai/privacy" element={<AIPrivacyCenterPage />} />
                  {/* Education Videos - Super Admin manages system videos */}
                  <Route path="/education-videos" element={<EducationVideosPage />} />
                  {/* Exam Management - Super Admin manages system exams */}
                  <Route path="/super-admin/exams" element={<ExamManagementPage />} />
                  <Route path="/super-admin/quizzes" element={<QuizManagementPage />} />
                </Route>

                {/* Common Protected Routes */}
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* React Query Devtools - only in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} position="bottom" />}
      </AIProvider>
    </QueryClientProvider>
  );
}

/**
 * Dashboard Router Component
 * Kullanıcı rolüne göre doğru dashboard'a yönlendirir
 */
function DashboardRouter() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
    default:
      return <StudentDashboard />;
  }
}
