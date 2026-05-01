import React, { ReactNode } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  className?: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}

export const Input = ({ label, error, icon, className = '', ...props }: InputProps) => {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-sun-text-muted px-2 block">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-sun-text-muted group-focus-within:text-sun-primary transition-all duration-300 transform group-focus-within:scale-110">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-sun-surface-light border-2 border-sun-border text-sun-text-main rounded-2xl py-4 focus:outline-none focus:ring-4 focus:ring-sun-primary/10 focus:border-sun-primary transition-all duration-300 placeholder:text-sun-text-muted/40 font-medium tracking-tight ${icon ? 'pl-14 pr-6' : 'px-6'} ${className} ${error ? 'border-red-500 ring-red-500/10' : ''}`}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] font-bold text-red-500 px-2 tracking-wide uppercase">{error}</p>}
    </div>
  );
};

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  className?: string;
}

export const Badge = ({ children, variant = 'primary', className = '' }: BadgeProps) => {
  const variants = {
    primary: 'bg-sun-primary/10 text-sun-primary border-sun-primary/20',
    secondary: 'bg-sun-text-muted/10 text-sun-text-muted border-sun-text-muted/20',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    danger: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
