/**
 * Forgot Password Page
 * Şifre sıfırlama talebi sayfası
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { forgotPassword, isForgotPassword, forgotPasswordError } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setIsSuccess(true);
    } catch {
      // Error handled by mutation
    }
  };

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

          <h1 className="text-2xl font-bold">E-posta Gönderildi</h1>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            <span className="font-medium text-foreground">{submittedEmail}</span> adresine şifre sıfırlama bağlantısı gönderdik.
          </p>

          <div className="mt-8 space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>E-posta birkaç dakika içinde ulaşmazsa:</p>
              <ul className="mt-2 space-y-1 text-left list-disc list-inside">
                <li>Spam/Junk klasörünüzü kontrol edin</li>
                <li>E-posta adresinin doğru olduğundan emin olun</li>
                <li>Birkaç dakika bekleyip tekrar deneyin</li>
              </ul>
            </div>

            <button
              onClick={() => setIsSuccess(false)}
              className="text-primary hover:underline text-sm"
            >
              Tekrar dene
            </button>
          </div>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Giriş sayfasına dön
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
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Giriş sayfasına dön
        </Link>

        <h1 className="text-2xl font-bold">Şifremi Unuttum</h1>
        <p className="text-muted-foreground mt-2">
          Kayıtlı e-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
        </p>

        {forgotPasswordError && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {(forgotPasswordError as Error).message || 'İşlem başarısız. Lütfen tekrar deneyin.'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
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
                autoFocus
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isForgotPassword}
            className={cn(
              'w-full py-3 rounded-lg font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            {isForgotPassword ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              'Sıfırlama Bağlantısı Gönder'
            )}
          </button>
        </form>

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Hesabınızı hatırladınız mı?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Giriş yapın
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
