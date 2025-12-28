/**
 * Register Page
 * Yeni kullanıcı kayıt sayfası
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2, Check, X } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[A-Z]/, 'En az bir büyük harf içermelidir')
    .regex(/[a-z]/, 'En az bir küçük harf içermelidir')
    .regex(/[0-9]/, 'En az bir rakam içermelidir')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'En az bir özel karakter içermelidir'),
  first_name: z.string().min(2, 'İsim en az 2 karakter olmalıdır'),
  last_name: z.string().min(2, 'Soyisim en az 2 karakter olmalıdır'),
  phone: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser, isRegistering, registerError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
    },
  });

  const password = watch('password', '');

  const passwordChecks = [
    { label: 'En az 8 karakter', valid: password.length >= 8 },
    { label: 'Büyük harf', valid: /[A-Z]/.test(password) },
    { label: 'Küçük harf', valid: /[a-z]/.test(password) },
    { label: 'Rakam', valid: /[0-9]/.test(password) },
    { label: 'Özel karakter', valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">Kayıt Ol</h1>
        <p className="text-muted-foreground mt-2">
          Yeni bir hesap oluşturun ve öğrenmeye başlayın
        </p>

        {registerError && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {(registerError as Error).message || 'Kayıt yapılamadı. Lütfen tekrar deneyin.'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">İsim</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  {...register('first_name')}
                  className={cn(
                    'w-full pl-10 pr-4 py-3 rounded-lg border bg-background',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50',
                    errors.first_name && 'border-destructive'
                  )}
                  placeholder="Ali"
                />
              </div>
              {errors.first_name && (
                <p className="text-sm text-destructive mt-1">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Soyisim</label>
              <input
                type="text"
                {...register('last_name')}
                className={cn(
                  'w-full px-4 py-3 rounded-lg border bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  errors.last_name && 'border-destructive'
                )}
                placeholder="Yılmaz"
              />
              {errors.last_name && (
                <p className="text-sm text-destructive mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">E-posta Adresi</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                {...register('email')}
                className={cn(
                  'w-full pl-10 pr-4 py-3 rounded-lg border bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  errors.email && 'border-destructive'
                )}
                placeholder="ornek@email.com"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Phone (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Telefon <span className="text-muted-foreground">(Opsiyonel)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="tel"
                {...register('phone')}
                className={cn(
                  'w-full pl-10 pr-4 py-3 rounded-lg border bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50'
                )}
                placeholder="0532 123 45 67"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className={cn(
                  'w-full pl-10 pr-12 py-3 rounded-lg border bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  errors.password && 'border-destructive'
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password Requirements */}
            {password && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {passwordChecks.map((check) => (
                  <div
                    key={check.label}
                    className={cn(
                      'flex items-center gap-2 text-xs',
                      check.valid ? 'text-green-500' : 'text-muted-foreground'
                    )}
                  >
                    {check.valid ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    {check.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Terms */}
          <p className="text-sm text-muted-foreground">
            Kayıt olarak{' '}
            <Link to="/terms" className="text-primary hover:underline">
              Kullanım Şartları
            </Link>{' '}
            ve{' '}
            <Link to="/privacy" className="text-primary hover:underline">
              Gizlilik Politikası
            </Link>
            'nı kabul etmiş olursunuz.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={isRegistering}
            className={cn(
              'w-full py-3 rounded-lg font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            {isRegistering ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Kayıt yapılıyor...
              </>
            ) : (
              'Kayıt Ol'
            )}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Zaten hesabınız var mı?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Giriş yapın
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
