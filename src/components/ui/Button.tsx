import React from 'react';
import { motion } from 'motion/react';

// motion.button redefines the drag and animation handlers with its own signatures,
// so those are dropped from the DOM prop set to avoid a conflicting overload.
type NativeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>;

export interface ButtonProps extends NativeButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) => {
  const baseStyles =
    'inline-flex min-w-0 items-center justify-center gap-2 rounded-xl font-semibold tracking-normal transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-primary/20 disabled:pointer-events-none disabled:opacity-50';

  const variants = {
    primary:
      'border border-sun-primary bg-sun-primary text-white shadow-sm hover:bg-[#5b21b6] hover:border-[#5b21b6]',
    secondary:
      'border border-sun-border bg-sun-surface text-sun-text-main shadow-sm hover:border-sun-primary/35 hover:bg-sun-primary/5',
    outline:
      'border border-sun-primary/45 bg-transparent text-sun-primary hover:border-sun-primary hover:bg-sun-primary/7',
    ghost:
      'border border-transparent bg-transparent text-sun-text-muted hover:bg-sun-surface-light hover:text-sun-text-main',
    danger:
      'border border-red-600 bg-red-600 text-white shadow-sm hover:bg-red-700 hover:border-red-700',
  };

  const sizes = {
    sm: 'min-h-9 px-3.5 py-2 text-xs',
    md: 'min-h-11 px-5 py-2.5 text-sm',
    lg: 'min-h-12 px-6 py-3 text-sm sm:text-base',
  };

  return (
    <motion.button
      type={type}
      whileTap={props.disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0">{children}</span>
    </motion.button>
  );
};