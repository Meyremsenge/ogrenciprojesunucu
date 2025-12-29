/**
 * Force Change Password Page
 * İlk girişte zorunlu şifre değiştirme
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Lock, Shield, CheckCircle2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre gereklidir'),
    newPassword: z
      .string()
      .min(8, 'Şifre en az 8 karakter olmalıdır')
      .regex(/[A-Z]/, 'En az bir büyük harf içermelidir')
      .regex(/[a-z]/, 'En az bir küçük harf içermelidir')
      .regex(/[0-9]/, 'En az bir rakam içermelidir')
      .regex(/[^A-Za-z0-9]/, 'En az bir özel karakter içermelidir'),
    confirmPassword: z.string().min(1, 'Şifre tekrarı gereklidir'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

const passwordRequirements = [
  { regex: /.{8,}/, label: 'En az 8 karakter' },
  { regex: /[A-Z]/, label: 'En az bir büyük harf' },
  { regex: /[a-z]/, label: 'En az bir küçük harf' },
  { regex: /[0-9]/, label: 'En az bir rakam' },
  { regex: /[^A-Za-z0-9]/, label: 'En az bir özel karakter (!@#$%...)' },
];

export default function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, isChangingPassword } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword', '');

  // Calculate password strength
  const getPasswordStrength = (password: string) => {
    let score = 0;
    passwordRequirements.forEach((req) => {
      if (req.regex.test(password)) score++;
    });
    return (score / passwordRequirements.length) * 100;
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const getStrengthVariant = () => {
    if (passwordStrength < 40) return 'destructive';
    if (passwordStrength < 80) return 'warning';
    return 'success';
  };

  const getStrengthLabel = () => {
    if (passwordStrength < 40) return 'Zayıf';
    if (passwordStrength < 80) return 'Orta';
    return 'Güçlü';
  };

  const onSubmit = async (data: PasswordForm) => {
    setError(null);
    try {
      await changePassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError((err as Error).message || 'Şifre değiştirilemedi');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-600">Şifre Değiştirildi!</h1>
          <p className="text-muted-foreground mt-2">
            Yeni şifreniz başarıyla ayarlandı. Yönlendiriliyorsunuz...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Şifre Değiştirme</CardTitle>
            <CardDescription>
              Güvenliğiniz için lütfen şifrenizi değiştirin. Bu işlem ilk girişte zorunludur.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium mb-2">Mevcut Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    {...register('currentPassword')}
                    className={cn(
                      'w-full pl-10 pr-12 py-3 rounded-lg border bg-background',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50',
                      errors.currentPassword && 'border-destructive'
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-destructive mt-1">{errors.currentPassword.message}</p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium mb-2">Yeni Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    {...register('newPassword')}
                    className={cn(
                      'w-full pl-10 pr-12 py-3 rounded-lg border bg-background',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50',
                      errors.newPassword && 'border-destructive'
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>
                )}

                {/* Password Strength */}
                {newPassword && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Şifre Gücü</span>
                      <span className={cn(
                        'text-xs font-medium',
                        passwordStrength < 40 && 'text-destructive',
                        passwordStrength >= 40 && passwordStrength < 80 && 'text-yellow-600',
                        passwordStrength >= 80 && 'text-green-600'
                      )}>
                        {getStrengthLabel()}
                      </span>
                    </div>
                    <Progress value={passwordStrength} variant={getStrengthVariant()} size="sm" />
                  </div>
                )}

                {/* Requirements */}
                <div className="mt-4 space-y-2">
                  {passwordRequirements.map((req, index) => {
                    const isValid = req.regex.test(newPassword);
                    return (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center gap-2 text-xs',
                          isValid ? 'text-green-600' : 'text-muted-foreground'
                        )}
                      >
                        <CheckCircle2 className={cn('h-3.5 w-3.5', !isValid && 'opacity-40')} />
                        {req.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2">Yeni Şifre (Tekrar)</label>
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

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isChangingPassword}
              >
                Şifreyi Değiştir
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
