import React from 'react';
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

export const HomeView = () => {
  const navigate = useNavigate();

  // Premium mock community posts aligned with Korusa creative and social focus
  const mockActivityFeed: PostProps[] = [
    {
      id: 'post-1',
      type: 'Idea' as PostType,
      author: {
        name: 'Julian Thorne',
        handle: 'j_thorne',
        avatar: 'https://i.pravatar.cc/150?u=10',
        role: 'Acoustic Musician & Singer',
        isExpert: true
      },
      content: "Just posted a new 1-minute lesson on fingerpicking patterns. It's my first Spark video here! I'm looking for some friendly feedback on the pacing, or if anyone wants to team up for a duet on the next video, drop a comment! Let's create some music together.",
      image: "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=1200&q=80",
      likes: 128,
      comments: 32,
      time: '12m ago'
    },
    {
      id: 'post-2',
      type: 'Recommendation' as PostType,
      author: {
        name: 'Elena Vance',
        handle: 'evance_design',
        avatar: 'https://i.pravatar.cc/150?u=11',
        role: 'Creative Storyteller'
      },
      content: "If you're trying to grow on social channels, the biggest secret is formatting the first 3 seconds as an inviting visual hook. Just finished a great micro-lesson by Sarah Chen. It totally transformed my pacing! Highly recommend checking it out in the Learn section.",
      image: "https://images.unsplash.com/photo-1542435503-956c469947f6?w=1200&q=80",
      likes: 94,
      comments: 14,
      time: '2 hours ago'
    },
    {
      id: 'post-3',
      type: 'SystemUpdate' as PostType,
      author: {
        name: 'Marcus Bell',
        handle: 'mbell_social',
        avatar: 'https://i.pravatar.cc/150?u=15',
        role: 'Digital Art Creator'
      },
      content: "Who wants to do an informal art feedback cozy hour tomorrow? We'll jump on a chat, share some of our current sketch files, and share tips on color theory. Absolutely friendly vibes—let me know if you want an invite!",
      likes: 42,
      comments: 29,
      time: '4 hours ago'
    }
  ];

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
              <p className="text-xs text-sun-text-muted mt-0.5">High engaging discussions and insights</p>
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
            {mockActivityFeed.map((post) => (
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
