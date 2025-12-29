/**
 * AI Chat Page
 * ═══════════════════════════════════════════════════════════════════════════════
 * Ana AI sohbet sayfası - Öğrenciler burada AI koçla etkileşime geçer
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Send,
  Sparkles,
  BookOpen,
  Lightbulb,
  HelpCircle,
  Target,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  Bot,
  User,
  Mic,
  Paperclip,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useUser } from '@/stores/authStore';
import { aiService } from '@/services/aiService';

// =============================================================================
// TYPES
// =============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feature?: string;
  feedback?: 'positive' | 'negative';
  isLoading?: boolean;
}

type AIFeature = 'hint' | 'explain' | 'study-plan' | 'question' | 'general';

interface AIFeatureConfig {
  id: AIFeature;
  label: string;
  description: string;
  icon: typeof Sparkles;
  color: string;
  prompt: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AI_FEATURES: AIFeatureConfig[] = [
  {
    id: 'hint',
    label: 'İpucu Al',
    description: 'Soru çözerken yardım al',
    icon: Lightbulb,
    color: 'text-yellow-600 bg-yellow-100',
    prompt: 'Bu soru hakkında bir ipucu verir misin?',
  },
  {
    id: 'explain',
    label: 'Açıklama',
    description: 'Konuyu detaylı öğren',
    icon: BookOpen,
    color: 'text-blue-600 bg-blue-100',
    prompt: 'Bu konuyu bana açıklar mısın?',
  },
  {
    id: 'study-plan',
    label: 'Çalışma Planı',
    description: 'Kişisel plan oluştur',
    icon: Target,
    color: 'text-green-600 bg-green-100',
    prompt: 'Benim için bir çalışma planı oluşturur musun?',
  },
  {
    id: 'question',
    label: 'Soru Sor',
    description: 'Merak ettiklerini sor',
    icon: HelpCircle,
    color: 'text-purple-600 bg-purple-100',
    prompt: '',
  },
];

const INITIAL_GREETING = `Merhaba! 👋 Ben senin AI öğrenme asistanınım. 

Sana şu konularda yardımcı olabilirim:
• 📚 Konuları açıklama
• 💡 Sorularda ipucu verme
• 🎯 Çalışma planı oluşturma
• ❓ Sorularını yanıtlama

Ne hakkında konuşmak istersin?`;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AIChatPage() {
  const user = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'greeting',
      role: 'assistant',
      content: INITIAL_GREETING,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<AIFeature>('general');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // URL'den context al
  const contextTopic = searchParams.get('topic');
  const contextCourse = searchParams.get('course');

  // AI Quota query
  const { data: quotaData } = useQuery({
    queryKey: ['aiQuota'],
    queryFn: () => aiService.getQuota(),
    staleTime: 60000,
  });

  // AI Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await aiService.chat({
        message,
        feature: selectedFeature,
        context: {
          topic: contextTopic || undefined,
          courseId: contextCourse ? parseInt(contextCourse) : undefined,
        },
      });
      return response;
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || data.message || 'Yanıt alınamadı.',
        timestamp: new Date(),
        feature: selectedFeature,
      };
      setMessages((prev) => 
        prev.filter(m => !m.isLoading).concat(assistantMessage)
      );
      setIsTyping(false);
    },
    onError: (error: any) => {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `😔 Bir sorun oluştu: ${error.message || 'Bağlantı hatası'}. Lütfen tekrar dene.`,
        timestamp: new Date(),
      };
      setMessages((prev) => 
        prev.filter(m => !m.isLoading).concat(errorMessage)
      );
      setIsTyping(false);
    },
  });

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsTyping(true);

    chatMutation.mutate(inputValue.trim());
  }, [inputValue, chatMutation]);

  // Handle feature click
  const handleFeatureClick = (feature: AIFeatureConfig) => {
    setSelectedFeature(feature.id);
    if (feature.prompt) {
      setInputValue(feature.prompt);
      inputRef.current?.focus();
    }
  };

  // Handle feedback
  const handleFeedback = (messageId: string, type: 'positive' | 'negative') => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, feedback: type } : m
      )
    );
    // TODO: API'ye geri bildirim gönder
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quota = quotaData?.data;
  const quotaUsed = quota?.used || 0;
  const quotaLimit = quota?.limit || 100;
  const quotaRemaining = quotaLimit - quotaUsed;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">AI Öğrenme Asistanı</h1>
            <p className="text-xs text-muted-foreground">
              Sana öğrenmende yardımcı olmak için buradayım
            </p>
          </div>
        </div>
        
        {/* Quota Indicator */}
        <div className="flex items-center gap-2">
          <Badge variant={quotaRemaining > 10 ? 'secondary' : 'destructive'}>
            <Sparkles className="h-3 w-3 mr-1" />
            {quotaRemaining} hak kaldı
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Feature Quick Actions */}
      <div className="flex gap-2 p-3 border-b bg-muted/30 overflow-x-auto">
        {AI_FEATURES.map((feature) => (
          <button
            key={feature.id}
            onClick={() => handleFeatureClick(feature)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              selectedFeature === feature.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-background hover:bg-muted border'
            )}
          >
            <feature.icon className="h-4 w-4" />
            {feature.label}
          </button>
        ))}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted rounded-tl-sm'
                )}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Düşünüyorum...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Feedback buttons for assistant messages */}
                    {message.role === 'assistant' && !message.isLoading && message.id !== 'greeting' && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-current/10">
                        <span className="text-xs opacity-60">Bu yanıt faydalı mıydı?</span>
                        <button
                          onClick={() => handleFeedback(message.id, 'positive')}
                          className={cn(
                            'p-1 rounded hover:bg-green-100 transition-colors',
                            message.feedback === 'positive' && 'bg-green-100 text-green-600'
                          )}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, 'negative')}
                          className={cn(
                            'p-1 rounded hover:bg-red-100 transition-colors',
                            message.feedback === 'negative' && 'bg-red-100 text-red-600'
                          )}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {message.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bir soru sor veya yardım iste..."
              className="w-full resize-none rounded-xl border bg-muted/50 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px] max-h-[120px]"
              rows={1}
              disabled={chatMutation.isPending}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || chatMutation.isPending}
            className="h-12 w-12 rounded-xl"
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {/* Disclaimer */}
        <p className="text-xs text-center text-muted-foreground mt-2">
          AI yanıtları öğrenme desteği amaçlıdır. Kesin bilgi için öğretmeninize danışın.
        </p>
      </div>
    </div>
  );
}
