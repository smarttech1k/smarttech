import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type ConversationSummary = {
  conversationId: string;
  otherUserId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isFriend: boolean;
  canSend: boolean;
  notificationsEnabled: boolean;
  mutedUntil: string | null;
  archivedAt: string | null;
  favorite: boolean;
  pinnedAt: string | null;
  hiddenAt: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  message_type: 'text' | 'image' | 'video' | 'voice' | 'file' | 'location' | 'post' | 'course' | 'gif' | 'sticker' | 'poll' | 'event' | 'announcement' | 'system' | 'study_session' | 'study_room' | 'whiteboard' | 'consultation' | 'progress' | 'quiz' | 'mentor_booking' | 'voice_room' | 'tip';
  media_url: string | null;
  media_name: string | null;
  media_size: number | null;
  metadata: Record<string, unknown>;
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  pinned_at: string | null;
  pinned_by: string | null;
  delivery_state: 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';
  deleted_at: string | null;
  message_reactions?: Array<{ emoji: string; user_id: string }>;
};

export type ConversationPreferences = {
  notifications_enabled: boolean;
  muted_until: string | null;
  archived_at: string | null;
  favorite: boolean;
  pinned_at: string | null;
  cleared_at: string | null;
  hidden_at: string | null;
};

export type MemberProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type ConversationRpcRow = {
  conversation_id: string;
  other_user_id: string;
  other_username: string | null;
  other_full_name: string | null;
  other_avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | string;
  is_friend: boolean;
  can_send: boolean;
};

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('You must be signed in to use messages.');
  return data.user.id;
}

const MESSAGE_COLUMNS =
  'id, conversation_id, sender_id, body, created_at, edited_at, message_type, media_url, media_name, media_size, metadata, reply_to_id, forwarded_from_id, pinned_at, pinned_by, delivery_state, deleted_at, message_reactions(emoji, user_id)';

const MESSAGE_PAGE_SIZE = 500;

// Long enough that a thread left open for a working day keeps its media alive.
const MEDIA_URL_TTL_SECONDS = 60 * 60 * 8;

// Stored media_url values are private storage paths. Realtime payloads deliver the
// raw path, so every code path that surfaces a message has to sign it first.
export async function signMessageMedia(message: MessageRow): Promise<MessageRow> {
  if (!message.media_url || /^https?:\/\//.test(message.media_url)) return message;
  const { data: signed } = await supabase.storage
    .from('message-media')
    .createSignedUrl(message.media_url, MEDIA_URL_TTL_SECONDS);
  return { ...message, media_url: signed?.signedUrl || null };
}

// Signs a whole thread's media in one request. Signing per message meant a storage
// round trip for every attachment in history on each thread open.
async function signMessageMediaBatch(messages: MessageRow[]): Promise<MessageRow[]> {
  const paths = Array.from(
    new Set(
      messages
        .map((message) => message.media_url)
        .filter((url): url is string => !!url && !/^https?:\/\//.test(url)),
    ),
  );
  if (!paths.length) return messages;

  const { data, error } = await supabase.storage
    .from('message-media')
    .createSignedUrls(paths, MEDIA_URL_TTL_SECONDS);
  if (error) throw error;

  const signedByPath = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) signedByPath.set(entry.path, entry.signedUrl);
  }

  return messages.map((message) => {
    if (!message.media_url || /^https?:\/\//.test(message.media_url)) return message;
    return { ...message, media_url: signedByPath.get(message.media_url) ?? null };
  });
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('get_my_conversations');
  if (error) throw error;
  const userId = await getCurrentUserId();
  const ids = ((data ?? []) as ConversationRpcRow[]).map((row) => row.conversation_id);
  const { data: preferenceRows, error: preferenceError } = ids.length
    ? await supabase.from('conversation_members').select('conversation_id, notifications_enabled, muted_until, archived_at, favorite, pinned_at, hidden_at').eq('user_id', userId).in('conversation_id', ids)
    : { data: [], error: null };
  if (preferenceError) throw preferenceError;
  const preferences = new Map((preferenceRows ?? []).map((row) => [row.conversation_id, row]));

  return ((data ?? []) as ConversationRpcRow[]).map((row) => {
    const preference = preferences.get(row.conversation_id);
    return ({
    conversationId: row.conversation_id,
    otherUserId: row.other_user_id,
    username: row.other_username,
    fullName: row.other_full_name,
    avatarUrl: row.other_avatar_url,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count || 0),
    isFriend: !!row.is_friend,
    canSend: !!row.can_send,
    notificationsEnabled: preference?.notifications_enabled ?? true,
    mutedUntil: preference?.muted_until ?? null,
    archivedAt: preference?.archived_at ?? null,
    favorite: preference?.favorite ?? false,
    pinnedAt: preference?.pinned_at ?? null,
    hiddenAt: preference?.hidden_at ?? null,
  });
  }).filter((row) => !row.hiddenAt);
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const userId = await getCurrentUserId();
  const { data: membership, error: membershipError } = await supabase
    .from('conversation_members')
    .select('cleared_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();
  if (membershipError) throw membershipError;
  let query = supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    // Newest-first, because Postgres applies ORDER BY before LIMIT: ascending order
    // here would cap the thread at its *oldest* 500 messages and hide recent history.
    // The id tiebreak keeps paging stable when timestamps collide.
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);
  if (membership.cleared_at) query = query.gt('created_at', membership.cleared_at);
  const { data, error } = await query;

  if (error) throw error;
  // The thread renders oldest-first, so flip back after the newest-first fetch.
  const rows = ((data ?? []) as MessageRow[]).slice().reverse();
  return signMessageMediaBatch(rows);
}

