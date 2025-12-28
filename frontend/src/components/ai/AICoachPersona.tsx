/**
 * AI Coach Persona & Character Design
 * 
 * UX STRATEJİSİ:
 * ==============
 * AI "Koç" olarak konumlandırılır çünkü:
 * 
 * 1. KOÇLUK YAKLAŞIMI (vs Asistan)
 *    - Koç: "Şimdi birlikte düşünelim..." (yönlendirici)
 *    - Asistan: "İşte cevap..." (direkt)
 *    - Koç öğrenme sürecine odaklanır
 * 
 * 2. MOTİVASYON
 *    - Koç başarısızlıkta bile motive eder
 *    - "Yanlış" yerine "geliştirilecek alan" der
 * 
 * 3. SINIRLARIN KABULÜ
 *    - Koç kendi sınırlarını kabul eder
 *    - "Bu konuda öğretmenine danışmanı öneririm"
 */

import React from 'react';
import type { AICoachPersona, AIPersonality, UserRole, AIFeatureType } from '@/types/ai';

// =============================================================================
// COACH PERSONAS
// =============================================================================

/**
 * Varsayılan Koç Personaları
 */
export const AI_COACH_PERSONAS: Record<string, AICoachPersona> = {
  default: {
    id: 'coach-default',
    name: 'Koç',
    avatar: '🎓',
    personality: 'friendly',
    greetings: [
      'Merhaba! Bugün birlikte neler öğreneceğiz?',
      'Hoş geldin! Sana nasıl yardımcı olabilirim?',
      'Hazır mısın? Birlikte keşfedelim!',
    ],
    encouragements: [
      'Harika gidiyorsun! Devam et!',
      'Bu yaklaşımın çok iyi, bir adım daha!',
      'Yanlış yapmak öğrenmenin parçası, tekrar deneyelim!',
    ],
  },
  
  mentor: {
    id: 'coach-mentor',
    name: 'Mentor',
    avatar: '👨‍🏫',
    personality: 'professional',
    greetings: [
      'Hoş geldiniz. Size nasıl rehberlik edebilirim?',
      'Bugün hangi konuda ilerlemek istiyorsunuz?',
    ],
    encouragements: [
      'Doğru yoldasınız.',
      'Bu analiz oldukça iyi.',
      'Gelişiminizi görüyorum, devam edin.',
    ],
  },
  
  buddy: {
    id: 'coach-buddy',
    name: 'Öğrenme Arkadaşı',
    avatar: '🤝',
    personality: 'encouraging',
    greetings: [
      'Hey! Bugün birlikte çalışalım mı?',
      'Hazır mısın? Hadi başlayalım!',
    ],
    encouragements: [
      'Vay be, süpersin! 🎉',
      'Bunu birlikte başardık!',
      'Hiç sorun değil, bir daha deneyelim!',
    ],
  },
};

// =============================================================================
// ROLE-BASED PERSONAS
// =============================================================================

/**
 * Rol Bazlı Varsayılan Persona
 */
export const getRoleBasedPersona = (role: UserRole): AICoachPersona => {
  switch (role) {
    case 'student':
      return AI_COACH_PERSONAS.default;
    case 'teacher':
      return AI_COACH_PERSONAS.mentor;
    case 'admin':
    case 'super_admin':
      return {
        ...AI_COACH_PERSONAS.mentor,
        name: 'AI Asistan',
        avatar: '🤖',
        greetings: ['Sistem yardımcınız hazır.'],
      };
    default:
      return AI_COACH_PERSONAS.default;
  }
};

// =============================================================================
// COACH AVATAR COMPONENT
// =============================================================================

interface AICoachAvatarProps {
  persona?: AICoachPersona;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  status?: 'idle' | 'thinking' | 'speaking' | 'listening';
  className?: string;
}

