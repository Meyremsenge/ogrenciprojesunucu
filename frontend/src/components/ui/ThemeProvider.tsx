/**
 * Theme Provider & Hook
 * Light/Dark mode yönetimi
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 THEME TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** Mevcut tema ayarı */
  theme: Theme;
  /** Çözümlenmiş tema (system ise tarayıcı tercihine göre) */
  resolvedTheme: ResolvedTheme;
  /** Tema değiştir */
  setTheme: (theme: Theme) => void;
  /** Temayı toggle et */
  toggleTheme: () => void;
  /** Tema yüklendi mi? */
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 THEME UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const THEME_STORAGE_KEY = 'ogrenci-kocluk-theme';

/**
 * Sistem tema tercihini al
 */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Local storage'dan temayı al
 */
const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
};

/**
 * Temayı local storage'a kaydet
 */
const storeTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

/**
 * Temayı DOM'a uygula
 */
const applyTheme = (resolvedTheme: ResolvedTheme): void => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
  
  // Meta tag güncelle (mobil tarayıcılar için)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      'content',
      resolvedTheme === 'dark' ? '#0f172a' : '#ffffff'
    );
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎭 THEME PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface ThemeProviderProps {
  children: ReactNode;
  /** Varsayılan tema */
  defaultTheme?: Theme;
  /** Tema değişiminde animasyon */
  enableTransition?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableTransition = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // İlk yüklemede stored theme'i al
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    
    const resolved = stored === 'system' ? getSystemTheme() : stored;
    setResolvedTheme(resolved);
    applyTheme(resolved);
    
    setIsLoaded(true);
  }, []);

  // Sistem tema değişikliğini dinle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Tema değiştir
  const setTheme = useCallback((newTheme: Theme) => {
    // Transition efekti için
    if (enableTransition) {
      document.documentElement.style.setProperty('--theme-transition', '0.3s');
      document.documentElement.classList.add('theme-transitioning');
      
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 300);
    }

    setThemeState(newTheme);
    storeTheme(newTheme);
    
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [enableTransition]);

  // Toggle tema
  const toggleTheme = useCallback(() => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        isLoaded,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🪝 USE THEME HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 THEME TOGGLE BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  /** Sadece light/dark toggle mı? */
  simple?: boolean;
  /** Size */
  size?: 'sm' | 'default' | 'lg';
  /** Variant */
  variant?: 'ghost' | 'outline';
  /** Ek class */
  className?: string;
}

export function ThemeToggle({
  simple = true,
  size = 'default',
  variant = 'ghost',
  className,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (simple) {
    return (
      <Button
        variant={variant}
        size={size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : 'icon'}
        onClick={toggleTheme}
        className={cn('relative', className)}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <Sun
          className={cn(
            'h-5 w-5 transition-all',
            resolvedTheme === 'dark'
              ? 'rotate-0 scale-100'
              : 'rotate-90 scale-0 absolute'
          )}
        />
        <Moon
          className={cn(
            'h-5 w-5 transition-all',
            resolvedTheme === 'light'
              ? 'rotate-0 scale-100'
              : '-rotate-90 scale-0 absolute'
          )}
        />
      </Button>
    );
  }

  // Üç seçenekli toggle
  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-muted', className)}>
      <Button
        variant={theme === 'light' ? 'secondary' : 'ghost'}
        size="icon-sm"
        onClick={() => setTheme('light')}
        aria-label="Light mode"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant={theme === 'dark' ? 'secondary' : 'ghost'}
        size="icon-sm"
        onClick={() => setTheme('dark')}
        aria-label="Dark mode"
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        variant={theme === 'system' ? 'secondary' : 'ghost'}
        size="icon-sm"
        onClick={() => setTheme('system')}
        aria-label="System theme"
      >
        <Monitor className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { ThemeContext };
