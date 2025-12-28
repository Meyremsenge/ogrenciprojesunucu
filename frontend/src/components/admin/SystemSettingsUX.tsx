/**
 * System Settings UX Components
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SİSTEM AYARLARI TASARIM PRENSİPLERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🛡️ HATA YAPMA RİSKİNİ MİNİMİZE ETME:
 *    1. TEHLİKE SEVİYESİ GÖSTERGESİ
 *       - Yeşil: Güvenli değişiklik
 *       - Sarı: Dikkatli olun
 *       - Kırmızı: Kritik ayar
 * 
 *    2. VARSAYILAN DEĞER GÖSTERİMİ
 *       - Her ayarda varsayılan değer belirtilir
 *       - "Varsayılana dön" butonu
 *       - Değişiklik işaretçisi
 * 
 *    3. TEST MODU
 *       - Kritik ayarları uygulamadan test et
 *       - E-posta test gönderimi
 *       - API bağlantı testi
 * 
 *    4. DEĞİŞİKLİK ÖNİZLEME
 *       - Kaydetmeden önce değişiklik özeti
 *       - Etkilenecek alanlar listesi
 *       - Geri alma süresi bilgisi
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Save,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  Mail,
  Clock,
  Lock,
  Unlock,
  RefreshCw,
  TestTube,
  Send,
  Download,
  Upload,
  FileJson,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 AYAR GİRİŞ BİLEŞENLERİ
// ═══════════════════════════════════════════════════════════════════════════════

interface SettingInputProps {
  label: string;
  description?: string;
  value: string | number | boolean;
  defaultValue: string | number | boolean;
  type: 'text' | 'number' | 'toggle' | 'select' | 'password' | 'textarea';
  options?: { value: string; label: string }[];
  dangerLevel?: 'safe' | 'caution' | 'danger';
  onChange: (value: any) => void;
  onTest?: () => void;
  testable?: boolean;
  disabled?: boolean;
}

const dangerConfig = {
  safe: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  caution: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  danger: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

export const SettingInput: React.FC<SettingInputProps> = ({
  label,
  description,
  value,
  defaultValue,
  type,
  options = [],
  dangerLevel = 'safe',
  onChange,
  onTest,
  testable = false,
  disabled = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const isModified = value !== defaultValue;
  const danger = dangerConfig[dangerLevel];
  const DangerIcon = danger.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    onChange(defaultValue);
  };

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all",
      isModified && "ring-2 ring-primary/20 border-primary",
      dangerLevel === 'danger' && "bg-red-50/50"
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <label className="font-medium">{label}</label>
            {dangerLevel !== 'safe' && (
              <div className={cn("p-1 rounded", danger.bg)}>
                <DangerIcon className={cn("w-3 h-3", danger.color)} />
              </div>
            )}
            {isModified && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                Değiştirildi
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {isModified && (
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Varsayılan
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {type === 'text' && (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
          />
        )}

        {type === 'number' && (
          <input
            type="number"
            value={Number(value)}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
          />
        )}

        {type === 'password' && (
          <>
            <div className="flex-1 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={String(value)}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:bg-muted rounded"
                  type="button"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-muted rounded"
                  type="button"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}

        {type === 'textarea' && (
          <textarea
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 min-h-[80px] resize-none"
          />
        )}

        {type === 'select' && (
          <select
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 bg-background"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {type === 'toggle' && (
          <button
            onClick={() => onChange(!value)}
            disabled={disabled}
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors disabled:opacity-50",
              value ? "bg-primary" : "bg-muted"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
              value ? "translate-x-6" : "translate-x-0.5"
            )} />
          </button>
        )}

        {testable && onTest && (
          <button
            onClick={onTest}
            className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            <TestTube className="w-4 h-4" />
            Test
          </button>
        )}
      </div>

      {/* Varsayılan Değer Bilgisi */}
      <div className="mt-2 text-xs text-muted-foreground">
        Varsayılan: <code className="px-1 py-0.5 bg-muted rounded">{String(defaultValue)}</code>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📁 AYAR GRUBU
// ═══════════════════════════════════════════════════════════════════════════════

interface SettingGroupProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string;
}

