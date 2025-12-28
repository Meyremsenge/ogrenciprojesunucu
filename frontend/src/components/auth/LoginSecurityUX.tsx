/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 LOGIN SECURITY UX - Güvenli Giriş Deneyimi
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bu bileşen güvenli login UX öğelerini içerir:
 * - Rate limiting UI
 * - Password strength indicator
 * - Secure password input
 * - Login attempt tracking
 * - Device trust
 * - 2FA support UI
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Shield,
  ShieldCheck,
  Lock,
  Smartphone,
  Mail,
  Clock,
  Info,
  Fingerprint,
  KeyRound,
} from 'lucide-react';

// ============================================================================
// PASSWORD STRENGTH INDICATOR
// ============================================================================

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
  minLength?: number;
  onStrengthChange?: (strength: number, isValid: boolean) => void;
}

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
  weight: number;
}

const defaultRequirements: PasswordRequirement[] = [
  { id: 'length', label: 'En az 8 karakter', test: (p) => p.length >= 8, weight: 1 },
  { id: 'lowercase', label: 'Küçük harf (a-z)', test: (p) => /[a-z]/.test(p), weight: 1 },
  { id: 'uppercase', label: 'Büyük harf (A-Z)', test: (p) => /[A-Z]/.test(p), weight: 1 },
  { id: 'number', label: 'Rakam (0-9)', test: (p) => /\d/.test(p), weight: 1 },
  { id: 'special', label: 'Özel karakter (!@#$%)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), weight: 1 },
];

export function PasswordStrength({
  password,
  showRequirements = true,
  minLength = 8,
  onStrengthChange,
}: PasswordStrengthProps) {
  const requirements = useMemo(() => 
    defaultRequirements.map(req => 
      req.id === 'length' 
        ? { ...req, label: `En az ${minLength} karakter`, test: (p: string) => p.length >= minLength }
        : req
    ),
    [minLength]
  );

  const results = useMemo(() => {
    return requirements.map(req => ({
      ...req,
      passed: req.test(password),
    }));
  }, [password, requirements]);

  const strength = useMemo(() => {
    const passedWeight = results.filter(r => r.passed).reduce((sum, r) => sum + r.weight, 0);
    const totalWeight = requirements.reduce((sum, r) => sum + r.weight, 0);
    return Math.round((passedWeight / totalWeight) * 100);
  }, [results, requirements]);

  const isValid = results.every(r => r.passed);

  useEffect(() => {
    onStrengthChange?.(strength, isValid);
  }, [strength, isValid, onStrengthChange]);

  const getStrengthConfig = () => {
    if (strength === 0) return { label: '', color: 'bg-muted', textColor: 'text-muted-foreground' };
    if (strength < 40) return { label: 'Zayıf', color: 'bg-red-500', textColor: 'text-red-500' };
    if (strength < 70) return { label: 'Orta', color: 'bg-amber-500', textColor: 'text-amber-500' };
    if (strength < 100) return { label: 'Güçlü', color: 'bg-green-500', textColor: 'text-green-500' };
    return { label: 'Çok Güçlü', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
  };

  const config = getStrengthConfig();

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 space-y-3"
    >
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Şifre Güvenliği</span>
          <span className={`font-medium ${config.textColor}`}>{config.label}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strength}%` }}
            transition={{ duration: 0.3 }}
            className={`h-full ${config.color} rounded-full`}
          />
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-2">
          {results.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-2 text-sm ${
                req.passed ? 'text-green-600' : 'text-muted-foreground'
              }`}
            >
              {req.passed ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-muted-foreground/50" />
              )}
              <span>{req.label}</span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// SECURE PASSWORD INPUT
// ============================================================================

interface SecurePasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  autoComplete?: 'new-password' | 'current-password';
  error?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

