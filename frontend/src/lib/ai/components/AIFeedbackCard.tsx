/**
 * AIFeedbackCard Component
 * 
 * AI yanıtları için geri bildirim toplama bileşeni.
 */

import React, { useState, useCallback, memo } from 'react';
import { useAIFeedback } from '@lib/ai/hooks';

// =============================================================================
// TYPES
// =============================================================================

export interface AIFeedbackCardProps {
  responseId: string;
  variant?: 'stars' | 'thumbs';
  showComment?: boolean;
  onSubmit?: (rating: number, helpful: boolean) => void;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AIFeedbackCard: React.FC<AIFeedbackCardProps> = ({
  responseId,
  variant = 'thumbs',
  showComment = false,
  onSubmit,
  compact = false,
  className = '',
}) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  
  const { submit, isSubmitting, isSubmitted, reset } = useAIFeedback();
  
  const handleThumbsUp = useCallback(async () => {
    setHelpful(true);
    setRating(5);
    await submit(responseId, 5, true);
    onSubmit?.(5, true);
  }, [submit, responseId, onSubmit]);
  
  const handleThumbsDown = useCallback(async () => {
    setHelpful(false);
    setRating(1);
    await submit(responseId, 1, false);
    onSubmit?.(1, false);
  }, [submit, responseId, onSubmit]);
  
  const handleStarClick = useCallback(async (star: 1 | 2 | 3 | 4 | 5) => {
    setRating(star);
    const isHelpful = star >= 4;
    setHelpful(isHelpful);
    await submit(responseId, star, isHelpful);
    onSubmit?.(star, isHelpful);
  }, [submit, responseId, onSubmit]);
  
  if (isSubmitted) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium">Teşekkürler!</span>
      </div>
    );
  }
  
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {variant === 'thumbs' ? (
          <>
            <button
              onClick={handleThumbsUp}
              disabled={isSubmitting}
              className={`p-1.5 rounded-lg border ${helpful === true ? 'bg-green-100 border-green-300 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-green-500'}`}
            >
              👍
            </button>
            <button
              onClick={handleThumbsDown}
              disabled={isSubmitting}
              className={`p-1.5 rounded-lg border ${helpful === false ? 'bg-red-100 border-red-300 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-red-500'}`}
            >
              👎
            </button>
          </>
        ) : (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleStarClick(star as 1 | 2 | 3 | 4 | 5)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                disabled={isSubmitting}
                className={`w-5 h-5 ${star <= (hoverRating || (rating ?? 0)) ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ★
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
      <h4 className="font-medium text-gray-800 mb-2">Bu yanıt yararlı oldu mu?</h4>
      
      {variant === 'thumbs' ? (
        <div className="flex gap-3">
          <button
            onClick={handleThumbsUp}
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              helpful === true 
                ? 'bg-green-100 border-green-300 text-green-700' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-green-300'
            }`}
          >
            👍 Evet
          </button>
          <button
            onClick={handleThumbsDown}
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              helpful === false 
                ? 'bg-red-100 border-red-300 text-red-700' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-red-300'
            }`}
          >
            👎 Hayır
          </button>
        </div>
      ) : (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleStarClick(star as 1 | 2 | 3 | 4 | 5)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={isSubmitting}
              className={`w-8 h-8 text-2xl transition-transform hover:scale-110 ${
                star <= (hoverRating || (rating ?? 0)) ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      )}
      
      {isSubmitting && (
        <p className="text-sm text-gray-500 mt-2">Gönderiliyor...</p>
      )}
    </div>
  );
};

export default AIFeedbackCard;
