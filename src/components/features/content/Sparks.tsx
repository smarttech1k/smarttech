import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, Music, Bookmark, MoreVertical, Plus, ChevronDown, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import { Avatar } from '../../ui/Avatar';

const mockReels = [
  {
    id: 1,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-lighting-in-the-city-at-night-21251-large.mp4',
    author: { name: 'codemaster_x', avatar: 'https://i.pravatar.cc/150?u=1', followed: false },
    description: 'Quick CSS trick for glowing modern glassmorphic cards! Level up your container designs in 30 seconds. 🚀💻 #learning #webdev #css #design #tips',
    music: 'Lofi Coding Beats - Synthwave Remix',
    likes: '14.2k',
    comments: '342',
    shares: '2.1k'
  },
  {
    id: 2,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-leaves-on-a-sunny-day-1587-large.mp4',
    author: { name: 'mindset_coach', avatar: 'https://i.pravatar.cc/150?u=2', followed: true },
    description: '3 daily focus hacks to eliminate procrastination instantly. Build systems, not just habits! 🍂💡 #productivity #focus #mindset #growth #mentor',
    music: 'Lo-Fi Study Moods - Chill Instrumental',
    likes: '29.4k',
    comments: '1,120',
    shares: '8.4k'
  },
  {
    id: 3,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-rendering-of-a-futuristic-city-with-traffic-at-night-42410-large.mp4',
    author: { name: 'startup_insight', avatar: 'https://i.pravatar.cc/150?u=3', followed: false },
    description: 'The standard SaaS tech stack in 2026. Microservices vs. Monoliths for modern applications. Scale with confidence. 🌐⚡ #tech #scaling #startup #ideas',
    music: 'Digital Acceleration - Tech Wave',
    likes: '51.8k',
    comments: '2.4k',
    shares: '14.3k'
  },
  {
    id: 4,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-clouds-moving-fast-over-a-mountain-4358-large.mp4',
    author: { name: 'creative_spark', avatar: 'https://i.pravatar.cc/150?u=4', followed: false },
    description: 'Finding inspiration in daily life. Creativity is a habit, not random lightning. Start today. ⛰️🎨 #creative #inspiration #motivation #mentor',
    music: 'Ethereal Space - Ambient Focus',
    likes: '9.5k',
    comments: '118',
    shares: '954'
  }
];

interface Reel {
  id: number;
  videoUrl: string;
  author: { name: string; avatar: string; followed: boolean; };
  description: string;
  music: string;
  likes: string;
  comments: string;
  shares: string;
}

