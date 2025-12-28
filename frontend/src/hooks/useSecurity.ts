/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 SECURITY HOOKS - Güvenlik İşlemleri için Custom Hooks
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bu dosya güvenlik ile ilgili React hook'larını içerir:
 * - useSecureLogout
 * - useTokenRefresh
 * - useIdleDetection
 * - useLoginAttempts
 * - useSecurityEvents
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

// ============================================================================
// USE SECURE LOGOUT
// ============================================================================

interface UseSecureLogoutOptions {
  /** Logout öncesi onay iste */
  confirmLogout?: boolean;
  /** Logout sonrası yönlendirme */
  redirectTo?: string;
  /** Tüm cihazlardan çıkış */
  logoutAllDevices?: boolean;
  /** Logout sebebi */
  reason?: string;
}

export function useSecureLogout(options: UseSecureLogoutOptions = {}) {
  const {
    confirmLogout = false,
    redirectTo = '/login',
    logoutAllDevices = false,
    reason,
  } = options;

  const navigate = useNavigate();
  const { logout: authLogout, accessToken } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const performLogout = useCallback(async () => {
    setIsLoading(true);

    try {
      // Backend logout call
      if (accessToken) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ all_devices: logoutAllDevices }),
        });
      }
    } catch (error) {
      // Logout hataları görmezden gel, yine de çıkış yap
      console.error('Logout error:', error);
    } finally {
      // Clear auth state
      authLogout();

      // Clear all storage
      localStorage.removeItem('auth-storage');
      sessionStorage.clear();

      // Clear cookies (if any)
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });

      setIsLoading(false);

      // Redirect with reason
      const searchParams = new URLSearchParams();
      if (reason) {
        searchParams.set('reason', reason);
      } else {
        searchParams.set('reason', 'logout');
      }
      navigate(`${redirectTo}?${searchParams.toString()}`);
    }
  }, [accessToken, authLogout, logoutAllDevices, navigate, reason, redirectTo]);

  const logout = useCallback(() => {
    if (confirmLogout) {
      setShowConfirmation(true);
    } else {
      performLogout();
    }
  }, [confirmLogout, performLogout]);

  const confirmAndLogout = useCallback(() => {
    setShowConfirmation(false);
    performLogout();
  }, [performLogout]);

  const cancelLogout = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  return {
    logout,
    confirmAndLogout,
    cancelLogout,
    isLoading,
    showConfirmation,
  };
}

// ============================================================================
// USE TOKEN REFRESH
// ============================================================================

interface UseTokenRefreshOptions {
  /** Token yenileme zamanlaması (ms önce) */
  refreshBefore?: number;
  /** Otomatik yenileme */
  autoRefresh?: boolean;
  /** Refresh başarısız olduğunda */
  onRefreshFailed?: () => void;
}

export function useTokenRefresh(options: UseTokenRefreshOptions = {}) {
  const {
    refreshBefore = 5 * 60 * 1000, // 5 dakika önce
    autoRefresh = true,
    onRefreshFailed,
  } = options;

  const { accessToken, refreshToken, setTokens, logout } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const refresh = useCallback(async () => {
    if (!refreshToken || isRefreshing) return false;

    setIsRefreshing(true);

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setTokens(data.access_token, data.refresh_token);
        setLastRefresh(new Date());
        setIsRefreshing(false);
        return true;
      } else {
        throw new Error('Refresh failed');
      }
    } catch (error) {
      setIsRefreshing(false);
      onRefreshFailed?.();
      logout();
      return false;
    }
  }, [refreshToken, isRefreshing, setTokens, onRefreshFailed, logout]);

  // Parse token expiry and schedule refresh
  useEffect(() => {
    if (!accessToken || !autoRefresh) return;

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiry = payload.exp * 1000;
      const now = Date.now();
      const timeToExpiry = expiry - now;
      const refreshTime = timeToExpiry - refreshBefore;

      if (refreshTime > 0) {
        refreshTimeoutRef.current = setTimeout(() => {
          refresh();
        }, refreshTime);
      } else if (timeToExpiry > 0) {
        // Token will expire soon, refresh immediately
        refresh();
      }

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    } catch (error) {
      console.error('Token parsing error:', error);
    }
  }, [accessToken, autoRefresh, refresh, refreshBefore]);

  return {
    refresh,
    isRefreshing,
    lastRefresh,
  };
}

// ============================================================================
// USE IDLE DETECTION
// ============================================================================

interface UseIdleDetectionOptions {
  /** İnaktivite süresi (ms) */
  timeout?: number;
  /** Uyarı süresi (timeout'a kaç ms kala) */
  warningTime?: number;
  /** İnaktif olunca çağrılacak */
  onIdle?: () => void;
  /** Uyarı verilince çağrılacak */
  onWarning?: (remainingTime: number) => void;
  /** Aktif olunca çağrılacak */
  onActive?: () => void;
  /** Dinlenecek eventler */
  events?: string[];
}

