/**
 * API Response Handling Utilities
 * Standardized API response/error handling
 */

import { AxiosError, AxiosResponse } from 'axios';

// ==================== Types ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ==================== Error Handling ====================

/**
 * API hata mesajlarını standartlaştırır
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const response = error.response;

    // Sunucu yanıtı var
    if (response?.data) {
      return {
        success: false,
        message: response.data.message || getDefaultErrorMessage(response.status),
        errors: response.data.errors,
        code: response.data.code,
        status: response.status,
      };
    }

    // Network hatası
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        message: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
        code: 'TIMEOUT',
        status: 408,
      };
    }

    if (!error.response) {
      return {
        success: false,
        message: 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    }
  }

  // Bilinmeyen hata
  return {
    success: false,
    message: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
    code: 'UNKNOWN_ERROR',
    status: 500,
  };
}

/**
 * HTTP durum koduna göre varsayılan hata mesajı
 */
function getDefaultErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Geçersiz istek. Lütfen bilgilerinizi kontrol edin.',
    401: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
    403: 'Bu işlem için yetkiniz bulunmuyor.',
    404: 'İstenen kaynak bulunamadı.',
    409: 'Bu işlem bir çakışmaya neden oldu.',
    422: 'Girilen bilgiler geçersiz.',
    429: 'Çok fazla istek gönderdiniz. Lütfen bekleyin.',
    500: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
    502: 'Sunucu geçici olarak kullanılamıyor.',
    503: 'Servis bakımda. Lütfen daha sonra tekrar deneyin.',
  };

  return messages[status] || 'Bir hata oluştu. Lütfen tekrar deneyin.';
}

// ==================== Response Helpers ====================

/**
 * API yanıtını işler ve data döndürür
 */
export function unwrapResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return response.data.data;
}

/**
 * Paginated API yanıtını işler
 */
export function unwrapPaginatedResponse<T>(
  response: AxiosResponse<ApiResponse<PaginatedResponse<T>>>
): PaginatedResponse<T> {
  return response.data.data;
}

// ==================== Retry Logic ====================

export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  retryOn?: number[];
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  retryOn: [408, 429, 500, 502, 503, 504],
};

/**
 * Retry mantığı ile API çağrısı yapar
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries, retryDelay, retryOn } = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error instanceof AxiosError) {
        const status = error.response?.status || 0;

        // Retry edilmeyecek hatalar
        if (!retryOn.includes(status) || attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

// ==================== Debounce & Throttle ====================

/**
 * Debounce fonksiyonu - son çağrıdan sonra bekler
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle fonksiyonu - belirli aralıklarla çağrılabilir
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ==================== Query Key Builders ====================

/**
 * React Query key builder
 */
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    profile: () => [...queryKeys.auth.all, 'profile'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Courses
  courses: {
    all: ['courses'] as const,
    lists: () => [...queryKeys.courses.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.courses.lists(), filters] as const,
    details: () => [...queryKeys.courses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.courses.details(), id] as const,
    lessons: (courseId: string) => [...queryKeys.courses.detail(courseId), 'lessons'] as const,
  },

  // Contents
  contents: {
    all: ['contents'] as const,
    lists: () => [...queryKeys.contents.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.contents.lists(), filters] as const,
    details: () => [...queryKeys.contents.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contents.details(), id] as const,
  },

  // Exams
  exams: {
    all: ['exams'] as const,
    lists: () => [...queryKeys.exams.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.exams.lists(), filters] as const,
    details: () => [...queryKeys.exams.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.exams.details(), id] as const,
    results: (examId: string) => [...queryKeys.exams.detail(examId), 'results'] as const,
  },

  // Live Classes
  liveClasses: {
    all: ['liveClasses'] as const,
    lists: () => [...queryKeys.liveClasses.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.liveClasses.lists(), filters] as const,
    details: () => [...queryKeys.liveClasses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.liveClasses.details(), id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },
};
