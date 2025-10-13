
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Star } from 'lucide-react';

interface WelcomeHeaderProps {
  userName?: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ userName }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-xl lg:rounded-2xl p-6 sm:p-8 text-white">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          {getGreeting()}, {userName || 'Utilisateur'} ! 👋
        </h1>
        <p className="text-blue-100 text-base sm:text-lg">
          Prêt à optimiser votre productivité avec l'IA ?
        </p>
      </div>
    </div>
  );
};
