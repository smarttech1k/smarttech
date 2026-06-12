import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../../store/uiStore';
import { 
  Upload, 
  Scissors, 
  Type, 
  Image as ImageIcon, 
  Video as VideoIcon,
  ChevronRight, 
  X, 
  Play, 
  Pause,
  Clock,
  Globe,
  Settings,
  Sparkles,
  CheckCircle2,
  Smile,
  Hash,
  AtSign,
  MapPin,
  Lock,
  Eye,
  Trash2,
  MoreVertical,
  Plus,
  ArrowRight,
  Monitor,
  Smartphone,
  Calendar,
  Layers,
  Link as LinkIcon,
  Users,
  ShieldCheck,
  Zap,
  Save
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Input';
import { BackButton } from '../../ui/BackButton';
import { Avatar } from '../../ui/Avatar';

type PostType = 'text' | 'photo' | 'video';
type CreateStep = 'drafting' | 'review' | 'success';
type Audience = 'public' | 'followers' | 'private';

interface PostState {
  type: PostType;
  caption: string;
  files: (File | string)[];
  video: File | string | null;
  thumbnail: string | null;
  audience: Audience;
  location: string;
  tags: string[];
  mentions: string[];
  isScheduled: boolean;
  scheduleTime: string;
  isSponsored: boolean;
  courseLink: string;
}

export const CreateView = ({ onBack }: { onBack?: () => void }) => {
  const navigate = useNavigate();
  const { addRecentPost } = useUIStore();
  const [postType, setPostType] = useState<PostType>('photo');
  const [step, setStep] = useState<CreateStep>('drafting');
  const [post, setPost] = useState<PostState>({
    type: 'photo',
    caption: '',
    files: [],
    video: null,
    thumbnail: null,
    audience: 'public',
    location: '',
    tags: [],
    mentions: [],
    isScheduled: false,
    scheduleTime: '',
    isSponsored: false,
    courseLink: '',
  });

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewDesktop, setIsPreviewDesktop] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Sync post type when tab changes
  useEffect(() => {
    setPost(prev => ({ ...prev, type: postType }));
  }, [postType]);

  const hasContent = post.caption.length > 0 || post.files.length > 0 || post.video !== null;

  const handleBack = () => {
    if (hasContent && step !== 'success') {
      setShowExitConfirm(true);
    } else if (onBack) {
      onBack();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (uploadedFiles.length === 0) return;

    if (post.type === 'photo') {
      const newFiles = uploadedFiles.map(file => URL.createObjectURL(file as File));
      setPost(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
    } else if (post.type === 'video' && uploadedFiles.length > 0) {
      const videoUrl = URL.createObjectURL(uploadedFiles[0] as File);
      setPost(prev => ({ ...prev, video: videoUrl }));
    }
  };

  const removeFile = (index: number) => {
    setPost(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handlePublish = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      
      const newPost = {
        thumbnail: post.files[0] || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
        author: { name: 'joshua_wise', avatar: 'https://i.pravatar.cc/150?u=me', verified: true },
        description: post.caption,
        likes: '0',
        comments: '0',
        createdAt: new Date().toISOString()
      };
      
      addRecentPost(newPost);
      setStep('success');
    }, 2000);
  };

  const DiscardModal = () => (
    <AnimatePresence>
      {showExitConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowExitConfirm(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm glass-card p-8 rounded-[2.5rem] border-sun-border/30 text-center space-y-6"
          >
            <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
              <Trash2 size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Discard post?</h3>
              <p className="text-sm text-sun-text-muted">If you leave now, you'll lose all your progress on this post.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button 
                variant="secondary" 
                className="w-full !rounded-2xl !text-red-500 hover:!bg-red-500/10"
                onClick={() => {
                  setShowExitConfirm(false);
                  if (onBack) onBack();
                }}
              >
                Discard
              </Button>
              <Button 
                className="w-full !rounded-2xl"
                onClick={() => setShowExitConfirm(false)}
              >
                Keep Editing
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const PreviewPanel = () => (
    <div className="hidden lg:block lg:col-span-4 sticky top-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-sun-text-muted">Live Preview</h3>
          <div className="flex bg-sun-surface rounded-lg p-1 border border-sun-border">
            <button 
              onClick={() => setIsPreviewDesktop(true)}
              className={`p-1.5 rounded-md transition-all ${isPreviewDesktop ? 'bg-sun-primary text-black' : 'text-sun-text-muted hover:text-sun-text-main'}`}
            >
              <Monitor size={14} />
            </button>
            <button 
              onClick={() => setIsPreviewDesktop(false)}
              className={`p-1.5 rounded-md transition-all ${!isPreviewDesktop ? 'bg-sun-primary text-black' : 'text-sun-text-muted hover:text-sun-text-main'}`}
            >
              <Smartphone size={14} />
            </button>
          </div>
        </div>

        <div className={`mx-auto bg-sun-surface rounded-[2.5rem] border border-sun-border overflow-hidden transition-all duration-500 shadow-2xl ${isPreviewDesktop ? 'w-full aspect-video' : 'w-64 aspect-[9/16]'}`}>
          <div className="h-full flex flex-col">
            <div className="p-4 flex items-center gap-3 border-b border-sun-border/50">
              <Avatar size="sm" src="https://i.pravatar.cc/150?u=me" />
              <div>
                <p className="text-[10px] font-bold">@creative_learner</p>
                <div className="flex items-center gap-1">
                  <Globe size={8} className="text-sun-text-muted" />
                  <p className="text-[8px] text-sun-text-muted">Now • Public</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {post.type === 'photo' && post.files.length > 0 && (
                <div className="w-full aspect-square bg-black">
                  <img src={post.files[0] as string} className="w-full h-full object-cover" alt="Preview" />
                </div>
              )}
              {post.type === 'video' && post.video && (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <Play size={40} className="text-white opacity-40" />
                </div>
              )}
              <div className="p-4 space-y-2">
                <p className={`text-xs leading-relaxed ${post.caption ? 'text-sun-text-main' : 'text-sun-text-muted italic'}`}>
                  {post.caption || "Your post caption will appear here..."}
                </p>
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs text-sun-primary font-medium">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 py-6 md:py-10">
      <DiscardModal />
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 md:gap-8 border-b border-sun-border/5 pb-6 md:pb-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
             <BackButton onClick={handleBack} className="!p-0 hover:bg-sun-primary/10 rounded-full transition-all" />
             <div className="w-1 h-6 bg-sun-primary/30 rounded-full hidden sm:block"></div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
               <div className="w-1.5 h-1.5 rounded-full bg-sun-primary animate-pulse"></div>
               <p className="text-[9px] font-black uppercase tracking-[0.3em] text-sun-primary">Express Yourself</p>
            </div>
            <h1 className="text-2xl md:text-4xl font-display font-black tracking-tighter uppercase italic leading-none">
               Create <span className="text-sun-primary">Post</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-2 mr-2 px-3 py-1.5 bg-sun-surface-light rounded-full border border-sun-border/50">
            <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-sun-primary animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-sun-text-muted">
              {isSaving ? 'Saving...' : 'Draft Saved'}
            </span>
          </div>
          
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
            <Save size={16} className="text-sun-primary" />
            <span className="hidden md:inline">Save for Later</span>
            <span className="md:hidden">Later</span>
          </button>
          
          <button 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-2.5 bg-sun-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-sun-primary/10 disabled:opacity-50 disabled:active:scale-100" 
            onClick={handlePublish}
            disabled={!hasContent || isSaving}
          >
             {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Sharing...</span>
                </>
             ) : (
                <>
                  <Zap size={16} />
                  <span>Post Now</span>
                </>
             )}
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 'drafting' && (
          <motion.div 
            key="drafting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">
              {/* Post Type Switcher */}
              <div className="p-1.5 bg-sun-surface rounded-[2rem] border border-sun-border flex overflow-hidden">
                {(['text', 'photo', 'video'] as PostType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPostType(type)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] transition-all relative z-10 ${postType === type ? 'text-black' : 'text-sun-text-muted hover:text-sun-text-main'}`}
                  >
                    {postType === type && (
                      <motion.div 
                        layoutId="activePostType"
                        className="absolute inset-0 bg-sun-primary rounded-[1.5rem] -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {type === 'text' && <Type size={18} />}
                    {type === 'photo' && <ImageIcon size={18} />}
                    {type === 'video' && <VideoIcon size={18} />}
                    <span className="text-sm font-bold capitalize">{type}</span>
                  </button>
                ))}
              </div>

              {/* Media Upload / Canvas */}
              <div className="space-y-4">
                {(postType === 'photo' || postType === 'video') && (
                  <div 
                    className={`relative aspect-video md:aspect-[21/9] rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all overflow-hidden group
                      ${(postType === 'photo' && post.files.length > 0) || (postType === 'video' && post.video) 
                        ? 'border-sun-primary/30 bg-sun-surface/50' 
                        : 'border-sun-border hover:border-sun-primary/50 hover:bg-sun-primary/5'}
                    `}
                    onClick={() => postType === 'photo' ? fileInputRef.current?.click() : videoInputRef.current?.click()}
                  >
                    {postType === 'photo' && post.files.length > 0 ? (
                      <div className="w-full h-full p-6 overflow-x-auto scrollbar-hide flex gap-4 items-center">
                        {post.files.map((file, idx) => (
                          <div key={idx} className="relative h-full aspect-square rounded-2xl overflow-hidden border border-sun-border shrink-0 group/img">
                            <img src={file as string} className="w-full h-full object-cover" alt="Upload" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-red-500"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button className="h-full aspect-square rounded-2xl border-2 border-dashed border-sun-border flex flex-col items-center justify-center gap-2 hover:border-sun-primary/50 hover:bg-sun-primary/5 transition-all text-sun-text-muted hover:text-sun-primary shrink-0">
                          <Plus size={24} />
                          <span className="text-[10px] font-bold uppercase">Add More</span>
                        </button>
                      </div>
                    ) : postType === 'video' && post.video ? (
                      <div className="w-full h-full relative group/vid">
                        <video src={post.video as string} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity">
                          <div className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/20">
                            <Scissors size={24} />
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPost(p => ({ ...p, video: null })); }}
                          className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-xl hover:bg-red-500 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-sun-surface rounded-[2rem] flex items-center justify-center text-sun-primary border border-sun-border shadow-xl transform group-hover:scale-110 transition-transform">
                          <Upload size={28} />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">Add {postType === 'photo' ? 'photos' : 'videos'}</p>
                          <p className="text-xs text-sun-text-muted">or just drag and drop them here</p>
                        </div>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                  </div>
                )}

                {/* Caption / Text Editor */}
                <div className="glass-card rounded-[2.5rem] p-6 md:p-8 space-y-6 border-sun-border/30">
                  <div className="flex items-center gap-4 mb-2">
                    <Avatar size="md" src="https://i.pravatar.cc/150?u=me" className="ring-2 ring-sun-primary/20" />
                    <div>
                      <h4 className="text-sm font-bold">@creative_learner</h4>
                      <p className="text-[10px] text-sun-text-muted font-black uppercase tracking-widest">Sharing my vibe</p>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea 
                      value={post.caption}
                      onChange={(e) => setPost(p => ({ ...p, caption: e.target.value }))}
                      placeholder={postType === 'text' ? "What's on your mind today? Write something beautiful..." : "Say something about this..."}
                      className={`w-full bg-transparent border-none focus:ring-0 resize-none transition-all duration-300 placeholder:text-sun-text-muted/40 font-medium
                        ${postType === 'text' ? 'min-h-[250px] text-xl md:text-2xl leading-relaxed' : 'min-h-[120px] text-sm md:text-base'}
                      `}
                    />
                    
                    {/* Floating Tools */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-sun-border/30">
                      <button className="p-2 text-sun-text-muted hover:text-sun-primary hover:bg-sun-primary/10 rounded-xl transition-all" title="Add Emoji">
                        <Smile size={18} />
                      </button>
                      <button className="p-2 text-sun-text-muted hover:text-sun-primary hover:bg-sun-primary/10 rounded-xl transition-all" title="Add Hashtag">
                        <Hash size={18} />
                      </button>
                      <button className="p-2 text-sun-text-muted hover:text-sun-primary hover:bg-sun-primary/10 rounded-xl transition-all" title="Mention User">
                        <AtSign size={18} />
                      </button>
                      <button className="p-2 text-sun-text-muted hover:text-sun-primary hover:bg-sun-primary/10 rounded-xl transition-all" title="Add Location">
                        <MapPin size={18} />
                      </button>
                      <div className="ml-auto flex items-center gap-4">
                        <span className={`text-[10px] font-black tracking-widest ${post.caption.length > 2000 ? 'text-red-500' : 'text-sun-text-muted'}`}>
                          {post.caption.length} / 2200
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhancement Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-sun-surface rounded-[2rem] border border-sun-border space-y-4 group hover:border-sun-primary/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sun-primary/10 rounded-xl text-sun-primary">
                        <LinkIcon size={18} />
                      </div>
                      <h4 className="text-sm font-bold">Add a Link</h4>
                    </div>
                    <Badge variant="secondary">Optional</Badge>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Paste a link to share..." 
                    className="w-full bg-sun-bg border border-sun-border rounded-xl p-3 text-xs focus:ring-1 focus:ring-sun-primary outline-none transition-all"
                  />
                  <p className="text-[10px] text-sun-text-muted leading-relaxed">Share website, music, video or blog post link with friends.</p>
                </div>                <div className="p-6 bg-sun-surface rounded-[2rem] border border-sun-border space-y-4 group hover:border-sun-primary/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sun-secondary/10 rounded-xl text-sun-secondary">
                        <Users size={18} />
                      </div>
                      <h4 className="text-sm font-bold">Tag Friends</h4>
                    </div>
                    <button className="p-1 px-2.5 bg-sun-secondary/10 text-sun-secondary rounded-lg text-[10px] font-bold hover:bg-sun-secondary/20 line-none">Tag</button>
                  </div>
                  <div className="flex -space-x-2">
                    {[1,2].map(i => (
                      <div key={i}>
                        <Avatar size="sm" src={`https://i.pravatar.cc/150?u=${i+10}`} className="ring-2 ring-sun-surface" />
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-sun-border flex items-center justify-center text-[10px] font-bold text-sun-text-muted">
                      +0
                    </div>
                  </div>
                  <p className="text-[10px] text-sun-text-muted leading-relaxed">This post will show up on their profiles too!</p>
                </div>
              </div>
            </div>

            {/* Side Sidebar - Desktop Metadata & Settings */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-card rounded-[2.5rem] p-8 border-sun-border/30 space-y-8">
                {/* Audience Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-sun-text-muted">Who should see this?</h4>
                  <div className="space-y-2">
                    {(['public', 'followers', 'private'] as Audience[]).map((abs) => (
                      <button
                        key={abs}
                        onClick={() => setPost(p => ({ ...p, audience: abs }))}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${post.audience === abs ? 'bg-sun-primary/10 border-sun-primary text-sun-primary' : 'bg-sun-bg/50 border-sun-border/50 text-sun-text-muted hover:border-sun-primary/30'}`}
                      >
                        <div className="flex items-center gap-3 font-bold text-sm">
                          {abs === 'public' && <Globe size={16} />}
                          {abs === 'followers' && <Users size={16} />}
                          {abs === 'private' && <Lock size={16} />}
                          <span className="capitalize">{abs === 'public' ? 'Everyone' : abs === 'followers' ? 'Followers' : 'Just Me'}</span>
                        </div>
                        {post.audience === abs && <CheckCircle2 size={16} />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scheduling Section */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-sun-text-muted">Post later?</h4>
                    <button 
                      onClick={() => setPost(p => ({ ...p, isScheduled: !p.isScheduled }))}
                      className={`w-10 h-5 rounded-full relative transition-all duration-300 ${post.isScheduled ? 'bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-sun-border'}`}
                    >
                      <motion.div 
                        animate={{ x: post.isScheduled ? 22 : 2 }}
                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                  {post.isScheduled && (
                    <div className="p-4 bg-sun-bg border border-sun-border rounded-xl flex items-center gap-3">
                      <Calendar size={16} className="text-sun-primary" />
                      <input type="datetime-local" className="bg-transparent text-xs font-bold text-sun-text-main outline-none w-full" />
                    </div>
                  )}
                </div>

                {/* Sponsored Toggle */}
                <div className="p-4 bg-sun-surface rounded-2xl border border-sun-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-blue-500" />
                    <div>
                      <h5 className="text-[11px] font-bold">Paid Partnership</h5>
                      <p className="text-[8px] text-sun-text-muted uppercase font-black">SPONSOR TAG</p>
                    </div>
                  </div>
                   <button 
                    onClick={() => setPost(p => ({ ...p, isSponsored: !p.isSponsored }))}
                    className={`w-10 h-5 rounded-full relative transition-all duration-300 ${post.isSponsored ? 'bg-blue-500' : 'bg-sun-border'}`}
                  >
                    <motion.div 
                      animate={{ x: post.isSponsored ? 22 : 2 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                {/* Desktop Actions */}
                <div className="flex flex-col gap-3 pt-6 border-t border-sun-border/30">
                  <Button variant="outline" className="w-full !rounded-2xl flex items-center justify-center gap-2">
                    <Save size={16} />
                    Save for Later
                  </Button>
                  <Button className="w-full !rounded-2xl h-14 text-base shadow-xl shadow-sun-primary/20 flex items-center justify-center gap-2" onClick={handlePublish}>
                    <Zap size={20} />
                    Post Now
                  </Button>
                </div>
              </div>
              
              <PreviewPanel />
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto py-20 text-center"
          >
            <div className="relative inline-block mb-8">
              <div className="w-28 h-28 bg-green-500/10 text-green-500 rounded-[3rem] border border-green-500/20 flex items-center justify-center shadow-2xl shadow-green-500/10 relative z-10">
                <CheckCircle2 size={56} className="animate-in zoom-in duration-500" />
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0, 0.5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-green-500/20 rounded-[3rem] -z-0"
              />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-display font-bold">Post Shared!</h2>
              <p className="text-sun-text-muted text-lg max-w-sm mx-auto">Your post is now live on your profile and visible to your followers.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-12">
              <Button onClick={() => navigate('/home')} className="!rounded-2xl h-14 text-sm font-bold shadow-xl shadow-sun-primary/10">
                Go to Feed
              </Button>
              <Button variant="secondary" onClick={() => { setStep('drafting'); setPost({ ...post, caption: '', files: [], video: null }); }} className="!rounded-2xl h-14 text-sm font-bold">
                Share Something Else
              </Button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sun-text-muted">
              <div className="text-center">
                <p className="text-xl font-bold text-sun-text-main">342</p>
                <p className="text-[10px] uppercase font-black tracking-widest">People Reached</p>
              </div>
              <div className="w-px h-6 bg-sun-border" />
              <div className="text-center">
                <p className="text-xl font-bold text-sun-text-main">18</p>
                <p className="text-[10px] uppercase font-black tracking-widest">Friends Notified</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Removed sticky mobile bottom bar to save space as requested */}
    </div>
  );
};

