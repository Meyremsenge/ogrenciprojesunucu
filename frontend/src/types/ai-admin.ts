/**
 * AI Admin Types & Interfaces
 * 
 * Admin ve Super Admin için AI yönetim tipleri.
 * KVKK/GDPR uyumlu yapı.
 */

// =============================================================================
// AI USAGE & MONITORING
// =============================================================================

/**
 * AI Kullanım Raporu
 */
export interface AIUsageReport {
  summary: AIUsageSummary;
  by_feature: AIFeatureUsage[];
  daily_trend: AIDailyTrend[];
  errors: AIErrorSummary;
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
}

export interface AIUsageSummary {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_tokens: number;
  average_response_time_ms: number;
  unique_users: number;
  success_rate: number;
}

export interface AIFeatureUsage {
  feature: string;
  display_name: string;
  request_count: number;
  token_count: number;
  avg_response_time: number;
  error_rate: number;
  percentage_of_total: number;
}

export interface AIDailyTrend {
  date: string;
  requests: number;
  tokens: number;
  unique_users: number;
  errors: number;
  avg_response_time: number;
}

export interface AIErrorSummary {
  total_errors: number;
  total_timeouts: number;
  by_type: AIErrorByType[];
}

export interface AIErrorByType {
  error_type: string;
  count: number;
  percentage: number;
}

// =============================================================================
// AI ACCESS REPORTS (KVKK/GDPR Uyumlu)
// =============================================================================

/**
 * AI Erişim Raporu - Anonim
 */
export interface AIAccessReport {
  access_records: AIAccessRecord[];
  summary: {
    total_users: number;
    total_requests: number;
    total_tokens: number;
    period_days: number;
  };
  privacy_note: string;
}

export interface AIAccessRecord {
  // Anonim ID (hash)
  anonymous_id: string;
  // Eğer Super Admin ve include_user_details=true ise
  user_id?: number;
  user_email?: string;
  user_name?: string;
  
  request_count: number;
  total_tokens: number;
  first_access: string;  // Saat yuvarlanmış
  last_access: string;   // Saat yuvarlanmış
  features_used: string[];
  
  // Kota durumu
  quota_status?: {
    daily_limit: number;
    daily_used: number;
    remaining: number;
  };
}

// =============================================================================
// AI ERROR & TIMEOUT REPORTS
// =============================================================================

/**
 * AI Hata/Timeout Raporu
 */
export interface AIErrorReport {
  errors: AIErrorDetail[];
  timeouts: AITimeoutDetail[];
  summary: {
    total_errors: number;
    total_timeouts: number;
    most_affected_feature: string;
    period_days: number;
  };
}

export interface AIErrorDetail {
  date: string;
  feature: string;
  error_type: string;
  count: number;
  last_occurrence: string;
}

export interface AITimeoutDetail {
  date: string;
  feature: string;
  count: number;
  avg_duration_before_timeout: number;
}

// =============================================================================
// AI COST MONITORING
// =============================================================================

/**
 * AI Maliyet Raporu
 */
export interface AICostReport {
  current_period: AICostPeriod;
  previous_period: AICostPeriod;
  change_percentage: number;
  budget: AICostBudget;
  by_feature: AICostByFeature[];
  daily_costs: AIDailyCost[];
  optimization_suggestions: AIOptimizationSuggestion[];
}

export interface AICostPeriod {
  start_date: string;
  end_date: string;
  total_cost_usd: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  request_count: number;
  cost_per_request: number;
}

export interface AICostBudget {
  daily_limit_usd: number;
  monthly_limit_usd: number;
  daily_used_usd: number;
  monthly_used_usd: number;
  daily_remaining_usd: number;
  monthly_remaining_usd: number;
  daily_utilization_percent: number;
  monthly_utilization_percent: number;
  alert_threshold_percent: number;
  is_alert_triggered: boolean;
}

export interface AICostByFeature {
  feature: string;
  display_name: string;
  cost_usd: number;
  tokens: number;
  percentage_of_total: number;
}

export interface AIDailyCost {
  date: string;
  cost_usd: number;
  tokens: number;
  requests: number;
}

