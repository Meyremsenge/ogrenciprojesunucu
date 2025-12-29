// Admin API Service

import api from './api';
import type {
  AdminUser,
  UserDetails,
  CreateUserData,
  UpdateUserData,
  BulkUserAction,
  ContentApprovalItem,
  ApprovalStats,
  Package,
  CreatePackageData,
  AssignPackageData,
  UserPackage,
  SystemSetting,
  Announcement,
  CreateAnnouncementData,
  DashboardStats,
  ChartData,
  AdminActivity,
  AdminActionLog,
  SystemHealth,
} from '../types/admin';
import type { PaginatedResponse } from '../types/common';

const BASE_URL = '/admin';

// =============================================================================
// Dashboard
// =============================================================================

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get(`${BASE_URL}/dashboard`);
  return response.data.data.stats;
};

export const getUserGrowthChart = async (days = 30): Promise<ChartData[]> => {
  const response = await api.get(`${BASE_URL}/dashboard/charts/users`, {
    params: { days },
  });
  return response.data.data.chart_data;
};

export const getRevenueChart = async (days = 30): Promise<ChartData[]> => {
  const response = await api.get(`${BASE_URL}/dashboard/charts/revenue`, {
    params: { days },
  });
  return response.data.data.chart_data;
};

export const getRecentActivities = async (limit = 20): Promise<AdminActivity[]> => {
  const response = await api.get(`${BASE_URL}/dashboard/activities`, {
    params: { limit },
  });
  return response.data.data.activities;
};

// =============================================================================
// User Management
// =============================================================================

export const getUsers = async (params?: {
  page?: number;
  per_page?: number;
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}): Promise<PaginatedResponse<AdminUser>> => {
  const response = await api.get(`${BASE_URL}/users`, { params });
  return response.data;
};

export const getUserDetails = async (userId: number): Promise<UserDetails> => {
  const response = await api.get(`${BASE_URL}/users/${userId}`);
  return response.data.data;
};

export const createUser = async (data: CreateUserData): Promise<AdminUser> => {
  console.log('Creating user with data:', data);
  const response = await api.post(`${BASE_URL}/users`, data);
  console.log('Create user response:', response);
  return response.data.data.user;
};

export const updateUser = async (userId: number, data: UpdateUserData): Promise<AdminUser> => {
  const response = await api.put(`${BASE_URL}/users/${userId}`, data);
  return response.data.data.user;
};

export const deleteUser = async (userId: number, hard = false): Promise<void> => {
  await api.delete(`${BASE_URL}/users/${userId}`, { params: { hard } });
};

export const changeUserRole = async (userId: number, role: string): Promise<AdminUser> => {
  const response = await api.put(`${BASE_URL}/users/${userId}/role`, { role });
  return response.data.data.user;
};

export const activateUser = async (userId: number): Promise<AdminUser> => {
  const response = await api.post(`${BASE_URL}/users/${userId}/activate`);
  return response.data.data.user;
};

export const deactivateUser = async (userId: number): Promise<AdminUser> => {
  const response = await api.post(`${BASE_URL}/users/${userId}/deactivate`);
  return response.data.data.user;
};

export const resetUserPassword = async (
  userId: number,
  newPassword?: string
): Promise<{ temporary_password: string }> => {
  const response = await api.post(`${BASE_URL}/users/${userId}/reset-password`, {
    new_password: newPassword,
  });
  return response.data.data;
};

export const unlockUser = async (userId: number): Promise<AdminUser> => {
  const response = await api.post(`${BASE_URL}/users/${userId}/unlock`);
  return response.data.data.user;
};

export const bulkUserAction = async (
  data: BulkUserAction
): Promise<{ success_count: number; failed_count: number; success_ids: number[]; failed: any[] }> => {
  const response = await api.post(`${BASE_URL}/users/bulk`, data);
  return response.data.data;
};

// =============================================================================
// Content Approval
// =============================================================================

export const getPendingApprovals = async (params?: {
  page?: number;
  per_page?: number;
  content_type?: string;
  priority?: number;
  assigned_to_id?: number;
}): Promise<PaginatedResponse<ContentApprovalItem>> => {
  const response = await api.get(`${BASE_URL}/approvals`, { params });
  return response.data;
};

export const getApprovalStats = async (): Promise<ApprovalStats> => {
  const response = await api.get(`${BASE_URL}/approvals/stats`);
  return response.data.data.stats;
};

export const assignApproval = async (
  queueId: number,
  adminId?: number
): Promise<ContentApprovalItem> => {
  const response = await api.post(`${BASE_URL}/approvals/${queueId}/assign`, {
    admin_id: adminId,
  });
  return response.data.data.item;
};

export const approveContent = async (
  queueId: number,
  notes?: string
): Promise<ContentApprovalItem> => {
  const response = await api.post(`${BASE_URL}/approvals/${queueId}/approve`, { notes });
  return response.data.data.item;
};

export const rejectContent = async (
  queueId: number,
  reason: string,
  details?: string
): Promise<ContentApprovalItem> => {
  const response = await api.post(`${BASE_URL}/approvals/${queueId}/reject`, {
    reason,
    details,
  });
  return response.data.data.item;
};

// =============================================================================
// Package Management
// =============================================================================

