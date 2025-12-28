/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 AUTH ERROR BOUNDARY - Yetkilendirme Hata Yönetimi
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bu bileşen yetkilendirme hatalarını zarif bir şekilde yakalar ve yönetir:
 * - 401 Unauthorized
 * - 403 Forbidden
 * - Token hatalar
 * 
 * Kullanıcıyı korkutmadan bilgilendirir.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, AlertCircle, LogIn, ArrowLeft, Home, RefreshCw } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: 'auth' | 'permission' | 'network' | 'unknown';
}

// ============================================================================
// AUTH ERROR BOUNDARY CLASS
// ============================================================================

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    // Determine error type
    let errorType: AuthErrorBoundaryState['errorType'] = 'unknown';
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorType = 'auth';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      errorType = 'permission';
    } else if (error.message.includes('Network') || error.message.includes('fetch')) {
      errorType = 'network';
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    
    // Log error for debugging (not in production)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Auth Error:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <AuthErrorFallback
          errorType={this.state.errorType}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// AUTH ERROR FALLBACK
// ============================================================================

interface AuthErrorFallbackProps {
  errorType: AuthErrorBoundaryState['errorType'];
  onRetry?: () => void;
}

function AuthErrorFallback({ errorType, onRetry }: AuthErrorFallbackProps) {
  const errorConfig = {
    auth: {
      icon: LogIn,
      title: 'Oturumunuz Sonlandı',
      message: 'Güvenliğiniz için oturumunuz sonlandırıldı. Devam etmek için tekrar giriş yapın.',
      primaryAction: { label: 'Giriş Yap', href: '/login' },
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    permission: {
      icon: Lock,
      title: 'Erişim İzni Gerekli',
      message: 'Bu sayfayı görüntülemek için gerekli izinlere sahip değilsiniz. Yetki talep etmek için yöneticinize başvurun.',
      primaryAction: { label: 'Ana Sayfaya Dön', href: '/' },
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    network: {
      icon: AlertCircle,
      title: 'Bağlantı Sorunu',
      message: 'Sunucuya bağlanırken bir sorun oluştu. İnternet bağlantınızı kontrol edin.',
      primaryAction: { label: 'Tekrar Dene', onClick: onRetry },
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    unknown: {
      icon: Shield,
      title: 'Bir Sorun Oluştu',
      message: 'Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya tekrar deneyin.',
      primaryAction: { label: 'Sayfayı Yenile', onClick: () => window.location.reload() },
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  };

  const config = errorConfig[errorType];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className={`w-20 h-20 rounded-full ${config.bgColor} flex items-center justify-center mx-auto mb-6`}
          >
            <Icon className={`w-10 h-10 ${config.color}`} />
          </motion.div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {config.title}
          </h1>

          {/* Message */}
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {config.message}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {'href' in config.primaryAction ? (
              <a
                href={config.primaryAction.href}
                className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Icon className="w-5 h-5" />
                {config.primaryAction.label}
              </a>
            ) : (
              <button
                onClick={config.primaryAction.onClick}
                className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                {config.primaryAction.label}
              </button>
            )}

            <a
              href="/"
              className="w-full px-6 py-3 rounded-lg border border-border text-muted-foreground font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Ana Sayfaya Dön
            </a>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Sorun devam ederse{' '}
          <a href="/support" className="text-primary hover:underline">
            destek ekibiyle iletişime geçin
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ============================================================================
// UNAUTHORIZED PAGE
// ============================================================================

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center"
      >
        {/* Lock Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-8"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Lock className="w-16 h-16 text-amber-500" />
          </motion.div>
        </motion.div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Erişim Yetkisi Gerekli
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Bu sayfayı görüntülemek için yetkiniz bulunmuyor. 
          Yetkili bir hesapla giriş yapın veya yöneticinizden erişim izni isteyin.
        </p>

        {/* Visual Hint */}
        <div className="bg-muted/50 rounded-xl p-4 mb-8 border border-border">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Shield className="w-5 h-5" />
            <span>Bu sayfa korumalı bir alan içindedir</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/login"
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Farklı Hesapla Giriş Yap
          </a>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 rounded-lg border border-border text-muted-foreground font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Geri Dön
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// PERMISSION DENIED INLINE
// ============================================================================

interface PermissionDeniedProps {
  title?: string;
  message?: string;
  requiredPermission?: string;
  showRequestAccess?: boolean;
  onRequestAccess?: () => void;
}

export function PermissionDenied({
  title = 'Erişim Kısıtlı',
  message = 'Bu içeriği görüntülemek için gerekli izinlere sahip değilsiniz.',
  requiredPermission,
  showRequestAccess = false,
  onRequestAccess,
}: PermissionDeniedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-muted/30 rounded-xl border border-border p-8 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-amber-500" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-muted-foreground mb-4">
        {message}
      </p>

      {requiredPermission && (
        <div className="inline-flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm text-muted-foreground mb-4">
          <Shield className="w-4 h-4" />
          Gerekli yetki: <code className="font-mono">{requiredPermission}</code>
        </div>
      )}

      {showRequestAccess && (
        <button
          onClick={onRequestAccess}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Erişim Talep Et
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AuthErrorBoundary;
