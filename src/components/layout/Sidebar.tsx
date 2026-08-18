import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, Bell, BookOpen, Compass, Home, LogOut, MessageSquare, Sparkles, User, Video, X, type LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KorusaIcon, KorusaLogo } from '../shared/Logo';
import { useUIStore } from '../../store/uiStore';

interface SidebarProps { onSignOut?: () => void; }
interface NavItem { icon: LucideIcon; label: string; path: string; }

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Video, label: 'Sparks', path: '/sparks' },
  { icon: BookOpen, label: 'Learn', path: '/learn' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Sparkles, label: 'AI assistant', path: '/assistant' },
  { icon: User, label: 'Profile', path: '/profile/me' },
];

export const Sidebar: React.FC<SidebarProps> = ({ onSignOut }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarOpen, setSidebarOpen, unreadNotifications } = useUIStore();
  const current = location.pathname.split('/')[1] || 'home';

  React.useEffect(() => setSidebarOpen(false), [location.pathname, setSidebarOpen]);
  const go = (path: string) => { navigate(path); setSidebarOpen(false); };

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && <motion.button type="button" aria-label="Close navigation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm lg:hidden" />}
      </AnimatePresence>
      {/* min(17.5rem, 86vw) rather than a flat 280px: on a 320px phone a fixed
          280px drawer leaves 40px of backdrop, which is not enough of a target to
          dismiss it by tapping outside. */}
      <aside className={`fixed inset-y-0 left-0 z-[90] flex w-[min(17.5rem,86vw)] flex-col border-r border-sun-border bg-sun-surface shadow-xl transition-transform duration-200 lg:w-20 lg:translate-x-0 lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Primary navigation">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sun-border px-5 lg:justify-center lg:px-0">
          <button type="button" onClick={() => go('/home')} className="rounded-lg lg:hidden" aria-label="Go to home"><KorusaLogo size={30} textClassName="text-lg" /></button>
          <button type="button" onClick={() => go('/home')} className="hidden rounded-xl lg:block" aria-label="Go to home"><KorusaIcon size={38} /></button>
          <button type="button" onClick={() => setSidebarOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sun-text-muted hover:bg-sun-surface-light lg:hidden" aria-label="Close navigation"><X size={20} /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-hide">
          {navItems.map((item) => {
            const section = item.path.split('/')[1];
            const active = current === section;
            const Icon = item.icon;
            // Two presentations of one count: the rail above lg is icon-only, so it
            // gets a dot on the glyph, while the labelled drawer below lg has room
            // for the number itself.
            const badge = item.path === '/notifications' ? unreadNotifications : 0;
            return (
              <button key={item.path} type="button" onClick={() => go(item.path)} title={item.label} aria-current={active ? 'page' : undefined} aria-label={badge > 0 ? `${item.label}, ${badge} unread` : undefined} className={`group relative flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors lg:justify-center lg:px-0 ${active ? 'bg-sun-primary/10 text-sun-primary' : 'text-sun-text-muted hover:bg-sun-surface-light hover:text-sun-text-main'}`}>
                {active && <motion.span layoutId="desktop-nav-indicator" className="absolute left-0 h-6 w-1 rounded-r-full bg-sun-primary" />}
                <span className="relative shrink-0">
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 && <span className="absolute -right-1 -top-1 hidden h-2.5 w-2.5 rounded-full bg-sun-primary ring-2 ring-sun-surface lg:block" />}
                </span>
                <span className="lg:hidden">{item.label}</span>
                {badge > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sun-primary px-1.5 text-[10px] font-black leading-none text-white lg:hidden">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                <span className="pointer-events-none absolute left-[calc(100%+12px)] z-[110] hidden rounded-lg border border-sun-border bg-sun-surface px-2.5 py-1.5 text-xs text-sun-text-main opacity-0 shadow-md transition-opacity group-hover:opacity-100 lg:block">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-sun-border p-3">
          <button type="button" onClick={onSignOut} title="Sign out" className="group relative flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-sun-text-muted transition-colors hover:bg-red-500/10 hover:text-red-600 lg:justify-center lg:px-0">
            <LogOut size={21} /><span className="lg:hidden">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
