import React, { useRef, useState, useEffect } from 'react';
import { Avatar } from '../../ui/Avatar';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const mockStories = [
  { id: 1, name: 'Your Story', isUser: true, src: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150' },
  { id: 2, name: 'Alex Rivera', src: 'https://i.pravatar.cc/150?u=12', isLive: true },
  { id: 3, name: 'Sarah Chen', src: 'https://i.pravatar.cc/150?u=15', hasUpdate: true },
  { id: 4, name: 'Marcus T.', src: 'https://i.pravatar.cc/150?u=18', isLive: true },
  { id: 5, name: 'Elena Ray', src: 'https://i.pravatar.cc/150?u=22', hasUpdate: true },
  { id: 6, name: 'David K.', src: 'https://i.pravatar.cc/150?u=25', hasUpdate: true },
  { id: 7, name: 'Zoe Life', src: 'https://i.pravatar.cc/150?u=28', hasUpdate: true },
  { id: 8, name: 'Julian M.', src: 'https://i.pravatar.cc/150?u=31', hasUpdate: true },
  { id: 9, name: 'Sophie L.', src: 'https://i.pravatar.cc/150?u=34', hasUpdate: true },
  { id: 10, name: 'Ryan G.', src: 'https://i.pravatar.cc/150?u=37' },
];

export const StoriesBar = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftBtn, setShowLeftBtn] = useState(false);
  const [showRightBtn, setShowRightBtn] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftBtn(scrollLeft > 0);
      setShowRightBtn(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative group/stories h-36 mb-8 mt-2">
      <AnimatePresence>
        {showLeftBtn && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-14 z-30 w-7 h-7 flex items-center justify-center bg-sun-surface/80 backdrop-blur-md border border-sun-border rounded-full text-sun-text-main shadow-xl hover:bg-sun-primary hover:text-black transition-all opacity-0 group-hover/stories:opacity-100 hidden sm:flex"
            id="story-nav-prev"
          >
            <ChevronLeft size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      <div 
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto pt-[14px] pb-4 scrollbar-hide px-1 ml-0 mr-0 mt-0 mb-0 snap-x snap-mandatory cursor-grab active:cursor-grabbing"
      >
        {mockStories.map((story) => (
          <motion.div 
            key={story.id} 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group snap-start"
          >
            <div className="relative">
              {/* Custom Unique Story Ring */}
              {(story.hasUpdate || story.isLive) && (
                <div className="absolute inset-[-5px] rounded-full p-[2.5px] overflow-hidden">
                  <div className={`absolute inset-0 rounded-full animate-spin-slow ${
                    story.isLive 
                      ? 'bg-gradient-to-tr from-red-600 via-sun-primary to-rose-600 animate-pulse' 
                      : 'bg-gradient-to-tr from-sun-primary via-[#FFE53B] to-[#FF2525]'
                  }`} />
                  <div className="absolute inset-[1.5px] rounded-full bg-sun-bg z-10" />
                </div>
              )}
              
              <div className="relative z-10 p-[2px] bg-sun-bg rounded-full transition-transform group-hover:scale-105 duration-300">
                <Avatar 
                  size="xl" 
                  src={story.src} 
                  isLive={story.isLive} 
                  className={`border-0 ${story.hasUpdate || story.isLive ? '' : 'ring-1 ring-sun-border/50'}`}
                />
              </div>

              {story.isUser && (
                <div className="absolute bottom-1 right-1 z-20 bg-sun-primary text-black rounded-full p-1.5 border-4 border-sun-bg shadow-lg transform translate-x-1 translate-y-1">
                  <Plus size={14} strokeWidth={4} />
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-sun-text-muted group-hover:text-sun-text-main transition-all truncate w-24 text-center tracking-tight mt-1">
              {story.isUser ? 'Your Story' : story.name}
            </span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showRightBtn && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-14 z-30 w-7 h-7 flex items-center justify-center bg-sun-surface/80 backdrop-blur-md border border-sun-border rounded-full text-sun-text-main shadow-xl hover:bg-sun-primary hover:text-black transition-all opacity-0 group-hover/stories:opacity-100 hidden sm:flex"
            id="story-nav-next"
          >
            <ChevronRight size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
