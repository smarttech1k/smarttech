import React from 'react';
import { useLocation } from 'react-router-dom';
import { AuthUI } from './Auth';

export const LandingView = () => {
  const location = useLocation();

  const defaultView =
    location.pathname === '/signup'
      ? 'signup'
      : location.pathname === '/forgot-password'
      ? 'forgot-password'
      : 'signup';

  return <AuthUI defaultView={defaultView} />;
};