/**
 * Settings Page
 * Sistem ayarları sayfası (Admin)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Globe,
  Mail,
  Shield,
  Database,
  Bell,
  Palette,
  Save,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SETTING_TABS = [
  { key: 'general', label: 'Genel', icon: Settings },
  { key: 'appearance', label: 'Görünüm', icon: Palette },
  { key: 'email', label: 'E-posta', icon: Mail },
  { key: 'security', label: 'Güvenlik', icon: Shield },
  { key: 'notifications', label: 'Bildirimler', icon: Bell },
  { key: 'database', label: 'Veritabanı', icon: Database },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = () => {
    setHasChanges(true);
  };

  const handleSave = () => {
    // Save settings
    setHasChanges(false);
  };

  const handleReset = () => {
    // Reset to defaults
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sistem Ayarları</h1>
          <p className="text-muted-foreground mt-1">
            Uygulama genelindeki ayarları yapılandırın
          </p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'border hover:bg-muted transition-colors'
              )}
            >
              <RotateCcw className="h-4 w-4" />
              Sıfırla
            </button>
            <button
              onClick={handleSave}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
              )}
            >
              <Save className="h-4 w-4" />
              Kaydet
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="lg:col-span-1">
          <div className="card p-2 space-y-1">
            {SETTING_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-6"
          >
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Genel Ayarlar</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Site Adı</label>
                    <input
                      type="text"
                      defaultValue="Öğrenci Koçluk Sistemi"
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Site URL</label>
                    <input
                      type="url"
                      defaultValue="https://example.com"
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Varsayılan Dil</label>
                    <select
                      defaultValue="tr"
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="tr">Türkçe</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Zaman Dilimi</label>
                    <select
                      defaultValue="Europe/Istanbul"
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="Europe/Istanbul">İstanbul (GMT+3)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        onChange={handleChange}
                        className="rounded"
                      />
                      <span className="text-sm">Bakım modu aktif</span>
                    </label>
                    <p className="text-sm text-muted-foreground mt-1 ml-7">
                      Aktif olduğunda sadece adminler siteye erişebilir
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Görünüm Ayarları</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Varsayılan Tema</label>
                    <div className="flex gap-4">
                      {['light', 'dark', 'system'].map((theme) => (
                        <label
                          key={theme}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="theme"
                            value={theme}
                            defaultChecked={theme === 'system'}
                            onChange={handleChange}
                          />
                          <span className="text-sm capitalize">{theme === 'system' ? 'Sistem' : theme === 'light' ? 'Açık' : 'Koyu'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Ana Renk</label>
                    <div className="flex gap-3">
                      {['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'].map((color) => (
                        <button
                          key={color}
                          className="w-10 h-10 rounded-lg border-2 border-transparent hover:border-foreground transition-colors"
                          style={{ backgroundColor: color }}
                          onClick={handleChange}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                        <Globe className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <button className="px-4 py-2 border rounded-lg hover:bg-muted">
                        Logo Yükle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">E-posta Ayarları</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">SMTP Host</label>
                    <input
                      type="text"
                      defaultValue="smtp.example.com"
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">SMTP Port</label>
                      <input
                        type="number"
                        defaultValue="587"
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Şifreleme</label>
                      <select
                        defaultValue="tls"
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="none">Yok</option>
                        <option value="ssl">SSL</option>
                        <option value="tls">TLS</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Gönderen Adres</label>
                    <input
                      type="email"
                      defaultValue="noreply@example.com"
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <button className="px-4 py-2 border rounded-lg hover:bg-muted">
                    Test E-postası Gönder
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Güvenlik Ayarları</h2>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        onChange={handleChange}
                        className="rounded"
                      />
                      <span className="text-sm">İki faktörlü doğrulama zorunlu (Admin)</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        onChange={handleChange}
                        className="rounded"
                      />
                      <span className="text-sm">Başarısız giriş denemelerini logla</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Oturum süresi (dakika)
                    </label>
                    <input
                      type="number"
                      defaultValue="30"
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Maksimum giriş denemesi
                    </label>
                    <input
                      type="number"
                      defaultValue="5"
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Minimum şifre uzunluğu
                    </label>
                    <input
                      type="number"
                      defaultValue="8"
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Bildirim Ayarları</h2>

                <div className="space-y-4">
                  {[
                    { key: 'new_user', label: 'Yeni kullanıcı kaydı' },
                    { key: 'course_complete', label: 'Kurs tamamlama' },
                    { key: 'exam_submit', label: 'Sınav gönderimi' },
                    { key: 'system_error', label: 'Sistem hataları' },
                    { key: 'backup_complete', label: 'Yedekleme tamamlandı' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">{item.label}</span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked onChange={handleChange} className="rounded" />
                          <span className="text-xs text-muted-foreground">E-posta</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked onChange={handleChange} className="rounded" />
                          <span className="text-xs text-muted-foreground">Push</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Veritabanı Ayarları</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Veritabanı Boyutu</p>
                    <p className="text-2xl font-bold mt-1">2.4 GB</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Son Yedekleme</p>
                    <p className="text-2xl font-bold mt-1">2 saat önce</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button className="w-full px-4 py-3 border rounded-lg hover:bg-muted text-left">
                    <span className="font-medium">Manuel Yedekleme Başlat</span>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Veritabanının tam yedeğini alır
                    </p>
                  </button>
                  <button className="w-full px-4 py-3 border rounded-lg hover:bg-muted text-left">
                    <span className="font-medium">Önbelleği Temizle</span>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Redis cache'i temizler
                    </p>
                  </button>
                  <button className="w-full px-4 py-3 border border-destructive/50 rounded-lg hover:bg-destructive/10 text-left text-destructive">
                    <span className="font-medium">Veritabanını Optimize Et</span>
                    <p className="text-sm opacity-70 mt-0.5">
                      Dikkat: Bu işlem birkaç dakika sürebilir
                    </p>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
