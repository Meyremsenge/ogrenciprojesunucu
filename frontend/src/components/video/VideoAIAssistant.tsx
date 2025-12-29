/**
 * VideoAIAssistant Component
 * 
 * Video izleme sırasında AI danışman paneli.
 * Öğrenci soru sorabilir, konu açıklaması alabilir, quiz yapabilir.
 * 
 * ÖNEMLİ: AI video içeriğini analiz etmez.
 * Sadece video metadata'sından (başlık, açıklama) yardım sağlar.
 */

import React, { useState, useCallback } from 'react';
import { 
  MessageCircle, 
  BookOpen, 
  ListChecks, 
  Brain, 
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Clock,
  CheckCircle2
} from 'lucide-react';
import videoService, { 
  VideoAIAnswer, 
  VideoExplanation, 
  VideoKeyPoints, 
  VideoQuiz,
  ReviewSuggestionsResponse 
} from '../../services/videoService';

// ============================================================================
// Types
// ============================================================================

interface VideoAIAssistantProps {
  /** Video ID */
  videoId: number;
  /** Video başlığı (UI için) */
  videoTitle: string;
  /** Mevcut video zamanı (saniye) */
  currentTimestamp?: number;
  /** Ekstra sınıf */
  className?: string;
  /** Panel kapalı mı başlasın */
  defaultCollapsed?: boolean;
}

type AITab = 'ask' | 'explain' | 'keypoints' | 'quiz' | 'review';

// ============================================================================
// Sub Components
// ============================================================================

const DisclaimerBanner: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
    <span>{text}</span>
  </div>
);

