import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Play, TrendingUp, Sparkles, FileText } from 'lucide-react';
import { Badge } from '../../ui/Input';
import { BackButton } from '../../ui/BackButton';
import { apiRequest } from '../../../lib/api';
import { useUIStore } from '../../../store/uiStore';

const categories = [
  { id: 'all', label: 'All Sparks', icon: Sparkles },
  { id: 'dev', label: 'Photography', icon: Sparkles },
  { id: 'ai', label: 'Storytelling', icon: Sparkles },
  { id: 'business', label: 'Creative Tech', icon: Sparkles },
  { id: 'design', label: 'Design & UX', icon: Sparkles },
];

type ExploreItem = {
  id: string;
  type: 'video' | 'post';
  size: 'large' | 'regular' | 'tall';
  image?: string;
  content: string;
  views?: string;
  likes?: string;
  category: string;
};

export const ExploreView = ({ onBack }: { onBack?: () => void }) => {
  const { authToken } = useUIStore();
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const loaderRef = useRef<HTMLDivElement>(null);

  const mapPost = (post: any, index: number): ExploreItem => ({
    id: post.id,
    type: post.video_url ? 'video' : 'post',
    size: index % 5 === 0 ? 'large' : index % 3 === 0 ? 'tall' : 'regular',
    image: post.images?.[0] || post.thumbnail || undefined,
    content: post.caption || post.body || post.description || 'Text-only post',
    views: post.views_count ? `${Math.round(post.views_count / 1000)}k` : undefined,
    likes: post.likes_count ? `${Math.round(post.likes_count / 1000)}k` : '0',
    category: (post.tags?.[0] || post.audience || 'all').toLowerCase(),
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!authToken) return;
      try {
        const response = await apiRequest<{ posts: any[] }>('/posts/explore?limit=20&page=1', {}, authToken);
        if (!mounted) return;
        setItems(response.posts.map(mapPost));
        setHasMore(response.posts.length > 0);
      } catch {
        if (mounted) setItems([]);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [authToken]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore || !authToken) return;
    setIsLoading(true);
    apiRequest<{ posts: any[] }>(`/posts/explore?limit=20&page=${page + 1}`, {}, authToken)
      .then((response) => {
        const newItems = response.posts.map((post, index) => mapPost(post, index + items.length));
        setItems((prev) => [...prev, ...newItems]);
        setPage((prev) => prev + 1);
        setHasMore(newItems.length > 0);
      })
      .finally(() => setIsLoading(false));
  }, [authToken, hasMore, isLoading, items.length, page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter(item => item.category === activeTab);

  return (
    <div className="space-y-10">
      <header className="space-y-8">
        <div className="flex flex-col gap-4">
          {onBack && <BackButton onClick={onBack} label="Dashboard" sticky={true} />}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-display font-bold leading-tight">Explore Sparks</h1>
              <p className="text-sun-text-muted text-sm font-medium">Discover creative ideas and follow inspiring builders from around the world.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-sun-primary/10 rounded-2xl border border-sun-primary/20">
              <TrendingUp size={16} className="text-sun-primary" />
              <span className="text-[10px] font-black text-sun-primary uppercase tracking-widest">Trending Now</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl whitespace-nowrap transition-all border ${
                activeTab === cat.id 
                ? 'bg-sun-primary text-black font-bold border-sun-primary shadow-lg shadow-sun-primary/20' 
                : 'bg-sun-surface border-sun-border text-sun-text-muted hover:border-sun-primary/50'
              }`}
            >
              <cat.icon size={18} />
              <span className="text-sm">{cat.label}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 auto-rows-[120px] sm:auto-rows-[150px]">
        {filteredItems.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 0.98 }}
            className={`relative rounded-[2rem] overflow-hidden group cursor-pointer bg-sun-surface ${
              item.size === 'large' ? 'row-span-3 col-span-2' : 
              item.size === 'tall' ? 'row-span-3' : 
              'row-span-2'
            }`}
          >
            {item.image ? (
              <img 
                src={item.image} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt="Explore content" 
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-sun-surface via-sun-surface-light to-sun-primary/10 flex flex-col justify-between p-5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-sun-primary/15 border border-sun-primary/20 flex items-center justify-center text-sun-primary">
                    <FileText size={18} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sun-text-muted">Text post</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold leading-snug text-sun-text-main line-clamp-4">
                    {item.content}
                  </p>
                  <p className="text-[10px] font-medium text-sun-text-muted">No image attached</p>
                </div>
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sun-primary/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <TrendingUp size={12} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-white uppercase tracking-tighter">{item.likes}</span>
                </div>
                {item.type === 'video' && (
                  <Badge variant="primary">REEL</Badge>
                )}
              </div>
            </div>

            {item.type === 'video' && (
              <div className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white">
                <Play size={14} className="fill-current" />
              </div>
            )}

            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                 <Play size={8} className="text-white fill-current" />
                 <span className="text-[8px] font-bold text-white uppercase">{item.type === 'video' ? (item as any).views : item.likes}</span>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load More Trigger Area */}
      <div 
        ref={loaderRef}
        className="py-20 flex flex-col items-center justify-center gap-6"
      >
        {isLoading && (
          <>
            <div className="w-12 h-12 border-4 border-sun-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-sun-text-muted uppercase tracking-[0.2em] animate-pulse italic">Scanning for more content...</p>
          </>
        )}
        {!hasMore && (
          <p className="text-xs font-bold text-sun-text-muted uppercase tracking-[0.2em] italic">You've reached the end of the content feed.</p>
        )}
      </div>
    </div>
  );
};
