/**
 * Start Live Class Page - Öğretmenler için canlı ders başlatma
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Users,
  Settings,
  Play,
  Calendar,
  Clock,
  BookOpen,
  AlertCircle,
  Loader2,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface LiveClassFormData {
  title: string;
  description: string;
  courseId: number | null;
  maxParticipants: number;
  isRecorded: boolean;
  scheduledAt: string | null; // null = hemen başlat
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function StartLiveClassPage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<LiveClassFormData>({
    title: '',
    description: '',
    courseId: null,
    maxParticipants: 100,
    isRecorded: true,
    scheduledAt: null,
  });
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [startMode, setStartMode] = useState<'now' | 'schedule'>('now');
  const [copied, setCopied] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Kurs listesi (mock)
  const { data: courses } = useQuery({
    queryKey: ['teacherCourses'],
    queryFn: async () => [
      { id: 1, title: 'React ile Modern Web' },
      { id: 2, title: 'Python Veri Bilimi' },
      { id: 3, title: 'JavaScript Fundamentals' },
    ],
  });

  // Kamera aç/kapat
  const toggleCamera = async () => {
    if (isCameraOn) {
      stream?.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraOn(false);
    } else {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: isMicOn,
        });
        setStream(mediaStream);
        setIsCameraOn(true);
      } catch (err) {
        console.error('Kamera erişimi hatası:', err);
      }
    }
  };

  // Mikrofon aç/kapat
  const toggleMic = async () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    } else if (!isMicOn) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        setStream(mediaStream);
        setIsMicOn(true);
      } catch (err) {
        console.error('Mikrofon erişimi hatası:', err);
      }
    }
  };

  // Canlı ders başlat mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      // API call
      const response = await fetch('/api/v1/live-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduled_at: startMode === 'schedule' ? formData.scheduledAt : null,
          start_immediately: startMode === 'now',
        }),
      });
      
      if (!response.ok) throw new Error('Canlı ders oluşturulamadı');
      return response.json();
    },
    onSuccess: (data) => {
      if (startMode === 'now') {
        navigate(`/live/${data.id}/host`);
      } else {
        navigate('/live');
      }
    },
  });

  // Meeting linki kopyala
  const copyMeetingLink = () => {
    navigator.clipboard.writeText('https://example.com/live/abc123');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Canlı Ders Başlat</h1>
          <p className="text-muted-foreground">
            Öğrencilerinizle canlı bir ders oturumu başlatın
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          İptal
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sol Panel - Önizleme */}
        <div className="space-y-4">
          {/* Video Önizleme */}
          <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative">
            {isCameraOn && stream ? (
              <video
                autoPlay
                muted
                playsInline
                ref={(video) => {
                  if (video && stream) {
                    video.srcObject = stream;
                  }
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <VideoOff className="h-16 w-16 mb-4" />
                <p>Kamera kapalı</p>
              </div>
            )}

            {/* Overlay Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <button
                onClick={toggleCamera}
                className={cn(
                  'p-3 rounded-full transition-colors',
                  isCameraOn
                    ? 'bg-white text-slate-900'
                    : 'bg-red-500 text-white'
                )}
              >
                {isCameraOn ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </button>
              
              <button
                onClick={toggleMic}
                className={cn(
                  'p-3 rounded-full transition-colors',
                  isMicOn
                    ? 'bg-white text-slate-900'
                    : 'bg-red-500 text-white'
                )}
              >
                {isMicOn ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Cihaz Ayarları */}
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Cihaz Ayarları
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Kamera</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm">
                  <option>Varsayılan Kamera</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Mikrofon</label>
                <select className="w-full bg-muted rounded-lg px-3 py-2 text-sm">
                  <option>Varsayılan Mikrofon</option>
                </select>
              </div>
            </div>

            {/* Ses Seviyesi Göstergesi */}
            {isMicOn && (
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500"
                    animate={{
                      width: ['20%', '60%', '40%', '80%', '30%'],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sağ Panel - Form */}
        <div className="space-y-4">
          {/* Başlatma Modu */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setStartMode('now')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                startMode === 'now'
                  ? 'bg-background shadow text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Play className="h-4 w-4" />
              Şimdi Başlat
            </button>
            <button
              onClick={() => setStartMode('schedule')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                startMode === 'schedule'
                  ? 'bg-background shadow text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Calendar className="h-4 w-4" />
              Planla
            </button>
          </div>

          {/* Form */}
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ders Başlığı *</label>
              <Input
                placeholder="Ör: React Hooks Canlı Ders"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Açıklama</label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Bu derste neler işlenecek..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">İlgili Kurs</label>
                <select
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                  value={formData.courseId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      courseId: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                >
                  <option value="">Kurs seçin (opsiyonel)</option>
                  {courses?.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Maks. Katılımcı</label>
                <Input
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxParticipants: parseInt(e.target.value) || 100,
                    })
                  }
                  leftIcon={<Users className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Planlama */}
            {startMode === 'schedule' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tarih ve Saat</label>
                <Input
                  type="datetime-local"
                  value={formData.scheduledAt || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledAt: e.target.value })
                  }
                  leftIcon={<Clock className="h-4 w-4" />}
                />
              </div>
            )}

            {/* Kayıt Seçeneği */}
            <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRecorded}
                onChange={(e) =>
                  setFormData({ ...formData, isRecorded: e.target.checked })
                }
                className="h-4 w-4 rounded border-muted"
              />
              <div>
                <p className="font-medium text-sm">Dersi kaydet</p>
                <p className="text-xs text-muted-foreground">
                  Kayıt otomatik olarak kurs içeriğine eklenecek
                </p>
              </div>
            </label>

            {/* Meeting Link */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ders Bağlantısı</span>
                <button
                  onClick={copyMeetingLink}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Kopyalandı!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Kopyala
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background rounded px-3 py-2">
                <span className="truncate">https://example.com/live/abc123</span>
              </div>
            </div>
          </div>

          {/* Başlat Butonu */}
          <Button
            className="w-full py-6 text-lg"
            onClick={() => startMutation.mutate()}
            disabled={!formData.title || startMutation.isPending}
          >
            {startMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Hazırlanıyor...
              </>
            ) : startMode === 'now' ? (
              <>
                <Play className="h-5 w-5 mr-2" />
                Canlı Dersi Başlat
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5 mr-2" />
                Dersi Planla
              </>
            )}
          </Button>

          {/* Uyarı */}
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Canlı ders başladığında tüm kayıtlı öğrencilere bildirim
              gönderilecektir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
