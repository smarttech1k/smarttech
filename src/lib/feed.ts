import { supabase } from './supabase';

export type ProfileRef = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio?: string | null;
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
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  // A bounded preview, not the full thread. commentCount holds the real total.
  comments: Array<FeedComment>;
};

export type FeedScope = 'latest' | 'following';

export type FeedPage = {
  posts: FeedPost[];
  currentUserId: string | null;
  // Cursor for the next page, or null when the feed is exhausted.
  nextCursor: string | null;
};

export type TrendingTag = {
  tag: string;
  postCount: number;
};

export const FEED_PAGE_SIZE = 20;

// How many comments travel with each post. The rest load on demand rather than
// riding along with every row in the page.
const COMMENT_PREVIEW_SIZE = 3;

// PostgREST returns an embedded to-one relation as a single object, but without
// generated database types the client widens it to an array. Accept both.
function toProfileRef(value: ProfileRef | ProfileRef[] | null): ProfileRef | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

// PostgREST aggregate embeds arrive as [{ count: n }].
function toCount(value: Array<{ count: number | string }> | { count: number | string } | null) {
  if (!value) return 0;
  const entry = Array.isArray(value) ? value[0] : value;
  return Number(entry?.count ?? 0);
}

type RawFeedPost = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  profiles: ProfileRef | ProfileRef[] | null;
  likes: Array<{ count: number | string }> | null;
  comments: Array<{ count: number | string }> | null;
};

type RawRecentComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_username: string | null;
  author_full_name: string | null;
  author_avatar_url: string | null;
};

export async function fetchFeed(
  options: {
    scope?: FeedScope;
    limit?: number;
    cursor?: string | null;
    tag?: string | null;
    /**
     * Restrict the page to one author, for the profile page. Set it and the scope and
     * tag filters stop being meaningful - a profile shows that person's posts, in order.
     */
    authorId?: string | null;
  } = {},
): Promise<FeedPage> {
  const scope = options.scope ?? 'latest';
  const limit = options.limit ?? FEED_PAGE_SIZE;
  const authorId = options.authorId ?? null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A profile is a deliberate visit, so the feed's mute/block exclusions do not apply
  // there. Two reasons: a mute is a "keep this out of my feed" preference and says
  // nothing about a profile you navigated to on purpose, and mechanically
  // `.eq('user_id', x)` alongside `.not('user_id','in','(x)')` returns an empty page
  // that the UI would render as "no posts yet" - a lie about the account. A block is
  // handled a level up, where the profile refuses to render the person at all.
  const { data: excludedRows, error: excludedError } = user && !authorId
    ? await supabase.rpc('get_feed_excluded_user_ids')
    : { data: [], error: null };
  if (excludedError && !/get_feed_excluded_user_ids/i.test(excludedError.message)) {
    throw excludedError;
  }
  const excludedIds = (excludedRows ?? []).map((row: { user_id: string }) => row.user_id);

  // The Following scope is an explicit, honest empty when you follow nobody -
  // silently widening it back to everyone would misrepresent what you are seeing.
  let followedIds: string[] | null = null;
  if (scope === 'following' && !authorId) {
    if (!user) return { posts: [], currentUserId: null, nextCursor: null };
    const { data: followRows, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    if (followError) throw followError;
    followedIds = (followRows ?? []).map((row: { following_id: string }) => row.following_id);
    if (!followedIds.length) {
      return { posts: [], currentUserId: user.id, nextCursor: null };
    }
  }

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
        avatar_url,
        bio
      ),
      likes (
        count
      ),
      comments (
        count
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.cursor) {
    query = query.lt('created_at', options.cursor);
  }
  if (authorId) {
    query = query.eq('user_id', authorId);
  }
  if (options.tag) {
    // Tags come from get_trending_hashtags, so they are [A-Za-z0-9_] only. The
    // underscore is a LIKE wildcard, hence the escape.
    query = query.ilike('content', `%#${options.tag.replace(/_/g, '\\_')}%`);
  }
  if (followedIds) {
    query = query.in('user_id', followedIds);
  }
  if (excludedIds.length > 0) {
    query = query.not('user_id', 'in', '(' + excludedIds.join(',') + ')');
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as RawFeedPost[];
  const postIds = rows.map((row) => row.id);

  // One bounded lookup for "did I like these", instead of embedding every like
  // row of every post just to test for our own id.
  const likedPostIds = new Set<string>();
  if (user && postIds.length) {
    const { data: myLikes, error: myLikesError } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);
    if (myLikesError) throw myLikesError;
    for (const row of (myLikes ?? []) as Array<{ post_id: string }>) {
      likedPostIds.add(row.post_id);
    }
  }

  // Newest few comments per post, oldest-first within each post, in one call.
  const commentsByPost = new Map<string, FeedComment[]>();
  if (postIds.length) {
    const { data: recent, error: recentError } = await supabase.rpc('get_recent_comments', {
      post_ids: postIds,
      per_post: COMMENT_PREVIEW_SIZE,
    });
    // Comment previews are an enhancement. If the stories migration has not been
    // applied yet the function is absent, and losing the previews is better than
    // blanking the whole feed - same tolerance as get_feed_excluded_user_ids above.
    if (recentError && !/get_recent_comments/i.test(recentError.message)) {
      throw recentError;
    }
    for (const row of (recent ?? []) as RawRecentComment[]) {
      const bucket = commentsByPost.get(row.post_id) ?? [];
      bucket.push({
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        user_id: row.user_id,
        profiles: {
          id: row.user_id,
          full_name: row.author_full_name,
          username: row.author_username,
          avatar_url: row.author_avatar_url,
        },
      });
      commentsByPost.set(row.post_id, bucket);
    }
  }

  const posts = rows.map((post): FeedPost => ({
    id: post.id,
    user_id: post.user_id,
    content: post.content,
    media_url: post.media_url,
    created_at: post.created_at,
    profiles: toProfileRef(post.profiles),
    likeCount: toCount(post.likes),
    commentCount: toCount(post.comments),
    likedByMe: likedPostIds.has(post.id),
    comments: commentsByPost.get(post.id) ?? [],
  }));

  return {
    posts,
    currentUserId: user?.id ?? null,
    nextCursor: posts.length === limit ? posts[posts.length - 1].created_at : null,
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

// Real hashtags counted from real post bodies by get_trending_hashtags. Returns an
// empty list when nobody has tagged anything, which the UI renders as no panel at
// all rather than inventing filler.
export async function fetchTrendingTags(limit = 6, sinceHours = 168): Promise<TrendingTag[]> {
  const { data, error } = await supabase.rpc('get_trending_hashtags', {
    result_limit: limit,
    since_hours: sinceHours,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{ tag: string; post_count: number | string }>).map((row) => ({
    tag: row.tag,
    postCount: Number(row.post_count || 0),
  }));
}

export async function fetchMyProfile(): Promise<ProfileRef | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, bio')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileRef | null) ?? null;
}
