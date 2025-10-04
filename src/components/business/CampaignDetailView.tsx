import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Users, 
  BarChart3, 
  Mail, 
  Calendar, 
  Settings,
  Send,
  Clock,
  Eye,
  MousePointerClick,
  TrendingUp,
  Download,
  Play,
  Pause
} from "lucide-react";
import { CampaignAnalytics } from './CampaignAnalytics';
import { CampaignRecipientsList } from './CampaignRecipientsList';
import { CampaignSendManager } from './CampaignSendManager';
import { CampaignScheduler } from './CampaignScheduler';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  targetPlatforms?: string[];
  trackingParameters?: any;
  createdAt: string;
  updatedAt: string;
  customMessage?: string;
}

interface CampaignDetailViewProps {
  campaign: Campaign;
  onBack: () => void;
  onUpdate: () => void;
}

export const CampaignDetailView: React.FC<CampaignDetailViewProps> = ({ 
  campaign, 
  onBack,
  onUpdate 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const contactCount = campaign.trackingParameters?.contactCount || 0;
  const sentCount = campaign.trackingParameters?.sentCount || 0;
  const openRate = campaign.trackingParameters?.openRate || 0;
  const clickRate = campaign.trackingParameters?.clickRate || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux campagnes
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <Button variant={campaign.isActive ? "secondary" : "default"} size="sm">
              {campaign.isActive ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Mettre en pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Activer
                </>
              )}
            </Button>
          </div>
        </div>

        {/* En-tête de la campagne */}
        <Card className="p-8 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
                <Badge variant={campaign.isActive ? "default" : "secondary"} className="text-sm">
                  {campaign.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {campaign.description && (
                <p className="text-gray-600">{campaign.description}</p>
              )}
            </div>
            <Mail className="w-12 h-12 text-red-600 opacity-50" />
          </div>

          {/* Métriques principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600 font-medium">Contacts</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{contactCount}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600 font-medium">Envoyés</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{sentCount}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600 font-medium">Ouvertures</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{openRate}%</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-600 font-medium">Clics</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{clickRate}%</p>
            </div>
          </div>
        </Card>

        {/* Onglets de contenu */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="recipients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Destinataires
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Envoi
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Programmation
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations générales */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date de création:</span>
                    <span className="font-medium">{new Date(campaign.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dernière mise à jour:</span>
                    <span className="font-medium">{new Date(campaign.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plateformes:</span>
                    <span className="font-medium">{campaign.targetPlatforms?.join(', ') || 'Email'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <Badge variant={campaign.isActive ? "default" : "secondary"}>
                      {campaign.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Performance récente */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance récente</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Taux d'ouverture</span>
                      <span className="font-medium">{openRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${openRate}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Taux de clic</span>
                      <span className="font-medium">{clickRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${clickRate}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progression envoi</span>
                      <span className="font-medium">{Math.floor((sentCount / contactCount) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(sentCount / contactCount) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Message de la campagne */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Message de la campagne</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {campaign.customMessage || "Aucun message défini"}
                </pre>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="recipients" className="mt-6">
            <CampaignRecipientsList campaign={campaign} />
          </TabsContent>

          <TabsContent value="send" className="mt-6">
            <CampaignSendManager campaign={campaign} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <CampaignScheduler campaign={campaign} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <CampaignAnalytics campaign={campaign} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};