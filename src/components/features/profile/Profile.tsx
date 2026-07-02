import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Settings, 
  Grid, 
  Bookmark, 
  MapPin, 
  Link as LinkIcon, 
  Calendar,
  Users,
  Award,
  MoreHorizontal,
  Share2,
  Lock,
  Play,
  Heart,
  MoreVertical
} from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { BlockUserModal, ReportModal } from '../../shared/Modals';
import { BackButton } from '../../ui/BackButton';
import { apiRequest } from '../../../lib/api';
import { useUIStore } from '../../../store/uiStore';

const DEFAULT_BIO = 'Scaling expertise through modular content systems. Building the future of distributed learning. ☀️';
const DEFAULT_FULL_NAME = 'Sunset User';

export const ProfileView = ({ onSettingsClick, onBack }: { onSettingsClick?: () => void, onBack?: () => void }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authToken, currentUser } = useUIStore();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab ] = useState<'posts' | 'saved'>('posts');
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [subView, setSubView] = useState<'main' | 'followers' | 'following' | 'edit'>('main');

  const handleBack = () => {
    if (subView !== 'main') {
      setSubView('main');
    } else if (onBack) {
      onBack();
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      if (!authToken) return;
      try {
        const profileId = id || 'me';
        const response = await apiRequest<any>(`/users/${profileId}`, {}, authToken);
        if (mounted) setProfile(response);
        const postResponse = await apiRequest<{ posts: any[] }>(`/posts/user/${profileId}?limit=12&page=1`, {}, authToken);
        if (mounted) setPosts(postResponse.posts || []);
      } catch {
        if (mounted) setProfile(null);
        if (mounted) setPosts([]);
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, [authToken, id]);

  return (
    <div className="space-y-12 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {(onBack || subView !== 'main') && (
        <div className="mb-4">
          <BackButton onClick={handleBack} label={subView === 'main' ? 'Back' : 'Profile'} sticky={true} />
        </div>
      )}
      
      <AnimatePresence mode="wait">
        {subView === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            {/* Modals Integration */}
            <BlockUserModal 
              isOpen={isBlockModalOpen} 
              onClose={() => setIsBlockModalOpen(false)} 
              userName={profile?.username || currentUser?.username || 'user'} 
            />
            <ReportModal 
              isOpen={isReportModalOpen} 
              onClose={() => setIsReportModalOpen(false)} 
              targetType="user" 
            />

            {/* Profile Header */}
            <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 text-center md:text-left">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-[2.5rem] p-1 bg-gradient-to-tr from-sun-primary to-transparent border border-white/10 shadow-2xl">
                  <Avatar size="full" src={profile?.avatar_url || currentUser?.avatar_url || `https://i.pravatar.cc/400?u=${profile?.username || currentUser?.username || 'user'}`} className="!rounded-[2.2rem]" />
                  </div>
                <div className="absolute -bottom-2 -right-2 bg-sun-primary text-black p-2 rounded-2xl shadow-xl shadow-sun-primary/20 border-4 border-sun-bg">
                  <Award size={18} className="fill-current" />
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 justify-center md:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">{profile?.username || currentUser?.username || (id && id !== 'me' ? id : DEFAULT_FULL_NAME)}</h1>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="!rounded-xl px-6"
                      onClick={() => setSubView('edit')}
                    >
                      Edit Profile
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="!rounded-xl w-10 p-0 bg-sun-text-main/5 hover:bg-sun-primary hover:text-black transition-all"
                      onClick={onSettingsClick}
                      title="Profile Settings"
                    >
                      <Settings size={18} />
                    </Button>
                    <div className="relative group">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="!rounded-xl w-10 p-0 bg-sun-text-main/5 hover:bg-sun-text-main/10 transition-all"
                        title="More Options"
                      >
                        <MoreVertical size={18} />
                      </Button>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-sun-bg border border-sun-border rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <button 
                          onClick={() => setIsReportModalOpen(true)}
                          className="w-full text-left px-4 py-3 text-sm font-bold text-sun-text-main hover:bg-white/5 transition-colors"
                        >
                          Report User
                        </button>
                        <button 
                          onClick={() => setIsBlockModalOpen(true)}
                          className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/5 transition-colors"
                        >
                          Block User
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-8 sm:gap-12">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-xl font-display font-bold">128</span>
                    <span className="text-[10px] text-sun-text-muted font-black uppercase tracking-widest">Expert Nodes</span>
                  </div>
                  <div 
                    onClick={() => setSubView('followers')}
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    <span className="text-xl font-display font-bold">12.4k</span>
                    <span className="text-[10px] text-sun-text-muted font-black uppercase tracking-widest">Mentees</span>
                  </div>
                  <div 
                    onClick={() => setSubView('following')}
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    <span className="text-xl font-display font-bold">842</span>
                    <span className="text-[10px] text-sun-text-muted font-black uppercase tracking-widest">Mentors</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold">{profile?.full_name || currentUser?.full_name || DEFAULT_FULL_NAME}</h2>
                    <p className="text-xs text-sun-text-muted uppercase tracking-widest font-black">Wisdom Architect</p>
                  </div>
                  <p className="text-sm text-sun-text-main leading-relaxed max-w-md font-medium">
                    {profile?.bio || currentUser?.bio || DEFAULT_BIO}
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sun-text-muted">
                      <MapPin size={14} className="text-sun-primary" />
                      Silicon Valley, CA
                    </div>
                    <a href={profile?.website || '#'} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sun-primary hover:underline">
                      <LinkIcon size={14} />
                      {profile?.website || 'Add website'}
                    </a>
                  </div>
                </div>
              </div>
            </header>

            {/* Tabs */}
            <div className="border-t border-sun-border pt-0 flex justify-center gap-8 sm:gap-16">
              {[
                { id: 'posts', icon: Grid, label: 'Wisdom Nodes' },
                { id: 'saved', icon: Bookmark, label: 'Saved Library' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 text-[10px] font-black uppercase tracking-[0.2em] relative transition-colors ${
                    activeTab === tab.id ? 'text-sun-text-main' : 'text-sun-text-muted hover:text-sun-text-main/70'
                  }`}
                >
                  <tab.icon size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div layoutId="profile-tab" className="absolute top-0 left-0 right-0 h-0.5 bg-sun-text-main rounded-b-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-1 sm:gap-8">
              <AnimatePresence mode="popLayout">
                {(activeTab === 'posts' ? posts : posts.slice(0, 3)).map((post, i) => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative aspect-square rounded-[1rem] sm:rounded-[2rem] overflow-hidden group cursor-pointer border border-white/5"
                  >
                    <img src={post.thumbnail || post.images?.[0] || post.video_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Node Thumbnail" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                      {post.type === 'video' ? (
                        <div className="flex items-center gap-2 text-white font-bold">
                          <Play size={20} className="fill-current" />
                          <span className="text-sm">{post.views_count ? `${Math.round(post.views_count / 1000)}k` : '0'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-white font-bold">
                          <Heart size={20} className="fill-current" />
                          <span className="text-sm">{post.likes_count ? `${Math.round(post.likes_count / 1000)}k` : '0'}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {(subView === 'followers' || subView === 'following') && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold">
                {subView === 'followers' ? 'Mentees' : 'Mentors'}
              </h2>
              <p className="text-sm text-sun-text-muted">Users connected to your profile.</p>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
              {([] as any[]).map((user) => (
                <motion.div 
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group flex items-center justify-between p-4 rounded-3xl bg-sun-surface-light border border-sun-border/30 hover:border-sun-primary/30 transition-all hover:bg-sun-surface duration-300"
                >
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${user.handle}`)}>
                    <div className="relative">
                      <Avatar size="md" src={user.avatar} className="ring-2 ring-sun-border group-hover:ring-sun-primary/50 transition-all" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-sun-primary rounded-full border-2 border-sun-bg shadow-[0_0_8px_rgba(255,184,0,0.4)]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-sun-text-main group-hover:text-sun-primary transition-colors">{user.name}</h4>
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] text-sun-text-muted font-black uppercase tracking-widest">{user.specialty}</p>
                        <span className="w-1 h-1 rounded-full bg-sun-text-muted/30" />
                        <p className="text-[9px] text-sun-text-muted font-bold lowercase opacity-60">@{user.handle}</p>
                      </div>
                    </div>
                  </div>
                  
                  {subView === 'following' ? (
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="!rounded-xl px-5 py-2 text-[10px] font-black uppercase tracking-widest bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all border-none"
                    >
                      Sever Node
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="primary" 
                      className="!rounded-xl px-5 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sun-primary/10"
                    >
                      Sync
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {subView === 'edit' && (
          <motion.div
            key="edit"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-10 rounded-[3rem] space-y-8"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative group cursor-pointer">
                      <Avatar size="xl" src={profile?.avatar_url || currentUser?.avatar_url || `https://i.pravatar.cc/400?u=${profile?.username || currentUser?.username || 'user'}`} />
                <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Settings size={24} className="text-white" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold">Edit Profile</h3>
                <p className="text-xs text-sun-text-muted uppercase font-black tracking-widest mt-1">Configure your identity</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-50">Username</label>
                <div className="p-4 bg-sun-bg rounded-2xl border border-sun-border font-medium text-sm">{profile?.username || currentUser?.username || 'username'}</div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-50">Bio</label>
                <textarea 
                  className="w-full bg-sun-bg border border-sun-border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-sun-primary/30 transition-all min-h-[100px] resize-none"
                  defaultValue={profile?.bio || currentUser?.bio || DEFAULT_BIO}
                />
              </div>
            </div>

            <Button className="w-full !rounded-[2rem]" size="lg" onClick={() => setSubView('main')}>Save Changes</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State for Saved (Optional reinforcement) */}
      {activeTab === 'saved' && (
        <div className="py-20 text-center space-y-6">
          <div className="w-20 h-20 bg-sun-surface border border-sun-border rounded-[2rem] flex items-center justify-center mx-auto text-sun-text-muted/20">
            <Lock size={40} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-widest">Private Collection</h3>
            <p className="text-[10px] text-sun-text-muted font-medium max-w-[200px] mx-auto">Only you can see your saved posts.</p>
          </div>
        </div>
      )}
    </div>
  );
};
