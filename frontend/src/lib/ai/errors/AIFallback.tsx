/**
 * AI Fallback UI Components
 * 
 * AI cevap üretemediğinde gösterilecek yedek içerik.
 * 
 * UX PRENSİPLERİ:
 * ===============
 * 1. Boş state yerine yararlı alternatifler sun
 * 2. Kullanıcıyı yönlendir, çıkmaza sokma
 * 3. Beklentiyi yönet, hayal kırıklığı yaratma
 * 4. Eğitici ve destekleyici içerik
 */

import React, { memo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  BookOpen, 
  Video, 
  MessageSquare, 
  RefreshCw,
  HelpCircle,
  Compass,
  Target,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type FallbackReason = 
  | 'empty_response'     // AI boş yanıt döndü
  | 'timeout'            // Zaman aşımı
  | 'error'              // Genel hata
  | 'quota_exceeded'     // Kota doldu
  | 'content_filtered'   // İçerik filtrelendi
  | 'unavailable';       // Servis kullanılamıyor

export interface FallbackAction {
  icon: ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  href?: string;
}

export interface AIFallbackProps {
  /** Why fallback is being shown */
  reason: FallbackReason;
  /** Feature that failed */
  feature?: 'hint' | 'explanation' | 'chat' | 'feedback' | 'general';
  /** Original query/context */
  query?: string;
  /** Retry handler */
  onRetry?: () => void;
  /** Custom actions */
  actions?: FallbackAction[];
  /** Show default actions */
  showDefaultActions?: boolean;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Compact mode */
  compact?: boolean;
  /** Custom class */
  className?: string;
}

// =============================================================================
// CONTENT MAPS
// =============================================================================

interface FallbackContent {
  emoji: string;
  title: string;
  description: string;
  tip?: string;
}

const reasonContent: Record<FallbackReason, FallbackContent> = {
  empty_response: {
    emoji: '💭',
    title: 'Yanıt Hazırlanamadı',
    description: 'Bu soru için şu an bir yanıt oluşturulamadı.',
    tip: 'Sorunuzu biraz daha detaylandırarak tekrar deneyebilirsiniz.',
  },
  timeout: {
    emoji: '⏱️',
    title: 'Yanıt Bekleniyor',
    description: 'Sunucularımız şu an yoğun, yanıt gecikti.',
    tip: 'Birkaç saniye sonra tekrar deneyin.',
  },
  error: {
    emoji: '⚙️',
    title: 'Geçici Bir Sorun Oluştu',
    description: 'Teknik bir aksaklık yaşandı.',
    tip: 'Lütfen birazdan tekrar deneyin.',
  },
  quota_exceeded: {
    emoji: '⚡',
    title: 'Günlük Limit Tamamlandı',
    description: 'Bugün için AI kullanım hakkınız doldu.',
    tip: 'Yarın yeni haklarınız tanımlanacak.',
  },
  content_filtered: {
    emoji: '⚠️',
    title: 'İçerik Uyarısı',
    description: 'Bu içerik için yardımcı olamıyoruz.',
    tip: 'Farklı bir soru ile devam edebilirsiniz.',
  },
  unavailable: {
    emoji: '🔧',
    title: 'Servis Bakımda',
    description: 'AI servisimiz şu an kullanılamıyor.',
    tip: 'Kısa süre içinde tekrar hizmetinizde olacağız.',
  },
};

const featureContent: Record<string, { icon: ReactNode; name: string }> = {
  hint: { icon: <Lightbulb className="w-5 h-5" />, name: 'İpucu' },
  explanation: { icon: <BookOpen className="w-5 h-5" />, name: 'Açıklama' },
  chat: { icon: <MessageSquare className="w-5 h-5" />, name: 'Sohbet' },
  feedback: { icon: <Target className="w-5 h-5" />, name: 'Geri Bildirim' },
  general: { icon: <Sparkles className="w-5 h-5" />, name: 'AI Asistan' },
};

// =============================================================================
// DEFAULT ACTIONS
// =============================================================================

const defaultActions: FallbackAction[] = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    label: 'Ders Notları',
    description: 'İlgili konu notlarına göz atın',
  },
  {
    icon: <Video className="w-5 h-5" />,
    label: 'Video Ders',
    description: 'Konu anlatım videosunu izleyin',
  },
  {
    icon: <HelpCircle className="w-5 h-5" />,
    label: 'SSS',
    description: 'Sık sorulan soruları inceleyin',
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AIFallback = memo(function AIFallback({
  reason,
  feature = 'general',
  query,
  onRetry,
  actions,
  showDefaultActions = true,
  title,
  description,
  compact = false,
  className = '',
}: AIFallbackProps) {
  const content = reasonContent[reason];
  const featureInfo = featureContent[feature];
  const displayActions = actions || (showDefaultActions ? defaultActions : []);
  
  // Compact Mode
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          flex items-center gap-3 p-4 rounded-lg
          bg-gray-50 dark:bg-gray-800/50
          border border-gray-200 dark:border-gray-700
          ${className}
        `}
      >
        <span className="text-2xl">{content.emoji}</span>
        <div className="flex-1">
          <p className="font-medium text-gray-900 dark:text-white">
            {title || content.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description || content.tip || content.description}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tekrar
          </button>
        )}
      </motion.div>
    );
  }
  
  // Full Mode
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex flex-col items-center text-center p-8
        bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50
        rounded-xl border border-gray-200 dark:border-gray-700
        ${className}
      `}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-3xl mb-4"
      >
        {content.emoji}
      </motion.div>
      
      {/* Feature Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 mb-3">
        {featureInfo.icon}
        <span>{featureInfo.name}</span>
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title || content.title}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 max-w-md mb-2">
        {description || content.description}
      </p>
      
      {/* Tip */}
      {content.tip && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-6">
          💡 {content.tip}
        </p>
      )}
      
      {/* Retry Button */}
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors mb-6"
        >
          <RefreshCw className="w-4 h-4" />
          Tekrar Dene
        </motion.button>
      )}
      
      {/* Divider */}
      {displayActions.length > 0 && (
        <div className="w-full flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">veya</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
      )}
      
      {/* Alternative Actions */}
      {displayActions.length > 0 && (
        <div className="w-full max-w-sm grid gap-2">
          {displayActions.map((action, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={action.onClick}
              className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-left"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-indigo-500 transition-colors">
                {action.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {action.label}
                </div>
                {action.description && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </div>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
});

// =============================================================================
// SKELETON FALLBACK (Loading state)
// =============================================================================

export interface AISkeletonFallbackProps {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}

export const AISkeletonFallback = memo(function AISkeletonFallback({
  lines = 3,
  showAvatar = true,
  className = '',
}: AISkeletonFallbackProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="flex items-start gap-3">
        {showAvatar && (
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
        )}
        <div className="flex-1 space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
              style={{ width: `${Math.random() * 30 + 70}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// THINKING INDICATOR (AI is processing)
// =============================================================================

export interface AIThinkingIndicatorProps {
  message?: string;
  showDots?: boolean;
  className?: string;
}

export const AIThinkingIndicator = memo(function AIThinkingIndicator({
  message = 'Düşünüyorum...',
  showDots = true,
  className = '',
}: AIThinkingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-3 p-4 ${className}`}
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white animate-pulse" />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-600 dark:text-gray-300">{message}</span>
        {showDots && (
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1 }}
                transition={{
                  repeat: Infinity,
                  repeatType: 'reverse',
                  duration: 0.6,
                  delay: i * 0.2,
                }}
                className="w-1.5 h-1.5 rounded-full bg-indigo-500"
              />
            ))}
          </span>
        )}
      </div>
    </motion.div>
  );
});

// =============================================================================
// EMPTY HINT FALLBACK (Specific for hints)
// =============================================================================

export interface AIHintFallbackProps {
  level: 1 | 2 | 3;
  onRetry?: () => void;
  onSkip?: () => void;
  className?: string;
}

export const AIHintFallback = memo(function AIHintFallback({
  level,
  onRetry,
  onSkip,
  className = '',
}: AIHintFallbackProps) {
  const levelTips = {
    1: 'Soruyu dikkatlice okuyun, anahtar kavramları belirleyin.',
    2: 'Benzer sorular çözdüğünüz konuları hatırlayın.',
    3: 'Formülleri ve temel prensipleri gözden geçirin.',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-4 rounded-xl
        bg-amber-50 dark:bg-amber-900/20
        border border-amber-200 dark:border-amber-800
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
            Seviye {level} İpucu
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {levelTips[level]}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-1 py-2 rounded-lg bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-200 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
          >
            AI İpucu Al
          </button>
        )}
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-lg text-amber-600 dark:text-amber-400 text-sm hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
          >
            Atla
          </button>
        )}
      </div>
    </motion.div>
  );
});

export default AIFallback;
