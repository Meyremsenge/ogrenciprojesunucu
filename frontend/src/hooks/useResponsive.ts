/**
 * Responsive Hooks
 * Responsive tasarım için yardımcı hooks
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ==================== Breakpoints ====================

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// ==================== useMediaQuery ====================

/**
 * CSS media query hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// ==================== useBreakpoint ====================

/**
 * Mevcut breakpoint'i döndürür
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width >= breakpoints['2xl']) setBreakpoint('2xl');
      else if (width >= breakpoints.xl) setBreakpoint('xl');
      else if (width >= breakpoints.lg) setBreakpoint('lg');
      else if (width >= breakpoints.md) setBreakpoint('md');
      else if (width >= breakpoints.sm) setBreakpoint('sm');
      else setBreakpoint('xs');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

/**
 * Belirli bir breakpoint ve üstü için true döndürür
 */
export function useIsBreakpoint(minBreakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpoints[minBreakpoint]}px)`);
}

// ==================== Convenience Hooks ====================

export function useIsMobile(): boolean {
  return !useIsBreakpoint('md');
}

export function useIsTablet(): boolean {
  const isMd = useIsBreakpoint('md');
  const isLg = useIsBreakpoint('lg');
  return isMd && !isLg;
}

export function useIsDesktop(): boolean {
  return useIsBreakpoint('lg');
}

// ==================== useWindowSize ====================

interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// ==================== useScrollPosition ====================

interface ScrollPosition {
  x: number;
  y: number;
  direction: 'up' | 'down' | null;
}

export function useScrollPosition(): ScrollPosition {
  const [position, setPosition] = useState<ScrollPosition>({
    x: 0,
    y: 0,
    direction: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      setPosition({
        x: window.scrollX,
        y: currentY,
        direction: currentY > lastY ? 'down' : 'up',
      });
      lastY = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return position;
}

/**
 * Belirli bir scroll pozisyonunu geçip geçmediğini kontrol eder
 */
export function useScrollPast(threshold: number): boolean {
  const { y } = useScrollPosition();
  return y > threshold;
}

// ==================== useElementSize ====================

interface ElementSize {
  width: number;
  height: number;
}

export function useElementSize<T extends HTMLElement>(): [
  React.RefCallback<T>,
  ElementSize
] {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  const ref = useCallback((node: T | null) => {
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

// ==================== useIntersectionObserver ====================

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [React.RefCallback<Element>, boolean] {
  const { threshold = 0, root = null, rootMargin = '0px', freezeOnceVisible = false } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const frozen = freezeOnceVisible && isIntersecting;

  const ref = useCallback(
    (node: Element | null) => {
      if (!node || frozen) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsIntersecting(entry.isIntersecting);
        },
        { threshold, root, rootMargin }
      );

      observer.observe(node);
      return () => observer.disconnect();
    },
    [threshold, root, rootMargin, frozen]
  );

  return [ref, isIntersecting];
}

// ==================== Responsive Value ====================

type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

/**
 * Breakpoint'e göre değer döndürür
 */
export function useResponsiveValue<T>(value: ResponsiveValue<T>, defaultValue: T): T {
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    if (typeof value !== 'object' || value === null) {
      return value as T;
    }

    const responsiveValue = value as Partial<Record<Breakpoint, T>>;
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoint);

    // En yakın tanımlı değeri bul
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (responsiveValue[bp] !== undefined) {
        return responsiveValue[bp] as T;
      }
    }

    return defaultValue;
  }, [value, breakpoint, defaultValue]);
}

// ==================== Container Queries (CSS-in-JS) ====================

/**
 * Container query benzeri davranış için hook
 */
export function useContainerQuery<T extends HTMLElement>(
  queries: Record<string, number>
): [React.RefCallback<T>, Record<string, boolean>] {
  const [matches, setMatches] = useState<Record<string, boolean>>({});

  const ref = useCallback(
    (node: T | null) => {
      if (!node) return;

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const width = entry.contentRect.width;
          const newMatches: Record<string, boolean> = {};

          Object.entries(queries).forEach(([name, minWidth]) => {
            newMatches[name] = width >= minWidth;
          });

          setMatches(newMatches);
        }
      });

      observer.observe(node);
      return () => observer.disconnect();
    },
    [queries]
  );

  return [ref, matches];
}