const ReelItem: React.FC<{ reel: Reel; isActive: boolean; isMuted: boolean; toggleMute: () => void }> = ({ reel, isActive, isMuted, toggleMute }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFollowed, setIsFollowed] = useState(reel.author.followed);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {
          // Handle autoplay block if necessary
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowed(!isFollowed);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: `Korusa Lessons via @${reel.author.name}`,
      text: reel.description,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
    }
  };

  return (
    <div className="relative h-screen w-full snap-start bg-sun-bg flex items-center justify-center overflow-hidden shrink-0">
      <video 
        ref={videoRef}
        src={reel.videoUrl} 
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onClick={toggleMute}
      />

      {/* Share/Link Copied Toast */}
      <AnimatePresence>
        {showCopied && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-sun-primary text-white font-black uppercase text-[10px] tracking-widest rounded-full shadow-2xl shadow-sun-primary/20 pointer-events-none"
          >
            Spark Link Copied
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute Overlay Feedback */}
      <AnimatePresence>
        {isActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
          >
            {isMuted ? (
              <div className="bg-black/50 p-4 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                <VolumeX size={32} className="text-white" />
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay Content */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none"></div>

      {/* Bottom Content (Info) */}
      <div className="absolute bottom-20 md:bottom-24 left-4 right-16 space-y-4 z-10">
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" onClick={handleFollow}>
            <Avatar size="lg" src={reel.author.avatar} className="ring-2 ring-sun-border" />
            <AnimatePresence>
              {!isFollowed && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    whileHover={{ scale: 1.1 }}
                    className="absolute -bottom-1 -right-1 bg-sun-primary text-white rounded-full p-1 border-2 border-sun-bg"
                  >
                      <Plus size={10} strokeWidth={4} />
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="pointer-events-auto">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base drop-shadow-md">@{reel.author.name}</h3>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleFollow}
                className={`px-3 py-1 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  isFollowed 
                    ? 'bg-white/10 text-white border border-white/20' 
                    : 'bg-sun-primary text-white'
                }`}
              >
                {isFollowed ? 'Unfollow' : 'Follow'}
              </motion.button>
            </div>
            <p className="text-[11px] text-white/70 mt-0.5 drop-shadow-sm">Top Contributor</p>
          </div>
        </div>

        <p className="text-white text-sm leading-relaxed max-w-sm line-clamp-2 md:line-clamp-3 drop-shadow-md">
          {reel.description}
        </p>

        <div className="flex items-center gap-2 text-white bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full w-fit border border-white/10">
          <Music size={12} className="animate-pulse" />
          <div className="overflow-hidden w-40">
            <motion.div 
              animate={{ x: [-160, 160] }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              className="text-[10px] font-medium whitespace-nowrap"
            >
              {reel.music} • {reel.music}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-20 md:bottom-24 flex flex-col gap-6 items-center z-10">
        <div className="flex flex-col items-center">
          <button 
            title="Like"
            className="w-12 h-12 bg-black/20 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-red-500/20 transition-all border border-white/10 active:scale-90"
          >
            <Heart size={26} className="text-white hover:text-red-500 transition-colors" />
          </button>
          <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">{reel.likes}</span>
        </div>

        <div className="flex flex-col items-center">
          <button 
            title="Comments"
            className="w-12 h-12 bg-black/20 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-sky-500/20 transition-all border border-white/10 active:scale-90"
          >
            <MessageCircle size={24} className="text-white" />
          </button>
          <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">{reel.comments}</span>
        </div>

        <div className="flex flex-col items-center">
          <button 
            title="Save"
            className="w-12 h-12 bg-black/20 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-sun-secondary/20 transition-all border border-white/10 active:scale-90"
          >
            <Bookmark size={24} className="text-white" />
          </button>
          <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">Save</span>
        </div>

        <div className="flex flex-col items-center">
          <button 
            title="Share"
            onClick={handleShare}
            className="w-12 h-12 bg-black/20 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-green-500/20 transition-all border border-white/10 active:scale-90"
          >
            <Share2 size={24} className="text-white" />
          </button>
          <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">Share</span>
        </div>

        <button 
          title="More Options"
          className="p-2 opacity-70 hover:opacity-100 transition-opacity"
        >
          <MoreVertical size={20} className="text-white" />
        </button>
        
        {/* Spinning record avatar effect */}
        <div className="mt-2">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="w-10 h-10 rounded-full border-[3px] border-sun-primary/50 bg-black p-0.5"
            >
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img src={reel.author.avatar} alt="music icon" className="w-full h-full object-cover" />
                </div>
            </motion.div>
        </div>
      </div>
    </div>
  );
};

export const SparksView = () => {
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setActiveReelIndex(index);
          }
        });
      },
      { threshold: 0.8 }
    );

    const elements = containerRef.current?.querySelectorAll('[data-reel="item"]');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const scroll = (direction: 'up' | 'down') => {
    if (containerRef.current) {
      const scrollAmount = containerRef.current.clientHeight;
      containerRef.current.scrollBy({
        top: direction === 'up' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-sun-bg flex justify-center overflow-hidden z-0">
      {/* Scroll Navigation Controls for Desktop */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 z-[50] hidden xl:flex flex-col gap-6">
        <button 
          onClick={() => scroll('up')}
          title="Previous Spark"
          className="w-12 h-12 rounded-full bg-sun-surface-light/80 backdrop-blur-xl border border-sun-border flex items-center justify-center text-sun-text-main hover:bg-sun-primary hover:text-white hover:scale-110 transition-all shadow-2xl"
          disabled={activeReelIndex === 0}
        >
          <ChevronUp size={28} />
        </button>
        <button 
          onClick={() => scroll('down')}
          title="Next Spark"
          className="w-12 h-12 rounded-full bg-sun-surface-light/80 backdrop-blur-xl border border-sun-border flex items-center justify-center text-sun-text-main hover:bg-sun-primary hover:text-white hover:scale-110 transition-all shadow-2xl"
          disabled={activeReelIndex === mockReels.length - 1}
        >
          <ChevronDown size={28} />
        </button>
      </div>

      {/* Main Snap Scrolling Container */}
      <div 
        ref={containerRef}
        className="h-full w-full max-w-none md:max-w-[450px] snap-y snap-mandatory overflow-y-auto scrollbar-hide bg-sun-bg md:border-x md:border-sun-border"
      >
        {mockReels.map((reel, index) => (
          <div key={reel.id} data-reel="item" data-index={index} className="h-full w-full snap-start">
            <ReelItem 
              reel={reel} 
              isActive={activeReelIndex === index} 
              isMuted={isMuted}
              toggleMute={() => setIsMuted(prev => !prev)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
