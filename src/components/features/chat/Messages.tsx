import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ChevronLeft, 
  Phone, 
  Video, 
  Info, 
  Plus, 
  Image as ImageIcon, 
  Smile, 
  Send, 
  MoreHorizontal,
  Circle,
  Paperclip,
  Mic
} from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';

// --- Types ---

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

interface Chat {
  id: string;
  user: {
    name: string;
    avatar: string;
    online: boolean;
    lastSeen: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

// --- Dummy Data ---

const DUMMY_CHATS: Chat[] = [
  {
    id: '1',
    user: { name: 'Sarah Smith', avatar: 'https://i.pravatar.cc/150?u=2', online: true, lastSeen: 'Active now' },
    lastMessage: "I'm working on something cool",
    lastMessageTime: '4:15 PM',
    unreadCount: 2
  },
  {
    id: '2',
    user: { name: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=1', online: false, lastSeen: '2h ago' },
    lastMessage: 'Nice, tell me more',
    lastMessageTime: 'Yesterday',
    unreadCount: 0
  },
  {
    id: '3',
    user: { name: 'Dante Rivers', avatar: 'https://i.pravatar.cc/150?u=3', online: true, lastSeen: 'Active now' },
    lastMessage: 'Check this out!',
    lastMessageTime: 'Tuesday',
    unreadCount: 0
  }
];

const DUMMY_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: '1', text: 'Hey, how are you?', sender: 'other', timestamp: '4:10 PM', status: 'read' },
    { id: '2', text: "I'm working on something cool", sender: 'other', timestamp: '4:11 PM', status: 'read' },
    { id: '3', text: 'Nice, tell me more!', sender: 'me', timestamp: '4:15 PM', status: 'read' },
  ],
  '2': [
    { id: '1', text: 'Hey John, check the update.', sender: 'me', timestamp: 'Yesterday', status: 'read' },
    { id: '2', text: 'Nice, tell me more', sender: 'other', timestamp: 'Yesterday', status: 'read' },
  ]
};

// --- Components ---

