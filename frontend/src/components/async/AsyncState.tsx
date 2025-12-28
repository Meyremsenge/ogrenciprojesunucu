/**
 * Async State Components
 * Loading, Error, Empty state yönetimi için reusable components
 */

import { ReactNode, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, WifiOff, ServerOff, Search, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

// ==================== Types ====================

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: AsyncStatus;
  error: Error | null;
}

// ==================== Loading States ====================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)} role="status">
      <div
        className={cn(
          'animate-spin rounded-full border-primary border-t-transparent',
          sizes[size]
        )}
        aria-hidden="true"
      />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <span className="sr-only">{label || 'Yükleniyor...'}</span>
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  label?: string;
  blur?: boolean;
  children: ReactNode;
}

export function LoadingOverlay({ isLoading, label, blur = true, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute inset-0 z-50 flex items-center justify-center bg-background/80',
              blur && 'backdrop-blur-sm'
            )}
          >
            <LoadingSpinner size="lg" label={label} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = 'Sayfa yükleniyor...' }: PageLoaderProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <LoadingSpinner size="xl" label={label} />
    </div>
  );
}

// ==================== Skeleton Loaders ====================

interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 1, className }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('rounded-lg border p-4 space-y-3', className)}>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== Error States ====================

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'default' | 'network' | 'server' | 'notFound';
  className?: string;
}

const errorVariants = {
  default: {
    icon: AlertCircle,
    title: 'Bir hata oluştu',
    message: 'İşlem sırasında beklenmeyen bir hata oluştu.',
  },
  network: {
    icon: WifiOff,
    title: 'Bağlantı hatası',
    message: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
  },
  server: {
    icon: ServerOff,
    title: 'Sunucu hatası',
    message: 'Sunucu geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
  },
  notFound: {
    icon: Search,
    title: 'Bulunamadı',
    message: 'Aradığınız içerik bulunamadı veya silinmiş olabilir.',
  },
};

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Tekrar Dene',
  variant = 'default',
  className,
}: ErrorStateProps) {
  const config = errorVariants[variant];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center py-12 text-center', className)}
      role="alert"
    >
      <div className="mb-4 rounded-full bg-destructive/10 p-4">
        <Icon className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold">{title || config.title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {message || config.message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </motion.div>
  );
}

// ==================== Empty States ====================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center py-12 text-center', className)}
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        {icon || <FolderOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

// ==================== Async Boundary ====================

interface AsyncBoundaryProps<T> {
  status: AsyncStatus;
  data: T | null;
  error?: Error | null;
  onRetry?: () => void;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  emptyComponent?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}

export function AsyncBoundary<T>({
  status,
  data,
  error,
  onRetry,
  loadingComponent,
  errorComponent,
  emptyComponent,
  isEmpty,
  children,
}: AsyncBoundaryProps<T>) {
  // Loading
  if (status === 'loading' || status === 'idle') {
    return <>{loadingComponent || <PageLoader />}</>;
  }

  // Error
  if (status === 'error') {
    return (
      <>
        {errorComponent || (
          <ErrorState
            message={error?.message}
            onRetry={onRetry}
          />
        )}
      </>
    );
  }

  // Empty
  if (data && isEmpty?.(data)) {
    return (
      <>
        {emptyComponent || (
          <EmptyState
            title="Veri bulunamadı"
            description="Henüz gösterilecek veri bulunmuyor."
          />
        )}
      </>
    );
  }

  // Success with data
  if (data) {
    return <>{children(data)}</>;
  }

  // Fallback empty
  return (
    <>
      {emptyComponent || (
        <EmptyState
          title="Veri bulunamadı"
          description="Henüz gösterilecek veri bulunmuyor."
        />
      )}
    </>
  );
}

// ==================== Query State Helpers ====================

/**
 * React Query state'ini AsyncStatus'a çevirir
 */
export function getAsyncStatus(query: {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}): AsyncStatus {
  if (query.isLoading) return 'loading';
  if (query.isError) return 'error';
  if (query.isSuccess) return 'success';
  return 'idle';
}

/**
 * Birden fazla query'nin status'unu birleştirir
 */
export function combineAsyncStatus(...statuses: AsyncStatus[]): AsyncStatus {
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('loading')) return 'loading';
  if (statuses.every((s) => s === 'success')) return 'success';
  return 'idle';
}
