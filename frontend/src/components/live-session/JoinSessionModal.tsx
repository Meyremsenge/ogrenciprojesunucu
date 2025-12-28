/**
 * Join Session Modal Component
 * 
 * Canlı derse katılım modalı.
 */

import React, { useState, useEffect } from 'react';
import { checkAccess, getJoinInfo, registerForSession } from '@/services/liveSessionService';
import type { LiveSession, JoinInfo, AccessCheckResult } from '@/types/liveSession';

interface JoinSessionModalProps {
  session: LiveSession;
  isOpen: boolean;
  onClose: () => void;
}

export function JoinSessionModal({ session, isOpen, onClose }: JoinSessionModalProps) {
  const [loading, setLoading] = useState(true);
  const [accessCheck, setAccessCheck] = useState<AccessCheckResult | null>(null);
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkUserAccess();
    }
  }, [isOpen, session.id]);

  const checkUserAccess = async () => {
    setLoading(true);
    setError(null);
    try {
      const access = await checkAccess(session.id);
      setAccessCheck(access);

      if (access.can_access && session.is_joinable_now) {
        const info = await getJoinInfo(session.id);
        setJoinInfo(info);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erişim kontrol edilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await registerForSession(session.id);
      await checkUserAccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kayıt yapılamadı');
    } finally {
      setRegistering(false);
    }
  };

  const handleJoin = () => {
    if (joinInfo?.meeting_url) {
      window.open(joinInfo.meeting_url, '_blank');
    }
  };

  const getPlatformName = (platform: string) => {
    const names: Record<string, string> = {
      zoom: 'Zoom',
      google_meet: 'Google Meet',
      microsoft_teams: 'Microsoft Teams',
      jitsi: 'Jitsi Meet',
      webex: 'Webex',
      custom: 'Özel Platform',
    };
    return names[platform] || platform;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Canlı Derse Katıl
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-500 mb-4">
                  <XCircleIcon className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={checkUserAccess}
                  className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700"
                >
                  Tekrar Dene
                </button>
              </div>
            ) : accessCheck && !accessCheck.can_access ? (
              <div className="text-center py-8">
                <div className="text-yellow-500 mb-4">
                  <ExclamationIcon className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {accessCheck.reason}
                </p>
                {!accessCheck.is_registered && session.status === 'scheduled' && (
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {registering ? 'Kaydediliyor...' : 'Kayıt Ol'}
                  </button>
                )}
              </div>
            ) : joinInfo ? (
              <div className="space-y-4">
                {/* Session Info */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {session.title}
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>Platform: {getPlatformName(joinInfo.platform)}</p>
                    {joinInfo.meeting_id && (
                      <p>
                        Meeting ID:{' '}
                        <span className="font-mono">{joinInfo.meeting_id}</span>
                      </p>
                    )}
                    {joinInfo.meeting_password && (
                      <p>
                        Şifre:{' '}
                        <span className="font-mono">{joinInfo.meeting_password}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Status */}
                {session.status === 'live' && (
                  <div className="flex items-center justify-center text-red-600 bg-red-50 rounded-lg p-3">
                    <span className="animate-pulse mr-2">🔴</span>
                    <span className="font-medium">Ders şu an yayında!</span>
                  </div>
                )}

                {session.status === 'scheduled' && session.is_joinable_now && (
                  <div className="flex items-center justify-center text-green-600 bg-green-50 rounded-lg p-3">
                    <span className="mr-2">✅</span>
                    <span className="font-medium">Derse katılabilirsiniz</span>
                  </div>
                )}

                {/* Join Button */}
                <button
                  onClick={handleJoin}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-lg flex items-center justify-center"
                >
                  <VideoIcon className="w-5 h-5 mr-2" />
                  Derse Katıl
                </button>

                {/* Copy Link */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(joinInfo.meeting_url);
                    alert('Link kopyalandı!');
                  }}
                  className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                >
                  <ClipboardIcon className="w-5 h-5 mr-2" />
                  Linki Kopyala
                </button>

                {/* Instructions */}
                <div className="text-sm text-gray-500 bg-blue-50 rounded-lg p-3">
                  <p className="font-medium text-blue-700 mb-1">💡 İpucu</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-600">
                    <li>Mikrofonunuzu kapatarak katılın</li>
                    <li>Kameranızın açık olduğundan emin olun</li>
                    <li>Sessiz bir ortamda olun</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Derse katılım bilgisi alınamadı
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  );
}

export default JoinSessionModal;
