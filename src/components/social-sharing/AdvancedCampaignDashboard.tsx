
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { CampaignTemplatesManager } from "./CampaignTemplatesManager";
import { AIContentGenerator } from "./AIContentGenerator";
import { AudienceSegmentManager } from "./AudienceSegmentManager";
import { useSocialSharingCampaigns } from "@/hooks/useSocialSharingCampaigns";
import { 
  Template, 
  Sparkles, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings,
  Bot,
  Target
} from "lucide-react";

interface AdvancedCampaignDashboardProps {
  selectedCampaignId?: string;
}

export const AdvancedCampaignDashboard: React.FC<AdvancedCampaignDashboardProps> = ({ 
  selectedCampaignId 
}) => {
  const { campaigns } = useSocialSharingCampaigns();
  const [activeTab, setActiveTab] = useState("templates");

  const selectedCampaign = selectedCampaignId 
    ? campaigns.find(c => c.id === selectedCampaignId)
    : null;

  return (
    <div className="space-y-6">
      {selectedCampaign && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {selectedCampaign.name}
          </h2>
          <p className="text-gray-600">{selectedCampaign.description}</p>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="templates" className="flex items-center space-x-2">
            <Template className="w-4 h-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="ai-content" className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>IA</span>
          </TabsTrigger>
          <TabsTrigger value="audience" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Audience</span>
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Planning</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center space-x-2">
            <Bot className="w-4 h-4" />
            <span>Auto</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <CampaignTemplatesManager />
        </TabsContent>

        <TabsContent value="ai-content">
          {selectedCampaignId ? (
            <AIContentGenerator campaignId={selectedCampaignId} />
          ) : (
            <Card className="p-8 text-center">
              <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Sélectionnez une campagne
              </h3>
              <p className="text-gray-500">
                Choisissez une campagne pour générer du contenu IA personnalisé.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audience">
          <AudienceSegmentManager />
        </TabsContent>

        <TabsContent value="scheduling">
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Planification Avancée
            </h3>
            <p className="text-gray-500">
              Fonctionnalité de planification en cours de développement.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="p-8 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Analytics Avancées
            </h3>
            <p className="text-gray-500">
              Tableau de bord analytique en cours de développement.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card className="p-8 text-center">
            <Bot className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Automation Intelligente
            </h3>
            <p className="text-gray-500">
              Workflows d'automation en cours de développement.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