export interface AIOptimizationSuggestion {
  id: string;
  type: 'caching' | 'prompt' | 'model' | 'quota';
  title: string;
  description: string;
  potential_savings_percent: number;
  implementation_difficulty: 'easy' | 'medium' | 'hard';
}

// =============================================================================
// AI ADMIN CONTROLS
// =============================================================================

/**
 * AI Sistem Durumu
 */
export interface AISystemStatus {
  status: 'operational' | 'degraded' | 'maintenance' | 'offline';
  kill_switch_active: boolean;
  circuit_breaker: AICircuitBreakerStatus;
  features: AIFeatureStatus[];
  health: AIHealthStatus;
  last_updated: string;
}

export interface AICircuitBreakerStatus {
  state: 'closed' | 'open' | 'half_open';
  failure_count: number;
  success_count: number;
  last_failure?: string;
  next_retry?: string;
}

export interface AIFeatureStatus {
  feature: string;
  display_name: string;
  enabled: boolean;
  rollout_stage: AIRolloutStage;
  rollout_percentage: number;
}

export type AIRolloutStage = 
  | 'disabled'
  | 'internal_testing'
  | 'beta'
  | 'gradual_rollout'
  | 'full_release';

export interface AIHealthStatus {
  api_connection: boolean;
  api_latency_ms: number;
  database_connection: boolean;
  cache_connection: boolean;
  last_successful_request?: string;
  uptime_percent_24h: number;
}

// =============================================================================
// AI QUOTA MANAGEMENT
// =============================================================================

/**
 * AI Kota Yönetimi
 */
export interface AIQuotaConfig {
  role_quotas: AIRoleQuota[];
  feature_quotas: AIFeatureQuota[];
  default_quota: AIDefaultQuota;
}

export interface AIRoleQuota {
  role: string;
  daily_token_limit: number;
  daily_request_limit: number;
  monthly_token_limit: number;
  is_unlimited: boolean;
  priority_level: number;
}

export interface AIFeatureQuota {
  feature: string;
  tokens_per_request: number;
  max_requests_per_minute: number;
  max_requests_per_day: number;
  cooldown_seconds: number;
}

export interface AIDefaultQuota {
  daily_tokens: number;
  daily_requests: number;
  monthly_tokens: number;
}

/**
 * Kullanıcı Kota Detayı
 */
export interface AIUserQuotaDetail {
  user_id: number;
  user_email: string;
  user_name: string;
  role: string;
  quota: {
    daily: {
      tokens_used: number;
      tokens_limit: number;
      requests_used: number;
      requests_limit: number;
    };
    monthly: {
      tokens_used: number;
      tokens_limit: number;
    };
  };
  is_blocked: boolean;
  blocked_reason?: string;
  blocked_until?: string;
  custom_quota?: {
    daily_limit?: number;
    monthly_limit?: number;
    is_unlimited?: boolean;
  };
}

// =============================================================================
// AI VIOLATIONS
// =============================================================================

/**
 * AI İhlal Kaydı
 */
export interface AIViolation {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  violation_type: AIViolationType;
  severity: AIViolationSeverity;
  description: string;
  feature: string;
  detected_at: string;
  is_resolved: boolean;
  resolved_by?: number;
  resolved_at?: string;
  resolution_notes?: string;
  action_taken?: AIViolationAction;
}

export type AIViolationType = 
  | 'rate_limit_abuse'
  | 'quota_bypass_attempt'
  | 'prompt_injection'
  | 'content_policy_violation'
  | 'exam_ai_attempt'
  | 'suspicious_pattern'
  | 'api_abuse';

export type AIViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AIViolationAction = 
  | 'warning'
  | 'temporary_block'
  | 'permanent_block'
  | 'quota_reduction'
  | 'manual_review';

export interface AIViolationStats {
  total_violations: number;
  by_type: { type: AIViolationType; count: number }[];
  by_severity: { severity: AIViolationSeverity; count: number }[];
  unresolved_count: number;
  period_days: number;
}

// =============================================================================
// AI FEATURE FLAGS
// =============================================================================

/**
 * AI Feature Flag Konfigürasyonu
 */
