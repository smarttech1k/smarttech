import { supabase } from './supabase';

/**
 * Insights data layer. Every function here is scoped to the signed-in user by the
 * RPC itself - none of them takes a target user, because there is no honest way to
 * report somebody else's numbers under RLS.
 *
 * See supabase/migrations/20260818_post_views_and_analytics.sql.
 */

export type InsightsRange = 7 | 30 | 90;

export const INSIGHTS_RANGES: InsightsRange[] = [7, 30, 90];

/**
 * The day public.post_views started collecting, as a UTC calendar day. Nothing in
 * the app recorded a post view before this, so a window reaching further back is
 * genuinely empty rather than quiet - which the reach panel says out loud instead
 * of drawing a flat line at zero. Keep in step with the migration filename.
 */
export const VIEW_TRACKING_START = '2026-08-18';

/** A metric measured over the selected window and over the window before it. */
export type Delta = {
  current: number;
  previous: number;
};

export type CreatorOverview = {
  followersTotal: number;
  postsTotal: number;
  viewsTotal: number;
  followers: Delta;
  views: Delta;
  likes: Delta;
  comments: Delta;
  storyReactions: Delta;
  storyViews: Delta;
  posts: Delta;
};

export type DayPoint = {
  /** A UTC calendar day, `YYYY-MM-DD`. */
  day: string;
  views: number;
  likes: number;
  comments: number;
  storyViews: number;
  posts: number;
};

export type TopPost = {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

export type AudienceBreakdown = {
  mutual: number;
  followersOnly: number;
  followingOnly: number;
};

export type TagCount = {
  tag: string;
  postCount: number;
};

export type StoryPerformance = {
  id: string;
  createdAt: string;
  mediaType: string;
  caption: string | null;
  viewCount: number;
  reactionCount: number;
};

const num = (value: unknown) => Number(value ?? 0);

/**
 * An unapplied migration should cost one panel, not the whole page. Swallow the
 * error only when its message names the function we called - anything else is a
 * real failure and still throws. Same tolerance as `get_feed_excluded_user_ids`
 * and `get_recent_comments` in ./feed.ts.
 */
const isMissingFunction = (error: { message?: string } | null, fn: string) =>
  !!error?.message && new RegExp(fn, 'i').test(error.message);

const EMPTY_OVERVIEW: CreatorOverview = {
  followersTotal: 0,
  postsTotal: 0,
  viewsTotal: 0,
  followers: { current: 0, previous: 0 },
  views: { current: 0, previous: 0 },
  likes: { current: 0, previous: 0 },
  comments: { current: 0, previous: 0 },
  storyReactions: { current: 0, previous: 0 },
  storyViews: { current: 0, previous: 0 },
  posts: { current: 0, previous: 0 },
};

export async function fetchCreatorOverview(range: InsightsRange): Promise<CreatorOverview> {
  const { data, error } = await supabase.rpc('get_creator_overview', { range_days: range });
  if (error) {
    if (isMissingFunction(error, 'get_creator_overview')) return EMPTY_OVERVIEW;
    throw error;
  }

  // The RPC returns a single row, which PostgREST delivers as a one-element array.
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!row) return EMPTY_OVERVIEW;

  return {
    followersTotal: num(row.followers_total),
    postsTotal: num(row.posts_total),
    viewsTotal: num(row.views_total),
    followers: { current: num(row.followers_current), previous: num(row.followers_previous) },
    views: { current: num(row.views_current), previous: num(row.views_previous) },
    likes: { current: num(row.likes_current), previous: num(row.likes_previous) },
    comments: { current: num(row.comments_current), previous: num(row.comments_previous) },
    storyReactions: {
      current: num(row.story_reactions_current),
      previous: num(row.story_reactions_previous),
    },
    storyViews: { current: num(row.story_views_current), previous: num(row.story_views_previous) },
    posts: { current: num(row.posts_current), previous: num(row.posts_previous) },
  };
}

export async function fetchEngagementSeries(range: InsightsRange): Promise<DayPoint[]> {
  const { data, error } = await supabase.rpc('get_engagement_timeseries', { range_days: range });
  if (error) {
    if (isMissingFunction(error, 'get_engagement_timeseries')) return [];
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    day: String(row.day),
    views: num(row.view_count),
    likes: num(row.like_count),
    comments: num(row.comment_count),
    storyViews: num(row.story_view_count),
    posts: num(row.post_count),
  }));
}

export async function fetchTopPosts(range: InsightsRange, limit = 5): Promise<TopPost[]> {
  const { data, error } = await supabase.rpc('get_top_posts', {
    range_days: range,
    result_limit: limit,
  });
  if (error) {
    if (isMissingFunction(error, 'get_top_posts')) return [];
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    content: (row.content as string | null) ?? null,
    mediaUrl: (row.media_url as string | null) ?? null,
    createdAt: String(row.created_at),
    viewCount: num(row.view_count),
    likeCount: num(row.like_count),
    commentCount: num(row.comment_count),
  }));
}

export async function fetchAudienceBreakdown(): Promise<AudienceBreakdown> {
  const empty: AudienceBreakdown = { mutual: 0, followersOnly: 0, followingOnly: 0 };

  const { data, error } = await supabase.rpc('get_audience_breakdown');
  if (error) {
    if (isMissingFunction(error, 'get_audience_breakdown')) return empty;
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!row) return empty;

  return {
    mutual: num(row.mutual),
    followersOnly: num(row.followers_only),
    followingOnly: num(row.following_only),
  };
}

export async function fetchMyTopHashtags(range: InsightsRange, limit = 6): Promise<TagCount[]> {
  const { data, error } = await supabase.rpc('get_my_top_hashtags', {
    range_days: range,
    result_limit: limit,
  });
  if (error) {
    if (isMissingFunction(error, 'get_my_top_hashtags')) return [];
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    tag: String(row.tag),
    postCount: num(row.post_count),
  }));
}

export async function fetchStoryPerformance(
  range: InsightsRange,
  limit = 5,
): Promise<StoryPerformance[]> {
  const { data, error } = await supabase.rpc('get_story_performance', {
    range_days: range,
    result_limit: limit,
  });
  if (error) {
    if (isMissingFunction(error, 'get_story_performance')) return [];
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    mediaType: String(row.media_type),
    caption: (row.caption as string | null) ?? null,
    viewCount: num(row.view_count),
    reactionCount: num(row.reaction_count),
  }));
}

/** Likes + comments + story reactions received in the window. */
export const engagementsIn = (overview: CreatorOverview, key: 'current' | 'previous') =>
  overview.likes[key] + overview.comments[key] + overview.storyReactions[key];

/**
 * Engagements divided by views, as a fraction. `null` when there were no views -
 * the UI renders a dash rather than printing a rate divided by nothing, which is
 * what makes the card honest during the first days of view tracking.
 */
export function engagementRate(
  overview: CreatorOverview,
  key: 'current' | 'previous' = 'current',
): number | null {
  const views = overview.views[key];
  if (views <= 0) return null;
  return engagementsIn(overview, key) / views;
}

/**
 * The daily series as CSV, for the export button. Header row plus one line per day,
 * so it opens directly in a spreadsheet. Nothing here needs escaping: every field
 * is a date in ISO form or an integer.
 */
export function toCsv(rows: DayPoint[]): string {
  const header = 'date,views,likes,comments,story_views,posts';
  const lines = rows.map((row) =>
    [row.day, row.views, row.likes, row.comments, row.storyViews, row.posts].join(','),
  );
  return [header, ...lines].join('\n');
}
