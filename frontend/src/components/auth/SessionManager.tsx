/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 SESSION MANAGER - Oturum Yönetimi ve Güvenlik UX
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bu bileşen kullanıcı oturumunu yönetir:
 * - Token süre takibi ve yenileme
 * - Idle timeout tespiti
 * - Session timeout uyarıları
 * - Güvenli logout
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useCallback, useRef, useState, createContext, useContext, ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, LogOut, RefreshCw, Shield } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface SessionConfig {
  /** Token uyarı süresi (token süresinin dolmasına kaç ms kala uyarı verilecek) */
  tokenWarningTime: number;
  /** Idle timeout süresi (ms) - Kullanıcı inaktif olunca */
  idleTimeout: number;
  /** Idle uyarı süresi (idle timeout'a kaç ms kala uyarı) */
  idleWarningTime: number;
  /** Oturum süresi (ms) - Maksimum oturum süresi */
  sessionMaxAge: number;
  /** Token kontrol aralığı (ms) */
  checkInterval: number;
}

interface SessionState {
  isIdle: boolean;
  isWarning: boolean;
  warningType: 'token' | 'idle' | 'session' | null;
  remainingTime: number;
  lastActivity: number;
}

interface SessionContextType {
  state: SessionState;
  extendSession: () => void;
  resetIdle: () => void;
  forceLogout: (reason?: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: SessionConfig = {
  tokenWarningTime: 5 * 60 * 1000,    // 5 dakika önce uyar
  idleTimeout: 30 * 60 * 1000,         // 30 dakika inaktivite
  idleWarningTime: 5 * 60 * 1000,      // 5 dakika önce uyar
  sessionMaxAge: 8 * 60 * 60 * 1000,   // 8 saat maksimum oturum
  checkInterval: 30 * 1000,            // 30 saniyede bir kontrol
};

// ============================================================================
// CONTEXT
// ============================================================================

const SessionContext = createContext<SessionContextType | null>(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}

// ============================================================================
// SESSION PROVIDER
// ============================================================================

interface SessionProviderProps {
  children: ReactNode;
  config?: Partial<SessionConfig>;
}

export function SessionProvider({ children, config: customConfig }: SessionProviderProps) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const navigate = useNavigate();
  const { isAuthenticated, logout, accessToken } = useAuthStore();
  
  const [state, setState] = useState<SessionState>({
    isIdle: false,
    isWarning: false,
    warningType: null,
    remainingTime: 0,
    lastActivity: Date.now(),
  });

  const sessionStartRef = useRef<number>(Date.now());
  const lastActivityRef = useRef<number>(Date.now());
  const warningDismissedRef = useRef<boolean>(false);

  // Reset idle timer on user activity
  const resetIdle = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningDismissedRef.current = false;
    setState(prev => ({
      ...prev,
      isIdle: false,
      lastActivity: Date.now(),
      ...(prev.warningType === 'idle' ? { isWarning: false, warningType: null } : {}),
    }));
  }, []);

  // Extend session (token refresh)
  const extendSession = useCallback(async () => {
    try {
      // Token refresh API call
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        sessionStartRef.current = Date.now();
        warningDismissedRef.current = false;
        setState(prev => ({
          ...prev,
          isWarning: false,
          warningType: null,
        }));
      } else {
        throw new Error('Token refresh failed');
      }
    } catch {
      // Refresh failed, logout
      forceLogout('token_expired');
    }
  }, []);

  // Force logout with reason
  const forceLogout = useCallback((reason?: string) => {
    logout();
    
    // Clear all storage
    sessionStorage.clear();
    
    // Navigate with reason
    const searchParams = new URLSearchParams();
    if (reason) {
      searchParams.set('reason', reason);
    }
    navigate(`/login?${searchParams.toString()}`);
  }, [logout, navigate]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    // Throttled activity handler
    let lastUpdate = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 1000) { // Throttle to 1 second
        lastUpdate = now;
        resetIdle();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, resetIdle]);

  // Session monitoring
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;
      const sessionAge = now - sessionStartRef.current;

      // Check idle timeout
      if (idleTime >= config.idleTimeout) {
        forceLogout('idle_timeout');
        return;
      }

      // Check session max age
      if (sessionAge >= config.sessionMaxAge) {
        forceLogout('session_expired');
        return;
      }

      // Check for warnings
      if (!warningDismissedRef.current) {
        // Idle warning
        if (idleTime >= config.idleTimeout - config.idleWarningTime) {
          setState(prev => ({
            ...prev,
            isWarning: true,
            warningType: 'idle',
            remainingTime: config.idleTimeout - idleTime,
          }));
        }
        // Session expiry warning
        else if (sessionAge >= config.sessionMaxAge - config.tokenWarningTime) {
          setState(prev => ({
            ...prev,
            isWarning: true,
            warningType: 'session',
            remainingTime: config.sessionMaxAge - sessionAge,
          }));
        }
      }
    };

    const intervalId = setInterval(checkSession, config.checkInterval);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, config, forceLogout]);

  // Parse JWT to check token expiry
  useEffect(() => {
    if (!accessToken) return;

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiry = payload.exp * 1000;
      const now = Date.now();
      const timeToExpiry = expiry - now;

      if (timeToExpiry <= 0) {
        forceLogout('token_expired');
      } else if (timeToExpiry <= config.tokenWarningTime && !warningDismissedRef.current) {
        setState(prev => ({
          ...prev,
          isWarning: true,
          warningType: 'token',
          remainingTime: timeToExpiry,
        }));
      }
    } catch {
      // Invalid token format
      console.error('Invalid token format');
    }
  }, [accessToken, config.tokenWarningTime, forceLogout]);

  const contextValue: SessionContextType = {
    state,
    extendSession,
    resetIdle,
    forceLogout,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
      {isAuthenticated && <SessionWarningModal />}
    </SessionContext.Provider>
  );
}

