
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
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Megaphone className="w-8 h-8 text-green-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">Agent IA Marketing</h1>
          </div>
          <p className="text-slate-300 text-lg">
            Créez et gérez vos campagnes multicanales avec l'aide de l'intelligence artificielle.
          </p>
        </div>

        {/* Campaign Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-600 to-green-700 border-0 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Campagnes actives</h3>
            <div className="text-3xl font-bold text-white">12</div>
          </Card>
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Taux d'ouverture moyen</h3>
            <div className="text-3xl font-bold text-white">18.5%</div>
          </Card>
          <Card className="bg-gradient-to-r from-purple-600 to-purple-700 border-0 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Conversions ce mois</h3>
            <div className="text-3xl font-bold text-white">247</div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-slate-800/50 border-slate-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Créer une campagne</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto flex-col">
              <Mail className="w-6 h-6 mb-2" />
              <span>Email</span>
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white p-4 h-auto flex-col">
              <MessageSquare className="w-6 h-6 mb-2" />
              <span>WhatsApp</span>
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white p-4 h-auto flex-col">
              <MessageSquare className="w-6 h-6 mb-2" />
              <span>SMS</span>
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white p-4 h-auto flex-col">
              <Target className="w-6 h-6 mb-2" />
              <span>Multicanal</span>
            </Button>
          </div>
        </Card>

        {/* Active Campaigns */}
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Campagnes en cours</h2>
          <div className="space-y-4">
            {campaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-white">{campaign.name}</h3>
                  <p className="text-slate-400">{campaign.status}</p>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-semibold">{campaign.performance}</div>
                  <p className="text-slate-400 text-sm">Taux d'ouverture</p>
                </div>
                <Button variant="outline" className="border-slate-600 text-slate-300">
                  <BarChart className="w-4 h-4 mr-2" />
                  Voir détails
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
