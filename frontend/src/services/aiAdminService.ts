/**
 * AI Admin API Service
 * 
 * Admin ve Super Admin için AI yönetim API'leri.
 * KVKK/GDPR uyumlu endpoint'ler.
 */

import api from './api';
import type {
  AIUsageReport,
  AIAccessReport,
  AIErrorReport,
  AICostReport,
  AISystemStatus,
  AIQuotaConfig,
  AIUserQuotaDetail,
  AIViolation,
  AIViolationStats,
  AIFeatureFlagConfig,
  AIFeatureFlag,
  AIFeatureFlagUpdate,
  AIDataDeletionRequest,
  AIDataDeletionResult,
  AIDataExport,
  AIRetentionPolicyResult,
  AIPrivacyPolicy,
  AIAnonymizationDemo,
  AIKillSwitchAction,
  AIQuotaUpdateAction,
  AIViolationResolveAction,
  AIPaginatedResponse,
} from '../types/ai-admin';

// =============================================================================
// BASE URLS
// =============================================================================

const LOGS_BASE = '/logs';
const ADMIN_BASE = '/admin';

// =============================================================================
// AI USAGE & MONITORING (Admin)
// =============================================================================

/**
 * AI kullanım raporu al (KVKK/GDPR uyumlu - Anonim)
 */
export const getAIUsageReport = async (params?: {
  days?: number;
  privacy_level?: 'anonymous' | 'pseudonymous';
}): Promise<AIUsageReport> => {
  const response = await api.get(`${LOGS_BASE}/ai/usage`, { params });
  return response.data.data;
};

/**
 * AI erişim raporu al
 */
export const getAIAccessReport = async (params?: {
  days?: number;
  include_user_details?: boolean;  // Sadece Super Admin
}): Promise<AIAccessReport> => {
  const response = await api.get(`${LOGS_BASE}/ai/access`, { params });
  return response.data.data;
};

/**
 * AI hata ve timeout raporu al
 */
export const getAIErrorReport = async (params?: {
  days?: number;
}): Promise<AIErrorReport> => {
  const response = await api.get(`${LOGS_BASE}/ai/errors`, { params });
  return response.data.data;
};

/**
 * AI gizlilik politikası bilgisi al
 */
export const getAIPrivacyPolicy = async (): Promise<AIPrivacyPolicy> => {
  const response = await api.get(`${LOGS_BASE}/ai/privacy-policy`);
  return response.data.data;
};

/**
 * Anonimleştirme demo
 */
export const getAIAnonymizationDemo = async (params?: {
  user_id?: number;
  ip?: string;
}): Promise<AIAnonymizationDemo> => {
  const response = await api.get(`${LOGS_BASE}/ai/anonymize-demo`, { params });
  return response.data.data;
};

// =============================================================================
// AI COST MONITORING (Admin)
// =============================================================================

/**
 * AI maliyet raporu al
 */
export const getAICostReport = async (params?: {
  days?: number;
  include_suggestions?: boolean;
}): Promise<AICostReport> => {
  const response = await api.get(`${ADMIN_BASE}/ai/costs`, { params });
  return response.data.data;
};

/**
 * AI bütçe durumu al
 */
export const getAIBudgetStatus = async (): Promise<{
  daily: { limit: number; used: number; remaining: number };
  monthly: { limit: number; used: number; remaining: number };
  alerts: string[];
}> => {
  const response = await api.get(`${ADMIN_BASE}/ai/budget`);
  return response.data.data;
};

// =============================================================================
// AI SYSTEM STATUS & CONTROL (Admin)
// =============================================================================

/**
 * AI sistem durumu al
 */
export const getAISystemStatus = async (): Promise<AISystemStatus> => {
  const response = await api.get(`${ADMIN_BASE}/ai/status`);
  return response.data.data;
};

/**
 * AI kill switch kontrolü
 */
export const toggleAIKillSwitch = async (action: AIKillSwitchAction): Promise<{
  active: boolean;
  message: string;
}> => {
  const response = await api.post(`${ADMIN_BASE}/ai/kill-switch`, action);
  return response.data.data;
};

/**
 * AI health check
 */
export const checkAIHealth = async (): Promise<{
  healthy: boolean;
  latency_ms: number;
  details: Record<string, boolean>;
}> => {
  const response = await api.get(`${ADMIN_BASE}/ai/health`);
  return response.data.data;
};

// =============================================================================
// AI FEATURE FLAGS (Admin)
// =============================================================================

/**
 * Tüm feature flag'leri al
 */
export const getAIFeatureFlags = async (): Promise<AIFeatureFlagConfig> => {
  const response = await api.get(`${ADMIN_BASE}/ai/features`);
  return response.data.data;
};