// ============================================================================
// SESSION WARNING MODAL
// ============================================================================

function SessionWarningModal() {
  const { state, extendSession, forceLogout, resetIdle } = useSession();
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (state.isWarning && state.remainingTime > 0) {
      setCountdown(Math.ceil(state.remainingTime / 1000));
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [state.isWarning, state.remainingTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWarningConfig = () => {
    switch (state.warningType) {
      case 'idle':
        return {
          icon: Clock,
          title: 'Hâlâ Burada mısınız?',
          message: 'Bir süredir işlem yapmadınız. Güvenliğiniz için oturumunuz kapatılacak.',
          actionText: 'Evet, Buradayım',
          action: resetIdle,
        };
      case 'token':
        return {
          icon: RefreshCw,
          title: 'Oturumunuz Sona Eriyor',
          message: 'Güvenlik nedeniyle oturumunuz birazdan sonlanacak.',
          actionText: 'Oturumu Uzat',
          action: extendSession,
        };
      case 'session':
        return {
          icon: Shield,
          title: 'Maksimum Oturum Süresi',
          message: 'Güvenlik politikası gereği maksimum oturum süresine ulaştınız.',
          actionText: 'Yeniden Giriş Yap',
          action: () => forceLogout('session_max'),
        };
      default:
        return null;
    }
  };

  const config = getWarningConfig();
  if (!config || !state.isWarning) return null;

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-border"
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-warning" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-center mb-2">
            {config.title}
          </h2>

          {/* Message */}
          <p className="text-muted-foreground text-center mb-4">
            {config.message}
          </p>

          {/* Countdown */}
          <div className="flex justify-center mb-6">
            <div className="bg-warning/10 rounded-lg px-4 py-2">
              <span className="text-2xl font-mono font-bold text-warning">
                {formatTime(countdown)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => forceLogout()}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Çıkış Yap
            </button>
            <button
              onClick={config.action}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Icon className="w-4 h-4" />
              {config.actionText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SessionContext };
export type { SessionConfig, SessionState, SessionContextType };
