
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { IABenefitsCards } from '@/components/IABenefitsCards';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { QuickActions } from '@/components/home/QuickActions';
import { WhatsAppHero } from '@/components/home/WhatsAppHero';
import { AuditSection } from '@/components/home/AuditSection';
import { PricingSection } from '@/components/home/PricingSection';
import { PricingComparison } from '@/components/home/PricingComparison';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatButton } from '@/components/FloatingChatButton';
import { WhatsAppShowcase } from '@/components/home/WhatsAppShowcase';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto space-y-8 md:space-y-10 lg:space-y-12 px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-10">
        {/* Header de bienvenue - responsive */}
        <WelcomeHeader userName={user?.name} />

      {/* Section WhatsApp Hero - Mise en avant */}
      <WhatsAppHero />

      {/* Section WhatsApp Showcase - Écrans mobiles dynamiques */}
      <WhatsAppShowcase />

      {/* Section Audit Offert */}
      <AuditSection />

      {/* Actions rapides - responsive grid */}
      <QuickActions />

      {/* Section "L'IA est faite pour vous si" en bas */}
      <IABenefitsCards />

      {/* Section des plans tarifaires */}
      <PricingSection />

      {/* Tableau de comparaison des packs */}
      <PricingComparison />

        {/* Bouton de chat en direct */}
        <FloatingChatButton />
      </div>
    </div>
  );
};
