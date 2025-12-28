/**
 * Teacher Calendar Management Page
 * ═══════════════════════════════════════════════════════════════════════════════
 * Öğretmenler için takvim ve etkinlik yönetimi
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  BookOpen,
  FileQuestion,
  Edit2,
  Trash2,
  X,
  Save,
  Bell,
  Repeat,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  type: 'lesson' | 'exam' | 'meeting' | 'live_class' | 'office_hours' | 'deadline';
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  courseId?: number;
  courseName?: string;
  participants?: number;
  color?: string;
  reminder?: number; // minutes before
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 1,
    title: 'React Hooks Dersi',
    description: 'useState ve useEffect konuları',
    type: 'lesson',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:30',
    location: 'Online',
    isOnline: true,
    meetingUrl: 'https://meet.example.com/react-hooks',
    courseId: 1,
    courseName: 'React ile Modern Web',
    participants: 25,
    reminder: 30,
  },
  {
    id: 2,
    title: 'Öğrenci Danışmanlık Saati',
    description: 'Bire bir görüşmeler',
    type: 'office_hours',
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '16:00',
    isOnline: true,
    meetingUrl: 'https://meet.example.com/office',
    isRecurring: true,
    recurringPattern: 'weekly',
  },
  {
    id: 3,
    title: 'Ara Sınav',
    type: 'exam',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '12:00',
    location: 'A-201',
    isOnline: false,
    courseId: 1,
    courseName: 'React ile Modern Web',
    participants: 45,
    reminder: 60,
  },
  {
    id: 4,
    title: 'Canlı Ders - Node.js',
    type: 'live_class',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '15:00',
    endTime: '17:00',
    isOnline: true,
    meetingUrl: 'https://meet.example.com/nodejs',
    courseId: 2,
    courseName: 'Node.js Backend',
    participants: 30,
  },
  {
    id: 5,
    title: 'Ödev Teslim Tarihi',
    type: 'deadline',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '23:59',
    endTime: '23:59',
    isOnline: false,
    courseId: 1,
    courseName: 'React ile Modern Web',
  },
];

const EVENT_TYPES = [
  { value: 'lesson', label: 'Ders', icon: BookOpen, color: 'bg-blue-500' },
  { value: 'exam', label: 'Sınav', icon: FileQuestion, color: 'bg-red-500' },
  { value: 'live_class', label: 'Canlı Ders', icon: Video, color: 'bg-purple-500' },
  { value: 'meeting', label: 'Toplantı', icon: Users, color: 'bg-green-500' },
  { value: 'office_hours', label: 'Danışmanlık', icon: GraduationCap, color: 'bg-amber-500' },
  { value: 'deadline', label: 'Son Tarih', icon: Bell, color: 'bg-orange-500' },
];

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function CalendarManagementPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState<CalendarEvent | null>(null);

  // New event form state
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: 'lesson',
    isOnline: true,
    reminder: 30,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Calendar Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    const days: (Date | null)[] = [];
    
    // Previous month days
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter(event => event.date === dateStr);
  };

  const getEventTypeInfo = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatDateStr = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddEvent = () => {
    setEditingEvent(null);
    setNewEvent({
      type: 'lesson',
      isOnline: true,
      reminder: 30,
      date: selectedDate || formatDateStr(new Date()),
    });
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setNewEvent(event);
    setShowEventModal(true);
    setShowEventDetails(null);
  };

  const handleDeleteEvent = (eventId: number) => {
    if (confirm('Bu etkinliği silmek istediğinize emin misiniz?')) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setShowEventDetails(null);
    }
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.startTime || !newEvent.endTime) {
      alert('Lütfen zorunlu alanları doldurun');
      return;
    }

    if (editingEvent) {
      // Update existing
      setEvents(prev => prev.map(e => 
        e.id === editingEvent.id ? { ...e, ...newEvent } as CalendarEvent : e
      ));
    } else {
      // Create new
      const event: CalendarEvent = {
        ...newEvent,
        id: Date.now(),
      } as CalendarEvent;
      setEvents(prev => [...prev, event]);
    }

    setShowEventModal(false);
    setEditingEvent(null);
    setNewEvent({ type: 'lesson', isOnline: true, reminder: 30 });
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatDateStr(date);
    setSelectedDate(dateStr);
    
    const dayEvents = getEventsForDate(dateStr);
    if (dayEvents.length === 0) {
      setNewEvent(prev => ({ ...prev, date: dateStr }));
      setShowEventModal(true);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);
  
  const upcomingEvents = useMemo(() => {
    const today = formatDateStr(new Date());
    return events
      .filter(e => e.date >= today)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5);
  }, [events]);

  const stats = useMemo(() => {
    const today = formatDateStr(new Date());
    const thisMonth = currentDate.toISOString().slice(0, 7);
    
    return {
      totalEvents: events.filter(e => e.date.startsWith(thisMonth)).length,
      upcomingLessons: events.filter(e => e.date >= today && e.type === 'lesson').length,
      upcomingExams: events.filter(e => e.date >= today && e.type === 'exam').length,
      liveClasses: events.filter(e => e.date >= today && e.type === 'live_class').length,
    };
  }, [events, currentDate]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Takvim Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Derslerinizi, sınavlarınızı ve etkinliklerinizi planlayın
          </p>
        </div>
        <Button onClick={handleAddEvent} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Etkinlik
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Bu Ay Etkinlik', value: stats.totalEvents, icon: Calendar, color: 'text-blue-500' },
          { label: 'Yaklaşan Ders', value: stats.upcomingLessons, icon: BookOpen, color: 'text-green-500' },
          { label: 'Yaklaşan Sınav', value: stats.upcomingExams, icon: FileQuestion, color: 'text-red-500' },
          { label: 'Canlı Ders', value: stats.liveClasses, icon: Video, color: 'text-purple-500' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-card border rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('month')}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  view === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                Ay
              </button>
              <button
                onClick={() => setView('week')}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  view === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                Hafta
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {DAYS.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const dateStr = formatDateStr(date);
              const dayEvents = getEventsForDate(dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <motion.button
                  key={dateStr}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDateClick(date)}
                  className={cn(
                    'aspect-square p-1 rounded-lg border transition-all relative',
                    'hover:border-primary hover:bg-primary/5',
                    isToday(date) && 'ring-2 ring-primary ring-offset-2',
                    isSelected && 'bg-primary/10 border-primary',
                    dayEvents.length > 0 && 'bg-muted/50'
                  )}
                >
                  <span className={cn(
                    'text-sm',
                    isToday(date) && 'font-bold text-primary'
                  )}>
                    {date.getDate()}
                  </span>
                  
                  {/* Event Indicators */}
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event, i) => {
                        const typeInfo = getEventTypeInfo(event.type);
                        return (
                          <div
                            key={i}
                            className={cn('w-1.5 h-1.5 rounded-full', typeInfo.color)}
                          />
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Selected Date Events */}
          {selectedDate && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {new Date(selectedDate).toLocaleDateString('tr-TR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </h3>
                <Button size="sm" variant="outline" onClick={handleAddEvent}>
                  <Plus className="h-4 w-4 mr-1" />
                  Etkinlik Ekle
                </Button>
              </div>
              
              <div className="space-y-2">
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Bu tarihte etkinlik yok
                  </p>
                ) : (
                  getEventsForDate(selectedDate).map(event => {
                    const typeInfo = getEventTypeInfo(event.type);
                    const TypeIcon = typeInfo.icon;
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer',
                          'hover:bg-muted/50 transition-colors'
                        )}
                        onClick={() => setShowEventDetails(event)}
                      >
                        <div className={cn('p-2 rounded-lg', typeInfo.color, 'text-white')}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.startTime} - {event.endTime}
                            {event.courseName && ` • ${event.courseName}`}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                            className="p-1.5 hover:bg-muted rounded"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Upcoming Events */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Yaklaşan Etkinlikler
            </h3>
            
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Yaklaşan etkinlik yok
                </p>
              ) : (
                upcomingEvents.map(event => {
                  const typeInfo = getEventTypeInfo(event.type);
                  const TypeIcon = typeInfo.icon;
                  const eventDate = new Date(event.date);
                  
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setShowEventDetails(event)}
                    >
                      <div className={cn('p-2 rounded-lg', typeInfo.color, 'text-white shrink-0')}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {eventDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          {' • '}
                          {event.startTime}
                        </p>
                        {event.courseName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {event.courseName}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Hızlı Ekle</h3>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map(type => {
                const TypeIcon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => {
                      setNewEvent({
                        type: type.value as CalendarEvent['type'],
                        isOnline: true,
                        reminder: 30,
                        date: formatDateStr(new Date()),
                      });
                      setShowEventModal(true);
                    }}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border',
                      'hover:bg-muted/50 transition-colors text-left'
                    )}
                  >
                    <div className={cn('p-1.5 rounded', type.color, 'text-white')}>
                      <TypeIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Renk Kodları</h3>
            <div className="space-y-2">
              {EVENT_TYPES.map(type => {
                const TypeIcon = type.icon;
                return (
                  <div key={type.value} className="flex items-center gap-2 text-sm">
                    <div className={cn('w-3 h-3 rounded-full', type.color)} />
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{type.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {editingEvent ? 'Etkinliği Düzenle' : 'Yeni Etkinlik'}
                  </h2>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Event Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Etkinlik Türü</label>
                    <div className="grid grid-cols-3 gap-2">
                      {EVENT_TYPES.map(type => {
                        const TypeIcon = type.icon;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setNewEvent(prev => ({ ...prev, type: type.value as CalendarEvent['type'] }))}
                            className={cn(
                              'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                              newEvent.type === type.value 
                                ? 'border-primary bg-primary/10' 
                                : 'hover:bg-muted'
                            )}
                          >
                            <div className={cn('p-2 rounded-lg', type.color, 'text-white')}>
                              <TypeIcon className="h-4 w-4" />
                            </div>
                            <span className="text-xs">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Başlık *</label>
                    <Input
                      value={newEvent.title || ''}
                      onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Etkinlik başlığı"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Açıklama</label>
                    <textarea
                      value={newEvent.description || ''}
                      onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Etkinlik açıklaması (isteğe bağlı)"
                      className="w-full px-3 py-2 border rounded-lg bg-background resize-none h-20"
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Tarih *</label>
                      <Input
                        type="date"
                        value={newEvent.date || ''}
                        onChange={e => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Başlangıç *</label>
                      <Input
                        type="time"
                        value={newEvent.startTime || ''}
                        onChange={e => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Bitiş *</label>
                      <Input
                        type="time"
                        value={newEvent.endTime || ''}
                        onChange={e => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newEvent.isOnline}
                        onChange={e => setNewEvent(prev => ({ ...prev, isOnline: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Online Etkinlik</span>
                    </label>
                  </div>

                  {newEvent.isOnline ? (
                    <div>
                      <label className="block text-sm font-medium mb-2">Toplantı Linki</label>
                      <Input
                        value={newEvent.meetingUrl || ''}
                        onChange={e => setNewEvent(prev => ({ ...prev, meetingUrl: e.target.value }))}
                        placeholder="https://meet.example.com/..."
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-2">Konum</label>
                      <Input
                        value={newEvent.location || ''}
                        onChange={e => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Ör: A-201, Konferans Salonu"
                      />
                    </div>
                  )}

                  {/* Course */}
                  <div>
                    <label className="block text-sm font-medium mb-2">İlişkili Kurs</label>
                    <select
                      value={newEvent.courseName || ''}
                      onChange={e => setNewEvent(prev => ({ ...prev, courseName: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value="">Kurs seçin (isteğe bağlı)</option>
                      <option value="React ile Modern Web">React ile Modern Web</option>
                      <option value="Node.js Backend">Node.js Backend</option>
                      <option value="Python ile Veri Bilimi">Python ile Veri Bilimi</option>
                    </select>
                  </div>

                  {/* Reminder */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Hatırlatıcı</label>
                    <select
                      value={newEvent.reminder || 30}
                      onChange={e => setNewEvent(prev => ({ ...prev, reminder: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value={0}>Hatırlatma yok</option>
                      <option value={15}>15 dakika önce</option>
                      <option value={30}>30 dakika önce</option>
                      <option value={60}>1 saat önce</option>
                      <option value={1440}>1 gün önce</option>
                    </select>
                  </div>

                  {/* Recurring */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newEvent.isRecurring}
                        onChange={e => setNewEvent(prev => ({ ...prev, isRecurring: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Tekrarlayan Etkinlik</span>
                    </label>
                    
                    {newEvent.isRecurring && (
                      <select
                        value={newEvent.recurringPattern || 'weekly'}
                        onChange={e => setNewEvent(prev => ({ ...prev, recurringPattern: e.target.value as any }))}
                        className="px-3 py-1 border rounded-lg bg-background text-sm"
                      >
                        <option value="daily">Günlük</option>
                        <option value="weekly">Haftalık</option>
                        <option value="monthly">Aylık</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowEventModal(false)}
                  >
                    İptal
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleSaveEvent}>
                    <Save className="h-4 w-4" />
                    {editingEvent ? 'Güncelle' : 'Kaydet'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Details Modal */}
      <AnimatePresence>
        {showEventDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEventDetails(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="p-6">
                {(() => {
                  const typeInfo = getEventTypeInfo(showEventDetails.type);
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <>
                      <div className="flex items-start gap-4 mb-6">
                        <div className={cn('p-3 rounded-xl', typeInfo.color, 'text-white')}>
                          <TypeIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-xl font-semibold">{showEventDetails.title}</h2>
                          <p className="text-sm text-muted-foreground">{typeInfo.label}</p>
                        </div>
                        <button
                          onClick={() => setShowEventDetails(null)}
                          className="p-2 hover:bg-muted rounded-lg"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {showEventDetails.description && (
                          <p className="text-muted-foreground">{showEventDetails.description}</p>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {new Date(showEventDetails.date).toLocaleDateString('tr-TR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{showEventDetails.startTime} - {showEventDetails.endTime}</span>
                          </div>

                          {(showEventDetails.location || showEventDetails.isOnline) && (
                            <div className="flex items-center gap-3 text-sm">
                              {showEventDetails.isOnline ? (
                                <>
                                  <Video className="h-4 w-4 text-muted-foreground" />
                                  <span>Online</span>
                                </>
                              ) : (
                                <>
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{showEventDetails.location}</span>
                                </>
                              )}
                            </div>
                          )}

                          {showEventDetails.courseName && (
                            <div className="flex items-center gap-3 text-sm">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              <span>{showEventDetails.courseName}</span>
                            </div>
                          )}

                          {showEventDetails.participants && (
                            <div className="flex items-center gap-3 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{showEventDetails.participants} katılımcı</span>
                            </div>
                          )}

                          {showEventDetails.isRecurring && (
                            <div className="flex items-center gap-3 text-sm">
                              <Repeat className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {showEventDetails.recurringPattern === 'daily' && 'Her gün'}
                                {showEventDetails.recurringPattern === 'weekly' && 'Her hafta'}
                                {showEventDetails.recurringPattern === 'monthly' && 'Her ay'}
                              </span>
                            </div>
                          )}
                        </div>

                        {showEventDetails.meetingUrl && (
                          <a
                            href={showEventDetails.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <Video className="h-4 w-4" />
                            Toplantıya Katıl
                          </a>
                        )}
                      </div>

                      <div className="flex gap-3 mt-6 pt-6 border-t">
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => handleEditEvent(showEventDetails)}
                        >
                          <Edit2 className="h-4 w-4" />
                          Düzenle
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 gap-2"
                          onClick={() => handleDeleteEvent(showEventDetails.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Sil
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
