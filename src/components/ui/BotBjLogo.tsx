import React from 'react';

interface BotBjLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  className?: string;
}

export const BotBjLogo: React.FC<BotBjLogoProps> = ({ 
  variant = 'full',
  className = '' 
}) => {
  if (variant === 'icon') {
    return (
      <svg 
        viewBox="0 0 100 100" 
        className={className}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="45" stroke="#3B82F6" strokeWidth="6" fill="white"/>
        <path d="M35 35 L45 50 L35 65" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M65 35 L55 50 L65 65" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  if (variant === 'compact') {
    return (
      <svg 
        viewBox="0 0 280 100" 
        className={className}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="5" y="5" width="270" height="90" rx="15" stroke="#3B82F6" strokeWidth="6" fill="white"/>
        <circle cx="50" cy="50" r="30" stroke="#3B82F6" strokeWidth="5" fill="white"/>
        <path d="M38 38 L44 50 L38 62" stroke="#3B82F6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M62 38 L56 50 L62 62" stroke="#3B82F6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="95" y="65" fontFamily="Arial, sans-serif" fontSize="42" fontWeight="bold" fill="#3B82F6">BOT.BJ</text>
      </svg>
    );
  }

  return (
    <svg 
      viewBox="0 0 500 140" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="8" y="8" width="484" height="124" rx="20" stroke="#3B82F6" strokeWidth="8" fill="white"/>
      <circle cx="85" cy="70" r="40" stroke="#3B82F6" strokeWidth="6" fill="white"/>
      <path d="M68 52 L77 70 L68 88" stroke="#3B82F6" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M102 52 L93 70 L102 88" stroke="#3B82F6" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="150" y="95" fontFamily="Arial, sans-serif" fontSize="60" fontWeight="bold" fill="#3B82F6">BOT.BJ</text>
    </svg>
  );
};
