import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Re-exported rather than reimplemented: the subscription below needs the signed-in
// id, and this repo already has one helper for that instead of a sixth copy of the
// supabase.auth.getUser() dance.
export { getCurrentUserId } from './messages';

export type NotificationKind = 'like' | 'comment' | 'follow' | 'story_reaction';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  actor: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
  postId: string | null;
  commentId: string | null;
  storyId: string | null;
  /** The comment's text, or the reaction's emoji - whatever makes the row readable. */
  preview: string | null;
  postMediaUrl: string | null;
  postExcerpt: string | null;
  readAt: string | null;
  createdAt: string;
};

export const NOTIFICATIONS_PAGE_SIZE = 30;

type NotificationRpcRow = {
  id: string;
  type: NotificationKind;
  actor_id: string;
  actor_username: string | null;
  actor_full_name: string | null;
  actor_avatar_url: string | null;
  post_id: string | null;
  comment_id: string | null;
  story_id: string | null;
  preview: string | null;
  post_media_url: string | null;
  post_excerpt: string | null;
  read_at: string | null;
  created_at: string;
};

const toNotification = (row: NotificationRpcRow): AppNotification => ({
  id: row.id,
  kind: row.type,
  actor: {
    id: row.actor_id,
    username: row.actor_username,
    fullName: row.actor_full_name,
    avatarUrl: row.actor_avatar_url,
  },
  postId: row.post_id,
  commentId: row.comment_id,
  storyId: row.story_id,
  preview: row.preview,
  postMediaUrl: row.post_media_url,
  postExcerpt: row.post_excerpt,
  readAt: row.read_at,
  createdAt: row.created_at,
});

export type NotificationPage = {
  items: AppNotification[];
  /** Cursor for the next page, or null when the list is exhausted. */
  nextCursor: string | null;
};

export async function fetchNotifications(options: {
  cursor?: string | null;
  kinds?: NotificationKind[] | null;
} = {}): Promise<NotificationPage> {
  const { data, error } = await supabase.rpc('get_notifications', {
    before_cursor: options.cursor ?? null,
    page_size: NOTIFICATIONS_PAGE_SIZE,
    // The filter runs in the database so a chip searches the whole history, not
    // just whichever page happens to be loaded.
    type_filter: options.kinds?.length ? options.kinds : null,
  });
  if (error) throw error;

  const rows = (data ?? []) as NotificationRpcRow[];
  return {
    items: rows.map(toNotification),
    nextCursor:
      rows.length === NOTIFICATIONS_PAGE_SIZE ? rows[rows.length - 1].created_at : null,
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_notification_count');
  if (error) throw error;
  return Number(data ?? 0);
}

/** No argument marks everything read; an array marks just those rows. */
export async function markNotificationsRead(ids?: string[]): Promise<number> {
  const { data, error } = await supabase.rpc('mark_notifications_read', {
    notification_ids: ids?.length ? ids : null,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

/**
 * One channel for everything that can move the unread count. The filter keeps the
 * socket carrying only this user's rows, and '*' rather than INSERT because a row
 * deleted by an un-like has to bring the badge back down too.
 *
 * `scope` names the channel, so the layout's badge subscription and the Activity
 * page's list subscription are two distinct topics rather than two clients fighting
 * over one.
 */
export function subscribeToNotifications(
  userId: string,
  onChange: () => void,
  scope: 'badge' | 'list' = 'badge',
): RealtimeChannel {
  return supabase
    .channel(`notifications:${scope}:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();
}

/** Removes one row for good. The table grants delete on your own notifications. */
export async function dismissNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

export async function removeNotificationSubscription(channel: RealtimeChannel | null) {
  if (channel) await supabase.removeChannel(channel);
}
