import React from 'react';
import iconImage from '@/assets/bot-bj-icon.png';

interface BotBjLogoProps {
  className?: string;
}

export const BotBjLogo: React.FC<BotBjLogoProps> = ({ 
  className = '' 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={iconImage} 
        alt="BOT.BJ Icon" 
        className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 xl:h-11 xl:w-11 object-contain"
      />
      <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-primary">
        BOT.BJ
      </span>
    </div>
  );
};
