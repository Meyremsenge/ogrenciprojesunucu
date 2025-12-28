/**
 * Route Configuration
 * Rol bazlı route tanımları ve navigasyon yapısı
 */

import { lazy, ComponentType } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  FileQuestion,
  Video,
  Calendar,
  BarChart3,
  Users,
  Settings,
  Shield,
  Bell,
  MessageSquare,
  User,
  Bot,
  Gauge,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { Permission } from '@/types';

// ============================================================================
// ROUTE TYPES
// ============================================================================

export interface RouteConfig {
  path: string;
  element: ComponentType;
  title: string;
  icon?: LucideIcon;
  
  // Access control
  roles?: UserRole[];          // Hangi roller erişebilir
  permissions?: Permission[];  // Hangi izinler gerekli
  requireAuth?: boolean;       // Giriş gerekli mi
  
  // Navigation
  showInNav?: boolean;         // Menüde göster
  navOrder?: number;           // Menü sırası
  badge?: string | number;     // Badge (bildirim sayısı vb.)
  
  // Nested routes
  children?: RouteConfig[];
}

export interface NavItem {
  path: string;
  title: string;
  icon: LucideIcon;
  roles?: UserRole[];
  permissions?: Permission[];
  badge?: string | number;
  children?: NavItem[];
}

// ============================================================================
// LAZY LOADED PAGES
// ============================================================================

