/**
 * AI Testing Module - Barrel Exports
 * 
 * Test utilities, mock services ve helper fonksiyonların
 * tek noktadan export edilmesi.
 */

// =============================================================================
// SETUP & MOCKS
// =============================================================================

export {
  // Mock Service
  TestMockAIService,
  
  // Factories
  createMockMessage,
  createMockQuota,
  createMockContext,
  createMockError,
  createSuccessResponse,
  createErrorResponse,
  
  // Test Scenarios
  TEST_SCENARIOS,
  
  // Service Helpers
  createTestService,
  createFailingService,
  createExhaustedQuotaService,
  
  // Async Helpers
  waitFor,
  flushPromises,
  
  // Assertions
  assertServiceCalled,
  assertServiceNotCalled,
} from './setup';

// =============================================================================
// TEST SUITES
// =============================================================================

/**
 * Test dosyaları doğrudan export edilmez.
 * Vitest tarafından otomatik olarak keşfedilir.
 * 
 * Test dosyaları:
 * - aiService.test.ts     : AI Service unit testleri
 * - integration.test.ts   : Entegrasyon testleri
 * - uiState.test.ts       : UI durum testleri
 * - quotaLimits.test.ts   : Kota ve limit testleri
 * - security.test.ts      : Güvenlik testleri
 * - readiness.test.ts     : Production hazırlık testleri
 */

// =============================================================================
// TEST UTILITIES TYPE EXPORTS
// =============================================================================

// Types are imported from @/types/ai in test files directly
// import type { AIMessage, AIQuotaInfo, AIContext, AIError, AIFeatureType } from '@/types/ai';

// =============================================================================
// QUICK START GUIDE
// =============================================================================

/**
 * AI Testing Quick Start Guide
 * ============================
 * 
 * 1. Test Servisi Oluşturma:
 * 
 *    import { createTestService, createFailingService } from '@/lib/ai/__tests__';
 *    
 *    // Başarılı service
 *    const service = createTestService();
 *    
 *    // Her zaman hata veren service
 *    const failingService = createFailingService('rate_limit');
 * 
 * 2. Mock Response Oluşturma:
 * 
 *    import { createMockMessage, createMockQuota } from '@/lib/ai/__tests__';
 *    
 *    const message = createMockMessage('Merhaba', 'assistant');
 *    const quota = createMockQuota(10, 50);
 * 
 * 3. Test Senaryoları:
 * 
 *    import { TEST_SCENARIOS } from '@/lib/ai/__tests__';
 *    
 *    // Başarılı yanıt
 *    const success = TEST_SCENARIOS.SUCCESS.SIMPLE;
 *    
 *    // Hata yanıtı
 *    const error = TEST_SCENARIOS.ERRORS.RATE_LIMIT;
 *    
 *    // Kota durumu
 *    const quota = TEST_SCENARIOS.QUOTA.EXHAUSTED;
 * 
 * 4. Async Beklemeler:
 * 
 *    import { waitFor, flushPromises } from '@/lib/ai/__tests__';
 *    
 *    await waitFor(100); // 100ms bekle
 *    await flushPromises(); // Tüm promise'ları çöz
 * 
 * 5. Testleri Çalıştırma:
 * 
 *    npm run test              // Tüm testler
 *    npm run test:watch        // Watch mode
 *    npm run test:coverage     // Coverage raporu
 *    npm run test:ui           // Vitest UI
 * 
 * 6. Sadece AI Testleri:
 * 
 *    npm run test -- src/lib/ai/__tests__
 */
