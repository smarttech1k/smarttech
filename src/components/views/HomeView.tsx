import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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
  PostProps
} from '../features/home/HomeComponents';
import { Badge } from '../ui/Input';
import { apiRequest } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { loadContentBlock } from '../../lib/content';

export const HomeView = () => {
  const navigate = useNavigate();
  const { authToken, currentUser } = useUIStore();
  const [feedPosts, setFeedPosts] = useState<PostProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeMeta, setHomeMeta] = useState<{ title?: string; subtitle?: string; empty?: string }>({});

  const mapPostType = (caption: string): PostType => {
    const text = caption.toLowerCase();
    if (text.includes('recommend') || text.includes('learn') || text.includes('tip')) return 'Recommendation';
    if (text.includes('update') || text.includes('announce') || text.includes('system')) return 'SystemUpdate';
    return 'Idea';
  };

  const handleSparkNavigation = () => {
    navigate('/sparks');
  };

  const handleLearnNavigation = (courseId?: string) => {
    if (courseId) {
      navigate('/learn');
    } else {
      navigate('/learn');
    }
  };

  const handleProjectNavigation = () => {
    navigate('/explore');
  };

  useEffect(() => {
    let mounted = true;
    const loadMeta = async () => {
      try {
        const content = await loadContentBlock<any>('home', 'overview', authToken);
        if (!mounted) return;
        setHomeMeta({
          title: content.hero_title,
          subtitle: content.activity_subtitle,
          empty: content.empty_state,
        });
      } catch {
        // keep defaults
      }
    };
    const loadFeed = async () => {
      if (!authToken) {
        setFeedPosts([]);
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest<{ feed: Array<{
          id: string;
          author: { username: string; full_name?: string; avatar_url?: string };
          caption: string;
          likes_count: number;
          comments_count: number;
          shares_count: number;
          views_count: number;
          created_at?: string;
        }> }>('/posts/feed?limit=6&page=1', {}, authToken);
        if (!mounted) return;
        const nextFeed = response.feed.map((post) => ({
          id: post.id,
          type: mapPostType(post.caption),
          author: {
            name: post.author.full_name || post.author.username || 'Creator',
            handle: post.author.username || 'creator',
            avatar: post.author.avatar_url || `https://i.pravatar.cc/150?u=${post.author.username || post.id}`,
            role: 'Community Creator',
          },
          content: post.caption || 'Shared a new idea.',
          likes: post.likes_count,
          comments: post.comments_count,
          time: post.created_at ? new Date(post.created_at).toLocaleString() : 'Recently',
        }));
        setFeedPosts(nextFeed);
      } catch {
        setFeedPosts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadMeta();
    loadFeed();
    return () => {
      mounted = false;
    };
  }, [authToken]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pb-24 max-w-[1400px] mx-auto">
      {/* Left and Center Main Content Flow */}
      <div className="lg:col-span-8 space-y-10">
        
        {/* 1. PROMPT BAR (MODERN WRITE-BOX) */}
        <PromptBar onFocus={() => navigate('/create')} />

        {/* 2. WELCOME HERO SECTION */}
        <HeroSection 
          onExplore={() => navigate('/explore')} 
          onLearn={() => navigate('/learn')} 
        />

        {/* 3. QUICK ACTION TILES */}
        <QuickActionCards 
          onSparkClick={handleSparkNavigation}
          onCourseClick={() => handleLearnNavigation()}
          onProjectClick={handleProjectNavigation}
        />

        {/* 4. LEARNING RECOMMENDATIONS CARD BLOCK */}
        <LearningRecommendations 
          onCourseClick={(id) => handleLearnNavigation(id)} 
        />

        {/* 5. FEED STREAM HEADER */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-sun-text-main">Community Activity</h2>
              <p className="text-xs text-sun-text-muted mt-0.5">{homeMeta.subtitle || 'High engaging discussions and insights'}</p>
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

          {/* STREAM RENDER */}
          <div className="space-y-6">
            {(loading ? [] : feedPosts).map((post) => (
              <CommunityPost 
                key={post.id} 
                id={post.id}
                type={post.type}
                author={post.author}
                content={post.content}
                image={post.image}
                likes={post.likes}
                comments={post.comments}
                time={post.time}
              />
            ))}
            {!loading && feedPosts.length === 0 && (
              <div className="rounded-3xl border border-sun-border bg-sun-surface p-8 text-center text-sm text-sun-text-muted">
                {homeMeta.empty || 'No live posts yet. Create the first one from the Create screen.'}
              </div>
            )}
          </div>
        </div>

        {/* Load More Trigger */}
        <div className="flex justify-center pt-4">
          <button 
            onClick={() => navigate('/explore')}
            className="px-8 py-3.5 bg-sun-surface border border-sun-border hover:border-sun-primary text-sun-text-main hover:text-sun-primary text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            Explore More Activity
          </button>
        </div>
      </div>

      {/* Right-Hand Meta Column (Visible on screens larger than lg) */}
      <div className="hidden lg:block lg:col-span-4 space-y-8 sticky top-24">
        {/* Creator Spotlight Widget */}
        <CreatorSpotlight />

        {/* Trending Tags and Threads */}
        <TrendingDiscussions />
      </div>
    </div>
  );
};