export const AICoachAvatar: React.FC<AICoachAvatarProps> = ({
  persona = AI_COACH_PERSONAS.default,
  size = 'md',
  animated = true,
  status = 'idle',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-4xl',
  };

  const statusClasses = {
    idle: '',
    thinking: 'animate-pulse',
    speaking: 'animate-bounce',
    listening: 'ring-2 ring-blue-400 ring-offset-2',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${animated ? statusClasses[status] : ''}
        ${className}
        flex items-center justify-center
        bg-gradient-to-br from-blue-100 to-purple-100
        dark:from-blue-900 dark:to-purple-900
        rounded-full
        shadow-md
        transition-all duration-300
      `}
      role="img"
      aria-label={`AI Koç: ${persona.name}`}
    >
      <span>{persona.avatar}</span>
      
      {/* Status indicator */}
      {status !== 'idle' && (
        <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
          <span className={`
            animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
            ${status === 'thinking' ? 'bg-yellow-400' : ''}
            ${status === 'speaking' ? 'bg-green-400' : ''}
            ${status === 'listening' ? 'bg-blue-400' : ''}
          `} />
          <span className={`
            relative inline-flex rounded-full h-3 w-3
            ${status === 'thinking' ? 'bg-yellow-500' : ''}
            ${status === 'speaking' ? 'bg-green-500' : ''}
            ${status === 'listening' ? 'bg-blue-500' : ''}
          `} />
        </span>
      )}
    </div>
  );
};

// =============================================================================
// COACH GREETING COMPONENT
// =============================================================================

interface AICoachGreetingProps {
  persona?: AICoachPersona;
  userName?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  feature?: AIFeatureType;
}

export const AICoachGreeting: React.FC<AICoachGreetingProps> = ({
  persona = AI_COACH_PERSONAS.default,
  userName,
  timeOfDay,
  feature,
}) => {
  // Zaman bazlı selamlama
  const getTimeGreeting = () => {
    switch (timeOfDay) {
      case 'morning': return 'Günaydın';
      case 'afternoon': return 'İyi günler';
      case 'evening': return 'İyi akşamlar';
      default: return 'Merhaba';
    }
  };

  // Özellik bazlı açılış mesajı
  const getFeatureIntro = () => {
    switch (feature) {
      case 'question_hint':
        return 'Bu soruyu birlikte çözelim. Sana adım adım yol göstereceğim.';
      case 'topic_explanation':
        return 'Bu konuyu beraber inceleyelim. Anlamadığın yerleri sormaktan çekinme!';
      case 'study_plan':
        return 'Senin için kişiselleştirilmiş bir çalışma planı hazırlayacağım.';
      case 'answer_evaluation':
        return 'Cevabını birlikte değerlendirelim. Güçlü ve geliştirilecek yönlerini konuşalım.';
      case 'motivation_message':
        return 'Bugün nasıl hissediyorsun? Birlikte motivasyonunu yükseltelim!';
      default:
        return persona.greetings[Math.floor(Math.random() * persona.greetings.length)];
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
      <AICoachAvatar persona={persona} size="md" status="speaking" />
      
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-white">
          {getTimeGreeting()}{userName ? `, ${userName}` : ''}! 👋
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {getFeatureIntro()}
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// COACH ENCOURAGEMENT COMPONENT
// =============================================================================

interface AICoachEncouragementProps {
  persona?: AICoachPersona;
  type: 'success' | 'partial' | 'retry' | 'motivation';
  customMessage?: string;
}

export const AICoachEncouragement: React.FC<AICoachEncouragementProps> = ({
  persona = AI_COACH_PERSONAS.default,
  type,
  customMessage,
}) => {
  const getMessage = () => {
    if (customMessage) return customMessage;
    
    const messages = {
      success: [
        'Harika! Doğru cevap! 🎉',
        'Mükemmel! Bu konuyu çok iyi anlamışsın!',
        'Bravo! Tam isabet! 🌟',
      ],
      partial: [
        'İyi düşündün! Biraz daha geliştirelim.',
        'Doğru yöndesin, bir adım daha!',
        'Yaklaştın! Şimdi şuna bir bakalım...',
      ],
      retry: [
        'Sorun değil, öğrenme yolculuğunun parçası.',
        'Hata yapmak normaldir, birlikte düzeltelim.',
        'Tekrar deneyelim, bu sefer ipucu vereyim.',
      ],
      motivation: persona.encouragements,
    };
    
    const typeMessages = messages[type];
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  };

  const getEmoji = () => {
    switch (type) {
      case 'success': return '🎉';
      case 'partial': return '💪';
      case 'retry': return '🔄';
      case 'motivation': return '⭐';
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 dark:bg-green-900/20';
      case 'partial': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20';
      case 'retry': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20';
      case 'motivation': return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20';
    }
  };

  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg border
      ${getBgColor()}
      transition-all duration-300 animate-fadeIn
    `}>
      <AICoachAvatar persona={persona} size="sm" />
      <span className="text-2xl">{getEmoji()}</span>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {getMessage()}
      </p>
    </div>
  );
};

// =============================================================================
// COACH THINKING INDICATOR
// =============================================================================

interface AICoachThinkingProps {
  persona?: AICoachPersona;
  message?: string;
}

export const AICoachThinking: React.FC<AICoachThinkingProps> = ({
  persona = AI_COACH_PERSONAS.default,
  message = 'Düşünüyorum...',
}) => {
  return (
    <div className="flex items-center gap-3 p-3">
      <AICoachAvatar persona={persona} size="sm" status="thinking" />
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export default AICoachAvatar;
