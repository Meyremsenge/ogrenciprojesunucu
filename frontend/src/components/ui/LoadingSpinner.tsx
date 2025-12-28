/**
 * LoadingSpinner Component
 * 
 * Yükleniyor animasyonu.
 */

import React from 'react';
import { cn } from '../../lib/utils';

export interface LoadingSpinnerProps {
  /** Boyut */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Özel className */
  className?: string;
  /** Renk */
  color?: 'primary' | 'secondary' | 'white';
  /** Yükleniyor metni */
  text?: string;
  /** Tam ekran overlay */
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4',
};

const colorClasses = {
  primary: 'border-primary-600 border-t-transparent',
  secondary: 'border-gray-600 border-t-transparent',
  white: 'border-white border-t-transparent',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  color = 'primary',
  text,
  fullScreen = false,
}) => {
  const spinnerElement = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full',
          sizeClasses[size],
          colorClasses[color]
        )}
        role="status"
        aria-label="Yükleniyor"
      />
      {text && (
        <span className={cn(
          'text-sm font-medium',
          color === 'white' ? 'text-white' : 'text-gray-600'
        )}>
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

// Skeleton Loading
export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-gray-200',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
};

// Page Loading
export const PageLoading: React.FC<{ message?: string }> = ({ message = 'Yükleniyor...' }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner size="lg" text={message} />
  </div>
);

// Button Loading (inline)
export const ButtonLoading: React.FC<{ className?: string }> = ({ className }) => (
  <LoadingSpinner size="sm" color="white" className={className} />
);

export default LoadingSpinner;
