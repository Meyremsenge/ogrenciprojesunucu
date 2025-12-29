/**
 * Login Page
 * Kullanıcı giriş sayfası
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
  remember_me: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoggingIn, loginError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember_me: false,
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data);
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
        <h1 className="text-2xl font-bold">Giriş Yap</h1>
        <p className="text-muted-foreground mt-2">
          Hesabınıza giriş yaparak devam edin
        </p>

        {loginError && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {(loginError as Error).message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                {...register('email')}
                className={cn(
                  'w-full pl-10 pr-4 py-3 rounded-lg border bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  'transition-colors',
                  errors.email && 'border-destructive'
                )}
                placeholder="ornek@email.com"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Şifre
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className={cn(
                  'w-full pl-10 pr-12 py-3 rounded-lg border bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  'transition-colors',
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
            {errors.password && (
              <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('remember_me')}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">Beni hatırla</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Şifremi unuttum
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className={cn(
              'w-full py-3 rounded-lg font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Giriş yapılıyor...
              </>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>

        {/* Register Link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Hesabınız yok mu?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Kayıt olun
          </Link>
        </p>

        {/* Demo Accounts */}
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Demo Hesaplar:</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Öğrenci: student@demo.com / Demo123!</p>
            <p>Öğretmen: teacher@demo.com / Demo123!</p>
            <p>Admin: admin@demo.com / Demo123!</p>
            <p>Süper Admin: superadmin@demo.com / Demo123!</p>
          </div>
        </div>

        {/* Super Admin Link - Hidden */}
        <div className="mt-4 text-center">
          <Link 
            to="/super-admin-login" 
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Sistem Yöneticisi Girişi
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