// Reactions for a single message, used to patch one bubble after a reaction changes
// instead of refetching the entire thread.
export async function getMessageReactions(messageId: string) {
  const { data, error } = await supabase
    .from('message_reactions')
    .select('emoji, user_id')
    .eq('message_id', messageId);
  if (error) throw error;
  return (data ?? []) as Array<{ emoji: string; user_id: string }>;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  options: { replyToId?: string | null; forwardedFromId?: string | null; messageType?: MessageRow['message_type']; mediaUrl?: string | null; mediaName?: string | null; mediaSize?: number | null; metadata?: Record<string, unknown> } = {},
) {
  const content = body.trim();
  if (!content) throw new Error('Message cannot be empty.');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: content,
      reply_to_id: options.replyToId || null,
      forwarded_from_id: options.forwardedFromId || null,
      message_type: options.messageType || 'text',
      media_url: options.mediaUrl || null,
      media_name: options.mediaName || null,
      media_size: options.mediaSize || null,
      metadata: options.metadata || {},
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) throw error;
  return signMessageMedia(data as MessageRow);
}

// Copies the original's payload into the target conversation, keeping a pointer back
// to the source so the thread can render the "Forwarded" label. The in-memory copy of
// a message carries a signed (expiring) media URL, so the raw storage path is re-read
// from the row before it is copied forward.
export async function forwardMessage(
  messageId: string,
  targetConversationId: string,
  senderId: string,
) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, body, message_type, media_url, media_name, media_size, metadata, forwarded_from_id')
    .eq('id', messageId)
    .single();
  if (error) throw error;

  const original = data as Pick<
    MessageRow,
    'id' | 'body' | 'message_type' | 'media_url' | 'media_name' | 'media_size' | 'metadata' | 'forwarded_from_id'
  >;

  return sendMessage(targetConversationId, senderId, original.body, {
    forwardedFromId: original.forwarded_from_id || original.id,
    messageType: original.message_type,
    mediaUrl: original.media_url,
    mediaName: original.media_name,
    mediaSize: original.media_size,
    metadata: original.metadata,
  });
}

