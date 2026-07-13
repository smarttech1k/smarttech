import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeroSection,
  PromptBar,
  QuickActionCards,
  LearningRecommendations,
  CommunityPost,
  CreatorSpotlight,
  TrendingDiscussions,
  PostType,
  PostProps,
} from '../features/home/HomeComponents';
import {
  fetchFeed,
  FeedPost,
  likePost,
  unlikePost,
  addComment,
  fetchCreatorSpotlight,
} from '../../lib/feed';

export const HomeView = () => {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<PostProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [creators, setCreators] = useState<
    Array<{
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
      bio?: string | null;
    }>
  >([]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

     const { posts, currentUserId } = await fetchFeed();
setCurrentUserId(currentUserId);

const spotlight = await fetchCreatorSpotlight(3);
setCreators(spotlight);

      const mappedPosts: PostProps[] = posts.map((post: FeedPost) => ({
        id: post.id,
        type: 'Idea' as PostType,
        author: {
          id: post.profiles?.id || post.user_id,
          name: post.profiles?.full_name || post.profiles?.username || 'Unknown User',
          handle: post.profiles?.username || '',
          avatar: post.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${post.user_id}`,
          role: 'Community Member',
          isExpert: false,
        },
        content: post.content,
        image: post.media_url || undefined,
        likes: post.likes?.length || 0,
        comments: post.comments?.length || 0,
        commentItems: post.comments || [],
        time: formatRelativeTime(post.created_at),
        likedByMe:
          !!currentUserId && post.likes?.some((like) => like.user_id === currentUserId),
      }));

      setFeed(mappedPosts);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to load feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleSparkNavigation = () => {
    navigate('/sparks');
  };

  const handleLearnNavigation = () => {
    navigate('/learn');
  };

  const handleProjectNavigation = () => {
    navigate('/explore');
  };

  const handleLikeToggle = async (postId: string, currentlyLiked: boolean) => {
    if (!currentUserId) return;

    if (currentlyLiked) {
      await unlikePost(postId, currentUserId);
    } else {
      await likePost(postId, currentUserId);
    }
  };

  const handleCommentSubmit = async (postId: string, content: string) => {
    if (!currentUserId) return;

    await addComment(postId, currentUserId, content);
    await loadFeed();
  };

  const handleOpenProfile = (profileIdOrUsername: string) => {
  if (!profileIdOrUsername) return;
  navigate(`/profile/${profileIdOrUsername}`);
};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pb-24 max-w-[1400px] mx-auto">
      <div className="lg:col-span-8 space-y-10">
        <PromptBar onFocus={() => navigate('/create')} />

        <HeroSection
          onExplore={() => navigate('/explore')}
          onLearn={() => navigate('/learn')}
        />

        <QuickActionCards
          onSparkClick={handleSparkNavigation}
          onCourseClick={handleLearnNavigation}
          onProjectClick={handleProjectNavigation}
        />

        <LearningRecommendations onCourseClick={() => handleLearnNavigation()} />

        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-sun-text-main">
                Community Activity
              </h2>
              <p className="text-xs text-sun-text-muted mt-0.5">
                High engaging discussions and insights
              </p>
            </div>

            <div className="flex bg-sun-surface p-1 rounded-xl border border-sun-border">
              <button className="px-4 py-1.5 bg-sun-primary text-white font-bold text-xxs lowercase first-letter:uppercase rounded-lg tracking-wider transition-all">
                Trending
              </button>
              <button className="px-4 py-1.5 text-sun-text-muted font-bold text-xxs lowercase first-letter:uppercase rounded-lg tracking-wider hover:text-sun-primary transition-colors">
                Latest
              </button>
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl border border-sun-border bg-sun-surface p-6 text-sm text-sun-text-muted">
              Loading feed...
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-400">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && feed.length === 0 && (
            <div className="rounded-2xl border border-sun-border bg-sun-surface p-6 text-sm text-sun-text-muted">
              No posts yet. Be the first to create one.
            </div>
          )}

          <div className="space-y-6">
            {feed.map((post) => (
              <CommunityPost
                key={post.id}
                id={post.id}
                type={post.type}
                author={post.author}
                content={post.content}
                image={post.image}
                likes={post.likes}
                comments={post.comments}
                commentItems={post.commentItems}
                time={post.time}
                likedByMe={post.likedByMe}
                onLikeToggle={handleLikeToggle}
                onCommentSubmit={handleCommentSubmit}
                onOpenProfile={handleOpenProfile}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={() => navigate('/create')}
            className="px-8 py-3.5 bg-sun-surface border border-sun-border hover:border-sun-primary text-sun-text-main hover:text-sun-primary text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            Create a Post
          </button>
        </div>
      </div>

      <div className="hidden lg:block lg:col-span-4 space-y-8 sticky top-24">
        <CreatorSpotlight
  creators={creators}
  onOpenProfile={handleOpenProfile}
/>
        <TrendingDiscussions />
      </div>
    </div>
  );
};

function formatRelativeTime(dateString: string) {
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