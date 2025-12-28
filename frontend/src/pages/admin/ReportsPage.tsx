/**
 * Reports Page
 * Raporlar sayfası (Admin)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Award,
  DollarSign,
  Download,
  Calendar,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock report data
const STATS = [
  {
    title: 'Toplam Kullanıcı',
    value: '1,280',
    change: '+12%',
    trend: 'up',
    icon: Users,
    color: 'bg-blue-500',
  },
  {
    title: 'Aktif Kurs',
    value: '45',
    change: '+5%',
    trend: 'up',
    icon: BookOpen,
    color: 'bg-green-500',
  },
  {
    title: 'Verilen Sertifika',
    value: '320',
    change: '+23%',
    trend: 'up',
    icon: Award,
    color: 'bg-purple-500',
  },
  {
    title: 'Aylık Gelir',
    value: '₺85,420',
    change: '-3%',
    trend: 'down',
    icon: DollarSign,
    color: 'bg-yellow-500',
  },
];

const COURSE_STATS = [
  { name: 'React ile Modern Web', enrolled: 450, completed: 280, rating: 4.8 },
  { name: 'Python Veri Bilimi', enrolled: 380, completed: 220, rating: 4.9 },
  { name: 'Node.js Backend', enrolled: 290, completed: 150, rating: 4.7 },
  { name: 'UI/UX Tasarım', enrolled: 260, completed: 180, rating: 4.6 },
  { name: 'Flutter Mobil', enrolled: 220, completed: 90, rating: 4.7 },
];

const MONTHLY_DATA = [
  { month: 'Oca', users: 120, revenue: 45000 },
  { month: 'Şub', users: 150, revenue: 52000 },
  { month: 'Mar', users: 180, revenue: 58000 },
  { month: 'Nis', users: 220, revenue: 65000 },
  { month: 'May', users: 260, revenue: 72000 },
  { month: 'Haz', users: 310, revenue: 85420 },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('month');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Raporlar ve Analizler</h1>
          <p className="text-muted-foreground mt-1">
            Sistem performansını ve metrikleri analiz edin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-lg p-1">
            {['week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  'px-3 py-1 rounded text-sm transition-colors',
                  dateRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {range === 'week' ? 'Hafta' : range === 'month' ? 'Ay' : 'Yıl'}
              </button>
            ))}
          </div>
          <button
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'border hover:bg-muted transition-colors'
            )}
          >
            <Download className="h-4 w-4" />
            Rapor İndir
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <div className={cn(
                  'flex items-center gap-1 mt-2 text-sm',
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                )}>
                  {stat.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {stat.change} bu ay
                </div>
              </div>
              <div className={cn('p-3 rounded-lg', stat.color)}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Kullanıcı Büyümesi</h3>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="h-64 flex items-end gap-2">
            {MONTHLY_DATA.map((data, index) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-primary/20 rounded-t relative group"
                  style={{ height: `${(data.users / 350) * 100}%` }}
                >
                  <div
                    className="absolute bottom-0 w-full bg-primary rounded-t transition-all"
                    style={{ height: `${(data.users / 350) * 100}%` }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {data.users} kullanıcı
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{data.month}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Gelir Analizi</h3>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="h-64 flex items-end gap-2">
            {MONTHLY_DATA.map((data) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-green-500/20 rounded-t relative group"
                  style={{ height: `${(data.revenue / 100000) * 100}%` }}
                >
                  <div
                    className="absolute bottom-0 w-full bg-green-500 rounded-t transition-all"
                    style={{ height: `${(data.revenue / 100000) * 100}%` }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ₺{data.revenue.toLocaleString()}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{data.month}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Course Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card overflow-hidden"
      >
        <div className="p-4 border-b">
          <h3 className="font-semibold">Kurs Performansı</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="table-cell text-left">Kurs Adı</th>
                <th className="table-cell text-center">Kayıt</th>
                <th className="table-cell text-center">Tamamlama</th>
                <th className="table-cell text-center">Oran</th>
                <th className="table-cell text-center">Puan</th>
                <th className="table-cell text-center">Performans</th>
              </tr>
            </thead>
            <tbody>
              {COURSE_STATS.map((course, index) => {
                const completionRate = Math.round((course.completed / course.enrolled) * 100);
                return (
                  <tr key={index} className="table-row">
                    <td className="table-cell font-medium">{course.name}</td>
                    <td className="table-cell text-center">{course.enrolled}</td>
                    <td className="table-cell text-center">{course.completed}</td>
                    <td className="table-cell text-center">%{completionRate}</td>
                    <td className="table-cell text-center">
                      <span className="flex items-center justify-center gap-1">
                        ⭐ {course.rating}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="w-full max-w-24 mx-auto">
                        <div className="progress">
                          <div
                            className={cn(
                              'progress-bar',
                              completionRate >= 70 ? 'bg-green-500' : completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quick Reports */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: 'Kullanıcı Raporu', description: 'Kullanıcı aktivitesi ve demografik bilgiler', icon: Users },
          { title: 'Kurs Raporu', description: 'Kurs performansı ve tamamlama oranları', icon: BookOpen },
          { title: 'Finansal Rapor', description: 'Gelir ve gider analizi', icon: DollarSign },
        ].map((report, index) => (
          <motion.button
            key={report.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.05 }}
            className="card p-4 text-left hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <report.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{report.title}</h4>
                <p className="text-sm text-muted-foreground mt-0.5">{report.description}</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
