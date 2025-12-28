/**
 * Live Session Card Component
 * 
 * Canlı ders kartı.
 */

import React from 'react';
import type { LiveSession } from '@/types/liveSession';

interface LiveSessionCardProps {
  session: LiveSession;
  onJoin?: () => void;
  onRegister?: () => void;
  onView?: () => void;
  showActions?: boolean;
}

export function LiveSessionCard({
  session,
  onJoin,
  onRegister,
  onView,
  showActions = true,
}: LiveSessionCardProps) {
  const getStatusBadge = () => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Taslak' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Planlandı' },
      live: { bg: 'bg-red-100', text: 'text-red-700', label: '🔴 Canlı' },
      ended: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Bitti' },
      cancelled: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'İptal' },
    };
    const badge = badges[session.status] || badges.scheduled;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPlatformIcon = () => {
    const icons: Record<string, string> = {
      zoom: '📹',
      google_meet: '🎥',
      microsoft_teams: '👥',
      jitsi: '🎦',
      webex: '📺',
      custom: '🔗',
    };
    return icons[session.platform] || '📹';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntilStart = () => {
    if (!session.minutes_until_start || session.minutes_until_start <= 0) {
      return null;
    }

    const minutes = session.minutes_until_start;
    if (minutes < 60) {
      return `${minutes} dakika sonra`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} saat sonra`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} gün sonra`;
    }
  };

  const timeUntil = getTimeUntilStart();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getPlatformIcon()}</span>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                {session.title}
              </h3>
              <p className="text-sm text-gray-500">{session.course_name}</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Date & Time */}
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <span>{formatDate(session.scheduled_start)}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <ClockIcon className="w-4 h-4 mr-2" />
          <span>
            {formatTime(session.scheduled_start)} - {formatTime(session.scheduled_end)}
          </span>
          <span className="ml-2 text-gray-400">({session.duration_minutes} dk)</span>
        </div>

        {/* Time Until Start */}
        {timeUntil && session.status === 'scheduled' && (
          <div className="flex items-center text-sm text-blue-600">
            <span className="animate-pulse mr-2">⏰</span>
            {timeUntil}
          </div>
        )}

        {/* Host */}
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <UserIcon className="w-4 h-4 mr-2" />
          <span>{session.host_name}</span>
        </div>

        {/* Participants */}
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <UsersIcon className="w-4 h-4 mr-2" />
          <span>
            {session.participant_count}
            {session.max_participants && ` / ${session.max_participants}`} katılımcı
          </span>
        </div>

        {/* Description */}
        {session.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{session.description}</p>
        )}

        {/* Recording Available */}
        {session.status === 'ended' && session.recording_url && (
          <div className="flex items-center text-sm text-green-600">
            <VideoIcon className="w-4 h-4 mr-2" />
            <span>Kayıt mevcut</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="px-4 pb-4 flex space-x-2">
          {session.status === 'live' && session.is_joinable_now && (
            <button
              onClick={onJoin}
              className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center"
            >
              <span className="animate-pulse mr-2">🔴</span>
              Katıl
            </button>
          )}

          {session.status === 'scheduled' && session.is_joinable_now && (
            <button
              onClick={onJoin}
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Derse Gir
            </button>
          )}

          {session.status === 'scheduled' && !session.is_joinable_now && (
            <button
              onClick={onRegister}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Kayıt Ol
            </button>
          )}

          {session.status === 'ended' && session.recording_url && (
            <button
              onClick={onView}
              className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Kaydı İzle
            </button>
          )}

          <button
            onClick={onView}
            className="py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Detay
          </button>
        </div>
      )}
    </div>
  );
}

// Icons
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

export default LiveSessionCard;
