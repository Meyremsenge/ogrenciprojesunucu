/**
 * Security UX Patterns - Güvenlik Zafiyeti Doğuran UI Hatalarını Önleme
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * GÜVENLİK ZAFİYETİ YARATAN UI HATALARI VE ÇÖZÜMLERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🔓 ZAFİYET #1: CLICKJACKING VULNERABLE BUTTONS
 *    Problem: Kritik butonlar iframe içinde gizlenip manipüle edilebilir
 *    Çözüm: X-Frame-Options + CSP headers + UI redress detection
 * 
 * 🔓 ZAFİYET #2: SENSITIVE DATA EXPOSURE IN UI
 *    Problem: API key, token gibi hassas veriler DOM'da görünür
 *    Çözüm: Masked display + copy protection + auto-hide
 * 
 * 🔓 ZAFİYET #3: INSECURE DIRECT OBJECT REFERENCE (IDOR) UI
 *    Problem: URL'de ID değiştirilerek başka kullanıcının verisine erişim
 *    Çözüm: Frontend authorization check + backend validation
 * 
 * 🔓 ZAFİYET #4: SESSION HIJACKING INDICATORS
 *    Problem: Kullanıcı hesabının ele geçirildiğini fark edemez
 *    Çözüm: Session monitoring + unusual activity alerts
 * 
 * 🔓 ZAFİYET #5: PHISHING VULNERABLE FORMS
 *    Problem: URL değiştirilerek sahte login sayfasına yönlendirme
 *    Çözüm: Domain verification + security indicators
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Info,
  MapPin,
  Monitor,
  Smartphone,
  Clock,
  LogOut,
  RefreshCw,
  Key,
  Fingerprint,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 SENSITIVE DATA DISPLAY - Hassas Veri Gösterimi
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SensitiveDataField - API key, token gibi hassas verileri güvenli gösterir
 * 
 * Özellikler:
 * - Varsayılan olarak maskelenmiş
 * - Kopyalama butonu
 * - Auto-hide timer
 * - Copy protection (right-click disabled)
 */

interface SensitiveDataFieldProps {
  value: string;
  label?: string;
  maskChar?: string;
  visibleChars?: number; // Baştan/sondan görünür karakter sayısı
  autoHideDelay?: number; // ms, 0 = no auto-hide
  showCopyButton?: boolean;
  onCopy?: () => void;
  className?: string;
}

