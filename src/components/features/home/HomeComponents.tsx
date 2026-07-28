import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Share2,
  CheckCircle,
  BookOpen,
  Compass,
  Award,
  Terminal,
  Flame,
  ThumbsUp,
  Star,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Input';
import { Avatar } from '../../ui/Avatar';
import { useNavigate } from 'react-router-dom';

export const HeroSection = ({
  onExplore,
  onLearn,
}: {
  onExplore: () => void;
  onLearn: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-sun-primary via-sun-secondary to-[#4C1D95] p-6 text-white shadow-lg shadow-sun-primary/15 sm:p-8"
    >
      <div className="relative z-10 max-w-2xl space-y-4">
        <Badge className="border-white/15 bg-white/15 text-white">
          Discover. Share. Grow.
        </Badge>

        <h1 className="font-display text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
          Discover <span className="font-sans font-normal italic text-sun-accent">people</span>, ideas, and{' '}
          <span className="underline decoration-sun-accent/40 decoration-4 underline-offset-4">
            skills
          </span>{' '}
          you&apos;ll love.
        </h1>

        <p className="text-white/80 text-sm sm:text-base leading-relaxed font-normal max-w-xl">
          Follow creators, learn from mentors, and connect with a friendly community that helps you
          grow. Explore exciting hobbies, learn new skills naturally, and have fun together.
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          <Button
            variant="ghost"
            onClick={onExplore}
            className="border-white bg-white text-sun-primary hover:border-white/90 hover:bg-white/90"
          >
            <Compass size={16} />
            Start Exploring
          </Button>
          <button
            onClick={onLearn}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            <BookOpen size={16} />
            Find Creators
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const PromptBar = ({ onFocus }: { onFocus?: () => void }) => {
  return (
    <div className="relative w-full">
      <div className="rounded-2xl border border-sun-border bg-sun-surface p-3 shadow-sm sm:p-4">
        <div className="flex items-center gap-3">
          <Avatar src="https://i.pravatar.cc/150?u=me" size="sm" className="ring-2 ring-sun-primary/20" />
          <div
            onClick={onFocus}
            className="group flex min-h-11 flex-1 cursor-text items-center justify-between rounded-xl border border-sun-border bg-sun-surface-light px-4 text-sm text-sun-text-muted transition-colors hover:border-sun-primary/30"
          >
            <span className="group-hover:text-sun-text-main transition-colors">
              What are you working on or learning today?
            </span>
            <div className="flex gap-2 text-sun-primary">
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuickActionCards = ({
  onSparkClick,
  onCourseClick,
  onProjectClick,
}: {
  onSparkClick: () => void;
  onCourseClick: () => void;
  onProjectClick: () => void;
}) => {
  const actions = [
    {
      title: 'Watch Sparks',
      desc: 'Quick ideas, skills, and inspiration in under a minute',
      icon: <Flame size={20} />,
      color: 'bg-sun-primary text-white',
      hoverColor: 'hover:border-sun-primary',
      onClick: onSparkClick,
    },
    {
      title: 'Explore Creators',
      desc: 'Follow inspiring creators and trending mentors',
      icon: <Award size={20} />,
      color: 'bg-emerald-600 text-white',
      hoverColor: 'hover:border-emerald-500',
      onClick: onCourseClick,
    },
    {
      title: 'Popular Lessons',
      desc: 'Discover fascinating skills and have fun while learning',
      icon: <Terminal size={20} />,
      color: 'bg-indigo-600 text-white',
      hoverColor: 'hover:border-indigo-500',
      onClick: onProjectClick,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {actions.map((act, idx) => (
        <div
          key={idx}
          onClick={act.onClick}
          className={`interactive-card group flex cursor-pointer items-center gap-3 p-4 sm:flex-col sm:items-stretch ${act.hoverColor}`}
        >
          <div className="flex items-center justify-between">
            <div className={`rounded-xl p-2.5 ${act.color}`}>{act.icon}</div>
            <ArrowRight size={16} className="text-sun-text-muted group-hover:text-sun-primary transition-all" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-sun-text-main transition-colors group-hover:text-sun-primary">
              {act.title}
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-sun-text-muted">{act.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const LearningRecommendations = ({
  onCourseClick,
}: {
  onCourseClick: (id?: string) => void;
}) => {
  const courses = [
    {
      id: 'c1',
      category: 'Photography & Video',
      title: 'Short-Form Magic: Filming & Editing Sparks That Go Viral',
      mentor: 'Sarah Chen',
      role: 'Travel Vlogger & Editor',
      rating: '4.9',
      students: '2.4k',
      color: 'border-sun-primary/10',
      accent: 'text-sun-primary',
    },
    {
      id: 'c2',
      category: 'Creative Writing',
      title: 'Storytelling 101: Captivate Your Audience In Under 60 Seconds',
      mentor: 'Leon Vance',
      role: 'Creative Director',
      rating: '4.8',
      students: '1.8k',
      color: 'border-emerald-500/10',
      accent: 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="section-title">
            Creator Picks & Popular Lessons
          </h3>
          <p className="text-xs text-sun-text-muted mt-0.5">
            Handpicked skills from creators worth following
          </p>
        </div>
        <button
          onClick={() => onCourseClick()}
          className="flex items-center gap-1 text-xs font-semibold text-sun-primary hover:underline"
        >
          View More Lessons
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {courses.map((course) => (
          <div
            key={course.id}
            onClick={() => onCourseClick(course.id)}
            className={`interactive-card group cursor-pointer p-5 ${course.color}`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-sun-bg ${course.accent}`}>
                {course.category}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                <Star size={12} fill="currentColor" /> {course.rating}
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
              <span className="text-[10px] text-sun-text-muted font-semibold">
                {course.students} learning
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export type PostType = 'Recommendation' | 'Idea' | 'SystemUpdate';

export interface PostProps {
  id: string;
  type: PostType;
  author: {
    id: string;
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
  likedByMe?: boolean;
  commentItems?: Array<{
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles?: {
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
  }>;
  onLikeToggle?: (postId: string, currentlyLiked: boolean) => Promise<void> | void;
  onCommentSubmit?: (postId: string, content: string) => Promise<void> | void;
  onOpenProfile?: (profileIdOrUsername: string) => void;
}

export const CommunityPost: React.FC<PostProps> = ({
  id,
  type,
  author,
  content,
  image,
  likes,
  comments,
  time,
  likedByMe = false,
  commentItems = [],
  onLikeToggle,
  onCommentSubmit,
  onOpenProfile,
}) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(likedByMe);
  const [likesCount, setLikesCount] = useState(likes);
  const [commentsCount, setCommentsCount] = useState(comments);
  const [isLiking, setIsLiking] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);

  useEffect(() => {
    setLiked(likedByMe);
  }, [likedByMe]);

  useEffect(() => {
    setLikesCount(likes);
  }, [likes]);

  useEffect(() => {
    setCommentsCount(comments);
  }, [comments]);

  const handleLike = async () => {
    if (!onLikeToggle || isLiking) return;

    const previousLiked = liked;
    const previousLikes = likesCount;

    setIsLiking(true);
    setLiked(!previousLiked);
    setLikesCount(previousLiked ? previousLikes - 1 : previousLikes + 1);

    try {
      await onLikeToggle(id, previousLiked);
    } catch {
      setLiked(previousLiked);
      setLikesCount(previousLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!onCommentSubmit || isCommenting) return;
    if (!commentText.trim()) return;

    const nextText = commentText.trim();
    setIsCommenting(true);

    try {
      await onCommentSubmit(id, nextText);
      setCommentText('');
      setCommentsCount((prev) => prev + 1);
      setShowCommentBox(false);
    } finally {
      setIsCommenting(false);
    }
  };

  const typeLabels = {
    Recommendation: {
      text: 'Suggested Resource',
      style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
    },
    Idea: {
      text: 'Startup Idea',
      style: 'bg-sun-primary/10 text-sun-primary border-sun-primary/10',
    },
    SystemUpdate: {
      text: 'Vibe Check / Update',
      style: 'bg-indigo-600/10 text-indigo-600 border-indigo-600/10',
    },
  };

  const label =
    typeLabels[type] || {
      text: 'Community',
      style: 'bg-slate-500/10 text-slate-600',
    };

  const profileTarget = author.handle || author.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      className="rounded-2xl border border-sun-border bg-sun-surface p-5 shadow-sm transition-shadow hover:shadow-premium sm:p-6"
    >
      <div className="flex items-start justify-between mb-4">
  <button
    type="button"
    onClick={() => onOpenProfile?.(profileTarget)}
    className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
  >
    <Avatar src={author.avatar} size="sm" className="ring-2 ring-sun-primary/10" />
    <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-sun-text-main leading-tight">
                {author.name}
              </h4>
              {author.isExpert && (
                <CheckCircle size={13} className="text-sun-primary" fill="currentColor" />
              )}
            </div>
            <p className="text-[11px] text-sun-text-muted leading-tight mt-0.5">
              {author.role} · {time}
            </p>
          </div>
        </button>

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
            <img
              src={image}
              className="w-full h-full object-contain bg-black"
              alt="Community Activity"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-sun-border/30 text-xs">
          <div className="flex gap-4">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-1.5 font-bold transition-all ${
                liked ? 'text-sun-primary' : 'text-sun-text-muted hover:text-sun-primary'
              } ${isLiking ? 'opacity-60' : ''}`}
            >
              <ThumbsUp size={14} />
              <span>{likesCount} Likes</span>
            </button>

            <button
              onClick={() => setShowCommentBox((prev) => !prev)}
              className="flex items-center gap-1.5 font-bold text-sun-text-muted hover:text-sun-primary transition-all"
            >
              <MessageSquare size={14} />
              <span>{commentsCount} Comments</span>
            </button>
          </div>

          <button
            onClick={() => navigate(`/messages?shareType=post&shareId=${id}`)}
            className="text-sun-text-muted hover:text-sun-primary transition-colors p-1"
            title="Share post in a conversation"
            aria-label="Share post in a conversation"
          >
            <Share2 size={14} />
          </button>
        </div>

        {commentItems.length > 0 && (
          <div className="pt-3 border-t border-sun-border/30 space-y-3">
            {commentItems.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl bg-sun-bg border border-sun-border/40 px-3 py-3"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={
                      comment.profiles?.avatar_url ||
                      `https://i.pravatar.cc/150?u=${comment.user_id}`
                    }
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-sun-text-main">
                        {comment.profiles?.full_name ||
                          comment.profiles?.username ||
                          'Unknown User'}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sun-text-muted">
                        {formatCommentTime(comment.created_at)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-sun-text-main leading-relaxed break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCommentBox && (
          <div className="pt-3 border-t border-sun-border/30 space-y-3">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="w-full min-h-[90px] bg-sun-bg border border-sun-border rounded-xl p-3 text-sm focus:ring-1 focus:ring-sun-primary outline-none resize-none"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || isCommenting}
              >
                {isCommenting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

function formatCommentTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

export const CreatorSpotlight = ({
  creators,
  onOpenProfile,
}: {
  creators: Array<{
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    bio?: string | null;
  }>;
  onOpenProfile: (profileIdOrUsername: string) => void;
}) => {
  return (
    <section className="surface-card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-sun-text-main">
          Creator Spotlight
        </h3>
        <Badge>
          Real Profiles
        </Badge>
      </div>

      <div className="space-y-4">
        {creators.length === 0 ? (
          <div className="text-xs text-sun-text-muted">
            No creators available yet.
          </div>
        ) : (
          creators.map((c) => (
            <div
              key={c.id}
              onClick={() => onOpenProfile(c.username || c.id)}
              className="group flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-sun-surface-light"
            >
              <Avatar
                src={c.avatar_url || `https://i.pravatar.cc/150?u=${c.id}`}
                size="sm"
                className="ring-2 ring-sun-primary/20"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-sun-text-main truncate group-hover:text-sun-primary transition-colors">
                  {c.full_name || c.username || 'Unknown User'}
                </h4>
                <p className="text-[10px] text-sun-text-muted truncate mt-0.5">
                  @{c.username || 'unknown'}
                </p>
                {c.bio && (
                  <p className="text-[9px] text-sun-text-muted truncate mt-1">
                    {c.bio}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 bg-sun-primary text-white hover:bg-sun-primary/90 rounded-md transition-colors shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenProfile(c.username || c.id);
                }}
              >
                View
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export const TrendingDiscussions = () => {
  const topics = [
    { title: '#StorytellingSecrets', counts: '1.4k posts', trend: '+24% today' },
    { title: '#SparksInspiration', counts: '892 posts', trend: '+120% sparks' },
    { title: '#MindfulCreating', counts: '320 posts', trend: '+5% steady' },
    { title: '#CreativeTechArt', counts: '432 posts', trend: '+18% yesterday' },
  ];

  return (
    <section className="surface-card space-y-4 p-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-sun-primary" />
        <h3 className="font-display text-sm font-semibold text-sun-text-main">
          Trending Topics
        </h3>
      </div>

      <div className="divide-y divide-sun-border/40">
        {topics.map((t, idx) => (
          <div
            key={idx}
            className="py-2.5 first:pt-0 last:pb-0 hover:bg-sun-bg/40 px-1 rounded transition-colors cursor-pointer group"
          >
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
