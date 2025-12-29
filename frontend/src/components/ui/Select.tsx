/**
 * Select Component
 * 
 * Dropdown seçim bileşeni.
 */

import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Seçenekler (opsiyonel - children ile de kullanılabilir) */
  options?: SelectOption[];
  /** Placeholder */
  placeholder?: string;
  /** Hata durumu */
  error?: boolean;
  /** Hata mesajı */
  errorMessage?: string;
  /** Yardım metni */
  helperText?: string;
  /** Etiket */
  label?: string;
  /** Zorunlu alan */
  required?: boolean;
  /** Boyut */
  size?: 'sm' | 'md' | 'lg';
  /** Children - option elemanları */
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: 'h-8 text-sm px-2 pr-8',
  md: 'h-10 text-base px-3 pr-10',
  lg: 'h-12 text-lg px-4 pr-12',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      options,
      placeholder,
      error,
      errorMessage,
      helperText,
      label,
      required,
      size = 'md',
      id,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'block w-full rounded-lg border appearance-none',
              'text-gray-900 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'transition-colors duration-200',
              sizeClasses[size],
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
              props.disabled && 'bg-gray-100 cursor-not-allowed opacity-60',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error && errorMessage
                ? `${selectId}-error`
                : helperText
                ? `${selectId}-helper`
                : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {/* options prop ile veya children ile kullanılabilir */}
            {options ? options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            )) : children}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {error && errorMessage && (
          <p id={`${selectId}-error`} className="mt-1 text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        {!error && helperText && (
          <p id={`${selectId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Multi-Select Component
export interface MultiSelectProps {
  options: SelectOption[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  placeholder?: string;
  label?: string;
  error?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seçiniz...',
  label,
  error,
  errorMessage,
  disabled,
  className,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(
      (opt) => opt.value
    );
    onChange(selectedOptions);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <select
        multiple
        value={value.map(String)}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'block w-full rounded-lg border px-3 py-2',
          'text-gray-900 bg-white min-h-[120px]',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-300 focus:ring-red-500/20'
            : 'border-gray-300 focus:ring-primary-500/20',
          disabled && 'bg-gray-100 cursor-not-allowed opacity-60',
          className
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      {error && errorMessage && (
        <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
};

export default Select;
