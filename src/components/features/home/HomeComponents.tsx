import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  MessageSquare, 
  Users, 
  Lightbulb, 
  Rocket, 
  ArrowRight,
  TrendingUp,
  Share2,
  CheckCircle,
  Zap,
  BookOpen,
  Compass,
  Award,
  Terminal,
  Briefcase,
  Flame,
  Shield,
  Clock,
  ThumbsUp
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Input';
import { Avatar } from '../../ui/Avatar';

// 1. WELCOME SECTION (CONNECT, LEARN, BUILD)
export const HeroSection = ({ onExplore, onLearn }: { onExplore: () => void; onLearn: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-br from-sun-primary via-sun-secondary to-[#4C1D95] p-8 sm:p-12 rounded-3xl text-white shadow-xl shadow-sun-primary/15 border border-sun-primary/10"
    >
      <div className="relative z-10 space-y-6 max-w-2xl">
        <Badge className="bg-white/20 text-white backdrop-blur-md border-transparent hover:bg-white/35 py-1.5 px-3 rounded-lg text-xs leading-none font-bold">
          ✨ Welcome to Korusa Design System v2.0
        </Badge>
        
        <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight leading-none text-white uppercase sm:normal-case">
          Connect. <span className="font-sans font-normal italic text-sun-accent">Learn</span>.<br /> 
          Build <span className="underline decoration-sun-accent/40 decoration-4 underline-offset-4">Together</span>.
        </h1>
        
        <p className="text-white/80 text-sm sm:text-base leading-relaxed font-normal max-w-xl">
          Korusa is the premium ecosystem where professional content creators share knowledge, learners master futuristic skills, and teams match on real-world projects. No noise, just progression.
        </p>

        <div className="flex flex-wrap gap-4 pt-2">
          <Button 
            onClick={onExplore}
            className="bg-white text-sun-primary hover:bg-white/90 px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
          >
            <Compass size={16} className="mr-2" />
            Explore Feed
          </Button>
          <button 
            onClick={onLearn}
            className="px-6 py-3 bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-xl border border-white/20 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white"
          >
            <BookOpen size={16} />
            Skill Paths
          </button>
        </div>
      </div>
      
      {/* Elegantly placed geometric abstract brand mark in the background */}
      <div className="absolute -right-12 -bottom-12 opacity-15">
        <svg width="280" height="280" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M42 25C37 36 34 48 34 60C34 69 36 75 42 77C31 75 28 65 28 55C28 38 34 29 42 25Z" fill="white" />
          <path d="M41 44C52 43 65 36 76 27C63 29 51 36 40 44Z" fill="white" />
          <path d="M37 51C48 50 62 56 76 75C64 68 53 59 39 52Z" fill="white" />
        </svg>
      </div>
    </motion.div>
  );
};

// 2. PROMPT BAR (THE QUICK POST & IDEATION BOX)
export const PromptBar = ({ onFocus }: { onFocus?: () => void }) => {
  return (
    <div className="relative w-full">
      <div className="bg-sun-surface border border-sun-border p-4 sm:p-5 rounded-3xl shadow-sm hover:shadow-premium transition-all duration-300">
        <div className="flex items-center gap-4">
          <Avatar src="https://i.pravatar.cc/150?u=me" size="sm" className="ring-2 ring-sun-primary/20" />
          <div 
            onClick={onFocus}
            className="flex-1 bg-sun-bg border border-sun-border/40 px-5 py-3 rounded-2xl text-sun-text-muted text-sm cursor-text hover:border-sun-accent/40 transition-colors flex items-center justify-between group"
          >
            <span className="group-hover:text-sun-text-main transition-colors">What are you working on or learning today?</span>
            <div className="flex gap-2 text-sun-primary">
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. QUICK ACTION CARDS
export const QuickActionCards = ({ 
  onSparkClick, 
  onCourseClick, 
  onProjectClick 
}: { 
  onSparkClick: () => void, 
  onCourseClick: () => void, 
  onProjectClick: () => void 
}) => {
  const actions = [
    {
      title: "Watch Sparks",
      desc: "Instant tech inspiration & skill tips",
      icon: <Flame size={20} />,
      color: "bg-sun-primary text-white",
      hoverColor: "hover:border-sun-primary",
      onClick: onSparkClick
    },
    {
      title: "Explore Courses",
      desc: "Structured paths by leading mentors",
      icon: <Award size={20} />,
      color: "bg-emerald-600 text-white",
      hoverColor: "hover:border-emerald-500",
      onClick: onCourseClick
    },
    {
      title: "Co-Build Projects",
      desc: "Match with elite developers worldwide",
      icon: <Terminal size={20} />,
      color: "bg-indigo-600 text-white",
      hoverColor: "hover:border-indigo-500",
      onClick: onProjectClick
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {actions.map((act, idx) => (
        <div 
          key={idx}
          onClick={act.onClick}
          className={`bg-sun-surface border border-sun-border p-6 rounded-2xl cursor-pointer hover:shadow-premium ${act.hoverColor} transition-all group flex flex-col justify-between space-y-4`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-xl ${act.color} ring-4 ring-black/5`}>
              {act.icon}
            </div>
            <ArrowRight size={16} className="text-sun-text-muted group-hover:text-sun-primary group-hover:translate-x-1.0 transition-all" />
          </div>
          <div>
            <h4 className="font-bold text-sun-text-main text-base group-hover:text-sun-primary transition-colors">{act.title}</h4>
            <p className="text-xs text-sun-text-muted mt-1 leading-relaxed">{act.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// 4. LEARNING RECOMMENDATIONS
export const LearningRecommendations = ({ onCourseClick }: { onCourseClick: (id?: string) => void }) => {
  const courses = [
    {
      id: "c1",
      category: "System Architecture",
      title: "SaaS Scale Strategies: Designing Microservices for 1M+ Active Users",
      mentor: "Sarah Chen",
      role: "Senior Architect",
      rating: "4.9",
      students: "2.4k",
      color: "border-sun-primary/10",
      accent: "text-sun-primary"
    },
    {
      id: "c2",
      category: "Machine Learning",
      title: "Modern AI Pipelines & Transformers: Grounding LLMs in production",
      mentor: "Dr. Leon Vance",
      role: "AI Lead",
      rating: "4.8",
      students: "1.8k",
      color: "border-emerald-500/10",
      accent: "text-emerald-500"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-sun-text-main">Top Learning Paths</h3>
          <p className="text-xs text-sun-text-muted mt-0.5">Top-rated curricula recommended for your profile</p>
        </div>
        <button 
          onClick={() => onCourseClick()}
          className="text-xs font-bold text-sun-primary uppercase hover:underline flex items-center gap-1"
        >
          View All Recommendations
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {courses.map((course) => (
          <div 
            key={course.id}
            onClick={() => onCourseClick(course.id)}
            className={`bg-sun-surface border ${course.color} p-6 rounded-2xl hover:shadow-premium transition-all duration-300 cursor-pointer group hover:border-sun-primary/40`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-sun-bg ${course.accent}`}>
                {course.category}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                ⭐ {course.rating}
              </div>
            </div>
            
            <h4 className="text-base font-bold text-sun-text-main group-hover:text-sun-primary transition-colors line-clamp-2 leading-relaxed mb-4">
              {course.title}
            </h4>

            <div className="flex items-center justify-between pt-4 border-t border-sun-border/40">
              <div className="flex items-center gap-2">
                <Avatar src={`https://i.pravatar.cc/150?u=${course.mentor}`} size="sm" />
                <div>
                  <p className="text-[11px] font-bold text-sun-text-main">{course.mentor}</p>
                  <p className="text-[10px] text-sun-text-muted">{course.role}</p>
                </div>
              </div>
              <span className="text-[10px] text-sun-text-muted font-semibold">{course.students} enrolled</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 5. COMMUNITY ACTIVITY (THE REFACTORED LINKEDIN FEED STYLE)
export type PostType = 'Recommendation' | 'Idea' | 'SystemUpdate';

export interface PostProps {
  id: string;
  type: PostType;
  author: {
    name: string;
    handle: string;
    avatar: string;
    isExpert?: boolean;
    role: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  time: string;
}

export const CommunityPost: React.FC<PostProps> = ({ id, type, author, content, image, likes, comments, time }) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(likes);

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikesCount(prev => prev - 1);
    } else {
      setLiked(true);
      setLikesCount(prev => prev + 1);
    }
  };

  const typeLabels = {
    'Recommendation': { text: 'Suggested Resource', style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10' },
    'Idea': { text: 'Startup Idea', style: 'bg-sun-primary/10 text-sun-primary border-sun-primary/10' },
    'SystemUpdate': { text: 'Vibe Check / Update', style: 'bg-indigo-600/10 text-indigo-600 border-indigo-600/10' }
  };

  const label = typeLabels[type] || { text: 'Community', style: 'bg-slate-500/10 text-slate-600' };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      className="bg-sun-surface border border-sun-border p-6 rounded-2xl hover:shadow-premium transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar src={author.avatar} size="sm" className="ring-2 ring-sun-primary/10" />
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-sun-text-main leading-tight">{author.name}</h4>
              {author.isExpert && <CheckCircle size={13} className="text-sun-primary" fill="currentColor" />}
            </div>
            <p className="text-[11px] text-sun-text-muted leading-tight mt-0.5">{author.role} • {time}</p>
          </div>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${label.style}`}>
          {label.text}
        </span>
      </div>

      <div className="space-y-4">
        <p className="text-sm sm:text-base leading-relaxed text-sun-text-main font-normal break-words">
          {content}
        </p>

        {image && (
          <div className="rounded-xl overflow-hidden border border-sun-border/40 aspect-video relative">
            <img src={image} className="w-full h-full object-cover" alt="Community Activity" referrerPolicy="no-referrer" />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-sun-border/30 text-xs">
          <div className="flex gap-4">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-1.5 font-bold transition-all ${liked ? 'text-sun-primary' : 'text-sun-text-muted hover:text-sun-primary'}`}
            >
              <ThumbsUp size={14} />
              <span>{likesCount} Likes</span>
            </button>
            <button className="flex items-center gap-1.5 font-bold text-sun-text-muted hover:text-sun-primary transition-all">
              <MessageSquare size={14} />
              <span>{comments} Comments</span>
            </button>
          </div>

          <button className="text-sun-text-muted hover:text-sun-primary transition-colors p-1" title="Share Insight">
            <Share2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// 6. CREATOR SPOTLIGHT
export const CreatorSpotlight = () => {
  const creators = [
    {
      name: "Pranav Raj",
      role: "Compiler Engineer",
      avatar: "https://i.pravatar.cc/150?u=pranav",
      rating: "5.0",
      skills: ["Rust", "Compilers", "WebAssembly"]
    },
    {
      name: "Tanya Sinclair",
      role: "UX Strategy Lead",
      avatar: "https://i.pravatar.cc/150?u=tanya",
      rating: "4.9",
      skills: ["Design Systems", "Framer", "HCl"]
    }
  ];

  return (
    <section className="bg-sun-surface border border-sun-border p-6 rounded-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sun-text-main text-sm uppercase tracking-wider">Creator Spotlight</h3>
        <Badge className="bg-sun-primary/10 text-sun-primary border-sun-primary/10 rounded-full text-[10px] font-black uppercase tracking-widest text-[9px] px-2 py-0.5">Top Voted</Badge>
      </div>

      <div className="space-y-4">
        {creators.map((c, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-sun-bg transition-colors cursor-pointer group">
            <Avatar src={c.avatar} size="sm" className="ring-2 ring-sun-primary/20" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-sun-text-main truncate group-hover:text-sun-primary transition-colors flex items-center gap-1">
                {c.name}
                <span className="text-[10px] text-amber-500 font-normal">⭐ {c.rating}</span>
              </h4>
              <p className="text-[10px] text-sun-text-muted truncate mt-0.5">{c.role}</p>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {c.skills.slice(0, 2).map(skill => (
                  <span key={skill} className="text-[8px] font-medium px-1.5 py-0.5 bg-sun-bg border border-sun-border/30 rounded text-sun-text-muted">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <button className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 bg-sun-primary text-white hover:bg-sun-primary/90 rounded-md transition-colors shrink-0">
              Connect
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

// 7. TRENDING DISCUSSIONS (FOR SIDEBAR)
export const TrendingDiscussions = () => {
  const topics = [
    { title: "#TypeScript5", counts: "1.4k posts", trend: "+24% today" },
    { title: "#NeuralInterfaces", counts: "892 posts", trend: "+120% spikes" },
    { title: "#SaaSBootstrap", counts: "320 posts", trend: "+5% steady" },
    { title: "#WebAssembly3D", counts: "432 posts", trend: "+18% yesterday" }
  ];

  return (
    <section className="bg-sun-surface border border-sun-border p-6 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-sun-primary" />
        <h3 className="font-display font-bold text-sun-text-main text-sm uppercase tracking-wider">Trending Discussions</h3>
      </div>
      
      <div className="divide-y divide-sun-border/40">
        {topics.map((t, idx) => (
          <div key={idx} className="py-2.5 first:pt-0 last:pb-0 hover:bg-sun-bg/40 px-1 rounded transition-colors cursor-pointer group">
            <h4 className="text-xs font-bold text-sun-text-main group-hover:text-sun-primary transition-colors">
              {t.title}
            </h4>
            <div className="flex items-center justify-between mt-1 text-[10px]">
              <span className="text-sun-text-muted font-medium">{t.counts}</span>
              <span className="text-emerald-500 font-bold">{t.trend}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
