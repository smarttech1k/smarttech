import { supabase } from './supabase';

/**
 * Profile page data layer.
 *
 * Everything the profile used to do inline in the component, with two changes that
 * matter: nothing here is unbounded, and the numbers come from one round trip instead
 * of three list fetches whose lengths were being used as counts.
 *
 * See supabase/migrations/20260823_profile_page.sql. get_profile_overview and
 * get_follow_list are viewer-scoped by the RPC itself - neither takes a viewer
 * argument, so there is no version of this module that asks about somebody else's
 * relationships.
 */

export type ProfileRecord = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  cover_description: string | null;
  cover_position_x: number;
  cover_position_y: number;
  cover_zoom: number;
};

export type ProfileOverview = {
  postsTotal: number;
  followersTotal: number;
  followingTotal: number;
  /** Followers of this profile that you also follow. Always 0 on your own profile. */
  mutualTotal: number;
  youFollow: boolean;
  followsYou: boolean;
  isBlockedByMe: boolean;
  isMutedByMe: boolean;
  /** True if either side has blocked the other. */
  blockedBetween: boolean;
  /** An existing direct thread with this person, or null. */
  existingConversationId: string | null;
};

export type FollowListItem = {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followsYou: boolean;
  youFollow: boolean;
  followedAt: string;
};

export type FollowDirection = 'followers' | 'following';

export type FollowListPage = {
  items: FollowListItem[];
  /** Pass straight back into fetchFollowList. Null when the list is exhausted. */
  nextCursor: { followedAt: string; id: string } | null;
};

export const FOLLOW_PAGE_SIZE = 20;

/** Cover images are displayed wide and full-bleed, so they get more headroom. */
export const MAX_COVER_BYTES = 8 * 1024 * 1024;
/** Avatars render at 128px at the very largest. */
export const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

const PROFILE_COLUMNS =
  'id, username, full_name, bio, avatar_url, cover_url, cover_description, cover_position_x, cover_position_y, cover_zoom';

const num = (value: unknown) => Number(value ?? 0);

/**
 * Only `is_username_available` tolerates being absent, and this is a deliberate departure
 * from ./analytics.ts and ./feed.ts, which swallow a missing function so an unapplied
 * migration costs one panel rather than the page.
 *
 * That trade does not transfer here. Degrading `get_profile_overview` to zeros would show
 * "0 followers" and a "Follow" button to somebody who already follows - a confident
 * statement about a relationship, and a wrong one. Degrading `get_follow_list` to an empty
 * array would read as "no followers yet". A visible error is worse-looking and more
 * honest, so both of those throw.
 *
 * The handle check is different in kind: it is advisory, and the unique index still
 * refuses a duplicate on save, so losing it costs a warning rather than correctness.
 */
const isMissingFunction = (error: { message?: string } | null, fn: string) =>
  !!error?.message && new RegExp(fn, 'i').test(error.message);

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('You must be signed in.');
  return data.user.id;
}

/**
 * Resolves the `:id` route segment, which is one of three things: the literal `me`, a
 * uuid, or a username. Returns null when no such profile exists, so the caller can
 * render "this profile does not exist" rather than a raw PostgREST error - which is
 * what `.single()` used to produce for a mistyped handle.
 */
export async function fetchProfile(idOrUsername: string): Promise<ProfileRecord | null> {
  const viewerId = await getCurrentUserId();
  const query = supabase.from('profiles').select(PROFILE_COLUMNS);

  const result =
    idOrUsername === 'me'
      ? await query.eq('id', viewerId).maybeSingle()
      : UUID.test(idOrUsername)
        ? await query.eq('id', idOrUsername).maybeSingle()
        : await query.eq('username', idOrUsername).maybeSingle();

  if (result.error) throw result.error;
  return (result.data as ProfileRecord | null) ?? null;
}

const EMPTY_OVERVIEW: ProfileOverview = {
  postsTotal: 0,
  followersTotal: 0,
  followingTotal: 0,
  mutualTotal: 0,
  youFollow: false,
  followsYou: false,
  isBlockedByMe: false,
  isMutedByMe: false,
  blockedBetween: false,
  existingConversationId: null,
};

