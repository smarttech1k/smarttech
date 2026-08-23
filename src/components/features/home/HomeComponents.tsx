import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  MessageSquare,
  Hash,
  Share2,
  CheckCircle,
  ThumbsUp,
  UserPlus,
  Check,
  Maximize2,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Avatar } from '../../ui/Avatar';
import { Modal } from '../../ui/Modal';
import { queuePostView } from '../../../lib/postViews';
import { formatRelativeTime } from '../../../lib/time';
import type { FeedPost } from '../../../lib/feed';
import { useNavigate } from 'react-router-dom';

export const PromptBar = ({
  onFocus,
  avatarUrl,
  fullName,
}: {
  onFocus?: () => void;
  avatarUrl?: string | null;
  fullName?: string | null;
}) => {
  return (
    <div className="relative w-full">
      <div className="rounded-2xl border border-sun-border bg-sun-surface p-3 shadow-sm sm:p-4">
        <div className="flex items-center gap-3">
          {/* The signed-in user's own avatar. Avatar falls back to their initials,
              so there is never a stock photo of a stranger standing in for them. */}
          <Avatar
            src={avatarUrl || undefined}
            name={fullName || undefined}
            size="sm"
            className="ring-2 ring-sun-primary/20"
          />
          <div
            onClick={onFocus}
            className="group flex min-h-11 min-w-0 flex-1 cursor-text items-center justify-between gap-2 rounded-xl border border-sun-border bg-sun-surface-light px-3 text-sm text-sun-text-muted transition-colors hover:border-sun-primary/30 sm:px-4"
          >
            <span className="truncate transition-colors group-hover:text-sun-text-main">
              What are you working on or learning today?
            </span>
            <Plus size={18} className="shrink-0 text-sun-primary transition-transform duration-300 group-hover:rotate-90" />
          </div>
        </div>
      </div>
    </div>
  );
};

export interface PostProps {
  id: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatar?: string | null;
    isExpert?: boolean;
    // The author's real bio. Absent for most people, and the line is simply
    // omitted rather than filled with an invented job title.
    role?: string | null;
  };
  content: string;
  image?: string | null;
  likes: number;
  comments: number;
  time: string;
  likedByMe?: boolean;
  commentItems?: Array<{
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles?: {
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
  }>;
  onLikeToggle?: (postId: string, currentlyLiked: boolean) => Promise<void> | void;
  onCommentSubmit?: (postId: string, content: string) => Promise<void> | void;
  onOpenProfile?: (profileIdOrUsername: string) => void;
}

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v)(\?|$)/i;

/**
 * Maps a feed row onto this card's props.
 *
 * Exported because the home feed and the profile page render the same card from the same
 * query, and two copies of this mapping would be two places for the author's bio to
 * quietly become an invented job title again - or for a stock avatar to creep back in.
 */
export const feedPostToProps = (post: FeedPost): PostProps => ({
  id: post.id,
  author: {
    id: post.profiles?.id || post.user_id,
    name: post.profiles?.full_name || post.profiles?.username || 'Korusa member',
    handle: post.profiles?.username || '',
    // No placeholder image: Avatar renders their initials when there is no upload.
    avatar: post.profiles?.avatar_url,
    // The author's own bio, or nothing. Never an invented job title.
    role: post.profiles?.bio || null,
    isExpert: false,
  },
  content: post.content,
  image: post.media_url,
  likes: post.likeCount,
  comments: post.commentCount,
  commentItems: post.comments,
  time: formatRelativeTime(post.created_at),
  likedByMe: post.likedByMe,
});

/** How long a post must stay half-visible before it counts as seen. */
const VIEW_DWELL_MS = 1000;

