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
import { apiRequest } from '../../../lib/api';
import { useUIStore } from '../../../store/uiStore';

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

interface BackendConversation {
  id: string;
  participant_details: Array<{
    user_id: string;
    name: string;
    avatar?: string;
    online?: boolean;
    last_seen?: string;
  }>;
  last_message: string;
  last_message_time?: string | null;
  unread_count: number;
}

interface UserSearchResult {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

interface BackendMessage {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
}

interface BackendCall {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  kind: 'audio' | 'video';
  state: 'ringing' | 'active' | 'ended';
  created_at: string;
}

// --- Components ---

interface ChatListItemProps {
  chat: Chat;
  active: boolean;
  onClick: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all mb-1 text-left border ${
      active 
        ? 'bg-sun-primary/10 border-sun-primary/25 shadow-sm' 
        : 'hover:bg-sun-text-main/[0.02] border-transparent'
    }`}
  >
    <div className="relative shrink-0">
      <Avatar src={chat.user.avatar} size="md" className="ring-1 ring-sun-border" />
      {chat.user.online && (
        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-sun-primary rounded-full border-2 border-sun-bg shadow-[0_0_10px_rgba(109,40,217,0.5)]" />
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
        <p className={`text-[13px] truncate leading-tight ${chat.unreadCount > 0 ? 'text-sun-primary font-bold' : 'text-sun-text-muted opacity-60 font-medium'}`}>
          {chat.lastMessage}
        </p>
        {chat.unreadCount > 0 && (
          <div className="bg-sun-accent w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(167,139,250,0.6)]" />
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
          max-w-[85%] sm:max-w-[70%] px-5 py-3 text-[14px] leading-[1.6] shadow-sm relative transition-all duration-300
          ${isMe 
            ? 'bg-gradient-to-r from-sun-primary to-sun-secondary text-white font-medium shadow-md shadow-sun-primary/10' 
            : 'bg-slate-100 dark:bg-slate-850 text-sun-text-main border-none'}
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

export const MessagesView = ({ onBack }: { onBack?: () => void }) => {
  const navigate = useNavigate();
  const { authToken, currentUser } = useUIStore();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [chats, setChats] = useState<Chat[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeCall, setActiveCall] = useState<BackendCall | null>(null);
  const [callMode, setCallMode] = useState<'audio' | 'video' | null>(null);
  const [callStatus, setCallStatus] = useState('');
  const [callLoading, setCallLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<EventSource | null>(null);
  const callStreamRef = useRef<EventSource | null>(null);
  const incomingCallStreamRef = useRef<EventSource | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localMediaRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const activeChat = chats.find(c => c.id === selectedChatId);
  const activeMessages = selectedChatId ? messages[selectedChatId] || [] : [];

  const upsertThreadMessage = (chatId: string, nextMessage: Message) => {
    setMessages((prev) => {
      const existing = prev[chatId] || [];
      if (existing.some((message) => message.id === nextMessage.id)) return prev;
      return {
        ...prev,
        [chatId]: [...existing, nextMessage],
      };
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedChatId, messages]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }

    if (!selectedChatId || !authToken) return;

    const streamUrl = `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/chat/conversations/${selectedChatId}/stream?access_token=${encodeURIComponent(authToken)}`;
    const stream = new EventSource(streamUrl);
    streamRef.current = stream;

    stream.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as BackendMessage;
        const nextMessage: Message = {
          id: payload.id,
          text: payload.text,
          sender: payload.sender_id === currentUser?.id ? 'me' : 'other',
          timestamp: new Date(payload.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: payload.status,
        };

        upsertThreadMessage(selectedChatId, nextMessage);

        setChats((prev) => prev.map((chat) => chat.id === selectedChatId ? {
          ...chat,
          lastMessage: nextMessage.text,
          lastMessageTime: nextMessage.timestamp,
        } : chat));
      } catch {
        // Ignore malformed stream messages.
      }
    });

    stream.onerror = () => {
      stream.close();
    };

    return () => {
      stream.close();
      if (streamRef.current === stream) {
        streamRef.current = null;
      }
    };
  }, [selectedChatId, authToken, currentUser?.id]);

  useEffect(() => {
    return () => {
      callStreamRef.current?.close();
      incomingCallStreamRef.current?.close();
      peerRef.current?.close();
      localMediaRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (incomingCallStreamRef.current) {
      incomingCallStreamRef.current.close();
      incomingCallStreamRef.current = null;
    }

    if (!authToken) return;

    const streamUrl = `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/chat/calls/incoming/stream?access_token=${encodeURIComponent(authToken)}`;
    const stream = new EventSource(streamUrl);
    incomingCallStreamRef.current = stream;

    stream.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { type?: string; call?: BackendCall };
        if (payload.type === 'incoming-call' && payload.call) {
          setActiveCall(payload.call);
          setCallMode(payload.call.kind);
          setCallStatus('Incoming call');
        }
      } catch {
        // Ignore malformed call invite events.
      }
    });

    stream.onerror = () => {
      stream.close();
    };

    return () => {
      stream.close();
      if (incomingCallStreamRef.current === stream) {
        incomingCallStreamRef.current = null;
      }
    };
  }, [authToken]);

  useEffect(() => {
    let mounted = true;
    const loadChats = async () => {
      if (!authToken) {
        setLoadingChats(false);
        return;
      }
      try {
        const response = await apiRequest<{ conversations: BackendConversation[] }>('/chat/conversations', {}, authToken);
        if (!mounted) return;
        const nextChats: Chat[] = response.conversations.map((conversation, index) => {
          const other = conversation.participant_details.find((participant) => participant.user_id !== currentUser?.id)
            ?? conversation.participant_details[0];
          return {
            id: conversation.id,
            user: {
              name: other?.name || `Chat ${index + 1}`,
              avatar: other?.avatar || `https://i.pravatar.cc/150?u=${conversation.id}`,
              online: Boolean(other?.online),
              lastSeen: other?.last_seen || 'Recently active',
            },
            lastMessage: conversation.last_message || 'No messages yet',
            lastMessageTime: conversation.last_message_time ? new Date(conversation.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
            unreadCount: conversation.unread_count || 0,
          };
        });
        setChats(nextChats);
      } catch {
        setChats([]);
      } finally {
        if (mounted) setLoadingChats(false);
      }
    };
    loadChats();
    return () => {
      mounted = false;
    };
  }, [authToken, currentUser?.id]);

  useEffect(() => {
    let mounted = true;
    const loadMessages = async () => {
      if (!selectedChatId || !authToken) {
        return;
      }
      setLoadingMessages(true);
      setError('');
      try {
        const response = await apiRequest<{ messages: BackendMessage[] }>(
          `/chat/conversations/${selectedChatId}/messages`,
          {},
          authToken,
        );
        if (!mounted) return;
        const nextMessages: Message[] = response.messages.map((message) => ({
          id: message.id,
          text: message.text,
          sender: message.sender_id === currentUser?.id ? 'me' : 'other',
          timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: message.status,
        }));
        setMessages((prev) => ({
          ...prev,
          [selectedChatId]: nextMessages,
        }));
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unable to load messages');
          setMessages((prev) => ({
            ...prev,
            [selectedChatId]: [],
          }));
        }
      } finally {
        if (mounted) setLoadingMessages(false);
      }
    };
    loadMessages();
    return () => {
      mounted = false;
    };
  }, [selectedChatId, authToken, currentUser?.id]);

  useEffect(() => {
    let mounted = true;
    const runSearch = async () => {
      const query = searchQuery.trim();
      if (!query || !authToken) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const response = await apiRequest<{ users: UserSearchResult[] }>(`/chat/search?q=${encodeURIComponent(query)}`, {}, authToken);
        if (mounted) setSearchResults(response.users || []);
      } catch {
        if (mounted) setSearchResults([]);
      } finally {
        if (mounted) setSearching(false);
      }
    };
    const timer = window.setTimeout(runSearch, 250);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, authToken]);

  const openConversationWithUser = async (user: UserSearchResult) => {
    if (!authToken) return;
    try {
      const response = await apiRequest<{ conversation: { id: string } }>(
        '/chat/conversations',
        {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }),
        },
        authToken,
      );
      setSelectedChatId(response.conversation.id);
      setSearchQuery('');
      setSearchResults([]);
      setChats((prev) => {
        if (prev.some((chat) => chat.id === response.conversation.id)) return prev;
        return [{
          id: response.conversation.id,
          user: {
            name: user.full_name || user.username,
            avatar: user.avatar_url || `https://i.pravatar.cc/150?u=${user.username}`,
            online: false,
            lastSeen: 'Recently',
          },
          lastMessage: 'Say hello',
          lastMessageTime: 'Now',
          unreadCount: 0,
        }, ...prev];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start conversation');
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || !selectedChatId) return;

    if (!authToken) return;

    const text = inputValue.trim();
    setInputValue('');

    apiRequest<BackendMessage>(
      `/chat/conversations/${selectedChatId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ text, message_type: 'text' }),
      },
      authToken,
    ).then((result) => {
      const savedMessage: Message = {
        id: result.id,
        text: result.text,
        sender: result.sender_id === currentUser?.id ? 'me' : 'other',
        timestamp: new Date(result.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: result.status,
      };
      upsertThreadMessage(selectedChatId, savedMessage);
      setChats((prev) => prev.map((chat) => chat.id === selectedChatId ? {
        ...chat,
        lastMessage: savedMessage.text,
        lastMessageTime: savedMessage.timestamp,
      } : chat));
    }).catch(() => {
      setMessages((prev) => ({
        ...prev,
        [selectedChatId]: [...(prev[selectedChatId] || [])],
      }));
    });
  };

  const closeCallSession = async () => {
    if (!activeCall || !authToken) return;
    try {
      await apiRequest(`/chat/calls/${activeCall.id}/end`, { method: 'PATCH' }, authToken);
    } catch {
      // Ignore end errors during teardown.
    }
    callStreamRef.current?.close();
    callStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    localMediaRef.current?.getTracks().forEach((track) => track.stop());
    localMediaRef.current = null;
    setActiveCall(null);
    setCallMode(null);
    setCallStatus('');
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const acceptIncomingCall = async () => {
    if (!activeCall || !authToken) return;
    setCallLoading(true);
    setCallStatus('Connecting...');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: activeCall.kind === 'video',
      });
      localMediaRef.current = media;
      if (localVideoRef.current) localVideoRef.current.srcObject = media;

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
      });
      peerRef.current = peer;
      media.getTracks().forEach((track) => peer.addTrack(track, media));

      peer.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peer.onicecandidate = async (event) => {
        if (!event.candidate || !authToken) return;
        await apiRequest(`/chat/calls/${activeCall.id}/signal`, {
          method: 'POST',
          body: JSON.stringify({ signal: { candidate: event.candidate } }),
        }, authToken);
      };

      callStreamRef.current?.close();
      const streamUrl = `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/chat/calls/${activeCall.id}/stream?access_token=${encodeURIComponent(authToken)}`;
      const callStream = new EventSource(streamUrl);
      callStreamRef.current = callStream;

      callStream.addEventListener('message', async (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as { type?: string; signal?: { type?: string; sdp?: string; candidate?: RTCIceCandidateInit } };
          if (payload.type === 'signal' && payload.signal?.type === 'offer' && payload.signal?.sdp) {
            await peer.setRemoteDescription({ type: 'offer', sdp: payload.signal.sdp });
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await apiRequest(`/chat/calls/${activeCall.id}/signal`, {
              method: 'POST',
              body: JSON.stringify({
                signal: {
                  type: 'answer',
                  sdp: answer.sdp,
                },
              }),
            }, authToken);
            setCallStatus('Connected');
          }
          if (payload.type === 'signal' && payload.signal?.type === 'answer' && payload.signal?.sdp) {
            await peer.setRemoteDescription({ type: 'answer', sdp: payload.signal.sdp });
            setCallStatus('Connected');
          }
          if (payload.type === 'signal' && payload.signal?.candidate) {
            await peer.addIceCandidate(payload.signal.candidate);
          }
          if (payload.type === 'ended') {
            setCallStatus('Call ended');
            await closeCallSession();
          }
        } catch {
          // Ignore malformed call events.
        }
      });

      callStream.onerror = () => {
        setCallStatus('Call stream disconnected');
      };
    } catch (err) {
      setCallStatus(err instanceof Error ? err.message : 'Unable to accept call');
      await closeCallSession();
    } finally {
      setCallLoading(false);
    }
  };

  const startCall = async (kind: 'audio' | 'video') => {
    if (!selectedChatId || !authToken) return;
    setCallLoading(true);
    setCallStatus(kind === 'video' ? 'Starting video call...' : 'Starting voice call...');
    try {
      const callResponse = await apiRequest<{ call: BackendCall }>(
        `/chat/conversations/${selectedChatId}/calls`,
        {
          method: 'POST',
          body: JSON.stringify({ kind }),
        },
        authToken,
      );
      const call = callResponse.call;
      setActiveCall(call);
      setCallMode(kind);

      const media = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video',
      });
      localMediaRef.current = media;
      if (localVideoRef.current) localVideoRef.current.srcObject = media;

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
      });
      peerRef.current = peer;
      media.getTracks().forEach((track) => peer.addTrack(track, media));

      peer.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peer.onicecandidate = async (event) => {
        if (!event.candidate || !authToken) return;
        await apiRequest(`/chat/calls/${call.id}/signal`, {
          method: 'POST',
          body: JSON.stringify({ signal: { candidate: event.candidate } }),
        }, authToken);
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await apiRequest(`/chat/calls/${call.id}/signal`, {
        method: 'POST',
        body: JSON.stringify({
          signal: {
            type: 'offer',
            sdp: offer.sdp,
            kind,
          },
        }),
      }, authToken);

      callStreamRef.current?.close();
      const streamUrl = `${import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/chat/calls/${call.id}/stream?access_token=${encodeURIComponent(authToken)}`;
      const callStream = new EventSource(streamUrl);
      callStreamRef.current = callStream;
      setCallStatus('Calling...');

      callStream.addEventListener('message', async (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data) as { type?: string; signal?: any; call_id?: string; ended_by?: string };
          if (payload.type === 'signal' && payload.signal?.type === 'answer' && payload.signal?.sdp) {
            await peer.setRemoteDescription({ type: 'answer', sdp: payload.signal.sdp });
            setCallStatus('Connected');
          }
          if (payload.type === 'signal' && payload.signal?.candidate) {
            await peer.addIceCandidate(payload.signal.candidate);
          }
          if (payload.type === 'ended') {
            setCallStatus('Call ended');
            await closeCallSession();
          }
        } catch {
          // Ignore malformed call events.
        }
      });

      callStream.onerror = () => {
        setCallStatus('Call stream disconnected');
      };
    } catch (err) {
      setCallStatus(err instanceof Error ? err.message : 'Unable to start call');
      await closeCallSession();
    } finally {
      setCallLoading(false);
    }
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
                  onClick={onBack || (() => navigate('/'))}
                  className="p-2 -ml-2 text-sun-text-muted hover:text-sun-text-main active:bg-sun-text-main/5 rounded-xl transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-sun-text-main">
                    Korusa <span className="text-sun-primary font-normal">Messenger</span>
                  </h1>
                  <span className="text-[8px] font-black text-sun-text-muted uppercase tracking-[0.2em] opacity-50">Pulse Network</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-sun-text-main/5 hover:bg-sun-primary hover:text-white rounded-xl sm:rounded-2xl transition-all active:scale-95 border border-sun-border">
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sun-text-muted group-focus-within:text-sun-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search username to message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-sun-text-main/[0.03] border border-sun-border rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-11 sm:pl-12 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-sun-primary/30 transition-all placeholder:text-sun-text-main/20"
              />
              {(searchQuery.trim().length > 0) && (
                <div className="absolute top-full mt-2 w-full bg-sun-surface border border-sun-border rounded-2xl shadow-2xl overflow-hidden z-20">
                  {searching ? (
                    <div className="px-4 py-3 text-xs text-sun-text-muted">Searching users...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => openConversationWithUser(user)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                      >
                        <Avatar size="sm" src={user.avatar_url || `https://i.pravatar.cc/150?u=${user.username}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{user.full_name || user.username}</p>
                          <p className="text-[10px] text-sun-text-muted truncate">@{user.username}</p>
                        </div>
                        <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-sun-primary">Message</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-sun-text-muted">No users found.</div>
                  )}
                </div>
              )}
            </div>
          </header>

            <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-4 scrollbar-hide space-y-1">
              <div className="px-4 mb-3 sm:mb-4 text-[9px] font-black text-sun-text-muted uppercase tracking-[0.3em] opacity-40">Active Nodes</div>
            {loadingChats ? (
              <div className="px-4 py-6 text-sm text-sun-text-muted">Loading conversations...</div>
            ) : chats.map((chat) => (
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
          ${selectedChatId ? 'flex' : 'hidden md:flex items-center justify-start pt-20 sm:pt-32'}
        `}>
              {activeChat ? (
                <>
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
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 sm:w-3.5 h-3 sm:h-3.5 bg-sun-primary rounded-full border-2 border-sun-bg shadow-[0_0_10px_rgba(109,40,217,0.5)]" />
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
                  <button
                    onClick={() => startCall('audio')}
                    disabled={callLoading}
                    className="p-2 sm:p-3 text-sun-text-muted hover:bg-sun-text-main/5 hover:text-sun-primary rounded-xl transition-all active:scale-95 border border-transparent hover:border-sun-border disabled:opacity-50"
                  >
                    <Phone className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" />
                  </button>
                  <button
                    onClick={() => startCall('video')}
                    disabled={callLoading}
                    className="p-2 sm:p-3 text-sun-text-muted hover:bg-sun-text-main/5 hover:text-sun-primary rounded-xl transition-all active:scale-95 border border-transparent hover:border-sun-border disabled:opacity-50"
                  >
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
                  <button className="mt-6 px-6 py-2.5 bg-sun-text-main/5 hover:bg-sun-primary hover:text-white border border-sun-border hover:border-sun-primary/50 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl transition-all active:scale-95 shadow-sm">
                    View Network Identity
                  </button>
                </div>

                <div className="flex-1">
                  {error && (
                    <div className="mx-4 sm:mx-0 mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                      {error}
                    </div>
                  )}
                  {loadingMessages && (
                    <div className="mx-4 sm:mx-0 mb-4 rounded-2xl border border-sun-border bg-sun-surface px-4 py-3 text-sm text-sun-text-muted">
                      Loading messages...
                    </div>
                  )}
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
                           ? 'bg-sun-primary text-white shadow-lg shadow-sun-primary/20 scale-100 hover:scale-105 active:scale-95' 
                           : 'bg-sun-text-main/5 text-sun-text-muted opacity-30 cursor-not-allowed scale-90'}
                       `}
                     >
                       <Send size={18} strokeWidth={2.5} className="translate-x-0.5" />
                     </button>
                   </div>
                </div>
              </div>
            </div>
            <AnimatePresence>
              {activeCall && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  className="fixed inset-x-4 bottom-4 md:inset-x-auto md:right-6 md:bottom-6 z-50 rounded-3xl border border-sun-border bg-sun-surface shadow-2xl overflow-hidden max-w-4xl"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-sun-border">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-sun-text-muted">Call {activeCall.kind}</p>
                      <p className="text-sm font-semibold text-sun-text-main">{callStatus || activeCall.state}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {callStatus === 'Incoming call' && (
                        <Button onClick={acceptIncomingCall} className="bg-green-500 hover:bg-green-600 text-white">
                          Accept
                        </Button>
                      )}
                      <Button onClick={closeCallSession} className="bg-red-500 hover:bg-red-600 text-white">
                        {callStatus === 'Incoming call' ? 'Decline' : 'End Call'}
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-2">
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-2xl bg-black/80 aspect-video object-cover" />
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-2xl bg-black/80 aspect-video object-cover" />
                  </div>
                  <div className="px-4 pb-4 text-xs text-sun-text-muted">
                    The backend is relaying call signaling; the browser handles the actual media session.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
                </>
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
              <h2 className="text-2xl sm:text-3xl font-black text-sun-text-main tracking-tighter uppercase italic leading-tight mb-3">chat with friends.</h2>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
