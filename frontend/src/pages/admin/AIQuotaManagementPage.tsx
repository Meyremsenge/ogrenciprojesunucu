/**
 * AI Quota Management Page
 * 
 * Kullanıcı AI kotalarını yönetme sayfası.
 * - Kota görüntüleme ve düzenleme
 * - Kullanıcı engelleme/engel kaldırma
 * - Kota sıfırlama
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit,
  Ban,
  Unlock,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  Gauge,
  Infinity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAIUserQuotas,
  getAIUserQuotaDetail,
  updateAIUserQuota,
  toggleAIUserBlock,
  resetAIUserQuota,
} from '@/services/aiAdminService';
import type {
  AIUserQuotaDetail,
  AIPaginatedResponse,
} from '@/types/ai-admin';

// =============================================================================
// QUOTA BAR COMPONENT
// =============================================================================

interface QuotaBarProps {
  used: number;
  limit: number;
  label: string;
  isUnlimited?: boolean;
}

function QuotaBar({ used, limit, label, isUnlimited }: QuotaBarProps) {
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = percentage >= 75;
  const isDanger = percentage >= 90;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used.toLocaleString()} / {isUnlimited ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={cn(
            'h-full rounded-full',
            isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          )}
        />
      </div>
    </div>
  );
}

// =============================================================================
// USER QUOTA ROW COMPONENT
// =============================================================================

interface UserQuotaRowProps {
  user: AIUserQuotaDetail;
  onEdit: (user: AIUserQuotaDetail) => void;
  onBlock: (userId: number, blocked: boolean) => void;
  onReset: (userId: number) => void;
  expanded?: boolean;
  onToggleExpand: () => void;
}

function UserQuotaRow({ user, onEdit, onBlock, onReset, expanded, onToggleExpand }: UserQuotaRowProps) {
  const [showMenu, setShowMenu] = useState(false);

  const dailyPercentage = (user.quota.daily.tokens_used / user.quota.daily.tokens_limit) * 100;
  const isUnlimited = user.custom_quota?.is_unlimited;

  return (
    <div className={cn(
      'border rounded-lg transition-colors',
      user.is_blocked ? 'border-red-500/30 bg-red-500/5' : 'border-border'
    )}>
      {/* Main Row */}
      <div
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50"
        onClick={onToggleExpand}
      >
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{user.user_name}</p>
            {user.is_blocked && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-500">
                Engelli
              </span>
            )}
            {isUnlimited && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-500 flex items-center gap-1">
                <Infinity className="h-3 w-3" />
                Sınırsız
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{user.user_email}</p>
        </div>

        {/* Role */}
        <div className="hidden sm:block">
          <span className={cn(
            'px-2 py-1 rounded-full text-xs',
            user.role === 'super_admin' ? 'bg-purple-500/20 text-purple-500' :
            user.role === 'admin' ? 'bg-blue-500/20 text-blue-500' :
            user.role === 'teacher' ? 'bg-green-500/20 text-green-500' :
            'bg-muted text-muted-foreground'
          )}>
            {user.role === 'super_admin' ? 'Süper Admin' :
             user.role === 'admin' ? 'Admin' :
             user.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
          </span>
        </div>

        {/* Daily Usage Mini Bar */}
        <div className="hidden md:block w-32">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isUnlimited ? 'bg-purple-500 w-0' :
                dailyPercentage >= 90 ? 'bg-red-500' :
                dailyPercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: isUnlimited ? '0%' : `${Math.min(dailyPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {isUnlimited ? '∞' : `${dailyPercentage.toFixed(0)}%`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-background border rounded-lg shadow-lg py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(user);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Kota Düzenle
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBlock(user.user_id, !user.is_blocked);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  >
                    {user.is_blocked ? (
                      <>
                        <Unlock className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">Engeli Kaldır</span>
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4 text-red-500" />
                        <span className="text-red-500">Engelle</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReset(user.user_id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Kotayı Sıfırla
                  </button>
                </div>
              </>
            )}
          </div>
          
          <button onClick={onToggleExpand} className="p-2">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t space-y-4">
              {/* Quota Bars */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Günlük Kota</h4>
                  <QuotaBar
                    used={user.quota.daily.tokens_used}
                    limit={user.quota.daily.tokens_limit}
                    label="Token"
                    isUnlimited={isUnlimited}
                  />
                  <QuotaBar
                    used={user.quota.daily.requests_used}
                    limit={user.quota.daily.requests_limit}
                    label="İstek"
                    isUnlimited={isUnlimited}
                  />
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Aylık Kota</h4>
                  <QuotaBar
                    used={user.quota.monthly.tokens_used}
                    limit={user.quota.monthly.tokens_limit}
                    label="Token"
                    isUnlimited={isUnlimited}
                  />
                </div>
              </div>

              {/* Block Info */}
              {user.is_blocked && user.blocked_reason && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm font-medium text-red-500">Engelleme Nedeni</p>
                  <p className="text-sm text-muted-foreground mt-1">{user.blocked_reason}</p>
                  {user.blocked_until && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Engel bitiş: {new Date(user.blocked_until).toLocaleString('tr-TR')}
                    </p>
                  )}
                </div>
              )}

              {/* Custom Quota Info */}
              {user.custom_quota && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="text-sm font-medium text-purple-500">Özel Kota Ayarları</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    {user.custom_quota.daily_limit !== undefined && (
                      <p>Günlük: {user.custom_quota.daily_limit.toLocaleString()}</p>
                    )}
                    {user.custom_quota.monthly_limit !== undefined && (
                      <p>Aylık: {user.custom_quota.monthly_limit.toLocaleString()}</p>
                    )}
                    {user.custom_quota.is_unlimited && (
                      <p className="col-span-2 flex items-center gap-1">
                        <Infinity className="h-4 w-4" />
                        Sınırsız kota
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// EDIT QUOTA MODAL
// =============================================================================

interface EditQuotaModalProps {
  user: AIUserQuotaDetail | null;
  onClose: () => void;
  onSave: (userId: number, data: any) => void;
}

function EditQuotaModal({ user, onClose, onSave }: EditQuotaModalProps) {
  const [isUnlimited, setIsUnlimited] = useState(user?.custom_quota?.is_unlimited || false);
  const [dailyLimit, setDailyLimit] = useState(
    user?.custom_quota?.daily_limit?.toString() || user?.quota.daily.tokens_limit.toString() || ''
  );
  const [monthlyLimit, setMonthlyLimit] = useState(
    user?.custom_quota?.monthly_limit?.toString() || user?.quota.monthly.tokens_limit.toString() || ''
  );
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(user.user_id, {
      daily_limit: isUnlimited ? undefined : Number(dailyLimit),
      monthly_limit: isUnlimited ? undefined : Number(monthlyLimit),
      is_unlimited: isUnlimited,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold">Kota Düzenle</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {user.user_name} ({user.user_email})
          </p>

          <div className="mt-6 space-y-4">
            {/* Unlimited Toggle */}
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={isUnlimited}
                onChange={(e) => setIsUnlimited(e.target.checked)}
                className="w-4 h-4"
              />
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Infinity className="h-4 w-4" />
                  Sınırsız Kota
                </p>
                <p className="text-sm text-muted-foreground">
                  Bu kullanıcı için tüm limitleri kaldır
                </p>
              </div>
            </label>

            {!isUnlimited && (
              <>
                {/* Daily Limit */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Günlük Token Limiti
                  </label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    min={0}
                  />
                </div>

                {/* Monthly Limit */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Aylık Token Limiti
                  </label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    min={0}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border hover:bg-muted"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90',
                saving && 'opacity-50 cursor-not-allowed'
              )}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function AIQuotaManagementPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AIUserQuotaDetail[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<AIUserQuotaDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [blockedFilter, setBlockedFilter] = useState<string>('');

  // Fetch users
  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await getAIUserQuotas({
        page,
        per_page: 20,
        search: search || undefined,
        role: roleFilter || undefined,
        is_blocked: blockedFilter === 'true' ? true : blockedFilter === 'false' ? false : undefined,
      });
      setUsers(response.items);
      setPagination({ page: response.page, pages: response.pages, total: response.total });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, blockedFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle quota update
  const handleQuotaUpdate = async (userId: number, data: any) => {
    try {
      await updateAIUserQuota(userId, data);
      await fetchUsers(pagination.page);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle block toggle
  const handleBlockToggle = async (userId: number, blocked: boolean) => {
    try {
      const reason = blocked ? prompt('Engelleme nedeni:') : undefined;
      if (blocked && !reason) return;
      
      await toggleAIUserBlock(userId, blocked, reason || undefined);
      await fetchUsers(pagination.page);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle reset
  const handleReset = async (userId: number) => {
    if (!confirm('Bu kullanıcının kotasını sıfırlamak istediğinize emin misiniz?')) return;
    
    try {
      await resetAIUserQuota(userId);
      await fetchUsers(pagination.page);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Gauge className="h-7 w-7 text-primary" />
            AI Kota Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1">
            Kullanıcı kotalarını görüntüle ve yönet
          </p>
        </div>
        <button
          onClick={() => fetchUsers()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border bg-background"
          >
            <option value="">Tüm Roller</option>
            <option value="student">Öğrenci</option>
            <option value="teacher">Öğretmen</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Süper Admin</option>
          </select>

          {/* Blocked Filter */}
          <select
            value={blockedFilter}
            onChange={(e) => setBlockedFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border bg-background"
          >
            <option value="">Tümü</option>
            <option value="false">Aktif</option>
            <option value="true">Engelli</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Kullanıcı bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <UserQuotaRow
              key={user.user_id}
              user={user}
              expanded={expandedUserId === user.user_id}
              onToggleExpand={() => setExpandedUserId(
                expandedUserId === user.user_id ? null : user.user_id
              )}
              onEdit={setEditingUser}
              onBlock={handleBlockToggle}
              onReset={handleReset}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchUsers(pagination.page - 1)}
            disabled={pagination.page === 1}
            className={cn(
              'px-4 py-2 rounded-lg border',
              pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
            )}
          >
            Önceki
          </button>
          <span className="px-4 py-2 text-sm">
            Sayfa {pagination.page} / {pagination.pages}
          </span>
          <button
            onClick={() => fetchUsers(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className={cn(
              'px-4 py-2 rounded-lg border',
              pagination.page === pagination.pages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
            )}
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <EditQuotaModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSave={handleQuotaUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
