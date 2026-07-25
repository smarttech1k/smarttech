import React from 'react';
import { Compass, Home, Plus, User, Video } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { id: 'home', icon: Home, label: 'Home', path: '/home' },
  { id: 'explore', icon: Compass, label: 'Explore', path: '/explore' },
  { id: 'create', icon: Plus, label: 'Create', path: '/create', isCreate: true },
  { id: 'sparks', icon: Video, label: 'Sparks', path: '/sparks' },
  { id: 'profile', icon: User, label: 'Profile', path: '/profile/me' },
];

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSection = location.pathname.split('/')[1] || 'home';

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-sun-border bg-sun-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {navItems.map((item) => {
          const active = currentSection === item.id;
          const Icon = item.icon;
          if (item.isCreate) {
            return (
              <button key={item.id} type="button" onClick={() => navigate(item.path)} className="flex h-12 w-12 -translate-y-2 items-center justify-center rounded-2xl bg-sun-primary text-white shadow-lg shadow-sun-primary/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-primary/20" aria-label="Create a post">
                <Plus size={23} strokeWidth={2.5} />
              </button>
            );
          }
          return (
            <button key={item.id} type="button" onClick={() => navigate(item.path)} aria-current={active ? 'page' : undefined} className={`relative flex h-full min-w-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${active ? 'text-sun-primary' : 'text-sun-text-muted'}`}>
              {active && <motion.span layoutId="mobile-nav-indicator" className="absolute top-0 h-0.5 w-6 rounded-full bg-sun-primary" />}
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
