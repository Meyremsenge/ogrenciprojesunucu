import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  UserPlus, 
  MoreVertical,
  Shield,
  Ban,
  Key,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Lock,
  Unlock
} from 'lucide-react';
import type { AdminUser } from '../../types/admin';
import type { UserRole } from '../../types/auth';

interface UserTableProps {
  users: AdminUser[];
  loading?: boolean;
  selectedUsers: number[];
  onSelectUser: (userId: number) => void;
  onSelectAll: () => void;
  onViewUser: (userId: number) => void;
  onEditUser: (userId: number) => void;
  onDeleteUser: (userId: number) => void;
  onActivateUser: (userId: number) => void;
  onDeactivateUser: (userId: number) => void;
  onResetPassword: (userId: number) => void;
  onChangeRole: (userId: number, role: UserRole) => void;
  onUnlockUser: (userId: number) => void;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  loading,
  selectedUsers,
  onSelectUser,
  onSelectAll,
  onViewUser,
  onEditUser,
  onDeleteUser,
  onActivateUser,
  onDeactivateUser,
  onResetPassword,
  onChangeRole,
  onUnlockUser,
}) => {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const getRoleBadgeColor = (role: UserRole) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      teacher: 'bg-green-100 text-green-800',
      student: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || colors.student;
  };

  const getRoleLabel = (role: UserRole) => {
    const labels = {
      super_admin: 'Süper Admin',
      admin: 'Admin',
      teacher: 'Öğretmen',
      student: 'Öğrenci',
    };
    return labels[role] || role;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kullanıcı
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Son Giriş
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kayıt Tarihi
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">İşlemler</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Yükleniyor...</p>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Kullanıcı bulunamadı
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => onSelectUser(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatar_url ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={user.avatar_url}
                            alt=""
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">
                              {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name}
                          {user.is_locked && (
                            <Lock className="inline-block w-4 h-4 text-red-500 ml-1" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {user.is_active ? (
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aktif
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600">
                          <XCircle className="w-4 h-4 mr-1" />
                          Pasif
                        </span>
                      )}
                      {user.is_verified && (
                        <Shield className="w-4 h-4 text-blue-500" aria-label="Doğrulanmış" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString('tr-TR')
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      {openMenuId === user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                onViewUser(user.id);
                                setOpenMenuId(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Görüntüle
                            </button>
                            <button
                              onClick={() => {
                                onEditUser(user.id);
                                setOpenMenuId(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Düzenle
                            </button>
                            <button
                              onClick={() => {
                                onResetPassword(user.id);
                                setOpenMenuId(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Key className="w-4 h-4 mr-2" />
                              Şifre Sıfırla
                            </button>
                            
                            <hr className="my-1" />
                            
                            {user.is_active ? (
                              <button
                                onClick={() => {
                                  onDeactivateUser(user.id);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Deaktifleştir
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  onActivateUser(user.id);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aktifleştir
                              </button>
                            )}
                            
                            {user.is_locked && (
                              <button
                                onClick={() => {
                                  onUnlockUser(user.id);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                              >
                                <Unlock className="w-4 h-4 mr-2" />
                                Kilidi Aç
                              </button>
                            )}
                            
                            <hr className="my-1" />
                            
                            <button
                              onClick={() => {
                                onDeleteUser(user.id);
                                setOpenMenuId(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Sil
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface UserManagementProps {
  users: AdminUser[];
  loading?: boolean;
  totalUsers: number;
  currentPage: number;
  perPage: number;
  onSearch: (query: string) => void;
  onFilter: (filters: any) => void;
  onPageChange: (page: number) => void;
  onCreateUser: () => void;
  onViewUser: (userId: number) => void;
  onEditUser: (userId: number) => void;
  onDeleteUser: (userId: number) => void;
  onActivateUser: (userId: number) => void;
  onDeactivateUser: (userId: number) => void;
  onResetPassword: (userId: number) => void;
  onChangeRole: (userId: number, role: UserRole) => void;
  onUnlockUser: (userId: number) => void;
  onBulkAction: (action: string, userIds: number[]) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  loading,
  totalUsers,
  currentPage,
  perPage,
  onSearch,
  onFilter,
  onPageChange,
  onCreateUser,
  onViewUser,
  onEditUser,
  onDeleteUser,
  onActivateUser,
  onDeactivateUser,
  onResetPassword,
  onChangeRole,
  onUnlockUser,
  onBulkAction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleApplyFilters = () => {
    onFilter({
      role: roleFilter || undefined,
      is_active: statusFilter === '' ? undefined : statusFilter === 'active',
    });
    setShowFilters(false);
  };

  const totalPages = Math.ceil(totalUsers / perPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-gray-500">{totalUsers} kullanıcı</p>
        </div>
        <button
          onClick={onCreateUser}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Yeni Kullanıcı
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İsim veya e-posta ile ara..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </form>
        
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-5 h-5 mr-2" />
            Filtreler
          </button>
          
          {showFilters && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-10 border border-gray-200 p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Tümü</option>
                    <option value="student">Öğrenci</option>
                    <option value="teacher">Öğretmen</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Süper Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Tümü</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>
                
                <button
                  onClick={handleApplyFilters}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Uygula
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center space-x-4 bg-blue-50 px-4 py-3 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedUsers.length} kullanıcı seçildi
          </span>
          <button
            onClick={() => onBulkAction('activate', selectedUsers)}
            className="text-sm text-green-600 hover:text-green-700"
          >
            Aktifleştir
          </button>
          <button
            onClick={() => onBulkAction('deactivate', selectedUsers)}
            className="text-sm text-orange-600 hover:text-orange-700"
          >
            Deaktifleştir
          </button>
          <button
            onClick={() => onBulkAction('delete', selectedUsers)}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Sil
          </button>
          <button
            onClick={() => setSelectedUsers([])}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Seçimi Temizle
          </button>
        </div>
      )}

      {/* User Table */}
      <UserTable
        users={users}
        loading={loading}
        selectedUsers={selectedUsers}
        onSelectUser={handleSelectUser}
        onSelectAll={handleSelectAll}
        onViewUser={onViewUser}
        onEditUser={onEditUser}
        onDeleteUser={onDeleteUser}
        onActivateUser={onActivateUser}
        onDeactivateUser={onDeactivateUser}
        onResetPassword={onResetPassword}
        onChangeRole={onChangeRole}
        onUnlockUser={onUnlockUser}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, totalUsers)} / {totalUsers}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Önceki
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-1 border rounded-md text-sm ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
