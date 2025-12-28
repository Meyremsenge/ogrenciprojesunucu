/**
 * Search & Filter Components
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ENTERPRISE UX FİLTRELEME PATTERN'LERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🔍 ARAMA DENEYİMİ:
 *    1. Debounced search: 300ms bekle, sonra ara
 *    2. Instant feedback: Loading spinner while searching
 *    3. Clear button: X ile temizleme
 *    4. Recent searches: Son 5 arama önerisi
 *    5. Keyboard shortcuts: Cmd+K / Ctrl+K
 * 
 * 🎯 FİLTRE PRENSİPLERİ:
 *    1. Progressive disclosure: Temel filtreler görünür, gelişmiş gizli
 *    2. Active filter chips: Seçili filtreler görünür
 *    3. Clear all: Tek tıkla tüm filtreleri temizle
 *    4. Save filters: Sık kullanılan filtre kombinasyonları
 * 
 * 📊 FİLTRE TİPLERİ:
 *    - Select: Tekli seçim dropdown
 *    - MultiSelect: Çoklu seçim
 *    - DateRange: Tarih aralığı
 *    - NumberRange: Sayı aralığı
 *    - Toggle: Boolean filtre
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Check,
  Calendar,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  Loader2,
  History,
  Bookmark,
  BookmarkPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 SEARCH INPUT
// ═══════════════════════════════════════════════════════════════════════════════

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  isLoading?: boolean;
  showClear?: boolean;
  showShortcut?: boolean;
  recentSearches?: string[];
  onRecentSearchClick?: (search: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Ara...',
  debounceMs = 300,
  isLoading = false,
  showClear = true,
  showShortcut = false,
  recentSearches = [],
  onRecentSearchClick,
  size = 'md',
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [showRecent, setShowRecent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localValue, debounceMs, onChange, value]);

  // Keyboard shortcut
  useEffect(() => {
    if (!showShortcut) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showShortcut]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground',
          size === 'sm' && 'h-3.5 w-3.5',
          size === 'md' && 'h-4 w-4',
          size === 'lg' && 'h-5 w-5'
        )} />
        
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => recentSearches.length > 0 && setShowRecent(true)}
          onBlur={() => setTimeout(() => setShowRecent(false), 200)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border border-input bg-background pl-10',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'transition-all duration-200',
            sizeClasses[size],
            (showClear || isLoading || showShortcut) && 'pr-24',
            className
          )}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          
          {showClear && localValue && !isLoading && (
            <button
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {showShortcut && (
            <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Recent Searches Dropdown */}
      <AnimatePresence>
        {showRecent && recentSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
          >
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                <History className="h-3 w-3" />
                Son Aramalar
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setLocalValue(search);
                    onChange(search);
                    onRecentSearchClick?.(search);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                >
                  <Search className="h-3 w-3 text-muted-foreground" />
                  {search}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 FILTER BAR
// ═══════════════════════════════════════════════════════════════════════════════

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'toggle';
  options?: FilterOption[];
  placeholder?: string;
}

interface ActiveFilter {
  key: string;
  value: string | string[] | boolean | { from?: string; to?: string };
  label: string;
}

interface FilterBarProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilter[];
  onFilterChange: (key: string, value: unknown) => void;
  onClearFilter: (key: string) => void;
  onClearAll: () => void;
  showAdvanced?: boolean;
  advancedFilters?: FilterConfig[];
  savedFilters?: Array<{ name: string; filters: ActiveFilter[] }>;
  onSaveFilter?: (name: string) => void;
  onLoadFilter?: (filters: ActiveFilter[]) => void;
  className?: string;
}

