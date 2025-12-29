/**
 * Role Confusion Prevention - Rol Karışıklığı Önleme
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ROL KARISIKLIGI YARATAN TASARIM HATALARI VE ÇÖZÜMLERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🚫 PROBLEM #1: BELIRSIZ ROL GÖSTERIMI
 *    Kullanıcı hangi rolde olduğunu veya hangi yetkilerle çalıştığını anlamaz
 *    Çözüm: Her zaman görünür rol indicator + yetki bilgisi
 * 
 * 🚫 PROBLEM #2: ROLE SWITCHING CONFUSION
 *    Multi-rol kullanıcılar yanlış rolde işlem yapar
 *    Çözüm: Aktif rol vurgusu + rol değişikliği konfirmasyonu
 * 
 * 🚫 PROBLEM #3: PERMISSION CREEP UI
 *    Yetkisiz kullanıcıya butonlar gösterilir ama çalışmaz
 *    Çözüm: Yetkisiz elemanları tamamen gizle veya açıklama göster
 * 
 * 🚫 PROBLEM #4: ADMIN IMPERSONATION CONFUSION
 *    Admin başka kullanıcı olarak işlem yaparken kendi hesabı sanır
 *    Çözüm: Belirgin "impersonation mode" banner
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Shield,
  Crown,
  GraduationCap,
  BookOpen,
  Users,
  ChevronDown,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  LogOut,
  Info,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ROL TANIMLARI VE KONFIGÜRASYONU
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = 'student' | 'teacher' | 'admin' | 'super_admin';

interface RoleConfig {
  id: UserRole;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  permissions: string[];
}

export const roleConfigs: Record<UserRole, RoleConfig> = {
  student: {
    id: 'student',
    label: 'Öğrenci',
    icon: GraduationCap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'İçerikleri görüntüle, derslere katıl, sınavlara gir',
    permissions: ['view_content', 'take_exams', 'join_classes', 'view_progress'],
  },
  teacher: {
    id: 'teacher',
    label: 'Öğretmen',
    icon: BookOpen,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'İçerik oluştur, öğrenci yönet, değerlendirme yap',
    permissions: ['view_content', 'create_content', 'manage_students', 'grade_exams', 'host_classes'],
  },
  admin: {
    id: 'admin',
    label: 'Yönetici',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Kullanıcı yönetimi, içerik onayı, raporlama',
    permissions: ['view_content', 'manage_users', 'approve_content', 'view_reports', 'manage_roles'],
  },
  super_admin: {
    id: 'super_admin',
    label: 'Süper Admin',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Tam sistem erişimi, yapılandırma, audit',
    permissions: ['*'], // Tüm yetkiler
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ ROL INDICATOR - Her zaman görünür rol göstergesi
// ═══════════════════════════════════════════════════════════════════════════════

interface RoleIndicatorProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPermissionCount?: boolean;
  className?: string;
}

export function RoleIndicator({
  role,
  size = 'md',
  showLabel = true,
  showPermissionCount = false,
  className,
}: RoleIndicatorProps) {
  const config = roleConfigs[role];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.bgColor,
        config.borderColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
      {showPermissionCount && config.permissions[0] !== '*' && (
        <span className="ml-1 opacity-70">({config.permissions.length})</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 ROL DEĞİŞTİRME DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════════

interface RoleSwitcherProps {
  currentRole: UserRole;
  availableRoles: UserRole[];
  onRoleChange: (role: UserRole) => void;
  requireConfirmation?: boolean;
}

export function RoleSwitcher({
  currentRole,
  availableRoles,
  onRoleChange,
  requireConfirmation = true,
}: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  const currentConfig = roleConfigs[currentRole];
  const CurrentIcon = currentConfig.icon;

  const handleRoleSelect = (role: UserRole) => {
    if (role === currentRole) {
      setIsOpen(false);
      return;
    }

    if (requireConfirmation) {
      setPendingRole(role);
    } else {
      onRoleChange(role);
      setIsOpen(false);
    }
  };

  const confirmRoleChange = () => {
    if (pendingRole) {
      onRoleChange(pendingRole);
      setPendingRole(null);
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Dropdown Trigger */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
            currentConfig.bgColor,
            currentConfig.borderColor,
            'hover:shadow-md'
          )}
        >
          <CurrentIcon className={cn('w-4 h-4', currentConfig.color)} />
          <span className={cn('font-medium', currentConfig.color)}>{currentConfig.label}</span>
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              currentConfig.color,
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg border shadow-xl z-50"
            >
              <div className="p-2">
                <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rol Değiştir
                </p>
                
                {availableRoles.map((role) => {
                  const config = roleConfigs[role];
                  const Icon = config.icon;
                  const isActive = role === currentRole;

                  return (
                    <button
                      key={role}
                      onClick={() => handleRoleSelect(role)}
                      className={cn(
                        'w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left',
                        isActive ? config.bgColor : 'hover:bg-muted'
                      )}
                    >
                      <div className={cn('p-2 rounded-full', config.bgColor)}>
                        <Icon className={cn('w-4 h-4', config.color)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config.label}</span>
                          {isActive && <Check className="w-4 h-4 text-green-600" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {config.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role Change Confirmation Modal */}
      <AnimatePresence>
        {pendingRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setPendingRole(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn('p-3 rounded-full', roleConfigs[pendingRole].bgColor)}>
                    {React.createElement(roleConfigs[pendingRole].icon, {
                      className: cn('w-6 h-6', roleConfigs[pendingRole].color),
                    })}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Rol Değişikliği</h3>
                    <p className="text-muted-foreground">
                      {currentConfig.label} → {roleConfigs[pendingRole].label}
                    </p>
                  </div>
                </div>

                <div className={cn('p-4 rounded-lg mb-4', roleConfigs[pendingRole].bgColor, 'border', roleConfigs[pendingRole].borderColor)}>
                  <div className="flex items-start gap-2">
                    <Info className={cn('w-5 h-5 flex-shrink-0', roleConfigs[pendingRole].color)} />
                    <div>
                      <p className="font-medium mb-1">Bu değişiklik ile:</p>
                      <p className="text-sm">{roleConfigs[pendingRole].description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingRole(null)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={confirmRoleChange}
                    className={cn(
                      'flex-1 px-4 py-2 rounded-lg text-white font-medium',
                      'bg-primary hover:bg-primary/90 transition-colors'
                    )}
                  >
                    Rolü Değiştir
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 IMPERSONATION BANNER
// ═══════════════════════════════════════════════════════════════════════════════

interface ImpersonationBannerProps {
  isActive: boolean;
  targetUser: {
    name: string;
    email: string;
    role: UserRole;
  };
  onExit: () => void;
}

export function ImpersonationBanner({ isActive, targetUser, onExit }: ImpersonationBannerProps) {
  if (!isActive) return null;

  const targetConfig = roleConfigs[targetUser.role];
  const TargetIcon = targetConfig.icon;

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
      className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <span className="font-semibold">Kullanıcı Olarak Görüntüleme Modu</span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
              <TargetIcon className="w-4 h-4" />
              <span>{targetUser.name}</span>
              <span className="opacity-70">({targetConfig.label})</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm opacity-80">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Bu modda yapılan değişiklikler gerçek kullanıcıyı etkiler
            </p>
            <button
              onClick={onExit}
              className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              <EyeOff className="w-4 h-4" />
              Moddan Çık
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 PERMISSION GUARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PermissionGuard - Yetki kontrolü ile sarmalayıcı
 * 
 * Üç davranış modu:
 * 1. hide: Yetkisizse hiç gösterme
 * 2. disable: Yetkisizse disabled göster
 * 3. blur: Yetkisizse bulanık göster + yetki mesajı
 */

interface PermissionGuardProps {
  permission: string | string[];
  userPermissions: string[];
  mode?: 'hide' | 'disable' | 'blur';
  children: ReactNode;
  fallback?: ReactNode;
  disabledMessage?: string;
}

export function PermissionGuard({
  permission,
  userPermissions,
  mode = 'hide',
  children,
  fallback,
  disabledMessage = 'Bu işlem için yetkiniz bulunmuyor',
}: PermissionGuardProps) {
  const requiredPermissions = Array.isArray(permission) ? permission : [permission];
  
  // Super admin her şeye erişebilir
  const hasWildcard = userPermissions.includes('*');
  const hasPermission = hasWildcard || requiredPermissions.every((p) => userPermissions.includes(p));

  if (hasPermission) {
    return <>{children}</>;
  }

  switch (mode) {
    case 'hide':
      return fallback ? <>{fallback}</> : null;

    case 'disable':
      return (
        <div className="relative">
          <div className="opacity-50 pointer-events-none select-none">{children}</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 px-3 py-2 rounded-lg shadow-sm border flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{disabledMessage}</span>
            </div>
          </div>
        </div>
      );

    case 'blur':
      return (
        <div className="relative">
          <div className="blur-sm pointer-events-none select-none">{children}</div>
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <div className="bg-white px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">{disabledMessage}</p>
                <p className="text-sm text-muted-foreground">
                  Gerekli yetki: {requiredPermissions.join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📍 ACTIVE ROLE CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface ActiveRoleContextValue {
  currentRole: UserRole;
  availableRoles: UserRole[];
  permissions: string[];
  isImpersonating: boolean;
  impersonatedUser: { name: string; email: string; role: UserRole } | null;
  setRole: (role: UserRole) => void;
  startImpersonation: (user: { name: string; email: string; role: UserRole }) => void;
  stopImpersonation: () => void;
  hasPermission: (permission: string | string[]) => boolean;
}

const ActiveRoleContext = createContext<ActiveRoleContextValue | null>(null);

export function useActiveRole() {
  const context = useContext(ActiveRoleContext);
  if (!context) {
    throw new Error('useActiveRole must be used within ActiveRoleProvider');
  }
  return context;
}

interface ActiveRoleProviderProps {
  children: ReactNode;
  initialRole: UserRole;
  availableRoles: UserRole[];
}

export function ActiveRoleProvider({
  children,
  initialRole,
  availableRoles,
}: ActiveRoleProviderProps) {
  const [currentRole, setCurrentRole] = useState<UserRole>(initialRole);
  const [impersonatedUser, setImpersonatedUser] = useState<{
    name: string;
    email: string;
    role: UserRole;
  } | null>(null);

  const isImpersonating = impersonatedUser !== null;

  // Aktif rol veya impersonated rol'e göre permission'ları al
  const activeRole = isImpersonating ? impersonatedUser.role : currentRole;
  const permissions = roleConfigs[activeRole].permissions;

  const setRole = useCallback((role: UserRole) => {
    if (availableRoles.includes(role)) {
      setCurrentRole(role);
    }
  }, [availableRoles]);

  const startImpersonation = useCallback(
    (user: { name: string; email: string; role: UserRole }) => {
      setImpersonatedUser(user);
    },
    []
  );

  const stopImpersonation = useCallback(() => {
    setImpersonatedUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string | string[]) => {
      const required = Array.isArray(permission) ? permission : [permission];
      const hasWildcard = permissions.includes('*');
      return hasWildcard || required.every((p) => permissions.includes(p));
    },
    [permissions]
  );

  return (
    <ActiveRoleContext.Provider
      value={{
        currentRole,
        availableRoles,
        permissions,
        isImpersonating,
        impersonatedUser,
        setRole,
        startImpersonation,
        stopImpersonation,
        hasPermission,
      }}
    >
      {children}
      
      {/* Global Impersonation Banner */}
      <AnimatePresence>
        {isImpersonating && impersonatedUser && (
          <ImpersonationBanner
            isActive={true}
            targetUser={impersonatedUser}
            onExit={stopImpersonation}
          />
        )}
      </AnimatePresence>
    </ActiveRoleContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ROLE-BASED STYLING HELPER
// ═══════════════════════════════════════════════════════════════════════════════

export function getRoleStyles(role: UserRole) {
  return roleConfigs[role];
}

export function getRoleColor(role: UserRole) {
  return roleConfigs[role].color;
}

export function getRoleBgColor(role: UserRole) {
  return roleConfigs[role].bgColor;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ROLE HIERARCHY DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

interface RoleHierarchyProps {
  highlightedRole?: UserRole;
  compact?: boolean;
}

export function RoleHierarchy({ highlightedRole, compact = false }: RoleHierarchyProps) {
  const roles: UserRole[] = ['student', 'teacher', 'admin', 'super_admin'];

  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-2')}>
      {roles.map((role, index) => {
        const config = roleConfigs[role];
        const Icon = config.icon;
        const isHighlighted = role === highlightedRole;
        const isBeforeHighlighted = highlightedRole
          ? roles.indexOf(role) < roles.indexOf(highlightedRole)
          : false;

        return (
          <React.Fragment key={role}>
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full border transition-all',
                isHighlighted && `${config.bgColor} ${config.borderColor} ${config.color}`,
                !isHighlighted && isBeforeHighlighted && 'bg-muted border-muted-foreground/20 text-muted-foreground',
                !isHighlighted && !isBeforeHighlighted && 'bg-muted/50 border-transparent text-muted-foreground/50'
              )}
              title={config.label}
            >
              <Icon className={cn('w-4 h-4', isHighlighted && config.color)} />
              {!compact && <span className="text-xs font-medium">{config.label}</span>}
            </div>
            {index < roles.length - 1 && (
              <div className={cn('w-4 h-0.5', isBeforeHighlighted || isHighlighted ? 'bg-primary' : 'bg-muted')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
