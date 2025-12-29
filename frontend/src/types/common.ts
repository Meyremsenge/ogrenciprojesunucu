/**
 * Common Types
 * 
 * Genel kullanım için ortak tip tanımları.
 * Not: ApiResponse, ApiError, PaginatedResponse tipleri api.ts'de tanımlıdır.
 */

// Re-export from api.ts to maintain backwards compatibility
export type { ApiResponse, ApiError, PaginatedResponse } from './api';

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// =============================================================================
// Filter & Search
// =============================================================================

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'number' | 'boolean';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface SearchParams {
  q?: string;
  filters?: Record<string, string | number | boolean>;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

// =============================================================================
// Common Entities
// =============================================================================

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface SoftDeletableEntity extends BaseEntity {
  deleted_at?: string;
  is_deleted: boolean;
}

export interface AuditableEntity extends BaseEntity {
  created_by_id?: number;
  updated_by_id?: number;
  created_by_name?: string;
  updated_by_name?: string;
}

// =============================================================================
// User Related
// =============================================================================

export interface BasicUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url?: string;
}

export interface UserReference {
  id: number;
  full_name: string;
  avatar_url?: string;
}

// =============================================================================
// File & Media
// =============================================================================

export interface FileInfo {
  id: number;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  uploaded_at: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// =============================================================================
// UI State
// =============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface ModalState {
  isOpen: boolean;
  data?: unknown;
}

export interface TableColumn<T = unknown> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => React.ReactNode;
}

// =============================================================================
// Form
// =============================================================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FormError {
  field: string;
  message: string;
}

// =============================================================================
// Date & Time
// =============================================================================

export interface DateRange {
  start: string | Date;
  end: string | Date;
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;
}

// =============================================================================
// Notification
// =============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

// =============================================================================
// Statistics
// =============================================================================

export interface StatItem {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }[];
}

// =============================================================================
// Action & Permission
// =============================================================================

export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'reject';

// Not: Permission enum'u auth.ts'de tanımlıdır
export interface ResourcePermission {
  resource: string;
  actions: ActionType[];
}

// =============================================================================
// Export All
// =============================================================================

export type { };
