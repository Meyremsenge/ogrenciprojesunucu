/**
 * Messages Page
 * Mesajlar sayfası
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Info,
  Check,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock conversations
const CONVERSATIONS = [
  {
    id: 1,
    user: { name: 'Ahmet Yılmaz', avatar: null, role: 'Öğretmen', online: true },
    lastMessage: 'Ders notu hakkında sorum vardı...',
    time: '5 dk',
    unread: 2,
  },
  {
    id: 2,
    user: { name: 'Ayşe Demir', avatar: null, role: 'Öğretmen', online: false },
    lastMessage: 'Ödev teslim tarihi ne zaman?',
    time: '1 saat',
    unread: 0,
  },
  {
    id: 3,
    user: { name: 'Destek Ekibi', avatar: null, role: 'Destek', online: true },
    lastMessage: 'Talebiniz çözüme kavuşturuldu.',
    time: '2 saat',
    unread: 0,
  },
  {
    id: 4,
    user: { name: 'Mehmet Kaya', avatar: null, role: 'Öğrenci', online: false },
    lastMessage: 'Grup çalışması için müsait misin?',
    time: '1 gün',
    unread: 0,
  },
];

// Mock messages
const MESSAGES = [
  {
    id: 1,
    sender: 'other',
    text: 'Merhaba, React kursundaki 5. derste bir sorum var.',
    time: '10:30',
    status: 'read',
  },
  {
    id: 2,
    sender: 'me',
    text: 'Merhaba, tabii ki. Hangi konuda takıldınız?',
    time: '10:32',
    status: 'read',
  },
  {
    id: 3,
    sender: 'other',
    text: 'useState ve useReducer arasındaki farkı tam anlayamadım. Hangisini ne zaman kullanmalıyım?',
    time: '10:33',
    status: 'read',
  },
  {
    id: 4,
    sender: 'me',
    text: 'Güzel soru! useState basit state yönetimi için idealdir. useReducer ise karmaşık state logic\'i veya birbirine bağlı birden fazla alt değer olduğunda tercih edilir.',
    time: '10:35',
    status: 'read',
  },
  {
    id: 5,
    sender: 'me',
    text: 'Örneğin bir form state\'i için useState yeterli olabilir, ama bir alışveriş sepeti gibi karmaşık bir yapı için useReducer daha uygun olur.',
    time: '10:36',
    status: 'delivered',
  },
];

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState(CONVERSATIONS[0]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = CONVERSATIONS.filter((c) =>
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = () => {
    if (!messageText.trim()) return;
    // Send message logic
    setMessageText('');
  };

  return (
    <div className="h-[calc(100vh-180px)] flex card overflow-hidden">
      {/* Conversations List */}
      <div className="w-80 border-r flex flex-col">
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mesaj ara..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation)}
              className={cn(
                'w-full p-4 text-left hover:bg-muted/50 transition-colors border-b',
                selectedConversation?.id === conversation.id && 'bg-muted'
              )}
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {conversation.user.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                  {conversation.user.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium truncate">{conversation.user.name}</h4>
                    <span className="text-xs text-muted-foreground">{conversation.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
                </div>

                {/* Unread Badge */}
                {conversation.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {conversation.unread}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {selectedConversation.user.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                {selectedConversation.user.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              <div>
                <h3 className="font-medium">{selectedConversation.user.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.user.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-muted rounded-lg">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </button>
              <button className="p-2 hover:bg-muted rounded-lg">
                <Video className="h-5 w-5 text-muted-foreground" />
              </button>
              <button className="p-2 hover:bg-muted rounded-lg">
                <Info className="h-5 w-5 text-muted-foreground" />
              </button>
              <button className="p-2 hover:bg-muted rounded-lg">
                <MoreVertical className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {MESSAGES.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex',
                  message.sender === 'me' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[70%] px-4 py-2 rounded-2xl',
                    message.sender === 'me'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  )}
                >
                  <p className="text-sm">{message.text}</p>
                  <div
                    className={cn(
                      'flex items-center justify-end gap-1 mt-1',
                      message.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    <span className="text-xs">{message.time}</span>
                    {message.sender === 'me' && (
                      message.status === 'read' ? (
                        <CheckCheck className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-muted rounded-lg">
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Mesajınızı yazın..."
                className="flex-1 px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleSend}
                disabled={!messageText.trim()}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  messageText.trim()
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Bir sohbet seçin</p>
        </div>
      )}
    </div>
  );
}
