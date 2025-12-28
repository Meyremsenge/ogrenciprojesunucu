/**
 * Audit Logs Page
 * Super Admin - Denetim Logları
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  User,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Settings,
  Shield,
  AlertTriangle,
  Eye,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  actionType: 'auth' | 'crud' | 'system' | 'security';
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  details?: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
}

// Mock data
const auditLogs: AuditLog[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Ahmet Yılmaz',
    userEmail: 'ahmet@example.com',
    action: 'Giriş yaptı',
    actionType: 'auth',
    resource: 'auth',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome 120 / Windows',
    timestamp: new Date().toISOString(),
    severity: 'info',
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'Mehmet Admin',
    userEmail: 'admin@example.com',
    action: 'Kullanıcı oluşturdu',
    actionType: 'crud',
    resource: 'users',
    resourceId: 'u5',
    ipAddress: '192.168.1.50',
    userAgent: 'Firefox 121 / MacOS',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    severity: 'info',
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'Zeynep Kaya',
    userEmail: 'zeynep@example.com',
    action: 'Şifre değiştirdi',
    actionType: 'security',
    resource: 'password',
    ipAddress: '10.0.0.15',
    userAgent: 'Safari 17 / iOS',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    severity: 'warning',
  },
  {
    id: '4',
    userId: 'u2',
    userName: 'Mehmet Admin',
    userEmail: 'admin@example.com',
    action: 'Sistem ayarlarını güncelledi',
    actionType: 'system',
    resource: 'settings',
    ipAddress: '192.168.1.50',
    userAgent: 'Firefox 121 / MacOS',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    severity: 'warning',
  },
  {
    id: '5',
    userId: 'unknown',
    userName: 'Bilinmeyen',
    userEmail: 'unknown',
    action: 'Başarısız giriş denemesi (5 kez)',
    actionType: 'security',
    resource: 'auth',
    ipAddress: '45.33.22.11',
    userAgent: 'Unknown',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    severity: 'critical',
  },
];

const actionTypes = [
  { key: 'all', label: 'Tümü' },
  { key: 'auth', label: 'Kimlik Doğrulama' },
  { key: 'crud', label: 'CRUD İşlemleri' },
  { key: 'system', label: 'Sistem' },
  { key: 'security', label: 'Güvenlik' },
];

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery);
    const matchesType = selectedType === 'all' || log.actionType === selectedType;
    return matchesSearch && matchesType;
  });

  const getActionIcon = (type: AuditLog['actionType']) => {
    switch (type) {
      case 'auth':
        return <LogIn className="h-4 w-4" />;
      case 'crud':
        return <Edit className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Denetim Logları</h1>
          <p className="text-muted-foreground">Sistem aktivitelerini izleyin ve denetleyin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kullanıcı, işlem veya IP ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {actionTypes.map((type) => (
                <Button
                  key={type.key}
                  variant={selectedType === type.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType(type.key)}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.map((log, index) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={cn(
                'cursor-pointer hover:shadow-md transition-all',
                selectedLog?.id === log.id && 'ring-2 ring-primary'
              )}
              onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      log.severity === 'info' && 'bg-blue-100 text-blue-600',
                      log.severity === 'warning' && 'bg-yellow-100 text-yellow-600',
                      log.severity === 'critical' && 'bg-red-100 text-red-600'
                    )}
                  >
                    {getActionIcon(log.actionType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{log.userName}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground text-sm">{log.action}</span>
                      <Badge
                        variant={
                          log.severity === 'critical'
                            ? 'destructive'
                            : log.severity === 'warning'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {log.actionType === 'auth'
                          ? 'Kimlik'
                          : log.actionType === 'crud'
                          ? 'CRUD'
                          : log.actionType === 'system'
                          ? 'Sistem'
                          : 'Güvenlik'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{formatDate(log.timestamp)}</span>
                      <span>IP: {log.ipAddress}</span>
                    </div>
                  </div>

                  {/* View Button */}
                  <Button variant="ghost" size="icon-sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                {/* Expanded Details */}
                {selectedLog?.id === log.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t space-y-2"
                  >
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">E-posta:</span>
                        <span className="ml-2 font-mono">{log.userEmail}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kaynak:</span>
                        <span className="ml-2 font-mono">{log.resource}</span>
                        {log.resourceId && <span className="ml-1">({log.resourceId})</span>}
                      </div>
                      <div>
                        <span className="text-muted-foreground">User Agent:</span>
                        <span className="ml-2">{log.userAgent}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IP Adresi:</span>
                        <span className="ml-2 font-mono">{log.ipAddress}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Eşleşen log bulunamadı</p>
        </div>
      )}
    </div>
  );
}
