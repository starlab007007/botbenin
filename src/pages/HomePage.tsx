import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { PricingSection } from '@/components/home/PricingSection';
import { FloatingChatButton } from '@/components/FloatingChatButton';

import { WaouhLiveHero } from '@/components/home/waouh/WaouhLiveHero';
import { WaouhLiveTicker } from '@/components/home/waouh/WaouhLiveTicker';
import { WaouhChannels } from '@/components/home/waouh/WaouhChannels';
import { WaouhRadarLive } from '@/components/home/waouh/WaouhRadarLive';
import { WaouhHowItWorks } from '@/components/home/waouh/WaouhHowItWorks';
import { WaouhProofStats } from '@/components/home/waouh/WaouhProofStats';
import { BotBjEcosystem } from '@/components/home/waouh/BotBjEcosystem';
import { WaouhFinalCTA } from '@/components/home/waouh/WaouhFinalCTA';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="w-full min-h-screen bg-[#0A0D1A] text-white">
      {/* Light bar with welcome (kept compact, optional) */}
      {user?.name && (
        <div className="bg-background text-foreground">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
            <WelcomeHeader userName={user.name} />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 space-y-10 md:space-y-16">
        <WaouhLiveHero />
        <WaouhLiveTicker />
        <WaouhChannels />
        <WaouhRadarLive />
        <WaouhHowItWorks />
        <WaouhProofStats />
        <BotBjEcosystem />
        <WaouhFinalCTA />

        {/* Pricing kept on dark background — wrap to invert */}
        <section className="rounded-3xl bg-background text-foreground p-6 sm:p-10">
          <PricingSection />
        </section>
      </main>

      <FloatingChatButton />
    </div>
  );
};

export default HomePage;
