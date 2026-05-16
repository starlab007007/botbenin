import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { PricingSection } from '@/components/home/PricingSection';
import { FloatingChatButton } from '@/components/FloatingChatButton';

import { WaouhLiveHero } from '@/components/home/waouh/WaouhLiveHero';
import { WaouhLiveTicker } from '@/components/home/waouh/WaouhLiveTicker';
import { WaouhChannels } from '@/components/home/waouh/WaouhChannels';

import { WaouhHowItWorks } from '@/components/home/waouh/WaouhHowItWorks';
import { WaouhProofStats } from '@/components/home/waouh/WaouhProofStats';
import { BotBjEcosystem } from '@/components/home/waouh/BotBjEcosystem';
import { WaouhFinalCTA } from '@/components/home/waouh/WaouhFinalCTA';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div
      className="w-full min-h-screen"
      style={{
        background:
          'radial-gradient(1200px 600px at 90% -10%, hsl(var(--home-accent) / 0.18), transparent 60%),' +
          'radial-gradient(900px 500px at -10% 110%, hsl(var(--home-accent-warm) / 0.18), transparent 60%),' +
          'hsl(var(--home-bg))',
        color: 'hsl(var(--home-text))',
      }}
    >
      {user?.name && (
        <div style={{ background: 'hsl(var(--home-surface))', color: 'hsl(var(--home-text))' }}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
            <WelcomeHeader userName={user.name} />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12 space-y-8 sm:space-y-12 md:space-y-16">
        <WaouhLiveHero />
        <WaouhLiveTicker />
        <WaouhChannels />
        <WaouhHowItWorks />
        <WaouhProofStats />
        <BotBjEcosystem />
        <WaouhFinalCTA />

        <section
          className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10"
          style={{ background: 'hsl(var(--home-surface))', color: 'hsl(var(--home-text))' }}
        >
          <PricingSection />
        </section>
      </main>

      <FloatingChatButton />
    </div>
  );
};

export default HomePage;
