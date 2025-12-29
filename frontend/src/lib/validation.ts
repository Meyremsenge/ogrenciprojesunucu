/**
 * Validation & Error Handling Patterns
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ENTERPRISE UX VALİDASYON PATTERN'LERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * ⏱️ VALİDASYON ZAMANLAMA STRATEJİLERİ:
 *    1. onBlur: Alan terk edildiğinde (önerilen default)
 *    2. onChange: Her değişiklikte (sadece kritik alanlar)
 *    3. onSubmit: Form gönderildiğinde (toplu kontrol)
 *    4. Debounced: Yazma durduktan 500ms sonra (async validation)
 * 
 * 📝 HATA MESAJI PRENSİPLERİ:
 *    - Spesifik ol: "Email formatı geçersiz" (✓) vs "Geçersiz giriş" (✗)
 *    - Çözüm sun: "En az 8 karakter, 1 büyük harf, 1 rakam gerekli"
 *    - Nazik ol: "Lütfen geçerli bir email girin" (✓) vs "HATA!" (✗)
 *    - Görsel ipucu: Kırmızı border, ikon, shake animasyonu
 * 
 * ✅ BAŞARI GERİ BİLDİRİMİ:
 *    - Yeşil checkmark
 *    - Pozitif mesaj
 *    - Smooth transition
 * 
 * 🔒 GÜVENLİK VALİDASYONLARI:
 *    - XSS koruması: HTML encode
 *    - SQL injection: Parameterized queries (backend)
 *    - Rate limiting: Client-side throttle
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationRule<T = string> {
  validate: (value: T, formValues?: Record<string, unknown>) => boolean | Promise<boolean>;
  message: string;
}

export interface FieldValidation<T = string> {
  rules: ValidationRule<T>[];
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  debounceMs?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  firstError?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 BUILT-IN VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

export const validators = {
  // Required
  required: (message = 'Bu alan zorunludur'): ValidationRule => ({
    validate: (value) => value !== undefined && value !== null && value !== '',
    message,
  }),

  // Email
  email: (message = 'Geçerli bir email adresi girin'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  // Min Length
  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => !value || value.length >= min,
    message: message || `En az ${min} karakter olmalıdır`,
  }),

  // Max Length
  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => !value || value.length <= max,
    message: message || `En fazla ${max} karakter olabilir`,
  }),

  // Pattern
  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => !value || regex.test(value),
    message,
  }),

  // Password Strength
  password: (message = 'Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
      return passwordRegex.test(value);
    },
    message,
  }),

  // Match Field
  matchField: (fieldName: string, message = 'Alanlar eşleşmiyor'): ValidationRule => ({
    validate: (value, formValues) => {
      if (!formValues) return true;
      return value === formValues[fieldName];
    },
    message,
  }),

  // Phone (Turkish)
  phone: (message = 'Geçerli bir telefon numarası girin'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const phoneRegex = /^(\+90|0)?[0-9]{10}$/;
      return phoneRegex.test(value.replace(/\s/g, ''));
    },
    message,
  }),

  // URL
  url: (message = 'Geçerli bir URL girin'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  // Number Range
  numberRange: (min: number, max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value >= min && value <= max,
    message: message || `${min} ile ${max} arasında bir değer girin`,
  }),

  // Date
  date: (message = 'Geçerli bir tarih girin'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    message,
  }),

  // Future Date
  futureDate: (message = 'Gelecekte bir tarih seçin'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return date > new Date();
    },
    message,
  }),

  // Custom Async Validator
  async: <T>(
    asyncFn: (value: T) => Promise<boolean>,
    message: string
  ): ValidationRule<T> => ({
    validate: asyncFn,
    message,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎣 useFieldValidation HOOK
// ═══════════════════════════════════════════════════════════════════════════════

interface UseFieldValidationOptions<T> {
  initialValue?: T;
  rules?: ValidationRule<T>[];
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  debounceMs?: number;
}

export function useFieldValidation<T = string>({
  initialValue,
  rules = [],
  validateOnBlur = true,
  validateOnChange = false,
  debounceMs = 0,
}: UseFieldValidationOptions<T>) {
  const [value, setValue] = useState<T | undefined>(initialValue);
  const [errors, setErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const validate = useCallback(async (val: T | undefined, formValues?: Record<string, unknown>): Promise<ValidationResult> => {
    setIsValidating(true);
    const foundErrors: string[] = [];

    for (const rule of rules) {
      try {
        const isValid = await rule.validate(val as T, formValues);
        if (!isValid) {
          foundErrors.push(rule.message);
        }
      } catch {
        foundErrors.push(rule.message);
      }
    }

    setErrors(foundErrors);
    setIsValidating(false);

    return {
      isValid: foundErrors.length === 0,
      errors: foundErrors,
    };
  }, [rules]);

  const debouncedValidate = useCallback((val: T | undefined, formValues?: Record<string, unknown>) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (debounceMs > 0) {
      debounceRef.current = setTimeout(() => {
        validate(val, formValues);
      }, debounceMs);
    } else {
      validate(val, formValues);
    }
  }, [validate, debounceMs]);

  const handleChange = useCallback((newValue: T) => {
    setValue(newValue);
    setIsDirty(true);

    if (validateOnChange) {
      debouncedValidate(newValue);
    }
  }, [validateOnChange, debouncedValidate]);

  const handleBlur = useCallback(() => {
    setIsTouched(true);

    if (validateOnBlur) {
      validate(value);
    }
  }, [validateOnBlur, validate, value]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setErrors([]);
    setIsTouched(false);
    setIsDirty(false);
  }, [initialValue]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    value,
    errors,
    isValid: errors.length === 0,
    isValidating,
    isTouched,
    isDirty,
    hasError: isTouched && errors.length > 0,
    firstError: errors[0],
    setValue: handleChange,
    onBlur: handleBlur,
    validate: () => validate(value),
    reset,
    clearErrors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎣 useFormValidation HOOK
// ═══════════════════════════════════════════════════════════════════════════════

interface FormField<T = unknown> {
  value: T;
  rules?: ValidationRule<T>[];
}

interface UseFormValidationOptions {
  fields: Record<string, FormField>;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export function useFormValidation({
  fields,
  validateOnBlur = true,
  validateOnChange = false,
}: UseFormValidationOptions) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    Object.entries(fields).forEach(([key, field]) => {
      initial[key] = field.value;
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback(async (fieldName: string): Promise<string[]> => {
    const field = fields[fieldName];
    if (!field?.rules) return [];

    const foundErrors: string[] = [];
    const value = values[fieldName];

    for (const rule of field.rules) {
      try {
        const isValid = await rule.validate(value as never, values);
        if (!isValid) {
          foundErrors.push(rule.message);
        }
      } catch {
        foundErrors.push(rule.message);
      }
    }

    setErrors(prev => ({ ...prev, [fieldName]: foundErrors }));
    return foundErrors;
  }, [fields, values]);

  const validateAll = useCallback(async (): Promise<FormValidationResult> => {
    const allErrors: Record<string, string[]> = {};
    let firstError: string | undefined;

    for (const fieldName of Object.keys(fields)) {
      const fieldErrors = await validateField(fieldName);
      if (fieldErrors.length > 0) {
        allErrors[fieldName] = fieldErrors;
        if (!firstError) {
          firstError = fieldErrors[0];
        }
      }
    }

    setErrors(allErrors);
    
    return {
      isValid: Object.keys(allErrors).length === 0,
      errors: allErrors,
      firstError,
    };
  }, [fields, validateField]);

  const setValue = useCallback((fieldName: string, value: unknown) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    if (validateOnChange && touched[fieldName]) {
      setTimeout(() => validateField(fieldName), 0);
    }
  }, [validateOnChange, touched, validateField]);

  const setFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    if (validateOnBlur) {
      validateField(fieldName);
    }
  }, [validateOnBlur, validateField]);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    const initial: Record<string, unknown> = {};
    Object.entries(fields).forEach(([key, field]) => {
      initial[key] = field.value;
    });
    setValues(initial);
    setErrors({});
    setTouched({});
  }, [fields]);

  const handleSubmit = useCallback(async (
    onSubmit: (values: Record<string, unknown>) => Promise<void> | void
  ) => {
    setIsSubmitting(true);
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(fields).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    const result = await validateAll();
    
    if (result.isValid) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
    return result;
  }, [fields, validateAll, values]);

  const getFieldProps = useCallback((fieldName: string) => ({
    value: values[fieldName],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValue(fieldName, e.target.value);
    },
    onBlur: () => setFieldTouched(fieldName),
    error: touched[fieldName] && errors[fieldName]?.[0],
  }), [values, setValue, setFieldTouched, touched, errors]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid: Object.keys(errors).length === 0,
    setValue,
    setFieldTouched,
    validateField,
    validateAll,
    clearFieldError,
    clearAllErrors,
    reset,
    handleSubmit,
    getFieldProps,
    getFieldError: (fieldName: string) => touched[fieldName] ? errors[fieldName]?.[0] : undefined,
    hasFieldError: (fieldName: string) => touched[fieldName] && (errors[fieldName]?.length ?? 0) > 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 ERROR MESSAGE FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

export const errorMessages = {
  // Generic
  required: 'Bu alan zorunludur',
  invalid: 'Geçersiz değer',
  
  // String
  tooShort: (min: number) => `En az ${min} karakter olmalıdır`,
  tooLong: (max: number) => `En fazla ${max} karakter olabilir`,
  
  // Number
  tooSmall: (min: number) => `${min} veya daha büyük olmalıdır`,
  tooBig: (max: number) => `${max} veya daha küçük olmalıdır`,
  notNumber: 'Geçerli bir sayı girin',
  notInteger: 'Tam sayı olmalıdır',
  
  // Email
  invalidEmail: 'Geçerli bir email adresi girin',
  
  // Password
  weakPassword: 'Şifre yeterince güçlü değil',
  passwordHint: 'En az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam',
  passwordMismatch: 'Şifreler eşleşmiyor',
  
  // Phone
  invalidPhone: 'Geçerli bir telefon numarası girin (örn: 0555 555 55 55)',
  
  // URL
  invalidUrl: 'Geçerli bir URL girin (örn: https://example.com)',
  
  // Date
  invalidDate: 'Geçerli bir tarih girin',
  dateTooEarly: (date: string) => `${date} tarihinden sonra olmalıdır`,
  dateTooLate: (date: string) => `${date} tarihinden önce olmalıdır`,
  
  // File
  fileTooLarge: (maxSize: string) => `Dosya boyutu ${maxSize} geçemez`,
  invalidFileType: (types: string) => `İzin verilen dosya türleri: ${types}`,
  
  // Network
  networkError: 'Bağlantı hatası. Lütfen tekrar deneyin.',
  serverError: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
  timeout: 'İstek zaman aşımına uğradı',
  
  // Auth
  invalidCredentials: 'Email veya şifre hatalı',
  sessionExpired: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
  unauthorized: 'Bu işlem için yetkiniz yok',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 INPUT SANITIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export const sanitize = {
  // Remove HTML tags
  stripHtml: (value: string): string => {
    return value.replace(/<[^>]*>/g, '');
  },

  // Escape HTML entities
  escapeHtml: (value: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return value.replace(/[&<>"']/g, (m) => map[m]);
  },

  // Trim whitespace
  trim: (value: string): string => {
    return value.trim();
  },

  // Remove multiple spaces
  normalizeSpaces: (value: string): string => {
    return value.replace(/\s+/g, ' ').trim();
  },

  // Remove non-numeric characters
  numericOnly: (value: string): string => {
    return value.replace(/[^0-9]/g, '');
  },

  // Format phone number
  formatPhone: (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,4})(\d{0,3})(\d{0,2})(\d{0,2})$/);
    if (!match) return value;
    return [match[1], match[2], match[3], match[4]].filter(Boolean).join(' ');
  },

  // Format credit card
  formatCreditCard: (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,4})(\d{0,4})(\d{0,4})(\d{0,4})$/);
    if (!match) return value;
    return [match[1], match[2], match[3], match[4]].filter(Boolean).join(' ');
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 CSS ANIMATIONS (add to globals.css)
// ═══════════════════════════════════════════════════════════════════════════════
/*
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-down {
  animation: fadeInDown 0.2s ease-out;
}
*/
