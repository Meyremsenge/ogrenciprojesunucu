/**
 * System Configuration Page
 * Super Admin - Sistem Yapılandırması
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Database,
  Server,
  Mail,
  Shield,
  Clock,
  RefreshCw,
  Save,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

interface SystemStatus {
  database: 'healthy' | 'warning' | 'error';
  cache: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  email: 'healthy' | 'warning' | 'error';
}

const systemStatus: SystemStatus = {
  database: 'healthy',
  cache: 'healthy',
  storage: 'warning',
  email: 'healthy',
};

export default function SystemConfigPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const StatusBadge = ({ status }: { status: 'healthy' | 'warning' | 'error' }) => {
    const variants = {
      healthy: 'success',
      warning: 'warning',
      error: 'destructive',
    } as const;
    const labels = {
      healthy: 'Sağlıklı',
      warning: 'Uyarı',
      error: 'Hata',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sistem Yapılandırması</h1>
          <p className="text-muted-foreground">Sistem ayarlarını ve yapılandırmalarını yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Kaydet
          </Button>
        </div>
      </div>

      {showSuccess && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          Değişiklikler başarıyla kaydedildi.
        </Alert>
      )}

      {/* System Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Veritabanı</p>
                  <StatusBadge status={systemStatus.database} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Önbellek</p>
                  <StatusBadge status={systemStatus.cache} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Depolama</p>
                  <StatusBadge status={systemStatus.storage} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">E-posta</p>
                  <StatusBadge status={systemStatus.email} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Genel</TabsTrigger>
          <TabsTrigger value="email">E-posta</TabsTrigger>
          <TabsTrigger value="security">Güvenlik</TabsTrigger>
          <TabsTrigger value="performance">Performans</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Genel Ayarlar</CardTitle>
              <CardDescription>Uygulama genel ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="Uygulama Adı" defaultValue="Öğrenci Sistemi" />
                <Input label="Sistem URL" defaultValue="https://ogrenme.example.com" />
                <Input label="Destek E-postası" type="email" defaultValue="destek@example.com" />
                <Input label="Zaman Dilimi" defaultValue="Europe/Istanbul" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bakım Modu</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="maintenance" className="text-primary" defaultChecked />
                    <span>Kapalı</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="maintenance" className="text-primary" />
                    <span>Açık</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>E-posta Yapılandırması</CardTitle>
              <CardDescription>SMTP sunucu ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="SMTP Sunucu" defaultValue="smtp.example.com" />
                <Input label="Port" type="number" defaultValue="587" />
                <Input label="Kullanıcı Adı" defaultValue="noreply@example.com" />
                <Input label="Şifre" type="password" defaultValue="********" />
                <Input label="Gönderen Adı" defaultValue="Öğrenci Sistemi" />
                <Input label="Gönderen E-posta" defaultValue="noreply@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Şifreleme</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="encryption" className="text-primary" />
                    <span>Yok</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="encryption" className="text-primary" defaultChecked />
                    <span>TLS</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="encryption" className="text-primary" />
                    <span>SSL</span>
                  </label>
                </div>
              </div>

              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Test E-postası Gönder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Güvenlik Ayarları</CardTitle>
              <CardDescription>Kimlik doğrulama ve güvenlik ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="Oturum Süresi (dakika)" type="number" defaultValue="60" />
                <Input label="Maksimum Giriş Denemesi" type="number" defaultValue="5" />
                <Input label="Hesap Kilitleme Süresi (dakika)" type="number" defaultValue="30" />
                <Input label="Minimum Şifre Uzunluğu" type="number" defaultValue="8" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">İki Faktörlü Doğrulama</p>
                      <p className="text-sm text-muted-foreground">Tüm kullanıcılar için zorunlu kıl</p>
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5" />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Şifre Süresi Dolumu</p>
                      <p className="text-sm text-muted-foreground">90 günde bir şifre değişikliği iste</p>
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5" defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performans Ayarları</CardTitle>
              <CardDescription>Önbellek ve optimizasyon ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="Önbellek TTL (saniye)" type="number" defaultValue="3600" />
                <Input label="Sayfa Başına Kayıt" type="number" defaultValue="25" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Sorgu Önbellekleme</p>
                      <p className="text-sm text-muted-foreground">Veritabanı sorgularını önbellekte tut</p>
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5" defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Otomatik Önbellek Temizleme</p>
                      <p className="text-sm text-muted-foreground">Her gece yarısı önbelleği temizle</p>
                    </div>
                  </div>
                  <input type="checkbox" className="w-5 h-5" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Önbelleği Temizle
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
