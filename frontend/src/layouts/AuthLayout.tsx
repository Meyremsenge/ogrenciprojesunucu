/**
 * Auth Layout
 * Login, register sayfaları için minimal layout
 */

import { ReactNode, Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

interface AuthLayoutProps {
  children?: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="flex min-h-screen">
        {/* Left - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <span className="font-bold text-2xl text-white">
              Öğrenci Koçluk Sistemi
            </span>
          </Link>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold text-white leading-tight">
                Eğitimde Mükemmelliğe
                <br />
                Ulaşın
              </h1>
              <p className="mt-4 text-lg text-white/80">
                Modern ve akıcı arayüzümüz ile öğrenme deneyiminizi
                bir üst seviyeye taşıyın.
              </p>
            </motion.div>

            <div className="grid grid-cols-3 gap-4 pt-8">
              <FeatureCard
                number="10K+"
                label="Aktif Öğrenci"
                delay={0.3}
              />
              <FeatureCard
                number="500+"
                label="Kurs"
                delay={0.4}
              />
              <FeatureCard
                number="98%"
                label="Memnuniyet"
                delay={0.5}
              />
            </div>
          </div>

          <p className="text-sm text-white/60">
            © 2024 Öğrenci Koçluk Sistemi. Tüm hakları saklıdır.
          </p>
        </div>

        {/* Right - Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-8 text-center">
              <Link to="/" className="inline-flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl">ÖKS</span>
              </Link>
            </div>

            <Suspense
              fallback={
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              }
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {children || <Outlet />}
              </motion.div>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  number,
  label,
  delay,
}: {
  number: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white/10 rounded-xl p-4 text-center"
    >
      <p className="text-2xl font-bold text-white">{number}</p>
      <p className="text-sm text-white/70">{label}</p>
    </motion.div>
  );
}

export default AuthLayout;
