import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  variant?: 'floating' | 'inline' | 'ghost';
  sticky?: boolean;
}

export const BackButton = ({ 
  onClick, 
  label = 'Back', 
  className,
  variant = 'ghost',
  sticky = false
}: BackButtonProps) => {
  const baseStyles = "group flex items-center gap-2 py-2 px-1 rounded-full transition-all active:scale-95";
  
  const variants = {
    ghost: "text-sun-text-muted hover:text-white",
    floating: "bg-sun-bg/80 backdrop-blur-xl border border-sun-border shadow-xl px-4 py-3 rounded-2xl hover:bg-white/5",
    inline: "text-sun-primary hover:bg-sun-primary/5 px-3"
  };

  const stickyStyles = sticky ? "sticky top-4 left-4 z-50 md:relative md:top-0 md:left-0" : "";

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: -2 }}
      onClick={onClick}
      title={label || 'Back'}
      className={`${baseStyles} ${variants[variant]} ${stickyStyles} ${className}`}
    >
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-sun-primary group-hover:text-black transition-all">
        <ChevronLeft size={20} strokeWidth={2.5} />
      </div>
      {label && (
        <span className="text-xs font-black uppercase tracking-[0.2em]">
          {label}
        </span>
      )}
    </motion.button>
  );
};
