/**
 * AI Error Messages
 * 
 * Kullanıcı dostu, güven zedelemeyen mesaj dili.
 * 
 * UX PRENSİPLERİ:
 * ===============
 * 1. AI'yi suçlamayan, nötr dil
 * 2. Kullanıcıya aksiyon veren mesajlar
 * 3. Teknik detay yerine çözüm odaklı
 * 4. Destekleyici ve empatik ton
 * 5. Açık ve anlaşılır Türkçe
 */

import { 
  AI_ERROR_CODES, 
  AIErrorCode, 
  AIError,
  getErrorClassification,
} from './types';

// =============================================================================
// MESSAGE TEMPLATES
// =============================================================================

interface ErrorMessageTemplate {
  title: string;
  message: string;
  action?: string;
  emoji?: string;
}

/**
 * User-friendly error messages
 * Güven zedelemeyen, destekleyici mesaj dili
 */
export const ERROR_MESSAGES: Record<AIErrorCode, ErrorMessageTemplate> = {
  // Quota Messages - Pozitif ve yönlendirici
  [AI_ERROR_CODES.QUOTA_EXCEEDED]: {
    title: 'Günlük Limit Tamamlandı',
    message: 'Bugün için AI asistanı kullanım hakkınız doldu. Yarın yeni haklarınız tanımlanacak.',
    action: 'Kalan çalışmalarınız için geleneksel kaynaklarımızı kullanabilirsiniz.',
    emoji: '📊',
  },
  [AI_ERROR_CODES.QUOTA_DAILY_LIMIT]: {
    title: 'Günlük Limit Doldu',
    message: 'Bugünkü AI kullanım hakkınız sona erdi. Yarın gece 00:00\'da yenilenir.',
    action: 'Ders notlarına ve örnek sorulara ulaşmak için içerik kütüphanemize göz atabilirsiniz.',
    emoji: '🌙',
  },
  [AI_ERROR_CODES.QUOTA_FEATURE_LIMIT]: {
    title: 'Özellik Limiti',
    message: 'Bu özellik için günlük kullanım hakkınız doldu.',
    action: 'Diğer AI özelliklerini kullanmaya devam edebilirsiniz.',
    emoji: '⚡',
  },
  [AI_ERROR_CODES.RATE_LIMITED]: {
    title: 'Biraz Yavaşlayalım',
    message: 'Çok hızlı gidiyorsunuz! Birkaç saniye bekleyip tekrar deneyin.',
    action: 'Birazdan tekrar deneyebilirsiniz.',
    emoji: '⏳',
  },
  
  // Network Messages - Teknik olmayan, çözüm odaklı
  [AI_ERROR_CODES.NETWORK_ERROR]: {
    title: 'Bağlantı Sorunu',
    message: 'İnternet bağlantınızda geçici bir kesinti olabilir.',
    action: 'Bağlantınızı kontrol edip tekrar deneyin.',
    emoji: '📡',
  },
  [AI_ERROR_CODES.TIMEOUT]: {
    title: 'Yanıt Gecikmesi',
    message: 'Sunucularımız şu an yoğun. Yanıt beklenenden uzun sürdü.',
    action: 'Lütfen tekrar deneyin, genellikle sorun kısa sürede çözülür.',
    emoji: '⏱️',
  },
  [AI_ERROR_CODES.CONNECTION_REFUSED]: {
    title: 'Sunucu Bağlantısı',
    message: 'Sunucularımıza şu an ulaşılamıyor.',
    action: 'Birkaç dakika sonra tekrar deneyin.',
    emoji: '🔌',
  },
  
  // Service Messages - AI'yi suçlamayan, nötr dil
  [AI_ERROR_CODES.AI_SERVICE_UNAVAILABLE]: {
    title: 'Servis Bakımda',
    message: 'AI servisimiz şu an bakımda veya güncelleniyor.',
    action: 'Kısa süre içinde tekrar hizmetinizde olacağız.',
    emoji: '🔧',
  },
  [AI_ERROR_CODES.AI_PROVIDER_ERROR]: {
    title: 'Geçici Teknik Sorun',
    message: 'Teknik bir sorunla karşılaştık.',
    action: 'Ekibimiz konuyla ilgileniyor. Lütfen kısa süre sonra tekrar deneyin.',
    emoji: '⚙️',
  },
  [AI_ERROR_CODES.AI_MODEL_OVERLOADED]: {
    title: 'Yoğunluk Yaşanıyor',
    message: 'Şu an çok sayıda kullanıcımıza hizmet veriyoruz.',
    action: 'Birkaç saniye sonra tekrar deneyin.',
    emoji: '🚀',
  },
  [AI_ERROR_CODES.AI_RESPONSE_INVALID]: {
    title: 'Yanıt Hazırlanamadı',
    message: 'Yanıtınızı hazırlarken beklenmedik bir durum oluştu.',
    action: 'Lütfen tekrar deneyin.',
    emoji: '🔄',
  },
  [AI_ERROR_CODES.AI_CONTENT_FILTERED]: {
    title: 'İçerik Uyarısı',
    message: 'Bu içerik için yardımcı olamıyoruz.',
    action: 'Farklı bir soru veya konu ile devam edebilirsiniz.',
    emoji: '⚠️',
  },
  
  // Request Messages
  [AI_ERROR_CODES.INVALID_REQUEST]: {
    title: 'İstek Anlaşılamadı',
    message: 'Gönderdiğiniz istek işlenemedi.',
    action: 'Sorunuzu farklı şekilde sormayı deneyin.',
    emoji: '❓',
  },
  [AI_ERROR_CODES.CONTEXT_TOO_LARGE]: {
    title: 'Çok Fazla İçerik',
    message: 'Gönderilen içerik işlenebilecek sınırı aştı.',
    action: 'Daha kısa bir metin veya daha az içerik ile deneyin.',
    emoji: '📏',
  },
  [AI_ERROR_CODES.UNAUTHORIZED]: {
    title: 'Oturum Süresi Doldu',
    message: 'Güvenlik nedeniyle oturumunuz sonlandı.',
    action: 'Lütfen tekrar giriş yapın.',
    emoji: '🔐',
  },
  [AI_ERROR_CODES.FORBIDDEN]: {
    title: 'Erişim Kısıtlı',
    message: 'Bu özelliğe erişim izniniz bulunmuyor.',
    action: 'Farklı bir hesap ile giriş yapabilir veya yöneticinize başvurabilirsiniz.',
    emoji: '🚫',
  },
  
  // Response Issues - Pozitif dil
  [AI_ERROR_CODES.EMPTY_RESPONSE]: {
    title: 'Yanıt Bulunamadı',
    message: 'Bu soru için şu an bir yanıt oluşturulamadı.',
    action: 'Sorunuzu biraz daha detaylandırarak tekrar deneyin.',
    emoji: '💭',
  },
  [AI_ERROR_CODES.PARTIAL_RESPONSE]: {
    title: 'Kısmi Yanıt',
    message: 'Yanıt tam olarak tamamlanamadı.',
    action: 'Görüntülenen kısmı kullanabilir veya tekrar deneyebilirsiniz.',
    emoji: '📝',
  },
  [AI_ERROR_CODES.PARSING_ERROR]: {
    title: 'Yanıt İşlenemedi',
    message: 'Yanıt işlenirken bir sorun oluştu.',
    action: 'Lütfen tekrar deneyin.',
    emoji: '🔄',
  },
  
  // Unknown - Genel, destekleyici mesaj
  [AI_ERROR_CODES.UNKNOWN]: {
    title: 'Beklenmedik Durum',
    message: 'Beklenmedik bir durumla karşılaştık.',
    action: 'Lütfen tekrar deneyin. Sorun devam ederse destek ekibimize ulaşın.',
    emoji: '🤔',
  },
};

