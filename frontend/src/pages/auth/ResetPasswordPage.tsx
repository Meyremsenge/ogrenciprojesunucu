/**
 * Reset Password Page
 * Şifre sıfırlama sayfası (token ile)
 */

import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Lock, Loader2, Eye, EyeOff, Check, X, CheckCircle2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[A-Z]/, 'En az bir büyük harf içermelidir')
    .regex(/[a-z]/, 'En az bir küçük harf içermelidir')
    .regex(/[0-9]/, 'En az bir rakam içermelidir')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'En az bir özel karakter içermelidir'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const { resetPassword, isResettingPassword, resetPasswordError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
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

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;
    
    try {
      await resetPassword({ token, new_password: data.password });
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch {
      // Error handled by mutation
    }
  };

  // Token yoksa hata göster
  if (!token) {
    return (
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
            <X className="h-8 w-8 text-destructive" />
          </div>

          <h1 className="text-2xl font-bold">Geçersiz Bağlantı</h1>
          <p className="text-muted-foreground mt-2">
            Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
          </p>

          <Link
            to="/forgot-password"
            className={cn(
              'mt-6 inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
            )}
          >
            Yeni Bağlantı Talep Et
          </Link>
        </motion.div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-2xl font-bold">Şifre Değiştirildi</h1>
          <p className="text-muted-foreground mt-2">
            Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...
          </p>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 text-primary hover:underline"
          >
            Hemen giriş yap
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">Yeni Şifre Belirle</h1>
        <p className="text-muted-foreground mt-2">
          Hesabınız için güçlü bir şifre oluşturun.
        </p>

        {resetPasswordError && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {(resetPasswordError as Error).message || 'İşlem başarısız. Lütfen tekrar deneyin.'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium mb-2">Yeni Şifre</label>
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

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-2">Şifre Tekrar</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                className={cn(
                  'w-full pl-10 pr-12 py-3 rounded-lg border bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  errors.confirmPassword && 'border-destructive'
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isResettingPassword}
            className={cn(
              'w-full py-3 rounded-lg font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            {isResettingPassword ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Şifreyi Güncelle'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
