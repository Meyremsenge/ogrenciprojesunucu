/**
 * Auth API Service
 * Login, logout, register, token yönetimi
 */

import { api } from './client';
import type {
  ApiResponse,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  Session,
  TokenPair,
} from '@/types';

const AUTH_ENDPOINTS = {
  login: '/auth/login',
  register: '/auth/register',
  logout: '/auth/logout',
  logoutAll: '/auth/logout-all',
  refresh: '/auth/refresh',
  me: '/auth/me',
  changePassword: '/auth/change-password',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  sessions: '/auth/sessions',
};

export const authApi = {
  /**
   * Kullanıcı girişi
   */
  login: (credentials: LoginCredentials) =>
    api.post<ApiResponse<AuthResponse>>(AUTH_ENDPOINTS.login, credentials),

  /**
   * Yeni kullanıcı kaydı
   */
  register: (data: RegisterData) =>
    api.post<ApiResponse<AuthResponse>>(AUTH_ENDPOINTS.register, data),

  /**
   * Çıkış (mevcut cihaz)
   */
  logout: () => 
    api.post<ApiResponse>(AUTH_ENDPOINTS.logout),

  /**
   * Tüm cihazlardan çıkış
   */
  logoutAll: () => 
    api.post<ApiResponse<{ message: string }>>(AUTH_ENDPOINTS.logoutAll),

  /**
   * Token yenileme
   */
  refresh: () => 
    api.post<ApiResponse<TokenPair>>(AUTH_ENDPOINTS.refresh),

  /**
   * Mevcut kullanıcı bilgisi
   */
  getMe: () => 
    api.get<ApiResponse<User>>(AUTH_ENDPOINTS.me),

  /**
   * Şifre değiştir
   */
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<ApiResponse>(AUTH_ENDPOINTS.changePassword, data),

  /**
   * Şifre sıfırlama isteği
   */
  forgotPassword: (email: string) =>
    api.post<ApiResponse>(AUTH_ENDPOINTS.forgotPassword, { email }),

  /**
   * Şifre sıfırla
   */
  resetPassword: (data: { token: string; new_password: string }) =>
    api.post<ApiResponse>(AUTH_ENDPOINTS.resetPassword, data),

  /**
   * Aktif oturumları getir
   */
  getSessions: () => 
    api.get<ApiResponse<Session[]>>(AUTH_ENDPOINTS.sessions),

  /**
   * Belirli oturumu sonlandır
   */
  revokeSession: (sessionId: string) =>
    api.delete<ApiResponse>(`${AUTH_ENDPOINTS.sessions}/${sessionId}`),
};
