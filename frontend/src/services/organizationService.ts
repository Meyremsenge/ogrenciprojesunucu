/**
 * Organization Service
 * ═══════════════════════════════════════════════════════════════════════════════
 * Multi-tenant kurum yönetimi API servisi
 */

import api from './api';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  status: 'active' | 'suspended' | 'trial' | 'expired';
  is_active: boolean;
  subscription_plan: 'trial' | 'basic' | 'pro' | 'enterprise';
  subscription_start?: string;
  subscription_end?: string;
  features: Record<string, boolean>;
  settings?: Record<string, any>;
  limits?: {
    max_students: number;
    max_teachers: number;
    max_admins: number;
    max_courses: number;
    max_storage_gb: number;
  };
  usage?: {
    current_students: number;
    current_teachers: number;
    current_admins: number;
    current_courses: number;
    storage_used_mb: number;
  };
  created_at: string;
}

export interface OrganizationInvitation {
  id: number;
  organization_id: number;
  email: string;
  role: string;
  is_used: boolean;
  expires_at: string;
  created_at: string;
  invited_by?: string;
}

export interface CreateOrganizationDTO {
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  subscription_plan?: string;
  max_students?: number;
  max_teachers?: number;
  max_admins?: number;
  max_courses?: number;
  max_storage_gb?: number;
  features?: Record<string, boolean>;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationDTO extends Partial<CreateOrganizationDTO> {
  status?: string;
  is_active?: boolean;
}

export interface CreateInvitationDTO {
  email: string;
  role: 'student' | 'teacher' | 'admin';
  expires_days?: number;
}

export interface OrganizationStats {
  organization: Organization;
  users: {
    total: number;
    by_role: Record<string, number>;
    active_last_30_days: number;
  };
  quotas: {
    students: { used: number; max: number; percentage: number };
    teachers: { used: number; max: number; percentage: number };
    admins: { used: number; max: number; percentage: number };
  };
  subscription: {
    plan: string;
    status: string;
    is_active: boolean;
    days_remaining?: number;
  };
}

export interface OrganizationDashboard {
  total: number;
  active: number;
  by_status: Record<string, number>;
  by_plan: Record<string, number>;
  recent: Organization[];
  expiring_soon: Organization[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tüm kurumları listele (Super Admin)
 */
export async function getOrganizations(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  is_active?: boolean;
}) {
  const response = await api.get('/api/v1/organizations', { params });
  return response.data;
}

/**
 * Kurum detayı getir
 */
export async function getOrganization(orgId: number) {
  const response = await api.get(`/api/v1/organizations/${orgId}`);
  return response.data;
}

/**
 * Yeni kurum oluştur
 */
export async function createOrganization(data: CreateOrganizationDTO) {
  const response = await api.post('/api/v1/organizations', data);
  return response.data;
}

/**
 * Kurum güncelle
 */
export async function updateOrganization(orgId: number, data: UpdateOrganizationDTO) {
  const response = await api.put(`/api/v1/organizations/${orgId}`, data);
  return response.data;
}

/**
 * Kurum sil
 */
export async function deleteOrganization(orgId: number, hard?: boolean) {
  const response = await api.delete(`/api/v1/organizations/${orgId}`, {
    params: { hard },
  });
  return response.data;
}

/**
 * Kurum istatistikleri
 */
export async function getOrganizationStats(orgId: number): Promise<OrganizationStats> {
  const response = await api.get(`/api/v1/organizations/${orgId}/stats`);
  return response.data.data;
}

/**
 * Kurumlar dashboard özeti
 */
export async function getOrganizationsDashboard(): Promise<OrganizationDashboard> {
  const response = await api.get('/api/v1/organizations/dashboard');
  return response.data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kurum kullanıcılarını listele
 */
export async function getOrganizationUsers(orgId: number, params?: {
  page?: number;
  per_page?: number;
  role?: string;
  search?: string;
  is_active?: boolean;
}) {
  const response = await api.get(`/api/v1/organizations/${orgId}/users`, { params });
  return response.data;
}

/**
 * Kullanıcıyı kuruma ekle
 */
export async function addUserToOrganization(orgId: number, userId: number) {
  const response = await api.post(`/api/v1/organizations/${orgId}/users/${userId}`);
  return response.data;
}

/**
 * Kullanıcıyı kurumdan çıkar
 */
export async function removeUserFromOrganization(orgId: number, userId: number) {
  const response = await api.delete(`/api/v1/organizations/${orgId}/users/${userId}`);
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Invitation Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bekleyen davetleri listele
 */
export async function getOrganizationInvitations(orgId: number) {
  const response = await api.get(`/api/v1/organizations/${orgId}/invitations`);
  return response.data;
}

/**
 * Kurum daveti oluştur
 */
export async function createInvitation(orgId: number, data: CreateInvitationDTO) {
  const response = await api.post(`/api/v1/organizations/${orgId}/invitations`, data);
  return response.data;
}

/**
 * Daveti iptal et
 */
export async function cancelInvitation(invitationId: number) {
  const response = await api.delete(`/api/v1/organizations/invitations/${invitationId}`);
  return response.data;
}

/**
 * Daveti kabul et
 */
export async function acceptInvitation(token: string) {
  const response = await api.post('/api/v1/organizations/invitations/accept', { token });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abonelik güncelle
 */
export async function updateSubscription(orgId: number, plan: string, durationMonths?: number) {
  const response = await api.put(`/api/v1/organizations/${orgId}/subscription`, {
    plan,
    duration_months: durationMonths || 12,
  });
  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Current User Organization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mevcut kullanıcının kurumunu getir
 */
export async function getMyOrganization() {
  const response = await api.get('/api/v1/organizations/my-organization');
  return response.data;
}

/**
 * Kullanıcının kurumundaki diğer kullanıcıları getir
 */
export async function getMyOrganizationUsers(params?: {
  page?: number;
  per_page?: number;
  role?: string;
  search?: string;
}) {
  const response = await api.get('/api/v1/organizations/my-organization/users', { params });
  return response.data;
}

export default {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationStats,
  getOrganizationsDashboard,
  getOrganizationUsers,
  addUserToOrganization,
  removeUserFromOrganization,
  getOrganizationInvitations,
  createInvitation,
  cancelInvitation,
  acceptInvitation,
  updateSubscription,
  getMyOrganization,
  getMyOrganizationUsers,
};
