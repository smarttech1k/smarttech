import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'primary' | 'white' | 'dark' | 'muted' | 'gradient';
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

      {/* Stylized premium continuous 'K' Monogram */}
      <g 
        transform={showBg ? "translate(4, 4) scale(0.92)" : undefined}
        fill={showBg || variant === 'gradient' || variant === 'primary' ? `url(#${kGradId})` : 'currentColor'}
      >
        {/* Left vertical stem curving into elegant crescent-horn (top) and soft-anchoring foot (bottom) */}
        <path 
          d="M 22,20 
             C 27,21 34,23.5 43,24 
             L 43,44 
             C 38,45 37.5,45 37.5,45 
             C 37.5,45 42,45 43,45 
             L 43,54 
             C 43,64 36.5,73 29,74 
             C 37,74 42.5,66 43,54 
             L 43,24 
             Z" 
        />

        {/* Top-right sweeping wing/crest */}
        <path 
          d="M 43,44 
             C 54,43.5 65.5,36.5 75.5,24 
             C 75.5,24 75.5,34.5 70.5,46.5 
             C 64.5,54.5 52,50.5 43,44 
             Z" 
        />

        {/* Bottom-right diagonal sweep/anchor link */}
        <path 
          d="M 43,45 
             C 52,50.5 66.5,63.5 80.5,74 
             C 70,74 58,68 43,54 
             Z" 
        />
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
