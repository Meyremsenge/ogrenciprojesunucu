/**
 * Performance Metrics Page - Tailwind CSS Version
 * Performans metrikleri görüntüleme sayfası.
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Clock,
  TrendingUp,
  AlertTriangle,
  Server,
  Database,
  Zap,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { format, parseISO, subDays, subHours } from 'date-fns';
import { tr } from 'date-fns/locale';

// Types
interface PerformanceMetric {
  id: number;
  endpoint: string;
  method: string;
  response_time_ms: number;
  status_code: number;
  timestamp: string;
  user_id: number | null;
  ip_address: string | null;
  memory_usage_mb: number | null;
  cpu_usage_percent: number | null;
}

interface PerformanceStats {
  avg_response_time: number;
  max_response_time: number;
  min_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  total_requests: number;
  error_rate: number;
  requests_per_minute: number;
  slowest_endpoints: Array<{ endpoint: string; avg_time: number; count: number }>;
  status_distribution: Record<string, number>;
  hourly_stats: Array<{ hour: string; requests: number; avg_time: number; errors: number }>;
}

interface Filters {
  time_range: string;
  endpoint: string;
  method: string;
  min_response_time: string;
}

// Helper function
const formatResponseTime = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const getResponseTimeColor = (ms: number): string => {
  if (ms < 100) return 'text-green-600';
  if (ms < 500) return 'text-yellow-600';
  if (ms < 1000) return 'text-orange-600';
  return 'text-red-600';
};

const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
  if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-800';
  if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  borderColor: string;
  trend?: { value: number; isPositive: boolean };
}> = ({ title, value, subtitle, icon, borderColor, trend }) => (
  <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${borderColor}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-3 h-3 ${!trend.isPositive && 'rotate-180'}`} />
            {trend.value}%
          </p>
        )}
      </div>
      <div className="p-3 rounded-full bg-gray-100">{icon}</div>
    </div>
  </div>
);

// Simple Bar Chart Component
const SimpleBarChart: React.FC<{ data: Array<{ label: string; value: number; color?: string }> }> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-16 truncate" title={item.label}>{item.label}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
            <div
              className={`h-full ${item.color || 'bg-blue-500'} transition-all duration-300`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 w-12 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

// Progress Ring Component
const ProgressRing: React.FC<{ value: number; max: number; color: string; label: string }> = ({
  value, max, color, label
}) => {
  const percentage = (value / max) * 100;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle cx="40" cy="40" r="35" stroke="#e5e7eb" strokeWidth="6" fill="none" />
          <circle
            cx="40" cy="40" r="35" stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={`${2 * Math.PI * 35}`}
            strokeDashoffset={`${2 * Math.PI * 35 * (1 - percentage / 100)}`}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{percentage.toFixed(0)}%</span>
      </div>
      <span className="text-sm text-gray-600 mt-2">{label}</span>
    </div>
  );
};

const PerformanceMetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'endpoints'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    time_range: '1h', endpoint: '', method: '', min_response_time: '',
  });

  const getTimeRange = () => {
    switch (filters.time_range) {
      case '15m': return { start: subHours(new Date(), 0.25), end: new Date() };
      case '1h': return { start: subHours(new Date(), 1), end: new Date() };
      case '6h': return { start: subHours(new Date(), 6), end: new Date() };
      case '24h': return { start: subDays(new Date(), 1), end: new Date() };
      case '7d': return { start: subDays(new Date(), 7), end: new Date() };
      default: return { start: subHours(new Date(), 1), end: new Date() };
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const range = getTimeRange();
      const params = new URLSearchParams({
        page: String(page + 1),
        per_page: String(rowsPerPage),
        start_date: range.start.toISOString(),
        end_date: range.end.toISOString(),
        ...(filters.endpoint && { endpoint: filters.endpoint }),
        ...(filters.method && { method: filters.method }),
        ...(filters.min_response_time && { min_response_time: filters.min_response_time }),
      });
      const response = await fetch(`/api/v1/logs/performance?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data.metrics || []);
        setTotalCount(data.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const range = getTimeRange();
      const params = new URLSearchParams({
        start_date: range.start.toISOString(),
        end_date: range.end.toISOString(),
      });
      const response = await fetch(`/api/v1/logs/performance/stats?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchStats();
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchMetrics();
        fetchStats();
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, filters]);

  const totalPages = Math.ceil(totalCount / rowsPerPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performans Metrikleri</h1>
            <p className="text-gray-600">Sistem performansını izleyin</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <select
            value={filters.time_range}
            onChange={(e) => setFilters({ ...filters, time_range: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="15m">Son 15 dakika</option>
            <option value="1h">Son 1 saat</option>
            <option value="6h">Son 6 saat</option>
            <option value="24h">Son 24 saat</option>
            <option value="7d">Son 7 gün</option>
          </select>
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg border ${autoRefresh ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white text-gray-700'}`}
          >
            {autoRefresh ? '⏸ Durdur' : '▶ Otomatik'}
          </button>
          <button onClick={() => { fetchMetrics(); fetchStats(); }} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <RefreshCw className={`w-4 h-4 ${loading && 'animate-spin'}`} /> Yenile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {(['overview', 'requests', 'endpoints'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              {tab === 'overview' && 'Genel Bakış'}
              {tab === 'requests' && 'İstekler'}
              {tab === 'endpoints' && 'Endpoint\'ler'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Ortalama Yanıt Süresi"
              value={formatResponseTime(stats.avg_response_time)}
              icon={<Clock className="w-6 h-6 text-blue-600" />}
              borderColor="border-blue-500"
            />
            <StatCard
              title="P95 Yanıt Süresi"
              value={formatResponseTime(stats.p95_response_time)}
              icon={<Zap className="w-6 h-6 text-yellow-600" />}
              borderColor="border-yellow-500"
            />
            <StatCard
              title="Toplam İstek"
              value={stats.total_requests.toLocaleString()}
              subtitle={`${stats.requests_per_minute.toFixed(1)} istek/dk`}
              icon={<Server className="w-6 h-6 text-green-600" />}
              borderColor="border-green-500"
            />
            <StatCard
              title="Hata Oranı"
              value={`${stats.error_rate.toFixed(2)}%`}
              icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
              borderColor="border-red-500"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Durum Kodu Dağılımı</h3>
              {stats.status_distribution && (
                <div className="flex justify-around">
                  {Object.entries(stats.status_distribution).map(([status, count]) => (
                    <ProgressRing
                      key={status}
                      value={count}
                      max={stats.total_requests}
                      color={status.startsWith('2') ? '#22c55e' : status.startsWith('4') ? '#eab308' : '#ef4444'}
                      label={`${status}xx`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Slowest Endpoints */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">En Yavaş Endpoint'ler</h3>
              {stats.slowest_endpoints && (
                <SimpleBarChart
                  data={stats.slowest_endpoints.slice(0, 5).map(ep => ({
                    label: ep.endpoint.replace('/api/v1/', ''),
                    value: Math.round(ep.avg_time),
                    color: ep.avg_time > 1000 ? 'bg-red-500' : ep.avg_time > 500 ? 'bg-yellow-500' : 'bg-blue-500',
                  }))}
                />
              )}
            </div>
          </div>

          {/* Hourly Chart */}
          {stats.hourly_stats && stats.hourly_stats.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Saatlik İstek Dağılımı</h3>
              <div className="h-48 flex items-end justify-between gap-1">
                {stats.hourly_stats.map((h, i) => {
                  const maxRequests = Math.max(...stats.hourly_stats.map(x => x.requests), 1);
                  const height = (h.requests / maxRequests) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                          {h.requests} istek
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">{h.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <Filter className="w-4 h-4" /> Filtreler
            </button>
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 mt-4 border-t">
                <input
                  type="text"
                  placeholder="Endpoint filtrele..."
                  value={filters.endpoint}
                  onChange={(e) => setFilters({ ...filters, endpoint: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                />
                <select
                  value={filters.method}
                  onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Tüm Metodlar</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
                <input
                  type="number"
                  placeholder="Min yanıt süresi (ms)"
                  value={filters.min_response_time}
                  onChange={(e) => setFilters({ ...filters, min_response_time: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                />
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zaman</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metod</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Süre</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bellek</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPU</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {metrics.map((metric) => (
                        <tr key={metric.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {format(parseISO(metric.timestamp), 'HH:mm:ss', { locale: tr })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              metric.method === 'GET' ? 'bg-green-100 text-green-800' :
                              metric.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                              metric.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                              metric.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {metric.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-mono max-w-xs truncate">
                            {metric.endpoint}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(metric.status_code)}`}>
                              {metric.status_code}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${getResponseTimeColor(metric.response_time_ms)}`}>
                            {formatResponseTime(metric.response_time_ms)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {metric.memory_usage_mb ? `${metric.memory_usage_mb.toFixed(1)} MB` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {metric.cpu_usage_percent ? `${metric.cpu_usage_percent.toFixed(1)}%` : '-'}
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
                    <select
                      value={rowsPerPage}
                      onChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                      className="px-2 py-1 border rounded"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">Sayfa {page + 1} / {totalPages || 1}</span>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Endpoints Tab */}
      {activeTab === 'endpoints' && stats?.slowest_endpoints && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İstek Sayısı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ortalama Süre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performans</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.slowest_endpoints.map((ep, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">{ep.endpoint}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ep.count.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${getResponseTimeColor(ep.avg_time)}`}>
                      {formatResponseTime(ep.avg_time)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-32 h-2 bg-gray-200 rounded overflow-hidden">
                        <div
                          className={`h-full ${
                            ep.avg_time < 100 ? 'bg-green-500' :
                            ep.avg_time < 500 ? 'bg-yellow-500' :
                            ep.avg_time < 1000 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, (1000 - ep.avg_time) / 10)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMetricsPage;
