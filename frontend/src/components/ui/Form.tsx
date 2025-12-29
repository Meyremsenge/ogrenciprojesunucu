/**
 * Form UX Components
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ENTERPRISE UX FORM PATTERN'LERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🎯 FORM TASARIM PRENSİPLERİ:
 *    1. Progresif açıklama: Sadece gerekli alanlar görünür
 *    2. Anında validasyon: Blur'da validate, submit'te tümünü kontrol
 *    3. Hata önleme: Input maskeleri, karakter limitleri
 *    4. Bağlamsal yardım: Tooltip, hint text, örnek değerler
 * 
 * 📝 INPUT PATTERN'LERİ:
 *    - Required alanlar: Yıldız (*) ile işaretli
 *    - Optional alanlar: "(İsteğe bağlı)" etiketi
 *    - Disabled: %50 opacity + cursor-not-allowed
 *    - Loading: Spinner + disabled state
 * 
 * ⚠️ HATA GÖSTERİMİ:
 *    - Field-level: Input altında kırmızı mesaj
 *    - Form-level: Üstte Alert banner
 *    - Inline: Input border kırmızı + shake animation
 * 
 * ✅ BAŞARI GÖSTERİMİ:
 *    - Checkmark icon
 *    - Yeşil border
 *    - Toast notification
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { forwardRef, createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  Info,
  HelpCircle,
  Loader2,
  Eye,
  EyeOff,
  X,
  ChevronDown,
  Calendar,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 FORM CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface FormContextValue {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  setFieldError: (field: string, error: string) => void;
  setFieldTouched: (field: string) => void;
  clearFieldError: (field: string) => void;
}

const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext() {
  return useContext(FormContext);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 FORM WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function Form({ onSubmit, children, className, ...props }: FormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const setFieldTouched = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContext.Provider
      value={{ errors, touched, isSubmitting, setFieldError, setFieldTouched, clearFieldError }}
    >
      <form onSubmit={handleSubmit} className={className} {...props}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 FORM FIELD WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

interface FormFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  tooltip?: string;
  error?: string;
  success?: boolean;
  successMessage?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  name,
  label,
  required,
  optional,
  hint,
  tooltip,
  error,
  success,
  successMessage,
  className,
  children,
}: FormFieldProps) {
  const formContext = useFormContext();
  const contextError = formContext?.errors[name];
  const displayError = error || contextError;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={name}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
            {optional && (
              <span className="text-muted-foreground text-xs ml-2">(İsteğe bağlı)</span>
            )}
          </label>
          {tooltip && (
            <TooltipIcon content={tooltip} />
          )}
        </div>
      )}
      
      <div className="relative">
        {children}
      </div>

      <AnimatePresence mode="wait">
        {displayError && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{displayError}</span>
          </motion.div>
        )}
        {success && successMessage && !displayError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-sm text-green-600"
          >
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}
        {hint && !displayError && !success && (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 ENHANCED INPUT
// ═══════════════════════════════════════════════════════════════════════════════

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ 
    className, 
    type, 
    error, 
    success, 
    loading,
    leftIcon, 
    rightIcon, 
    clearable,
    onClear,
    disabled,
    value,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    const hasValue = value !== undefined && value !== '';

    return (
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {leftIcon}
          </span>
        )}
        
        <input
          type={inputType}
          ref={ref}
          disabled={disabled || loading}
          value={value}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200',
            leftIcon && 'pl-10',
            (rightIcon || isPassword || clearable || loading) && 'pr-10',
            error && 'border-destructive focus-visible:ring-destructive animate-shake',
            success && 'border-green-500 focus-visible:ring-green-500',
            !error && !success && 'border-input focus-visible:ring-ring',
            className
          )}
          {...props}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {clearable && hasValue && !loading && (
            <button
              type="button"
              onClick={onClear}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isPassword && !loading && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          {success && !loading && !isPassword && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {rightIcon && !loading && !isPassword && !success && !clearable && rightIcon}
        </div>
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 TEXTAREA
// ═══════════════════════════════════════════════════════════════════════════════

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
  showCount?: boolean;
  maxLength?: number;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, error, success, showCount, maxLength, value, ...props }, ref) => {
    const charCount = String(value || '').length;

    return (
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={cn(
            'flex min-h-[100px] w-full rounded-lg border bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200 resize-y',
            error && 'border-destructive focus-visible:ring-destructive',
            success && 'border-green-500 focus-visible:ring-green-500',
            !error && !success && 'border-input focus-visible:ring-ring',
            showCount && 'pb-6',
            className
          )}
          {...props}
        />
        {showCount && maxLength && (
          <span className={cn(
            'absolute bottom-2 right-3 text-xs',
            charCount >= maxLength ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 SELECT
// ═══════════════════════════════════════════════════════════════════════════════

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  success?: boolean;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, options, placeholder, error, success, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm appearance-none',
            'ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200 pr-10',
            error && 'border-destructive focus-visible:ring-destructive',
            success && 'border-green-500 focus-visible:ring-green-500',
            !error && !success && 'border-input focus-visible:ring-ring',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 CHECKBOX
// ═══════════════════════════════════════════════════════════════════════════════

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: boolean;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ className, label, description, error, ...props }, ref) => {
    return (
      <label className={cn(
        'flex items-start gap-3 cursor-pointer group',
        props.disabled && 'cursor-not-allowed opacity-50',
        className
      )}>
        <div className="relative mt-0.5">
          <input
            type="checkbox"
            ref={ref}
            className={cn(
              'peer h-4 w-4 shrink-0 rounded border appearance-none cursor-pointer',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed',
              'checked:bg-primary checked:border-primary',
              error ? 'border-destructive focus-visible:ring-destructive' : 'border-input focus-visible:ring-ring',
            )}
            {...props}
          />
          <CheckCircle className="absolute top-0 left-0 h-4 w-4 text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none" />
        </div>
        <div className="space-y-1">
          <span className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
            {label}
          </span>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </label>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 RADIO GROUP
// ═══════════════════════════════════════════════════════════════════════════════

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface FormRadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  direction?: 'horizontal' | 'vertical';
  error?: boolean;
  className?: string;
}

export function FormRadioGroup({
  name,
  options,
  value,
  onChange,
  direction = 'vertical',
  error,
  className,
}: FormRadioGroupProps) {
  return (
    <div className={cn(
      'flex gap-3',
      direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
      className
    )}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'flex items-start gap-3 cursor-pointer group',
            option.disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <div className="relative mt-0.5">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange?.(option.value)}
              disabled={option.disabled}
              className={cn(
                'peer h-4 w-4 shrink-0 rounded-full border appearance-none cursor-pointer',
                'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed',
                error ? 'border-destructive focus-visible:ring-destructive' : 'border-input focus-visible:ring-ring',
              )}
            />
            <div className="absolute top-1 left-1 h-2 w-2 rounded-full bg-primary opacity-0 peer-checked:opacity-100 pointer-events-none" />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
              {option.label}
            </span>
            {option.description && (
              <p className="text-xs text-muted-foreground">{option.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 SWITCH / TOGGLE
// ═══════════════════════════════════════════════════════════════════════════════

interface FormSwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export const FormSwitch = forwardRef<HTMLInputElement, FormSwitchProps>(
  ({ className, label, description, ...props }, ref) => {
    return (
      <label className={cn(
        'flex items-center justify-between gap-4 cursor-pointer group',
        props.disabled && 'cursor-not-allowed opacity-50',
        className
      )}>
        <div className="space-y-1">
          <span className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
            {label}
          </span>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="relative">
          <input
            type="checkbox"
            ref={ref}
            className="peer sr-only"
            {...props}
          />
          <div className={cn(
            'h-6 w-11 rounded-full border-2 border-transparent transition-colors',
            'peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            'bg-input'
          )} />
          <div className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform',
            'peer-checked:translate-x-5'
          )} />
        </div>
      </label>
    );
  }
);

FormSwitch.displayName = 'FormSwitch';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function TooltipIcon({ content }: { content: string }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute right-0 top-6 z-50 w-64 p-2 text-xs bg-popover border border-border rounded-lg shadow-lg"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 FORM ACTIONS (Submit/Cancel buttons row)
// ═══════════════════════════════════════════════════════════════════════════════

interface FormActionsProps {
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

export function FormActions({
  submitLabel = 'Kaydet',
  cancelLabel = 'İptal',
  onCancel,
  isSubmitting,
  disabled,
  className,
  align = 'right',
}: FormActionsProps) {
  const formContext = useFormContext();
  const submitting = isSubmitting ?? formContext?.isSubmitting;

  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={cn('flex items-center gap-3 pt-4', alignClass[align], className)}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        disabled={disabled || submitting}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'flex items-center gap-2'
        )}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 FORM ERROR BANNER
// ═══════════════════════════════════════════════════════════════════════════════

interface FormErrorBannerProps {
  errors: string[];
  onDismiss?: () => void;
  className?: string;
}

export function FormErrorBanner({ errors, onDismiss, className }: FormErrorBannerProps) {
  if (errors.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className={cn(
        'p-4 rounded-lg bg-destructive/10 border border-destructive/20',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-destructive mb-1">
            Lütfen aşağıdaki hataları düzeltin:
          </h4>
          <ul className="list-disc list-inside text-sm text-destructive/80 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-destructive/60 hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 INLINE FIELD GROUP (for side-by-side fields)
// ═══════════════════════════════════════════════════════════════════════════════

interface FormRowProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function FormRow({ children, columns = 2, className }: FormRowProps) {
  const gridClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridClass[columns], className)}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 FORM SECTION (for grouping fields)
// ═══════════════════════════════════════════════════════════════════════════════

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="border-b border-border pb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Shake animation for errors - add to globals.css
// @keyframes shake {
//   0%, 100% { transform: translateX(0); }
//   25% { transform: translateX(-4px); }
//   75% { transform: translateX(4px); }
// }
// .animate-shake { animation: shake 0.3s ease-in-out; }
