/**
 * Error Code Messages - Hata Kodu → Kullanıcı Mesajı Eşleşmesi
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NEDEN TİCARİ ÜRÜNLER İÇİN KRİTİK?
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 1. KULLANICI DENEYİMİ: Teknik hataları anlaşılır mesajlara çevirir
 * 2. DESTEK MALİYETİ: Net hatalar = daha az destek talebi
 * 3. GÜVENLİK: Hassas hata detaylarını gizler
 * 4. MARKALAsMA: Tutarlı hata mesajları marka güveni oluşturur
 * 5. LOKALİZASYON: Çoklu dil desteği için temel altyapı
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { ApiErrorCode, ApiErrorDetail, FieldError } from './ApiContractTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 ERROR MESSAGE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hata mesajı yapısı
 */
export interface ErrorMessage {
  /** Kullanıcıya gösterilecek başlık */
  title: string;
  
  /** Detaylı açıklama */
  description: string;
  
  /** Kullanıcının yapabileceği eylem önerisi */
  action?: string;
  
  /** İkon tipi */
  icon?: 'warning' | 'error' | 'info' | 'lock' | 'clock' | 'network';
  
  /** Otomatik retry önerilir mi? */
  suggestRetry?: boolean;
  
  /** Destek ile iletişim önerilir mi? */
  suggestSupport?: boolean;
}

