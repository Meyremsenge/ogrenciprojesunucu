/**
 * AIHintBox Component
 * 
 * Aşamalı ipucu sistemi UI bileşeni.
 */

import React, { useCallback, memo } from 'react';
import { useAIHint } from '@lib/ai/hooks';
import { HINT_LEVELS } from '@lib/ai/constants';

// =============================================================================
// TYPES
// =============================================================================

export interface AIHintBoxProps {
  context?: {
    questionId?: number;
    topicId?: number;
    questionText?: string;
  };
  maxLevel?: 1 | 2 | 3;
  isVisible?: boolean;
  onClose?: () => void;
  onHintReceived?: (level: number, content: string) => void;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AIHintBox: React.FC<AIHintBoxProps> = ({
  context,
  maxLevel = 3,
  isVisible = true,
  onClose,
  onHintReceived,
  className = '',
}) => {
  const { 
    hints, 
    currentLevel, 
    isLoading, 
    error, 
    canGetMore,
    getNextHint,
    reset 
  } = useAIHint({ context, maxLevel });
  
  const handleRequestHint = useCallback(async () => {
    await getNextHint();
    if (hints.length > 0 && onHintReceived) {
      const lastHint = hints[hints.length - 1];
      onHintReceived(currentLevel, lastHint);
    }
  }, [getNextHint, hints, currentLevel, onHintReceived]);
  
  if (!isVisible) return null;
  
  return (
    <div className={`bg-white rounded-xl shadow-md border border-amber-100 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white">
            💡
          </div>
          <div>
            <h3 className="font-medium text-gray-800">İpucu Sistemi</h3>
            {currentLevel > 0 && (
              <p className="text-xs text-gray-500">Seviye {currentLevel}/{maxLevel}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Level indicators */}
          {currentLevel > 0 && (
            <div className="flex gap-1">
              {Array.from({ length: maxLevel }, (_, i) => {
                const level = (i + 1) as 1 | 2 | 3;
                const isActive = level <= currentLevel;
                return (
                  <div
                    key={level}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                      isActive ? 'bg-amber-100 border-amber-400 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                    title={HINT_LEVELS[level].name}
                  >
                    {level}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Reset */}
          {currentLevel > 0 && (
            <button onClick={reset} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg" title="Sıfırla">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          
          {/* Close */}
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg" title="Kapat">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}
        
        {hints.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3 text-2xl">
              💡
            </div>
            <h4 className="font-medium text-gray-800 mb-1">İpucu Al</h4>
            <p className="text-sm text-gray-500 mb-4">
              Soruyu çözerken takıldın mı? Aşamalı ipuçları alabilirsin.
            </p>
            <button
              onClick={handleRequestHint}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-medium ${
                isLoading ? 'bg-gray-100 text-gray-400' : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {isLoading ? 'Yükleniyor...' : 'İlk İpucunu Al'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {hints.map((hint, index) => {
              const level = (index + 1) as 1 | 2 | 3;
              const levelInfo = HINT_LEVELS[level];
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    index === hints.length - 1 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{levelInfo.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{levelInfo.name}</span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{hint}</p>
                </div>
              );
            })}
            
            {canGetMore && (
              <button
                onClick={handleRequestHint}
                disabled={isLoading}
                className={`w-full py-2.5 rounded-lg font-medium border-2 border-dashed ${
                  isLoading 
                    ? 'bg-gray-50 border-gray-200 text-gray-400' 
                    : 'bg-white border-amber-300 text-amber-600 hover:bg-amber-50'
                }`}
              >
                {isLoading ? 'Yükleniyor...' : `Daha Fazla İpucu (Seviye ${currentLevel + 1})`}
              </button>
            )}
            
            {!canGetMore && currentLevel >= maxLevel && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Tüm ipuçlarını aldın!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIHintBox;
