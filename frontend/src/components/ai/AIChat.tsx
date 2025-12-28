/**
 * AI Chat Component
 * 
 * Chat tabanlı AI etkileşim arayüzü.
 * 
 * UX PRENSİPLERİ:
 * ===============
 * 1. Koç yaklaşımı - Cevap vermek yerine yönlendirme
 * 2. Beklenti yönetimi - AI sınırları net gösterilir
 * 3. Geri bildirim - Her yanıt değerlendirilebilir
 * 4. Kota farkındalığı - Kullanım limiti görünür
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AICoachAvatar, AICoachThinking, AI_COACH_PERSONAS } from './AICoachPersona';
import { AIDisclaimer } from './AIDisclaimer';
import { AIQuotaIndicator } from './AIQuotaIndicator';
import type {
  AIChatMessage,
  AICoachPersona,
  AIFeatureType,
  AIContext,
  AIQuotaStatus,
  AIFeedback,
} from '@/types/ai';

// =============================================================================
// CHAT CONTAINER
// =============================================================================

interface AIChatContainerProps {
  feature: AIFeatureType;
  context: AIContext;
  persona?: AICoachPersona;
  quota?: AIQuotaStatus;
  onSendMessage: (message: string) => Promise<void>;
  onFeedback?: (feedback: AIFeedback) => void;
  className?: string;
  embedded?: boolean; // Sayfa içi mi yoksa modal mı
}

export const AIChatContainer: React.FC<AIChatContainerProps> = ({
  feature,
  context,
  persona = AI_COACH_PERSONAS.default,
  quota,
  onSendMessage,
  onFeedback,
  className = '',
  embedded = false,
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add initial greeting
  useEffect(() => {
    const greeting = getFeatureGreeting(feature, persona);
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
      metadata: { feature },
    }]);
  }, [feature, persona]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    // Check quota
    const used = quota?.used ?? 0;
    const limit = quota?.limit ?? Infinity;
    const isUnlimited = quota?.isUnlimited ?? false;
    if (quota && used >= limit && !isUnlimited) {
      setMessages(prev => [...prev, {
        id: `quota-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Günlük kullanım limitine ulaştın. Yarın tekrar deneyebilirsin veya öğretmeninden yardım isteyebilirsin.',
        timestamp: new Date(),
        metadata: { hasError: true },
      }]);
      return;
    }

    const userMessage: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      await onSendMessage(inputValue.trim());
      
      // Response would be added by parent component
      // This is just for demo - in real app, response comes from API
      
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '😔 Bir sorun oluştu. Lütfen tekrar dene veya öğretmenine danış.',
        timestamp: new Date(),
        metadata: { hasError: true },
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, quota, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`
      flex flex-col
      ${embedded ? 'h-full' : 'h-[600px]'}
      bg-white dark:bg-gray-900
      rounded-xl shadow-lg
      overflow-hidden
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
        <div className="flex items-center gap-3">
          <AICoachAvatar persona={persona} size="sm" status={isLoading ? 'thinking' : 'idle'} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {persona.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getFeatureLabel(feature)}
            </p>
          </div>
        </div>
        
        {quota && <AIQuotaIndicator quota={quota} compact />}
      </div>

      {/* Disclaimer Banner */}
      {showDisclaimer && (
        <AIDisclaimer
          feature={feature}
          onDismiss={() => setShowDisclaimer(false)}
          compact
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            persona={persona}
            onFeedback={onFeedback}
          />
        ))}
        
        {isLoading && <AICoachThinking persona={persona} />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getInputPlaceholder(feature)}
            rows={1}
            className="
              flex-1 resize-none
              px-4 py-2
              border border-gray-300 dark:border-gray-600
              rounded-xl
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-white
              placeholder-gray-400
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:opacity-50
            "
            disabled={isLoading}
          />
          
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="
              px-4 py-2
              bg-blue-600 hover:bg-blue-700
              text-white font-medium
              rounded-xl
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              flex items-center gap-2
            "
          >
            <span>Gönder</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        {/* Quick suggestions */}
        <QuickSuggestions feature={feature} onSelect={setInputValue} />
      </div>
    </div>
  );
};

// =============================================================================
// CHAT MESSAGE
// =============================================================================