export async function fetchProfileOverview(targetId: string): Promise<ProfileOverview> {
  const { data, error } = await supabase.rpc('get_profile_overview', {
    target_user_id: targetId,
  });
  // Deliberately not tolerated when absent - see the note on isMissingFunction.
  if (error) throw error;

  // The RPC returns a single row, which PostgREST delivers as a one-element array.
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  // No row at all means the target does not exist, which the caller has already ruled out
  // by fetching the profile. Zeros are the honest answer for a profile with nothing on it.
  if (!row) return EMPTY_OVERVIEW;

  return {
    postsTotal: num(row.posts_total),
    followersTotal: num(row.followers_total),
    followingTotal: num(row.following_total),
    mutualTotal: num(row.mutual_total),
    youFollow: !!row.you_follow,
    followsYou: !!row.follows_you,
    isBlockedByMe: !!row.is_blocked_by_me,
    isMutedByMe: !!row.is_muted_by_me,
    blockedBetween: !!row.blocked_between,
    existingConversationId: (row.existing_conversation_id as string | null) ?? null,
  };
}

export async function fetchFollowList(options: {
  targetId: string;
  direction: FollowDirection;
  search?: string;
  cursor?: { followedAt: string; id: string } | null;
  limit?: number;
}): Promise<FollowListPage> {
  const limit = options.limit ?? FOLLOW_PAGE_SIZE;

  const { data, error } = await supabase.rpc('get_follow_list', {
    target_user_id: options.targetId,
    direction: options.direction,
    search_query: options.search?.trim() || null,
    cursor_followed_at: options.cursor?.followedAt ?? null,
    cursor_id: options.cursor?.id ?? null,
    result_limit: limit,
  });
  // Deliberately not tolerated when absent - an empty array here would read as
  // "no followers yet". See the note on isMissingFunction.
  if (error) throw error;

  const items = ((data ?? []) as Array<Record<string, unknown>>).map(
    (row): FollowListItem => ({
      id: String(row.id),
      username: (row.username as string | null) ?? null,
      fullName: (row.full_name as string | null) ?? null,
      avatarUrl: (row.avatar_url as string | null) ?? null,
      bio: (row.bio as string | null) ?? null,
      followsYou: !!row.follows_you,
      youFollow: !!row.you_follow,
      followedAt: String(row.followed_at),
    }),
  );

  const last = items[items.length - 1];
  return {
    items,
    // A short page is the end of the list. Both halves of the cursor are needed: the
    // RPC breaks followed_at ties on id, so handing back only the timestamp would drop
    // a row whenever two follows share one.
    nextCursor:
      items.length === limit && last ? { followedAt: last.followedAt, id: last.id } : null,
  };
}

export async function setMute(targetId: string, shouldMute: boolean): Promise<void> {
  const viewerId = await getCurrentUserId();
  const { error } = shouldMute
    ? await supabase.from('user_mutes').insert({ muter_id: viewerId, muted_id: targetId })
    : await supabase
        .from('user_mutes')
        .delete()
        .eq('muter_id', viewerId)
        .eq('muted_id', targetId);
  // 23505 is a duplicate mute, which is the state the caller asked for.
  if (error && error.code !== '23505') throw error;
}

/**
 * Blocking also deletes the follow rows in both directions - that happens inside
 * set_user_block, not here, so a modified client cannot block without unfollowing.
 */
export async function setBlock(targetId: string, shouldBlock: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_user_block', {
    target_user_id: targetId,
    should_block: shouldBlock,
  });
  if (error) throw error;
}

export type ReportReason = 'spam' | 'harassment' | 'impersonation' | 'unsafe' | 'other';

export async function reportUser(
  targetId: string,
  reason: ReportReason,
  details: string,
): Promise<void> {
  const viewerId = await getCurrentUserId();
  const { error } = await supabase.from('user_reports').insert({
    reporter_id: viewerId,
    reported_id: targetId,
    reason,
    details: details.trim() || null,
  });
  if (error) throw error;
}

