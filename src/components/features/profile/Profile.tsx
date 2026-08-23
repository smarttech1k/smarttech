import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Loader2, Sparkles, UserX, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { BackButton } from '../../ui/BackButton';
import { Modal } from '../../ui/Modal';
import { CommunityPost, feedPostToProps, type PostProps } from '../home/HomeComponents';
import { ProfileHeader } from './ProfileHeader';
import { ReportUserDialog } from './ReportUserDialog';
import { addComment, fetchFeed, likePost, unlikePost, FEED_PAGE_SIZE } from '../../../lib/feed';
import { followUser, unfollowUser } from '../../../lib/social';
import { startDirectConversation } from '../../../lib/messages';
import {
  fetchProfile,
  fetchProfileOverview,
  getCurrentUserId,
  setBlock,
  setMute,
  type ProfileOverview,
  type ProfileRecord,
} from '../../../lib/profiles';

interface ProfileViewProps {
  onSettingsClick?: () => void;
  onBack?: () => void;
}

const ProfileSkeleton = () => (
  <div className="mx-auto max-w-5xl space-y-6 pb-16">
    <section className="overflow-hidden rounded-[2rem] border border-sun-border bg-sun-surface shadow-sm">
      <div className="aspect-[16/7] animate-pulse bg-sun-surface-light sm:aspect-[820/312]" />
      <div className="px-5 pb-6 sm:px-8 sm:pb-8">
        <div className="-mt-12 flex flex-col items-center gap-4 sm:-mt-16 sm:flex-row sm:items-end">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-[1.65rem] border-4 border-sun-surface bg-sun-surface-light sm:h-32 sm:w-32 sm:rounded-[2rem]" />
          <div className="w-full space-y-2 pb-1">
            <div className="mx-auto h-6 w-44 animate-pulse rounded-lg bg-sun-surface-light sm:mx-0" />
            <div className="mx-auto h-4 w-28 animate-pulse rounded-lg bg-sun-surface-light sm:mx-0" />
          </div>
        </div>
        <div className="mt-6 space-y-2 border-t border-sun-border pt-6">
          <div className="h-3.5 w-full max-w-lg animate-pulse rounded bg-sun-surface-light" />
          <div className="h-3.5 w-2/3 max-w-sm animate-pulse rounded bg-sun-surface-light" />
        </div>
      </div>
    </section>
    <div className="space-y-4">
      {[0, 1].map((index) => (
        <div key={index} className="surface-card space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-sun-surface-light" />
            <div className="space-y-1.5">
              <div className="h-3 w-28 animate-pulse rounded bg-sun-surface-light" />
              <div className="h-2.5 w-20 animate-pulse rounded bg-sun-surface-light" />
            </div>
          </div>
          <div className="h-3.5 w-full animate-pulse rounded bg-sun-surface-light" />
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-sun-surface-light" />
        </div>
      ))}
    </div>
  </div>
);

