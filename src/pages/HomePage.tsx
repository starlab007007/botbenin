
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { IABenefitsCards } from '@/components/IABenefitsCards';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { QuickActions } from '@/components/home/QuickActions';
import { AIModules } from '@/components/home/AIModules';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header de bienvenue - responsive */}
      <WelcomeHeader userName={user?.name} />

      {/* Actions rapides - responsive grid */}
      <QuickActions />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Modules IA */}
        <AIModules />

        {/* Nouvelle section avec les avantages IA */}
        <div>
          <IABenefitsCards />
        </div>
      </div>
    </div>
  );
};
