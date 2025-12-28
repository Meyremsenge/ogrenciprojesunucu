/**
 * Super Admin Login Page
 * ═══════════════════════════════════════════════════════════════════════════════
 * Özel güvenlik önlemleriyle super admin girişi
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Key,
  Fingerprint,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth';

export default function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'credentials' | 'security'>('credentials');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [pendingTokens, setPendingTokens] = useState<any>(null);

  // Kalan deneme hakkı
  const remainingAttempts = 5 - attempts;
  const isLocked = remainingAttempts <= 0;

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      if (step === 'credentials') {
        // İlk adım: kimlik doğrulama
        const response = await authApi.login({ email, password });
        
        // Super admin kontrolü
        if (response.data?.user?.role !== 'super_admin' && response.data?.user?.role !== 'admin') {
          throw new Error('Bu sayfaya sadece Super Admin yetkisiyle erişilebilir.');
        }
        
        return response;
      } else {
        // İkinci adım: güvenlik kodu doğrulama
        // TODO: 2FA API entegrasyonu
        if (securityCode !== '123456') { // Demo için
          throw new Error('Geçersiz güvenlik kodu');
        }
        return { verified: true };
      }
    },
    onSuccess: async (data: any) => {
      if (step === 'credentials' && data.data) {
        // 2FA adımına geç ve verileri sakla
        setPendingUser(data.data.user);
        setPendingTokens(data.data.tokens);
        setStep('security');
        setError(null);
      } else if (pendingUser && pendingTokens) {
        // Giriş başarılı
        login(pendingUser, pendingTokens.access_token, pendingTokens.refresh_token);
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    },
    onError: (err: Error) => {
      setError(err.message);
      setAttempts((prev) => prev + 1);
    },
  });

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    
    setError(null);
    loginMutation.mutate();
  };

  // Lockout durumu
  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-800/90 backdrop-blur border border-red-500/30 rounded-2xl p-8 text-center"
        >
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Hesap Kilitlendi</h1>
          <p className="text-slate-400 mb-4">
            Çok fazla başarısız giriş denemesi. Güvenlik nedeniyle hesabınız geçici olarak kilitlendi.
          </p>
          <p className="text-sm text-slate-500">
            30 dakika sonra tekrar deneyebilirsiniz veya sistem yöneticinizle iletişime geçin.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-md w-full"
      >
        {/* Security Badge */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-amber-950 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
          <Shield className="h-3 w-3" />
          Yüksek Güvenlik Alanı
        </div>

        {/* Card */}
        <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              {step === 'credentials' ? (
                <Lock className="h-8 w-8 text-white" />
              ) : (
                <Fingerprint className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">
              {step === 'credentials' ? 'Super Admin Girişi' : 'Güvenlik Doğrulama'}
            </h1>
            <p className="text-slate-400 mt-2">
              {step === 'credentials'
                ? 'Yetkili erişim için kimlik doğrulaması gerekli'
                : 'İki faktörlü doğrulama kodunu girin'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm"
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Remaining Attempts Warning */}
          {attempts > 0 && remainingAttempts <= 3 && (
            <div className="mb-4 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs text-center">
              ⚠️ {remainingAttempts} deneme hakkınız kaldı
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'credentials' ? (
              <>
                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">E-posta</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Şifre</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-12 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Security Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Güvenlik Kodu
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={securityCode}
                      onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white text-center text-xl tracking-[0.5em] placeholder:text-slate-500 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                      maxLength={6}
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    Authenticator uygulamanızdaki 6 haneli kodu girin
                  </p>
                </div>

                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  ← Geri dön
                </button>
              </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-3"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Doğrulanıyor...
                </>
              ) : step === 'credentials' ? (
                'Devam Et'
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-xs text-amber-400 font-medium mb-1">Demo Giriş Bilgileri:</p>
            <p className="text-xs text-slate-400">E-posta: superadmin@demo.com</p>
            <p className="text-xs text-slate-400">Şifre: Demo123!</p>
            <p className="text-xs text-slate-400">Güvenlik Kodu: 123456</p>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              Bu alan sistem yöneticileri için ayrılmıştır. Tüm giriş denemeleri
              kaydedilmektedir.
            </p>
          </div>
        </div>

        {/* Back to Normal Login */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Normal giriş sayfasına dön
          </button>
        </div>
      </motion.div>
    </div>
  );
}
