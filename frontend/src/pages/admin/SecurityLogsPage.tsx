/**
 * Security Logs Page - Tailwind CSS Version
 * Güvenlik olaylarını görüntüleme ve yönetme sayfası.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  RefreshCw,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  Download,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

// Types
interface SecurityEvent {
  id: number;
  event_type: string;
  severity: string;
  user_id: number | null;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  description: string;
  details: Record<string, unknown>;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: number | null;
  resolution_notes: string | null;
  created_at: string;
}

interface SecurityStats {
  severity_counts: Record<string, number>;
  event_type_counts: Record<string, number>;
  unresolved_count: number;
  resolved_count: number;
  top_ips: Array<{ ip: string; count: number }>;
}

interface Filters {
  severity: string;
  event_type: string;
  is_resolved: string;
  start_date: string;
  end_date: string;
  search: string;
}

// Severity Badge Component
const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    critical: { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertCircle className="w-4 h-4" /> },
    high: { bg: 'bg-orange-100', text: 'text-orange-800', icon: <AlertTriangle className="w-4 h-4" /> },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <AlertTriangle className="w-4 h-4" /> },
    low: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Info className="w-4 h-4" /> },
    info: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <Info className="w-4 h-4" /> },
  };
  const { bg, text, icon } = config[severity] || config.info;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {icon}
      {severity.toUpperCase()}
    </span>
  );
};

// Stat Card Component
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

const SecurityLogsPage: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filters, setFilters] = useState<Filters>({
    severity: '', event_type: '', is_resolved: '', start_date: '', end_date: '', search: '',
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        per_page: String(rowsPerPage),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.event_type && { event_type: filters.event_type }),
        ...(filters.is_resolved && { is_resolved: filters.is_resolved }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.search && { search: filters.search }),
      });
      const response = await fetch(`/api/v1/logs/security?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setEvents(data.data.events || []);
        setTotalCount(data.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/logs/security/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, [page, rowsPerPage, filters]);

  const handleResolve = async () => {
    if (!selectedEvent) return;
    try {
      const response = await fetch(`/api/v1/logs/security/${selectedEvent.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ resolution_notes: resolutionNotes }),
      });
      if (response.ok) {
        setShowResolveModal(false);
        setSelectedEvent(null);
        setResolutionNotes('');
        fetchEvents();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to resolve event:', error);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
      });
      const response = await fetch(`/api/v1/logs/security/export?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Güvenlik Logları</h1>
            <p className="text-gray-600">Sistem güvenlik olaylarını izleyin</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Dışa Aktar
          </button>
          <button onClick={() => { fetchEvents(); fetchStats(); }} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Kritik" value={stats.severity_counts?.critical || 0} icon={<AlertCircle className="w-6 h-6 text-red-600" />} borderColor="border-red-500" />
          <StatCard title="Yüksek" value={stats.severity_counts?.high || 0} icon={<AlertTriangle className="w-6 h-6 text-orange-600" />} borderColor="border-orange-500" />
          <StatCard title="Çözülmemiş" value={stats.unresolved_count || 0} icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />} borderColor="border-yellow-500" />
          <StatCard title="Çözülmüş" value={stats.resolved_count || 0} icon={<Check className="w-6 h-6 text-green-600" />} borderColor="border-green-500" />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            <select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tüm Önem Dereceleri</option>
              <option value="critical">Kritik</option>
              <option value="high">Yüksek</option>
              <option value="medium">Orta</option>
              <option value="low">Düşük</option>
              <option value="info">Bilgi</option>
            </select>
            <select value={filters.is_resolved} onChange={(e) => setFilters({ ...filters, is_resolved: e.target.value })} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tüm Durumlar</option>
              <option value="false">Çözülmemiş</option>
              <option value="true">Çözülmüş</option>
            </select>
            <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Önem</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Olay Tipi</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{format(parseISO(event.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</td>
                      <td className="px-4 py-3"><SeverityBadge severity={event.severity} /></td>
                      <td className="px-4 py-3 text-sm text-gray-900">{event.event_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{event.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">{event.ip_address || '-'}</td>
                      <td className="px-4 py-3">
                        {event.is_resolved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="w-3 h-3" /> Çözüldü
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="w-3 h-3" /> Bekliyor
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedEvent(event)} className="p-1 text-gray-600 hover:text-blue-600" title="Detaylar">
                            <Eye className="w-4 h-4" />
                          </button>
                          {!event.is_resolved && (
                            <button onClick={() => { setSelectedEvent(event); setShowResolveModal(true); }} className="p-1 text-gray-600 hover:text-green-600" title="Çöz">
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
      {selectedEvent && !showResolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Olay Detayları</h2>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-500">Olay ID</label><p className="font-mono">{selectedEvent.id}</p></div>
                <div><label className="text-sm text-gray-500">Önem Derecesi</label><div className="mt-1"><SeverityBadge severity={selectedEvent.severity} /></div></div>
                <div><label className="text-sm text-gray-500">Olay Tipi</label><p>{selectedEvent.event_type}</p></div>
                <div><label className="text-sm text-gray-500">IP Adresi</label><p className="font-mono">{selectedEvent.ip_address || '-'}</p></div>
                <div><label className="text-sm text-gray-500">Kullanıcı</label><p>{selectedEvent.user_email || '-'}</p></div>
                <div><label className="text-sm text-gray-500">Tarih</label><p>{format(parseISO(selectedEvent.created_at), 'dd MMMM yyyy HH:mm:ss', { locale: tr })}</p></div>
              </div>
              <div><label className="text-sm text-gray-500">Açıklama</label><p className="mt-1">{selectedEvent.description}</p></div>
              {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                <div><label className="text-sm text-gray-500">Detaylar</label><pre className="mt-1 p-3 bg-gray-100 rounded text-sm overflow-x-auto">{JSON.stringify(selectedEvent.details, null, 2)}</pre></div>
              )}
              {selectedEvent.user_agent && (<div><label className="text-sm text-gray-500">User Agent</label><p className="mt-1 text-sm text-gray-600 break-all">{selectedEvent.user_agent}</p></div>)}
              {selectedEvent.is_resolved && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800"><strong>Çözüm Tarihi:</strong> {selectedEvent.resolved_at && format(parseISO(selectedEvent.resolved_at), 'dd MMMM yyyy HH:mm', { locale: tr })}</p>
                  {selectedEvent.resolution_notes && <p className="text-sm text-green-700 mt-1"><strong>Not:</strong> {selectedEvent.resolution_notes}</p>}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              {!selectedEvent.is_resolved && <button onClick={() => setShowResolveModal(true)} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">Çözüldü Olarak İşaretle</button>}
              <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Olayı Çöz</h2>
              <button onClick={() => { setShowResolveModal(false); setResolutionNotes(''); }} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Çözüm Notları</label>
              <textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Çözüm detaylarını yazın..." />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => { setShowResolveModal(false); setResolutionNotes(''); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">İptal</button>
              <button onClick={handleResolve} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">Çözüldü Olarak İşaretle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityLogsPage;