const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
    <span className="ml-2 text-gray-600">AI yanıtı oluşturuluyor...</span>
  </div>
);

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
      ${active 
        ? 'bg-blue-100 text-blue-700' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

// ============================================================================
// Main Component
// ============================================================================

export const VideoAIAssistant: React.FC<VideoAIAssistantProps> = ({
  videoId,
  videoTitle,
  currentTimestamp,
  className = '',
  defaultCollapsed = false
}) => {
  // Panel state
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeTab, setActiveTab] = useState<AITab>('ask');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ask tab state
  const [question, setQuestion] = useState('');
  const [answerHistory, setAnswerHistory] = useState<VideoAIAnswer[]>([]);

  // Other tab results
  const [explanation, setExplanation] = useState<VideoExplanation | null>(null);
  const [keyPoints, setKeyPoints] = useState<VideoKeyPoints | null>(null);
  const [quiz, setQuiz] = useState<VideoQuiz | null>(null);
  const [reviewSuggestions, setReviewSuggestions] = useState<ReviewSuggestionsResponse | null>(null);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleAskQuestion = useCallback(async () => {
    if (!question.trim() || question.length < 5) {
      setError('Soru en az 5 karakter olmalıdır');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const answer = await videoService.askAboutVideo(
        videoId, 
        question.trim(),
        currentTimestamp
      );
      setAnswerHistory(prev => [answer, ...prev]);
      setQuestion('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Soru gönderilemedi';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [videoId, question, currentTimestamp]);

  const handleExplain = useCallback(async (level: 'brief' | 'medium' | 'detailed') => {
    setLoading(true);
    setError(null);

    try {
      const result = await videoService.explainVideoTopic(videoId, level);
      setExplanation(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Açıklama alınamadı';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  const handleGetKeyPoints = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await videoService.getVideoKeyPoints(videoId);
      setKeyPoints(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ana noktalar alınamadı';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  const handleGenerateQuiz = useCallback(async (questionCount: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await videoService.generateVideoQuiz(videoId, questionCount);
      setQuiz(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Quiz oluşturulamadı';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  const handleGetReviewSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await videoService.getVideoReviewSuggestions(videoId);
      setReviewSuggestions(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Tekrar önerileri alınamadı';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderAskTab = () => (
    <div className="space-y-4">
      {/* Soru formu */}
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
          placeholder="Video hakkında soru sorun..."
          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          maxLength={1000}
          disabled={loading}
        />
        <button
          onClick={handleAskQuestion}
          disabled={loading || question.length < 5}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Sor</span>
        </button>
      </div>

      {/* Mevcut timestamp bilgisi */}
      {currentTimestamp !== undefined && currentTimestamp > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>
            Video konumu: {Math.floor(currentTimestamp / 60)}:{String(Math.floor(currentTimestamp % 60)).padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Cevap geçmişi */}
      {answerHistory.length > 0 && (
        <div className="space-y-4 mt-4">
          {answerHistory.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 bg-white">
              <div className="flex items-start gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-blue-500 mt-1" />
                <p className="font-medium text-gray-800">{item.question}</p>
              </div>
              <div className="ml-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" />
                  <p className="text-gray-700 whitespace-pre-wrap">{item.answer}</p>
                </div>
              </div>
              <DisclaimerBanner text={item.disclaimer} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderExplainTab = () => (
    <div className="space-y-4">
      {/* Detay seviyesi seçimi */}
      <div className="flex gap-2">
        <button
          onClick={() => handleExplain('brief')}
          disabled={loading}
          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
        >
          Kısa
        </button>
        <button
          onClick={() => handleExplain('medium')}
          disabled={loading}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
        >
          Orta
        </button>
        <button
          onClick={() => handleExplain('detailed')}
          disabled={loading}
          className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
        >
          Detaylı
        </button>
      </div>

      {/* Açıklama sonucu */}
      {explanation && (
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <h4 className="font-medium text-gray-800">Konu Açıklaması</h4>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {explanation.detail_level === 'brief' ? 'Kısa' : 
               explanation.detail_level === 'medium' ? 'Orta' : 'Detaylı'}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{explanation.explanation}</p>
          <div className="mt-4">
            <DisclaimerBanner text={explanation.disclaimer} />
          </div>
        </div>
      )}
    </div>
  );

  const renderKeyPointsTab = () => (
    <div className="space-y-4">
      <button
        onClick={handleGetKeyPoints}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
      >
        <ListChecks className="w-4 h-4" />
        Ana Noktaları Getir
      </button>

      {keyPoints && (
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-5 h-5 text-green-500" />
            <h4 className="font-medium text-gray-800">Ana Noktalar</h4>
          </div>
          <div className="text-gray-700 whitespace-pre-wrap">{keyPoints.key_points}</div>
          <div className="mt-4">
            <DisclaimerBanner text={keyPoints.disclaimer} />
          </div>
        </div>
      )}
    </div>
  );

  const renderQuizTab = () => (
    <div className="space-y-4">
      {/* Soru sayısı seçimi */}
      <div className="flex gap-2">
        {[3, 5].map(count => (
          <button
            key={count}
            onClick={() => handleGenerateQuiz(count)}
            disabled={loading}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
          >
            {count} Soru
          </button>
        ))}
      </div>

      {/* Quiz sonucu */}
      {quiz && (
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-500" />
            <h4 className="font-medium text-gray-800">Kendinizi Test Edin</h4>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
              Anlık Quiz - Kaydedilmez
            </span>
          </div>
          <div className="text-gray-700 whitespace-pre-wrap">{quiz.quiz}</div>
          <div className="mt-4">
            <DisclaimerBanner text={quiz.disclaimer} />
          </div>
        </div>
      )}
    </div>
  );

  const renderReviewTab = () => (
    <div className="space-y-4">
      <button
        onClick={handleGetReviewSuggestions}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Tekrar Önerilerini Getir
      </button>

      {reviewSuggestions && (
        <div className="space-y-3">
          {reviewSuggestions.suggestions.length === 0 ? (
            <div className="border rounded-lg p-4 bg-green-50 text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Harika! Şu an için tekrar önerisi yok.</span>
            </div>
          ) : (
            reviewSuggestions.suggestions.map((suggestion, index) => (
              <div 
                key={index} 
                className={`border rounded-lg p-4 ${
                  suggestion.priority === 'high' ? 'bg-red-50 border-red-200' :
                  suggestion.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    suggestion.priority === 'high' ? 'bg-red-500' :
                    suggestion.priority === 'medium' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-800">{suggestion.message}</p>
                    {suggestion.video_titles && (
                      <ul className="mt-2 text-sm text-gray-600">
                        {suggestion.video_titles.map((title, i) => (
                          <li key={i}>• {title}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <p className="text-xs text-gray-500">{reviewSuggestions.disclaimer}</p>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={`border rounded-xl bg-white shadow-sm ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-gray-800">AI Yardımcı</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            {videoTitle}
          </span>
        </div>
        <button className="p-1 hover:bg-gray-200 rounded">
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4">
          {/* Ana disclaimer */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <strong>Not:</strong> AI video içeriğini analiz etmez. 
            Yanıtlar video başlığı ve açıklamasına dayalıdır.
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <TabButton
              active={activeTab === 'ask'}
              onClick={() => setActiveTab('ask')}
              icon={<MessageCircle className="w-4 h-4" />}
              label="Soru Sor"
            />
            <TabButton
              active={activeTab === 'explain'}
              onClick={() => setActiveTab('explain')}
              icon={<BookOpen className="w-4 h-4" />}
              label="Açıkla"
            />
            <TabButton
              active={activeTab === 'keypoints'}
              onClick={() => setActiveTab('keypoints')}
              icon={<ListChecks className="w-4 h-4" />}
              label="Ana Noktalar"
            />
            <TabButton
              active={activeTab === 'quiz'}
              onClick={() => setActiveTab('quiz')}
              icon={<Brain className="w-4 h-4" />}
              label="Quiz"
            />
            <TabButton
              active={activeTab === 'review'}
              onClick={() => setActiveTab('review')}
              icon={<RefreshCw className="w-4 h-4" />}
              label="Tekrar"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Tab content */}
          {loading ? (
            <LoadingState />
          ) : (
            <>
              {activeTab === 'ask' && renderAskTab()}
              {activeTab === 'explain' && renderExplainTab()}
              {activeTab === 'keypoints' && renderKeyPointsTab()}
              {activeTab === 'quiz' && renderQuizTab()}
              {activeTab === 'review' && renderReviewTab()}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoAIAssistant;
