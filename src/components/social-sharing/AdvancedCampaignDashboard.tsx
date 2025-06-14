
import React from "react";
import { Card } from "@/components/ui/card";

interface AdvancedCampaignDashboardProps {
  selectedCampaignId?: string;
}

export const AdvancedCampaignDashboard: React.FC<AdvancedCampaignDashboardProps> = ({ 
  selectedCampaignId 
}) => {
  return (
    <div className="space-y-6">
      <Card className="p-8 text-center">
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          Fonctionnalités avancées
        </h3>
        <p className="text-gray-500">
          Interface simplifiée - fonctionnalités avancées à venir.
        </p>
      </Card>
    </div>
  );
};