interface ChatMessageProps {
  message: AIChatMessage;
  persona: AICoachPersona;
  onFeedback?: (feedback: AIFeedback) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  persona,
  onFeedback,
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const isUser = message.role === 'user';
  const hasError = message.metadata?.hasError;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isUser && (
        <AICoachAvatar persona={persona} size="sm" />
      )}
      
      {isUser && (
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      )}
      
      {/* Message bubble */}
      <div className={`
        max-w-[75%] rounded-2xl px-4 py-2
        ${isUser 
          ? 'bg-blue-600 text-white' 
          : hasError 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        }
      `}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {/* Confidence indicator for AI responses */}
        {!isUser && message.metadata?.confidence && message.metadata.confidence < 0.7 && (
          <p className="text-xs mt-2 opacity-70 italic">
            ⚠️ Bu yanıttan tam emin değilim. Öğretmenine danışmanı öneririm.
          </p>
        )}
        
        {/* Timestamp */}
        <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      
      {/* Feedback buttons for AI responses */}
      {!isUser && !hasError && onFeedback && (
        <div className="self-end">
          {!showFeedback ? (
            <button
              onClick={() => setShowFeedback(true)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Değerlendir
            </button>
          ) : (
            <MessageFeedback
              messageId={message.id}
              onSubmit={(feedback) => {
                onFeedback(feedback);
                setShowFeedback(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MESSAGE FEEDBACK
// =============================================================================

interface MessageFeedbackProps {
  messageId: string;
  onSubmit: (feedback: AIFeedback) => void;
}

const MessageFeedback: React.FC<MessageFeedbackProps> = ({ messageId, onSubmit }) => {
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onSubmit({
          responseId: messageId,
          rating: 5,
          helpful: true,
          accurate: true,
          submittedAt: new Date(),
        })}
        className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
        title="Faydalı"
      >
        👍
      </button>
      <button
        onClick={() => onSubmit({
          responseId: messageId,
          rating: 2,
          helpful: false,
          accurate: false,
          submittedAt: new Date(),
        })}
        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
        title="Faydalı değil"
      >
        👎
      </button>
    </div>
  );
};

// =============================================================================
// QUICK SUGGESTIONS
// =============================================================================

interface QuickSuggestionsProps {
  feature: AIFeatureType;
  onSelect: (text: string) => void;
}

const QuickSuggestions: React.FC<QuickSuggestionsProps> = ({ feature, onSelect }) => {
  const suggestions = getQuickSuggestions(feature);
  
  if (suggestions.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          className="
            px-3 py-1
            text-xs
            bg-gray-100 dark:bg-gray-800
            hover:bg-gray-200 dark:hover:bg-gray-700
            text-gray-600 dark:text-gray-300
            rounded-full
            transition-colors
          "
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getFeatureGreeting(feature: AIFeatureType, persona: AICoachPersona): string {
  const greetings: Record<AIFeatureType, string> = {
    question_hint: `Merhaba! 👋 Bu soruyu birlikte çözelim. Sana direkt cevabı vermeyeceğim ama doğru yolu bulmana yardımcı olacağım. Nereden başlamak istersin?`,
    topic_explanation: `Merhaba! 📚 Bu konuyu birlikte keşfedelim. Anlamadığın veya merak ettiğin yerleri sormaktan çekinme!`,
    study_plan: `Merhaba! 📋 Senin için kişiselleştirilmiş bir çalışma planı hazırlayacağım. Önce hedeflerini ve mevcut durumunu anlamamda yardımcı olur musun?`,
    answer_evaluation: `Merhaba! 📝 Cevabını birlikte değerlendirelim. Güçlü yönlerini ve geliştirebileceğin alanları konuşacağız.`,
    performance_analysis: `Merhaba! 📊 Performansını birlikte analiz edelim ve gelişim alanlarını belirleyelim.`,
    question_generation: `Merhaba! ✍️ Sizin için sorular hazırlamama yardımcı olun. Hangi konu ve zorluk seviyesinde sorular istersiniz?`,
    content_enhancement: `Merhaba! 🎨 İçeriğinizi zenginleştirmeme yardımcı olun. Ne tür iyileştirmeler yapmamı istersiniz?`,
    motivation_message: `Merhaba! 💪 Bugün nasıl hissediyorsun? Birlikte motivasyonunu yükseltelim!`,
  };
  
  return greetings[feature] || persona.greetings[0];
}

function getFeatureLabel(feature: AIFeatureType): string {
  const labels: Record<AIFeatureType, string> = {
    question_hint: 'Soru Yardımcısı',
    topic_explanation: 'Konu Anlatımı',
    study_plan: 'Çalışma Planı',
    answer_evaluation: 'Cevap Değerlendirme',
    performance_analysis: 'Performans Analizi',
    question_generation: 'Soru Üretimi',
    content_enhancement: 'İçerik Zenginleştirme',
    motivation_message: 'Motivasyon',
  };
  return labels[feature] || 'AI Koç';
}

function getInputPlaceholder(feature: AIFeatureType): string {
  const placeholders: Record<AIFeatureType, string> = {
    question_hint: 'Soruyla ilgili düşünceni yaz...',
    topic_explanation: 'Anlamadığın yeri sor...',
    study_plan: 'Hedeflerini ve durumunu paylaş...',
    answer_evaluation: 'Cevabını veya sorunu yaz...',
    performance_analysis: 'Neyi analiz etmemi istersin?',
    question_generation: 'Ne tür sorular istiyorsunuz?',
    content_enhancement: 'İçeriği nasıl geliştireyim?',
    motivation_message: 'Nasıl hissediyorsun?',
  };
  return placeholders[feature] || 'Mesajını yaz...';
}

function getQuickSuggestions(feature: AIFeatureType): string[] {
  const suggestions: Record<AIFeatureType, string[]> = {
    question_hint: [
      'Nereden başlamalıyım?',
      'Bir ipucu verir misin?',
      'Bu formülü nasıl kullanırım?',
    ],
    topic_explanation: [
      'Basitçe anlat',
      'Örnek verir misin?',
      'Neden önemli?',
    ],
    study_plan: [
      'Sınava hazırlanıyorum',
      'Zayıf konularım var',
      'Günlük plan istiyorum',
    ],
    answer_evaluation: [
      'Cevabımı kontrol et',
      'Nerede hata yaptım?',
      'Nasıl geliştirebilirim?',
    ],
    performance_analysis: [],
    question_generation: [],
    content_enhancement: [],
    motivation_message: [
      'Motivasyonum düşük',
      'Yorgunum',
      'Başarabileceğime inanmıyorum',
    ],
  };
  return suggestions[feature] || [];
}

export default AIChatContainer;
