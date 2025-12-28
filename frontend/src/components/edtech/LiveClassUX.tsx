/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📹 LIVE CLASS UX - Canlı Ders Katılım Deneyimi
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * EdTech canlı ders UX bileşenleri:
 * - Participant Grid
 * - Chat Panel
 * - Hand Raise System
 * - Reactions
 * - Connection Status
 * - Class Controls
 * 
 * Tasarım Kararları:
 * - Minimal arayüz → derse odaklanmayı artırır
 * - Kolay etkileşim → katılımı teşvik eder
 * - Görsel geri bildirim → bağlantı hissi verir
 * - Sessiz bildirimler → rahatsız etmez
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  MessageSquare,
  Users,
  Settings,
  PhoneOff,
  Send,
  MoreVertical,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ThumbsUp,
  Heart,
  Smile,
  HelpCircle,
  PartyPopper,
  Clock,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Pin,
  Grid3X3,
  User,
  AlertCircle,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isHost: boolean;
  hasRaisedHand: boolean;
  isScreenSharing?: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  type: 'message' | 'system' | 'reaction' | 'question';
  avatar?: string;
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
}

type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

// ============================================================================
// PARTICIPANT TILE
// ============================================================================

interface ParticipantTileProps {
  participant: Participant;
  isLarge?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  className?: string;
}

