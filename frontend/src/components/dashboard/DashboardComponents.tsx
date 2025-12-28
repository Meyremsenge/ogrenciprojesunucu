/**
 * Dashboard Components
 * Tüm dashboard'larda kullanılan ortak bileşenler
 */

import { forwardRef, ReactNode, ElementType } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronRight,
  MoreHorizontal,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 METRIC CARD - Ana metrik gösterimi
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  onClick?: () => void;
  delay?: number;
}

const colorVariants = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  changeLabel,
  trend = 'neutral',
  color = 'primary',
  loading = false,
  onClick,
  delay = 0,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-16 h-4" />
        </div>
        <Skeleton className="w-20 h-8 mb-1" />
        <Skeleton className="w-24 h-4" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'bg-card border border-border rounded-xl p-4 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-primary/50 hover:shadow-md'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorVariants[color])}>
          <Icon className="h-5 w-5" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              trend === 'up' && 'bg-green-500/10 text-green-600 dark:text-green-400',
              trend === 'down' && 'bg-red-500/10 text-red-600 dark:text-red-400',
              trend === 'neutral' && 'bg-muted text-muted-foreground'
            )}
          >
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3" />}
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{changeLabel || label}</p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 DASHBOARD SECTION - Kartlı bölüm
// ═══════════════════════════════════════════════════════════════════════════════

export interface DashboardSectionProps {
  title: string;
  icon?: LucideIcon;
  action?: string;
  onAction?: () => void;
  moreMenu?: boolean;
  children: ReactNode;
  className?: string;
  loading?: boolean;
  noPadding?: boolean;
}

