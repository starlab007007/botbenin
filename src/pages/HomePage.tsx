
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { IABenefitsCards } from '@/components/IABenefitsCards';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { QuickActions } from '@/components/home/QuickActions';
import { WhatsAppHero } from '@/components/home/WhatsAppHero';
import { AuditSection } from '@/components/home/AuditSection';
import { PricingSection } from '@/components/home/PricingSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatButton } from '@/components/FloatingChatButton';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className={`w-full space-y-6 sm:space-y-8 ${isMobile ? 'px-[2.5%]' : ''}`}>
      {/* Header de bienvenue - responsive */}
      <WelcomeHeader userName={user?.name} />

      {/* Section WhatsApp Hero - Mise en avant */}
      <WhatsAppHero />

      {/* Section Audit Offert */}
      <AuditSection />

      {/* Actions rapides - responsive grid */}
      <QuickActions />

      {/* Section "L'IA est faite pour vous si" en bas */}
      <div>
        <IABenefitsCards />
      </div>

      {/* Section des plans tarifaires */}
      <div className="-mx-[2.5%] sm:mx-0">
        <PricingSection />
      </div>

      {/* Bouton de chat en direct */}
      <FloatingChatButton />
    </div>
  );
};
