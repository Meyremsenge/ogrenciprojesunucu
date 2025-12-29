/**
 * Icon System
 * Tutarlı icon kullanımı için wrapper component ve utilities
 */

import { forwardRef, type SVGAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  // Navigation
  Home,
  Menu,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  MoreHorizontal,
  MoreVertical,
  
  // Actions
  Plus,
  Minus,
  X,
  Check,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Share,
  Search,
  Filter,
  RefreshCw,
  Settings,
  Save,
  
  // User & Auth
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  LogIn,
  LogOut,
  Lock,
  Unlock,
  Key,
  Shield,
  ShieldCheck,
  
  // Content
  File,
  FileText,
  Folder,
  FolderOpen,
  Image,
  Video,
  Music,
  BookOpen,
  Bookmark,
  
  // Communication
  Mail,
  MessageSquare,
  Bell,
  BellOff,
  Phone,
  Send,
  
  // Status & Alerts
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  
  // Media Controls
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  
  // UI
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Award,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart,
  PieChart,
  Activity,
  
  // Device & Tech
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
  Cloud,
  Database,
  Server,
  
  // Theme
  Sun,
  Moon,
  
  // Education specific
  GraduationCap,
  BookMarked,
  ClipboardList,
  Presentation,
  type LucideIcon,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ICON WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

const iconVariants = cva('shrink-0', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
      xl: 'h-8 w-8',
      '2xl': 'h-10 w-10',
    },
    color: {
      default: 'text-current',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400',
      info: 'text-blue-600 dark:text-blue-400',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'default',
  },
});

export interface IconProps
  extends Omit<SVGAttributes<SVGElement>, 'color'>,
    VariantProps<typeof iconVariants> {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Spin animasyonu */
  spin?: boolean;
  /** Pulse animasyonu */
  pulse?: boolean;
}

const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon: IconComponent, size, color, spin, pulse, className, ...props }, ref) => {
    return (
      <IconComponent
        ref={ref}
        className={cn(
          iconVariants({ size, color }),
          spin && 'animate-spin',
          pulse && 'animate-pulse',
          className
        )}
        {...props}
      />
    );
  }
);

Icon.displayName = 'Icon';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 ICON WITH BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════════

export interface IconBoxProps extends Omit<IconProps, 'size'> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'solid' | 'soft' | 'outline';
  rounded?: 'md' | 'lg' | 'full';
}

const iconBoxSizeMap = {
  sm: { box: 'h-8 w-8', icon: 'sm' as const },
  md: { box: 'h-10 w-10', icon: 'md' as const },
  lg: { box: 'h-12 w-12', icon: 'lg' as const },
  xl: { box: 'h-16 w-16', icon: 'xl' as const },
};

const iconBoxColorMap = {
  solid: {
    default: 'bg-foreground text-background',
    primary: 'bg-primary text-primary-foreground',
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
    muted: 'bg-muted text-muted-foreground',
  },
  soft: {
    default: 'bg-foreground/10 text-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    error: 'bg-red-500/10 text-red-600 dark:text-red-400',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    muted: 'bg-muted text-muted-foreground',
  },
  outline: {
    default: 'border border-foreground text-foreground',
    primary: 'border border-primary text-primary',
    success: 'border border-green-600 text-green-600 dark:border-green-400 dark:text-green-400',
    warning: 'border border-yellow-600 text-yellow-600 dark:border-yellow-400 dark:text-yellow-400',
    error: 'border border-red-600 text-red-600 dark:border-red-400 dark:text-red-400',
    info: 'border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400',
    muted: 'border border-muted-foreground text-muted-foreground',
  },
};

const roundedMap = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

const IconBox = forwardRef<HTMLDivElement, IconBoxProps & { className?: string }>(
  (
    { icon, size = 'md', color = 'default', variant = 'soft', rounded = 'lg', className, ...props },
    ref
  ) => {
    const sizeConfig = iconBoxSizeMap[size];
    const colorKey = color || 'default';
    const colorClass = iconBoxColorMap[variant][colorKey];

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center shrink-0',
          sizeConfig.box,
          colorClass,
          roundedMap[rounded],
          className
        )}
      >
        <Icon icon={icon} size={sizeConfig.icon} {...props} />
      </div>
    );
  }
);

IconBox.displayName = 'IconBox';

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ ICON BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'solid';
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  isLoading?: boolean;
  'aria-label': string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: IconComponent,
      size = 'md',
      variant = 'ghost',
      color = 'default',
      isLoading,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
    };

    const iconSizes = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    };

    const variantClasses = {
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
      solid: 'bg-primary text-primary-foreground hover:bg-primary/90',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <RefreshCw className={cn(iconSizes[size], 'animate-spin')} />
        ) : (
          <IconComponent className={iconSizes[size]} />
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ═══════════════════════════════════════════════════════════════════════════════
// 📚 ICON CATALOG - Grouped icons for documentation
// ═══════════════════════════════════════════════════════════════════════════════

export const iconCatalog = {
  navigation: {
    Home,
    Menu,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowDown,
    ExternalLink,
    MoreHorizontal,
    MoreVertical,
  },
  actions: {
    Plus,
    Minus,
    X,
    Check,
    Edit,
    Trash2,
    Copy,
    Download,
    Upload,
    Share,
    Search,
    Filter,
    RefreshCw,
    Settings,
    Save,
  },
  user: {
    User,
    Users,
    UserPlus,
    UserMinus,
    UserCheck,
    LogIn,
    LogOut,
    Lock,
    Unlock,
    Key,
    Shield,
    ShieldCheck,
  },
  content: {
    File,
    FileText,
    Folder,
    FolderOpen,
    Image,
    Video,
    Music,
    BookOpen,
    Bookmark,
  },
  communication: {
    Mail,
    MessageSquare,
    Bell,
    BellOff,
    Phone,
    Send,
  },
  status: {
    AlertCircle,
    AlertTriangle,
    Info,
    CheckCircle,
    XCircle,
    HelpCircle,
  },
  media: {
    Play,
    Pause,
    Stop: Square,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
  },
  ui: {
    Eye,
    EyeOff,
    Calendar,
    Clock,
    Star,
    Heart,
    ThumbsUp,
    ThumbsDown,
    Zap,
    Award,
    Target,
    TrendingUp,
    TrendingDown,
    BarChart,
    PieChart,
    Activity,
  },
  device: {
    Monitor,
    Laptop,
    Smartphone,
    Tablet,
    Wifi,
    WifiOff,
    Cloud,
    Database,
    Server,
  },
  theme: {
    Sun,
    Moon,
  },
  education: {
    GraduationCap,
    BookMarked,
    ClipboardList,
    Presentation,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { Icon, iconVariants, IconBox, IconButton };

// Re-export commonly used icons for convenience
export {
  Home,
  Menu,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  X,
  Check,
  Edit,
  Trash2,
  Search,
  Settings,
  User,
  Users,
  LogIn,
  LogOut,
  Lock,
  Shield,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  GraduationCap,
  BookOpen,
  Play,
  Pause,
  Bell,
  Mail,
};

export type { LucideIcon };
