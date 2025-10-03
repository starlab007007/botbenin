
import React from 'react';
import { SocialSharingCampaignsList } from '@/components/social-sharing/SocialSharingCampaignsList';
import { useIsMobile } from '@/hooks/use-mobile';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export const SocialSharingCampaignsPage: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <PermissionGuard 
      anyPermissions={['campaigns.view.own', 'campaigns.view.all']}
      fallbackMessage="Vous n'avez pas la permission de voir les campagnes marketing."
    >
      <div className={`container mx-auto ${isMobile ? 'px-[2.5%]' : 'p-6'} space-y-6`}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Campagnes de Partage
          </h1>
          <p className="text-gray-600">
            Créez et gérez vos campagnes de partage social.
          </p>
        </div>
        
        <SocialSharingCampaignsList />
      </div>
    </PermissionGuard>
  );
};
