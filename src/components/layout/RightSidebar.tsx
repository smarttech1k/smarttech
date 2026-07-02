import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { loadContentBlock } from '../../lib/content';
import { useUIStore } from '../../store/uiStore';

export const RightSidebar = () => {
  const [mentorItems, setMentorItems] = useState<{ name: string; role: string; src: string; live: boolean }[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>(['Web3', 'Motion UI', 'Python', 'Brand Strategy', 'NoCode', 'Figma Pro']);
  const [fundTitle, setFundTitle] = useState('Creator Fund');
  const [fundDescription, setFundDescription] = useState('Start earning by sharing your expertise through short videos.');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const content = await loadContentBlock<any>('shell', 'right_sidebar', useUIStore.getState().authToken);
        if (!mounted) return;
        setMentorItems(content.mentors || mentorItems);
        setTrendingTags(content.trending_tags || trendingTags);
        setFundTitle(content.fund_title || fundTitle);
        setFundDescription(content.fund_description || fundDescription);
      } catch {
        // keep defaults
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <aside className="fixed right-0 top-16 bottom-0 z-40 hidden xl:flex flex-col w-14 hover:w-80 bg-sun-bg border-l border-sun-border transition-all duration-300 ease-in-out group/right-sidebar overflow-y-auto scrollbar-hide shadow-[-20px_0_40px_rgba(0,0,0,0.1)]">
      {/* Expansion Trigger / Collapsed View */}
      <div className="absolute left-0 top-0 bottom-0 w-14 flex flex-col items-center pt-8 gap-8 group-hover/right-sidebar:opacity-0 transition-opacity duration-200 pointer-events-none">
        <div className="w-8 h-8 rounded-xl bg-sun-primary/10 flex items-center justify-center text-sun-primary shadow-[0_0_15px_rgba(255,184,0,0.1)]">
          <TrendingUp size={18} />
        </div>
        <div className="flex flex-col gap-3">
          <div className="w-1 h-1 rounded-full bg-sun-border" />
          <div className="w-1 h-1 rounded-full bg-sun-border" />
          <div className="w-1 h-1 rounded-full bg-sun-border" />
        </div>
        <div className="mt-auto pb-8">
           <div className="w-8 h-8 rounded-full border border-sun-border flex items-center justify-center text-sun-text-muted">
              <Avatar size="sm" src="https://i.pravatar.cc/150?u=12" />
           </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div className="opacity-0 group-hover/right-sidebar:opacity-100 transition-all duration-300 p-8 w-80 translate-x-4 group-hover:translate-x-0">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-sun-text-main">Top Mentors</h3>
            <button className="text-[10px] font-bold text-sun-primary uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="space-y-5">
            {(mentorItems.length > 0 ? mentorItems : [
              { name: 'Alex Rivera', role: 'UI/UX Lead', src: 'https://i.pravatar.cc/150?u=12', live: true },
              { name: 'Sarah Chen', role: 'Fullstack Dev', src: 'https://i.pravatar.cc/150?u=15', live: false },
              { name: 'Marcus T.', role: 'AI Specialist', src: 'https://i.pravatar.cc/150?u=18', live: false },
            ]).map((mentor) => (
              <div key={mentor.name} className="flex items-center gap-4 group cursor-pointer">
                <Avatar size="md" src={mentor.src} isLive={mentor.live} />
                <div className="flex-1">
                  <p className="text-sm font-bold group-hover:text-sun-primary transition-colors text-sun-text-main">{mentor.name}</p>
                  <p className="text-[10px] text-sun-text-muted font-medium">{mentor.role}</p>
                </div>
                <button className="px-3 py-1.5 bg-sun-surface border border-sun-border rounded-lg text-[10px] font-bold hover:bg-sun-primary hover:text-black transition-all">Follow</button>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px bg-sun-border my-10"></div>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-sun-text-main">Trending Skills</h3>
            <TrendingUp size={18} className="text-sun-primary" />
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map(tag => (
              <button key={tag} className="px-3 py-2 bg-sun-surface border border-sun-border rounded-xl text-[10px] font-bold text-sun-text-main hover:border-sun-primary/50 transition-colors">
                #{tag}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="glass-card p-6 rounded-[2rem] border border-sun-primary/20 bg-sun-primary/5">
            <p className="text-sm font-bold mb-2 italic text-sun-text-main">{fundTitle}</p>
            <p className="text-xs text-sun-text-muted leading-relaxed mb-4">{fundDescription}</p>
            <button className="w-full py-3 bg-sun-primary text-black text-[10px] font-black rounded-2xl uppercase tracking-tighter hover:scale-[1.02] transition-transform">Apply Now</button>
          </div>
        </section>
      </div>
    </aside>
  );
};
