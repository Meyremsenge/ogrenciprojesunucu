/**
 * Performance Optimizations - Performans Düşüren Arayüz Kararlarını Önleme
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PERFORMANS DÜŞÜREN ARAYÜZ KARARLARI VE ÇÖZÜMLERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🐌 PROBLEM #1: UNNECESSARY RE-RENDERS
 *    Gereksiz yere component'ler yeniden render edilir
 *    Çözüm: React.memo, useMemo, useCallback doğru kullanımı
 * 
 * 🐌 PROBLEM #2: LARGE LIST RENDERING
 *    Büyük listeler DOM'u şişirir ve scroll performansını düşürür
 *    Çözüm: Virtual scrolling / windowing
 * 
 * 🐌 PROBLEM #3: LAYOUT THRASHING
 *    CSS animasyonları ve layout hesaplamaları performansı etkiler
 *    Çözüm: Transform/opacity animasyonları, will-change kullanımı
 * 
 * 🐌 PROBLEM #4: MEMORY LEAKS
 *    Cleanup yapılmayan subscriptions ve event listeners
 *    Çözüm: Proper useEffect cleanup, AbortController
 * 
 * 🐌 PROBLEM #5: NETWORK WATERFALL
 *    Sıralı API çağrıları sayfa yüklenmesini yavaşlatır
 *    Çözüm: Parallel requests, data prefetching
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
  ReactNode,
  ComponentType,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Gauge, Zap, Clock, Database, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 VIRTUAL LIST - Büyük Listeler İçin Sanal Kaydırma
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * VirtualList - Büyük veri setleri için optimize edilmiş liste
 * 
 * Sadece görünür öğeleri render eder, DOM boyutunu minimize eder
 */

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number; // Görünür alanın üstünde/altında render edilecek ekstra öğe sayısı
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className,
  onEndReached,
  endReachedThreshold = 100,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;

  // Görünür öğe indexleri
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        },
      });
    }
    return result;
  }, [items, startIndex, endIndex, itemHeight]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      setScrollTop(target.scrollTop);

      // End reached detection
      if (onEndReached) {
        const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
        if (scrollBottom < endReachedThreshold) {
          onEndReached();
        }
      }
    },
    [onEndReached, endReachedThreshold]
  );

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 DEBOUNCED INPUT - Arama/Filtre Performans Optimizasyonu
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useDebouncedValue - Değer değişikliklerini geciktirir
 * 
 * Her tuş vuruşunda API çağrısı yapmak yerine, kullanıcı yazmayı bitirdikten
 * sonra tek bir çağrı yapar
 */

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Fonksiyon çağrılarını geciktirir
 */

export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🖼️ LAZY IMAGE - Görsel Yükleme Optimizasyonu
// ═══════════════════════════════════════════════════════════════════════════════

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23e5e7eb" width="100" height="100"/></svg>',
  className,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        ref={imgRef}
        src={placeholder}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
      
      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 LAZY COMPONENT - Kod Bölme ile Component Yükleme
// ═══════════════════════════════════════════════════════════════════════════════

interface LazyComponentProps {
  loader: () => Promise<{ default: ComponentType }>;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

export function LazyComponent({
  loader,
  fallback = <div className="animate-pulse bg-muted h-32 rounded-lg" />,
  errorFallback = (
    <div className="p-4 bg-red-50 text-red-600 rounded-lg">Yükleme hatası</div>
  ),
}: LazyComponentProps) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loader()
      .then((module) => setComponent(() => module.default))
      .catch(() => setError(true));
  }, [loader]);

  if (error) return <>{errorFallback}</>;
  if (!Component) return <>{fallback}</>;
  return <Component />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 PREFETCH LINK - Hover'da Veri Ön Yükleme
// ═══════════════════════════════════════════════════════════════════════════════

interface PrefetchLinkProps {
  href: string;
  prefetchFn: () => Promise<void>;
  children: ReactNode;
  className?: string;
  prefetchDelay?: number;
}

