import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Chrome, Apple, Sun } from 'lucide-react';
import { useUIStore } from '../../../store/uiStore';
import { KorusaLogo } from '../../shared/Logo';

// --- Reusable Components ---

const InputField = ({ label, type = "text", placeholder, icon: Icon }: { label: string; type?: string; placeholder: string; icon?: any }) => (
  <div className="w-full mb-5 space-y-2">
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-sun-text-muted px-1 block">
      {label}
    </label>
    <div className="relative group">
      <input 
        type={type}
        placeholder={placeholder}
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

const AuthCard = ({ onLogin }: { onLogin: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  return (
    <div className="bg-sun-bg/40 backdrop-blur-3xl p-8 sm:p-10 rounded-[2.5rem] border-2 border-sun-border w-full max-w-[440px] shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-sun-primary/[0.03] to-transparent pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-2xl font-display font-black tracking-tighter uppercase text-sun-text-main">
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h2>
          <p className="text-sun-text-muted text-xs font-bold tracking-tight mt-1 truncate">
            {isLogin ? "Log in to see what's happening." : "Create your account in seconds."}
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="space-y-2">
          {!isLogin && (
            <InputField label="Full Name" placeholder="John Doe" />
          )}
          <InputField label="Email or Phone" placeholder="user@example.com" />
          <InputField label="Password" type="password" placeholder="••••••••••••" />
          
          <div className="pt-4">
            <Button type="submit" variant="primary">{isLogin ? 'Log In' : 'Sign Up'}</Button>
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
            <Button variant="outline" className="py-3">
              <Chrome size={16} /> Google
            </Button>
            <Button variant="outline" className="py-3">
              <Apple size={16} /> Apple
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-sun-border/50 text-center">
            <p className="text-xs text-sun-text-muted font-bold mb-4">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <Button 
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
  const { setAuthenticated, isDarkMode, toggleTheme } = useUIStore();

  const handleLogin = () => {
    setAuthenticated(true);
    // Redirect to the page they were trying to visit, or home
    const state = location.state as { from?: { pathname: string } } | null;
    const from = state?.from?.pathname || '/home';
    navigate(from, { replace: true });
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-sun-primary/10 border border-sun-primary/30 text-sun-primary text-[10px] font-black uppercase tracking-[0.2em]"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-sun-primary animate-pulse" />
              Connect with your world
            </motion.div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black text-sun-text-main tracking-tighter leading-[0.85]">
              Connect. Share.<br />
              <span className="text-sun-primary italic drop-shadow-[0_0_20px_rgba(234,179,8,0.2)]">Grow.</span>
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
            <AuthCard onLogin={handleLogin} />
          </motion.div>
        </section>
      </main>

      <Footer />
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-sun-primary/5 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-1/4 -left-20 w-[600px] h-[600px] bg-sun-primary/5 blur-[150px] rounded-full"></div>
      </div>
    </div>
  );
};
