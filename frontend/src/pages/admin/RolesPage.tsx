/**
 * Roles Management Page
 * Rol ve izin yönetimi sayfası (Admin)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock roles data
const ROLES = [
  {
    id: 1,
    name: 'Super Admin',
    key: 'super_admin',
    description: 'Tüm sistem yetkilerine sahip en üst düzey yönetici',
    userCount: 2,
    color: 'purple',
    isSystem: true,
    permissions: ['*'],
  },
  {
    id: 2,
    name: 'Admin',
    key: 'admin',
    description: 'Kullanıcı ve içerik yönetimi yetkilerine sahip yönetici',
    userCount: 5,
    color: 'blue',
    isSystem: true,
    permissions: ['users:read', 'users:write', 'courses:read', 'courses:write', 'reports:read'],
  },
  {
    id: 3,
    name: 'Öğretmen',
    key: 'teacher',
    description: 'Kurs oluşturma ve öğrenci yönetimi yetkilerine sahip',
    userCount: 25,
    color: 'green',
    isSystem: true,
    permissions: ['courses:read', 'courses:write', 'exams:read', 'exams:write', 'students:read'],
  },
  {
    id: 4,
    name: 'Öğrenci',
    key: 'student',
    description: 'Kurs takibi ve sınav girişi yetkilerine sahip',
    userCount: 1250,
    color: 'gray',
    isSystem: true,
    permissions: ['courses:read', 'exams:take', 'profile:read', 'profile:write'],
  },
];

const PERMISSION_GROUPS = [
  {
    name: 'Kullanıcı Yönetimi',
    key: 'users',
    permissions: [
      { key: 'users:read', label: 'Kullanıcıları Görüntüle' },
      { key: 'users:write', label: 'Kullanıcı Oluştur/Düzenle' },
      { key: 'users:delete', label: 'Kullanıcı Sil' },
      { key: 'users:roles', label: 'Rol Ata' },
    ],
  },
  {
    name: 'Kurs Yönetimi',
    key: 'courses',
    permissions: [
      { key: 'courses:read', label: 'Kursları Görüntüle' },
      { key: 'courses:write', label: 'Kurs Oluştur/Düzenle' },
      { key: 'courses:delete', label: 'Kurs Sil' },
      { key: 'courses:publish', label: 'Kurs Yayınla' },
    ],
  },
  {
    name: 'Sınav Yönetimi',
    key: 'exams',
    permissions: [
      { key: 'exams:read', label: 'Sınavları Görüntüle' },
      { key: 'exams:write', label: 'Sınav Oluştur/Düzenle' },
      { key: 'exams:take', label: 'Sınava Gir' },
      { key: 'exams:grade', label: 'Sınav Değerlendir' },
    ],
  },
  {
    name: 'Raporlar',
    key: 'reports',
    permissions: [
      { key: 'reports:read', label: 'Raporları Görüntüle' },
      { key: 'reports:export', label: 'Rapor Dışa Aktar' },
    ],
  },
  {
    name: 'Sistem',
    key: 'system',
    permissions: [
      { key: 'system:settings', label: 'Sistem Ayarları' },
      { key: 'system:audit', label: 'Denetim Logları' },
      { key: 'system:backup', label: 'Yedekleme' },
    ],
  },
];

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[0] | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['users']));

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getRoleColor = (color: string) => {
    switch (color) {
      case 'purple':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'blue':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'green':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const hasPermission = (role: typeof ROLES[0], permission: string) => {
    return role.permissions.includes('*') || role.permissions.includes(permission);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rol ve İzin Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Kullanıcı rollerini ve yetkilerini yönetin
          </p>
        </div>
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
            'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
          )}
        >
          <Plus className="h-4 w-4" />
          Yeni Rol
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1 space-y-4">
          {ROLES.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => setSelectedRole(role)}
                className={cn(
                  'w-full card p-4 text-left transition-all',
                  selectedRole?.id === role.id
                    ? 'ring-2 ring-primary shadow-md'
                    : 'hover:shadow-md'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', getRoleColor(role.color))}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{role.name}</h3>
                      <p className="text-sm text-muted-foreground">{role.key}</p>
                    </div>
                  </div>
                  {role.isSystem && (
                    <span className="text-xs text-muted-foreground">Sistem</span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                  {role.description}
                </p>

                <div className="flex items-center gap-2 mt-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{role.userCount} kullanıcı</span>
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Permission Details */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', getRoleColor(selectedRole.color))}>
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedRole.name}</h2>
                    <p className="text-muted-foreground">{selectedRole.description}</p>
                  </div>
                </div>
                {!selectedRole.isSystem && (
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-muted rounded-lg">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-destructive/10 text-destructive rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Permissions */}
              <h3 className="font-semibold mb-4">İzinler</h3>
              
              {selectedRole.permissions.includes('*') ? (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    Bu rol tüm sistem izinlerine sahiptir (Super Admin)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.key} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                      >
                        <span className="font-medium">{group.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {group.permissions.filter((p) => hasPermission(selectedRole, p.key)).length}/
                            {group.permissions.length}
                          </span>
                          {expandedGroups.has(group.key) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </button>

                      {expandedGroups.has(group.key) && (
                        <div className="px-3 pb-3 space-y-2">
                          {group.permissions.map((permission) => {
                            const hasIt = hasPermission(selectedRole, permission.key);
                            return (
                              <div
                                key={permission.key}
                                className={cn(
                                  'flex items-center justify-between p-2 rounded',
                                  hasIt ? 'bg-green-50 dark:bg-green-900/20' : 'bg-muted/50'
                                )}
                              >
                                <span className="text-sm">{permission.label}</span>
                                {hasIt ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Users with this role */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Bu Role Sahip Kullanıcılar</h3>
                  <button className="text-sm text-primary hover:underline">
                    Tümünü Gör
                  </button>
                </div>
                <div className="flex -space-x-2">
                  {[...Array(Math.min(selectedRole.userCount, 5))].map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center"
                    >
                      <span className="text-xs font-medium text-primary">
                        {String.fromCharCode(65 + i)}
                      </span>
                    </div>
                  ))}
                  {selectedRole.userCount > 5 && (
                    <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        +{selectedRole.userCount - 5}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="card p-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Rol Seçin</h3>
              <p className="text-muted-foreground mt-1">
                Detayları görmek için soldaki listeden bir rol seçin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
