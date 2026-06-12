import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'primary' | 'white' | 'dark' | 'muted' | 'gradient';
  showBg?: boolean;
}

export const KorusaIcon: React.FC<LogoProps> = ({ 
  className = '', 
  size = 32,
  variant = 'primary',
  showBg = true
}) => {
  const colors = {
    primary: 'text-sun-primary',
    white: 'text-white',
    dark: 'text-black',
    muted: 'text-sun-text-muted',
    gradient: ''
  };

  const selectedColor = colors[variant];

  // Unique IDs for gradients to prevent collisions if multiple instances are rendered
  const bgGradId = `korusa-bg-grad-${variant}-${size}`;
  const kGradId = `korusa-k-grad-${variant}-${size}`;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${selectedColor} ${className} shrink-0`}
    >
      <defs>
        {/* Sleek, deep glassy dark-purple background gradient */}
        <linearGradient id={bgGradId} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#31055E" />
          <stop offset="35%" stopColor="#14022B" />
          <stop offset="100%" stopColor="#05000A" />
        </linearGradient>

        {/* Breathtaking luxury yellow-orange-pink-magenta gradient flowing across the 'K' monogram */}
        <linearGradient id={kGradId} x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#FFE600" />
          <stop offset="28%" stopColor="#FF9500" />
          <stop offset="58%" stopColor="#FF4B7E" />
          <stop offset="88%" stopColor="#FB2DCC" />
          <stop offset="100%" stopColor="#DF1BFF" />
        </linearGradient>
      </defs>

      {/* SQUIRCLE BACKGROUND - exact representation of high-end app icons */}
      {showBg && (
        <>
          <rect 
            width="100" 
            height="100" 
            rx="28" 
            fill={`url(#${bgGradId})`} 
          />
          {/* Subtle luxurious inner rim highlighting to provide visual depth */}
          <rect 
            x="0.5" 
            y="0.5" 
            width="99" 
            height="99" 
            rx="27.5" 
            fill="none" 
            stroke="white" 
            strokeWidth="1.2" 
            strokeOpacity="0.08" 
          />
        </>
      )}

      {/* Stylized premium continuous 'K' Monogram (Original Exact Coordinates) */}
      <g 
        fill={showBg || variant === 'gradient' || variant === 'primary' ? `url(#${kGradId})` : 'currentColor'}
      >
        <path d="M42 25C37 36 34 48 34 60C34 69 36 75 42 77C31 75 28 65 28 55C28 38 34 29 42 25Z" />
        <path d="M41 44C52 43 65 36 76 27C63 29 51 36 40 44Z" />
        <path d="M37 51C48 50 62 56 76 75C64 68 53 59 39 52Z" />
        <path d="M36 49C42 45 48 47 52 52C55 56 59 62 65 67C55 62 45 56 36 49Z" opacity={0.4} />
      </g>
    </svg>
  );
};

interface FullLogoProps extends LogoProps {
  textClassName?: string;
  vertical?: boolean;
}

export const KorusaLogo: React.FC<FullLogoProps> = ({
  className = '',
  size = 32,
  variant = 'primary',
  textClassName = '',
  vertical = false
}) => {
  if (vertical) {
    return (
      <div className={`flex flex-col items-center text-center gap-3 ${className}`}>
        <KorusaIcon size={size * 2.2} variant={variant} />
        <span className={`font-display font-black tracking-[0.25em] text-sun-text-main uppercase text-xl ${textClassName}`}>
          KORUSA
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 group/logo cursor-pointer ${className}`}>
      <KorusaIcon size={size} variant={variant} />
      <span className={`font-display font-black tracking-[0.18em] text-sun-text-main group-hover:text-sun-primary transition-colors uppercase ${textClassName}`}>
        KORUSA
      </span>
    </div>
  );
};