/**
 * Format rules for a handle, checked before the round trip so the common mistakes get
 * an instant answer. Returns null when the shape is fine - availability is a separate
 * question, and the unique index is the only authority on it.
 */
export function validateUsername(value: string): string | null {
  const handle = value.trim();
  if (!handle) return 'Pick a handle so people can find you.';
  if (handle.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`;
  if (handle.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters.`;
  if (!/^[a-zA-Z0-9_]+$/.test(handle)) return 'Letters, numbers and underscores only.';
  if (/^_|_$/.test(handle)) return 'Cannot start or end with an underscore.';
  return null;
}

/**
 * Advisory. Between this answering yes and the save landing, somebody else can take the
 * name - which is why updateProfileDetails still translates a 23505 into the same
 * message rather than trusting this.
 */
export async function checkUsernameAvailable(handle: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', {
    candidate: handle.trim(),
  });
  if (error) {
    // Without the function there is nothing to report; the save is still guarded.
    if (isMissingFunction(error, 'is_username_available')) return true;
    throw error;
  }
  return !!data;
}

export class UsernameTakenError extends Error {
  constructor() {
    super('That handle is already taken.');
    this.name = 'UsernameTakenError';
  }
}

export type ProfileDetailsUpdate = {
  fullName: string;
  username: string;
  bio: string;
  coverDescription: string;
  coverPositionX: number;
  coverPositionY: number;
  coverZoom: number;
  /** Omit to leave the current image alone. */
  avatarUrl?: string;
  coverUrl?: string;
};

/** One write for the whole form, so a partial save cannot leave the profile mixed. */
export async function updateProfileDetails(
  profileId: string,
  update: ProfileDetailsUpdate,
): Promise<void> {
  const patch: Record<string, unknown> = {
    full_name: update.fullName.trim() || null,
    username: update.username.trim() || null,
    bio: update.bio.trim() || null,
    cover_description: update.coverDescription.trim() || null,
    cover_position_x: update.coverPositionX,
    cover_position_y: update.coverPositionY,
    cover_zoom: update.coverZoom,
  };
  if (update.avatarUrl !== undefined) patch.avatar_url = update.avatarUrl;
  if (update.coverUrl !== undefined) patch.cover_url = update.coverUrl;

  const { error } = await supabase.from('profiles').update(patch).eq('id', profileId);

  if (error) {
    // The authoritative answer on a handle collision. Raw, this surfaces as
    // 'duplicate key value violates unique constraint "profiles_username_key"'.
    if (error.code === '23505') throw new UsernameTakenError();
    throw error;
  }
}

export type ImageKind = 'avatar' | 'cover';

/**
 * Rejects what the browser will not render and what the storage bucket should not hold.
 * Both uploads go through here, so the avatar can no longer accept a 40 MB TIFF while
 * the cover next to it refuses one.
 */
export function validateImageFile(file: File, kind: ImageKind): string | null {
  if (!file.type.startsWith('image/')) {
    return kind === 'cover'
      ? 'Please choose an image file for your cover.'
      : 'Please choose an image file for your photo.';
  }
  const max = kind === 'cover' ? MAX_COVER_BYTES : MAX_AVATAR_BYTES;
  if (file.size > max) {
    return `${kind === 'cover' ? 'Cover images' : 'Profile photos'} must be smaller than ${Math.round(max / (1024 * 1024))} MB.`;
  }
  return null;
}

/**
 * Uploads to the `avatars` bucket under the owner's id and returns the public URL.
 * Timestamped rather than overwritten, because a stable path plus a CDN means the old
 * picture keeps being served after a change.
 */
export async function uploadProfileImage(
  profileId: string,
  kind: ImageKind,
  file: File,
): Promise<string> {
  const problem = validateImageFile(file, kind);
  if (problem) throw new Error(problem);

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${profileId}/${kind}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
