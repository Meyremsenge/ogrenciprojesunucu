/**
 * API Contract Types - Tip Tanımlamaları
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NEDEN TİCARİ ÜRÜNLER İÇİN KRİTİK?
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 1. TİP GÜVENLİĞİ: Runtime hatalarını derleme zamanında yakalar
 * 2. DOKÜMANTASYON: Tipler kendi kendini dökümante eder
 * 3. REFACTORING: Backend değişikliklerinde etkilenen yerleri hemen gösterir
 * 4. IDE DESTEĞI: Otomatik tamamlama ve hata gösterimi
 * 5. TAKIMLAR ARASI SÖZLEŞMe: Frontend-Backend arasında açık sözleşme
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 BASE API RESPONSE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standart API Response Wrapper
 * Tüm API yanıtları bu formatta döner
 */
export interface ApiResponse<T = unknown> {
  /** İşlem başarılı mı? */
  success: boolean;
  
  /** Yanıt verisi */
  data?: T;
  
  /** Kullanıcıya gösterilecek mesaj (opsiyonel) */
  message?: string;
  
  /** ISO 8601 formatında zaman damgası */
  timestamp: string;
  
  /** İstek takip ID'si (debugging için) */
  request_id?: string;
  
  /** Ek metadata (versiyon, debug bilgisi vb.) */
  meta?: ApiMeta;
  
  /** Hata detayları (sadece success=false durumunda) */
  error?: ApiErrorDetail;
}

/**
 * Metadata bilgileri
 */
export interface ApiMeta {
  /** API versiyonu */
  version?: string;
  
  /** Sayfalama bilgisi */
  pagination?: PaginationMeta;
  
  /** Cursor tabanlı sayfalama */
  cursor?: CursorMeta;
  
  /** İşlem süresi (ms) */
  duration_ms?: number;
  
  /** Önbellek bilgisi */
  cache?: CacheMeta;
  
  /** Rate limit bilgisi */
  rate_limit?: RateLimitMeta;
  
  /** Deprecation uyarısı */
  deprecation?: DeprecationMeta;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 PAGINATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sayfalama metadata
 */
export interface PaginationMeta {
  /** Mevcut sayfa (1-indexed) */
  page: number;
  
  /** Sayfa başına öğe sayısı */
  per_page: number;
  
  /** Toplam öğe sayısı */
  total: number;
  
  /** Toplam sayfa sayısı */
  total_pages: number;
  
  /** Sonraki sayfa var mı? */
  has_next: boolean;
  
  /** Önceki sayfa var mı? */
  has_prev: boolean;
  
  /** Sonraki sayfa numarası */
  next_page?: number;
  
  /** Önceki sayfa numarası */
  prev_page?: number;
}

/**
 * Cursor tabanlı sayfalama
 */
export interface CursorMeta {
  /** Sonraki sayfa cursor'ı */
  next_cursor?: string;
  
  /** Önceki sayfa cursor'ı */
  prev_cursor?: string;
  
  /** Daha fazla veri var mı? */
  has_more: boolean;
  
  /** Sayfa limiti */
  limit: number;
}

/**
 * Paginated response helper type
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta & {
    pagination: PaginationMeta;
  };
}

/**
 * Cursor paginated response helper type
 */
export interface CursorPaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta & {
    cursor: CursorMeta;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hata detay yapısı
 */
export interface ApiErrorDetail {
  /** Makine tarafından okunabilir hata kodu */
  code: ApiErrorCode;
  
  /** İnsan tarafından okunabilir hata mesajı */
  message: string;
  
  /** Ek hata detayları */
  details?: Record<string, unknown>;
  
  /** Alan bazlı hatalar (validation) */
  errors?: FieldError[];
  
  /** Yardım dokümanı URL'si */
  help_url?: string;
  
  /** Retry edilebilir mi? */
  retryable?: boolean;
  
  /** Önerilen bekleme süresi (ms) */
  retry_after?: number;
}

/**
 * Alan bazlı validation hatası
 */
export interface FieldError {
  /** Alan adı */
  field: string;
  
  /** Hata mesajı */
  message: string;
  
  /** Hata kodu */
  code?: string;
  
  /** Hatalı değer (debug için) */
  value?: unknown;
}

/**
 * Standart hata kodları
 * Backend ile senkronize tutulmalı
 */
export type ApiErrorCode =
  // Authentication (401)
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'SESSION_EXPIRED'
  | 'MFA_REQUIRED'
  
  // Authorization (403)
  | 'FORBIDDEN'
  | 'INSUFFICIENT_PERMISSION'
  | 'RESOURCE_ACCESS_DENIED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_NOT_VERIFIED'
  
  // Validation (400, 422)
  | 'VALIDATION_ERROR'
  | 'INVALID_FORMAT'
  | 'MISSING_FIELD'
  | 'INVALID_VALUE'
  | 'CONSTRAINT_VIOLATION'
  
  // Not Found (404)
  | 'NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'RESOURCE_NOT_FOUND'
  | 'ENDPOINT_NOT_FOUND'
  
  // Conflict (409)
  | 'CONFLICT'
  | 'DUPLICATE_RESOURCE'
  | 'VERSION_CONFLICT'
  | 'RESOURCE_LOCKED'
  
