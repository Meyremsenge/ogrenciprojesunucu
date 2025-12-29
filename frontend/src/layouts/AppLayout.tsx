/**
 * Main App Layout
 * Sidebar, header ve content alanı
 */

import { ReactNode, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
<<<<<<< HEAD
  const { sidebarOpen, sidebarCollapsed } = useUIStore();
=======
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen } = useUIStore();
>>>>>>> eski/main

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
<<<<<<< HEAD
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64',
          !sidebarOpen && 'lg:pl-0'
=======
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
>>>>>>> eski/main
        )}
      >
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children || <Outlet />}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
<<<<<<< HEAD
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
=======
          onClick={() => setSidebarOpen(false)}
>>>>>>> eski/main
        />
      )}
    </div>
  );
}

export default AppLayout;