export const CommunityPost: React.FC<PostProps> = ({
  id,
  author,
  content,
  image,
  likes,
  comments,
  time,
  likedByMe = false,
  commentItems = [],
  onLikeToggle,
  onCommentSubmit,
  onOpenProfile,
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [liked, setLiked] = useState(likedByMe);
  const [likesCount, setLikesCount] = useState(likes);
  const [commentsCount, setCommentsCount] = useState(comments);
  const [isLiking, setIsLiking] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setLiked(likedByMe);
  }, [likedByMe]);

  useEffect(() => {
    setLikesCount(likes);
  }, [likes]);

  useEffect(() => {
    setCommentsCount(comments);
  }, [comments]);

  // Reach tracking for Insights. Half the card visible for a full second, counted
  // once - that dwell requirement is the difference between "someone read this" and
  // "this flew past during a flick to the bottom", and it is why the number on the
  // Insights page can be called reach at all.
  //
  // The queue batches and dedupes; the RPC refuses self-views, so there is no
  // author check here. The home feed is the only surface that renders real posts,
  // so this is the single instrumentation site.
  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    let dwell: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!dwell) {
            dwell = setTimeout(() => {
              queuePostView(id);
              observer.disconnect();
            }, VIEW_DWELL_MS);
          }
        } else if (dwell) {
          clearTimeout(dwell);
          dwell = null;
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(element);

    return () => {
      if (dwell) clearTimeout(dwell);
      observer.disconnect();
    };
  }, [id]);

  const handleLike = async () => {
    if (!onLikeToggle || isLiking) return;

    const previousLiked = liked;
    const previousLikes = likesCount;

    setIsLiking(true);
    setLiked(!previousLiked);
    setLikesCount(previousLiked ? previousLikes - 1 : previousLikes + 1);

    try {
      await onLikeToggle(id, previousLiked);
    } catch {
      setLiked(previousLiked);
      setLikesCount(previousLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!onCommentSubmit || isCommenting) return;
    if (!commentText.trim()) return;

    const nextText = commentText.trim();
    setIsCommenting(true);

    try {
      await onCommentSubmit(id, nextText);
      setCommentText('');
      setCommentsCount((prev) => prev + 1);
      setShowCommentBox(false);
    } finally {
      setIsCommenting(false);
    }
  };

  const profileTarget = author.handle || author.id;
  const isVideo = !!image && VIDEO_EXTENSIONS.test(image);
  const hiddenCommentCount = Math.max(commentsCount - commentItems.length, 0);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      className="rounded-2xl border border-sun-border bg-sun-surface p-4 shadow-sm transition-shadow hover:shadow-premium sm:p-6"
    >
      {/* No category badge: posts carry no type in the database, so labelling
          every one of them would be inventing a fact about the author's intent. */}
      <button
        type="button"
        onClick={() => onOpenProfile?.(profileTarget)}
        className="mb-4 flex max-w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
      >
        <Avatar src={author.avatar || undefined} name={author.name} size="sm" className="ring-2 ring-sun-primary/10" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-sm font-bold leading-tight text-sun-text-main">
              {author.name}
            </h4>
            {author.isExpert && (
              <CheckCircle size={13} className="shrink-0 text-sun-primary" fill="currentColor" />
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-sun-text-muted">
            {author.handle ? `@${author.handle} · ` : ''}
            {time}
          </p>
          {author.role && (
            <p className="mt-0.5 truncate text-[11px] leading-tight text-sun-text-muted/80">
              {author.role}
            </p>
          )}
        </div>
      </button>

      <div className="space-y-4">
        {/*
          wrap-anywhere, not break-words. overflow-wrap: break-word only breaks a
          word once the line is already full - it does not lower the paragraph's
          min-content width, so a pasted URL still reported itself as one 600px
          word and dragged the whole page sideways. overflow-wrap: anywhere counts
          the break opportunities when measuring, which is what the grid track
          above reads.
        */}
        <p className="wrap-anywhere text-sm font-normal leading-relaxed text-sun-text-main sm:text-base">
          {content}
        </p>

        {image && (
          <div className="relative aspect-video overflow-hidden rounded-xl border border-sun-border/40">
            {isVideo ? (
              <video src={image} controls playsInline className="h-full w-full bg-black object-contain" />
            ) : (
              // A button, not a bare <img>: the card letterboxes a portrait photo into a
              // 16:9 box, so the only way to actually see one is to open it. Videos are
              // left alone - wrapping <video controls> would make tapping play open a
              // lightbox instead.
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`View full image shared by ${author.name}`}
                className="group h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-sun-primary/30"
              >
                <img
                  src={image}
                  className="h-full w-full bg-black object-contain"
                  alt={`Attachment shared by ${author.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <span className="pointer-events-none absolute right-2 top-2 hidden rounded-lg bg-black/50 p-1.5 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 sm:block">
                  <Maximize2 size={14} />
                </span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-sun-border/30 pt-2 text-xs sm:pt-4">
          <div className="flex min-w-0 gap-1 sm:gap-4">
            <button
              onClick={handleLike}
              disabled={isLiking}
              // min-h-11 below sm: a 20px-tall row of icon-plus-count is a real
              // target on a mouse and a guess on a thumb.
              className={`flex min-h-11 items-center gap-1.5 px-1 font-bold transition-all sm:min-h-0 sm:px-0 ${
                liked ? 'text-sun-primary' : 'text-sun-text-muted hover:text-sun-primary'
              } ${isLiking ? 'opacity-60' : ''}`}
            >
              <ThumbsUp size={14} className="shrink-0" />
              <span className="truncate">
                {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
              </span>
            </button>

            <button
              onClick={() => setShowCommentBox((prev) => !prev)}
              className="flex min-h-11 items-center gap-1.5 px-1 font-bold text-sun-text-muted transition-all hover:text-sun-primary sm:min-h-0 sm:px-0"
            >
              <MessageSquare size={14} className="shrink-0" />
              <span className="truncate">
                {commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}
              </span>
            </button>
          </div>

          <button
            onClick={() => navigate(`/messages?shareType=post&shareId=${id}`)}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-sun-text-muted transition-colors hover:text-sun-primary sm:min-h-0 sm:min-w-0 sm:p-1"
            title="Share post in a conversation"
            aria-label="Share post in a conversation"
          >
            <Share2 size={14} />
          </button>
        </div>

        {commentItems.length > 0 && (
          <div className="space-y-3 border-t border-sun-border/30 pt-3">
            {hiddenCommentCount > 0 && (
              <p className="text-[11px] font-semibold text-sun-text-muted">
                Showing the {commentItems.length} most recent of {commentsCount} comments
              </p>
            )}
            {commentItems.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl border border-sun-border/40 bg-sun-bg px-3 py-3"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={comment.profiles?.avatar_url || undefined}
                    name={comment.profiles?.full_name || comment.profiles?.username || undefined}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="wrap-anywhere text-xs font-bold text-sun-text-main">
                        {comment.profiles?.full_name ||
                          comment.profiles?.username ||
                          'Korusa member'}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sun-text-muted">
                        {formatCommentTime(comment.created_at)}
                      </p>
                    </div>
                    <p className="mt-1 wrap-anywhere text-sm leading-relaxed text-sun-text-main">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCommentBox && (
          <div className="space-y-3 border-t border-sun-border/30 pt-3">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[90px] w-full resize-none rounded-xl border border-sun-border bg-sun-bg p-3 text-sm outline-none focus:ring-1 focus:ring-sun-primary"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || isCommenting}
              >
                {isCommenting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {image && !isVideo && (
        <Modal
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          title={`Shared by ${author.name}`}
          subtitle={time}
          size="xl"
          variant="media"
        >
          <img
            src={image}
            alt={`Attachment shared by ${author.name}`}
            className="max-h-[80dvh] w-full bg-black object-contain"
            referrerPolicy="no-referrer"
          />
        </Modal>
      )}
    </motion.div>
  );
};

function formatCommentTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

export type SuggestedPerson = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  follows_you?: boolean;
};

// Replaces the old "Creator Spotlight", which ranked by signup date and wore a
// badge asserting the profiles were genuine. These come from get_friend_suggestions
// and the Follow button actually writes a follow row.
export const PeopleToFollow = ({
  people,
  loading = false,
  onOpenProfile,
  onFollow,
}: {
  people: SuggestedPerson[];
  loading?: boolean;
  onOpenProfile: (profileIdOrUsername: string) => void;
  onFollow: (userId: string) => Promise<void> | void;
}) => {
  const [pending, setPending] = useState<string | null>(null);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  const handleFollow = async (userId: string) => {
    if (pending) return;
    setPending(userId);
    try {
      await onFollow(userId);
      setFollowed((previous) => new Set(previous).add(userId));
    } finally {
      setPending(null);
    }
  };

  if (!loading && people.length === 0) return null;

  return (
    <section className="surface-card space-y-4 p-5">
      <h3 className="font-display text-sm font-semibold text-sun-text-main">People to follow</h3>

      <div className="space-y-2">
        {loading && people.length === 0
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 p-2.5">
                <div className="h-8 w-8 animate-pulse rounded-full bg-sun-surface-light" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-24 animate-pulse rounded-full bg-sun-surface-light" />
                  <div className="h-2 w-16 animate-pulse rounded-full bg-sun-surface-light" />
                </div>
              </div>
            ))
          : people.map((person) => {
              const name = person.full_name || person.username || 'Korusa member';
              const isFollowed = followed.has(person.id);
              return (
                <div
                  key={person.id}
                  className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-sun-surface-light"
                >
                  <button
                    type="button"
                    onClick={() => onOpenProfile(person.username || person.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Avatar src={person.avatar_url || undefined} name={name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-sun-text-main transition-colors group-hover:text-sun-primary">
                        {name}
                      </span>
                      {person.username && (
                        <span className="mt-0.5 block truncate text-[10px] text-sun-text-muted">
                          @{person.username}
                        </span>
                      )}
                      {/* Only shown when it is a real signal from the database. */}
                      {person.follows_you && (
                        <span className="mt-0.5 block text-[10px] font-semibold text-sun-primary">
                          Follows you
                        </span>
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleFollow(person.id)}
                    disabled={isFollowed || pending === person.id}
                    className={`flex h-8 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[9px] font-black uppercase tracking-wider transition-colors ${
                      isFollowed
                        ? 'border border-sun-border text-sun-text-muted'
                        : 'bg-sun-primary text-white hover:bg-sun-primary/90'
                    } ${pending === person.id ? 'opacity-60' : ''}`}
                  >
                    {isFollowed ? <Check size={11} /> : <UserPlus size={11} />}
                    {isFollowed ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
      </div>
    </section>
  );
};

// Real hashtags with real post counts, straight from get_trending_hashtags. No
// percentage deltas, because a single window cannot honestly produce one - and
// the whole panel disappears when nobody has tagged anything.
export const TrendingTags = ({
  tags,
  onSelect,
}: {
  tags: Array<{ tag: string; postCount: number }>;
  onSelect: (tag: string) => void;
}) => {
  if (tags.length === 0) return null;

  return (
    <section className="surface-card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Hash size={15} className="text-sun-primary" />
        <h3 className="font-display text-sm font-semibold text-sun-text-main">Tags this week</h3>
      </div>

      <div className="divide-y divide-sun-border/40">
        {tags.map((entry) => (
          <button
            key={entry.tag}
            type="button"
            onClick={() => onSelect(entry.tag)}
            className="group flex w-full items-center justify-between gap-3 rounded px-1 py-2.5 text-left transition-colors first:pt-0 last:pb-0 hover:bg-sun-bg/40"
          >
            <span className="truncate text-xs font-bold text-sun-text-main transition-colors group-hover:text-sun-primary">
              #{entry.tag}
            </span>
            <span className="shrink-0 text-[10px] font-medium text-sun-text-muted">
              {entry.postCount} {entry.postCount === 1 ? 'post' : 'posts'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
