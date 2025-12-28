/**
 * Base API Response Types
 * Backend'den gelen standart response formatları
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiMeta {
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta;
}

// Cursor-based pagination meta
export interface CursorMeta {
  cursor?: string;
  next_cursor?: string;
  has_more: boolean;
  limit: number;
}

// Cursor-based pagination
export interface CursorPaginatedResponse<T> {
  success: boolean;
  data?: T[];
  message?: string;
  error?: ApiError;
  meta: CursorMeta;
}
