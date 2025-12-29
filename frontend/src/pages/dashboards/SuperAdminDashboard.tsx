/**
 * Super Admin Dashboard - UX Optimized
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * UX PRENSİPLERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🎯 GÖSTERILECEK METRİKLER (Öncelik Sırasına Göre):
 *    1. Sistem sağlığı (CPU, RAM, Disk)
 *    2. Aktif servis durumları
 *    3. Güvenlik uyarıları
 *    4. Yedekleme durumu
 * 
 * 📌 ÖNCELİKLİ AKSİYONLAR:
 *    1. "Sistem Restart" - Servis yeniden başlatma
 *    2. "Güvenlik Tarama" - Manuel güvenlik kontrolü
 *    3. "Yedekleme Başlat" - Manuel backup
 * 
 * ⚖️ BİLGİ YOĞUNLUĞU DENGESİ:
 *    - Sistem metrikleri: Gerçek zamanlı gauge'lar
 *    - Servis durumu: Renk kodlu kompakt liste
 *    - Audit log: Son 10 kayıt özeti
 *    - Güvenlik: Sadece kritik uyarılar
 * 
 * 🚫 GEREKSİZ VERİDEN KAÇINMA:
 *    - Detaylı log analizi ayrı sayfada
 *    - Kullanıcı yönetimi Admin'de
 *    - Performans detayları monitoring sayfasında
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Server,
  Database,
  Shield,
  Activity,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Eye,
  FileText,
  Lock,
  Globe,
  Zap,
  Terminal,
  Users,
} from 'lucide-react';

import { useUser } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  DashboardSection,
} from '@/components/dashboard';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const mockSystemHealth = {
  cpu: 45,
  memory: 68,
  disk: 52,
  network: 24,
  uptime: '45 gün 12 saat',
  lastBackup: '2 saat önce',
  activeConnections: 1234,
};

const mockServices = [
  { name: 'API Server', status: 'healthy' as const, uptime: '99.9%', latency: '45ms' },
  { name: 'Database', status: 'healthy' as const, uptime: '99.8%', latency: '12ms' },
  { name: 'Redis Cache', status: 'healthy' as const, uptime: '99.9%', latency: '2ms' },
  { name: 'Email Service', status: 'warning' as const, uptime: '98.5%', latency: '120ms' },
  { name: 'File Storage', status: 'healthy' as const, uptime: '99.7%', latency: '85ms' },
  { name: 'Video CDN', status: 'healthy' as const, uptime: '99.6%', latency: '35ms' },
];

const mockSecurityAlerts = [
  { id: 1, type: 'warning', message: '15 başarısız giriş denemesi tespit edildi', time: '5 dk önce', ip: '192.168.1.45' },
  { id: 2, type: 'info', message: 'Güvenlik taraması tamamlandı', time: '1 saat önce', ip: null },
  { id: 3, type: 'success', message: 'SSL sertifikası yenilendi', time: '2 saat önce', ip: null },
];

const mockAuditLogs = [
  { id: 1, user: 'admin@system.com', action: 'Kullanıcı silindi', target: 'user_12345', time: '10 dk önce' },
  { id: 2, user: 'superadmin@system.com', action: 'Sistem ayarları güncellendi', target: 'email_config', time: '25 dk önce' },
  { id: 3, user: 'admin@system.com', action: 'Kurs onaylandı', target: 'course_789', time: '1 saat önce' },
  { id: 4, user: 'system', action: 'Otomatik yedekleme', target: 'backup_20240115', time: '2 saat önce' },
  { id: 5, user: 'superadmin@system.com', action: 'Yeni admin eklendi', target: 'user_67890', time: '3 saat önce' },
];

const mockDatabaseStats = {
  totalSize: '128 GB',
  usedSize: '67 GB',
  tables: 45,
  activeQueries: 23,
  slowQueries: 2,
  connections: 85,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function SuperAdminDashboard() {
  const user = useUser();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sistem Yönetimi</h1>
          <p className="text-muted-foreground">
            Sunucu durumu ve sistem metrikleri
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/superadmin/logs')}
            leftIcon={<Terminal className="h-4 w-4" />}
          >
            Loglar
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/superadmin/backup')}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Yedekleme
          </Button>
          <Button
            onClick={() => navigate('/superadmin/settings')}
            leftIcon={<Server className="h-4 w-4" />}
          >
            Sistem Ayarları
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SYSTEM HEALTH GAUGES
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemGauge
          icon={Cpu}
          label="CPU Kullanımı"
          value={mockSystemHealth.cpu}
          color={mockSystemHealth.cpu > 80 ? 'danger' : mockSystemHealth.cpu > 60 ? 'warning' : 'success'}
        />
        <SystemGauge
          icon={MemoryStick}
          label="Bellek (RAM)"
          value={mockSystemHealth.memory}
          color={mockSystemHealth.memory > 85 ? 'danger' : mockSystemHealth.memory > 70 ? 'warning' : 'success'}
        />
        <SystemGauge
          icon={HardDrive}
          label="Disk Kullanımı"
          value={mockSystemHealth.disk}
          color={mockSystemHealth.disk > 80 ? 'danger' : mockSystemHealth.disk > 60 ? 'warning' : 'success'}
        />
        <SystemGauge
          icon={Wifi}
          label="Ağ Trafiği"
          value={mockSystemHealth.network}
          color="info"
          suffix="Mbps"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          UPTIME & QUICK STATS
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickStatCard
          icon={Clock}
          label="Sistem Uptime"
          value={mockSystemHealth.uptime}
          subtext="Son yeniden başlatma"
        />
        <QuickStatCard
          icon={Database}
          label="Son Yedekleme"
          value={mockSystemHealth.lastBackup}
          subtext="Otomatik yedekleme aktif"
          action={
            <Button size="sm" variant="ghost" leftIcon={<Download className="h-3 w-3" />}>
              Manuel
            </Button>
          }
        />
        <QuickStatCard
          icon={Users}
          label="Aktif Bağlantılar"
          value={mockSystemHealth.activeConnections.toLocaleString()}
          subtext="WebSocket + HTTP"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECURITY ALERTS (if any)
          ═══════════════════════════════════════════════════════════════════════ */}
      {mockSecurityAlerts.some(a => a.type === 'warning') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
        >
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-red-700 dark:text-red-400">
              Güvenlik Uyarısı
            </p>
            <p className="text-sm text-muted-foreground">
              {mockSecurityAlerts.find(a => a.type === 'warning')?.message}
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => navigate('/superadmin/security')}
          >
            İncele
          </Button>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Status */}
          <DashboardSection
            title="Servis Durumları"
            icon={Activity}
            action="Detaylı İzleme"
            onAction={() => navigate('/superadmin/monitoring')}
          >
            <div className="grid md:grid-cols-2 gap-3">
              {mockServices.map((service) => (
                <ServiceStatusCard key={service.name} service={service} />
              ))}
            </div>
          </DashboardSection>

          {/* Audit Logs */}
          <DashboardSection
            title="Denetim Kayıtları"
            icon={FileText}
            action="Tüm Loglar"
            onAction={() => navigate('/superadmin/logs')}
          >
            <div className="space-y-2">
              {mockAuditLogs.map((log) => (
                <AuditLogItem key={log.id} log={log} />
              ))}
            </div>
          </DashboardSection>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Database Stats */}
          <DashboardSection title="Veritabanı" icon={Database}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Disk Kullanımı</span>
                <span className="font-semibold">
                  {mockDatabaseStats.usedSize} / {mockDatabaseStats.totalSize}
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: '52%' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-semibold">{mockDatabaseStats.tables}</p>
                  <p className="text-xs text-muted-foreground">Tablolar</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-semibold">{mockDatabaseStats.connections}</p>
                  <p className="text-xs text-muted-foreground">Bağlantılar</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-semibold">{mockDatabaseStats.activeQueries}</p>
                  <p className="text-xs text-muted-foreground">Aktif Sorgu</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <p className="text-lg font-semibold text-orange-600">{mockDatabaseStats.slowQueries}</p>
                  <p className="text-xs text-muted-foreground">Yavaş Sorgu</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/superadmin/database')}
              >
                Veritabanı Yönetimi
              </Button>
            </div>
          </DashboardSection>

          {/* Security Status */}
          <DashboardSection title="Güvenlik Özeti" icon={Shield}>
            <div className="space-y-3">
              {mockSecurityAlerts.slice(0, 3).map((alert) => (
                <SecurityAlertItem key={alert.id} alert={alert} />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                leftIcon={<Shield className="h-4 w-4" />}
                onClick={() => navigate('/superadmin/security')}
              >
                Güvenlik Taraması
              </Button>
            </div>
          </DashboardSection>

          {/* Quick Actions */}
          <DashboardSection title="Hızlı İşlemler" icon={Zap}>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={() => console.log('Clear cache')}
              >
                Önbelleği Temizle
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => console.log('Backup')}
              >
                Manuel Yedekleme
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => console.log('Export logs')}
              >
                Logları Dışa Aktar
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={() => console.log('Restart services')}
              >
                Servisleri Yeniden Başlat
              </Button>
            </div>
          </DashboardSection>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧩 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface SystemGaugeProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'success' | 'warning' | 'danger' | 'info';
  suffix?: string;
}

