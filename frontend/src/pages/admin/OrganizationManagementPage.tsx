/**
 * Organization Management Page - Super Admin
<<<<<<< HEAD
 * ═══════════════════════════════════════════════════════════════════════════════
 * Kurumları (tenant) yönetme, oluşturma ve düzenleme
 */

import { useState, useMemo } from 'react';
=======
 * Sade ve kullanışlı kurum yönetim arayüzü
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
>>>>>>> eski/main
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
<<<<<<< HEAD
  Edit2,
  Trash2,
  Eye,
  Users,
  GraduationCap,
  UserCog,
  BookOpen,
  HardDrive,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  X,
  Save,
  Mail,
  Phone,
  Globe,
  MapPin,
  Palette,
  Settings,
  Crown,
  Zap,
  Shield,
  BarChart3,
  Send,
  UserPlus,
  RefreshCw,
=======
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
>>>>>>> eski/main
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
<<<<<<< HEAD

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  status: 'active' | 'suspended' | 'trial' | 'expired';
  is_active: boolean;
  subscription_plan: 'trial' | 'basic' | 'pro' | 'enterprise';
  subscription_start?: string;
  subscription_end?: string;
  features: Record<string, boolean>;
  limits: {
    max_students: number;
    max_teachers: number;
    max_admins: number;
    max_courses: number;
    max_storage_gb: number;
  };
  usage: {
    current_students: number;
    current_teachers: number;
    current_admins: number;
    current_courses: number;
    storage_used_mb: number;
  };
  created_at: string;
}

interface Invitation {
  id: number;
  email: string;
  role: string;
  expires_at: string;
  invited_by?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 1,
    name: 'ABC Eğitim Kurumu',
    slug: 'abc-egitim',
    description: 'Yazılım eğitimi alanında öncü kurum',
    email: 'info@abc-egitim.com',
    phone: '+90 212 555 1234',
    address: 'İstanbul, Türkiye',
    website: 'https://abc-egitim.com',
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    status: 'active',
    is_active: true,
    subscription_plan: 'pro',
    subscription_start: '2024-01-01',
    subscription_end: '2025-01-01',
    features: {
      live_classes: true,
      ai_assistant: true,
      exams: true,
      certificates: true,
      custom_branding: true,
      api_access: false,
      analytics: true,
      video_hosting: true,
    },
    limits: {
      max_students: 500,
      max_teachers: 50,
      max_admins: 5,
      max_courses: 200,
      max_storage_gb: 200,
    },
    usage: {
      current_students: 234,
      current_teachers: 18,
      current_admins: 2,
      current_courses: 45,
      storage_used_mb: 45000,
    },
    created_at: '2024-01-15',
  },
  {
    id: 2,
    name: 'XYZ Akademi',
    slug: 'xyz-akademi',
    description: 'Online eğitim platformu',
    email: 'contact@xyz-akademi.com',
    phone: '+90 216 444 5678',
    primary_color: '#8B5CF6',
    secondary_color: '#EC4899',
    status: 'trial',
    is_active: true,
    subscription_plan: 'trial',
    subscription_start: '2024-12-20',
    subscription_end: '2025-01-20',
    features: {
      live_classes: true,
      ai_assistant: true,
      exams: true,
      certificates: false,
      custom_branding: false,
      api_access: false,
      analytics: true,
      video_hosting: true,
    },
    limits: {
      max_students: 50,
      max_teachers: 10,
      max_admins: 2,
      max_courses: 20,
      max_storage_gb: 10,
    },
    usage: {
      current_students: 12,
      current_teachers: 3,
      current_admins: 1,
      current_courses: 5,
      storage_used_mb: 2500,
    },
    created_at: '2024-12-20',
  },
  {
    id: 3,
    name: 'Tech School',
    slug: 'tech-school',
    description: 'Teknoloji eğitimleri',
    email: 'hello@techschool.io',
    primary_color: '#F59E0B',
    secondary_color: '#EF4444',
    status: 'suspended',
    is_active: false,
    subscription_plan: 'basic',
    subscription_start: '2024-06-01',
    subscription_end: '2024-12-01',
    features: {
      live_classes: true,
      ai_assistant: false,
      exams: true,
      certificates: false,
      custom_branding: false,
      api_access: false,
      analytics: true,
      video_hosting: true,
    },
    limits: {
      max_students: 100,
      max_teachers: 20,
      max_admins: 3,
      max_courses: 50,
      max_storage_gb: 50,
    },
    usage: {
      current_students: 87,
      current_teachers: 12,
      current_admins: 2,
      current_courses: 28,
      storage_used_mb: 35000,
    },
    created_at: '2024-06-01',
  },
];

