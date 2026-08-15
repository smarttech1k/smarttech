import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  FileText,
  Image,
  Info,
  Link2,
  Loader2,
  MessageCircle,
  BellOff,
  Bell,
  Archive,
  Award,
  Ban,
  Bold,
  Camera,
  Copy,
  CornerUpRight,
  Download,
  GraduationCap,
  ImagePlus,
  Italic,
  MapPin,
  Mic,
  Phone,
  Flag,
  MoreHorizontal,
  Pencil,
  Paperclip,
  Pin,
  Reply,
  Square,
  SmilePlus,
  Sparkles,
  Star,
  Trash2,
  Video,
  Plus,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../ui/Avatar';
import { RichContentCard } from './RichContentCard';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { KorusaLogo } from '../../shared/Logo';
import { isKorusaExperience, KorusaExperienceCard } from './KorusaExperienceCard';
import type { KorusaToolDraft } from './KorusaToolsMenu';
import { runMessagingAi, type MessagingAiAction } from '../../../lib/messagingAi';
import { supabase } from '../../../lib/supabase';
import {
  ConversationSummary,
  getCurrentUserId,
  getMessageReactions,
  getOtherLastReadAt,
  listConversations,
  listMessages,
  markConversationRead,
  markMessagesDelivered,
  MemberProfile,
  MessageRow,
  removeMessageSubscription,
  listFriends,
  forwardMessage,
  sendMessage,
  deleteMessage,
  setMessagePinned,
  toggleMessageReaction,
  updateConversationPreferences,
  updateMessage,
  uploadMessageFile,
  startDirectConversation,
  subscribeToConversation,
  subscribeToInbox,
} from '../../../lib/messages';

interface MessagesViewProps {
  onBack?: () => void;
}

const avatarFallback = (id: string) => `https://i.pravatar.cc/150?u=${id}`;
const LazyKorusaToolsMenu = React.lazy(() => import('./KorusaToolsMenu').then((module) => ({ default: module.KorusaToolsMenu })));
type InboxFilter = 'all' | 'unread' | 'groups' | 'archived' | 'favorites' | 'media' | 'pinned' | 'recent';

// Typing indicators are refreshed on a timer rather than per keystroke, and cleared
// once the draft has been idle for longer than a natural pause between words.
const TYPING_PING_INTERVAL_MS = 2500;
const TYPING_IDLE_TIMEOUT_MS = 1400;

const REACTION_EMOJIS = ['❤️', '\u{1F44D}', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}', '\u{1F525}', '\u{1F389}'];

const inboxFilters: Array<{ id: InboxFilter; label: string; comingSoon?: boolean }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'groups', label: 'Groups', comingSoon: true },
  { id: 'archived', label: 'Archived' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'media', label: 'Media' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'recent', label: 'Recent' },
];

type DrawerProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
};

type PendingShare = {
  id: string;
  body: string;
  metadata: Record<string, unknown>;
};

