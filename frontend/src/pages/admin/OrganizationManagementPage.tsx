/**
 * Organization Management Page - Super Admin
 * Sade ve kullanışlı kurum yönetim arayüzü
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Users,
  GraduationCap,
  BookOpen,
  UserCog,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  getOrganizations,
  createOrganization,
  deleteOrganization,
} from '@/services/organizationService';

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function OrganizationManagementPage() {
  console.log('OrganizationManagementPage rendering...');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    email: '',
    phone: '',
    max_students: 100,
    max_teachers: 20,
    max_admins: 5,
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Toast helper
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // Queries & Mutations
  // ═══════════════════════════════════════════════════════════════════════════════

  const { data: organizationsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['organizations', { search: searchQuery }],
    queryFn: async () => {
      try {
        const response = await getOrganizations({ search: searchQuery || undefined, per_page: 100 });
        console.log('API Response:', response);
        return response;
      } catch (err) {
        console.error('API Error:', err);
        throw err;
      }
    },
    retry: 1,
    refetchOnMount: true,
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newOrg) => {
      console.log('Creating organization with data:', data);
      const response = await createOrganization(data);
      console.log('Create response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Create success:', data);
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setTimeout(() => refetch(), 100); // Slight delay for DB commit
      setShowAddModal(false);
      setNewOrg({ name: '', email: '', phone: '', max_students: 100, max_teachers: 20, max_admins: 5 });
      showToast('success', 'Kurum başarıyla oluşturuldu');
    },
    onError: (error: any) => {
      console.error('Kurum oluşturma hatası:', error);
      showToast('error', error.response?.data?.error || error.response?.data?.message || 'Kurum oluşturulamadı');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      showToast('success', 'Kurum silindi');
    },
    onError: () => {
      showToast('error', 'Kurum silinemedi');
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Data Processing
  // ═══════════════════════════════════════════════════════════════════════════════

  const organizations = (() => {
    const data = organizationsData as any;
    console.log('Organizations data:', data); // Debug log
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    if (Array.isArray(data)) return data;
    return [];
  })();

  // ═══════════════════════════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleCreateOrg = () => {
    if (!newOrg.name.trim()) {
      showToast('error', 'Kurum adı zorunludur');
      return;
    }
    console.log('Creating org:', newOrg); // Debug log
    createMutation.mutate(newOrg);
  };

  const handleDeleteOrg = (id: number, name: string) => {
    if (confirm(`"${name}" kurumunu silmek istediğinize emin misiniz?`)) {
      deleteMutation.mutate(id);
    }
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Kurumlar
          </h1>
          <p className="text-muted-foreground mt-1">
            Kurumları yönetin ve kullanıcı atayın
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Kurum
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Kurum ara..."
          className="pl-10 max-w-md"
        />
      </div>

      {/* Organizations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 bg-card border rounded-xl">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Veri yüklenemedi</h3>
          <p className="text-muted-foreground mb-2">
            {typeof (error as any)?.response?.data?.error === 'string' 
              ? (error as any).response.data.error 
              : (error as any)?.response?.data?.error?.message 
                || (error as any)?.message 
                || 'Bir hata oluştu'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            API ile iletişim kurulamadı. Lütfen oturum açtığınızdan emin olun.
          </p>
          <Button onClick={() => refetch()}>
            Tekrar Dene
          </Button>
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-xl">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Henüz Kurum Yok</h3>
          <p className="text-muted-foreground mb-4">
            İlk kurumu oluşturarak başlayın
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Kurum Oluştur
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {organizations.map((org: any) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-xl p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Logo/Icon */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                    style={{ backgroundColor: org.primary_color || '#3B82F6' }}
                  >
                    {org.name?.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{org.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        {org.usage?.current_students || org.current_students || 0} Öğrenci
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {org.usage?.current_teachers || org.current_teachers || 0} Öğretmen
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCog className="h-4 w-4" />
                        {org.usage?.current_admins || org.current_admins || 0} Admin
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="hidden sm:block">
                    {org.is_active !== false ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        Pasif
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/super-admin/organizations/${org.id}`)}
                    className="gap-1"
                  >
                    <Users className="h-4 w-4" />
                    Yönet
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <button
                    onClick={() => handleDeleteOrg(org.id, org.name)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Organization Modal */}
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
                <h2 className="text-lg font-semibold">Yeni Kurum Oluştur</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <Input
                  label="Kurum Adı *"
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  placeholder="Örn: ABC Eğitim Kurumu"
                />
                <Input
                  label="E-posta"
                  type="email"
                  value={newOrg.email}
                  onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
                  placeholder="info@kurum.com"
                />
                <Input
                  label="Telefon"
                  value={newOrg.phone}
                  onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
                  placeholder="+90 XXX XXX XX XX"
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Max Öğrenci"
                    type="number"
                    value={newOrg.max_students}
                    onChange={(e) => setNewOrg({ ...newOrg, max_students: parseInt(e.target.value) || 0 })}
                  />
                  <Input
                    label="Max Öğretmen"
                    type="number"
                    value={newOrg.max_teachers}
                    onChange={(e) => setNewOrg({ ...newOrg, max_teachers: parseInt(e.target.value) || 0 })}
                  />
                  <Input
                    label="Max Admin"
                    type="number"
                    value={newOrg.max_admins}
                    onChange={(e) => setNewOrg({ ...newOrg, max_admins: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t">
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                  İptal
                </Button>
                <Button onClick={handleCreateOrg} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Oluştur
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
