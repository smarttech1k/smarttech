import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { useUIStore } from '../../store/uiStore';

interface AppLayoutProps {
  onSignOut?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  onSignOut
}) => {
  const location = useLocation();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  
  const path = location.pathname.split('/')[1] || 'home';
  const isHome = path === 'home';
  const isSparks = path === 'sparks';
  const isAssistant = path === 'assistant';
  const isMessages = path === 'messages';

  return (
    <div className="h-screen bg-sun-bg text-sun-text-main flex flex-col font-sans overflow-hidden noise-overlay">
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-sun-primary z-[100] origin-left shadow-[0_0_15px_rgba(255,184,0,0.6)]"
        style={{ scaleX }}
      />
      {!isSparks && !isAssistant && !isMessages && (
        <Navbar />
      )}
      
      <div className="flex flex-1 relative max-w-[1920px] mx-auto w-full overflow-hidden">
        <Sidebar onSignOut={onSignOut} />
        
        <main className={`flex-1 w-full lg:ml-20 overflow-y-auto overflow-x-hidden scrollbar-hide border-x border-sun-border/30 transition-all duration-300 ${(isSparks || isAssistant || isMessages) ? 'pb-0' : 'pb-20 md:pb-12'}`}>
          <div className={`${(isSparks || isAssistant || isMessages) ? 'max-w-none p-0 h-full' : 'max-w-4xl mx-auto p-5 sm:p-8 lg:p-14'}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.02, y: -10 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={(isSparks || isAssistant || isMessages) ? 'h-full' : ''}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
};
