import React from 'react';
import logoImage from '@/assets/bot-bj-logo.png';

interface BotBjLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  className?: string;
}

export const BotBjLogo: React.FC<BotBjLogoProps> = ({ 
  variant = 'full',
  className = '' 
}) => {
  const sizeClasses = {
    icon: 'h-8 w-auto',
    compact: 'h-10 w-auto',
    full: 'h-12 w-auto'
  };

  return (
    <img 
      src={logoImage} 
      alt="BOT.BJ Logo" 
      className={`${sizeClasses[variant]} ${className}`}
    />
  );
};