export const MessagesView: React.FC<MessagesViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingBroadcastRef = useRef({ typing: false, sentAt: 0 });
  const attachmentRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const inboxSearchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const chatSwipeStartRef = useRef<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [profileQuery, setProfileQuery] = useState('');
  const [profileResults, setProfileResults] = useState<MemberProfile[]>([]);
  const [profileSearching, setProfileSearching] = useState(false);
  const [suggestedContacts, setSuggestedContacts] = useState<MemberProfile[]>([]);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageRow | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageRow | null>(null);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [formattingOpen, setFormattingOpen] = useState(false);
  const [attachmentAccept, setAttachmentAccept] = useState('image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/webm,application/pdf,text/plain');
  const [cameraMode, setCameraMode] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [drawerProfile, setDrawerProfile] = useState<DrawerProfile | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerStats, setDrawerStats] = useState({ followers: 0, following: 0, mutual: 0, posts: 0 });
  const [followingTarget, setFollowingTarget] = useState(false);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState('');
  const [inboxWidth, setInboxWidth] = useState(372);
  const [drawerWidth, setDrawerWidth] = useState(340);
  const [korusaToolsOpen, setKorusaToolsOpen] = useState(false);
  const [sharingExperience, setSharingExperience] = useState(false);
  const [visibleMessageCount, setVisibleMessageCount] = useState(120);
  const [pendingShare, setPendingShare] = useState<PendingShare | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<MessageRow | null>(null);
  const [forwardTargets, setForwardTargets] = useState<string[]>([]);
  const [forwarding, setForwarding] = useState(false);
  const activeConversation = conversations.find((item) => item.conversationId === selectedId);
  const activeOtherUserId = activeConversation?.otherUserId ?? null;

  // The thread subscription needs current conversation data without tearing down
  // and re-establishing the channel every time the inbox refreshes.
  const activeConversationRef = useRef<ConversationSummary | undefined>(activeConversation);
  activeConversationRef.current = activeConversation;

  // Realtime reaction events carry no conversation id, so the handler needs to know
  // which messages are on screen without re-subscribing whenever the thread changes.
  const messagesRef = useRef<MessageRow[]>(messages);
  messagesRef.current = messages;

  const loadInbox = useCallback(async () => {
    const rows = await listConversations();
    setConversations(rows);
    return rows;
  }, []);

  // Re-reads the reactions for one message and swaps them into that bubble. Reaction
  // traffic is chatty and arrives for every conversation the user belongs to, so
  // anything outside the loaded thread is dropped without a request.
  const patchMessageReactions = useCallback(async (messageId: string) => {
    if (!messagesRef.current.some((item) => item.id === messageId)) return;
    try {
      const reactions = await getMessageReactions(messageId);
      setMessages((previous) =>
        previous.map((item) => (item.id === messageId ? { ...item, message_reactions: reactions } : item)),
      );
    } catch {
      // A dropped reaction refresh is cosmetic; the next thread load will correct it.
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        setLoading(true);
        const userId = await getCurrentUserId();
        const [rows, friends] = await Promise.all([listConversations(), listFriends('')]);
        if (!active) return;
        setCurrentUserId(userId);
        setConversations(rows);
        setSuggestedContacts(friends.slice(0, 5));
      } catch (caught) {
        if (active) setError(toErrorMessage(caught));
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  // Background message notifications are only possible once permission is granted,
  // and the prompt can only be raised from a user gesture on some browsers, so this
  // asks once on first open and never nags again.
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    void Notification.requestPermission().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = subscribeToInbox(() => {
      void loadInbox().catch((caught) => setError(toErrorMessage(caught)));
    });
    return () => { void removeMessageSubscription(channel); };
  }, [currentUserId, loadInbox]);

  useEffect(() => {
    if (!selectedId || !currentUserId || !activeOtherUserId) {
      setMessages([]);
      setOtherLastReadAt(null);
      return;
    }

    const otherUserId = activeOtherUserId;
    let active = true;
    setVisibleMessageCount(120);
    setThreadLoading(true);
    setError('');

    const syncReadCursor = () => {
      void getOtherLastReadAt(selectedId, otherUserId)
        .then((value) => { if (active) setOtherLastReadAt(value); })
        .catch(() => undefined);
    };

    void listMessages(selectedId)
      .then((rows) => {
        if (active) setMessages(rows);
        // Having the thread in hand is what makes inbound messages "delivered".
        // Receipt bookkeeping must never surface as a thread-loading failure.
        void markMessagesDelivered(selectedId).catch(() => undefined);
      })
      .catch((caught) => active && setError(toErrorMessage(caught)))
      .finally(() => active && setThreadLoading(false));

    syncReadCursor();

    void markConversationRead(selectedId, currentUserId)
      .then(loadInbox)
      .catch((caught) => setError(toErrorMessage(caught)));

    const channel = subscribeToConversation(selectedId, {
      onInsert: (message) => {
        setMessages((previous) =>
          previous.some((item) => item.id === message.id) ? previous : [...previous, message],
        );
        if (message.sender_id !== currentUserId) {
          const conversation = activeConversationRef.current;
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && conversation?.notificationsEnabled) {
            new Notification(conversation.fullName || 'New Korusa message', { body: message.body, icon: conversation.avatarUrl || undefined });
          }
          void markMessagesDelivered(selectedId).catch(() => undefined);
          void markConversationRead(selectedId, currentUserId).then(loadInbox);
        }
      },
      // Edits, deletes, pins and delivery transitions all arrive as UPDATEs.
      onUpdate: (message) => {
        setMessages((previous) =>
          previous.map((item) => (item.id === message.id ? { ...item, ...message } : item)),
        );
      },
      onReaction: (messageId) => {
        if (active) void patchMessageReactions(messageId);
      },
      onMemberRead: syncReadCursor,
    });

    return () => {
      active = false;
      void removeMessageSubscription(channel);
    };
  }, [selectedId, currentUserId, activeOtherUserId, loadInbox, patchMessageReactions]);

  useEffect(() => {
    const unread = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
    document.title = unread ? `(${unread}) Korusa` : 'Korusa';
    return () => { document.title = 'Korusa'; };
  }, [conversations]);

  useEffect(() => {
    if (!selectedId || !currentUserId || !activeConversation) return;
    const channel = supabase.channel(`conversation-presence:${selectedId}`, { config: { presence: { key: currentUserId } } });
    presenceRef.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => setOtherOnline(Object.keys(channel.presenceState()).includes(activeConversation.otherUserId)))
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === activeConversation.otherUserId) setOtherTyping(!!payload.typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ userId: currentUserId, onlineAt: new Date().toISOString() });
      });
    return () => {
      presenceRef.current = null;
      // A new thread starts with no typing state broadcast on its channel.
      typingBroadcastRef.current = { typing: false, sentAt: 0 };
      setOtherTyping(false);
      void supabase.removeChannel(channel);
    };
  }, [selectedId, currentUserId, activeConversation?.otherUserId]);

  useEffect(() => {
    const channel = presenceRef.current;
    if (!channel || !currentUserId) return;
    const typing = !!draft.trim();
    const state = typingBroadcastRef.current;
    const send = (value: boolean) => {
      state.typing = value;
      state.sentAt = Date.now();
      void channel.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId, typing: value } });
    };

    // One ping per interval rather than one per keystroke. A long message used to put
    // a broadcast on the wire for every character typed.
    if (typing && (!state.typing || Date.now() - state.sentAt > TYPING_PING_INTERVAL_MS)) send(true);
    else if (!typing && state.typing) send(false);

    if (!typing) return;
    // Rescheduled on each keystroke, so this only lands once the draft goes idle.
    const timer = window.setTimeout(() => { if (state.typing) send(false); }, TYPING_IDLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [draft, currentUserId]);

  useEffect(() => {
    if (!detailsOpen || !activeConversation || !currentUserId) return;
    let active = true;
    const loadDrawerProfile = async () => {
      try {
        setDrawerLoading(true);
        const targetId = activeConversation.otherUserId;
        const [profileResult, followersResult, followingResult, postsResult, viewerFollowingResult] = await Promise.all([
          supabase.from('profiles').select('id, username, full_name, avatar_url, cover_url, bio').eq('id', targetId).single(),
          supabase.from('follows').select('follower_id').eq('following_id', targetId),
          supabase.from('follows').select('following_id').eq('follower_id', targetId),
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
          supabase.from('follows').select('following_id').eq('follower_id', currentUserId),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (!active) return;
        const targetFollowers = (followersResult.data || []).map((row) => row.follower_id);
        const viewerFollowing = new Set((viewerFollowingResult.data || []).map((row) => row.following_id));
        setDrawerProfile(profileResult.data as DrawerProfile);
        setDrawerStats({ followers: targetFollowers.length, following: followingResult.data?.length || 0, mutual: targetFollowers.filter((id) => viewerFollowing.has(id)).length, posts: postsResult.count || 0 });
        setFollowingTarget(targetFollowers.includes(currentUserId));
      } catch (caught) {
        if (active) setError(toErrorMessage(caught));
      } finally {
        if (active) setDrawerLoading(false);
      }
    };
    void loadDrawerProfile();
    return () => { active = false; };
  }, [detailsOpen, activeConversation?.otherUserId, activeConversation?.conversationId, currentUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, threadLoading]);

  useEffect(() => {
    const requestedConversation = searchParams.get('conversation');
    if (
      requestedConversation
      && conversations.some((item) => item.conversationId === requestedConversation)
    ) {
      setSelectedId(requestedConversation);
    }
  }, [conversations, searchParams]);

  useEffect(() => {
    const shareType = searchParams.get('shareType');
    const shareId = searchParams.get('shareId');
    if (shareType !== 'post' || !shareId) return;
    let active = true;
    void supabase.from('posts').select('id, content, media_url, user_id').eq('id', shareId).single().then(({ data, error: shareError }) => {
      if (!active) return;
      if (shareError) {
        setError(shareError.message);
        return;
      }
      setPendingShare({
        id: data.id,
        body: data.content?.slice(0, 120) || 'Shared a Korusa post',
        metadata: {
          title: data.content?.slice(0, 90) || 'Korusa post',
          description: data.content || null,
          image_url: data.media_url || null,
          post_id: data.id,
          author_id: data.user_id,
          url: `/profile/${data.user_id}`,
        },
      });
    });
    return () => { active = false; };
  }, [searchParams]);

  useEffect(() => {
    if (!newChatOpen) return;
    const timer = window.setTimeout(async () => {
      try {
        setProfileSearching(true);
        setProfileResults(await listFriends(profileQuery));
      } catch (caught) {
        setError(toErrorMessage(caught));
      } finally {
        setProfileSearching(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [profileQuery, newChatOpen]);

  const filteredMessages = useMemo(() => {
    const query = chatQuery.trim().toLowerCase();
    return query ? messages.filter((message) => message.body.toLowerCase().includes(query)) : messages;
  }, [messages, chatQuery]);
  const displayedMessages = useMemo(
    () => filteredMessages.slice(Math.max(0, filteredMessages.length - visibleMessageCount)),
    [filteredMessages, visibleMessageCount],
  );
  const sharedContent = useMemo(() => ({
    media: messages.filter((message) => ['image', 'gif', 'sticker', 'video'].includes(message.message_type) && message.media_url),
    files: messages.filter((message) => message.message_type === 'file' && message.media_url),
    links: messages.filter((message) => /https?:\/\/\S+/i.test(message.body)),
    voice: messages.filter((message) => message.message_type === 'voice' && message.media_url),
    pinned: messages.filter((message) => !!message.pinned_at),
    posts: messages.filter((message) => message.message_type === 'post'),
    courses: messages.filter((message) => message.message_type === 'course'),
    experiences: messages.filter((message) => isKorusaExperience(message.message_type)),
  }), [messages]);
  const visibleConversations = useMemo(() => {
    const query = filter.trim().toLowerCase();
    let rows = conversations;
    if (inboxFilter === 'all') rows = rows.filter((item) => !item.archivedAt);
    if (inboxFilter === 'unread') rows = rows.filter((item) => item.unreadCount > 0);
    if (inboxFilter === 'groups') rows = [];
    if (inboxFilter === 'archived') rows = rows.filter((item) => !!item.archivedAt);
    if (inboxFilter === 'favorites') rows = rows.filter((item) => item.favorite);
    if (inboxFilter === 'media') rows = rows.filter((item) => /https?:\/\/|photo|video|image|file/i.test(item.lastMessage || ''));
    if (inboxFilter === 'pinned') rows = rows.filter((item) => !!item.pinnedAt);
    if (inboxFilter === 'recent') {
      const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      rows = rows.filter((item) => item.lastMessageAt && new Date(item.lastMessageAt).getTime() >= recentCutoff);
    }
    if (!query) return rows;
    return rows.filter((item) =>
      [item.fullName, item.username, item.lastMessage]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [conversations, filter, inboxFilter]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !selectedId || !currentUserId || sending || !activeConversation?.canSend) return;
    try {
      setSending(true);
      setDraft('');
      if (editingMessage) {
        await updateMessage(editingMessage.id, body);
        setEditingMessage(null);
        setMessages(await listMessages(selectedId));
        return;
      }
      const saved = await sendMessage(selectedId, currentUserId, body, { replyToId: replyingTo?.id });
      setReplyingTo(null);
      setMessages((previous) =>
        previous.some((item) => item.id === saved.id) ? previous : [...previous, saved],
      );
      await loadInbox();
    } catch (caught) {
      setDraft(body);
      setError(toErrorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  const updateActivePreference = async (changes: Parameters<typeof updateConversationPreferences>[2]) => {
    if (!selectedId || !currentUserId) return;
    await updateConversationPreferences(selectedId, currentUserId, changes);
    await loadInbox();
  };

  const refreshThread = async () => {
    if (selectedId) setMessages(await listMessages(selectedId));
  };

  const exportConversation = () => {
    if (!activeConversation) return;
    const transcript = messages.map((message) => `[${new Date(message.created_at).toLocaleString()}] ${message.sender_id === currentUserId ? 'You' : activeConversation.fullName || activeConversation.username}: ${message.body}`).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([transcript], { type: 'text/plain' }));
    link.download = `korusa-${activeConversation.username || 'conversation'}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleAttachment = async (file: File | null) => {
    if (!file || !selectedId || !currentUserId || !activeConversation?.canSend) return;
    try {
      setUploading(true);
      const path = await uploadMessageFile(selectedId, currentUserId, file);
      const messageType: MessageRow['message_type'] = file.type.startsWith('image/gif') ? 'gif' : file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'voice' : 'file';
      await sendMessage(selectedId, currentUserId, file.name, { messageType, mediaUrl: path, mediaName: file.name, mediaSize: file.size, replyToId: replyingTo?.id });
      setReplyingTo(null);
      await refreshThread();
      await loadInbox();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setUploading(false);
      if (attachmentRef.current) attachmentRef.current.value = '';
    }
  };

  const jumpToMessage = (messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);
    window.setTimeout(() => setHighlightedMessageId((value) => value === messageId ? null : value), 1600);
  };

  const handleThreadScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (element.scrollTop > 80 || displayedMessages.length >= filteredMessages.length) return;
    const previousHeight = element.scrollHeight;
    setVisibleMessageCount((count) => Math.min(filteredMessages.length, count + 100));
    window.requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight - previousHeight;
    });
  };

  const openAttachmentPicker = (accept: string, useCamera = false) => {
    setAttachmentAccept(accept);
    setCameraMode(useCamera);
    window.setTimeout(() => attachmentRef.current?.click(), 0);
  };

  const shareLocation = () => {
    if (!selectedId || !currentUserId || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await sendMessage(selectedId, currentUserId, 'Shared a location', { messageType: 'location', metadata: { latitude: coords.latitude, longitude: coords.longitude } });
          await refreshThread();
          await loadInbox();
        } catch (caught) { setError(toErrorMessage(caught)); }
      },
      () => setError('Korusa could not access your location. Check your browser permission.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        if (blob.size) void handleAttachment(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }));
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    } catch {
      setError('Microphone access is required to record a voice note.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
  };

  const wrapDraft = (marker: string) => {
    setDraft((value) => value ? `${marker}${value}${marker}` : marker + marker);
  };

  const runAiAction = async (action: MessagingAiAction, source?: string) => {
    const transcript = messages.slice(-80).map((message) => `${message.sender_id === currentUserId ? 'You' : activeConversation?.fullName || 'Member'}: ${message.body}`).join('\n');
    const input = source || (action === 'summarize' || action === 'suggest_replies' || action === 'search' ? (action === 'search' ? chatQuery : transcript) : draft);
    if (!input.trim()) {
      setError(action === 'search' ? 'Enter a conversation search question first.' : 'Write or select some text for Korusa AI.');
      return;
    }
    try {
      setAiLoading(true);
      setAiOpen(true);
      setAiOutput(await runMessagingAi(action, input, { context: transcript, language: action === 'translate' ? 'English' : undefined, tone: action === 'change_tone' ? 'warm and friendly' : undefined }));
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setAiLoading(false);
    }
  };

  const shareKorusaExperience = async (experience: KorusaToolDraft) => {
    if (!selectedId || !currentUserId || !activeConversation?.canSend) return;
    try {
      setSharingExperience(true);
      await sendMessage(selectedId, currentUserId, experience.body, { messageType: experience.type, metadata: experience.metadata, replyToId: replyingTo?.id });
      setReplyingTo(null);
      await refreshThread();
      await loadInbox();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setSharingExperience(false);
    }
  };

  const sendPendingShare = async () => {
    if (!pendingShare || !selectedId || !currentUserId || !activeConversation?.canSend) return;
    try {
      setSending(true);
      await sendMessage(selectedId, currentUserId, pendingShare.body, { messageType: 'post', metadata: pendingShare.metadata });
      setPendingShare(null);
      navigate(`/messages?conversation=${selectedId}`, { replace: true });
      await refreshThread();
      await loadInbox();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  const beginResize = (event: React.PointerEvent, side: 'inbox' | 'drawer') => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = side === 'inbox' ? inboxWidth : drawerWidth;
    const move = (pointerEvent: PointerEvent) => {
      const delta = side === 'inbox' ? pointerEvent.clientX - startX : startX - pointerEvent.clientX;
      const next = Math.max(side === 'inbox' ? 300 : 280, Math.min(side === 'inbox' ? 500 : 460, startWidth + delta));
      if (side === 'inbox') setInboxWidth(next);
      else setDrawerWidth(next);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const finishChatSwipe = (clientX: number) => {
    if (chatSwipeStartRef.current === null || !selectedId) return;
    const distance = clientX - chatSwipeStartRef.current;
    chatSwipeStartRef.current = null;
    if (Math.abs(distance) < 90) return;
    const index = conversations.findIndex((conversation) => conversation.conversationId === selectedId);
    const nextIndex = distance < 0 ? index + 1 : index - 1;
    if (conversations[nextIndex]) {
      setSelectedId(conversations[nextIndex].conversationId);
      setDetailsOpen(false);
    }
  };

  const handleConversationSwipe = async (conversation: ConversationSummary, offsetX: number) => {
    if (offsetX > 85) {
      await updateConversationPreferences(conversation.conversationId, currentUserId, { pinned_at: conversation.pinnedAt ? null : new Date().toISOString() });
    } else if (offsetX < -165) {
      if (!window.confirm('Delete this conversation from your inbox? The other member will retain their copy.')) return;
      await updateConversationPreferences(conversation.conversationId, currentUserId, { hidden_at: new Date().toISOString() });
      if (selectedId === conversation.conversationId) setSelectedId(null);
    } else if (offsetX < -85) {
      await updateConversationPreferences(conversation.conversationId, currentUserId, { archived_at: new Date().toISOString() });
    } else {
      return;
    }
    await loadInbox();
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inboxSearchRef.current?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setNewChatOpen(true);
      }
      if (event.key === 'Escape') {
        setMoreOpen(false);
        setMessageMenuId(null);
        setReactionMessageId(null);
        setEmojiOpen(false);
        setFormattingOpen(false);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const submitForward = async () => {
    if (!forwardingMessage || !currentUserId || forwardTargets.length === 0) return;
    try {
      setForwarding(true);
      setError('');
      for (const targetId of forwardTargets) {
        await forwardMessage(forwardingMessage.id, targetId, currentUserId);
      }
      const forwardedToActive = selectedId ? forwardTargets.includes(selectedId) : false;
      setForwardingMessage(null);
      setForwardTargets([]);
      if (forwardedToActive) await refreshThread();
      await loadInbox();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setForwarding(false);
    }
  };

  const handleStartChat = async (profile: MemberProfile) => {    try {
      setError('');
      const conversationId = await startDirectConversation(profile.id);
      await loadInbox();
      setSelectedId(conversationId);
      setNewChatOpen(false);
      setProfileQuery('');
      setProfileResults([]);
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  };

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(109,40,217,0.08),transparent_32%)] text-sun-text-main">
      <aside style={{ '--inbox-width': `${inboxWidth}px` } as React.CSSProperties} className={`relative h-full w-full shrink-0 border-r border-sun-border/80 bg-sun-surface/95 backdrop-blur-xl md:flex md:w-[var(--inbox-width)] md:flex-col ${selectedId ? 'hidden' : 'flex flex-col'}`}>
        <header className="border-b border-sun-border/80 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={onBack || (() => navigate('/home'))} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light" aria-label="Back to home">
                <ArrowLeft size={19} />
              </button>
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">Messages</h1>
                <p className="text-xs text-sun-text-muted">{conversations.length} conversations</p>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }} type="button" onClick={() => setNewChatOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-primary to-sun-secondary text-white shadow-lg shadow-sun-primary/20" aria-label="Start a conversation">
              <Plus size={20} />
            </motion.button>
          </div>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sun-text-muted" />
            <input ref={inboxSearchRef} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search people or messages" className="h-11 w-full rounded-2xl border border-sun-border bg-sun-surface-light pl-10 pr-10 text-sm outline-none transition-all focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10" />
            {filter && <button type="button" onClick={() => setFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-sun-text-muted hover:text-sun-text-main" aria-label="Clear search"><X size={15} /></button>}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide" aria-label="Conversation filters">
            {inboxFilters.map((item) => (
              <button key={item.id} type="button" disabled={item.comingSoon} title={item.comingSoon ? 'Group conversations are coming soon' : undefined} onClick={() => setInboxFilter(item.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all ${item.comingSoon ? 'cursor-not-allowed border border-dashed border-sun-border text-sun-text-muted/50' : inboxFilter === item.id ? 'bg-sun-primary text-white shadow-sm shadow-sun-primary/20' : 'border border-sun-border bg-sun-surface text-sun-text-muted hover:border-sun-primary/35 hover:text-sun-primary'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {error && (
          <div className="m-3 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-600">
            <AlertCircle size={16} className="shrink-0" /><span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sun-text-muted"><Loader2 className="animate-spin" /></div>
          ) : visibleConversations.length === 0 ? (
            <div className="mx-auto flex max-w-[250px] flex-col items-center px-4 py-14 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-primary/10 text-sun-primary"><MessageCircle size={23} /></div>
              <h2 className="text-sm font-semibold">No conversations yet</h2>
              <p className="mt-1 text-xs leading-relaxed text-sun-text-muted">Find a Korusa member and start a private conversation.</p>
              <button type="button" onClick={() => setNewChatOpen(true)} className="mt-4 text-xs font-semibold text-sun-primary">Start messaging</button>
            </div>
          ) : (
            visibleConversations.map((conversation) => (
              <motion.button layout drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.16} onDragEnd={(_, info) => void handleConversationSwipe(conversation, info.offset.x)} key={conversation.conversationId} type="button" onClick={() => { setSelectedId(conversation.conversationId); setDetailsOpen(false); }} whileTap={{ scale: 0.985 }} className={`group mb-1 flex w-full touch-pan-y items-center gap-3 rounded-2xl border p-3 text-left transition-all ${selectedId === conversation.conversationId ? 'border-sun-primary/20 bg-sun-primary/10 shadow-sm' : conversation.unreadCount ? 'border-sun-primary/10 bg-sun-primary/[0.045] hover:bg-sun-primary/[0.07]' : 'border-transparent hover:bg-sun-surface-light'}`}>
                <div className="relative shrink-0">
                  <Avatar src={conversation.avatarUrl || avatarFallback(conversation.otherUserId)} name={conversation.fullName || conversation.username || 'Member'} size="lg" />
                  {conversation.isFriend && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[3px] border-sun-surface bg-emerald-500" aria-label="Friend" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold">{conversation.fullName || conversation.username || 'Korusa member'}{conversation.favorite && <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />}</span>
                    <span className="shrink-0 text-[10px] text-sun-text-muted">{formatConversationTime(conversation.lastMessageAt)}</span>
                  </div>
                  <p className="truncate text-[10px] text-sun-text-muted">@{conversation.username || 'member'}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className={`truncate text-xs ${conversation.unreadCount ? 'font-semibold text-sun-text-main' : 'text-sun-text-muted'}`}>{selectedId === conversation.conversationId && otherTyping ? 'Typing...' : conversation.lastMessage || 'Start the conversation'}</p>
                    <span className="flex shrink-0 items-center gap-1">{!conversation.notificationsEnabled && <BellOff size={11} className="text-sun-text-muted" />}{conversation.pinnedAt && <Pin size={11} className="text-sun-primary" />}{conversation.unreadCount > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex min-w-5 items-center justify-center rounded-full bg-sun-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{Math.min(conversation.unreadCount, 99)}</motion.span>}</span>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>
        <div role="separator" aria-label="Resize conversation sidebar" onPointerDown={(event) => beginResize(event, 'inbox')} className="absolute inset-y-0 right-0 z-20 hidden w-1 cursor-col-resize bg-transparent transition-colors hover:bg-sun-primary/40 md:block" />
      </aside>

      {/* Messages is a full-screen route, so no mobile bottom nav sits underneath —
          the button only has to clear the home indicator on notched devices. */}
      {!selectedId && <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => setNewChatOpen(true)} style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }} className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-primary to-sun-secondary text-white shadow-xl shadow-sun-primary/25 md:hidden" aria-label="Start a new conversation"><Plus size={24} /></motion.button>}

      <main className={`h-full min-w-0 flex-1 flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {activeConversation ? (
          <>
            <header onTouchStart={(event) => { chatSwipeStartRef.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => finishChatSwipe(event.changedTouches[0]?.clientX ?? 0)} className="flex h-[72px] shrink-0 touch-pan-y items-center justify-between border-b border-sun-border/80 bg-sun-surface/90 px-3 backdrop-blur-xl sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setSelectedId(null)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted md:hidden" aria-label="Back to conversations"><ArrowLeft size={20} /></button>
                <div className="relative">
                  <Avatar src={activeConversation.avatarUrl || avatarFallback(activeConversation.otherUserId)} name={activeConversation.fullName || activeConversation.username || 'Member'} />
                  {activeConversation.isFriend && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sun-surface bg-emerald-500" />}
                </div>
                <button type="button" onClick={() => navigate(`/profile/${activeConversation.username || activeConversation.otherUserId}`)} className="min-w-0 text-left">
                  <h2 className="truncate text-sm font-semibold">{activeConversation.fullName || activeConversation.username || 'Korusa member'}</h2>
                  <p className={`truncate text-xs ${otherTyping ? 'font-medium text-sun-primary' : 'text-sun-text-muted'}`}>{otherTyping ? 'Typing...' : otherOnline ? `@${activeConversation.username || 'member'} · Online` : `@${activeConversation.username || 'member'} · Active ${formatConversationTime(activeConversation.lastMessageAt)}`}</p>
                </button>
              </div>
              <div className="relative flex items-center gap-1">
                <button type="button" onClick={() => setChatSearchOpen((value) => !value)} className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${chatSearchOpen ? 'bg-sun-primary/10 text-sun-primary' : 'text-sun-text-muted hover:bg-sun-surface-light'}`} aria-label="Search this chat"><Search size={18} /></button>
                <button type="button" onClick={() => setDetailsOpen(true)} className="hidden h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light sm:flex" aria-label="Pinned messages"><Pin size={18} /></button>
                <button type="button" onClick={() => setDetailsOpen(true)} className="hidden h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light sm:flex" aria-label="Shared media"><Image size={18} /></button>
                <button type="button" onClick={() => void updateActivePreference({ notifications_enabled: !activeConversation.notificationsEnabled })} className="hidden h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light sm:flex" aria-label={activeConversation.notificationsEnabled ? 'Mute notifications' : 'Enable notifications'}>{activeConversation.notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}</button>
                <button type="button" onClick={() => setDetailsOpen((value) => !value)} className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${detailsOpen ? 'bg-sun-primary/10 text-sun-primary' : 'text-sun-text-muted hover:bg-sun-surface-light hover:text-sun-text-main'}`} aria-label="Conversation details" aria-expanded={detailsOpen}><Info size={19} /></button>
                <button type="button" onClick={() => setMoreOpen((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light" aria-label="More conversation actions" aria-expanded={moreOpen}><MoreHorizontal size={19} /></button>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-sun-border bg-sun-surface p-1.5 shadow-2xl">
                      <HeaderMenuButton icon={activeConversation.notificationsEnabled ? BellOff : Bell} label={activeConversation.notificationsEnabled ? 'Mute notifications' : 'Enable notifications'} onClick={() => void updateActivePreference({ notifications_enabled: !activeConversation.notificationsEnabled })} />
                      <HeaderMenuButton icon={Archive} label={activeConversation.archivedAt ? 'Unarchive' : 'Archive'} onClick={() => void updateActivePreference({ archived_at: activeConversation.archivedAt ? null : new Date().toISOString() })} />
                      <HeaderMenuButton icon={Star} label={activeConversation.favorite ? 'Remove favorite' : 'Add to favorites'} onClick={() => void updateActivePreference({ favorite: !activeConversation.favorite })} />
                      <HeaderMenuButton icon={Pin} label={activeConversation.pinnedAt ? 'Unpin conversation' : 'Pin conversation'} onClick={() => void updateActivePreference({ pinned_at: activeConversation.pinnedAt ? null : new Date().toISOString() })} />
                      <HeaderMenuButton icon={Download} label="Export chat" onClick={exportConversation} />
                      <div className="my-1 h-px bg-sun-border" />
                      <HeaderMenuButton icon={Trash2} label="Clear chat for me" danger onClick={async () => { await updateActivePreference({ cleared_at: new Date().toISOString() }); setMessages([]); setMoreOpen(false); }} />
                      <HeaderMenuButton icon={Trash2} label="Delete conversation" danger onClick={async () => { await updateActivePreference({ hidden_at: new Date().toISOString() }); setSelectedId(null); setMoreOpen(false); }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </header>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="shrink-0 overflow-hidden border-b border-red-500/20 bg-red-500/8 md:hidden">
                  <div className="flex items-start gap-2 p-3 text-xs text-red-600">
                    <AlertCircle size={15} className="mt-px shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {chatSearchOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 54, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="shrink-0 overflow-hidden border-b border-sun-border bg-sun-surface">
                  <div className="relative mx-auto max-w-3xl px-4 py-2">
                    <Search size={15} className="absolute left-7 top-1/2 -translate-y-1/2 text-sun-text-muted" />
                    <input autoFocus value={chatQuery} onChange={(event) => setChatQuery(event.target.value)} placeholder="Search messages in this conversation" className="h-9 w-full rounded-xl border border-sun-border bg-sun-surface-light pl-9 pr-16 text-xs outline-none focus:border-sun-primary" />
                    <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[10px] text-sun-text-muted">{displayedMessages.length} found</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={scrollRef} onScroll={handleThreadScroll} className="flex-1 overflow-y-auto bg-[linear-gradient(rgba(109,40,217,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(109,40,217,0.018)_1px,transparent_1px)] bg-[size:28px_28px] px-4 py-6 sm:px-8 scrollbar-hide">
              {threadLoading ? (
                <div className="mx-auto flex max-w-3xl flex-col gap-3 py-10" aria-label="Loading messages">{Array.from({ length: 7 }, (_, index) => <div key={index} className={`h-12 animate-pulse rounded-2xl bg-sun-border/30 ${index % 2 ? 'ml-auto w-2/5' : 'mr-auto w-3/5'}`} />)}</div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Avatar src={activeConversation.avatarUrl || avatarFallback(activeConversation.otherUserId)} name={activeConversation.fullName || 'Member'} size="xl" />
                  <h3 className="mt-4 font-display text-xl font-semibold">{activeConversation.fullName || activeConversation.username}</h3>
                  <p className="mt-1 max-w-xs text-sm text-sun-text-muted">This is the beginning of your private conversation.</p>
                </div>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-2">
                  {displayedMessages.map((message, index) => {
                    const mine = message.sender_id === currentUserId;
                    const previous = displayedMessages[index - 1];
                    const startsGroup = !previous || previous.sender_id !== message.sender_id || !sameDay(previous.created_at, message.created_at);
                    const showDay = !previous || !sameDay(previous.created_at, message.created_at);
                    const repliedMessage = message.reply_to_id ? messages.find((item) => item.id === message.reply_to_id) : null;
                    const reactionGroups = Object.entries((message.message_reactions || []).reduce<Record<string, number>>((groups, reaction) => ({ ...groups, [reaction.emoji]: (groups[reaction.emoji] || 0) + 1 }), {}));
                    return (
                      <React.Fragment key={message.id}>
                        {showDay && <div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sun-text-muted before:h-px before:flex-1 before:bg-sun-border/60 after:h-px after:flex-1 after:bg-sun-border/60"><span>{formatDay(message.created_at)}</span></div>}
                        <div ref={(element) => { if (element) messageRefs.current.set(message.id, element); else messageRefs.current.delete(message.id); }} onContextMenu={(event) => { event.preventDefault(); setMessageMenuId(message.id); }} className={`group relative flex items-center gap-1.5 rounded-2xl transition-all ${highlightedMessageId === message.id ? 'bg-sun-primary/10 ring-4 ring-sun-primary/10' : ''} ${mine ? 'justify-end' : 'justify-start'} ${startsGroup ? 'mt-2' : ''}`}>
                          {/* Hover-only affordance, so it is desktop-only: on a phone it
                              could never be triggered yet still reserved ~90px of every
                              row's width. Touch uses long-press and swipe instead. */}
                          <div className={`relative hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 md:flex ${mine ? 'order-first' : 'order-last'}`}>
                            <button type="button" onClick={() => setReplyingTo(message)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun-surface text-sun-text-muted shadow-sm hover:text-sun-primary" aria-label="Reply"><Reply size={13} /></button>
                            <button type="button" onClick={() => setReactionMessageId(reactionMessageId === message.id ? null : message.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun-surface text-sun-text-muted shadow-sm hover:text-sun-primary" aria-label="React"><SmilePlus size={13} /></button>
                            <button type="button" onClick={() => setMessageMenuId(messageMenuId === message.id ? null : message.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun-surface text-sun-text-muted shadow-sm hover:text-sun-primary" aria-label="Message actions"><MoreHorizontal size={13} /></button>
                          </div>
                          {/* The picker and the action menu are siblings of the rail rather
                              than children: a hidden ancestor would take them down with it. */}
                          {reactionMessageId === message.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`absolute bottom-full z-30 mb-1 flex gap-1 rounded-full border border-sun-border bg-sun-surface p-1.5 shadow-xl ${mine ? 'right-0' : 'left-0'}`}>
                              {REACTION_EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={async () => { setReactionMessageId(null); await toggleMessageReaction(message.id, emoji); await patchMessageReactions(message.id); }} className="text-base transition-transform hover:scale-125">{emoji}</button>)}
                            </motion.div>
                          )}
                          {messageMenuId === message.id && (
                            <div className={`fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[100] max-h-[80dvh] overflow-y-auto rounded-3xl border border-sun-border bg-sun-surface p-2 text-sun-text-main shadow-2xl md:absolute md:inset-x-auto md:bottom-full md:mb-1 md:max-h-none md:w-44 md:overflow-visible md:rounded-2xl md:p-1.5 ${mine ? 'md:right-0' : 'md:left-0'}`}>
                              {/* Reactions have no hover rail on touch, so the sheet carries them. */}
                              <div className="mb-1 flex items-center gap-0.5 border-b border-sun-border px-1 pb-2 md:hidden">
                                {REACTION_EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={async () => { setMessageMenuId(null); await toggleMessageReaction(message.id, emoji); await patchMessageReactions(message.id); }} className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-full text-lg active:bg-sun-surface-light" aria-label={`React with ${emoji}`}>{emoji}</button>)}
                              </div>
                              <HeaderMenuButton icon={Copy} label="Copy" onClick={() => { void navigator.clipboard.writeText(message.body); setMessageMenuId(null); }} />
                              <HeaderMenuButton icon={Reply} label="Reply" onClick={() => { setReplyingTo(message); setMessageMenuId(null); }} />
                              <HeaderMenuButton icon={CornerUpRight} label="Forward" onClick={() => { setForwardingMessage(message); setForwardTargets([]); setMessageMenuId(null); }} />
                              <HeaderMenuButton icon={Pin} label={message.pinned_at ? 'Unpin' : 'Pin'} onClick={() => void setMessagePinned(message.id, !message.pinned_at).then(refreshThread)} />
                              <HeaderMenuButton icon={Sparkles} label="Explain with AI" onClick={() => { setMessageMenuId(null); void runAiAction('explain', message.body); }} />
                              <HeaderMenuButton icon={Sparkles} label="Translate with AI" onClick={() => { setMessageMenuId(null); void runAiAction('translate', message.body); }} />
                              {mine && !message.deleted_at && <HeaderMenuButton icon={Pencil} label="Edit" onClick={() => { setEditingMessage(message); setDraft(message.body); setMessageMenuId(null); }} />}
                              {mine && !message.deleted_at && <HeaderMenuButton icon={Trash2} label="Delete" danger onClick={() => void deleteMessage(message.id).then(refreshThread)} />}
                            </div>
                          )}
                          <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.14} onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 72) setReplyingTo(message); }} onPointerDown={() => { longPressTimerRef.current = window.setTimeout(() => setMessageMenuId(message.id), 520); }} onPointerUp={() => { if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current); }} onPointerCancel={() => { if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current); }} initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`max-w-[86%] touch-pan-y rounded-[20px] px-4 py-2.5 text-sm shadow-sm sm:max-w-[68%] ${mine ? 'rounded-br-md bg-gradient-to-br from-sun-primary to-sun-secondary text-white shadow-sun-primary/10' : 'rounded-bl-md border border-sun-border/80 bg-sun-surface text-sun-text-main'}`}>
                            {repliedMessage && <button type="button" onClick={() => jumpToMessage(repliedMessage.id)} className={`mb-2 block w-full rounded-xl border-l-2 px-2.5 py-1.5 text-left text-[10px] transition-colors hover:brightness-95 ${mine ? 'border-white/60 bg-white/10 text-white/80' : 'border-sun-primary bg-sun-primary/5 text-sun-text-muted'}`}><span className="font-semibold">{repliedMessage.sender_id === currentUserId ? 'You' : activeConversation.fullName}</span><p className="truncate">{repliedMessage.body}</p></button>}
                            {message.forwarded_from_id && <p className={`mb-1 text-[9px] font-semibold uppercase tracking-wider ${mine ? 'text-white/60' : 'text-sun-primary'}`}>Forwarded</p>}
                            {!message.deleted_at && message.media_url && ['image', 'gif', 'sticker'].includes(message.message_type) && <img src={message.media_url} alt={message.media_name || message.body || 'Shared image'} className="mb-2 max-h-80 w-full rounded-xl object-cover" />}
                            {!message.deleted_at && message.media_url && message.message_type === 'video' && <video src={message.media_url} controls preload="metadata" className="mb-2 max-h-80 w-full rounded-xl bg-black" />}
                            {!message.deleted_at && message.media_url && message.message_type === 'voice' && <VoiceMessagePlayer src={message.media_url} mine={mine} name={message.media_name} />}
                            {!message.deleted_at && message.media_url && message.message_type === 'file' && <a href={message.media_url} target="_blank" rel="noreferrer" className={`mb-2 flex items-center gap-2 rounded-xl p-2.5 ${mine ? 'bg-white/10' : 'bg-sun-surface-light'}`}><FileText size={20} /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{message.media_name || message.body}</span><span className="text-[9px] opacity-65">{formatFileSize(message.media_size)}</span></span></a>}
                            {!message.deleted_at && message.message_type === 'location' && typeof message.metadata?.latitude === 'number' && typeof message.metadata?.longitude === 'number' && <a href={`https://www.google.com/maps?q=${message.metadata.latitude},${message.metadata.longitude}`} target="_blank" rel="noreferrer" className={`mb-2 block rounded-xl p-3 font-semibold ${mine ? 'bg-white/10' : 'bg-sun-primary/5 text-sun-primary'}`}>View shared location</a>}
                            {!message.deleted_at && <RichContentCard message={message} mine={mine} />}
                            {!message.deleted_at && isKorusaExperience(message.message_type) && <KorusaExperienceCard message={message} mine={mine} />}
                            <p className={`whitespace-pre-wrap break-words leading-relaxed ${message.deleted_at ? 'italic opacity-60' : ''} ${message.media_url && message.body === message.media_name ? 'sr-only' : ''}`}>{message.body}</p>
                            <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${mine ? 'text-white/65' : 'text-sun-text-muted'}`}>
                              {message.edited_at && <span>Edited</span>}
                              {message.pinned_at && <Pin size={9} />}
                              {formatMessageTime(message.created_at)}
                              {mine && <DeliveryTicks state={resolveDeliveryState(message, otherLastReadAt)} />}
                            </div>
                            {reactionGroups.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{reactionGroups.map(([emoji, count]) => <button key={emoji} type="button" onClick={() => void toggleMessageReaction(message.id, emoji).then(() => patchMessageReactions(message.id))} className={`rounded-full border px-1.5 py-0.5 text-[10px] shadow-sm ${mine ? 'border-white/20 bg-white/10' : 'border-sun-border bg-sun-surface-light'}`}>{emoji} {count}</button>)}</div>}
                          </motion.div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Full-screen route with nothing below it, so the composer owns the
                home-indicator inset itself. */}
            <div className="shrink-0 border-t border-sun-border/80 bg-sun-surface/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {pendingShare && <div className="mx-auto mb-2 flex max-w-3xl items-center gap-3 rounded-2xl border border-sun-primary/20 bg-sun-primary/5 p-3"><div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-wider text-sun-primary">Share this post</p><p className="truncate text-xs font-semibold">{pendingShare.body}</p></div><button type="button" onClick={() => setPendingShare(null)} className="composer-tool" aria-label="Cancel sharing"><X size={16} /></button><button type="button" onClick={() => void sendPendingShare()} disabled={sending} className="rounded-xl bg-sun-primary px-3 py-2 text-[10px] font-bold text-white">{sending ? 'Sharing...' : 'Share'}</button></div>}
              {!activeConversation.isFriend && (
                <div className="mx-auto mb-3 max-w-3xl rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-center text-xs text-amber-700 dark:text-amber-300">
                  {activeConversation.canSend
                    ? 'You are no longer friends. You may send one message, then wait for a reply.'
                    : 'Waiting for a reply before you can send another message.'}
                </div>
              )}
              {(replyingTo || editingMessage) && (
                <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between rounded-xl border border-sun-primary/20 bg-sun-primary/5 px-3 py-2">
                  <div className="min-w-0 border-l-2 border-sun-primary pl-2"><p className="text-[10px] font-semibold text-sun-primary">{editingMessage ? 'Editing message' : `Replying to ${replyingTo?.sender_id === currentUserId ? 'yourself' : activeConversation.fullName || 'member'}`}</p><p className="truncate text-xs text-sun-text-muted">{editingMessage?.body || replyingTo?.body}</p></div>
                  <button type="button" onClick={() => { setReplyingTo(null); setEditingMessage(null); if (editingMessage) setDraft(''); }} className="ml-2 text-sun-text-muted hover:text-sun-text-main" aria-label="Cancel"><X size={16} /></button>
                </div>
              )}
              <AnimatePresence>
                {aiOpen && (
                  <motion.div initial={{ opacity: 0, y: 8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 8, height: 0 }} className="mx-auto mb-2 max-w-3xl overflow-hidden rounded-2xl border border-sun-primary/20 bg-gradient-to-br from-sun-primary/10 to-sun-secondary/5">
                    <div className="flex items-center justify-between border-b border-sun-primary/10 px-3 py-2"><span className="flex items-center gap-1.5 text-[10px] font-bold text-sun-primary"><Sparkles size={13} />Korusa AI</span><button type="button" onClick={() => setAiOpen(false)} aria-label="Close AI tools"><X size={14} /></button></div>
                    <div className="flex gap-1 overflow-x-auto p-2 scrollbar-hide">{[{ action: 'rewrite', label: 'Rewrite' }, { action: 'fix_grammar', label: 'Fix grammar' }, { action: 'change_tone', label: 'Warm tone' }, { action: 'translate', label: 'Translate' }, { action: 'summarize', label: 'Summarize' }, { action: 'suggest_replies', label: 'Suggest replies' }, { action: 'hashtags', label: 'Hashtags' }, { action: 'caption', label: 'Caption' }].map((item) => <button key={item.action} type="button" onClick={() => void runAiAction(item.action as MessagingAiAction)} className="shrink-0 rounded-full border border-sun-primary/15 bg-sun-surface px-2.5 py-1 text-[9px] font-semibold text-sun-primary hover:bg-sun-primary hover:text-white">{item.label}</button>)}</div>
                    {(aiLoading || aiOutput) && <div className="border-t border-sun-primary/10 p-3">{aiLoading ? <div className="flex items-center gap-2 text-xs text-sun-text-muted"><Loader2 size={14} className="animate-spin" />Korusa AI is thinking...</div> : <><p className="whitespace-pre-wrap text-xs leading-relaxed">{aiOutput}</p><button type="button" onClick={() => { setDraft(aiOutput); setAiOpen(false); }} className="mt-2 text-[10px] font-bold text-sun-primary">Use in composer</button></>}</div>}
                  </motion.div>
                )}
              </AnimatePresence>
              <div onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); void handleAttachment(event.dataTransfer.files?.[0] || null); }} className="relative mx-auto max-w-3xl">
                <input ref={attachmentRef} type="file" className="hidden" accept={attachmentAccept} capture={cameraMode ? 'environment' : undefined} onChange={(event) => void handleAttachment(event.target.files?.[0] || null)} />
                <AnimatePresence>
                  {dragActive && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center rounded-[22px] border-2 border-dashed border-sun-primary bg-sun-primary/10 text-xs font-bold text-sun-primary backdrop-blur-sm">Drop to share</motion.div>}
                </AnimatePresence>
                {(formattingOpen || emojiOpen) && (
                  <div className="mb-2 flex items-center gap-1 overflow-x-auto rounded-2xl border border-sun-border bg-sun-surface p-2 shadow-lg scrollbar-hide">
                    {formattingOpen && <><button type="button" onClick={() => wrapDraft('**')} className="composer-tool" title="Bold"><Bold size={15} /></button><button type="button" onClick={() => wrapDraft('_')} className="composer-tool" title="Italic"><Italic size={15} /></button><button type="button" onClick={() => setDraft((value) => value + ' @')} className="composer-tool text-xs font-bold" title="Mention">@</button><button type="button" onClick={() => setDraft((value) => value + ' #')} className="composer-tool text-xs font-bold" title="Hashtag">#</button></>}
                    {emojiOpen && ['\u{1F600}', '\u{1F602}', '\u{1F60D}', '\u{1F525}', '\u{1F44F}', '\u{1F44D}', '\u2764\uFE0F', '\u{1F389}', '\u{1F914}', '\u{1F64C}'].map((emoji) => <button key={emoji} type="button" onClick={() => setDraft((value) => value + emoji)} className="shrink-0 rounded-lg p-1 text-lg hover:bg-sun-surface-light">{emoji}</button>)}
                  </div>
                )}
                <div className={`flex items-end gap-1 rounded-[22px] border bg-sun-surface-light p-2 shadow-sm transition-all focus-within:border-sun-primary focus-within:shadow-sun-glow focus-within:ring-4 focus-within:ring-sun-primary/10 ${recording ? 'border-red-400' : 'border-sun-border'}`}>
                  <button type="button" onClick={() => openAttachmentPicker('image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/webm,application/pdf,text/plain')} disabled={uploading || !activeConversation.canSend} className="composer-tool" aria-label="Attach file">{uploading ? <Loader2 size={17} className="animate-spin" /> : <Paperclip size={17} />}</button>
                  {/* capture="environment" only does anything on a phone, so this one
                      stays visible on mobile; the paperclip covers the desktop case. */}
                  <button type="button" onClick={() => openAttachmentPicker('image/*', true)} className="composer-tool" aria-label="Open camera"><Camera size={17} /></button>
                  <button type="button" onClick={() => openAttachmentPicker('image/*,video/*')} className="composer-tool hidden sm:flex" aria-label="Open gallery"><ImagePlus size={17} /></button>
                  <button type="button" onClick={() => { setEmojiOpen((value) => !value); setFormattingOpen(false); }} className="composer-tool" aria-label="Emoji picker"><SmilePlus size={17} /></button>
                  <button type="button" onClick={() => { setFormattingOpen((value) => !value); setEmojiOpen(false); }} className="composer-tool hidden sm:flex" aria-label="Formatting toolbar"><Bold size={16} /></button>
                  <button type="button" onClick={() => setAiOpen((value) => !value)} className="composer-tool hidden sm:flex" aria-label="Korusa AI tools"><Sparkles size={17} /></button>
                  <button type="button" onClick={() => setKorusaToolsOpen(true)} disabled={sharingExperience} className="composer-tool" aria-label="Create a Korusa learning experience">{sharingExperience ? <Loader2 size={17} className="animate-spin" /> : <GraduationCap size={17} />}</button>
                  {recording ? (
                    <div className="flex min-h-10 flex-1 items-center gap-2 px-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" /><span className="text-xs font-semibold text-red-500">{formatDuration(recordingSeconds)}</span><div className="flex flex-1 items-center justify-center gap-1">{Array.from({ length: 22 }, (_, index) => <motion.span key={index} animate={{ height: [5, 8 + ((index * 9) % 18), 5] }} transition={{ repeat: Infinity, duration: 0.7, delay: index * 0.025 }} className="w-0.5 rounded-full bg-sun-primary" />)}</div></div>
                  ) : <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} rows={1} maxLength={4000} disabled={!activeConversation.canSend} placeholder={activeConversation.canSend ? 'Write a message...' : 'Waiting for a reply...'} className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-sun-text-muted/60 disabled:cursor-not-allowed disabled:opacity-60" />}
                  {!draft.trim() && !editingMessage ? <button type="button" onClick={recording ? stopVoiceRecording : () => void startVoiceRecording()} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${recording ? 'bg-red-500' : 'bg-gradient-to-br from-sun-primary to-sun-secondary'}`} aria-label={recording ? 'Stop recording' : 'Record voice note'}>{recording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}</button> : <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => void handleSend()} disabled={sending || !activeConversation.canSend} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sun-primary to-sun-secondary text-white shadow-md shadow-sun-primary/20 disabled:opacity-40" aria-label="Send message">{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</motion.button>}
                </div>
                <div className="mt-1.5 flex items-center justify-end gap-1"><button type="button" onClick={shareLocation} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-sun-text-muted hover:text-sun-primary sm:text-[9px]"><MapPin size={11} />Location</button></div>
              </div>
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative flex h-full flex-col items-center justify-center overflow-y-auto p-6 text-center">
            <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-sun-primary/10 blur-3xl" />
            <div className="relative flex max-w-lg flex-col items-center">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} className="rounded-[28px] border border-sun-primary/15 bg-sun-surface/80 p-5 shadow-2xl shadow-sun-primary/10 backdrop-blur-xl"><KorusaLogo vertical size={34} textClassName="text-base" /></motion.div>
              <h2 className="mt-6 font-display text-2xl font-bold">Welcome to Korusa messages</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-sun-text-muted">Private conversations for sharing ideas, moments, lessons and everything you are building together.</p>
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => setNewChatOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sun-primary to-sun-secondary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sun-primary/20"><UserPlus size={17} />New conversation</motion.button>
              {conversations.length > 0 && <div className="mt-8 w-full"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sun-text-muted">Recent contacts</p><div className="flex justify-center gap-3">{conversations.slice(0, 5).map((conversation) => <motion.button whileHover={{ y: -4 }} key={conversation.conversationId} type="button" onClick={() => setSelectedId(conversation.conversationId)} className="flex w-16 flex-col items-center gap-1.5"><Avatar src={conversation.avatarUrl || avatarFallback(conversation.otherUserId)} name={conversation.fullName || 'Member'} /><span className="w-full truncate text-[9px] font-semibold">{conversation.fullName || conversation.username}</span></motion.button>)}</div></div>}
              {suggestedContacts.length > 0 && <div className="mt-7 w-full border-t border-sun-border pt-5"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sun-text-muted">Friends you can message</p><button type="button" onClick={() => navigate('/explore')} className="text-[10px] font-semibold text-sun-primary">Explore creators</button></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{suggestedContacts.slice(0, 4).map((profile) => <button key={profile.id} type="button" onClick={() => void handleStartChat(profile)} className="flex items-center gap-2 rounded-2xl border border-sun-border bg-sun-surface/70 p-2.5 text-left hover:border-sun-primary/30"><Avatar size="sm" src={profile.avatar_url || avatarFallback(profile.id)} name={profile.full_name || 'Member'} /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{profile.full_name || profile.username}</span><span className="block truncate text-[9px] text-sun-text-muted">@{profile.username || 'member'}</span></span></button>)}</div></div>}
            </div>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {detailsOpen && activeConversation && (
          <>
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" onClick={() => setDetailsOpen(false)} className="absolute inset-0 z-30 bg-black/35 backdrop-blur-[2px] xl:hidden" aria-label="Close conversation details" />
            <motion.aside style={{ '--drawer-width': `${drawerWidth}px` } as React.CSSProperties} initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 32, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-y-0 right-0 z-40 flex w-[min(88vw,340px)] shrink-0 flex-col border-l border-sun-border bg-sun-surface shadow-2xl xl:relative xl:z-auto xl:w-[var(--drawer-width)] xl:shadow-none">
              <div role="separator" aria-label="Resize profile drawer" onPointerDown={(event) => beginResize(event, 'drawer')} className="absolute inset-y-0 left-0 z-20 hidden w-1 cursor-col-resize bg-transparent transition-colors hover:bg-sun-primary/40 xl:block" />
              <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-sun-border px-5">
                <div><h2 className="text-sm font-bold">Conversation info</h2><p className="text-[11px] text-sun-text-muted">People, media and privacy</p></div>
                <button type="button" onClick={() => setDetailsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light" aria-label="Close details"><X size={18} /></button>
              </header>
              <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
                {drawerLoading ? <div className="flex h-48 items-center justify-center"><Loader2 className="animate-spin text-sun-primary" /></div> : (
                  <>
                    <div className="-mx-5 -mt-5">
                      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-sun-primary via-sun-secondary to-fuchsia-500">
                        {drawerProfile?.cover_url && <img src={drawerProfile.cover_url} alt="" className="h-full w-full object-cover" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      </div>
                      <div className="relative -mt-10 flex flex-col items-center px-5 text-center">
                        <div className="rounded-full bg-sun-surface p-1 shadow-xl"><Avatar size="xl" src={drawerProfile?.avatar_url || activeConversation.avatarUrl || avatarFallback(activeConversation.otherUserId)} name={drawerProfile?.full_name || activeConversation.fullName || 'Member'} /></div>
                        <div className="mt-2 flex items-center gap-1.5"><h3 className="font-display text-lg font-bold">{drawerProfile?.full_name || activeConversation.fullName || activeConversation.username}</h3>{drawerStats.posts > 0 && <Award size={15} className="text-sun-primary" aria-label="Creator" />}</div>
                        <p className="text-xs text-sun-text-muted">@{drawerProfile?.username || activeConversation.username || 'member'}</p>
                        {drawerProfile?.bio && <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-sun-text-muted">{drawerProfile.bio}</p>}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 divide-x divide-sun-border rounded-2xl border border-sun-border bg-sun-surface-light py-3 text-center">
                      <div><p className="text-sm font-bold">{drawerStats.followers}</p><p className="text-[9px] text-sun-text-muted">Followers</p></div>
                      <div><p className="text-sm font-bold">{drawerStats.following}</p><p className="text-[9px] text-sun-text-muted">Following</p></div>
                      <div><p className="text-sm font-bold">{drawerStats.mutual}</p><p className="text-[9px] text-sun-text-muted">Mutual</p></div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      <button type="button" onClick={() => setDetailsOpen(false)} className="profile-drawer-action"><MessageCircle size={16} /><span>Message</span></button>
                      <button type="button" disabled title="Korusa calls require the upcoming call service" className="profile-drawer-action opacity-45"><Phone size={16} /><span>Call</span></button>
                      <button type="button" onClick={async () => { const next = !followingTarget; if (next) await supabase.from('follows').insert({ follower_id: currentUserId, following_id: activeConversation.otherUserId }); else await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', activeConversation.otherUserId); setFollowingTarget(next); }} className="profile-drawer-action"><UserPlus size={16} /><span>{followingTarget ? 'Unfollow' : 'Follow'}</span></button>
                      <button type="button" onClick={() => navigate(`/profile/${activeConversation.username || activeConversation.otherUserId}`)} className="profile-drawer-action"><ChevronRight size={16} /><span>Full profile</span></button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={async () => { if (!window.confirm('Block this member? Messaging and following will be restricted.')) return; await supabase.rpc('set_user_block', { target_user_id: activeConversation.otherUserId, should_block: true }); setDetailsOpen(false); await loadInbox(); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-[10px] font-semibold text-red-500 hover:bg-red-500/10"><Ban size={13} />Block</button>
                      <button type="button" onClick={async () => { const details = window.prompt('Briefly describe why you are reporting this member:'); if (!details?.trim()) return; const { error: reportError } = await supabase.from('user_reports').insert({ reporter_id: currentUserId, reported_id: activeConversation.otherUserId, reason: 'conversation_safety', details: details.trim() }); if (reportError) setError(reportError.message); else setError(''); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-sun-border px-3 py-2 text-[10px] font-semibold text-sun-text-muted hover:text-red-500"><Flag size={13} />Report</button>
                    </div>
                  </>
                )}

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-bold">Shared in this chat</h4><span className="text-[10px] text-sun-text-muted">{messages.length} messages</span></div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ icon: Image, label: 'Media', count: sharedContent.media.length }, { icon: Link2, label: 'Links', count: sharedContent.links.length }, { icon: FileText, label: 'Files', count: sharedContent.files.length }, { icon: Mic, label: 'Voice', count: sharedContent.voice.length }, { icon: Pin, label: 'Pinned', count: sharedContent.pinned.length }, { icon: GraduationCap, label: 'Learn', count: sharedContent.courses.length + sharedContent.experiences.length }].map((item) => (
                      <div key={item.label} className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-sun-border bg-sun-surface-light text-sun-text-muted">
                        <item.icon size={18} /><span className="mt-1.5 text-[10px] font-semibold">{item.label}</span><span className="mt-0.5 text-[9px]">{item.count}</span>
                      </div>
                    ))}
                  </div>
                  {sharedContent.media.length > 0 && <div className="mt-4 grid grid-cols-3 gap-1.5">{sharedContent.media.slice(0, 18).map((message) => message.message_type === 'video' ? <button key={message.id} type="button" onClick={() => { setDetailsOpen(false); jumpToMessage(message.id); }} className="flex aspect-square items-center justify-center rounded-xl bg-black text-white"><Video size={18} /></button> : <button key={message.id} type="button" onClick={() => { setDetailsOpen(false); jumpToMessage(message.id); }} className="aspect-square overflow-hidden rounded-xl"><img src={message.media_url || ''} alt="" className="h-full w-full object-cover" /></button>)}</div>}
                  {sharedContent.pinned.length > 0 && <div className="mt-4 space-y-1.5"><p className="text-[10px] font-bold uppercase tracking-wider text-sun-text-muted">Pinned messages</p>{sharedContent.pinned.slice(0, 8).map((message) => <button key={message.id} type="button" onClick={() => { setDetailsOpen(false); jumpToMessage(message.id); }} className="block w-full truncate rounded-xl border border-sun-border px-3 py-2 text-left text-[10px] hover:border-sun-primary/30">{message.body}</button>)}</div>}
                  {(sharedContent.posts.length > 0 || sharedContent.courses.length > 0) && <div className="mt-4 space-y-1.5"><p className="text-[10px] font-bold uppercase tracking-wider text-sun-text-muted">Shared posts and courses</p>{[...sharedContent.posts, ...sharedContent.courses].slice(0, 8).map((message) => <button key={message.id} type="button" onClick={() => { setDetailsOpen(false); jumpToMessage(message.id); }} className="block w-full truncate rounded-xl bg-sun-primary/5 px-3 py-2 text-left text-[10px] font-semibold text-sun-primary">{message.body}</button>)}</div>}
                  {sharedContent.experiences.length > 0 && <div className="mt-4 space-y-1.5"><p className="text-[10px] font-bold uppercase tracking-wider text-sun-text-muted">Learning together</p>{sharedContent.experiences.slice(0, 8).map((message) => <button key={message.id} type="button" onClick={() => { setDetailsOpen(false); jumpToMessage(message.id); }} className="flex w-full items-center gap-2 rounded-xl border border-sun-primary/15 bg-sun-primary/5 px-3 py-2 text-left text-[10px] font-semibold text-sun-primary"><GraduationCap size={13} /><span className="truncate">{message.body}</span></button>)}</div>}
                  {!sharedContent.media.length && !sharedContent.files.length && !sharedContent.links.length && !sharedContent.voice.length && !sharedContent.pinned.length && <div className="mt-3 rounded-xl bg-sun-surface-light px-3 py-4 text-center text-[10px] leading-relaxed text-sun-text-muted">Shared content will appear here automatically.</div>}
                </div>

                <div className="mt-6 rounded-2xl border border-sun-border p-4">
                  <div className="flex gap-3"><ShieldCheck size={18} className="shrink-0 text-sun-primary" /><div><h4 className="text-xs font-bold">Privacy and safety</h4><p className="mt-1 text-[10px] leading-relaxed text-sun-text-muted">Korusa applies your friendship, block and one-message reply rules to this conversation.</p></div></div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {newChatOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          {/* Bounded to the viewport with the list as the only scroller, so a short
              or landscape screen never clips the header off the top. */}
          <section className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-sun-border bg-sun-surface shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
            <header className="flex shrink-0 items-center justify-between border-b border-sun-border p-5">
              <div><h2 id="new-chat-title" className="font-display text-xl font-semibold">New conversation</h2><p className="text-xs text-sun-text-muted">Choose one of your Korusa friends</p></div>
              <button type="button" onClick={() => setNewChatOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light" aria-label="Close"><X size={19} /></button>
            </header>
            <div className="flex min-h-0 flex-col p-4">
              <div className="relative shrink-0">
                <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sun-text-muted" />
                <input autoFocus value={profileQuery} onChange={(event) => setProfileQuery(event.target.value)} placeholder="Search your friends" className="h-11 w-full rounded-xl border border-sun-border bg-sun-surface-light pl-10 pr-4 text-sm outline-none focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10" />
              </div>
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto sm:max-h-80">
                {profileSearching ? <div className="flex h-24 items-center justify-center"><Loader2 className="animate-spin text-sun-text-muted" /></div> : profileResults.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-xs text-sun-text-muted">No matching friends found.</p>
                    <button type="button" onClick={() => navigate('/explore')} className="mt-3 text-xs font-semibold text-sun-primary">Find people to follow</button>
                  </div>
                ) : profileResults.map((profile) => (
                  <button key={profile.id} type="button" onClick={() => void handleStartChat(profile)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-sun-surface-light">
                    <Avatar src={profile.avatar_url || avatarFallback(profile.id)} name={profile.full_name || profile.username || 'Member'} />
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{profile.full_name || profile.username || 'Korusa member'}</p><p className="truncate text-xs text-sun-text-muted">@{profile.username || 'member'}</p></div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
      {forwardingMessage && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <section className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-sun-border bg-sun-surface shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="forward-title">
            <header className="flex shrink-0 items-center justify-between border-b border-sun-border p-5">
              <div><h2 id="forward-title" className="font-display text-xl font-semibold">Forward message</h2><p className="text-xs text-sun-text-muted">Choose one or more conversations</p></div>
              <button type="button" onClick={() => { setForwardingMessage(null); setForwardTargets([]); }} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light" aria-label="Cancel forwarding"><X size={19} /></button>
            </header>
            <div className="flex min-h-0 flex-col p-4">
              <div className="mb-3 shrink-0 rounded-xl border border-sun-border bg-sun-surface-light p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-sun-text-muted">Forwarding</p>
                <p className="mt-1 line-clamp-2 text-xs">{forwardingMessage.body}</p>
              </div>
              {/* The list yields height to the submit button, which must never be the
                  part that gets clipped off a short screen. */}
              <div className="min-h-0 flex-1 overflow-y-auto sm:max-h-72">
                {conversations.filter((item) => item.canSend).length === 0 ? (
                  <p className="p-6 text-center text-xs text-sun-text-muted">No conversations available to forward to.</p>
                ) : conversations.filter((item) => item.canSend).map((conversation) => {
                  const checked = forwardTargets.includes(conversation.conversationId);
                  return (
                    <button key={conversation.conversationId} type="button" aria-pressed={checked} onClick={() => setForwardTargets((previous) => checked ? previous.filter((id) => id !== conversation.conversationId) : [...previous, conversation.conversationId])} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${checked ? 'border-sun-primary bg-sun-primary/10' : 'border-transparent hover:bg-sun-surface-light'}`}>
                      <Avatar src={conversation.avatarUrl || avatarFallback(conversation.otherUserId)} name={conversation.fullName || conversation.username || 'Member'} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{conversation.fullName || conversation.username || 'Korusa member'}</p><p className="truncate text-xs text-sun-text-muted">@{conversation.username || 'member'}</p></div>
                      {checked && <Check size={16} className="shrink-0 text-sun-primary" />}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => void submitForward()} disabled={forwarding || forwardTargets.length === 0} className="mt-3 w-full shrink-0 rounded-xl bg-gradient-to-r from-sun-primary to-sun-secondary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sun-primary/15 disabled:opacity-40">
                {forwarding ? 'Forwarding...' : forwardTargets.length > 1 ? `Forward to ${forwardTargets.length} chats` : 'Forward'}
              </button>
            </div>
          </section>
        </div>
      )}
      {korusaToolsOpen && <React.Suspense fallback={<div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40"><Loader2 className="animate-spin text-white" /></div>}><LazyKorusaToolsMenu onClose={() => setKorusaToolsOpen(false)} onCreate={shareKorusaExperience} /></React.Suspense>}
    </div>
  );
};

const HeaderMenuButton = ({ icon: Icon, label, onClick, danger = false }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) => (
  <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${danger ? 'text-red-500 hover:bg-red-500/10' : 'text-sun-text-main hover:bg-sun-surface-light'}`}>
    <Icon size={16} /><span>{label}</span>
  </button>
);

// The stored delivery_state is authoritative, but the other member's read cursor
// moves first on their client. Treating a message older than the cursor as seen
// keeps the ticks honest while the 'seen' write is still in flight.
function resolveDeliveryState(message: MessageRow, otherLastReadAt: string | null): MessageRow['delivery_state'] {
  if (message.delivery_state === 'failed') return 'failed';
  if (message.delivery_state === 'seen') return 'seen';
  if (otherLastReadAt && new Date(message.created_at).getTime() <= new Date(otherLastReadAt).getTime()) {
    return 'seen';
  }
  return message.delivery_state;
}

const DeliveryTicks = ({ state }: { state: MessageRow['delivery_state'] }) => {
  if (state === 'failed') {
    return <AlertCircle size={11} className="text-red-300" aria-label="Failed to send" />;
  }
  if (state === 'sending') {
    return <Clock size={10} className="opacity-55" aria-label="Sending" />;
  }
  if (state === 'sent') {
    return <Check size={11} className="opacity-55" aria-label="Sent" />;
  }
  if (state === 'delivered') {
    return <CheckCheck size={11} className="opacity-55" aria-label="Delivered" />;
  }
  return <CheckCheck size={11} className="text-sky-300" aria-label="Seen" />;
};

function toErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Something went wrong. Please try again.';
  if (/get_my_conversations|conversations|schema cache/i.test(error.message)) {
    return 'Messaging is not activated yet. Run the messaging SQL migration in Supabase.';
  }
  return error.message;
}

function formatConversationTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return formatMessageTime(value);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function sameDay(first: string, second: string) {
  return new Date(first).toDateString() === new Date(second).toDateString();
}

function formatFileSize(value: number | null) {
  if (!value) return 'File';
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(value: number) {
  const minutes = Math.floor(value / 60);
  return `${minutes}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
}
