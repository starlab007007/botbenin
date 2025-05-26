
import React, { useState } from 'react';
import { AuditBookingModal } from '@/components/AuditBookingModal';
import { HeroSection } from '@/components/home/HeroSection';
import { ProcessSection } from '@/components/home/ProcessSection';
import { AIReasonsSection } from '@/components/home/AIReasonsSection';
import { AIAdvantagesSection } from '@/components/home/AIAdvantagesSection';
import { PricingSection } from '@/components/home/PricingSection';
import { QuickActionsSection } from '@/components/home/QuickActionsSection';
import { SectorAdvantagesSection } from '@/components/home/SectorAdvantagesSection';
import { PlatformAdvantagesSection } from '@/components/home/PlatformAdvantagesSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { CTASection } from '@/components/home/CTASection';

export const HomePage: React.FC = () => {
  const [showBookingModal, setShowBookingModal] = useState(false);

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-white min-h-screen">
      <HeroSection onBookingClick={() => setShowBookingModal(true)} />
      <ProcessSection />
      <AIReasonsSection />
      <AIAdvantagesSection />
      <PricingSection onBookingClick={() => setShowBookingModal(true)} />
      <QuickActionsSection />
      <SectorAdvantagesSection />
      <PlatformAdvantagesSection />
      <TestimonialsSection />
      <CTASection onBookingClick={() => setShowBookingModal(true)} />

      <AuditBookingModal 
        open={showBookingModal} 
        onOpenChange={setShowBookingModal} 
      />
    </div>
  );
};