function SystemGauge({ icon: Icon, label, value, color, suffix = '%' }: SystemGaugeProps) {
  const colorClasses = {
    success: 'text-green-500 bg-green-500',
    warning: 'text-orange-500 bg-orange-500',
    danger: 'text-red-500 bg-red-500',
    info: 'text-blue-500 bg-blue-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorClasses[color].replace('text-', 'bg-').replace('bg-', 'bg-') + '/10')}>
          <Icon className={cn('h-4 w-4', colorClasses[color].split(' ')[0])} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      
      <div className="flex items-end justify-between">
        <span className={cn('text-3xl font-bold', colorClasses[color].split(' ')[0])}>
          {value}
          <span className="text-lg ml-0.5">{suffix}</span>
        </span>
      </div>
      
      <div className="mt-3 w-full h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn('h-full rounded-full', colorClasses[color].split(' ')[1])}
        />
      </div>
    </motion.div>
  );
}

interface QuickStatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  action?: React.ReactNode;
}

function QuickStatCard({ icon: Icon, label, value, subtext, action }: QuickStatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        </div>
        {action}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{subtext}</p>
    </div>
  );
}

interface ServiceStatusCardProps {
  service: {
    name: string;
    status: 'healthy' | 'warning' | 'error';
    uptime: string;
    latency: string;
  };
}

