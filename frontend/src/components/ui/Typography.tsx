/**
 * Typography Components
 * Tutarlı tipografi için bileşenler
 */

import { forwardRef, HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 TEXT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const textVariants = cva('', {
  variants: {
    variant: {
      // Headings
      h1: 'heading-1',
      h2: 'heading-2',
      h3: 'heading-3',
      h4: 'heading-4',
      h5: 'heading-5',
      h6: 'heading-6',
      // Body
      'body-lg': 'body-lg',
      body: 'body-base',
      'body-sm': 'body-sm',
      'body-xs': 'body-xs',
      // Utility
      caption: 'caption',
      label: 'label',
      helper: 'helper-text',
    },
    weight: {
      thin: 'font-thin',
      extralight: 'font-extralight',
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      extrabold: 'font-extrabold',
      black: 'font-black',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    },
    textColor: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      secondary: 'text-secondary-foreground',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400',
      info: 'text-blue-600 dark:text-blue-400',
    },
    truncate: {
      true: 'truncate',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'body',
    textColor: 'default',
    truncate: false,
  },
});

type TextVariantProps = VariantProps<typeof textVariants>;

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label';
  lines?: 1 | 2 | 3;
  variant?: TextVariantProps['variant'];
  weight?: TextVariantProps['weight'];
  align?: TextVariantProps['align'];
  textColor?: TextVariantProps['textColor'];
  truncate?: TextVariantProps['truncate'];
}

const Text = forwardRef<HTMLElement, TextProps>(
  ({ className, variant, weight, align, textColor, truncate, as, lines, ...props }, ref) => {
    // Varsayılan element seçimi
    const defaultElement = (() => {
      if (variant?.startsWith('h')) return variant as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      if (variant === 'label') return 'label';
      return 'p';
    })();

    const Component = as || defaultElement;

    // Line clamp class
    const lineClampClass = lines ? `line-clamp-${lines}` : '';

    return (
      <Component
        // @ts-expect-error - Dynamic component with different ref types
        ref={ref}
        className={cn(
          textVariants({ variant, weight, align, textColor, truncate }),
          lineClampClass,
          className
        )}
        {...props}
      />
    );
  }
);

Text.displayName = 'Text';

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 HEADING SHORTCUTS
// ═══════════════════════════════════════════════════════════════════════════════

type HeadingProps = Omit<TextProps, 'variant' | 'as'>;

export const H1 = forwardRef<HTMLHeadingElement, HeadingProps>((props, ref) => (
  <Text ref={ref} variant="h1" as="h1" {...props} />
));
H1.displayName = 'H1';

export const H2 = forwardRef<HTMLHeadingElement, HeadingProps>((props, ref) => (
  <Text ref={ref} variant="h2" as="h2" {...props} />
));
H2.displayName = 'H2';

export const H3 = forwardRef<HTMLHeadingElement, HeadingProps>((props, ref) => (
  <Text ref={ref} variant="h3" as="h3" {...props} />
));
H3.displayName = 'H3';

export const H4 = forwardRef<HTMLHeadingElement, HeadingProps>((props, ref) => (
  <Text ref={ref} variant="h4" as="h4" {...props} />
));
H4.displayName = 'H4';

export const H5 = forwardRef<HTMLHeadingElement, HeadingProps>((props, ref) => (
  <Text ref={ref} variant="h5" as="h5" {...props} />
));
H5.displayName = 'H5';

export const H6 = forwardRef<HTMLHeadingElement, HeadingProps>((props, ref) => (
  <Text ref={ref} variant="h6" as="h6" {...props} />
));
H6.displayName = 'H6';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 LINK COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const linkVariants = cva(
  'cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded',
  {
    variants: {
      variant: {
        default: 'text-primary hover:text-primary/80 underline-offset-4 hover:underline',
        subtle: 'text-muted-foreground hover:text-foreground',
        nav: 'text-foreground/60 hover:text-foreground',
        unstyled: '',
      },
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface LinkTextProps
  extends HTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  href?: string;
  external?: boolean;
}

const LinkText = forwardRef<HTMLAnchorElement, LinkTextProps>(
  ({ className, variant, size, href, external, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        className={cn(linkVariants({ variant, size }), className)}
        {...(external && {
          target: '_blank',
          rel: 'noopener noreferrer',
        })}
        {...props}
      >
        {children}
      </a>
    );
  }
);

LinkText.displayName = 'LinkText';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 CODE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CodeProps extends HTMLAttributes<HTMLElement> {
  block?: boolean;
}

const Code = forwardRef<HTMLElement, CodeProps>(
  ({ className, block = false, children, ...props }, ref) => {
    if (block) {
      return (
        <pre
          ref={ref as React.Ref<HTMLPreElement>}
          className={cn(
            'rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto',
            className
          )}
          {...props}
        >
          <code>{children}</code>
        </pre>
      );
    }

    return (
      <code
        ref={ref as React.Ref<HTMLElement>}
        className={cn(
          'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  }
);

Code.displayName = 'Code';

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 PARAGRAPH COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParagraphProps extends HTMLAttributes<HTMLParagraphElement> {
  lead?: boolean;
  muted?: boolean;
}

const Paragraph = forwardRef<HTMLParagraphElement, ParagraphProps>(
  ({ className, lead, muted, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          'leading-relaxed',
          lead && 'text-lg text-muted-foreground',
          muted && 'text-muted-foreground',
          !lead && !muted && 'text-foreground',
          className
        )}
        {...props}
      />
    );
  }
);

Paragraph.displayName = 'Paragraph';

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ LABEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface LabelProps extends HTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
  required?: boolean;
  error?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, error, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          error && 'text-destructive',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { Text, textVariants, LinkText, linkVariants, Code, Paragraph, Label };
