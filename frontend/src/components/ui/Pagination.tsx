/**
 * Pagination & Infinite Scroll Components
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PAGINATION vs INFINITE SCROLL KARARLARI:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 📄 PAGINATION KULLAN:
 *    - Veri tablolarında (kullanıcı belirli bir satıra dönmek isteyebilir)
 *    - Admin panellerinde (belirli sayfaya git önemli)
 *    - Arama sonuçlarında (toplam sonuç sayısı görünmeli)
 *    - SEO önemli sayfalarda
 * 
 * ♾️ INFINITE SCROLL KULLAN:
 *    - Feed tipi içeriklerde (sosyal medya akışı)
 *    - Görsel galerilerinde
 *    - Mobil uygulamalarda
 *    - Keşif odaklı sayfalarda
 * 
 * ⚠️ INFINITE SCROLL DİKKAT NOKTALARI:
 *    - Footer'a erişimi zorlaştırır
 *    - "Neredeyim" hissi kaybolabilir
 *    - Geri dönüş zorlaşır
 *    - Performans sorunları olabilir
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Loader2,
  ArrowUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 PAGINATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showInfo?: boolean;
  showPageSize?: boolean;
  showQuickJump?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'simple' | 'minimal';
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showInfo = true,
  showPageSize = true,
  showQuickJump = false,
  size = 'md',
  variant = 'default',
  className,
}: PaginationProps) {
  const [jumpValue, setJumpValue] = useState('');

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems || currentPage * pageSize);

  const handleJump = () => {
    const page = parseInt(jumpValue, 10);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpValue('');
    }
  };

  const sizeClasses = {
    sm: { button: 'h-7 w-7 text-xs', text: 'text-xs' },
    md: { button: 'h-8 w-8 text-sm', text: 'text-sm' },
    lg: { button: 'h-10 w-10 text-base', text: 'text-base' },
  };

  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          variant="outline"
          size="icon"
          className={sizeClasses[size].button}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className={cn('px-2', sizeClasses[size].text)}>
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className={sizeClasses[size].button}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (variant === 'simple') {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Önceki
        </Button>
        <span className={cn('text-muted-foreground', sizeClasses[size].text)}>
          Sayfa {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Sonraki
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col md:flex-row md:items-center md:justify-between gap-4', className)}>
      {/* Info */}
      {showInfo && totalItems !== undefined && (
        <div className={cn('text-muted-foreground', sizeClasses[size].text)}>
          <span className="font-medium">{startItem}</span> - 
          <span className="font-medium"> {endItem}</span> arası, toplam 
          <span className="font-medium"> {totalItems}</span> kayıt
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Page Size Selector */}
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className={cn('text-muted-foreground', sizeClasses[size].text)}>Göster:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cn(
                'rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring',
                size === 'sm' && 'h-7 px-1.5 text-xs',
                size === 'md' && 'h-8 px-2 text-sm',
                size === 'lg' && 'h-10 px-3 text-base'
              )}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}

        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <Button
            variant="outline"
            size="icon"
            className={sizeClasses[size].button}
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="İlk sayfa"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous Page */}
          <Button
            variant="outline"
            size="icon"
            className={sizeClasses[size].button}
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Önceki sayfa"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1 mx-1">
            {pageNumbers.map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              ) : (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon"
                  className={sizeClasses[size].button}
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )
            ))}
          </div>

          {/* Next Page */}
          <Button
            variant="outline"
            size="icon"
            className={sizeClasses[size].button}
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Sonraki sayfa"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last Page */}
          <Button
            variant="outline"
            size="icon"
            className={sizeClasses[size].button}
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Son sayfa"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Jump */}
        {showQuickJump && totalPages > 10 && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              placeholder="Git"
              className={cn(
                'w-16 rounded border border-input bg-background text-center focus:outline-none focus:ring-2 focus:ring-ring',
                size === 'sm' && 'h-7 text-xs',
                size === 'md' && 'h-8 text-sm',
                size === 'lg' && 'h-10 text-base'
              )}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleJump}
              disabled={!jumpValue}
            >
              Git
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }

  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, '...', current - 1, current, current + 1, '...', total];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ♾️ INFINITE SCROLL
// ═══════════════════════════════════════════════════════════════════════════════

interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loader?: React.ReactNode;
  endMessage?: React.ReactNode;
  threshold?: number;
  className?: string;
}

export function InfiniteScroll({
  children,
  hasMore,
  isLoading,
  onLoadMore,
  loader,
  endMessage,
  threshold = 200,
  className,
}: InfiniteScrollProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    if (triggerRef.current) {
      observerRef.current.observe(triggerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return (
    <div className={className}>
      {children}
      
      <div ref={triggerRef} className="w-full">
        {isLoading && (
          <div className="flex justify-center py-8">
            {loader || (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Yükleniyor...</span>
              </div>
            )}
          </div>
        )}

        {!hasMore && !isLoading && endMessage && (
          <div className="py-8 text-center text-muted-foreground">
            {endMessage}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔝 SCROLL TO TOP BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

interface ScrollToTopProps {
  threshold?: number;
  smooth?: boolean;
  className?: string;
}

export function ScrollToTop({ threshold = 400, smooth = true, className }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className={cn(
            'fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'transition-colors duration-200',
            className
          )}
          title="Yukarı çık"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 LOAD MORE BUTTON (Alternative to Infinite Scroll)
// ═══════════════════════════════════════════════════════════════════════════════

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  hasMore: boolean;
  loadedCount?: number;
  totalCount?: number;
  className?: string;
}

export function LoadMoreButton({
  onClick,
  isLoading,
  hasMore,
  loadedCount,
  totalCount,
  className,
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return null;
  }

  return (
    <div className={cn('flex flex-col items-center gap-2 py-6', className)}>
      {loadedCount !== undefined && totalCount !== undefined && (
        <div className="text-sm text-muted-foreground">
          {loadedCount} / {totalCount} gösteriliyor
        </div>
      )}
      <Button
        variant="outline"
        onClick={onClick}
        disabled={isLoading}
        className="min-w-[200px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Yükleniyor...
          </>
        ) : (
          'Daha Fazla Yükle'
        )}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 PROGRESS INDICATOR (for Infinite Scroll)
// ═══════════════════════════════════════════════════════════════════════════════

interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setProgress(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={cn('fixed top-0 left-0 right-0 h-1 z-50 bg-muted', className)}>
      <motion.div
        className="h-full bg-primary"
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 PAGINATION HOOK
// ═══════════════════════════════════════════════════════════════════════════════

interface UsePaginationOptions {
  totalItems: number;
  initialPage?: number;
  initialPageSize?: number;
}

export function usePagination({ totalItems, initialPage = 1, initialPageSize = 10 }: UsePaginationOptions) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.ceil(totalItems / pageSize);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    currentPage,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ♾️ INFINITE SCROLL HOOK
// ═══════════════════════════════════════════════════════════════════════════════

interface UseInfiniteScrollOptions<T> {
  fetchFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>;
  initialData?: T[];
}

export function useInfiniteScroll<T>({ fetchFn, initialData = [] }: UseInfiniteScrollOptions<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn(page);
      setData(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, page, isLoading, hasMore]);

  const reset = useCallback(() => {
    setData(initialData);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, [initialData]);

  return {
    data,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset,
  };
}
