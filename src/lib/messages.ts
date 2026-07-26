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
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
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

  return ((data ?? []) as ConversationRpcRow[]).map((row) => ({
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
  }));
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at, edited_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const content = body.trim();
  if (!content) throw new Error('Message cannot be empty.');

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: content })
    .select('id, conversation_id, sender_id, body, created_at, edited_at')
    .single();

  if (error) throw error;
  return data as MessageRow;
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
