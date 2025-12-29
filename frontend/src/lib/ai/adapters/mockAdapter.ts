/**
 * Mock Adapter - Development & Testing
 * 
 * Geliştirme ve test için mock AI servisi.
 * Backend olmadan frontend geliştirmek için kullanılır.
 */

import { BaseAIService, type AIServiceResponse } from '../services/aiService';
import type {
  AIFeatureType,
  AIContext,
  AIChatMessage,
  AIQuotaStatus,
  AIFeedback,
} from '@/types/ai';

// =============================================================================
// MOCK RESPONSES
// =============================================================================

const MOCK_RESPONSES: Record<AIFeatureType, string[]> = {
  question_hint: [
    'Bu soruyu çözmek için önce verilenleri listele. Hangi değişkenler var?',
    'Formülü hatırla: Bu tür sorularda temel ilkeyi düşün.',
    'Adım adım ilerle. İlk olarak birim dönüşümü gerekiyor mu?',
  ],
  topic_explanation: [
    'Bu konuyu basitçe anlatayım. Temel prensip şudur...',
    'Günlük hayattan bir örnek vereyim. Düşün ki...',
    'Bu kavramı anlamanın en kolay yolu şöyle bakmak...',
  ],
  study_plan: [
    'Senin için kişisel bir plan hazırlıyorum. Öncelikle güçlü ve zayıf yönlerini değerlendirelim.',
    'Hedefine göre şu şekilde bir program öneriyorum...',
    'Günlük 2 saat çalışmayla bu konuları şu sırayla ilerleyebilirsin.',
  ],
  answer_evaluation: [
    'Cevabını inceledim. Doğru yoldasın ama şu noktayı gözden kaçırmışsın...',
    'Güzel bir yaklaşım! Ancak bu kısımda alternatif bir yöntem daha etkili olabilirdi.',
    'Çözümün mantıklı. Sadece son adımda bir işlem hatası var.',
  ],
  performance_analysis: [
    'Son performansına baktığımda şu güçlü yönlerini görüyorum...',
    'Geliştirmen gereken alanlar ve bunlar için önerilerim...',
    'Geçen haftaya göre %15 iyileşme göstermişsin. Tebrikler!',
  ],
  question_generation: [
    'Bu konu için 5 farklı zorluk seviyesinde soru hazırladım.',
    'İşte öğrencilerin en çok zorlandığı konulara göre sorular.',
    'Çoktan seçmeli ve açık uçlu sorular hazırlandı.',
  ],
  content_enhancement: [
    'İçeriğinizi zenginleştirmek için şu önerilerim var...',
    'Görsel materyaller eklenebilir. Örneğin...',
    'Etkileşimli alıştırmalar bu konuyu pekiştirebilir.',
  ],
  motivation_message: [
    '💪 Harika gidiyorsun! Her gün biraz daha ilerliyorsun.',
    '🌟 Zorluklardan öğrenmek seni güçlendiriyor. Devam et!',
    '🎯 Hedefine bir adım daha yaklaştın. Bu tempoyu koru!',
  ],
};

const MOCK_HINTS: Record<1 | 2 | 3, string[]> = {
  1: [
    'Bu problemde hangi temel kavram kullanılıyor?',
    'Verilenleri dikkatlice oku ve ne sorulduğunu belirle.',
    'Benzer bir problemi daha önce çözdün mü?',
  ],
  2: [
    'Şu formülü kullanmayı düşün: temel ilkeyi hatırla.',
    'Problemi küçük adımlara böl. İlk adımda ne yapmalısın?',
    'Değişkenler arasındaki ilişkiyi bulmaya çalış.',
  ],
  3: [
    'Adım 1: Verilenleri listele ve sembollere dönüştür.\nAdım 2: Uygun formülü seç.\nAdım 3: Değerleri yerleştir.',
    'Bu tür problemlerde genellikle şu yaklaşım işe yarar...',
    'Çözüm yolu: Önce X\'i bul, sonra Y\'yi hesapla, son olarak sonuca ulaş.',
  ],
};

// =============================================================================
// MOCK ADAPTER
// =============================================================================

