/**
 * Dashboards Index
 * 
 * NOT: Dashboard'lar routes/config.ts'de lazy load ediliyor.
 * Bu dosya sadece type export için kullanılır.
 * Component exportları kaldırıldı çünkü dynamic import ile çakışıyordu.
 */

// Type-only exports if needed
export type { default as StudentDashboardType } from './StudentDashboard';
export type { default as TeacherDashboardType } from './TeacherDashboard';
export type { default as AdminDashboardType } from './AdminDashboard';
export type { default as SuperAdminDashboardType } from './SuperAdminDashboard';
