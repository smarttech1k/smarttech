import { Heart, MessageCircle, Share2, MoreVertical, Bookmark, CheckCircle } from 'lucide-react';
import { Avatar } from './Avatar';
import { Badge } from './Input';
import { motion } from 'motion/react';

// VideoCard - TikTok Inspiration
export const VideoCard = ({ thumbnail, author, description, likes, comments, onAuthorClick }: any) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      viewport={{ once: true }}
      className="relative aspect-[9/16] w-full max-w-[320px] rounded-[32px] overflow-hidden group shadow-2xl bg-black cursor-pointer"
    >
      <img src={thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110" alt="Video" />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20"></div>
 
      {/* Author info & description */}
      <div className="absolute bottom-0 left-0 p-6 w-full transform transition-all duration-500 group-hover:pb-8">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 mb-3 hover:scale-105 transition-transform origin-left"
          onClick={(e) => { e.stopPropagation(); onAuthorClick?.(); }}
        >
          <Avatar size="sm" src={author.avatar} isLive={author.isLive} />
          <p className="text-sm font-bold text-white flex items-center gap-1 drop-shadow-md">
            {author.name}
            {author.verified && <CheckCircle size={12} className="text-blue-400 fill-current" />}
          </p>
        </motion.div>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-stone-200 line-clamp-2 leading-relaxed mb-4 drop-shadow-md"
        >
          {description}
        </motion.p>
      </div>

      {/* Side Action Bar */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6 z-10">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center group/btn"
        >
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-full group-hover/btn:bg-red-500 transition-all duration-300 shadow-lg">
            <Heart size={20} className="text-white group-hover/btn:fill-white" />
          </div>
          <span className="text-[10px] font-bold text-white mt-1 shadow-sm drop-shadow-lg">{likes}</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center group/btn"
        >
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-full group-hover/btn:bg-sun-primary transition-all duration-300 shadow-lg">
            <MessageCircle size={20} className="text-white group-hover/btn:fill-white" />
          </div>
          <span className="text-[10px] font-bold text-white mt-1 shadow-sm drop-shadow-lg">{comments}</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center group/btn"
        >
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-full group-hover/btn:bg-blue-500 transition-all duration-300 shadow-lg">
            <Share2 size={20} className="text-white group-hover/btn:fill-white" />
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
};

// CourseCard - Udemy Inspiration
export const CourseCard = ({ title, category, instructor, price, rating, students, thumbnail, onClick }: any) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -12,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      viewport={{ once: true }}
      onClick={onClick}
      className={`bg-sun-surface border border-sun-border rounded-[32px] overflow-hidden group shadow-lg hover:shadow-2xl hover:shadow-sun-primary/20 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="relative aspect-video overflow-hidden">
        <img src={thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={title} />
        <div className="absolute top-4 left-4">
          <Badge variant="primary" className="shadow-lg backdrop-blur-md">{category}</Badge>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] font-bold text-sun-primary uppercase tracking-widest">{instructor}</p>
          <div className="w-1 h-1 rounded-full bg-sun-border"></div>
          <p className="text-[10px] text-sun-text-muted font-medium italic">{students} Students</p>
        </div>
        <h3 className="font-display font-bold text-lg leading-tight mb-4 group-hover:text-sun-primary transition-colors line-clamp-2">
          {title}
        </h3>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-sun-border/30">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-sun-text-main">${price}</span>
            <span className="text-xs text-sun-text-muted line-through opacity-50">$199</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 rounded-xl">
            <span className="text-xs font-black text-yellow-500">{rating}</span>
            <div className="flex gap-1 leading-none -translate-y-px">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < Math.floor(rating) ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'bg-stone-700'}`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// PostCard - Instagram Inspiration
export const PostCard = ({ author, content, image, likes, time, shares = "12", commentCount = "4", onAuthorClick, onCommentClick }: any) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      className="bg-sun-surface/30 backdrop-blur-sm border border-sun-border rounded-[3rem] overflow-hidden max-w-2xl mx-auto shadow-xl group mb-10 hover:border-sun-primary/30 transition-colors duration-500"
    >
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="cursor-pointer" 
            onClick={onAuthorClick}
          >
            <Avatar size="md" src={author.avatar} />
          </motion.div>
          <div>
            <p 
              className="text-sm font-bold leading-none tracking-tight hover:text-sun-primary cursor-pointer transition-colors flex items-center gap-1"
              onClick={onAuthorClick}
            >
              {author.handle}
              <CheckCircle size={12} className="text-blue-400 fill-current" />
            </p>
            <p className="text-[10px] text-sun-text-muted mt-1.5 font-medium">{time}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary" className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">Expert</Badge>
          <button className="p-2 text-sun-text-muted hover:text-sun-text-main hover:bg-sun-text-main/5 rounded-full transition-all">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
      
      <div className="relative aspect-square sm:aspect-[16/10] bg-black overflow-hidden mx-1 rounded-[2.5rem] group/image">
        <img 
          src={image} 
          className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-1000 ease-out" 
          alt="Post content" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Quick actions on image hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
          <motion.button 
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            className="bg-white/20 backdrop-blur-xl p-4 rounded-full text-white border border-white/30 shadow-2xl"
          >
            <Heart size={32} className="fill-white" />
          </motion.button>
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-8">
            <button className="group flex items-center gap-2.5">
              <div className="p-2.5 group-hover:bg-red-500/10 rounded-full transition-colors">
                <Heart size={24} className="text-sun-text-main group-hover:text-red-500 transition-all duration-300" />
              </div>
              <span className="text-xs font-black text-sun-text-muted group-hover:text-sun-text-main transition-colors">{likes}</span>
            </button>
            <button className="group flex items-center gap-2.5" onClick={onCommentClick}>
              <div className="p-2.5 group-hover:bg-sun-primary/10 rounded-full transition-colors">
                <MessageCircle size={24} className="text-sun-text-main group-hover:text-sun-primary transition-all duration-300" />
              </div>
              <span className="text-xs font-black text-sun-text-muted group-hover:text-sun-text-main transition-colors">{commentCount}</span>
            </button>
            <button className="group">
              <div className="p-2.5 group-hover:bg-blue-500/10 rounded-full transition-colors">
                <Share2 size={24} className="text-sun-text-main group-hover:text-blue-500 transition-all duration-300" />
              </div>
            </button>
          </div>
          <button className="group">
            <div className="p-2.5 group-hover:bg-sun-secondary/10 rounded-full transition-colors">
              <Bookmark size={24} className="text-sun-text-main group-hover:text-sun-secondary transition-all duration-300" />
            </div>
          </button>
        </div>
        
        <div className="space-y-3">
          <p className="text-[15px] leading-[1.7] font-medium">
            <span className="font-black mr-2 text-sun-primary hover:underline cursor-pointer">{author.handle}</span>
            {content}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-3 py-1 bg-sun-surface-light/50 text-[10px] font-black text-sun-text-muted hover:text-sun-primary hover:bg-sun-primary/5 rounded-lg cursor-pointer transition-all">#learning</span>
            <span className="px-3 py-1 bg-sun-surface-light/50 text-[10px] font-black text-sun-text-muted hover:text-sun-primary hover:bg-sun-primary/5 rounded-lg cursor-pointer transition-all">#learning</span>
            <span className="px-3 py-1 bg-sun-surface-light/50 text-[10px] font-black text-sun-text-muted hover:text-sun-primary hover:bg-sun-primary/5 rounded-lg cursor-pointer transition-all">#innovation</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-sun-border/50 flex items-center gap-4">
          <Avatar size="sm" src="https://i.pravatar.cc/150?u=me" />
          <div className="flex-1 relative flex items-center">
            <input 
              type="text" 
              placeholder="Add a thought..." 
              className="w-full bg-sun-surface-light/30 text-xs px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-sun-primary/50 placeholder:text-sun-text-muted/50 font-medium transition-all"
            />
            <button className="absolute right-3 text-[10px] font-black text-sun-primary uppercase tracking-tighter hover:scale-110 transition-transform disabled:opacity-50">Post</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
