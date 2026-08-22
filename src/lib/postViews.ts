import { supabase } from './supabase';

/**
 * Post view tracking for Insights' reach numbers.
 *
 * A module-level queue rather than a store: nothing renders from this state, so
 * putting it in zustand would only add re-renders. `mark_posts_viewed` dedupes
 * server-side on (post_id, viewer_id), so the worst a lost or repeated flush costs
 * is one wasted request.
 *
 * See supabase/migrations/20260818_post_views_and_analytics.sql - the RPC refuses
 * self-views and views across a block, so none of that logic lives here where a
 * modified client could skip it.
 */

const FLUSH_DELAY_MS = 1500;
/** The RPC ignores arrays longer than this, so slice rather than let it no-op. */
const MAX_BATCH = 100;

/** Waiting to be sent. */
const pending = new Set<string>();
/** Already sent this page load, so a post scrolled past three times costs one call. */
const sent = new Set<string>();

let timer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;

/** Fire and forget: a lost view is not worth an error surfaced to the reader. */
async function send(ids: string[]) {
  for (let index = 0; index < ids.length; index += MAX_BATCH) {
    const slice = ids.slice(index, index + MAX_BATCH);
    const { error } = await supabase.rpc('mark_posts_viewed', { post_ids: slice });
    if (error) {
      // Drop this batch and abandon the remaining ones. flushPostViews has already
      // moved these ids into `sent`, so nothing retries them - deliberate, because a
      // failure here means offline or signed out, and the batches behind it would
      // fail the same way. Stopping costs a handful of views; continuing costs a
      // burst of doomed requests.
      return;
    }
  }
}

export function flushPostViews() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!pending.size) return;

  const ids = [...pending];
  pending.clear();
  ids.forEach((id) => sent.add(id));
  void send(ids);
}

/**
 * Called once per post, when it has actually been on screen. Batches, because a
 * flick through the feed reveals several posts at once and one request per post
 * would be a storm.
 */
export function queuePostView(postId: string) {
  if (!postId || sent.has(postId) || pending.has(postId)) return;
  pending.add(postId);

  // The last few posts before the reader leaves would otherwise never be sent.
  if (!listenersAttached && typeof document !== 'undefined') {
    listenersAttached = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPostViews();
    });
    window.addEventListener('pagehide', () => flushPostViews());
  }

  if (timer) clearTimeout(timer);
  timer = setTimeout(flushPostViews, FLUSH_DELAY_MS);
}
