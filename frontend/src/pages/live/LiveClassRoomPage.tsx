/**
 * Live Class Room Page
 * Canlı ders katılım ekranı
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MessageSquare,
  Users,
  Hand,
  Settings,
  PhoneOff,
  Send,
  MoreVertical,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ThumbsUp,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isHost: boolean;
  hasRaisedHand: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  type: 'message' | 'system' | 'reaction';
}

// Mock data
const classData = {
  id: '1',
  title: 'React Hooks Deep Dive',
  instructor: {
    id: 'host1',
    name: 'Ahmet Yılmaz',
    isHost: true,
    isSpeaking: false,
    isMuted: false,
    isVideoOn: true,
    hasRaisedHand: false,
  },
};

const mockParticipants: Participant[] = [
  { id: '1', name: 'Ali Veli', isSpeaking: false, isMuted: true, isVideoOn: false, isHost: false, hasRaisedHand: false },
  { id: '2', name: 'Zeynep Kaya', isSpeaking: true, isMuted: false, isVideoOn: true, isHost: false, hasRaisedHand: false },
  { id: '3', name: 'Mehmet Demir', isSpeaking: false, isMuted: true, isVideoOn: false, isHost: false, hasRaisedHand: true },
  { id: '4', name: 'Ayşe Yıldız', isSpeaking: false, isMuted: true, isVideoOn: true, isHost: false, hasRaisedHand: false },
];

const mockMessages: ChatMessage[] = [
  { id: '1', userId: '1', userName: 'Ali Veli', message: 'Merhaba herkese!', timestamp: '14:30', type: 'message' },
  { id: '2', userId: 'system', userName: 'Sistem', message: 'Zeynep Kaya derse katıldı', timestamp: '14:31', type: 'system' },
  { id: '3', userId: '2', userName: 'Zeynep Kaya', message: 'useEffect dependency array nasıl çalışıyor?', timestamp: '14:32', type: 'message' },
  { id: '4', userId: 'host1', userName: 'Ahmet Yılmaz', message: 'Güzel soru, birazdan açıklayacağım.', timestamp: '14:33', type: 'message' },
];

export default function LiveClassRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [participants] = useState<Participant[]>(mockParticipants);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          userId: 'me',
          userName: 'Ben',
          message: newMessage,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          type: 'message',
        },
      ]);
      setNewMessage('');
    }
  };

  const sendReaction = (reaction: string) => {
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        userId: 'me',
        userName: 'Ben',
        message: reaction,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        type: 'reaction',
      },
    ]);
  };

  const handleLeave = () => {
    if (confirm('Dersten ayrılmak istediğinize emin misiniz?')) {
      navigate('/live');
    }
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="h-14 bg-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/live')} className="text-white hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">{classData.title}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Canlı</span>
              <span>•</span>
              <span>{participants.length + 1} katılımcı</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className="text-white hover:bg-gray-700"
          >
            {isSpeakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className={cn('flex-1 flex flex-col', (showChat || showParticipants) && 'lg:mr-80')}>
          {/* Main Video (Instructor) */}
          <div className="flex-1 relative bg-gray-800 flex items-center justify-center">
            <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Avatar alt={classData.instructor.name} size="xl" className="w-32 h-32 text-4xl" />
            </div>
            
            {/* Instructor info overlay */}
            <div className="absolute bottom-8 left-8 flex items-center gap-3 bg-black/50 rounded-lg px-4 py-2">
              <Avatar alt={classData.instructor.name} size="sm" />
              <div>
                <p className="font-medium">{classData.instructor.name}</p>
                <Badge className="text-xs">Eğitmen</Badge>
              </div>
              {!classData.instructor.isMuted && (
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Mic className="h-3 w-3 text-green-500" />
                </div>
              )}
            </div>

            {/* Participant videos (small) */}
            <div className="absolute bottom-8 right-8 flex gap-2">
              {participants.slice(0, 4).filter(p => p.isVideoOn).map((participant) => (
                <div
                  key={participant.id}
                  className={cn(
                    'w-32 h-24 rounded-lg bg-gray-700 flex items-center justify-center relative',
                    participant.isSpeaking && 'ring-2 ring-green-500'
                  )}
                >
                  <Avatar alt={participant.name} size="md" />
                  <span className="absolute bottom-1 left-1 text-xs bg-black/50 px-1 rounded">
                    {participant.name.split(' ')[0]}
                  </span>
                  {participant.hasRaisedHand && (
                    <div className="absolute top-1 right-1 bg-yellow-500 rounded-full p-1">
                      <Hand className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="h-20 bg-gray-800 flex items-center justify-center gap-4">
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            <Button
              variant={isVideoOn ? 'secondary' : 'outline'}
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => setIsVideoOn(!isVideoOn)}
            >
              {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>

            <Button
              variant={isScreenSharing ? 'default' : 'outline'}
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => setIsScreenSharing(!isScreenSharing)}
            >
              <Monitor className="h-6 w-6" />
            </Button>

            <Button
              variant={hasRaisedHand ? 'warning' : 'outline'}
              size="icon"
              className={cn('w-14 h-14 rounded-full', hasRaisedHand && 'bg-yellow-500 hover:bg-yellow-600')}
              onClick={() => setHasRaisedHand(!hasRaisedHand)}
            >
              <Hand className="h-6 w-6" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={() => sendReaction('👍')}
            >
              <ThumbsUp className="h-6 w-6" />
            </Button>

            <div className="w-px h-10 bg-gray-600 mx-2" />

            <Button
              variant={showChat ? 'default' : 'outline'}
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>

            <Button
              variant={showParticipants ? 'default' : 'outline'}
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
            >
              <Users className="h-5 w-5" />
            </Button>

            <div className="w-px h-10 bg-gray-600 mx-2" />

            <Button
              variant="destructive"
              size="icon"
              className="w-14 h-14 rounded-full"
              onClick={handleLeave}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        {(showChat || showParticipants) && (
          <motion.aside
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            className="fixed right-0 top-14 bottom-0 w-80 bg-gray-800 flex flex-col"
          >
            {showChat ? (
              <>
                <div className="p-4 border-b border-gray-700">
                  <h3 className="font-semibold">Sohbet</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        msg.type === 'system' && 'text-center',
                        msg.type === 'reaction' && 'text-center'
                      )}
                    >
                      {msg.type === 'system' ? (
                        <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                          {msg.message}
                        </span>
                      ) : msg.type === 'reaction' ? (
                        <span className="text-2xl">{msg.message}</span>
                      ) : (
                        <div className="flex gap-2">
                          <Avatar alt={msg.userName} size="xs" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{msg.userName}</span>
                              <span className="text-xs text-gray-500">{msg.timestamp}</span>
                            </div>
                            <p className="text-sm text-gray-300">{msg.message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Mesaj yaz..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-white text-sm border-0 focus:ring-2 focus:ring-primary"
                    />
                    <Button size="icon" onClick={sendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 border-b border-gray-700">
                  <h3 className="font-semibold">Katılımcılar ({participants.length + 1})</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {/* Instructor */}
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700">
                    <Avatar alt={classData.instructor.name} size="sm" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{classData.instructor.name}</p>
                      <Badge variant="secondary" className="text-xs">Eğitmen</Badge>
                    </div>
                    <Mic className="h-4 w-4 text-green-500" />
                  </div>

                  {/* Participants */}
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700"
                    >
                      <Avatar alt={participant.name} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{participant.name}</p>
                          {participant.hasRaisedHand && (
                            <Hand className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                      {participant.isMuted ? (
                        <MicOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Mic className="h-4 w-4 text-green-500" />
                      )}
                      <Button variant="ghost" size="icon-sm" className="text-gray-400">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.aside>
        )}
      </div>
    </div>
  );
}