/**
 * Tek bir feature flag al
 */
export const getAIFeatureFlag = async (featureId: string): Promise<AIFeatureFlag> => {
  const response = await api.get(`${ADMIN_BASE}/ai/features/${featureId}`);
  return response.data.data;
};

/**
 * Feature flag güncelle
 */
export const updateAIFeatureFlag = async (
  featureId: string,
  update: AIFeatureFlagUpdate
): Promise<AIFeatureFlag> => {
  const response = await api.put(`${ADMIN_BASE}/ai/features/${featureId}`, update);
  return response.data.data;
};

/**
 * Feature'ı etkinleştir/devre dışı bırak
 */
export const toggleAIFeature = async (
  featureId: string,
  enabled: boolean
): Promise<AIFeatureFlag> => {
  const response = await api.post(`${ADMIN_BASE}/ai/features/${featureId}/toggle`, { enabled });
  return response.data.data;
};

/**
 * Rollout aşamasını değiştir
 */
export const setAIRolloutStage = async (
  featureId: string,
  stage: string,
  percentage?: number
): Promise<AIFeatureFlag> => {
  const response = await api.post(`${ADMIN_BASE}/ai/features/${featureId}/rollout`, {
    stage,
    percentage,
  });
  return response.data.data;
};

// =============================================================================
// AI QUOTA MANAGEMENT (Admin)
// =============================================================================

/**
 * Kota konfigürasyonunu al
 */
export const getAIQuotaConfig = async (): Promise<AIQuotaConfig> => {
  const response = await api.get(`${ADMIN_BASE}/ai/quotas/config`);
  return response.data.data;
};

/**
 * Kullanıcı kotalarını listele
 */
export const getAIUserQuotas = async (params?: {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
  is_blocked?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}): Promise<AIPaginatedResponse<AIUserQuotaDetail>> => {
  const response = await api.get(`${ADMIN_BASE}/ai/quotas/users`, { params });
  return response.data.data;
};

/**
 * Tek kullanıcı kota detayı al
 */
export const getAIUserQuotaDetail = async (userId: number): Promise<AIUserQuotaDetail> => {
  const response = await api.get(`${ADMIN_BASE}/ai/quotas/users/${userId}`);
  return response.data.data;
};

/**
 * Kullanıcı kotasını güncelle
 */
export const updateAIUserQuota = async (
  userId: number,
  update: AIQuotaUpdateAction
): Promise<AIUserQuotaDetail> => {
  const response = await api.put(`${ADMIN_BASE}/ai/quotas/users/${userId}`, update);
  return response.data.data;
};

/**
 * Kullanıcıyı engelle/engeli kaldır
 */
export const toggleAIUserBlock = async (
  userId: number,
  blocked: boolean,
  reason?: string,
  duration_hours?: number
): Promise<AIUserQuotaDetail> => {
  const response = await api.post(`${ADMIN_BASE}/ai/quotas/users/${userId}/block`, {
    blocked,
    reason,
    duration_hours,
  });
  return response.data.data;
};

/**
 * Kullanıcı kotasını sıfırla
 */
export const resetAIUserQuota = async (userId: number): Promise<AIUserQuotaDetail> => {
  const response = await api.post(`${ADMIN_BASE}/ai/quotas/users/${userId}/reset`);
  return response.data.data;
};

// =============================================================================
// AI VIOLATIONS (Admin)
// =============================================================================

/**
 * İhlalleri listele
 */
export const getAIViolations = async (params?: {
  page?: number;
  per_page?: number;
  user_id?: number;
  violation_type?: string;
  severity?: string;
  is_resolved?: boolean;
  start_date?: string;
  end_date?: string;
}): Promise<AIPaginatedResponse<AIViolation>> => {
  const response = await api.get(`${ADMIN_BASE}/ai/violations`, { params });
  return response.data.data;
};

/**
 * İhlal detayı al
 */
export const getAIViolationDetail = async (violationId: number): Promise<AIViolation> => {
  const response = await api.get(`${ADMIN_BASE}/ai/violations/${violationId}`);
  return response.data.data;
};

/**
 * İhlal istatistikleri
 */
export const getAIViolationStats = async (params?: {
  days?: number;
}): Promise<AIViolationStats> => {
  const response = await api.get(`${ADMIN_BASE}/ai/violations/stats`, { params });
  return response.data.data;
};

/**
 * İhlali çöz
 */
export const resolveAIViolation = async (
  violationId: number,
  resolution: AIViolationResolveAction
): Promise<AIViolation> => {
  const response = await api.post(
    `${ADMIN_BASE}/ai/violations/${violationId}/resolve`,
    resolution
  );
  return response.data.data;
};

