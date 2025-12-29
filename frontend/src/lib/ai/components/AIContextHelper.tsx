/**
 * AIContextHelper Component
 * 
 * Sayfa context'ini AI'a aktaran wrapper.
 */

import React, { useEffect, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAIPageContext } from '@lib/ai/hooks';
import { extractContextIds, inferPageType } from '@lib/ai/utils';
import type { AIContext } from '@/types/ai';

// =============================================================================
// TYPES
// =============================================================================

export interface AIContextHelperProps {
  children: React.ReactNode;
  context?: Partial<AIContext>;
  pageType?: 'question' | 'topic' | 'exam' | 'course' | 'dashboard';
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AIContextHelper: React.FC<AIContextHelperProps> = memo(({
  children,
  context: manualContext,
  pageType: manualPageType,
}) => {
  const location = useLocation();
  
  // URL'den context çıkar
  const extractedIds = extractContextIds(location.pathname);
  const pageType = manualPageType || inferPageType(location.pathname);
  
  // Context'i birleştir
  const fullContext: Partial<AIContext> = {
    ...extractedIds,
    ...manualContext,
    pageType,
  };
  
  // useAIPageContext hook'u ile context'i kaydet
  useAIPageContext(fullContext);
  
  return <>{children}</>;
});

AIContextHelper.displayName = 'AIContextHelper';

export default AIContextHelper;