export const getPackages = async (params?: {
  page?: number;
  per_page?: number;
  status?: string;
  package_type?: string;
  include_stats?: boolean;
}): Promise<PaginatedResponse<Package>> => {
  const response = await api.get(`${BASE_URL}/packages`, { params });
  return response.data;
};

export const getPackageDetails = async (
  packageId: number
): Promise<{ package: Package; stats: any }> => {
  const response = await api.get(`${BASE_URL}/packages/${packageId}`);
  return response.data.data;
};

export const createPackage = async (data: CreatePackageData): Promise<Package> => {
  const response = await api.post(`${BASE_URL}/packages`, data);
  return response.data.data.package;
};

export const updatePackage = async (
  packageId: number,
  data: Partial<CreatePackageData>
): Promise<Package> => {
  const response = await api.put(`${BASE_URL}/packages/${packageId}`, data);
  return response.data.data.package;
};

export const deletePackage = async (packageId: number): Promise<void> => {
  await api.delete(`${BASE_URL}/packages/${packageId}`);
};

export const assignPackage = async (data: AssignPackageData): Promise<UserPackage> => {
  const response = await api.post(`${BASE_URL}/packages/assign`, data);
  return response.data.data.subscription;
};

export const revokeSubscription = async (
  subscriptionId: number,
  reason?: string
): Promise<UserPackage> => {
  const response = await api.post(`${BASE_URL}/packages/subscriptions/${subscriptionId}/revoke`, {
    reason,
  });
  return response.data.data.subscription;
};

// =============================================================================
// System Settings
// =============================================================================

export const getSettings = async (params?: {
  category?: string;
  grouped?: boolean;
}): Promise<SystemSetting[] | Record<string, SystemSetting[]>> => {
  const response = await api.get(`${BASE_URL}/settings`, { params });
  return response.data.data.settings;
};

export const getSetting = async (key: string): Promise<any> => {
  const response = await api.get(`${BASE_URL}/settings/${key}`);
  return response.data.data.value;
};

export const updateSetting = async (key: string, value: any): Promise<SystemSetting> => {
  const response = await api.put(`${BASE_URL}/settings/${key}`, { value });
  return response.data.data.setting;
};

export const bulkUpdateSettings = async (
  settings: Record<string, any>
): Promise<{ updated_count: number }> => {
  const response = await api.put(`${BASE_URL}/settings`, { settings });
  return response.data.data;
};

export const initializeSettings = async (): Promise<void> => {
  await api.post(`${BASE_URL}/settings/initialize`);
};

// =============================================================================
// Announcements
// =============================================================================

export const getAnnouncements = async (params?: {
  page?: number;
  per_page?: number;
  active_only?: boolean;
}): Promise<PaginatedResponse<Announcement>> => {
  const response = await api.get(`${BASE_URL}/announcements`, { params });
  return response.data;
};

export const createAnnouncement = async (data: CreateAnnouncementData): Promise<Announcement> => {
  const response = await api.post(`${BASE_URL}/announcements`, data);
  return response.data.data.announcement;
};

export const updateAnnouncement = async (
  announcementId: number,
  data: Partial<CreateAnnouncementData>
): Promise<Announcement> => {
  const response = await api.put(`${BASE_URL}/announcements/${announcementId}`, data);
  return response.data.data.announcement;
};

export const deleteAnnouncement = async (announcementId: number): Promise<void> => {
  await api.delete(`${BASE_URL}/announcements/${announcementId}`);
};

// =============================================================================
// Admin Logs
// =============================================================================

export const getAdminLogs = async (params?: {
  page?: number;
  per_page?: number;
  admin_id?: number;
  action_type?: string;
  target_type?: string;
  start_date?: string;
  end_date?: string;
}): Promise<PaginatedResponse<AdminActionLog>> => {
  const response = await api.get(`${BASE_URL}/logs`, { params });
  return response.data;
};

// =============================================================================
// System Maintenance
// =============================================================================

export const toggleMaintenanceMode = async (enable: boolean): Promise<void> => {
  await api.post(`${BASE_URL}/system/maintenance`, { enable });
};

export const clearCache = async (): Promise<void> => {
  await api.post(`${BASE_URL}/system/cache/clear`);
};

export const getSystemHealth = async (): Promise<SystemHealth> => {
  const response = await api.get(`${BASE_URL}/system/health`);
  return response.data.data.health;
};

// Export all functions
export default {
  // Dashboard
  getDashboardStats,
  getUserGrowthChart,
  getRevenueChart,
  getRecentActivities,
  // Users
  getUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  activateUser,
  deactivateUser,
  resetUserPassword,
  unlockUser,
  bulkUserAction,
  // Approvals
  getPendingApprovals,
  getApprovalStats,
  assignApproval,
  approveContent,
  rejectContent,
  // Packages
  getPackages,
  getPackageDetails,
  createPackage,
  updatePackage,
  deletePackage,
  assignPackage,
  revokeSubscription,
  // Settings
  getSettings,
  getSetting,
  updateSetting,
  bulkUpdateSettings,
  initializeSettings,
  // Announcements
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  // Logs
  getAdminLogs,
  // System
  toggleMaintenanceMode,
  clearCache,
  getSystemHealth,
};
