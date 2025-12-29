/**
 * AI Role-Based Components
 * 
 * Her kullanıcı rolü için özelleştirilmiş AI deneyimi.
 * 
 * ROLLER:
 * =======
 * 1. Öğrenci - Öğrenme odaklı, ipucu ve açıklama
 * 2. Öğretmen - İçerik ve soru üretimi, analiz
 * 3. Admin - Kullanım takibi, maliyet analizi
 * 4. Süper Admin - Tam erişim, sistem ayarları
 */

import React from 'react';
import { AIChatContainer } from './AIChat';
import { AIQuotaIndicator, AIQuotaProgress } from './AIQuotaIndicator';
import { AIEmbeddedSection, AIQuestionAssistant } from './AIContextHelpers';
import { AI_COACH_PERSONAS, getRoleBasedPersona } from './AICoachPersona';
import type { 
  UserRole, 
  AIFeatureType, 
  AIContext, 
  AIQuotaStatus,
  AIFeatureAccess,
  RoleBasedAIConfig,
} from '@/types/ai';

// =============================================================================
// ROLE-BASED FEATURE CONFIG
// =============================================================================

export const ROLE_FEATURE_ACCESS: Record<UserRole, AIFeatureAccess> = {
  student: {
    role: 'student',
    features: {
      question_hint: { enabled: true, quotaLimit: 20 },
      topic_explanation: { enabled: true, quotaLimit: 15 },
      study_plan: { enabled: true, quotaLimit: 5 },
      answer_evaluation: { enabled: true, quotaLimit: 10 },
      performance_analysis: { enabled: true, quotaLimit: 3 },
      question_generation: { enabled: false },
      content_enhancement: { enabled: false },
      motivation_message: { enabled: true, quotaLimit: 10 },
    },
    dailyQuota: 30,
    priorityLevel: 1,
  },
  teacher: {
    role: 'teacher',
    features: {
      question_hint: { enabled: true, quotaLimit: 50 },
      topic_explanation: { enabled: true, quotaLimit: 50 },
      study_plan: { enabled: true, quotaLimit: 20 },
      answer_evaluation: { enabled: true, quotaLimit: 50 },
      performance_analysis: { enabled: true, quotaLimit: 20 },
      question_generation: { enabled: true, quotaLimit: 30 },
      content_enhancement: { enabled: true, quotaLimit: 20 },
      motivation_message: { enabled: true, quotaLimit: 20 },
    },
    dailyQuota: 100,
    priorityLevel: 2,
  },
  admin: {
    role: 'admin',
    features: {
      question_hint: { enabled: true, quotaLimit: 100 },
      topic_explanation: { enabled: true, quotaLimit: 100 },
      study_plan: { enabled: true, quotaLimit: 50 },
      answer_evaluation: { enabled: true, quotaLimit: 100 },
      performance_analysis: { enabled: true, quotaLimit: 50 },
      question_generation: { enabled: true, quotaLimit: 50 },
      content_enhancement: { enabled: true, quotaLimit: 50 },
      motivation_message: { enabled: true, quotaLimit: 50 },
    },
    dailyQuota: 200,
    priorityLevel: 3,
  },
  super_admin: {
    role: 'super_admin',
    features: {
      question_hint: { enabled: true, isUnlimited: true },
      topic_explanation: { enabled: true, isUnlimited: true },
      study_plan: { enabled: true, isUnlimited: true },
      answer_evaluation: { enabled: true, isUnlimited: true },
      performance_analysis: { enabled: true, isUnlimited: true },
      question_generation: { enabled: true, isUnlimited: true },
      content_enhancement: { enabled: true, isUnlimited: true },
      motivation_message: { enabled: true, isUnlimited: true },
    },
    dailyQuota: -1, // Unlimited
    priorityLevel: 4,
  },
};

// =============================================================================
// STUDENT AI PANEL
// =============================================================================

interface StudentAIPanelProps {
  quota: AIQuotaStatus;
  context: AIContext;
  onSendMessage: (message: string) => Promise<void>;
  onFeedback: (feedback: any) => void;
}

export const StudentAIPanel: React.FC<StudentAIPanelProps> = ({
  quota,
  context,
  onSendMessage,
  onFeedback,
}) => {
  const persona = getRoleBasedPersona('student');
  const features = ROLE_FEATURE_ACCESS.student.features;

  return (
    <div className="h-full flex flex-col">
      {/* Öğrenci için basitleştirilmiş AI arayüzü */}
      <AIChatContainer
        feature="question_hint"
        context={context}
        persona={persona}
        quota={quota}
        onSendMessage={onSendMessage}
        onFeedback={onFeedback}
        embedded
      />
    </div>
  );
};

// =============================================================================
// TEACHER AI PANEL
// =============================================================================

interface TeacherAIPanelProps {
  quota: AIQuotaStatus;
  context: AIContext;
  onSendMessage: (message: string) => Promise<void>;
  activeTab?: 'chat' | 'generate' | 'analyze';
}

