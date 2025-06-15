
import React from 'react';
import { ProspectsPage } from '@/pages/ProspectsPage';
import { useIsMobile } from '@/hooks/use-mobile';

export const ProspectsLayout: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Container avec largeur maximale et responsive padding */}
      <div className={`w-full max-w-[1440px] mx-auto ${isMobile ? 'px-[2.5%]' : 'px-4 sm:px-6 lg:px-8'} py-6 lg:py-8`}>
        <ProspectsPage />
      </div>
    </div>
  );
};
