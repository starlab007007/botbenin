import React from 'react';
import { HeroSection } from '@/components/features/HeroSection';
import { OverviewSection } from '@/components/features/OverviewSection';
import { FeaturesTabsSection } from '@/components/features/FeaturesTabsSection';
import { BenefitsSection } from '@/components/features/BenefitsSection';
import { UseCasesSection } from '@/components/features/UseCasesSection';
import { PricingTableSection } from '@/components/features/PricingTableSection';
import { UserManualSection } from '@/components/features/UserManualSection';
import { SupportSection } from '@/components/features/SupportSection';
import { FAQSection } from '@/components/features/FAQSection';
import { IntegrationsSection } from '@/components/features/IntegrationsSection';
import { TestimonialsSection } from '@/components/features/TestimonialsSection';
import { CTASection } from '@/components/features/CTASection';

const FeaturesPage: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-background">
      <HeroSection />
      <OverviewSection />
      <FeaturesTabsSection />
      <BenefitsSection />
      <UseCasesSection />
      <PricingTableSection />
      <UserManualSection />
      <SupportSection />
      <FAQSection />
      <IntegrationsSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
};

export default FeaturesPage;
