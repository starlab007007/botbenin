
import React from 'react';
import { cn } from "@/lib/utils";

interface AvatarInitialsProps {
  name: string;
  className?: string;
}

export const AvatarInitials: React.FC<AvatarInitialsProps> = ({ name, className }) => {
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  };

  return (
    <span className={cn("text-sm font-medium", className)}>
      {getInitials(name)}
    </span>
  );
};