export const SettingGroup: React.FC<SettingGroupProps> = ({
  title,
  description,
  icon,
  children,
  defaultExpanded = true,
  badge,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div className="text-left">
            <div className="font-semibold flex items-center gap-2">
              {title}
              {badge && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <ChevronDown className={cn("w-5 h-5 transition-transform", isExpanded && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 DEĞİŞİKLİK ÖZETİ
// ═══════════════════════════════════════════════════════════════════════════════

interface SettingChange {
  key: string;
  label: string;
  oldValue: any;
  newValue: any;
  dangerLevel: 'safe' | 'caution' | 'danger';
}

interface ChangeSummaryModalProps {
  isOpen: boolean;
  changes: SettingChange[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const ChangeSummaryModal: React.FC<ChangeSummaryModalProps> = ({
  isOpen,
  changes,
  onConfirm,
  onCancel,
}) => {
  const dangerChanges = changes.filter(c => c.dangerLevel === 'danger');
  const cautionChanges = changes.filter(c => c.dangerLevel === 'caution');
  const safeChanges = changes.filter(c => c.dangerLevel === 'safe');

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-background rounded-xl shadow-xl p-6 max-h-[80vh] overflow-y-auto"
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Değişiklik Özeti
        </h2>

        <p className="text-muted-foreground mb-4">
          {changes.length} ayar değiştirilecek. Kaydetmeden önce gözden geçirin.
        </p>

        {/* Tehlikeli Değişiklikler */}
        {dangerChanges.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-red-600 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Kritik Değişiklikler ({dangerChanges.length})
            </div>
            <div className="space-y-2">
              {dangerChanges.map((change) => (
                <div key={change.key} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="font-medium text-sm">{change.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="line-through">{String(change.oldValue)}</span>
                    <span className="mx-2">→</span>
                    <span className="text-red-600 font-medium">{String(change.newValue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dikkat Gereken Değişiklikler */}
        {cautionChanges.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-amber-600 font-medium mb-2">
              <AlertCircle className="w-4 h-4" />
              Dikkat Gereken ({cautionChanges.length})
            </div>
            <div className="space-y-2">
              {cautionChanges.map((change) => (
                <div key={change.key} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="font-medium text-sm">{change.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="line-through">{String(change.oldValue)}</span>
                    <span className="mx-2">→</span>
                    <span className="text-amber-600 font-medium">{String(change.newValue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Güvenli Değişiklikler */}
        {safeChanges.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-green-600 font-medium mb-2">
              <CheckCircle className="w-4 h-4" />
              Güvenli Değişiklikler ({safeChanges.length})
            </div>
            <div className="space-y-2">
              {safeChanges.map((change) => (
                <div key={change.key} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium text-sm">{change.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="line-through">{String(change.oldValue)}</span>
                    <span className="mx-2">→</span>
                    <span className="text-green-600 font-medium">{String(change.newValue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uyarı */}
        {dangerChanges.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">
                Kritik ayarlar değiştiriliyor. Bu değişiklikler sistemi etkileyebilir.
                Değişiklikler 24 saat içinde geri alınabilir.
              </p>
            </div>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
              dangerChanges.length > 0
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 TEST SONUÇ PANELİ
// ═══════════════════════════════════════════════════════════════════════════════

interface TestResultProps {
  testName: string;
  status: 'running' | 'success' | 'error';
  message?: string;
  details?: string[];
  onRetry?: () => void;
}

export const TestResult: React.FC<TestResultProps> = ({
  testName,
  status,
  message,
  details,
  onRetry,
}) => {
  const statusConfig = {
    running: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    error: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className={cn("p-4 rounded-lg border", config.bg, config.border)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={cn(
            "w-5 h-5",
            config.color,
            status === 'running' && "animate-spin"
          )} />
          <div>
            <div className="font-medium">{testName}</div>
            {message && (
              <p className={cn("text-sm mt-0.5", config.color)}>{message}</p>
            )}
          </div>
        </div>
        {status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Tekrar Dene
          </button>
        )}
      </div>

      {details && details.length > 0 && (
        <div className="mt-3 pl-8 space-y-1">
          {details.map((detail, index) => (
            <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
              {detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📧 E-POSTA TEST MODAL
// ═══════════════════════════════════════════════════════════════════════════════

interface EmailTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => Promise<boolean>;
}

export const EmailTestModal: React.FC<EmailTestModalProps> = ({
  isOpen,
  onClose,
  onSend,
}) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSend = async () => {
    setStatus('sending');
    setError('');
    try {
      const success = await onSend(email);
      setStatus(success ? 'success' : 'error');
      if (!success) setError('E-posta gönderilemedi');
    } catch (err) {
      setStatus('error');
      setError('Bir hata oluştu');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-background rounded-xl shadow-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold">E-posta Test Gönderimi</h2>
            <p className="text-sm text-muted-foreground">SMTP ayarlarını test edin</p>
          </div>
        </div>

        {status === 'success' ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-800">Test e-postası gönderildi!</p>
            <p className="text-sm text-green-600 mt-1">Gelen kutunuzu kontrol edin</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Test E-posta Adresi</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {status === 'error' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            {status === 'success' ? 'Kapat' : 'İptal'}
          </button>
          {status !== 'success' && (
            <button
              onClick={handleSend}
              disabled={!email || status === 'sending'}
              className={(email && status !== 'sending')
                ? "flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                : "flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-muted text-muted-foreground cursor-not-allowed"
              }
            >
              {status === 'sending' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Test Gönder
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📥 AYAR İMPORT/EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

interface SettingsBackupProps {
  onExport: () => void;
  onImport: (file: File) => void;
  lastBackup?: string;
}

export const SettingsBackup: React.FC<SettingsBackupProps> = ({
  onExport,
  onImport,
  lastBackup,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImport(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="p-6 border rounded-xl bg-muted/20">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <FileJson className="w-5 h-5" />
        Ayar Yedekleme
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export */}
        <div className="p-4 border rounded-lg bg-background">
          <div className="flex items-center gap-3 mb-3">
            <Download className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium">Ayarları Dışa Aktar</div>
              {lastBackup && (
                <p className="text-xs text-muted-foreground">Son: {lastBackup}</p>
              )}
            </div>
          </div>
          <button
            onClick={onExport}
            className="w-full py-2 border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
          >
            JSON Olarak İndir
          </button>
        </div>

        {/* Import */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "p-4 border-2 border-dashed rounded-lg transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20"
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <div className="font-medium">Ayarları İçe Aktar</div>
          </div>
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
            className="hidden"
            id="settings-import"
          />
          <label
            htmlFor="settings-import"
            className="block w-full py-2 border rounded-lg hover:bg-muted transition-colors text-sm font-medium text-center cursor-pointer"
          >
            JSON Dosyası Seç
          </label>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Ayarları içe aktarmak mevcut ayarların üzerine yazacaktır. 
            Önce mevcut ayarlarınızı yedeklemeniz önerilir.
          </p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 SİSTEM SAĞLIK DURUMU
// ═══════════════════════════════════════════════════════════════════════════════

interface SystemHealthProps {
  services: {
    name: string;
    status: 'healthy' | 'warning' | 'error';
    latency?: number;
    uptime?: string;
  }[];
  onRefresh: () => void;
  lastUpdated: string;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({
  services,
  onRefresh,
  lastUpdated,
}) => {
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const warningCount = services.filter(s => s.status === 'warning').length;
  const errorCount = services.filter(s => s.status === 'error').length;

  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    warning: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
    error: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  };

  return (
    <div className="p-6 border rounded-xl bg-background">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Sistem Durumu
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Son: {lastUpdated}</span>
          <button
            onClick={onRefresh}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 bg-green-50 rounded-lg text-center">
          <div className="text-xl font-bold text-green-600">{healthyCount}</div>
          <div className="text-xs text-green-600">Sağlıklı</div>
        </div>
        <div className="p-2 bg-amber-50 rounded-lg text-center">
          <div className="text-xl font-bold text-amber-600">{warningCount}</div>
          <div className="text-xs text-amber-600">Uyarı</div>
        </div>
        <div className="p-2 bg-red-50 rounded-lg text-center">
          <div className="text-xl font-bold text-red-600">{errorCount}</div>
          <div className="text-xs text-red-600">Hata</div>
        </div>
      </div>

      {/* Servisler */}
      <div className="space-y-2">
        {services.map((service, index) => {
          const config = statusConfig[service.status];
          const StatusIcon = config.icon;

          return (
            <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", config.bg)}>
                  <StatusIcon className={cn("w-3 h-3", config.color)} />
                </div>
                <span className="font-medium text-sm">{service.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {service.latency && <span>{service.latency}ms</span>}
                {service.uptime && <span>{service.uptime}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 BAKIM MODU
// ═══════════════════════════════════════════════════════════════════════════════

interface MaintenanceModeProps {
  isEnabled: boolean;
  scheduledEnd?: string;
  message: string;
  onToggle: () => void;
  onMessageChange: (message: string) => void;
}

export const MaintenanceMode: React.FC<MaintenanceModeProps> = ({
  isEnabled,
  scheduledEnd,
  message,
  onToggle,
  onMessageChange,
}) => {
  return (
    <div className={cn(
      "p-6 rounded-xl border-2 transition-all",
      isEnabled ? "border-red-500 bg-red-50" : "border-muted"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            isEnabled ? "bg-red-100" : "bg-muted"
          )}>
            {isEnabled ? (
              <Lock className="w-6 h-6 text-red-600" />
            ) : (
              <Unlock className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">Bakım Modu</h3>
            <p className={cn(
              "text-sm",
              isEnabled ? "text-red-600" : "text-muted-foreground"
            )}>
              {isEnabled ? "Sistem bakım modunda" : "Sistem normal çalışıyor"}
            </p>
          </div>
        </div>

        <button
          onClick={onToggle}
          className={cn(
            "relative w-14 h-7 rounded-full transition-colors",
            isEnabled ? "bg-red-500" : "bg-muted"
          )}
        >
          <div className={cn(
            "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform",
            isEnabled ? "translate-x-7" : "translate-x-0.5"
          )} />
        </button>
      </div>

      {isEnabled && (
        <div className="space-y-4">
          {scheduledEnd && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <Clock className="w-4 h-4" />
              Planlanan bitiş: {scheduledEnd}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Bakım Mesajı</label>
            <textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Kullanıcılara gösterilecek mesaj..."
              className="w-full px-3 py-2 border rounded-lg resize-none h-20 focus:ring-2 focus:ring-red-200 focus:border-red-500"
            />
          </div>

          <div className="p-3 bg-white border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                Bakım modunda kullanıcılar sisteme erişemez. 
                Sadece Süper Admin yetkisiyle giriş yapılabilir.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