interface ChatListItemProps {
  chat: Chat;
  active: boolean;
  onClick: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all mb-1 text-left border ${
      active 
        ? 'bg-sun-text-main/5 border-sun-border shadow-lg' 
        : 'hover:bg-sun-text-main/[0.02] border-transparent'
    }`}
  >
    <div className="relative shrink-0">
      <Avatar src={chat.user.avatar} size="md" className="ring-1 ring-sun-border" />
      {chat.user.online && (
        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-sun-primary rounded-full border-2 border-sun-bg shadow-[0_0_10px_rgba(255,184,0,0.5)]" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[15px] tracking-tight ${chat.unreadCount > 0 ? 'font-bold text-sun-text-main' : 'font-semibold text-sun-text-muted'} truncate`}>
          {chat.user.name}
        </span>
        <span className="text-[10px] font-black text-sun-text-muted opacity-40 whitespace-nowrap ml-2 uppercase tracking-widest">{chat.lastMessageTime}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[13px] truncate leading-tight ${chat.unreadCount > 0 ? 'text-sun-text-main font-bold' : 'text-sun-text-muted opacity-60 font-medium'}`}>
          {chat.lastMessage}
        </p>
        {chat.unreadCount > 0 && (
          <div className="bg-sun-primary w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(255,184,0,0.6)]" />
        )}
      </div>
    </div>
  </button>
);

interface MessageBubbleProps {
  msg: Message;
  isFirst: boolean;
  isLast: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, isFirst, isLast }) => {
  const isMe = msg.sender === 'me';
  
  // Refined border radius based on position in thread
  const borderRadius = isMe 
    ? {
        borderTopRightRadius: isFirst ? '1.5rem' : '0.4rem',
        borderBottomRightRadius: isLast ? '1.5rem' : '0.4rem',
        borderTopLeftRadius: '1.5rem',
        borderBottomLeftRadius: '1.5rem',
      }
    : {
        borderTopLeftRadius: isFirst ? '1.5rem' : '0.4rem',
        borderBottomLeftRadius: isLast ? '1.5rem' : '0.4rem',
        borderTopRightRadius: '1.5rem',
        borderBottomRightRadius: '1.5rem',
      };

  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${isLast ? 'mb-2' : 'mb-0.5'} px-2`}>
      <div 
        style={borderRadius}
        className={`
          max-w-[85%] sm:max-w-[70%] px-5 py-3 text-[15px] leading-[1.5] shadow-sm relative transition-all duration-300
          ${isMe 
            ? 'bg-sun-primary text-black font-semibold' 
            : 'bg-sun-surface text-sun-text-main border border-sun-border'}
        `}
      >
        {!isMe && isFirst && (
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sun-primary/20 to-transparent" />
        )}
        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        {isLast && (
          <div className={`mt-1.5 flex items-center gap-2 ${isMe ? 'justify-end opacity-40' : 'justify-start opacity-30'} text-[9px] font-black uppercase tracking-widest`}>
            <span>{msg.timestamp}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const MessagesView = () => {
  const navigate = useNavigate();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState(DUMMY_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChat = DUMMY_CHATS.find(c => c.id === selectedChatId);
  const activeMessages = selectedChatId ? messages[selectedChatId] || [] : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedChatId, messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !selectedChatId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessages(prev => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMessage]
    }));
    setInputValue('');
  };

  return (
    <div className="flex h-full w-full bg-sun-bg text-sun-text-main overflow-hidden font-sans">
      <div className="flex flex-1 h-full w-full bg-sun-bg relative overflow-hidden">
        
        {/* Sidebar - Chat List */}
        <aside className={`
          flex-col w-full md:w-[300px] lg:w-[360px] xl:w-[400px] border-r border-sun-border bg-sun-bg shrink-0 z-20 transition-all duration-300
          ${selectedChatId ? 'hidden md:flex' : 'flex'}
        `}>
          <header className="px-5 py-5 sm:px-6 sm:py-6 border-b border-sun-border bg-sun-bg/80 backdrop-blur-xl sticky top-0 z-10 shrink-0">
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/')}
                  className="p-2 -ml-2 text-sun-text-muted hover:text-sun-text-main active:bg-sun-text-main/5 rounded-xl transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic line-clamp-1">
                    Connect<span className="text-sun-primary">.</span>
                  </h1>
                  <span className="text-[8px] sm:text-[9px] font-black text-sun-text-muted uppercase tracking-[0.3em] opacity-40">Pulse Network</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-sun-text-main/5 hover:bg-sun-primary hover:text-black rounded-xl sm:rounded-2xl transition-all active:scale-95 border border-sun-border">
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sun-text-muted group-focus-within:text-sun-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search Synapses..."
                className="w-full bg-sun-text-main/[0.03] border border-sun-border rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-11 sm:pl-12 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-sun-primary/30 transition-all placeholder:text-sun-text-main/20"
              />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-4 scrollbar-hide space-y-1">
            <div className="px-4 mb-3 sm:mb-4 text-[9px] font-black text-sun-text-muted uppercase tracking-[0.3em] opacity-40">Active Nodes</div>
            {DUMMY_CHATS.map((chat) => (
              <ChatListItem 
                key={chat.id} 
                chat={chat} 
                active={selectedChatId === chat.id}
                onClick={() => setSelectedChatId(chat.id)}
              />
            ))}
          </div>
        </aside>

        {/* Chat Window */}
        <main className={`
          flex-1 flex-col bg-sun-bg relative z-10
          ${selectedChatId ? 'flex' : 'hidden md:flex items-center justify-center'}
        `}>
          {activeChat ? (
            <div className="flex flex-col h-full bg-sun-bg">
              {/* Chat Header */}
              <header className="h-16 sm:h-20 px-4 sm:px-6 lg:px-8 border-b border-sun-border flex items-center justify-between shrink-0 bg-sun-bg/80 backdrop-blur-3xl z-30 sticky top-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <button 
                    onClick={() => setSelectedChatId(null)} 
                    className="md:hidden p-2 -ml-2 text-sun-text-muted hover:text-sun-primary active:bg-sun-text-main/5 rounded-xl transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="relative group cursor-pointer hidden xs:block">
                    <Avatar src={activeChat.user.avatar} size="sm" className="sm:w-10 sm:h-10 ring-2 ring-sun-border group-hover:ring-sun-primary/50 transition-all duration-500" />
                    {activeChat.user.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 sm:w-3.5 h-3 sm:h-3.5 bg-sun-primary rounded-full border-2 border-sun-bg shadow-[0_0_10px_rgba(255,184,0,0.5)]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-sun-text-main truncate leading-tight group-hover:text-sun-primary transition-colors cursor-pointer">{activeChat.user.name}</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${activeChat.user.online ? 'bg-sun-primary animate-pulse' : 'bg-sun-text-muted/20'}`} />
                      <span className="text-[8px] sm:text-[10px] font-black text-sun-text-muted uppercase tracking-widest opacity-60">
                        {activeChat.user.online ? 'Connected' : `Offline (${activeChat.user.lastSeen})`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button className="p-2 sm:p-3 text-sun-text-muted hover:bg-sun-text-main/5 hover:text-sun-primary rounded-xl transition-all active:scale-95 border border-transparent hover:border-sun-border">
                    <Phone className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" />
                  </button>
                  <button className="p-2 sm:p-3 text-sun-text-muted hover:bg-sun-text-main/5 hover:text-sun-primary rounded-xl transition-all active:scale-95 border border-transparent hover:border-sun-border">
                    <Video className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" />
                  </button>
                  <button className="hidden sm:flex p-3 text-sun-text-muted hover:bg-sun-text-main/5 hover:text-sun-primary rounded-xl transition-all active:scale-95 border border-transparent hover:border-sun-border">
                    <Info size={20} />
                  </button>
                </div>
              </header>

              {/* Messages Body */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 sm:px-10 md:px-16 lg:px-20 py-8 sm:py-10 flex flex-col scrollbar-hide bg-sun-bg space-y-4"
              >
                <div className="flex flex-col items-center mb-10 sm:mb-14 mt-4 text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative mb-6"
                  >
                    <Avatar src={activeChat.user.avatar} size="xl" className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 ring-4 ring-sun-border" />
                    {activeChat.user.online && (
                      <div className="absolute -bottom-1 -right-1 w-8 sm:w-10 h-8 sm:h-10 bg-sun-bg rounded-full flex items-center justify-center border border-sun-border">
                        <div className="w-4 sm:w-5 h-4 sm:h-5 bg-sun-primary rounded-full shadow-[0_0_15px_rgba(255,184,0,0.4)]" />
                      </div>
                    )}
                  </motion.div>
                  <h3 className="text-xl sm:text-2xl font-black text-sun-text-main tracking-tight leading-none mb-2">{activeChat.user.name}</h3>
                  <p className="text-[9px] sm:text-[11px] text-sun-text-muted font-black uppercase tracking-[0.2em] opacity-40 max-w-[200px] sm:max-w-[240px] leading-relaxed">
                    Personalized Interaction Node • Trusted Synapse Member
                  </p>
                  <button className="mt-6 px-6 py-2.5 bg-sun-text-main/5 hover:bg-sun-primary hover:text-black border border-sun-border hover:border-sun-primary/50 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all active:scale-95 shadow-sm">
                    View Network Identity
                  </button>
                </div>

                <div className="flex-1">
                  <AnimatePresence mode="popLayout">
                    {activeMessages.map((msg, index) => {
                      const prevMsg = activeMessages[index - 1];
                      const nextMsg = activeMessages[index + 1];
                      const isFirst = !prevMsg || prevMsg.sender !== msg.sender;
                      const isLast = !nextMsg || nextMsg.sender !== msg.sender;

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                          className={isFirst ? 'mt-6' : 'mt-0'}
                        >
                          <MessageBubble 
                            msg={msg} 
                            isFirst={isFirst}
                            isLast={isLast}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Input Area */}
              <div className="px-4 pb-6 sm:px-6 md:px-10 lg:px-16 xl:px-20 sm:pb-8 lg:pb-10 bg-gradient-to-t from-sun-bg via-sun-bg to-transparent sticky bottom-0 z-40">
                <div className="flex items-end gap-2 max-w-4xl mx-auto bg-sun-surface border border-sun-border rounded-3xl sm:rounded-[2.5rem] p-1.5 focus-within:border-sun-primary/30 transition-all shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)]">
                   <div className="flex shrink-0">
                      <button className="p-3 text-sun-text-muted hover:text-sun-text-main hover:bg-sun-text-main/5 rounded-xl sm:rounded-2xl transition-all">
                        <Plus size={20} strokeWidth={2.5} />
                      </button>
                      <button className="hidden sm:flex p-3 text-sun-text-muted hover:text-sun-text-main hover:bg-sun-text-main/5 rounded-2xl transition-all">
                        <ImageIcon size={20} strokeWidth={2.5} />
                      </button>
                   </div>
                   
                   <textarea 
                      rows={1}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent py-4 text-sm sm:text-base font-medium focus:outline-none text-sun-text-main placeholder:text-sun-text-muted/30 resize-none max-h-32 scrollbar-hide"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                      }}
                   />
                   
                   <div className="flex items-center gap-1 pr-1 pb-1">
                     <button className="hidden sm:flex p-3 text-sun-text-muted hover:text-sun-text-main hover:bg-sun-text-main/5 rounded-2xl transition-all">
                        <Smile size={20} strokeWidth={2.5} />
                     </button>
                     <button 
                       onClick={handleSendMessage}
                       disabled={!inputValue.trim()}
                       className={`
                         w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl sm:rounded-[1.4rem] transition-all duration-500
                         ${inputValue.trim() 
                           ? 'bg-sun-primary text-black shadow-lg shadow-sun-primary/20 scale-100 hover:scale-105 active:scale-95' 
                           : 'bg-sun-text-main/5 text-sun-text-muted opacity-30 cursor-not-allowed scale-90'}
                       `}
                     >
                       <Send size={18} strokeWidth={2.5} className="translate-x-0.5" />
                     </button>
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 xs:p-12 max-w-sm mx-auto">
              <motion.div 
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0] 
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-20 h-20 sm:w-24 sm:h-24 bg-sun-primary/5 border border-sun-primary/10 rounded-3xl sm:rounded-[2.5rem] flex items-center justify-center text-sun-primary mx-auto mb-10 shadow-[0_0_50px_rgba(255,184,0,0.05)]"
              >
                <Send className="w-9 h-9 sm:w-11 sm:h-11 translate-x-1 -translate-y-1" strokeWidth={2.5} />
              </motion.div>
              <h2 className="text-2xl sm:text-3xl font-black text-sun-text-main tracking-tighter uppercase italic leading-tight mb-3">Sync <span className="text-sun-primary">Control</span></h2>
              <p className="text-[12px] sm:text-[13px] text-sun-text-muted font-medium opacity-60 leading-relaxed mb-8 italic px-4">
                Choose a priority connection to initialize the messaging protocol and start sharing data across the pulse network.
              </p>
              <Button 
                onClick={() => {}}
                className="w-full !rounded-2xl py-5 sm:py-6 bg-sun-primary text-black hover:bg-white hover:text-black shadow-xl shadow-sun-primary/10 font-black uppercase tracking-[0.2em] text-[10px] sm:text-[11px] transition-all active:scale-95 border-none"
              >
                Launch Discovery
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

