import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import {
  CommunityPost,
  PeopleToFollow,
  PostProps,
  PromptBar,
  TrendingTags,
  feedPostToProps,
  type SuggestedPerson,
} from '../features/home/HomeComponents';
import { StoriesRail } from '../features/stories/StoriesRail';
import {
  addComment,
  fetchFeed,
  fetchMyProfile,
  fetchTrendingTags,
  likePost,
  unlikePost,
  type FeedScope,
  type ProfileRef,
  type TrendingTag,
} from '../../lib/feed';
import { followUser, getFriendSuggestions, unfollowUser } from '../../lib/social';

const SCOPES: Array<{ value: FeedScope; label: string }> = [
  { value: 'latest', label: 'Latest' },
  { value: 'following', label: 'Following' },
];

export const HomeView = () => {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<PostProps[]>([]);
  const [scope, setScope] = useState<FeedScope>('latest');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileRef | null>(null);
  const [people, setPeople] = useState<SuggestedPerson[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [tags, setTags] = useState<TrendingTag[]>([]);

  const loadFeed = useCallback(async (nextScope: FeedScope, tag: string | null) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const page = await fetchFeed({ scope: nextScope, tag });
      setCurrentUserId(page.currentUserId);
      setNextCursor(page.nextCursor);
      setFeed(page.posts.map(feedPostToProps));
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load the feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchFeed({ scope, tag: activeTag, cursor: nextCursor });
      setNextCursor(page.nextCursor);
      // Guard against a duplicate landing on the boundary if a post shares a timestamp.
      setFeed((previous) => {
        const seen = new Set(previous.map((post) => post.id));
        return [...previous, ...page.posts.filter((post) => !seen.has(post.id)).map(feedPostToProps)];
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load more posts.');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadFeed(scope, activeTag);
  }, [loadFeed, scope, activeTag]);

  // Sidebar data and the composer avatar load independently, so a failure in one
  // does not blank the feed.
  useEffect(() => {
    void fetchMyProfile()
      .then(setMyProfile)
      .catch(() => setMyProfile(null));

    void getFriendSuggestions(4)
      .then(setPeople)
      .catch(() => setPeople([]))
      .finally(() => setPeopleLoading(false));

    void fetchTrendingTags(6)
      .then(setTags)
      .catch(() => setTags([]));
  }, []);

  const handleLikeToggle = async (postId: string, currentlyLiked: boolean) => {
    if (!currentUserId) return;
    if (currentlyLiked) await unlikePost(postId, currentUserId);
    else await likePost(postId, currentUserId);
  };

  const handleCommentSubmit = async (postId: string, content: string) => {
    if (!currentUserId) return;
    await addComment(postId, currentUserId, content);
    await loadFeed(scope, activeTag);
  };

  const openProfile = (profileIdOrUsername: string) => {
    if (profileIdOrUsername) navigate(`/profile/${profileIdOrUsername}`);
  };

  const emptyMessage =
    activeTag
      ? `No posts tagged #${activeTag} yet.`
      : scope === 'following'
        ? 'Nothing here yet. Follow a few people and their posts will show up in this tab.'
        : 'No posts yet. Start the first conversation.';

  return (
    // min-w-0 on the columns is load-bearing, not tidying. A grid track defaults to
    // minmax(auto, 1fr) and that auto floor is the column's min-content width, so a
    // single unbreakable string anywhere in the feed - a pasted link, a long handle -
    // pushes the track, the grid and the page wider than the screen.
    <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-6 pb-8 sm:gap-7 sm:pb-16 lg:grid-cols-12 lg:gap-8">
      <div className="min-w-0 space-y-6 sm:space-y-7 lg:col-span-8 xl:col-span-9">
        <StoriesRail
          currentUserId={myProfile?.id ?? null}
          currentUserName={myProfile?.full_name || myProfile?.username || null}
          currentUserAvatarUrl={myProfile?.avatar_url || null}
        />

        <PromptBar
          onFocus={() => navigate('/create')}
          avatarUrl={myProfile?.avatar_url}
          fullName={myProfile?.full_name || myProfile?.username}
        />

        <section className="space-y-4" aria-labelledby="community-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div className="min-w-0">
              <h2 id="community-heading" className="section-title">
                Community activity
              </h2>
              <p className="section-description mt-1">
                {scope === 'following'
                  ? 'Posts from the people you follow.'
                  : 'The newest posts across Korusa.'}
              </p>
            </div>
            {/* Full width below sm. The toggle wraps onto its own line on a phone
                anyway, and a 28px-tall pill floating at the left edge of that line
                is both hard to hit and hard to read as a pair of choices. */}
            <div className="flex w-full rounded-xl border border-sun-border bg-sun-surface p-1 shadow-sm sm:w-auto">
              {SCOPES.map((option) => {
                const active = scope === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setScope(option.value)}
                    className={`min-h-10 flex-1 rounded-lg px-3 text-xs font-semibold transition-colors sm:min-h-0 sm:flex-none sm:py-1.5 ${
                      active
                        ? 'bg-sun-primary text-white'
                        : 'text-sun-text-muted hover:text-sun-text-main'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTag && (
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="ml-1 flex h-10 max-w-full items-center gap-2 rounded-full border border-sun-primary/30 bg-sun-primary/10 px-3.5 text-xs font-bold text-sun-primary transition-colors hover:bg-sun-primary/15 sm:h-9"
            >
              <span className="truncate">#{activeTag}</span>
              <X size={13} className="shrink-0" />
            </button>
          )}

          {loading && (
            <div className="surface-card p-5 text-sm text-sun-text-muted">Loading your feed…</div>
          )}
          {errorMessage && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-5 text-sm text-red-600">
              {errorMessage}
            </div>
          )}
          {!loading && !errorMessage && feed.length === 0 && (
            <div className="surface-card p-6 text-center text-sm text-sun-text-muted">
              {emptyMessage}
            </div>
          )}

          <div className="space-y-4">
            {feed.map((post) => (
              <CommunityPost
                key={post.id}
                {...post}
                onLikeToggle={handleLikeToggle}
                onCommentSubmit={handleCommentSubmit}
                onOpenProfile={openProfile}
              />
            ))}
          </div>

          {!loading && nextCursor && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-sun-border bg-sun-surface text-sm font-bold text-sun-text-main transition-colors hover:bg-sun-surface-light disabled:opacity-60"
            >
              {loadingMore && <Loader2 size={15} className="animate-spin" />}
              {loadingMore ? 'Loading' : 'Load more posts'}
            </button>
          )}
        </section>
      </div>

      <aside className="hidden min-w-0 space-y-5 lg:col-span-4 lg:block xl:col-span-3">
        <div className="sticky top-5 space-y-5">
          <PeopleToFollow
            people={people}
            loading={peopleLoading}
            onOpenProfile={openProfile}
            onFollow={async (userId) => {
              await followUser(userId);
            }}
            onUnfollow={async (userId) => {
              await unfollowUser(userId);
            }}
          />
          <TrendingTags tags={tags} onSelect={setActiveTag} />
        </div>
      </aside>
    </div>
  );
};
