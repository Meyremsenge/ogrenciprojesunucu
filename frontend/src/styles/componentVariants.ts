/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧩 COMPONENT VARIANTS - CVA ile Bileşen Stilleri
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bu dosya, class-variance-authority (CVA) kullanarak bileşen
 * variant'larını tanımlar. Type-safe ve tutarlı styling sağlar.
 * 
 * KULLANIM:
 * import { buttonVariants } from '@/styles/componentVariants';
 * <button className={buttonVariants({ variant: 'primary', size: 'md' })}>
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

// ============================================================================
// 🔲 BUTTON VARIANTS
// ============================================================================

export const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center',
    'font-medium',
    'rounded-lg',
    'transition-all duration-200 ease-smooth',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
    'whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        // Primary - Ana aksiyon
        primary: [
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90',
          'active:bg-primary/80',
          'focus-visible:ring-primary',
          'shadow-sm hover:shadow-md',
        ],
        // Secondary - İkincil aksiyon
        secondary: [
          'bg-secondary text-secondary-foreground',
          'hover:bg-secondary/80',
          'active:bg-secondary/70',
          'focus-visible:ring-secondary',
        ],
        // Outline - Çerçeveli
        outline: [
          'border border-input bg-background',
          'hover:bg-accent hover:text-accent-foreground',
          'active:bg-accent/80',
          'focus-visible:ring-primary',
        ],
        // Ghost - Şeffaf
        ghost: [
          'hover:bg-accent hover:text-accent-foreground',
          'active:bg-accent/80',
          'focus-visible:ring-primary',
        ],
        // Link - Bağlantı
        link: [
          'text-primary underline-offset-4',
          'hover:underline',
          'focus-visible:ring-primary',
        ],
        // Destructive - Tehlikeli işlem
        destructive: [
          'bg-destructive text-destructive-foreground',
          'hover:bg-destructive/90',
          'active:bg-destructive/80',
          'focus-visible:ring-destructive',
          'shadow-sm hover:shadow-md',
        ],
        // Success - Başarı
        success: [
          'bg-green-600 text-white',
          'hover:bg-green-700',
          'active:bg-green-800',
          'focus-visible:ring-green-500',
          'shadow-sm hover:shadow-md',
        ],
        // Warning - Uyarı
        warning: [
          'bg-amber-500 text-white',
          'hover:bg-amber-600',
          'active:bg-amber-700',
          'focus-visible:ring-amber-500',
          'shadow-sm hover:shadow-md',
        ],
      },
      size: {
        xs: 'h-7 px-2 text-xs gap-1',
        sm: 'h-8 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2',
        xl: 'h-14 px-8 text-lg gap-3',
        // Icon-only variants
        'icon-xs': 'h-7 w-7',
        'icon-sm': 'h-8 w-8',
        'icon-md': 'h-10 w-10',
        'icon-lg': 'h-12 w-12',
        'icon-xl': 'h-14 w-14',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      loading: {
        true: 'cursor-wait',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

// ============================================================================
// 📝 INPUT VARIANTS
// ============================================================================

export const inputVariants = cva(
  // Base styles
  [
    'flex w-full',
    'rounded-lg border bg-background',
    'text-foreground placeholder:text-muted-foreground',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-input',
          'focus-visible:ring-primary focus-visible:border-primary',
        ],
        error: [
          'border-destructive',
          'focus-visible:ring-destructive focus-visible:border-destructive',
          'text-destructive placeholder:text-destructive/60',
        ],
        success: [
          'border-green-500',
          'focus-visible:ring-green-500 focus-visible:border-green-500',
        ],
      },
      size: {
        sm: 'h-8 px-2.5 text-sm',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type InputVariants = VariantProps<typeof inputVariants>;

// ============================================================================
// 📦 CARD VARIANTS
// ============================================================================

export const cardVariants = cva(
  // Base styles
  [
    'rounded-xl bg-card text-card-foreground',
    'transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        default: [
          'border border-border',
          'shadow-sm',
        ],
        elevated: [
          'shadow-lg',
          'hover:shadow-xl',
        ],
        outline: [
          'border-2 border-border',
        ],
        ghost: [
          'bg-transparent',
        ],
        interactive: [
          'border border-border shadow-sm',
          'cursor-pointer',
          'hover:border-primary/50 hover:shadow-md',
          'active:scale-[0.98]',
        ],
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export type CardVariants = VariantProps<typeof cardVariants>;

// Card sub-components
export const cardHeaderVariants = cva([
  'flex flex-col space-y-1.5',
]);

export const cardTitleVariants = cva([
  'text-lg font-semibold leading-none tracking-tight',
]);

export const cardDescriptionVariants = cva([
  'text-sm text-muted-foreground',
]);

export const cardContentVariants = cva([
  'pt-0',
]);

export const cardFooterVariants = cva([
  'flex items-center pt-4',
]);

// ============================================================================
// 🏷️ BADGE VARIANTS
// ============================================================================

export const badgeVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center',
    'rounded-full',
    'font-medium',
    'transition-colors duration-200',
    'whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-primary text-primary-foreground',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground',
        ],
        outline: [
          'border border-current bg-transparent',
        ],
        success: [
          'bg-green-100 text-green-800',
          'dark:bg-green-900/30 dark:text-green-400',
        ],
        warning: [
          'bg-amber-100 text-amber-800',
          'dark:bg-amber-900/30 dark:text-amber-400',
        ],
        error: [
          'bg-red-100 text-red-800',
          'dark:bg-red-900/30 dark:text-red-400',
        ],
        info: [
          'bg-blue-100 text-blue-800',
          'dark:bg-blue-900/30 dark:text-blue-400',
        ],
        // Role-based
        student: [
          'bg-cyan-100 text-cyan-800',
          'dark:bg-cyan-900/30 dark:text-cyan-400',
        ],
        teacher: [
          'bg-green-100 text-green-800',
          'dark:bg-green-900/30 dark:text-green-400',
        ],
        admin: [
          'bg-purple-100 text-purple-800',
          'dark:bg-purple-900/30 dark:text-purple-400',
        ],
        superAdmin: [
          'bg-red-100 text-red-800',
          'dark:bg-red-900/30 dark:text-red-400',
        ],
      },
      size: {
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-2.5 text-xs',
        lg: 'h-7 px-3 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;

// ============================================================================
// 🖼️ AVATAR VARIANTS
// ============================================================================

export const avatarVariants = cva(
  // Base styles
  [
    'relative flex shrink-0 overflow-hidden rounded-full',
    'bg-muted',
  ],
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-[10px]',
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
        '2xl': 'h-24 w-24 text-2xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export type AvatarVariants = VariantProps<typeof avatarVariants>;

// ============================================================================
// 📊 TABLE VARIANTS
// ============================================================================

export const tableVariants = cva([
  'w-full',
  'caption-bottom',
  'text-sm',
]);

export const tableHeaderVariants = cva([
  '[&_tr]:border-b',
]);

export const tableBodyVariants = cva([
  '[&_tr:last-child]:border-0',
]);

export const tableRowVariants = cva(
  [
    'border-b transition-colors',
  ],
  {
    variants: {
      variant: {
        default: [
          'hover:bg-muted/50',
          'data-[state=selected]:bg-muted',
        ],
        striped: [
          'even:bg-muted/30',
          'hover:bg-muted/50',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export const tableHeadVariants = cva([
  'h-12 px-4',
  'text-left align-middle font-medium text-muted-foreground',
  '[&:has([role=checkbox])]:pr-0',
]);

export const tableCellVariants = cva([
  'p-4 align-middle',
  '[&:has([role=checkbox])]:pr-0',
]);

// ============================================================================
// 🪟 MODAL / DIALOG VARIANTS
// ============================================================================

export const modalOverlayVariants = cva([
  'fixed inset-0 z-50',
  'bg-black/50 backdrop-blur-sm',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
]);

export const modalContentVariants = cva(
  [
    'fixed left-[50%] top-[50%] z-50',
    'translate-x-[-50%] translate-y-[-50%]',
    'w-full bg-background shadow-lg',
    'rounded-2xl border',
    'duration-200',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
    'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
    'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-[400px]',
        md: 'max-w-[500px]',
        lg: 'max-w-[700px]',
        xl: 'max-w-[900px]',
        full: 'max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export type ModalContentVariants = VariantProps<typeof modalContentVariants>;

export const modalHeaderVariants = cva([
  'flex flex-col space-y-1.5',
  'p-6 pb-0',
  'text-center sm:text-left',
]);

export const modalFooterVariants = cva([
  'flex flex-col-reverse sm:flex-row sm:justify-end',
  'gap-2 p-6 pt-0',
]);

export const modalTitleVariants = cva([
  'text-lg font-semibold leading-none tracking-tight',
]);

export const modalDescriptionVariants = cva([
  'text-sm text-muted-foreground',
]);

// ============================================================================
// 📋 SELECT VARIANTS
// ============================================================================

export const selectTriggerVariants = cva(
  [
    'flex h-10 w-full items-center justify-between',
    'rounded-lg border border-input bg-background',
    'px-3 py-2 text-sm',
    'ring-offset-background',
    'placeholder:text-muted-foreground',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    '[&>span]:line-clamp-1',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 text-sm',
        md: 'h-10 text-sm',
        lg: 'h-12 text-base',
      },
      error: {
        true: 'border-destructive focus:ring-destructive',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      error: false,
    },
  }
);

// ============================================================================
// 📌 ALERT VARIANTS
// ============================================================================

export const alertVariants = cva(
  [
    'relative w-full rounded-lg border p-4',
    '[&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px]',
    '[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-background text-foreground',
        ],
        info: [
          'border-blue-200 bg-blue-50 text-blue-900',
          'dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100',
          '[&>svg]:text-blue-600 dark:[&>svg]:text-blue-400',
        ],
        success: [
          'border-green-200 bg-green-50 text-green-900',
          'dark:border-green-900 dark:bg-green-950 dark:text-green-100',
          '[&>svg]:text-green-600 dark:[&>svg]:text-green-400',
        ],
        warning: [
          'border-amber-200 bg-amber-50 text-amber-900',
          'dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100',
          '[&>svg]:text-amber-600 dark:[&>svg]:text-amber-400',
        ],
        destructive: [
          'border-red-200 bg-red-50 text-red-900',
          'dark:border-red-900 dark:bg-red-950 dark:text-red-100',
          '[&>svg]:text-red-600 dark:[&>svg]:text-red-400',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type AlertVariants = VariantProps<typeof alertVariants>;

// ============================================================================
// 🧭 TABS VARIANTS
// ============================================================================

export const tabsListVariants = cva([
  'inline-flex h-10 items-center justify-center',
  'rounded-lg bg-muted p-1',
  'text-muted-foreground',
]);

export const tabsTriggerVariants = cva([
  'inline-flex items-center justify-center',
  'whitespace-nowrap rounded-md px-3 py-1.5',
  'text-sm font-medium',
  'ring-offset-background transition-all',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50',
  'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
]);

export const tabsContentVariants = cva([
  'mt-2',
  'ring-offset-background',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
]);

// ============================================================================
// 🔄 PROGRESS VARIANTS
// ============================================================================

export const progressVariants = cva(
  [
    'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
  ],
  {
    variants: {
      size: {
        sm: 'h-2',
        md: 'h-4',
        lg: 'h-6',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export const progressIndicatorVariants = cva(
  [
    'h-full w-full flex-1 transition-all',
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary',
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// ============================================================================
// 💀 SKELETON VARIANTS
// ============================================================================

export const skeletonVariants = cva(
  [
    'animate-pulse rounded-md bg-muted',
  ],
  {
    variants: {
      variant: {
        default: '',
        circle: 'rounded-full',
        text: 'h-4',
        title: 'h-6',
        avatar: 'rounded-full',
        button: 'h-10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// ============================================================================
// 🔧 UTILITY FUNCTION
// ============================================================================

/**
 * Combine multiple variant classes
 */
export function combineVariants(...classes: (string | undefined)[]) {
  return cn(...classes);
}
