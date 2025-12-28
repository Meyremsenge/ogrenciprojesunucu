/**
 * User Types & Role Definitions
 * JWT tabanlı authentication ve RBAC tipler
 */

// ============================================================================
// ROLES & PERMISSIONS
// ============================================================================

export type UserRole = 'student' | 'teacher' | 'admin' | 'super_admin';

export const ROLE_LEVELS: Record<UserRole, number> = {
  student: 1,
  teacher: 2,
  admin: 3,
  super_admin: 4,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Öğrenci',
  teacher: 'Öğretmen',
  admin: 'Yönetici',
  super_admin: 'Süper Yönetici',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  student: 'bg-blue-100 text-blue-800',
  teacher: 'bg-green-100 text-green-800',
  admin: 'bg-purple-100 text-purple-800',
  super_admin: 'bg-red-100 text-red-800',
};

// Permission enum - backend ile senkron
export enum Permission {
  // User
  USERS_CREATE = 'users:create',
  USERS_READ = 'users:read',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  USERS_MANAGE = 'users:manage',
  USERS_ACTIVATE = 'users:activate',
  USERS_ASSIGN_ROLE = 'users:assign_role',

  // Course
  COURSES_CREATE = 'courses:create',
  COURSES_READ = 'courses:read',
  COURSES_UPDATE = 'courses:update',
  COURSES_DELETE = 'courses:delete',
  COURSES_MANAGE = 'courses:manage',
  COURSES_PUBLISH = 'courses:publish',
  COURSES_ARCHIVE = 'courses:archive',
  COURSES_ENROLL = 'courses:enroll',

  // Content
  CONTENTS_CREATE = 'contents:create',
  CONTENTS_READ = 'contents:read',
  CONTENTS_UPDATE = 'contents:update',
  CONTENTS_DELETE = 'contents:delete',
  CONTENTS_MANAGE = 'contents:manage',
  CONTENTS_UPLOAD = 'contents:upload',

  // Exam
  EXAMS_CREATE = 'exams:create',
  EXAMS_READ = 'exams:read',
  EXAMS_UPDATE = 'exams:update',
  EXAMS_DELETE = 'exams:delete',
  EXAMS_MANAGE = 'exams:manage',
  EXAMS_TAKE = 'exams:take',
  EXAMS_GRADE = 'exams:grade',
  EXAMS_VIEW_RESULTS = 'exams:view_results',

  // Evaluation
  EVALUATIONS_CREATE = 'evaluations:create',
  EVALUATIONS_READ = 'evaluations:read',
  EVALUATIONS_UPDATE = 'evaluations:update',
  EVALUATIONS_GRADE = 'evaluations:grade',
  EVALUATIONS_MANAGE = 'evaluations:manage',

  // Live Classes
  LIVE_CLASSES_CREATE = 'live_classes:create',
  LIVE_CLASSES_READ = 'live_classes:read',
  LIVE_CLASSES_UPDATE = 'live_classes:update',
  LIVE_CLASSES_DELETE = 'live_classes:delete',
  LIVE_CLASSES_MANAGE = 'live_classes:manage',
  LIVE_CLASSES_HOST = 'live_classes:host',
  LIVE_CLASSES_JOIN = 'live_classes:join',

  // Reports
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',
  REPORTS_MANAGE = 'reports:manage',

  // System
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_AUDIT = 'system:audit',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_MAINTENANCE = 'system:maintenance',
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  permissions: Permission[];
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserProfile extends User {
  bio?: string;
  timezone?: string;
  language?: string;
  notification_preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  course_updates: boolean;
  exam_reminders: boolean;
  live_class_reminders: boolean;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
  device_id?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface Session {
  session_id: string;
  device_info: {
    user_agent?: string;
    ip?: string;
    device_id?: string;
  };
  created_at: string;
  last_activity: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function hasRole(user: User | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function hasMinRole(user: User | null, minRole: UserRole): boolean {
  if (!user) return false;
  return ROLE_LEVELS[user.role] >= ROLE_LEVELS[minRole];
}

export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: User | null, ...permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some((p) => user.permissions.includes(p));
}

export function hasAllPermissions(user: User | null, ...permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every((p) => user.permissions.includes(p));
}

export function isAdmin(user: User | null): boolean {
  return hasRole(user, 'admin', 'super_admin');
}

export function isSuperAdmin(user: User | null): boolean {
  return hasRole(user, 'super_admin');
}
