/**
 * Stack & Grid Layout Components
 * Flexbox ve Grid tabanlı layout bileşenleri
 */

import { forwardRef, HTMLAttributes, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 STACK COMPONENT (Flex Column/Row)
// ═══════════════════════════════════════════════════════════════════════════════

type SpacingValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
type AlignValue = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type JustifyValue = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

const spacingMap: Record<SpacingValue, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
  16: 'gap-16',
};

const alignMap: Record<AlignValue, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyMap: Record<JustifyValue, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Yön: row veya column */
  direction?: 'row' | 'column';
  /** Öğeler arası boşluk */
  spacing?: SpacingValue;
  /** Dikey hizalama */
  align?: AlignValue;
  /** Yatay hizalama */
  justify?: JustifyValue;
  /** Wrap davranışı */
  wrap?: boolean;
  /** Tam genişlik */
  fullWidth?: boolean;
  /** Tam yükseklik */
  fullHeight?: boolean;
  /** Inline flex mi? */
  inline?: boolean;
}

const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      className,
      direction = 'column',
      spacing = 4,
      align,
      justify,
      wrap = false,
      fullWidth = false,
      fullHeight = false,
      inline = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          inline ? 'inline-flex' : 'flex',
          direction === 'column' ? 'flex-col' : 'flex-row',
          spacingMap[spacing],
          align && alignMap[align],
          justify && justifyMap[justify],
          wrap && 'flex-wrap',
          fullWidth && 'w-full',
          fullHeight && 'h-full',
          className
        )}
        {...props}
      />
    );
  }
);

Stack.displayName = 'Stack';

// VStack - Vertical Stack shorthand
export const VStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack ref={ref} direction="column" {...props} />
);
VStack.displayName = 'VStack';

// HStack - Horizontal Stack shorthand
export const HStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  (props, ref) => <Stack ref={ref} direction="row" {...props} />
);
HStack.displayName = 'HStack';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔲 GRID COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 12;

const colsMap: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
};

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** Sütun sayısı */
  cols?: GridColumns;
  /** Responsive sütunlar: {sm: 1, md: 2, lg: 3} */
  responsive?: {
    sm?: GridColumns;
    md?: GridColumns;
    lg?: GridColumns;
    xl?: GridColumns;
  };
  /** Öğeler arası boşluk */
  gap?: SpacingValue;
  /** Satır boşluğu */
  rowGap?: SpacingValue;
  /** Sütun boşluğu */
  colGap?: SpacingValue;
}

const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 1, responsive, gap = 4, rowGap, colGap, ...props }, ref) => {
    const responsiveClasses = responsive
      ? [
          responsive.sm && `sm:grid-cols-${responsive.sm}`,
          responsive.md && `md:grid-cols-${responsive.md}`,
          responsive.lg && `lg:grid-cols-${responsive.lg}`,
          responsive.xl && `xl:grid-cols-${responsive.xl}`,
        ].filter(Boolean)
      : [];

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          colsMap[cols],
          rowGap ? `gap-y-${rowGap}` : colGap ? '' : spacingMap[gap],
          colGap && `gap-x-${colGap}`,
          rowGap && `gap-y-${rowGap}`,
          ...responsiveClasses,
          className
        )}
        {...props}
      />
    );
  }
);

Grid.displayName = 'Grid';

// ═══════════════════════════════════════════════════════════════════════════════
// 📐 BOX COMPONENT (General Purpose Container)
// ═══════════════════════════════════════════════════════════════════════════════

type PaddingValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

const paddingMap: Record<PaddingValue, string> = {
  0: 'p-0',
  1: 'p-1',
  2: 'p-2',
  3: 'p-3',
  4: 'p-4',
  5: 'p-5',
  6: 'p-6',
  8: 'p-8',
  10: 'p-10',
  12: 'p-12',
};

export interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  /** Element type */
  as?: 'div' | 'section' | 'article' | 'aside' | 'main' | 'header' | 'footer' | 'nav';
  /** Padding */
  p?: PaddingValue;
  /** Padding X (horizontal) */
  px?: PaddingValue;
  /** Padding Y (vertical) */
  py?: PaddingValue;
  /** Margin */
  m?: PaddingValue;
  /** Margin X (horizontal) */
  mx?: PaddingValue | 'auto';
  /** Margin Y (vertical) */
  my?: PaddingValue | 'auto';
  /** Border radius */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Background */
  bg?: 'default' | 'muted' | 'card' | 'transparent';
  /** Border */
  border?: boolean;
  /** Shadow */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Display type */
  display?: 'block' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'hidden';
  /** Position */
  position?: 'relative' | 'absolute' | 'fixed' | 'sticky';
}