function ServiceStatusCard({ service }: ServiceStatusCardProps) {
  const statusConfig = {
    healthy: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle, label: 'Çalışıyor' },
    warning: { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle, label: 'Uyarı' },
    error: { color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle, label: 'Hata' },
  };

  const config = statusConfig[service.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn('p-3 rounded-lg border border-border', config.bg)}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{service.name}</span>
        <StatusIcon className={cn('h-4 w-4', config.color)} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Uptime: {service.uptime}</span>
        <span className="text-muted-foreground">{service.latency}</span>
      </div>
    </div>
  );
}

interface AuditLogItemProps {
  log: {
    id: number;
    user: string;
    action: string;
    target: string;
    time: string;
  };
}

function AuditLogItem({ log }: AuditLogItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{log.action}</p>
        <p className="text-xs text-muted-foreground truncate">
          {log.user} • {log.target}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{log.time}</span>
    </div>
  );
}

interface SecurityAlertItemProps {
  alert: {
    id: number;
    type: string;
    message: string;
    time: string;
    ip: string | null;
  };
}

function SecurityAlertItem({ alert }: SecurityAlertItemProps) {
  const typeConfig: Record<string, { color: string; icon: React.ElementType }> = {
    warning: { color: 'text-orange-500 bg-orange-500/10', icon: AlertTriangle },
    info: { color: 'text-blue-500 bg-blue-500/10', icon: Globe },
    success: { color: 'text-green-500 bg-green-500/10', icon: CheckCircle },
  };

  const config = typeConfig[alert.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', config.color.split(' ')[1])}>
        <Icon className={cn('h-4 w-4', config.color.split(' ')[0])} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{alert.message}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{alert.time}</span>
          {alert.ip && (
            <>
              <span>•</span>
              <span className="font-mono">{alert.ip}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