export function SensitiveDataField({
  value,
  label,
  maskChar = '•',
  visibleChars = 4,
  autoHideDelay = 30000, // 30 saniye
  showCopyButton = true,
  onCopy,
  className,
}: SensitiveDataFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Maskeleme
  const maskedValue = value.length > visibleChars * 2
    ? `${value.slice(0, visibleChars)}${maskChar.repeat(value.length - visibleChars * 2)}${value.slice(-visibleChars)}`
    : maskChar.repeat(value.length);

  // Auto-hide
  useEffect(() => {
    if (isVisible && autoHideDelay > 0) {
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [isVisible, autoHideDelay]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Copy failed');
    }
  };

  // Context menu disabled for security
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="text-sm font-medium flex items-center gap-2">
          <Key className="w-4 h-4 text-muted-foreground" />
          {label}
        </label>
      )}
      
      <div
        className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border font-mono text-sm"
        onContextMenu={handleContextMenu}
      >
        <code className="flex-1 select-none" style={{ userSelect: 'none' }}>
          {isVisible ? value : maskedValue}
        </code>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title={isVisible ? 'Gizle' : 'Göster'}
          >
            {isVisible ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showCopyButton && (
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Kopyala"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      {isVisible && autoHideDelay > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {Math.floor(autoHideDelay / 1000)} saniye içinde otomatik gizlenecek
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 SECURITY STRENGTH INDICATOR - Güvenlik Gücü Göstergesi
// ═══════════════════════════════════════════════════════════════════════════════

interface SecurityStrengthProps {
  strength: 'weak' | 'fair' | 'good' | 'strong';
  label?: string;
  showDetails?: boolean;
  details?: string[];
}

export function SecurityStrength({
  strength,
  label = 'Güvenlik Durumu',
  showDetails = true,
  details = [],
}: SecurityStrengthProps) {
  const strengthConfig = {
    weak: {
      icon: ShieldAlert,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      barColor: 'bg-red-500',
      label: 'Zayıf',
      percentage: 25,
    },
    fair: {
      icon: Shield,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      barColor: 'bg-amber-500',
      label: 'Orta',
      percentage: 50,
    },
    good: {
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      barColor: 'bg-blue-500',
      label: 'İyi',
      percentage: 75,
    },
    strong: {
      icon: ShieldCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      barColor: 'bg-green-500',
      label: 'Güçlü',
      percentage: 100,
    },
  };

  const config = strengthConfig[strength];
  const Icon = config.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full', config.bgColor)}>
          <Icon className={cn('w-4 h-4', config.color)} />
          <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
        </div>
      </div>

      {/* Strength Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full', config.barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${config.percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Details */}
      {showDetails && details.length > 0 && (
        <ul className="space-y-1">
          {details.map((detail, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📍 SESSION MONITOR - Oturum İzleme
// ═══════════════════════════════════════════════════════════════════════════════

interface SessionInfo {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

interface SessionMonitorProps {
  sessions: SessionInfo[];
  onTerminateSession: (sessionId: string) => void;
  onTerminateAllOthers: () => void;
}

export function SessionMonitor({
  sessions,
  onTerminateSession,
  onTerminateAllOthers,
}: SessionMonitorProps) {
  const [confirmingSessionId, setConfirmingSessionId] = useState<string | null>(null);

  const otherSessions = sessions.filter((s) => !s.isCurrent);
  const hasOtherSessions = otherSessions.length > 0;

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('mobile')) {
      return Smartphone;
    }
    return Monitor;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Aktif Oturumlar</h3>
          <p className="text-sm text-muted-foreground">
            {sessions.length} aktif oturum
          </p>
        </div>
        
        {hasOtherSessions && (
          <button
            onClick={onTerminateAllOthers}
            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" />
            Tümünü Sonlandır
          </button>
        )}
      </div>

      {/* Session List */}
      <div className="space-y-3">
        {sessions.map((session) => {
          const DeviceIcon = getDeviceIcon(session.device);
          
          return (
            <motion.div
              key={session.id}
              layout
              className={cn(
                'p-4 rounded-lg border',
                session.isCurrent ? 'bg-green-50 border-green-200' : 'bg-white'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-full',
                    session.isCurrent ? 'bg-green-100' : 'bg-muted'
                  )}>
                    <DeviceIcon className={cn(
                      'w-5 h-5',
                      session.isCurrent ? 'text-green-600' : 'text-muted-foreground'
                    )} />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.device}</span>
                      {session.isCurrent && (
                        <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                          Bu cihaz
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{session.browser}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {session.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.lastActive}
                      </span>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <div>
                    {confirmingSessionId === session.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onTerminateSession(session.id);
                            setConfirmingSessionId(null);
                          }}
                          className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700"
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => setConfirmingSessionId(null)}
                          className="text-xs border px-3 py-1 rounded-lg hover:bg-muted"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingSessionId(session.id)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Sonlandır
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ UNUSUAL ACTIVITY ALERT - Olağandışı Aktivite Uyarısı
// ═══════════════════════════════════════════════════════════════════════════════

interface ActivityAlert {
  id: string;
  type: 'login' | 'location' | 'device' | 'password' | 'permission';
  title: string;
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  actionable?: boolean;
  actions?: {
    label: string;
    onClick: () => void;
    variant: 'primary' | 'secondary' | 'danger';
  }[];
}

interface UnusualActivityAlertProps {
  alerts: ActivityAlert[];
  onDismiss: (alertId: string) => void;
  onDismissAll: () => void;
}

export function UnusualActivityAlert({
  alerts,
  onDismiss,
  onDismissAll,
}: UnusualActivityAlertProps) {
  if (alerts.length === 0) return null;

  const severityConfig = {
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
    },
    critical: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
    },
  };

  const typeIcons = {
    login: Lock,
    location: MapPin,
    device: Monitor,
    password: Key,
    permission: Shield,
  };

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className={cn(
        'p-4 rounded-lg border flex items-center justify-between',
        criticalCount > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-full',
            criticalCount > 0 ? 'bg-red-100' : 'bg-amber-100'
          )}>
            <AlertTriangle className={cn(
              'w-5 h-5',
              criticalCount > 0 ? 'text-red-600' : 'text-amber-600'
            )} />
          </div>
          <div>
            <p className="font-semibold">
              {alerts.length} Güvenlik Uyarısı
            </p>
            {criticalCount > 0 && (
              <p className="text-sm text-red-600">
                {criticalCount} kritik uyarı dikkatinizi bekliyor
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={onDismissAll}
          className="text-sm font-medium hover:underline"
        >
          Tümünü Kapat
        </button>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const TypeIcon = typeIcons[alert.type];
            const SeverityIcon = config.icon;

            return (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={cn('p-4 rounded-lg border', config.bgColor, config.borderColor)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-1">
                      <TypeIcon className={cn('w-4 h-4', config.iconColor)} />
                      <SeverityIcon className={cn('w-4 h-4', config.iconColor)} />
                    </div>
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {alert.timestamp}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    aria-label="Kapat"
                  >
                    ×
                  </button>
                </div>

                {/* Actions */}
                {alert.actions && alert.actions.length > 0 && (
                  <div className="flex gap-2 mt-3 ml-9">
                    {alert.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={action.onClick}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                          action.variant === 'primary' && 'bg-primary text-white hover:bg-primary/90',
                          action.variant === 'secondary' && 'border hover:bg-muted',
                          action.variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700'
                        )}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 SECURE FORM WRAPPER - Güvenli Form Sarmalayıcı
// ═══════════════════════════════════════════════════════════════════════════════

interface SecureFormProps {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  requireHttps?: boolean;
  showSecurityIndicator?: boolean;
  expectedDomain?: string;
}

export function SecureForm({
  children,
  onSubmit,
  requireHttps = true,
  showSecurityIndicator = true,
  expectedDomain,
}: SecureFormProps) {
  const [isSecure, setIsSecure] = useState(true);
  const [securityIssues, setSecurityIssues] = useState<string[]>([]);

  useEffect(() => {
    const issues: string[] = [];

    // HTTPS kontrolü
    if (requireHttps && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      issues.push('Bu sayfa güvenli bağlantı (HTTPS) kullanmıyor');
    }

    // Domain kontrolü
    if (expectedDomain && window.location.hostname !== expectedDomain) {
      issues.push(`Beklenmeyen domain: ${window.location.hostname}`);
    }

    // Iframe kontrolü
    if (window.self !== window.top) {
      issues.push('Bu sayfa bir iframe içinde yükleniyor (clickjacking riski)');
    }

    setSecurityIssues(issues);
    setIsSecure(issues.length === 0);
  }, [requireHttps, expectedDomain]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSecure) {
      console.warn('Form güvenlik kontrolünü geçemedi:', securityIssues);
      // Yine de devam et ama uyar
    }

    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Security Indicator */}
      {showSecurityIndicator && (
        <div className={cn(
          'mb-4 p-3 rounded-lg border flex items-center gap-3',
          isSecure 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        )}>
          {isSecure ? (
            <>
              <Lock className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Güvenli Bağlantı</p>
                <p className="text-sm text-green-600">
                  Verileriniz şifreli olarak iletiliyor
                </p>
              </div>
            </>
          ) : (
            <>
              <Unlock className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Güvenlik Uyarısı</p>
                <ul className="text-sm text-red-600 mt-1 list-disc list-inside">
                  {securityIssues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {children}
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔑 TWO-FACTOR PROMPT - 2FA Prompt
// ═══════════════════════════════════════════════════════════════════════════════

interface TwoFactorPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<boolean>;
  method: 'authenticator' | 'sms' | 'email';
  destination?: string; // Telefon numarası veya email (maskelenmiş)
}

export function TwoFactorPrompt({
  isOpen,
  onClose,
  onVerify,
  method,
  destination,
}: TwoFactorPromptProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const methodLabels = {
    authenticator: 'Authenticator uygulamanızdan kodu girin',
    sms: `${destination || 'Telefonunuza'} gönderilen kodu girin`,
    email: `${destination || 'E-postanıza'} gönderilen kodu girin`,
  };

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Paste handling
      const values = value.slice(0, 6).split('');
      const newCode = [...code];
      values.forEach((v, i) => {
        if (index + i < 6) {
          newCode[index + i] = v;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + values.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      // Auto-focus next
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Lütfen 6 haneli kodu girin');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const success = await onVerify(fullCode);
      if (!success) {
        setError('Geçersiz kod. Lütfen tekrar deneyin.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Doğrulama başarısız. Lütfen tekrar deneyin.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Fingerprint className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">İki Faktörlü Doğrulama</h2>
          <p className="text-muted-foreground mt-2">{methodLabels[method]}</p>
        </div>

        {/* Code Input */}
        <div className="flex justify-center gap-2 mb-6">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={cn(
                'w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg transition-all',
                'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
                error && 'border-red-500 animate-shake'
              )}
              disabled={isVerifying}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="text-center text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
            disabled={isVerifying}
          >
            İptal
          </button>
          <button
            onClick={handleVerify}
            disabled={isVerifying || code.some((d) => !d)}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
              'bg-primary text-white hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Doğrulanıyor...
              </>
            ) : (
              'Doğrula'
            )}
          </button>
        </div>

        {/* Resend */}
        {method !== 'authenticator' && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Kod gelmedi mi?{' '}
            <button className="text-primary hover:underline font-medium">
              Tekrar gönder
            </button>
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