const roundedMap = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

const bgMap = {
  default: 'bg-background',
  muted: 'bg-muted',
  card: 'bg-card',
  transparent: 'bg-transparent',
};

const shadowMap = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

const displayMap = {
  block: 'block',
  'inline-block': 'inline-block',
  flex: 'flex',
  'inline-flex': 'inline-flex',
  grid: 'grid',
  hidden: 'hidden',
};

const positionMap = {
  relative: 'relative',
  absolute: 'absolute',
  fixed: 'fixed',
  sticky: 'sticky',
};

const Box = forwardRef<HTMLDivElement, BoxProps>(
  (
    {
      className,
      as = 'div',
      p,
      px,
      py,
      m,
      mx,
      my,
      rounded,
      bg,
      border,
      shadow,
      display,
      position,
      ...props
    },
    ref
  ) => {
    const Component = as;

    return (
      <Component
        ref={ref}
        className={cn(
          p !== undefined && paddingMap[p],
          px !== undefined && `px-${px}`,
          py !== undefined && `py-${py}`,
          m !== undefined && `m-${m}`,
          mx !== undefined && (mx === 'auto' ? 'mx-auto' : `mx-${mx}`),
          my !== undefined && (my === 'auto' ? 'my-auto' : `my-${my}`),
          rounded && roundedMap[rounded],
          bg && bgMap[bg],
          border && 'border border-border',
          shadow && shadowMap[shadow],
          display && displayMap[display],
          position && positionMap[position],
          className
        )}
        {...props}
      />
    );
  }
);

Box.displayName = 'Box';

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 CONTAINER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Max genişlik boyutu */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Ortalama */
  center?: boolean;
  /** Padding */
  padding?: boolean;
}

const containerSizeMap = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-[1400px]',
  full: 'max-w-full',
};

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = '2xl', center = true, padding = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full',
          containerSizeMap[size],
          center && 'mx-auto',
          padding && 'px-4 sm:px-6 lg:px-8',
          className
        )}
        {...props}
      />
    );
  }
);

Container.displayName = 'Container';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔲 DIVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  /** Yönlendirme */
  orientation?: 'horizontal' | 'vertical';
  /** Label */
  label?: string;
  /** Spacing */
  spacing?: SpacingValue;
}

const Divider = forwardRef<HTMLHRElement, DividerProps>(
  ({ className, orientation = 'horizontal', label, spacing = 4, ...props }, ref) => {
    if (label) {
      return (
        <div className={cn('flex items-center', `my-${spacing}`, className)} role="separator">
          <div className="flex-1 border-t border-border" />
          <span className="px-3 text-sm text-muted-foreground">{label}</span>
          <div className="flex-1 border-t border-border" />
        </div>
      );
    }

    if (orientation === 'vertical') {
      return (
        <div
          ref={ref as React.Ref<HTMLDivElement>}
          className={cn('w-px h-full bg-border', `mx-${spacing}`, className)}
          role="separator"
          aria-orientation="vertical"
          {...(props as HTMLAttributes<HTMLDivElement>)}
        />
      );
    }

    return (
      <hr
        ref={ref}
        className={cn('border-t border-border', `my-${spacing}`, className)}
        {...props}
      />
    );
  }
);

Divider.displayName = 'Divider';

// ═══════════════════════════════════════════════════════════════════════════════
// 💨 SPACER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface SpacerProps {
  /** Sabit boyut (Tailwind spacing değerleri) */
  size?: SpacingValue;
  /** Esnek büyüme */
  flex?: boolean;
  /** Yön */
  axis?: 'horizontal' | 'vertical';
}

const Spacer = ({ size, flex = false, axis = 'vertical' }: SpacerProps) => {
  if (flex) {
    return <div className="flex-1" />;
  }

  if (axis === 'horizontal') {
    return <div className={cn(`w-${size || 4}`, 'shrink-0')} />;
  }

  return <div className={cn(`h-${size || 4}`, 'shrink-0')} />;
};

Spacer.displayName = 'Spacer';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ASPECT RATIO COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface AspectRatioProps extends HTMLAttributes<HTMLDivElement> {
  ratio?: number;
}

const AspectRatio = forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ className, ratio = 16 / 9, children, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative w-full', className)}
        style={{ ...style, paddingBottom: `${100 / ratio}%` } as CSSProperties}
        {...props}
      >
        <div className="absolute inset-0">{children}</div>
      </div>
    );
  }
);

AspectRatio.displayName = 'AspectRatio';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { Stack, Grid, Box, Container, Divider, Spacer, AspectRatio };
