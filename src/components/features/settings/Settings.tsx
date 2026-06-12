import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Lock, 
  Bell, 
  Eye, 
  Moon, 
  ChevronRight, 
  Globe,
  Shield,
  Smartphone,
  LogOut,
  Mail,
  Smartphone as PhoneIcon,
  HelpCircle
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Avatar } from '../../ui/Avatar';
import { BackButton } from '../../ui/BackButton';

type SettingsSection = 'account' | 'privacy' | 'security' | 'notifications' | 'appearance';

export const SettingsView = ({ onBack }: { onBack?: () => void }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const sections = [
    { id: 'account', icon: User, label: 'Account' },
    { id: 'privacy', icon: Eye, label: 'Privacy' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'appearance', icon: Moon, label: 'Appearance' },
  ];

  const currentSection = activeSection || 'account';

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 pb-24 md:pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 sm:px-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        {/* Sidebar Navigation */}
        <aside className={`lg:col-span-4 space-y-2 ${activeSection ? 'hidden lg:block' : 'block animate-in slide-in-from-left-4'}`}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as SettingsSection)}
              className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all group border ${
                activeSection === section.id 
                ? 'bg-sun-primary/10 text-sun-primary border-sun-primary/30 shadow-[0_0_20px_rgba(255,184,0,0.1)]' 
                : 'bg-white/5 border-white/5 text-sun-text-muted hover:border-sun-primary/30 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`p-2 rounded-lg sm:rounded-xl transition-all ${activeSection === section.id ? 'bg-sun-primary text-black' : 'bg-white/5 text-sun-text-muted group-hover:text-sun-primary'}`}>
                  <section.icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">{section.label}</span>
              </div>
              <ChevronRight size={14} className={`transition-transform ${activeSection === section.id ? 'rotate-90 text-sun-primary' : 'opacity-30'}`} />
            </button>
          ))}

          <div className="pt-6 sm:pt-10">
            <button className="w-full flex items-center justify-center sm:justify-start gap-4 p-4 rounded-xl sm:rounded-2xl bg-red-500/5 text-red-500/80 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all group">
              <LogOut size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">Terminate Session</span>
            </button>
          </div>
        </aside>

        {/* Setting Content */}
        <main className={`lg:col-span-8 ${!activeSection ? 'hidden lg:block' : 'block animate-in slide-in-from-right-4'}`}>
          <div className="glass-card rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-10 border-white/5 space-y-8 sm:space-y-12">
            {currentSection === 'account' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-white/5">
                  <div className="relative group">
                    <Avatar size="xl" src="https://i.pravatar.cc/400?u=me" className="ring-4 ring-sun-primary/20" />
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <p className="text-[8px] font-black uppercase tracking-tighter text-white">Update</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-center sm:text-left">
                    <Button variant="secondary" size="sm" className="!rounded-xl px-6">Modify Identity</Button>
                    <p className="text-[9px] text-sun-text-muted font-bold uppercase tracking-widest block">Vector Data • Max 2MB File size</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 ml-1 mb-1">
                      <div className="w-1 h-1 bg-sun-primary rounded-full"></div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-sun-text-muted">Legal Registry Name</label>
                    </div>
                    <Input placeholder="Joshua Wise" defaultValue="Joshua Wise" className="!bg-white/[0.02] border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 ml-1 mb-1">
                      <div className="w-1 h-1 bg-sun-primary rounded-full"></div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-sun-text-muted">Broadcast Handle</label>
                    </div>
                    <Input placeholder="joshua_wise" defaultValue="joshua_wise" className="!bg-white/[0.02] border-white/10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 ml-1 mb-1">
                    <div className="w-1 h-1 bg-sun-primary rounded-full"></div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-sun-text-muted">Personal Bio-Insight</label>
                  </div>
                  <textarea 
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-sun-primary/30 transition-all min-h-[120px] resize-none font-medium placeholder:text-sun-text-muted/30"
                    defaultValue="Scaling expertise through modular content systems. Building the future of distributed learning. ☀️"
                  />
                </div>

                <div className="space-y-6 pt-6 border-t border-white/5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-sun-primary">Relational Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sun-text-muted group-focus-within:text-sun-primary transition-colors" size={16} />
                      <Input className="pl-12 !bg-white/[0.02] border-white/10" defaultValue="joshua@wise.com" />
                    </div>
                    <div className="relative group">
                      <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-sun-text-muted group-focus-within:text-sun-primary transition-colors" size={16} />
                      <Input className="pl-12 !bg-white/[0.02] border-white/10" defaultValue="+1 (555) 000-0000" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentSection === 'privacy' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="space-y-4 md:space-y-5">
                  {[
                    { title: 'Private Profile', desc: 'Only your followers can see your posts and reels.', icon: Lock },
                    { title: 'Activity Status', desc: 'Allow others to see when you are active on the platform.', icon: Globe },
                    { title: 'Mentions', desc: 'Choose who can mention you in their threads or reels.', icon: Shield },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/[0.02] border border-white/10 hover:border-sun-primary/20 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-sun-bg rounded-xl sm:rounded-2xl flex items-center justify-center text-sun-primary border border-white/5 shadow-inner">
                          <item.icon size={18} className="sm:w-[20px] sm:h-[20px]" />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-bold">{item.title}</h4>
                          <p className="text-[9px] sm:text-[10px] text-sun-text-muted font-medium uppercase tracking-wider max-w-[200px] sm:max-w-none">{item.desc}</p>
                        </div>
                      </div>
                      <div className="w-12 h-6 bg-sun-primary rounded-full relative cursor-pointer shadow-[0_0_15px_rgba(255,184,0,0.2)] ml-auto sm:ml-0">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentSection === 'security' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="space-y-6">
                  <div className="p-6 sm:p-8 rounded-[2rem] bg-white/[0.02] border border-white/10 space-y-6 group hover:border-sun-primary/20 transition-all">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                      <div className="w-14 h-14 bg-sun-primary/10 text-sun-primary rounded-2xl flex items-center justify-center shadow-[inset_0_0_20px_rgba(255,184,0,0.05)]">
                        <Lock size={28} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold">Two-Factor Authentication</h4>
                        <p className="text-[10px] text-sun-text-muted font-medium uppercase tracking-[0.1em] leading-relaxed max-w-xs">Add a biometric or digital layer of security to your profile node.</p>
                      </div>
                    </div>
                    <Button variant="secondary" className="w-full !rounded-xl py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-sun-primary hover:text-black transition-all">Initialize Secure Sync</Button>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-sun-primary ml-1">Access Protocol</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest ml-1 text-sun-text-muted">Current Access Key</label>
                        <Input type="password" placeholder="••••••••" className="!bg-white/[0.02] border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest ml-1 text-sun-text-muted">New Access Key</label>
                        <Input type="password" placeholder="••••••••" className="!bg-white/[0.02] border-white/10" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-sun-text-muted mb-6 px-1">Recognized Terminal Nodes</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'MacBook Pro 16"', location: 'London, UK', current: true },
                        { name: 'iPhone 15 Pro', location: 'London, UK', current: false },
                      ].map((device, i) => (
                        <div key={i} className="flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-all">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 bg-white/5 rounded-xl text-sun-text-muted">
                              <Smartphone size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold flex items-center gap-2">
                                {device.name} 
                                {device.current && (
                                  <span className="text-sun-primary text-[7px] font-black uppercase tracking-tighter bg-sun-primary/10 px-1.5 py-0.5 rounded-sm border border-sun-primary/20">LIVE</span>
                                )}
                              </p>
                              <p className="text-[9px] text-sun-text-muted uppercase tracking-wider">{device.location}</p>
                            </div>
                          </div>
                          {!device.current && <button className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors px-3 py-1 bg-red-500/5 rounded-lg border border-red-500/10">Purge</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentSection === 'notifications' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6 px-1">
                    <div className="w-1.5 h-1.5 bg-sun-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(255,184,0,0.8)]"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-sun-primary">Push Synchronization</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:gap-4">
                    {['Mentions', 'Course Updates', 'Direct Messages', 'New Students'].map((item) => (
                      <div key={item} className="flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] transition-all border border-white/5 hover:border-white/10 group cursor-pointer">
                        <span className="text-sm font-bold text-sun-text-muted group-hover:text-sun-text-main transition-colors">{item}</span>
                        <div className="w-11 h-5.5 bg-white/10 rounded-full relative transition-colors group-hover:bg-white/15">
                          <div className="absolute left-1 top-1 w-3.5 h-3.5 bg-white/40 rounded-full group-hover:bg-white/60 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentSection === 'appearance' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                  <button 
                    onClick={() => setIsDarkMode(false)}
                    className={`group p-8 rounded-[2.5rem] border-2 transition-all space-y-5 flex flex-col items-center text-center ${!isDarkMode ? 'bg-sun-primary/5 border-sun-primary shadow-xl shadow-sun-primary/10' : 'bg-white/[0.02] border-white/5 opacity-50 hover:opacity-80'}`}
                  >
                    <div className="w-20 h-20 bg-white rounded-3xl border border-gray-200 flex items-center justify-center text-gray-400 shadow-xl group-hover:scale-105 transition-transform">
                      <div className="w-12 h-2 bg-gray-100 rounded-full" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${!isDarkMode ? 'text-sun-primary' : 'text-sun-text-muted'}`}>Light Spectrum</span>
                  </button>
                  <button 
                    onClick={() => setIsDarkMode(true)}
                    className={`group p-8 rounded-[2.5rem] border-2 transition-all space-y-5 flex flex-col items-center text-center ${isDarkMode ? 'bg-sun-primary/5 border-sun-primary shadow-xl shadow-sun-primary/10' : 'bg-white/[0.02] border-white/5 opacity-50 hover:opacity-80'}`}
                  >
                   <div className="w-20 h-20 bg-black rounded-3xl border border-white/10 flex items-center justify-center text-white/40 shadow-xl group-hover:scale-105 transition-transform">
                      <div className="w-12 h-2 bg-white/5 rounded-full" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-sun-primary' : 'text-sun-text-muted'}`}>Dark Horizon</span>
                  </button>
                </div>
              </div>
            )}
            
            <div className="pt-8 sm:pt-10 flex flex-col sm:flex-row justify-end gap-4 border-t border-white/5">
              <Button variant="secondary" className="!rounded-xl px-10 py-4 order-2 sm:order-1 text-[10px] font-black uppercase tracking-widest">Wipe Changes</Button>
              <Button className="!rounded-xl px-12 py-4 order-1 sm:order-2 shadow-xl shadow-sun-primary/20 text-[10px] font-black uppercase tracking-widest">Commit Settings</Button>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-10 p-6 sm:p-8 glass-card rounded-[2rem] sm:rounded-[3rem] border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-sun-text-muted border border-white/5">
                <HelpCircle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold">System Assistance Required?</h4>
                <p className="text-[9px] text-sun-text-muted font-black uppercase tracking-[0.2em]">Our support matrix is always online</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="!rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-sun-primary hover:text-black transition-all">Support Center</Button>
          </div>
        </main>
      </div>
    </div>
  );
};
