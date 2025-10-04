import React from 'react';
import { Card } from "@/components/ui/card";
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  MousePointerClick, 
  Mail,
  Users,
  Calendar,
  Target
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  trackingParameters?: any;
  createdAt: string;
}

interface CampaignAnalyticsProps {
  campaign: Campaign;
}

export const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({ campaign }) => {
  // Données simulées pour la démo
  const analytics = {
    totalSent: campaign.trackingParameters?.sentCount || 0,
    totalOpened: Math.floor((campaign.trackingParameters?.sentCount || 0) * 0.35),
    totalClicked: Math.floor((campaign.trackingParameters?.sentCount || 0) * 0.15),
    totalBounced: Math.floor((campaign.trackingParameters?.sentCount || 0) * 0.05),
    openRate: 35,
    clickRate: 15,
    bounceRate: 5,
    conversionRate: 8,
  };

  const daysActive = Math.floor((Date.now() - new Date(campaign.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">Envoyés</span>
          </div>
          <p className="text-3xl font-bold text-blue-900">{analytics.totalSent}</p>
          <p className="text-xs text-blue-700 mt-1">100% des contacts</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-purple-700 font-medium">Ouverts</span>
          </div>
          <p className="text-3xl font-bold text-purple-900">{analytics.totalOpened}</p>
          <p className="text-xs text-purple-700 mt-1">{analytics.openRate}% taux d'ouverture</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center gap-3 mb-2">
            <MousePointerClick className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-orange-700 font-medium">Clics</span>
          </div>
          <p className="text-3xl font-bold text-orange-900">{analytics.totalClicked}</p>
          <p className="text-xs text-orange-700 mt-1">{analytics.clickRate}% taux de clic</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Conversions</span>
          </div>
          <p className="text-3xl font-bold text-green-900">{Math.floor(analytics.totalSent * (analytics.conversionRate / 100))}</p>
          <p className="text-xs text-green-700 mt-1">{analytics.conversionRate}% taux de conversion</p>
        </Card>
      </div>

      {/* Performance détaillée */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Performance détaillée</h3>
        
        <div className="space-y-6">
          {/* Taux d'ouverture */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Taux d'ouverture</span>
              <span className="font-medium text-purple-600">{analytics.openRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all"
                style={{ width: `${analytics.openRate}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Moyenne du secteur: 25% • Excellent ✨
            </p>
          </div>

          {/* Taux de clic */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Taux de clic (CTR)</span>
              <span className="font-medium text-orange-600">{analytics.clickRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all"
                style={{ width: `${analytics.clickRate}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Moyenne du secteur: 10% • Très bon 👍
            </p>
          </div>

          {/* Taux de rebond */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Taux de rebond</span>
              <span className="font-medium text-red-600">{analytics.bounceRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all"
                style={{ width: `${analytics.bounceRate}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Objectif: &lt;2% • À améliorer
            </p>
          </div>

          {/* Taux de conversion */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Taux de conversion</span>
              <span className="font-medium text-green-600">{analytics.conversionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                style={{ width: `${analytics.conversionRate}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Moyenne du secteur: 5% • Excellent 🎯
            </p>
          </div>
        </div>
      </Card>

      {/* Évolution dans le temps */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Évolution dans le temps</h3>
        <div className="h-64 flex items-end justify-around gap-2">
          {[...Array(7)].map((_, i) => {
            const height = Math.random() * 60 + 20;
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t transition-all hover:opacity-80"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-2">J{i + 1}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Informations complémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Informations de la campagne</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Durée de la campagne:</span>
              <span className="font-medium">{daysActive} jours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Meilleur jour:</span>
              <span className="font-medium">Mardi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Meilleure heure:</span>
              <span className="font-medium">10h00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Appareil principal:</span>
              <span className="font-medium">Mobile (65%)</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50">
          <h4 className="font-semibold text-teal-900 mb-4">Recommandations</h4>
          <ul className="space-y-2 text-sm text-teal-800">
            <li className="flex items-start gap-2">
              <span className="text-teal-600">✓</span>
              <span>Excellent taux d'ouverture ! Continuez à personnaliser vos objets</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600">✓</span>
              <span>Bon engagement général, testez différents CTA pour améliorer les clics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600">•</span>
              <span>Privilégiez les envois le matin entre 9h et 11h</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};