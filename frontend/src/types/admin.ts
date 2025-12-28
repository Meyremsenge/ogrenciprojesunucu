// Admin Panel Types

// UserRole auth.ts'den alınır
import type { UserRole } from './auth';

// =============================================================================
// User Management Types
// =============================================================================

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
  role: UserRole;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  is_locked?: boolean;
  failed_login_attempts?: number;
}

export interface UserDetails extends AdminUser {
  packages: UserPackage[];
  stats: {
    total_courses_enrolled: number;
    total_exams_taken: number;
    active_packages: number;
  };
  locked_until?: string;
}

export interface CreateUserData {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: UserRole;
  is_active?: boolean;
  is_verified?: boolean;
  force_password_change?: boolean;
}

export interface UpdateUserData {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: UserRole;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface BulkUserAction {
  user_ids: number[];
  action: 'activate' | 'deactivate' | 'delete' | 'change_role';
  new_role?: UserRole;
}

// =============================================================================
// Content Approval Types
// =============================================================================

export type ApprovalStatus = 'pending' | 'in_review' | 'approved' | 'rejected';
export type ContentType = 'video' | 'document' | 'course' | 'lesson' | 'quiz' | 'exam' | 'question' | 'announcement';
export type ApprovalPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ContentApprovalItem {
  id: number;
  content_type: ContentType;
  content_id: number;
  content_title: string;
  title: string; // alias for content_title
  description?: string;
  submitted_by_id: number;
  submitted_by_name: string;
  submitted_at: string;
  status: ApprovalStatus;
  priority: number | ApprovalPriority;
  priority_label: string;
  assigned_to_id?: number;
  assigned_to?: string; // alias for assigned_to_name
  assigned_to_name?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  reviewer_notes?: string;
  rejection_reason?: string;
  revision_count: number;
  created_at: string;
}

export interface ApprovalStats {
  pending: number;
  in_review: number;
  approved: number;
  approved_today: number;
  rejected: number;
  rejected_today: number;
  average_review_time: string;
  average_review_time_minutes: number;
  total_in_queue: number;
}

// =============================================================================
// Package Management Types
// =============================================================================

export type PackageStatus = 'active' | 'inactive' | 'archived';
export type PackageType = 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'suspended' | 'pending';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface Package {
  id: number;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  package_type: PackageType;
  duration_days: number;
  duration_months?: number; // computed from duration_days
  price: number;
  discount_price?: number;
  current_price: number;
  discount_percentage: number;
  currency: string;
  features: string[];
  max_courses?: number;
  max_students?: number;
  max_downloads?: number;
  max_live_sessions?: number;
  ai_questions_per_day: number;
  ai_questions_per_month: number;
  all_courses_access: boolean;
  is_lifetime: boolean;
  is_published: boolean;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  // Stats (admin only)
  subscriber_count?: number;
  total_subscribers?: number;
  active_subscribers?: number;
  total_revenue?: number;
}

export interface UserPackage {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  package_id: number;
  starts_at: string;
  start_date?: string; // alias for starts_at
  expires_at?: string;
  end_date?: string; // alias for expires_at
  subscription_status: SubscriptionStatus;
  is_active: boolean;
  payment_status: PaymentStatus;
  payment_method?: string;
  amount_paid: number;
  currency: string;
  auto_renew: boolean;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
}

export interface CreatePackageData {
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  package_type?: PackageType;
  duration_days?: number;
  duration_months?: number;
  price: number;
  discount_price?: number;
  currency?: string;
  features?: string[];
  max_courses?: number;
  max_students?: number;
  max_downloads?: number;
  max_live_sessions?: number;
  ai_questions_per_day?: number;
  ai_questions_per_month?: number;
  course_ids?: number[];
  category_ids?: number[];
  all_courses_access?: boolean;
  is_published?: boolean;
  is_featured?: boolean;
  is_active?: boolean;
  display_order?: number;
}

export interface AssignPackageData {
  package_id: number;
  user_id: number;
  duration_days?: number;
  amount?: number;
  notes?: string;
}

// =============================================================================
// System Settings Types
// =============================================================================

export type SettingCategory = 
  | 'general' 
  | 'security' 
  | 'email' 
  | 'payment' 
  | 'notification' 
  | 'content' 
  | 'ai' 
  | 'limits' 
  | 'appearance' 
  | 'integration';

export type SettingType = 'string' | 'integer' | 'float' | 'boolean' | 'json' | 'secret';

export interface SystemSetting {
  id: number;
  key: string;
  value: any;
  default_value: any;
  category: SettingCategory;
  setting_type: SettingType;
  label: string;
  description?: string;
  help_text?: string;
  is_public: boolean;
  is_editable: boolean;
  is_sensitive?: boolean;
  requires_restart: boolean;
  display_order: number;
  allowed_values?: any[];
  validation_rules?: Record<string, any>;
  updated_at?: string;
}

// =============================================================================
// Announcement Types
// =============================================================================

export type AnnouncementType = 'info' | 'warning' | 'success' | 'error';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  announcement_type: AnnouncementType;
  starts_at?: string;
  ends_at?: string;
  expires_at?: string; // alias for ends_at
  target_roles?: UserRole[];
  is_active: boolean;
  is_currently_active: boolean;
  is_dismissible: boolean;
  show_on_dashboard: boolean;
  show_on_login: boolean;
  view_count?: number;
  dismiss_count?: number;
  created_at: string;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  announcement_type?: AnnouncementType;
  starts_at?: string;
  ends_at?: string;
  expires_at?: string; // alias for ends_at
  target_roles?: UserRole[];
  target_user_ids?: number[];
  is_active?: boolean;
  is_dismissible?: boolean;
  show_on_dashboard?: boolean;
  show_on_login?: boolean;
}

// =============================================================================
// Dashboard Types
// =============================================================================

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    new_today: number;
    new_week: number;
  };
  courses: {
    total: number;
    published: number;
  };
  enrollments: {
    total: number;
    new_week: number;
  };
  subscriptions: {
    active: number;
  };
  revenue: {
    last_30_days: number;
  };
}

export interface ChartData {
  date: string;
  count?: number;
  amount?: number;
}

export interface AdminActivity {
  id: number;
  admin_id: number;
  admin_name: string;
  action_type: string;
  target_type?: string;
  target_id?: number;
  target_name?: string;
  description?: string;
  success: boolean;
  created_at: string;
}

// =============================================================================
// Admin Action Log Types
// =============================================================================

export type AdminActionType =
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_activate'
  | 'user_deactivate'
  | 'user_role_change'
  | 'user_password_reset'
  | 'user_unlock'
  | 'content_approve'
  | 'content_reject'
  | 'content_publish'
  | 'content_unpublish'
  | 'content_delete'
  | 'package_create'
  | 'package_update'
  | 'package_delete'
  | 'package_assign'
  | 'package_revoke'
  | 'setting_update'
  | 'system_maintenance'
  | 'cache_clear'
  | 'security_ban'
  | 'security_unban';

export interface AdminActionLog {
  id: number;
  admin_id: number;
  admin_name: string;
  action_type: AdminActionType;
  target_type?: string;
  target_id?: number;
  target_name?: string;
  description?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// =============================================================================
// System Health Types
// =============================================================================

export interface SystemHealth {
  database: string;
  redis: string;
  celery: string;
}
