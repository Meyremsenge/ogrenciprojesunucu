/**
 * AI Components - Barrel Export
 * 
 * Tüm AI bileşenlerinin tek noktadan export edilmesi.
 */

// Persona & Character
export {
  AI_COACH_PERSONAS,
  getRoleBasedPersona,
  AICoachAvatar,
  AICoachGreeting,
  AICoachEncouragement,
  AICoachThinking,
} from './AICoachPersona';

// Chat
export {
  AIChatContainer,
} from './AIChat';

// Disclaimer & Warnings
export {
  AIDisclaimer,
  AILimitationBadge,
  AIConfidenceIndicator,
  AIWarningCard,
} from './AIDisclaimer';

// Quota & Limits
export {
  AIQuotaIndicator,
  AIQuotaProgress,
  AIQuotaWarningBanner,
  AIQuotaExceededModal,
} from './AIQuotaIndicator';

// Context Helpers
export {
  AIInlineHintButton,
  AIHintCard,
  AIFloatingHelp,
  AIContextualTooltip,
  AIEmbeddedSection,
  AIQuestionAssistant,
} from './AIContextHelpers';

// Role-Based Components
export {
  ROLE_FEATURE_ACCESS,
  StudentAIPanel,
  TeacherAIPanel,
  AdminAIPanel,
} from './AIRoleComponents';
