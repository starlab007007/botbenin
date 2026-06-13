import React from 'react';
import iconImage from '@/assets/bot-bj-icon.png';

interface BotBjLogoProps {
  className?: string;
  /** Show the "BOT.BJ" wordmark next to the icon. Defaults to false — the WAOUH logo already carries the brand. */
  showWordmark?: boolean;
  /** Icon size in tailwind units (e.g. 8 → h-8 w-8). Defaults to responsive sizing. */
  size?: number;
}

export const BotBjLogo: React.FC<BotBjLogoProps> = ({ className = '', showWordmark = false, size }) => {
  const sizeClass = size
    ? `h-${size} w-${size}`
    : 'h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10';
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
      <img
        src={iconImage}
        alt="WAOUH — Bot.BJ"
        className={`${sizeClass} object-contain flex-shrink-0 drop-shadow-sm`}
        loading="eager"
        decoding="async"
      />
      {showWordmark && (
        <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold whitespace-nowrap" style={{ color: '#5DBBF5' }}>
          BOT.BJ
        </span>
      )}
    </div>
  );
};
