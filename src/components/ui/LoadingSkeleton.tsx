import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangular',
  width,
  height
}) => {
  const baseStyles = 'bg-sun-surface-light/30 overflow-hidden relative shadow-inner';
  
  const variants = {
    rectangular: 'rounded-2xl',
    circular: 'rounded-full',
    text: 'rounded-lg h-4 w-full',
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={{ width, height }}
    >
      <motion.div
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-xl"
      />
    </div>
  );
};

export const PostSkeleton = () => (
  <div className="bg-sun-surface/30 backdrop-blur-sm border border-sun-border rounded-[2.5rem] p-6 max-w-2xl mx-auto mb-8 animate-pulse">
    <div className="flex items-center gap-3 mb-6">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="20%" />
      </div>
    </div>
    <Skeleton height={300} className="mb-6" />
    <div className="space-y-3">
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="70%" />
    </div>
  </div>
);

export const CourseSkeleton = () => (
  <div className="bg-sun-surface border border-sun-border rounded-[24px] p-4 space-y-4">
    <Skeleton height={160} />
    <div className="space-y-2">
      <Skeleton variant="text" width="30%" />
      <Skeleton variant="text" width="80%" height={24} />
      <div className="flex justify-between items-center pt-2">
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="20%" />
      </div>
    </div>
  </div>
);
