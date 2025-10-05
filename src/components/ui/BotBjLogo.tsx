import React from 'react';

interface BotBjLogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'full' | 'icon' | 'compact';
}

export const BotBjLogo: React.FC<BotBjLogoProps> = ({ 
  className = '', 
  showText = true,
  variant = 'full'
}) => {
  const getViewBox = () => {
    if (variant === 'icon') return '0 0 100 100';
    if (variant === 'compact') return '0 0 300 100';
    return '0 0 500 120';
  };

  return (
    <svg 
      viewBox={getViewBox()} 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Bot.BJ Logo"
    >
      {variant === 'full' && (
        <>
          {/* Cadre rectangulaire arrondi */}
          <rect 
            x="10" 
            y="10" 
            width="480" 
            height="100" 
            rx="20" 
            stroke="currentColor" 
            strokeWidth="6" 
            fill="none"
          />
          
          {/* Cercle avec symbole code */}
          <circle 
            cx="70" 
            cy="60" 
            r="35" 
            stroke="currentColor" 
            strokeWidth="6" 
            fill="none"
          />
          
          {/* Symbole < */}
          <path 
            d="M 75 45 L 60 60 L 75 75" 
            stroke="currentColor" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Symbole > */}
          <path 
            d="M 65 45 L 80 60 L 65 75" 
            stroke="currentColor" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Texte BOT.BJ */}
          {showText && (
            <text 
              x="130" 
              y="75" 
              fontSize="60" 
              fontWeight="800" 
              fill="currentColor"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              BOT.BJ
            </text>
          )}
        </>
      )}

      {variant === 'compact' && (
        <>
          {/* Version compacte pour mobile */}
          <rect 
            x="5" 
            y="15" 
            width="290" 
            height="70" 
            rx="15" 
            stroke="currentColor" 
            strokeWidth="5" 
            fill="none"
          />
          
          <circle 
            cx="50" 
            cy="50" 
            r="25" 
            stroke="currentColor" 
            strokeWidth="5" 
            fill="none"
          />
          
          <path 
            d="M 53 38 L 43 50 L 53 62" 
            stroke="currentColor" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
          
          <path 
            d="M 47 38 L 57 50 L 47 62" 
            stroke="currentColor" 
            strokeWidth="5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
          
          {showText && (
            <text 
              x="85" 
              y="60" 
              fontSize="38" 
              fontWeight="800" 
              fill="currentColor"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              BOT.BJ
            </text>
          )}
        </>
      )}

      {variant === 'icon' && (
        <>
          {/* Version icône uniquement */}
          <circle 
            cx="50" 
            cy="50" 
            r="40" 
            stroke="currentColor" 
            strokeWidth="6" 
            fill="none"
          />
          
          <path 
            d="M 53 32 L 38 50 L 53 68" 
            stroke="currentColor" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
          
          <path 
            d="M 47 32 L 62 50 L 47 68" 
            stroke="currentColor" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}
    </svg>
  );
};
