/**
 * Notifications Page
 * Bildirimler sayfası
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  BookOpen,
  Award,
  MessageSquare,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock notifications
const NOTIFICATIONS = [
  {
    id: 1,
    type: 'course',
    title: 'Yeni Ders Eklendi',
    message: 'React ile Modern Web Geliştirme kursuna yeni bir ders eklendi: "Advanced Hooks"',
    time: '5 dakika önce',
    read: false,
  },
  {
    id: 2,
    type: 'achievement',
    title: 'Başarı Kazandınız!',
    message: 'Tebrikler! "İlk Adım" rozetini kazandınız.',
    time: '1 saat önce',
    read: false,
  },
  {
    id: 3,
    type: 'message',
    title: 'Yeni Mesaj',
    message: 'Ahmet Yılmaz size bir mesaj gönderdi.',
    time: '2 saat önce',
    read: true,
  },
  {
    id: 4,
    type: 'alert',
    title: 'Sınav Hatırlatması',
    message: 'React Temelleri sınavınız yarın sona eriyor.',
    time: '3 saat önce',
    read: true,
  },
  {
    id: 5,
    type: 'info',
    title: 'Sistem Bakımı',
    message: 'Planlı bakım: 22 Ocak 02:00 - 04:00 arası sistem erişilemez olacaktır.',
    time: '1 gün önce',
    read: true,
  },
  {
    id: 6,
    type: 'course',
    title: 'Kurs Tamamlandı',
    message: 'Python ile Veri Bilimi kursunu başarıyla tamamladınız!',
    time: '2 gün önce',
    read: true,
  },
];

const FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'unread', label: 'Okunmamış' },
  { key: 'course', label: 'Kurs' },
  { key: 'achievement', label: 'Başarı' },
  { key: 'message', label: 'Mesaj' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unread') return !n.read;
    return n.type === selectedFilter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'course':
        return BookOpen;
      case 'achievement':
        return Award;
      case 'message':
        return MessageSquare;
      case 'alert':
        return AlertCircle;
      default:
        return Info;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'course':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'achievement':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'message':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'alert':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bildirimler</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} okunmamış bildiriminiz var`
              : 'Tüm bildirimlerinizi okudunuz'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'border hover:bg-muted transition-colors'
            )}
          >
            <CheckCheck className="h-4 w-4" />
            Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setSelectedFilter(filter.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
              selectedFilter === filter.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {filter.label}
            {filter.key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-destructive text-destructive-foreground text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification, index) => {
          const Icon = getIcon(notification.type);
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                'card p-4 transition-colors',
                !notification.read && 'bg-primary/5 border-primary/20'
              )}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', getIconColor(notification.type))}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={cn('font-medium', !notification.read && 'font-semibold')}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 hover:bg-muted rounded-lg"
                      title="Okundu işaretle"
                    >
                      <Check className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 hover:bg-destructive/10 rounded-lg"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredNotifications.length === 0 && (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Bildirim bulunamadı</h3>
          <p className="text-muted-foreground mt-1">
            {selectedFilter === 'unread'
              ? 'Okunmamış bildiriminiz yok.'
              : 'Bu kategoride bildirim bulunmuyor.'}
          </p>
        </div>
      )}
    </div>
  );
}
