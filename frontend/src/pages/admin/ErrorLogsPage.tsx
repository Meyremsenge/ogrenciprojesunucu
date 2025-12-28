/**
 * Error Logs Page - Tailwind CSS Version
 * Hata loglarını görüntüleme ve yönetme sayfası.
 */

import React, { useState, useEffect } from 'react';
import {
  Bug,
  RefreshCw,
  Check,
  Download,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

// Types
interface ErrorLog {
  id: number;
  error_type: string;
  severity: string;
  message: string;
  stack_trace: string | null;
  file_path: string | null;
  line_number: number | null;
  user_id: number | null;
  user_email: string | null;
  request_url: string | null;
  request_method: string | null;
  request_body: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  additional_context: Record<string, unknown>;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: number | null;
  resolution_notes: string | null;
  occurrence_count: number;
  first_occurrence: string;
  last_occurrence: string;
  created_at: string;
}

interface ErrorStats {
  total_errors: number;
  unresolved_count: number;
  resolved_count: number;
  severity_counts: Record<string, number>;
  type_counts: Record<string, number>;
  hourly_distribution: Array<{ hour: number; count: number }>;
}

interface Filters {
  severity: string;
  error_type: string;
  is_resolved: string;
  start_date: string;
  end_date: string;
  search: string;
}

// Severity Badge
const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    critical: { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertCircle className="w-4 h-4" /> },
    error: { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertCircle className="w-4 h-4" /> },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <AlertTriangle className="w-4 h-4" /> },
    info: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Info className="w-4 h-4" /> },
  };
  const { bg, text, icon } = config[severity] || config.error;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {icon} {severity.toUpperCase()}
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

// Accordion Item
const AccordionItem: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title, children, defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg mb-2">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50">
        <span className="font-medium text-gray-900">{title}</span>
        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="p-3 pt-0 border-t">{children}</div>}
    </div>
  );
};

