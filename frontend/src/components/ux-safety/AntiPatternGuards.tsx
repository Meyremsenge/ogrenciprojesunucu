/**
 * UX Anti-Pattern Guards
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * KAÇINILMASI GEREKEN UX ANTI-PATTERN'LERİ VE ÖNLEYİCİ YAPILAR:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🚫 ANTI-PATTERN #1: SILENT FAILURES (Sessiz Hatalar)
 *    Problem: Kullanıcı işlemin başarısız olduğunu anlamaz
 *    Çözüm: Her işlem için mutlaka feedback ver
 * 
 * 🚫 ANTI-PATTERN #2: DESTRUCTIVE ACTIONS WITHOUT CONFIRMATION
 *    Problem: Geri alınamaz işlemler tek tıkla gerçekleşir
 *    Çözüm: Kritik işlemler için çok aşamalı onay
 * 
 * 🚫 ANTI-PATTERN #3: INFINITE LOADING STATES
 *    Problem: Loading spinner sonsuza kadar döner
 *    Çözüm: Timeout ve fallback UI
 * 
 * 🚫 ANTI-PATTERN #4: FORM RESET ON ERROR
 *    Problem: Hata sonrası form verileri kaybolur
 *    Çözüm: State preservation on error
 * 
 * 🚫 ANTI-PATTERN #5: HIDDEN DISABLED STATES
 *    Problem: Neden tıklanamadığı belirsiz
 *    Çözüm: Disabled reason tooltip
 * 
 * 🚫 ANTI-PATTERN #6: DOUBLE SUBMIT
 *    Problem: Aynı form birden fazla gönderilir
 *    Çözüm: Submit lock mechanism
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  HelpCircle,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 ANTI-PATTERN #1: SILENT FAILURE PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FeedbackContext - Her işlem için feedback garantisi
 * 
 * Problem: API çağrıları sessizce başarısız olur, kullanıcı bilgilendirilmez
 * Çözüm: Global feedback sistemi ile her işlem sonucu gösterilir
 */