export function PrefetchLink({
  href,
  prefetchFn,
  children,
  className,
  prefetchDelay = 100,
}: PrefetchLinkProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const prefetchedRef = useRef(false);

  const handleMouseEnter = () => {
    if (prefetchedRef.current) return;

    timeoutRef.current = setTimeout(() => {
      prefetchFn();
      prefetchedRef.current = true;
    }, prefetchDelay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <a
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ THROTTLED SCROLL - Scroll Event Optimizasyonu
// ═══════════════════════════════════════════════════════════════════════════════

export function useThrottledScroll(callback: (scrollY: number) => void, delay: number = 100) {
  const lastExecutionRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now();
      
      if (now - lastExecutionRef.current >= delay) {
        lastExecutionRef.current = now;
        callback(window.scrollY);
      } else {
        // Schedule for next frame
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
        frameRef.current = requestAnimationFrame(() => {
          callback(window.scrollY);
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [callback, delay]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧹 CLEANUP HOOK - Memory Leak Önleme
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useAbortController - Fetch isteklerini iptal etme
 * 
 * Component unmount olduğunda devam eden istekleri iptal eder
 */

export function useAbortController() {
  const controllerRef = useRef<AbortController>();

  const getSignal = useCallback(() => {
    // Önceki controller'ı iptal et
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    // Yeni controller oluştur
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  return { getSignal };
}

/**
 * useSafeState - Unmount sonrası state güncellemesini engelle
 */

export function useSafeState<T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialValue);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setState(value);
    }
  }, []);

  return [state, safeSetState];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 PERFORMANCE MONITOR - Performans İzleme Bileşeni
// ═══════════════════════════════════════════════════════════════════════════════

interface PerformanceMonitorProps {
  show?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function PerformanceMonitor({
  show = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    domNodes: 0,
    renderTime: 0,
  });

  useEffect(() => {
    if (!show) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measurePerformance = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
        
        // Memory (if available) - Chrome only
        const perfWithMemory = performance as unknown as { memory?: { usedJSHeapSize: number } };
        const memory = perfWithMemory.memory
          ? Math.round(perfWithMemory.memory.usedJSHeapSize / 1024 / 1024)
          : 0;

        // DOM nodes
        const domNodes = document.querySelectorAll('*').length;

        setMetrics({
          fps,
          memory,
          domNodes,
          renderTime: Math.round(currentTime - lastTime - 1000),
        });

        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measurePerformance);
    };

    animationId = requestAnimationFrame(measurePerformance);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [show]);

  if (!show) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'fixed z-50 bg-gray-900/90 text-white p-3 rounded-lg shadow-xl font-mono text-xs',
        positionClasses[position]
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Gauge className="w-4 h-4" />
        <span className="font-semibold">Performance</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            FPS
          </span>
          <span className={cn('font-bold', getFpsColor(metrics.fps))}>
            {metrics.fps}
          </span>
        </div>

        {metrics.memory > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              Memory
            </span>
            <span>{metrics.memory} MB</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            DOM Nodes
          </span>
          <span>{metrics.domNodes}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎭 MEMOIZED COMPONENT WRAPPER - Re-render Optimizasyonu
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * withMemo - Component'i deep comparison ile memo'lar
 */

export function withMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
): React.MemoExoticComponent<ComponentType<P>> {
  return memo(Component, propsAreEqual);
}

/**
 * useStableCallback - Referans değişmeden callback güncelleme
 */

export function useStableCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(callback: T): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 BATCH UPDATES - Toplu State Güncellemesi
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useBatchUpdates - Birden fazla state güncellemesini tek render'da yapar
 */

export function useBatchUpdates<T extends Record<string, unknown>>(initialState: T) {
  const [state, setState] = useState(initialState);
  const pendingUpdatesRef = useRef<Partial<T>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const update = useCallback((updates: Partial<T>) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, ...pendingUpdatesRef.current }));
      pendingUpdatesRef.current = {};
    }, 0);
  }, []);

  const immediateUpdate = useCallback((updates: Partial<T>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return { state, update, immediateUpdate };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 INTERSECTION OBSERVER HOOK - Görünürlük Takibi
// ═══════════════════════════════════════════════════════════════════════════════

interface UseIntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
): IntersectionObserverEntry | null {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    freezeOnceVisible = false,
  } = options;

  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const frozen = entry?.isIntersecting && freezeOnceVisible;

  useEffect(() => {
    const element = elementRef.current;
    if (!element || frozen) return;

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      { root, rootMargin, threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [elementRef, root, rootMargin, threshold, frozen]);

  return entry;
}
