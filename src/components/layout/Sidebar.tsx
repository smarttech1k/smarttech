import React from 'react';
import { Home, Compass, Video, BookOpen, MessageSquare, Bell, Sparkles, Upload, User, LogOut, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { NavTab } from '../../types';
import { useUIStore } from '../../store/uiStore';
import { KorusaLogo, KorusaIcon } from '../shared/Logo';

export const Sidebar = ({ onSignOut }: { onSignOut?: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();

  React.useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  const getActiveTab = (): NavTab => {
    const path = location.pathname.split('/')[1] || 'home';
    return path as NavTab;
  };

  const activeTab = getActiveTab();

  const handleNavClick = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768 && isSidebarOpen) {
      toggleSidebar();
    }
  };

  const navItems: { icon: any, label: string, id: NavTab, path: string }[] = [
    { icon: Home, label: 'Home', id: 'home', path: '/home' },
    { icon: Compass, label: 'Explore', id: 'explore', path: '/explore' },
    { icon: Video, label: 'Sparks', id: 'sparks', path: '/sparks' },
    { icon: BookOpen, label: 'Learn', id: 'learn', path: '/learn' },
    { icon: MessageSquare, label: 'Messages', id: 'messages', path: '/messages' },
    { icon: Bell, label: 'Notifications', id: 'notifications', path: '/notifications' },
    { icon: BarChart3, label: 'Analytics', id: 'analytics', path: '/analytics' },
    { icon: Sparkles, label: 'AI Assistant', id: 'assistant', path: '/assistant' },
    { icon: User, label: 'Profile', id: 'profile', path: '/profile/me' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed inset-y-0 left-0 z-[100] flex flex-col 
        bg-sun-bg border-r border-sun-border h-full shrink-0 
        transition-all duration-300 ease-in-out group/sidebar overflow-y-auto overflow-x-hidden scrollbar-hide shadow-2xl
        ${isSidebarOpen 
          ? 'w-72 translate-x-0 lg:w-20 lg:hover:w-72' 
          : '-translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-72'
        } 
      `}>
        {/* Logo Section */}
        <div className="flex items-center gap-4 mb-8 px-5 pt-6 shrink-0 overflow-hidden whitespace-nowrap cursor-pointer" onClick={() => navigate('/home')}>
          <div className="shrink-0 ml-0.5">
            <KorusaIcon size={32} />
          </div>
          <span className={`font-display font-black tracking-[0.18em] text-sun-text-main text-xl transition-all duration-300 ${isSidebarOpen ? 'opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100' : 'opacity-0 lg:group-hover/sidebar:opacity-100'}`}>
            KORUSA
          </span>
        </div>

        <div className="space-y-1.5 px-3">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center gap-4 px-3.5 py-4 rounded-2xl transition-all duration-300 group relative whitespace-nowrap ${isActive ? 'bg-sun-primary/10 text-sun-primary font-bold overflow-hidden' : 'text-sun-text-muted hover:bg-sun-text-main/5 hover:text-sun-text-main'}`}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-nav-glow"
                  className="absolute left-0 w-1.5 h-1/2 bg-sun-primary rounded-full shadow-[0_0_15px_rgba(255,184,0,0.8)]"
                />
              )}
              
              <div className={`shrink-0 flex items-center justify-center min-w-[24px] transition-transform duration-300 group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>
                <item.icon size={24} className={isActive ? 'fill-current' : ''} />
              </div>
              <span className={`text-[14px] tracking-tight font-bold transition-all duration-300 ${isSidebarOpen ? 'opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100' : 'opacity-0 lg:group-hover/sidebar:opacity-100'}`}>
                {item.label}
              </span>

              {/* Tooltip for collapsed state - ONLY when not hovering the whole sidebar */}
              {!isSidebarOpen && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-sun-surface-light text-sun-text-main border border-sun-border rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 lg:group-hover/sidebar:opacity-0 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto space-y-4 px-3 pb-8">
        {/* Profile Section */}
        <div 
          onClick={() => navigate('/profile/me')}
          className="flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-sun-text-main/5 transition-all cursor-pointer group/profile relative overflow-hidden whitespace-nowrap"
        >
          <div className="shrink-0 ring-2 ring-transparent group-hover/profile:ring-sun-primary/30 transition-all rounded-full p-0.5">
            <Avatar 
              src="https://i.pravatar.cc/150?u=me" 
              size="sm" 
            />
          </div>
          <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100' : 'opacity-0 lg:group-hover/sidebar:opacity-100'}`}>
            <span className="text-xs font-bold text-sun-text-main line-clamp-1">Alex Rivers</span>
            <span className="text-[10px] text-sun-text-muted font-medium opacity-60">Cognitive Architect</span>
          </div>

          {/* Tooltip for profile */}
          {!isSidebarOpen && (
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-sun-surface-light text-sun-text-main border border-sun-border rounded-lg text-[10px] font-bold opacity-0 group-hover/profile:opacity-100 lg:group-hover/sidebar:opacity-0 translate-x-[-10px] group-hover/profile:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap z-[100] shadow-xl">
              Profile
            </div>
          )}
        </div>

        <button 
          onClick={onSignOut}
          className="w-full flex items-center gap-4 px-3.5 py-4 text-sun-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all group relative whitespace-nowrap"
        >
          <div className="shrink-0 flex items-center justify-center min-w-[24px]">
            <LogOut size={24} className="group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <span className={`text-[14px] font-bold transition-all duration-300 ${isSidebarOpen ? 'opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100' : 'opacity-0 lg:group-hover/sidebar:opacity-100'}`}>
            Sign Out
          </span>

          {/* Tooltip for sign out */}
          {!isSidebarOpen && (
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-sun-surface-light text-sun-text-main border border-sun-border rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 lg:group-hover/sidebar:opacity-0 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap z-[100] shadow-xl">
              Sign Out
            </div>
          )}
        </button>
      </div>
    </aside>
    </>
  );
};
