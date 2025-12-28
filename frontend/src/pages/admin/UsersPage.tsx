/**
 * Users Management Page - API Entegrasyonlu
 * Kullanıcı yönetimi sayfası (Admin)
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Lock,
  Mail,
  UserCheck,
  UserX,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  X,
  Save,
  Check,
  RefreshCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/auth';
import { 
  getUsers, 
  createUser,
  updateUser,
  activateUser, 
  deactivateUser, 
  resetUserPassword,
  deleteUser,
  bulkUserAction,
} from '@/services/adminService';

interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at?: string;
}

const ROLES = [
  { key: 'all', label: 'Tüm Roller' },
  { key: 'student', label: 'Öğrenci' },
  { key: 'teacher', label: 'Öğretmen' },
  { key: 'admin', label: 'Admin' },
];

const STATUSES = [
  { key: 'all', label: 'Tüm Durumlar' },
  { key: 'active', label: 'Aktif' },
  { key: 'inactive', label: 'Pasif' },
  { key: 'pending', label: 'Beklemede' },
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  
  // Toast notification state
  const [toast, setToast] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Yeni kullanıcı ekleme state'leri
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  
  const [newUser, setNewUser] = useState<{
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    role: UserRole;
  }>({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'student' as UserRole,
  });

  // Toast göster
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Kullanıcıları çek
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['adminUsers', { page, role: selectedRole, status: selectedStatus, search: searchQuery }],
    queryFn: () => getUsers({
      page,
      per_page: 20,
      role: selectedRole !== 'all' ? selectedRole : undefined,
      is_active: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
      search: searchQuery || undefined,
    }),
  });

  // Mutations
  const activateMutation = useMutation({
    mutationFn: (userId: number) => activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showToast('success', 'Kullanıcı aktifleştirildi');
    },
    onError: () => {
      showToast('error', 'Kullanıcı aktifleştirilirken hata oluştu');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: number) => deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showToast('success', 'Kullanıcı deaktifleştirildi');
    },
    onError: () => {
      showToast('error', 'Kullanıcı deaktifleştirilirken hata oluştu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showToast('success', 'Kullanıcı silindi');
    },
    onError: () => {
      showToast('error', 'Kullanıcı silinirken hata oluştu');
    },
  });

  // Kullanıcı oluşturma mutation
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setShowAddModal(false);
      setNewUser({ email: '', first_name: '', last_name: '', password: '', role: 'student' as UserRole });
      showToast('success', 'Kullanıcı başarıyla oluşturuldu');
    },
    onError: (error: any) => {
      // Axios hata yapısını parse et
      const errorData = error?.response?.data;
      let message = 'Kullanıcı oluşturulurken hata oluştu';
      
      if (errorData?.error?.details?.errors) {
        // Validation hatalarını formatla
        const validationErrors = errorData.error.details.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(([field, msgs]: [string, any]) => {
            const fieldNames: Record<string, string> = {
              password: 'Şifre',
              email: 'E-posta',
              first_name: 'Ad',
              last_name: 'Soyad',
            };
            return `${fieldNames[field] || field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`;
          })
          .join('. ');
        message = errorMessages || message;
      } else if (errorData?.error?.message) {
        message = errorData.error.message;
      } else if (errorData?.message) {
        message = errorData.message;
      }
      
      showToast('error', message);
    },
  });

  // Kullanıcı güncelleme mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: any }) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setShowEditModal(false);
      setEditingUser(null);
      showToast('success', 'Kullanıcı başarıyla güncellendi');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Kullanıcı güncellenirken hata oluştu';
      showToast('error', message);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: number) => resetUserPassword(userId),
    onSuccess: (data) => {
      setTempPassword(data.temporary_password);
      setShowPasswordModal(true);
    },
    onError: () => {
      showToast('error', 'Şifre sıfırlanırken hata oluştu');
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (data: { action: 'activate' | 'deactivate' | 'delete' | 'change_role'; user_ids: number[] }) => bulkUserAction(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setSelectedUsers([]);
      const actionMessages = {
        activate: 'Kullanıcılar aktifleştirildi',
        deactivate: 'Kullanıcılar deaktifleştirildi',
        delete: 'Kullanıcılar silindi',
        change_role: 'Kullanıcı rolleri değiştirildi'
      };
      showToast('success', actionMessages[variables.action]);
    },
    onError: () => {
      showToast('error', 'Toplu işlem sırasında hata oluştu');
    },
  });

  // Kullanıcıları işle
  const users = useMemo(() => {
    // Backend yanıtı: { data: [...users], pagination: {...} }
    const response = usersData as any;
    // data doğrudan liste olarak geliyor
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    // Alternatif yapılar için fallback
    return response?.data?.users || response?.users || [];
  }, [usersData]);

  const pagination = usersData as any;
  const totalUsers = pagination?.pagination?.total || pagination?.total || users.length;
  const totalPages = pagination?.pagination?.pages || pagination?.pages || 1;

  // Filtreleme (client-side ek filtreleme - gerekirse)
  const filteredUsers = users;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return <span className="badge bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Admin</span>;
      case 'teacher':
        return <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Öğretmen</span>;
      case 'student':
        return <span className="badge bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Öğrenci</span>;
      default:
        return <span className="badge">{role}</span>;
    }
  };

  const getStatusBadge = (user: AdminUser) => {
    if (!user.is_verified) {
      return <span className="flex items-center gap-1 text-yellow-600"><Mail className="h-4 w-4" /> Beklemede</span>;
    }
    if (user.is_active) {
      return <span className="flex items-center gap-1 text-green-600"><UserCheck className="h-4 w-4" /> Aktif</span>;
    }
    return <span className="flex items-center gap-1 text-gray-500"><UserX className="h-4 w-4" /> Pasif</span>;
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u: AdminUser) => u.id));
    }
  };

  const handleActivate = async (userId: number) => {
    await activateMutation.mutateAsync(userId);
  };

  const handleDeactivate = async (userId: number) => {
    await deactivateMutation.mutateAsync(userId);
  };

  const handleDelete = async (userId: number) => {
    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      await deleteMutation.mutateAsync(userId);
    }
  };

  const handleResetPassword = async (userId: number) => {
    await resetPasswordMutation.mutateAsync(userId);
  };

  const handleBulkDeactivate = async () => {
    if (confirm(`${selectedUsers.length} kullanıcıyı deaktive etmek istediğinize emin misiniz?`)) {
      await bulkMutation.mutateAsync({ action: 'deactivate' as const, user_ids: selectedUsers });
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`${selectedUsers.length} kullanıcıyı silmek istediğinize emin misiniz?`)) {
      await bulkMutation.mutateAsync({ action: 'delete' as const, user_ids: selectedUsers });
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.first_name || !newUser.last_name || !newUser.password) {
      showToast('error', 'Tüm zorunlu alanları doldurun');
      return;
    }
    if (newUser.password.length < 8) {
      showToast('error', 'Şifre en az 8 karakter olmalıdır');
      return;
    }
    if (!newUser.email.includes('@')) {
      showToast('error', 'Geçerli bir e-posta adresi girin');
      return;
    }
    await createUserMutation.mutateAsync(newUser);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setShowEditModal(true);
    setActiveDropdown(null);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    await updateUserMutation.mutateAsync({
      userId: editingUser.id,
      data: {
        email: editingUser.email,
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        role: editingUser.role,
        is_active: editingUser.is_active,
      }
    });
  };

  // Dropdown dışı tıklamada kapat
  const handleClickOutside = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Kullanıcılar yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Kullanıcılar yüklenirken hata oluştu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Sisteme kayıtlı tüm kullanıcıları yönetin
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
            'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
          )}
        >
          <Plus className="h-4 w-4" />
          Yeni Kullanıcı
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İsim veya e-posta ara..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {ROLES.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {STATUSES.map((status) => (
            <option key={status.key} value={status.key}>
              {status.label}
            </option>
          ))}
        </select>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
              'border hover:bg-muted transition-colors'
            )}
          >
            <Download className="h-4 w-4" />
            Dışa Aktar
          </button>
          <button
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
              'border hover:bg-muted transition-colors'
            )}
          >
            <Upload className="h-4 w-4" />
            İçe Aktar
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-3 bg-primary/10 rounded-lg"
        >
          <span className="text-sm font-medium">
            {selectedUsers.length} kullanıcı seçildi
          </span>
          <div className="flex items-center gap-2">
            <button 
              className="px-3 py-1 text-sm rounded hover:bg-primary/20"
              onClick={handleBulkDeactivate}
              disabled={bulkMutation.isPending}
            >
              Deaktive Et
            </button>
            <button className="px-3 py-1 text-sm rounded hover:bg-primary/20">
              E-posta Gönder
            </button>
            <button 
              className="px-3 py-1 text-sm text-destructive rounded hover:bg-destructive/10"
              onClick={handleBulkDelete}
              disabled={bulkMutation.isPending}
            >
              Sil
            </button>
          </div>
        </motion.div>
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="table-cell w-10">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleAllSelection}
                    className="rounded"
                  />
                </th>
                <th className="table-cell text-left">Kullanıcı</th>
                <th className="table-cell text-left">Rol</th>
                <th className="table-cell text-left">Durum</th>
                <th className="table-cell text-left">Kayıt Tarihi</th>
                <th className="table-cell text-left">Son Giriş</th>
                <th className="table-cell w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: AdminUser, index: number) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="table-row"
                >
                  <td className="table-cell">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.first_name?.[0] || ''}{user.last_name?.[0] || ''}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{getRoleBadge(user.role)}</td>
                  <td className="table-cell text-sm">{getStatusBadge(user)}</td>
                  <td className="table-cell text-sm text-muted-foreground">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="table-cell text-sm text-muted-foreground">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString('tr-TR')
                      : '-'}
                  </td>
                  <td className="table-cell">
                    <div className="relative">
                      <button 
                        className="p-1 hover:bg-muted rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === user.id ? null : user.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {activeDropdown === user.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 w-44 bg-background border rounded-lg shadow-lg z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button 
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" /> Düzenle
                          </button>
                          <button 
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => {
                              handleResetPassword(user.id);
                              setActiveDropdown(null);
                            }}
                            disabled={resetPasswordMutation.isPending}
                          >
                            <Lock className="h-4 w-4" /> Şifre Sıfırla
                          </button>
                          {user.is_active ? (
                            <button 
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted"
                              onClick={() => {
                                handleDeactivate(user.id);
                                setActiveDropdown(null);
                              }}
                              disabled={deactivateMutation.isPending}
                            >
                              <UserX className="h-4 w-4" /> Deaktive Et
                            </button>
                          ) : (
                            <button 
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted"
                              onClick={() => {
                                handleActivate(user.id);
                                setActiveDropdown(null);
                              }}
                              disabled={activateMutation.isPending}
                            >
                              <UserCheck className="h-4 w-4" /> Aktive Et
                            </button>
                          )}
                          <hr className="my-1" />
                          <button 
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              handleDelete(user.id);
                              setActiveDropdown(null);
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" /> Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t">
          <p className="text-sm text-muted-foreground">
            Toplam {totalUsers} kullanıcıdan {filteredUsers.length} tanesi gösteriliyor
          </p>
          <div className="flex items-center gap-2">
            <button 
              className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50" 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Önceki
            </button>
            <span className="px-3 py-1 text-sm">
              Sayfa {page} / {totalPages}
            </span>
            <button 
              className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50" 
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-background rounded-xl shadow-xl w-full max-w-md border"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Yeni Kullanıcı Ekle</h2>
                  <button 
                    onClick={() => setShowAddModal(false)} 
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ad *</label>
                    <input
                      type="text"
                      value={newUser.first_name}
                      onChange={e => setNewUser(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Ad"
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Soyad *</label>
                    <input
                      type="text"
                      value={newUser.last_name}
                      onChange={e => setNewUser(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Soyad"
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="kullanici@email.com"
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Şifre *</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="En az 8 karakter"
                      minLength={8}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50",
                        newUser.password && newUser.password.length < 8 && "border-destructive"
                      )}
                    />
                    {newUser.password && newUser.password.length < 8 && (
                      <p className="text-xs text-destructive mt-1">Şifre en az 8 karakter olmalıdır</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Rol</label>
                    <select
                      value={newUser.role}
                      onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="student">Öğrenci</option>
                      <option value="teacher">Öğretmen</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleAddUser}
                    disabled={createUserMutation.isPending}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium',
                      'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {createUserMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Kaydet
                      </>
                    )}
                  </button>
                </div>

                {createUserMutation.isError && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Kullanıcı oluşturulurken hata oluştu. Lütfen tekrar deneyin.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-background rounded-xl shadow-xl w-full max-w-md border"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Kullanıcı Düzenle</h2>
                  <button 
                    onClick={() => setShowEditModal(false)} 
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ad</label>
                    <input
                      type="text"
                      value={editingUser.first_name}
                      onChange={e => setEditingUser(prev => prev ? ({ ...prev, first_name: e.target.value }) : null)}
                      placeholder="Ad"
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Soyad</label>
                    <input
                      type="text"
                      value={editingUser.last_name}
                      onChange={e => setEditingUser(prev => prev ? ({ ...prev, last_name: e.target.value }) : null)}
                      placeholder="Soyad"
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={e => setEditingUser(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                      placeholder="kullanici@email.com"
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Rol</label>
                    <select
                      value={editingUser.role}
                      onChange={e => setEditingUser(prev => prev ? ({ ...prev, role: e.target.value as UserRole }) : null)}
                      className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="student">Öğrenci</option>
                      <option value="teacher">Öğretmen</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="edit-is-active"
                      checked={editingUser.is_active}
                      onChange={e => setEditingUser(prev => prev ? ({ ...prev, is_active: e.target.checked }) : null)}
                      className="rounded"
                    />
                    <label htmlFor="edit-is-active" className="text-sm font-medium">Aktif</label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleUpdateUser}
                    disabled={updateUserMutation.isPending}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium',
                      'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {updateUserMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Güncelleniyor...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Güncelle
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Reset Success Modal */}
      <AnimatePresence>
        {showPasswordModal && tempPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowPasswordModal(false);
              setTempPassword(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-background rounded-xl shadow-xl w-full max-w-sm border"
            >
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-center mb-2">Şifre Sıfırlandı</h2>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Kullanıcının yeni geçici şifresi:
                </p>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={tempPassword}
                    readOnly
                    className="w-full px-3 py-3 border rounded-lg bg-muted text-center font-mono text-lg"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2 mb-4">
                  Kullanıcı ilk girişte şifresini değiştirmek zorunda olacak.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      showToast('success', 'Şifre panoya kopyalandı');
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
                  >
                    Kopyala
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setTempPassword(null);
                    }}
                    className={cn(
                      'flex-1 px-4 py-2 rounded-lg font-medium',
                      'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                    )}
                  >
                    Tamam
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              'fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2',
              toast.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' 
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            )}
          >
            {toast.type === 'success' ? (
              <Check className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside handler for dropdowns */}
      {activeDropdown !== null && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={handleClickOutside}
        />
      )}
    </div>
  );
}
