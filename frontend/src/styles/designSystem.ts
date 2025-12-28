/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎨 DESIGN SYSTEM - Öğrenci Koçluk Sistemi
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Uygulamanın tüm design token'larını TypeScript olarak tanımlar.
 * Bu dosya CSS değişkenleriyle senkronize çalışır.
 *
 * @see styles/designTokens.css
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 COLOR PALETTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Primary color scale - Ana marka rengi (Blue)
 */
export const primaryColors = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
  950: '#172554',
} as const;

/**
 * Secondary color scale - Neutral/Slate tones
 */
export const secondaryColors = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
} as const;

/**
 * Semantic colors - Success, Warning, Error, Info
 */
export const semanticColors = {
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
} as const;

/**
 * Role colors - Kullanıcı rolleri için renkler
 */
export const roleColors = {
  student: {
    light: '#dbeafe',
    main: '#3b82f6',
    dark: '#1d4ed8',
  },
  teacher: {
    light: '#dcfce7',
    main: '#22c55e',
    dark: '#15803d',
  },
  admin: {
    light: '#f3e8ff',
    main: '#8b5cf6',
    dark: '#6d28d9',
  },
  superAdmin: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#b91c1c',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔤 TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Font families
 */
export const fontFamily = {
  sans: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "'Fira Code', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
  display: "'Inter', ui-sans-serif, system-ui, sans-serif",
} as const;

/**
 * Font sizes (in rem)
 */
export const fontSize = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
  '6xl': '3.75rem', // 60px
} as const;

/**
 * Font weights
 */
export const fontWeight = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

/**
 * Line heights
 */
export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

/**
 * Letter spacing
 */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

/**
 * Typography presets - Önceden tanımlanmış tipografi stilleri
 */
export const typography = {
  // Headings
  h1: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
  },
  h4: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.snug,
  },
  h5: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },
  h6: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },
  // Body
  bodyLarge: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.relaxed,
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  // Utility
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.normal,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
  },
  button: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 📏 SPACING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Spacing scale (in rem)
 */
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔲 SIZING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Component heights
 */
export const componentHeight = {
  inputSm: '2rem',     // 32px
  input: '2.5rem',     // 40px
  inputLg: '2.75rem',  // 44px
  inputXl: '3rem',     // 48px
} as const;

/**
 * Icon sizes
 */
export const iconSize = {
  xs: '0.75rem',   // 12px
  sm: '1rem',      // 16px
  md: '1.25rem',   // 20px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '2.5rem', // 40px
} as const;

/**
 * Avatar sizes
 */
export const avatarSize = {
  xs: '1.5rem',   // 24px
  sm: '2rem',     // 32px
  md: '2.5rem',   // 40px
  lg: '3rem',     // 48px
  xl: '4rem',     // 64px
  '2xl': '5rem',  // 80px
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔳 BORDER RADIUS
// ═══════════════════════════════════════════════════════════════════════════════

export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  default: '0.25rem', // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🌑 SHADOWS
// ═══════════════════════════════════════════════════════════════════════════════

export const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: '0 0 #0000',
  // Colored shadows
  primary: '0 4px 14px 0 rgb(59 130 246 / 0.4)',
  success: '0 4px 14px 0 rgb(34 197 94 / 0.4)',
  warning: '0 4px 14px 0 rgb(245 158 11 / 0.4)',
  error: '0 4px 14px 0 rgb(239 68 68 / 0.4)',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Duration values (in ms)
 */
export const duration = {
  75: '75ms',
  100: '100ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
  1000: '1000ms',
} as const;

/**
 * Easing functions
 */
export const easing = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

/**
 * Transition presets
 */
export const transitions = {
  fast: `all ${duration[150]} ${easing.out}`,
  normal: `all ${duration[200]} ${easing.out}`,
  slow: `all ${duration[300]} ${easing.out}`,
  colors: `color ${duration[200]} ${easing.out}, background-color ${duration[200]} ${easing.out}, border-color ${duration[200]} ${easing.out}`,
  opacity: `opacity ${duration[200]} ${easing.out}`,
  shadow: `box-shadow ${duration[200]} ${easing.out}`,
  transform: `transform ${duration[200]} ${easing.out}`,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 Z-INDEX SCALE
// ═══════════════════════════════════════════════════════════════════════════════

export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 📐 BREAKPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Responsive breakpoints
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
} as const;

/**
 * Container max widths
 */
export const containers = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🏗️ LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

export const layout = {
  sidebarWidth: '280px',
  sidebarCollapsedWidth: '80px',
  headerHeight: '64px',
  headerHeightMobile: '56px',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 DESIGN SYSTEM EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const designSystem = {
  colors: {
    primary: primaryColors,
    secondary: secondaryColors,
    semantic: semanticColors,
    roles: roleColors,
  },
  typography: {
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
    presets: typography,
  },
  spacing,
  sizing: {
    componentHeight,
    iconSize,
    avatarSize,
  },
  borderRadius,
  shadows,
  motion: {
    duration,
    easing,
    transitions,
  },
  zIndex,
  layout: {
    breakpoints,
    containers,
    ...layout,
  },
} as const;

export type DesignSystem = typeof designSystem;

export default designSystem;
