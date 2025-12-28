/**
 * User Management UX Components
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ENTERPRISE ADMIN PANEL TASARIM PRENSİPLERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🛡️ HATA YAPMA RİSKİNİ MİNİMİZE ETME:
 *    1. ÇOKLU ONAY ADIMLARI
 *       - Kritik işlemler (silme, rol değiştirme) çift onay gerektirir
 *       - Geri alınamaz işlemler için bekleme süresi
 *       - Yazarak onaylama (kullanıcı adını yaz)
 * 
 *    2. GÖRSEL GERİ BİLDİRİM
 *       - Kırmızı = Tehlikeli işlem
 *       - Sarı = Dikkat gerektiren
 *       - Yeşil = Güvenli işlem
 *       - İkon + metin kombinasyonu
 * 
 *    3. AKILLI VARSAYILANLAR
 *       - Toplu işlemler varsayılan olarak kapalı
 *       - Filtreler açıkça görünür
 *       - Seçili öğe sayısı her zaman görünür
 * 
 *    4. GERİ ALMA MEKANİZMASI
 *       - Soft delete (30 gün geri alma)
 *       - İşlem geçmişi
 *       - Undo toast bildirimleri
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  UserCheck,
  UserCog,
  Shield,
  ShieldOff,
  Mail,
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit,
  Download,
  Upload,
  History,
  Clock,
  Ban,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 KULLANICI ARAMA & FİLTRE
// ═══════════════════════════════════════════════════════════════════════════════

interface UserSearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    role: string;
    status: string;
    dateRange: string;
  };
  onFilterChange: (key: string, value: string) => void;
  activeFilterCount: number;
}

export const UserSearchFilter: React.FC<UserSearchFilterProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  activeFilterCount,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-3">
      {/* Ana Arama Çubuğu */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Ad, e-posta veya ID ile ara..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors",
            showFilters && "bg-primary/10 border-primary"
          )}
        >
          <Filter className="w-4 h-4" />
          <span>Filtreler</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
        </button>
      </div>

      {/* Genişletilmiş Filtreler */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-muted/30 rounded-lg border grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rol Filtresi */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Rol</label>
                <select
                  value={filters.role}
                  onChange={(e) => onFilterChange('role', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">Tümü</option>
                  <option value="student">Öğrenci</option>
                  <option value="teacher">Öğretmen</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Süper Admin</option>
                </select>
              </div>

              {/* Durum Filtresi */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Durum</label>
                <select
                  value={filters.status}
                  onChange={(e) => onFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">Tümü</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                  <option value="pending">Onay Bekliyor</option>
                  <option value="suspended">Askıya Alınmış</option>
                </select>
              </div>

              {/* Tarih Aralığı */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Kayıt Tarihi</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => onFilterChange('dateRange', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">Tümü</option>
                  <option value="today">Bugün</option>
                  <option value="week">Son 7 Gün</option>
                  <option value="month">Son 30 Gün</option>
                  <option value="year">Son 1 Yıl</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 KULLANICI KARTI
// ═══════════════════════════════════════════════════════════════════════════════

interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'teacher' | 'admin' | 'super_admin';
    status: 'active' | 'inactive' | 'pending' | 'suspended';
    avatar?: string;
    lastLogin?: string;
    createdAt: string;
  };
  isSelected: boolean;
  onSelect: () => void;
  onAction: (action: string) => void;
}

const roleConfig = {
  student: { label: 'Öğrenci', color: 'bg-blue-100 text-blue-700', icon: User },
  teacher: { label: 'Öğretmen', color: 'bg-purple-100 text-purple-700', icon: UserCheck },
  admin: { label: 'Admin', color: 'bg-orange-100 text-orange-700', icon: Shield },
  super_admin: { label: 'Süper Admin', color: 'bg-red-100 text-red-700', icon: ShieldOff },
};

const statusConfig = {
  active: { label: 'Aktif', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
  inactive: { label: 'Pasif', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: XCircle },
  pending: { label: 'Onay Bekliyor', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
  suspended: { label: 'Askıda', color: 'text-red-600 bg-red-50 border-red-200', icon: Ban },
};

export const UserCard: React.FC<UserCardProps> = ({
  user,
  isSelected,
  onSelect,
  onAction,
}) => {
  const [showActions, setShowActions] = useState(false);
  const role = roleConfig[user.role];
  const status = statusConfig[user.status];
  const StatusIcon = status.icon;
  const RoleIcon = role.icon;

  return (
    <motion.div
      layout
      className={cn(
        "p-4 border rounded-lg transition-all",
        isSelected && "ring-2 ring-primary border-primary bg-primary/5",
        !isSelected && "hover:border-muted-foreground/30"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Seçim Checkbox */}
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </label>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* Kullanıcı Bilgileri */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{user.name}</h3>
            <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1", role.color)}>
              <RoleIcon className="w-3 h-3" />
              {role.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className={cn("px-2 py-0.5 rounded border flex items-center gap-1", status.color)}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            {user.lastLogin && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Son giriş: {user.lastLogin}
              </span>
            )}
          </div>
        </div>

        {/* Aksiyonlar */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-lg shadow-lg z-10 py-1"
              >
                <button
                  onClick={() => { onAction('view'); setShowActions(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Profili Görüntüle
                </button>
                <button
                  onClick={() => { onAction('edit'); setShowActions(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" /> Düzenle
                </button>
                <button
                  onClick={() => { onAction('role'); setShowActions(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <UserCog className="w-4 h-4" /> Rol Değiştir
                </button>
                <hr className="my-1" />
                {user.status === 'active' ? (
                  <button
                    onClick={() => { onAction('suspend'); setShowActions(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-amber-50 text-amber-600 flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" /> Askıya Al
                  </button>
                ) : (
                  <button
                    onClick={() => { onAction('activate'); setShowActions(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 text-green-600 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Aktif Et
                  </button>
                )}
                <button
                  onClick={() => { onAction('delete'); setShowActions(false); }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Sil
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ TEHLİKELİ İŞLEM ONAY MODAL
// ═══════════════════════════════════════════════════════════════════════════════

interface DangerousActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'delete' | 'suspend' | 'role_change' | 'bulk_delete';
  targetName: string;
  targetCount?: number;
  requireTyping?: boolean;
}

export const DangerousActionModal: React.FC<DangerousActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  targetName,
  targetCount = 1,
  requireTyping = false,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);

  const actionConfig = {
    delete: {
      title: 'Kullanıcıyı Sil',
      description: 'Bu kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      icon: Trash2,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      confirmText: 'SİL',
      buttonText: 'Kullanıcıyı Sil',
    },
    suspend: {
      title: 'Kullanıcıyı Askıya Al',
      description: 'Kullanıcı sisteme giriş yapamayacak.',
      icon: Ban,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      confirmText: '',
      buttonText: 'Askıya Al',
    },
    role_change: {
      title: 'Rol Değişikliği',
      description: 'Bu kullanıcının yetkileri değişecek.',
      icon: Shield,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      confirmText: '',
      buttonText: 'Rolü Değiştir',
    },
    bulk_delete: {
      title: `${targetCount} Kullanıcıyı Sil`,
      description: `Seçili ${targetCount} kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz!`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      confirmText: 'TOPLU SİL',
      buttonText: `${targetCount} Kullanıcıyı Sil`,
    },
  };

  const config = actionConfig[action];
  const ActionIcon = config.icon;

  // Geri sayım effect
  React.useEffect(() => {
    if (isOpen && (action === 'delete' || action === 'bulk_delete')) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, action]);

  const canConfirm = useMemo(() => {
    if (requireTyping && config.confirmText) {
      return typedConfirmation === config.confirmText && countdown === 0;
    }
    if (action === 'delete' || action === 'bulk_delete') {
      return countdown === 0;
    }
    return true;
  }, [typedConfirmation, config.confirmText, countdown, requireTyping, action]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onConfirm();
    setIsProcessing(false);
    setTypedConfirmation('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-background rounded-xl shadow-xl p-6"
      >
        {/* İkon */}
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4", config.bgColor)}>
          <ActionIcon className={cn("w-6 h-6", config.color)} />
        </div>

        {/* Başlık */}
        <h2 className="text-xl font-semibold text-center mb-2">{config.title}</h2>
        
        {/* Hedef */}
        <p className="text-center text-muted-foreground mb-4">
          <span className="font-medium text-foreground">{targetName}</span>
        </p>
        
        {/* Açıklama */}
        <div className={cn("p-3 rounded-lg mb-4", config.bgColor, "bg-opacity-30")}>
          <p className="text-sm text-center">{config.description}</p>
        </div>

        {/* Yazarak Onaylama */}
        {requireTyping && config.confirmText && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">
              Onaylamak için <span className="font-bold">{config.confirmText}</span> yazın:
            </label>
            <input
              type="text"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value.toUpperCase())}
              placeholder={config.confirmText}
              className={cn(
                "w-full px-3 py-2 border-2 rounded-lg text-center font-mono",
                typedConfirmation === config.confirmText
                  ? "border-red-500 bg-red-50"
                  : "border-muted"
              )}
            />
          </div>
        )}

        {/* Geri Sayım */}
        {(action === 'delete' || action === 'bulk_delete') && countdown > 0 && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
              <Clock className="w-4 h-4 animate-pulse" />
              <span className="text-sm">
                Onaylama {countdown} saniye sonra aktif olacak
              </span>
            </div>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isProcessing}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
              canConfirm
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RotateCcw className="w-4 h-4" />
                </motion.div>
                İşleniyor...
              </>
            ) : (
              config.buttonText
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 ROL DEĞİŞTİRME MODAL
// ═══════════════════════════════════════════════════════════════════════════════

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newRole: string) => void;
  user: {
    name: string;
    currentRole: string;
  };
}

// Helper function for button className
const getButtonClassName = (isDisabled: boolean, isEscalation: boolean): string => {
  const base = "flex-1 px-4 py-2 rounded-lg font-medium transition-colors";
  if (isDisabled) {
    return `${base} bg-muted text-muted-foreground cursor-not-allowed`;
  }
  if (isEscalation) {
    return `${base} bg-amber-600 text-white hover:bg-amber-700`;
  }
  return `${base} bg-primary text-primary-foreground hover:bg-primary/90`;
};

export const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
}) => {
  const [selectedRole, setSelectedRole] = useState(user.currentRole);
  const [showImpact, setShowImpact] = useState(false);

  const roles = [
    { 
      value: 'student', 
      label: 'Öğrenci', 
      description: 'Sadece kurs izleyebilir, sınav çözebilir',
      impact: 'Tüm öğretmen yetkileri kaldırılacak',
      permissions: ['Kurs İzleme', 'Sınav Çözme', 'Sertifika Alma']
    },
    { 
      value: 'teacher', 
      label: 'Öğretmen', 
      description: 'Kurs oluşturabilir, öğrenci takibi yapabilir',
      impact: 'Kurs oluşturma ve öğrenci yönetimi yetkisi verilecek',
      permissions: ['Kurs Oluşturma', 'Sınav Oluşturma', 'Öğrenci Takibi', 'Canlı Ders']
    },
    { 
      value: 'admin', 
      label: 'Admin', 
      description: 'Kullanıcı yönetimi, içerik onayı',
      impact: 'Sistem yönetimi yetkileri verilecek - DİKKAT!',
      permissions: ['Kullanıcı Yönetimi', 'İçerik Onayı', 'Rapor Görüntüleme', 'Paket Yönetimi']
    },
    { 
      value: 'super_admin', 
      label: 'Süper Admin', 
      description: 'Tam sistem erişimi',
      impact: 'TÜM SİSTEM YETKİLERİ - KRİTİK!',
      permissions: ['Tam Erişim', 'Sistem Ayarları', 'Veritabanı Yönetimi', 'Diğer Admin Yönetimi']
    },
  ];

  const selectedRoleData = roles.find(r => r.value === selectedRole);
  const isEscalation = roles.findIndex(r => r.value === selectedRole) > roles.findIndex(r => r.value === user.currentRole);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-background rounded-xl shadow-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCog className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Rol Değiştir</h2>
            <p className="text-sm text-muted-foreground">{user.name}</p>
          </div>
        </div>

        {/* Yetki Yükseltme Uyarısı */}
        {isEscalation && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium text-amber-800">Yetki Yükseltme!</span>
                <p className="text-amber-700 mt-0.5">
                  Bu kullanıcıya daha yüksek yetkiler veriyorsunuz. 
                  Bu işlem güvenlik denetim kaydına işlenecektir.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rol Seçenekleri */}
        <div className="space-y-2 mb-4">
          {roles.map((role) => (
            <button
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-all",
                selectedRole === role.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-muted hover:border-muted-foreground/30",
                role.value === user.currentRole && "opacity-50"
              )}
              disabled={role.value === user.currentRole}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{role.label}</span>
                  {role.value === user.currentRole && (
                    <span className="ml-2 text-xs text-muted-foreground">(Mevcut)</span>
                  )}
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
                {selectedRole === role.value && (
                  <CheckCircle className="w-5 h-5 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Etki Önizlemesi */}
        {selectedRoleData && selectedRole !== user.currentRole && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <button
              onClick={() => setShowImpact(!showImpact)}
              className="w-full flex items-center justify-between text-sm font-medium"
            >
              <span>Değişiklik Etkisi</span>
              <ChevronRight className={cn("w-4 h-4 transition-transform", showImpact && "rotate-90")} />
            </button>
            <AnimatePresence>
              {showImpact && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 pt-2 border-t"
                >
                  <p className={cn(
                    "text-sm mb-2",
                    isEscalation ? "text-amber-600" : "text-muted-foreground"
                  )}>
                    {selectedRoleData.impact}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Yeni yetkiler:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedRoleData.permissions.map((perm) => (
                        <span key={perm} className="px-2 py-0.5 bg-background rounded">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => onConfirm(selectedRole)}
            disabled={selectedRole === user.currentRole}
            className={getButtonClassName(selectedRole === user.currentRole, isEscalation)}
          >
            Rolü Değiştir
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 TOPLU İŞLEM TOOLBAR
// ═══════════════════════════════════════════════════════════════════════════════

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkAction: (action: string) => void;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkAction,
}) => {
  if (selectedCount === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background border rounded-xl shadow-xl p-4 flex items-center gap-4 z-40"
    >
      {/* Seçim Bilgisi */}
      <div className="flex items-center gap-3 pr-4 border-r">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="font-medium">{selectedCount} seçili</div>
          <div className="text-xs text-muted-foreground">{totalCount} kullanıcıdan</div>
        </div>
      </div>

      {/* Seçim Kontrolleri */}
      <div className="flex items-center gap-2 pr-4 border-r">
        {selectedCount < totalCount ? (
          <button
            onClick={onSelectAll}
            className="text-sm text-primary hover:underline"
          >
            Tümünü Seç
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">Tümü seçili</span>
        )}
        <button
          onClick={onDeselectAll}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Temizle
        </button>
      </div>

      {/* Toplu Aksiyonlar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onBulkAction('export')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          Dışa Aktar
        </button>
        <button
          onClick={() => onBulkAction('email')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
        >
          <Mail className="w-4 h-4" />
          E-posta Gönder
        </button>
        <button
          onClick={() => onBulkAction('suspend')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
        >
          <Ban className="w-4 h-4" />
          Askıya Al
        </button>
        <button
          onClick={() => onBulkAction('delete')}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Sil
        </button>
      </div>

      {/* Kapat */}
      <button
        onClick={onDeselectAll}
        className="ml-2 p-1.5 hover:bg-muted rounded-lg"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 GERİ ALMA TOAST
// ═══════════════════════════════════════════════════════════════════════════════

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  duration?: number;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  message,
  onUndo,
  duration = 10000,
}) => {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setIsVisible(false);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 right-6 bg-foreground text-background rounded-lg shadow-xl overflow-hidden z-50"
    >
      <div className="p-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" />
          <span>{message}</span>
        </div>
        <button
          onClick={onUndo}
          className="px-3 py-1 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
        >
          Geri Al
        </button>
      </div>
      <div 
        className="h-1 bg-primary transition-all duration-100"
        style={{ width: `${progress}%` }}
      />
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 KULLANICI IMPORT/EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

interface ImportExportPanelProps {
  onImport: (file: File) => void;
  onExport: (format: 'csv' | 'xlsx' | 'json') => void;
}

export const ImportExportPanel: React.FC<ImportExportPanelProps> = ({
  onImport,
  onExport,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImport(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="p-6 border rounded-xl bg-muted/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import */}
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Kullanıcı İçe Aktar
          </h3>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
            )}
          >
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
              className="hidden"
              id="file-import"
            />
            <label htmlFor="file-import" className="cursor-pointer">
              <Download className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                CSV veya Excel dosyası sürükleyin<br />
                veya <span className="text-primary">dosya seçin</span>
              </p>
            </label>
          </div>
          <a href="#" className="text-sm text-primary hover:underline mt-2 inline-block">
            Şablon dosyayı indir
          </a>
        </div>

        {/* Export */}
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Kullanıcı Dışa Aktar
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => onExport('csv')}
              className="w-full p-3 border rounded-lg text-left hover:bg-muted transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-medium">CSV</span>
                <p className="text-sm text-muted-foreground">Excel ile uyumlu</p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => onExport('xlsx')}
              className="w-full p-3 border rounded-lg text-left hover:bg-muted transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-medium">Excel (XLSX)</span>
                <p className="text-sm text-muted-foreground">Formatlanmış rapor</p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => onExport('json')}
              className="w-full p-3 border rounded-lg text-left hover:bg-muted transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-medium">JSON</span>
                <p className="text-sm text-muted-foreground">API entegrasyonu için</p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
