import React from 'react';

interface BotBjLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'compact';
}

export const BotBjLogo: React.FC<BotBjLogoProps> = ({ 
  className = '', 
  variant = 'full'
}) => {
  const baseColor = '#3B82F6'; // Bleu principal
  
  if (variant === 'icon') {
    return (
      <svg 
        viewBox="0 0 100 100" 
        className={className}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Bot.BJ"
      >
        <circle 
          cx="50" 
          cy="50" 
          r="42" 
          stroke={baseColor}
          strokeWidth="8" 
          fill="white"
        />
        <path 
          d="M 56 35 L 38 50 L 56 65" 
          stroke={baseColor}
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
        />
        <path 
          d="M 44 35 L 62 50 L 44 65" 
          stroke={baseColor}
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  if (variant === 'compact') {
    return (
      <svg 
        viewBox="0 0 400 100" 
        className={className}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Bot.BJ"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect 
          x="8" 
          y="8" 
          width="384" 
          height="84" 
          rx="16" 
          stroke={baseColor}
          strokeWidth="6" 
          fill="white"
        />
        <circle 
          cx="62" 
          cy="50" 
          r="28" 
          stroke={baseColor}
          strokeWidth="6" 
          fill="white"
        />
        <path 
          d="M 67 36 L 54 50 L 67 64" 
          stroke={baseColor}
          strokeWidth="6" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
        />
        <path 
          d="M 57 36 L 70 50 L 57 64" 
          stroke={baseColor}
          strokeWidth="6" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
        />
        <text 
          x="110" 
          y="63" 
          fontSize="42" 
          fontWeight="700" 
          fill={baseColor}
          fontFamily="Arial, sans-serif"
          letterSpacing="1"
        >
          BOT.BJ
        </text>
      </svg>
    );
  }

  return (
    <svg 
      viewBox="0 0 600 140" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Bot.BJ"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect 
        x="10" 
        y="10" 
        width="580" 
        height="120" 
        rx="24" 
        stroke={baseColor}
        strokeWidth="8" 
        fill="white"
      />
      <circle 
        cx="90" 
        cy="70" 
        r="42" 
        stroke={baseColor}
        strokeWidth="8" 
        fill="white"
      />
      <path 
        d="M 97 50 L 78 70 L 97 90" 
        stroke={baseColor}
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      <path 
        d="M 83 50 L 102 70 L 83 90" 
        stroke={baseColor}
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      <text 
        x="160" 
        y="90" 
        fontSize="64" 
        fontWeight="700" 
        fill={baseColor}
        fontFamily="Arial, sans-serif"
        letterSpacing="2"
      >
        BOT.BJ
      </text>
    </svg>
  );
};
