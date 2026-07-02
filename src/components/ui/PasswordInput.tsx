import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from './Input';

type PasswordInputProps = Omit<InputProps, 'type'>;

export const PasswordInput = ({ className = '', ...props }: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-14`}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-sun-text-muted hover:text-sun-primary transition-colors p-1"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};