export const TeacherAIPanel: React.FC<TeacherAIPanelProps> = ({
  quota,
  context,
  onSendMessage,
  activeTab = 'chat',
}) => {
  const [tab, setTab] = React.useState(activeTab);
  const persona = getRoleBasedPersona('teacher');

  const tabs = [
    { id: 'chat', label: 'Sohbet', icon: '💬' },
    { id: 'generate', label: 'Soru Üret', icon: '✍️' },
    { id: 'analyze', label: 'Analiz', icon: '📊' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`
              flex-1 px-4 py-3 text-sm font-medium
              flex items-center justify-center gap-2
              transition-colors
              ${tab === t.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'chat' && (
          <AIChatContainer
            feature="topic_explanation"
            context={context}
            persona={persona}
            quota={quota}
            onSendMessage={onSendMessage}
            embedded
          />
        )}
        
        {tab === 'generate' && (
          <TeacherQuestionGenerator context={context} />
        )}
        
        {tab === 'analyze' && (
          <TeacherAnalyticsPanel context={context} />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TEACHER QUESTION GENERATOR
// =============================================================================

interface TeacherQuestionGeneratorProps {
  context: AIContext;
}

const TeacherQuestionGenerator: React.FC<TeacherQuestionGeneratorProps> = ({
  context,
}) => {
  const [subject, setSubject] = React.useState('');
  const [topic, setTopic] = React.useState('');
  const [difficulty, setDifficulty] = React.useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = React.useState(5);
  const [generating, setGenerating] = React.useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    // TODO: API call
    await new Promise(r => setTimeout(r, 2000));
    setGenerating(false);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <span>✍️</span>
        <span>AI Soru Üretici</span>
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Konu
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Örn: Doğrusal Denklemler"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Zorluk
          </label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-medium
                  ${difficulty === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {d === 'easy' ? 'Kolay' : d === 'medium' ? 'Orta' : 'Zor'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Soru Sayısı: {count}
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!topic || generating}
          className="
            w-full px-4 py-2
            bg-gradient-to-r from-blue-600 to-purple-600
            hover:from-blue-700 hover:to-purple-700
            text-white font-medium
            rounded-lg
            disabled:opacity-50
          "
        >
          {generating ? 'Üretiliyor...' : `${count} Soru Üret`}
        </button>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          ⚠️ Üretilen sorular otomatik olarak taslak olarak kaydedilir. 
          Kullanmadan önce mutlaka kontrol edin.
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// TEACHER ANALYTICS PANEL
// =============================================================================

interface TeacherAnalyticsPanelProps {
  context: AIContext;
}

const TeacherAnalyticsPanel: React.FC<TeacherAnalyticsPanelProps> = ({
  context,
}) => {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <span>📊</span>
        <span>AI Performans Analizi</span>
      </h3>

      <div className="space-y-3">
        <AIEmbeddedSection
          feature="performance_analysis"
          context={context}
          title="Sınıf Performans Analizi"
          description="Öğrencilerin genel başarı durumunu analiz et"
          onActivate={() => {}}
        />

        <AIEmbeddedSection
          feature="performance_analysis"
          context={context}
          title="Zayıf Konu Tespiti"
          description="Hangi konularda öğrenciler zorlanıyor?"
          onActivate={() => {}}
        />

        <AIEmbeddedSection
          feature="performance_analysis"
          context={context}
          title="Bireysel Öneriler"
          description="Her öğrenci için kişisel öneriler"
          onActivate={() => {}}
        />
      </div>
    </div>
  );
};

// =============================================================================
// ADMIN AI PANEL
// =============================================================================

interface AdminAIPanelProps {
  systemStats: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    activeUsers: number;
  };
}

export const AdminAIPanel: React.FC<AdminAIPanelProps> = ({
  systemStats,
}) => {
  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span>🎛️</span>
        <span>AI Sistem Durumu</span>
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon="🔄"
          label="Toplam İstek"
          value={systemStats.totalRequests.toLocaleString()}
          trend="+12%"
          trendUp
        />
        <StatCard
          icon="🎫"
          label="Token Kullanımı"
          value={`${(systemStats.totalTokens / 1000000).toFixed(2)}M`}
          trend="+8%"
          trendUp
        />
        <StatCard
          icon="💰"
          label="Tahmini Maliyet"
          value={`$${systemStats.totalCost.toFixed(2)}`}
          trend="+5%"
          trendUp
        />
        <StatCard
          icon="👥"
          label="Aktif Kullanıcı"
          value={systemStats.activeUsers.toString()}
          trend="+15%"
          trendUp
        />
      </div>

      {/* Role Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Rol Bazlı Kullanım
        </h3>
        
        <div className="space-y-3">
          <UsageBar label="Öğrenciler" value={65} color="bg-blue-500" />
          <UsageBar label="Öğretmenler" value={25} color="bg-purple-500" />
          <UsageBar label="Adminler" value={10} color="bg-green-500" />
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
          <span>⚠️</span>
          <span>Dikkat Edilmesi Gerekenler</span>
        </h4>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
          <li>• Günlük bütçenin %80'i kullanıldı</li>
          <li>• 3 öğrenci günlük limitini aştı</li>
          <li>• Matematik konusunda istek yoğunluğu yüksek</li>
        </ul>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  trend,
  trendUp,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      {trend && (
        <span className={`text-xs font-medium ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
  </div>
);

interface UsageBarProps {
  label: string;
  value: number;
  color: string;
}

const UsageBar: React.FC<UsageBarProps> = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <span className="text-gray-500 dark:text-gray-400">{value}%</span>
    </div>
    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

export default StudentAIPanel;
