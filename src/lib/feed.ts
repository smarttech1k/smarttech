import { supabase } from './supabase';

export type ProfileRef = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type FeedComment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: ProfileRef | null;
};

export type FeedPost = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  profiles: ProfileRef | null;
  likes: Array<{ user_id: string }>;
  comments: Array<FeedComment>;
};

// PostgREST returns an embedded to-one relation as a single object, but without
// generated database types the client widens it to an array. Accept both.
function toProfileRef(value: ProfileRef | ProfileRef[] | null): ProfileRef | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function fetchFeed() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: excludedRows, error: excludedError } = user
    ? await supabase.rpc('get_feed_excluded_user_ids')
    : { data: [], error: null };
  if (excludedError && !/get_feed_excluded_user_ids/i.test(excludedError.message)) {
    throw excludedError;
  }
  const excludedIds = (excludedRows ?? []).map((row: { user_id: string }) => row.user_id);

  let query = supabase
    .from('posts')
    .select(`
      id,
      user_id,
      content,
      media_url,
      created_at,
      profiles:profiles!posts_user_id_fkey (
        id,
        full_name,
        username,
        avatar_url
      ),
      likes (
        user_id
      ),
      comments (
        id,
        content,
        created_at,
        user_id,
        profiles:profiles!comments_user_id_fkey (
          id,
          full_name,
          username,
          avatar_url
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (excludedIds.length > 0) {
    query = query.not('user_id', 'in', '(' + excludedIds.join(',') + ')');
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    posts: (data ?? []).map((post): FeedPost => ({
      id: post.id,
      user_id: post.user_id,
      content: post.content,
      media_url: post.media_url,
      created_at: post.created_at,
      profiles: toProfileRef(post.profiles),
      likes: post.likes ?? [],
      comments: (post.comments ?? []).map((comment): FeedComment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        profiles: toProfileRef(comment.profiles),
      })),
    })),
    currentUserId: user?.id ?? null,
  };
}

export async function likePost(postId: string, userId: string) {
  const { error } = await supabase.from('likes').insert({
    post_id: postId,
    user_id: userId,
  });

  if (error) {
    throw error;
  }
}

export async function unlikePost(postId: string, userId: string) {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function addComment(postId: string, userId: string, content: string) {
  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    user_id: userId,
    content,
  });

  if (error) {
    throw error;
  }
}
export async function fetchCreatorSpotlight(limit = 3) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio')
    .not('username', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}
