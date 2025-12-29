/**
 * Organization Detail Page - Super Admin
 * Kurum kullanıcı yönetimi - Sade ve kullanışlı tasarım
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  ArrowLeft,
  Users,
  GraduationCap,
  BookOpen,
  UserCog,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Save,
  Loader2,
  Mail,
  Phone,
  Key,
  UserCheck,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  getOrganization,
  getOrganizationUsers,
  createUserInOrganization,
  updateOrganizationUser,
  deleteOrganizationUser,
} from '@/services/organizationService';

// ═══════════════════════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════════════════════

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone?: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Users }> = {
  student: { label: 'Öğrenci', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: GraduationCap },
  teacher: { label: 'Öğretmen', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: BookOpen },
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: UserCog },
};

const TABS = [
  { key: 'all', label: 'Tümü', icon: Users },
  { key: 'student', label: 'Öğrenciler', icon: GraduationCap },
  { key: 'teacher', label: 'Öğretmenler', icon: BookOpen },
  { key: 'admin', label: 'Adminler', icon: UserCog },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const orgId = parseInt(id || '0');

  // State
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'student',
  });

  // Toast helper
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // Queries & Mutations
  // ═══════════════════════════════════════════════════════════════════════════════

  const { data: orgData, isLoading: orgLoading, isError: orgError } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      console.log('Fetching organization:', orgId);
      const response = await getOrganization(orgId);
      console.log('Organization response:', response);
      return response;
    },
    enabled: !!orgId,
    retry: 1,
  });

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['organizationUsers', orgId, { role: activeTab, search: searchQuery }],
    queryFn: async () => {
      console.log('Fetching users for org:', orgId);
      const response = await getOrganizationUsers(orgId, {
        role: activeTab !== 'all' ? activeTab : undefined,
        search: searchQuery || undefined,
        per_page: 100,
      });
      console.log('Users response:', response);
      return response;
    },
    enabled: !!orgId,
    retry: 1,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      console.log('Creating user:', data);
      const response = await createUserInOrganization(orgId, {
        ...data,
        is_active: true,
        is_verified: true,
      });
      console.log('Create user response:', response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationUsers', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      setTimeout(() => refetchUsers(), 100);
      setShowAddModal(false);
      setNewUser({ email: '', password: '', first_name: '', last_name: '', phone: '', role: 'student' });
      showToast('success', 'Kullanıcı başarıyla eklendi');
    },
    onError: (error: any) => {
      console.error('Create user error:', error);
      showToast('error', error.response?.data?.error || error.response?.data?.message || 'Kullanıcı eklenemedi');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: any }) =>
      updateOrganizationUser(orgId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationUsers', orgId] });
      setShowEditModal(false);
      setEditingUser(null);
      showToast('success', 'Kullanıcı güncellendi');
    },
    onError: () => {
      showToast('error', 'Kullanıcı güncellenemedi');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => deleteOrganizationUser(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationUsers', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      showToast('success', 'Kullanıcı silindi');
    },
    onError: () => {
      showToast('error', 'Kullanıcı silinemedi');
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Data Processing
  // ═══════════════════════════════════════════════════════════════════════════════

  const org = useMemo(() => {
    const data = orgData as any;
    console.log('Processing org data:', data);
    // API Response format: { success: true, data: {...organization} }
    if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      return data.data;
    }
    // Direct object
    if (data && data.id) {
      return data;
    }
    return null;
  }, [orgData]);
  
  const users = useMemo(() => {
    const data = usersData as any;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    if (Array.isArray(data)) return data;
    return [];
  }, [usersData]);

  // Count by role
  const counts = useMemo(() => {
    return {
      all: users.length,
      student: users.filter((u: User) => u.role === 'student').length,
      teacher: users.filter((u: User) => u.role === 'teacher').length,
      admin: users.filter((u: User) => u.role === 'admin').length,
    };
  }, [users]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleAddUser = () => {
    if (!newUser.email || !newUser.first_name || !newUser.last_name || !newUser.password) {
      showToast('error', 'Tüm zorunlu alanları doldurun');
      return;
    }
    if (newUser.password.length < 6) {
      showToast('error', 'Şifre en az 6 karakter olmalıdır');
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      userId: editingUser.id,
      data: {
        email: editingUser.email,
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        phone: editingUser.phone,
        role: editingUser.role,
        is_active: editingUser.is_active,
      },
    });
  };

  const handleDeleteUser = (user: User) => {
    const name = user.full_name || `${user.first_name} ${user.last_name}`;
    if (confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const openAddModalWithRole = (role: string) => {
    setNewUser({ ...newUser, role });
    setShowAddModal(true);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // Loading & Error States
  // ═══════════════════════════════════════════════════════════════════════════════

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Kurum Bulunamadı</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Bu kurum mevcut değil veya erişim yetkiniz yok.
        </p>
        <Button onClick={() => navigate('/super-admin/organizations')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri Dön
        </Button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2',
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/organizations')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: org.primary_color || '#3B82F6' }}
          >
            {org.name?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="text-sm text-muted-foreground">Kullanıcı Yönetimi</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.key as keyof typeof counts] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'p-4 rounded-xl border text-left transition-all',
                activeTab === tab.key
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'bg-card hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  activeTab === tab.key ? 'bg-primary text-white' : 'bg-muted'
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{tab.label}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kullanıcı ara (ad, e-posta)..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openAddModalWithRole('student')} variant="outline" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Öğrenci Ekle
          </Button>
          <Button onClick={() => openAddModalWithRole('teacher')} variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Öğretmen Ekle
          </Button>
          <Button onClick={() => openAddModalWithRole('admin')} variant="outline" className="gap-2">
            <UserCog className="h-4 w-4" />
            Admin Ekle
          </Button>
        </div>
      </div>

      {/* Users List */}
      {usersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-xl">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Henüz Kullanıcı Yok</h3>
          <p className="text-muted-foreground mb-4">
            Bu kuruma kullanıcı ekleyerek başlayın
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => openAddModalWithRole('student')}>
              <Plus className="h-4 w-4 mr-2" />
              Öğrenci Ekle
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-medium">Kullanıcı</th>
                <th className="text-left p-4 font-medium">Rol</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">İletişim</th>
                <th className="text-left p-4 font-medium hidden sm:table-cell">Durum</th>
                <th className="text-right p-4 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user: User) => {
                const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.student;
                const RoleIcon = roleConfig.icon;
                const fullName = user.full_name || `${user.first_name} ${user.last_name}`;
                return (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{fullName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', roleConfig.color)}>
                        <RoleIcon className="h-3.5 w-3.5" />
                        {roleConfig.label}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="text-sm text-muted-foreground">
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {user.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <UserCheck className="h-4 w-4" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-500 text-sm">
                          <UserX className="h-4 w-4" />
                          Pasif
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 hover:bg-muted rounded-lg"
                          title="Düzenle"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {ROLE_CONFIG[newUser.role]?.label || 'Kullanıcı'} Ekle
                </h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Ad *"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    placeholder="Ad"
                  />
                  <Input
                    label="Soyad *"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    placeholder="Soyad"
                  />
                </div>
                <Input
                  label="E-posta *"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="ornek@email.com"
                />
                <Input
                  label="Şifre *"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="En az 6 karakter"
                />
                <Input
                  label="Telefon"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="+90 5XX XXX XX XX"
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Rol *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setNewUser({ ...newUser, role: key })}
                          className={cn(
                            'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                            newUser.role === key
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'hover:border-primary/50'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t">
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                  İptal
                </Button>
                <Button onClick={handleAddUser} disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Ekle
                </Button>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Edit2 className="h-5 w-5" />
                  Kullanıcı Düzenle
                </h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Ad"
                    value={editingUser.first_name}
                    onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                  />
                  <Input
                    label="Soyad"
                    value={editingUser.last_name}
                    onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                  />
                </div>
                <Input
                  label="E-posta"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
                <Input
                  label="Telefon"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Rol</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setEditingUser({ ...editingUser, role: key })}
                          className={cn(
                            'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                            editingUser.role === key
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'hover:border-primary/50'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editingUser.is_active}
                    onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="is_active" className="text-sm">Aktif Kullanıcı</label>
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t">
                <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                  İptal
                </Button>
                <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Kaydet
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