// =============================================================================
// MESSAGE FACTORY
// =============================================================================

/**
 * Create a complete AIError with user-friendly messages
 */
export function createAIError(
  code: AIErrorCode,
  technicalMessage: string,
  options?: {
    originalError?: unknown;
    requestId?: string;
    context?: Record<string, unknown>;
  }
): AIError {
  const classification = getErrorClassification(code);
  const messageTemplate = ERROR_MESSAGES[code] || ERROR_MESSAGES[AI_ERROR_CODES.UNKNOWN];
  
  return {
    code,
    category: classification.category,
    severity: classification.severity,
    technicalMessage,
    userMessage: messageTemplate.message,
    userTitle: messageTemplate.title,
    suggestedAction: messageTemplate.action,
    retryable: classification.retryable,
    retryAfter: classification.retryAfter,
    originalError: options?.originalError,
    requestId: options?.requestId,
    timestamp: Date.now(),
    context: options?.context,
  };
}

/**
 * Map HTTP status code to AIErrorCode
 */
export function httpStatusToErrorCode(status: number): AIErrorCode {
  switch (status) {
    case 401:
      return AI_ERROR_CODES.UNAUTHORIZED;
    case 403:
      return AI_ERROR_CODES.FORBIDDEN;
    case 429:
      return AI_ERROR_CODES.RATE_LIMITED;
    case 500:
    case 502:
    case 503:
      return AI_ERROR_CODES.AI_SERVICE_UNAVAILABLE;
    case 504:
      return AI_ERROR_CODES.TIMEOUT;
    default:
      if (status >= 400 && status < 500) {
        return AI_ERROR_CODES.INVALID_REQUEST;
      }
      return AI_ERROR_CODES.UNKNOWN;
  }
}

