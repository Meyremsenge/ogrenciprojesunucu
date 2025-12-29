/**
 * API Versioning - Versiyon Yönetimi ve Geriye Uyumluluk
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * NEDEN TİCARİ ÜRÜNLER İÇİN KRİTİK?
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 1. GERİYE UYUMLULUK: Eski client'lar çalışmaya devam eder
 * 2. KADEMELI GEÇİŞ: Yeni API'ye aşamalı migration
 * 3. A/B TESTİNG: Farklı API versiyonlarını test etme
 * 4. ZORUNLU GÜNCELLEME: Kritik güvenlik güncellemeleri
 * 5. DEPRECATION YÖNETİMİ: Eski endpoint'lerin düzgün emekliye ayrılması
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ApiVersion, DeprecationMeta } from './ApiContractTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 VERSION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Semantic version comparison result
 */
export type VersionComparison = 'greater' | 'equal' | 'less';

/**
 * Version compatibility status
 */
export type CompatibilityStatus = 
  | 'compatible'      // Tam uyumlu
  | 'update_available' // Güncelleme mevcut, zorunlu değil
  | 'update_required'  // Güncelleme zorunlu
  | 'unsupported';     // Desteklenmiyor

/**
 * Version info from server
 */
export interface ServerVersionInfo {
  /** Current API version */
  current: ApiVersion;
  
  /** Minimum supported client version */
  minClientVersion: string;
  
  /** Recommended client version */
  recommendedVersion?: string;
  
  /** Deprecation warnings */
  deprecations?: DeprecationMeta[];
  
  /** Upcoming breaking changes */
  upcomingChanges?: BreakingChange[];
  
  /** Maintenance windows */
  maintenance?: MaintenanceWindow[];
}

/**
 * Breaking change notification
 */
export interface BreakingChange {
  /** Unique ID */
  id: string;
  
  /** Affected version */
  version: string;
  
  /** Description */
  description: string;
  
  /** Affected endpoints/features */
  affected: string[];
  
  /** Migration guide URL */
  migrationGuide?: string;
  
  /** Planned date */
  plannedDate: string;
}

/**
 * Maintenance window
 */
export interface MaintenanceWindow {
  /** Unique ID */
  id: string;
  
  /** Start time (ISO 8601) */
  startTime: string;
  
  /** End time (ISO 8601) */
  endTime: string;
  
  /** Description */
  description: string;
  
  /** Affected services */
  affectedServices?: string[];
  
