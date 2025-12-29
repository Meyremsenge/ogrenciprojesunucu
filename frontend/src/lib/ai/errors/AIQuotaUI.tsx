/**
 * AI Quota UI Components
 * 
 * Kota durumu ve limit aşımı göstergeleri.
 * 
 * UX PRENSİPLERİ:
 * ===============
 * 1. Kalan hakkı görsel olarak göster (progress bar)
 * 2. Düşük kota uyarısı (soft warning)
 * 3. Kota dolu durumu (friendly block)
 * 4. Yenileme zamanı bilgisi
 * 5. Alternatif öneriler sunma
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  Sparkles,
  BookOpen,
  ArrowRight,
  X,
  Info,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface QuotaInfo {
  /** Remaining quota */
  remaining: number;
  /** Total quota */
  total: number;
  /** Usage percentage (0-100) */
  percentage: number;
  /** Is quota exhausted */
  isExhausted: boolean;
  /** Is quota low (<20%) */
  isLow: boolean;
  /** Reset time (ISO string or Date) */
  resetTime?: string | Date;
  /** Feature-specific quotas */
  byFeature?: Record<string, { remaining: number; total: number }>;
}

export interface AIQuotaIndicatorProps {
  quota: QuotaInfo;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface AIQuotaWarningProps {
  quota: QuotaInfo;
  onDismiss?: () => void;
  showAlternatives?: boolean;
  className?: string;
}

export interface AIQuotaExhaustedProps {
  quota: QuotaInfo;
  onClose?: () => void;
  alternatives?: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: () => void;
    actionLabel?: string;
  }>;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatResetTime(resetTime?: string | Date): string {
  if (!resetTime) return 'yarın';
  
  const reset = new Date(resetTime);
  const now = new Date();
  const diffMs = reset.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 24) {
    return reset.toLocaleDateString('tr-TR', { weekday: 'long' });
  }
  if (diffHours > 0) {
    return `${diffHours} saat ${diffMinutes} dakika sonra`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} dakika sonra`;
  }
  return 'çok yakında';
}

function getQuotaColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 50) return 'bg-blue-500';
  if (percentage >= 20) return 'bg-amber-500';
  return 'bg-red-500';
}

function getQuotaTextColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600 dark:text-green-400';
  if (percentage >= 50) return 'text-blue-600 dark:text-blue-400';
  if (percentage >= 20) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// =============================================================================
// QUOTA INDICATOR (Compact)
// =============================================================================

export const AIQuotaIndicator = memo(function AIQuotaIndicator({
  quota,
  showLabel = true,
  size = 'md',
  className = '',
}: AIQuotaIndicatorProps) {
  const sizeConfig = {
    sm: { height: 'h-1', text: 'text-xs', icon: 'w-3 h-3' },
    md: { height: 'h-1.5', text: 'text-sm', icon: 'w-4 h-4' },
    lg: { height: 'h-2', text: 'text-base', icon: 'w-5 h-5' },
  };
  
  const config = sizeConfig[size];
  const barColor = getQuotaColor(quota.percentage);
  const textColor = getQuotaTextColor(quota.percentage);
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Zap className={`${config.icon} ${textColor}`} />
      
      <div className="flex-1 min-w-[60px]">
        <div className={`w-full ${config.height} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${quota.percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full ${barColor} rounded-full`}
          />
        </div>
      </div>
      
      {showLabel && (
        <span className={`${config.text} font-medium ${textColor} whitespace-nowrap`}>
          {quota.remaining}/{quota.total}
        </span>
      )}
    </div>
  );
});

// =============================================================================
// QUOTA WARNING BANNER (Low Quota)
// =============================================================================

export const AIQuotaWarning = memo(function AIQuotaWarning({
  quota,
  onDismiss,
  showAlternatives = true,
  className = '',
}: AIQuotaWarningProps) {
  const resetTimeText = formatResetTime(quota.resetTime);
  
  if (!quota.isLow || quota.isExhausted) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        relative px-4 py-3 rounded-lg border
        bg-amber-50 dark:bg-amber-900/20
        border-amber-200 dark:border-amber-800
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-amber-800 dark:text-amber-200">
              AI Kullanımınız Azalıyor
            </span>
            <span className="text-sm text-amber-600 dark:text-amber-400">
              ({quota.remaining} hak kaldı)
            </span>
          </div>
          
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Günlük AI kullanım hakkınız azalmış durumda. 
            Yeni haklarınız {resetTimeText} tanımlanacak.
          </p>
          
          {showAlternatives && quota.remaining <= 5 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Info className="w-4 h-4" />
              <span>İpucu: Geleneksel ders materyallerini de kullanabilirsiniz.</span>
            </div>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-amber-500 hover:text-amber-700 rounded-lg"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Mini Progress */}
      <div className="mt-3">
        <AIQuotaIndicator quota={quota} size="sm" />
      </div>
    </motion.div>
  );
});

// =============================================================================
// QUOTA EXHAUSTED (Full Screen / Modal Content)
// =============================================================================

const defaultAlternatives = [
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Ders Notları',
    description: 'Detaylı ders notlarımızı inceleyebilirsiniz.',
    actionLabel: 'Notlara Git',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Örnek Sorular',
    description: 'Çözümlü örnek sorularla pratik yapabilirsiniz.',
    actionLabel: 'Soruları Gör',
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Video Dersler',
    description: 'Konu anlatım videolarını izleyebilirsiniz.',
    actionLabel: 'Videoları İzle',
  },
];

export const AIQuotaExhausted = memo(function AIQuotaExhausted({
  quota,
  onClose,
  alternatives = defaultAlternatives,
  className = '',
}: AIQuotaExhaustedProps) {
  const resetTimeText = formatResetTime(quota.resetTime);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`
        flex flex-col items-center text-center p-6
        ${className}
      `}
    >
      {/* Visual */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mb-6"
      >
        <span className="text-4xl">⚡</span>
      </motion.div>
      
      {/* Title */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Günlük AI Hakkınız Tamamlandı
      </h2>
      
      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 max-w-md mb-2">
        Bugün için AI asistanı kullanım hakkınız doldu. 
        Endişelenmeyin, yeni haklarınız yakında tanımlanacak!
      </p>
      
      {/* Reset Time */}
      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-6">
        <Calendar className="w-4 h-4" />
        <span>Yenilenme: {resetTimeText}</span>
      </div>
      
      {/* Progress (Empty) */}
      <div className="w-full max-w-xs mb-8">
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="w-0 h-full bg-gray-400 rounded-full" />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {quota.remaining}/{quota.total} kullanım hakkı
        </p>
      </div>
      
      {/* Alternatives */}
      <div className="w-full max-w-lg">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
          Bu sürede yapabilecekleriniz:
        </h3>
        
        <div className="grid gap-3">
          {alternatives.map((alt, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
              onClick={alt.action}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-indigo-500">
                {alt.icon}
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {alt.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {alt.description}
                </p>
              </div>
              {alt.action && (
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="mt-8 px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium transition-colors"
        >
          Anladım
        </button>
      )}
    </motion.div>
  );
});

// =============================================================================
// QUOTA BADGE (For headers/toolbars)
// =============================================================================

export interface AIQuotaBadgeProps {
  quota: QuotaInfo;
  onClick?: () => void;
  className?: string;
}

export const AIQuotaBadge = memo(function AIQuotaBadge({
  quota,
  onClick,
  className = '',
}: AIQuotaBadgeProps) {
  const bgColor = quota.isExhausted 
    ? 'bg-red-100 dark:bg-red-900/30' 
    : quota.isLow 
      ? 'bg-amber-100 dark:bg-amber-900/30'
      : 'bg-green-100 dark:bg-green-900/30';
  
  const textColor = quota.isExhausted
    ? 'text-red-700 dark:text-red-300'
    : quota.isLow
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-green-700 dark:text-green-300';
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-full
        text-xs font-medium transition-colors
        ${bgColor} ${textColor}
        ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        ${className}
      `}
      title={`AI kullanım hakkı: ${quota.remaining}/${quota.total}`}
    >
      <Zap className="w-3 h-3" />
      <span>{quota.remaining}</span>
    </motion.button>
  );
});

// =============================================================================
// QUOTA TOOLTIP (Hover info)
// =============================================================================

export interface AIQuotaTooltipProps {
  quota: QuotaInfo;
  children: React.ReactNode;
  className?: string;
}

export const AIQuotaTooltip = memo(function AIQuotaTooltip({
  quota,
  children,
  className = '',
}: AIQuotaTooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const resetTimeText = formatResetTime(quota.resetTime);
  
  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
          >
            <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-lg p-3 min-w-[200px]">
              <div className="text-sm font-medium mb-2">AI Kullanım Durumu</div>
              
              <AIQuotaIndicator quota={quota} size="sm" />
              
              <div className="mt-2 text-xs text-gray-400">
                <Clock className="w-3 h-3 inline mr-1" />
                Yenilenme: {resetTimeText}
              </div>
              
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default AIQuotaIndicator;
