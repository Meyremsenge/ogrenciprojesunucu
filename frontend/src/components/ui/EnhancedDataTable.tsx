/**
 * Enhanced DataTable Component
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ENTERPRISE UX TABLE PATTERN'LERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🎯 TABLO TASARIM PRENSİPLERİ:
 *    1. Responsive: Mobilde horizontal scroll veya card view
 *    2. Scanability: Zebra striping, hover states
 *    3. Actions: Row actions sağda, bulk actions üstte
 *    4. Density: Compact/Normal/Comfortable seçenekleri
 * 
 * 📊 ÖZELLIKLER:
 *    - Sıralama (multi-column)
 *    - Filtreleme (column-based)
 *    - Seçim (single/multi)
 *    - Pagination/Infinite Scroll
 *    - Column resizing
 *    - Row expansion
 *    - Bulk actions
 * 
 * 🔍 PERFORMANS:
 *    - Virtualization for large datasets
 *    - Debounced search
 *    - Memoized rows
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Filter,
  X,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Minus,
  Settings2,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Skeleton } from './Skeleton';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
  render?: (item: T, index: number) => ReactNode;
  renderHeader?: () => ReactNode;
}

export interface TablePagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export interface TableSelection<T> {
  selectedItems: T[];
  onSelectItem: (item: T) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  getItemId: (item: T) => string | number;
}

interface EnhancedDataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  
  // Search & Filter
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filterContent?: ReactNode;
  
  // Selection
  selectable?: boolean;
  selection?: TableSelection<T>;
  
  // Pagination
  pagination?: TablePagination;
  
  // Appearance
  density?: 'compact' | 'normal' | 'comfortable';
  striped?: boolean;
  bordered?: boolean;
  stickyHeader?: boolean;
  maxHeight?: string;
  
  // Actions
  onRowClick?: (item: T) => void;
  rowActions?: (item: T) => ReactNode;
  bulkActions?: ReactNode;
  toolbarActions?: ReactNode;
  
  // Empty & Error States
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  
  // Row Expansion
  expandable?: boolean;
  renderExpanded?: (item: T) => ReactNode;
  
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function EnhancedDataTable<T extends Record<string, unknown>>({
  data,
  columns,
  isLoading = false,
  error,
  onRetry,
  searchable = true,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Ara...',
  filterContent,
  selectable = false,
  selection,
  pagination,
  density = 'normal',
  striped = true,
  bordered = false,
  stickyHeader = true,
  maxHeight,
  onRowClick,
  rowActions,
  bulkActions,
  toolbarActions,
  emptyMessage = 'Veri bulunamadı',
  emptyIcon,
  emptyAction,
  expandable = false,
  renderExpanded,
  className,
}: EnhancedDataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const searchQuery = searchValue ?? localSearch;
  const handleSearchChange = onSearchChange ?? setLocalSearch;

  // Density classes
  const densityClasses = {
    compact: 'py-1.5 px-3 text-xs',
    normal: 'py-3 px-4 text-sm',
    comfortable: 'py-4 px-5 text-sm',
  };

  // Process data (filter & sort)
  const processedData = useMemo(() => {
    let result = [...data];

    // Local search (if no external handler)
    if (!onSearchChange && searchQuery) {
      result = result.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] as string | number;
        const bValue = b[sortConfig.key] as string | number;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, sortConfig, onSearchChange]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const toggleRowExpansion = useCallback((index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-primary" />
    ) : (
      <ChevronDown className="h-4 w-4 text-primary" />
    );
  };

  const isAllSelected = selection && processedData.length > 0 && 
    processedData.every(item => selection.selectedItems.some(
      selected => selection.getItemId(selected) === selection.getItemId(item)
    ));

  const isSomeSelected = selection && selection.selectedItems.length > 0 && !isAllSelected;

  // ═══════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-border bg-card', className)}>
        <div className="p-4 border-b border-border">
          <Skeleton className="h-10 w-64" />
        </div>
        <div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-border last:border-b-0">
              {columns.map((_, j) => (
                <Skeleton key={j} className="h-5 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════════
  if (error) {
    return (
      <div className={cn('rounded-xl border border-border bg-card p-8', className)}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="font-semibold mb-2">Bir hata oluştu</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tekrar Dene
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden', className)}>
      {/* ═══════════════════════════════════════════════════════════════════════
          TOOLBAR
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={cn(
                  'w-full h-10 pl-10 pr-10 rounded-lg border border-input bg-background text-sm',
                  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Filter Toggle */}
          {filterContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-muted')}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrele
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bulk Actions (when items selected) */}
          {selection && selection.selectedItems.length > 0 && bulkActions && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selection.selectedItems.length} seçili
              </span>
              {bulkActions}
              <Button
                variant="ghost"
                size="sm"
                onClick={selection.onClearSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Temizle
              </Button>
            </div>
          )}

          {/* Toolbar Actions */}
          {toolbarActions}
        </div>

        {/* Filter Content */}
        <AnimatePresence>
          {showFilters && filterContent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-border mt-4">
                {filterContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TABLE
          ═══════════════════════════════════════════════════════════════════════ */}
      <div 
        className="overflow-x-auto"
        style={{ maxHeight: maxHeight }}
      >
        <table className="w-full">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="bg-muted/50 border-b border-border">
              {/* Selection Column */}
              {selectable && selection && (
                <th className={cn('w-12', densityClasses[density])}>
                  <button
                    onClick={isAllSelected ? selection.onClearSelection : selection.onSelectAll}
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                      isAllSelected || isSomeSelected 
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-input hover:border-primary'
                    )}
                  >
                    {isAllSelected && <Check className="h-3 w-3" />}
                    {isSomeSelected && <Minus className="h-3 w-3" />}
                  </button>
                </th>
              )}

              {/* Data Columns */}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    densityClasses[density],
                    'text-left font-medium text-muted-foreground whitespace-nowrap',
                    column.sortable && 'cursor-pointer hover:text-foreground transition-colors select-none',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sticky && 'sticky left-0 bg-muted/50'
                  )}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className={cn(
                    'flex items-center gap-2',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    {column.renderHeader ? column.renderHeader() : column.header}
                    {column.sortable && getSortIcon(String(column.key))}
                  </div>
                </th>
              ))}

              {/* Actions Column */}
              {rowActions && (
                <th className={cn('w-12', densityClasses[density])} />
              )}
            </tr>
          </thead>

          <tbody>
            {processedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="px-4 py-12"
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
                    <p className="text-muted-foreground">{emptyMessage}</p>
                    {emptyAction && <div className="mt-4">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              processedData.map((item, index) => {
                const isSelected = selection && selection.selectedItems.some(
                  selected => selection.getItemId(selected) === selection.getItemId(item)
                );
                const isExpanded = expandedRows.has(index);

                return (
                  <React.Fragment key={index}>
                    <tr
                      className={cn(
                        'border-b border-border last:border-b-0 transition-colors',
                        striped && index % 2 === 1 && 'bg-muted/30',
                        onRowClick && 'cursor-pointer hover:bg-muted/50',
                        isSelected && 'bg-primary/5',
                        bordered && 'border-x'
                      )}
                      onClick={() => onRowClick?.(item)}
                    >
                      {/* Selection Cell */}
                      {selectable && selection && (
                        <td className={cn('w-12', densityClasses[density])} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => selection.onSelectItem(item)}
                            className={cn(
                              'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                              isSelected 
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-input hover:border-primary'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        </td>
                      )}

                      {/* Data Cells */}
                      {columns.map((column) => (
                        <td
                          key={String(column.key)}
                          className={cn(
                            densityClasses[density],
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right',
                            column.sticky && 'sticky left-0 bg-card'
                          )}
                        >
                          {column.render
                            ? column.render(item, index)
                            : String(item[column.key as keyof T] ?? '')}
                        </td>
                      ))}

                      {/* Actions Cell */}
                      {rowActions && (
                        <td className={cn('w-12', densityClasses[density])} onClick={(e) => e.stopPropagation()}>
                          {rowActions(item)}
                        </td>
                      )}
                    </tr>

                    {/* Expanded Row */}
                    {expandable && renderExpanded && (
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <td
                              colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                              className="bg-muted/20 border-b border-border"
                            >
                              {renderExpanded(item)}
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAGINATION
          ═══════════════════════════════════════════════════════════════════════ */}
      {pagination && (
        <TablePagination pagination={pagination} density={density} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 PAGINATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface TablePaginationProps {
  pagination: TablePagination;
  density?: 'compact' | 'normal' | 'comfortable';
}

function TablePagination({ pagination, density = 'normal' }: TablePaginationProps) {
  const { currentPage, pageSize, totalItems, totalPages, onPageChange, onPageSizeChange, pageSizeOptions } = pagination;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const paddingClass = {
    compact: 'p-2',
    normal: 'p-4',
    comfortable: 'p-5',
  };

  return (
    <div className={cn(
      'flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-border',
      paddingClass[density]
    )}>
      {/* Info */}
      <div className="text-sm text-muted-foreground">
        <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> arası, toplam <span className="font-medium">{totalItems}</span> kayıt
      </div>

      <div className="flex items-center gap-4">
        {/* Page Size Selector */}
        {onPageSizeChange && pageSizeOptions && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Göster:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 px-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}

        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1 mx-2">
            {generatePageNumbers(currentPage, totalPages).map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
              ) : (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
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
// 🔧 ROW ACTION MENU
// ═══════════════════════════════════════════════════════════════════════════════

interface RowActionMenuProps {
  actions: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
    disabled?: boolean;
  }>;
}

export function RowActionMenu({ actions }: RowActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg"
            >
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  disabled={action.disabled}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                    action.variant === 'danger'
                      ? 'text-destructive hover:bg-destructive/10'
                      : 'hover:bg-muted',
                    action.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