// =============================================================================
// KVKK/GDPR - SUPER ADMIN ONLY
// =============================================================================

/**
 * Kullanıcı AI verilerini sil (KVKK Madde 7 / GDPR Article 17)
 * SADECE SUPER ADMIN
 */
export const deleteUserAIData = async (
  userId: number,
  request: AIDataDeletionRequest
): Promise<AIDataDeletionResult> => {
  const response = await api.delete(`${LOGS_BASE}/ai/user/${userId}/delete`, {
    data: request,
  });
  return response.data.data;
};

/**
 * Kullanıcı AI verilerini dışa aktar (GDPR Article 20)
 * SADECE SUPER ADMIN
 */
export const exportUserAIData = async (userId: number): Promise<AIDataExport> => {
  const response = await api.get(`${LOGS_BASE}/ai/user/${userId}/export`);
  return response.data.data;
};

/**
 * Veri saklama politikasını manuel uygula
 * SADECE SUPER ADMIN
 */
export const applyAIRetentionPolicy = async (): Promise<AIRetentionPolicyResult> => {
  const response = await api.post(`${LOGS_BASE}/ai/retention/apply`);
  return response.data.data;
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * AI durumunu renk koduna çevir
 */
export const getAIStatusColor = (status: string): string => {
  switch (status) {
    case 'operational':
      return 'green';
    case 'degraded':
      return 'yellow';
    case 'maintenance':
      return 'blue';
    case 'offline':
      return 'red';
    default:
      return 'gray';
  }
};

/**
 * Rollout stage'i Türkçe'ye çevir
 */
export const getRolloutStageLabel = (stage: string): string => {
  const labels: Record<string, string> = {
    disabled: 'Devre Dışı',
    internal_testing: 'İç Test',
    beta: 'Beta',
    gradual_rollout: 'Kademeli Yayın',
    full_release: 'Tam Yayın',
  };
  return labels[stage] || stage;
};

/**
 * İhlal tipini Türkçe'ye çevir
 */
export const getViolationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    rate_limit_abuse: 'Hız Limiti Suistimali',
    quota_bypass_attempt: 'Kota Atlama Girişimi',
    prompt_injection: 'Prompt Enjeksiyonu',
    content_policy_violation: 'İçerik Politikası İhlali',
    exam_ai_attempt: 'Sınav Sırasında AI Kullanım Girişimi',
    suspicious_pattern: 'Şüpheli Aktivite Kalıbı',
    api_abuse: 'API Suistimali',
  };
  return labels[type] || type;
};

/**
 * Severity'yi Türkçe'ye çevir
 */
export const getSeverityLabel = (severity: string): string => {
  const labels: Record<string, string> = {
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
    critical: 'Kritik',
  };
  return labels[severity] || severity;
};

/**
 * Feature adını Türkçe'ye çevir
 */
export const getFeatureLabel = (feature: string): string => {
  const labels: Record<string, string> = {
    question_hint: 'Soru İpucu',
    topic_explanation: 'Konu Açıklama',
    study_plan: 'Çalışma Planı',
    answer_evaluation: 'Cevap Değerlendirme',
    performance_analysis: 'Performans Analizi',
    question_generation: 'Soru Üretimi',
    content_enhancement: 'İçerik İyileştirme',
    motivation_message: 'Motivasyon Mesajı',
  };
  return labels[feature] || feature;
};

export default {
  // Usage & Monitoring
  getAIUsageReport,
  getAIAccessReport,
  getAIErrorReport,
  getAIPrivacyPolicy,
  getAIAnonymizationDemo,
  
  // Cost
  getAICostReport,
  getAIBudgetStatus,
  
  // System Status
  getAISystemStatus,
  toggleAIKillSwitch,
  checkAIHealth,
  
  // Feature Flags
  getAIFeatureFlags,
  getAIFeatureFlag,
  updateAIFeatureFlag,
  toggleAIFeature,
  setAIRolloutStage,
  
  // Quotas
  getAIQuotaConfig,
  getAIUserQuotas,
  getAIUserQuotaDetail,
  updateAIUserQuota,
  toggleAIUserBlock,
  resetAIUserQuota,
  
  // Violations
  getAIViolations,
  getAIViolationDetail,
  getAIViolationStats,
  resolveAIViolation,
  
  // KVKK/GDPR
  deleteUserAIData,
  exportUserAIData,
  applyAIRetentionPolicy,
  
  // Helpers
  getAIStatusColor,
  getRolloutStageLabel,
  getViolationTypeLabel,
  getSeverityLabel,
  getFeatureLabel,
};