  // Rate Limit (429)
  | 'RATE_LIMIT_EXCEEDED'
  | 'QUOTA_EXCEEDED'
  
  // Server (500+)
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  
  // Business Logic (422)
  | 'BUSINESS_RULE_VIOLATION'
  | 'OPERATION_NOT_ALLOWED'
  | 'PREREQUISITE_NOT_MET'
  
  // Network
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CONNECTION_REFUSED'
  
  // Generic
  | 'UNKNOWN_ERROR'
  | 'ERROR';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 CACHE & RATE LIMIT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cache metadata
 */
export interface CacheMeta {
  /** Cache'den mi geldi? */
  cached: boolean;
  
  /** Cache anahtarı */
  key?: string;
  
  /** Ne zaman expire olacak */
  expires_at?: string;
  
  /** Kalan TTL (saniye) */
  ttl?: number;
}

/**
 * Rate limit metadata
 */
export interface RateLimitMeta {
  /** Toplam limit */
  limit: number;
  
  /** Kalan istek sayısı */
  remaining: number;
  
  /** Reset zamanı (Unix timestamp) */
  reset: number;
  
  /** Retry için bekleme süresi (saniye) */
  retry_after?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 VERSIONING & DEPRECATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deprecation metadata
 */
export interface DeprecationMeta {
  /** Deprecated endpoint/field */
  deprecated: string;
  
  /** Alternatif endpoint/field */
  alternative?: string;
  
  /** Ne zaman kaldırılacak */
  sunset_date?: string;
  
  /** Migration rehberi URL'si */
  migration_guide?: string;
  
  /** Uyarı mesajı */
  message?: string;
}

/**
 * API Version bilgisi
 */
export interface ApiVersion {
  /** Major versiyon (breaking changes) */
  major: number;
  
  /** Minor versiyon (yeni özellikler) */
  minor: number;
  
  /** Patch versiyon (bug fixes) */
  patch: number;
  
  /** Tam versiyon string */
  full: string;
  
  /** Minimum desteklenen client versiyonu */
  min_client_version?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 REQUEST TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pagination request parametreleri
 */
export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Cursor pagination request parametreleri
 */
export interface CursorParams {
  cursor?: string;
  limit?: number;
  direction?: 'next' | 'prev';
}

/**
 * Filter request parametreleri
 */
export interface FilterParams {
  search?: string;
  filters?: Record<string, string | number | boolean | string[]>;
  date_from?: string;
  date_to?: string;
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest<T = unknown> {
  /** İşlem yapılacak ID'ler */
  ids: string[];
  
  /** İşlem tipi */
  operation: string;
  
  /** İşlem parametreleri */
  params?: T;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  /** Başarılı işlem sayısı */
  success_count: number;
  
  /** Başarısız işlem sayısı */
  failure_count: number;
  
  /** Başarılı ID'ler */
  succeeded: string[];
  
  /** Başarısız ID'ler ve hataları */
  failed: Array<{
    id: string;
    error: string;
    code?: ApiErrorCode;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📤 ASYNC OPERATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Async operation status
 */
export type AsyncOperationStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Async operation response (202 Accepted)
 */
export interface AsyncOperationResponse {
  /** İşlem ID'si */
  task_id: string;
  
  /** Mevcut durum */
  status: AsyncOperationStatus;
  
  /** İlerleme yüzdesi (0-100) */
  progress?: number;
  
  /** Durum sorgu URL'si */
  status_url: string;
  
  /** İptal URL'si */
  cancel_url?: string;
  
  /** Tahmini tamamlanma süresi (saniye) */
  estimated_completion?: number;
  
  /** Mesaj */
  message?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * API response başarılı mı kontrol eder
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * API response hata mı kontrol eder
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: false; error: ApiErrorDetail } {
  return response.success === false && response.error !== undefined;
}

/**
 * Paginated response mı kontrol eder
 */
export function isPaginatedResponse<T>(response: ApiResponse<T[]>): response is PaginatedResponse<T> {
  return response.meta?.pagination !== undefined;
}

/**
 * Field error array mı kontrol eder
 */
export function hasFieldErrors(error: ApiErrorDetail): error is ApiErrorDetail & { errors: FieldError[] } {
  return Array.isArray(error.errors) && error.errors.length > 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ID ile tanımlanan kaynak
 */
export interface Identifiable {
  id: string;
}

/**
 * Timestamp'lı kaynak
 */
export interface Timestamped {
  created_at: string;
  updated_at: string;
}

/**
 * Soft delete'li kaynak
 */
export interface SoftDeletable {
  deleted_at?: string;
  is_deleted: boolean;
}

/**
 * Versiyonlu kaynak (optimistic locking)
 */
export interface Versionable {
  version: number;
}

/**
 * Audit trail'li kaynak
 */
export interface Auditable {
  created_by?: string;
  updated_by?: string;
  deleted_by?: string;
}

/**
 * Tam özellikli kaynak tipi
 */
export type FullResource<T> = T & Identifiable & Timestamped & SoftDeletable & Versionable & Auditable;
