
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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mr-4">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Agent IA Marketing</h1>
              <p className="text-gray-600 text-lg mt-1">
                Créez et gérez vos campagnes multicanales avec l'aide de l'intelligence artificielle.
              </p>
            </div>
          </div>
        </div>

        {/* Campaign Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Campagnes actives</h3>
                <div className="text-2xl font-bold text-gray-900">12</div>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Taux d'ouverture moyen</h3>
                <div className="text-2xl font-bold text-gray-900">18.5%</div>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Conversions ce mois</h3>
                <div className="text-2xl font-bold text-gray-900">247</div>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 mb-8 bg-white border border-gray-200 rounded-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Créer une campagne</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white p-4 h-auto flex-col rounded-xl transition-all">
              <Mail className="w-6 h-6 mb-2" />
              <span>Email</span>
            </Button>
            <Button className="bg-green-500 hover:bg-green-600 text-white p-4 h-auto flex-col rounded-xl transition-all">
              <MessageSquare className="w-6 h-6 mb-2" />
              <span>WhatsApp</span>
            </Button>
            <Button className="bg-purple-500 hover:bg-purple-600 text-white p-4 h-auto flex-col rounded-xl transition-all">
              <MessageSquare className="w-6 h-6 mb-2" />
              <span>SMS</span>
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white p-4 h-auto flex-col rounded-xl transition-all">
              <Target className="w-6 h-6 mb-2" />
              <span>Multicanal</span>
            </Button>
          </div>
        </Card>

        {/* Active Campaigns */}
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Campagnes en cours</h2>
          <div className="space-y-4">
            {campaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
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
