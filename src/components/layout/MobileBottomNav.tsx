import React from 'react';
import { Home, Compass, Plus, Video, User, MessageCircle, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavTab } from '../../types';

import { motion } from 'motion/react';

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = (): NavTab => {
    const path = location.pathname.split('/')[1] || 'home';
    if (path.startsWith('profile')) return 'profile';
    return path as NavTab;
  };

  const activeTab = getActiveTab();

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/home' },
    { id: 'explore', icon: Compass, label: 'Explore', path: '/explore' },
    { id: 'reels', icon: Video, label: 'Reels', path: '/reels' },
    { id: 'create', icon: Plus, label: 'Create', path: '/create', isCenter: true },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { id: 'messages', icon: MessageCircle, label: 'Messages', path: '/messages' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile/me' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-3xl border-t border-white/10 pb-safe">
      <nav className="h-16 flex items-center justify-around px-2 overflow-visible">
        {navItems.map((item) => (
          item.isCenter ? (
            <div key={item.id} className="flex justify-center group relative">
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-sun-primary text-black text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-[70]">
                {item.label}
              </div>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                  ${activeTab === item.id 
                    ? 'bg-white text-black ring-2 ring-sun-primary/20' 
                    : 'bg-sun-primary text-black ring-2 ring-sun-primary/10 shadow-lg shadow-sun-primary/20'}
                `}
              >
                <Plus size={24} strokeWidth={3} />
              </motion.button>
            </div>
          ) : (
            <button 
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center transition-all flex-1 relative h-full group ${activeTab === item.id ? 'text-sun-primary' : 'text-sun-text-muted hover:text-sun-text-main'}`}
            >
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 z-[70]">
                {item.label}
              </div>

              {activeTab === item.id && (
                <motion.div 
                  layoutId="mobile-nav-indicator"
                  className="absolute bottom-1 w-1 h-1 bg-sun-primary rounded-full shadow-[0_0_10px_rgba(255,184,0,0.8)]"
                />
              )}
              <item.icon size={26} className={activeTab === item.id ? 'fill-current' : ''} />
            </button>
          )
        ))}
      </nav>
    </div>
  );
};