type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface FeedbackContextValue {
  show: (feedback: Omit<FeedbackMessage, 'id'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
}

interface FeedbackProviderProps {
  children: ReactNode;
  maxVisible?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function FeedbackProvider({
  children,
  maxVisible = 5,
  position = 'top-right',
}: FeedbackProviderProps) {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);

  const show = useCallback((feedback: Omit<FeedbackMessage, 'id'>) => {
    const id = `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = feedback.duration ?? (feedback.type === 'error' ? 8000 : 5000);

    setMessages((prev) => {
      const newMessages = [...prev, { ...feedback, id }];
      // Max visible limit
      if (newMessages.length > maxVisible) {
        return newMessages.slice(-maxVisible);
      }
      return newMessages;
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, duration);
    }
  }, [maxVisible]);

  const showSuccess = useCallback((title: string, message?: string) => {
    show({ type: 'success', title, message });
  }, [show]);

  const showError = useCallback((title: string, message?: string) => {
    show({ type: 'error', title, message, duration: 10000 }); // Error'lar daha uzun
  }, [show]);

  const showWarning = useCallback((title: string, message?: string) => {
    show({ type: 'warning', title, message });
  }, [show]);

  const showInfo = useCallback((title: string, message?: string) => {
    show({ type: 'info', title, message });
  }, [show]);

  const dismiss = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setMessages([]);
  }, []);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const feedbackIcons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const feedbackColors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
  };

  return (
    <FeedbackContext.Provider
      value={{ show, showSuccess, showError, showWarning, showInfo, dismiss, dismissAll }}
    >
      {children}
      
      {/* Feedback Toast Container */}
      <div className={cn('fixed z-50 flex flex-col gap-2', positionClasses[position])}>
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => {
            const Icon = feedbackIcons[msg.type];
            return (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                className={cn(
                  'min-w-[320px] max-w-[420px] p-4 rounded-lg border shadow-lg',
                  feedbackColors[msg.type]
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', iconColors[msg.type])} />
                  <div className="flex-1">
                    <p className="font-medium">{msg.title}</p>
                    {msg.message && (
                      <p className="text-sm opacity-80 mt-1">{msg.message}</p>
                    )}
                    {msg.action && (
                      <button
                        onClick={msg.action.onClick}
                        className="text-sm font-medium underline mt-2 hover:no-underline"
                      >
                        {msg.action.label}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => dismiss(msg.id)}
                    className="p-1 hover:bg-black/10 rounded transition-colors"
                    aria-label="Kapat"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </FeedbackContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⏱️ ANTI-PATTERN #3: INFINITE LOADING PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TimeoutLoader - Sonsuz loading spinner önleme
 * 
 * Problem: API yanıt vermezse spinner sonsuza kadar döner
 * Çözüm: Timeout sonrası retry veya error state göster
 */

interface TimeoutLoaderProps {
  isLoading: boolean;
  timeout?: number; // ms
  onTimeout?: () => void;
  retryable?: boolean;
  onRetry?: () => void;
  children: ReactNode;
  loadingComponent?: ReactNode;
  timeoutComponent?: ReactNode;
}

export function TimeoutLoader({
  isLoading,
  timeout = 30000, // 30 saniye default
  onTimeout,
  retryable = true,
  onRetry,
  children,
  loadingComponent,
  timeoutComponent,
}: TimeoutLoaderProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setHasTimedOut(false);

      timeoutRef.current = setTimeout(() => {
        setHasTimedOut(true);
        onTimeout?.();
      }, timeout);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, timeout, onTimeout]);

  const handleRetry = () => {
    setHasTimedOut(false);
    onRetry?.();
  };

  if (!isLoading && !hasTimedOut) {
    return <>{children}</>;
  }

  if (hasTimedOut) {
    if (timeoutComponent) {
      return <>{timeoutComponent}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Clock className="w-12 h-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">İstek zaman aşımına uğradı</h3>
        <p className="text-muted-foreground mb-4">
          Sunucu yanıt vermedi. Lütfen tekrar deneyin.
        </p>
        {retryable && onRetry && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </button>
        )}
      </div>
    );
  }

  if (loadingComponent) {
    return <>{loadingComponent}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Yükleniyor...</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 ANTI-PATTERN #6: DOUBLE SUBMIT PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useSubmitLock - Çift gönderim önleme hook'u
 * 
 * Problem: Kullanıcı butona birden fazla kez tıklar, form birden fazla gönderilir
 * Çözüm: İlk submit'ten sonra lock, işlem bitene kadar disable
 */

interface UseSubmitLockOptions {
  onSubmit: () => Promise<void> | void;
  lockDuration?: number; // Minimum lock süresi (ms)
  preventDoubleClick?: boolean;
}

interface UseSubmitLockReturn {
  isLocked: boolean;
  handleSubmit: () => Promise<void>;
  reset: () => void;
}

export function useSubmitLock({
  onSubmit,
  lockDuration = 500,
  preventDoubleClick = true,
}: UseSubmitLockOptions): UseSubmitLockReturn {
  const [isLocked, setIsLocked] = useState(false);
  const lastSubmitRef = useRef<number>(0);

  const handleSubmit = useCallback(async () => {
    const now = Date.now();

    // Double click prevention
    if (preventDoubleClick && now - lastSubmitRef.current < lockDuration) {
      return;
    }

    if (isLocked) {
      return;
    }

    lastSubmitRef.current = now;
    setIsLocked(true);

    try {
      await onSubmit();
    } finally {
      // Minimum lock süresini garantile
      const elapsed = Date.now() - now;
      const remaining = lockDuration - elapsed;

      if (remaining > 0) {
        setTimeout(() => setIsLocked(false), remaining);
      } else {
        setIsLocked(false);
      }
    }
  }, [onSubmit, isLocked, lockDuration, preventDoubleClick]);

  const reset = useCallback(() => {
    setIsLocked(false);
    lastSubmitRef.current = 0;
  }, []);

  return { isLocked, handleSubmit, reset };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💡 ANTI-PATTERN #5: DISABLED STATE CLARITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DisabledWithReason - Neden disabled olduğunu açıklayan buton
 * 
 * Problem: Kullanıcı butonu neden tıklayamadığını anlamaz
 * Çözüm: Disabled reason tooltip ile açıklama göster
 */

interface DisabledWithReasonProps {
  disabled: boolean;
  reason?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DisabledWithReason({
  disabled,
  reason,
  children,
  className,
  onClick,
}: DisabledWithReasonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={cn(
          'transition-all',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        onMouseEnter={() => disabled && reason && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-disabled={disabled}
      >
        {children}
      </button>

      <AnimatePresence>
        {showTooltip && reason && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
          >
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg max-w-xs">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="border-8 border-transparent border-t-gray-900" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 ANTI-PATTERN #4: FORM STATE PRESERVATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useFormPersistence - Hata sonrası form verilerini koruma
 * 
 * Problem: API hatası sonrası form verileri sıfırlanır
 * Çözüm: localStorage veya sessionStorage ile state koruma
 */

interface UseFormPersistenceOptions<T> {
  key: string;
  initialValue: T;
  storage?: 'local' | 'session';
  debounceMs?: number;
}

export function useFormPersistence<T>({
  key,
  initialValue,
  storage = 'session',
  debounceMs = 500,
}: UseFormPersistenceOptions<T>) {
  const storageApi = storage === 'local' ? localStorage : sessionStorage;
  const storageKey = `form_persistence_${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = storageApi.getItem(storageKey);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced storage sync
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        storageApi.setItem(storageKey, JSON.stringify(value));
      } catch {
        // Storage full veya diğer hatalar
        console.warn('Form persistence failed');
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, storageKey, storageApi, debounceMs]);

  const clear = useCallback(() => {
    storageApi.removeItem(storageKey);
    setValue(initialValue);
  }, [storageApi, storageKey, initialValue]);

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  return { value, setValue, clear, reset };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ ANTI-PATTERN #2: DESTRUCTIVE ACTION GUARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DestructiveActionGuard - Kritik işlemler için koruma katmanı
 * 
 * Problem: Silme, iptal gibi geri alınamaz işlemler tek tıkla gerçekleşir
 * Çözüm: Onay modalı + bekleme süresi + typing confirmation
 */

interface DestructiveActionGuardProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructiveLevel: 'low' | 'medium' | 'high' | 'critical';
  requireTyping?: boolean; // "SİL" yazmayı gerektir
  typingConfirmation?: string;
  waitSeconds?: number; // Butonun aktif olması için bekleme
  consequences?: string[];
}

export function DestructiveActionGuard({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  destructiveLevel,
  requireTyping = false,
  typingConfirmation = 'SİL',
  waitSeconds = 0,
  consequences = [],
}: DestructiveActionGuardProps) {
  const [countdown, setCountdown] = useState(waitSeconds);
  const [typedValue, setTypedValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && waitSeconds > 0) {
      setCountdown(waitSeconds);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, waitSeconds]);

  useEffect(() => {
    if (isOpen && requireTyping) {
      setTypedValue('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, requireTyping]);

  const canConfirm =
    countdown === 0 &&
    (!requireTyping || typedValue.toUpperCase() === typingConfirmation.toUpperCase());

  const levelConfig = {
    low: {
      icon: Info,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
    },
    medium: {
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
    },
    high: {
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      buttonBg: 'bg-orange-600 hover:bg-orange-700',
    },
    critical: {
      icon: Shield,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      buttonBg: 'bg-red-600 hover:bg-red-700',
    },
  };

  const config = levelConfig[destructiveLevel];
  const Icon = config.icon;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className={cn('p-6', config.bg, config.border, 'border-b')}>
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-full', config.bg)}>
                <Icon className={cn('w-6 h-6', config.color)} />
              </div>
              <h2 className="text-xl font-bold">{title}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-muted-foreground mb-4">{description}</p>

            {/* Consequences */}
            {consequences.length > 0 && (
              <div className={cn('p-4 rounded-lg mb-4', config.bg, config.border, 'border')}>
                <p className="font-medium mb-2">Bu işlem sonucunda:</p>
                <ul className="space-y-1">
                  {consequences.map((consequence, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <XCircle className={cn('w-4 h-4 flex-shrink-0 mt-0.5', config.color)} />
                      <span>{consequence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Typing confirmation */}
            {requireTyping && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Onaylamak için &quot;{typingConfirmation}&quot; yazın:
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={typedValue}
                  onChange={(e) => setTypedValue(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2',
                    typedValue.toUpperCase() === typingConfirmation.toUpperCase()
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-primary'
                  )}
                  placeholder={typingConfirmation}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 pt-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={canConfirm ? onConfirm : undefined}
              disabled={!canConfirm}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg text-white font-medium transition-all',
                canConfirm ? config.buttonBg : 'bg-gray-300 cursor-not-allowed'
              )}
            >
              {countdown > 0 ? (
                <span className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  {countdown}s
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 UNSAVED CHANGES GUARD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useUnsavedChangesGuard - Kaydedilmemiş değişiklik uyarısı
 * 
 * Problem: Kullanıcı formu doldurup sayfadan çıkınca veriler kaybolur
 * Çözüm: Browser beforeunload + custom navigation guard
 */

interface UseUnsavedChangesGuardOptions {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function useUnsavedChangesGuard({
  hasUnsavedChanges,
  message = 'Kaydedilmemiş değişiklikleriniz var. Sayfadan çıkmak istediğinize emin misiniz?',
}: UseUnsavedChangesGuardOptions) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 OPERATION PROGRESS TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * OperationProgress - Uzun süren işlemler için progress gösterimi
 * 
 * Problem: Uzun işlemlerde kullanıcı ne olduğunu bilmez
 * Çözüm: Step-by-step progress indicator
 */

interface OperationStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  errorMessage?: string;
}

interface OperationProgressProps {
  steps: OperationStep[];
  currentStepIndex: number;
  title?: string;
  onCancel?: () => void;
  cancellable?: boolean;
}

export function OperationProgress({
  steps,
  currentStepIndex,
  title = 'İşlem Devam Ediyor',
  onCancel,
  cancellable = false,
}: OperationProgressProps) {
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        {cancellable && onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            İptal Et
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = step.status === 'completed';
          const isError = step.status === 'error';

          return (
            <div key={step.id} className="flex items-center gap-3">
              {/* Status Icon */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                  isCompleted && 'bg-green-100',
                  isError && 'bg-red-100',
                  isActive && 'bg-primary/10',
                  !isCompleted && !isError && !isActive && 'bg-muted'
                )}
              >
                {isCompleted && <CheckCircle className="w-4 h-4 text-green-600" />}
                {isError && <XCircle className="w-4 h-4 text-red-600" />}
                {isActive && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {!isCompleted && !isError && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <p
                  className={cn(
                    'text-sm',
                    isActive && 'font-medium',
                    isCompleted && 'text-muted-foreground',
                    isError && 'text-red-600'
                  )}
                >
                  {step.label}
                </p>
                {isError && step.errorMessage && (
                  <p className="text-xs text-red-500 mt-1">{step.errorMessage}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
