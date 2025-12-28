/**
 * Security Center Page
 * Super Admin - Güvenlik Merkezi
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Lock,
  Eye,
  Globe,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  MapPin,
  Monitor,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

interface SecurityThreat {
  id: string;
  type: 'brute_force' | 'suspicious_login' | 'blocked_ip' | 'vulnerability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  resolved: boolean;
  details?: string;
}

interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  lastActive: string;
  isCurrent: boolean;
}

// Mock data
const securityMetrics = {
  threatScore: 85,
  blockedAttacks: 127,
  activeSessions: 342,
  pendingThreats: 3,
};

const threats: SecurityThreat[] = [
  {
    id: '1',
    type: 'brute_force',
    severity: 'high',
    description: '5 başarısız giriş denemesi tespit edildi',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    resolved: false,
    details: 'IP: 45.33.22.11 - hedef: admin@example.com',
  },
  {
    id: '2',
    type: 'suspicious_login',
    severity: 'medium',
    description: 'Farklı konumdan giriş yapıldı',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    resolved: true,
    details: 'Kullanıcı: ahmet@example.com - Konum: Almanya',
  },
  {
    id: '3',
    type: 'blocked_ip',
    severity: 'low',
    description: 'Kara listedeki IP engellendi',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    resolved: true,
    details: 'IP: 103.145.12.5',
  },
];

const activeSessions: ActiveSession[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Ahmet Yılmaz',
    userEmail: 'ahmet@example.com',
    ipAddress: '192.168.1.100',
    location: 'İstanbul, Türkiye',
    device: 'Windows PC',
    browser: 'Chrome 120',
    lastActive: new Date().toISOString(),
    isCurrent: false,
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'Mehmet Admin',
    userEmail: 'admin@example.com',
    ipAddress: '192.168.1.50',
    location: 'Ankara, Türkiye',
    device: 'MacBook Pro',
    browser: 'Safari 17',
    lastActive: new Date(Date.now() - 300000).toISOString(),
    isCurrent: true,
  },
];

export default function SecurityCenterPage() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getThreatIcon = (type: SecurityThreat['type']) => {
    switch (type) {
      case 'brute_force':
        return <Lock className="h-4 w-4" />;
      case 'suspicious_login':
        return <Eye className="h-4 w-4" />;
      case 'blocked_ip':
        return <Ban className="h-4 w-4" />;
      case 'vulnerability':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: SecurityThreat['severity']) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-600';
      case 'medium':
        return 'bg-yellow-100 text-yellow-600';
      case 'high':
        return 'bg-orange-100 text-orange-600';
      case 'critical':
        return 'bg-red-100 text-red-600';
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
          <h1 className="text-2xl font-bold">Güvenlik Merkezi</h1>
          <p className="text-muted-foreground">Sistem güvenliğini izleyin ve yönetin</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} isLoading={refreshing}>
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          Yenile
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Güvenlik Skoru</p>
                <p className="text-3xl font-bold text-green-600">{securityMetrics.threatScore}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <Progress value={securityMetrics.threatScore} variant="success" className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engellenen Saldırı</p>
                <p className="text-3xl font-bold">{securityMetrics.blockedAttacks}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Ban className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Son 30 günde</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktif Oturum</p>
                <p className="text-3xl font-bold">{securityMetrics.activeSessions}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Globe className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Şu anda çevrimiçi</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen Tehdit</p>
                <p className="text-3xl font-bold text-orange-600">{securityMetrics.pendingThreats}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">İnceleme bekliyor</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Threats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Son Tehditler
            </CardTitle>
            <CardDescription>Son tespit edilen güvenlik tehditleri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {threats.map((threat) => (
              <div
                key={threat.id}
                className={cn(
                  'p-4 rounded-lg border',
                  threat.resolved && 'opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', getSeverityColor(threat.severity))}>
                    {getThreatIcon(threat.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{threat.description}</p>
                      {threat.resolved ? (
                        <Badge variant="success" className="text-xs">Çözüldü</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Aktif</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{threat.details}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(threat.timestamp)}
                    </div>
                  </div>
                  {!threat.resolved && (
                    <Button variant="outline" size="sm">
                      İncele
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Aktif Oturumlar
            </CardTitle>
            <CardDescription>Şu anda oturum açmış kullanıcılar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'p-4 rounded-lg border',
                  session.isCurrent && 'border-primary bg-primary/5'
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar alt={session.userName} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{session.userName}</p>
                      {session.isCurrent && (
                        <Badge className="text-xs">Bu Oturum</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{session.userEmail}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        {session.device}
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {session.browser}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(session.lastActive)}
                      </div>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button variant="destructive" size="sm">
                      Sonlandır
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
