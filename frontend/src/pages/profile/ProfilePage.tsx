/**
 * Profile Page
 * Kullanıcı profil sayfası
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Save,
  Shield,
  Key,
  LogOut,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getMyProfile, updateMyProfile, changePassword, uploadAvatar } from '@/services/userService';

const TABS = [
  { key: 'profile', label: 'Profil Bilgileri', icon: User },
  { key: 'security', label: 'Güvenlik', icon: Shield },
];

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: '',
    address: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
  });

  // Update form data when profile loads
  const displayUser = profile || user;
  
  // Sync form data with profile
  if (profile && formData.first_name === '' && profile.first_name) {
    setFormData({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      phone: profile.phone || '',
      address: profile.address || '',
    });
  }

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof formData) => updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      setIsEditing(false);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { old_password: string; new_password: string }) => changePassword(data),
    onSuccess: () => {
      setShowPasswordModal(false);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    },
  });

  // Handle profile update
  const handleSaveProfile = () => {
    updateProfileMutation.mutate(formData);
  };

  // Handle password change
  const handleChangePassword = () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('Yeni şifreler eşleşmiyor');
      return;
    }
    changePasswordMutation.mutate({
      old_password: passwordData.current_password,
      new_password: passwordData.new_password,
    });
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Hesap Ayarları</h1>
        <p className="text-muted-foreground mt-1">
          Profil bilgilerinizi ve hesap ayarlarınızı yönetin
        </p>
      </div>

      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {displayUser?.avatar_url ? (
                <img src={displayUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {displayUser?.first_name?.[0]}{displayUser?.last_name?.[0]}
                </span>
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Camera className="h-4 w-4" />
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold">
              {displayUser?.first_name} {displayUser?.last_name}
            </h2>
            <p className="text-muted-foreground">{displayUser?.email}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm text-muted-foreground">
              <span className="badge badge-primary capitalize">{displayUser?.role}</span>
              {displayUser?.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Katılım: {new Date(displayUser.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                isEditing
                  ? 'bg-muted hover:bg-muted/80'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {isEditing ? 'İptal' : 'Düzenle'}
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="lg:col-span-1">
          <div className="card p-2 space-y-1">
            {TABS.map((tab) => (
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
            <hr className="my-2" />
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              Çıkış Yap
            </button>
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
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Kişisel Bilgiler</h3>

                {/* Success/Error Messages */}
                {updateProfileMutation.isSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                    <CheckCircle2 className="h-5 w-5" />
                    Profil başarıyla güncellendi
                  </div>
                )}
                {updateProfileMutation.isError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                    <XCircle className="h-5 w-5" />
                    {(updateProfileMutation.error as Error)?.message || 'Bir hata oluştu'}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">İsim</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        disabled={!isEditing}
                        className={cn(
                          'w-full pl-10 pr-4 py-2 rounded-lg border bg-background',
                          'focus:outline-none focus:ring-2 focus:ring-primary/50',
                          'disabled:opacity-60 disabled:cursor-not-allowed'
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Soyisim</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      disabled={!isEditing}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border bg-background',
                        'focus:outline-none focus:ring-2 focus:ring-primary/50',
                        'disabled:opacity-60 disabled:cursor-not-allowed'
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">E-posta</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="email"
                        defaultValue={displayUser?.email}
                        disabled
                        className="w-full pl-10 pr-4 py-2 rounded-lg border bg-muted opacity-60 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      E-posta değişikliği için destek ile iletişime geçin
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Telefon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+90 5XX XXX XX XX"
                        disabled={!isEditing}
                        className={cn(
                          'w-full pl-10 pr-4 py-2 rounded-lg border bg-background',
                          'focus:outline-none focus:ring-2 focus:ring-primary/50',
                          'disabled:opacity-60 disabled:cursor-not-allowed'
                        )}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Adres</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Adresinizi girin"
                        disabled={!isEditing}
                        rows={3}
                        className={cn(
                          'w-full pl-10 pr-4 py-2 rounded-lg border bg-background resize-none',
                          'focus:outline-none focus:ring-2 focus:ring-primary/50',
                          'disabled:opacity-60 disabled:cursor-not-allowed'
                        )}
                      />
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={updateProfileMutation.isPending}
                      className={cn(
                        'flex items-center gap-2 px-6 py-2 rounded-lg font-medium',
                        'bg-primary text-primary-foreground hover:bg-primary/90',
                        'disabled:opacity-50'
                      )}
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Değişiklikleri Kaydet
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Güvenlik Ayarları</h3>

                {/* Password Change Success/Error */}
                {changePasswordMutation.isSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                    <CheckCircle2 className="h-5 w-5" />
                    Şifre başarıyla değiştirildi
                  </div>
                )}
                {changePasswordMutation.isError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                    <XCircle className="h-5 w-5" />
                    {(changePasswordMutation.error as Error)?.message || 'Şifre değiştirilemedi'}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Change Password */}
                  <div className="p-4 border rounded-lg">
                    {showPasswordModal ? (
                      <div className="space-y-4">
                        <h4 className="font-medium">Şifre Değiştir</h4>
                        <div>
                          <label className="block text-sm mb-1">Mevcut Şifre</label>
                          <input
                            type="password"
                            value={passwordData.current_password}
                            onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Yeni Şifre</label>
                          <input
                            type="password"
                            value={passwordData.new_password}
                            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Yeni Şifre (Tekrar)</label>
                          <input
                            type="password"
                            value={passwordData.confirm_password}
                            onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleChangePassword}
                            disabled={changePasswordMutation.isPending}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                          >
                            {changePasswordMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Şifreyi Değiştir'
                            )}
                          </button>
                          <button
                            onClick={() => setShowPasswordModal(false)}
                            className="px-4 py-2 border rounded-lg hover:bg-muted"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <h4 className="font-medium">Şifre Değiştir</h4>
                            <p className="text-sm text-muted-foreground">
                              Hesap güvenliği için şifrenizi düzenli olarak değiştirin
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="px-4 py-2 border rounded-lg hover:bg-muted"
                        >
                          Değiştir
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2FA */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h4 className="font-medium">İki Faktörlü Doğrulama</h4>
                          <p className="text-sm text-muted-foreground">
                            Hesabınızı daha güvenli hale getirin
                          </p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                        Aktifleştir
                      </button>
                    </div>
                  </div>

                  {/* Active Sessions */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Aktif Oturumlar</h4>
                    <div className="space-y-3">
                      {[
                        { device: 'Windows - Chrome', location: 'İstanbul, TR', current: true },
                        { device: 'iPhone - Safari', location: 'İstanbul, TR', current: false },
                      ].map((session, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {session.device}
                              {session.current && (
                                <span className="ml-2 badge badge-success">Bu cihaz</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{session.location}</p>
                          </div>
                          {!session.current && (
                            <button className="text-sm text-destructive hover:underline">
                              Sonlandır
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
