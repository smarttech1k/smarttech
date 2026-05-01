import React, { ReactNode } from 'react';
import { motion } from 'motion/react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  title?: string;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  icon, 
  className = '', 
  ...props 
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-sun-primary active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-full';
  
  const variants = {
    primary: 'bg-sun-primary text-black hover:bg-sun-primary/95 shadow-xl shadow-sun-primary/20',
    secondary: 'bg-sun-surface-light text-sun-text-main border-2 border-sun-border hover:border-sun-primary/50 hover:bg-sun-surface transition-all duration-300',
    outline: 'bg-transparent border-2 border-sun-primary text-sun-primary hover:bg-sun-primary/10 transition-all',
    ghost: 'bg-transparent text-sun-text-main hover:bg-sun-surface transition-all',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs font-black uppercase tracking-widest',
    md: 'px-6 py-3 text-sm font-black uppercase tracking-widest',
    lg: 'px-10 py-4 text-base font-black uppercase tracking-widest',
  };

  return (
    <motion.button
      whileHover={{ 
        y: -2,
        boxShadow: variant === 'primary' ? '0 10px 25px -5px rgba(234, 179, 8, 0.4)' : '0 4px 12px -2px rgba(0, 0, 0, 0.1)'
      }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...(props as any)}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </motion.button>
  );
};