/**
 * Parse error from various sources
 */
export function parseError(error: unknown): AIError {
  // Already an AIError
  if (isAIError(error)) {
    return error;
  }
  
  // Axios-like error
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as Record<string, unknown> | undefined;
    
    // Check for quota error in response
    const dataCode = data?.code as string | undefined;
    const dataError = data?.error as string | undefined;
    const dataMessage = data?.message as string | undefined;
    
    if (dataCode === 'QUOTA_EXCEEDED' || dataError?.includes('quota')) {
      return createAIError(AI_ERROR_CODES.QUOTA_EXCEEDED, dataMessage || 'Quota exceeded');
    }
    
    // Check for rate limit
    if (status === 429) {
      const retryAfter = parseInt(error.response?.headers?.['retry-after'] || '5', 10) * 1000;
      const aiError = createAIError(AI_ERROR_CODES.RATE_LIMITED, 'Rate limited');
      aiError.retryAfter = retryAfter;
      return aiError;
    }
    
    // Network error (no response)
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return createAIError(AI_ERROR_CODES.TIMEOUT, error.message || 'Request timeout');
      }
      return createAIError(AI_ERROR_CODES.NETWORK_ERROR, error.message || 'Network error');
    }
    
    // HTTP status based
    const code = httpStatusToErrorCode(status || 500);
    return createAIError(code, dataMessage || error.message || 'Request failed');
  }
  
  // Standard Error
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('network') || error.message.includes('Network')) {
      return createAIError(AI_ERROR_CODES.NETWORK_ERROR, error.message);
    }
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return createAIError(AI_ERROR_CODES.TIMEOUT, error.message);
    }
    
    return createAIError(AI_ERROR_CODES.UNKNOWN, error.message, { originalError: error });
  }
  
  // String error
  if (typeof error === 'string') {
    return createAIError(AI_ERROR_CODES.UNKNOWN, error);
  }
  
  // Unknown
  return createAIError(AI_ERROR_CODES.UNKNOWN, 'Unknown error occurred');
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: Record<string, unknown>;
    headers?: Record<string, string>;
  };
  code?: string;
  message?: string;
}

function isAxiosError(error: unknown): error is AxiosLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('response' in error || 'code' in error)
  );
}

function isAIError(error: unknown): error is AIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'category' in error &&
    'userMessage' in error
  );
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Get emoji for error code
 */
export function getErrorEmoji(code: AIErrorCode): string {
  return ERROR_MESSAGES[code]?.emoji || '⚠️';
}

/**
 * Get friendly error title
 */
export function getErrorTitle(error: AIError | AIErrorCode): string {
  const code = typeof error === 'string' ? error : error.code;
  return ERROR_MESSAGES[code]?.title || 'Bir sorun oluştu';
}

/**
 * Get friendly error message
 */
export function getErrorMessage(error: AIError | AIErrorCode): string {
  const code = typeof error === 'string' ? error : error.code;
  return ERROR_MESSAGES[code]?.message || 'Beklenmedik bir durum oluştu.';
}

/**
 * Get suggested action
 */
export function getSuggestedAction(error: AIError | AIErrorCode): string | undefined {
  const code = typeof error === 'string' ? error : error.code;
  return ERROR_MESSAGES[code]?.action;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: AIError): string {
  return JSON.stringify({
    code: error.code,
    category: error.category,
    technicalMessage: error.technicalMessage,
    requestId: error.requestId,
    timestamp: new Date(error.timestamp).toISOString(),
  });
}
