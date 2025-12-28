/**
 * AI Disclaimer Component
 * 
 * AI sınırlarını ve beklenti yönetimini sağlayan uyarı bileşeni.
 * 
 * UX PRENSİPLERİ:
 * ===============
 * 1. Şeffaflık - AI'ın ne yapabileceği ve yapamayacağı net
 * 2. Güven inşası - Kullanıcı neyle karşılaşacağını bilir
 * 3. Uygun beklenti - AI'dan mucize beklenmez
 * 4. Sorumluluk - Son karar her zaman kullanıcıda
 */

import React, { useState } from 'react';
import type { AIFeatureType, AILimitation, AIDisclaimer as AIDisclaimerType } from '@/types/ai';

// =============================================================================
// DISCLAIMER COMPONENT
// =============================================================================

interface AIDisclaimerProps {
  feature: AIFeatureType;
  onDismiss?: () => void;
  onAccept?: () => void;
  compact?: boolean;
  persistent?: boolean; // Her zaman göster
}

export const AIDisclaimer: React.FC<AIDisclaimerProps> = ({
  feature,
  onDismiss,
  onAccept,
  compact = false,
  persistent = false,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const disclaimer = getFeatureDisclaimer(feature);
  
  if (dismissed && !persistent) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (compact) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{disclaimer.shortMessage}</span>
          </p>
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 m-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
            {disclaimer.title}
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            {disclaimer.message}
          </p>
          
          {/* Limitations */}
          <ul className="space-y-1 mb-4">
            {disclaimer.limitations.map((limitation, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <span className="text-amber-500">{getLimitationIcon(limitation)}</span>
                <span>{limitation.description}</span>
              </li>
            ))}
          </ul>
          
          {/* Actions */}
          <div className="flex gap-2">
            {onAccept && (
              <button
                onClick={() => { onAccept(); handleDismiss(); }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg"
              >
                Anladım, Devam Et
              </button>
            )}
            {onDismiss && !onAccept && (
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-amber-600 hover:text-amber-800 text-sm font-medium"
              >
                Kapat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// INLINE LIMITATION BADGE
// =============================================================================

interface AILimitationBadgeProps {
  limitation: AILimitation;
  size?: 'sm' | 'md';
}

export const AILimitationBadge: React.FC<AILimitationBadgeProps> = ({
  limitation,
  size = 'md',
}) => {
  const severityColors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    caution: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <span className={`
      inline-flex items-center gap-1
      ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
      rounded-full
      ${severityColors[limitation.severity] || severityColors.info}
    `}>
      <span>{getLimitationIcon(limitation)}</span>
      <span>{limitation.description || limitation.message}</span>
    </span>
  );
};

// =============================================================================
// CONFIDENCE INDICATOR
// =============================================================================

interface AIConfidenceIndicatorProps {
  confidence: number; // 0-1
  showLabel?: boolean;
}

export const AIConfidenceIndicator: React.FC<AIConfidenceIndicatorProps> = ({
  confidence,
  showLabel = true,
}) => {
  const getConfidenceLevel = () => {
    if (confidence >= 0.8) return { label: 'Yüksek', color: 'text-green-600', bg: 'bg-green-500' };
    if (confidence >= 0.6) return { label: 'Orta', color: 'text-amber-600', bg: 'bg-amber-500' };
    return { label: 'Düşük', color: 'text-red-600', bg: 'bg-red-500' };
  };

  const level = getConfidenceLevel();

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${level.bg} rounded-full transition-all duration-500`}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${level.color}`}>
          {level.label} güven
        </span>
      )}
    </div>
  );
};

// =============================================================================
// WARNING CARD
// =============================================================================

