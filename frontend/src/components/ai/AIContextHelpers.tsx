/**
 * AI Context Helpers
 * 
 * Context-aware (bağlam duyarlı) AI yardımcı bileşenleri.
 * Sayfa içinde, soru yanında, içerik üzerinde inline yardım.
 * 
 * UX PRENSİPLERİ:
 * ===============
 * 1. Bağlamsal - Kullanıcının bulunduğu yere uygun yardım
 * 2. Non-intrusive - Engel olmadan, isteğe bağlı
 * 3. Progressive disclosure - Önce az, istek üzerine detay
 * 4. Öğretici - Cevap vermek yerine öğretme
 */

import React, { useState, useRef, useEffect } from 'react';
import { AICoachAvatar, AICoachThinking, AI_COACH_PERSONAS } from './AICoachPersona';
import type { AIContext, AIFeatureType, AICoachPersona } from '@/types/ai';

// =============================================================================
// INLINE HINT BUTTON
// =============================================================================

interface AIInlineHintButtonProps {
  context: AIContext;
  onRequestHint: (context: AIContext) => Promise<string>;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const AIInlineHintButton: React.FC<AIInlineHintButtonProps> = ({
  context,
  onRequestHint,
  label = 'İpucu Al',
  size = 'md',
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (isLoading || disabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await onRequestHint(context);
      setHint(result);
    } catch (err) {
      setError('Şu an ipucu alamıyorum. Daha sonra tekrar dene.');
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  if (hint) {
    return (
      <AIHintCard
        hint={hint}
        onDismiss={() => setHint(null)}
        onAskMore={() => { /* Open chat */ }}
      />
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center
          ${sizeClasses[size]}
          bg-gradient-to-r from-blue-500 to-purple-500
          hover:from-blue-600 hover:to-purple-600
          text-white font-medium
          rounded-full
          shadow-sm hover:shadow-md
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
        `}
      >
        {isLoading ? (
          <>
            <span className="animate-spin">💭</span>
            <span>Düşünüyorum...</span>
          </>
        ) : (
          <>
            <span>💡</span>
            <span>{label}</span>
          </>
        )}
      </button>
      
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

// =============================================================================
// HINT CARD
// =============================================================================

interface AIHintCardProps {
  hint: string;
  onDismiss: () => void;
  onAskMore?: () => void;
  persona?: AICoachPersona;
}

export const AIHintCard: React.FC<AIHintCardProps> = ({
  hint,
  onDismiss,
  onAskMore,
  persona = AI_COACH_PERSONAS.default,
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 max-w-md">
      <div className="flex items-start gap-3">
        <AICoachAvatar persona={persona} size="sm" />
        
        <div className="flex-1">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {hint}
          </p>
          
          <div className="flex gap-2">
            {onAskMore && (
              <button
                onClick={onAskMore}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Daha fazla yardım iste →
              </button>
            )}
            <button
              onClick={onDismiss}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// FLOATING HELP BUBBLE
// =============================================================================

interface AIFloatingHelpProps {
  isVisible: boolean;
  onToggle: () => void;
  context: AIContext;
  onOpenChat: (context: AIContext) => void;
  persona?: AICoachPersona;
  position?: 'bottom-right' | 'bottom-left';
}

export const AIFloatingHelp: React.FC<AIFloatingHelpProps> = ({
  isVisible,
  onToggle,
  context,
  onOpenChat,
  persona = AI_COACH_PERSONAS.default,
  position = 'bottom-right',
}) => {
  const [showQuickActions, setShowQuickActions] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className={`
          fixed ${positionClasses[position]}
          w-14 h-14
          bg-gradient-to-r from-blue-600 to-purple-600
          hover:from-blue-700 hover:to-purple-700
          text-white
          rounded-full
          shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all
          z-50
        `}
        title="AI Koç'u Aç"
      >
        <span className="text-2xl">🎓</span>
      </button>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Quick Actions Panel */}
      {showQuickActions && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-64">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AICoachAvatar persona={persona} size="sm" status="idle" />
            <span>Nasıl yardımcı olabilirim?</span>
          </h4>
          
          <div className="space-y-2">
            <QuickActionButton
              icon="💡"
              label="Bu konuyu açıkla"
              onClick={() => onOpenChat({ ...context, intent: 'explain' })}
            />
            <QuickActionButton
              icon="❓"
              label="Sorum var"
              onClick={() => onOpenChat({ ...context, intent: 'question' })}
            />
            <QuickActionButton
              icon="📝"
              label="Pratik yaptır"
              onClick={() => onOpenChat({ ...context, intent: 'practice' })}
            />
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className={`
            w-14 h-14
            bg-gradient-to-r from-blue-600 to-purple-600
            hover:from-blue-700 hover:to-purple-700
            text-white
            rounded-full
            shadow-lg hover:shadow-xl
            flex items-center justify-center
            transition-all
          `}
        >
          <span className="text-2xl">{showQuickActions ? '✕' : '🎓'}</span>
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// QUICK ACTION BUTTON
// =============================================================================

interface QuickActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="
      w-full flex items-center gap-2 p-2
      bg-gray-50 dark:bg-gray-700
      hover:bg-gray-100 dark:hover:bg-gray-600
      text-gray-700 dark:text-gray-200
      rounded-lg
      transition-colors
      text-sm
    "
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

// =============================================================================
// CONTEXTUAL TOOLTIP
// =============================================================================

interface AIContextualTooltipProps {
  trigger: React.ReactNode;
  content: string;
  context?: AIContext;
  onAskMore?: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const AIContextualTooltip: React.FC<AIContextualTooltipProps> = ({
  trigger,
  content,
  context,
  onAskMore,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {trigger}
      
      {isVisible && (
        <div className={`
          absolute ${positionClasses[position]}
          z-50
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg
          p-3
          min-w-48 max-w-64
        `}>
          <div className="flex items-start gap-2 mb-2">
            <span className="text-blue-500">💡</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">{content}</p>
          </div>
          
          {onAskMore && (
            <button
              onClick={onAskMore}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Koç'a sor →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// EMBEDDED AI SECTION
// =============================================================================

interface AIEmbeddedSectionProps {
  feature: AIFeatureType;
  context: AIContext;
  title: string;
  description?: string;
  onActivate: () => void;
  isActive?: boolean;
  children?: React.ReactNode;
}

export const AIEmbeddedSection: React.FC<AIEmbeddedSectionProps> = ({
  feature,
  context,
  title,
  description,
  onActivate,
  isActive = false,
  children,
}) => {
  const persona = AI_COACH_PERSONAS.default;

  if (!isActive) {
    return (
      <button
        onClick={onActivate}
        className="
          w-full
          bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10
          hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20
          border border-dashed border-blue-300 dark:border-blue-700
          rounded-xl p-4
          text-left
          transition-all
          group
        "
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg">
            🎓
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h4>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
          <div className="ml-auto">
            <span className="text-blue-500 group-hover:translate-x-1 transition-transform inline-block">
              →
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <AICoachAvatar persona={persona} size="sm" />
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{persona.name}</p>
          </div>
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

// =============================================================================
// QUESTION AI ASSISTANT (Soru sayfası için özel)
// =============================================================================

interface AIQuestionAssistantProps {
  questionId: string;
  questionText: string;
  options?: { id: string; text: string }[];
  subject?: string;
  topic?: string;
  onHintUsed?: () => void;
  onChatOpened?: () => void;
  disabled?: boolean;
  hintsRemaining?: number;
}

export const AIQuestionAssistant: React.FC<AIQuestionAssistantProps> = ({
  questionId,
  questionText,
  options,
  subject,
  topic,
  onHintUsed,
  onChatOpened,
  disabled = false,
  hintsRemaining = 3,
}) => {
  const [hintLevel, setHintLevel] = useState(0);
  const [hints, setHints] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const hintLabels = [
    { level: 1, label: 'Hafif İpucu', icon: '💡', description: 'Düşünme yönü' },
    { level: 2, label: 'Orta İpucu', icon: '🔍', description: 'Daha detaylı yardım' },
    { level: 3, label: 'Detaylı İpucu', icon: '📚', description: 'Çözüm yaklaşımı' },
  ];

  const requestHint = async (level: number) => {
    if (isLoading || disabled || level > 3) return;
    
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockHints = [
      'Bu soruda temel kavramı düşün. Formüllerden hangisi bu duruma uyar?',
      'Verilenlere dikkat et. Birimler arasındaki ilişkiyi incele.',
      'Adım adım çözelim: Önce verilenleri listele, sonra formülü yaz, değerleri yerleştir.',
    ];
    
    setHints(prev => [...prev, mockHints[level - 1]]);
    setHintLevel(level);
    setIsLoading(false);
    onHintUsed?.();
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🎓</span>
        <h4 className="font-semibold text-gray-900 dark:text-white">AI Koç Yardımı</h4>
        {hintsRemaining !== undefined && (
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {hintsRemaining} ipucu hakkın var
          </span>
        )}
      </div>

      {/* Hint progression */}
      <div className="space-y-2 mb-4">
        {hintLabels.map((h) => (
          <div key={h.level} className="flex items-center gap-2">
            <button
              onClick={() => requestHint(h.level)}
              disabled={disabled || isLoading || hintLevel >= h.level}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-all
                ${hintLevel >= h.level
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-default'
                  : hintLevel === h.level - 1
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <span>{h.icon}</span>
              <span>{h.label}</span>
            </button>
            {hintLevel >= h.level && hints[h.level - 1] && (
              <span className="text-green-500">✓</span>
            )}
          </div>
        ))}
      </div>

      {/* Display hints */}
      {hints.length > 0 && (
        <div className="space-y-2 mb-4">
          {hints.map((hint, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium text-blue-600 dark:text-blue-400">İpucu {index + 1}: </span>
                {hint}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <AICoachThinking persona={AI_COACH_PERSONAS.default} />
      )}

      {/* Chat option */}
      <button
        onClick={onChatOpened}
        disabled={disabled}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
      >
        Daha detaylı yardım için koçla konuş →
      </button>
    </div>
  );
};

export default AIInlineHintButton;
