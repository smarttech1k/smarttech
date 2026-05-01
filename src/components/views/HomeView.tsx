import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Layout as LayoutIcon, Plus, Compass } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Input';
import { StoriesBar } from '../features/content/Stories';
import { PostCard, VideoCard, CourseCard } from '../ui/Cards';

export const HomeView = () => {
  const navigate = useNavigate();
  const { recentPosts } = useUIStore();

  const mockFeed = [
    {
      author: { handle: 'zen_master', avatar: 'https://i.pravatar.cc/150?u=10' },
      image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&q=80",
      content: "Architecture isn't just about buildings. It's about designing the flow of human experience. Applying this to UI today.",
      likes: "2.4k",
      commentCount: "128",
      time: "2 HOURS AGO"
    },
    {
      author: { handle: 'creative_flow', avatar: 'https://i.pravatar.cc/150?u=12' },
      image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&q=80",
      content: "The workspace of 2026. Minimal, productive, and filled with natural light. How do you set up your deep work station?",
      likes: "1.8k",
      commentCount: "84",
      time: "5 HOURS AGO"
    }
  ];

  const mockVideos = [
    {
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
      author: { name: 'CodingSensei', avatar: 'https://i.pravatar.cc/150?u=1', isLive: true, verified: true },
      description: 'Mastering the art of Clean Code in 60 seconds.',
      likes: '12.4k',
      comments: '342'
    }
  ];

  const mockCourses = [
    {
      title: 'Advanced React Architecture',
      category: 'Development',
      instructor: 'Sarah Jenkins',
      price: 49.99,
      rating: 4.9,
      students: '12.4k',
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80'
    }
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative glass-card p-10 sm:p-14 rounded-[4rem] overflow-hidden group"
      >
        <div className="relative z-10 space-y-8 max-w-2xl">
          <Badge variant="primary" className="px-4 py-1.5 text-[11px]">Your Learning Feed is Ready</Badge>
          <h2 className="font-display text-4xl sm:text-6xl font-black leading-[1.1] tracking-tighter uppercase gold-glow">
            Find your <br />
            <span className="text-sun-primary italic">focus</span> today.
          </h2>
          <p className="text-sun-text-muted text-lg font-medium leading-relaxed max-w-lg">
            Connect with 12 mentors in your circle and continue your course in <span className="text-sun-text-main font-bold">Advanced React Architecture</span>.
          </p>
          <div className="flex flex-wrap gap-4 pt-6">
            <Button size="lg" className="px-10" onClick={() => navigate('/create')}>
              <Plus size={20} strokeWidth={3} />
              Share Post
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="px-10 bg-sun-bg/20"
              onClick={() => navigate('/learn')}
            >
              <Compass size={20} />
              Explore Lessons
            </Button>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 bg-sun-primary/10 w-[500px] h-[500px] rounded-full blur-[120px] group-hover:bg-sun-primary/15 transition-colors duration-1000 animate-pulse-slow"></div>
      </motion.div>

      {/* Main Feed Content */}
      <div className="space-y-12">
        <StoriesBar />

        <div className="flex items-center justify-between px-2">

          <div className="flex bg-sun-surface-light p-1 rounded-2xl border border-sun-border/50">
            <button className="px-5 py-2 bg-sun-bg text-sun-text-main font-black text-[9px] uppercase rounded-xl tracking-widest shadow-sm ring-1 ring-sun-text-main/5">Following</button>
            <button className="px-5 py-2 text-sun-text-muted font-black text-[9px] uppercase rounded-xl tracking-widest hover:text-sun-text-main transition-colors">Discover</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12">
          <AnimatePresence mode="popLayout">
            {recentPosts.map((post, idx) => (
              <motion.div
                key={`recent-${idx}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <PostCard 
                  {...post} 
                  onAuthorClick={() => navigate('/profile/me')}
                  onCommentClick={() => navigate('/messages')}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {mockFeed.map((post, idx) => (
            <PostCard 
              key={idx} 
              {...post} 
              onAuthorClick={() => navigate('/profile/me')}
              onCommentClick={() => navigate('/messages')}
            />
          ))}
        </div>
      </div>

      {/* Trending & Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mt-24">
        <section className="space-y-8">
           <div className="flex items-center gap-4 px-2">
            <div className="p-3 bg-sun-primary/10 rounded-2xl text-sun-primary">
              <PlayCircle size={24} />
            </div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight">Quick Lessons</h2>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x scrollbar-hide">
            {mockVideos.map((video, idx) => (
              <div key={idx} className="snap-center shrink-0 w-full max-w-[280px]">
                <VideoCard {...video} onAuthorClick={() => navigate('/profile/me')} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-4 px-2">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
              <LayoutIcon size={24} />
            </div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight">Top Courses</h2>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {mockCourses.map((course, idx) => (
              <CourseCard 
                key={idx} 
                {...course} 
                onClick={() => navigate('/learning')} 
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
