/**
 * AI Privacy Center Page (Super Admin)
 * 
 * KVKK/GDPR uyumlu AI veri yönetimi sayfası.
 * - Veri silme (Unutulma hakkı)
 * - Veri dışa aktarma (Taşınabilirlik hakkı)
 * - Retention policy yönetimi
 * - Gizlilik politikası görüntüleme
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Trash2,
  Download,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  User,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAIPrivacyPolicy,
  getAIAnonymizationDemo,
  deleteUserAIData,
  exportUserAIData,
  applyAIRetentionPolicy,
} from '@/services/aiAdminService';
import type {
  AIPrivacyPolicy,
  AIAnonymizationDemo,
  AIDataDeletionResult,
  AIDataExport,
  AIRetentionPolicyResult,
} from '@/types/ai-admin';

// =============================================================================
// COMPLIANCE CARD COMPONENT
// =============================================================================

interface ComplianceCardProps {
  regulation: string;
  article: string;
  title: string;
  compliance: boolean;
  measures?: string[];
  endpoint?: string;
}

function ComplianceCard({ regulation, article, title, compliance, measures, endpoint }: ComplianceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      'p-4 rounded-lg border',
      compliance ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted">
              {regulation} {article}
            </span>
            {compliance ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
          <h3 className="font-medium mt-2">{title}</h3>
        </div>
        {(measures || endpoint) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-primary hover:underline"
          >
            {expanded ? 'Gizle' : 'Detay'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t overflow-hidden"
          >
            {measures && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {measures.map((measure, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {measure}
                  </li>
                ))}
              </ul>
            )}
            {endpoint && (
              <p className="text-sm text-muted-foreground mt-2">
                <span className="font-medium">Endpoint:</span>{' '}
                <code className="px-1 py-0.5 rounded bg-muted text-xs">{endpoint}</code>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// DATA DELETION SECTION
// =============================================================================

interface DataDeletionSectionProps {
  onDelete: (userId: number, reason: string) => Promise<AIDataDeletionResult>;
}

function DataDeletionSection({ onDelete }: DataDeletionSectionProps) {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIDataDeletionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!userId || !reason || reason.length < 10) {
      setError('Kullanıcı ID ve en az 10 karakterlik neden gereklidir.');
      return;
    }

    if (!confirm(`${userId} ID'li kullanıcının TÜM AI verilerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await onDelete(Number(userId), reason);
      setResult(res);
      setUserId('');
      setReason('');
    } catch (err: any) {
      setError(err.message || 'Silme işlemi başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 rounded-lg bg-red-500/10 text-red-500">
          <Trash2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Veri Silme (Unutulma Hakkı)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            KVKK Madde 7 / GDPR Article 17 kapsamında kullanıcı verilerini silin
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Kullanıcı ID</label>
            <input
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Örn: 12345"
              className="w-full px-4 py-2 rounded-lg border bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Silme Nedeni <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="KVKK/GDPR kapsamında kullanıcı talebi..."
              className="w-full px-4 py-2 rounded-lg border bg-background"
              minLength={10}
            />
            <p className="text-xs text-muted-foreground mt-1">
              En az 10 karakter (KVKK/GDPR uyumluluk için)
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-sm text-red-500">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Silme işlemi tamamlandı
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
              <div>
                <p className="text-muted-foreground">Silinen Log</p>
                <p className="font-medium">{result.logs_deleted}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Kota Silindi</p>
                <p className="font-medium">{result.quota_deleted ? 'Evet' : 'Hayır'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Silinen İhlal</p>
                <p className="font-medium">{result.violations_deleted}</p>
              </div>
              <div>
                <p className="text-muted-foreground">KVKK/GDPR</p>
                <p className="font-medium text-green-500">Uyumlu ✓</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleDelete}
          disabled={loading || !userId || reason.length < 10}
          className={cn(
            'px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors',
            (loading || !userId || reason.length < 10) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Siliniyor...
            </span>
          ) : (
            'Verileri Sil'
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// DATA EXPORT SECTION
// =============================================================================

interface DataExportSectionProps {
  onExport: (userId: number) => Promise<AIDataExport>;
}

function DataExportSection({ onExport }: DataExportSectionProps) {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIDataExport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!userId) {
      setError('Kullanıcı ID gereklidir.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await onExport(Number(userId));
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Dışa aktarma başarısız');
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_data_export_user_${result.user_id}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
          <Download className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Veri Dışa Aktarma (Taşınabilirlik)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            GDPR Article 20 kapsamında kullanıcı verilerini JSON formatında dışa aktarın
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Kullanıcı ID</label>
            <input
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Örn: 12345"
              className="w-full px-4 py-2 rounded-lg border bg-background"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleExport}
              disabled={loading || !userId}
              className={cn(
                'px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors',
                (loading || !userId) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Verileri Getir'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-sm text-red-500">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">Kullanıcı #{result.user_id}</p>
                <p className="text-sm text-muted-foreground">
                  {result.metadata.total_records} kayıt bulundu
                </p>
              </div>
              <button
                onClick={downloadJson}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                JSON İndir
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-background">
                <p className="text-muted-foreground">Kullanım Logları</p>
                <p className="text-2xl font-bold">{result.data.usage_logs.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-muted-foreground">Kota Geçmişi</p>
                <p className="text-2xl font-bold">{result.data.quota_history.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-background">
                <p className="text-muted-foreground">İhlaller</p>
                <p className="text-2xl font-bold">{result.data.violations.length}</p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
              <p className="font-medium text-yellow-600 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Önemli Not
              </p>
              <p className="text-muted-foreground mt-1">{result.metadata.note}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// RETENTION POLICY SECTION
// =============================================================================

interface RetentionPolicySectionProps {
  onApply: () => Promise<AIRetentionPolicyResult>;
}

function RetentionPolicySection({ onApply }: RetentionPolicySectionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIRetentionPolicyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!confirm('Veri saklama politikasını manuel olarak uygulamak istediğinize emin misiniz? Bu işlem eski verileri silecektir.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await onApply();
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'İşlem başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
          <Clock className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Veri Saklama Politikası</h2>
          <p className="text-sm text-muted-foreground mt-1">
            KVKK/GDPR kapsamında otomatik veri temizleme kuralları
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Policy Rules */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="font-medium">Normal Loglar</p>
            <p className="text-2xl font-bold text-primary">30 gün</p>
            <p className="text-xs text-muted-foreground mt-1">Sonra otomatik silinir</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="font-medium">Hata Logları</p>
            <p className="text-2xl font-bold text-yellow-500">90 gün</p>
            <p className="text-xs text-muted-foreground mt-1">Debug için uzun süre</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="font-medium">Çözülen İhlaller</p>
            <p className="text-2xl font-bold text-red-500">365 gün</p>
            <p className="text-xs text-muted-foreground mt-1">Güvenlik kaydı için</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Bu politika normalde Celery task ile günlük otomatik çalışır. 
            Manuel çalıştırma sadece acil durumlarda gereklidir.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-sm text-red-500">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="font-medium text-green-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Politika başarıyla uygulandı
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
              <div>
                <p className="text-muted-foreground">Silinen Log</p>
                <p className="font-medium">{result.logs_deleted}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Silinen Hata Log</p>
                <p className="font-medium">{result.error_logs_deleted}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Silinen İhlal</p>
                <p className="font-medium">{result.violations_deleted}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Temizlenen Alan</p>
                <p className="font-medium">{result.space_freed_mb.toFixed(2)} MB</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleApply}
          disabled={loading}
          className={cn(
            'px-6 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Uygulanıyor...
            </span>
          ) : (
            'Politikayı Uygula'
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// ANONYMIZATION DEMO SECTION
// =============================================================================

interface AnonymizationDemoSectionProps {
  demo: AIAnonymizationDemo | null;
  onFetch: (userId?: number, ip?: string) => Promise<void>;
}

function AnonymizationDemoSection({ demo, onFetch }: AnonymizationDemoSectionProps) {
  const [testUserId, setTestUserId] = useState('12345');
  const [testIp, setTestIp] = useState('192.168.1.100');

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
          <EyeOff className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Anonimleştirme Demo</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verilerin nasıl anonimleştirildiğini görün
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <input
            type="number"
            value={testUserId}
            onChange={(e) => setTestUserId(e.target.value)}
            placeholder="User ID"
            className="flex-1 px-4 py-2 rounded-lg border bg-background"
          />
          <input
            type="text"
            value={testIp}
            onChange={(e) => setTestIp(e.target.value)}
            placeholder="IP Adresi"
            className="flex-1 px-4 py-2 rounded-lg border bg-background"
          />
          <button
            onClick={() => onFetch(Number(testUserId), testIp)}
            className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
          >
            Test Et
          </button>
        </div>

        {demo && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Original */}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <h3 className="font-medium flex items-center gap-2 text-red-600">
                <Eye className="h-4 w-4" />
                Orijinal (Kaydedilmez)
              </h3>
              <div className="mt-3 space-y-2 text-sm font-mono">
                <p>User ID: {demo.original.user_id}</p>
                <p>IP: {demo.original.ip_address}</p>
                <p>Zaman: {new Date(demo.original.timestamp).toISOString()}</p>
              </div>
            </div>

            {/* Anonymized */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <h3 className="font-medium flex items-center gap-2 text-green-600">
                <EyeOff className="h-4 w-4" />
                Anonimleştirilmiş (Kaydedilir)
              </h3>
              <div className="mt-3 space-y-2 text-sm">
                <p className="truncate">
                  <span className="text-muted-foreground">Günlük Hash:</span>{' '}
                  <code className="text-xs">{demo.anonymized.user_id_daily_hash}</code>
                </p>
                <p>
                  <span className="text-muted-foreground">Maskelenmiş IP:</span>{' '}
                  <code>{demo.anonymized.masked_ip}</code>
                </p>
                <p>
                  <span className="text-muted-foreground">Saat Yuvarlanmış:</span>{' '}
                  <code>{demo.anonymized.truncated_time_hour}</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {demo && (
          <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            <p className="font-medium mb-1">Açıklama:</p>
            <p>{demo.explanation.tr}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function AIPrivacyCenterPage() {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<AIPrivacyPolicy | null>(null);
  const [demo, setDemo] = useState<AIAnonymizationDemo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compliance' | 'operations' | 'demo'>('compliance');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [policyRes, demoRes] = await Promise.all([
          getAIPrivacyPolicy(),
          getAIAnonymizationDemo(),
        ]);
        setPolicy(policyRes);
        setDemo(demoRes);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch demo with custom values
  const fetchDemo = async (userId?: number, ip?: string) => {
    try {
      const res = await getAIAnonymizationDemo({ user_id: userId, ip });
      setDemo(res);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          AI Gizlilik Merkezi
        </h1>
        <p className="text-muted-foreground mt-1">
          KVKK/GDPR uyumlu AI veri yönetimi (Sadece Süper Admin)
        </p>
      </div>

      {/* Warning */}
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-600">Dikkat: Kritik Operasyonlar</p>
          <p className="text-sm text-muted-foreground mt-1">
            Bu sayfadaki işlemler geri alınamaz. Veri silme işlemleri kalıcıdır.
            Tüm işlemler audit log'a kaydedilir.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'compliance', label: 'Uyumluluk', icon: FileText },
          { key: 'operations', label: 'Veri İşlemleri', icon: Lock },
          { key: 'demo', label: 'Anonimleştirme', icon: EyeOff },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'compliance' && policy && (
          <motion.div
            key="compliance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* KVKK Compliance */}
            <div>
              <h2 className="text-lg font-semibold mb-4">KVKK Uyumluluk</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(policy.kvkk_compliance).map(([key, item]) => (
                  <ComplianceCard
                    key={key}
                    regulation="KVKK"
                    article={key.replace('article_', 'Madde ')}
                    title={item.title}
                    compliance={item.compliance}
                    measures={item.measures}
                    endpoint={item.endpoint}
                  />
                ))}
              </div>
            </div>

            {/* GDPR Compliance */}
            <div>
              <h2 className="text-lg font-semibold mb-4">GDPR Uyumluluk</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(policy.gdpr_compliance).map(([key, item]) => (
                  <ComplianceCard
                    key={key}
                    regulation="GDPR"
                    article={key.replace('article_', 'Article ')}
                    title={item.title}
                    compliance={item.compliance}
                    measures={item.measures}
                    endpoint={item.endpoint}
                  />
                ))}
              </div>
            </div>

            {/* What is logged / not logged */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Kaydedilen Veriler
                </h3>
                <ul className="space-y-2">
                  {policy.what_is_logged.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Kaydedilmeyen Veriler
                </h3>
                <ul className="space-y-2">
                  {policy.what_is_NOT_logged.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'operations' && (
          <motion.div
            key="operations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <DataDeletionSection onDelete={(userId, reason) => deleteUserAIData(userId, { user_id: userId, reason })} />
            <DataExportSection onExport={exportUserAIData} />
            <RetentionPolicySection onApply={applyAIRetentionPolicy} />
          </motion.div>
        )}

        {activeTab === 'demo' && (
          <motion.div
            key="demo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AnonymizationDemoSection demo={demo} onFetch={fetchDemo} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
