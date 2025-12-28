/**
 * AI Control Panel Page
 * 
 * Admin için AI yönetim ve izleme paneli.
 * - Sistem durumu ve health check
 * - Feature flag yönetimi
 * - Kill switch kontrolü
 * - Kota yönetimi
 * - İhlal izleme
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Activity,
  Shield,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Zap,
  RefreshCw,
  Settings,
  TrendingUp,
  AlertOctagon,
  Power,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAISystemStatus,
  getAIFeatureFlags,
  toggleAIKillSwitch,
  toggleAIFeature,
  setAIRolloutStage,
  checkAIHealth,
  getAIStatusColor,
  getRolloutStageLabel,
  getFeatureLabel,
} from '@/services/aiAdminService';
import type {
  AISystemStatus,
  AIFeatureFlagConfig,
  AIFeatureFlag,
  AIRolloutStage,
} from '@/types/ai-admin';

// =============================================================================
// STATUS CARD COMPONENT
// =============================================================================

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  status?: 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
  loading?: boolean;
}

function StatusCard({ title, value, icon: Icon, status = 'info', subtitle, loading }: StatusCardProps) {
  const statusColors = {
    success: 'text-green-500 bg-green-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    error: 'text-red-500 bg-red-500/10',
    info: 'text-blue-500 bg-blue-500/10',
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', statusColors[status])}>
          <Icon className="h-5 w-5" />
        </div>
        {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// =============================================================================
// FEATURE FLAG ROW COMPONENT
// =============================================================================

interface FeatureFlagRowProps {
  feature: AIFeatureFlag;
  onToggle: (featureId: string, enabled: boolean) => void;
  onRolloutChange: (featureId: string, stage: AIRolloutStage) => void;
  disabled?: boolean;
}

function FeatureFlagRow({ feature, onToggle, onRolloutChange, disabled }: FeatureFlagRowProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleToggle = async () => {
    setIsChanging(true);
    await onToggle(feature.id, !feature.enabled);
    setIsChanging(false);
  };

  const handleRolloutChange = async (stage: AIRolloutStage) => {
    setIsChanging(true);
    await onRolloutChange(feature.id, stage);
    setIsChanging(false);
  };

  return (
    <div className={cn(
      'p-4 rounded-lg border transition-colors',
      feature.enabled ? 'border-green-500/30 bg-green-500/5' : 'border-border'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            disabled={disabled || isChanging}
            className={cn(
              'transition-colors',
              isChanging && 'opacity-50 cursor-not-allowed'
            )}
          >
            {feature.enabled ? (
              <ToggleRight className="h-8 w-8 text-green-500" />
            ) : (
              <ToggleLeft className="h-8 w-8 text-muted-foreground" />
            )}
          </button>
          <div>
            <p className="font-medium">{getFeatureLabel(feature.id)}</p>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Rollout Stage Selector */}
          <select
            value={feature.rollout_stage}
            onChange={(e) => handleRolloutChange(e.target.value as AIRolloutStage)}
            disabled={disabled || isChanging || !feature.enabled}
            className={cn(
              'px-3 py-1.5 rounded-lg border bg-background text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              (!feature.enabled || disabled) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <option value="disabled">Devre Dışı</option>
            <option value="internal_testing">İç Test</option>
            <option value="beta">Beta</option>
            <option value="gradual_rollout">Kademeli Yayın</option>
            <option value="full_release">Tam Yayın</option>
          </select>

          {/* Rollout Percentage */}
          {feature.rollout_stage === 'gradual_rollout' && (
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{feature.rollout_percentage}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Beta Users & Blacklist Info */}
      {(feature.beta_users.length > 0 || feature.blacklisted_users.length > 0) && (
        <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
          {feature.beta_users.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {feature.beta_users.length} beta kullanıcı
            </span>
          )}
          {feature.blacklisted_users.length > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <XCircle className="h-3 w-3" />
              {feature.blacklisted_users.length} engelli
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// KILL SWITCH COMPONENT
// =============================================================================

interface KillSwitchProps {
  active: boolean;
  activatedAt?: string;
  reason?: string;
  onToggle: (active: boolean, reason?: string) => void;
  loading?: boolean;
}

function KillSwitch({ active, activatedAt, reason, onToggle, loading }: KillSwitchProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');

  const handleToggle = () => {
    if (active) {
      // Deactivating - just do it
      onToggle(false);
    } else {
      // Activating - show confirmation
      setShowConfirm(true);
    }
  };

  const handleConfirmActivate = () => {
    onToggle(true, deactivateReason || 'Admin tarafından manuel olarak etkinleştirildi');
    setShowConfirm(false);
    setDeactivateReason('');
  };

  return (
    <div className={cn(
      'p-6 rounded-lg border-2 transition-all',
      active 
        ? 'border-red-500 bg-red-500/5' 
        : 'border-green-500/30 bg-green-500/5'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={cn(
            'p-3 rounded-lg',
            active ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
          )}>
            <Power className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">AI Kill Switch</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {active 
                ? 'AI sistemi şu anda DEVRE DIŞI. Tüm AI istekleri engellenecek.'
                : 'AI sistemi aktif ve çalışıyor. Acil durumda kill switch\'i etkinleştirin.'}
            </p>
            {active && activatedAt && (
              <p className="text-xs text-red-500 mt-2">
                Etkinleştirilme: {new Date(activatedAt).toLocaleString('tr-TR')}
                {reason && ` - Neden: ${reason}`}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={loading}
          className={cn(
            'px-6 py-3 rounded-lg font-medium transition-all',
            active
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-red-500 text-white hover:bg-red-600',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : active ? (
            'Sistemi Aç'
          ) : (
            'Sistemi Kapat'
          )}
        </button>
      </div>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-red-500/30"
          >
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10">
              <AlertOctagon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-500">Kill Switch'i Etkinleştir?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Bu işlem TÜM AI özelliklerini anında devre dışı bırakacak. 
                  Kullanıcılar AI asistanı kullanamayacak.
                </p>
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Neden (opsiyonel)"
                    value={deactivateReason}
                    onChange={(e) => setDeactivateReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleConfirmActivate}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
                  >
                    Evet, Kapat
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 rounded-lg border text-sm hover:bg-muted"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function AIControlPanelPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<AISystemStatus | null>(null);
  const [featureFlags, setFeatureFlags] = useState<AIFeatureFlagConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'features' | 'circuit'>('status');

  // Fetch data
  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const [statusRes, flagsRes] = await Promise.all([
        getAISystemStatus(),
        getAIFeatureFlags(),
      ]);

      setSystemStatus(statusRes);
      setFeatureFlags(flagsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle kill switch toggle
  const handleKillSwitchToggle = async (active: boolean, reason?: string) => {
    try {
      setRefreshing(true);
      await toggleAIKillSwitch({ action: active ? 'activate' : 'deactivate', reason });
      await fetchData(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle feature toggle
  const handleFeatureToggle = async (featureId: string, enabled: boolean) => {
    try {
      await toggleAIFeature(featureId, enabled);
      await fetchData(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle rollout change
  const handleRolloutChange = async (featureId: string, stage: AIRolloutStage) => {
    try {
      await setAIRolloutStage(featureId, stage);
      await fetchData(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle health check
  const handleHealthCheck = async () => {
    try {
      setRefreshing(true);
      const health = await checkAIHealth();
      // Update system status with new health info
      await fetchData(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'operational':
        return { color: 'text-green-500', bg: 'bg-green-500', icon: CheckCircle, label: 'Çalışıyor' };
      case 'degraded':
        return { color: 'text-yellow-500', bg: 'bg-yellow-500', icon: AlertTriangle, label: 'Düşük Performans' };
      case 'maintenance':
        return { color: 'text-blue-500', bg: 'bg-blue-500', icon: Settings, label: 'Bakımda' };
      case 'offline':
        return { color: 'text-red-500', bg: 'bg-red-500', icon: XCircle, label: 'Çevrimdışı' };
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-500', icon: Activity, label: 'Bilinmiyor' };
    }
  };

  // Get circuit breaker status info
  const getCircuitBreakerInfo = (state: string) => {
    switch (state) {
      case 'closed':
        return { color: 'text-green-500', label: 'Kapalı (Normal)', description: 'Sistem normal çalışıyor' };
      case 'open':
        return { color: 'text-red-500', label: 'Açık (Engelli)', description: 'Çok fazla hata - istekler engelleniyor' };
      case 'half_open':
        return { color: 'text-yellow-500', label: 'Yarı Açık (Test)', description: 'Sistem test ediliyor' };
      default:
        return { color: 'text-gray-500', label: 'Bilinmiyor', description: '' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">AI sistemi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error && !systemStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <XCircle className="h-12 w-12 text-red-500" />
          <p className="font-medium">Hata Oluştu</p>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = systemStatus ? getStatusInfo(systemStatus.status) : null;
  const circuitInfo = systemStatus?.circuit_breaker 
    ? getCircuitBreakerInfo(systemStatus.circuit_breaker.state) 
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bot className="h-7 w-7 text-primary" />
            AI Kontrol Paneli
          </h1>
          <p className="text-muted-foreground mt-1">
            AI sisteminin durumunu izleyin ve yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          {refreshing && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Güncelleniyor...
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors',
              refreshing && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            Yenile
          </button>
          <button
            onClick={handleHealthCheck}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Activity className="h-4 w-4" />
            Health Check
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* System Status Overview */}
      {systemStatus && statusInfo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusCard
            title="Sistem Durumu"
            value={statusInfo.label}
            icon={statusInfo.icon}
            status={systemStatus.status === 'operational' ? 'success' : 
                   systemStatus.status === 'degraded' ? 'warning' : 'error'}
            subtitle={`Güncelleme: ${new Date(systemStatus.last_updated).toLocaleTimeString('tr-TR')}`}
          />
          <StatusCard
            title="API Latency"
            value={`${systemStatus.health.api_latency_ms}ms`}
            icon={Zap}
            status={systemStatus.health.api_latency_ms < 500 ? 'success' : 
                   systemStatus.health.api_latency_ms < 1000 ? 'warning' : 'error'}
          />
          <StatusCard
            title="Uptime (24s)"
            value={`${systemStatus.health.uptime_percent_24h.toFixed(1)}%`}
            icon={TrendingUp}
            status={systemStatus.health.uptime_percent_24h >= 99 ? 'success' : 
                   systemStatus.health.uptime_percent_24h >= 95 ? 'warning' : 'error'}
          />
          <StatusCard
            title="Aktif Özellikler"
            value={systemStatus.features.filter(f => f.enabled).length}
            icon={Settings}
            status="info"
            subtitle={`/ ${systemStatus.features.length} toplam`}
          />
        </div>
      )}

      {/* Kill Switch */}
      {featureFlags && (
        <KillSwitch
          active={featureFlags.kill_switch.active}
          activatedAt={featureFlags.kill_switch.activated_at}
          reason={featureFlags.kill_switch.reason}
          onToggle={handleKillSwitchToggle}
          loading={refreshing}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'status', label: 'Sistem Durumu', icon: Activity },
          { key: 'features', label: 'Özellik Yönetimi', icon: Settings },
          { key: 'circuit', label: 'Circuit Breaker', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'status' && systemStatus && (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Health Indicators */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Bağlantı Durumu</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'API Bağlantısı', connected: systemStatus.health.api_connection },
                  { label: 'Veritabanı', connected: systemStatus.health.database_connection },
                  { label: 'Cache', connected: systemStatus.health.cache_connection },
                  { label: 'Son Başarılı İstek', connected: !!systemStatus.health.last_successful_request },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'p-3 rounded-lg border flex items-center gap-3',
                      item.connected ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                    )}
                  >
                    {item.connected ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-sm">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Status Grid */}
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Özellik Durumları</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {systemStatus.features.map((feature) => (
                  <div
                    key={feature.feature}
                    className={cn(
                      'p-3 rounded-lg border',
                      feature.enabled ? 'border-green-500/30 bg-green-500/5' : 'border-border'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        feature.enabled ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'
                      )}>
                        {feature.enabled ? 'Aktif' : 'Pasif'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getRolloutStageLabel(feature.rollout_stage)}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{getFeatureLabel(feature.feature)}</p>
                    {feature.rollout_stage === 'gradual_rollout' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {feature.rollout_percentage}% kullanıcı
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'features' && featureFlags && (
          <motion.div
            key="features"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-6"
          >
            <h3 className="font-semibold mb-4">Özellik Yönetimi</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Her bir AI özelliğini ayrı ayrı kontrol edin. Rollout aşamalarını kullanarak 
              özellikleri kademeli olarak yayınlayabilirsiniz.
            </p>
            <div className="space-y-3">
              {featureFlags.features.map((feature) => (
                <FeatureFlagRow
                  key={feature.id}
                  feature={feature}
                  onToggle={handleFeatureToggle}
                  onRolloutChange={handleRolloutChange}
                  disabled={featureFlags.kill_switch.active}
                />
              ))}
            </div>
            {featureFlags.kill_switch.active && (
              <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2 text-sm text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                Kill switch aktif olduğu için özellik ayarları değiştirilemez.
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'circuit' && systemStatus?.circuit_breaker && circuitInfo && (
          <motion.div
            key="circuit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-6"
          >
            <h3 className="font-semibold mb-4">Circuit Breaker Durumu</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Circuit breaker, AI API'sine yapılan istekleri izler ve çok fazla hata oluştuğunda
              sistemi korumak için istekleri geçici olarak engeller.
            </p>

            <div className={cn(
              'p-6 rounded-lg border-2 mb-6',
              systemStatus.circuit_breaker.state === 'closed' ? 'border-green-500/30 bg-green-500/5' :
              systemStatus.circuit_breaker.state === 'open' ? 'border-red-500/30 bg-red-500/5' :
              'border-yellow-500/30 bg-yellow-500/5'
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'p-4 rounded-full',
                  systemStatus.circuit_breaker.state === 'closed' ? 'bg-green-500/10' :
                  systemStatus.circuit_breaker.state === 'open' ? 'bg-red-500/10' :
                  'bg-yellow-500/10'
                )}>
                  <Shield className={cn('h-8 w-8', circuitInfo.color)} />
                </div>
                <div>
                  <p className={cn('text-xl font-bold', circuitInfo.color)}>{circuitInfo.label}</p>
                  <p className="text-sm text-muted-foreground">{circuitInfo.description}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Hata Sayısı</p>
                <p className="text-2xl font-bold text-red-500">
                  {systemStatus.circuit_breaker.failure_count}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Başarılı İstek</p>
                <p className="text-2xl font-bold text-green-500">
                  {systemStatus.circuit_breaker.success_count}
                </p>
              </div>
              {systemStatus.circuit_breaker.last_failure && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Son Hata</p>
                  <p className="text-sm font-medium">
                    {new Date(systemStatus.circuit_breaker.last_failure).toLocaleString('tr-TR')}
                  </p>
                </div>
              )}
              {systemStatus.circuit_breaker.next_retry && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Sonraki Deneme</p>
                  <p className="text-sm font-medium">
                    {new Date(systemStatus.circuit_breaker.next_retry).toLocaleString('tr-TR')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
