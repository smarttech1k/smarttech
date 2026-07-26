import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCheck,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  UserPlus,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../../ui/Avatar';
import {
  ConversationSummary,
  getCurrentUserId,
  listConversations,
  listMessages,
  markConversationRead,
  MemberProfile,
  MessageRow,
  removeMessageSubscription,
  listFriends,
  sendMessage,
  startDirectConversation,
  subscribeToConversation,
  subscribeToInbox,
} from '../../../lib/messages';

interface MessagesViewProps {
  onBack?: () => void;
}

const avatarFallback = (id: string) => `https://i.pravatar.cc/150?u=${id}`;

export const MessagesView: React.FC<MessagesViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const loadInbox = useCallback(async () => {
    const rows = await listConversations();
    setConversations(rows);
    return rows;
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        setLoading(true);
        const userId = await getCurrentUserId();
        const rows = await listConversations();
        if (!active) return;
        setCurrentUserId(userId);
        setConversations(rows);
      } catch (caught) {
        if (active) setError(toErrorMessage(caught));
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = subscribeToInbox(() => {
      void loadInbox().catch((caught) => setError(toErrorMessage(caught)));
    });
    return () => { void removeMessageSubscription(channel); };
  }, [currentUserId, loadInbox]);

  useEffect(() => {
    if (!selectedId || !currentUserId) {
      setMessages([]);
      return;
    }

    let active = true;
    setThreadLoading(true);
    setError('');
    void listMessages(selectedId)
      .then((rows) => {
        if (active) setMessages(rows);
      })
      .catch((caught) => active && setError(toErrorMessage(caught)))
      .finally(() => active && setThreadLoading(false));

    void markConversationRead(selectedId, currentUserId)
      .then(loadInbox)
      .catch((caught) => setError(toErrorMessage(caught)));

    const channel = subscribeToConversation(selectedId, (message) => {
      setMessages((previous) =>
        previous.some((item) => item.id === message.id) ? previous : [...previous, message],
      );
      if (message.sender_id !== currentUserId) {
        void markConversationRead(selectedId, currentUserId).then(loadInbox);
      }
    });

    return () => {
      active = false;
      void removeMessageSubscription(channel);
    };
  }, [selectedId, currentUserId, loadInbox]);

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

  const activeConversation = conversations.find((item) => item.conversationId === selectedId);
  const visibleConversations = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) =>
      [item.fullName, item.username, item.lastMessage]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [conversations, filter]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !selectedId || !currentUserId || sending || !activeConversation?.canSend) return;
    try {
      setSending(true);
      setDraft('');
      const saved = await sendMessage(selectedId, currentUserId, body);
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

  const handleStartChat = async (profile: MemberProfile) => {
    try {
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
    <div className="relative flex h-full min-h-[560px] overflow-hidden bg-sun-bg text-sun-text-main">
      <aside className={`h-full w-full shrink-0 border-r border-sun-border bg-sun-surface md:flex md:w-[340px] md:flex-col xl:w-[380px] ${selectedId ? 'hidden' : 'flex flex-col'}`}>
        <header className="border-b border-sun-border p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={onBack || (() => navigate('/home'))} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light" aria-label="Back to home">
                <ArrowLeft size={19} />
              </button>
              <div>
                <h1 className="font-display text-xl font-semibold">Messages</h1>
                <p className="text-xs text-sun-text-muted">Your Korusa conversations</p>
              </div>
            </div>
            <button type="button" onClick={() => setNewChatOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-primary text-white shadow-sm" aria-label="Start a conversation">
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sun-text-muted" />
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search conversations" className="h-10 w-full rounded-xl border border-sun-border bg-sun-surface-light pl-10 pr-4 text-sm outline-none focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10" />
          </div>
        </header>

        {error && (
          <div className="m-3 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-600">
            <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
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
              <button key={conversation.conversationId} type="button" onClick={() => setSelectedId(conversation.conversationId)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${selectedId === conversation.conversationId ? 'bg-sun-primary/10' : 'hover:bg-sun-surface-light'}`}>
                <Avatar src={conversation.avatarUrl || avatarFallback(conversation.otherUserId)} name={conversation.fullName || conversation.username || 'Member'} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{conversation.fullName || conversation.username || 'Korusa member'}</span>
                    <span className="shrink-0 text-[10px] text-sun-text-muted">{formatConversationTime(conversation.lastMessageAt)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className={`truncate text-xs ${conversation.unreadCount ? 'font-semibold text-sun-text-main' : 'text-sun-text-muted'}`}>{conversation.lastMessage || 'Start the conversation'}</p>
                    {conversation.unreadCount > 0 && <span className="flex min-w-5 items-center justify-center rounded-full bg-sun-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{Math.min(conversation.unreadCount, 99)}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className={`h-full min-w-0 flex-1 flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {activeConversation ? (
          <>
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-sun-border bg-sun-surface px-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={() => setSelectedId(null)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted md:hidden" aria-label="Back to conversations"><ArrowLeft size={20} /></button>
                <Avatar src={activeConversation.avatarUrl || avatarFallback(activeConversation.otherUserId)} name={activeConversation.fullName || activeConversation.username || 'Member'} />
                <button type="button" onClick={() => navigate(`/profile/${activeConversation.username || activeConversation.otherUserId}`)} className="min-w-0 text-left">
                  <h2 className="truncate text-sm font-semibold">{activeConversation.fullName || activeConversation.username || 'Korusa member'}</h2>
                  <p className="truncate text-xs text-sun-text-muted">@{activeConversation.username || 'member'}</p>
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 scrollbar-hide">
              {threadLoading ? (
                <div className="flex h-full items-center justify-center text-sun-text-muted"><Loader2 className="animate-spin" /></div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Avatar src={activeConversation.avatarUrl || avatarFallback(activeConversation.otherUserId)} name={activeConversation.fullName || 'Member'} size="xl" />
                  <h3 className="mt-4 font-display text-xl font-semibold">{activeConversation.fullName || activeConversation.username}</h3>
                  <p className="mt-1 max-w-xs text-sm text-sun-text-muted">This is the beginning of your private conversation.</p>
                </div>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-2">
                  {messages.map((message, index) => {
                    const mine = message.sender_id === currentUserId;
                    const previous = messages[index - 1];
                    const startsGroup = !previous || previous.sender_id !== message.sender_id || !sameDay(previous.created_at, message.created_at);
                    const showDay = !previous || !sameDay(previous.created_at, message.created_at);
                    return (
                      <React.Fragment key={message.id}>
                        {showDay && <div className="my-4 text-center text-[11px] font-medium text-sun-text-muted">{formatDay(message.created_at)}</div>}
                        <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${startsGroup ? 'mt-2' : ''}`}>
                          <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[68%] ${mine ? 'rounded-br-md bg-sun-primary text-white' : 'rounded-bl-md border border-sun-border bg-sun-surface text-sun-text-main'}`}>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
                            <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${mine ? 'text-white/65' : 'text-sun-text-muted'}`}>
                              {formatMessageTime(message.created_at)}
                              {mine && <CheckCheck size={11} />}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-sun-border bg-sun-surface p-3 sm:p-4">
              {!activeConversation.isFriend && (
                <div className="mx-auto mb-3 max-w-3xl rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-center text-xs text-amber-700 dark:text-amber-300">
                  {activeConversation.canSend
                    ? 'You are no longer friends. You may send one message, then wait for a reply.'
                    : 'Waiting for a reply before you can send another message.'}
                </div>
              )}
              <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-sun-border bg-sun-surface-light p-2 focus-within:border-sun-primary focus-within:ring-4 focus-within:ring-sun-primary/10">
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} rows={1} maxLength={4000} disabled={!activeConversation.canSend} placeholder={activeConversation.canSend ? 'Write a message…' : 'Waiting for a reply…'} className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-sun-text-muted/60 disabled:cursor-not-allowed disabled:opacity-60" />
                <button type="button" onClick={() => void handleSend()} disabled={!draft.trim() || sending || !activeConversation.canSend} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sun-primary text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sun-primary/10 text-sun-primary"><MessageCircle size={30} /></div>
            <h2 className="mt-5 font-display text-2xl font-semibold">Your conversations</h2>
            <p className="mt-2 max-w-sm text-sm text-sun-text-muted">Choose a conversation or start a new one with someone in the Korusa community.</p>
            <button type="button" onClick={() => setNewChatOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sun-primary px-4 py-2.5 text-sm font-semibold text-white"><UserPlus size={17} />New conversation</button>
          </div>
        )}
      </main>

      {newChatOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md overflow-hidden rounded-3xl border border-sun-border bg-sun-surface shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
            <header className="flex items-center justify-between border-b border-sun-border p-5">
              <div><h2 id="new-chat-title" className="font-display text-xl font-semibold">New conversation</h2><p className="text-xs text-sun-text-muted">Choose one of your Korusa friends</p></div>
              <button type="button" onClick={() => setNewChatOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light" aria-label="Close"><X size={19} /></button>
            </header>
            <div className="p-4">
              <div className="relative">
                <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sun-text-muted" />
                <input autoFocus value={profileQuery} onChange={(event) => setProfileQuery(event.target.value)} placeholder="Search your friends" className="h-11 w-full rounded-xl border border-sun-border bg-sun-surface-light pl-10 pr-4 text-sm outline-none focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10" />
              </div>
              <div className="mt-3 max-h-80 overflow-y-auto">
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
    </div>
  );
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
