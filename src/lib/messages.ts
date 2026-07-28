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
  cleared_at: string | null;
  hidden_at: string | null;
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
    .select('id, conversation_id, sender_id, body, created_at, edited_at, message_type, media_url, media_name, media_size, metadata, reply_to_id, forwarded_from_id, pinned_at, pinned_by, delivery_state, deleted_at, message_reactions(emoji, user_id)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (membership.cleared_at) query = query.gt('created_at', membership.cleared_at);
  const { data, error } = await query;

  if (error) throw error;
  const rows = (data ?? []) as MessageRow[];
  return Promise.all(rows.map(async (message) => {
    if (!message.media_url || /^https?:\/\//.test(message.media_url)) return message;
    const { data: signed } = await supabase.storage.from('message-media').createSignedUrl(message.media_url, 3600);
    return { ...message, media_url: signed?.signedUrl || null };
  }));
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  options: { replyToId?: string | null; messageType?: MessageRow['message_type']; mediaUrl?: string | null; mediaName?: string | null; mediaSize?: number | null; metadata?: Record<string, unknown> } = {},
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
      message_type: options.messageType || 'text',
      media_url: options.mediaUrl || null,
      media_name: options.mediaName || null,
      media_size: options.mediaSize || null,
      metadata: options.metadata || {},
    })
    .select('id, conversation_id, sender_id, body, created_at, edited_at, message_type, media_url, media_name, media_size, metadata, reply_to_id, forwarded_from_id, pinned_at, pinned_by, delivery_state, deleted_at, message_reactions(emoji, user_id)')
    .single();

  if (error) throw error;
  return data as MessageRow;
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

export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: MessageRow) => void,
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
      (payload) => onMessage(payload.new as MessageRow),
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
