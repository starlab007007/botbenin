
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdvancedCampaignFeatures } from "@/hooks/useAdvancedCampaignFeatures";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Share, 
  Heart, 
  MessageCircle,
  Eye,
  MousePointer
} from "lucide-react";


interface CampaignAnalyticsProps {
  campaignId?: string;
}

export const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({ campaignId }) => {
  const { performancePredictions } = useAdvancedCampaignFeatures();
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalReach: 12543,
      totalEngagement: 1876,
      totalClicks: 432,
      engagementRate: 14.9
    },
    platformPerformance: [
      { platform: "Facebook", reach: 5432, engagement: 876, clicks: 123 },
      { platform: "Instagram", reach: 4321, engagement: 654, clicks: 187 },
      { platform: "Twitter", reach: 2790, engagement: 346, clicks: 122 }
    ],
    timelineData: [
      { date: "2024-01-01", reach: 1200, engagement: 180, clicks: 45 },
      { date: "2024-01-02", reach: 1350, engagement: 210, clicks: 52 },
      { date: "2024-01-03", reach: 1180, engagement: 165, clicks: 38 },
      { date: "2024-01-04", reach: 1420, engagement: 245, clicks: 67 },
      { date: "2024-01-05", reach: 1650, engagement: 298, clicks: 78 }
    ]
  });

  const StatCard = ({ title, value, icon: Icon, change }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <p className={`text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change > 0 ? '+' : ''}{change}% vs période précédente
              </p>
            )}
          </div>
          <Icon className="w-8 h-8 text-blue-500" />
        </div>
      </CardContent>
    </Card>
  );

  if (!campaignId) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          Sélectionnez une campagne
        </h3>
        <p className="text-gray-500">
          Choisissez une campagne pour voir ses analytics détaillées.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Portée totale" 
          value={analyticsData.overview.totalReach.toLocaleString()} 
          icon={Eye}
          change={12.5}
        />
        <StatCard 
          title="Engagement total" 
          value={analyticsData.overview.totalEngagement.toLocaleString()} 
          icon={Heart}
          change={8.3}
        />
        <StatCard 
          title="Clics totaux" 
          value={analyticsData.overview.totalClicks.toLocaleString()} 
          icon={MousePointer}
          change={-2.1}
        />
        <StatCard 
          title="Taux d'engagement" 
          value={`${analyticsData.overview.engagementRate}%`} 
          icon={TrendingUp}
          change={5.7}
        />
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Évolution</TabsTrigger>
          <TabsTrigger value="platforms">Par plateforme</TabsTrigger>
          <TabsTrigger value="content">Contenu</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des performances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">Graphique indisponible</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance par plateforme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">Graphique indisponible</div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {analyticsData.platformPerformance.map((platform) => (
              <Card key={platform.platform}>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">{platform.platform}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Portée:</span>
                      <span>{platform.reach.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Engagement:</span>
                      <span>{platform.engagement.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Clics:</span>
                      <span>{platform.clicks.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Taux:</span>
                      <span>{((platform.engagement / platform.reach) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse du contenu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Meilleur contenu</h4>
                  <p className="text-sm text-green-700">
                    "Découvrez notre nouvelle fonctionnalité révolutionnaire ! 🚀"
                  </p>
                  <div className="mt-2 text-xs text-green-600">
                    1,245 likes • 87 partages • 12% taux d'engagement
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded">
                    <div className="text-sm font-medium text-blue-800">Hashtags populaires</div>
                    <div className="text-xs text-blue-600 mt-1">
                      #innovation #tech #startup
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <div className="text-sm font-medium text-purple-800">Meilleure heure</div>
                    <div className="text-xs text-purple-600 mt-1">
                      18h-20h (lundi-vendredi)
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
