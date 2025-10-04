import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSocialSharingCampaigns } from "@/hooks/useSocialSharingCampaigns";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  Plus, 
  BarChart3, 
  Mail, 
  Clock, 
  Users, 
  TrendingUp,
  Calendar,
  Send,
  Eye
} from "lucide-react";
import { CampaignDetailView } from './CampaignDetailView';

interface CampaignEngagementManagerProps {
  onBack: () => void;
}

export const CampaignEngagementManager: React.FC<CampaignEngagementManagerProps> = ({ onBack }) => {
  const { campaigns, isLoading, fetchCampaigns } = useSocialSharingCampaigns();
  const { toast } = useToast();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  if (selectedCampaign) {
    return (
      <CampaignDetailView
        campaign={selectedCampaign}
        onBack={() => setSelectedCampaignId(null)}
        onUpdate={fetchCampaigns}
      />
    );
  }

  const activeCampaigns = campaigns.filter(c => c.isActive);
  const totalContacts = campaigns.reduce((sum, c) => sum + (c.trackingParameters?.contactCount || 0), 0);
  const totalSent = campaigns.reduce((sum, c) => sum + (c.trackingParameters?.sentCount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Retour au menu
          </Button>
        </div>

        {/* En-tête principal */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-8 border border-red-200">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Campagnes d'Engagement
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Créez des campagnes personnalisées avec l'IA : générez automatiquement des messages adaptés, 
                programmez vos envois et suivez les performances de vos actions marketing.
              </p>
            </div>
            <Button onClick={() => toast({ title: "Fonctionnalité à venir", description: "Créez des campagnes depuis le workflow B2B" })}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle campagne
            </Button>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Campagnes</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{campaigns.length}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Campagnes Actives</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{activeCampaigns.length}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Contacts Totaux</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{totalContacts}</p>
              </div>
              <Users className="w-10 h-10 text-purple-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Messages Envoyés</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">{totalSent}</p>
              </div>
              <Send className="w-10 h-10 text-orange-600 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Liste des campagnes */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Mes Campagnes</h2>
          
          {isLoading && (
            <div className="text-center py-12 text-gray-500">
              Chargement des campagnes...
            </div>
          )}

          {!isLoading && campaigns.length === 0 && (
            <Card className="p-12 text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Aucune campagne pour l'instant
              </h3>
              <p className="text-gray-500 mb-6">
                Créez votre première campagne depuis le workflow B2B pour commencer
              </p>
              <Button onClick={onBack} variant="outline">
                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                Retour au menu B2B
              </Button>
            </Card>
          )}

          {!isLoading && campaigns.length > 0 && campaigns.map((campaign) => {
            const contactCount = campaign.trackingParameters?.contactCount || 0;
            const sentCount = campaign.trackingParameters?.sentCount || 0;
            const openRate = campaign.trackingParameters?.openRate || 0;
            
            return (
              <Card 
                key={campaign.id} 
                className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-red-500"
                onClick={() => setSelectedCampaignId(campaign.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{campaign.name}</h3>
                      <Badge variant={campaign.isActive ? "default" : "secondary"}>
                        {campaign.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {campaign.trackingParameters?.scheduled && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Programmée
                        </Badge>
                      )}
                    </div>

                    {campaign.description && (
                      <p className="text-gray-600 mb-4">{campaign.description}</p>
                    )}

                    {/* Métriques principales */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-blue-700 font-medium">Contacts</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{contactCount}</p>
                      </div>

                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Send className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-700 font-medium">Envoyés</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{sentCount}</p>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-purple-700 font-medium">Taux ouverture</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{openRate}%</p>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-orange-600" />
                          <span className="text-xs text-orange-700 font-medium">Engagement</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-900">
                          {Math.floor(Math.random() * 30 + 10)}%
                        </p>
                      </div>

                      <div className="bg-pink-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-pink-600" />
                          <span className="text-xs text-pink-700 font-medium">Statut</span>
                        </div>
                        <p className="text-sm font-bold text-pink-900">
                          {campaign.isActive ? 'En cours' : 'Terminée'}
                        </p>
                      </div>
                    </div>

                    {/* Plateformes */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {campaign.targetPlatforms?.map((platform, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>

                    {/* Dates */}
                    <div className="text-xs text-gray-500 space-x-4">
                      <span>Créée le {new Date(campaign.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Mise à jour: {new Date(campaign.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions rapides */}
                  <div className="flex flex-col gap-2 ml-6">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedCampaignId(campaign.id); }}>
                      <Eye className="w-4 h-4 mr-2" />
                      Voir détails
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};