const ErrorLogsPage: React.FC = () => {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    severity: '', error_type: '', is_resolved: '', start_date: '', end_date: '', search: '',
  });

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        per_page: String(rowsPerPage),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.error_type && { error_type: filters.error_type }),
        ...(filters.is_resolved && { is_resolved: filters.is_resolved }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.search && { search: filters.search }),
      });
      const response = await fetch(`/api/v1/logs/errors?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setErrors(data.data.errors || []);
        setTotalCount(data.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/logs/errors/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchErrors();
    fetchStats();
  }, [page, rowsPerPage, filters]);

  const handleResolve = async () => {
    if (!selectedError) return;
    try {
      const response = await fetch(`/api/v1/logs/errors/${selectedError.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ resolution_notes: resolutionNotes }),
      });
      if (response.ok) {
        setShowResolveModal(false);
        setSelectedError(null);
        setResolutionNotes('');
        fetchErrors();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to resolve error:', error);
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
      const response = await fetch(`/api/v1/logs/errors/export?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bug className="w-8 h-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hata Logları</h1>
            <p className="text-gray-600">Sistem hatalarını izleyin ve yönetin</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Dışa Aktar
          </button>
          <button onClick={() => { fetchErrors(); fetchStats(); }} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Toplam Hata" value={stats.total_errors || 0} icon={<Bug className="w-6 h-6 text-red-600" />} borderColor="border-red-500" />
          <StatCard title="Kritik" value={stats.severity_counts?.critical || 0} icon={<AlertCircle className="w-6 h-6 text-red-600" />} borderColor="border-red-500" />
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
            <select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })} className="px-3 py-2 border rounded-lg">
              <option value="">Tüm Seviyeler</option>
              <option value="critical">Kritik</option>
              <option value="error">Hata</option>
              <option value="warning">Uyarı</option>
              <option value="info">Bilgi</option>
            </select>
            <select value={filters.is_resolved} onChange={(e) => setFilters({ ...filters, is_resolved: e.target.value })} className="px-3 py-2 border rounded-lg">
              <option value="">Tüm Durumlar</option>
              <option value="false">Çözülmemiş</option>
              <option value="true">Çözülmüş</option>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seviye</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesaj</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tekrar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {errors.map((error) => (
                    <tr key={error.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{format(parseISO(error.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</td>
                      <td className="px-4 py-3"><SeverityBadge severity={error.severity} /></td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">{error.error_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{error.message}</td>
                      <td className="px-4 py-3 text-sm">
                        {error.occurrence_count > 1 && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">{error.occurrence_count}x</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {error.is_resolved ? (
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
                          <button onClick={() => setSelectedError(error)} className="p-1 text-gray-600 hover:text-blue-600" title="Detaylar">
                            <Eye className="w-4 h-4" />
                          </button>
                          {!error.is_resolved && (
                            <button onClick={() => { setSelectedError(error); setShowResolveModal(true); }} className="p-1 text-gray-600 hover:text-green-600" title="Çöz">
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
      {selectedError && !showResolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">Hata Detayları</h2>
              <button onClick={() => setSelectedError(null)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className="text-sm text-gray-500">Hata ID</label><p className="font-mono">{selectedError.id}</p></div>
                <div><label className="text-sm text-gray-500">Seviye</label><div className="mt-1"><SeverityBadge severity={selectedError.severity} /></div></div>
                <div><label className="text-sm text-gray-500">Tip</label><p className="font-mono">{selectedError.error_type}</p></div>
                <div><label className="text-sm text-gray-500">İlk Görülme</label><p>{format(parseISO(selectedError.first_occurrence), 'dd MMM yyyy HH:mm', { locale: tr })}</p></div>
                <div><label className="text-sm text-gray-500">Son Görülme</label><p>{format(parseISO(selectedError.last_occurrence), 'dd MMM yyyy HH:mm', { locale: tr })}</p></div>
                <div><label className="text-sm text-gray-500">Tekrar Sayısı</label><p className="text-lg font-bold text-orange-600">{selectedError.occurrence_count}</p></div>
              </div>

              {/* Message */}
              <div>
                <label className="text-sm text-gray-500">Hata Mesajı</label>
                <div className="mt-1 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-red-800 font-mono text-sm">{selectedError.message}</p>
                </div>
              </div>

              {/* Stack Trace */}
              {selectedError.stack_trace && (
                <AccordionItem title="Stack Trace" defaultOpen>
                  <div className="relative">
                    <button onClick={() => copyToClipboard(selectedError.stack_trace || '')} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700" title="Kopyala">
                      <Copy className="w-4 h-4" />
                    </button>
                    <pre className="p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto max-h-64">{selectedError.stack_trace}</pre>
                  </div>
                </AccordionItem>
              )}

              {/* File Location */}
              {selectedError.file_path && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm"><span className="text-gray-500">Dosya:</span> <span className="font-mono">{selectedError.file_path}</span></p>
                  {selectedError.line_number && <p className="text-sm"><span className="text-gray-500">Satır:</span> <span className="font-mono">{selectedError.line_number}</span></p>}
                </div>
              )}

              {/* Request Info */}
              {(selectedError.request_url || selectedError.request_method) && (
                <AccordionItem title="Request Bilgisi">
                  <div className="space-y-2">
                    <p className="text-sm"><span className="text-gray-500">Method:</span> <span className="font-mono">{selectedError.request_method}</span></p>
                    <p className="text-sm"><span className="text-gray-500">URL:</span> <span className="font-mono break-all">{selectedError.request_url}</span></p>
                    {selectedError.request_body && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Body:</p>
                        <pre className="p-2 bg-gray-100 rounded text-xs overflow-x-auto">{JSON.stringify(selectedError.request_body, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </AccordionItem>
              )}

              {/* Additional Context */}
              {selectedError.additional_context && Object.keys(selectedError.additional_context).length > 0 && (
                <AccordionItem title="Ek Bilgiler">
                  <pre className="p-2 bg-gray-100 rounded text-xs overflow-x-auto">{JSON.stringify(selectedError.additional_context, null, 2)}</pre>
                </AccordionItem>
              )}

              {/* Resolution Info */}
              {selectedError.is_resolved && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800"><strong>Çözüm Tarihi:</strong> {selectedError.resolved_at && format(parseISO(selectedError.resolved_at), 'dd MMMM yyyy HH:mm', { locale: tr })}</p>
                  {selectedError.resolution_notes && <p className="text-sm text-green-700 mt-1"><strong>Not:</strong> {selectedError.resolution_notes}</p>}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t sticky bottom-0 bg-white">
              {!selectedError.is_resolved && <button onClick={() => setShowResolveModal(true)} className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">Çözüldü Olarak İşaretle</button>}
              <button onClick={() => setSelectedError(null)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Hatayı Çöz</h2>
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

      {/* Copy Success Toast */}
      {copySuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Panoya kopyalandı!
        </div>
      )}
    </div>
  );
};

export default ErrorLogsPage;
