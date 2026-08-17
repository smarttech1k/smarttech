import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type StoryMediaType = 'image' | 'video';

export type Story = {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  mediaPath: string;
  // Signed on read. Null means the signature could not be minted, which the
  // viewer renders as an unavailable slide rather than a broken <img>.
  mediaUrl: string | null;
  mediaType: StoryMediaType;
  caption: string | null;
  durationMs: number | null;
  createdAt: string;
  expiresAt: string;
  viewedByMe: boolean;
  viewCount: number;
  // The caller's own reaction, or null. Always the caller's, so it is not gated.
  myReaction: string | null;
  // Author-only, like viewCount: 0 on someone else's story by design.
  reactionCount: number;
};

export type StoryGroup = {
  userId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  stories: Story[];
  hasUnseen: boolean;
  isMine: boolean;
  latestAt: string;
};

export type StoryViewer = {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  // Null for someone who reacted without a recorded view row.
  viewedAt: string | null;
  reaction: string | null;
};

type StoryFeedRow = {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  media_path: string;
  media_type: StoryMediaType;
  caption: string | null;
  duration_ms: number | null;
  created_at: string;
  expires_at: string;
  viewed_by_me: boolean;
  view_count: number | string;
  my_reaction: string | null;
  reaction_count: number | string;
};

const STORY_BUCKET = 'story-media';

// Comfortably longer than any viewing session, well short of a story's 24h life.
const MEDIA_URL_TTL_SECONDS = 60 * 60 * 4;

export const MAX_STORY_BYTES = 50 * 1024 * 1024;
export const MAX_STORY_VIDEO_MS = 60_000;

// Must stay in sync with allowed_mime_types on the story-media bucket
// (supabase/migrations/20260815_stories.sql).
export const ALLOWED_STORY_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

// How long an image slide is shown before auto-advancing.
export const STORY_IMAGE_DURATION_MS = 5000;

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

// Signs a whole rail's media in one request. Signing per story meant a storage
// round trip for every slide before anything could render.
async function signStoryMedia(paths: string[]) {
  const signedByPath = new Map<string, string>();
  const unique = Array.from(new Set(paths));
  if (!unique.length) return signedByPath;

  const { data, error } = await supabase.storage
    .from(STORY_BUCKET)
    .createSignedUrls(unique, MEDIA_URL_TTL_SECONDS);
  if (error) throw error;

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) signedByPath.set(entry.path, entry.signedUrl);
  }
  return signedByPath;
}

export async function listStoryGroups(): Promise<StoryGroup[]> {
  const currentUserId = await getCurrentUserId();
  const { data, error } = await supabase.rpc('get_story_feed');
  if (error) throw error;

  const rows = (data ?? []) as StoryFeedRow[];
  if (!rows.length) return [];

  const signedByPath = await signStoryMedia(rows.map((row) => row.media_path));

  const groups = new Map<string, StoryGroup>();
  for (const row of rows) {
    const story: Story = {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      mediaPath: row.media_path,
      mediaUrl: signedByPath.get(row.media_path) ?? null,
      mediaType: row.media_type,
      caption: row.caption,
      durationMs: row.duration_ms,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      viewedByMe: !!row.viewed_by_me,
      viewCount: Number(row.view_count || 0),
      myReaction: row.my_reaction,
      reactionCount: Number(row.reaction_count || 0),
    };

    const existing = groups.get(row.user_id);
    if (existing) {
      existing.stories.push(story);
      existing.hasUnseen = existing.hasUnseen || !story.viewedByMe;
      if (story.createdAt > existing.latestAt) existing.latestAt = story.createdAt;
      continue;
    }

    groups.set(row.user_id, {
      userId: row.user_id,
      username: row.username,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      stories: [story],
      // Your own stories are never "unseen" to you, so the ring stays flat.
      hasUnseen: row.user_id === currentUserId ? false : !story.viewedByMe,
      isMine: row.user_id === currentUserId,
      latestAt: story.createdAt,
    });
  }

  // Own story first, then anyone with something unwatched (newest first), then
  // the already-watched. Derived from the rows, not a fixed order.
  return Array.from(groups.values()).sort((a, b) => {
    if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    return b.latestAt.localeCompare(a.latestAt);
  });
}

