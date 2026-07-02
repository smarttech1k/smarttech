import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Chrome, Apple, Sun } from 'lucide-react';
import { useUIStore } from '../../../store/uiStore';
import { KorusaLogo, KorusaIcon } from '../../shared/Logo';
import { apiRequest, type AuthTokens } from '../../../lib/api';
import { loadContentBlock } from '../../../lib/content';
import { PasswordInput } from '../../ui/PasswordInput';

// --- Reusable Components ---

const InputField = ({ label, type = "text", placeholder, icon: Icon, value, onChange }: { label: string; type?: string; placeholder: string; icon?: any; value?: string; onChange?: React.ChangeEventHandler<HTMLInputElement> }) => (
  <div className="w-full mb-5 space-y-2">
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-sun-text-muted px-1 block">
      {label}
    </label>
    <div className="relative group">
      <input 
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-sun-surface-light border-2 border-sun-border text-sun-text-main rounded-2xl py-4 px-6 focus:outline-none focus:ring-4 focus:ring-sun-primary/10 focus:border-sun-primary transition-all duration-300 placeholder:text-sun-text-muted/40 font-medium tracking-tight"
      />
    </div>
  </div>
);

const Button = ({ children, variant = 'primary', className = '', onClick, type = 'button' }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'outline'; className?: string; onClick?: () => void; type?: 'button' | 'submit' | 'reset' }) => {
  const baseStyles = "w-full py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg";
  const variants = {
    primary: "bg-sun-primary text-black hover:bg-sun-primary/90 shadow-sun-primary/20",
    secondary: "bg-sun-surface-light text-sun-text-main border-2 border-sun-border hover:border-sun-primary/50",
    outline: "bg-transparent border-2 border-sun-border text-sun-text-muted hover:text-sun-text-main hover:border-sun-text-main"
  };
  
  return (
    <button type={type} className={`${baseStyles} ${variants[variant]} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
};

const AuthCard = ({
  onLogin,
  onSignup,
  busy,
}: {
  onLogin: (email: string, password: string) => Promise<void> | void;
  onSignup: (fullName: string, email: string, password: string) => Promise<void> | void;
  busy: boolean;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  return (
    <div className="bg-sun-bg/40 backdrop-blur-3xl p-8 sm:p-10 rounded-[2.5rem] border-2 border-sun-border w-full max-w-[440px] shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-sun-primary/[0.03] to-transparent pointer-events-none"></div>
      
      <div className="relative z-10">
        {/* Instagram-style Centered Premium App Logo & Header */}
        <div className="flex flex-col items-center justify-center mb-8 text-center">
          <div className="mb-4 hover:scale-105 transition-all duration-300 flex items-center justify-center drop-shadow-[0_10px_25px_rgba(234,179,8,0.2)] animate-pulse-subtle">
            <KorusaIcon size={76} />
          </div>
          <h2 className="font-display font-black tracking-[0.2em] text-2xl uppercase text-sun-text-main leading-none">
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h2>
          <p className="text-sun-text-muted text-xs font-bold tracking-tight mt-2.5 max-w-[280px]">
            {isLogin ? "Log in to see what's happening." : "Create your account in seconds."}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isLogin) {
              onLogin(email, password);
            } else {
              onSignup(fullName, email, password);
            }
          }}
          className="space-y-2"
        >
          {!isLogin && (
            <InputField label="Full Name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          )}
          <InputField label="Email or Phone" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <PasswordInput label="Password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          
          <div className="pt-4">
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Working...' : (isLogin ? 'Log In' : 'Sign Up')}
            </Button>
          </div>
          
          {isLogin && (
            <div className="text-center py-2">
              <button 
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sun-text-muted text-[10px] font-black uppercase tracking-widest hover:text-sun-primary transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}
          
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-sun-border opacity-50"></div></div>
            <div className="relative flex justify-center text-[9px] uppercase tracking-[0.4em] font-black"><span className="bg-sun-bg/10 backdrop-blur-md px-4 text-sun-text-muted">Or continue with</span></div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button type="button" variant="outline" className="py-3">
              <Chrome size={16} /> Google
            </Button>
            <Button type="button" variant="outline" className="py-3">
              <Apple size={16} /> Apple
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-sun-border/50 text-center">
            <p className="text-xs text-sun-text-muted font-bold mb-4">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <Button 
              type="button"
              variant="secondary" 
              onClick={() => navigate(isLogin ? '/signup' : '/login')}
            >
              {isLogin ? 'Create New Account' : 'Log In Instead'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Footer = () => (
  <footer className="w-full bg-sun-bg border-t border-sun-border/30 py-12 px-6">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
      <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-sun-text-muted">
        <a href="#" className="hover:text-sun-primary transition-colors">About</a>
        <a href="#" className="hover:text-sun-primary transition-colors">Privacy</a>
        <a href="#" className="hover:text-sun-primary transition-colors">Community</a>
        <a href="#" className="hover:text-sun-primary transition-colors">Support</a>
      </div>
      <p className="text-sun-text-muted/50 text-[10px] font-black uppercase tracking-[0.1em]">© 2026 Korusa • All Rights Reserved</p>
    </div>
  </footer>
);

// --- Main View ---

export const LandingView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthSession, isDarkMode, toggleTheme } = useUIStore();
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [footerText, setFooterText] = useState('© 2026 Korusa • All Rights Reserved');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const content = await loadContentBlock<any>('landing', 'footer', null);
        if (mounted && content?.copy) setFooterText(content.copy);
      } catch {
        // Keep default footer text.
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setAuthError('');
    setAuthBusy(true);
    try {
      const result = await apiRequest<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!result.access_token || !result.user?.id) {
        throw new Error('Authentication response was incomplete');
      }

      setAuthSession(result.access_token, result.user);

      const state = location.state as { from?: { pathname: string } } | null;
      const from = state?.from?.pathname || '/home';
      navigate(from, { replace: true });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignup = async (fullName: string, email: string, password: string) => {
    setAuthError('');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setAuthError('Password must be at least 8 characters and include letters and numbers');
      return;
    }
    if (!email.trim()) {
      setAuthError('Email is required');
      return;
    }
    setAuthBusy(true);
    try {
      const safeUsername = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || `user_${Date.now()}`;
      const safeFullName = fullName.trim() || safeUsername.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const result = await apiRequest<AuthTokens>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          username: safeUsername,
          full_name: safeFullName,
          password,
        }),
      });

      if (!result.access_token || !result.user?.id) {
        throw new Error('Authentication response was incomplete');
      }

      setAuthSession(result.access_token, result.user);

      const state = location.state as { from?: { pathname: string } } | null;
      const from = state?.from?.pathname || '/home';
      navigate(from, { replace: true });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to create account');
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-sun-bg transition-colors duration-500 flex flex-col font-sans selection:bg-sun-primary/30">
      
      {/* Sticky Header */}
      <nav className="fixed top-0 inset-x-0 z-[100] h-20 backdrop-blur-xl border-b border-sun-border/20 px-6 lg:px-12 flex items-center justify-between">
        <div>
          <KorusaLogo size={24} textClassName="text-lg sm:text-xl" />
        </div>
        
        <div className="flex items-center gap-6">
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-sun-surface-light border border-sun-border text-sun-text-main hover:bg-sun-surface transition-all shadow-sm"
          >
            {isDarkMode ? <Sun size={18} /> : <Sun size={18} className="fill-current" />}
          </motion.button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-16 lg:gap-32 px-6 pt-32 pb-24 max-w-7xl mx-auto w-full relative z-10">
        
        {/* Left Side: Branding & Image */}
        <section className="flex-1 space-y-12 flex flex-col items-center md:items-start max-w-xl text-center md:text-left">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black text-sun-text-main tracking-tighter leading-[0.85]">
              Where opportunity <br />
              <span className="text-sun-primary italic drop-shadow-[0_0_20px_rgba(234,179,8,0.2)]">meets creativity.</span>
            </h1>
            <p className="text-lg md:text-xl text-sun-text-muted font-medium leading-relaxed tracking-tight max-w-md mx-auto md:mx-0">
              Join a vibrant community where you can connect with friends, learn new skills, and share your journey together.
            </p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full rounded-[2.5rem] overflow-hidden shadow-2xl relative group bg-sun-surface-light p-1 border-2 border-sun-border"
          >
            <img 
              src="https://images.unsplash.com/photo-1543269664-76bc3997d9ea?q=80&w=1600" 
              className="w-full h-auto object-cover aspect-[4/3] rounded-[2.2rem] grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700"
              alt="Network"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-sun-bg/80 via-transparent to-transparent opacity-60"></div>
          </motion.div>
        </section>

        {/* Right Side: Auth Card */}
        <section className="w-full md:w-auto flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <AuthCard onLogin={handleLogin} onSignup={handleSignup} busy={authBusy} />
          </motion.div>
        </section>
      </main>

      {authError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 shadow-xl">
          {authError}
        </div>
      )}

      <footer className="w-full bg-sun-bg border-t border-sun-border/30 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-sun-text-muted">
            <a href="#" className="hover:text-sun-primary transition-colors">About</a>
            <a href="#" className="hover:text-sun-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-sun-primary transition-colors">Community</a>
            <a href="#" className="hover:text-sun-primary transition-colors">Support</a>
          </div>
          <p className="text-sun-text-muted/50 text-[10px] font-black uppercase tracking-[0.1em]">{footerText}</p>
        </div>
      </footer>
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-sun-primary/5 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-1/4 -left-20 w-[600px] h-[600px] bg-sun-primary/5 blur-[150px] rounded-full"></div>
      </div>
    </div>
  );
};
