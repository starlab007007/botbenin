
import React from 'react';
import { Card } from '@/components/ui/card';
import { Bot, Zap, Brain, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const QuickActionsSection: React.FC = () => {
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
      color: 'bg-blue-500',
      action: () => navigate('/automatisations')
    },
    {
      title: 'Agent Business',
      description: 'CRM et génération de leads',
      icon: Brain,
      color: 'bg-blue-500',
      action: () => navigate('/modules/business')
    },
    {
      title: 'Tableau de bord',
      description: 'Analytics et performances',
      icon: TrendingUp,
      color: 'bg-blue-500',
      action: () => navigate('/dashboard')
    }
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="text-center lg:text-left">
        <h1 className="text-2xl lg:text-4xl font-bold text-black mb-2 lg:mb-4">
          Actions rapides
        </h1>
        <p className="text-black text-base lg:text-lg mb-6 lg:mb-8">
          Votre plateforme IA pour automatiser et optimiser vos processus métiers
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {quickActions.map((action, index) => (
          <Card 
            key={index}
            className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer bg-white border border-gray-200 rounded-xl"
            onClick={action.action}
          >
            <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4 shadow-sm`}>
              <action.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-black mb-2 text-base">{action.title}</h3>
            <p className="text-black text-sm">{action.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
