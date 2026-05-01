import { motion } from 'motion/react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  isLive?: boolean;
  borderActive?: boolean;
}

export const Avatar = ({ src, name, size = 'md', className = '', isLive = false, borderActive = false }: AvatarProps) => {
  const sizes = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-24 h-24 text-xl',
    full: 'w-full h-full text-2xl',
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative inline-block ${className}`}
    >
      <div className={`${sizes[size]} rounded-full overflow-hidden border-2 shadow-inner flex items-center justify-center bg-sun-surface transition-all duration-300 ${isLive ? 'border-sun-primary ring-2 ring-sun-primary/30 ring-offset-2 ring-offset-sun-bg animate-pulse-slow' : borderActive ? 'border-sun-primary shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-sun-border group-hover:border-sun-primary/50'}`}>
        {src ? (
          <img src={src} alt={name || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="font-extrabold text-sun-text-muted">
            {name ? name.substring(0, 2).toUpperCase() : 'W'}
          </span>
        )}
      </div>
      {isLive && (
        <motion.span 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-[8px] font-black text-white px-1 py-0.5 rounded-sm uppercase tracking-tighter"
        >
          Live
        </motion.span>
      )}
    </motion.div>
  );
};