/**
 * Türkçe hata mesajları
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, ErrorMessage> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // 🔐 Authentication Errors (401)
  // ─────────────────────────────────────────────────────────────────────────────
  UNAUTHORIZED: {
    title: 'Oturum Gerekli',
    description: 'Bu işlem için giriş yapmanız gerekmektedir.',
    action: 'Lütfen giriş yapın ve tekrar deneyin.',
    icon: 'lock',
  },
  
  INVALID_CREDENTIALS: {
    title: 'Hatalı Giriş Bilgileri',
    description: 'E-posta veya şifre hatalı.',
    action: 'Bilgilerinizi kontrol edip tekrar deneyin.',
    icon: 'error',
  },
  
  TOKEN_EXPIRED: {
    title: 'Oturum Süresi Doldu',
    description: 'Güvenliğiniz için oturumunuz sonlandırıldı.',
    action: 'Lütfen tekrar giriş yapın.',
    icon: 'clock',
  },
  
  TOKEN_INVALID: {
    title: 'Geçersiz Oturum',
    description: 'Oturum bilgileriniz geçersiz.',
    action: 'Lütfen tekrar giriş yapın.',
    icon: 'lock',
  },
  
  SESSION_EXPIRED: {
    title: 'Oturum Sona Erdi',
    description: 'Uzun süredir işlem yapmadığınız için oturumunuz sonlandırıldı.',
    action: 'Devam etmek için tekrar giriş yapın.',
    icon: 'clock',
  },
  
  MFA_REQUIRED: {
    title: 'Doğrulama Gerekli',
    description: 'Bu işlem için iki faktörlü doğrulama gerekiyor.',
    action: 'Lütfen doğrulama kodunuzu girin.',
    icon: 'lock',
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 🚫 Authorization Errors (403)
  // ─────────────────────────────────────────────────────────────────────────────
  FORBIDDEN: {
    title: 'Erişim Reddedildi',
    description: 'Bu işlemi gerçekleştirme yetkiniz bulunmuyor.',
    action: 'Yetki için sistem yöneticinizle iletişime geçin.',
    icon: 'lock',
    suggestSupport: true,
  },
  
  INSUFFICIENT_PERMISSION: {
    title: 'Yetersiz Yetki',
    description: 'Bu işlem için gerekli izniniz yok.',
    action: 'Ek yetki talep etmek için yöneticinize başvurun.',
    icon: 'lock',
    suggestSupport: true,
  },
  
  RESOURCE_ACCESS_DENIED: {
    title: 'Kaynak Erişimi Engellendi',
    description: 'Bu kaynağa erişim izniniz bulunmuyor.',
    action: 'Doğru kaynağa erişmeye çalıştığınızdan emin olun.',
    icon: 'lock',
  },
  
  ACCOUNT_SUSPENDED: {
    title: 'Hesap Askıya Alındı',
    description: 'Hesabınız geçici olarak askıya alınmıştır.',
    action: 'Detaylı bilgi için destek ekibimizle iletişime geçin.',
    icon: 'error',
    suggestSupport: true,
  },
  
  ACCOUNT_NOT_VERIFIED: {
    title: 'Hesap Doğrulanmadı',
    description: 'E-posta adresiniz henüz doğrulanmamış.',
    action: 'E-posta kutunuzu kontrol edin veya yeni doğrulama maili isteyin.',
    icon: 'info',
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ⚠️ Validation Errors (400, 422)
  // ─────────────────────────────────────────────────────────────────────────────
  VALIDATION_ERROR: {
    title: 'Geçersiz Veri',
    description: 'Gönderilen bilgilerde hatalar var.',
    action: 'Lütfen işaretli alanları düzeltip tekrar deneyin.',
    icon: 'warning',
  },
  
  INVALID_FORMAT: {
    title: 'Hatalı Format',
    description: 'Girilen değer beklenen formata uymuyor.',
    action: 'Lütfen değeri doğru formatta girin.',
    icon: 'warning',
  },
  
  MISSING_FIELD: {
    title: 'Eksik Bilgi',
    description: 'Zorunlu alanlar doldurulmamış.',
    action: 'Lütfen tüm zorunlu alanları doldurun.',
    icon: 'warning',
  },
  
  INVALID_VALUE: {
    title: 'Geçersiz Değer',
    description: 'Girilen değer kabul edilebilir aralıkta değil.',
    action: 'Lütfen geçerli bir değer girin.',
    icon: 'warning',
  },
  
  CONSTRAINT_VIOLATION: {
    title: 'Kısıtlama İhlali',
    description: 'Girilen değer sistem kurallarına uymuyor.',
    action: 'Lütfen sistem gereksinimlerine uygun değer girin.',
    icon: 'warning',
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 🔍 Not Found Errors (404)
  // ─────────────────────────────────────────────────────────────────────────────
  NOT_FOUND: {
    title: 'Bulunamadı',
    description: 'Aradığınız kaynak bulunamadı.',
    action: 'Adresin doğru olduğundan emin olun.',
    icon: 'info',
  },
  
  USER_NOT_FOUND: {
    title: 'Kullanıcı Bulunamadı',
    description: 'Belirtilen kullanıcı sistemde kayıtlı değil.',
    action: 'Kullanıcı bilgilerini kontrol edin.',
    icon: 'info',
  },
  
  RESOURCE_NOT_FOUND: {
    title: 'Kaynak Bulunamadı',
    description: 'İstenen kaynak mevcut değil veya silinmiş olabilir.',
    action: 'Kaynak silinmiş veya taşınmış olabilir.',
    icon: 'info',
  },
  
  ENDPOINT_NOT_FOUND: {
    title: 'Sayfa Bulunamadı',
    description: 'Bu adres mevcut değil.',
    action: 'Lütfen ana sayfaya dönün.',
    icon: 'info',
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ⚔️ Conflict Errors (409)
  // ─────────────────────────────────────────────────────────────────────────────
  CONFLICT: {
    title: 'Çakışma',
    description: 'Bu işlem mevcut verilerle çakışıyor.',
    action: 'Sayfayı yenileyip tekrar deneyin.',
    icon: 'warning',
    suggestRetry: true,
  },
  
  DUPLICATE_RESOURCE: {
    title: 'Kayıt Zaten Mevcut',
    description: 'Bu bilgilerle bir kayıt zaten var.',
    action: 'Farklı bilgiler kullanın veya mevcut kaydı güncelleyin.',
    icon: 'warning',
  },
  
  VERSION_CONFLICT: {
    title: 'Versiyon Çakışması',
    description: 'Kayıt başka biri tarafından değiştirilmiş.',
    action: 'Sayfayı yenileyip değişiklikleri tekrar yapın.',
    icon: 'warning',
    suggestRetry: true,
  },
  
  RESOURCE_LOCKED: {
    title: 'Kayıt Kilitli',
    description: 'Bu kayıt şu anda başka bir işlem tarafından kullanılıyor.',
    action: 'Birkaç saniye bekleyip tekrar deneyin.',
    icon: 'clock',
    suggestRetry: true,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ⏱️ Rate Limit Errors (429)
  // ─────────────────────────────────────────────────────────────────────────────
  RATE_LIMIT_EXCEEDED: {
    title: 'Çok Fazla İstek',
    description: 'Kısa sürede çok fazla işlem yaptınız.',
    action: 'Lütfen biraz bekleyip tekrar deneyin.',
    icon: 'clock',
    suggestRetry: true,
  },
  
  QUOTA_EXCEEDED: {
    title: 'Limit Aşıldı',
    description: 'Günlük/aylık kullanım limitiniz doldu.',
    action: 'Limit yenilenmesi için bekleyin veya planınızı yükseltin.',
    icon: 'warning',
    suggestSupport: true,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 💥 Server Errors (500+)
  // ─────────────────────────────────────────────────────────────────────────────
  INTERNAL_ERROR: {
    title: 'Sistem Hatası',
    description: 'Beklenmeyen bir hata oluştu.',
    action: 'Lütfen daha sonra tekrar deneyin.',
    icon: 'error',
    suggestRetry: true,
    suggestSupport: true,
  },
  
  SERVICE_UNAVAILABLE: {
    title: 'Servis Kullanılamıyor',
    description: 'Sistem şu anda bakımda veya aşırı yüklü.',
    action: 'Birkaç dakika sonra tekrar deneyin.',
    icon: 'clock',
    suggestRetry: true,
  },
  
  DATABASE_ERROR: {
    title: 'Veritabanı Hatası',
    description: 'Veri işlenirken bir sorun oluştu.',
    action: 'Lütfen daha sonra tekrar deneyin.',
    icon: 'error',
    suggestRetry: true,
    suggestSupport: true,
  },
  
  EXTERNAL_SERVICE_ERROR: {
    title: 'Harici Servis Hatası',
    description: 'Bağlı bir hizmet yanıt vermiyor.',
    action: 'Lütfen daha sonra tekrar deneyin.',
    icon: 'clock',
    suggestRetry: true,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 📋 Business Logic Errors (422)
  // ─────────────────────────────────────────────────────────────────────────────
  BUSINESS_RULE_VIOLATION: {
    title: 'İş Kuralı İhlali',
    description: 'Bu işlem iş kurallarına aykırı.',
    action: 'İşlem gereksinimlerini kontrol edin.',
    icon: 'warning',
  },
  
  OPERATION_NOT_ALLOWED: {
    title: 'İşlem İzin Verilmiyor',
    description: 'Bu işlem mevcut durumda gerçekleştirilemez.',
    action: 'Önkoşulların sağlandığından emin olun.',
    icon: 'lock',
  },
  
  PREREQUISITE_NOT_MET: {
    title: 'Ön Koşul Sağlanmadı',
    description: 'Bu işlem için gerekli adımlar tamamlanmamış.',
    action: 'Önce gerekli adımları tamamlayın.',
    icon: 'info',
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 🌐 Network Errors
  // ─────────────────────────────────────────────────────────────────────────────
  NETWORK_ERROR: {
    title: 'Bağlantı Hatası',
    description: 'İnternet bağlantınızda sorun var.',
    action: 'İnternet bağlantınızı kontrol edip tekrar deneyin.',
    icon: 'network',
    suggestRetry: true,
  },
  
  TIMEOUT: {
    title: 'Zaman Aşımı',
    description: 'İşlem çok uzun sürdü ve zaman aşımına uğradı.',
    action: 'Lütfen tekrar deneyin.',
    icon: 'clock',
    suggestRetry: true,
  },
  
  CONNECTION_REFUSED: {
    title: 'Bağlantı Reddedildi',
    description: 'Sunucuya bağlanılamıyor.',
    action: 'Daha sonra tekrar deneyin.',
    icon: 'network',
    suggestRetry: true,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 🔮 Generic
  // ─────────────────────────────────────────────────────────────────────────────
  UNKNOWN_ERROR: {
    title: 'Bilinmeyen Hata',
    description: 'Beklenmeyen bir hata oluştu.',
    action: 'Lütfen daha sonra tekrar deneyin.',
    icon: 'error',
    suggestRetry: true,
    suggestSupport: true,
  },
  
  ERROR: {
    title: 'Hata',
    description: 'Bir hata oluştu.',
    action: 'Lütfen tekrar deneyin.',
    icon: 'error',
    suggestRetry: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 FIELD ERROR MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Alan bazlı hata kodu → mesaj eşleşmesi
 */