const STATUS_CONFIG = {
  active: { label: 'Aktif', color: 'bg-green-500', icon: CheckCircle2 },
  trial: { label: 'Deneme', color: 'bg-blue-500', icon: Clock },
  suspended: { label: 'Askıya Alındı', color: 'bg-red-500', icon: XCircle },
  expired: { label: 'Süresi Doldu', color: 'bg-gray-500', icon: AlertTriangle },
};

const PLAN_CONFIG = {
  trial: { label: 'Deneme', color: 'bg-gray-500', icon: Clock },
  basic: { label: 'Basic', color: 'bg-blue-500', icon: Zap },
  pro: { label: 'Pro', color: 'bg-purple-500', icon: Crown },
  enterprise: { label: 'Enterprise', color: 'bg-amber-500', icon: Shield },
};

const FEATURES_LIST = [
  { key: 'live_classes', label: 'Canlı Dersler' },
  { key: 'ai_assistant', label: 'AI Asistan' },
  { key: 'exams', label: 'Sınavlar' },
  { key: 'certificates', label: 'Sertifikalar' },
  { key: 'custom_branding', label: 'Özel Branding' },
  { key: 'api_access', label: 'API Erişimi' },
  { key: 'analytics', label: 'Analitik' },
  { key: 'video_hosting', label: 'Video Hosting' },
];
=======
import {
  getOrganizations,
  createOrganization,
  deleteOrganization,
} from '@/services/organizationService';
>>>>>>> eski/main

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function OrganizationManagementPage() {
<<<<<<< HEAD
  const [organizations, setOrganizations] = useState<Organization[]>(INITIAL_ORGANIZATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Form state
  const [newOrg, setNewOrg] = useState<Partial<Organization>>({
    subscription_plan: 'trial',
    status: 'trial',
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    features: {
      live_classes: true,
      ai_assistant: true,
      exams: true,
      certificates: false,
      custom_branding: false,
      api_access: false,
      analytics: true,
      video_hosting: true,
    },
  });

  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'student',
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Filters
  // ─────────────────────────────────────────────────────────────────────────────

  const filteredOrgs = useMemo(() => {
    return organizations.filter(org => {
      const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           org.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || org.status === filterStatus;
      const matchesPlan = filterPlan === 'all' || org.subscription_plan === filterPlan;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [organizations, searchQuery, filterStatus, filterPlan]);

  const stats = useMemo(() => ({
    total: organizations.length,
    active: organizations.filter(o => o.status === 'active').length,
    trial: organizations.filter(o => o.status === 'trial').length,
    totalStudents: organizations.reduce((sum, o) => sum + o.usage.current_students, 0),
    totalTeachers: organizations.reduce((sum, o) => sum + o.usage.current_teachers, 0),
  }), [organizations]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleCreateOrg = () => {
    setEditingOrg(null);
    setNewOrg({
      subscription_plan: 'trial',
      status: 'trial',
      primary_color: '#3B82F6',
      secondary_color: '#10B981',
      features: {
        live_classes: true,
        ai_assistant: true,
        exams: true,
        certificates: false,
        custom_branding: false,
        api_access: false,
        analytics: true,
        video_hosting: true,
      },
    });
    setShowOrgModal(true);
  };

  const handleEditOrg = (org: Organization) => {
    setEditingOrg(org);
    setNewOrg(org);
    setShowOrgModal(true);
  };

  const handleSaveOrg = () => {
    if (!newOrg.name) {
      alert('Kurum adı zorunludur');
      return;
    }

    if (editingOrg) {
      setOrganizations(prev => prev.map(o => 
        o.id === editingOrg.id ? { ...o, ...newOrg } as Organization : o
      ));
    } else {
      const slug = newOrg.name!.toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      const org: Organization = {
        ...newOrg,
        id: Date.now(),
        slug,
        is_active: true,
        limits: {
          max_students: 50,
          max_teachers: 10,
          max_admins: 2,
          max_courses: 20,
          max_storage_gb: 10,
        },
        usage: {
          current_students: 0,
          current_teachers: 0,
          current_admins: 0,
          current_courses: 0,
          storage_used_mb: 0,
        },
        created_at: new Date().toISOString().split('T')[0],
        subscription_start: new Date().toISOString().split('T')[0],
        subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      } as Organization;
      
      setOrganizations(prev => [...prev, org]);
    }

    setShowOrgModal(false);
  };

  const handleDeleteOrg = (orgId: number) => {
    if (confirm('Bu kurumu silmek istediğinize emin misiniz?')) {
      setOrganizations(prev => prev.filter(o => o.id !== orgId));
    }
  };

  const handleToggleStatus = (org: Organization) => {
    setOrganizations(prev => prev.map(o => 
      o.id === org.id ? { ...o, is_active: !o.is_active, status: o.is_active ? 'suspended' : 'active' } : o
    ));
  };

  const handleViewUsers = (org: Organization) => {
    setSelectedOrg(org);
    setShowUsersModal(true);
  };

  const handleInviteUser = (org: Organization) => {
    setSelectedOrg(org);
    setNewInvite({ email: '', role: 'student' });
    setShowInviteModal(true);
  };

  const handleSendInvite = () => {
    if (!newInvite.email) {
      alert('Email zorunludur');
      return;
    }
    // API call would go here
    alert(`Davet gönderildi: ${newInvite.email} (${newInvite.role})`);
    setShowInviteModal(false);
  };

  const getUsagePercentage = (used: number, max: number) => {
    return Math.round((used / max) * 100);
=======
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
>>>>>>> eski/main
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
<<<<<<< HEAD
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Kurum Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1">
            Kurumları oluşturun, yönetin ve kullanıcı kotalarını belirleyin
          </p>
        </div>
        <Button onClick={handleCreateOrg} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Kurum Oluştur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Toplam Kurum', value: stats.total, icon: Building2, color: 'text-blue-500' },
          { label: 'Aktif', value: stats.active, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Deneme', value: stats.trial, icon: Clock, color: 'text-amber-500' },
          { label: 'Toplam Öğrenci', value: stats.totalStudents, icon: GraduationCap, color: 'text-purple-500' },
          { label: 'Toplam Öğretmen', value: stats.totalTeachers, icon: Users, color: 'text-cyan-500' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-card border rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Kurum ara..."
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-background"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="trial">Deneme</option>
          <option value="suspended">Askıda</option>
          <option value="expired">Süresi Dolmuş</option>
        </select>
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-background"
        >
          <option value="all">Tüm Planlar</option>
          <option value="trial">Deneme</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Organizations Grid */}
      <div className="grid gap-6">
        {filteredOrgs.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-xl">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Kurum Bulunamadı</h3>
            <p className="text-muted-foreground mb-4">
              Arama kriterlerine uygun kurum yok
            </p>
            <Button onClick={handleCreateOrg}>
              <Plus className="h-4 w-4 mr-2" />
              İlk Kurumu Oluşturun
            </Button>
          </div>
        ) : (
          filteredOrgs.map((org, idx) => {
            const statusConfig = STATUS_CONFIG[org.status];
            const StatusIcon = statusConfig.icon;
            const planConfig = PLAN_CONFIG[org.subscription_plan];
            const PlanIcon = planConfig.icon;

            return (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card border rounded-xl overflow-hidden"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    {/* Logo/Avatar */}
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0"
                      style={{ backgroundColor: org.primary_color }}
                    >
                      {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        org.name.substring(0, 2).toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">{org.name}</h3>
                          <p className="text-sm text-muted-foreground">{org.slug}</p>
                          {org.description && (
                            <p className="text-sm mt-1">{org.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white',
                            statusConfig.color
                          )}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusConfig.label}
                          </span>
                          <span className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white',
                            planConfig.color
                          )}>
                            <PlanIcon className="h-3.5 w-3.5" />
                            {planConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                        {org.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {org.email}
                          </span>
                        )}
                        {org.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {org.phone}
                          </span>
                        )}
                        {org.website && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" />
                            {org.website}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                    {[
                      { label: 'Öğrenci', icon: GraduationCap, used: org.usage.current_students, max: org.limits.max_students },
                      { label: 'Öğretmen', icon: Users, used: org.usage.current_teachers, max: org.limits.max_teachers },
                      { label: 'Admin', icon: UserCog, used: org.usage.current_admins, max: org.limits.max_admins },
                      { label: 'Kurs', icon: BookOpen, used: org.usage.current_courses, max: org.limits.max_courses },
                      { label: 'Depolama', icon: HardDrive, used: Math.round(org.usage.storage_used_mb / 1024), max: org.limits.max_storage_gb, suffix: 'GB' },
                    ].map(item => {
                      const percentage = getUsagePercentage(item.used, item.max);
                      return (
                        <div key={item.label} className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </div>
                          <div className="text-lg font-bold">
                            {item.used}/{item.max} {item.suffix || ''}
                          </div>
                          <div className="w-full bg-muted h-1.5 rounded-full mt-2">
                            <div 
                              className={cn(
                                'h-full rounded-full transition-all',
                                percentage >= 90 ? 'bg-red-500' : 
                                percentage >= 70 ? 'bg-amber-500' : 'bg-green-500'
                              )}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Subscription Info */}
                  {org.subscription_end && (
                    <div className="flex items-center gap-2 mt-4 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Abonelik Bitiş:</span>
                      <span className="font-medium">
                        {new Date(org.subscription_end).toLocaleDateString('tr-TR')}
                      </span>
                      {new Date(org.subscription_end) < new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) && (
                        <span className="text-amber-500 text-xs">(Yakında bitiyor!)</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                    <Button size="sm" variant="outline" onClick={() => handleViewUsers(org)}>
                      <Users className="h-4 w-4 mr-1" />
                      Kullanıcılar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleInviteUser(org)}>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Davet Et
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditOrg(org)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Düzenle
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleToggleStatus(org)}
                      className={org.is_active ? 'text-amber-500' : 'text-green-500'}
                    >
                      {org.is_active ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Askıya Al
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aktif Et
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteOrg(org.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create/Edit Organization Modal */}
      <AnimatePresence>
        {showOrgModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowOrgModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {editingOrg ? 'Kurumu Düzenle' : 'Yeni Kurum Oluştur'}
                  </h2>
                  <button onClick={() => setShowOrgModal(false)} className="p-2 hover:bg-muted rounded-lg">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Kurum Adı *</label>
                      <Input
                        value={newOrg.name || ''}
                        onChange={e => setNewOrg(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ör: ABC Eğitim Kurumu"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Açıklama</label>
                      <textarea
                        value={newOrg.description || ''}
                        onChange={e => setNewOrg(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Kurum hakkında kısa açıklama"
                        className="w-full px-3 py-2 border rounded-lg bg-background resize-none h-20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <Input
                        type="email"
                        value={newOrg.email || ''}
                        onChange={e => setNewOrg(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="info@kurum.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Telefon</label>
                      <Input
                        value={newOrg.phone || ''}
                        onChange={e => setNewOrg(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+90 212 555 1234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Website</label>
                      <Input
                        value={newOrg.website || ''}
                        onChange={e => setNewOrg(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://kurum.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Abonelik Planı</label>
                      <select
                        value={newOrg.subscription_plan || 'trial'}
                        onChange={e => setNewOrg(prev => ({ ...prev, subscription_plan: e.target.value as Organization['subscription_plan'] }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="trial">Deneme (30 gün)</option>
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>

                  {/* Branding */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Branding Renkleri</label>
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Ana Renk</label>
                        <input
                          type="color"
                          value={newOrg.primary_color || '#3B82F6'}
                          onChange={e => setNewOrg(prev => ({ ...prev, primary_color: e.target.value }))}
                          className="w-12 h-12 rounded cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">İkincil Renk</label>
                        <input
                          type="color"
                          value={newOrg.secondary_color || '#10B981'}
                          onChange={e => setNewOrg(prev => ({ ...prev, secondary_color: e.target.value }))}
                          className="w-12 h-12 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Özellikler</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {FEATURES_LIST.map(feature => (
                        <label key={feature.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newOrg.features?.[feature.key] || false}
                            onChange={e => setNewOrg(prev => ({
                              ...prev,
                              features: { ...prev.features, [feature.key]: e.target.checked }
                            }))}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm">{feature.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button variant="outline" className="flex-1" onClick={() => setShowOrgModal(false)}>
                    İptal
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleSaveOrg}>
                    <Save className="h-4 w-4" />
                    {editingOrg ? 'Güncelle' : 'Oluştur'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite User Modal */}
      <AnimatePresence>
        {showInviteModal && selectedOrg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Kullanıcı Davet Et</h2>
                  <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-muted rounded-lg">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  <strong>{selectedOrg.name}</strong> kurumuna kullanıcı davet edin
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      type="email"
                      value={newInvite.email}
                      onChange={e => setNewInvite(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="kullanici@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Rol</label>
                    <select
                      value={newInvite.role}
                      onChange={e => setNewInvite(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value="student">Öğrenci</option>
                      <option value="teacher">Öğretmen</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button variant="outline" className="flex-1" onClick={() => setShowInviteModal(false)}>
                    İptal
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleSendInvite}>
                    <Send className="h-4 w-4" />
                    Davet Gönder
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Modal */}
      <AnimatePresence>
        {showUsersModal && selectedOrg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUsersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">{selectedOrg.name} - Kullanıcılar</h2>
                  <button onClick={() => setShowUsersModal(false)} className="p-2 hover:bg-muted rounded-lg">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <GraduationCap className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                      <p className="text-xl font-bold">{selectedOrg.usage.current_students}</p>
                      <p className="text-xs text-muted-foreground">Öğrenci</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <Users className="h-6 w-6 mx-auto text-green-500 mb-1" />
                      <p className="text-xl font-bold">{selectedOrg.usage.current_teachers}</p>
                      <p className="text-xs text-muted-foreground">Öğretmen</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-center">
                      <UserCog className="h-6 w-6 mx-auto text-purple-500 mb-1" />
                      <p className="text-xl font-bold">{selectedOrg.usage.current_admins}</p>
                      <p className="text-xs text-muted-foreground">Admin</p>
                    </div>
                  </div>

                  {/* Placeholder for actual user list */}
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Kullanıcı listesi API'den yüklenecek</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button variant="outline" className="flex-1" onClick={() => setShowUsersModal(false)}>
                    Kapat
                  </Button>
                  <Button className="flex-1 gap-2" onClick={() => { setShowUsersModal(false); handleInviteUser(selectedOrg); }}>
                    <UserPlus className="h-4 w-4" />
                    Yeni Kullanıcı Davet Et
                  </Button>
                </div>
=======
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
>>>>>>> eski/main
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
