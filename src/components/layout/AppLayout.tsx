import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Outlet, useLocation } from 'react-router-dom';
import { MobileBottomNav } from './MobileBottomNav';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import {
  getCurrentUserId,
  getUnreadNotificationCount,
  removeNotificationSubscription,
  subscribeToNotifications,
} from '../../lib/notifications';
import { useUIStore } from '../../store/uiStore';

interface AppLayoutProps {
  onSignOut?: () => void;
}

const FULL_SCREEN_PAGES = new Set(['assistant', 'messages', 'sparks']);
const WIDE_PAGES = new Set(['analytics', 'explore', 'home', 'learn']);

export const AppLayout: React.FC<AppLayoutProps> = ({ onSignOut }) => {
  const location = useLocation();
  const section = location.pathname.split('/')[1] || 'home';
  const isFullScreen = FULL_SCREEN_PAGES.has(section);
  const setUnreadNotifications = useUIStore((state) => state.setUnreadNotifications);

  // This layout is the only component mounted on every signed-in page, so it owns
  // the one notification subscription the whole app shares - the bell and the
  // sidebar item both badge off the count it writes to the store.
  React.useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof subscribeToNotifications> | null = null;

    // Re-reading the count on every event rather than adjusting it locally: it is a
    // single indexed count(*), and local arithmetic drifts the moment a block wipes
    // several rows at once.
    const refresh = () => {
      void getUnreadNotificationCount()
        .then((count) => { if (active) setUnreadNotifications(count); })
        .catch(() => { /* a badge is not worth surfacing an error for */ });
    };

    void getCurrentUserId()
      .then((userId) => {
        if (!active) return;
        refresh();
        channel = subscribeToNotifications(userId, refresh);
      })
      .catch(() => { /* signed out mid-mount; ProtectedRoute handles the redirect */ });

    return () => {
      active = false;
      void removeNotificationSubscription(channel);
    };
  }, [setUnreadNotifications]);

  const containerClass = isFullScreen
    ? 'h-full w-full'
    : WIDE_PAGES.has(section)
      ? 'page-container mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8'
      : 'page-container mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8';

  return (
    <div className="noise-overlay flex h-dvh min-h-0 flex-col overflow-hidden bg-sun-bg font-sans text-sun-text-main">
      {!isFullScreen && <Navbar />}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <Sidebar onSignOut={onSignOut} />

        <main
          id="main-content"
          className={`min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto lg:ml-20 ${
            // The mobile bar is 4rem tall plus whatever the device reserves below
            // it, so a flat pb-20 left the last few lines of every page sitting
            // under the nav on a phone with a home indicator.
            isFullScreen ? 'pb-0' : 'pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8'
          }`}
        >
          <div className={containerClass}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={isFullScreen ? 'h-full' : ''}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {!isFullScreen && <MobileBottomNav />}
    </div>
  );
};
