
import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Zap } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Tableaux de bord</h1>
          <p className="text-slate-300">Vue d'ensemble de vos performances et activités</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white mb-2">Conversations</h3>
                <div className="text-3xl font-bold text-white">1,234</div>
                <p className="text-blue-100 text-sm">+12% ce mois</p>
              </div>
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
          </Card>

          <Card className="bg-gradient-to-r from-green-600 to-green-700 border-0 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white mb-2">Workflows</h3>
                <div className="text-3xl font-bold text-white">89</div>
                <p className="text-green-100 text-sm">+8% ce mois</p>
              </div>
              <Zap className="w-8 h-8 text-white" />
            </div>
          </Card>

          <Card className="bg-gradient-to-r from-purple-600 to-purple-700 border-0 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white mb-2">Utilisateurs</h3>
                <div className="text-3xl font-bold text-white">456</div>
                <p className="text-purple-100 text-sm">+15% ce mois</p>
              </div>
              <Users className="w-8 h-8 text-white" />
            </div>
          </Card>

          <Card className="bg-gradient-to-r from-orange-600 to-orange-700 border-0 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white mb-2">Performance</h3>
                <div className="text-3xl font-bold text-white">98.5%</div>
                <p className="text-orange-100 text-sm">+2% ce mois</p>
              </div>
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Activité récente</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Nouveau workflow créé</span>
                <span className="text-slate-400 text-sm">Il y a 2h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Campagne email lancée</span>
                <span className="text-slate-400 text-sm">Il y a 5h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Contact ajouté</span>
                <span className="text-slate-400 text-sm">Il y a 1j</span>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Modules les plus utilisés</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Agent IA Business</span>
                <span className="text-green-400 font-semibold">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Agent IA Marketing</span>
                <span className="text-blue-400 font-semibold">32%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">IA Citoyen</span>
                <span className="text-purple-400 font-semibold">23%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
