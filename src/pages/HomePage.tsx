
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { IABenefitsCards } from '@/components/IABenefitsCards';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { QuickActions } from '@/components/home/QuickActions';
import { AIModules } from '@/components/home/AIModules';
import { AuditSection } from '@/components/home/AuditSection';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header de bienvenue - responsive */}
      <WelcomeHeader userName={user?.name} />

      {/* Section Audit Offert */}
      <AuditSection />

      {/* Actions rapides - responsive grid */}
      <QuickActions />

      {/* Modules IA */}
      <AIModules />

      {/* Section "L'IA est faite pour vous si" en bas */}
      <div>
        <IABenefitsCards />
      </div>
    </div>
  );
};