  /** Is partial maintenance? */
  partial?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔢 VERSION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Version string'i parse eder
 */
export function parseVersion(versionString: string): ApiVersion {
  const match = versionString.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  
  if (!match) {
    throw new Error(`Invalid version format: ${versionString}`);
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    full: versionString.startsWith('v') ? versionString : `v${versionString}`,
  };
}

/**
 * Version'ı string'e çevirir
 */
export function formatVersion(version: ApiVersion): string {
  return `v${version.major}.${version.minor}.${version.patch}`;
}

/**
 * İki version'ı karşılaştırır
 */
export function compareVersions(a: ApiVersion | string, b: ApiVersion | string): VersionComparison {
  const versionA = typeof a === 'string' ? parseVersion(a) : a;
  const versionB = typeof b === 'string' ? parseVersion(b) : b;
  
  // Major comparison
  if (versionA.major > versionB.major) return 'greater';
  if (versionA.major < versionB.major) return 'less';
  
  // Minor comparison
  if (versionA.minor > versionB.minor) return 'greater';
  if (versionA.minor < versionB.minor) return 'less';
  
  // Patch comparison
  if (versionA.patch > versionB.patch) return 'greater';
  if (versionA.patch < versionB.patch) return 'less';
  
  return 'equal';
}

/**
 * Version uyumlu mu kontrol eder
 */
export function isVersionCompatible(
  clientVersion: ApiVersion | string,
  minVersion: ApiVersion | string
): boolean {
  const comparison = compareVersions(clientVersion, minVersion);
  return comparison === 'greater' || comparison === 'equal';
}

/**
 * Compatibility status hesaplar
 */
export function getCompatibilityStatus(
  clientVersion: string,
  serverInfo: ServerVersionInfo
): CompatibilityStatus {
  const clientVer = parseVersion(clientVersion);
  const minVer = parseVersion(serverInfo.minClientVersion);
  
  // Minimum version altındaysa desteklenmiyor
  if (compareVersions(clientVer, minVer) === 'less') {
    return 'unsupported';
  }
  
  // Recommended version kontrolü
  if (serverInfo.recommendedVersion) {
    const recommendedVer = parseVersion(serverInfo.recommendedVersion);
    
    // Major version farkı varsa güncelleme zorunlu
    if (recommendedVer.major > clientVer.major) {
      return 'update_required';
    }
    
    // Minor/patch farkı varsa güncelleme mevcut
    if (compareVersions(recommendedVer, clientVer) === 'greater') {
      return 'update_available';
    }
  }
  
  return 'compatible';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 DEPRECATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deprecation warning'i gösterilmeli mi?
 */
export function shouldShowDeprecationWarning(deprecation: DeprecationMeta): boolean {
  if (!deprecation.sunset_date) return true;
  
  const sunsetDate = new Date(deprecation.sunset_date);
  const now = new Date();
  const daysUntilSunset = Math.ceil((sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // 30 gün veya daha az kaldıysa göster
  return daysUntilSunset <= 30;
}

/**
 * Deprecation urgency level
 */
export function getDeprecationUrgency(deprecation: DeprecationMeta): 'low' | 'medium' | 'high' | 'critical' {
  if (!deprecation.sunset_date) return 'low';
  
  const sunsetDate = new Date(deprecation.sunset_date);
  const now = new Date();
  const daysUntilSunset = Math.ceil((sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilSunset <= 0) return 'critical';
  if (daysUntilSunset <= 7) return 'high';
  if (daysUntilSunset <= 30) return 'medium';
  return 'low';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 API VERSION HEADER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * API version header'larını oluşturur
 */
export function createVersionHeaders(
  clientVersion: string,
  options?: {
    acceptedVersions?: string[];
    preferVersion?: string;
  }
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Client-Version': clientVersion,
  };
  
  if (options?.acceptedVersions?.length) {
    headers['Accept-Version'] = options.acceptedVersions.join(', ');
  }
  
  if (options?.preferVersion) {
    headers['X-Prefer-Version'] = options.preferVersion;
  }
  
  return headers;
}

/**
 * Response header'larından version info çıkarır
 */
export function extractVersionFromHeaders(headers: Headers): {
  apiVersion?: string;
  deprecationWarning?: string;
  sunsetDate?: string;
} {
  return {
    apiVersion: headers.get('X-API-Version') || undefined,
    deprecationWarning: headers.get('Deprecation') || undefined,
    sunsetDate: headers.get('Sunset') || undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚛️ REACT CONTEXT & HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

interface VersionContextValue {
  clientVersion: string;
  serverInfo: ServerVersionInfo | null;
  compatibilityStatus: CompatibilityStatus;
  deprecations: DeprecationMeta[];
  upcomingMaintenance: MaintenanceWindow[];
  isLoading: boolean;
  error: Error | null;
  checkVersion: () => Promise<void>;
  dismissDeprecation: (deprecated: string) => void;
}

const VersionContext = createContext<VersionContextValue | null>(null);

interface VersionProviderProps {
  children: React.ReactNode;
  clientVersion: string;
  fetchVersionInfo: () => Promise<ServerVersionInfo>;
  checkInterval?: number; // ms
}

/**
 * Version provider component
 */
export function VersionProvider({
  children,
  clientVersion,
  fetchVersionInfo,
  checkInterval = 5 * 60 * 1000, // 5 dakika
}: VersionProviderProps) {
  const [serverInfo, setServerInfo] = useState<ServerVersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dismissedDeprecations, setDismissedDeprecations] = useState<Set<string>>(new Set());
  
  const checkVersion = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const info = await fetchVersionInfo();
      setServerInfo(info);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchVersionInfo]);
  
  // Initial check
  useEffect(() => {
    checkVersion();
  }, [checkVersion]);
  
  // Periodic check
  useEffect(() => {
    const interval = setInterval(checkVersion, checkInterval);
    return () => clearInterval(interval);
  }, [checkVersion, checkInterval]);
  
  const compatibilityStatus = useMemo(() => {
    if (!serverInfo) return 'compatible';
    return getCompatibilityStatus(clientVersion, serverInfo);
  }, [clientVersion, serverInfo]);
  
  const deprecations = useMemo(() => {
    if (!serverInfo?.deprecations) return [];
    return serverInfo.deprecations.filter(d => !dismissedDeprecations.has(d.deprecated));
  }, [serverInfo?.deprecations, dismissedDeprecations]);
  
  const upcomingMaintenance = useMemo(() => {
    if (!serverInfo?.maintenance) return [];
    const now = new Date();
    return serverInfo.maintenance.filter(m => new Date(m.endTime) > now);
  }, [serverInfo?.maintenance]);
  
  const dismissDeprecation = useCallback((deprecated: string) => {
    setDismissedDeprecations(prev => new Set([...prev, deprecated]));
  }, []);
  
  const value = useMemo<VersionContextValue>(() => ({
    clientVersion,
    serverInfo,
    compatibilityStatus,
    deprecations,
    upcomingMaintenance,
    isLoading,
    error,
    checkVersion,
    dismissDeprecation,
  }), [
    clientVersion,
    serverInfo,
    compatibilityStatus,
    deprecations,
    upcomingMaintenance,
    isLoading,
    error,
    checkVersion,
    dismissDeprecation,
  ]);
  
  return (
    <VersionContext.Provider value={value}>
      {children}
    </VersionContext.Provider>
  );
}

/**
 * Version hook
 */
export function useVersion() {
  const context = useContext(VersionContext);
  
  if (!context) {
    throw new Error('useVersion must be used within VersionProvider');
  }
  
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 VERSION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface UpdateRequiredBannerProps {
  status: CompatibilityStatus;
  onUpdate?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Güncelleme gerekli banner'ı
 */
export function UpdateRequiredBanner({
  status,
  onUpdate,
  onDismiss,
  className = '',
}: UpdateRequiredBannerProps) {
  if (status === 'compatible') return null;
  
  const configs = {
    update_available: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: '🆕',
      title: 'Yeni Versiyon Mevcut',
      description: 'Uygulamanın yeni bir versiyonu mevcut. Güncellemek ister misiniz?',
      dismissable: true,
    },
    update_required: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: '⚠️',
      title: 'Güncelleme Gerekli',
      description: 'Devam etmek için uygulamayı güncellemeniz gerekmektedir.',
      dismissable: false,
    },
    unsupported: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: '❌',
      title: 'Versiyon Desteklenmiyor',
      description: 'Bu versiyon artık desteklenmiyor. Lütfen uygulamayı güncelleyin.',
      dismissable: false,
    },
  };
  
  const config = configs[status];
  
  return (
    <div className={`p-4 border rounded-lg ${config.bg} ${config.border} ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {config.title}
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            {config.description}
          </p>
        </div>
        
        <div className="flex gap-2">
          {onUpdate && (
            <button
              onClick={onUpdate}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Güncelle
            </button>
          )}
          {config.dismissable && onDismiss && (
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Sonra
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface DeprecationWarningProps {
  deprecation: DeprecationMeta;
  onDismiss?: () => void;
  onMigrate?: () => void;
  className?: string;
}

/**
 * Deprecation warning component
 */
export function DeprecationWarning({
  deprecation,
  onDismiss,
  onMigrate,
  className = '',
}: DeprecationWarningProps) {
  const urgency = getDeprecationUrgency(deprecation);
  
  const urgencyColors = {
    low: 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-700',
    medium: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    high: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
    critical: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  };
  
  const daysLeft = deprecation.sunset_date
    ? Math.ceil((new Date(deprecation.sunset_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <div className={`p-3 border rounded-lg ${urgencyColors[urgency]} ${className}`} role="alert">
      <div className="flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
              {deprecation.deprecated}
            </code>
            {' kullanımdan kaldırılıyor'}
          </p>
          
          {deprecation.message && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {deprecation.message}
            </p>
          )}
          
          {deprecation.alternative && (
            <p className="text-sm mt-1">
              Alternatif:{' '}
              <code className="px-1 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-xs">
                {deprecation.alternative}
              </code>
            </p>
          )}
          
          {daysLeft !== null && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {daysLeft > 0 
                ? `${daysLeft} gün kaldı` 
                : 'Süre doldu!'
              }
            </p>
          )}
        </div>
        
        <div className="flex gap-1">
          {deprecation.migration_guide && onMigrate && (
            <button
              onClick={onMigrate}
              className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
              title="Migration rehberi"
            >
              📖
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Kapat"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface MaintenanceAlertProps {
  maintenance: MaintenanceWindow;
  className?: string;
}

/**
 * Maintenance alert component
 */
export function MaintenanceAlert({ maintenance, className = '' }: MaintenanceAlertProps) {
  const startTime = new Date(maintenance.startTime);
  const endTime = new Date(maintenance.endTime);
  const now = new Date();
  
  const isOngoing = now >= startTime && now <= endTime;
  const isUpcoming = now < startTime;
  
  const formatTime = (date: Date) => {
    return date.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  return (
    <div 
      className={`
        p-3 border rounded-lg
        ${isOngoing 
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
        }
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{isOngoing ? '🔧' : '🕐'}</span>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {isOngoing ? 'Bakım Devam Ediyor' : 'Planlı Bakım'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {maintenance.description}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {isUpcoming 
              ? `${formatTime(startTime)} - ${formatTime(endTime)}`
              : `Tahmini bitiş: ${formatTime(endTime)}`
            }
          </p>
          {maintenance.affectedServices?.length && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Etkilenen servisler: {maintenance.affectedServices.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Version info display component
 */
export function VersionInfo({ className = '' }: { className?: string }) {
  const { clientVersion, serverInfo, compatibilityStatus } = useVersion();
  
  return (
    <div className={`text-xs text-gray-500 dark:text-gray-500 ${className}`}>
      <span>Client: {clientVersion}</span>
      {serverInfo && (
        <>
          <span className="mx-1">•</span>
          <span>API: {serverInfo.current.full}</span>
        </>
      )}
      {compatibilityStatus !== 'compatible' && (
        <>
          <span className="mx-1">•</span>
          <span className={
            compatibilityStatus === 'unsupported' 
              ? 'text-red-500' 
              : 'text-yellow-500'
          }>
            {compatibilityStatus === 'update_available' && '⬆️'}
            {compatibilityStatus === 'update_required' && '⚠️'}
            {compatibilityStatus === 'unsupported' && '❌'}
          </span>
        </>
      )}
    </div>
  );
}
