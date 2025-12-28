/**
 * API Hooks
 * React Query ile API entegrasyonu
 */

import { useMutation, useQuery, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import apiClient from '@/api/client';
import { queryKeys, parseApiError, ApiResponse, PaginatedResponse } from '@/lib/api';
import { useToast } from '@/stores/toastStore';

// ==================== Generic API Hooks ====================

/**
 * Generic GET query hook
 */
export function useApiQuery<T>(
  queryKey: readonly unknown[],
  url: string,
  options?: Omit<UseQueryOptions<T, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, AxiosError>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<T>>(url);
      return response.data.data;
    },
    ...options,
  });
}

/**
 * Generic paginated GET query hook
 */
export function usePaginatedQuery<T>(
  queryKey: readonly unknown[],
  url: string,
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<PaginatedResponse<T>, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<T>, AxiosError>({
    queryKey: [...queryKey, params],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<PaginatedResponse<T>>>(url, { params });
      return response.data.data;
    },
    ...options,
  });
}

/**
 * Generic POST mutation hook
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: AxiosError) => void;
    successMessage?: string;
    errorMessage?: string;
    invalidateKeys?: (readonly unknown[])[];
  }
) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation<TData, AxiosError, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      if (options?.successMessage) {
        success(options.successMessage);
      }
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      options?.onSuccess?.(data, variables);
    },
    onError: (err) => {
      const apiError = parseApiError(err);
      error(options?.errorMessage || 'İşlem başarısız', apiError.message);
      options?.onError?.(err);
    },
  });
}

// ==================== Auth Hooks ====================

export function useLogin() {
  const { error } = useToast();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiClient.post<ApiResponse<{
        user: unknown;
        access_token: string;
        refresh_token: string;
      }>>('/auth/login', credentials);
      return response.data.data;
    },
    onError: (err: AxiosError) => {
      const apiError = parseApiError(err);
      error('Giriş başarısız', apiError.message);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.clear();
      success('Çıkış yapıldı');
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown>>('/auth/me');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== User Hooks ====================

export function useUsers(filters?: Record<string, unknown>) {
  return usePaginatedQuery(
    queryKeys.users.list(filters || {}),
    '/users',
    filters
  );
}

export function useUser(id: string) {
  return useApiQuery(
    queryKeys.users.detail(id),
    `/users/${id}`,
    { enabled: !!id }
  );
}

export function useCreateUser() {
  return useApiMutation(
    async (data: Record<string, unknown>) => {
      const response = await apiClient.post('/users', data);
      return response.data;
    },
    {
      successMessage: 'Kullanıcı başarıyla oluşturuldu',
      invalidateKeys: [queryKeys.users.lists()],
    }
  );
}

export function useUpdateUser() {
  return useApiMutation(
    async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await apiClient.put(`/users/${id}`, data);
      return response.data;
    },
    {
      successMessage: 'Kullanıcı başarıyla güncellendi',
      invalidateKeys: [queryKeys.users.lists()],
    }
  );
}

export function useDeleteUser() {
  return useApiMutation(
    async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    {
      successMessage: 'Kullanıcı başarıyla silindi',
      invalidateKeys: [queryKeys.users.lists()],
    }
  );
}

// ==================== Course Hooks ====================

export function useCourses(filters?: Record<string, unknown>) {
  return usePaginatedQuery(
    queryKeys.courses.list(filters || {}),
    '/courses',
    filters
  );
}

export function useCourse(id: string) {
  return useApiQuery(
    queryKeys.courses.detail(id),
    `/courses/${id}`,
    { enabled: !!id }
  );
}

// ==================== Content Hooks ====================

export function useContents(filters?: Record<string, unknown>) {
  return usePaginatedQuery(
    queryKeys.contents.list(filters || {}),
    '/contents',
    filters
  );
}

export function useContent(id: string) {
  return useApiQuery(
    queryKeys.contents.detail(id),
    `/contents/${id}`,
    { enabled: !!id }
  );
}

// ==================== Exam Hooks ====================

export function useExams(filters?: Record<string, unknown>) {
  return usePaginatedQuery(
    queryKeys.exams.list(filters || {}),
    '/exams',
    filters
  );
}

export function useExam(id: string) {
  return useApiQuery(
    queryKeys.exams.detail(id),
    `/exams/${id}`,
    { enabled: !!id }
  );
}

export function useSubmitExam() {
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ examId, answers }: { examId: string; answers: Record<string, unknown> }) => {
      const response = await apiClient.post(`/exams/${examId}/submit`, { answers });
      return response.data;
    },
    onSuccess: () => {
      success('Sınav başarıyla gönderildi');
    },
    onError: (err: AxiosError) => {
      const apiError = parseApiError(err);
      error('Sınav gönderilemedi', apiError.message);
    },
  });
}

// ==================== Live Class Hooks ====================

export function useLiveClasses(filters?: Record<string, unknown>) {
  return usePaginatedQuery(
    queryKeys.liveClasses.list(filters || {}),
    '/live-classes',
    filters
  );
}

export function useLiveClass(id: string) {
  return useApiQuery(
    queryKeys.liveClasses.detail(id),
    `/live-classes/${id}`,
    { enabled: !!id }
  );
}

// ==================== Notification Hooks ====================

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<unknown[]>>('/notifications');
      return response.data.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      return response.data.data.count;
    },
    staleTime: 30 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  return useMutation({
    mutationFn: async () => {
      await apiClient.put('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      success('Tüm bildirimler okundu olarak işaretlendi');
    },
  });
}
