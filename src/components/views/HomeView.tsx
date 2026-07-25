import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommunityPost,
  CreatorSpotlight,
  HeroSection,
  LearningRecommendations,
  PostProps,
  PostType,
  PromptBar,
  QuickActionCards,
  TrendingDiscussions,
} from '../features/home/HomeComponents';
import {
  addComment,
  FeedPost,
  fetchCreatorSpotlight,
  fetchFeed,
  likePost,
  unlikePost,
} from '../../lib/feed';

type Creator = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
};

export const HomeView = () => {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<PostProps[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const [{ posts, currentUserId: userId }, spotlight] = await Promise.all([
        fetchFeed(),
        fetchCreatorSpotlight(3),
      ]);
      setCurrentUserId(userId);
      setCreators(spotlight);
      setFeed(
        posts.map((post: FeedPost) => ({
          id: post.id,
          type: 'Idea' as PostType,
          author: {
            id: post.profiles?.id || post.user_id,
            name: post.profiles?.full_name || post.profiles?.username || 'Unknown user',
            handle: post.profiles?.username || '',
            avatar: post.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`,
            role: 'Community member',
            isExpert: false,
          },
          content: post.content,
          image: post.media_url || undefined,
          likes: post.likes?.length || 0,
          comments: post.comments?.length || 0,
          commentItems: post.comments || [],
          time: formatRelativeTime(post.created_at),
          likedByMe: !!userId && post.likes?.some((like) => like.user_id === userId),
        })),
      );
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load the feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
  }, []);

  const handleLikeToggle = async (postId: string, currentlyLiked: boolean) => {
    if (!currentUserId) return;
    if (currentlyLiked) await unlikePost(postId, currentUserId);
    else await likePost(postId, currentUserId);
  };

  const handleCommentSubmit = async (postId: string, content: string) => {
    if (!currentUserId) return;
    await addComment(postId, currentUserId, content);
    await loadFeed();
  };

  const openProfile = (profileIdOrUsername: string) => {
    if (profileIdOrUsername) navigate(`/profile/${profileIdOrUsername}`);
  };

  return (
    <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-7 pb-16 lg:grid-cols-12 lg:gap-8">
      <div className="space-y-7 lg:col-span-8 xl:col-span-9">
        <PromptBar onFocus={() => navigate('/create')} />
        <HeroSection onExplore={() => navigate('/explore')} onLearn={() => navigate('/learn')} />
        <QuickActionCards onSparkClick={() => navigate('/sparks')} onCourseClick={() => navigate('/learn')} onProjectClick={() => navigate('/explore')} />
        <LearningRecommendations onCourseClick={() => navigate('/learn')} />

        <section className="space-y-4" aria-labelledby="community-heading">
          <div className="flex items-end justify-between gap-4 px-1">
            <div>
              <h2 id="community-heading" className="section-title">Community activity</h2>
              <p className="section-description mt-1">Fresh ideas and conversations from your network.</p>
            </div>
            <div className="flex rounded-xl border border-sun-border bg-sun-surface p-1 shadow-sm">
              <button type="button" className="rounded-lg bg-sun-primary px-3 py-1.5 text-xs font-semibold text-white">Trending</button>
              <button type="button" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-sun-text-muted transition-colors hover:text-sun-text-main">Latest</button>
            </div>
          </div>

          {loading && <div className="surface-card p-5 text-sm text-sun-text-muted">Loading your feed…</div>}
          {errorMessage && <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-5 text-sm text-red-600">{errorMessage}</div>}
          {!loading && !errorMessage && feed.length === 0 && <div className="surface-card p-6 text-center text-sm text-sun-text-muted">No posts yet. Start the first conversation.</div>}

          <div className="space-y-4">
            {feed.map((post) => (
              <CommunityPost key={post.id} {...post} onLikeToggle={handleLikeToggle} onCommentSubmit={handleCommentSubmit} onOpenProfile={openProfile} />
            ))}
          </div>
        </section>
      </div>

      <aside className="hidden space-y-5 lg:col-span-4 lg:block xl:col-span-3">
        <div className="sticky top-5 space-y-5">
          <CreatorSpotlight creators={creators} onOpenProfile={openProfile} />
          <TrendingDiscussions />
        </div>
      </aside>
    </div>
  );
};

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
