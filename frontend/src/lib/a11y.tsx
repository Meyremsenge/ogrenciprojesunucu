/**
 * Accessibility Utilities
 * WCAG uyumlu erişilebilirlik yardımcıları
 */

import { useEffect, useRef, useCallback } from 'react';

// ==================== Focus Management ====================

/**
 * Focus trap hook - Modal, dialog gibi elementler için
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // İlk elemente focus
    firstElement?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Escape tuşu ile kapatma
 */
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onEscape();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, isActive]);
}

/**
 * Dışarı tıklama algılama
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: () => void,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [ref, handler, isActive]);
}

// ==================== Screen Reader ====================

/**
 * Screen reader için görsel olarak gizlenmiş içerik
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Live region announcer - Screen reader bildirimleri
 */
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const element = document.createElement('div');
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', priority);
    element.setAttribute('aria-atomic', 'true');
    element.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    element.textContent = message;
    document.body.appendChild(element);

    setTimeout(() => {
      document.body.removeChild(element);
    }, 1000);
  }, []);

  return announce;
}

// ==================== Keyboard Navigation ====================

/**
 * Arrow key navigation for lists
 */
export function useArrowNavigation(
  items: HTMLElement[] | null,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
  } = {}
) {
  const { orientation = 'vertical', loop = true } = options;
  const currentIndex = useRef(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!items || items.length === 0) return;

      const vertical = orientation === 'vertical' || orientation === 'both';
      const horizontal = orientation === 'horizontal' || orientation === 'both';

      let newIndex = currentIndex.current;

      if ((e.key === 'ArrowDown' && vertical) || (e.key === 'ArrowRight' && horizontal)) {
        e.preventDefault();
        newIndex = currentIndex.current + 1;
        if (newIndex >= items.length) {
          newIndex = loop ? 0 : items.length - 1;
        }
      } else if ((e.key === 'ArrowUp' && vertical) || (e.key === 'ArrowLeft' && horizontal)) {
        e.preventDefault();
        newIndex = currentIndex.current - 1;
        if (newIndex < 0) {
          newIndex = loop ? items.length - 1 : 0;
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        newIndex = items.length - 1;
      }

      if (newIndex !== currentIndex.current) {
        currentIndex.current = newIndex;
        items[newIndex]?.focus();
      }
    },
    [items, orientation, loop]
  );

  return {
    handleKeyDown,
    currentIndex: currentIndex.current,
    setCurrentIndex: (index: number) => {
      currentIndex.current = index;
    },
  };
}

// ==================== Reduced Motion ====================

/**
 * Kullanıcının reduced motion tercihini kontrol eder
 */
export function usePrefersReducedMotion(): boolean {
  const mediaQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  const getInitialState = () => mediaQuery?.matches ?? false;

  const ref = useRef(getInitialState());

  useEffect(() => {
    if (!mediaQuery) return;

    const handler = (e: MediaQueryListEvent) => {
      ref.current = e.matches;
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mediaQuery]);

  return ref.current;
}

// ==================== Color Contrast ====================

/**
 * Renk kontrastı hesaplama (WCAG 2.1)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      val /= 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * WCAG AA (4.5:1) veya AAA (7:1) uyumluluğunu kontrol eder
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
}

// ==================== ARIA Helpers ====================

/**
 * ARIA attribute generator
 */
export const aria = {
  labelledBy: (id: string) => ({ 'aria-labelledby': id }),
  describedBy: (id: string) => ({ 'aria-describedby': id }),
  expanded: (isExpanded: boolean) => ({ 'aria-expanded': isExpanded }),
  selected: (isSelected: boolean) => ({ 'aria-selected': isSelected }),
  disabled: (isDisabled: boolean) => ({ 'aria-disabled': isDisabled }),
  hidden: (isHidden: boolean) => ({ 'aria-hidden': isHidden }),
  current: (isCurrent: boolean | 'page' | 'step' | 'location' | 'date' | 'time') => ({
    'aria-current': isCurrent,
  }),
  invalid: (isInvalid: boolean) => ({ 'aria-invalid': isInvalid }),
  busy: (isBusy: boolean) => ({ 'aria-busy': isBusy }),
  live: (politeness: 'polite' | 'assertive' | 'off') => ({ 'aria-live': politeness }),
  pressed: (isPressed: boolean | 'mixed') => ({ 'aria-pressed': isPressed }),
  controls: (id: string) => ({ 'aria-controls': id }),
  owns: (id: string) => ({ 'aria-owns': id }),
  haspopup: (type: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog') => ({
    'aria-haspopup': type,
  }),
};