export interface AIFeatureFlagConfig {
  features: AIFeatureFlag[];
  kill_switch: {
    active: boolean;
    activated_at?: string;
    activated_by?: string;
    reason?: string;
  };
  maintenance_mode: boolean;
}

export interface AIFeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout_stage: AIRolloutStage;
  rollout_percentage: number;
  allowed_roles: string[];
  beta_users: number[];
  blacklisted_users: number[];
  config: Record<string, any>;
  updated_at: string;
  updated_by?: string;
}

export interface AIFeatureFlagUpdate {
  enabled?: boolean;
  rollout_stage?: AIRolloutStage;
  rollout_percentage?: number;
  allowed_roles?: string[];
  add_beta_users?: number[];
  remove_beta_users?: number[];
  add_blacklist?: number[];
  remove_blacklist?: number[];
  config?: Record<string, any>;
}

// =============================================================================
// KVKK/GDPR COMPLIANCE
// =============================================================================

/**
 * KVKK/GDPR Veri Silme İsteği
 */
export interface AIDataDeletionRequest {
  user_id: number;
  reason: string;  // Min 10 karakter
}

export interface AIDataDeletionResult {
  logs_deleted: number;
  quota_deleted: boolean;
  violations_deleted: number;
  deletion_logged: boolean;
  gdpr_compliant: boolean;
  kvkk_compliant: boolean;
}

/**
 * KVKK/GDPR Veri Dışa Aktarma
 */
export interface AIDataExport {
  user_id: number;
  export_date: string;
  data: {
    usage_logs: AIExportedLog[];
    quota_history: AIExportedQuota[];
    violations: AIExportedViolation[];
  };
  metadata: {
    total_records: number;
    date_range: {
      start: string;
      end: string;
    };
    note: string;  // "Prompt/yanıt içerikleri kaydedilmediği için dahil değildir"
  };
}

export interface AIExportedLog {
  date: string;
  feature: string;
  tokens_used: number;
  response_time_ms: number;
  success: boolean;
}

export interface AIExportedQuota {
  date: string;
  daily_used: number;
  daily_limit: number;
}

export interface AIExportedViolation {
  id: number;
  type: string;
  severity: string;
  detected_at: string;
  resolved: boolean;
}

/**
 * Veri Saklama Politikası
 */
export interface AIRetentionPolicyResult {
  logs_deleted: number;
  error_logs_deleted: number;
  violations_deleted: number;
  space_freed_mb: number;
  executed_at: string;
  executed_by: number;
}

/**
 * AI Gizlilik Politikası
 */
export interface AIPrivacyPolicy {
  policy_version: string;
  last_updated: string;
  kvkk_compliance: Record<string, {
    title: string;
    compliance: boolean;
    measures: string[];
    endpoint?: string;
  }>;
  gdpr_compliance: Record<string, {
    title: string;
    compliance: boolean;
    measures?: string[];
    endpoint?: string;
  }>;
  data_retention: {
    normal_logs: string;
    error_logs: string;
    resolved_violations: string;
    aggregate_stats: string;
  };
  what_is_logged: string[];
  what_is_NOT_logged: string[];
}

// =============================================================================
// ANONYMIZATION DEMO
// =============================================================================

export interface AIAnonymizationDemo {
  original: {
    user_id: number;
    ip_address: string;
    timestamp: string;
  };
  anonymized: {
    user_id_daily_hash: string;
    user_id_permanent_hash: string;
    masked_ip: string;
    truncated_time_hour: string;
    truncated_time_day: string;
  };
  explanation: {
    tr: string;
    en: string;
  };
}

// =============================================================================
// AI ADMIN ACTIONS
// =============================================================================

export interface AIKillSwitchAction {
  action: 'activate' | 'deactivate';
  reason?: string;
}

export interface AIRolloutAction {
  feature: string;
  stage: AIRolloutStage;
  percentage?: number;
}

export interface AIQuotaUpdateAction {
  user_id: number;
  daily_limit?: number;
  monthly_limit?: number;
  is_unlimited?: boolean;
  is_blocked?: boolean;
  block_reason?: string;
  block_duration_hours?: number;
}

export interface AIViolationResolveAction {
  violation_id: number;
  notes: string;
  action_taken: AIViolationAction;
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

export interface AIAdminResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface AIPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
