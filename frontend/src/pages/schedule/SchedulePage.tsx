/**
 * Schedule Page
 * Program/takvim sayfası
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Video,
  BookOpen,
  FileQuestion,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock schedule data
const SCHEDULE_ITEMS = [
  {
    id: 1,
    title: 'React Hooks Dersi',
    type: 'lesson',
    course: 'React ile Modern Web',
    time: '09:00 - 10:30',
    location: 'Online',
    instructor: 'Ahmet Yılmaz',
    date: '2024-01-22',
  },
  {
    id: 2,
    title: 'Python Quiz',
    type: 'exam',
    course: 'Python ile Veri Bilimi',
    time: '11:00 - 12:00',
    location: 'Online',
    date: '2024-01-22',
  },
  {
    id: 3,
    title: 'Grup Çalışması',
    type: 'meeting',
    course: 'Node.js Backend',
    time: '14:00 - 15:30',
    location: 'Zoom',
    date: '2024-01-22',
  },
  {
    id: 4,
    title: 'UI/UX Workshop',
    type: 'workshop',
    course: 'UI/UX Tasarım',
    time: '10:00 - 12:00',
    location: 'Online',
    instructor: 'Zeynep Aksoy',
    date: '2024-01-23',
  },
  {
    id: 5,
    title: 'Ara Sınav',
    type: 'exam',
    course: 'React ile Modern Web',
    time: '14:00 - 16:00',
    location: 'Kampüs A-201',
    date: '2024-01-24',
  },
];

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lesson':
        return BookOpen;
      case 'exam':
        return FileQuestion;
      case 'meeting':
        return Users;
      case 'workshop':
        return Video;
      default:
        return Calendar;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lesson':
        return 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'exam':
        return 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'meeting':
        return 'bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'workshop':
        return 'bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lesson':
        return 'Ders';
      case 'exam':
        return 'Sınav';
      case 'meeting':
        return 'Toplantı';
      case 'workshop':
        return 'Workshop';
      default:
        return type;
    }
  };

  // Generate week days
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  };

  const weekDays = getWeekDays();

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const selectedDateStr = formatDate(selectedDate);
  const todayEvents = SCHEDULE_ITEMS.filter((item) => item.date === selectedDateStr);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Program</h1>
          <p className="text-muted-foreground mt-1">
            Ders, sınav ve etkinlik takviminiz
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1">
            {['week', 'month'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as 'week' | 'month')}
                className={cn(
                  'px-3 py-1 rounded text-sm transition-colors',
                  view === v
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {v === 'week' ? 'Hafta' : 'Ay'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="card p-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="font-semibold">
                {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {DAYS.map((day, index) => (
                <div key={day} className="text-center text-sm text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Week Dates */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((date) => {
                const dateStr = formatDate(date);
                const hasEvents = SCHEDULE_ITEMS.some((item) => item.date === dateStr);
                const isSelected = dateStr === selectedDateStr;
                const isToday = dateStr === formatDate(new Date());

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'p-4 rounded-lg text-center transition-all relative',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : isToday
                          ? 'bg-primary/10 hover:bg-primary/20'
                          : 'hover:bg-muted'
                    )}
                  >
                    <span className="text-lg font-medium">{date.getDate()}</span>
                    {hasEvents && !isSelected && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Day Events */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <h3 className="font-semibold mb-4">
              {selectedDate.toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>

            {todayEvents.length > 0 ? (
              <div className="space-y-3">
                {todayEvents.map((event, index) => {
                  const Icon = getTypeIcon(event.type);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-3 rounded-lg border-l-4',
                        getTypeColor(event.type)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm opacity-80">{event.course}</p>
                          <div className="flex items-center gap-3 mt-2 text-sm opacity-70">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Bu gün için etkinlik yok</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="card p-4">
        <h3 className="font-semibold mb-4">Yaklaşan Etkinlikler</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCHEDULE_ITEMS.slice(0, 6).map((event, index) => {
            const Icon = getTypeIcon(event.type);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('badge', getTypeColor(event.type))}>
                    {getTypeLabel(event.type)}
                  </span>
                </div>
                <h4 className="font-medium">{event.title}</h4>
                <p className="text-sm text-muted-foreground">{event.course}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(event.date).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {event.time.split(' - ')[0]}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
