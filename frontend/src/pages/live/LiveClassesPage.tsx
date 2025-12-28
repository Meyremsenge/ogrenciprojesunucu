/**
 * Live Classes Page - API Entegrasyonlu
 * Canlı ders listesi
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Play,
  Bell,
  BellOff,
  Filter,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import { getSessions, getMySessions, registerForSession } from '@/services/liveSessionService';

interface LiveClass {
  id: number;
  title: string;
  description: string;
  host?: {
    id: number;
    name: string;
    avatar?: string;
  };
  host_name?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  participant_count?: number;
  max_participants: number;
  course?: { title: string };
  course_title?: string;
  is_registered?: boolean;
}

export default function LiveClassesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [reminders, setReminders] = useState<Record<number, boolean>>({});

  // Tüm oturumları çek
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['liveSessions'],
    queryFn: () => getSessions({ per_page: 50 }),
  });

  // Kayıtlı oturumları çek
  const { data: mySessionsData } = useQuery({
    queryKey: ['myLiveSessions'],
    queryFn: () => getMySessions(),
  });

  // Kayıt mutation
  const registerMutation = useMutation({
    mutationFn: (sessionId: number) => registerForSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liveSessions'] });
      queryClient.invalidateQueries({ queryKey: ['myLiveSessions'] });
    },
  });

  // Oturumları işle
  const sessions = useMemo(() => {
    const rawSessions = sessionsData?.data?.sessions || [];
    const mySessions = mySessionsData?.data?.sessions || [];
    const mySessionIds = new Set(mySessions.map((s: any) => s.id));

    return rawSessions.map((session: any) => ({
      ...session,
      is_registered: mySessionIds.has(session.id),
      instructor: {
        name: session.host?.name || session.host_name || 'Eğitmen',
        avatar: session.host?.avatar,
      },
      scheduledAt: session.scheduled_at,
      duration: session.duration_minutes ? `${session.duration_minutes} dk` : '1 saat',
      participantCount: session.participant_count || 0,
      maxParticipants: session.max_participants || 100,
      category: session.course?.title || session.course_title || 'Genel',
    }));
  }, [sessionsData, mySessionsData]);

  const toggleReminder = (id: number) => {
    setReminders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRegister = async (sessionId: number) => {
    try {
      await registerMutation.mutateAsync(sessionId);
    } catch (error) {
      console.error('Kayıt hatası:', error);
    }
  };

  const filteredClasses = useMemo(() => {
    return sessions.filter((c: LiveClass) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [sessions, searchQuery]);

  const liveNow = filteredClasses.filter((c: any) => c.status === 'live');
  const upcoming = filteredClasses.filter((c: any) => c.status === 'scheduled');
  const ended = filteredClasses.filter((c: any) => c.status === 'ended');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Canlı dersler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Canlı Dersler</h1>
          <p className="text-muted-foreground">Eğitmenlerle canlı etkileşimli dersler</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ders ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtrele
          </Button>
        </div>
      </div>

      {/* Live Now Banner */}
      {liveNow.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="font-semibold">Şu Anda Canlı</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {liveNow.map((liveClass: any) => (
                  <div
                    key={liveClass.id}
                    className="bg-white/10 backdrop-blur rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-lg">{liveClass.title}</h3>
                    <p className="text-white/80 text-sm mt-1">{liveClass.instructor?.name || 'Eğitmen'}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4" />
                        {liveClass.participantCount} katılımcı
                      </div>
                      <Button
                        size="sm"
                        className="bg-white text-red-600 hover:bg-white/90"
                        onClick={() => navigate(`/live/${liveClass.id}`)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Katıl
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Yaklaşan ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="ended">
            Geçmiş ({ended.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Yaklaşan canlı ders bulunmuyor</p>
              </div>
            ) : (
              upcoming.map((liveClass: any, index: number) => (
                <LiveClassCard
                  key={liveClass.id}
                  liveClass={liveClass}
                  index={index}
                  isReminded={reminders[liveClass.id] || false}
                  onToggleReminder={() => toggleReminder(liveClass.id)}
                  onJoin={() => navigate(`/live/${liveClass.id}`)}
                  onRegister={() => handleRegister(liveClass.id)}
                  formatDate={formatDate}
                  isRegistering={registerMutation.isPending}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="ended">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ended.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Geçmiş canlı ders bulunmuyor</p>
              </div>
            ) : (
              ended.map((liveClass: any, index: number) => (
                <LiveClassCard
                  key={liveClass.id}
                  liveClass={liveClass}
                  index={index}
                  isReminded={reminders[liveClass.id] || false}
                  onToggleReminder={() => toggleReminder(liveClass.id)}
                  onJoin={() => navigate(`/live/${liveClass.id}/recording`)}
                  onRegister={() => {}}
                  formatDate={formatDate}
                  isEnded
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Live Class Card Component
interface LiveClassCardProps {
  liveClass: any;
  index: number;
  isReminded: boolean;
  onToggleReminder: () => void;
  onJoin: () => void;
  onRegister: () => void;
  formatDate: (date: string) => string;
  isEnded?: boolean;
  isRegistering?: boolean;
}

function LiveClassCard({
  liveClass,
  index,
  isReminded,
  onToggleReminder,
  onJoin,
  onRegister,
  formatDate,
  isEnded = false,
  isRegistering = false,
}: LiveClassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <Badge variant={isEnded ? 'secondary' : 'info'}>
              {liveClass.category}
            </Badge>
            {!isEnded && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleReminder}
                className={cn(isReminded && 'text-primary')}
              >
                {isReminded ? <Bell className="h-4 w-4 fill-current" /> : <BellOff className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <CardTitle className="text-lg mt-2">{liveClass.title}</CardTitle>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {liveClass.description}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Avatar alt={liveClass.instructor?.name || 'Eğitmen'} size="sm" />
            <div>
              <p className="text-sm font-medium">{liveClass.instructor?.name || 'Eğitmen'}</p>
              <p className="text-xs text-muted-foreground">Eğitmen</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(liveClass.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{liveClass.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>
                {isEnded
                  ? `${liveClass.participantCount} katılımcı`
                  : `${liveClass.maxParticipants} kişi kapasiteli`}
              </span>
            </div>
          </div>

          {liveClass.status === 'live' ? (
            <Button className="w-full mt-4" onClick={onJoin}>
              <Video className="h-4 w-4 mr-2" />
              Canlı Derse Katıl
            </Button>
          ) : isEnded ? (
            <Button className="w-full mt-4" variant="outline" onClick={onJoin}>
              <Play className="h-4 w-4 mr-2" />
              Kaydı İzle
            </Button>
          ) : liveClass.is_registered ? (
            <Button className="w-full mt-4" variant="secondary" disabled>
              <Bell className="h-4 w-4 mr-2" />
              Kayıtlısınız
            </Button>
          ) : (
            <Button 
              className="w-full mt-4" 
              onClick={onRegister}
              disabled={isRegistering}
            >
              {isRegistering ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Video className="h-4 w-4 mr-2" />
              )}
              Kayıt Ol
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
