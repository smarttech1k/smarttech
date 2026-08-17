import React, { useEffect, useState } from 'react';
import { Bell, Menu, MessageSquare, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { KorusaLogo } from '../shared/Logo';
import { useUIStore } from '../../store/uiStore';
import { fetchMyProfile, type ProfileRef } from '../../lib/feed';

const iconButtonClass = 'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sun-text-muted transition-colors hover:bg-sun-surface-light hover:text-sun-text-main focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-primary/15';

export const Navbar = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme, toggleSidebar } = useUIStore();
  const [profile, setProfile] = useState<ProfileRef | null>(null);

  useEffect(() => {
    void fetchMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  return (
    <header className="nav-blur relative z-[60] h-16 shrink-0 lg:pl-20">
      {/* Tighter gaps and padding below sm: the search field is the only flexible
          item in this row, so every fixed pixel elsewhere is taken straight out of
          it. At 320px the old spacing left it 69px wide - narrower than its own
          left padding plus the magnifier. */}
      <div className="flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-8">
        <button type="button" onClick={toggleSidebar} className={`${iconButtonClass} lg:hidden`} title="Open navigation" aria-label="Open navigation"><Menu size={20} /></button>
        <button type="button" onClick={() => navigate('/home')} className="shrink-0 rounded-lg lg:hidden" aria-label="Go to home"><KorusaLogo size={25} textClassName="hidden text-base sm:inline" /></button>
        <div className="relative min-w-0 flex-1 sm:ml-2 sm:max-w-xl">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sun-text-muted sm:left-3.5" />
          <input type="search" placeholder="Search Korusa" aria-label="Search Korusa" className="h-10 w-full rounded-xl border border-sun-border bg-sun-surface pl-9 pr-3 text-sm text-sun-text-main shadow-sm outline-none transition-colors placeholder:text-sun-text-muted/65 focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10 sm:pl-10 sm:pr-4" />
        </div>
        <nav className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1" aria-label="Quick actions">
          <button type="button" onClick={toggleTheme} className={iconButtonClass} title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>{isDarkMode ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button type="button" onClick={() => navigate('/assistant')} className={`${iconButtonClass} hidden sm:inline-flex`} title="AI assistant" aria-label="Open AI assistant"><Sparkles size={19} /></button>
          <button type="button" onClick={() => navigate('/messages')} className={`${iconButtonClass} hidden sm:inline-flex`} title="Messages" aria-label="Open messages"><MessageSquare size={19} /></button>
          {/* No unread dot: there is no real notification count to drive it, and a
              badge that is always lit is a fabricated signal. */}
          <button type="button" onClick={() => navigate('/notifications')} className={iconButtonClass} title="Notifications" aria-label="Open notifications"><Bell size={19} /></button>
          <div className="mx-1 hidden h-7 w-px bg-sun-border sm:block" />
          <button type="button" onClick={() => navigate('/profile/me')} className="ml-0.5 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-primary/15" title="Open profile" aria-label="Open profile"><Avatar size="md" src={profile?.avatar_url || undefined} name={profile?.full_name || profile?.username || 'My profile'} /></button>
        </nav>
      </div>
    </header>
  );
};