export function ParticipantTile({
  participant,
  isLarge = false,
  isPinned = false,
  onPin,
  className,
}: ParticipantTileProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'relative rounded-xl overflow-hidden group',
        isLarge ? 'aspect-video' : 'aspect-square',
        participant.isSpeaking && 'ring-2 ring-emerald-500',
        className
      )}
    >
      {/* Video / Avatar */}
      {participant.isVideoOn ? (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          {/* Actual video would go here */}
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
        </div>
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            {participant.avatar ? (
              <img
                src={participant.avatar}
                alt={participant.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {participant.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Speaking Indicator */}
      {participant.isSpeaking && (
        <motion.div
          className="absolute inset-0 ring-4 ring-emerald-500 rounded-xl pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      )}

      {/* Top Badges */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {participant.isHost && (
          <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
            Eğitmen
          </span>
        )}
        {participant.isScreenSharing && (
          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full flex items-center gap-1">
            <Monitor className="w-3 h-3" />
            Ekran
          </span>
        )}
      </div>

      {/* Hand Raised */}
      <AnimatePresence>
        {participant.hasRaisedHand && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-2 right-2"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center"
            >
              <Hand className="w-4 h-4 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium truncate">
            {participant.name}
          </span>
          <div className="flex items-center gap-1">
            {participant.isMuted && (
              <div className="w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center">
                <MicOff className="w-3 h-3 text-white" />
              </div>
            )}
            {!participant.isVideoOn && (
              <div className="w-6 h-6 rounded-full bg-gray-500/80 flex items-center justify-center">
                <VideoOff className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pin Button (on hover) */}
      {onPin && (
        <button
          onClick={onPin}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full transition-all',
            isPinned
              ? 'bg-primary text-primary-foreground'
              : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
          )}
        >
          <Pin className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// PARTICIPANTS GRID
// ============================================================================

interface ParticipantsGridProps {
  participants: Participant[];
  pinnedId?: string;
  onPinParticipant?: (id: string) => void;
  layout?: 'grid' | 'spotlight';
  className?: string;
}

export function ParticipantsGrid({
  participants,
  pinnedId,
  onPinParticipant,
  layout = 'grid',
  className,
}: ParticipantsGridProps) {
  const pinnedParticipant = participants.find((p) => p.id === pinnedId);
  const otherParticipants = participants.filter((p) => p.id !== pinnedId);

  if (layout === 'spotlight' && pinnedParticipant) {
    return (
      <div className={cn('flex flex-col h-full gap-2', className)}>
        {/* Main (Pinned) */}
        <div className="flex-1">
          <ParticipantTile
            participant={pinnedParticipant}
            isLarge
            isPinned
            onPin={() => onPinParticipant?.(pinnedParticipant.id)}
            className="w-full h-full"
          />
        </div>
        
        {/* Others */}
        {otherParticipants.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-2">
            {otherParticipants.map((participant) => (
              <ParticipantTile
                key={participant.id}
                participant={participant}
                onPin={() => onPinParticipant?.(participant.id)}
                className="w-24 h-24 flex-shrink-0"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid layout
  const gridCols = participants.length <= 4 ? 2 : participants.length <= 9 ? 3 : 4;

  return (
    <div
      className={cn(
        'grid gap-2 h-full',
        `grid-cols-${gridCols}`,
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
      }}
    >
      {participants.map((participant) => (
        <ParticipantTile
          key={participant.id}
          participant={participant}
          isPinned={participant.id === pinnedId}
          onPin={() => onPinParticipant?.(participant.id)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// LIVE CHAT PANEL
// ============================================================================

interface LiveChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onSendQuestion?: (question: string) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function LiveChatPanel({
  messages,
  onSendMessage,
  onSendQuestion,
  isCollapsed = false,
  onToggle,
  className,
}: LiveChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    if (isQuestion && onSendQuestion) {
      onSendQuestion(newMessage.trim());
    } else {
      onSendMessage(newMessage.trim());
    }
    setNewMessage('');
    setIsQuestion(false);
  };

  const getMessageStyle = (type: ChatMessage['type']) => {
    switch (type) {
      case 'system':
        return 'text-center text-xs text-muted-foreground bg-muted/50 py-1 px-2 rounded';
      case 'reaction':
        return 'text-center text-2xl';
      case 'question':
        return 'bg-blue-500/10 border-l-2 border-blue-500 pl-3';
      default:
        return '';
    }
  };

  return (
    <div className={cn(
      'flex flex-col bg-card border-l border-border h-full transition-all',
      isCollapsed ? 'w-0 opacity-0' : 'w-80',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Sohbet</span>
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={getMessageStyle(msg.type)}>
            {msg.type === 'message' || msg.type === 'question' ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {msg.userName}
                  </span>
                  <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                  {msg.type === 'question' && (
                    <span className="text-xs bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded">
                      Soru
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/90">{msg.message}</p>
              </div>
            ) : (
              <span>{msg.message}</span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border space-y-2">
        {/* Question Toggle */}
        {onSendQuestion && (
          <button
            onClick={() => setIsQuestion(!isQuestion)}
            className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors',
              isQuestion
                ? 'bg-blue-500/10 text-blue-600'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <HelpCircle className="w-3 h-3" />
            {isQuestion ? 'Soru olarak gönder' : 'Soru sor'}
          </button>
        )}
        
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isQuestion ? 'Sorunuzu yazın...' : 'Mesaj yazın...'}
            className="flex-1 px-3 py-2 rounded-lg bg-muted border-0 text-sm focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REACTIONS BAR
// ============================================================================

interface ReactionsBarProps {
  onReaction: (emoji: string) => void;
  recentReactions?: Reaction[];
  className?: string;
}

export function ReactionsBar({ onReaction, recentReactions = [], className }: ReactionsBarProps) {
  const reactions = [
    { emoji: '👍', label: 'Beğen' },
    { emoji: '❤️', label: 'Sevgi' },
    { emoji: '👏', label: 'Alkış' },
    { emoji: '😊', label: 'Gülümse' },
    { emoji: '🎉', label: 'Kutla' },
    { emoji: '🤔', label: 'Düşün' },
  ];

  return (
    <div className={cn('relative', className)}>
      {/* Floating Reactions */}
      <AnimatePresence>
        {recentReactions.map((reaction) => (
          <motion.span
            key={reaction.id}
            initial={{ opacity: 1, y: 0, x: Math.random() * 100 - 50 }}
            animate={{ opacity: 0, y: -100 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute bottom-full text-2xl pointer-events-none"
          >
            {reaction.emoji}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Reaction Buttons */}
      <div className="flex items-center gap-1 p-1 bg-card rounded-xl border border-border">
        {reactions.map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => onReaction(emoji)}
            title={label}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-lg"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CONNECTION STATUS
// ============================================================================

interface ConnectionStatusProps {
  quality: ConnectionQuality;
  className?: string;
}

export function ConnectionStatus({ quality, className }: ConnectionStatusProps) {
  const config = {
    excellent: {
      icon: Wifi,
      label: 'Mükemmel',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      bars: 4,
    },
    good: {
      icon: Wifi,
      label: 'İyi',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      bars: 3,
    },
    poor: {
      icon: Wifi,
      label: 'Zayıf',
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      bars: 2,
    },
    disconnected: {
      icon: WifiOff,
      label: 'Bağlantı Yok',
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      bars: 0,
    },
  };

  const { icon: Icon, label, color, bg, bars } = config[quality];

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg', bg, className)}>
      <Icon className={cn('w-4 h-4', color)} />
      <span className={cn('text-xs font-medium', color)}>{label}</span>
      
      {/* Signal Bars */}
      <div className="flex items-end gap-0.5 h-3">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={cn(
              'w-1 rounded-sm transition-colors',
              bar <= bars ? color.replace('text-', 'bg-') : 'bg-muted'
            )}
            style={{ height: `${bar * 25}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CLASS CONTROLS
// ============================================================================

interface ClassControlsProps {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  hasRaisedHand: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHand: () => void;
  onLeave: () => void;
  className?: string;
}

export function ClassControls({
  isMuted,
  isVideoOn,
  isScreenSharing,
  hasRaisedHand,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHand,
  onLeave,
  className,
}: ClassControlsProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2 p-4', className)}>
      {/* Mic */}
      <button
        onClick={onToggleMute}
        className={cn(
          'p-4 rounded-full transition-colors',
          isMuted
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        )}
        title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Video */}
      <button
        onClick={onToggleVideo}
        className={cn(
          'p-4 rounded-full transition-colors',
          !isVideoOn
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        )}
        title={isVideoOn ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
      >
        {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </button>

      {/* Screen Share */}
      <button
        onClick={onToggleScreenShare}
        className={cn(
          'p-4 rounded-full transition-colors',
          isScreenSharing
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        )}
        title={isScreenSharing ? 'Paylaşımı Durdur' : 'Ekran Paylaş'}
      >
        {isScreenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
      </button>

      {/* Raise Hand */}
      <button
        onClick={onToggleHand}
        className={cn(
          'p-4 rounded-full transition-colors',
          hasRaisedHand
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        )}
        title={hasRaisedHand ? 'Eli İndir' : 'El Kaldır'}
      >
        <Hand className="w-5 h-5" />
      </button>

      {/* Leave */}
      <button
        onClick={onLeave}
        className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
        title="Dersten Ayrıl"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    </div>
  );
}

// ============================================================================
// CLASS INFO BAR
// ============================================================================

interface ClassInfoBarProps {
  title: string;
  instructor: string;
  duration: number; // minutes elapsed
  participantCount: number;
  isRecording?: boolean;
  className?: string;
}

export function ClassInfoBar({
  title,
  instructor,
  duration,
  participantCount,
  isRecording = false,
  className,
}: ClassInfoBarProps) {
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:00` : `${m}:00`;
  };

  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2 bg-gray-900/95 backdrop-blur border-b border-white/10',
      className
    )}>
      <div>
        <h1 className="text-white font-medium">{title}</h1>
        <p className="text-white/60 text-sm">{instructor}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Recording */}
        {isRecording && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-2 h-2 rounded-full bg-red-500"
            />
            Kayıt
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Clock className="w-4 h-4" />
          {formatDuration(duration)}
        </div>

        {/* Participants */}
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Users className="w-4 h-4" />
          {participantCount}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WAITING ROOM
// ============================================================================

interface WaitingRoomProps {
  className: string;
  instructor: string;
  scheduledTime: Date;
  onJoin?: () => void;
}

export function WaitingRoom({
  className: classTitle,
  instructor,
  scheduledTime,
  onJoin,
}: WaitingRoomProps) {
  const [timeUntil, setTimeUntil] = useState(() => 
    Math.max(0, Math.floor((scheduledTime.getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntil(Math.max(0, Math.floor((scheduledTime.getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const canJoin = timeUntil <= 5 * 60; // 5 minutes before

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        {/* Waiting Animation */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          className="w-24 h-24 rounded-full border-4 border-primary/30 border-t-primary mx-auto mb-6"
        />

        <h1 className="text-2xl font-bold text-white mb-2">{classTitle}</h1>
        <p className="text-white/60 mb-6">{instructor}</p>

        {timeUntil > 0 ? (
          <>
            <p className="text-white/80 mb-2">Ders başlamasına</p>
            <p className="text-4xl font-mono font-bold text-primary mb-6">
              {formatTime(timeUntil)}
            </p>
          </>
        ) : (
          <p className="text-emerald-400 mb-6">Ders başladı!</p>
        )}

        <button
          onClick={onJoin}
          disabled={!canJoin}
          className={cn(
            'px-8 py-3 rounded-xl font-medium transition-colors',
            canJoin
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          )}
        >
          {canJoin ? 'Derse Katıl' : 'Henüz Başlamadı'}
        </button>

        {!canJoin && (
          <p className="text-white/40 text-sm mt-4">
            Derse 5 dakika kala katılabilirsiniz
          </p>
        )}
      </motion.div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  Participant,
  ChatMessage,
  Reaction,
  ConnectionQuality,
  ParticipantTileProps,
  ParticipantsGridProps,
  LiveChatPanelProps,
  ReactionsBarProps,
  ConnectionStatusProps,
  ClassControlsProps,
  ClassInfoBarProps,
  WaitingRoomProps,
};