export function DashboardSection({
  title,
  icon: Icon,
  action,
  onAction,
  moreMenu = false,
  children,
  className,
  loading = false,
  noPadding = false,
}: DashboardSectionProps) {
  return (
    <div className={cn('bg-card border border-border rounded-xl overflow-hidden', className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          <h2 className="font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {action && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAction}
              className="text-primary hover:text-primary"
            >
              {action}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {moreMenu && (
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className={cn(!noPadding && 'p-5')}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 QUICK ACTION CARD - Hızlı aksiyon kartı
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuickActionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  badge?: string;
}

const actionVariants = {
  default: 'bg-muted hover:bg-muted/80 border-transparent',
  primary: 'bg-primary/10 hover:bg-primary/20 border-primary/20',
  success: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20',
  warning: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20',
};

const actionIconVariants = {
  default: 'bg-background text-foreground',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-500 text-white',
};

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  variant = 'default',
  badge,
}: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 w-full p-4 rounded-xl border transition-all text-left',
        actionVariants[variant]
      )}
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', actionIconVariants[variant])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        {description && <p className="text-sm text-muted-foreground truncate">{description}</p>}
      </div>
      {badge && (
        <span className="absolute top-2 right-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
          {badge}
        </span>
      )}
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 LIST ITEM - Genel liste öğesi
// ═══════════════════════════════════════════════════════════════════════════════

export interface ListItemProps {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  metaLabel?: string;
  status?: 'success' | 'warning' | 'error' | 'info' | 'pending';
  onClick?: () => void;
  action?: ReactNode;
}

const statusColors = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  pending: 'bg-muted-foreground',
};

export function ListItem({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  meta,
  metaLabel,
  status,
  onClick,
  action,
}: ListItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-3 rounded-lg transition-colors',
        onClick && 'cursor-pointer hover:bg-muted'
      )}
      onClick={onClick}
    >
      {Icon && (
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconColor || 'bg-muted')}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      {status && !Icon && (
        <div className={cn('w-2 h-2 rounded-full shrink-0', statusColors[status])} />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {(meta || metaLabel) && (
        <div className="text-right shrink-0">
          {meta && <p className="text-sm font-medium">{meta}</p>}
          {metaLabel && <p className="text-xs text-muted-foreground">{metaLabel}</p>}
        </div>
      )}
      {action}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 PROGRESS INDICATOR - İlerleme göstergesi
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProgressIndicatorProps {
  value: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
}

const progressColors = {
  primary: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

const progressSizes = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressIndicator({
  value,
  label,
  showValue = true,
  size = 'md',
  color = 'primary',
}: ProgressIndicatorProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  return (
    <div className="space-y-1">
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && <span className="font-medium">{clampedValue}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', progressSizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', progressColors[color])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 NOTIFICATION BADGE - Bildirim rozeti
// ═══════════════════════════════════════════════════════════════════════════════

export interface NotificationBadgeProps {
  count: number;
  variant?: 'default' | 'danger' | 'warning';
  max?: number;
}

export function NotificationBadge({
  count,
  variant = 'default',
  max = 99,
}: NotificationBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  const variants = {
    default: 'bg-primary text-primary-foreground',
    danger: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
  };

  return (
    <span className={cn(
      'inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full',
      variants[variant]
    )}>
      {displayCount}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ STATUS BADGE - Durum rozeti
// ═══════════════════════════════════════════════════════════════════════════════

export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'error' | 'draft';
  label?: string;
  pulse?: boolean;
}

const statusBadgeVariants = {
  active: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500', label: 'Aktif' },
  inactive: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground', label: 'Pasif' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500', label: 'Bekliyor' },
  completed: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', label: 'Tamamlandı' },
  error: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', label: 'Hata' },
  draft: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground', label: 'Taslak' },
};

export function StatusBadge({ status, label, pulse = false }: StatusBadgeProps) {
  const config = statusBadgeVariants[status];
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', config.bg, config.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot, pulse && 'animate-pulse')} />
      {label || config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 SCHEDULE ITEM - Program öğesi
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScheduleItemProps {
  time: string;
  title: string;
  type: 'live' | 'exam' | 'assignment' | 'meeting' | 'deadline';
  isNow?: boolean;
  onClick?: () => void;
}

const scheduleTypeColors = {
  live: 'bg-green-500',
  exam: 'bg-orange-500',
  assignment: 'bg-blue-500',
  meeting: 'bg-purple-500',
  deadline: 'bg-red-500',
};

const scheduleTypeLabels = {
  live: 'Canlı Ders',
  exam: 'Sınav',
  assignment: 'Ödev',
  meeting: 'Toplantı',
  deadline: 'Son Tarih',
};

export function ScheduleItem({ time, title, type, isNow = false, onClick }: ScheduleItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-colors',
        isNow && 'bg-primary/5 border border-primary/20',
        onClick && 'cursor-pointer hover:bg-muted'
      )}
      onClick={onClick}
    >
      <span className={cn('text-sm font-mono w-14 shrink-0', isNow ? 'text-primary font-medium' : 'text-muted-foreground')}>
        {time}
      </span>
      <div className={cn('w-2 h-2 rounded-full shrink-0', scheduleTypeColors[type], isNow && 'animate-pulse')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', isNow && 'font-medium')}>{title}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{scheduleTypeLabels[type]}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏆 ACHIEVEMENT BADGE - Başarı rozeti
// ═══════════════════════════════════════════════════════════════════════════════

export interface AchievementBadgeProps {
  emoji: string;
  label: string;
  isNew?: boolean;
}

export function AchievementBadge({ emoji, label, isNew = false }: AchievementBadgeProps) {
  return (
    <div className={cn(
      'relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors',
      isNew && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
    )}>
      <span className="text-lg">{emoji}</span>
      <span className="text-sm font-medium">{label}</span>
      {isNew && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 WELCOME HEADER - Hoş geldin başlığı
// ═══════════════════════════════════════════════════════════════════════════════

export interface WelcomeHeaderProps {
  name: string;
  greeting?: string;
  subtitle?: string;
  avatarUrl?: string;
  actions?: ReactNode;
  variant?: 'default' | 'gradient';
}

export function WelcomeHeader({
  name,
  greeting,
  subtitle,
  avatarUrl,
  actions,
  variant = 'default',
}: WelcomeHeaderProps) {
  const getGreeting = () => {
    if (greeting) return greeting;
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  if (variant === 'gradient') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-2xl p-6 text-white"
      >
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {getGreeting()}, {name}! 👋
              </h1>
              {subtitle && <p className="text-white/80 mt-1">{subtitle}</p>}
            </div>
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={name}
                className="w-12 h-12 rounded-full border-2 border-white/20"
              />
            )}
          </div>
          {actions && <div className="mt-6">{actions}</div>}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {avatarUrl && (
          <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-full" />
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {name}!
          </h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 MINI CHART - Mini grafik
// ═══════════════════════════════════════════════════════════════════════════════

export interface MiniChartProps {
  data: number[];
  height?: number;
  color?: string;
}

export function MiniChart({ data, height = 40, color = 'primary' }: MiniChartProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((value, index) => {
        const barHeight = ((value - min) / range) * 100;
        return (
          <div
            key={index}
            className={cn(
              'flex-1 rounded-t transition-all',
              color === 'primary' && 'bg-primary',
              color === 'success' && 'bg-green-500',
              color === 'warning' && 'bg-yellow-500'
            )}
            style={{ height: `${Math.max(10, barHeight)}%` }}
          />
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  LucideIcon,
};