export const FIELD_ERROR_MESSAGES: Record<string, string> = {
  // Format hataları
  invalid_email: 'Geçerli bir e-posta adresi girin',
  invalid_phone: 'Geçerli bir telefon numarası girin',
  invalid_url: 'Geçerli bir URL girin',
  invalid_date: 'Geçerli bir tarih girin',
  invalid_tc_kimlik: 'Geçerli bir TC Kimlik numarası girin',
  
  // Uzunluk hataları
  too_short: 'Çok kısa',
  too_long: 'Çok uzun',
  min_length: 'En az {min} karakter olmalı',
  max_length: 'En fazla {max} karakter olabilir',
  
  // Sayısal hatalar
  too_small: 'Çok düşük',
  too_large: 'Çok yüksek',
  min_value: 'En az {min} olmalı',
  max_value: 'En fazla {max} olabilir',
  not_integer: 'Tam sayı olmalı',
  not_positive: 'Pozitif bir sayı olmalı',
  
  // Gereklilik hataları
  required: 'Bu alan zorunludur',
  not_empty: 'Bu alan boş bırakılamaz',
  not_null: 'Bir değer seçilmelidir',
  
  // Şifre hataları
  password_too_weak: 'Şifre çok zayıf',
  password_missing_uppercase: 'En az bir büyük harf içermeli',
  password_missing_lowercase: 'En az bir küçük harf içermeli',
  password_missing_number: 'En az bir rakam içermeli',
  password_missing_special: 'En az bir özel karakter içermeli',
  passwords_not_match: 'Şifreler eşleşmiyor',
  
  // Benzersizlik hataları
  already_exists: 'Bu değer zaten kullanılıyor',
  duplicate: 'Bu kayıt zaten mevcut',
  not_unique: 'Bu değer benzersiz olmalı',
  
  // Referans hataları
  invalid_reference: 'Geçersiz referans',
  reference_not_found: 'Referans bulunamadı',
  
  // Dosya hataları
  file_too_large: 'Dosya çok büyük',
  invalid_file_type: 'Geçersiz dosya türü',
  file_upload_failed: 'Dosya yüklenemedi',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 ERROR MESSAGE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hata kodundan mesaj objesi alır
 */
export function getErrorMessage(code: ApiErrorCode): ErrorMessage {
  const message = ERROR_MESSAGES[code];
  return message ?? ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * ApiErrorDetail'den kullanıcıya gösterilecek mesaj üretir
 */
export function formatErrorForUser(error: ApiErrorDetail): ErrorMessage {
  const baseMessage = getErrorMessage(error.code);
  
  // Backend'den özel mesaj geldiyse onu kullan
  if (error.message && error.message !== error.code) {
    const result: ErrorMessage = {
      title: baseMessage.title,
      description: error.message,
      action: baseMessage.action,
      icon: baseMessage.icon,
      suggestRetry: baseMessage.suggestRetry,
      suggestSupport: baseMessage.suggestSupport,
    };
    return result;
  }
  
  return baseMessage;
}

/**
 * Field error'ı kullanıcı dostu mesaja çevirir
 */
export function formatFieldError(error: FieldError): string {
  const { code, message, field } = error;
  
  // Özel mesaj varsa kullan
  if (message) {
    return message;
  }
  
  // Kod bazlı mesaj
  if (code && FIELD_ERROR_MESSAGES[code]) {
    return FIELD_ERROR_MESSAGES[code];
  }
  
  // Varsayılan
  return `${field} alanı geçersiz`;
}

/**
 * Field error array'i obje formatına çevirir (form kütüphaneleri için)
 */
export function fieldErrorsToObject(errors: FieldError[]): Record<string, string> {
  return errors.reduce((acc, error) => {
    acc[error.field] = formatFieldError(error);
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Nested field path'i düzleştirir (e.g., "address.city" -> "Adres - Şehir")
 */
export function formatFieldPath(path: string): string {
  const FIELD_LABELS: Record<string, string> = {
    email: 'E-posta',
    password: 'Şifre',
    password_confirm: 'Şifre Tekrar',
    first_name: 'Ad',
    last_name: 'Soyad',
    phone: 'Telefon',
    address: 'Adres',
    city: 'Şehir',
    country: 'Ülke',
    zip_code: 'Posta Kodu',
    birth_date: 'Doğum Tarihi',
    tc_kimlik: 'TC Kimlik No',
    student_number: 'Öğrenci Numarası',
    department: 'Bölüm',
    faculty: 'Fakülte',
  };
  
  return path
    .split('.')
    .map(part => FIELD_LABELS[part] || part)
    .join(' - ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚛️ REACT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface ErrorMessageContextValue {
  getError: (code: ApiErrorCode) => ErrorMessage;
  formatError: (error: ApiErrorDetail) => ErrorMessage;
  formatField: (error: FieldError) => string;
}

const ErrorMessageContext = createContext<ErrorMessageContextValue | null>(null);

/**
 * Error message provider (i18n desteği için genişletilebilir)
 */
export function ErrorMessageProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<ErrorMessageContextValue>(() => ({
    getError: getErrorMessage,
    formatError: formatErrorForUser,
    formatField: formatFieldError,
  }), []);
  
  return (
    <ErrorMessageContext.Provider value={value}>
      {children}
    </ErrorMessageContext.Provider>
  );
}

/**
 * Error message hook
 */
export function useErrorMessages() {
  const context = useContext(ErrorMessageContext);
  
  // Context dışında da çalışabilir
  return context || {
    getError: getErrorMessage,
    formatError: formatErrorForUser,
    formatField: formatFieldError,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ERROR DISPLAY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const iconMap = {
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
  lock: '🔒',
  clock: '⏱️',
  network: '🌐',
} as const;

interface ErrorDisplayProps {
  error: ApiErrorDetail;
  showAction?: boolean;
  showSupport?: boolean;
  onRetry?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

/**
 * API hatasını görüntüleyen component
 */
export function ErrorDisplay({
  error,
  showAction = true,
  showSupport = true,
  onRetry,
  onContactSupport,
  className = '',
}: ErrorDisplayProps): React.ReactElement {
  const message: ErrorMessage = formatErrorForUser(error);
  const icon = message.icon ? iconMap[message.icon] : iconMap.error;
  const actionText = message.action ?? null;
  
  // Boolean değerleri önceden hesapla
  const shouldShowAction = showAction === true && actionText !== null && actionText.length > 0;
  const hasFieldErrors = Array.isArray(error.errors) && error.errors.length > 0;
  const shouldShowActions = message.suggestRetry === true || message.suggestSupport === true;
  
  // Error code'un ERROR içerip içermediğini kontrol et
  const errorCodeStr = String(error.code);
  const isRedError = errorCodeStr.includes('ERROR') || error.code === 'INTERNAL_ERROR';
  
  return (
    <div
      className={`
        rounded-lg border p-4
        ${isRedError 
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
          : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
        }
        ${className}
      `}
      role="alert"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl" role="img" aria-hidden="true">{icon}</span>
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
          {message.title}
        </h4>
      </div>
      
      {/* Description */}
      <p className="text-gray-700 dark:text-gray-300 mb-2">
        {message.description}
      </p>
      
      {/* Action Suggestion */}
      {shouldShowAction ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          💡 {actionText}
        </p>
      ) : null}
      
      {/* Field Errors */}
      {hasFieldErrors ? (
        <div className="mt-3 pt-3 border-t border-current/10">
          <p className="text-sm font-medium mb-2">Hatalı alanlar:</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            {(error.errors as FieldError[]).map((fieldError, index) => (
              <li key={index}>
                <span className="font-medium">{formatFieldPath(fieldError.field)}:</span>{' '}
                {formatFieldError(fieldError)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      
      {/* Actions */}
      {shouldShowActions ? (
        <div className="flex gap-2 mt-3 pt-3 border-t border-current/10">
          {message.suggestRetry === true && onRetry != null ? (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Tekrar Dene
            </button>
          ) : null}
          {showSupport === true && message.suggestSupport === true && onContactSupport != null ? (
            <button
              onClick={onContactSupport}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Destek Al
            </button>
          ) : null}
        </div>
      ) : null}
      
      {/* Request ID (Debug) */}
      {error.details?.request_id != null ? (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
          Hata Kodu: {String(error.details.request_id)}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Inline field error component
 */
export function FieldErrorText({ error, className = '' }: { error: FieldError | string; className?: string }) {
  const message = typeof error === 'string' ? error : formatFieldError(error);
  
  return (
    <p className={`text-sm text-red-600 dark:text-red-400 mt-1 ${className}`} role="alert">
      {message}
    </p>
  );
}

/**
 * Toast-style error notification
 */
export function ErrorToast({ error, onClose }: { error: ApiErrorDetail; onClose: () => void }) {
  const message = formatErrorForUser(error);
  const icon = message.icon ? iconMap[message.icon] : iconMap.error;
  
  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 animate-slide-in-right">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {message.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {message.description}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          aria-label="Kapat"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
