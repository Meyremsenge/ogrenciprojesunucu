import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  Eye,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Clock,
} from 'lucide-react';
import type { Announcement, CreateAnnouncementData, AnnouncementType } from '../../types/admin';
import type { UserRole } from '../../types/auth';

interface AnnouncementCardProps {
  announcement: Announcement;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const getTypeIcon = (type: AnnouncementType) => {
  const icons: Record<AnnouncementType, React.ReactNode> = {
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
  };
  return icons[type];
};

const getTypeBgColor = (type: AnnouncementType) => {
  const colors: Record<AnnouncementType, string> = {
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
  };
  return colors[type];
};

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  onEdit,
  onDelete,
}) => {
  const isActive = announcement.is_active &&
    (!announcement.starts_at || new Date(announcement.starts_at) <= new Date()) &&
    (!announcement.expires_at || new Date(announcement.expires_at) > new Date());

  const isScheduled = announcement.is_active &&
    announcement.starts_at &&
    new Date(announcement.starts_at) > new Date();

  const isExpired = announcement.expires_at &&
    new Date(announcement.expires_at) <= new Date();

  return (
    <div className={`rounded-lg border p-4 ${getTypeBgColor(announcement.announcement_type)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getTypeIcon(announcement.announcement_type)}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900">{announcement.title}</h3>
              {isScheduled && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Zamanlanmış
                </span>
              )}
              {isExpired && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  Süresi Doldu
                </span>
              )}
              {!announcement.is_active && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  Pasif
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
            
            <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
              {announcement.target_roles && announcement.target_roles.length > 0 && (
                <div className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {announcement.target_roles.join(', ')}
                </div>
              )}
              {announcement.starts_at && (
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Başlangıç: {new Date(announcement.starts_at).toLocaleDateString('tr-TR')}
                </div>
              )}
              {announcement.expires_at && (
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Bitiş: {new Date(announcement.expires_at).toLocaleDateString('tr-TR')}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(announcement.id)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(announcement.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-white/50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAnnouncementData) => void;
  editData?: Announcement | null;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editData,
}) => {
  const [formData, setFormData] = useState<CreateAnnouncementData>({
    title: editData?.title || '',
    content: editData?.content || '',
    announcement_type: editData?.announcement_type || 'info',
    target_roles: editData?.target_roles || [],
    starts_at: editData?.starts_at || undefined,
    expires_at: editData?.expires_at || undefined,
    is_active: editData?.is_active ?? true,
  });

  const roles: UserRole[] = ['student', 'teacher', 'admin', 'super_admin'];

  if (!isOpen) return null;

  const handleRoleToggle = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles?.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...(prev.target_roles || []), role],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      student: 'Öğrenci',
      teacher: 'Öğretmen',
      admin: 'Admin',
      super_admin: 'Süper Admin',
    };
    return labels[role];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {editData ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Oluştur'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlık *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İçerik *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duyuru Tipi
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['info', 'warning', 'success', 'error'] as AnnouncementType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, announcement_type: type })}
                  className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                    formData.announcement_type === type
                      ? getTypeBgColor(type) + ' border-current'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {getTypeIcon(type)}
                  <span className="text-xs mt-1 capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hedef Roller
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Boş bırakılırsa tüm kullanıcılara gösterilir
            </p>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleToggle(role)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    formData.target_roles?.includes(role)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getRoleLabel(role)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Başlangıç Tarihi
              </label>
              <input
                type="datetime-local"
                value={formData.starts_at ? formData.starts_at.slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at ? formData.expires_at.slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Aktif</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editData ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Duyuruyu Sil</h3>
        <p className="text-gray-600 mb-6">
          "<strong>{title}</strong>" duyurusunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
};

interface AnnouncementManagerProps {
  announcements: Announcement[];
  loading?: boolean;
  onCreate: (data: CreateAnnouncementData) => void;
  onUpdate: (id: number, data: CreateAnnouncementData) => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({
  announcements,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<Announcement | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Announcement | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'expired'>('all');

  const now = new Date();

  const filteredAnnouncements = announcements.filter(announcement => {
    if (filter === 'all') return true;
    
    const startsAt = announcement.starts_at ? new Date(announcement.starts_at) : null;
    const expiresAt = announcement.expires_at ? new Date(announcement.expires_at) : null;
    
    if (filter === 'active') {
      return announcement.is_active &&
        (!startsAt || startsAt <= now) &&
        (!expiresAt || expiresAt > now);
    }
    
    if (filter === 'scheduled') {
      return announcement.is_active && startsAt && startsAt > now;
    }
    
    if (filter === 'expired') {
      return expiresAt && expiresAt <= now;
    }
    
    return true;
  });

  const handleEdit = (id: number) => {
    const announcement = announcements.find(a => a.id === id);
    if (announcement) {
      setEditAnnouncement(announcement);
      setModalOpen(true);
    }
  };

  const handleDeleteClick = (id: number) => {
    const announcement = announcements.find(a => a.id === id);
    if (announcement) {
      setDeleteConfirm(announcement);
    }
  };

  const handleSubmit = (data: CreateAnnouncementData) => {
    if (editAnnouncement) {
      onUpdate(editAnnouncement.id, data);
    } else {
      onCreate(data);
    }
    setModalOpen(false);
    setEditAnnouncement(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  // Stats
  const activeCount = announcements.filter(a => {
    const startsAt = a.starts_at ? new Date(a.starts_at) : null;
    const expiresAt = a.expires_at ? new Date(a.expires_at) : null;
    return a.is_active && (!startsAt || startsAt <= now) && (!expiresAt || expiresAt > now);
  }).length;

  const scheduledCount = announcements.filter(a => {
    const startsAt = a.starts_at ? new Date(a.starts_at) : null;
    return a.is_active && startsAt && startsAt > now;
  }).length;

  const expiredCount = announcements.filter(a => {
    const expiresAt = a.expires_at ? new Date(a.expires_at) : null;
    return expiresAt && expiresAt <= now;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Duyuru Yönetimi</h1>
          <p className="text-gray-500">{announcements.length} duyuru</p>
        </div>
        <button
          onClick={() => {
            setEditAnnouncement(null);
            setModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Duyuru
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'all' ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold text-gray-900">{announcements.length}</p>
          <p className="text-sm text-gray-500">Toplam</p>
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'active' ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="text-sm text-gray-500">Aktif</p>
        </button>
        <button
          onClick={() => setFilter('scheduled')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'scheduled' ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
          <p className="text-sm text-gray-500">Zamanlanmış</p>
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`p-4 rounded-lg border transition-colors ${
            filter === 'expired' ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold text-gray-600">{expiredCount}</p>
          <p className="text-sm text-gray-500">Süresi Dolmuş</p>
        </button>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Yükleniyor...</span>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Duyuru Bulunamadı</h3>
          <p className="text-gray-500">
            {filter !== 'all' ? 'Bu filtreye uygun duyuru yok.' : 'Yeni bir duyuru oluşturarak başlayın.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnnouncementModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditAnnouncement(null);
        }}
        onSubmit={handleSubmit}
        editData={editAnnouncement}
      />

      <DeleteConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteConfirm?.title || ''}
      />
    </div>
  );
};

export default AnnouncementManager;
