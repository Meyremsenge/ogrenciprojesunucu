import React, { useState } from 'react';
import {
  Package as PackageIcon,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  MoreVertical,
  Search,
  CreditCard,
  Star,
} from 'lucide-react';
import type { Package as PackageType, UserPackage, CreatePackageData } from '../../types/admin';

interface PackageCardProps {
  pkg: PackageType;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onViewSubscribers: (id: number) => void;
  onAssign: (id: number) => void;
}

const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  onEdit,
  onDelete,
  onViewSubscribers,
  onAssign,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 ${pkg.is_featured ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {pkg.is_featured && (
              <Star className="w-5 h-5 text-yellow-300 mr-2" fill="currentColor" />
            )}
            <h3 className={`text-lg font-bold ${pkg.is_featured ? 'text-white' : 'text-gray-900'}`}>
              {pkg.name}
            </h3>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`p-1 rounded ${pkg.is_featured ? 'text-white hover:bg-white/20' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <button
                  onClick={() => {
                    onEdit(pkg.id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Düzenle
                </button>
                <button
                  onClick={() => {
                    onViewSubscribers(pkg.id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Aboneleri Gör
                </button>
                <button
                  onClick={() => {
                    onAssign(pkg.id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Kullanıcıya Ata
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    onDelete(pkg.id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sil
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
        
        {/* Price */}
        <div className="mb-4">
          <span className="text-3xl font-bold text-gray-900">₺{pkg.price}</span>
          <span className="text-gray-500">/{pkg.duration_months} ay</span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {pkg.subscriber_count} abone
          </div>
          <div className={`flex items-center ${pkg.is_active ? 'text-green-600' : 'text-red-600'}`}>
            {pkg.is_active ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Aktif
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-1" />
                Pasif
              </>
            )}
          </div>
        </div>

        {/* Features */}
        {pkg.features && pkg.features.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Özellikler</h4>
            <ul className="space-y-1">
              {pkg.features.slice(0, 5).map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  {feature}
                </li>
              ))}
              {pkg.features.length > 5 && (
                <li className="text-sm text-gray-500">
                  +{pkg.features.length - 5} daha fazla...
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

interface CreatePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePackageData) => void;
  editData?: PackageType | null;
}

const CreatePackageModal: React.FC<CreatePackageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editData,
}) => {
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const [formData, setFormData] = useState<CreatePackageData>({
    name: editData?.name || '',
    slug: editData?.slug || '',
    description: editData?.description || '',
    price: editData?.price || 0,
    duration_months: editData?.duration_months || Math.ceil((editData?.duration_days || 30) / 30),
    features: editData?.features || [],
    is_active: editData?.is_active ?? true,
    is_featured: editData?.is_featured ?? false,
    max_courses: editData?.max_courses,
    max_students: editData?.max_students,
  });
  const [featureInput, setFeatureInput] = useState('');

  if (!isOpen) return null;

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {editData ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paket Adı *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fiyat (₺) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Süre (Ay) *
              </label>
              <input
                type="number"
                value={formData.duration_months}
                onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maksimum Kurs
              </label>
              <input
                type="number"
                value={formData.max_courses || ''}
                onChange={(e) => setFormData({ ...formData, max_courses: e.target.value ? parseInt(e.target.value) : undefined })}
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Sınırsız"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maksimum Öğrenci
              </label>
              <input
                type="number"
                value={formData.max_students || ''}
                onChange={(e) => setFormData({ ...formData, max_students: e.target.value ? parseInt(e.target.value) : undefined })}
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Sınırsız"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Özellikler
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Yeni özellik ekle..."
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Ekle
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.features?.map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {feature}
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(index)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Aktif</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Öne Çıkan</span>
            </label>
          </div>

          {/* Actions */}
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

interface AssignPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userId: number, packageId: number) => void;
  packages: PackageType[];
  selectedPackageId?: number;
}

const AssignPackageModal: React.FC<AssignPackageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  packages,
  selectedPackageId,
}) => {
  const [userId, setUserId] = useState('');
  const [packageId, setPackageId] = useState(selectedPackageId || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(parseInt(userId), parseInt(packageId as string));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Paket Ata</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kullanıcı ID *
            </label>
            <input
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Kullanıcı ID'si girin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paket *
            </label>
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Paket seçin</option>
              {packages.filter(p => p.is_active).map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} - ₺{pkg.price}/{pkg.duration_months} ay
                </option>
              ))}
            </select>
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
              Ata
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SubscribersModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageName: string;
  subscribers: UserPackage[];
  onRevokeSubscription: (subscriptionId: number) => void;
}

const SubscribersModal: React.FC<SubscribersModalProps> = ({
  isOpen,
  onClose,
  packageName,
  subscribers,
  onRevokeSubscription,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Belirsiz';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {packageName} - Aboneler
        </h3>
        
        {subscribers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Bu pakete abone olan kullanıcı yok.</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {subscribers.map((sub) => (
              <div key={sub.id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{sub.user_name || `Kullanıcı #${sub.user_id}`}</p>
                  <p className="text-sm text-gray-500">{sub.user_email || ''}</p>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(sub.start_date || sub.starts_at)} - {formatDate(sub.end_date || sub.expires_at)}
                    </span>
                    <span className={`flex items-center ${sub.is_active || sub.subscription_status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {sub.is_active || sub.subscription_status === 'active' ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aktif
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-1" />
                          Sona Erdi
                        </>
                      )}
                    </span>
                  </div>
                </div>
                {(sub.is_active || sub.subscription_status === 'active') && (
                  <button
                    onClick={() => onRevokeSubscription(sub.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    İptal Et
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

interface PackageManagementProps {
  packages: PackageType[];
  loading?: boolean;
  onCreatePackage: (data: CreatePackageData) => void;
  onUpdatePackage: (id: number, data: CreatePackageData) => void;
  onDeletePackage: (id: number) => void;
  onAssignPackage: (userId: number, packageId: number) => void;
  onRevokeSubscription: (subscriptionId: number) => void;
  onGetSubscribers: (packageId: number) => Promise<UserPackage[]>;
  onRefresh: () => void;
}

const PackageManagement: React.FC<PackageManagementProps> = ({
  packages,
  loading,
  onCreatePackage,
  onUpdatePackage,
  onDeletePackage,
  onAssignPackage,
  onRevokeSubscription,
  onGetSubscribers,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editPackage, setEditPackage] = useState<PackageType | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPackageIdForAssign, setSelectedPackageIdForAssign] = useState<number | undefined>();
  const [subscribersModal, setSubscribersModal] = useState<{
    isOpen: boolean;
    packageName: string;
    subscribers: UserPackage[];
  }>({ isOpen: false, packageName: '', subscribers: [] });

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewSubscribers = async (packageId: number) => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      const subscribers = await onGetSubscribers(packageId);
      setSubscribersModal({
        isOpen: true,
        packageName: pkg.name,
        subscribers,
      });
    }
  };

  const handleAssign = (packageId: number) => {
    setSelectedPackageIdForAssign(packageId);
    setAssignModalOpen(true);
  };

  const handleEdit = (packageId: number) => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      setEditPackage(pkg);
      setCreateModalOpen(true);
    }
  };

  const handleCreateOrUpdate = (data: CreatePackageData) => {
    if (editPackage) {
      onUpdatePackage(editPackage.id, data);
    } else {
      onCreatePackage(data);
    }
    setCreateModalOpen(false);
    setEditPackage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paket Yönetimi</h1>
          <p className="text-gray-500">{packages.length} paket</p>
        </div>
        <button
          onClick={() => {
            setEditPackage(null);
            setCreateModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Paket
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Paket ara..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Yükleniyor...</span>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <PackageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Paket Bulunamadı</h3>
          <p className="text-gray-500">Yeni bir paket oluşturarak başlayın.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onEdit={handleEdit}
              onDelete={onDeletePackage}
              onViewSubscribers={handleViewSubscribers}
              onAssign={handleAssign}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreatePackageModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditPackage(null);
        }}
        onSubmit={handleCreateOrUpdate}
        editData={editPackage}
      />

      <AssignPackageModal
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedPackageIdForAssign(undefined);
        }}
        onSubmit={(userId, packageId) => {
          onAssignPackage(userId, packageId);
          setAssignModalOpen(false);
          setSelectedPackageIdForAssign(undefined);
        }}
        packages={packages}
        selectedPackageId={selectedPackageIdForAssign}
      />

      <SubscribersModal
        isOpen={subscribersModal.isOpen}
        onClose={() => setSubscribersModal({ isOpen: false, packageName: '', subscribers: [] })}
        packageName={subscribersModal.packageName}
        subscribers={subscribersModal.subscribers}
        onRevokeSubscription={onRevokeSubscription}
      />
    </div>
  );
};

export default PackageManagement;
