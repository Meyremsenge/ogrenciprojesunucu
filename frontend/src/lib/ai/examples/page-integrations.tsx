/**
 * AI Page Integration Examples
 * 
 * Sayfa bazlı AI entegrasyonu için örnek kullanımlar.
 */

import React from 'react';
import {
  AIFloatingButton,
  AIHintBox,
  AIChatPanel,
  AIFeedbackCard,
  AIContextHelper,
} from '@lib/ai/components';
import { useAIQuota } from '@lib/ai/hooks';
import type { AIContext, AIFeatureType } from '@/types/ai';

// =============================================================================
// 1. CONTENT PAGE - Wrapper Pattern
// =============================================================================

interface ContentPageAIWrapperProps {
  contentId: number;
  topicName?: string;
  children: React.ReactNode;
}

/**
 * ContentDetailPage için AI wrapper örneği
 * 
 * Kullanım:
 * ```tsx
 * <ContentPageAIWrapper contentId={123} topicName="Türev">
 *   <ContentDetail />
 * </ContentPageAIWrapper>
 * ```
 */
export const ContentPageAIWrapper: React.FC<ContentPageAIWrapperProps> = ({
  contentId,
  topicName,
  children,
}) => {
  const context: Partial<AIContext> = { 
    topicId: contentId,
  };

  return (
    <AIContextHelper context={context} pageType="topic">
      <div className="relative">
        {children}
        <AIFloatingButton
          feature="topic_explanation"
          context={context}
          position="bottom-right"
        />
      </div>
    </AIContextHelper>
  );
};

// =============================================================================
// 2. EXAM PAGE - Sidebar Pattern
// =============================================================================

interface ExamPageAIWrapperProps {
  examId: number;
  currentQuestionId: number;
  children: React.ReactNode;
}

/**
 * ExamTakePage için AI wrapper örneği
 */
export const ExamPageAIWrapper: React.FC<ExamPageAIWrapperProps> = ({
  examId,
  currentQuestionId,
  children,
}) => {
  const { isExhausted } = useAIQuota();
  const context: Partial<AIContext> = { 
    examId, 
    questionId: currentQuestionId 
  };

  return (
    <AIContextHelper context={context} pageType="exam">
      <div className="flex gap-6">
        <main className="flex-1">
          {children}
        </main>
        
        {!isExhausted && (
          <aside className="w-80 shrink-0">
            <AIHintBox
              context={{ questionId: currentQuestionId }}
              maxLevel={3}
            />
          </aside>
        )}
      </div>
    </AIContextHelper>
  );
};

// =============================================================================
// 3. VIDEO PAGE - Embedded Panel Pattern
// =============================================================================

interface VideoPageAIWrapperProps {
  contentId: number;
  topicName?: string;
  children: React.ReactNode;
}

/**
 * VideoWatchPage için AI wrapper örneği
 */
export const VideoPageAIWrapper: React.FC<VideoPageAIWrapperProps> = ({
  contentId,
  topicName,
  children,
}) => {
  const context: Partial<AIContext> = { topicId: contentId };

  return (
    <AIContextHelper context={context} pageType="topic">
      <div>
        {children}
        
        <div className="mt-6">
          <AIChatPanel
            feature="topic_explanation"
            context={context}
            title="Video Hakkında Soru Sor"
            placeholder="Bu video hakkında ne sormak istersin?"
            minHeight="300px"
          />
        </div>
      </div>
    </AIContextHelper>
  );
};

// =============================================================================
// 4. FEEDBACK PATTERN
// =============================================================================

interface AIResponseFeedbackProps {
  responseId: string;
  onFeedbackSubmit?: (rating: number, helpful: boolean) => void;
}

/**
 * AI yanıtı altına geri bildirim ekleme örneği
 */
export const AIResponseFeedback: React.FC<AIResponseFeedbackProps> = ({
  responseId,
  onFeedbackSubmit,
}) => {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <AIFeedbackCard
        responseId={responseId}
        variant="thumbs"
        compact
        onSubmit={onFeedbackSubmit}
      />
    </div>
  );
};

// =============================================================================
// EXPORT
// =============================================================================

export default {
  ContentPageAIWrapper,
  ExamPageAIWrapper,
  VideoPageAIWrapper,
  AIResponseFeedback,
};
