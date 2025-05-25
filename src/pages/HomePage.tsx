
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Zap, Brain, Users, ArrowRight, Calendar, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Nouvelle conversation',
      description: 'Démarrer un chat avec Bot.Bj',
      icon: Bot,
      color: 'bg-blue-500',
      action: () => navigate('/chat')
    },
    {
      title: 'Créer une automatisation',
      description: 'Nouveau workflow intelligent',
      icon: Zap,
      color: 'bg-purple-500',
      action: () => navigate('/automatisations')
    },
    {
      title: 'Agent Business',
      description: 'CRM et génération de leads',
      icon: Brain,
      color: 'bg-green-500',
      action: () => navigate('/modules/business')
    },
    {
      title: 'Tableau de bord',
      description: 'Analytics et performances',
      icon: TrendingUp,
      color: 'bg-orange-500',
      action: () => navigate('/dashboard')
    }
  ];

  const recentActivities = [
    { title: 'Nouveau workflow créé', time: '2h', type: 'workflow' },
    { title: 'Lead qualifié via IA', time: '4h', type: 'business' },
    { title: 'Campagne email lancée', time: '6h', type: 'marketing' },
    { title: 'Rapport généré', time: '1j', type: 'analytics' }
  ];

  const stats = [
    { label: 'Conversations', value: '1,234', change: '+12%', color: 'text-blue-600' },
    { label: 'Workflows actifs', value: '89', change: '+8%', color: 'text-green-600' },
    { label: 'Leads générés', value: '456', change: '+24%', color: 'text-purple-600' },
    { label: 'Taux de conversion', value: '12.5%', change: '+3%', color: 'text-orange-600' }
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2 lg:mb-4">
          Bonjour ! 👋
        </h1>
        <p className="text-gray-600 text-base lg:text-lg mb-6 lg:mb-8">
          Votre plateforme IA pour automatiser et optimiser vos processus métiers
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="p-4 lg:p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100 hover:border-gray-200"
              onClick={action.action}
            >
              <div className={`w-12 h-12 lg:w-14 lg:h-14 ${action.color} rounded-xl flex items-center justify-center mb-3 lg:mb-4 shadow-md`}>
                <action.icon className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 lg:mb-2 text-sm lg:text-base">{action.title}</h3>
              <p className="text-gray-600 text-xs lg:text-sm">{action.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">Aperçu des performances</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="p-4 lg:p-6 border border-gray-100">
              <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 lg:mb-2">{stat.value}</div>
              <div className="text-xs lg:text-sm text-gray-600 mb-1">{stat.label}</div>
              <div className={`text-xs lg:text-sm font-medium ${stat.color}`}>{stat.change}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activities and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Recent Activities */}
        <Card className="p-4 lg:p-6 border border-gray-100">
          <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">Activités récentes</h3>
          <div className="space-y-3 lg:space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-900 text-sm lg:text-base font-medium">{activity.title}</span>
                </div>
                <span className="text-gray-500 text-xs lg:text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Calendar View */}
        <Card className="p-4 lg:p-6 border border-gray-100">
          <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">Prochaines tâches</h3>
          <div className="space-y-3 lg:space-y-4">
            <div className="flex items-center justify-between p-3 lg:p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
              <div>
                <div className="font-medium text-gray-900 text-sm lg:text-base">Rapport hebdomadaire</div>
                <div className="text-gray-600 text-xs lg:text-sm">Aujourd'hui, 14:00</div>
              </div>
              <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <div className="flex items-center justify-between p-3 lg:p-4 bg-green-50 rounded-xl border-l-4 border-green-500">
              <div>
                <div className="font-medium text-gray-900 text-sm lg:text-base">Campagne marketing</div>
                <div className="text-gray-600 text-xs lg:text-sm">Demain, 09:00</div>
              </div>
              <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 lg:p-4 bg-purple-50 rounded-xl border-l-4 border-purple-500">
              <div>
                <div className="font-medium text-gray-900 text-sm lg:text-base">Formation équipe</div>
                <div className="text-gray-600 text-xs lg:text-sm">Vendredi, 10:00</div>
              </div>
              <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* CTA Section */}
      <Card className="p-6 lg:p-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
        <div className="text-center lg:text-left lg:flex lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h3 className="text-xl lg:text-2xl font-bold mb-2">Prêt à automatiser vos processus ?</h3>
            <p className="text-blue-100 text-sm lg:text-base">Découvrez la puissance de l'IA conversationnelle pour votre entreprise</p>
          </div>
          <Button 
            onClick={() => navigate('/chat')}
            className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-6 py-3 lg:px-8 lg:py-4"
          >
            Commencer maintenant
            <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
