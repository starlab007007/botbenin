
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, Mail, MessageSquare, BarChart, Target } from 'lucide-react';

export const MarketingModule: React.FC = () => {
  const campaigns = [
    { name: 'Campagne Email Q1', status: 'Active', performance: '15.3%' },
    { name: 'WhatsApp Promo', status: 'En cours', performance: '23.7%' },
    { name: 'SMS Relance', status: 'Planifiée', performance: '-' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agent IA Marketing</h1>
              <p className="text-gray-600 text-lg mt-1">
                Créez et gérez vos campagnes multicanales avec l'aide de l'intelligence artificielle.
              </p>
            </div>
          </div>
        </div>

        {/* Campaign Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Campagnes actives</h3>
                <div className="text-3xl font-bold text-gray-900">12</div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Taux d'ouverture moyen</h3>
                <div className="text-3xl font-bold text-gray-900">18.5%</div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Conversions ce mois</h3>
                <div className="text-3xl font-bold text-gray-900">247</div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 mb-8 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Créer une campagne</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto flex-col rounded-lg transition-all">
              <Mail className="w-6 h-6 mb-2" />
              <span>Email</span>
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white p-4 h-auto flex-col rounded-lg transition-all">
              <MessageSquare className="w-6 h-6 mb-2" />
              <span>WhatsApp</span>
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white p-4 h-auto flex-col rounded-lg transition-all">
              <MessageSquare className="w-6 h-6 mb-2" />
              <span>SMS</span>
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white p-4 h-auto flex-col rounded-lg transition-all">
              <Target className="w-6 h-6 mb-2" />
              <span>Multicanal</span>
            </Button>
          </div>
        </Card>

        {/* Active Campaigns */}
        <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Campagnes en cours</h2>
          <div className="space-y-4">
            {campaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                  <p className="text-gray-600 text-sm">{campaign.status}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-green-600 font-semibold">{campaign.performance}</div>
                    <p className="text-gray-500 text-sm">Taux d'ouverture</p>
                  </div>
                  <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg">
                    <BarChart className="w-4 h-4 mr-2" />
                    Voir détails
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
