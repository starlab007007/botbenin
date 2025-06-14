
import React from 'react';
import { SocialSharingCampaignsList } from '@/components/social-sharing/SocialSharingCampaignsList';

export const SocialSharingCampaignsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Campagnes de Partage Personnalisées
        </h1>
        <p className="text-gray-600">
          Créez et gérez vos campagnes de partage social avec des fonctionnalités avancées d'IA et d'automatisation.
        </p>
      </div>
      
      <SocialSharingCampaignsList />
    </div>
  );
};
