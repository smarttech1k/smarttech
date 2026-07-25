import React, { ReactNode, useId } from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}

export const Input = ({
  label,
  error,
  hint,
  icon,
  className = '',
  id,
  ...props
}: InputProps) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block px-0.5 text-xs font-semibold text-sun-text-main"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sun-text-muted">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error || hint ? messageId : undefined}
          className={`min-h-11 w-full rounded-xl border bg-sun-surface px-3.5 py-2.5 text-sm font-medium text-sun-text-main shadow-sm outline-none transition-colors placeholder:text-sun-text-muted/55 focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10 disabled:cursor-not-allowed disabled:opacity-60 ${
            icon ? 'pl-11' : ''
          } ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
              : 'border-sun-border'
          } ${className}`}
          {...props}
        />
      </div>

      {(error || hint) && (
        <p
          id={messageId}
          className={`px-0.5 text-xs ${
            error ? 'font-medium text-red-600' : 'text-sun-text-muted'
          }`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
};

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  className?: string;
}

export const Badge = ({
  children,
  variant = 'primary',
  className = '',
}: BadgeProps) => {
  const variants = {
    primary:
      'border-sun-primary/20 bg-sun-primary/8 text-sun-primary',
    secondary:
      'border-sun-border bg-sun-surface-light text-sun-text-muted',
    success:
      'border-emerald-600/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400',
    danger:
      'border-red-600/20 bg-red-500/8 text-red-700 dark:text-red-400',
  };

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold leading-none ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};