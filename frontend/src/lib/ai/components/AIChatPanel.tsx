/**
 * AIChatPanel Component
 * 
 * AI chat arayüzü bileşeni.
 * Mevcut hook ve tip yapısıyla uyumlu.
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useAIChat, useAIQuota } from '@lib/ai/hooks';
import type { AIFeatureType, AIChatMessage, AICoachPersona, AIContext } from '@/types/ai';
import { formatMessageTime, validateMessage } from '@lib/ai/utils';
import { DEFAULT_PERSONA } from '@lib/ai/constants';

// =============================================================================
// TYPES
// =============================================================================

export interface AIChatPanelProps {
  feature: AIFeatureType;
  context?: Partial<AIContext>;
  persona?: Partial<AICoachPersona>;
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  feature,
  context,
  persona: customPersona,
  isOpen = true,
  onClose,
  title,
  placeholder = 'Mesajınızı yazın...',
  minHeight = '400px',
  maxHeight = '600px',
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { messages, send, isLoading, error, clear } = useAIChat({ feature, context });
  const { remaining, percentage, isExhausted, isLow } = useAIQuota();
  
  const persona = { ...DEFAULT_PERSONA, ...customPersona };
  
  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus on open
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);
  
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const validation = validateMessage(inputValue);
    if (!validation.valid) {
      setInputError(validation.error);
      return;
    }
    
    if (isExhausted) {
      setInputError('Günlük AI kullanım limitiniz doldu.');
      return;
    }
    
    setInputError(undefined);
    const message = inputValue.trim();
    setInputValue('');
    await send(message);
  }, [inputValue, isExhausted, send]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className={`flex flex-col bg-gray-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}
      style={{ minHeight, maxHeight }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm">
            {persona.avatar || persona.name?.charAt(0) || 'A'}
          </div>
          <h3 className="font-medium text-gray-800">{title || persona.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={clear} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg" title="Temizle">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg" title="Kapat">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-2xl mb-3">
              {persona.avatar || '🤖'}
            </div>
            <p className="text-gray-500 text-sm">Merhaba! Size nasıl yardımcı olabilirim?</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white border border-gray-100 text-gray-800'
              }`}>
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {formatMessageTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Error & Warning */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}
      {isLow && !isExhausted && (
        <div className="mx-4 mb-2 px-3 py-2 bg-yellow-50 text-yellow-700 text-sm rounded-lg border border-yellow-200">
          Kalan: {remaining} mesaj ({percentage.toFixed(0)}% kullanıldı)
        </div>
      )}
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setInputError(undefined); }}
            onKeyDown={handleKeyDown}
            placeholder={isExhausted ? 'Günlük limit doldu' : placeholder}
            disabled={isLoading || isExhausted}
            rows={1}
            className={`flex-1 px-4 py-2.5 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 ${inputError ? 'border-red-300' : 'border-gray-200'}`}
          />
          <button
            type="submit"
            disabled={isLoading || isExhausted || !inputValue.trim()}
            className={`px-4 py-2.5 rounded-xl font-medium ${isLoading || isExhausted || !inputValue.trim() ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {isLoading ? '...' : '→'}
          </button>
        </div>
        {inputError && <p className="text-xs text-red-500 mt-1">{inputError}</p>}
      </form>
    </div>
  );
};

export default AIChatPanel;
