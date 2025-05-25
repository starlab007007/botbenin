
import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Zap, Activity, Target, Clock, Star } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const metrics = [
    { title: 'Conversations', value: '1,234', change: '+12%', icon: BarChart3, color: 'bg-blue-500' },
    { title: 'Workflows', value: '89', change: '+8%', icon: Zap, color: 'bg-purple-500' },
    { title: 'Utilisateurs', value: '456', change: '+15%', icon: Users, color: 'bg-green-500' },
    { title: 'Performance', value: '98.5%', change: '+2%', icon: TrendingUp, color: 'bg-orange-500' },
    { title: 'Leads générés', value: '234', change: '+28%', icon: Target, color: 'bg-pink-500' },
    { title: 'Temps économisé', value: '45h', change: '+18%', icon: Clock, color: 'bg-teal-500' },
    { title: 'Satisfaction', value: '4.8/5', change: '+0.3', icon: Star, color: 'bg-yellow-500' },
    { title: 'Activité', value: '92%', change: '+5%', icon: Activity, color: 'bg-indigo-500' }
  ];

  const recentActivities = [
    { action: 'Nouveau workflow créé', time: 'Il y a 2h', type: 'creation', color: 'bg-blue-100 text-blue-800' },
    { action: 'Campagne email lancée', time: 'Il y a 5h', type: 'campaign', color: 'bg-green-100 text-green-800' },
    { action: 'Contact ajouté au CRM', time: 'Il y a 1j', type: 'crm', color: 'bg-purple-100 text-purple-800' },
    { action: 'Rapport généré', time: 'Il y a 2j', type: 'report', color: 'bg-orange-100 text-orange-800' },
    { action: 'Lead qualifié', time: 'Il y a 3j', type: 'lead', color: 'bg-pink-100 text-pink-800' }
  ];

  const topModules = [
    { name: 'Agent IA Business', usage: '45%', color: 'bg-blue-500', trend: '+12%' },
    { name: 'Agent IA Marketing', usage: '32%', color: 'bg-green-500', trend: '+8%' },
    { name: 'IA Citoyen', usage: '23%', color: 'bg-purple-500', trend: '+15%' },
    { name: 'Agent IA Gestion', usage: '18%', color: 'bg-orange-500', trend: '+5%' }
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Tableaux de bord</h1>
        <p className="text-gray-600">Vue d'ensemble de vos performances et activités</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="p-4 lg:p-6 hover:shadow-lg transition-all duration-200 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 lg:w-12 lg:h-12 ${metric.color} rounded-xl flex items-center justify-center shadow-md`}>
                <metric.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <span className="text-green-600 text-xs lg:text-sm font-medium">{metric.change}</span>
            </div>
            <h3 className="text-gray-600 text-xs lg:text-sm mb-1">{metric.title}</h3>
            <div className="text-xl lg:text-2xl font-bold text-gray-900">{metric.value}</div>
          </Card>
        ))}
      </div>

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Recent Activities */}
        <Card className="p-4 lg:p-6 border border-gray-100">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">Activité récente</h2>
          <div className="space-y-3 lg:space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-900 text-sm lg:text-base">{activity.action}</span>
                </div>
                <span className="text-gray-500 text-xs lg:text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Modules */}
        <Card className="p-4 lg:p-6 border border-gray-100">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">Modules les plus utilisés</h2>
          <div className="space-y-4 lg:space-y-6">
            {topModules.map((module, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 text-sm lg:text-base font-medium">{module.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600 text-xs font-medium">{module.trend}</span>
                    <span className="text-gray-900 font-semibold text-sm lg:text-base">{module.usage}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${module.color.replace('bg-', 'bg-')} transition-all duration-500`}
                    style={{ width: module.usage }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="p-6 lg:p-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="text-center lg:text-left">
            <h3 className="text-lg lg:text-xl font-semibold mb-2">Performance globale</h3>
            <p className="text-blue-100 text-sm lg:text-base">Votre plateforme fonctionne à son niveau optimal</p>
          </div>
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold mb-1">98.5%</div>
            <p className="text-blue-100 text-sm">Taux de disponibilité</p>
          </div>
          <div className="text-center lg:text-right">
            <div className="text-3xl lg:text-4xl font-bold mb-1">2.3s</div>
            <p className="text-blue-100 text-sm">Temps de réponse moyen</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
