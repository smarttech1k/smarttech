import React from 'react';
import { motion } from 'motion/react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  isLive?: boolean;
  borderActive?: boolean;
  onClick?: () => void;
  title?: string;
}

export const Avatar = ({
  src,
  name,
  size = 'md',
  className = '',
  isLive = false,
  borderActive = false,
  onClick,
  title,
}: AvatarProps) => {
  const sizes = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-12 w-12 text-sm',
    xl: 'h-24 w-24 text-xl',
    full: 'h-full w-full text-2xl',
  };

  const image = (
    <div
      className={`${sizes[size]} flex items-center justify-center overflow-hidden rounded-full border bg-sun-surface shadow-sm transition-colors ${
        isLive || borderActive
          ? 'border-sun-primary'
          : 'border-sun-border'
      }`}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'User avatar'}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="font-semibold text-sun-text-muted">
          {name ? name.substring(0, 2).toUpperCase() : 'K'}
        </span>
      )}
    </div>
  );

  const content = onClick ? (
    <button
      type="button"
      onClick={onClick}
      title={title || name || 'Open profile'}
      className="rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-primary/20"
    >
      {image}
    </button>
  ) : (
    image
  );

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.03 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`relative inline-flex shrink-0 ${className}`}
    >
      {content}

      {isLive && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sun-surface bg-red-500" />
      )}
    </motion.div>
  );
};