// Dashboards
const StudentDashboard = lazy(() => import('@/pages/dashboards/StudentDashboard'));
const TeacherDashboard = lazy(() => import('@/pages/dashboards/TeacherDashboard'));
const AdminDashboard = lazy(() => import('@/pages/dashboards/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('@/pages/dashboards/SuperAdminDashboard'));

// ============================================================================
// ROLE-BASED NAVIGATION
// ============================================================================

/**
 * Öğrenci navigasyon yapısı
 */
export const STUDENT_NAV: NavItem[] = [
  {
    path: '/dashboard',
    title: 'Ana Sayfa',
    icon: LayoutDashboard,
  },
  {
    path: '/my-courses',
    title: 'Kurslarım',
    icon: BookOpen,
  },
  {
    path: '/courses',
    title: 'Tüm Kurslar',
    icon: GraduationCap,
  },
  {
    path: '/ai-chat',
    title: 'AI Asistan',
    icon: Bot,
  },
  {
    path: '/live',
    title: 'Canlı Dersler',
    icon: Video,
  },
  {
    path: '/exams',
    title: 'Sınavlarım',
    icon: FileQuestion,
  },
  {
    path: '/schedule',
    title: 'Takvim',
    icon: Calendar,
  },
  {
    path: '/messages',
    title: 'Mesajlar',
    icon: MessageSquare,
  },
  {
    path: '/profile',
    title: 'Profilim',
    icon: User,
  },
];

/**
 * Öğretmen navigasyon yapısı
 */
export const TEACHER_NAV: NavItem[] = [
  {
    path: '/dashboard',
    title: 'Ana Sayfa',
    icon: LayoutDashboard,
  },
  {
    path: '/teacher/courses',
    title: 'Kurs Yönetimi',
    icon: BookOpen,
  },
  {
    path: '/teacher/calendar',
    title: 'Takvim Yönetimi',
    icon: Calendar,
  },
  {
    path: '/teacher/exams',
    title: 'Sınav Yönetimi',
    icon: FileQuestion,
  },
  {
    path: '/live-classes/start',
    title: 'Canlı Ders Başlat',
    icon: Video,
  },
  {
    path: '/live',
    title: 'Canlı Dersler',
    icon: Video,
  },
  {
    path: '/ai-chat',
    title: 'AI Asistan',
    icon: Bot,
  },
  {
    path: '/reports',
    title: 'Raporlar',
    icon: BarChart3,
    permissions: [Permission.REPORTS_VIEW],
  },
  {
    path: '/messages',
    title: 'Mesajlar',
    icon: MessageSquare,
  },
  {
    path: '/profile',
    title: 'Profilim',
    icon: User,
  },
];

/**
 * Admin navigasyon yapısı
 */
export const ADMIN_NAV: NavItem[] = [
  {
    path: '/dashboard',
    title: 'Genel Bakış',
    icon: LayoutDashboard,
  },
  {
    path: '/admin/users',
    title: 'Kullanıcılar',
    icon: Users,
    permissions: [Permission.USERS_READ],
  },
  {
    path: '/courses',
    title: 'Kurslar',
    icon: BookOpen,
    permissions: [Permission.COURSES_MANAGE],
  },
  {
    path: '/exams',
    title: 'Sınavlar',
    icon: FileQuestion,
    permissions: [Permission.EXAMS_MANAGE],
  },
  {
    path: '/admin/reports',
    title: 'Raporlar',
    icon: BarChart3,
    permissions: [Permission.REPORTS_VIEW],
  },
  {
    path: '/admin/ai',
    title: 'AI Yönetimi',
    icon: Bot,
    children: [
      {
        path: '/admin/ai/dashboard',
        title: 'AI Dashboard',
        icon: BarChart3,
      },
      {
        path: '/admin/ai/control',
        title: 'Kontrol Paneli',
        icon: Settings,
      },
      {
        path: '/admin/ai/quotas',
        title: 'Kota Yönetimi',
        icon: Gauge,
      },
    ],
  },
  {
    path: '/notifications',
    title: 'Bildirimler',
    icon: Bell,
  },
  {
    path: '/admin/settings',
    title: 'Ayarlar',
    icon: Settings,
    permissions: [Permission.SYSTEM_AUDIT],
  },
  {
    path: '/profile',
    title: 'Profilim',
    icon: User,
  },
];

/**
 * Süper Admin navigasyon yapısı
 */
export const SUPER_ADMIN_NAV: NavItem[] = [
  {
    path: '/dashboard',
    title: 'Genel Bakış',
    icon: LayoutDashboard,
  },
  {
    path: '/super-admin/organizations',
    title: 'Kurum Yönetimi',
    icon: Building2,
    permissions: [Permission.SYSTEM_CONFIG],
  },
  {
    path: '/admin/users',
    title: 'Kullanıcılar',
    icon: Users,
    permissions: [Permission.USERS_READ],
  },
  {
    path: '/admin/roles',
    title: 'Roller & Yetkiler',
    icon: Shield,
    permissions: [Permission.USERS_ASSIGN_ROLE],
  },
  {
    path: '/courses',
    title: 'Kurslar',
    icon: BookOpen,
    permissions: [Permission.COURSES_MANAGE],
  },
  {
    path: '/exams',
    title: 'Sınavlar',
    icon: FileQuestion,
    permissions: [Permission.EXAMS_MANAGE],
  },
  {
    path: '/admin/reports',
    title: 'Raporlar',
    icon: BarChart3,
    permissions: [Permission.REPORTS_VIEW],
  },
  {
    path: '/admin/ai',
    title: 'AI Yönetimi',
    icon: Bot,
    children: [
      {
        path: '/admin/ai/dashboard',
        title: 'AI Dashboard',
        icon: BarChart3,
      },
      {
        path: '/admin/ai/control',
        title: 'Kontrol Paneli',
        icon: Settings,
      },
      {
        path: '/admin/ai/quotas',
        title: 'Kota Yönetimi',
        icon: Gauge,
      },
      {
        path: '/super-admin/ai/privacy',
        title: 'Gizlilik Merkezi',
        icon: Shield,
      },
    ],
  },
  {
    path: '/notifications',
    title: 'Bildirimler',
    icon: Bell,
  },
  {
    path: '/admin/settings',
    title: 'Ayarlar',
    icon: Settings,
    permissions: [Permission.SYSTEM_CONFIG],
  },
  {
    path: '/profile',
    title: 'Profilim',
    icon: User,
  },
];

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Role göre navigasyon döner
 */
export function getNavigationByRole(role: UserRole): NavItem[] {
  switch (role) {
    case 'student':
      return STUDENT_NAV;
    case 'teacher':
      return TEACHER_NAV;
    case 'admin':
      return ADMIN_NAV;
    case 'super_admin':
      return SUPER_ADMIN_NAV;
    default:
      return STUDENT_NAV;
  }
}

/**
 * Role göre dashboard path döner
 */
export function getDashboardPath(_role: UserRole): string {
  return '/dashboard'; // Tüm roller için aynı path, içerik role göre değişir
}

/**
 * Role göre dashboard component döner
 */
export function getDashboardComponent(role: UserRole): ComponentType {
  switch (role) {
    case 'student':
      return StudentDashboard;
    case 'teacher':
      return TeacherDashboard;
    case 'admin':
      return AdminDashboard;
    case 'super_admin':
      return SuperAdminDashboard;
    default:
      return StudentDashboard;
  }
}
