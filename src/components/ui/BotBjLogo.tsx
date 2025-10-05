import React from 'react';
import iconImage from '@/assets/bot-bj-icon.png';

interface BotBjLogoProps {
  className?: string;
}

export const BotBjLogo: React.FC<BotBjLogoProps> = ({ 
  className = '' 
}) => {
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 border-2 rounded-md sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 ${className}`} style={{ borderColor: '#5DBBF5' }}>
      <img 
        src={iconImage} 
        alt="BOT.BJ Icon" 
        className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 object-contain flex-shrink-0"
      />
      <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold whitespace-nowrap" style={{ color: '#5DBBF5' }}>
        BOT.BJ
      </span>
    </div>
  );
};