export async function uploadMessageFile(conversationId: string, userId: string, file: File) {
  if (file.size > 25 * 1024 * 1024) throw new Error('Attachments must be smaller than 25 MB.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${userId}/${conversationId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('message-media').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function updateMessage(messageId: string, body: string) {
  const content = body.trim();
  if (!content) throw new Error('Message cannot be empty.');
  const { error } = await supabase.from('messages').update({ body: content, edited_at: new Date().toISOString() }).eq('id', messageId);
  if (error) throw error;
}

export async function deleteMessage(messageId: string) {
  const { error } = await supabase.from('messages').update({ body: 'Message deleted', deleted_at: new Date().toISOString() }).eq('id', messageId);
  if (error) throw error;
}

export async function setMessagePinned(messageId: string, pinned: boolean) {
  const { error } = await supabase.rpc('set_message_pin', { target_message_id: messageId, should_pin: pinned });
  if (error) throw error;
}

export async function toggleMessageReaction(messageId: string, emoji: string) {
  const { error } = await supabase.rpc('toggle_message_reaction', { target_message_id: messageId, reaction_emoji: emoji });
  if (error) throw error;
}

export async function getConversationPreferences(conversationId: string, userId: string): Promise<ConversationPreferences> {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('notifications_enabled, muted_until, archived_at, favorite, pinned_at, cleared_at, hidden_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data as ConversationPreferences;
}

export async function updateConversationPreferences(
  conversationId: string,
  userId: string,
  changes: Partial<ConversationPreferences>,
) {
  const { error } = await supabase
    .from('conversation_members')
    .update(changes)
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function markConversationRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;

  // Promote the other member's delivered messages to 'seen' so their ticks update.
  // Best-effort: a receipt failure must not break marking the thread as read.
  const { error: seenError } = await supabase.rpc('mark_messages_seen', {
    target_conversation_id: conversationId,
  });
  if (seenError) console.warn('Could not update read receipts:', seenError.message);
}

// Returns the other member's last_read_at, which drives the "seen" state on our
// own messages. Read on thread open and refreshed by the realtime membership feed.
export async function getOtherLastReadAt(conversationId: string, otherUserId: string) {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', otherUserId)
    .maybeSingle();
  if (error) throw error;
  return data?.last_read_at ?? null;
}

export async function startDirectConversation(otherUserId: string) {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    other_user_id: otherUserId,
  });
  if (error) throw error;
  if (!data) throw new Error('Unable to start this conversation.');
  return data as string;
}

export async function listFriends(query = ''): Promise<MemberProfile[]> {
  const { data, error } = await supabase.rpc('get_my_friends', {
    search_query: query.trim() || null,
  });

  if (error) throw error;
  return (data ?? []) as MemberProfile[];
}

// Marks every inbound message in the thread as delivered. Called when the recipient's
// client has the thread in hand, which is what moves the sender's ticks past 'sent'.
export async function markMessagesDelivered(conversationId: string) {
  const { error } = await supabase.rpc('mark_messages_delivered', {
    target_conversation_id: conversationId,
  });
  if (error) throw error;
}

type ConversationEvents = {
  onInsert: (message: MessageRow) => void;
  onUpdate: (message: MessageRow) => void;
  onReaction: (messageId: string) => void;
  onMemberRead: () => void;
};

// One channel carrying every change that can alter the open thread: new messages,
// edits/deletes/pins/delivery transitions, reactions, and the other member's read cursor.
export function subscribeToConversation(
  conversationId: string,
  events: ConversationEvents,
): RealtimeChannel {
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        void signMessageMedia(payload.new as MessageRow).then(events.onInsert);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        void signMessageMedia(payload.new as MessageRow).then(events.onUpdate);
      },
    )
    .on(
      'postgres_changes',
      // message_reactions has no conversation_id to filter on, so this channel sees
      // reaction traffic from every conversation the user belongs to. The message id
      // travels with the event (from new on insert, old on delete) so the caller can
      // ignore anything outside the open thread rather than refetching blindly.
      { event: '*', schema: 'public', table: 'message_reactions' },
      (payload) => {
        const row = (payload.new ?? payload.old) as { message_id?: string } | null;
        if (row?.message_id) events.onReaction(row.message_id);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_members',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => events.onMemberRead(),
    )
    .subscribe();
}

export function subscribeToInbox(onChange: () => void): RealtimeChannel {
  return supabase
    .channel('messaging-inbox')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      () => onChange(),
    )
    .subscribe();
}

export async function removeMessageSubscription(channel: RealtimeChannel | null) {
  if (channel) await supabase.removeChannel(channel);
}
