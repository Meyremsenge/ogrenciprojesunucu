/**
 * Audit Logs Page - Tailwind CSS Version
 * Denetim loglarını görüntüleme sayfası.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  RefreshCw,
  Download,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Calendar,
  Activity,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

// Types
interface AuditLog {
  id: number;
  user_id: number | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  additional_info: Record<string, unknown> | null;
  created_at: string;
}

interface AuditStats {
  total_logs: number;
  actions_by_type: Record<string, number>;
  entities_by_type: Record<string, number>;
  active_users: number;
  logs_today: number;
}

interface Filters {
  user_id: string;
  action: string;
  entity_type: string;
  start_date: string;
  end_date: string;
  search: string;
}

// Action Badge Component
const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const config: Record<string, { bg: string; text: string }> = {
    create: { bg: 'bg-green-100', text: 'text-green-800' },
    update: { bg: 'bg-blue-100', text: 'text-blue-800' },
    delete: { bg: 'bg-red-100', text: 'text-red-800' },
    login: { bg: 'bg-purple-100', text: 'text-purple-800' },
    logout: { bg: 'bg-gray-100', text: 'text-gray-800' },
    view: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  };
  const { bg, text } = config[action.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {action.toUpperCase()}
    </span>
  );
};

// Stat Card
const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; borderColor: string }> = ({
  title, value, icon, borderColor
}) => (
  <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${borderColor}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="p-3 rounded-full bg-gray-100">{icon}</div>
    </div>
  </div>
);

// Diff Viewer Component
const DiffViewer: React.FC<{ oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null }> = ({
  oldValues, newValues
}) => {
  if (!oldValues && !newValues) return <p className="text-gray-500 text-sm">Değişiklik yok</p>;
  
  const allKeys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ]);

  return (
    <div className="space-y-2">
      {Array.from(allKeys).map((key) => {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];
        const hasChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

        if (!hasChanged) return null;

        return (
          <div key={key} className="grid grid-cols-3 gap-2 text-sm">
            <span className="font-medium text-gray-700">{key}</span>
            <span className="bg-red-50 text-red-700 px-2 py-1 rounded line-through">
              {oldVal !== undefined ? JSON.stringify(oldVal) : '-'}
            </span>
            <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
              {newVal !== undefined ? JSON.stringify(newVal) : '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    user_id: '', action: '', entity_type: '', start_date: '', end_date: '', search: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        per_page: String(rowsPerPage),
        ...(filters.user_id && { user_id: filters.user_id }),
        ...(filters.action && { action: filters.action }),
        ...(filters.entity_type && { entity_type: filters.entity_type }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.search && { search: filters.search }),
      });
      const response = await fetch(`/api/v1/logs/audit?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs || []);
        setTotalCount(data.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/logs/audit/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, rowsPerPage, filters]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...(filters.action && { action: filters.action }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
      });
      const response = await fetch(`/api/v1/logs/audit/export?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage);

  const actionTypes = ['create', 'update', 'delete', 'login', 'logout', 'view'];
  const entityTypes = ['user', 'course', 'content', 'exam', 'question', 'live_session', 'package'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Denetim Logları</h1>
            <p className="text-gray-600">Sistem aktivitelerini izleyin</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Dışa Aktar
          </button>
          <button onClick={() => { fetchLogs(); fetchStats(); }} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Toplam Log" value={stats.total_logs.toLocaleString()} icon={<FileText className="w-6 h-6 text-indigo-600" />} borderColor="border-indigo-500" />
          <StatCard title="Bugün" value={stats.logs_today || 0} icon={<Calendar className="w-6 h-6 text-blue-600" />} borderColor="border-blue-500" />
          <StatCard title="Aktif Kullanıcı" value={stats.active_users || 0} icon={<User className="w-6 h-6 text-green-600" />} borderColor="border-green-500" />
          <StatCard title="İşlem Tipi" value={Object.keys(stats.actions_by_type || {}).length} icon={<Activity className="w-6 h-6 text-purple-600" />} borderColor="border-purple-500" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <Filter className="w-4 h-4" /> Filtreler
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Ara..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t">
            <input
              type="text"
              placeholder="Kullanıcı ID"
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="px-3 py-2 border rounded-lg">
              <option value="">Tüm İşlemler</option>
              {actionTypes.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
            </select>
            <select value={filters.entity_type} onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })} className="px-3 py-2 border rounded-lg">
              <option value="">Tüm Varlıklar</option>
              {entityTypes.map(e => <option key={e} value={e}>{e.replace('_', ' ').toUpperCase()}</option>)}
            </select>
            <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} className="px-3 py-2 border rounded-lg" />
            <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} className="px-3 py-2 border rounded-lg" />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Varlık</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{format(parseISO(log.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{log.user_email || `ID: ${log.user_id}` || '-'}</td>
                      <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.entity_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{log.entity_id || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{log.ip_address || '-'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedLog(log)} className="p-1 text-gray-600 hover:text-blue-600" title="Detaylar">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-600">Toplam {totalCount} kayıt</div>
              <div className="flex items-center gap-2">
                <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }} className="px-2 py-1 border rounded">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">Sayfa {page + 1} / {totalPages || 1}</span>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">Log Detayları</h2>
              <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className="text-sm text-gray-500">Log ID</label><p className="font-mono">{selectedLog.id}</p></div>
                <div><label className="text-sm text-gray-500">İşlem</label><div className="mt-1"><ActionBadge action={selectedLog.action} /></div></div>
                <div><label className="text-sm text-gray-500">Tarih</label><p>{format(parseISO(selectedLog.created_at), 'dd MMMM yyyy HH:mm:ss', { locale: tr })}</p></div>
                <div><label className="text-sm text-gray-500">Kullanıcı</label><p>{selectedLog.user_email || '-'}</p></div>
                <div><label className="text-sm text-gray-500">Varlık Tipi</label><p>{selectedLog.entity_type}</p></div>
                <div><label className="text-sm text-gray-500">Varlık ID</label><p className="font-mono">{selectedLog.entity_id || '-'}</p></div>
                <div><label className="text-sm text-gray-500">IP Adresi</label><p className="font-mono">{selectedLog.ip_address || '-'}</p></div>
              </div>

              {/* Changes */}
              {(selectedLog.old_values || selectedLog.new_values) && (
                <div>
                  <label className="text-sm text-gray-500 block mb-2">Değişiklikler</label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <DiffViewer oldValues={selectedLog.old_values} newValues={selectedLog.new_values} />
                  </div>
                </div>
              )}

              {/* Additional Info */}
              {selectedLog.additional_info && Object.keys(selectedLog.additional_info).length > 0 && (
                <div>
                  <label className="text-sm text-gray-500 block mb-2">Ek Bilgiler</label>
                  <pre className="p-3 bg-gray-100 rounded text-sm overflow-x-auto">{JSON.stringify(selectedLog.additional_info, null, 2)}</pre>
                </div>
              )}

              {/* User Agent */}
              {selectedLog.user_agent && (
                <div>
                  <label className="text-sm text-gray-500 block mb-2">User Agent</label>
                  <p className="text-sm text-gray-600 break-all">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t">
              <button onClick={() => setSelectedLog(null)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
