/**
 * AI Dashboard Page
 * 
 * AI kullanım istatistikleri, maliyet izleme ve performans metrikleri.
 * KVKK/GDPR uyumlu - Anonim veriler.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Calendar,
  PieChart,
  ArrowRight,
  Bot,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAIUsageReport,
  getAICostReport,
  getAIErrorReport,
  getFeatureLabel,
} from '@/services/aiAdminService';
import type {
  AIUsageReport,
  AICostReport,
  AIErrorReport,
  AIFeatureUsage,
  AIDailyTrend,
  AIDailyCost,
} from '@/types/ai-admin';

// =============================================================================
// METRIC CARD COMPONENT
// =============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

function MetricCard({ title, value, icon: Icon, trend, subtitle, color = 'blue' }: MetricCardProps) {
  const colors = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    yellow: 'text-yellow-500 bg-yellow-500/10',
    red: 'text-red-500 bg-red-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-lg', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            trend.isPositive ? 'text-green-500' : 'text-red-500'
          )}>
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// =============================================================================
// FEATURE USAGE BAR CHART
// =============================================================================

interface FeatureUsageChartProps {
  data: AIFeatureUsage[];
}

function FeatureUsageChart({ data }: FeatureUsageChartProps) {
  const maxCount = Math.max(...data.map(d => d.request_count));

  return (
    <div className="space-y-3">
      {data.map((feature) => (
        <div key={feature.feature} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{getFeatureLabel(feature.feature)}</span>
            <span className="text-muted-foreground">
              {feature.request_count.toLocaleString()} istek
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(feature.request_count / maxCount) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{feature.token_count.toLocaleString()} token</span>
            <span>{feature.avg_response_time.toFixed(0)}ms ort.</span>
            <span className={cn(
              feature.error_rate > 5 ? 'text-red-500' : 'text-green-500'
            )}>
              {feature.error_rate.toFixed(1)}% hata
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// DAILY TREND CHART (Simple)
// =============================================================================

interface DailyTrendChartProps {
  data: AIDailyTrend[];
  metric: 'requests' | 'tokens' | 'users' | 'errors';
}

function DailyTrendChart({ data, metric }: DailyTrendChartProps) {
  const values = data.map(d => {
    switch (metric) {
      case 'requests': return d.requests;
      case 'tokens': return d.tokens;
      case 'users': return d.unique_users;
      case 'errors': return d.errors;
    }
  });
  
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  return (
    <div className="h-32 flex items-end gap-1">
      {data.slice(-14).map((day, index) => {
        const value = values[data.length - 14 + index] || 0;
        const height = ((value - minValue) / range) * 100;
        
        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(height, 5)}%` }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              className={cn(
                'w-full rounded-t',
                metric === 'errors' ? 'bg-red-500/70' : 'bg-primary/70'
              )}
            />
            <span className="text-[9px] text-muted-foreground -rotate-45 origin-left">
              {new Date(day.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// COST CHART
// =============================================================================

interface CostChartProps {
  data: AIDailyCost[];
  budget: { daily_limit_usd: number };
}

function CostChart({ data, budget }: CostChartProps) {
  const maxCost = Math.max(...data.map(d => d.cost_usd), budget.daily_limit_usd);

  return (
    <div className="h-40 flex items-end gap-1 relative">
      {/* Budget line */}
      <div
        className="absolute left-0 right-0 border-t-2 border-dashed border-red-500/50"
        style={{ bottom: `${(budget.daily_limit_usd / maxCost) * 100}%` }}
      >
        <span className="absolute right-0 -top-4 text-xs text-red-500">
          Limit: ${budget.daily_limit_usd}
        </span>
      </div>
      
      {data.slice(-14).map((day, index) => {
        const height = (day.cost_usd / maxCost) * 100;
        const isOverBudget = day.cost_usd > budget.daily_limit_usd;
        
        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(height, 2)}%` }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              className={cn(
                'w-full rounded-t',
                isOverBudget ? 'bg-red-500' : 'bg-green-500/70'
              )}
              title={`$${day.cost_usd.toFixed(2)}`}
            />
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// ERROR SUMMARY COMPONENT
// =============================================================================

interface ErrorSummaryProps {
  data: AIErrorReport;
}

function ErrorSummary({ data }: ErrorSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-2xl font-bold text-red-500">{data.summary.total_errors}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Toplam Hata</p>
        </div>
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="text-2xl font-bold text-yellow-500">{data.summary.total_timeouts}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Timeout</p>
        </div>
      </div>

      {/* Error List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Son Hatalar</h4>
        {data.errors.slice(0, 5).map((error, index) => (
          <div
            key={index}
            className="p-3 rounded-lg border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">{getFeatureLabel(error.feature)}</p>
                <p className="text-xs text-muted-foreground">{error.error_type}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{error.count}x</p>
              <p className="text-xs text-muted-foreground">
                {new Date(error.date).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function AIDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usageReport, setUsageReport] = useState<AIUsageReport | null>(null);
  const [costReport, setCostReport] = useState<AICostReport | null>(null);
  const [errorReport, setErrorReport] = useState<AIErrorReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(30);

  // Fetch all data
  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const [usage, cost, errors] = await Promise.all([
        getAIUsageReport({ days: dateRange }),
        getAICostReport({ days: dateRange }),
        getAIErrorReport({ days: Math.min(dateRange, 30) }),
      ]);

      setUsageReport(usage);
      setCostReport(cost);
      setErrorReport(errors);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format number with K/M suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Format currency
  const formatCurrency = (num: number): string => {
    return '$' + num.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            AI Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            AI kullanım istatistikleri ve maliyet analizi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border bg-background"
          >
            <option value={7}>Son 7 gün</option>
            <option value={14}>Son 14 gün</option>
            <option value={30}>Son 30 gün</option>
            <option value={60}>Son 60 gün</option>
            <option value={90}>Son 90 gün</option>
          </select>
          
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors',
              refreshing && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            Yenile
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* KVKK/GDPR Notice */}
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
        <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-600">KVKK/GDPR Uyumlu Veriler</p>
          <p className="text-xs text-muted-foreground mt-1">
            Bu dashboard'daki tüm veriler anonimleştirilmiştir. 
            Kullanıcı kimlik bilgileri, sorular ve AI yanıtları kaydedilmez.
          </p>
        </div>
      </div>

      {/* Main Metrics */}
      {usageReport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Toplam İstek"
            value={formatNumber(usageReport.summary.total_requests)}
            icon={Zap}
            color="blue"
            subtitle={`${dateRange} günde`}
          />
          <MetricCard
            title="Toplam Token"
            value={formatNumber(usageReport.summary.total_tokens)}
            icon={Bot}
            color="purple"
            subtitle="Kullanılan"
          />
          <MetricCard
            title="Benzersiz Kullanıcı"
            value={formatNumber(usageReport.summary.unique_users)}
            icon={Users}
            color="green"
          />
          <MetricCard
            title="Başarı Oranı"
            value={`${usageReport.summary.success_rate.toFixed(1)}%`}
            icon={CheckCircle}
            color={usageReport.summary.success_rate >= 95 ? 'green' : 'yellow'}
          />
        </div>
      )}

      {/* Cost Metrics */}
      {costReport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Günlük Maliyet"
            value={formatCurrency(costReport.budget.daily_used_usd)}
            icon={DollarSign}
            color={costReport.budget.is_alert_triggered ? 'red' : 'green'}
            subtitle={`/ ${formatCurrency(costReport.budget.daily_limit_usd)} limit`}
            trend={costReport.change_percentage ? {
              value: costReport.change_percentage,
              isPositive: costReport.change_percentage < 0,
            } : undefined}
          />
          <MetricCard
            title="Aylık Maliyet"
            value={formatCurrency(costReport.budget.monthly_used_usd)}
            icon={Calendar}
            color={costReport.budget.monthly_utilization_percent > 80 ? 'yellow' : 'green'}
            subtitle={`/ ${formatCurrency(costReport.budget.monthly_limit_usd)} limit`}
          />
          <MetricCard
            title="Günlük Kullanım"
            value={`${costReport.budget.daily_utilization_percent.toFixed(0)}%`}
            icon={PieChart}
            color={costReport.budget.daily_utilization_percent > 80 ? 'yellow' : 'blue'}
          />
          <MetricCard
            title="Ort. İstek Maliyeti"
            value={formatCurrency(costReport.current_period.cost_per_request)}
            icon={TrendingUp}
            color="blue"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Usage Trend */}
        {usageReport && (
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Günlük Kullanım Trendi
            </h3>
            <DailyTrendChart data={usageReport.daily_trend} metric="requests" />
          </div>
        )}

        {/* Cost Trend */}
        {costReport && (
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Günlük Maliyet
            </h3>
            <CostChart data={costReport.daily_costs} budget={costReport.budget} />
          </div>
        )}
      </div>

      {/* Feature Usage & Errors */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Feature Usage */}
        {usageReport && (
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Özellik Kullanımı
            </h3>
            <FeatureUsageChart data={usageReport.by_feature} />
          </div>
        )}

        {/* Error Summary */}
        {errorReport && (
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Hata Özeti
            </h3>
            <ErrorSummary data={errorReport} />
          </div>
        )}
      </div>

      {/* Optimization Suggestions */}
      {costReport && costReport.optimization_suggestions.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-green-500" />
            Maliyet Optimizasyon Önerileri
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {costReport.optimization_suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">{suggestion.title}</h4>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    suggestion.implementation_difficulty === 'easy' ? 'bg-green-500/20 text-green-500' :
                    suggestion.implementation_difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-red-500/20 text-red-500'
                  )}>
                    {suggestion.implementation_difficulty === 'easy' ? 'Kolay' :
                     suggestion.implementation_difficulty === 'medium' ? 'Orta' : 'Zor'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{suggestion.description}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-sm font-medium text-green-500">
                    ~{suggestion.potential_savings_percent}% tasarruf
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Period Info */}
      {usageReport && (
        <div className="text-center text-sm text-muted-foreground">
          Veri Dönemi: {new Date(usageReport.period.start_date).toLocaleDateString('tr-TR')} - {new Date(usageReport.period.end_date).toLocaleDateString('tr-TR')}
        </div>
      )}
    </div>
  );
}