export class MockAdapter extends BaseAIService {
  private delay: number;
  private quotaUsed: number = 0;
  private quotaLimit: number = 30;
  
  constructor(options: { delay?: number; quotaLimit?: number } = {}) {
    super();
    this.delay = options.delay ?? 800;
    this.quotaLimit = options.quotaLimit ?? 30;
  }
  
  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
  }
  
  private getRandomResponse(responses: string[]): string {
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  async sendMessage(
    feature: AIFeatureType,
    message: string,
    context: AIContext
  ): Promise<AIServiceResponse<AIChatMessage>> {
    this.emit('message:sent', { feature, message });
    
    await this.simulateDelay();
    
    // Check quota
    if (this.quotaUsed >= this.quotaLimit) {
      this.emit('quota:exceeded');
      return {
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'Daily quota exceeded',
          userMessage: 'Günlük kullanım limitine ulaştın. Yarın tekrar dene!',
          retryable: false,
        },
      };
    }
    
    this.quotaUsed++;
    
    const responses = MOCK_RESPONSES[feature] || MOCK_RESPONSES.topic_explanation;
    const responseContent = this.getRandomResponse(responses);
    
    const aiMessage: AIChatMessage = {
      id: `mock-${Date.now()}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
      metadata: {
        feature,
        tokens: Math.floor(Math.random() * 200) + 50,
        confidence: 0.75 + Math.random() * 0.2,
      },
    };
    
    this.emit('message:received', aiMessage);
    
    return {
      success: true,
      data: aiMessage,
      metadata: {
        tokensUsed: aiMessage.metadata?.tokens,
        cached: false,
        latency: this.delay,
      },
    };
  }
  
  async streamMessage(
    feature: AIFeatureType,
    message: string,
    context: AIContext,
    onChunk: (chunk: string) => void
  ): Promise<AIServiceResponse<AIChatMessage>> {
    this.emit('stream:start', { feature, message });
    
    // Check quota
    if (this.quotaUsed >= this.quotaLimit) {
      this.emit('quota:exceeded');
      return {
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'Daily quota exceeded',
          userMessage: 'Günlük kullanım limitine ulaştın.',
          retryable: false,
        },
      };
    }
    
    this.quotaUsed++;
    
    const responses = MOCK_RESPONSES[feature] || MOCK_RESPONSES.topic_explanation;
    const fullContent = this.getRandomResponse(responses);
    
    // Simulate streaming
    const words = fullContent.split(' ');
    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 50));
      onChunk(word + ' ');
      this.emit('stream:chunk', { chunk: word });
    }
    
    this.emit('stream:end', { fullContent });
    
    return {
      success: true,
      data: {
        id: `mock-stream-${Date.now()}`,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        metadata: { feature, isStreaming: false },
      },
    };
  }
  
  async getHint(
    level: 1 | 2 | 3,
    context: AIContext
  ): Promise<AIServiceResponse<string>> {
    await this.simulateDelay();
    
    if (this.quotaUsed >= this.quotaLimit) {
      return {
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'Quota exceeded',
          userMessage: 'Günlük ipucu limitine ulaştın.',
          retryable: false,
        },
      };
    }
    
    this.quotaUsed++;
    
    return {
      success: true,
      data: this.getRandomResponse(MOCK_HINTS[level]),
    };
  }
  
  async getQuota(): Promise<AIServiceResponse<AIQuotaStatus>> {
    const quota: AIQuotaStatus = {
      feature: 'question_hint',
      used: this.quotaUsed,
      limit: this.quotaLimit,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      unit: 'requests',
      isUnlimited: false,
    };
    
    this.emit('quota:updated', quota);
    
    return {
      success: true,
      data: quota,
    };
  }
  
  async submitFeedback(feedback: AIFeedback): Promise<AIServiceResponse<void>> {
    await this.simulateDelay();
    console.log('[MockAdapter] Feedback submitted:', feedback);
    return { success: true };
  }
  
  async checkHealth(): Promise<boolean> {
    return true;
  }
  
  // Test helpers
  resetQuota(): void {
    this.quotaUsed = 0;
  }
  
  setQuotaLimit(limit: number): void {
    this.quotaLimit = limit;
  }
}
