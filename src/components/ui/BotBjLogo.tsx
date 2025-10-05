import React from 'react';
import logoImage from '@/assets/bot-bj-logo.png';

interface BotBjLogoProps {
  className?: string;
}

export const BotBjLogo: React.FC<BotBjLogoProps> = ({ 
  className = '' 
}) => {
  return (
    <img 
      src={logoImage} 
      alt="BOT.BJ Logo" 
      className={`h-7 w-auto sm:h-8 md:h-9 lg:h-10 xl:h-11 object-contain ${className}`}
    />
  );
};
