
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {getGreeting()}, {userName || 'Utilisateur'} ! 👋
          </h1>
          <p className="text-blue-100 text-base sm:text-lg">
            Prêt à optimiser votre productivité avec l'IA ?
          </p>
        </div>
        <div className="flex items-center space-x-6 lg:space-x-4">
          <div className="text-center lg:text-right">
            <div className="text-xl sm:text-2xl font-bold">24</div>
            <div className="text-xs sm:text-sm text-blue-200">Bots actifs</div>
          </div>
          <div className="text-center lg:text-right">
            <div className="text-xl sm:text-2xl font-bold">156</div>
            <div className="text-xs sm:text-sm text-blue-200">Prospects</div>
          </div>
        </div>
      </div>
    </div>
  );
};