// Reads the intrinsic duration of a video file without uploading it, so an
// over-long clip is rejected before it costs the user their bandwidth.
export function readVideoDurationMs(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      finish(Number.isFinite(seconds) ? Math.round(seconds * 1000) : null);
    };
    // A file we cannot probe is allowed through; the bucket's own limits still apply.
    video.onerror = () => finish(null);
    video.src = url;
  });
}

export async function uploadStory(userId: string, file: File, caption: string) {
  if (file.size > MAX_STORY_BYTES) {
    throw new Error('Stories must be smaller than 50 MB.');
  }
  if (!ALLOWED_STORY_MIME_TYPES.includes(file.type)) {
    throw new Error('Stories support JPEG, PNG, WebP, GIF, MP4, WebM and MOV files.');
  }

  const mediaType: StoryMediaType = file.type.startsWith('video/') ? 'video' : 'image';

  let durationMs: number | null = null;
  if (mediaType === 'video') {
    durationMs = await readVideoDurationMs(file);
    if (durationMs !== null && durationMs > MAX_STORY_VIDEO_MS) {
      throw new Error('Story videos must be 60 seconds or shorter.');
    }
  }

  const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORY_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from('stories').insert({
    user_id: userId,
    media_path: path,
    media_type: mediaType,
    caption: caption.trim() || null,
    duration_ms: durationMs,
  });

  if (error) {
    // Do not leave an orphaned object behind if the row insert is rejected.
    await supabase.storage.from(STORY_BUCKET).remove([path]);
    throw error;
  }
}

export async function deleteStory(storyId: string, mediaPath: string) {
  const { error } = await supabase.from('stories').delete().eq('id', storyId);
  if (error) throw error;
  // The row is gone either way; a failed object removal only wastes storage.
  await supabase.storage.from(STORY_BUCKET).remove([mediaPath]);
}

export async function markStoryViewed(storyId: string) {
  const { error } = await supabase.rpc('mark_story_viewed', { target_story_id: storyId });
  if (error) throw error;
}

// A single story's media, signed on its own. The chat thread needs this for the
// thumbnail on a story reply, where there is one path and no rail to batch with.
// Returns null instead of throwing: an expired story's object may already be gone,
// and the reply card is expected to degrade to text in that case.
export async function signStoryPath(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORY_BUCKET)
    .createSignedUrl(path, MEDIA_URL_TTL_SECONDS);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// Sets, replaces or clears the caller's reaction. Returns the emoji now in effect,
// or null once cleared - the server's answer rather than an optimistic guess, so a
// rejected write cannot leave the picker lit.
export async function setStoryReaction(storyId: string, emoji: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('set_story_reaction', {
    target_story_id: storyId,
    reaction_emoji: emoji,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

// The author's live totals for one story. get_story_feed's counts are a snapshot
// taken when the rail loaded, so they still read 0 for a story someone watched a
// moment later. One RPC because the footer needs both numbers together. Returns no
// row for anyone but the author, which the null here represents.
export async function getStoryInsights(
  storyId: string,
): Promise<{ viewCount: number; reactionCount: number } | null> {
  const { data, error } = await supabase
    .rpc('get_story_insights', { target_story_id: storyId })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { view_count: number | string; reaction_count: number | string };
  return {
    viewCount: Number(row.view_count || 0),
    reactionCount: Number(row.reaction_count || 0),
  };
}

// Sends a story reply as a direct message and returns the new message id. The RPC
// enforces the story audience (which is what brings blocking into this path) and
// the app's existing turn rule, so a rejection here is meaningful and its message
// is worth showing.
export async function sendStoryReply(storyId: string, body: string): Promise<string> {
  const { data, error } = await supabase.rpc('send_story_reply', {
    target_story_id: storyId,
    reply_body: body,
  });
  if (error) throw error;
  return data as string;
}

export async function getStoryViewers(storyId: string): Promise<StoryViewer[]> {
  const { data, error } = await supabase.rpc('get_story_viewers', { target_story_id: storyId });
  if (error) throw error;
  return ((data ?? []) as Array<{
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    viewed_at: string | null;
    reaction: string | null;
  }>).map((row) => ({
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    viewedAt: row.viewed_at,
    reaction: row.reaction,
  }));
}

export function subscribeToStories(onChange: () => void): RealtimeChannel {
  return supabase
    .channel('stories-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => onChange())
    .subscribe();
}

export async function removeStorySubscription(channel: RealtimeChannel | null) {
  if (channel) await supabase.removeChannel(channel);
}