export function SecurePasswordInput({
  value,
  onChange,
  placeholder = 'Şifrenizi girin',
  showStrength = false,
  autoComplete = 'current-password',
  error,
  disabled,
  id,
  name,
  className = '',
}: SecurePasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-hide password after inactivity
  useEffect(() => {
    if (showPassword) {
      const timeout = setTimeout(() => setShowPassword(false), 30000); // 30 seconds
      return () => clearTimeout(timeout);
    }
  }, [showPassword, value]);

  return (
    <div className={className}>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`
            w-full pl-10 pr-12 py-3 rounded-lg border bg-background
            transition-all duration-200
            placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-destructive focus:ring-destructive/20' : 'border-input'}
          `}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Eye className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-destructive flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </p>
      )}

      <AnimatePresence>
        {showStrength && isFocused && (
          <PasswordStrength password={value} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// RATE LIMIT WARNING
// ============================================================================

interface RateLimitWarningProps {
  attemptsRemaining: number;
  maxAttempts: number;
  lockoutTime?: number; // seconds
  isLocked?: boolean;
}

export function RateLimitWarning({
  attemptsRemaining,
  maxAttempts,
  lockoutTime,
  isLocked = false,
}: RateLimitWarningProps) {
  const [timeRemaining, setTimeRemaining] = useState(lockoutTime || 0);

  useEffect(() => {
    if (isLocked && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, timeRemaining]);

  useEffect(() => {
    if (lockoutTime) {
      setTimeRemaining(lockoutTime);
    }
  }, [lockoutTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (attemptsRemaining >= maxAttempts && !isLocked) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg p-4 ${
        isLocked 
          ? 'bg-destructive/10 border border-destructive/20' 
          : 'bg-amber-500/10 border border-amber-500/20'
      }`}
    >
      <div className="flex items-start gap-3">
        {isLocked ? (
          <Lock className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        )}
        <div>
          {isLocked ? (
            <>
              <h4 className="font-medium text-destructive mb-1">
                Hesabınız Geçici Olarak Kilitlendi
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Çok fazla başarısız giriş denemesi. Güvenliğiniz için hesabınız geçici olarak kilitlendi.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-destructive" />
                <span className="font-mono font-medium text-destructive">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-muted-foreground">sonra tekrar deneyebilirsiniz</span>
              </div>
            </>
          ) : (
            <>
              <h4 className="font-medium text-amber-600 mb-1">
                Dikkat: Kısıtlı Deneme Hakkı
              </h4>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{attemptsRemaining}</span> deneme hakkınız kaldı. 
                Tüm haklar tükendiğinde hesabınız geçici olarak kilitlenecektir.
              </p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// DEVICE TRUST
// ============================================================================

interface DeviceTrustProps {
  deviceName?: string;
  lastLogin?: Date;
  isTrusted?: boolean;
  onTrustDevice?: () => void;
  onDontTrust?: () => void;
}

export function DeviceTrust({
  deviceName = 'Bu Cihaz',
  lastLogin,
  isTrusted = false,
  onTrustDevice,
  onDontTrust,
}: DeviceTrustProps) {
  if (isTrusted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 rounded-lg px-3 py-2">
        <ShieldCheck className="w-4 h-4" />
        <span>Güvenilir cihaz olarak işaretlendi</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted/50 rounded-lg p-4 border border-border"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Fingerprint className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground mb-1">
            Bu Cihazı Hatırlayalım mı?
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Güvenilir cihazlarda bir sonraki girişinizde doğrulama adımını atlayabilirsiniz.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onTrustDevice}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Evet, Güven
            </button>
            <button
              onClick={onDontTrust}
              className="px-3 py-1.5 rounded-md border border-border text-muted-foreground text-sm hover:bg-muted transition-colors"
            >
              Hayır, Güvenme
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// TWO FACTOR AUTH INPUT
// ============================================================================

interface TwoFactorInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
  isLoading?: boolean;
  onComplete?: (code: string) => void;
  method?: 'app' | 'sms' | 'email';
  maskedContact?: string;
}

export function TwoFactorInput({
  value,
  onChange,
  length = 6,
  error,
  isLoading,
  onComplete,
  method = 'app',
  maskedContact,
}: TwoFactorInputProps) {
  const handleChange = (newValue: string) => {
    const cleaned = newValue.replace(/\D/g, '').slice(0, length);
    onChange(cleaned);
    
    if (cleaned.length === length) {
      onComplete?.(cleaned);
    }
  };

  const methodConfig = {
    app: {
      icon: Smartphone,
      title: 'Doğrulama Uygulaması',
      description: 'Doğrulama uygulamanızdaki 6 haneli kodu girin.',
    },
    sms: {
      icon: Smartphone,
      title: 'SMS Doğrulama',
      description: `${maskedContact || 'telefonunuza'} gönderilen kodu girin.`,
    },
    email: {
      icon: Mail,
      title: 'E-posta Doğrulama',
      description: `${maskedContact || 'e-postanıza'} gönderilen kodu girin.`,
    },
  };

  const config = methodConfig[method];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {config.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {config.description}
        </p>
      </div>

      {/* Code Input */}
      <div className="flex justify-center gap-2">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`
              w-12 h-14 rounded-lg border-2 flex items-center justify-center
              text-2xl font-mono font-bold
              transition-colors
              ${value[i] ? 'border-primary bg-primary/5' : 'border-input bg-background'}
              ${error ? 'border-destructive' : ''}
            `}
          >
            {value[i] || ''}
          </div>
        ))}
      </div>

      {/* Hidden actual input */}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isLoading}
        className="sr-only"
        autoFocus
      />

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-destructive flex items-center justify-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Resend */}
      {(method === 'sms' || method === 'email') && (
        <div className="text-center">
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            disabled={isLoading}
          >
            Kodu tekrar gönder
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LOGIN REDIRECT REASON
// ============================================================================

interface LoginRedirectReasonProps {
  reason?: string | null;
}

export function LoginRedirectReason({ reason }: LoginRedirectReasonProps) {
  if (!reason) return null;

  const reasonConfig: Record<string, { icon: typeof Shield; message: string; type: 'info' | 'warning' }> = {
    'token_expired': {
      icon: Clock,
      message: 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.',
      type: 'info',
    },
    'idle_timeout': {
      icon: Clock,
      message: 'Uzun süre işlem yapmadığınız için oturumunuz sonlandırıldı.',
      type: 'info',
    },
    'session_expired': {
      icon: Shield,
      message: 'Güvenlik nedeniyle oturumunuz sonlandırıldı.',
      type: 'info',
    },
    'session_max': {
      icon: Shield,
      message: 'Maksimum oturum süresine ulaşıldı. Lütfen tekrar giriş yapın.',
      type: 'info',
    },
    'unauthorized': {
      icon: Lock,
      message: 'Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.',
      type: 'warning',
    },
    'password_changed': {
      icon: KeyRound,
      message: 'Şifreniz değiştirildi. Lütfen yeni şifrenizle giriş yapın.',
      type: 'info',
    },
    'logout': {
      icon: ShieldCheck,
      message: 'Başarıyla çıkış yaptınız.',
      type: 'info',
    },
  };

  const config = reasonConfig[reason] || {
    icon: Info,
    message: 'Lütfen giriş yapın.',
    type: 'info' as const,
  };

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg p-4 mb-6 ${
        config.type === 'warning'
          ? 'bg-amber-500/10 border border-amber-500/20'
          : 'bg-blue-500/10 border border-blue-500/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 ${
          config.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
        }`} />
        <p className={`text-sm ${
          config.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
        }`}>
          {config.message}
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// SECURE LOGOUT
// ============================================================================

interface SecureLogoutProps {
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SecureLogoutConfirmation({
  onConfirm,
  onCancel,
  isLoading,
}: SecureLogoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-xl shadow-xl max-w-sm w-full p-6 border border-border"
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-amber-500" />
          </div>
          
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Çıkış Yapmak İstiyor musunuz?
          </h3>
          
          <p className="text-muted-foreground mb-6">
            Oturumunuz güvenli bir şekilde sonlandırılacak ve kaydedilmemiş değişiklikler kaybolabilir.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-muted-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Shield className="w-4 h-4" />
                </motion.div>
              ) : (
                <Shield className="w-4 h-4" />
              )}
              Çıkış Yap
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  PasswordStrengthProps,
  SecurePasswordInputProps,
  RateLimitWarningProps,
  DeviceTrustProps,
  TwoFactorInputProps,
  LoginRedirectReasonProps,
  SecureLogoutProps,
};
