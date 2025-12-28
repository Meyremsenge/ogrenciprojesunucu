import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  User,
  Calendar,
  AlertTriangle,
  Filter,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import type { ContentApprovalItem, ApprovalStats, ContentType, ApprovalPriority } from '../../types/admin';

interface ApprovalStatsCardProps {
  stats: ApprovalStats;
}

const ApprovalStatsCard: React.FC<ApprovalStatsCardProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-yellow-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-yellow-600">Bekleyen</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
          </div>
          <Clock className="w-8 h-8 text-yellow-400" />
        </div>
      </div>
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-600">Onaylanan</p>
            <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
      </div>
      <div className="bg-red-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-red-600">Reddedilen</p>
            <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
          </div>
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
      </div>
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600">Ortalama Süre</p>
            <p className="text-2xl font-bold text-blue-700">{stats.average_review_time}</p>
          </div>
          <Calendar className="w-8 h-8 text-blue-400" />
        </div>
      </div>
    </div>
  );
};

interface ApprovalItemCardProps {
  item: ContentApprovalItem;
  onView: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onAssign: (id: number) => void;
}

const ApprovalItemCard: React.FC<ApprovalItemCardProps> = ({
  item,
  onView,
  onApprove,
  onReject,
  onAssign,
}) => {
  const getContentTypeLabel = (type: ContentType) => {
    const labels: Record<ContentType, string> = {
      course: 'Kurs',
      lesson: 'Ders',
      video: 'Video',
      document: 'Döküman',
      quiz: 'Quiz',
      exam: 'Sınav',
      question: 'Soru',
      announcement: 'Duyuru',
    };
    return labels[type] || type;
  };

  const getContentTypeColor = (type: ContentType) => {
    const colors: Record<ContentType, string> = {
      course: 'bg-purple-100 text-purple-800',
      lesson: 'bg-blue-100 text-blue-800',
      video: 'bg-red-100 text-red-800',
      document: 'bg-green-100 text-green-800',
      quiz: 'bg-orange-100 text-orange-800',
      exam: 'bg-yellow-100 text-yellow-800',
      question: 'bg-gray-100 text-gray-800',
      announcement: 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: ApprovalPriority) => {
    const colors: Record<ApprovalPriority, string> = {
      low: 'text-gray-500',
      normal: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500',
    };
    return colors[priority] || 'text-gray-500';
  };

  const getPriorityIcon = (priority: number | ApprovalPriority) => {
    const priorityStr = typeof priority === 'number' 
      ? ['low', 'normal', 'high', 'urgent'][priority] as ApprovalPriority
      : priority;
    if (priorityStr === 'urgent' || priorityStr === 'high') {
      return <AlertTriangle className={`w-4 h-4 ${getPriorityColor(priorityStr)}`} />;
    }
    return null;
  };

  const getPriorityLabel = (priority: number | ApprovalPriority): ApprovalPriority => {
    return typeof priority === 'number'
      ? (['low', 'normal', 'high', 'urgent'][priority] as ApprovalPriority) || 'normal'
      : priority;
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getContentTypeColor(item.content_type)}`}>
              {getContentTypeLabel(item.content_type)}
            </span>
            {getPriorityIcon(item.priority)}
            {getPriorityLabel(item.priority) === 'urgent' && (
              <span className="text-xs text-red-600 font-medium">ACİL</span>
            )}
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-1">{item.title || item.content_title}</h3>
          
          {item.description && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              {item.submitted_by_name}
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(item.submitted_at).toLocaleDateString('tr-TR')}
            </div>
          </div>
          
          {item.assigned_to_name && (
            <div className="mt-2 text-sm text-blue-600">
              Atanan: {item.assigned_to_name || item.assigned_to}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => onView(item.id)}
          className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Eye className="w-4 h-4 mr-1" />
          İncele
        </button>
        {!item.assigned_to && !item.assigned_to_id && (
          <button
            onClick={() => onAssign(item.id)}
            className="flex items-center px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <User className="w-4 h-4 mr-1" />
            Üstlen
          </button>
        )}
        <button
          onClick={() => onReject(item.id)}
          className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <XCircle className="w-4 h-4 mr-1" />
          Reddet
        </button>
        <button
          onClick={() => onApprove(item.id)}
          className="flex items-center px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Onayla
        </button>
      </div>
    </div>
  );
};

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const RejectModal: React.FC<RejectModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">İçeriği Reddet</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Red Nedeni *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Reddetme nedenini açıklayın..."
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => {
              onConfirm(reason);
              setReason('');
            }}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reddet
          </button>
        </div>
      </div>
    </div>
  );
};

interface ContentApprovalQueueProps {
  items: ContentApprovalItem[];
  stats: ApprovalStats;
  loading?: boolean;
  onRefresh: () => void;
  onView: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  onAssign: (id: number) => void;
  onFilterChange: (filters: { content_type?: ContentType; priority?: ApprovalPriority }) => void;
}

const ContentApprovalQueue: React.FC<ContentApprovalQueueProps> = ({
  items,
  stats,
  loading,
  onRefresh,
  onView,
  onApprove,
  onReject,
  onAssign,
  onFilterChange,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const handleApplyFilters = () => {
    onFilterChange({
      content_type: contentTypeFilter as ContentType || undefined,
      priority: priorityFilter as ApprovalPriority || undefined,
    });
    setShowFilters(false);
  };

  const handleRejectClick = (id: number) => {
    setSelectedItemId(id);
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = (reason: string) => {
    if (selectedItemId) {
      onReject(selectedItemId, reason);
      setRejectModalOpen(false);
      setSelectedItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İçerik Onay Kuyruğu</h1>
          <p className="text-gray-500">{stats.pending} içerik onay bekliyor</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filtreler
            </button>
            
            {showFilters && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-10 border border-gray-200 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">İçerik Tipi</label>
                    <select
                      value={contentTypeFilter}
                      onChange={(e) => setContentTypeFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Tümü</option>
                      <option value="course">Kurs</option>
                      <option value="lesson">Ders</option>
                      <option value="video">Video</option>
                      <option value="document">Döküman</option>
                      <option value="quiz">Quiz</option>
                      <option value="exam">Sınav</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Tümü</option>
                      <option value="urgent">Acil</option>
                      <option value="high">Yüksek</option>
                      <option value="normal">Normal</option>
                      <option value="low">Düşük</option>
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
      </div>

      {/* Stats */}
      <ApprovalStatsCard stats={stats} />

      {/* Content List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Yükleniyor...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Onay Bekleyen İçerik Yok</h3>
          <p className="text-gray-500">Tüm içerikler incelenmiş durumda.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <ApprovalItemCard
              key={item.id}
              item={item}
              onView={onView}
              onApprove={onApprove}
              onReject={handleRejectClick}
              onAssign={onAssign}
            />
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <RejectModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedItemId(null);
        }}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
};

export default ContentApprovalQueue;
