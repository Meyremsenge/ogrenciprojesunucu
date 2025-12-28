import React from 'react';
import { 
  Users, 
  BookOpen, 
  CreditCard, 
  TrendingUp,
  UserPlus,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import type { DashboardStats, AdminActivity } from '../../types/admin';

interface StatCardProps {
  title: string;
  value: number | string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon, trend, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && (
            <p className="text-sm text-gray-500 mt-1">{subValue}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-4 flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          <TrendingUp className={`w-4 h-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
          <span>{Math.abs(trend)}% bu hafta</span>
        </div>
      )}
    </div>
  );
};

interface ActivityItemProps {
  activity: AdminActivity;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getActionIcon = () => {
    if (activity.action_type.includes('user')) return <Users className="w-4 h-4" />;
    if (activity.action_type.includes('content')) return <BookOpen className="w-4 h-4" />;
    if (activity.action_type.includes('package')) return <CreditCard className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getActionColor = () => {
    if (activity.action_type.includes('create') || activity.action_type.includes('approve')) {
      return 'bg-green-100 text-green-600';
    }
    if (activity.action_type.includes('delete') || activity.action_type.includes('reject')) {
      return 'bg-red-100 text-red-600';
    }
    return 'bg-blue-100 text-blue-600';
  };

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`p-2 rounded-full ${getActionColor()}`}>
        {getActionIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{activity.admin_name}</span>
          {' '}{activity.description || activity.action_type.replace(/_/g, ' ')}
        </p>
        {activity.target_name && (
          <p className="text-sm text-gray-500">{activity.target_name}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {new Date(activity.created_at).toLocaleString('tr-TR')}
        </p>
      </div>
      {activity.success ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-red-500" />
      )}
    </div>
  );
};

interface AdminDashboardProps {
  stats: DashboardStats;
  activities: AdminActivity[];
  onRefresh?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats, activities, onRefresh }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Sistem genel bakış</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Yenile
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Toplam Kullanıcı"
          value={stats.users.total.toLocaleString()}
          subValue={`${stats.users.active.toLocaleString()} aktif`}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Yeni Kullanıcılar"
          value={stats.users.new_week}
          subValue={`${stats.users.new_today} bugün`}
          icon={<UserPlus className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Aktif Abonelikler"
          value={stats.subscriptions.active.toLocaleString()}
          icon={<CreditCard className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Gelir (30 gün)"
          value={`₺${stats.revenue.last_30_days.toLocaleString()}`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kurslar</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Toplam Kurs</span>
              <span className="font-bold text-gray-900">{stats.courses.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Yayında</span>
              <span className="font-bold text-green-600">{stats.courses.published}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Taslak</span>
              <span className="font-bold text-gray-400">{stats.courses.total - stats.courses.published}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kayıtlar</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Toplam Kayıt</span>
              <span className="font-bold text-gray-900">{stats.enrollments.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Bu Hafta</span>
              <span className="font-bold text-green-600">+{stats.enrollments.new_week}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kullanıcı Durumu</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Aktif</span>
              <span className="font-bold text-green-600">{stats.users.active.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Pasif</span>
              <span className="font-bold text-gray-400">
                {(stats.users.total - stats.users.active).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Son Aktiviteler</h3>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">Henüz aktivite yok</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
