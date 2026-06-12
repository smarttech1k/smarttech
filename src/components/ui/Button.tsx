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
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-sun-primary active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl';
  
  const variants = {
    primary: 'bg-sun-primary text-white hover:bg-sun-primary/90 shadow-lg shadow-sun-primary/20',
    secondary: 'bg-white dark:bg-transparent border-2 border-sun-primary text-sun-primary hover:bg-sun-primary/5 transition-all duration-300',
    outline: 'bg-transparent border-2 border-sun-primary text-sun-primary hover:bg-sun-primary/10 transition-all',
    ghost: 'bg-transparent text-sun-text-muted hover:text-sun-primary hover:bg-sun-primary/5 transition-all',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs font-bold uppercase tracking-wider',
    md: 'px-6 py-3 text-sm font-bold uppercase tracking-wider',
    lg: 'px-8 py-3.5 text-base font-bold uppercase tracking-wider',
  };

  return (
    <motion.button
      whileHover={{ 
        y: -1.5,
        boxShadow: variant === 'primary' ? '0 8px 20px -5px rgba(109, 40, 217, 0.4)' : '0 4px 12px -2px rgba(109, 40, 217, 0.1)'
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 12 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...(props as any)}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </motion.button>
  );
};
