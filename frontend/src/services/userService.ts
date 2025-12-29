/**
 * User Service
 * 
 * Kullanıcı yönetimi API servisleri.
 * Backend: app/modules/users/routes.py
 */

import api from './api';

// =============================================================================
// TYPES
// =============================================================================

export type UserRole = 'student' | 'teacher' | 'admin' | 'super_admin';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  role_id?: number;
  is_active: boolean;
  is_verified: boolean;
  force_password_change: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  bio?: string;
  timezone?: string;
  language?: string;
  address?: string;
  notification_preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  course_updates: boolean;
  assignment_reminders: boolean;
  exam_reminders: boolean;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  permissions: Permission[];
  user_count: number;
  created_at: string;
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  category: string;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  notification_preferences?: Partial<NotificationPreferences>;
}

export interface PasswordChangeData {
  old_password: string;
  new_password: string;
}

export interface ForcePasswordChangeData {
  new_password: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

// =============================================================================
// PROFILE API FUNCTIONS
// =============================================================================

/**
 * Kendi profilini getir
 */
export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await api.get('/users/profile');
  return response.data.data.user;
};

/**
 * Profilimi güncelle
 */
export const updateMyProfile = async (data: ProfileUpdateData): Promise<UserProfile> => {
  const response = await api.put('/users/profile', data);
  return response.data.data.user;
};

/**
 * Şifre değiştir
 */
export const changePassword = async (data: PasswordChangeData): Promise<User> => {
  const response = await api.post('/users/password/change', data);
  return response.data.data.user;
};

/**
 * Zorunlu şifre değişikliği (ilk giriş sonrası)
 */
export const forceChangePassword = async (data: ForcePasswordChangeData): Promise<User> => {
  const response = await api.post('/users/password/force-change', data);
  return response.data.data.user;
};

// =============================================================================
// USER QUERY FUNCTIONS
// =============================================================================

/**
 * Kullanıcı detayı
 */
export const getUser = async (userId: number): Promise<User> => {
  const response = await api.get(`/users/${userId}`);
  return response.data.data.user;
};

// =============================================================================
// ROLE & PERMISSION FUNCTIONS
// =============================================================================

/**
 * Rol listesi
 */
export const getRoles = async (): Promise<Role[]> => {
  const response = await api.get('/users/roles');
  return response.data.data.roles;
};

/**
 * Rol detayı
 */
export const getRole = async (roleId: number): Promise<Role> => {
  const response = await api.get(`/users/roles/${roleId}`);
  return response.data.data.role;
};

/**
 * İzin listesi
 */
export const getPermissions = async (): Promise<Permission[]> => {
  const response = await api.get('/users/permissions');
  return response.data.data.permissions;
};

// =============================================================================
// AVATAR FUNCTIONS
// =============================================================================

/**
 * Avatar yükle
 */
export const uploadAvatar = async (file: File): Promise<{ avatar_url: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const response = await api.post('/users/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

/**
 * Avatar sil
 */
export const deleteAvatar = async (): Promise<void> => {
  await api.delete('/users/profile/avatar');
};

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  // Profile
  getMyProfile,
  updateMyProfile,
  changePassword,
  forceChangePassword,
  
  // User Query
  getUser,
  
  // Roles & Permissions
  getRoles,
  getRole,
  getPermissions,
  
  // Avatar
  uploadAvatar,
  deleteAvatar,
};
