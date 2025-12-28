// @ts-nocheck
/// <reference types="vitest" />
// @ts-ignore - vitest yüklendiginde çalışır
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

/**
 * Vitest Configuration
 * 
 * AI modülü ve diğer frontend bileşenleri için test yapılandırması.
 * NOT: Bu dosya 'npm install' ile vitest yüklendikten sonra çalışır.
 */
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  test: {
    // Test ortamı - DOM testleri için jsdom kullan
    environment: 'jsdom',
    
    // Global test fonksiyonları (describe, it, expect)
    globals: true,
    
    // Setup dosyaları
    setupFiles: ['./src/lib/ai/__tests__/setup.ts'],
    
    // Test dosyası pattern'leri
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    
    // Hariç tutulacaklar
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    
    // Coverage yapılandırması
    coverage: {
      // Coverage provider
      provider: 'v8',
      
      // Coverage raporlama
      reporter: ['text', 'json', 'html', 'lcov'],
      
      // Coverage dizini
      reportsDirectory: './coverage',
      
      // Coverage için dahil edilecekler
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      
      // Coverage için hariç tutulacaklar
      exclude: [
        'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
        'src/**/types.ts',
        'src/**/index.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      
      // Minimum coverage eşikleri
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
        // AI modülü için daha yüksek eşikler
        'src/lib/ai/**/*.{ts,tsx}': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    
    // Reporter yapılandırması
    reporters: ['verbose'],
    
    // Timeout süreleri
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Thread pool yapılandırması
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    
    // Watch mode exclude
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    
    // Mock yapılandırması
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    
    // TypeScript için tsconfig path'i
    typecheck: {
      tsconfig: './tsconfig.json',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
    
    // CSS modüllerini işle
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    
    // Snapshot format
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },
  },
});
