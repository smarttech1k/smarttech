import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Bell,
  Eye,
  Moon,
  ChevronRight,
  Shield,
  LogOut,
  Mail,
  Smartphone as PhoneIcon,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Avatar } from '../../ui/Avatar';
import { BackButton } from '../../ui/BackButton';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

type SettingsSection =
  | 'account'
  | 'privacy'
  | 'security'
  | 'notifications'
  | 'appearance';

type ProfileRecord = {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export const SettingsView = ({ onBack }: { onBack?: () => void }) => {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const sections = [
    { id: 'account', icon: User, label: 'Account' },
    { id: 'privacy', icon: Eye, label: 'Privacy' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'appearance', icon: Moon, label: 'Appearance' },
  ];

  const currentSection = activeSection || 'account';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error('You must be signed in.');

        setEmail(user.email || '');

        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, bio, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setProfile(data);
      } catch (error: any) {
        setErrorMessage(error?.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    // AppLayout's page container supplies the horizontal gutter and the bottom
    // clearance for the mobile nav; repeating them here squeezed the content
    // column by 32px on a phone.
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 md:pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          {onBack && !activeSection && <BackButton onClick={onBack} label="Back" sticky />}
          {activeSection && (
            <div className="lg:hidden">
              <BackButton onClick={() => setActiveSection(null)} label="Settings" sticky />
            </div>
          )}
        </div>
        <div className="space-y-1 md:space-y-2">
          <h1 className="text-2xl md:text-5xl font-display font-black tracking-tighter uppercase italic leading-none">
            Platform <span className="text-sun-primary">Control</span>
          </h1>
          <p className="text-sun-text-muted text-xs md:text-sm font-medium leading-relaxed max-w-md">
            Configure your personal experience and optimize your interaction profile.
          </p>
        </div>
      </header>

      {errorMessage && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        <aside className={`lg:col-span-4 space-y-2 ${activeSection ? 'hidden lg:block' : 'block'}`}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as SettingsSection)}
              className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all group border ${
                activeSection === section.id
                  ? 'bg-sun-primary/10 text-sun-primary border-sun-primary/30'
                  : 'bg-white/5 border-white/5 text-sun-text-muted hover:border-sun-primary/30 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`p-2 rounded-lg sm:rounded-xl transition-all ${
                    activeSection === section.id
                      ? 'bg-sun-primary text-black'
                      : 'bg-white/5 text-sun-text-muted group-hover:text-sun-primary'
                  }`}
                >
                  <section.icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
                  {section.label}
                </span>
              </div>
              <ChevronRight
                size={14}
                className={`transition-transform ${
                  activeSection === section.id ? 'rotate-90 text-sun-primary' : 'opacity-30'
                }`}
              />
            </button>
          ))}

          <div className="pt-6 sm:pt-10">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center sm:justify-start gap-4 p-4 rounded-xl sm:rounded-2xl bg-red-500/5 text-red-500/80 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all group"
            >
              <LogOut size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
                Terminate Session
              </span>
            </button>
          </div>
        </aside>

        <main className={`lg:col-span-8 ${!activeSection ? 'hidden lg:block' : 'block'}`}>
          <div className="glass-card rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-10 border-white/5 space-y-8 sm:space-y-12">
            {currentSection === 'account' && (
              <div className="space-y-8">
                {loading ? (
                  <div className="text-sm text-sun-text-muted">Loading profile...</div>
                ) : (
                  <>
                    {/* Everything about how you appear - photo, cover, name, handle, bio -
                        lives at /profile/edit. This page used to hold a second copy of
                        that form, so two screens wrote the same profiles columns and only
                        one of them validated anything. */}
                    <div className="flex flex-col items-center gap-5 border-b border-white/5 pb-8 sm:flex-row">
                      {/* No placeholder service: Avatar renders their initials. This used
                          to fall back to a stock photo of a stranger. */}
                      <Avatar
                        size="xl"
                        src={profile?.avatar_url || undefined}
                        name={profile?.full_name || profile?.username || undefined}
                        className="ring-4 ring-sun-primary/20"
                      />

                      <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
                        <h3 className="truncate text-lg font-bold">
                          {profile?.full_name || profile?.username || 'Korusa member'}
                        </h3>
                        <p className="truncate text-sm text-sun-text-muted">
                          @{profile?.username || 'member'}
                        </p>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        className="!rounded-xl px-6"
                        onClick={() => navigate('/profile/edit')}
                      >
                        Edit profile
                      </Button>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-sun-primary">
                        Contact
                      </h3>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
                        <div className="relative">
                          <Mail
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-sun-text-muted"
                            size={16}
                          />
                          <input
                            value={email}
                            disabled
                            aria-label="Email address"
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 pl-12 text-sm opacity-70"
                          />
                        </div>

                        <div className="relative">
                          <PhoneIcon
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-sun-text-muted"
                            size={16}
                          />
                          <input
                            value="Phone editing not wired yet"
                            disabled
                            aria-label="Phone number"
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 pl-12 text-sm opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentSection === 'privacy' && (
              <div className="space-y-8">
                <div className="space-y-4 md:space-y-5">
                  {[
                    { title: 'Private Profile', desc: 'Only your followers can see your posts and reels.' },
                    { title: 'Activity Status', desc: 'Allow others to see when you are active on the platform.' },
                    { title: 'Mentions', desc: 'Choose who can mention you in their threads or reels.' },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/[0.02] border border-white/10"
                    >
                      <div>
                        <h4 className="text-sm sm:text-base font-bold">{item.title}</h4>
                        <p className="text-[9px] sm:text-[10px] text-sun-text-muted font-medium uppercase tracking-wider">
                          {item.desc}
                        </p>
                      </div>
                      <div className="w-12 h-6 bg-sun-primary rounded-full relative ml-auto sm:ml-0">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentSection === 'security' && (
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="p-6 sm:p-8 rounded-[2rem] bg-white/[0.02] border border-white/10 space-y-6">
                    <h4 className="text-base font-bold">Two-Factor Authentication</h4>
                    <p className="text-[10px] text-sun-text-muted font-medium uppercase tracking-[0.1em] leading-relaxed">
                      Security settings UI is present; advanced security actions can be wired next.
                    </p>
                    <Button variant="secondary" className="w-full !rounded-xl py-3.5 text-[10px] font-black uppercase tracking-widest">
                      Initialize Secure Sync
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {currentSection === 'notifications' && (
              <div className="space-y-8">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-sun-primary">
                    Push Synchronization
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:gap-4">
                    {['Mentions', 'Course Updates', 'Direct Messages', 'New Students'].map((item) => (
                      <div
                        key={item}
                        className="flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5"
                      >
                        <span className="text-sm font-bold text-sun-text-muted">{item}</span>
                        <div className="w-11 h-5.5 bg-white/10 rounded-full relative">
                          <div className="absolute left-1 top-1 w-3.5 h-3.5 bg-white/40 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentSection === 'appearance' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                  <button
                    onClick={() => setIsDarkMode(false)}
                    className={`group p-8 rounded-[2.5rem] border-2 transition-all space-y-5 flex flex-col items-center text-center ${
                      !isDarkMode
                        ? 'bg-sun-primary/5 border-sun-primary'
                        : 'bg-white/[0.02] border-white/5 opacity-50'
                    }`}
                  >
                    <div className="w-20 h-20 bg-white rounded-3xl border border-gray-200 flex items-center justify-center text-gray-400 shadow-xl">
                      <div className="w-12 h-2 bg-gray-100 rounded-full" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${!isDarkMode ? 'text-sun-primary' : 'text-sun-text-muted'}`}>
                      Light Spectrum
                    </span>
                  </button>

                  <button
                    onClick={() => setIsDarkMode(true)}
                    className={`group p-8 rounded-[2.5rem] border-2 transition-all space-y-5 flex flex-col items-center text-center ${
                      isDarkMode
                        ? 'bg-sun-primary/5 border-sun-primary'
                        : 'bg-white/[0.02] border-white/5 opacity-50'
                    }`}
                  >
                    <div className="w-20 h-20 bg-black rounded-3xl border border-white/10 flex items-center justify-center text-white/40 shadow-xl">
                      <div className="w-12 h-2 bg-white/5 rounded-full" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-sun-primary' : 'text-sun-text-muted'}`}>
                      Dark Horizon
                    </span>
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="mt-6 sm:mt-10 p-6 sm:p-8 glass-card rounded-[2rem] sm:rounded-[3rem] border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-sun-text-muted border border-white/5">
                <HelpCircle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold">System Assistance Required?</h4>
                <p className="text-[9px] text-sun-text-muted font-black uppercase tracking-[0.2em]">
                  Our support matrix is always online
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="!rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest"
            >
              Support Center
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};