/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppLayout } from './components/layout/AppLayout';
import { supabase } from './lib/supabase';
import { AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthUI } from './components/features/auth/Auth';
import { LandingView } from './components/features/auth/LandingView';
import { ProtectedRoute } from './components/features/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/RouteGuard';
import { useUIStore } from './store/uiStore';
import { PlaceholderView } from './components/views/PlaceholderView';

import { ExploreView } from './components/features/content/Explore';
import { SparksView } from './components/features/content/Sparks';
import { LearnView } from './components/features/learning/Learn';
import { LearningExperience } from './components/features/learning/LearningExperience';
import { MessagesView } from './components/features/chat/Messages';
import { NotificationsView } from './components/features/notifications/Notifications';
import { ProfileView } from './components/features/profile/Profile';
import { SettingsView } from './components/features/settings/Settings';
import { CreateView } from './components/features/content/Create';
import { ChatAssistantView } from './components/features/chat/ChatAssistant';

import { HomeView } from './components/views/HomeView';
import { AnalyticsView } from './components/features/analytics/Analytics';

export default function App() {
  const {
    isAuthenticated,
    setAuthenticated,
    isDarkMode,
    showAuthModal,
    setShowAuthModal,
  } = useUIStore();

  const navigate = useNavigate();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Failed to get Supabase session:', error.message);
        if (isMounted) {
          setAuthenticated(false);
        }
        return;
      }

      if (isMounted) {
        setAuthenticated(!!data.session);
      }
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setAuthenticated]);

  const onAuthSuccess = () => {
    setAuthenticated(true);
    setShowAuthModal(false);
    navigate('/home');
  };

  const onSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Failed to sign out:', error.message);
    }

    setAuthenticated(false);
    setShowAuthModal(false);
    navigate('/');
  };

  return (
    <div className="relative">
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute isAuthenticated={isAuthenticated}>
              <LandingView />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute isAuthenticated={isAuthenticated}>
              <LandingView />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute isAuthenticated={isAuthenticated}>
              <LandingView />
            </PublicRoute>
          }
        />
        <Route path="/forgot-password" element={
  <PublicRoute isAuthenticated={isAuthenticated}>
    <LandingView />
  </PublicRoute>
} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout onSignOut={onSignOut} />
            </ProtectedRoute>
          }
        >
          <Route path="home" element={<HomeView />} />
          <Route
            path="explore"
            element={<ExploreView onBack={() => navigate('/home')} />}
          />
          <Route path="sparks" element={<SparksView />} />
          <Route
            path="learn"
            element={
              <LearnView
                onStartLearning={() => navigate('/learning')}
                onBack={() => navigate('/home')}
              />
            }
          />
          <Route
            path="learning"
            element={<LearningExperience onBack={() => navigate('/learn')} />}
          />
          <Route
            path="messages"
            element={<MessagesView onBack={() => navigate('/home')} />}
          />
          <Route
            path="notifications"
            element={
              <NotificationsView
                onBack={() => navigate('/home')}
                onExploreClick={() => navigate('/explore')}
              />
            }
          />
          <Route
            path="profile/:id"
            element={
              <ProfileView
                onBack={() => navigate('/home')}
                onSettingsClick={() => navigate('/settings')}
              />
            }
          />
          <Route
            path="settings"
            element={<SettingsView onBack={() => navigate('/profile/me')} />}
          />
          <Route
            path="create"
            element={<CreateView onBack={() => navigate('/home')} />}
          />
          <Route
            path="assistant"
            element={<ChatAssistantView onBack={() => navigate('/home')} />}
          />
          <Route
            path="analytics"
            element={<AnalyticsView onBack={() => navigate('/home')} />}
          />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>

      <AnimatePresence>
        {showAuthModal && (
          <AuthUI
            isModal={true}
            onSuccess={onAuthSuccess}
            onClose={() => setShowAuthModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}