export function useIdleDetection(options: UseIdleDetectionOptions = {}) {
  const {
    timeout = 30 * 60 * 1000, // 30 dakika
    warningTime = 5 * 60 * 1000, // 5 dakika önce uyar
    onIdle,
    onWarning,
    onActive,
    events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'],
  } = options;

  const [isIdle, setIsIdle] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeout);
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);

  const resetIdle = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    
    if (isIdle || isWarning) {
      setIsIdle(false);
      setIsWarning(false);
      setRemainingTime(timeout);
      onActive?.();
    }
  }, [isIdle, isWarning, onActive, timeout]);

  // Activity listeners
  useEffect(() => {
    let lastUpdate = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 1000) {
        lastUpdate = now;
        resetIdle();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [events, resetIdle]);

  // Idle detection
  useEffect(() => {
    const checkIdle = () => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;
      const remaining = Math.max(0, timeout - idleTime);
      
      setRemainingTime(remaining);

      if (idleTime >= timeout) {
        setIsIdle(true);
        onIdle?.();
      } else if (idleTime >= timeout - warningTime && !warningShownRef.current) {
        warningShownRef.current = true;
        setIsWarning(true);
        onWarning?.(remaining);
      }
    };

    const intervalId = setInterval(checkIdle, 1000);
    return () => clearInterval(intervalId);
  }, [timeout, warningTime, onIdle, onWarning]);

  return {
    isIdle,
    isWarning,
    remainingTime,
    resetIdle,
    lastActivity: lastActivityRef.current,
  };
}

// ============================================================================
// USE LOGIN ATTEMPTS
// ============================================================================

interface UseLoginAttemptsOptions {
  /** Maksimum deneme sayısı */
  maxAttempts?: number;
  /** Kilitleme süresi (ms) */
  lockoutDuration?: number;
  /** Storage key */
  storageKey?: string;
}

interface LoginAttemptState {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

export function useLoginAttempts(options: UseLoginAttemptsOptions = {}) {
  const {
    maxAttempts = 5,
    lockoutDuration = 15 * 60 * 1000, // 15 dakika
    storageKey = 'login_attempts',
  } = options;

  const [state, setState] = useState<LoginAttemptState>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if lockout has expired
        if (parsed.lockedUntil && parsed.lockedUntil < Date.now()) {
          return { attempts: 0, lastAttempt: 0, lockedUntil: null };
        }
        return parsed;
      }
    } catch {
      // Invalid storage, reset
    }
    return { attempts: 0, lastAttempt: 0, lockedUntil: null };
  });

  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Save to storage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  // Lockout countdown
  useEffect(() => {
    if (state.lockedUntil) {
      const updateRemaining = () => {
        const remaining = Math.max(0, state.lockedUntil! - Date.now());
        setLockoutRemaining(remaining);

        if (remaining === 0) {
          setState(prev => ({ ...prev, attempts: 0, lockedUntil: null }));
        }
      };

      updateRemaining();
      const interval = setInterval(updateRemaining, 1000);
      return () => clearInterval(interval);
    } else {
      setLockoutRemaining(0);
    }
  }, [state.lockedUntil]);

  const recordFailedAttempt = useCallback(() => {
    setState((prev) => {
      const newAttempts = prev.attempts + 1;
      const isLocked = newAttempts >= maxAttempts;

      return {
        attempts: newAttempts,
        lastAttempt: Date.now(),
        lockedUntil: isLocked ? Date.now() + lockoutDuration : null,
      };
    });
  }, [maxAttempts, lockoutDuration]);

  const recordSuccessfulLogin = useCallback(() => {
    setState({ attempts: 0, lastAttempt: 0, lockedUntil: null });
  }, []);

  const reset = useCallback(() => {
    setState({ attempts: 0, lastAttempt: 0, lockedUntil: null });
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    attempts: state.attempts,
    attemptsRemaining: Math.max(0, maxAttempts - state.attempts),
    isLocked: state.lockedUntil !== null && state.lockedUntil > Date.now(),
    lockedUntil: state.lockedUntil,
    lockoutRemaining: Math.ceil(lockoutRemaining / 1000),
    maxAttempts,
    recordFailedAttempt,
    recordSuccessfulLogin,
    reset,
  };
}

// ============================================================================
// USE SECURITY EVENTS
// ============================================================================

type SecurityEventType = 
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'password_change'
  | 'session_expired'
  | 'permission_denied'
  | 'suspicious_activity';

interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  details?: Record<string, unknown>;
  userAgent?: string;
  ip?: string;
}

interface UseSecurityEventsOptions {
  /** Maksimum event sayısı (memory'de tutulacak) */
  maxEvents?: number;
  /** Event gönderme endpoint'i */
  reportEndpoint?: string;
  /** Otomatik raporlama */
  autoReport?: boolean;
}

export function useSecurityEvents(options: UseSecurityEventsOptions = {}) {
  const {
    maxEvents = 100,
    reportEndpoint = '/api/v1/security/events',
    autoReport = true,
  } = options;

  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const { accessToken } = useAuthStore();

  const logEvent = useCallback(
    async (type: SecurityEventType, details?: Record<string, unknown>) => {
      const event: SecurityEvent = {
        type,
        timestamp: new Date(),
        details,
        userAgent: navigator.userAgent,
      };

      setEvents((prev) => {
        const newEvents = [event, ...prev].slice(0, maxEvents);
        return newEvents;
      });

      // Report to backend
      if (autoReport && accessToken) {
        try {
          await fetch(reportEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(event),
          });
        } catch (error) {
          console.error('Failed to report security event:', error);
        }
      }
    },
    [accessToken, autoReport, maxEvents, reportEndpoint]
  );

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const getEventsByType = useCallback(
    (type: SecurityEventType) => {
      return events.filter((e) => e.type === type);
    },
    [events]
  );

  return {
    events,
    logEvent,
    clearEvents,
    getEventsByType,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  UseSecureLogoutOptions,
  UseTokenRefreshOptions,
  UseIdleDetectionOptions,
  UseLoginAttemptsOptions,
  UseSecurityEventsOptions,
  SecurityEventType,
  SecurityEvent,
};
