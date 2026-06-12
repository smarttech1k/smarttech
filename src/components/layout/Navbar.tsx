import React from 'react';
import { Search, Bell, Sun, Moon, Sparkles, MessageSquare, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Avatar } from '../ui/Avatar';
import { useUIStore } from '../../store/uiStore';
import { KorusaLogo } from '../shared/Logo';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme, toggleSidebar } = useUIStore();
  
  const isHome = (location.pathname.split('/')[1] || 'home') === 'home';

  return (
    <nav className={`nav-blur h-16 flex items-center justify-between px-4 sm:px-6 lg:px-12 lg:pl-28 ${isHome ? 'xl:pr-20' : ''} backdrop-blur-xl shrink-0 border-b border-sun-border/30 transition-all duration-300`}>
      <div className="flex items-center gap-4 lg:hidden">
        {/* Mobile / Mini Sidebar Toggle */}
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleSidebar}
          className="p-2 text-sun-text-main lg:hidden hover:text-sun-primary hover:bg-sun-text-main/5 rounded-full transition-all"
        >
          <Menu size={20} />
        </motion.button>

        <div className="group cursor-pointer" onClick={() => navigate('/home')}>
          <KorusaLogo size={20} textClassName="text-lg lg:text-xl" />
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-4 sm:mx-8 relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sun-text-muted group-focus-within:text-sun-primary transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Search experts, lessons, courses..." 
          className="w-full bg-sun-surface-light border border-sun-border rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-sun-primary/10 focus:border-sun-primary transition-all font-medium placeholder:text-sun-text-muted/50"
        />
      </div>

      <div className="flex items-center gap-1 sm:gap-4 ml-auto">
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="p-3 text-sun-text-main rounded-2xl transition-all"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={22} className="text-sun-primary shadow-[0_0_15px_rgba(109,40,217,0.3)]" /> : <Moon size={22} />}
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/assistant')}
          className="hidden sm:flex p-3 text-sun-text-main rounded-2xl transition-colors"
          title="Wisdom AI"
        >
          <Sparkles size={22} />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/messages')}
          className="hidden sm:flex relative p-3 text-sun-text-main rounded-2xl transition-colors"
          title="Messages"
        >
          <MessageSquare size={22} />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/notifications')}
          className="relative p-3 text-sun-text-main rounded-2xl transition-colors"
          title="Notifications"
        >
          <Bell size={22} />
          <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sun-bg shadow-sm animate-pulse"></span>
        </motion.button>
        <div className="h-8 w-px bg-sun-border/50 mx-2 hidden lg:block"></div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/profile/me')}
          className="flex items-center gap-3 pr-2 transition-all group"
          title="Profile"
        >
          <Avatar size="md" src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop" />
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold leading-none group-hover:text-sun-primary transition-colors">James Wilson</p>
            <p className="text-[10px] text-sun-text-muted mt-1 font-medium">Expert Creator</p>
          </div>
        </motion.button>
      </div>
    </nav>
  );
};
