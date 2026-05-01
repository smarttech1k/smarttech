import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  AtSign, 
  MoreHorizontal, 
  Sparkles,
  Search,
  Bell
} from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { BackButton } from '../../ui/BackButton';

type NotificationType = 'all' | 'likes' | 'comments' | 'follows' | 'mentions';

interface Notification {
  id: string;
  type: NotificationType;
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  isRead: boolean;
  previewImage?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'likes',
    user: { name: 'Alex Rivera', avatar: 'https://i.pravatar.cc/150?u=12' },
    content: 'liked your post about "Scaling Wisdom Architecture".',
    timestamp: '2m ago',
    isRead: false,
    previewImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&q=80'
  },
  {
    id: '2',
    type: 'follows',
    user: { name: 'Sarah Chen', avatar: 'https://i.pravatar.cc/150?u=2' },
    content: 'started following you.',
    timestamp: '1h ago',
    isRead: false
  },
  {
    id: '3',
    type: 'comments',
    user: { name: 'Marcus T.', avatar: 'https://i.pravatar.cc/150?u=3' },
    content: 'commented: "This logic is incredible, can\'t wait for more!"',
    timestamp: '3h ago',
    isRead: true,
    previewImage: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=200&q=80'
  },
  {
    id: '4',
    type: 'mentions',
    user: { name: 'Zoe Life', avatar: 'https://i.pravatar.cc/150?u=4' },
    content: 'mentioned you in a thread: "Check out @user\'s perspective on this."',
    timestamp: 'Yesterday',
    isRead: true
  },
  {
    id: '5',
    type: 'likes',
    user: { name: 'Elena Ray', avatar: 'https://i.pravatar.cc/150?u=5' },
    content: 'liked your comment on "Advanced UI Systems".',
    timestamp: '2 days ago',
    isRead: true
  }
];

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  switch (type) {
    case 'likes': return <Heart size={14} className="text-red-500 fill-red-500" />;
    case 'comments': return <MessageCircle size={14} className="text-sun-primary fill-sun-primary" />;
    case 'follows': return <UserPlus size={14} className="text-blue-500" />;
    case 'mentions': return <AtSign size={14} className="text-purple-500" />;
    default: return <Sparkles size={14} className="text-sun-primary" />;
  }
};

export const NotificationsView = ({ onBack, onExploreClick }: { onBack?: () => void, onExploreClick?: () => void }) => {
  const [filter, setFilter] = useState<NotificationType>('all');
  
  const filteredNotifications = mockNotifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-6">
        {onBack && <BackButton onClick={onBack} label="Back" sticky={true} />}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-bold tracking-tight">Activity</h1>
            <p className="text-sun-text-muted text-sm font-medium">Manage your interactions and updates.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="!rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest">Mark all as read</Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {(['all', 'likes', 'comments', 'follows', 'mentions'] as NotificationType[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              filter === type 
              ? 'bg-sun-primary text-black border-sun-primary shadow-lg shadow-sun-primary/10' 
              : 'bg-sun-surface border-sun-border text-sun-text-muted hover:border-white/20'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden border-sun-border/30">
        <div className="divide-y divide-sun-border/30">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`p-5 sm:p-6 flex items-start gap-4 transition-colors hover:bg-white/5 relative group cursor-pointer ${!notification.isRead ? 'bg-sun-primary/5' : ''}`}
                >
                  <div className="relative shrink-0">
                    <Avatar size="md" src={notification.user.avatar} className="ring-2 ring-transparent group-hover:ring-sun-primary/20 transition-all" />
                    <div className="absolute -bottom-1 -right-1 p-1.5 bg-sun-bg rounded-full border border-sun-border shadow-lg">
                      <NotificationIcon type={notification.type} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm text-sun-text-main leading-snug">
                      <span className="font-bold text-white">{notification.user.name}</span>{' '}
                      <span className="text-sun-text-muted font-medium">{notification.content}</span>
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-sun-text-muted font-black uppercase tracking-widest">{notification.timestamp}</span>
                      {!notification.isRead && <div className="w-1.5 h-1.5 bg-sun-primary rounded-full"></div>}
                    </div>
                  </div>

                  {notification.previewImage && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-sun-border mt-1 group-hover:scale-105 transition-transform">
                      <img src={notification.previewImage} className="w-full h-full object-cover" alt="Post preview" />
                    </div>
                  )}

                  <button className="p-2 opacity-0 group-hover:opacity-100 text-sun-text-muted hover:text-white transition-all shrink-0">
                    <MoreHorizontal size={18} />
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="py-20 text-center space-y-6">
                 <div className="w-20 h-20 bg-sun-surface border border-sun-border rounded-[2rem] flex items-center justify-center mx-auto text-sun-text-muted/30">
                    <Bell size={40} />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-xl font-display font-bold">Quiet for now</h3>
                    <p className="text-sun-text-muted text-xs max-w-xs mx-auto font-medium leading-relaxed">No {filter !== 'all' ? filter : ''} notifications to show yet. Stay active to get updates!</p>
                 </div>
                 {filter !== 'all' && (
                   <Button variant="outline" size="sm" onClick={() => setFilter('all')}>View all activity</Button>
                 )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Suggestions Footer */}
      <footer className="pt-10 flex flex-col items-center gap-4 text-center">
         <div className="flex -space-x-3">
            {[1,2,3].map(i => (
              <div key={i}>
                <Avatar size="sm" src={`https://i.pravatar.cc/150?u=${i+40}`} className="border-2 border-sun-bg" />
              </div>
            ))}
         </div>
         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sun-text-muted">Find more people to expert with</p>
         <Button variant="secondary" size="sm" className="!rounded-xl px-6" onClick={onExploreClick}>Explore Wisdom Nodes</Button>
      </footer>
    </div>
  );
};
