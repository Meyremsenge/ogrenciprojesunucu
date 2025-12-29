/**
 * AI Quota Indicator Component
 * 
 * AI kullanım kotası ve limit göstergesi.
 * 
 * UX PRENSİPLERİ:
 * ===============
 * 1. Görünürlük - Kalan kullanım her zaman görünür
 * 2. Önceden uyarı - Limite yaklaşınca bilgilendirme
 * 3. Şeffaf sınırlar - Neden limit var açıklanır
 * 4. Alternatifler - Limit dolunca ne yapılacağı net
 */

import React, { useState } from 'react';
import type { AIQuotaStatus, AIQuotaWarning, AIQuotaAction } from '@/types/ai';

// =============================================================================
// QUOTA INDICATOR
// =============================================================================

interface AIQuotaIndicatorProps {
  quota: AIQuotaStatus;
  compact?: boolean;
  showDetails?: boolean;
  onUpgrade?: () => void;
}

export const AIQuotaIndicator: React.FC<AIQuotaIndicatorProps> = ({
  quota,
  compact = false,
  showDetails = false,
  onUpgrade,
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Safe defaults for quota values
  const used = quota.used ?? quota.dailyUsed ?? 0;
  const limit = quota.limit ?? quota.dailyLimit ?? 100;
  const isUnlimited = quota.isUnlimited ?? false;
  
  if (isUnlimited) {
    return compact ? null : (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
        <span>✨</span>
        <span>Sınırsız</span>
      </div>
    );
  }

  const percentage = (used / limit) * 100;
  const remaining = limit - used;
  const warning = getQuotaWarning(quota);

  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          flex items-center gap-1 px-2 py-1 rounded-full text-xs
          ${warning ? warning.bgColor : 'bg-gray-100 dark:bg-gray-800'}
          transition-colors
        `}
        title={`${remaining} kullanım hakkı kaldı`}
      >
        <span>{getQuotaIcon(percentage)}</span>
        <span className={warning?.textColor || 'text-gray-600 dark:text-gray-300'}>
          {remaining}/{quota.limit}
        </span>
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <span>🎯</span>
          <span>AI Kullanım Hakkı</span>
        </h4>
        {warning && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${warning.bgColor} ${warning.textColor}`}>
            {warning.label}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm mb-3">
        <span className="text-gray-500 dark:text-gray-400">
          {quota.used} kullanıldı
        </span>
        <span className="font-medium text-gray-900 dark:text-white">
          {remaining} kaldı
        </span>
      </div>

      {/* Reset info */}
      {quota.resetAt && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          ⏰ Yenilenme: {formatResetTime(quota.resetAt)}
        </p>
      )}

      {/* Warning message */}
      {warning && (
        <div className={`p-3 rounded-lg ${warning.bgColor} mb-3`}>
          <p className={`text-sm ${warning.textColor}`}>
            {warning.message}
          </p>
        </div>
      )}

      {/* Actions */}
      {showDetails && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
          <QuotaActions quota={quota} onUpgrade={onUpgrade} />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// QUOTA PROGRESS BAR (Minimal version)
// =============================================================================

interface AIQuotaProgressProps {
  quota: AIQuotaStatus;
  label?: string;
}

export const AIQuotaProgress: React.FC<AIQuotaProgressProps> = ({
  quota,
  label = 'Günlük AI Kullanımı',
}) => {
  const used = quota.used ?? quota.dailyUsed ?? 0;
  const limit = quota.limit ?? quota.dailyLimit ?? 100;
  const isUnlimited = quota.isUnlimited ?? false;
  
  if (isUnlimited) return null;

  const percentage = (used / limit) * 100;
  const remaining = limit - used;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <span>{remaining} kaldı</span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

// =============================================================================
// QUOTA WARNING BANNER
// =============================================================================

interface AIQuotaWarningBannerProps {
  quota: AIQuotaStatus;
  onDismiss?: () => void;
  onUpgrade?: () => void;
}

export const AIQuotaWarningBanner: React.FC<AIQuotaWarningBannerProps> = ({
  quota,
  onDismiss,
  onUpgrade,
}) => {
  const warning = getQuotaWarning(quota);
  const used = quota.used ?? quota.dailyUsed ?? 0;
  const limit = quota.limit ?? quota.dailyLimit ?? 100;
  const percentage = (used / limit) * 100;
  
  if (!warning) return null;

  return (
    <div className={`${warning.bgColor} border-b ${warning.borderColor} px-4 py-3`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getQuotaIcon(percentage)}</span>
          <p className={`text-sm ${warning.textColor}`}>{warning.message}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {warning.action && onUpgrade && (
            <button
              onClick={onUpgrade}
              className={`text-sm font-medium ${warning.textColor} underline`}
            >
              {warning.action}
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`p-1 ${warning.textColor} opacity-50 hover:opacity-100`}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// QUOTA ACTIONS
// =============================================================================

interface QuotaActionsProps {
  quota: AIQuotaStatus;
  onUpgrade?: () => void;
}

const QuotaActions: React.FC<QuotaActionsProps> = ({ quota, onUpgrade }) => {
  const actions = getQuotaActions(quota);
  
  if (actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
        Ne yapabilirsin?
      </p>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.type === 'upgrade' && onUpgrade ? onUpgrade : undefined}
          disabled={action.type === 'wait'}
          className={`
            w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm
            ${action.type === 'wait' 
              ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-default' 
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }
          `}
        >
          <span>{action.icon}</span>
          <div>
            <p className="font-medium">{action.label}</p>
            <p className="text-xs opacity-75">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

// =============================================================================
// QUOTA EXCEEDED MODAL
// =============================================================================

interface AIQuotaExceededModalProps {
  quota: AIQuotaStatus;
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export const AIQuotaExceededModal: React.FC<AIQuotaExceededModalProps> = ({
  quota,
  isOpen,
  onClose,
  onUpgrade,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 p-6 text-center">
          <div className="text-5xl mb-3">😔</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Günlük Limit Doldu
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Bugünlük AI kullanım hakkın bitti
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Ama endişelenme! İşte yapabileceklerin:
          </p>

          <div className="space-y-3">
            {/* Wait option */}
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-2xl">⏰</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Yarın tekrar dene
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {quota.resetAt 
                    ? `Hakkın ${formatResetTime(quota.resetAt)} yenilenecek`
                    : 'Her gün sıfırlanır'
                  }
                </p>
              </div>
            </div>

            {/* Teacher option */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-2xl">👨‍🏫</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Öğretmeninden yardım iste
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Öğretmenin her zaman sana yardımcı olabilir
                </p>
              </div>
            </div>

            {/* Self study option */}
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-2xl">📚</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Kendi başına çalış
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Notlarını ve kitabını kullanarak devam edebilirsin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-2">
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              Daha Fazla Al
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-lg"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getQuotaWarning(quota: AIQuotaStatus): AIQuotaWarning | null {
  const isUnlimited = quota.isUnlimited ?? false;
  if (isUnlimited) return null;
  
  const used = quota.used ?? quota.dailyUsed ?? 0;
  const limit = quota.limit ?? quota.dailyLimit ?? 100;
  const percentage = (used / limit) * 100;
  const remaining = limit - used;

  if (remaining === 0) {
    return {
      level: 'critical',
      message: 'Günlük AI kullanım hakkın bitti. Yarın tekrar dene veya öğretmeninden yardım iste.',
      action: 'Daha Fazla Al',
      label: 'Limit Doldu',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-300',
      borderColor: 'border-red-200 dark:border-red-800',
    };
  }

  if (remaining <= 3) {
    return {
      level: 'warning',
      message: `Sadece ${remaining} kullanım hakkın kaldı. Dikkatli kullan!`,
      action: undefined,
      label: 'Az Kaldı',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      textColor: 'text-amber-700 dark:text-amber-300',
      borderColor: 'border-amber-200 dark:border-amber-800',
    };
  }

  if (percentage >= 70) {
    return {
      level: 'info',
      message: `Günün %${Math.round(percentage)}'ini kullandın. Geri kalanı önemli sorular için sakla.`,
      action: undefined,
      label: 'Dikkat',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-800',
    };
  }

  return null;
}

function getQuotaActions(quota: AIQuotaStatus): AIQuotaAction[] {
  const used = quota.used ?? quota.dailyUsed ?? 0;
  const limit = quota.limit ?? quota.dailyLimit ?? 100;
  const remaining = limit - used;
  const actions: AIQuotaAction[] = [];

  if (remaining === 0) {
    actions.push({
      type: 'wait',
      label: 'Yenilenmeyi bekle',
      description: quota.resetAt ? formatResetTime(quota.resetAt) : 'Yarın yenilenir',
      icon: '⏰',
    });
    
    actions.push({
      type: 'alternative',
      label: 'Öğretmenine sor',
      description: 'AI yerine öğretmenin yardımcı olabilir',
      icon: '👨‍🏫',
    });
  }

  return actions;
}

function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-red-500';
  if (percentage >= 80) return 'bg-amber-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getQuotaIcon(percentage: number): string {
  if (percentage >= 100) return '🔴';
  if (percentage >= 80) return '🟠';
  if (percentage >= 50) return '🟡';
  return '🟢';
}

function formatResetTime(resetAt: Date): string {
  const reset = new Date(resetAt);
  const now = new Date();
  const diffHours = Math.ceil((reset.getTime() - now.getTime()) / (1000 * 60 * 60));
  
  if (diffHours <= 0) return 'şimdi';
  if (diffHours === 1) return '1 saat içinde';
  if (diffHours < 24) return `${diffHours} saat içinde`;
  
  return reset.toLocaleDateString('tr-TR', { 
    weekday: 'long', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export default AIQuotaIndicator;