interface AIWarningCardProps {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const AIWarningCard: React.FC<AIWarningCardProps> = ({
  title,
  message,
  type = 'warning',
  action,
}) => {
  const styles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'ℹ️',
      iconBg: 'bg-blue-100 dark:bg-blue-800',
      title: 'text-blue-800 dark:text-blue-200',
      text: 'text-blue-700 dark:text-blue-300',
      btn: 'text-blue-600 hover:text-blue-800',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: '⚠️',
      iconBg: 'bg-amber-100 dark:bg-amber-800',
      title: 'text-amber-800 dark:text-amber-200',
      text: 'text-amber-700 dark:text-amber-300',
      btn: 'text-amber-600 hover:text-amber-800',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: '❌',
      iconBg: 'bg-red-100 dark:bg-red-800',
      title: 'text-red-800 dark:text-red-200',
      text: 'text-red-700 dark:text-red-300',
      btn: 'text-red-600 hover:text-red-800',
    },
  };

  const s = styles[type];

  return (
    <div className={`${s.bg} ${s.border} border rounded-lg p-4`}>
      <div className="flex gap-3">
        <div className={`${s.iconBg} w-10 h-10 rounded-full flex items-center justify-center text-lg`}>
          {s.icon}
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold ${s.title} mb-1`}>{title}</h4>
          <p className={`text-sm ${s.text}`}>{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-2 text-sm font-medium ${s.btn}`}
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getFeatureDisclaimer(feature: AIFeatureType): AIDisclaimerType {
  const disclaimers: Record<AIFeatureType, AIDisclaimerType> = {
    question_hint: {
      id: 'hint-disclaimer',
      feature: 'question_hint',
      title: 'AI Koç Yardımı Hakkında',
      message: 'Ben sana direkt cevap vermek yerine, doğru cevabı kendin bulman için yol göstereceğim. Bazen yanılabilirim, bu yüzden öğretmeninin görüşü her zaman daha değerlidir.',
      shortMessage: 'Direkt cevap vermem, yol gösteririm. Yanılabilirim.',
      limitations: [
        { type: 'may_be_incorrect', severity: 'warning', description: 'Yanıtlarım her zaman doğru olmayabilir' },
        { type: 'not_a_replacement', severity: 'info', description: 'Öğretmenin yerini tutmam' },
        { type: 'limited_context', severity: 'info', description: 'Sadece gördüğüm bilgilerle yorum yapabilirim' },
      ],
      acceptRequired: false,
      showOnce: true,
    },
    topic_explanation: {
      id: 'topic-disclaimer',
      feature: 'topic_explanation',
      title: 'Konu Anlatımı Hakkında',
      message: 'Konuları anlamanı kolaylaştırmak için basitleştirmeler yapabilirim. Akademik doğruluk için ders kitabını ve öğretmenini referans al.',
      shortMessage: 'Basitleştirmeler yapabilirim, kitabını kontrol et.',
      limitations: [
        { type: 'simplified', severity: 'info', description: 'Açıklamalar basitleştirilmiş olabilir' },
        { type: 'may_be_incorrect', severity: 'warning', description: 'Bazı detaylar eksik veya hatalı olabilir' },
      ],
      acceptRequired: false,
      showOnce: true,
    },
    study_plan: {
      id: 'plan-disclaimer',
      feature: 'study_plan',
      title: 'Çalışma Planı Hakkında',
      message: 'Çalışma planın sana özel hazırlanır ama mükemmel olmayabilir. Planı ihtiyaçlarına göre uyarlaman ve öğretmeninle paylaşman önerilir.',
      shortMessage: 'Plan tavsiyedir, ihtiyaçlarına göre uyarla.',
      limitations: [
        { type: 'personalization_limited', severity: 'info', description: 'Kişiselleştirme sınırlı olabilir' },
        { type: 'not_a_replacement', severity: 'info', description: 'Öğretmenin onayını al' },
      ],
      acceptRequired: false,
      showOnce: true,
    },
    answer_evaluation: {
      id: 'eval-disclaimer',
      feature: 'answer_evaluation',
      title: 'Değerlendirme Hakkında',
      message: 'Cevabını değerlendirirken bazı nüansları kaçırabilirim. Resmi not için öğretmeninin değerlendirmesi geçerlidir.',
      shortMessage: 'Bu bir ön değerlendirme, resmi not değil.',
      limitations: [
        { type: 'may_be_incorrect', severity: 'warning', description: 'Değerlendirmem hatalı olabilir' },
        { type: 'not_official', severity: 'critical', description: 'Resmi not yerine geçmez' },
      ],
      acceptRequired: true,
      showOnce: false,
    },
    performance_analysis: {
      id: 'analysis-disclaimer',
      feature: 'performance_analysis',
      title: 'Performans Analizi Hakkında',
      message: 'Analiz geçmiş verilerine dayanır ve gelecek performansını garanti etmez.',
      shortMessage: 'Analiz tahminidir, garanti değil.',
      limitations: [
        { type: 'data_dependent', severity: 'info', description: 'Sadece mevcut verilere dayanır' },
        { type: 'not_predictive', severity: 'info', description: 'Gelecek performansı garanti etmez' },
      ],
      acceptRequired: false,
      showOnce: true,
    },
    question_generation: {
      id: 'qgen-disclaimer',
      feature: 'question_generation',
      title: 'Soru Üretimi Hakkında',
      message: 'Üretilen sorular incelenip düzenlenmelidir. AI hataları içerebilir.',
      shortMessage: 'Soruları kullanmadan önce kontrol edin.',
      limitations: [
        { type: 'may_be_incorrect', severity: 'warning', description: 'Sorular hatalı olabilir' },
        { type: 'needs_review', severity: 'critical', description: 'Kullanmadan önce kontrol gerekli' },
      ],
      acceptRequired: true,
      showOnce: false,
    },
    content_enhancement: {
      id: 'enhance-disclaimer',
      feature: 'content_enhancement',
      title: 'İçerik Zenginleştirme Hakkında',
      message: 'Önerilen iyileştirmeler kontrol edilmelidir.',
      shortMessage: 'Önerileri kontrol edin.',
      limitations: [
        { type: 'needs_review', severity: 'warning', description: 'Öneriler kontrol edilmeli' },
      ],
      acceptRequired: false,
      showOnce: true,
    },
    motivation_message: {
      id: 'motivation-disclaimer',
      feature: 'motivation_message',
      title: 'Motivasyon Mesajları Hakkında',
      message: 'Ben bir koçum, profesyonel destek yerine geçmem. Zor zamanlarında yetişkinlerden yardım al.',
      shortMessage: 'Profesyonel destek yerine geçmem.',
      limitations: [
        { type: 'not_professional', severity: 'warning', description: 'Profesyonel destek değil' },
        { type: 'seek_help', severity: 'info', description: 'Zorlandığında yetişkinlerden yardım al' },
      ],
      acceptRequired: false,
      showOnce: true,
    },
  };

  return disclaimers[feature];
}

function getLimitationIcon(limitation: AILimitation): string {
  const icons: Record<string, string> = {
    may_be_incorrect: '⚠️',
    not_a_replacement: '👨‍🏫',
    limited_context: '📋',
    simplified: '📖',
    personalization_limited: '🎯',
    not_official: '📝',
    data_dependent: '📊',
    not_predictive: '🔮',
    needs_review: '👁️',
    not_professional: '💙',
    seek_help: '🤝',
  };
  return icons[limitation.type] || '•';
}

export default AIDisclaimer;
