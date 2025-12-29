/**
 * AIFloatingButton Component
 * 
 * Sayfa köşesinde FAB (Floating Action Button).
 */

import React, { useState, useCallback, memo } from 'react';
import { useAIQuota } from '@lib/ai/hooks';
import type { AIFeatureType, AIContext } from '@/types/ai';
import { AIChatPanel } from './AIChatPanel';

// =============================================================================
// TYPES
// =============================================================================

export interface AIFloatingButtonProps {
  feature: AIFeatureType;
  context?: Partial<AIContext>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  isVisible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

const POSITION_CLASSES = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
};

const PANEL_POSITION_CLASSES = {
  'bottom-right': 'bottom-20 right-0',
  'bottom-left': 'bottom-20 left-0',
  'top-right': 'top-20 right-0',
  'top-left': 'top-20 left-0',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AIFloatingButton: React.FC<AIFloatingButtonProps> = memo(({
  feature,
  context,
  position = 'bottom-right',
  isVisible = true,
  defaultOpen = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { isExhausted, isLow, percentage } = useAIQuota();
  
  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <div className={`fixed ${POSITION_CLASSES[position]} z-50 ${className}`}>
      {/* Chat Panel */}
      {isOpen && (
        <div className={`absolute ${PANEL_POSITION_CLASSES[position]} w-[380px] max-w-[calc(100vw-3rem)] animate-slideUp`}>
          <AIChatPanel
            feature={feature}
            context={context}
            isOpen={isOpen}
            onClose={closePanel}
            maxHeight="500px"
          />
        </div>
      )}
      
      {/* FAB */}
      <button
        onClick={togglePanel}
        disabled={isExhausted}
        className={`
          relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all
          ${isExhausted 
            ? 'bg-gray-400 cursor-not-allowed' 
            : isOpen 
              ? 'bg-indigo-700' 
              : 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-110'
          }
        `}
        title={isExhausted ? 'Günlük limit doldu' : 'AI Koç ile konuş'}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        
        {/* Warning badge */}
        {!isOpen && isLow && !isExhausted && (
          <span 
            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              percentage >= 90 ? 'bg-red-500' : 'bg-orange-500'
            }`}
          >
            !
          </span>
        )}
      </button>
    </div>
  );
});

AIFloatingButton.displayName = 'AIFloatingButton';

export default AIFloatingButton;
