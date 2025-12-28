/**
 * Not Found Page
 * 404 sayfası
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <span className="text-[150px] font-bold text-muted/30 leading-none">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold mb-2">Sayfa Bulunamadı</h1>
        <p className="text-muted-foreground mb-8">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          Lütfen URL'yi kontrol edin veya ana sayfaya dönün.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-lg font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
            )}
          >
            <Home className="h-4 w-4" />
            Ana Sayfaya Dön
          </Link>
          <button
            onClick={() => window.history.back()}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-lg font-medium',
              'border hover:bg-muted transition-colors'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Geri Git
          </button>
        </div>

        {/* Help Links */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">Yardımcı olabilecek bağlantılar:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/courses" className="text-primary hover:underline">
              Kurslar
            </Link>
            <Link to="/dashboard" className="text-primary hover:underline">
              Dashboard
            </Link>
            <Link to="/profile" className="text-primary hover:underline">
              Profilim
            </Link>
            <a href="mailto:destek@example.com" className="text-primary hover:underline">
              Destek
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