export function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onClearFilter,
  onClearAll,
  showAdvanced = false,
  advancedFilters = [],
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  className,
}: FilterBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Primary Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((filter) => (
          <FilterDropdown
            key={filter.key}
            filter={filter}
            value={activeFilters.find(f => f.key === filter.key)?.value}
            onChange={(value) => onFilterChange(filter.key, value)}
          />
        ))}

        {/* Advanced Toggle */}
        {showAdvanced && advancedFilters.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={cn(isAdvancedOpen && 'bg-muted')}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Gelişmiş
            {isAdvancedOpen ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
        )}

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Temizle
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {isAdvancedOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
              {advancedFilters.map((filter) => (
                <FilterDropdown
                  key={filter.key}
                  filter={filter}
                  value={activeFilters.find(f => f.key === filter.key)?.value}
                  onChange={(value) => onFilterChange(filter.key, value)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Aktif filtreler:</span>
          {activeFilters.map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              value={formatFilterValue(filter.value)}
              onRemove={() => onClearFilter(filter.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 FILTER DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════════

interface FilterDropdownProps {
  filter: FilterConfig;
  value?: unknown;
  onChange: (value: unknown) => void;
}

function FilterDropdown({ filter, value, onChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== '';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors',
          hasValue 
            ? 'border-primary bg-primary/5 text-primary' 
            : 'border-input hover:bg-muted'
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        {filter.label}
        {hasValue && (
          <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-xs">
            {Array.isArray(value) ? value.length : 1}
          </span>
        )}
        <ChevronDown className={cn(
          'h-4 w-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-popover p-1 shadow-lg"
            >
              {filter.type === 'select' && filter.options && (
                <SelectOptions
                  options={filter.options}
                  value={value as string}
                  onChange={(v) => {
                    onChange(v);
                    setIsOpen(false);
                  }}
                />
              )}
              {filter.type === 'multiselect' && filter.options && (
                <MultiSelectOptions
                  options={filter.options}
                  value={(value as string[]) || []}
                  onChange={onChange}
                />
              )}
              {filter.type === 'toggle' && (
                <ToggleOptions
                  value={value as boolean}
                  onChange={(v) => {
                    onChange(v);
                    setIsOpen(false);
                  }}
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SelectOptions({ options, value, onChange }: { 
  options: FilterOption[]; 
  value?: string; 
  onChange: (value: string) => void;
}) {
  return (
    <div className="max-h-64 overflow-y-auto">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors',
            value === option.value ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          )}
        >
          <span>{option.label}</span>
          <div className="flex items-center gap-2">
            {option.count !== undefined && (
              <span className="text-xs text-muted-foreground">{option.count}</span>
            )}
            {value === option.value && <Check className="h-4 w-4" />}
          </div>
        </button>
      ))}
    </div>
  );
}

function MultiSelectOptions({ options, value, onChange }: { 
  options: FilterOption[]; 
  value: string[]; 
  onChange: (value: string[]) => void;
}) {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="max-h-64 overflow-y-auto">
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => toggleOption(option.value)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors',
              isSelected ? 'bg-primary/10' : 'hover:bg-muted'
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-4 h-4 rounded border flex items-center justify-center',
                isSelected ? 'bg-primary border-primary' : 'border-input'
              )}>
                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <span>{option.label}</span>
            </div>
            {option.count !== undefined && (
              <span className="text-xs text-muted-foreground">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ToggleOptions({ value, onChange }: { 
  value?: boolean; 
  onChange: (value: boolean | undefined) => void;
}) {
  return (
    <div className="p-1">
      <button
        onClick={() => onChange(true)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors',
          value === true ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
        )}
      >
        <span>Evet</span>
        {value === true && <Check className="h-4 w-4" />}
      </button>
      <button
        onClick={() => onChange(false)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors',
          value === false ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
        )}
      >
        <span>Hayır</span>
        {value === false && <Check className="h-4 w-4" />}
      </button>
      <button
        onClick={() => onChange(undefined)}
        className="w-full px-3 py-2 text-sm text-muted-foreground rounded hover:bg-muted transition-colors"
      >
        Temizle
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ FILTER CHIP
// ═══════════════════════════════════════════════════════════════════════════════

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-sm">
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 DATE RANGE PICKER
// ═══════════════════════════════════════════════════════════════════════════════

interface DateRangePickerProps {
  value?: { from?: string; to?: string };
  onChange: (value: { from?: string; to?: string }) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({ value, onChange, placeholder = 'Tarih seçin', className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDateRange = () => {
    if (!value?.from && !value?.to) return placeholder;
    if (value.from && value.to) return `${value.from} - ${value.to}`;
    if (value.from) return `${value.from} - ...`;
    return `... - ${value.to}`;
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors',
          value?.from || value?.to
            ? 'border-primary bg-primary/5 text-primary' 
            : 'border-input hover:bg-muted'
        )}
      >
        <Calendar className="h-4 w-4" />
        <span>{formatDateRange()}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 mt-1 z-50 p-4 rounded-lg border border-border bg-popover shadow-lg"
            >
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Başlangıç</label>
                  <input
                    type="date"
                    value={value?.from || ''}
                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                    className="h-9 px-3 rounded border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bitiş</label>
                  <input
                    type="date"
                    value={value?.to || ''}
                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                    className="h-9 px-3 rounded border border-input bg-background text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onChange({});
                    setIsOpen(false);
                  }}
                >
                  Temizle
                </Button>
                <Button size="sm" onClick={() => setIsOpen(false)}>
                  Uygula
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatFilterValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 2 ? `${value.length} seçili` : value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Evet' : 'Hayır';
  }
  if (typeof value === 'object' && value !== null) {
    const range = value as { from?: string; to?: string };
    if (range.from && range.to) return `${range.from} - ${range.to}`;
    if (range.from) return `${range.from}'dan`;
    if (range.to) return `${range.to}'a kadar`;
  }
  return String(value);
}
