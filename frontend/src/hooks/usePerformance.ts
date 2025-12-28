/**
 * Performance Optimization Hooks
 * React performans optimizasyonları için yardımcı hooks
 */

import {
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  DependencyList,
} from 'react';

// ==================== useDebouncedValue ====================

/**
 * Değeri debounce eder - API aramaları için ideal
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ==================== useDebouncedCallback ====================

/**
 * Callback'i debounce eder
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedCallback = useCallback(
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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// ==================== useThrottledCallback ====================

/**
 * Callback'i throttle eder
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number = 300
): (...args: Parameters<T>) => void {
  const lastRun = useRef<number>(Date.now());

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= limit) {
        callback(...args);
        lastRun.current = Date.now();
      }
    },
    [callback, limit]
  );

  return throttledCallback;
}

// ==================== usePrevious ====================

/**
 * Önceki değeri saklar
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// ==================== useLatest ====================

/**
 * Her zaman en son değere erişim sağlar (callback'ler için ideal)
 */
export function useLatest<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef<T>(value);
  ref.current = value;
  return ref;
}

// ==================== useMemoCompare ====================

/**
 * Custom comparison function ile memoize eder
 */
export function useMemoCompare<T>(
  next: T,
  compare: (prev: T | undefined, next: T) => boolean
): T {
  const previousRef = useRef<T>();
  const previous = previousRef.current;

  const isEqual = compare(previous, next);

  useEffect(() => {
    if (!isEqual) {
      previousRef.current = next;
    }
  });

  return isEqual ? previous as T : next;
}

// ==================== useDeepCompareMemo ====================

/**
 * Deep equality check ile memoize eder
 */
export function useDeepCompareMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  const ref = useRef<{ deps: DependencyList; value: T }>();

  const isEqual = ref.current && deepEqual(ref.current.deps, deps);

  if (!isEqual) {
    ref.current = { deps, value: factory() };
  }

  return ref.current!.value;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

// ==================== useLocalStorage ====================

/**
 * localStorage ile senkronize state
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

// ==================== useSessionStorage ====================

/**
 * sessionStorage ile senkronize state
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error('Error saving to sessionStorage:', error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

// ==================== useRenderCount ====================

/**
 * Render sayısını takip eder (development için)
 */
export function useRenderCount(componentName?: string): number {
  const count = useRef(0);
  count.current++;

  if (import.meta.env.DEV && componentName) {
    console.log(`${componentName} rendered: ${count.current} times`);
  }

  return count.current;
}

// ==================== useUpdateEffect ====================

/**
 * İlk render'da çalışmayan useEffect
 */
export function useUpdateEffect(effect: React.EffectCallback, deps?: DependencyList): void {
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ==================== useIsFirstRender ====================

/**
 * İlk render olup olmadığını kontrol eder
 */
export function useIsFirstRender(): boolean {
  const isFirst = useRef(true);

  if (isFirst.current) {
    isFirst.current = false;
    return true;
  }

  return false;
}

// ==================== useUnmount ====================

/**
 * Unmount callback'i
 */
export function useUnmount(fn: () => void): void {
  const fnRef = useLatest(fn);

  useEffect(
    () => () => {
      fnRef.current();
    },
    []
  );
}

// ==================== useIsMounted ====================

/**
 * Component'in mount durumunu kontrol eder
 */
export function useIsMounted(): () => boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

// ==================== useAsyncEffect ====================

/**
 * Async effect hook
 */
export function useAsyncEffect(
  effect: () => Promise<void | (() => void)>,
  deps?: DependencyList
): void {
  const isMounted = useIsMounted();

  useEffect(() => {
    let cleanup: void | (() => void);

    const runEffect = async () => {
      cleanup = await effect();
    };

    runEffect();

    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ==================== useTimeout ====================

/**
 * Timeout yönetimi
 */
export function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = useLatest(callback);

  useEffect(() => {
    if (delay === null) return;

    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay, savedCallback]);
}

// ==================== useInterval ====================

/**
 * Interval yönetimi
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useLatest(callback);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay, savedCallback]);
}