export const ProfileView: React.FC<ProfileViewProps> = ({ onSettingsClick, onBack }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [posts, setPosts] = useState<PostProps[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [followPending, setFollowPending] = useState(false);
  const [messagePending, setMessagePending] = useState(false);
  const [moderationPending, setModerationPending] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');

  const [coverOpen, setCoverOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isOwnProfile = !!profile && !!viewerId && viewerId === profile.id;

  /**
   * Bumped every time the route's profile changes. Both loaders capture it and drop their
   * result if it has moved on - tapping through three authors in the feed otherwise lets
   * the first profile's slower response land last and overwrite the one on screen.
   */
  const generationRef = useRef(0);

  const loadProfile = useCallback(async () => {
    if (!id) return;
    const generation = generationRef.current;
    try {
      setLoading(true);
      setErrorMessage('');
      setNoticeMessage('');
      setNotFound(false);

      const currentUserId = await getCurrentUserId();
      const target = await fetchProfile(id);
      const nextOverview = target ? await fetchProfileOverview(target.id) : null;
      if (generationRef.current !== generation) return;

      setViewerId(currentUserId);
      if (!target) {
        // A mistyped handle used to surface a raw PostgREST "no rows" error.
        setProfile(null);
        setNotFound(true);
        return;
      }
      setProfile(target);
      setOverview(nextOverview);
    } catch (error: unknown) {
      if (generationRef.current !== generation) return;
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load this profile.');
    } finally {
      if (generationRef.current === generation) setLoading(false);
    }
  }, [id]);

  // Posts load independently of the header, so a slow page of posts does not hold the
  // identity back and a failure in one does not blank the other.
  const loadPosts = useCallback(async (authorId: string) => {
    const generation = generationRef.current;
    try {
      setPostsLoading(true);
      const page = await fetchFeed({ authorId });
      if (generationRef.current !== generation) return;
      setPosts(page.posts.map(feedPostToProps));
      setNextCursor(page.nextCursor);
    } catch (error: unknown) {
      if (generationRef.current !== generation) return;
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load these posts.');
    } finally {
      if (generationRef.current === generation) setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    generationRef.current += 1;
    // Reset the viewers on the way in: without this, opening the photo and then
    // navigating to another member left the previous person's picture on screen.
    setPhotoOpen(false);
    setCoverOpen(false);
    setPosts([]);
    setNextCursor(null);
    setOverview(null);
    // Back to true, or moving from a profile whose posts had finished loading flashes
    // "No posts yet" at the next one before its fetch has even started.
    setPostsLoading(true);
    void loadProfile();
  }, [loadProfile]);

  // Two booleans rather than `overview` itself. The object is replaced on every
  // optimistic follow toggle, so depending on it would re-fetch the whole post list each
  // time somebody pressed Follow; and gating on `overviewLoaded` rather than reading
  // `overview?.isBlockedByMe` directly avoids the undefined -> false transition firing
  // this effect twice on the first load.
  const overviewLoaded = !!overview;
  const isBlockedByMe = !!overview?.isBlockedByMe;

  useEffect(() => {
    if (!profile || !overviewLoaded) return;
    // A blocked profile's posts are never fetched, rather than fetched and hidden.
    if (isBlockedByMe) {
      setPosts([]);
      setNextCursor(null);
      setPostsLoading(false);
      return;
    }
    void loadPosts(profile.id);
  }, [profile, overviewLoaded, isBlockedByMe, loadPosts]);

  const loadMore = async () => {
    if (!profile || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchFeed({ authorId: profile.id, cursor: nextCursor });
      setNextCursor(page.nextCursor);
      // Guard against a duplicate landing on the boundary if two posts share a timestamp.
      setPosts((previous) => {
        const seen = new Set(previous.map((post) => post.id));
        return [
          ...previous,
          ...page.posts.filter((post) => !seen.has(post.id)).map(feedPostToProps),
        ];
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load more posts.');
    } finally {
      setLoadingMore(false);
    }
  };

  /**
   * Optimistic. This used to re-run the entire page load - posts, followers, following,
   * blocks and mutes - to flip one button, which on a large account meant a visible
   * stall and a scroll position lost for a state change the client already knew.
   */
  const handleFollowToggle = async () => {
    if (!profile || !overview || isOwnProfile || followPending) return;

    const wasFollowing = overview.youFollow;
    setFollowPending(true);
    setErrorMessage('');
    setOverview({
      ...overview,
      youFollow: !wasFollowing,
      followersTotal: Math.max(0, overview.followersTotal + (wasFollowing ? -1 : 1)),
    });

    try {
      if (wasFollowing) await unfollowUser(profile.id);
      else await followUser(profile.id);
    } catch (error: unknown) {
      setOverview(overview);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update whether you follow them.',
      );
    } finally {
      setFollowPending(false);
    }
  };

  const handleMessage = async () => {
    if (!profile || !overview || messagePending) return;
    try {
      setMessagePending(true);
      setErrorMessage('');

      if (overview.blockedBetween) {
        setErrorMessage('Unblock this member before opening the conversation.');
        return;
      }

      // An existing thread opens whatever the follow state is now - you may have talked
      // before either of you unfollowed. get_profile_overview hands the id over, so this
      // no longer means listing every conversation the viewer has.
      if (overview.existingConversationId) {
        navigate(`/messages?conversation=${overview.existingConversationId}`);
        return;
      }
      if (!overview.youFollow) {
        setErrorMessage('Follow this member to start a conversation.');
        return;
      }
      if (!overview.followsYou) {
        setErrorMessage('You can start a conversation once they follow you back.');
        return;
      }

      navigate(`/messages?conversation=${await startDirectConversation(profile.id)}`);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to open this conversation.',
      );
    } finally {
      setMessagePending(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!profile || !overview || moderationPending) return;
    const wasBlocked = overview.isBlockedByMe;
    try {
      setModerationPending(true);
      setErrorMessage('');
      await setBlock(profile.id, !wasBlocked);
      // set_user_block also deletes the follow rows in both directions, so the whole
      // relationship is re-read rather than patched locally.
      setOverview(await fetchProfileOverview(profile.id));
      setNoticeMessage(wasBlocked ? 'Member unblocked.' : 'Member blocked.');
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update the block.',
      );
    } finally {
      setModerationPending(false);
    }
  };

  const handleMuteToggle = async () => {
    if (!profile || !overview || moderationPending) return;
    const wasMuted = overview.isMutedByMe;
    try {
      setModerationPending(true);
      setErrorMessage('');
      await setMute(profile.id, !wasMuted);
      setOverview({ ...overview, isMutedByMe: !wasMuted });
      setNoticeMessage(
        wasMuted
          ? 'Member unmuted.'
          : 'Member muted. Their posts will not appear in your feed, but you can still see them here.',
      );
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the mute.');
    } finally {
      setModerationPending(false);
    }
  };

  const handleLikeToggle = async (postId: string, currentlyLiked: boolean) => {
    if (!viewerId) return;
    if (currentlyLiked) await unlikePost(postId, viewerId);
    else await likePost(postId, viewerId);
  };

  const handleCommentSubmit = async (postId: string, content: string) => {
    if (!viewerId || !profile) return;
    await addComment(postId, viewerId, content);
    await loadPosts(profile.id);
  };

  if (loading && !profile && !notFound) return <ProfileSkeleton />;

  if (notFound) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        {onBack && <BackButton onClick={onBack} label="Back" sticky />}
        <div className="surface-card flex flex-col items-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-primary/10 text-sun-primary">
            <UserX size={24} />
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold">Profile not found</h1>
          <p className="mt-1 max-w-sm text-sm text-sun-text-muted">
            No Korusa member matches <span className="font-semibold">{id}</span>. The handle may
            have changed.
          </p>
          <Button className="mt-5" size="sm" variant="secondary" onClick={() => navigate('/home')}>
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  if (!profile || !overview) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        {onBack && <BackButton onClick={onBack} label="Back" sticky />}
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-600">
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

  const name = profile.full_name || profile.username || 'Korusa member';
  const followListBase = `/profile/${profile.username || profile.id}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {onBack && <BackButton onClick={onBack} label="Back" sticky />}

      {/* Dismissible, and cleared by the next successful action. These used to sit on
          screen until the page was left. */}
      {errorMessage && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-600">
          <p className="min-w-0 wrap-anywhere">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            aria-label="Dismiss error"
            className="shrink-0 rounded-lg p-0.5 hover:bg-red-500/10"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {noticeMessage && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          <p className="min-w-0 wrap-anywhere">{noticeMessage}</p>
          <button
            type="button"
            onClick={() => setNoticeMessage('')}
            aria-label="Dismiss message"
            className="shrink-0 rounded-lg p-0.5 hover:bg-emerald-500/10"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <ProfileHeader
          profile={profile}
          overview={overview}
          isOwnProfile={isOwnProfile}
          followPending={followPending}
          messagePending={messagePending}
          moderationPending={moderationPending}
          onViewCover={() => setCoverOpen(true)}
          onEditCover={() => navigate('/profile/edit')}
          onViewPhoto={() => setPhotoOpen(true)}
          onEditProfile={() => navigate('/profile/edit')}
          onSettings={() => (onSettingsClick ? onSettingsClick() : navigate('/settings'))}
          onInsights={() => navigate('/analytics')}
          onFollowToggle={() => void handleFollowToggle()}
          onMessage={() => void handleMessage()}
          onMute={() => void handleMuteToggle()}
          onBlock={() => void handleBlockToggle()}
          onReport={() => setReportOpen(true)}
          onOpenFollowers={() => navigate(`${followListBase}/followers`)}
          onOpenFollowing={() => navigate(`${followListBase}/following`)}
        />

        {!overview.isBlockedByMe && (
          <section aria-labelledby="profile-posts-heading">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 id="profile-posts-heading" className="section-title">
                  Posts
                </h2>
                <p className="section-description mt-1">
                  {isOwnProfile
                    ? 'Everything you have shared with the community.'
                    : `Updates and moments ${name} has shared.`}
                </p>
              </div>
              {isOwnProfile && (
                <Button size="sm" onClick={() => navigate('/create')}>
                  Create post
                </Button>
              )}
            </div>

            {postsLoading && posts.length === 0 && (
              <div className="surface-card p-5 text-sm text-sun-text-muted">Loading posts…</div>
            )}

            {!postsLoading && posts.length === 0 ? (
              <div className="surface-card flex flex-col items-center py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-primary/10 text-sun-primary">
                  <Sparkles size={24} />
                </div>
                <h3 className="mt-4 text-base font-semibold">No posts yet</h3>
                <p className="mt-1 max-w-sm text-sm text-sun-text-muted">
                  {isOwnProfile
                    ? 'Share your first update, photo, or moment.'
                    : 'This member has not shared a post yet.'}
                </p>
                {isOwnProfile && (
                  <Button className="mt-5" size="sm" onClick={() => navigate('/create')}>
                    Create your first post
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* The same card the home feed uses, so a post here has the same likes,
                    comments, share and reach tracking it has everywhere else. The old
                    profile drew its own numbered timeline with none of them. */}
                {posts.map((post) => (
                  <CommunityPost
                    key={post.id}
                    {...post}
                    onLikeToggle={handleLikeToggle}
                    onCommentSubmit={handleCommentSubmit}
                    onOpenProfile={(target) => navigate(`/profile/${target}`)}
                  />
                ))}
              </div>
            )}

            {!postsLoading && nextCursor && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-sun-border bg-sun-surface text-sm font-bold text-sun-text-main transition-colors hover:bg-sun-surface-light disabled:opacity-60"
              >
                {loadingMore && <Loader2 size={15} className="animate-spin" />}
                {loadingMore ? 'Loading' : `Load ${FEED_PAGE_SIZE} more posts`}
              </button>
            )}
          </section>
        )}
      </motion.div>

      <Modal
        open={coverOpen}
        onClose={() => setCoverOpen(false)}
        title={name}
        subtitle="Cover photo"
        size="xl"
        variant="media"
      >
        <div className="relative aspect-[16/7] overflow-hidden sm:aspect-[820/312]">
          {profile.cover_url ? (
            <img
              src={profile.cover_url}
              alt=""
              className="h-full w-full object-cover"
              style={{
                objectPosition: `${profile.cover_position_x ?? 50}% ${profile.cover_position_y ?? 50}%`,
                transform: `scale(${profile.cover_zoom ?? 1})`,
              }}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#24104f] via-sun-primary to-sun-secondary" />
          )}
        </div>
        {profile.cover_description && (
          <div className="bg-sun-surface p-5 text-sun-text-main">
            <h3 className="text-sm font-semibold">About this cover</h3>
            <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed text-sun-text-muted">
              {profile.cover_description}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={photoOpen && !!profile.avatar_url}
        onClose={() => setPhotoOpen(false)}
        title={name}
        subtitle="Profile photo"
        size="md"
        variant="media"
        footer={
          isOwnProfile ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<Camera size={16} />}
              onClick={() => {
                setPhotoOpen(false);
                navigate('/profile/edit');
              }}
            >
              Change photo
            </Button>
          ) : undefined
        }
      >
        {/* object-contain and a dvh cap: the header crops this picture to a square, and
            the point of opening it is to see the whole thing. */}
        <img
          src={profile.avatar_url || ''}
          alt={name}
          className="max-h-[70dvh] w-full bg-black object-contain"
          referrerPolicy="no-referrer"
        />
      </Modal>

      <ReportUserDialog
        open={reportOpen}
        targetId={profile.id}
        targetName={name}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => {
          setReportOpen(false);
          setNoticeMessage('Report submitted. The Korusa safety team will review it.');
        }}
        onError={setErrorMessage}
      />
    </div>
  );
};
